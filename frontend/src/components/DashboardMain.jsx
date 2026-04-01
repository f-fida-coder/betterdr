import React, { useState, useEffect, useRef } from 'react';
import SportContentView from './SportContentView';
import { findSportItemById } from '../data/sportsData';

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

    const getSportSections = () => {
        if (isDefault) {
            return [{ sportId: null, filter: null, status: 'live-upcoming' }];
        }

        if (selectedSports.includes('up-next')) {
            return [{ sportId: null, filter: null, status: 'upcoming' }];
        }

        if (selectedSports.includes('commercial-live')) {
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
    };

    const sportSections = getSportSections();

    // Stable key that changes when selection changes, forcing remount
    const sectionKey = selectedSports.join(',') || 'default';

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

export default DashboardMain;
