import React, { useEffect, useState } from 'react';
import useMatches from '../hooks/useMatches';
import useSportOddsRefresh from '../hooks/useSportOddsRefresh';
import { syncLiveMatches, syncPrematchSport, getStoredAuthToken } from '../api';
import { useToast } from '../contexts/ToastContext';
import { createFallbackTeamLogoDataUri, fetchTeamBadgeUrl } from '../utils/teamLogos';
import { teaserSportGroup } from '../utils/teaserAdjustment';
import { resolveBroadcast } from '../utils/broadcast';
import { isMlbSportKey, formatPitcherLabel, hasListedPitchers, MLB_LISTED_PITCHER_POLICY } from '../utils/pitchers';
import { TERMINAL_MATCH_STATUSES, isLiveLikeMatch } from '../utils/liveStatus';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { getSiteTimezone, getSiteTimezoneLabel } from '../utils/timezone';
import { getSportKeywords, findSportItemById, matchesSportKeyword } from '../data/sportsData';
import {
    formatOdds,
    formatLineValue,
    formatSpreadDisplay,
    formatTotalDisplay,
    getMatchMarket,
    getMarketOutcomeByKeyword,
    getMarketOutcomeByName,
    parseOddsNumber,
} from '../utils/odds';
import {
    FULL_PERIOD,
    buildVisiblePeriods,
    getPeriodsForSport,
    scanMarketsForSuffixes,
} from '../utils/periods';
import PropBuilderModal from './PropBuilderModal';
import MatchDetailView from './MatchDetailView';
import OddsAge from './OddsAge';

// How many alternate-spread rungs to show per team in the inline board
// ladder. The feed ships ~20+ rungs per side; the board shows the ones
// nearest the main line and leaves the full ladder to the "+" sheet so the
// card stays compact on mobile.
const MAX_ALT_SPREAD_RUNGS = 6;

// Faded grey, slightly smaller than the team name — same treatment used
// across every odds board card so the record always reads as supplemental
// metadata rather than competing with the team identifier.
const teamRecordStyle = {
    color: '#9ca3af',
    fontWeight: 500,
    fontSize: '0.85em',
    marginLeft: 4,
    // Keep the record as one unbreakable unit. The hyphens in "(53-22-7)"
    // are valid line-break opportunities, so without this the record splits
    // mid-value (e.g. "(53-" / "22-7)") when the team-name line wraps. As an
    // inline-block it wraps to the next line whole instead.
    display: 'inline-block',
    whiteSpace: 'nowrap',
};

// Format the start time in the site timezone (default ET, override via
// Account → Preferences) so the broadcast row matches the same wall-clock
// the player set their schedule against. Falls back to ET when no
// override is stored.
const formatBroadcastTimeET = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const tz = getSiteTimezone();
    const formatted = date.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
    return `${formatted} ${getSiteTimezoneLabel(tz)}`;
};

// Per-sport grouping for the desktop "Live Now" board (sportId === null,
// status === 'live'). The single useMatches({status:'live'}) call returns
// every in-play game across all sports in one response, so they all land
// together — we just slot a sport header (emoji + label + live count) above
// the first card of each sport so the board reads "⚾ Baseball / games,
// 🎾 Tennis / games" instead of one flat mixed list.
const LIVE_GROUP_META = [
    { key: 'football', label: 'Football', emoji: '🏈', prefixes: ['americanfootball'], order: 1 },
    { key: 'basketball', label: 'Basketball', emoji: '🏀', prefixes: ['basketball'], order: 2 },
    { key: 'baseball', label: 'Baseball', emoji: '⚾', prefixes: ['baseball'], order: 3 },
    { key: 'hockey', label: 'Hockey', emoji: '🏒', prefixes: ['icehockey', 'hockey'], order: 4 },
    { key: 'soccer', label: 'Soccer', emoji: '⚽', prefixes: ['soccer', 'football_'], order: 5 },
    { key: 'tennis', label: 'Tennis', emoji: '🎾', prefixes: ['tennis'], order: 6 },
    { key: 'mma', label: 'MMA', emoji: '🥊', prefixes: ['mma', 'mixedmartialarts'], order: 7 },
    { key: 'boxing', label: 'Boxing', emoji: '🥊', prefixes: ['boxing'], order: 8 },
    { key: 'cricket', label: 'Cricket', emoji: '🏏', prefixes: ['cricket'], order: 9 },
    { key: 'golf', label: 'Golf', emoji: '⛳', prefixes: ['golf'], order: 10 },
    { key: 'rugby', label: 'Rugby', emoji: '🏉', prefixes: ['rugby'], order: 11 },
    { key: 'aussierules', label: 'Aussie Rules', emoji: '🏉', prefixes: ['aussierules'], order: 12 },
    { key: 'motorsport', label: 'Motorsport', emoji: '🏎️', prefixes: ['motorsport', 'racing', 'formula'], order: 13 },
    { key: 'esports', label: 'Esports', emoji: '🎮', prefixes: ['esports'], order: 14 },
];

// Map a raw sportKey (e.g. "baseball_mlb", "icehockey_nhl") to its display
// group. Unknown keys fall back to a title-cased first token so a brand-new
// Rundown sport still groups cleanly instead of vanishing.
const categorizeLiveGroup = (rawSportKey) => {
    const key = String(rawSportKey || '').toLowerCase().trim();
    if (key !== '') {
        for (const meta of LIVE_GROUP_META) {
            if (meta.prefixes.some((p) => key.startsWith(p))) return meta;
        }
    }
    const token = key.split(/[_-]/)[0] || 'other';
    const label = token.charAt(0).toUpperCase() + token.slice(1);
    return { key: token || 'other', label: label || 'Other', emoji: '🏅', order: 999 };
};

const liveGroupHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 14px',
    margin: '16px 0 8px',
    background: '#13294b',
    color: '#fff',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
};

// Red pill next to the start time on a live card showing the current
// inning/quarter/clock (e.g. "TOP 6TH"). Only rendered when status is LIVE.
const liveStateStyle = {
    marginLeft: 8,
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    background: '#ff5051',
    color: '#fff',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    verticalAlign: 'middle',
};

const liveGroupCountStyle = {
    marginLeft: 'auto',
    background: '#ff5051',
    color: '#fff',
    borderRadius: 999,
    padding: '2px 10px',
    fontSize: 12,
    fontWeight: 800,
};

// TERMINAL_MATCH_STATUSES + isLiveLikeMatch now live in utils/liveStatus so the
// board, mobile view and scoreboard sidebar all gate LIVE the same way (and
// require a real in-play signal, not just the feed's live flag).

// Module-level dedupe: when the user multi-selects sports, every mounted
// SportContentView instance fires its own sync. If two instances both try
// to toast about the same failed sportKey, the screen used to flood with
// duplicate "Couldn't fetch latest odds for X" lines. One toast per sport
// per cooldown window is enough.
const SYNC_TOAST_DEDUPE_MS = 30000;
const lastSyncToastAt = new Map();

// NOTE: previously a `lastSyncCompletedAt` map skipped sync POSTs within
// 60 s of the last success. That was a client-side cache and produced
// `trigger=sport-tab-sync-cached` requests in the network tab. Removed
// because live betting cannot serve stale odds — every sport-tab click
// now hits the upstream sync. Per-IP throttle on the backend
// (USER_PREMATCH_SYNC_MIN_INTERVAL_SECONDS=30) still prevents quota burn.
const notifySyncFailure = (sportKey, showToast) => {
    if (!sportKey || typeof showToast !== 'function') return;
    const now = Date.now();
    const last = lastSyncToastAt.get(sportKey) || 0;
    if (now - last < SYNC_TOAST_DEDUPE_MS) return;
    lastSyncToastAt.set(sportKey, now);
    showToast(`Couldn't fetch latest odds for ${sportKey}`, { type: 'warning' });
};

const SportContentView = ({ sportId, selectedItems = [], filter = null, status = 'live-upcoming', activeBetMode = 'straight', limit = 0 }) => {
    const { oddsFormat } = useOddsFormat();
    const [activeTab] = useState('matches');
    const [teamLogos, setTeamLogos] = useState({});
    const [propsOpenMatch, setPropsOpenMatch] = useState(null);
    // Board-level MLB pitcher "Action" toggles, keyed by matchId → {home,away}.
    // Checking a pitcher's box on the board means the player takes Action on
    // that side (the bet stands even if that listed pitcher is scratched). The
    // state is read at add-to-slip time and travels with the selection into the
    // bet slip + backend. Default (absent) = listed pitcher (voids on change).
    const [pitcherActionByMatch, setPitcherActionByMatch] = useState({});
    // Per-match Total ⇄ Team Totals toggle. When a match id is present and
    // truthy, the Total cell renders the away/home team-total columns
    // instead of the game over/under. MLB-only and only when the feed
    // actually shipped team totals (gated at render).
    const [ttModeByMatch, setTtModeByMatch] = useState({});
    // Per-match ALT-mode toggle, driven by the Spread column's "Spread" pill.
    // false (default) → mainline run line / spread + mainline game total;
    // true → the alternate-spread ladder AND the alternate-total ladder shown
    // together (the `alternate_spreads` / `alternate_totals` extended markets).
    // Mutually exclusive with the TT (team totals) mode — selecting one clears
    // the other.
    const [altSpreadByMatch, setAltSpreadByMatch] = useState({});
    const [detailOpenMatch, setDetailOpenMatch] = useState(null);
    const attemptedLogoFetchesRef = React.useRef(new Set());

    const [content, setContent] = useState({ name: '', icon: '', matches: [] });
    const [isLoading, setIsLoading] = useState(true);
    // Period chip strip state — Game / 1H / 2H / 1Q / 2Q / 3Q / 4Q etc.
    // Matches the mobile pattern: which markets actually exist in the
    // current rawMatches set drives which chips render; FULL_PERIOD
    // always renders so the user never loses the Full Game tab.
    const [selectedPeriodId, setSelectedPeriodId] = useState('full');
    const loadGenRef = React.useRef(0);

    // Bump on Account → Preferences → Timezone change so every visible
    // match-time/date label re-renders with the new zone without a page
    // reload. The render of `time`/`date` is derived from getSiteTimezone()
    // inside processMatches, but processMatches doesn't otherwise depend
    // on the stored zone, so we need this trigger.
    const [tzTick, setTzTick] = useState(0);
    useEffect(() => {
        const handler = () => setTzTick((n) => n + 1);
        window.addEventListener('siteTimezone:change', handler);
        return () => window.removeEventListener('siteTimezone:change', handler);
    }, []);
    // Tracks whether the current scope has had a fetch resolve yet. While
    // false, we keep the loading skeleton on screen even if rawMatches
    // happens to be empty — otherwise the user briefly sees "No matches"
    // when switching sports before the new fetch lands.
    const fetchSettledForScopeRef = React.useRef(false);
    const rawMatches = useMatches({ status, scopeKey: `${sportId || 'all'}:${filter || ''}:${limit || 0}`, limit });
    // Collect every distinct sportKey present in the visible
    // matches. Views can mix leagues under one heading (e.g. NBA + WNBA,
    // or several soccer leagues) — refreshing only the first match's
    // sportKey leaves the others stale, so the refresh button needs the
    // full set. Empty array if no matches — button stays disabled then.
    const visibleSportKeys = React.useMemo(() => {
        const keys = new Set();
        for (const m of (content.matches || [])) {
            const k = m?.rawMatch?.sportKey || m?.sportKey;
            if (typeof k === 'string' && k.trim() !== '') keys.add(k.trim().toLowerCase());
        }
        return [...keys];
    }, [content.matches]);

    // Group the live board by sport ONLY on the all-sports live view
    // (sportId === null + status 'live'). Single-sport pages and the
    // live-upcoming default keep the existing flat list. Builds a flat
    // [{match, header}] list so we can inject a sport header above the
    // first card of each group without restructuring the card JSX.
    const groupBySport = sportId == null && status === 'live';
    const displayEntries = React.useMemo(() => {
        const matches = content.matches || [];
        if (!groupBySport) return matches.map((m) => ({ match: m, header: null }));

        // Bucket by sport group, preserving the incoming (time-sorted) order
        // within each group.
        const buckets = new Map();
        for (const m of matches) {
            const meta = categorizeLiveGroup(m?.rawMatch?.sportKey || m?.sportKey);
            if (!buckets.has(meta.key)) buckets.set(meta.key, { meta, matches: [] });
            buckets.get(meta.key).matches.push(m);
        }
        const groups = [...buckets.values()].sort((a, b) => {
            if (a.meta.order !== b.meta.order) return a.meta.order - b.meta.order;
            return a.meta.label.localeCompare(b.meta.label);
        });
        const entries = [];
        for (const g of groups) {
            g.matches.forEach((m, i) => {
                entries.push({
                    match: m,
                    header: i === 0
                        ? { key: g.meta.key, label: g.meta.label, emoji: g.meta.emoji, count: g.matches.length }
                        : null,
                });
            });
        }
        return entries;
    }, [content.matches, groupBySport]);

    // Period chip strip: scan rawMatches for which period suffixes the
    // backend has actually synced (e.g. `_q1`, `_h1`). Always include the
    // empty suffix so the Game chip never disappears. Only chips whose
    // suffix is present render — so a sport without quarter sync doesn't
    // show a dead Q1 chip.
    //
    // CRITICAL: scope the scan to THIS section's sport. rawMatches carries
    // every league the API returned, so scanning the whole set leaked other
    // sports' suffixes in (e.g. NHL's `_p1` showed a dead P1 chip under NBA)
    // — the chip rendered but clicking it found no market in NBA games, so
    // odds never changed. Filtering by the same sport keywords as the match
    // list keeps each section's chips honest. Empty sportId (generic
    // fallback section) keeps scanning everything, matching the list filter.
    const availableSuffixes = React.useMemo(() => {
        const set = new Set(['']);
        const keywords = sportId ? getSportKeywords(sportId) : null;
        (rawMatches || []).forEach((match) => {
            if (keywords) {
                const sportValue = String(match?.sport || '').toLowerCase();
                const sportKeyValue = String(match?.sportKey || '').toLowerCase();
                if (!sportValue && !sportKeyValue) return;
                const haystack = `${sportValue}|${sportKeyValue}`;
                if (!keywords.some((k) => matchesSportKeyword(haystack, k))) return;
            }
            scanMarketsForSuffixes(match?.odds?.markets, set);
            scanMarketsForSuffixes(match?.odds?.extendedMarkets, set);
            scanMarketsForSuffixes(match?.extendedMarkets, set);
        });
        return set;
    }, [rawMatches, sportId]);

    const periods = React.useMemo(() => {
        const preset = getPeriodsForSport(sportId);
        return buildVisiblePeriods(preset, availableSuffixes);
    }, [sportId, availableSuffixes]);

    // Snap back to FULL whenever the active period vanishes from the
    // available set (e.g. sport change drops a chip we were on).
    React.useEffect(() => {
        if (selectedPeriodId === 'full') return;
        if (!periods.some((p) => p.id === selectedPeriodId)) {
            setSelectedPeriodId('full');
        }
    }, [selectedPeriodId, periods]);

    const activePeriod = periods.find((p) => p.id === selectedPeriodId) || FULL_PERIOD;
    const { showToast } = useToast();
    const { trigger: triggerRefresh, isRefreshing, cooldownRemainingSec } = useSportOddsRefresh(visibleSportKeys, { showToast });
    // 2-second cooldown so users can't spam-click the Refresh button. The
    // server already throttles per-IP, but locking the UI here is the
    // primary spam-protection — the network request never even fires.
    const [liveSyncSpinning, setLiveSyncSpinning] = React.useState(false);
    const liveSyncLastClickRef = React.useRef(0);

    const handleRefreshClick = React.useCallback(() => {
        // Live Now path: synchronous live odds sync via POST
        // /api/sync/live. The endpoint returns fresh rows (or cached ones
        // if throttled) in a single round-trip. Once it resolves, fire
        // matches:force-refetch so useMatches re-reads from the now-fresh
        // DB. Target: <20s sync for live odds update.
        // After error (timeout/rate-limit), use cached odds and don't block UI.
        if (status === 'live') {
            const sinceLast = Date.now() - liveSyncLastClickRef.current;
            if (liveSyncSpinning || sinceLast < 60000) return;
            liveSyncLastClickRef.current = Date.now();
            setLiveSyncSpinning(true);
            // 20s timeout (up from 3s) to allow live sync to complete.
            // If the backend takes longer, surface cached rows anyway;
            // the user is never stuck waiting.
            const ctrl = new AbortController();
            const timer = window.setTimeout(() => ctrl.abort(), 20000);
            syncLiveMatches({ signal: ctrl.signal, timeout: 20000 })
                .then(({ throttled }) => {
                    window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                        detail: { reason: 'user-live-sync' },
                    }));
                    if (throttled) {
                        showToast?.('Refreshing too fast — showing latest cached odds', { type: 'info' });
                    } else {
                        showToast?.('Live odds updated', { type: 'success' });
                    }
                })
                .catch((err) => {
                    if (err?.name !== 'AbortError') {
                        showToast?.("Couldn't refresh, showing last known odds", { type: 'warning' });
                    }
                })
                .finally(() => {
                    window.clearTimeout(timer);
                    setLiveSyncSpinning(false);
                });
            return;
        }
        // Pre-match path keeps the existing per-sport refresh hook so we
        // don't regress the bulk /api/odds/refresh-multi behavior.
        triggerRefresh({
            onSuccess: () => {
                // DB already updated by /api/odds/refresh{,-multi}; force the
                // UI to re-read. matches:force-refetch bypasses the backend
                // sync-defer path that matches:refresh triggers.
                window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                    detail: { reason: 'user-odds-refresh', sportKeys: visibleSportKeys },
                }));
            },
        });
    }, [status, triggerRefresh, visibleSportKeys, liveSyncSpinning, showToast]);

    // Resolve sportKey(s) directly from sportId via sportsData,
    // BEFORE any matches arrive. This lets the sport-tab parallel sync
    // fire on first mount (when content.matches is still empty) instead
    // of waiting for matches to load — the previous version short-
    // circuited because visibleSportKeys was [] and never re-fired.
    const intendedSportKeys = React.useMemo(() => {
        if (!sportId) return [];
        const item = findSportItemById(sportId);
        if (item && Array.isArray(item.sportKeys)) {
            return item.sportKeys.map((k) => String(k).toLowerCase());
        }
        // Dynamic api-* entries (auto-injected from /api/matches/sports) are
        // not in sportsData, so derive the sport key from the id —
        // otherwise on-demand sync never fires for these and the user has
        // to wait for the next cron tick to see fresh odds.
        if (typeof sportId === 'string' && sportId.startsWith('api-')) {
            return [sportId.slice(4).replace(/-/g, '_').toLowerCase()];
        }
        return [];
    }, [sportId]);

    // Sport-tab click: fire POST /api/sync/prematch/{sportKey} in parallel
    // with the GET that useMatches kicks off. AbortController cancels in-
    // flight syncs when the user switches sports rapidly, so we never paint
    // stale data over fresh. Only runs for pre-match views — the live path
    // owns its own /api/sync/live trigger. Uses intendedSportKeys (from
    // sportsData) instead of visibleSportKeys (from rawMatches) so it
    // fires immediately on mount, not after the first GET resolves.
    // Ref to the latest cached rows so the sync-error toast can suppress
    // itself when we already have rows to show (Bug 3: don't nag the user
    // about a refresh failure when the page isn't actually empty).
    const rawMatchesRef = React.useRef(rawMatches);
    React.useEffect(() => { rawMatchesRef.current = rawMatches; }, [rawMatches]);

    // LIVE NOW open: fire a synchronous live odds sync so the first
    // paint shows the freshest possible odds instead of waiting up to 30s
    // for AUTO_POLL or for the worker's next live tick. Backend has a 15s
    // per-IP throttle on /api/sync/live, so re-mounting cheaply skips the
    // upstream call when it would be redundant. Anonymous browsers go
    // through a different auth path (X-Tick-Secret only) — here we require
    // a stored auth token before firing so logged-out visitors still get
    // the cached rows from GET /api/matches without a 401 toast.
    //
    // The sync ALSO recurs every 60s while Live Now stays open. Backend's
    // 90s live-freshness gate hides rows whose `lastOddsSyncAt` is older
    // than 90s — if the worker stalls between ticks, /api/matches?status=live
    // returns [] and the board flashes empty. Re-poking /api/sync/live
    // every 60s keeps `lastOddsSyncAt` inside the window so rows never
    // age out from under the player. Pauses while tab is hidden.
    React.useEffect(() => {
        if (status !== 'live') return undefined;
        if (!getStoredAuthToken()) return undefined;
        let cancelled = false;
        let activeController = null;
        const runSync = (reason) => {
            if (cancelled) return;
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            if (activeController) activeController.abort();
            const ctrl = new AbortController();
            activeController = ctrl;
            syncLiveMatches({ signal: ctrl.signal })
                .then(() => {
                    if (cancelled) return;
                    window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                        detail: { reason },
                    }));
                })
                .catch(() => { /* throttled / aborted — auto-poll will catch up */ });
        };
        const initialTimer = window.setTimeout(() => runSync('live-mount-sync'), 200);
        const intervalId = window.setInterval(() => runSync('live-periodic-sync'), 60000);
        return () => {
            cancelled = true;
            window.clearTimeout(initialTimer);
            window.clearInterval(intervalId);
            if (activeController) activeController.abort();
        };
    }, [status]);

    React.useEffect(() => {
        if (status === 'live') return undefined;
        if (intendedSportKeys.length === 0) return undefined;
        // POST /api/sync/prematch requires auth (JWT or X-Tick-Secret).
        // Anonymous browsers have neither, so the POST 401s and we used to
        // toast "Couldn't fetch latest odds for …". Skip the call entirely —
        // the cron tick keeps DB rows fresh, and the GET /api/matches that
        // useMatches owns is public, so the page still renders correctly.
        if (!getStoredAuthToken()) return undefined;
        const ctrl = new AbortController();
        let cancelled = false;

        // Debounce: wait 300ms before firing — rapid sport-tab clicks
        // (NBA → Soccer → NBA) abort the timer and never hit the network.
        // This is request-economy, not data caching: it just collapses
        // mid-flight key changes into one POST per final selection.
        const timer = window.setTimeout(() => {
            if (cancelled) return;
            Promise.all(intendedSportKeys.map(async (sportKey) => {
                try {
                    await syncPrematchSport(sportKey, { signal: ctrl.signal });
                } catch (err) {
                    if (err?.name === 'AbortError') return;
                    if (cancelled) return;
                    // Suppress the toast when cached rows are already on
                    // screen — sync was best-effort, user has data.
                    const haveCachedRows = Array.isArray(rawMatchesRef.current) && rawMatchesRef.current.length > 0;
                    if (haveCachedRows) return;
                    notifySyncFailure(sportKey, showToast);
                }
            })).then(() => {
                if (cancelled) return;
                // Force-refetch after all parallel syncs settle so the UI
                // sees the freshly-synced rows in one consistent paint.
                window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                    detail: { reason: 'sport-tab-sync', sportKeys: intendedSportKeys },
                }));
            });
        }, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            ctrl.abort();
        };
    }, [intendedSportKeys, status, showToast]);

    // Prefetch odds for this sport ahead of user clicks, so sport selection
    // is instant (render from cache + background refresh in parallel).
    // Fires when the view first mounts and on visibility changes.
    React.useEffect(() => {
        if (intendedSportKeys.length === 0) return undefined;
        if (typeof document === 'undefined') return undefined;
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') return;
            // Tab became visible — prefetch odds so sport click is instant
            // Fire and forget: prefetch is best-effort, errors don't block rendering
            Promise.all(intendedSportKeys.map(async (sportKey) => {
                try {
                    // Trigger a background fetch for this sport's matches
                    window.dispatchEvent(new CustomEvent('matches:prefetch', {
                        detail: { sportKeys: [sportKey] },
                    }));
                } catch (err) {
                    // Silently ignore: prefetch failures don't affect UX
                }
            })).catch(() => {});
        };

        // Fire once on mount
        handleVisibilityChange();

        // Re-fire when tab becomes visible
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [intendedSportKeys]);

    // Listen for prefetch events and cache the results so sport clicks
    // render from cache instantly.
    // matches, peek at the oldest visible lastOddsSyncAt. If anything is
    // older than ~90s, silently fire the refresh button so the user sees
    // current odds within a couple seconds of landing — no manual action
    // required. Only fires once per (sportId,filter) mount; subsequent
    // freshness is owned by the auto-poll in useMatches.
    const coldLoadRefreshFiredRef = React.useRef(false);
    React.useEffect(() => {
        coldLoadRefreshFiredRef.current = false;
    }, [sportId, filter]);
    React.useEffect(() => {
        if (coldLoadRefreshFiredRef.current) return;
        if (visibleSportKeys.length === 0) return;
        const matches = content.matches || [];
        if (matches.length === 0) return;
        let oldestAgeMs = 0;
        const now = Date.now();
        for (const m of matches) {
            const ts = m?.rawMatch?.lastOddsSyncAt || m?.rawMatch?.lastUpdated || m?.lastOddsSyncAt;
            const t = ts ? new Date(ts).getTime() : 0;
            if (!t || Number.isNaN(t)) continue;
            const age = now - t;
            if (age > oldestAgeMs) oldestAgeMs = age;
        }
        if (oldestAgeMs > 90000) {
            coldLoadRefreshFiredRef.current = true;
            // Fire and forget — refresh hook owns its own cooldown so this
            // is a no-op if a manual click just happened.
            triggerRefresh({
                onSuccess: () => {
                    window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                        detail: { reason: 'cold-load-auto-refresh', sportKeys: visibleSportKeys },
                    }));
                },
            });
        }
    }, [content.matches, visibleSportKeys, triggerRefresh]);
    const degradedSummary = React.useMemo(() => {
        const all = Array.isArray(rawMatches) ? rawMatches : [];
        const blocked = all.filter((m) => m?.isBettable === false);
        const staleBlocked = blocked.filter((m) => {
            const reason = String(m?.bettingBlockedReason || '').toLowerCase();
            return m?.oddsFeedStale === true || reason.includes('stale') || reason.includes('suspend');
        });
        return {
            blockedCount: blocked.length,
            staleBlockedCount: staleBlocked.length,
            sampleReason: String(staleBlocked[0]?.bettingBlockedReason || blocked[0]?.bettingBlockedReason || '').trim(),
        };
    }, [rawMatches]);

    // Clear stale content immediately when sportId/filter/status/limit
    // changes. The useMatches hook also clears its internal state on the
    // same trigger, so by the time processMatches runs it sees rawMatches=[]
    // — which combined with fetchSettledForScopeRef=false means the loading
    // skeleton stays on screen until the new fetch actually resolves.
    React.useEffect(() => {
        setContent({ name: '', icon: '', matches: [] });
        setIsLoading(true);
        fetchSettledForScopeRef.current = false;
    }, [sportId, filter, status, limit]);

    // Listen for the matches:refresh-completed event from useMatches; it
    // fires after every fetch (success or error). When it fires, mark the
    // current scope as settled so processMatches is allowed to drop the
    // loading skeleton even when filteredMatches is empty (legitimate
    // "no games available" case).
    React.useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handler = () => { fetchSettledForScopeRef.current = true; };
        window.addEventListener('matches:refresh-completed', handler);
        return () => window.removeEventListener('matches:refresh-completed', handler);
    }, []);

    React.useEffect(() => {
        // Determine sport name and icon — prefer the sportsData tree, fallback to hardcoded map
        const sportMapFallback = {
            nfl: { name: 'NFL', icon: 'fa-solid fa-football' },
            nba: { name: 'NBA', icon: 'fa-solid fa-basketball' },
            mlb: { name: 'MLB', icon: 'fa-solid fa-baseball' },
            nhl: { name: 'NHL', icon: 'fa-solid fa-hockey-puck' },
            epl: { name: 'EPL (Soccer)', icon: 'fa-solid fa-futbol' },
            boxing: { name: 'Boxing', icon: 'fa-solid fa-hand-fist' },
            mma: { name: 'MMA/UFC', icon: 'fa-solid fa-hand-fist' },
            ncaaf: { name: 'NCAA Football', icon: 'fa-solid fa-building-columns' },
            ncaab: { name: 'NCAA Basketball', icon: 'fa-solid fa-basketball' },
        };

        // Auto-injected sidebar entries (e.g. `api-icehockey-liiga`) are not
        // in the static sportsData tree, so findSportItemById misses them and
        // the header used to fall through to a generic "Sports" label —
        // making multi-selection look like duplicate sections. Synthesize a
        // readable label + icon from the slug (mirrors prettifySportKey /
        // iconForSportKey in DashboardSidebar).
        const ICON_BY_CATEGORY = {
            basketball: 'fa-solid fa-basketball',
            americanfootball: 'fa-solid fa-football',
            baseball: 'fa-solid fa-baseball-bat-ball',
            icehockey: 'fa-solid fa-hockey-puck',
            soccer: 'fa-solid fa-futbol',
            tennis: 'fa-solid fa-table-tennis-paddle-ball',
            golf: 'fa-solid fa-golf-ball-tee',
            mma: 'fa-solid fa-hand-fist',
            boxing: 'fa-solid fa-mitten',
            cricket: 'fa-solid fa-baseball',
            rugbyleague: 'fa-solid fa-football',
            rugbyunion: 'fa-solid fa-football',
            aussierules: 'fa-solid fa-football',
            motorsport: 'fa-solid fa-flag-checkered',
        };
        const synthesizeFromApiId = (id) => {
            if (!id || !id.startsWith('api-')) return null;
            const slug = id.slice(4);
            const label = slug
                .split('-')
                .filter(Boolean)
                .map((p) => (p === p.toUpperCase() ? p : p.charAt(0).toUpperCase() + p.slice(1)))
                .join(' ');
            const category = slug.split('-')[0];
            return { name: label, icon: ICON_BY_CATEGORY[category] || 'fa-solid fa-trophy' };
        };

        const resolveSportInfo = (id) => {
            const item = findSportItemById(id);
            if (item) return { name: item.label, icon: item.icon || 'fa-solid fa-trophy' };
            const synthesized = synthesizeFromApiId(id);
            if (synthesized) return synthesized;
            return sportMapFallback[id] || { name: 'Sports', icon: 'fa-solid fa-trophy' };
        };

        // Handle sub-categories via filter metadata from sportsData
        let resolvedSportId = sportId;
        let periodFilter = null;

        const effectiveFilter = filter || sportId;
        const filterItem = effectiveFilter ? findSportItemById(effectiveFilter) : null;

        if (filterItem?.filter === 'half') periodFilter = 'H1';
        else if (filterItem?.filter === 'quarter') periodFilter = 'Q1';
        else if (filterItem?.filter === 'period1') periodFilter = 'P1';

        // Legacy sub-category resolution
        if (effectiveFilter) {
            if (effectiveFilter.startsWith('nfl-') && !filterItem) {
                resolvedSportId = 'nfl';
                if (effectiveFilter.includes('1st-quarter')) periodFilter = 'Q1';
                if (effectiveFilter.includes('2nd-quarter')) periodFilter = 'Q2';
                if (effectiveFilter.includes('1st-half')) periodFilter = 'H1';
            } else if (effectiveFilter.startsWith('ncaa-') && effectiveFilter !== 'ncaa-basketball' && effectiveFilter !== 'ncaa-props-plus' && !filterItem) {
                resolvedSportId = 'ncaaf';
                if (effectiveFilter.includes('1st-quarter')) periodFilter = 'Q1';
                if (effectiveFilter.includes('2nd-quarter')) periodFilter = 'Q2';
                if (effectiveFilter.includes('1st-half')) periodFilter = 'H1';
            }
        }

        const sportInfo = resolveSportInfo(resolvedSportId);
        const gen = ++loadGenRef.current;
        setIsLoading(true);

        // Map rawMatches into view-friendly structure and filter by sportId where possible
            const processMatches = () => {
                // Guard against stale processing from rapid selection changes
                if (gen !== loadGenRef.current) return;
                const matchesData = (rawMatches || []);
                const keywords = getSportKeywords(resolvedSportId);

            // Teaser is football/basketball only — drop every other
            // sport when on the Teaser tab so the board only shows
            // games the product supports. Matches the same gate in
            // MobileContentView and avoids the dead-end click where
            // the user adds an MLB leg and the slip rejects it.
            const isTeaserMode = String(activeBetMode || '').toLowerCase() === 'teaser';
            const isStrictLiveBoard = String(status || '').toLowerCase() === 'live';
            let filteredMatches = matchesData.filter(m => {
                // Match must have at least one usable market to render. A row
                // with no markets has nothing to bet on, so drop it everywhere
                // — keeping shells around just to look populated produces
                // cards full of dashes. The 60s grace window in useMatches
                // keeps rawMatches stable through worker hiccups, so true
                // "no markets" now means upstream really pulled the lines.
                const markets = m?.odds?.markets;
                const ext = Array.isArray(m?.odds?.extendedMarkets) ? m.odds.extendedMarkets : m?.extendedMarkets;
                const books = m?.odds?.bookmakers;
                const bookHasMarkets = Array.isArray(books) && books.some((b) => Array.isArray(b?.markets) && b.markets.length > 0);
                const hasMarkets = (Array.isArray(markets) && markets.length > 0)
                    || (Array.isArray(ext) && ext.length > 0)
                    || bookHasMarkets;
                if (!hasMarkets) return false;
                if (isTeaserMode) {
                    const group = teaserSportGroup(m?.sportKey || m?.sport);
                    if (!group) return false;
                    // Drop live legs on pregame boards only. Strict `live`
                    // status (Live Now / in-play hub) must still list games
                    // even when Teaser is selected — otherwise the hub reads
                    // empty while teaser add is already blocked in App.jsx.
                    if (!isStrictLiveBoard) {
                        if (isLiveLikeMatch(m)) return false;
                    }
                }
                if (!resolvedSportId) return true;
                const sportValue = String(m?.sport || '').toLowerCase();
                const sportKeyValue = String(m?.sportKey || '').toLowerCase();
                if (!sportValue && !sportKeyValue) return false;
                const haystack = `${sportValue}|${sportKeyValue}`;
                // Token-boundary match: avoids 'nba' substring-matching
                // 'wnba' / 'basketball_wnba' and leaking WNBA into the NBA
                // filter. See matchesSportKeyword in sportsData.js.
                return keywords.some(k => matchesSportKeyword(haystack, k));
            });

            if (periodFilter) {
                filteredMatches = filteredMatches.filter((m) => {
                    const period = String(m?.score?.period || '').toUpperCase();
                    const eventStatus = String(m?.score?.event_status || '').toUpperCase();
                    if (!period && !eventStatus) return true;
                    if (periodFilter === 'Q1') return /\bQ1\b|1ST\s*QUARTER/.test(period) || eventStatus.includes('1ST_QUARTER');
                    if (periodFilter === 'Q2') return /\bQ2\b|2ND\s*QUARTER/.test(period) || eventStatus.includes('2ND_QUARTER');
                    if (periodFilter === 'H1') return period.includes('H1') || period.includes('1H') || eventStatus.includes('1ST_HALF');
                    return true;
                });
            }

            // Fallback removed: If filteredMatches is empty, show empty state instead of all matches.
            // if (resolvedSportId && filteredMatches.length === 0) {
            //     filteredMatches = matchesData;
            // }

            const extractOdds = (match, homeName, awayName) => {
                // Period-aware market lookup: suffix is '' for Full Game,
                // '_q1' for 1Q, '_h1' for 1H, etc. extendedMarkets contains
                // the suffixed entries; the base markets[] array holds the
                // full-game equivalents. getMatchMarkets() folds them
                // together, so a single getMatchMarket(`h2h_q1`) reads the
                // right one regardless of where it lives.
                const suffix = activePeriod.suffix || '';
                const h2h = getMatchMarket(match, `h2h${suffix}`);
                const spreads = getMatchMarket(match, `spreads${suffix}`);
                const totals = getMatchMarket(match, `totals${suffix}`);

                const h2hHome = getMarketOutcomeByName(h2h, homeName);
                const h2hAway = getMarketOutcomeByName(h2h, awayName);
                const spreadHome = getMarketOutcomeByName(spreads, homeName);
                const spreadAway = getMarketOutcomeByName(spreads, awayName);
                const totalOver = getMarketOutcomeByKeyword(totals, 'over');
                const totalUnder = getMarketOutcomeByKeyword(totals, 'under');

                // Team totals are full-game only (MAIN board). Outcomes carry
                // canonical structured fields {team, teamSide, side, point,
                // price}; `name` ("Detroit Over") is display-only. We bucket by
                // teamSide+side and keep the raw outcome so the slip can send
                // the exact outcome name as the selection key. Missing sides
                // stay null — never synthesize the absent Over/Under.
                const teamTotalsMarket = getMatchMarket(match, 'team_totals');
                const ttOutcomes = Array.isArray(teamTotalsMarket?.outcomes) ? teamTotalsMarket.outcomes : [];
                const pickTeamTotal = (teamSide, side) =>
                    ttOutcomes.find((o) => o?.teamSide === teamSide && o?.side === side) || null;
                const teamTotalLeg = (outcome) => (outcome ? {
                    name: String(outcome.name || ''),
                    team: outcome.team ?? null,
                    teamSide: outcome.teamSide ?? null,
                    side: outcome.side ?? null,
                    point: outcome.point ?? null,
                    price: parseOddsNumber(outcome.price),
                } : null);

                return {
                    spread: {
                        homePoint: spreadHome?.point ?? null,
                        homeOdds: parseOddsNumber(spreadHome?.price),
                        // Server-computed Buy Points ladder for this side
                        // (BuyPointsPricing). Carried into the slip leg so the
                        // dropdown shows authoritative options; null falls back
                        // to the client ladder.
                        homeAlternateLines: Array.isArray(spreadHome?.alternateLines) ? spreadHome.alternateLines : null,
                        awayPoint: spreadAway?.point ?? null,
                        awayOdds: parseOddsNumber(spreadAway?.price),
                        awayAlternateLines: Array.isArray(spreadAway?.alternateLines) ? spreadAway.alternateLines : null,
                    },
                    moneyline: {
                        homeOdds: parseOddsNumber(h2hHome?.price),
                        awayOdds: parseOddsNumber(h2hAway?.price),
                    },
                    total: {
                        point: totalOver?.point ?? totalUnder?.point ?? null,
                        overOdds: parseOddsNumber(totalOver?.price),
                        overAlternateLines: Array.isArray(totalOver?.alternateLines) ? totalOver.alternateLines : null,
                        underOdds: parseOddsNumber(totalUnder?.price),
                        underAlternateLines: Array.isArray(totalUnder?.alternateLines) ? totalUnder.alternateLines : null,
                    },
                    teamTotals: {
                        away: {
                            over: teamTotalLeg(pickTeamTotal('away', 'over')),
                            under: teamTotalLeg(pickTeamTotal('away', 'under')),
                        },
                        home: {
                            over: teamTotalLeg(pickTeamTotal('home', 'over')),
                            under: teamTotalLeg(pickTeamTotal('home', 'under')),
                        },
                    },
                };
            };

            filteredMatches = filteredMatches.map(match => {
                const homeName = match.homeTeam || match.home_team || '';
                const awayName = match.awayTeam || match.away_team || '';

                // Convention in this component: team1 = away (rendered left), team2 = home (rendered right).
                // Score variables MUST follow the same pairing — odds handlers below depend on this.
                let awayScore = match.score?.score_away ?? 0;
                let homeScore = match.score?.score_home ?? 0;

                const siteTz = getSiteTimezone();
                const siteTzLabel = getSiteTimezoneLabel(siteTz);
                return {
                    id: match.id || match.externalId,
                    // Render in the site timezone (Account → Preferences →
                    // Timezone) instead of the browser's local zone. Without
                    // the timeZone option toLocaleTimeString falls back to
                    // navigator locale, which produces "10:00 AM GMT+5" for
                    // a player in Pakistan even when the account is set to ET.
                    time: match.startTime
                        ? `${new Date(match.startTime).toLocaleTimeString('en-US', { timeZone: siteTz, hour: '2-digit', minute: '2-digit', hour12: true })} ${siteTzLabel}`
                        : '',
                    date: match.startTime
                        ? new Date(match.startTime).toLocaleDateString('en-US', { timeZone: siteTz, month: 'numeric', day: 'numeric', year: 'numeric' })
                        : '',
                    // Broadcast row above the match-header. Resolved client-side
                    // so we can keep the chip palette in one place; raw string
                    // comes from ESPN's scoreboard side-channel via the
                    // matches projection.
                    broadcast: resolveBroadcast(match.broadcast),
                    // Strip any trailing ISO timestamp the feed appends to
                    // event_name so the raw date never leaks into the row.
                    eventName: (typeof match.eventName === 'string' ? match.eventName.trim() : '')
                        .replace(/\s*[-–—]\s*\d{4}-\d{2}-\d{2}T[0-9:.]+Z?\s*$/, ''),
                    broadcastTime: formatBroadcastTimeET(match.startTime),
                    // shortName + record are populated server-side by
                    // TeamNormalizer (ESPN scoreboard for records, both
                    // feeds for short names). They fall back to the full
                    // name / empty record when the row predates the layer.
                    sportKey: match.sportKey || '',
                    sport: match.sport || match.sportTitle || '',
                    team1: {
                        name: awayName,
                        // Full "City Mascot" for DISPLAY. `name` (the short city)
                        // stays the placement selection + dedupe key.
                        fullName: match.awayTeamFull || awayName,
                        shortName: match.awayTeamShort || awayName,
                        // Raw short code (e.g. "CIN", "SF", "CWS") fed to the
                        // sport-aware logo resolver. Kept separate from the
                        // display-only `shortName` fallback above so the
                        // abbreviation path can fire for city-only/variant
                        // names whose full `name` isn't a TEAM_LOGO_MAP key.
                        abbr: match.awayTeamShort || '',
                        record: match.awayTeamRecord || '',
                    },
                    team2: {
                        name: homeName,
                        fullName: match.homeTeamFull || homeName,
                        shortName: match.homeTeamShort || homeName,
                        abbr: match.homeTeamShort || '',
                        record: match.homeTeamRecord || '',
                    },
                    score1: awayScore,
                    score2: homeScore,
                    // Listed starting pitchers (MLB only; null elsewhere).
                    // Rendered under the matchup and surfaced into the bet slip
                    // so the player can take Action per pitcher.
                    pitchers: {
                        away: match.awayPitcher || null,
                        home: match.homePitcher || null,
                    },
                    // Live game state — inning / quarter / period + clock. The
                    // backend stores the human label in `eventStatusDetail`
                    // (e.g. "Top 6th", "2nd Quarter") and a numeric period +
                    // clock in score.game_period / score.display_clock. Prefer
                    // the label; fall back to period+clock. Empty for non-live.
                    liveState: (() => {
                        const detail = String(match.eventStatusDetail || '').trim();
                        if (detail) return detail;
                        const clock = String(match.score?.display_clock || '').trim();
                        const p = Number(match.score?.game_period || 0);
                        if (p > 0 && clock) return `P${p} · ${clock}`;
                        if (p > 0) return `Period ${p}`;
                        return clock;
                    })(),
                    // LIVE badge is the truth-test the user reads at a
                    // glance. It must reflect BOTH "this row is in-progress"
                    // AND "the odds you're seeing are fresh enough to bet
                    // on". When the backend has flagged the row as
                    // not-bettable (isBettable=false from a stale odds
                    // sweep, manual suspension, or sport-wide circuit
                    // breaker), we render SUSPENDED so the player isn't
                    // looking at a misleading green LIVE chip while the
                    // bet buttons are disabled. SCHEDULED stays the
                    // default for pre-kickoff rows.
                    status: (() => {
                        const normalizedStatus = String(match.status || '').toLowerCase();
                        const isTerminal = TERMINAL_MATCH_STATUSES.has(normalizedStatus);
                        if (isTerminal) return 'SCHEDULED';
                        if (!isLiveLikeMatch(match)) return 'SCHEDULED';
                        return match.isBettable === false ? 'SUSPENDED' : 'LIVE';
                    })(),
                    odds: extractOdds(match, homeName, awayName),
                    rawMatch: match // Keep raw for betting
                };
            });

                setContent({
                    ...sportInfo,
                    matches: filteredMatches,
                });
                // Keep the loading skeleton on screen until the FIRST fetch
                // for this scope has resolved. Without this gate, a clicked
                // sport flashes "No matches available" between the scope
                // switch and the fetch completing — even though the data
                // is on its way and arrives ~200ms later.
                if (filteredMatches.length > 0 || fetchSettledForScopeRef.current) {
                    setIsLoading(false);
                }
            };

        processMatches();

    // activePeriod.suffix included so flipping the chip recomputes odds.
    // tzTick included so the next Account → Preferences → Timezone change
    // re-runs processMatches and refreshes every visible `time`/`date` label.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sportId, filter, rawMatches, activePeriod.suffix, tzTick]);

    React.useEffect(() => {
        const teams = [];
        (content.matches || []).forEach((match) => {
            if (match.team1?.name) teams.push({ name: match.team1.name, sportKey: match.sportKey, sport: match.sport, abbr: match.team1.abbr, fullName: match.team1.fullName });
            if (match.team2?.name) teams.push({ name: match.team2.name, sportKey: match.sportKey, sport: match.sport, abbr: match.team2.abbr, fullName: match.team2.fullName });
        });

        teams.forEach(({ name: teamName, sportKey, sport, abbr, fullName }) => {
            if (!teamName || attemptedLogoFetchesRef.current.has(teamName)) return;
            attemptedLogoFetchesRef.current.add(teamName);
            const ctx = { sportKey, sport, abbr, fullName };
            fetchTeamBadgeUrl(teamName, ctx).then((logoUrl) => {
                setTeamLogos((prev) => ({
                    ...prev,
                    [teamName]: logoUrl || ''
                }));
            });
        });
    }, [content.matches]);

    const togglePitcherAction = (matchId, side) => {
        setPitcherActionByMatch((prev) => {
            const cur = prev[matchId] || { home: false, away: false };
            return { ...prev, [matchId]: { ...cur, [side]: !cur[side] } };
        });
    };

    const handleAddToSlip = (matchId, selection, marketType, odds, matchName, marketLabel, line = null, meta = {}) => {
        const parsedOdds = parseOddsNumber(odds);
        if (!matchId || !selection || parsedOdds === null) return;
        const parsedLine = Number(line);
        const action = pitcherActionByMatch[matchId] || { home: false, away: false };
        // Resolve the leg's full DISPLAY name from the short selection by
        // matching it to the raw match's team names. `selection` stays the
        // short match key; only the display label is the full "City Mascot".
        const raw = (content?.matches || []).find((m) => (m.id || m.externalId) === matchId);
        const selectionFull = raw
            ? (selection === (raw.awayTeam || raw.away_team)
                ? (raw.awayTeamFull || selection)
                : (selection === (raw.homeTeam || raw.home_team)
                    ? (raw.homeTeamFull || selection)
                    : selection))
            : selection;
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId,
                selection,
                selectionFull,
                marketType,
                odds: parsedOdds,
                matchName,
                marketLabel,
                line: Number.isFinite(parsedLine) ? parsedLine : null,
                // Server-computed Buy Points ladder for this side (spreads/
                // totals only). null for other markets / when the API didn't
                // supply it — the slip's dropdown then uses its local ladder.
                alternateLines: Array.isArray(meta?.alternateLines) ? meta.alternateLines : null,
                isLive: !!meta?.isLive,
                // MLB listed pitchers, carried into the slip so the leg can
                // render the per-pitcher "Action" toggles. Null for non-MLB.
                pitchers: meta?.pitchers || null,
                sportKey: meta?.sportKey || '',
                // Team-total descriptor {team, teamSide, side} for DISPLAY/audit
                // only. The backend re-derives these from the matched outcome in
                // the match doc at placement, so this is never trusted as the
                // pricing/grading source — it just lets the slip/MyBets render a
                // readable "Detroit Team Total Over" label.
                teamTotal: meta?.teamTotal || null,
                // Action choice set on the board's pitcher checkboxes — carried
                // through so the slip + backend honor what the player picked
                // before clicking the odds.
                pitcherAction: { home: !!action.home, away: !!action.away },
            }
        }));
    };

    // Add an alternate-spread rung to the slip. Dispatches the SAME
    // betslip:add contract the "+" sheet (MatchDetailView.addSelection) uses
    // for alt lines: marketType 'alternate_spreads', the signed rung point,
    // and a selection string built byte-identically ("Chicago -2.5") so the
    // backend pins pricing/grading by (outcome name + point), never name
    // alone. `price` is the feed's house-safe decimal for that exact rung.
    const addAltSpread = (match, rung) => {
        const price = parseOddsNumber(rung?.price);
        const point = Number(rung?.point);
        if (!match?.id || price === null || !Number.isFinite(point)) return;
        const selection = [rung.name, formatLineValue(point)].filter(Boolean).join(' ');
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId: match.id,
                selection,
                marketType: 'alternate_spreads',
                odds: price,
                point,
                matchName: `${match.team1.name} vs ${match.team2.name}`,
                marketLabel: 'Alt Game Spread',
                isLive: match.status === 'LIVE',
                sportKey: String(match.sportKey || '').toLowerCase(),
            },
        }));
    };

    // Add an alternate-total rung to the slip. Mirrors addAltSpread and the "+"
    // sheet (MatchDetailView.addSelection) byte-for-byte: marketType
    // 'alternate_totals', the UNSIGNED total point, and a selection string
    // ("Over 8.5" / "Under 8.5") the backend pins pricing/grading to by
    // (outcome name + point). `price` is the feed's house-safe decimal.
    const addAltTotal = (match, rung) => {
        const price = parseOddsNumber(rung?.price);
        const point = Number(rung?.point);
        if (!match?.id || price === null || !Number.isFinite(point)) return;
        const selection = [rung.name, formatLineValue(point)].filter(Boolean).join(' ');
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId: match.id,
                selection,
                marketType: 'alternate_totals',
                odds: price,
                point,
                matchName: `${match.team1.name} vs ${match.team2.name}`,
                marketLabel: 'Alt Game Total',
                isLive: match.status === 'LIVE',
                sportKey: String(match.sportKey || '').toLowerCase(),
            },
        }));
    };

    const normalizedMode = String(activeBetMode || 'straight').toLowerCase().replace(/-/g, '_');
    const showSpread = ['straight', 'parlay', 'teaser', 'if_bet', 'reverse', 'round_robin'].includes(normalizedMode);
    const showMoneyline = ['straight', 'parlay', 'if_bet', 'reverse', 'round_robin'].includes(normalizedMode);
    const showTotals = ['straight', 'parlay', 'teaser', 'if_bet', 'reverse', 'round_robin'].includes(normalizedMode);

    const hasValidOdds = (value) => parseOddsNumber(value) !== null;

    // Column header label that doubles as its own toggle — no separate pill.
    // The plain "Spread"/"Total" text is clickable; clicking it flips the
    // column's mode and the word itself swaps (Spread→Alt, Total→TT). When not
    // clickable (no alt/TT data) it renders as ordinary, identical-looking text.
    const renderColumnLabel = ({ text, onClick, active, clickable, title }) => (
        clickable
            ? (
                <button
                    type="button"
                    className="odds-label"
                    onClick={onClick}
                    title={title}
                    style={{ appearance: 'none', background: 'none', border: 'none', padding: 0, margin: 0, fontFamily: 'inherit', cursor: 'pointer', color: active ? '#d0451b' : undefined }}
                >
                    {text}
                </button>
            )
            : <span className="odds-label">{text}</span>
    );

    const renderOddsButton = ({ label, onClick, available, disabled, reason = '', peerAvailable }) => {
        if (!available) {
            // If the peer outcome (other side of the same market) IS priced,
            // this side is specifically off-board — show OFF instead of the
            // confusing "Unavailable" badge next to a real price.
            if (peerAvailable === true) {
                return (
                    <div
                        className="odds-off-board"
                        title="Closed by bookmaker on this side"
                    >
                        OFF
                    </div>
                );
            }
            return <div className="odds-unavailable">Unavailable</div>;
        }
        return (
            <button
                className="odds-value-btn"
                onClick={onClick}
                disabled={disabled}
                title={disabled ? reason : ''}
            >
                {label}
            </button>
        );
    };


    // Hide a generic "Sports" section entirely when:
    //   1. the user has specific sports selected (so per-sport sections own
    //      the page), AND
    //   2. this section has nothing to show.
    // Without this guard the page rendered a redundant empty "Sports - Live
    // & Upcoming" panel above the real per-sport sections, looking like a
    // duplicate render bug.
    const isGenericFallbackSection = !sportId && (selectedItems?.length || 0) > 0;
    if (isGenericFallbackSection && !isLoading && content.matches.length === 0) {
        return null;
    }

    return (
        <div className="sport-content-view">
            <div className="content-header">
                <div className="content-title">
                    <i className={content.icon}></i>
                    <span>{content.name} - Live & Upcoming</span>
                </div>
                <button
                    type="button"
                    className="sport-refresh-btn"
                    onClick={handleRefreshClick}
                    disabled={(status === 'live')
                        ? liveSyncSpinning
                        : (visibleSportKeys.length === 0 || isRefreshing || cooldownRemainingSec > 0)}
                    aria-label="Refresh odds for this sport"
                    title={status === 'live'
                        ? (liveSyncSpinning ? 'Syncing live odds…' : 'Refresh live odds')
                        : (visibleSportKeys.length === 0 ? 'No matches to refresh' : cooldownRemainingSec > 0 ? `Wait ${cooldownRemainingSec}s` : 'Refresh odds')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginLeft: 12,
                        padding: '6px 12px',
                        minHeight: 36,
                        borderRadius: 6,
                        border: '1px solid #d0d7de',
                        background: cooldownRemainingSec > 0 ? '#f0f0f0' : '#fff',
                        color: visibleSportKeys.length === 0 || cooldownRemainingSec > 0 ? '#888' : '#333',
                        cursor: visibleSportKeys.length === 0 || isRefreshing || cooldownRemainingSec > 0 ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                    }}
                >
                    <i className={`fa-solid fa-arrows-rotate ${(isRefreshing || liveSyncSpinning) ? 'fa-spin' : ''}`} />
                    <span>{(isRefreshing || liveSyncSpinning) ? 'Updating…' : cooldownRemainingSec > 0 ? `Wait ${cooldownRemainingSec}s` : 'Refresh'}</span>
                </button>
                <div className="content-tabs">
                    <button className="tab-btn active">Matches</button>
                    <button className="tab-btn" disabled>Scoreboards</button>
                </div>
            </div>

            {periods.length > 1 && (
                <div style={periodStripStyle}>
                    {periods.map((p) => {
                        const isActive = p.id === selectedPeriodId;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedPeriodId(p.id)}
                                style={isActive ? periodChipActiveStyle : periodChipStyle}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {activeTab === 'matches' && (
                <div className="matches-section">
                    {isLoading ? (
                        <div className="sport-content-loader">
                            <div className="sport-loader-shimmer"></div>
                            <div className="sport-loader-shimmer short"></div>
                            <div className="sport-loader-shimmer"></div>
                        </div>
                    ) : content.matches.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: '8px' }}>
                            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                            <h3>No matches with live odds right now</h3>
                            <p>
                                {content.name && content.name !== 'Sports'
                                    ? `No fresh ${content.name} odds available — check back in a moment.`
                                    : 'No fresh odds available — check back in a moment.'}
                            </p>
                        </div>
                    ) : (
                        displayEntries.map(({ match, header }) => (
                            <React.Fragment key={match.id}>
                                {header && (
                                    <div style={liveGroupHeaderStyle}>
                                        <span aria-hidden="true">{header.emoji}</span>
                                        <span>{header.label}</span>
                                        <span style={liveGroupCountStyle}>{header.count} live</span>
                                    </div>
                                )}
                            <div className={`match-card ${match.rawMatch?.isBettable === false ? 'match-card-closed' : ''}`}>
                                {match.broadcast ? (
                                    // Broadcast row sits above the action header so the
                                    // user reads tip-off time + game context + network
                                    // before scanning the team rows. Per spec we omit
                                    // the row entirely when no broadcast data exists,
                                    // rather than rendering a "TBD" placeholder.
                                    <div className="match-broadcast-row">
                                        <span className="match-broadcast-text">
                                            {match.broadcastTime}
                                            {match.eventName ? (
                                                <>
                                                    <span className="match-broadcast-sep"> - </span>
                                                    <span className="match-broadcast-context">{match.eventName.toUpperCase()}</span>
                                                </>
                                            ) : null}
                                        </span>
                                        <span
                                            className="match-broadcast-chip"
                                            style={{
                                                background: match.broadcast.bg,
                                                color: match.broadcast.fg,
                                            }}
                                            title={match.broadcast.raw}
                                        >
                                            {match.broadcast.name}
                                        </span>
                                    </div>
                                ) : null}

                                <div className="match-header">
                                    <div className="match-time">
                                        <span className="time">{match.time}</span>
                                        <span className="date">{match.date}</span>
                                        {match.status === 'LIVE' && match.liveState ? (
                                            <span style={liveStateStyle} title="Live game state">{match.liveState}</span>
                                        ) : null}
                                        <OddsAge timestamp={match.rawMatch?.lastOddsSyncAt} live={(match.status || '').toString().toUpperCase() === 'LIVE' || (match.rawMatch?.status || '').toString().toLowerCase() === 'live'} style={{ marginLeft: 8 }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <button
                                            type="button"
                                            className="main-bets-btn"
                                            onClick={() => setDetailOpenMatch((prev) => (prev?.id === match.id ? null : {
                                                id: match.id,
                                                externalId: match.rawMatch?.externalId,
                                                homeTeam: match.team2.name,
                                                awayTeam: match.team1.name,
                                                homeTeamFull: match.team2.fullName,
                                                awayTeamFull: match.team1.fullName,
                                                odds: match.rawMatch?.odds,
                                            }))}
                                            disabled={match.rawMatch?.isBettable === false}
                                            style={{
                                                background: '#d0451b',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 6,
                                                padding: '4px 10px',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                lineHeight: 1,
                                                cursor: match.rawMatch?.isBettable === false ? 'not-allowed' : 'pointer',
                                                opacity: match.rawMatch?.isBettable === false ? 0.5 : 1,
                                            }}
                                            aria-label="Open all markets"
                                        >
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            className="prop-builder-btn"
                                            onClick={() => setPropsOpenMatch({
                                                id: match.id,
                                                externalId: match.rawMatch?.externalId,
                                                homeTeam: match.team2.name,
                                                awayTeam: match.team1.name,
                                                homeTeamFull: match.team2.fullName,
                                                awayTeamFull: match.team1.fullName,
                                                // Stable identifiers so the props
                                                // header resolves logos by league +
                                                // abbr (the board's pattern), never
                                                // by the city-only display name.
                                                homeTeamShort: match.team2.abbr,
                                                awayTeamShort: match.team1.abbr,
                                                sportKey: match.sportKey,
                                                sport: match.sport,
                                                odds: match.rawMatch?.odds,
                                            })}
                                            disabled={match.rawMatch?.isBettable === false}
                                            style={{
                                                background: 'linear-gradient(135deg, #a020f0, #d946ef)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 6,
                                                padding: '4px 10px',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                letterSpacing: 0.4,
                                                cursor: match.rawMatch?.isBettable === false ? 'not-allowed' : 'pointer',
                                                opacity: match.rawMatch?.isBettable === false ? 0.5 : 1,
                                            }}
                                            aria-label="Open prop builder"
                                        >
                                            P+
                                        </button>
                                        <span
                                            className={`match-status ${match.status === 'LIVE' ? 'live' : (match.status === 'SUSPENDED' ? 'suspended' : '')}`}
                                            title={match.status === 'SUSPENDED' ? (match.rawMatch?.bettingBlockedReason || 'Odds are stale — betting suspended') : undefined}
                                        >
                                            {match.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="match-body">
                                    <div className="team-box">
                                        <span className="team-logo-badge">
                                            <img
                                                className="team-logo-image"
                                                src={teamLogos[match.team1.name] || createFallbackTeamLogoDataUri(match.team1.name)}
                                                alt={`${match.team1.name} logo`}
                                                width="32"
                                                height="32"
                                                loading="lazy"
                                                decoding="async"
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = createFallbackTeamLogoDataUri(match.team1.name);
                                                }}
                                            />
                                        </span>
                                        <div className="team-info">
                                            <span className="team-name">
                                                {match.team1.fullName || match.team1.shortName || match.team1.name}
                                                {match.team1.record && (
                                                    <span style={teamRecordStyle}> ({match.team1.record})</span>
                                                )}
                                            </span>
                                        </div>
                                        <span className="score">{match.score1}</span>
                                    </div>

                                    <div className="vs-separator">vs</div>

                                    <div className="team-box">
                                        <span className="team-logo-badge">
                                            <img
                                                className="team-logo-image"
                                                src={teamLogos[match.team2.name] || createFallbackTeamLogoDataUri(match.team2.name)}
                                                alt={`${match.team2.name} logo`}
                                                width="32"
                                                height="32"
                                                loading="lazy"
                                                decoding="async"
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = createFallbackTeamLogoDataUri(match.team2.name);
                                                }}
                                            />
                                        </span>
                                        <div className="team-info">
                                            <span className="team-name">
                                                {match.team2.fullName || match.team2.shortName || match.team2.name}
                                                {match.team2.record && (
                                                    <span style={teamRecordStyle}> ({match.team2.record})</span>
                                                )}
                                            </span>
                                        </div>
                                        <span className="score">{match.score2}</span>
                                    </div>
                                </div>

                                {isMlbSportKey(match.sportKey) && hasListedPitchers(match.pitchers) && (() => {
                                    const act = pitcherActionByMatch[match.id] || { home: false, away: false };
                                    const renderSide = (side, pitcher, isAway) => {
                                        const label = formatPitcherLabel(pitcher);
                                        if (!label) {
                                            return <span style={{ color: '#94a3b8', fontWeight: 600 }}>TBD</span>;
                                        }
                                        return (
                                            <label
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0, maxWidth: '48%' }}
                                                title="Action — check to keep this bet live even if this listed pitcher is scratched"
                                            >
                                                <i className="fa-solid fa-baseball" style={{ opacity: 0.45, flexShrink: 0 }} />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{label}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={!!act[side]}
                                                    onChange={() => togglePitcherAction(match.id, side)}
                                                    style={{ width: 14, height: 14, flexShrink: 0, accentColor: '#e0584a', cursor: 'pointer' }}
                                                />
                                            </label>
                                        );
                                    };
                                    return (
                                        <div className="match-pitchers" style={{
                                            padding: '6px 12px',
                                            borderTop: '1px solid #eef0f2',
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: 8,
                                                fontSize: '0.78em',
                                                color: '#475569',
                                            }}>
                                                {renderSide('away', match.pitchers.away, true)}
                                                {renderSide('home', match.pitchers.home, false)}
                                            </div>
                                            <div style={{ marginTop: 4, fontSize: 10, lineHeight: 1.35, color: '#94a3b8' }}>
                                                {MLB_LISTED_PITCHER_POLICY}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {match.odds && (
                                    <div className="match-odds">
                                        <div className="odds-row">
                                            {showSpread && (() => {
                                                const awayAvail = match.odds.spread.awayPoint !== null && hasValidOdds(match.odds.spread.awayOdds);
                                                const homeAvail = match.odds.spread.homePoint !== null && hasValidOdds(match.odds.spread.homeOdds);
                                                const matchName = `${match.team1.name} vs ${match.team2.name}`;
                                                const blockReason = match.rawMatch?.bettingBlockedReason || 'Betting unavailable';

                                                // Alternate-spread ladder (the `alternate_spreads` extended
                                                // market). Teaser legs must price off the MAIN spread, so the
                                                // alt toggle is suppressed in teaser mode — the "+" sheet gates
                                                // the same market the same way. Build a per-team ladder from the
                                                // feed's already-deduped, house-safe rungs.
                                                // Read the raw match: the mapped `match.odds` is the flat
                                                // extractOdds shape (no markets list); extendedMarkets only
                                                // lives on rawMatch (top-level or under rawMatch.odds).
                                                const altMarket = normalizedMode !== 'teaser' ? getMatchMarket(match.rawMatch, 'alternate_spreads') : null;
                                                const norm = (s) => String(s || '').trim().toLowerCase();
                                                const awayName = norm(match.team1.name);
                                                const homeName = norm(match.team2.name);
                                                const buildLadder = (sideName) => {
                                                    const rows = (Array.isArray(altMarket?.outcomes) ? altMarket.outcomes : [])
                                                        .filter((o) => norm(o?.name) === sideName)
                                                        .map((o) => ({ name: o.name, point: Number(o.point), price: parseOddsNumber(o.price) }))
                                                        .filter((o) => Number.isFinite(o.point) && o.price !== null);
                                                    // Defensive de-dupe by point (the feed already collapses to one
                                                    // house-safe rung per side+point; guard against stragglers).
                                                    const seen = new Set();
                                                    const unique = [];
                                                    for (const r of rows) {
                                                        if (seen.has(r.point)) continue;
                                                        seen.add(r.point);
                                                        unique.push(r);
                                                    }
                                                    // Keep the rungs nearest pick'em (the most-bet ±1 to ±2 band,
                                                    // straddling both "getting" and "giving" points), then read
                                                    // high→low like a sportsbook alt-spread column. The full ladder
                                                    // (every rung, both directions) stays in the "+" sheet.
                                                    return unique
                                                        .sort((a, b) => Math.abs(a.point) - Math.abs(b.point))
                                                        .slice(0, MAX_ALT_SPREAD_RUNGS)
                                                        .sort((a, b) => b.point - a.point);
                                                };
                                                const awayLadder = buildLadder(awayName);
                                                const homeLadder = buildLadder(homeName);
                                                const hasAltSpreads = awayLadder.length > 0 || homeLadder.length > 0;
                                                const altOn = hasAltSpreads && !!altSpreadByMatch[match.id];

                                                // The "Spread" header text IS the toggle — no separate pill.
                                                // Clicking it flips the whole board into ALT mode (the alt-spread
                                                // ladder here AND the alt-total ladder in the Total column, both
                                                // keyed off altSpreadByMatch) and the word swaps Spread→Alt.
                                                // Clicking again returns to mainline. Choosing alt clears Team
                                                // Totals so the two modes stay mutually exclusive.
                                                const toggleSpreadAlt = () => {
                                                    const toAlt = !altOn;
                                                    setAltSpreadByMatch((prev) => ({ ...prev, [match.id]: toAlt }));
                                                    if (toAlt) setTtModeByMatch((prev) => ({ ...prev, [match.id]: false }));
                                                };

                                                if (altOn) {
                                                    const renderLadderCell = (ladder, teamLabel) => {
                                                        if (ladder.length === 0) return null;
                                                        return (
                                                            <div className="odds-cell" key={teamLabel}>
                                                                {renderColumnLabel({ text: `${teamLabel} Alt`, onClick: toggleSpreadAlt, active: true, clickable: true, title: 'Showing alt spreads + alt totals — click for main' })}
                                                                <div className="odds-values-group">
                                                                    {ladder.map((rung) => (
                                                                        <React.Fragment key={rung.point}>
                                                                            {renderOddsButton({
                                                                                label: formatSpreadDisplay(rung.point, rung.price, oddsFormat),
                                                                                onClick: () => addAltSpread(match, rung),
                                                                                available: true,
                                                                                disabled: match.rawMatch?.isBettable === false,
                                                                                reason: blockReason,
                                                                            })}
                                                                        </React.Fragment>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    };
                                                    return (
                                                        <>
                                                            {renderLadderCell(awayLadder, match.team1.shortName || match.team1.name)}
                                                            {renderLadderCell(homeLadder, match.team2.shortName || match.team2.name)}
                                                        </>
                                                    );
                                                }

                                                return (
                                                <div className="odds-cell">
                                                    {renderColumnLabel({ text: 'Spread', onClick: toggleSpreadAlt, active: false, clickable: hasAltSpreads, title: hasAltSpreads ? 'Click for alt spreads + alt totals' : undefined })}
                                                    <div className="odds-values-group">
                                                        {renderOddsButton({
                                                            label: formatSpreadDisplay(match.odds.spread.awayPoint, match.odds.spread.awayOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team1.name, 'spreads', match.odds.spread.awayOdds, matchName, 'Spread', match.odds.spread.awayPoint, { isLive: match.status === 'LIVE', pitchers: match.pitchers, sportKey: match.sportKey, alternateLines: match.odds.spread.awayAlternateLines }),
                                                            available: awayAvail,
                                                            peerAvailable: homeAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: blockReason,
                                                        })}
                                                        {renderOddsButton({
                                                            label: formatSpreadDisplay(match.odds.spread.homePoint, match.odds.spread.homeOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team2.name, 'spreads', match.odds.spread.homeOdds, matchName, 'Spread', match.odds.spread.homePoint, { isLive: match.status === 'LIVE', pitchers: match.pitchers, sportKey: match.sportKey, alternateLines: match.odds.spread.homeAlternateLines }),
                                                            available: homeAvail,
                                                            peerAvailable: awayAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: blockReason,
                                                        })}
                                                    </div>
                                                </div>
                                                );
                                            })()}
                                            {showMoneyline && (() => {
                                                const awayAvail = hasValidOdds(match.odds.moneyline.awayOdds);
                                                const homeAvail = hasValidOdds(match.odds.moneyline.homeOdds);
                                                return (
                                                <div className="odds-cell">
                                                    <span className="odds-label">Moneyline</span>
                                                    <div className="odds-values-group">
                                                        {renderOddsButton({
                                                            label: formatOdds(match.odds.moneyline.awayOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team1.name, 'h2h', match.odds.moneyline.awayOdds, `${match.team1.name} vs ${match.team2.name}`, 'Moneyline', null, { isLive: match.status === 'LIVE', pitchers: match.pitchers, sportKey: match.sportKey }),
                                                            available: awayAvail,
                                                            peerAvailable: homeAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                        {renderOddsButton({
                                                            label: formatOdds(match.odds.moneyline.homeOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team2.name, 'h2h', match.odds.moneyline.homeOdds, `${match.team1.name} vs ${match.team2.name}`, 'Moneyline', null, { isLive: match.status === 'LIVE', pitchers: match.pitchers, sportKey: match.sportKey }),
                                                            available: homeAvail,
                                                            peerAvailable: awayAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                    </div>
                                                </div>
                                                );
                                            })()}
                                            {showTotals && (() => {
                                                // 1st-inning total at 0.5 IS the NRFI/YRFI market — relabel so bettors
                                                // recognise it. Selection name stays "Over"/"Under" for settlement
                                                // (SportsbookBetSupport::selectionResult matches on substring "over").
                                                const isNrfi = Number(match.odds.total.point) === 0.5
                                                    && String(match.rawMatch?.sportKey || '').toLowerCase().startsWith('baseball');
                                                const totalLabel = isNrfi ? 'NRFI / YRFI' : 'Total';
                                                const overLabel = isNrfi
                                                    ? `YRFI (${formatOdds(match.odds.total.overOdds, oddsFormat)})`
                                                    : formatTotalDisplay('O', match.odds.total.point, match.odds.total.overOdds, oddsFormat);
                                                const underLabel = isNrfi
                                                    ? `NRFI (${formatOdds(match.odds.total.underOdds, oddsFormat)})`
                                                    : formatTotalDisplay('U', match.odds.total.point, match.odds.total.underOdds, oddsFormat);
                                                const overAvail  = match.odds.total.point !== null && hasValidOdds(match.odds.total.overOdds);
                                                const underAvail = match.odds.total.point !== null && hasValidOdds(match.odds.total.underOdds);
                                                const matchName = `${match.team1.name} vs ${match.team2.name}`;
                                                const blockReason = match.rawMatch?.bettingBlockedReason || 'Betting unavailable';

                                                // The Total column shows one of three states:
                                                //  - mainline game total (default),
                                                //  - Team Totals (TT) — MLB full-game only, opened by this
                                                //    column's own "Total" pill,
                                                //  - the `alternate_totals` ladder — shown when the board is in
                                                //    ALT mode (driven by the Spread column's "Spread" pill, so
                                                //    Alt Spreads and Alt Totals always appear together).
                                                // Generic Alt Totals are never offered as a standalone toggle
                                                // here.
                                                const tt = match.odds.teamTotals || {};
                                                const sideAvail = (leg) => !!leg && leg.point !== null && hasValidOdds(leg.price);
                                                const teamHasTT = (teamSide) => sideAvail(tt[teamSide]?.over) || sideAvail(tt[teamSide]?.under);
                                                const hasTeamTotals = isMlbSportKey(match.sportKey) && (teamHasTT('away') || teamHasTT('home'));

                                                // Alternate-total ladder. Suppressed in teaser mode (teaser
                                                // legs price off the main total) — matching the alt-spread gate.
                                                const altTotalMarket = normalizedMode !== 'teaser' ? getMatchMarket(match.rawMatch, 'alternate_totals') : null;
                                                const normTot = (s) => String(s || '').trim().toLowerCase();
                                                const buildTotalLadder = (sideName) => {
                                                    const rows = (Array.isArray(altTotalMarket?.outcomes) ? altTotalMarket.outcomes : [])
                                                        .filter((o) => normTot(o?.name) === sideName)
                                                        .map((o) => ({ name: o.name, point: Number(o.point), price: parseOddsNumber(o.price) }))
                                                        .filter((o) => Number.isFinite(o.point) && o.price !== null);
                                                    // Defensive de-dupe by point (feed already collapses to one
                                                    // house-safe rung per side+point; guard against stragglers).
                                                    const seen = new Set();
                                                    const unique = [];
                                                    for (const r of rows) {
                                                        if (seen.has(r.point)) continue;
                                                        seen.add(r.point);
                                                        unique.push(r);
                                                    }
                                                    // Keep the rungs nearest the main total, then read high→low
                                                    // like a sportsbook alt column. The full ladder (every rung)
                                                    // stays in the "+" sheet.
                                                    const ref = Number(match.odds.total.point);
                                                    const dist = (p) => (Number.isFinite(ref) ? Math.abs(p - ref) : p);
                                                    return unique
                                                        .sort((a, b) => dist(a.point) - dist(b.point))
                                                        .slice(0, MAX_ALT_SPREAD_RUNGS)
                                                        .sort((a, b) => b.point - a.point);
                                                };
                                                const overLadder = buildTotalLadder('over');
                                                const underLadder = buildTotalLadder('under');
                                                const hasAltTotals = overLadder.length > 0 || underLadder.length > 0;

                                                // TT and ALT mode are mutually exclusive; TT wins a stale
                                                // double-set. ALT totals piggyback on the Spread column's
                                                // altSpreadByMatch flag so a "Spread" click surfaces both.
                                                const ttOn = hasTeamTotals && !!ttModeByMatch[match.id];
                                                const altOn = hasAltTotals && !ttOn && !!altSpreadByMatch[match.id];

                                                // The "Total" header text IS the toggle — no separate pill.
                                                // Clicking it opens Team Totals (the word swaps Total→TT) and
                                                // clicks again return to the mainline total. Clicking it while
                                                // ALT totals show (driven by the Spread click) also jumps to TT.
                                                // Only clickable when this game actually ships team totals
                                                // (MLB full-game); otherwise the label is ordinary text.
                                                const toggleTotalTt = () => {
                                                    const toTt = !ttOn;
                                                    setTtModeByMatch((prev) => ({ ...prev, [match.id]: toTt }));
                                                    if (toTt) setAltSpreadByMatch((prev) => ({ ...prev, [match.id]: false }));
                                                };

                                                if (altOn) {
                                                    const renderTotalLadderCell = (ladder, sideLabel) => {
                                                        if (ladder.length === 0) return null;
                                                        const ou = sideLabel === 'Over' ? 'O' : 'U';
                                                        return (
                                                            <div className="odds-cell" key={sideLabel}>
                                                                {renderColumnLabel({ text: `${sideLabel} Alt`, onClick: toggleTotalTt, active: true, clickable: hasTeamTotals, title: hasTeamTotals ? 'Click for team totals' : undefined })}
                                                                <div className="odds-values-group">
                                                                    {ladder.map((rung) => (
                                                                        <React.Fragment key={rung.point}>
                                                                            {renderOddsButton({
                                                                                label: formatTotalDisplay(ou, rung.point, rung.price, oddsFormat),
                                                                                onClick: () => addAltTotal(match, rung),
                                                                                available: true,
                                                                                disabled: match.rawMatch?.isBettable === false,
                                                                                reason: blockReason,
                                                                            })}
                                                                        </React.Fragment>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    };
                                                    return (
                                                        <>
                                                            {renderTotalLadderCell(overLadder, 'Over')}
                                                            {renderTotalLadderCell(underLadder, 'Under')}
                                                        </>
                                                    );
                                                }

                                                if (ttOn) {
                                                    const renderTeamCell = (teamSide, teamLabel) => {
                                                        const bucket = tt[teamSide] || {};
                                                        const overOk = sideAvail(bucket.over);
                                                        const underOk = sideAvail(bucket.under);
                                                        if (!overOk && !underOk) return null;
                                                        // selection = the outcome's display name ("Detroit Over"); the
                                                        // backend matches it verbatim then grades off the leg's
                                                        // structured teamSide/side/point. `name` is never parsed.
                                                        const addTT = (leg) => handleAddToSlip(
                                                            match.id, leg.name, 'team_totals', leg.price, matchName,
                                                            `${teamLabel} Team Total`, leg.point,
                                                            { isLive: match.status === 'LIVE', sportKey: match.sportKey, teamTotal: { team: leg.team, teamSide: leg.teamSide, side: leg.side } }
                                                        );
                                                        return (
                                                            <div className="odds-cell" key={teamSide}>
                                                                {renderColumnLabel({ text: `${teamLabel} TT`, onClick: toggleTotalTt, active: true, clickable: true, title: 'Showing team totals — click for game total' })}
                                                                <div className="odds-values-group">
                                                                    {overOk ? renderOddsButton({
                                                                        label: formatTotalDisplay('O', bucket.over.point, bucket.over.price, oddsFormat),
                                                                        onClick: () => addTT(bucket.over),
                                                                        available: true,
                                                                        disabled: match.rawMatch?.isBettable === false,
                                                                        reason: blockReason,
                                                                    }) : <div className="odds-unavailable">—</div>}
                                                                    {underOk ? renderOddsButton({
                                                                        label: formatTotalDisplay('U', bucket.under.point, bucket.under.price, oddsFormat),
                                                                        onClick: () => addTT(bucket.under),
                                                                        available: true,
                                                                        disabled: match.rawMatch?.isBettable === false,
                                                                        reason: blockReason,
                                                                    }) : <div className="odds-unavailable">—</div>}
                                                                </div>
                                                            </div>
                                                        );
                                                    };
                                                    return (
                                                        <>
                                                            {renderTeamCell('away', match.team1.shortName || match.team1.name)}
                                                            {renderTeamCell('home', match.team2.shortName || match.team2.name)}
                                                        </>
                                                    );
                                                }

                                                return (
                                                <div className="odds-cell">
                                                    {renderColumnLabel({ text: totalLabel, onClick: toggleTotalTt, active: false, clickable: hasTeamTotals, title: hasTeamTotals ? 'Click for team totals' : undefined })}
                                                    <div className="odds-values-group">
                                                        {renderOddsButton({
                                                            label: overLabel,
                                                            onClick: () => handleAddToSlip(match.id, 'Over', 'totals', match.odds.total.overOdds, matchName, totalLabel, match.odds.total.point, { isLive: match.status === 'LIVE', pitchers: match.pitchers, sportKey: match.sportKey, alternateLines: match.odds.total.overAlternateLines }),
                                                            available: overAvail,
                                                            peerAvailable: underAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: blockReason,
                                                        })}
                                                        {renderOddsButton({
                                                            label: underLabel,
                                                            onClick: () => handleAddToSlip(match.id, 'Under', 'totals', match.odds.total.underOdds, matchName, totalLabel, match.odds.total.point, { isLive: match.status === 'LIVE', pitchers: match.pitchers, sportKey: match.sportKey, alternateLines: match.odds.total.underAlternateLines }),
                                                            available: underAvail,
                                                            peerAvailable: overAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: blockReason,
                                                        })}
                                                    </div>
                                                </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}

                                <div className="match-footer" style={{ justifyContent: 'center', padding: '10px' }}>
                                    <span style={{ fontSize: '0.8em', color: '#888' }}>
                                        {match.rawMatch?.isBettable === false
                                            ? (match.rawMatch?.bettingBlockedReason || 'Betting is temporarily unavailable for this event.')
                                            : 'Click any odds to place your bet'}
                                    </span>
                                </div>
                                {detailOpenMatch?.id === match.id && (
                                    <MatchDetailView
                                        embedded
                                        match={detailOpenMatch}
                                        onClose={() => setDetailOpenMatch(null)}
                                        betMode={normalizedMode}
                                    />
                                )}
                            </div>
                            </React.Fragment>
                        ))
                    )}
                </div>
            )}

            {propsOpenMatch && (
                <PropBuilderModal match={propsOpenMatch} onClose={() => setPropsOpenMatch(null)} betMode={normalizedMode} />
            )}
        </div>
    );
};

const periodStripStyle = {
    display: 'flex',
    gap: 8,
    padding: '10px 14px',
    margin: '6px 0',
    // Red bar that flows visually out of the red content header above —
    // chips sit on it as one continuous band rather than a separate
    // white strip. Slight rounding softens the bar into a contained
    // block instead of a flat full-bleed strip.
    background: '#ff5051',
    borderRadius: 8,
    overflowX: 'auto',
    whiteSpace: 'nowrap',
};

const periodChipStyle = {
    flexShrink: 0,
    padding: '6px 14px',
    minHeight: 32,
    borderRadius: 0,
    border: 'none',
    background: 'rgba(0, 0, 0, 0.18)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    textTransform: 'uppercase',
};

const periodChipActiveStyle = {
    ...periodChipStyle,
    background: '#fff',
    color: '#ff5051',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
};

export default React.memo(SportContentView);
