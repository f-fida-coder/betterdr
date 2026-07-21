import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getSportKeywords, buildMergedSportsTree } from '../data/sportsData';
import { getAvailableSports, getMatches, getOutrightSports } from '../api';
import { prefetchMatchesScope } from '../hooks/useMatches';

// Resolve the (status, scopeKey) a sidebar item will produce once clicked, so
// a hover can warm the exact request the click will issue. MUST stay in sync
// with DashboardMain's section logic + SportContentView's scopeKey format
// (`${sportId || 'all'}:${filter || ''}:${limit || 0}`). A mismatch just means
// the prefetch lands under the wrong key — a harmless miss, never a glitch.
const HOVER_PREFETCH_DELAY_MS = 120;
const resolveHoverPrefetch = (item) => {
    const id = item?.id;
    if (!id) return null;
    // Special landing buckets handled explicitly by DashboardMain.
    if (id === 'up-next') return { status: 'upcoming', scopeKey: 'all::0' };
    if (id === 'commercial-live') return { status: 'live', scopeKey: 'all::0' };
    // Futures / props-plus render different views (not the matches list).
    if (item.type === 'futures' || item.type === 'props-plus') return null;
    const filter = item.filter ? id : null;
    return { status: 'live-upcoming', scopeKey: `${id}:${filter || ''}:0` };
};

// Return only children whose sport keys currently have data per
// /api/matches/sports. When `liveSet` is null (probe pending or
// failed), fall back to showing the static catalog so the sidebar
// stays usable instead of rendering empty. Children with no
// `sportKeys` metadata (UI-only meta items) always pass through.
//
// Match is a union of three sources: the child's explicit sportKeys,
// the child's id, and its keyword aliases (via getSportKeywords).
// The backend's /api/matches/sports returns both human titles (e.g.
// "NFL") and API keys (e.g. "americanfootball_nfl") mixed together —
// and not every match has both populated — so the widest match wins.
const filterActiveChildren = (children, liveSet, outrightSet) => {
    if (!Array.isArray(children)) return [];
    return children.filter((child) => {
        // Futures entries are driven by the OUTRIGHTS table, not the match
        // schedule — a sport can carry winner boards with ZERO scheduled
        // games (golf always; NFL/NBA all off-season). They gate on the
        // outright-sports probe instead of the liveSet, and FAIL OPEN: a
        // null `outrightSet` (probe pending, errored, timed out, or the
        // backend returned []) shows every futures child. A transient API
        // blip must never make the futures section vanish.
        if (child.type === 'futures-group') {
            // Group is visible iff at least one of its board leaves is.
            return filterActiveChildren(child.children, liveSet, outrightSet).length > 0;
        }
        if (child.type === 'futures') {
            if (!outrightSet || !Array.isArray(child.sportKeys)) return true;
            return child.sportKeys.some((k) => outrightSet.has(String(k).toLowerCase()));
        }
        if (!liveSet) return true;
        const candidates = new Set();
        if (Array.isArray(child.sportKeys)) child.sportKeys.forEach((k) => candidates.add(String(k).toLowerCase()));
        if (child.id) candidates.add(String(child.id).toLowerCase());
        getSportKeywords(child.id).forEach((k) => candidates.add(String(k).toLowerCase()));
        if (candidates.size === 0) return true;
        for (const c of candidates) {
            if (liveSet.has(c)) return true;
            // Tournament-variant match: the canonical Rundown key
            // `tennis_atp` should light up when liveSet only has
            // `tennis_atp_madrid_open` (legacy odds-api rows still
            // present in DB) — match any liveSet entry that starts with
            // `${candidate}_` for compound family keys.
            if (c.includes('_')) {
                const needle = `${c}_`;
                for (const live of liveSet) {
                    if (typeof live === 'string' && live.startsWith(needle)) return true;
                }
            }
        }
        return false;
    });
};

// Tree lookups for the auto-expand-on-selection behavior: find a node by id
// anywhere in the tree, and flatten a node's descendant ids. Pure and tiny —
// they only run on an expand tap, never per render.
const findNodeById = (items, id) => {
    for (const it of items || []) {
        if (!it) continue;
        if (it.id === id) return it;
        const hit = findNodeById(it.children, id);
        if (hit) return hit;
    }
    return null;
};

const collectDescendantIds = (node, out = []) => {
    for (const child of node?.children || []) {
        if (!child) continue;
        out.push(child.id);
        collectDescendantIds(child, out);
    }
    return out;
};

const SidebarItem = React.memo(({
    item,
    level,
    selectedIds,
    onToggle,
    expandedIds,
    onToggleExpand,
    className = '',
    isMobile = false,
    liveSet = null,
    outrightSet = null,
    ancestorsWithSelection = null,
}) => {
    const isExpanded = expandedIds.has(item.id);
    const isSelected = selectedIds.includes(item.id);

    const activeChildren = useMemo(
        () => filterActiveChildren(item.children, liveSet, outrightSet),
        [item.children, liveSet, outrightSet],
    );

    const hasChildren = activeChildren.length > 0;

    // True when this row has a selected DESCENDANT (any depth — direct
    // child, grandchild, etc.). Drives the grey "you have leagues picked
    // under here" highlight on the top-level sport rows so the user can
    // navigate back to the sport list and immediately see which categories
    // already have selections inside without having to expand each one.
    //
    // The parent component pre-computes the Set in O(N) once per render
    // and we just do an O(1) lookup here. The previous implementation
    // walked direct children only, which missed grandchild selections
    // (e.g. picking a sub-market under NBA wouldn't light up Basketball).
    const hasSelectedChild = ancestorsWithSelection
        ? ancestorsWithSelection.has(item.id)
        : false;
    const isSelectable = item.selectable !== false;
    const isPropsPlus = item.type === 'props-plus';
    const isFutures = item.type === 'futures';
    const isMarketGroup = !isSelectable && hasChildren;

    // Checkboxes now render on both mobile and desktop so users can
    // multi-select leagues either way (matches the bettorjuice365.com
    // reference). Parent rows still don't get a checkbox — they only
    // expand/collapse their children.
    const showCheckbox = isSelectable && level > 0 && !isPropsPlus;
    const showIcon = (level === 0 && item.icon) || isPropsPlus;
    const showBlueArrow = level > 0 && hasChildren && !isMarketGroup;
    const showBlackArrow = level > 0 && isMarketGroup;

    // Tapping a parent row only toggles expand/collapse — never an
    // implicit selection of the parent itself, so checkbox-driven
    // multi-select is the only way leagues enter `selectedSports`.
    // Tapping a child row toggles its checkbox.
    const handleClick = () => {
        if (hasChildren) {
            onToggleExpand(item.id);
            return;
        }
        if (isSelectable) onToggle(item.id);
    };

    const handleCheckbox = (e) => {
        e.stopPropagation();
        onToggle(item.id);
    };

    // Hover prefetch: warm the matches request for a leaf league a moment
    // before the user clicks it, so the board hands off instantly instead of
    // cold-fetching for 2-3s. Only leaf rows that actually select on click
    // (not parents, which expand) and aren't already selected. Debounced so a
    // pointer sweeping down the list doesn't fan out a request per row — only
    // the row the pointer rests on warms up.
    const hoverTimerRef = useRef(null);
    const selectsOnClick = isSelectable && !hasChildren && !isSelected;
    const handleMouseEnter = () => {
        if (!selectsOnClick) return;
        const target = resolveHoverPrefetch(item);
        if (!target) return;
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => {
            prefetchMatchesScope(target.status, target.scopeKey);
        }, HOVER_PREFETCH_DELAY_MS);
    };
    const handleMouseLeave = () => {
        clearTimeout(hoverTimerRef.current);
    };
    useEffect(() => () => clearTimeout(hoverTimerRef.current), []);

    // Build row class names
    const rowClasses = [
        'sidebar-item-row',
        isSelected && 'selected',
        hasSelectedChild && 'has-active-child',
        !isSelectable && hasChildren && 'expander-only',
        `level-${level}`,
        `item-type-${item.type || 'standard'}`,
        isPropsPlus && 'props-plus-row',
        isFutures && 'futures-row',
        `icon-${item.id}`,
    ].filter(Boolean).join(' ');

    return (
        <div className={`sidebar-tree-node ${className}`}>
            <div
                className={rowClasses}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                data-sport-id={item.id}
            >

                {showCheckbox && (
                    <div className="sidebar-checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={handleCheckbox} className="sidebar-small-checkbox" />
                    </div>
                )}

                {showBlackArrow && (
                    <span className={`black-expand-arrow ${isExpanded ? 'active' : ''}`}>
                        <i className="fa-solid fa-chevron-down"></i>
                    </span>
                )}

                {showBlueArrow && (
                    <span className={`blue-expand-arrow ${isExpanded ? 'active' : ''}`}>
                        <i className="fa-solid fa-chevron-right"></i>
                    </span>
                )}

                {isPropsPlus && (
                    <span className="props-plus-arrow"><i className="fa-solid fa-arrow-right"></i></span>
                )}

                <div className="sidebar-item-content">
                    {showIcon && item.icon && !isPropsPlus && (
                        <span className="icon sidebar-main-icon">
                            {typeof item.icon === 'string' && item.icon.includes('fa-') ? <i className={item.icon}></i> : item.icon}
                        </span>
                    )}
                    <span className="sidebar-label-text">{item.label}</span>
                    {isPropsPlus && <span className="props-plus-badge">+</span>}
                </div>

            </div>

            {hasChildren && isExpanded && (
                <div className="sidebar-children">
                    {activeChildren.map(child => (
                        <SidebarItem
                            key={child.id}
                            item={child}
                            level={level + 1}
                            selectedIds={selectedIds}
                            onToggle={onToggle}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            isMobile={isMobile}
                            liveSet={liveSet}
                            outrightSet={outrightSet}
                            ancestorsWithSelection={ancestorsWithSelection}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

const DashboardSidebar = ({
    selectedSports = [],
    onToggleSport,
    onContinue,
    betMode = 'straight',
    isOpen = false,
    onCloseSidebar,
    onOpenFeedback,
    isMobileSportsSelectionMode = false,
}) => {
    // Sports list opens fully collapsed on login. Auto-expanding football
    // surprised users who didn't pick it — they had to scroll past an open
    // category they never asked to see. Tap a category to expand it.
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [liveSet, setLiveSet] = useState(null);
    // Sport keys with at least one OPEN outright board (per
    // /api/outrights/sports). null = pending/failed/empty → fail open:
    // every futures child stays visible so a probe blip never hides the
    // futures section. Only a non-empty response actually gates.
    const [outrightSet, setOutrightSet] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    // Team-name search index: lazily populated when the user starts typing.
    // Holds live + upcoming matches so we can match against home/away team
    // names — the static sport tree only knows category/league labels.
    //
    // `searchIndexState` distinguishes four lifecycle values so the empty
    // state can render the right message:
    //   - null     → never fetched (initial)
    //   - 'error'  → fetch failed (network / 5xx) — show "try again"
    //   - []       → fetched, server returned no rows
    //   - array    → fetched, have rows to substring-match
    const [matchesForSearch, setMatchesForSearch] = useState(null);
    const [matchesSearchLoading, setMatchesSearchLoading] = useState(false);
    const [searchIndexFetchedAt, setSearchIndexFetchedAt] = useState(0);

    // Health-probe the sports feed. Hard 5s budget: if the backend or
    // upstream API is slow/unavailable, we abort and leave liveSet=null,
    // which makes `filterActiveChildren` fall back to showing the full
    // static catalog so the sidebar never renders empty under failure.
    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        (async () => {
            const sports = await getAvailableSports({ signal: controller.signal, timeoutMs: 5000 });
            if (cancelled) return;
            if (Array.isArray(sports) && sports.length > 0) {
                setLiveSet(new Set(sports.map((s) => String(s).toLowerCase())));
            }
            // On [] response (empty array = no sports have data right now),
            // leave liveSet as null rather than an empty Set. An empty Set
            // would filter the entire sidebar to nothing, and users would
            // assume the app is broken. A pending/null liveSet shows the
            // static catalog as a safer fallback.
        })();
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, []);

    // Probe which outright boards are open, to hide seasonal futures
    // leaves (NCAAB/NHL off-season, golf majors between tournaments).
    // Deliberately fail-open: any error, timeout, or empty response
    // leaves outrightSet null and the full futures catalog visible —
    // the OutrightsView's own empty state handles "nothing posted".
    // Empty [] is treated as null because the backend also returns []
    // on internal errors (200-[]), so it can't be trusted as "no boards".
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const rows = await getOutrightSports();
                if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
                const keys = rows
                    .map((r) => String(r?.sportKey || '').toLowerCase())
                    .filter(Boolean);
                if (keys.length > 0) setOutrightSet(new Set(keys));
            } catch {
                // fail open — leave outrightSet null
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Per-mode sport allowlist. Teaser is intentionally narrower than the
    // others: real US sportsbooks only offer teasers for football and
    // basketball — baseball/soccer/hockey spreads don't move enough to
    // make a teasable product, and offering them here would let users
    // build tickets a real book would reject. Parlay / If-Bet / Reverse
    // share the wider major-sports list since those don't depend on
    // spread movement the same way.
    const ALLOWED_SPORTS_BY_MODE = {
        parlay: ['football', 'baseball', 'basketball', 'hockey', 'soccer', 'martial-arts'],
        teaser: ['football', 'basketball'],
        if_bet: ['football', 'baseball', 'basketball', 'hockey', 'soccer', 'martial-arts'],
        reverse: ['football', 'baseball', 'basketball', 'hockey', 'soccer', 'martial-arts'],
    };
    const allowedSportsForMode = ALLOWED_SPORTS_BY_MODE[betMode] || null;
    const isRestrictedMode = !!allowedSportsForMode;

    // Merge backend-discovered leagues into the static tree under their
    // parent sport (soccer_argentina_primera_division → SOCCER children),
    // instead of promoting them to flat top-level rows.
    const mergedSports = useMemo(() => buildMergedSportsTree(liveSet), [liveSet]);
    const displaySports = isRestrictedMode
        ? mergedSports.filter(s => allowedSportsForMode.includes(s.id))
        : mergedSports;

    // Pre-compute the set of node IDs that have at least one selected
    // descendant anywhere in their subtree. Built once per render in O(N)
    // and looked up O(1) inside each SidebarItem, instead of every row
    // independently scanning its children. Robust to deep nesting (grand-
    // children, sub-markets) and a guard against an empty/undefined tree
    // keeps it crash-safe even before mergedSports has populated.
    const ancestorsWithSelection = useMemo(() => {
        const result = new Set();
        if (!Array.isArray(selectedSports) || selectedSports.length === 0) return result;
        const selectedSet = new Set(selectedSports);
        const walk = (items) => {
            if (!Array.isArray(items) || items.length === 0) return false;
            let foundAny = false;
            for (const it of items) {
                if (!it) continue;
                const childHasSelected = walk(it.children);
                if (childHasSelected) result.add(it.id);
                if (childHasSelected || selectedSet.has(it.id)) foundAny = true;
            }
            return foundAny;
        };
        walk(mergedSports);
        return result;
    }, [mergedSports, selectedSports]);

    // Auto-expand any group that contains an active selection — on mount
    // and whenever selections change — so a checked futures board is never
    // hidden behind a collapsed section (PO 2026-07-08). Top-level sport
    // ids are DELIBERATELY excluded: the list opens fully collapsed on
    // login by design (auto-opened sports annoyed users; the grey
    // has-active-child highlight already flags them) — do not "fix" that
    // by unioning sports here. Union-only, so a manual collapse sticks
    // until the next selection change or sport re-expand (toggleExpand).
    useEffect(() => {
        if (ancestorsWithSelection.size === 0) return;
        const topLevelIds = new Set(mergedSports.map((s) => s?.id));
        setExpandedIds((prev) => {
            let changed = false;
            const next = new Set(prev);
            ancestorsWithSelection.forEach((id) => {
                if (!topLevelIds.has(id) && !next.has(id)) {
                    next.add(id);
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [ancestorsWithSelection, mergedSports]);

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                return next;
            }
            next.add(id);
            // Expanding a node also re-reveals any DESCENDANT group that
            // holds an active selection (PO 2026-07-08): re-opening
            // FOOTBALL must show "NFL FUTURES" open when its board is
            // checked, even if the user collapsed that group earlier in
            // the session. One-shot at expand time — the user can still
            // collapse the group right after, and nothing re-adds it
            // until the next selection change or the next expand here.
            const node = findNodeById(mergedSports, id);
            if (node) {
                for (const descId of collectDescendantIds(node)) {
                    if (ancestorsWithSelection.has(descId)) next.add(descId);
                }
            }
            return next;
        });
    };

    // Lazy-load matches the first time the user types ≥2 chars.
    // We don't prefetch on mount — most sessions never use the search box,
    // and a multi-row payload would be wasted bandwidth.
    //
    // Fetches `live-upcoming` with limit:1500 so the index covers BOTH
    // in-play games and the full pregame window. The previous limit (200)
    // sorted by startTime ASC filled with already-live matches and
    // dropped later-in-the-day fixtures — so "city" never matched Man
    // City / Kansas City Royals etc. because those rows never made it
    // into the index. payload=core keeps the per-row weight low.
    //
    // Refetch rules:
    //   - never fetched (matchesForSearch === null) → fetch
    //   - fetch errored ('error') and last attempt was >5s ago → retry
    //   - fetched but stale (>60s) → refetch silently so newly-scheduled
    //     games surface mid-session
    // Otherwise we reuse the cached index.
    //
    // History notes for future-you:
    //   v1 — used `matchesSearchLoading` in the deps array AND skipped
    //   the `finally` spinner reset when cancelled. setMatchesSearchLoading
    //   re-triggered the effect, the cleanup flipped cancelled=true on the
    //   in-flight run, the fetch fell into the `if (cancelled)` early-
    //   return, and the finally never cleared the spinner. Stranded
    //   "Searching teams…" forever.
    //
    //   v2 — added a useRef in-flight guard. Fixed v1's loop but introduced
    //   a StrictMode dev hazard: in React 18 StrictMode the effect runs
    //   twice in dev. Run 1 sets ref=true and starts the fetch. Cleanup
    //   1 sets cancelled=true (but the ref stays true — refs survive
    //   cleanups). Run 2 sees ref===true and early-returns. The original
    //   fetch resolves and skips its setMatchesForSearch because
    //   cancelled is true. End state: matchesForSearch=null forever, ref
    //   is eventually cleared by finally, but no subsequent effect run
    //   would refetch because matchesForSearch is still in its initial
    //   null state and the user has stopped typing. Localhost dev users
    //   saw the spinner stuck forever — production was fine because
    //   StrictMode is dev-only.
    //
    //   v3 (current) — drop the cancelled flag entirely. The fetch is a
    //   one-shot data load with no per-render parameters that would
    //   differ between renders, so a result resolved late is still valid
    //   to write. If the component unmounts mid-flight, the setState on
    //   an unmounted component is a no-op + a React warning, which is
    //   acceptable for a one-shot search index. The ref guard still
    //   prevents duplicate concurrent fetches, and the cleanup clears
    //   the ref defensively so a fresh mount can always refetch.
    const SEARCH_INDEX_TTL_MS = 60_000;
    const SEARCH_INDEX_ERROR_RETRY_MS = 5_000;
    const searchFetchInFlightRef = useRef(false);

    // Single source of truth for "should we kick a fetch right now?".
    // Checked by both the typing effect (q ≥ 2 chars) and the focus
    // pre-warm (q irrelevant). Returns false fast when the cached
    // index is still good — avoids needless network and avoids
    // spurious spinner blinks on every focus.
    const maybeFetchSearchIndex = () => {
        if (searchFetchInFlightRef.current) return;
        const ageMs = Date.now() - searchIndexFetchedAt;
        const isError = matchesForSearch === 'error';
        const isFreshArray = Array.isArray(matchesForSearch) && ageMs < SEARCH_INDEX_TTL_MS;
        if (isFreshArray) return;
        if (isError && ageMs < SEARCH_INDEX_ERROR_RETRY_MS) return;

        searchFetchInFlightRef.current = true;
        setMatchesSearchLoading(true);
        (async () => {
            try {
                // Primary source: freshness-filtered live+upcoming snapshot.
                // If it is empty (common on local envs before a fresh sync),
                // fall back to the broader default feed so team search still
                // has names to match against.
                // 'light' — this index only feeds team-NAME search; it never
                // reads odds. 'core' shipped ~12KB of odds per row here (a
                // multi-MB pull on a busy board) for nothing.
                const data = await getMatches('live-upcoming', { limit: 1500, payload: 'light' });
                const normalized = Array.isArray(data) ? data : [];
                if (normalized.length > 0) {
                    setMatchesForSearch(normalized);
                } else {
                    const fallback = await getMatches('', { limit: 1500, payload: 'light' });
                    setMatchesForSearch(Array.isArray(fallback) ? fallback : []);
                }
                setSearchIndexFetchedAt(Date.now());
            } catch {
                setMatchesForSearch('error');
                setSearchIndexFetchedAt(Date.now());
            } finally {
                searchFetchInFlightRef.current = false;
                setMatchesSearchLoading(false);
            }
        })();
    };

    useEffect(() => {
        const q = searchQuery.trim();
        if (q.length < 2) return;
        maybeFetchSearchIndex();
        return () => {
            // Clear the in-flight guard on cleanup so StrictMode's
            // dev-only mount→unmount→mount cycle doesn't strand a second
            // mount behind a ref set during the first mount. Production
            // doesn't double-mount, so this is effectively a no-op there.
            searchFetchInFlightRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, matchesForSearch, searchIndexFetchedAt]);

    // Walk the merged sport tree (static catalog + backend-discovered
    // leagues) and find the first leaf whose sportKeys array contains the
    // given sport key. Used to map a match → selectable sidebar id.
    const findLeafBySportKey = (sportKey) => {
        const target = String(sportKey || '').toLowerCase();
        if (!target) return null;
        const search = (items) => {
            for (const item of items) {
                if (Array.isArray(item.sportKeys) && item.sportKeys.some((k) => String(k).toLowerCase() === target)) {
                    return item;
                }
                if (Array.isArray(item.children)) {
                    const found = search(item.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return search(mergedSports);
    };

    // Filter cached matches by team name, short name, league/sport label,
    // or sport key. Wider surface than just home/away full names so
    // queries like "mlb", "premier", "soccer" surface results that the
    // narrower team-name match would miss. Capped to avoid flooding the
    // sidebar when a generic word matches dozens of games.
    const teamSearchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (q.length < 2 || !Array.isArray(matchesForSearch)) return [];
        const results = [];
        for (const m of matchesForSearch) {
            const home = String(m?.homeTeam || m?.home_team || '').toLowerCase();
            const away = String(m?.awayTeam || m?.away_team || '').toLowerCase();
            const homeShort = String(m?.homeTeamShort || '').toLowerCase();
            const awayShort = String(m?.awayTeamShort || '').toLowerCase();
            const sport = String(m?.sport || '').toLowerCase();
            const sportKey = String(m?.sportKey || '').toLowerCase();
            if (
                home.includes(q) ||
                away.includes(q) ||
                (homeShort && homeShort.includes(q)) ||
                (awayShort && awayShort.includes(q)) ||
                (sport && sport.includes(q)) ||
                (sportKey && sportKey.includes(q))
            ) {
                results.push(m);
                if (results.length >= 12) break;
            }
        }
        return results;
    }, [searchQuery, matchesForSearch]);

    const handleSearchResultClick = (match) => {
        // The point of clicking a search result is "show me THIS game",
        // not "take me to the league's full list". Dispatch a global
        // event the dashboard shell listens for — it pops MatchDetailView
        // directly over whatever the user is currently looking at. We do
        // NOT switch the sidebar selection / navigate to the league
        // anymore, because doing so leaks the click into a navigation the
        // player didn't ask for (e.g. searching "Yankees" on the Live Now
        // page used to dump you into MLB).
        setSearchQuery('');
        if (match && (match.id || match.externalId)) {
            window.dispatchEvent(new CustomEvent('search:open-match', { detail: { match } }));
        }
    };

    // Pre-warm the search index when the user taps the search input.
    // Bridges the gap between "user lands on the page" and "user types
    // 2nd char": by the time they finish typing the query, the live-
    // upcoming snapshot is already in flight or in hand, so the spinner
    // either flashes briefly or never shows. Reason this matters: on
    // the first session-mount the search would otherwise time-share
    // bandwidth with the dashboard's own match fetch and the auth
    // bootstrap, and players reported getting a stuck empty search
    // until they navigated to a sport view and back (which remounts
    // the sidebar). Pre-warming sidesteps that race entirely.
    const handleSearchFocus = () => {
        maybeFetchSearchIndex();
    };

    const filteredSports = useMemo(() => {
        // Hide a parent category if every one of its children was filtered
        // out by the liveSet health check. Parents with no `children`
        // array (UP NEXT, LIVE NOW) always pass.
        const hasVisibleChildren = (item) => {
            if (!Array.isArray(item.children)) return true;
            return filterActiveChildren(item.children, liveSet, outrightSet).length > 0;
        };
        const live = displaySports.filter(hasVisibleChildren);

        const q = searchQuery.trim().toLowerCase();
        if (!q) return live;
        return live.filter((s) => {
            if (s.label.toLowerCase().includes(q)) return true;
            if (Array.isArray(s.children)) {
                return s.children.some((c) => c.label.toLowerCase().includes(q));
            }
            return false;
        });
    }, [displaySports, liveSet, outrightSet, searchQuery]);

    return (
        <aside className={`dash-sidebar ${isOpen ? 'open' : ''} ${isMobileSportsSelectionMode ? 'mobile-sports-selection-mode' : ''}`}>

            {/* Search bar */}
            <div className="search-container desktop-search">
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={handleSearchFocus}
                />
            </div>

            {/* Desktop header */}
            <div className="sidebar-header desktop-only">SPORTS SCHEDULE</div>

            {/* Mobile: UP NEXT / FEATURED secondary tabs */}
            <div className="sidebar-mobile-tabs mobile-only">
                <button
                    className={`mobile-tab-btn ${selectedSports.includes('up-next') ? 'active' : ''}`}
                    onClick={() => onToggleSport('up-next')}
                >
                    &ndash; UP NEXT &ndash;
                </button>
                <button className="mobile-tab-btn active-default">&ndash; FEATURED &ndash;</button>
            </div>

            {/* Team search results: shown when query has ≥2 chars. Sits
                above the static sport list so users see team matches first.
                Empty-state message branches on the four index lifecycle
                values so the user can tell "search broke" from "nothing
                matches your query". The loading spinner ALSO covers the
                "not yet fetched" case (matchesForSearch === null) so the
                render window between typing the second char and the effect
                kicking off doesn't show a blank panel. */}
            {searchQuery.trim().length >= 2 && (
                <div className="sidebar-search-results">
                    {teamSearchResults.length === 0 && (matchesSearchLoading || matchesForSearch === null) && (
                        <div className="sidebar-search-loading">Searching teams…</div>
                    )}
                    {!matchesSearchLoading && teamSearchResults.length === 0 && matchesForSearch === 'error' && (
                        <div
                            className="sidebar-search-empty sidebar-search-error"
                            role="button"
                            tabIndex={0}
                            onClick={() => { setMatchesForSearch(null); setSearchIndexFetchedAt(0); }}
                        >
                            Search temporarily unavailable — tap to retry
                        </div>
                    )}
                    {!matchesSearchLoading && teamSearchResults.length === 0 && Array.isArray(matchesForSearch) && matchesForSearch.length === 0 && (
                        <div className="sidebar-search-empty">No matches scheduled right now</div>
                    )}
                    {!matchesSearchLoading && teamSearchResults.length === 0 && Array.isArray(matchesForSearch) && matchesForSearch.length > 0 && (
                        <div className="sidebar-search-empty">No teams found for "{searchQuery.trim()}"</div>
                    )}
                    {teamSearchResults.map((m) => {
                        const home = m?.homeTeam || m?.home_team || '';
                        const away = m?.awayTeam || m?.away_team || '';
                        const leaf = findLeafBySportKey(m?.sportKey);
                        const sportLabel = leaf?.label || String(m?.sport || m?.sportKey || '').toUpperCase();
                        return (
                            <div
                                key={m.id || `${m.sportKey}-${away}-${home}`}
                                className={`sidebar-search-result-row${leaf ? '' : ' disabled'}`}
                                onClick={leaf ? () => handleSearchResultClick(m) : undefined}
                                role={leaf ? 'button' : undefined}
                                tabIndex={leaf ? 0 : undefined}
                            >
                                <span className="sidebar-search-teams">{away} @ {home}</span>
                                <span className="sidebar-search-sport">{sportLabel}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Sports list */}
            <div className="sidebar-content">

                {/* Mobile-only LIVE NOW row */}
                <div className="mobile-only mobile-live-now-row">
                    <div
                        className={`sidebar-item-row level-0 ${selectedSports.includes('commercial-live') ? 'selected' : ''}`}
                        onClick={() => onToggleSport('commercial-live')}
                        data-sport-id="commercial-live"
                    >
                        <div className="sidebar-item-content">
                            <span className="icon sidebar-main-icon"><i className="fa-solid fa-desktop"></i></span>
                            <span className="sidebar-label-text">LIVE NOW</span>
                        </div>
                    </div>
                </div>

                {filteredSports.map((item) => (
                    <SidebarItem
                        key={item.id}
                        item={item}
                        level={0}
                        selectedIds={selectedSports}
                        onToggle={onToggleSport}
                        expandedIds={expandedIds}
                        onToggleExpand={toggleExpand}
                        className={item.id === 'commercial-live' || item.id === 'up-next' ? 'desktop-only' : ''}
                        isMobile={isMobileSportsSelectionMode}
                        liveSet={liveSet}
                        outrightSet={outrightSet}
                        ancestorsWithSelection={ancestorsWithSelection}
                    />
                ))}
            </div>

            {/* Mobile feedback button */}
            <div className="mobile-only feedback-btn-container">
                <button className="mobile-feedback-btn" onClick={onOpenFeedback}>FEEDBACK</button>
            </div>
        </aside>
    );
};

export default DashboardSidebar;
