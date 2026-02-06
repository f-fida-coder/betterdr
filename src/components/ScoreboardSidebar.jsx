import React, { useMemo } from 'react';
import useMatches from '../hooks/useMatches';

const ScoreboardSidebar = ({ onClose }) => {
    // Fetch live and upcoming matches
    const matches = useMatches({ status: 'live-upcoming' });

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

    const formatTime = (match) => {
        if (match.status === 'live') return <span className="text-danger fw-bold">LIVE</span>;
        if (!match.startTime) return 'TBD';
        const date = new Date(match.startTime);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    };

    const getScore = (match, side) => {
        if (!match.score) return '';
        if (side === 'home') return match.score.score_home || '0';
        if (side === 'away') return match.score.score_away || '0';
        return '';
    };

    const renderLeague = (leagueName, games) => (
        <div key={leagueName} className="scoreboard-league">
            <div className="league-header">
                <span>{leagueName}</span>
                <i className="fa-solid fa-chevron-down"></i>
            </div>
            <div className="league-games">
                {games.map((game, index) => (
                    <div key={game._id || index} className="scoreboard-game">
                        <div className="game-row">
                            <span className="game-time">{formatTime(game)}</span>
                            {/* Network not currently in DB */}
                        </div>
                        <div className="game-team">
                            <img src={`https://ui-avatars.com/api/?name=${game.homeTeam}&background=random&color=fff&size=20`} alt={game.homeTeam} className="game-logo" />
                            <span>{game.homeTeam}</span>
                            <span className="game-score">{getScore(game, 'home')}</span>
                        </div>
                        <div className="game-team">
                            <img src={`https://ui-avatars.com/api/?name=${game.awayTeam}&background=random&color=fff&size=20`} alt={game.awayTeam} className="game-logo" />
                            <span>{game.awayTeam}</span>
                            <span className="game-score">{getScore(game, 'away')}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="scoreboard-overlay">
            <div className="scoreboard-header">
                <h2>Scoreboard</h2>
                <span className="close-btn" onClick={onClose}>Close</span>
            </div>
            <div className="scoreboard-content">
                {Object.keys(groupedMatches).length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        No live or upcoming games found.
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
                }
                .scoreboard-game {
                    background: white;
                    border-bottom: 1px solid #eee;
                    padding: 8px 15px;
                    font-size: 13px;
                }
                .scoreboard-game:nth-child(even) {
                    background: #f9f9f9;
                }
                .game-row {
                    display: flex;
                    justify-content: space-between;
                    color: #666;
                    margin-bottom: 4px;
                    font-size: 12px;
                }
                .game-network {
                    font-weight: bold;
                    color: #28a745;
                }
                .game-team {
                    display: flex;
                    align-items: center;
                    margin-bottom: 2px;
                    color: #222;
                    font-weight: 500;
                    justify-content: space-between;
                }
                .game-logo {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    margin-right: 8px;
                }
                .game-score {
                    font-weight: bold;
                    color: #333;
                }
                .text-danger { color: #dc3545; }
                .fw-bold { font-weight: bold; }
            `}</style>
        </div>
    );
};

export default ScoreboardSidebar;
