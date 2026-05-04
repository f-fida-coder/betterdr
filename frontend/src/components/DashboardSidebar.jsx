import React, { useState, useEffect, useMemo } from 'react';
import { getSportKeywords, buildMergedSportsTree } from '../data/sportsData';
import { getAvailableSports, getUpcomingMatches } from '../api';

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
const filterActiveChildren = (children, liveSet) => {
    if (!Array.isArray(children)) return [];
    if (!liveSet) return children;
    return children.filter((child) => {
        const candidates = new Set();
        if (Array.isArray(child.sportKeys)) child.sportKeys.forEach((k) => candidates.add(String(k).toLowerCase()));
        if (child.id) candidates.add(String(child.id).toLowerCase());
        getSportKeywords(child.id).forEach((k) => candidates.add(String(k).toLowerCase()));
        if (candidates.size === 0) return true;
        for (const c of candidates) if (liveSet.has(c)) return true;
        return false;
    });
};

const SidebarItem = ({
    item,
    level,
    selectedIds,
    onToggle,
    expandedIds,
    onToggleExpand,
    className = '',
    isMobile = false,
    liveSet = null,
}) => {
    const isExpanded = expandedIds.has(item.id);
    const isSelected = selectedIds.includes(item.id);

    const activeChildren = useMemo(
        () => filterActiveChildren(item.children, liveSet),
        [item.children, liveSet],
    );

    const hasChildren = activeChildren.length > 0;

    // Check if any child is selected (for parent active context)
    const hasSelectedChild = useMemo(() => {
        if (!activeChildren.length) return false;
        return activeChildren.some(child => selectedIds.includes(child.id));
    }, [activeChildren, selectedIds]);
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
            <div className={rowClasses} onClick={handleClick} data-sport-id={item.id}>

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
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const DashboardSidebar = ({
    selectedSports = [],
    onToggleSport,
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
    const [searchQuery, setSearchQuery] = useState('');
    // Team-name search index: lazily populated when the user starts typing.
    // Holds upcoming matches so we can match against home/away team names
    // — the static sport tree only knows category/league labels.
    const [matchesForSearch, setMatchesForSearch] = useState(null);
    const [matchesSearchLoading, setMatchesSearchLoading] = useState(false);

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

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // Parlay/teaser modes limit to major sports
    const parlaySportsIds = new Set(['football', 'baseball', 'basketball', 'hockey', 'soccer', 'martial-arts']);
    const isRestrictedMode = ['parlay', 'teaser', 'if_bet', 'reverse'].includes(betMode);

    // Merge backend-discovered leagues into the static tree under their
    // parent sport (soccer_argentina_primera_division → SOCCER children),
    // instead of promoting them to flat top-level rows.
    const mergedSports = useMemo(() => buildMergedSportsTree(liveSet), [liveSet]);
    const displaySports = isRestrictedMode
        ? mergedSports.filter(s => parlaySportsIds.has(s.id))
        : mergedSports;

    // Lazy-load upcoming matches the first time the user types ≥2 chars.
    // We don't prefetch on mount — most sessions never use the search box,
    // and a 200-row payload would be wasted bandwidth.
    useEffect(() => {
        const q = searchQuery.trim();
        if (q.length < 2) return;
        if (matchesForSearch !== null || matchesSearchLoading) return;
        let cancelled = false;
        setMatchesSearchLoading(true);
        (async () => {
            try {
                const data = await getUpcomingMatches({ limit: 200, payload: 'core' });
                if (cancelled) return;
                setMatchesForSearch(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setMatchesForSearch([]);
            } finally {
                if (!cancelled) setMatchesSearchLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [searchQuery, matchesForSearch, matchesSearchLoading]);

    // Walk the merged sport tree (static catalog + backend-discovered
    // leagues) and find the first leaf whose sportKeys array contains the
    // given Odds API sport key. Used to map a match → selectable sidebar id.
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

    // Filter cached matches by team name. Capped to avoid flooding the
    // sidebar when a generic word matches dozens of games.
    const teamSearchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (q.length < 2 || !Array.isArray(matchesForSearch)) return [];
        const results = [];
        for (const m of matchesForSearch) {
            const home = String(m?.homeTeam || m?.home_team || '').toLowerCase();
            const away = String(m?.awayTeam || m?.away_team || '').toLowerCase();
            if (home.includes(q) || away.includes(q)) {
                results.push(m);
                if (results.length >= 12) break;
            }
        }
        return results;
    }, [searchQuery, matchesForSearch]);

    const handleSearchResultClick = (match) => {
        const leaf = findLeafBySportKey(match?.sportKey);
        if (!leaf) return;
        onToggleSport(leaf.id, { replace: true });
        setSearchQuery('');
    };

    const filteredSports = useMemo(() => {
        // Hide a parent category if every one of its children was filtered
        // out by the liveSet health check. Parents with no `children`
        // array (UP NEXT, LIVE NOW) always pass.
        const hasVisibleChildren = (item) => {
            if (!Array.isArray(item.children)) return true;
            return filterActiveChildren(item.children, liveSet).length > 0;
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
    }, [displaySports, liveSet, searchQuery]);

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
                above the static sport list so users see team matches first. */}
            {searchQuery.trim().length >= 2 && (
                <div className="sidebar-search-results">
                    {matchesSearchLoading && teamSearchResults.length === 0 && (
                        <div className="sidebar-search-loading">Searching teams…</div>
                    )}
                    {!matchesSearchLoading && teamSearchResults.length === 0 && matchesForSearch !== null && (
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
