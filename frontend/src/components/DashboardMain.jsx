import React, { useState, useEffect, useRef, useMemo } from 'react';
import SportContentView from './SportContentView';
import OutrightsView from './OutrightsView';
import ErrorBoundary from './ErrorBoundary';
import { findSportItemById, OUTRIGHTS_ENABLED } from '../data/sportsData';

const DashboardMain = ({ selectedSports = [], activeBetMode = 'straight' }) => {
    const isDefault = selectedSports.length === 0;
    const [isTransitioning, setIsTransitioning] = useState(false);
    const prevSportsRef = useRef(selectedSports);
    const transitionTimer = useRef(null);

    // Show a brief content-area loader when selection changes
    useEffect(() => {
        const prev = prevSportsRef.current;
        const changed = prev.length !== selectedSports.length ||
            prev.some((s, i) => s !== selectedSports[i]);

        if (changed && selectedSports.length > 0) {
            setIsTransitioning(true);
            clearTimeout(transitionTimer.current);
            transitionTimer.current = setTimeout(() => setIsTransitioning(false), 350);
        }
        prevSportsRef.current = selectedSports;
        return () => clearTimeout(transitionTimer.current);
    }, [selectedSports]);

    const primaryId = selectedSports.length > 0 ? selectedSports[0] : null;
    const selectedItem = primaryId ? findSportItemById(primaryId) : null;

    /**
     * Map a parent sport ID to its first child league for content display.
     * If the selected item has sportKeys, use its own id directly.
     */
    const parentToDefaultChild = {
        football: 'nfl',
        basketball: 'nba',
        baseball: 'mlb',
        hockey: 'nhl',
        soccer: 'epl',
    };

    // IMPORTANT: every hook must be called on every render in the same order
    // (Rules of Hooks). The futures / props-plus early returns USED to live
    // above this useMemo, which meant switching from a normal sport to FUTURES
    // skipped the hook and React threw "Rendered fewer hooks than expected".
    // Those branches are now handled AFTER all hooks have run (see below).
    const sportSections = useMemo(() => {
        if (isDefault) {
            // No sport selected → show only the top 6 freshest matches
            // (live + upcoming, server-side freshness-gated). Avoids the
            // 700-row "everything" dump that included 5h-old tennis odds.
            return [{ sportId: null, filter: null, status: 'live-upcoming', limit: 6 }];
        }

        if (selectedSports.includes('up-next')) {
            return [{ sportId: null, filter: null, status: 'upcoming' }];
        }

        if (selectedSports.includes('commercial-live')) {
            // Live Now: strict `'live'` status. The backend filter applies
            // a per-sport freshness window so any leftover stale or
            // upcoming rows are filtered out server-side. Showing scheduled
            // games here would be wrong: the user tapped LIVE NOW expecting
            // in-play action only.
            return [{ sportId: null, filter: null, status: 'live' }];
        }

        const sections = [];
        const addedSports = new Set();

        selectedSports.forEach(id => {
            if (id === 'up-next' || id === 'commercial-live') return;

            // If it's a parent sport, resolve to default child
            const resolvedId = parentToDefaultChild[id] || id;

            if (!addedSports.has(resolvedId)) {
                const item = findSportItemById(id);
                const filter = item?.filter ? id : null;
                sections.push({ sportId: resolvedId, filter });
                addedSports.add(resolvedId);
            }
        });

        return sections.length > 0 ? sections : [{ sportId: null, filter: null }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSports, isDefault]);

    // Stable key that changes when selection changes, forcing remount
    const sectionKey = selectedSports.join(',') || 'default';

    // Special-view dispatch happens AFTER all hooks above have run so we
    // never violate Rules of Hooks when switching to/from these branches.
    //
    // Futures dispatch considers EVERY selected id, not just the first —
    // ticking "Golf Futures" + "Soccer Futures" combines both families in
    // one view, and ticking a futures box while a league is checked still
    // switches to futures (checking the previous behavior of "only the
    // first selection counts" silently ignored later futures ticks, which
    // read as broken). Any selected futures node WITHOUT a family scope
    // (the top-level FUTURES entry) widens the view back to all sports.
    const selectedFuturesItems = OUTRIGHTS_ENABLED
        ? selectedSports
            .map((id) => findSportItemById(id))
            .filter((it) => it && it.type === 'futures')
        : [];
    if (selectedFuturesItems.length > 0) {
        const hasUnscoped = selectedFuturesItems.some((it) => !it.family);
        const families = hasUnscoped
            ? []
            : [...new Set(selectedFuturesItems.map((it) => it.family))];
        // Exact board scoping: when every selected futures node names its
        // board(s) via sportKeys, pass the union down so multi-select shows
        // ONLY the ticked boards. Family scoping alone over-shows — ticking
        // "To Win Super Bowl" + "To Win World Series" would drag NCAAF in
        // via the football family. If ANY selected node is family-only
        // (no sportKeys), exact scoping would wrongly hide that node's
        // boards, so fall back to family-wide for the whole selection.
        const allHaveBoards = !hasUnscoped
            && selectedFuturesItems.every((it) => Array.isArray(it.sportKeys) && it.sportKeys.length > 0);
        const boardKeys = allHaveBoards
            ? [...new Set(selectedFuturesItems.flatMap((it) => it.sportKeys))]
            : [];
        const single = selectedFuturesItems.length === 1 ? selectedFuturesItems[0] : null;
        const futuresSportKey = single && Array.isArray(single.sportKeys) && single.sportKeys.length > 0
            ? single.sportKeys[0]
            : '';
        return (
            <ErrorBoundary>
                <OutrightsView
                    sportKey={futuresSportKey}
                    families={families}
                    boardKeys={boardKeys}
                    title={single ? (single.label || 'Futures') : 'Futures'}
                />
            </ErrorBoundary>
        );
    }

    if (selectedItem && selectedItem.type === 'props-plus') {
        return (
            <main className="dash-main" style={{ padding: '20px' }}>
                <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    textAlign: 'center'
                }}>
                    <h2 style={{ color: '#007bff' }}>{selectedItem.label}</h2>
                    <p style={{ color: '#666', marginTop: '10px' }}>
                        Props Plus content for <strong>{selectedItem.label}</strong> goes here.
                    </p>
                    <div style={{
                        marginTop: '20px',
                        display: 'inline-block',
                        padding: '10px 20px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>
                        Custom View Component for Type: {selectedItem.type}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="dash-main">
            {isTransitioning && (
                <div className="sport-content-transition-loader">
                    <div className="transition-loader-bar"></div>
                </div>
            )}
            <div className={`dash-main-content ${isTransitioning ? 'content-fading' : 'content-visible'}`}>
                {sportSections.map((section, idx) => (
                    <React.Fragment key={`${sectionKey}-${section.sportId}-${idx}`}>
                        <SportContentView
                            sportId={section.sportId}
                            selectedItems={selectedSports}
                            filter={section.filter}
                            status={section.status || 'live-upcoming'}
                            activeBetMode={activeBetMode}
                            limit={section.limit || 0}
                        />
                    </React.Fragment>
                ))}

                {selectedSports.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                        <h3>Showing all sports</h3>
                        <p style={{ fontSize: '13px' }}>Use the sidebar to filter by a specific sport.</p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default React.memo(DashboardMain);
