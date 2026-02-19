import React, { useMemo, useState } from 'react';
import '../primelive.css';
import useMatches from '../hooks/useMatches';

const PrimeLiveView = () => {
    const [feedStatus, setFeedStatus] = useState('live-upcoming');
    const [selectedSport, setSelectedSport] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [marketView, setMarketView] = useState('all');
    const [collapsedSports, setCollapsedSports] = useState(new Set());
    const [selectedOddsKey, setSelectedOddsKey] = useState(null);
    const rawMatches = useMatches({ status: feedStatus });

    const formatSportLabel = (sport = '') => {
        if (!sport) return 'Unknown';
        const parts = sport.toString().split('_').filter(Boolean);
        if (parts.length === 1) return parts[0].toUpperCase().replace('-', ' ');
        return `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} ${parts.slice(1).join(' ').toUpperCase().replace('-', ' ')}`;
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

    const statusOptions = [
        { id: 'live-upcoming', label: 'Live + Upcoming' },
        { id: 'live', label: 'Live' },
        { id: 'upcoming', label: 'Upcoming' }
    ];

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

    const toggleGroup = (sportKey) => {
        setCollapsedSports(prev => {
            const next = new Set(prev);
            if (next.has(sportKey)) next.delete(sportKey);
            else next.add(sportKey);
            return next;
        });
    };

    const collapseAll = () => {
        setCollapsedSports(new Set(groupedMatches.map(g => g.sport)));
    };

    const expandAll = () => {
        setCollapsedSports(new Set());
    };

    const addSelection = ({ match, selection, marketType, odds, marketLabel }) => {
        if (odds === '-' || odds === undefined || odds === null) return;
        const home = match.homeTeam || match.home_team || 'Home';
        const away = match.awayTeam || match.away_team || 'Away';
        const matchId = match.id || match._id || match.externalId;
        const key = `${matchId}-${marketType}-${selection}`;
        setSelectedOddsKey(key);

        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId,
                selection,
                marketType,
                odds: parseFloat(odds),
                matchName: `${home} vs ${away}`,
                marketLabel
            }
        }));
    };

    const refreshFeed = () => {
        window.dispatchEvent(new CustomEvent('matches:refresh'));
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
                        <div className="prime-toolbar-left">
                            {statusOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    className={`prime-status-pill ${feedStatus === opt.id ? 'active' : ''}`}
                                    onClick={() => setFeedStatus(opt.id)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            <button className="prime-refresh-btn" onClick={refreshFeed}>
                                <i className="fa-solid fa-arrows-rotate"></i> Refresh
                            </button>
                        </div>
                        <div className="prime-toolbar-right">
                            <div className="prime-market-toggle">
                                <button className={marketView === 'all' ? 'active' : ''} onClick={() => setMarketView('all')}>All</button>
                                <button className={marketView === 'spread' ? 'active' : ''} onClick={() => setMarketView('spread')}>Spread</button>
                                <button className={marketView === 'total' ? 'active' : ''} onClick={() => setMarketView('total')}>Total</button>
                                <button className={marketView === 'moneyline' ? 'active' : ''} onClick={() => setMarketView('moneyline')}>Moneyline</button>
                            </div>
                            <button className="prime-text-btn" onClick={collapseAll}><i className="fa-solid fa-compress"></i> Collapse</button>
                            <button className="prime-text-btn" onClick={expandAll}><i className="fa-solid fa-expand"></i> Expand</button>
                        </div>
                    </div>
                    <div className="prime-subtitle">
                        Showing <strong>{selectedSport === 'all' ? 'All Sports' : formatSportLabel(selectedSport)}</strong> ({matches.length})
                    </div>

                    {groupedMatches.length === 0 ? (
                        <div className="prime-empty-state">
                            <i className="fa-solid fa-calendar-xmark"></i>
                            <h3>No matches found</h3>
                            <p>Try another filter or refresh the feed.</p>
                        </div>
                    ) : (
                        groupedMatches.map(group => (
                            <div key={group.sport} className="prime-match-group">
                                <div className="prime-match-header" onClick={() => toggleGroup(group.sport)} role="button">
                                    <span><i className="fa-solid fa-flag"></i> {group.label}</span>
                                    <span className="prime-group-meta">
                                        <em>{group.items.length} games</em>
                                        <i className={`fa-solid ${collapsedSports.has(group.sport) ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                                    </span>
                                </div>
                                {!collapsedSports.has(group.sport) && (
                                    <>
                                        <div className="prime-header-row">
                                            <div>Match Info</div>
                                            <div className="prime-markets-header">
                                                {(marketView === 'all' || marketView === 'spread') && <span>Spread</span>}
                                                {(marketView === 'all' || marketView === 'total') && <span>Total</span>}
                                                {(marketView === 'all' || marketView === 'moneyline') && <span>Moneyline</span>}
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
                                            const matchId = match.id || match._id || match.externalId;

                                            const homeSpread = getSpread(match, home);
                                            const awaySpread = getSpread(match, away);
                                            const over = getTotal(match, 'over');
                                            const under = getTotal(match, 'under');
                                            const homeMoneyline = getMoneyline(match, home);
                                            const awayMoneyline = getMoneyline(match, away);

                                            return (
                                                <div key={matchId} className="prime-match-row">
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
                                                            <span className={`prime-live-pill ${isLive ? 'live' : ''}`}>
                                                                {isLive ? 'LIVE' : 'SCHEDULED'}
                                                            </span>
                                                            <span><i className="fa-regular fa-clock"></i> {timeLabel}</span>
                                                        </div>
                                                    </div>
                                                    <div className="prime-odds-grid">
                                                        {(marketView === 'all' || marketView === 'spread') && (
                                                            <>
                                                                <button
                                                                    className={`prime-odd-btn ${selectedOddsKey === `${matchId}-spreads-${home}` ? 'selected' : ''}`}
                                                                    disabled={homeSpread.price === '-'}
                                                                    onClick={() => addSelection({ match, selection: home, marketType: 'spreads', odds: homeSpread.price, marketLabel: 'Spread' })}
                                                                >
                                                                    <span>{homeSpread.point !== '-' ? homeSpread.point : '-'}</span>
                                                                    <span className="prime-odd-val">{homeSpread.price}</span>
                                                                </button>
                                                                <button
                                                                    className={`prime-odd-btn ${selectedOddsKey === `${matchId}-spreads-${away}` ? 'selected' : ''}`}
                                                                    disabled={awaySpread.price === '-'}
                                                                    onClick={() => addSelection({ match, selection: away, marketType: 'spreads', odds: awaySpread.price, marketLabel: 'Spread' })}
                                                                >
                                                                    <span>{awaySpread.point !== '-' ? awaySpread.point : '-'}</span>
                                                                    <span className="prime-odd-val">{awaySpread.price}</span>
                                                                </button>
                                                            </>
                                                        )}
                                                        {(marketView === 'all' || marketView === 'total') && (
                                                            <>
                                                                <button
                                                                    className={`prime-odd-btn ${selectedOddsKey === `${matchId}-totals-Over` ? 'selected' : ''}`}
                                                                    disabled={over.price === '-'}
                                                                    onClick={() => addSelection({ match, selection: 'Over', marketType: 'totals', odds: over.price, marketLabel: 'Total' })}
                                                                >
                                                                    <span>o{over.point !== '-' ? over.point : '-'}</span>
                                                                    <span className="prime-odd-val">{over.price}</span>
                                                                </button>
                                                                <button
                                                                    className={`prime-odd-btn ${selectedOddsKey === `${matchId}-totals-Under` ? 'selected' : ''}`}
                                                                    disabled={under.price === '-'}
                                                                    onClick={() => addSelection({ match, selection: 'Under', marketType: 'totals', odds: under.price, marketLabel: 'Total' })}
                                                                >
                                                                    <span>u{under.point !== '-' ? under.point : '-'}</span>
                                                                    <span className="prime-odd-val">{under.price}</span>
                                                                </button>
                                                            </>
                                                        )}
                                                        {(marketView === 'all' || marketView === 'moneyline') && (
                                                            <>
                                                                <button
                                                                    className={`prime-odd-btn ${selectedOddsKey === `${matchId}-h2h-${home}` ? 'selected' : ''}`}
                                                                    disabled={homeMoneyline === '-'}
                                                                    onClick={() => addSelection({ match, selection: home, marketType: 'h2h', odds: homeMoneyline, marketLabel: 'Moneyline' })}
                                                                >
                                                                    <span>{home}</span>
                                                                    <span className="prime-odd-val">{homeMoneyline}</span>
                                                                </button>
                                                                <button
                                                                    className={`prime-odd-btn ${selectedOddsKey === `${matchId}-h2h-${away}` ? 'selected' : ''}`}
                                                                    disabled={awayMoneyline === '-'}
                                                                    onClick={() => addSelection({ match, selection: away, marketType: 'h2h', odds: awayMoneyline, marketLabel: 'Moneyline' })}
                                                                >
                                                                    <span>{away}</span>
                                                                    <span className="prime-odd-val">{awayMoneyline}</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        ))
                    )}

                </main>

                <aside className="prime-right-panel">
                    <div className="prime-slip-tabs">
                        <div className="prime-slip-tab active">Prime Live</div>
                        <div className="prime-slip-tab">Insights</div>
                    </div>
                    <div className="prime-slip-content">
                        <div className="prime-side-card">
                            <h4>Live Filters</h4>
                            <p>Use the status pills, sport list, and market toggles to fetch and view different data slices from API in real-time.</p>
                        </div>
                        <div className="prime-side-card">
                            <h4>Quick Actions</h4>
                            <button className="prime-side-btn" onClick={refreshFeed}><i className="fa-solid fa-arrows-rotate"></i> Refresh Odds</button>
                            <button className="prime-side-btn" onClick={() => setSelectedSport('all')}><i className="fa-solid fa-list"></i> Show All Sports</button>
                            <button className="prime-side-btn" onClick={expandAll}><i className="fa-solid fa-up-right-and-down-left-from-center"></i> Expand Leagues</button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PrimeLiveView;
