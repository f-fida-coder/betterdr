import React, { useEffect, useMemo, useState } from 'react';
import '../props.css';
import useMatches from '../hooks/useMatches';
import { getMyBets } from '../api';

const PropsView = () => {
    const [activeRail, setActiveRail] = useState('props');
    const [activeView, setActiveView] = useState('builder');
    const [activeSport, setActiveSport] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [marketTab, setMarketTab] = useState('popular');
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [collapsedMarkets, setCollapsedMarkets] = useState({});
    const [selectedOddsKey, setSelectedOddsKey] = useState(null);
    const [myBets, setMyBets] = useState([]);
    const [myBetsLoading, setMyBetsLoading] = useState(false);
    const [myBetsError, setMyBetsError] = useState('');

    const matches = useMatches({ status: 'live-upcoming' });

    const sportBuckets = useMemo(() => {
        const map = new Map();
        (matches || []).forEach((match) => {
            const key = String(match.sport || 'unknown').toLowerCase();
            const bucket = map.get(key) || { id: key, label: formatSportLabel(key), count: 0 };
            bucket.count += 1;
            map.set(key, bucket);
        });
        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [matches]);

    const filteredMatches = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return (matches || []).filter((match) => {
            const sportKey = String(match.sport || 'unknown').toLowerCase();
            if (activeSport !== 'all' && sportKey !== activeSport) return false;
            if (!normalizedSearch) return true;
            const home = String(match.homeTeam || match.home_team || '').toLowerCase();
            const away = String(match.awayTeam || match.away_team || '').toLowerCase();
            return home.includes(normalizedSearch) || away.includes(normalizedSearch);
        });
    }, [matches, activeSport, searchTerm]);

    useEffect(() => {
        if (selectedMatchId && filteredMatches.some((match) => getMatchId(match) === selectedMatchId)) return;
        setSelectedMatchId(getMatchId(filteredMatches[0]) || null);
    }, [filteredMatches, selectedMatchId]);

    const selectedMatch = useMemo(() => {
        return filteredMatches.find((match) => getMatchId(match) === selectedMatchId) || filteredMatches[0] || null;
    }, [filteredMatches, selectedMatchId]);

    const marketRows = useMemo(() => {
        const markets = selectedMatch?.odds?.markets || [];
        if (!Array.isArray(markets)) return [];
        const tabKeys = {
            popular: ['h2h', 'spreads', 'totals'],
            moneyline: ['h2h'],
            spread: ['spreads'],
            total: ['totals'],
            all: null
        };
        const allowed = tabKeys[marketTab];
        return markets
            .filter((market) => allowed === null || allowed.includes(String(market.key || '').toLowerCase()))
            .map((market) => ({
                key: String(market.key || 'market').toLowerCase(),
                title: marketTitle(String(market.key || 'market')),
                outcomes: Array.isArray(market.outcomes) ? market.outcomes : []
            }));
    }, [selectedMatch, marketTab]);

    useEffect(() => {
        if (activeView !== 'my_bets') return;
        const token = localStorage.getItem('token');
        if (!token) {
            setMyBets([]);
            setMyBetsError('Please login to view your bets.');
            return;
        }
        const loadBets = async () => {
            try {
                setMyBetsLoading(true);
                setMyBetsError('');
                const payload = await getMyBets(token);
                setMyBets(Array.isArray(payload) ? payload : []);
            } catch (error) {
                setMyBetsError(error.message || 'Failed to load bets');
            } finally {
                setMyBetsLoading(false);
            }
        };
        loadBets();
    }, [activeView]);

    const toggleMarket = (key) => {
        setCollapsedMarkets((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const addSelection = (market, outcome) => {
        if (!selectedMatch || outcome?.price == null || outcome?.price === '-') return;
        const matchId = getMatchId(selectedMatch);
        const selection = outcome.name || 'Selection';
        const odds = Number(outcome.price);
        if (Number.isNaN(odds)) return;
        const oddsKey = `${matchId}-${market.key}-${selection}`;
        setSelectedOddsKey(oddsKey);
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId,
                selection,
                marketType: market.key,
                odds,
                matchName: `${selectedMatch.homeTeam || selectedMatch.home_team} vs ${selectedMatch.awayTeam || selectedMatch.away_team}`,
                marketLabel: market.title
            }
        }));
    };

    return (
        <div className="props-container">
            <div className="props-mini-sidebar">
                <button className={`props-ms-item ${activeRail === 'props' ? 'active' : ''}`} onClick={() => setActiveRail('props')}>
                    <div className="props-ms-icon">
                        <i className="fa-solid fa-chart-line"></i>
                    </div>
                    <div>PROPS+</div>
                </button>
                <button className={`props-ms-item ${activeRail === 'horses' ? 'active' : ''}`} onClick={() => setActiveRail('horses')}>
                    <div className="props-ms-icon"><i className="fa-solid fa-horse"></i></div>
                    <div>HORSES</div>
                </button>
            </div>

            <div className="props-selection-sidebar">
                <div className="props-search-area">
                    <div className="props-search-header-row"><span>Sports & Games</span></div>
                    <input
                        type="text"
                        className="props-search-input"
                        placeholder="Search teams"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="props-adv-search-btn" onClick={() => window.dispatchEvent(new CustomEvent('matches:refresh'))}>
                        Refresh Board
                    </button>
                </div>

                <div className="props-track-list">
                    <button className={`props-group-header sport-btn ${activeSport === 'all' ? 'active' : ''}`} onClick={() => setActiveSport('all')}>
                        <span><i className="fa-solid fa-trophy"></i> All Sports</span>
                        <span className="props-chip">{filteredMatches.length}</span>
                    </button>

                    {sportBuckets.map((bucket) => (
                        <button
                            key={bucket.id}
                            className={`props-group-header sport-btn ${activeSport === bucket.id ? 'active' : ''}`}
                            onClick={() => setActiveSport(bucket.id)}
                        >
                            <span>{bucket.label}</span>
                            <span className="props-chip">{bucket.count}</span>
                        </button>
                    ))}
                </div>

                <div className="props-search-area">
                    <div className="props-search-header-row">
                        <span>Next Games</span>
                        <span>{filteredMatches.length}</span>
                    </div>
                </div>

                <div className="props-track-list">
                    {filteredMatches.map((match) => {
                        const matchId = getMatchId(match);
                        const isActive = matchId === getMatchId(selectedMatch);
                        return (
                            <button
                                key={matchId}
                                className={`props-track-item ${isActive ? 'active' : ''}`}
                                onClick={() => setSelectedMatchId(matchId)}
                            >
                                <span>{match.homeTeam || match.home_team}</span>
                                <span>{match.awayTeam || match.away_team}</span>
                                <div className="props-track-time-badges">
                                    <span className="props-time-badge">{formatStartTime(match.startTime)}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="props-main">
                <div className="props-main-header top">
                    <div className="props-main-title">Props Builder</div>
                    <div className="props-main-actions">
                        <button className={`props-top-btn ${activeView === 'builder' ? 'active' : ''}`} onClick={() => setActiveView('builder')}>Build Mode</button>
                        <button className={`props-top-btn ${activeView === 'my_bets' ? 'active' : ''}`} onClick={() => setActiveView('my_bets')}>My Bets</button>
                        <button className={`props-top-btn ${activeView === 'help' ? 'active' : ''}`} onClick={() => setActiveView('help')}>Help</button>
                    </div>
                </div>

                <div className="props-main-header secondary">
                    <div className="props-match-title">
                        {selectedMatch ? `${selectedMatch.homeTeam || selectedMatch.home_team} @ ${selectedMatch.awayTeam || selectedMatch.away_team}` : 'No game selected'}
                    </div>
                    <div className="props-market-tabs">
                        {[
                            { id: 'popular', label: 'Popular' },
                            { id: 'moneyline', label: 'Moneyline' },
                            { id: 'spread', label: 'Spread' },
                            { id: 'total', label: 'Total' },
                            { id: 'all', label: 'All Markets' }
                        ].map((tab) => (
                            <button key={tab.id} className={`props-market-tab ${marketTab === tab.id ? 'active' : ''}`} onClick={() => setMarketTab(tab.id)}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="props-race-grid">
                    {activeView === 'help' && (
                        <div className="props-help-card">
                            <h3>How to use Props Builder</h3>
                            <p>1. Select a sport and game from the left board.</p>
                            <p>2. Choose a market tab, then click any odds button.</p>
                            <p>3. Selection is sent to your live bet slip immediately.</p>
                            <p>4. Use mode tabs (Straight/Parlay/Teaser/If Bet/Reverse) at top to control bet rules.</p>
                        </div>
                    )}

                    {activeView === 'my_bets' && (
                        <div className="props-help-card">
                            <h3>Recent Bets</h3>
                            {myBetsLoading && <p>Loading bets...</p>}
                            {!myBetsLoading && myBetsError && <p>{myBetsError}</p>}
                            {!myBetsLoading && !myBetsError && myBets.length === 0 && <p>No bets found.</p>}
                            {!myBetsLoading && !myBetsError && myBets.slice(0, 10).map((bet) => (
                                <div key={bet.id || bet._id} className="props-bet-row">
                                    <span>{String(bet.type || 'bet').toUpperCase()}</span>
                                    <span>${Number(bet.amount || 0).toFixed(2)}</span>
                                    <span className={`status ${String(bet.status || 'pending').toLowerCase()}`}>{bet.status || 'pending'}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeView === 'builder' && (
                        <>
                            {!selectedMatch && (
                                <div className="props-help-card">
                                    <h3>No games available</h3>
                                    <p>Try another sport or refresh the board.</p>
                                </div>
                            )}
                            {selectedMatch && marketRows.length === 0 && (
                                <div className="props-help-card">
                                    <h3>No markets for this game</h3>
                                    <p>Pick another game or switch market tab.</p>
                                </div>
                            )}
                            {selectedMatch && marketRows.map((market) => {
                                const isCollapsed = Boolean(collapsedMarkets[market.key]);
                                return (
                                    <div key={market.key} className="props-market-card">
                                        <button className="props-market-header" onClick={() => toggleMarket(market.key)}>
                                            <span>{market.title}</span>
                                            <i className={`fa-solid ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                                        </button>
                                        {!isCollapsed && (
                                            <div className="props-market-outcomes">
                                                {market.outcomes.length === 0 && (
                                                    <div className="props-empty-outcomes">No odds currently available.</div>
                                                )}
                                                {market.outcomes.map((outcome, index) => {
                                                    const labelPoint = outcome.point != null ? ` (${outcome.point})` : '';
                                                    const label = `${outcome.name || `Selection ${index + 1}`}${labelPoint}`;
                                                    const outcomeKey = `${getMatchId(selectedMatch)}-${market.key}-${outcome.name || index}`;
                                                    const selected = selectedOddsKey === outcomeKey;
                                                    return (
                                                        <button
                                                            key={`${market.key}-${outcome.name || index}`}
                                                            className={`props-odds-btn ${selected ? 'selected' : ''}`}
                                                            onClick={() => addSelection(market, outcome)}
                                                            disabled={outcome.price == null}
                                                        >
                                                            <span>{label}</span>
                                                            <strong>{outcome.price != null ? Number(outcome.price).toFixed(2) : '-'}</strong>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const marketTitle = (key) => {
    const map = {
        h2h: 'Game Winner',
        spreads: 'Spread',
        totals: 'Total'
    };
    if (map[key]) return map[key];
    return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatSportLabel = (sportKey = 'unknown') => {
    return sportKey
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const getMatchId = (match) => match?.id || match?._id || match?.externalId || `${match?.homeTeam || match?.home_team}-${match?.awayTeam || match?.away_team}`;

const formatStartTime = (startTime) => {
    if (!startTime) return 'Live';
    const date = new Date(startTime);
    if (Number.isNaN(date.getTime())) return 'Live';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default PropsView;
