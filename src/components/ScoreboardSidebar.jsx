import React from 'react';

const ScoreboardSidebar = ({ onClose }) => {
    const scores = {
        NFL: [
            { time: '1:00 pm EST', network: 'CBS', home: { name: 'Bills', logo: 'B' }, away: { name: 'Jaguars', logo: 'J' } },
            { time: '1:10 pm EST', network: '', home: { name: 'AFC Conference', logo: 'A' }, away: { name: 'NFC Conference', logo: 'N' } },
            { time: '4:30 pm EST', network: 'FOX', home: { name: '49ers', logo: '4' }, away: { name: 'Eagles', logo: 'E' } },
            { time: '8:15 pm EST', network: 'NBC', home: { name: 'Chargers', logo: 'C' }, away: { name: 'Patriots', logo: 'P' } }
        ],
        NBA: [
            { time: '3:10 pm EST', network: '', home: { name: 'Pelicans', logo: 'P' }, away: { name: 'Magic', logo: 'M' } },
            { time: '3:40 pm EST', network: '', home: { name: 'Nets', logo: 'N' }, away: { name: 'Grizzlies', logo: 'G' } },
            { time: '6:10 pm EST', network: '', home: { name: '76ers', logo: '7' }, away: { name: 'Raptors', logo: 'R' } },
            { time: '6:10 pm EST', network: '', home: { name: 'Knicks', logo: 'K' }, away: { name: 'T Blazers', logo: 'T' } },
            { time: '7:10 pm EST', network: '', home: { name: 'Spurs', logo: 'S' }, away: { name: 'Timberwolves', logo: 'T' } },
            { time: '7:10 pm EST', network: '', home: { name: 'Heat', logo: 'H' }, away: { name: 'Thunder', logo: 'T' } }
        ],
        NCAA: [
            { time: 'Final', network: '', home: { name: 'Cal Irvine', logo: 'C' }, away: { name: 'Hawaii', logo: 'H' } },
            { time: '12:00 pm EST', network: 'FOX', home: { name: 'Illinois', logo: 'I' }, away: { name: 'Iowa', logo: 'I' } },
            { time: '12:00 pm EST', network: '', home: { name: 'St Josephs', logo: 'S' }, away: { name: 'Richmond', logo: 'R' } },
            { time: '1:00 pm EST', network: 'ESPN2', home: { name: 'Memphis', logo: 'M' }, away: { name: 'Florida Atl', logo: 'F' } }
        ]
    };

    const renderLeague = (leagueName, games) => (
        <div key={leagueName} className="scoreboard-league">
            <div className="league-header">
                <span>{leagueName}</span>
                <i className="fa-solid fa-chevron-down"></i>
            </div>
            <div className="league-games">
                {games.map((game, index) => (
                    <div key={index} className="scoreboard-game">
                        <div className="game-row">
                            <span className="game-time">{game.time}</span>
                            {game.network && <span className="game-network text-success">{game.network}</span>}
                        </div>
                        <div className="game-team">
                            <img src={`https://ui-avatars.com/api/?name=${game.home.name}&background=random&color=fff&size=20`} alt={game.home.name} className="game-logo" />
                            <span>{game.home.name}</span>
                        </div>
                        <div className="game-team">
                            <img src={`https://ui-avatars.com/api/?name=${game.away.name}&background=random&color=fff&size=20`} alt={game.away.name} className="game-logo" />
                            <span>{game.away.name}</span>
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
                {Object.entries(scores).map(([league, games]) => renderLeague(league, games))}
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
                }
                .game-logo {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    margin-right: 8px;
                }
            `}</style>
        </div>
    );
};

export default ScoreboardSidebar;
