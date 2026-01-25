import React from 'react';
import SportGenericView from './SportGenericView';
import SportContentView from './SportContentView'; import { sportsData } from '../data/sportsData';

const DashboardMain = ({ selectedSports = [] }) => {
    const isDefault = selectedSports.length === 0;

    const findItemById = (items, id) => {
        for (const item of items) {
            if (item.id === id) return item;
            if (item.children) {
                const found = findItemById(item.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const primaryId = selectedSports.length > 0 ? selectedSports[0] : null;
    const selectedItem = primaryId ? findItemById(sportsData, primaryId) : null;

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

    const getSportSections = () => {
        if (isDefault) {
            return [{ sportId: 'nfl', filter: null }];
        }

        const sections = [];
        const addedSports = new Set();

        selectedSports.forEach(id => {
            if (id === 'up-next' || id === 'featured' || id === 'commercial-live') {
                return;
            }

            if (id === 'football') {
                if (!addedSports.has('nfl')) {
                    sections.push({ sportId: 'nfl', filter: null });
                    addedSports.add('nfl');
                }
            } else if (id === 'basketball') {
                if (!addedSports.has('nba')) {
                    sections.push({ sportId: 'nba', filter: null });
                    addedSports.add('nba');
                }
            } else if (id === 'baseball') {
                if (!addedSports.has('mlb')) {
                    sections.push({ sportId: 'mlb', filter: null });
                    addedSports.add('mlb');
                }
            } else if (id === 'hockey') {
                if (!addedSports.has('nhl')) {
                    sections.push({ sportId: 'nhl', filter: null });
                    addedSports.add('nhl');
                }
            } else if (id === 'soccer') {
                if (!addedSports.has('epl')) {
                    sections.push({ sportId: 'epl', filter: null });
                    addedSports.add('epl');
                }
            }
            else if (id === 'nfl' && !addedSports.has('nfl')) {
                sections.push({ sportId: 'nfl', filter: null });
                addedSports.add('nfl');
            } else if (id.startsWith('nfl-') && (id.includes('half') || id.includes('quarter'))) {
                if (!addedSports.has('nfl')) {
                    sections.push({ sportId: 'nfl', filter: id });
                    addedSports.add('nfl');
                }
            }
            else if (id === 'nfl-1st-scoring' || id === 'nfl-1st-td-scorer' || id === 'nfl-anytime-td' || id === 'nfl-margin-victory' || id === 'nfl-player-props') {
                if (!addedSports.has('nfl')) {
                    sections.push({ sportId: 'nfl', filter: id });
                    addedSports.add('nfl');
                }
            }
            else if (id === 'mlb' && !addedSports.has('mlb')) {
                sections.push({ sportId: 'mlb', filter: null });
                addedSports.add('mlb');
            }
            else if (id === 'nba' && !addedSports.has('nba')) {
                sections.push({ sportId: 'nba', filter: null });
                addedSports.add('nba');
            }
            else if (!id.includes('-') && id.length <= 6) {
                if (!addedSports.has(id)) {
                    sections.push({ sportId: id, filter: null });
                    addedSports.add(id);
                }
            }
        });

        return sections.length > 0 ? sections : [{ sportId: 'nfl', filter: null }];
    };

    const sportSections = getSportSections();

    return (
        <main className="dash-main">
            {sportSections.map((section, idx) => (
                <React.Fragment key={`${section.sportId}-${idx}`}>
                    <SportContentView
                        sportId={section.sportId}
                        selectedItems={selectedSports}
                        filter={section.filter}
                    />
                    {/* <SportGenericView
                        sportId={section.sportId}
                        filter={section.filter}
                        selectedItems={selectedSports}
                    /> */}
                </React.Fragment>
            ))}

            {selectedSports.length === 0 && (
                <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                    <h3>Select a sport from the sidebar</h3>
                </div>
            )}
        </main>
    );
};

export default DashboardMain;
