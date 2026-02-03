import React, { useMemo, useState } from 'react';
import '../ultralive.css';
import useMatches from '../hooks/useMatches';

const UltraLiveView = () => {
    const rawMatches = useMatches({ status: 'live-upcoming' });
    const [selectedMatchId, setSelectedMatchId] = useState(null);

    const matches = useMemo(() => (Array.isArray(rawMatches) ? rawMatches : []), [rawMatches]);

    const liveMatches = useMemo(() => {
        return matches.filter(m => (m.status || '').toString().toLowerCase() === 'live' || String(m.score?.event_status || '').toUpperCase().includes('IN_PROGRESS'));
    }, [matches]);

    const selectedMatch = useMemo(() => {
        if (selectedMatchId) {
            return matches.find(m => (m.id || m._id || m.externalId) === selectedMatchId) || null;
        }
        return liveMatches[0] || matches[0] || null;
    }, [matches, liveMatches, selectedMatchId]);

    const formatSportLabel = (sport = '') => {
        if (!sport) return 'Unknown';
        const parts = sport.toString().split('_').filter(Boolean);
        if (parts.length === 1) return parts[0].toUpperCase();
        return `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} ${parts.slice(1).join(' ').toUpperCase()}`;
    };

    const getMarket = (match, key) => {
        const markets = match?.odds?.markets || [];
        return markets.find(m => (m.key || '').toLowerCase() === key) || null;
    };

    const getMoneyline = (match, teamName) => {
        const market = getMarket(match, 'h2h');
        if (!market || !market.outcomes) return '-';
        const outcome = market.outcomes.find(o => (o.name || '').toLowerCase() === (teamName || '').toLowerCase());
        return outcome ? (outcome.price ?? '-') : '-';
    };

    const getSpread = (match, teamName) => {
        const market = getMarket(match, 'spreads');
        if (!market || !market.outcomes) return { label: '-', price: '-' };
        const outcome = market.outcomes.find(o => (o.name || '').toLowerCase() === (teamName || '').toLowerCase());
        if (!outcome) return { label: '-', price: '-' };
        const point = outcome.point ?? '-';
        return { label: `${teamName} ${point}`, price: outcome.price ?? '-' };
    };

    const getTotal = (match, side) => {
        const market = getMarket(match, 'totals');
        if (!market || !market.outcomes) return { label: '-', price: '-' };
        const outcome = market.outcomes.find(o => (o.name || '').toLowerCase() === side);
        if (!outcome) return { label: '-', price: '-' };
        return { label: `${side === 'over' ? 'Over' : 'Under'} ${outcome.point ?? '-'}`, price: outcome.price ?? '-' };
    };

    const groupedBySport = useMemo(() => {
        const map = new Map();
        liveMatches.forEach(m => {
            const key = (m.sport || 'unknown').toString();
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(m);
        });
        return Array.from(map.entries()).map(([sport, items]) => ({ sport, label: formatSportLabel(sport), items }));
    }, [liveMatches]);

    const headerMatch = selectedMatch || {};
    const home = headerMatch.homeTeam || headerMatch.home_team || 'Home';
    const away = headerMatch.awayTeam || headerMatch.away_team || 'Away';
    const homeScore = headerMatch.score?.score_home ?? '-';
    const awayScore = headerMatch.score?.score_away ?? '-';
    const period = headerMatch.score?.period || '';

    return (
        <div className="ultra-live-wrapper">
            <aside className="ultra-sidebar">
                <div className="ultra-subnav">
                    <div className="ultra-subnav-item active">In-Play</div>
                    <div className="ultra-subnav-item">History</div>
                    <div className="ultra-subnav-item">Live TV</div>
                </div>

                {groupedBySport.length === 0 ? (
                    <div style={{ padding: '20px', color: '#777', fontSize: '12px' }}>No live matches available.</div>
                ) : (
                    groupedBySport.map(group => (
                        <div key={group.sport}>
                            <div className="ultra-sport-header">
                                <span><i className="fa-solid fa-basketball"></i> {group.label}</span>
                                <span style={{ background: '#00703c', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px' }}>{group.items.length}</span>
                            </div>
                            <div className="ultra-league-group">
                                <div className="ultra-league-header">Live Matches</div>
                                {group.items.map(match => {
                                    const id = match.id || match._id || match.externalId;
                                    const isActive = id === (selectedMatchId || (selectedMatch?.id || selectedMatch?._id || selectedMatch?.externalId));
                                    return (
                                        <div
                                            key={id}
                                            className={`ultra-sidebar-match ${isActive ? 'active' : ''}`}
                                            onClick={() => setSelectedMatchId(id)}
                                            role="button"
                                        >
                                            <div className="ultra-sidebar-match-teams">
                                                <span style={{ color: isActive ? 'white' : undefined }}>{match.homeTeam || match.home_team}</span>
                                                <span className="ultra-sidebar-match-score">{match.score?.score_home ?? '-'}</span>
                                            </div>
                                            <div className="ultra-sidebar-match-teams">
                                                <span style={{ color: isActive ? 'white' : undefined }}>{match.awayTeam || match.away_team}</span>
                                                <span className="ultra-sidebar-match-score">{match.score?.score_away ?? '-'}</span>
                                            </div>
                                            <div style={{ fontSize: '10px', color: isActive ? '#00703c' : '#777', marginTop: '4px', fontWeight: 'bold' }}>
                                                {match.score?.period || 'LIVE'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </aside>

            <main className="ultra-main">
                <div className="ultra-video-area">
                    <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="none">
                        <defs>
                            <radialGradient id="videoGlow" cx="0.5" cy="0.5" r="0.5">
                                <stop offset="0%" stopColor="#2a2a2a" />
                                <stop offset="100%" stopColor="#000" />
                            </radialGradient>
                        </defs>
                        <rect width="800" height="400" fill="url(#videoGlow)" />

                        <text x="50%" y="50%" fill="white" fontSize="24" textAnchor="middle" opacity="0.3" fontFamily="Inter" fontWeight="bold">LIVE STREAM FEED</text>
                        <rect x="30" y="30" width="80" height="25" rx="4" fill="#ff0000" opacity="0.8" />
                        <text x="70" y="47" fill="white" fontSize="12" textAnchor="middle" fontWeight="bold">LIVE</text>

                        <circle cx="50%" cy="50%" r="40" stroke="white" strokeWidth="3" fill="none" opacity="0.6" />
                        <path d="M390 180 L430 200 L390 220 Z" fill="white" opacity="0.8" />
                    </svg>
                </div>

                <div className="ultra-markets-container">
                    <div className="ultra-market-header">
                        <h2>{home} @ {away}</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button style={{ padding: '6px 15px', borderRadius: '15px', border: '1px solid #555', background: '#222', color: 'white', fontSize: '11px', fontWeight: 'bold' }}>MATCH STATS</button>
                        </div>
                    </div>

                    <div className="ultra-market-section">
                        <div className="ultra-market-title">
                            <span>Game Winner</span>
                            <i className="fa-solid fa-chevron-up"></i>
                        </div>
                        <div className="ultra-market-rows">
                            <div className="ultra-market-row">
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">{home}</span>
                                    <span className="ultra-odds-val">{getMoneyline(headerMatch, home)}</span>
                                </div>
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">{away}</span>
                                    <span className="ultra-odds-val">{getMoneyline(headerMatch, away)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ultra-market-section">
                        <div className="ultra-market-title">
                            <span>Spread</span>
                            <i className="fa-solid fa-chevron-up"></i>
                        </div>
                        <div className="ultra-market-rows">
                            <div className="ultra-market-row">
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">{getSpread(headerMatch, home).label}</span>
                                    <span className="ultra-odds-val">{getSpread(headerMatch, home).price}</span>
                                </div>
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">{getSpread(headerMatch, away).label}</span>
                                    <span className="ultra-odds-val">{getSpread(headerMatch, away).price}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ultra-market-section">
                        <div className="ultra-market-title">
                            <span>Total</span>
                            <i className="fa-solid fa-chevron-up"></i>
                        </div>
                        <div className="ultra-market-rows">
                            <div className="ultra-market-row">
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">{getTotal(headerMatch, 'over').label}</span>
                                    <span className="ultra-odds-val">{getTotal(headerMatch, 'over').price}</span>
                                </div>
                                <div className="ultra-odds-box">
                                    <span className="ultra-odds-label">{getTotal(headerMatch, 'under').label}</span>
                                    <span className="ultra-odds-val">{getTotal(headerMatch, 'under').price}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            <aside className="ultra-right-panel">
                <div className="ultra-tracker">
                    <div style={{ padding: '8px 10px', background: '#222', color: '#ccc', fontSize: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>{formatSportLabel(headerMatch.sport)}</span>
                        <span>{period || 'LIVE'}</span>
                    </div>
                    <div className="ultra-court-graphic">
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'rgba(255,255,255,0.1)', fontSize: '50px' }}>
                            <i className="fa-solid fa-basketball-ball"></i>
                        </div>
                        <div style={{ padding: '20px', textAlign: 'center', marginTop: '60px' }}>
                            <div style={{ color: '#cfaa56', fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{home}</div>
                            <div style={{ color: '#fff', fontSize: '12px' }}>{homeScore} - {awayScore}</div>
                        </div>
                    </div>
                </div>

                <div className="ultra-slip-header">
                    <div className="ultra-slip-tab active">Bet slip</div>
                    <div className="ultra-slip-tab">My Bets</div>
                </div>
                <div className="ultra-slip-body">
                    <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', color: '#ccc' }}>Slip Empty</div>
                    <p>Make a selection to start a new bet.</p>
                </div>
            </aside>
        </div>
    );
};

export default UltraLiveView;
