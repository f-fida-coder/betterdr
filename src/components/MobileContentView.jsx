import React from 'react';
import { sportsData } from '../data/sportsData';
import useMatches from '../hooks/useMatches';

const MobileContentView = ({ selectedSports = [] }) => {
    const getSportName = (id) => {
        const sportMap = {
            'nfl': 'NFL Football',
            'ncaa-football': 'College Football',
            'nba': 'NBA Basketball',
            'ncaa-basketball': 'College Basketball',
            'mlb': 'MLB Baseball',
            'nhl': 'NHL Hockey',
            'epl': 'EPL Soccer',
            'mls': 'MLS Soccer',
            'pga': 'PGA Golf',
            'wta': 'WTA Tennis',
            'atp': 'ATP Tennis',
            'boxing': 'Boxing',
            'mma': 'MMA',
            'auto-racing': 'Auto Racing',
            'rugby': 'Rugby',
            'volleyball': 'Volleyball',
            'cricket': 'Cricket',
            'basketball': 'Basketball',
            'baseball': 'Baseball',
            'hockey': 'Hockey',
            'football': 'Football',
            'soccer': 'Soccer',
            'golf': 'Golf',
            'tennis': 'Tennis',
            'martial-arts': 'Martial Arts'
        };
        return sportMap[id] || id.replace('-', ' ').toUpperCase();
    };

    const rawMatches = useMatches();
    const primarySport = selectedSports && selectedSports.length > 0 ? selectedSports[0] : null;
    const sportName = primarySport ? getSportName(primarySport) : 'Selected Sport';

    const matches = React.useMemo(() => {
        const formattedMatches = (rawMatches || []).map(match => {
            const lineKey = match.odds ? Object.keys(match.odds)[0] : null;
            const lines = lineKey ? match.odds[lineKey] : {};

            return {
                id: match.id || match._id,
                sport: match.sport || match.sportTitle || '',
                team1: match.homeTeam || match.home_team || '',
                team2: match.awayTeam || match.away_team || '',
                odds: lines.moneyline?.home || '-110',
                spread: lines.spread?.point || '-5.5',
                isLive: match.status === 'live' || (match.score && match.score.event_status && match.score.event_status.includes('IN_PROGRESS'))
            };
        });

        if (!primarySport) return formattedMatches;
        const filtered = formattedMatches.filter(m => m.sport && m.sport.toLowerCase().includes(primarySport.toLowerCase()));
        return filtered.length > 0 ? filtered : formattedMatches;
    }, [rawMatches, primarySport]);


    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f5f5f5',
            padding: '0',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
        }}>
            {/* Header */}
            <div style={{
                padding: '15px 10px',
                backgroundColor: '#ffffff',
                borderBottom: '2px solid #e0e0e0',
                marginBottom: '10px',
                borderRadius: '4px'
            }}>
                <h2 style={{
                    margin: '0 0 5px 0',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#333'
                }}>
                    {sportName}
                </h2>
                <p style={{
                    margin: '0',
                    fontSize: '12px',
                    color: '#666',
                    fontWeight: '500'
                }}>
                    Upcoming Matches & Events
                </p>
            </div>

            {/* Matches List */}
            <div style={{ flex: 1 }}>
                {matches && matches.length > 0 ? (
                    matches.map(match => (
                        <div
                            key={match.id}
                            style={{
                                backgroundColor: '#ffffff',
                                padding: '12px',
                                marginBottom: '10px',
                                borderRadius: '6px',
                                border: '1px solid #e0e0e0',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                        >
                            {/* Match Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                <div style={{ fontSize: '12px', color: '#888', fontWeight: '600' }}>
                                    MATCH {match.id}
                                </div>
                                <div style={{
                                    background: '#007bff',
                                    color: 'white',
                                    padding: '3px 8px',
                                    borderRadius: '3px',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}>
                                    LIVE
                                </div>
                            </div>

                            {/* Teams */}
                            <div style={{ marginBottom: '10px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 0',
                                    borderBottom: '1px solid #f0f0f0',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#333'
                                }}>
                                    <span>{match.team1}</span>
                                    <span>-5.5</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 0',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#333'
                                }}>
                                    <span>{match.team2}</span>
                                    <span>+5.5</span>
                                </div>
                            </div>

                            {/* Odds Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px',
                                marginTop: '10px'
                            }}>
                                <button style={{
                                    padding: '10px',
                                    backgroundColor: '#f0f0f0',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#333',
                                    transition: 'all 0.2s',
                                }}>
                                    Spread<br />
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>-110</span>
                                </button>
                                <button style={{
                                    padding: '10px',
                                    backgroundColor: '#f0f0f0',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#333',
                                    transition: 'all 0.2s',
                                }}>
                                    Total<br />
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>-110</span>
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#999'
                    }}>
                        <p style={{ fontSize: '14px', margin: 0 }}>No matches available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileContentView;
