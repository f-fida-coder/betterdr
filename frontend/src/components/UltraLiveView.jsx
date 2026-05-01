import React, { useMemo, useState, useEffect } from 'react';
import '../ultralive.css';
import useMatches from '../hooks/useMatches';
import { getMyBets } from '../api';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import {
    formatLineValue,
    formatOdds,
    getMatchMarket,
    getMarketOutcomeByKeyword,
    getMarketOutcomeByName,
    parseOddsNumber,
} from '../utils/odds';

const NAV_TABS = [
    { id: 'in_play', label: 'In-Play' },
    { id: 'history', label: 'History' },
    { id: 'live_tv', label: 'Live TV' }
];

const MARKET_TABS = [
    { id: 'all', label: 'All' },
    { id: 'spread', label: 'Spread' },
    { id: 'total', label: 'Total' },
    { id: 'moneyline', label: 'Moneyline' }
];

const formatSportLabel = (sport = '') => {
    if (!sport) return 'Unknown';
    const parts = sport.toString().split('_').filter(Boolean);
    if (parts.length === 1) return parts[0].toUpperCase().replace('-', ' ');
    return `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} ${parts.slice(1).join(' ').toUpperCase().replace('-', ' ')}`;
};

const isLiveMatch = (match) => {
    const status = (match?.status || '').toString().toLowerCase();
    const eventStatus = (match?.score?.event_status || '').toString().toUpperCase();
    return status === 'live' || eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE');
};

const isFinishedMatch = (match) => {
    const status = (match?.status || '').toString().toLowerCase();
    const eventStatus = (match?.score?.event_status || '').toString().toUpperCase();
    return ['finished', 'final', 'closed', 'settled', 'cancelled', 'canceled'].includes(status)
        || eventStatus.includes('FINAL')
        || eventStatus.includes('COMPLETE')
        || eventStatus.includes('CLOSED');
};

const getMatchId = (match) => match?.id || match?.externalId;

const getMoneyline = (match, teamName) => {
    const market = getMatchMarket(match, 'h2h');
    const outcome = getMarketOutcomeByName(market, teamName);
    return parseOddsNumber(outcome?.price);
};

const getSpread = (match, teamName) => {
    const market = getMatchMarket(match, 'spreads');
    const outcome = getMarketOutcomeByName(market, teamName);
    if (!outcome) return { point: null, price: null };
    return { point: outcome.point ?? null, price: parseOddsNumber(outcome.price) };
};

const getTotal = (match, side) => {
    const market = getMatchMarket(match, 'totals');
    const outcome = getMarketOutcomeByKeyword(market, side);
    if (!outcome) return { point: null, price: null };
    return { point: outcome.point ?? null, price: parseOddsNumber(outcome.price) };
};

const UltraLiveView = () => {
    const { oddsFormat } = useOddsFormat();
    const [navTab, setNavTab] = useState('in_play');
    const [selectedSport, setSelectedSport] = useState('all');
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [marketView, setMarketView] = useState('all');
    const [selectedOddsKey, setSelectedOddsKey] = useState(null);
    const [rightTab, setRightTab] = useState('bet_slip');
    const [myBets, setMyBets] = useState([]);
    const [myBetsLoading, setMyBetsLoading] = useState(false);
    const [myBetsError, setMyBetsError] = useState('');
    const [collapsedMarkets, setCollapsedMarkets] = useState({
        game_winner: false,
        spread: false,
        total: false
    });

    const feedStatus = navTab === 'history' ? 'all' : 'live-upcoming';
    const rawMatches = useMatches({ status: feedStatus, scopeKey: `${navTab}:${selectedSport}` });

    const matches = useMemo(() => {
        const list = Array.isArray(rawMatches) ? rawMatches : [];
        if (navTab === 'history') return list.filter(isFinishedMatch);
        return list.filter(isLiveMatch);
    }, [rawMatches, navTab]);

    const sportBuckets = useMemo(() => {
        const map = new Map();
        matches.forEach((m) => {
            const key = (m.sport || 'unknown').toString();
            const bucket = map.get(key) || { key, label: formatSportLabel(key), count: 0 };
            bucket.count += 1;
            map.set(key, bucket);
        });
        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [matches]);

    const filteredMatches = useMemo(() => {
        if (selectedSport === 'all') return matches;
        return matches.filter(m => (m.sport || '').toString() === selectedSport);
    }, [matches, selectedSport]);

    useEffect(() => {
        if (selectedMatchId && filteredMatches.some(m => getMatchId(m) === selectedMatchId)) return;
        setSelectedMatchId(getMatchId(filteredMatches[0]) || null);
    }, [selectedMatchId, filteredMatches]);

    useEffect(() => {
        const fetchMyBetsData = async () => {
            if (rightTab !== 'my_bets') return;
            const token = localStorage.getItem('token');
            if (!token) {
                setMyBets([]);
                setMyBetsError('Please login to view your bets.');
                return;
            }
            try {
                setMyBetsLoading(true);
                setMyBetsError('');
                const data = await getMyBets(token);
                setMyBets(Array.isArray(data) ? data : []);
            } catch (error) {
                setMyBetsError(error.message || 'Failed to load bets');
            } finally {
                setMyBetsLoading(false);
            }
        };

        fetchMyBetsData();
    }, [rightTab]);

    const selectedMatch = useMemo(() => {
        return filteredMatches.find(m => getMatchId(m) === selectedMatchId) || filteredMatches[0] || null;
    }, [filteredMatches, selectedMatchId]);

    const home = selectedMatch?.homeTeam || selectedMatch?.home_team || 'Home';
    const away = selectedMatch?.awayTeam || selectedMatch?.away_team || 'Away';
    const homeScore = selectedMatch?.score?.score_home ?? '-';
    const awayScore = selectedMatch?.score?.score_away ?? '-';
    const period = selectedMatch?.score?.period || (navTab === 'history' ? 'Final' : 'Live');

    const homeSpread = selectedMatch ? getSpread(selectedMatch, home) : { point: null, price: null };
    const awaySpread = selectedMatch ? getSpread(selectedMatch, away) : { point: null, price: null };
    const over = selectedMatch ? getTotal(selectedMatch, 'over') : { point: null, price: null };
    const under = selectedMatch ? getTotal(selectedMatch, 'under') : { point: null, price: null };
    const homeMoneyline = selectedMatch ? getMoneyline(selectedMatch, home) : null;
    const awayMoneyline = selectedMatch ? getMoneyline(selectedMatch, away) : null;

    const refreshFeed = () => {
        window.dispatchEvent(new CustomEvent('matches:refresh', { detail: { reason: 'manual' } }));
    };

    const toggleMarketSection = (key) => {
        setCollapsedMarkets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const addSelection = ({ selection, marketType, odds, marketLabel }) => {
        const parsedOdds = parseOddsNumber(odds);
        if (!selectedMatch || parsedOdds === null) return;
        const matchId = getMatchId(selectedMatch);
        const oddsKey = `${matchId}-${marketType}-${selection}`;
        setSelectedOddsKey(oddsKey);

        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId,
                selection,
                marketType,
                odds: parsedOdds,
                matchName: `${home} vs ${away}`,
                marketLabel
            }
        }));
    };

    return (
        <div className="ultra-live-wrapper">
            <aside className="ultra-sidebar">
                <div className="ultra-subnav">
                    {NAV_TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`ultra-subnav-item ${navTab === tab.id ? 'active' : ''}`}
                            onClick={() => setNavTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="ultra-sidebar-header">Sports</div>
                <div className={`ultra-sidebar-sport ${selectedSport === 'all' ? 'active' : ''}`} onClick={() => setSelectedSport('all')}>
                    <span><i className="fa-solid fa-trophy"></i> All Sports</span>
                    <span className="ultra-chip">{matches.length}</span>
                </div>
                {sportBuckets.map(bucket => (
                    <div
                        key={bucket.key}
                        className={`ultra-sidebar-sport ${selectedSport === bucket.key ? 'active' : ''}`}
                        onClick={() => setSelectedSport(bucket.key)}
                    >
                        <span><i className="fa-solid fa-medal"></i> {bucket.label}</span>
                        <span className="ultra-chip">{bucket.count}</span>
                    </div>
                ))}

                <div className="ultra-sidebar-header">Matches</div>
                <div className="ultra-match-list">
                    {filteredMatches.length === 0 ? (
                        <div className="ultra-empty-mini">No matches for this filter.</div>
                    ) : filteredMatches.map((match) => {
                        const id = getMatchId(match);
                        const active = id === getMatchId(selectedMatch);
                        const matchHome = match.homeTeam || match.home_team;
                        const matchAway = match.awayTeam || match.away_team;
                        return (
                            <div key={id} className={`ultra-sidebar-match ${active ? 'active' : ''}`} onClick={() => setSelectedMatchId(id)}>
                                <div className="ultra-sidebar-match-teams">
                                    <span>{matchHome}</span>
                                    <span className="ultra-sidebar-match-score">{match.score?.score_home ?? '-'}</span>
                                </div>
                                <div className="ultra-sidebar-match-teams">
                                    <span>{matchAway}</span>
                                    <span className="ultra-sidebar-match-score">{match.score?.score_away ?? '-'}</span>
                                </div>
                                <div className="ultra-sidebar-match-meta">{match.score?.period || (navTab === 'history' ? 'Final' : 'Live')}</div>
                            </div>
                        );
                    })}
                </div>
            </aside>

            <main className="ultra-main">
                <div className="ultra-toolbar">
                    <div className="ultra-market-tabs">
                        {MARKET_TABS.map(tab => (
                            <button
                                key={tab.id}
                                className={marketView === tab.id ? 'active' : ''}
                                onClick={() => setMarketView(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <button className="ultra-refresh" onClick={refreshFeed}><i className="fa-solid fa-arrows-rotate"></i> Refresh</button>
                </div>

                <div className="ultra-video-area">
                    <div className="ultra-live-indicator">{navTab === 'history' ? 'ARCHIVE' : 'LIVE'}</div>
                    <div className="ultra-video-center">
                        <i className="fa-regular fa-circle-play"></i>
                        <span>{navTab === 'history' ? 'Match Replay Feed' : 'Live Stream Feed'}</span>
                    </div>
                    <div className="ultra-video-score">{home} {homeScore} - {awayScore} {away}</div>
                </div>

                <div className="ultra-markets-container">
                    <div className="ultra-market-header">
                        <h2>{home} @ {away}</h2>
                        <div className="ultra-market-status">{period}</div>
                    </div>

                    {(marketView === 'all' || marketView === 'moneyline') && (
                        <div className="ultra-market-section">
                            <button className="ultra-market-title" onClick={() => toggleMarketSection('game_winner')}>
                                <span>Game Winner</span>
                                <i className={`fa-solid ${collapsedMarkets.game_winner ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                            </button>
                            {!collapsedMarkets.game_winner && (
                                <div className="ultra-market-rows">
                                    <div className="ultra-market-row">
                                        <button
                                            className={`ultra-odds-box ${selectedOddsKey === `${getMatchId(selectedMatch)}-h2h-${home}` ? 'selected' : ''}`}
                                            disabled={homeMoneyline == null}
                                            onClick={() => addSelection({ selection: home, marketType: 'h2h', odds: homeMoneyline, marketLabel: 'Moneyline' })}
                                        >
                                            <span className="ultra-odds-label">{home}</span>
                                            <span className="ultra-odds-val">{formatOdds(homeMoneyline, oddsFormat)}</span>
                                        </button>
                                        <button
                                            className={`ultra-odds-box ${selectedOddsKey === `${getMatchId(selectedMatch)}-h2h-${away}` ? 'selected' : ''}`}
                                            disabled={awayMoneyline == null}
                                            onClick={() => addSelection({ selection: away, marketType: 'h2h', odds: awayMoneyline, marketLabel: 'Moneyline' })}
                                        >
                                            <span className="ultra-odds-label">{away}</span>
                                            <span className="ultra-odds-val">{formatOdds(awayMoneyline, oddsFormat)}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(marketView === 'all' || marketView === 'spread') && (
                        <div className="ultra-market-section">
                            <button className="ultra-market-title" onClick={() => toggleMarketSection('spread')}>
                                <span>Spread</span>
                                <i className={`fa-solid ${collapsedMarkets.spread ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                            </button>
                            {!collapsedMarkets.spread && (
                                <div className="ultra-market-rows">
                                    <div className="ultra-market-row">
                                        <button
                                            className={`ultra-odds-box ${selectedOddsKey === `${getMatchId(selectedMatch)}-spreads-${home}` ? 'selected' : ''}`}
                                            disabled={homeSpread.price == null}
                                            onClick={() => addSelection({ selection: home, marketType: 'spreads', odds: homeSpread.price, marketLabel: 'Spread' })}
                                        >
                                            <span className="ultra-odds-label">{formatLineValue(homeSpread.point, { signed: true })}</span>
                                            <span className="ultra-odds-val">{formatOdds(homeSpread.price, oddsFormat)}</span>
                                        </button>
                                        <button
                                            className={`ultra-odds-box ${selectedOddsKey === `${getMatchId(selectedMatch)}-spreads-${away}` ? 'selected' : ''}`}
                                            disabled={awaySpread.price == null}
                                            onClick={() => addSelection({ selection: away, marketType: 'spreads', odds: awaySpread.price, marketLabel: 'Spread' })}
                                        >
                                            <span className="ultra-odds-label">{formatLineValue(awaySpread.point, { signed: true })}</span>
                                            <span className="ultra-odds-val">{formatOdds(awaySpread.price, oddsFormat)}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(marketView === 'all' || marketView === 'total') && (
                        <div className="ultra-market-section">
                            <button className="ultra-market-title" onClick={() => toggleMarketSection('total')}>
                                <span>Total</span>
                                <i className={`fa-solid ${collapsedMarkets.total ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                            </button>
                            {!collapsedMarkets.total && (
                                <div className="ultra-market-rows">
                                    <div className="ultra-market-row">
                                        <button
                                            className={`ultra-odds-box ${selectedOddsKey === `${getMatchId(selectedMatch)}-totals-Over` ? 'selected' : ''}`}
                                            disabled={over.price == null}
                                            onClick={() => addSelection({ selection: 'Over', marketType: 'totals', odds: over.price, marketLabel: 'Total' })}
                                        >
                                            <span className="ultra-odds-label">{`O ${formatLineValue(over.point)}`}</span>
                                            <span className="ultra-odds-val">{formatOdds(over.price, oddsFormat)}</span>
                                        </button>
                                        <button
                                            className={`ultra-odds-box ${selectedOddsKey === `${getMatchId(selectedMatch)}-totals-Under` ? 'selected' : ''}`}
                                            disabled={under.price == null}
                                            onClick={() => addSelection({ selection: 'Under', marketType: 'totals', odds: under.price, marketLabel: 'Total' })}
                                        >
                                            <span className="ultra-odds-label">{`U ${formatLineValue(under.point)}`}</span>
                                            <span className="ultra-odds-val">{formatOdds(under.price, oddsFormat)}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <aside className="ultra-right-panel">
                <div className="ultra-tracker">
                    <div className="ultra-tracker-top">
                        <span>{formatSportLabel(selectedMatch?.sport)}</span>
                        <span>{period}</span>
                    </div>
                    <div className="ultra-tracker-body">
                        <div className="ultra-tracker-team">{home}</div>
                        <div className="ultra-tracker-score">{homeScore} - {awayScore}</div>
                        <div className="ultra-tracker-team">{away}</div>
                    </div>
                </div>

                <div className="ultra-slip-header">
                    <button className={`ultra-slip-tab ${rightTab === 'bet_slip' ? 'active' : ''}`} onClick={() => setRightTab('bet_slip')}>Bet Slip</button>
                    <button className={`ultra-slip-tab ${rightTab === 'my_bets' ? 'active' : ''}`} onClick={() => setRightTab('my_bets')}>My Bets</button>
                </div>

                <div className="ultra-slip-body">
                    {rightTab === 'bet_slip' && (
                        <>
                            <h4>Slip Ready</h4>
                            <p>Click any odds to add selections to your active betting panel.</p>
                        </>
                    )}

                    {rightTab === 'my_bets' && (
                        <>
                            {myBetsLoading && <p>Loading bets...</p>}
                            {!myBetsLoading && myBetsError && <p>{myBetsError}</p>}
                            {!myBetsLoading && !myBetsError && myBets.length === 0 && <p>No bets found.</p>}
                            {!myBetsLoading && !myBetsError && myBets.length > 0 && (
                                <div className="ultra-my-bets-list">
                                    {myBets.slice(0, 12).map((bet) => (
                                        <div key={bet.id} className="ultra-my-bet-item">
                                            <div className="ultra-my-bet-top">
                                                <span>{(bet.type || 'bet').toUpperCase()}</span>
                                                <span className={`ultra-bet-status ${bet.status || 'pending'}`}>{bet.status || 'pending'}</span>
                                            </div>
                                            <div className="ultra-my-bet-row">Risk: ${Math.floor(Number(bet.amount || 0))}</div>
                                            <div className="ultra-my-bet-row">Win: ${Math.floor(Math.max(0, Number(bet.potentialPayout || 0) - Number(bet.amount || 0)))}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default UltraLiveView;
