import React, { useMemo, useState } from 'react';
import '../primelive.css';
import useMatches from '../hooks/useMatches';

const PrimeLiveView = () => {
    const [selectedSport, setSelectedSport] = useState('all');
    const [searchText, setSearchText] = useState('');
    const rawMatches = useMatches({ status: 'live-upcoming' });

    const formatSportLabel = (sport = '') => {
        if (!sport) return 'Unknown';
        const parts = sport.toString().split('_').filter(Boolean);
        if (parts.length === 1) return parts[0].toUpperCase();
        return `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} ${parts.slice(1).join(' ').toUpperCase()}`;
    };

    const matches = useMemo(() => {
        const list = Array.isArray(rawMatches) ? rawMatches : [];
        let filtered = list;

        if (selectedSport !== 'all') {
            filtered = filtered.filter(m => (m.sport || '').toString() === selectedSport);
        }

        const q = searchText.trim().toLowerCase();
        if (q) {
            filtered = filtered.filter(m =>
                (m.homeTeam || m.home_team || '').toString().toLowerCase().includes(q) ||
                (m.awayTeam || m.away_team || '').toString().toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [rawMatches, selectedSport, searchText]);

    const sportBuckets = useMemo(() => {
        const list = Array.isArray(rawMatches) ? rawMatches : [];
        const map = new Map();
        list.forEach(m => {
            const key = (m.sport || 'unknown').toString();
            const existing = map.get(key) || { key, label: formatSportLabel(key), count: 0 };
            existing.count += 1;
            map.set(key, existing);
        });
        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [rawMatches]);

    const groupedMatches = useMemo(() => {
        const map = new Map();
        matches.forEach(m => {
            const key = (m.sport || 'unknown').toString();
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(m);
        });
        return Array.from(map.entries()).map(([sport, items]) => ({
            sport,
            label: formatSportLabel(sport),
            items
        }));
    }, [matches]);

    const getMarket = (match, key) => {
        const markets = match?.odds?.markets || [];
        return markets.find(m => (m.key || '').toLowerCase() === key) || null;
    };

    const getSpread = (match, teamName) => {
        const market = getMarket(match, 'spreads');
        if (!market || !market.outcomes) return { point: '-', price: '-' };
        const outcome = market.outcomes.find(o => (o.name || '').toLowerCase() === (teamName || '').toLowerCase());
        return outcome ? { point: outcome.point ?? '-', price: outcome.price ?? '-' } : { point: '-', price: '-' };
    };

    const getTotal = (match, side) => {
        const market = getMarket(match, 'totals');
        if (!market || !market.outcomes) return { point: '-', price: '-' };
        const outcome = market.outcomes.find(o => (o.name || '').toLowerCase() === side);
        return outcome ? { point: outcome.point ?? '-', price: outcome.price ?? '-' } : { point: '-', price: '-' };
    };

    const getMoneyline = (match, teamName) => {
        const market = getMarket(match, 'h2h');
        if (!market || !market.outcomes) return '-';
        const outcome = market.outcomes.find(o => (o.name || '').toLowerCase() === (teamName || '').toLowerCase());
        return outcome ? (outcome.price ?? '-') : '-';
    };

    return (
        <div className="prime-live-wrapper">
            <div className="prime-layout">
                <aside className="prime-sidebar">
                    <div className="prime-sidebar-search">
                        <input
                            type="text"
                            className="prime-sidebar-input"
                            placeholder="Filter Teams..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>

                    <div
                        className={`prime-sidebar-item ${selectedSport === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedSport('all')}
                        role="button"
                    >
                        <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <i className="fa-solid fa-trophy"></i> All Sports
                        </span>
                        <span className="prime-badge">{(rawMatches || []).length}</span>
                    </div>

                    {sportBuckets.map(sport => (
                        <div
                            key={sport.key}
                            className={`prime-sidebar-item ${selectedSport === sport.key ? 'active' : ''}`}
                            onClick={() => setSelectedSport(sport.key)}
                            role="button"
                        >
                            <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <i className="fa-solid fa-medal"></i> {sport.label}
                            </span>
                            <span className="prime-badge">{sport.count}</span>
                        </div>
                    ))}
                </aside>

                <main className="prime-main">
                    <div className="prime-tools-bar">
                        <div style={{ color: '#94a3b8' }}>
                            Showing <span style={{ color: 'white', fontWeight: 'bold' }}>{selectedSport === 'all' ? 'All Matches' : formatSportLabel(selectedSport)}</span>
                            <span style={{ marginLeft: '8px', color: '#64748b' }}>({matches.length})</span>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', color: '#cfaa56', fontWeight: 'bold' }}>
                            <span style={{ cursor: 'pointer' }}><i className="fa-solid fa-compress"></i> COLLAPSE ALL</span>
                            <span style={{ cursor: 'pointer' }}><i className="fa-solid fa-expand"></i> EXPAND ALL</span>
                        </div>
                    </div>

                    {groupedMatches.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.6 }}></i>
                            <h3 style={{ margin: 0 }}>No matches found</h3>
                            <p style={{ marginTop: '8px', fontSize: '13px' }}>Try clearing the filter or check back later.</p>
                        </div>
                    ) : (
                        groupedMatches.map(group => (
                            <div key={group.sport} className="prime-match-group">
                                <div className="prime-match-header">
                                    <span><i className="fa-solid fa-flag"></i> {group.label}</span>
                                    <span><i className="fa-regular fa-star"></i></span>
                                </div>
                                <div className="prime-header-row">
                                    <div>Match Info</div>
                                    <div className="prime-markets-header">
                                        <span>Spread</span>
                                        <span>Total</span>
                                        <span>Moneyline</span>
                                    </div>
                                </div>

                                {group.items.map(match => {
                                    const home = match.homeTeam || match.home_team || 'Home';
                                    const away = match.awayTeam || match.away_team || 'Away';
                                    const homeScore = match.score?.score_home ?? '-';
                                    const awayScore = match.score?.score_away ?? '-';
                                    const period = match.score?.period || '';
                                    const status = (match.status || '').toString().toLowerCase();
                                    const isLive = status === 'live' || String(match.score?.event_status || '').toUpperCase().includes('IN_PROGRESS');
                                    const startTime = match.startTime ? new Date(match.startTime) : null;
                                    const timeLabel = isLive && period ? `${period}` : (startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

                                    const homeSpread = getSpread(match, home);
                                    const awaySpread = getSpread(match, away);
                                    const over = getTotal(match, 'over');
                                    const under = getTotal(match, 'under');
                                    const homeMoneyline = getMoneyline(match, home);
                                    const awayMoneyline = getMoneyline(match, away);

                                    return (
                                        <div key={match.id || match._id || match.externalId} className="prime-match-row">
                                            <div className="prime-match-teams">
                                                <div className="prime-team">
                                                    <span>{home}</span>
                                                    <span className="prime-score">{homeScore}</span>
                                                </div>
                                                <div className="prime-team">
                                                    <span>{away}</span>
                                                    <span className="prime-score">{awayScore}</span>
                                                </div>
                                                <div className="prime-time-info">
                                                    <i className="fa-solid fa-clock-rotate-left"></i> {timeLabel} {isLive ? 'LIVE' : ''}
                                                </div>
                                            </div>
                                            <div className="prime-odds-grid">
                                                <div className={`prime-odd-btn ${homeSpread.price === '-' ? 'disabled' : ''}`} style={{ opacity: homeSpread.price === '-' ? 0.3 : 1 }}>
                                                    <span>{homeSpread.point !== '-' ? homeSpread.point : '-'}</span>
                                                    <span className="prime-odd-val">{homeSpread.price}</span>
                                                </div>
                                                <div className={`prime-odd-btn ${over.price === '-' ? 'disabled' : ''}`} style={{ opacity: over.price === '-' ? 0.3 : 1 }}>
                                                    <span>o{over.point !== '-' ? over.point : '-'}</span>
                                                    <span className="prime-odd-val">{over.price}</span>
                                                </div>
                                                <div className={`prime-odd-btn ${homeMoneyline === '-' ? 'disabled' : ''}`} style={{ opacity: homeMoneyline === '-' ? 0.3 : 1 }}>
                                                    <span className="prime-odd-val">{homeMoneyline}</span>
                                                </div>

                                                <div className={`prime-odd-btn ${awaySpread.price === '-' ? 'disabled' : ''}`} style={{ opacity: awaySpread.price === '-' ? 0.3 : 1 }}>
                                                    <span>{awaySpread.point !== '-' ? awaySpread.point : '-'}</span>
                                                    <span className="prime-odd-val">{awaySpread.price}</span>
                                                </div>
                                                <div className={`prime-odd-btn ${under.price === '-' ? 'disabled' : ''}`} style={{ opacity: under.price === '-' ? 0.3 : 1 }}>
                                                    <span>u{under.point !== '-' ? under.point : '-'}</span>
                                                    <span className="prime-odd-val">{under.price}</span>
                                                </div>
                                                <div className={`prime-odd-btn ${awayMoneyline === '-' ? 'disabled' : ''}`} style={{ opacity: awayMoneyline === '-' ? 0.3 : 1 }}>
                                                    <span className="prime-odd-val">{awayMoneyline}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}

                </main>

                <aside className="prime-right-panel">
                    <div className="prime-slip-tabs">
                        <div className="prime-slip-tab active">BET SLIP</div>
                        <div className="prime-slip-tab">MY BETS</div>
                    </div>
                    <div className="prime-slip-content">
                        <div style={{ marginBottom: '15px', fontSize: '14px', fontWeight: 'bold' }}>Your Slip is Empty</div>
                        <p style={{ lineHeight: '1.5' }}>Click on any odds to add selections to your bet slip.</p>
                        <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <i className="fa-solid fa-ticket" style={{ fontSize: '32px', color: '#cfaa56', marginBottom: '10px' }}></i>
                            <div style={{ fontSize: '11px' }}>Start betting now!</div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PrimeLiveView;
