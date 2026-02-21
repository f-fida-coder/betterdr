import React, { useEffect, useMemo, useState } from 'react';
import { fetchOddsManual, getMatches, getAdminMatches } from '../api';
import { createFallbackTeamLogoDataUri, fetchTeamBadgeUrl } from '../utils/teamLogos';

const SCOREBOARD_CACHE_KEY = 'admin_scoreboard_matches_cache_v1';
const FETCH_ATTEMPTS = 10;
const FETCH_RETRY_MS = 1500;

const ScoreboardSidebar = ({ onClose }) => {
    const [directMatches, setDirectMatches] = useState([]);
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);
    const [collapsedLeagues, setCollapsedLeagues] = useState({});
    const [teamLogos, setTeamLogos] = useState({});
    const [canShowEmptyState, setCanShowEmptyState] = useState(false);
    const withTimeout = async (promise, ms, label) => {
        let timeoutId;
        try {
            return await Promise.race([
                promise,
                new Promise((_, reject) => {
                    timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
                })
            ]);
        } finally {
            if (timeoutId) window.clearTimeout(timeoutId);
        }
    };

    useEffect(() => {
        let mounted = true;
        let foundCache = false;
        let hasAnyData = false;
        // Show last successful matches immediately while fresh fetch runs.
        try {
            const cachedRaw = localStorage.getItem(SCOREBOARD_CACHE_KEY);
            if (cachedRaw) {
                const cached = JSON.parse(cachedRaw);
                if (Array.isArray(cached) && cached.length > 0) {
                    setDirectMatches(cached);
                    foundCache = true;
                    hasAnyData = true;
                }
            }
        } catch {
            // Ignore cache read issues.
        }
        if (!foundCache) setIsLoadingMatches(true);

        const fetchFromApis = async () => {
            const token = localStorage.getItem('token');
            const publicReq = withTimeout(getMatches(), 5000, 'Loading matches');
            const adminReq = token ? withTimeout(getAdminMatches(token), 5000, 'Loading admin matches') : Promise.resolve([]);
            const [publicRes, adminRes] = await Promise.allSettled([publicReq, adminReq]);
            const publicData = publicRes.status === 'fulfilled' && Array.isArray(publicRes.value) ? publicRes.value : [];
            const adminData = adminRes.status === 'fulfilled' && Array.isArray(adminRes.value) ? adminRes.value : [];
            return adminData.length > 0 ? adminData : publicData;
        };

        const loadMatchesNow = async ({ silent = false } = {}) => {
            try {
                if (mounted && !silent && !hasAnyData) setIsLoadingMatches(true);
                let finalMatches = [];
                for (let i = 0; i < FETCH_ATTEMPTS; i += 1) {
                    finalMatches = await fetchFromApis();
                    if (finalMatches.length > 0 || i === FETCH_ATTEMPTS - 1) break;
                    await new Promise((resolve) => window.setTimeout(resolve, FETCH_RETRY_MS));
                }

                if (!mounted) return;
                if (finalMatches.length > 0) {
                    setDirectMatches(finalMatches);
                    hasAnyData = true;
                    setIsLoadingMatches(false);
                    try {
                        localStorage.setItem(SCOREBOARD_CACHE_KEY, JSON.stringify(finalMatches));
                    } catch {
                        // Ignore cache write issues.
                    }
                } else if (!hasAnyData) {
                    setIsLoadingMatches(false);
                }
            } finally {
                if (mounted && !hasAnyData) setIsLoadingMatches(false);
            }
        };

        const refreshScores = async () => {
            try {
                // Best-effort refresh; never block or surface timeout errors to UI.
                await withTimeout(fetchOddsManual(), 5000, 'Refreshing scores');
            } catch {
                // Ignore refresh errors if we already have matches to show.
            }
            if (mounted) {
                await loadMatchesNow({ silent: true });
            }
        };

        // Avoid premature empty state while slower APIs are still returning.
        const emptyStateGuard = window.setTimeout(() => {
            if (mounted) setCanShowEmptyState(true);
        }, 20000);
        loadMatchesNow();
        // Pull latest scores in background after panel opens.
        window.setTimeout(() => { refreshScores(); }, 50);
        // Keep scores current while the panel stays open.
        const timer = window.setInterval(refreshScores, 60000);

        return () => {
            mounted = false;
            window.clearTimeout(emptyStateGuard);
            window.clearInterval(timer);
        };
    }, []);

    const isLiveMatch = (match) => {
        const status = String(match?.status || '').toLowerCase();
        if (status === 'live') return true;
        const eventStatus = String(match?.score?.event_status || '').toUpperCase();
        return eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE');
    };

    const isUpcomingMatch = (match) => {
        const status = String(match?.status || '').toLowerCase();
        if (['scheduled', 'pre-game', 'pregame', 'upcoming', 'pending'].includes(status)) return true;
        if (match?.startTime) {
            const ts = new Date(match.startTime).getTime();
            if (!Number.isNaN(ts)) return ts > Date.now();
        }
        return false;
    };

    const matches = useMemo(() => {
        const source = Array.isArray(directMatches) ? directMatches : [];
        const preferred = source.filter((m) => isLiveMatch(m) || isUpcomingMatch(m));
        if (preferred.length > 0) return preferred;
        return source;
    }, [directMatches]);

    // Group matches by sport
    const groupedMatches = useMemo(() => {
        const groups = {};
        matches.forEach(match => {
            const league = (match.sport || 'Unknown').toUpperCase();
            if (!groups[league]) {
                groups[league] = [];
            }
            groups[league].push(match);
        });
        return groups;
    }, [matches]);
    const hasVisibleMatches = matches.length > 0;

    useEffect(() => {
        // Keep leagues expanded by default, preserve user toggle when possible.
        setCollapsedLeagues((prev) => {
            const next = { ...prev };
            Object.keys(groupedMatches).forEach((league) => {
                if (typeof next[league] !== 'boolean') next[league] = false;
            });
            return next;
        });
    }, [groupedMatches]);

    useEffect(() => {
        let mounted = true;
        const loadTeamLogos = async () => {
            const uniqueTeams = new Set();
            matches.forEach((m) => {
                if (m?.homeTeam) uniqueTeams.add(String(m.homeTeam));
                if (m?.awayTeam) uniqueTeams.add(String(m.awayTeam));
            });

            const missingTeams = Array.from(uniqueTeams).filter((team) => !teamLogos[team]);
            if (missingTeams.length === 0) return;

            const updates = {};
            await Promise.all(
                missingTeams.map(async (team) => {
                    try {
                        const url = await fetchTeamBadgeUrl(team);
                        if (url) updates[team] = url;
                    } catch {
                        // Keep fallback for any fetch failure.
                    }
                })
            );

            if (mounted && Object.keys(updates).length > 0) {
                setTeamLogos((prev) => ({ ...prev, ...updates }));
            }
        };

        loadTeamLogos();
        return () => { mounted = false; };
    }, [matches, teamLogos]);

    const formatTime = (match) => {
        if (match.status === 'live') return <span className="text-danger fw-bold">LIVE</span>;
        if (!match.startTime) return 'TBD';
        const date = new Date(match.startTime);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    };

    const getScore = (match, side) => {
        if (!match.score) return '';
        if (side === 'home') return (match.score.score_home ?? match.score.home_score ?? match.score.scoreHome ?? 0);
        if (side === 'away') return (match.score.score_away ?? match.score.away_score ?? match.score.scoreAway ?? 0);
        return '';
    };

    const renderLeague = (leagueName, games) => (
        <div key={leagueName} className="scoreboard-league">
            <button
                type="button"
                className="league-header"
                onClick={() => setCollapsedLeagues((prev) => ({ ...prev, [leagueName]: !prev[leagueName] }))}
            >
                <span>{leagueName}</span>
                <i className={`fa-solid ${collapsedLeagues[leagueName] ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
            </button>
            {!collapsedLeagues[leagueName] && (
            <div className="league-games">
                {Array.from({ length: Math.ceil(games.length / 2) }, (_, rowIndex) => games.slice(rowIndex * 2, rowIndex * 2 + 2)).map((pair, rowIndex) => (
                    <div key={`${leagueName}-${rowIndex}`} className="scoreboard-game-row">
                        {pair.map((game, colIndex) => {
                            const network = game?.broadcast || game?.tv || game?.score?.broadcast || '';
                            return (
                                <div key={(game._id || game.id || `${rowIndex}-${colIndex}`)} className="scoreboard-game-cell">
                                    <div className="game-row">
                                        <span className="game-time">{formatTime(game)}</span>
                                        <span className="game-network">{network}</span>
                                    </div>
                                    <div className="game-team">
                                        <div className="game-team-main">
                                            <img
                                                src={teamLogos[game.homeTeam] || createFallbackTeamLogoDataUri(game.homeTeam)}
                                                alt={game.homeTeam}
                                                className="game-logo"
                                                onError={(e) => { e.currentTarget.src = createFallbackTeamLogoDataUri(game.homeTeam); }}
                                            />
                                            <span>{game.homeTeam}</span>
                                        </div>
                                        <span className="game-score">{getScore(game, 'home')}</span>
                                    </div>
                                    <div className="game-team">
                                        <div className="game-team-main">
                                            <img
                                                src={teamLogos[game.awayTeam] || createFallbackTeamLogoDataUri(game.awayTeam)}
                                                alt={game.awayTeam}
                                                className="game-logo"
                                                onError={(e) => { e.currentTarget.src = createFallbackTeamLogoDataUri(game.awayTeam); }}
                                            />
                                            <span>{game.awayTeam}</span>
                                        </div>
                                        <span className="game-score">{getScore(game, 'away')}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {pair.length === 1 && <div className="scoreboard-game-cell ghost-cell"></div>}
                    </div>
                ))}
            </div>
            )}
        </div>
    );

    return (
        <div className="scoreboard-overlay">
            <div className="scoreboard-header">
                <h2>Scoreboard</h2>
                <span className="close-btn" onClick={onClose}>Close</span>
            </div>
            <div className="scoreboard-content">
                {(!hasVisibleMatches && isLoadingMatches) ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        Loading scoreboard...
                    </div>
                ) : Object.keys(groupedMatches).length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        No games found right now.
                    </div>
                ) : (
                    Object.entries(groupedMatches).map(([league, games]) => renderLeague(league, games))
                )}
            </div>
            <style>{`
                .scoreboard-overlay {
                    position: fixed;
                    top: 0;
                    right: 0;
                    width: 350px;
                    height: 100vh;
                    background: #f5f5f5;
                    box-shadow: -5px 0 15px rgba(0,0,0,0.3);
                    z-index: 3000;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Roboto', sans-serif;
                }
                .scoreboard-header {
                    background: #fff;
                    padding: 15px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border-bottom: 1px solid #ddd;
                    position: relative;
                }
                .scoreboard-header h2 {
                    margin: 0;
                    font-size: 18px;
                    color: #333;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .close-btn {
                    position: absolute;
                    right: 15px;
                    color: #d9534f;
                    font-size: 14px;
                    cursor: pointer;
                    text-decoration: underline;
                    font-weight: bold;
                }
                .scoreboard-content {
                    flex: 1;
                    overflow-y: auto;
                }
                .scoreboard-status-row {
                    padding: 6px 12px;
                    background: #fff;
                    border-bottom: 1px solid #ddd;
                }
                .scoreboard-status {
                    font-size: 12px;
                    font-weight: 600;
                }
                .scoreboard-status.syncing {
                    color: #0b7285;
                }
                .scoreboard-status.error {
                    color: #b02a37;
                }
                .league-header {
                    background: #333;
                    color: white;
                    padding: 8px 15px;
                    font-size: 14px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #444;
                    width: 100%;
                    border-left: none;
                    border-right: none;
                    cursor: pointer;
                }
                .league-games {
                    background: #e5e7eb;
                    border-left: 1px solid #c6c8cc;
                }
                .scoreboard-game-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                }
                .scoreboard-game-cell {
                    background: #f3f4f6;
                    border-right: 1px solid #c6c8cc;
                    border-bottom: 1px solid #c6c8cc;
                    min-height: 84px;
                }
                .scoreboard-game-cell.ghost-cell {
                    background: #f3f4f6;
                }
                .game-row {
                    display: flex;
                    justify-content: space-between;
                    color: #4b5563;
                    background: #e5e7eb;
                    padding: 4px 8px;
                    font-size: 11px;
                    border-bottom: 1px solid #d1d5db;
                }
                .game-network {
                    font-weight: 700;
                    color: #15803d;
                    min-width: 28px;
                    text-align: right;
                }
                .game-team {
                    display: flex;
                    align-items: center;
                    margin: 5px 0;
                    color: #3f3f46;
                    font-weight: 500;
                    justify-content: space-between;
                    padding: 0 8px;
                }
                .game-team-main {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    min-width: 0;
                }
                .game-team-main span {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 120px;
                    font-size: 12px;
                }
                .game-logo {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                }
                .game-score {
                    font-weight: 700;
                    color: #111827;
                    font-size: 12px;
                    min-width: 14px;
                    text-align: right;
                }
                .text-danger { color: #dc3545; }
                .fw-bold { font-weight: bold; }
                @media (max-width: 380px) {
                    .scoreboard-game-row {
                        grid-template-columns: 1fr;
                    }
                    .scoreboard-game-cell {
                        border-right: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default ScoreboardSidebar;
