import React, { useState } from 'react';

const SportContentView = ({ sportId, selectedItems = [] }) => {
    const [activeTab, setActiveTab] = useState('matches');

        const getContentData = () => {
        const sportDataMap = {
            nfl: {
                name: 'NFL',
                icon: 'fa-solid fa-football',
                matches: [
                    {
                        id: 1,
                        time: '07:07 PM EST',
                        date: 'MONDAY, JAN 12',
                        team1: { name: 'Houston Texans', abbr: 'HOU', logo: '🔵' },
                        team2: { name: 'Pittsburgh Steelers', abbr: 'PIT', logo: '⚫' },
                        score1: 21,
                        score2: 17,
                        status: 'LIVE - 4th Quarter',
                        odds: {
                            spread: ['-3.5 (-110)', '+3.5 (-110)'],
                            moneyline: ['-165', '+135'],
                            total: ['O 38.5 (-110)', 'U 38.5 (-110)']
                        }
                    },
                    {
                        id: 2,
                        time: '08:20 PM EST',
                        date: 'MONDAY, JAN 12',
                        team1: { name: 'Kansas City Chiefs', abbr: 'KC', logo: '🔴' },
                        team2: { name: 'Buffalo Bills', abbr: 'BUF', logo: '🔵' },
                        score1: 24,
                        score2: 20,
                        status: 'LIVE - 3rd Quarter',
                        odds: {
                            spread: ['-2.5 (-110)', '+2.5 (-110)'],
                            moneyline: ['-145', '+115'],
                            total: ['O 44.5 (-110)', 'U 44.5 (-110)']
                        }
                    }
                ],
                scoreboards: [
                    { team: 'Texans', Q1: 7, Q2: 7, Q3: 0, Q4: 7, Total: 21 },
                    { team: 'Steelers', Q1: 3, Q2: 7, Q3: 0, Q4: 7, Total: 17 }
                ]
            },
            nba: {
                name: 'NBA',
                icon: 'fa-solid fa-basketball',
                matches: [
                    {
                        id: 1,
                        time: '07:30 PM EST',
                        date: 'MONDAY, JAN 12',
                        team1: { name: 'Boston Celtics', abbr: 'BOS', logo: '🟢' },
                        team2: { name: 'Los Angeles Lakers', abbr: 'LAL', logo: '💜' },
                        score1: 98,
                        score2: 95,
                        status: 'LIVE - 3rd Quarter',
                        odds: {
                            spread: ['-4.5 (-110)', '+4.5 (-110)'],
                            moneyline: ['-180', '+145'],
                            total: ['O 208.5 (-110)', 'U 208.5 (-110)']
                        }
                    },
                    {
                        id: 2,
                        time: '09:00 PM EST',
                        date: 'MONDAY, JAN 12',
                        team1: { name: 'Golden State Warriors', abbr: 'GSW', logo: '🔵' },
                        team2: { name: 'Denver Nuggets', abbr: 'DEN', logo: '🟡' },
                        score1: 102,
                        score2: 108,
                        status: 'LIVE - 4th Quarter',
                        odds: {
                            spread: ['+5.5 (-110)', '-5.5 (-110)'],
                            moneyline: ['+175', '-220'],
                            total: ['O 215 (-110)', 'U 215 (-110)']
                        }
                    }
                ],
                scoreboards: [
                    { team: 'Celtics', Q1: 28, Q2: 25, Q3: 23, Q4: '...', Total: 98 },
                    { team: 'Lakers', Q1: 26, Q2: 24, Q3: 22, Q4: '...', Total: 95 }
                ]
            },
            mlb: {
                name: 'MLB',
                icon: 'fa-solid fa-baseball',
                matches: [
                    {
                        id: 1,
                        time: '01:05 PM EST',
                        date: 'MONDAY, JAN 12',
                        team1: { name: 'New York Yankees', abbr: 'NYY', logo: '🔵' },
                        team2: { name: 'Boston Red Sox', abbr: 'BOS', logo: '🔴' },
                        score1: 3,
                        score2: 2,
                        status: 'LIVE - 6th Inning',
                        odds: {
                            spread: ['-1.5 (-110)', '+1.5 (-110)'],
                            moneyline: ['-135', '+110'],
                            total: ['O 8.5 (-110)', 'U 8.5 (-110)']
                        }
                    },
                    {
                        id: 2,
                        time: '04:05 PM EST',
                        date: 'MONDAY, JAN 12',
                        team1: { name: 'Los Angeles Dodgers', abbr: 'LAD', logo: '🔵' },
                        team2: { name: 'San Francisco Giants', abbr: 'SF', logo: '🟠' },
                        score1: 5,
                        score2: 4,
                        status: 'LIVE - 7th Inning',
                        odds: {
                            spread: ['-1.5 (-110)', '+1.5 (-110)'],
                            moneyline: ['-150', '+120'],
                            total: ['O 8 (-110)', 'U 8 (-110)']
                        }
                    }
                ],
                scoreboards: [
                    { team: 'Yankees', I1: 0, I2: 1, I3: 0, I4: 1, I5: 0, I6: 1, Total: 3 },
                    { team: 'Red Sox', I1: 1, I2: 0, I3: 0, I4: 1, I5: 0, I6: 0, Total: 2 }
                ]
            },
            nhl: {
                name: 'NHL',
                icon: 'fa-solid fa-hockey-puck',
                matches: [
                    {
                        id: 1,
                        time: '07:00 PM EST',
                        date: 'MONDAY, JAN 12',
                        team1: { name: 'Toronto Maple Leafs', abbr: 'TOR', logo: '🔵' },
                        team2: { name: 'Montreal Canadiens', abbr: 'MTL', logo: '🔴' },
                        score1: 3,
                        score2: 2,
                        status: 'LIVE - 2nd Period',
                        odds: {
                            spread: ['-1.5 (-110)', '+1.5 (-110)'],
                            moneyline: ['-140', '+110'],
                            total: ['O 5.5 (-110)', 'U 5.5 (-110)']
                        }
                    },
                    {
                        id: 2,
                        time: '09:00 PM EST',
                        date: 'MONDAY, JAN 12',
                        team1: { name: 'Las Vegas Golden Knights', abbr: 'VGK', logo: '⚫' },
                        team2: { name: 'Colorado Avalanche', abbr: 'COL', logo: '🔴' },
                        score1: 4,
                        score2: 3,
                        status: 'LIVE - 3rd Period',
                        odds: {
                            spread: ['-1.5 (-110)', '+1.5 (-110)'],
                            moneyline: ['-155', '+125'],
                            total: ['O 6 (-110)', 'U 6 (-110)']
                        }
                    }
                ],
                scoreboards: [
                    { team: 'Leafs', P1: 1, P2: 1, P3: 1, Total: 3 },
                    { team: 'Canadiens', P1: 1, P2: 1, P3: 0, Total: 2 }
                ]
            },
            epl: {
                name: 'EPL (Soccer)',
                icon: 'fa-solid fa-futbol',
                matches: [
                    {
                        id: 1,
                        time: '03:00 PM GMT',
                        date: 'SATURDAY, JAN 11',
                        team1: { name: 'Liverpool', abbr: 'LIV', logo: '🔴' },
                        team2: { name: 'Manchester United', abbr: 'MUN', logo: '🔴' },
                        score1: 2,
                        score2: 1,
                        status: 'LIVE - 67 Min',
                        odds: {
                            spread: ['-0.5 (-110)', '+0.5 (-110)'],
                            moneyline: ['-145', '+110'],
                            total: ['O 2.5 (-110)', 'U 2.5 (-110)']
                        }
                    },
                    {
                        id: 2,
                        time: '05:30 PM GMT',
                        date: 'SATURDAY, JAN 11',
                        team1: { name: 'Arsenal', abbr: 'ARS', logo: '🔴' },
                        team2: { name: 'Chelsea', abbr: 'CHE', logo: '🔵' },
                        score1: 3,
                        score2: 2,
                        status: 'LIVE - 75 Min',
                        odds: {
                            spread: ['-0.5 (-110)', '+0.5 (-110)'],
                            moneyline: ['-165', '+125'],
                            total: ['O 2.5 (-110)', 'U 2.5 (-110)']
                        }
                    }
                ],
                scoreboards: [
                    { team: 'Liverpool', H: 1, A: 1, Final: 2 },
                    { team: 'Man United', H: 0, A: 1, Final: 1 }
                ]
            }
        };

        return sportDataMap[sportId] || sportDataMap.nfl;
    };

    const content = getContentData();

    return (
        <div className="sport-content-view">
            <div className="content-header">
                <div className="content-title">
                    <i className={content.icon}></i>
                    <span>{content.name} - Live Updates</span>
                </div>
                <div className="content-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
                        onClick={() => setActiveTab('matches')}
                    >
                        Matches
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'scoreboards' ? 'active' : ''}`}
                        onClick={() => setActiveTab('scoreboards')}
                    >
                        Scoreboards
                    </button>
                </div>
            </div>

            {activeTab === 'matches' && (
                <div className="matches-section">
                    {content.matches.map((match) => (
                        <div key={match.id} className="match-card">
                            <div className="match-header">
                                <div className="match-time">
                                    <span className="time">{match.time}</span>
                                    <span className="date">{match.date}</span>
                                </div>
                                <span className="match-status">{match.status}</span>
                            </div>

                            <div className="match-body">
                                <div className="team-box">
                                    {match.team1.logo && <span className="team-logo">{match.team1.logo}</span>}
                                    <div className="team-info">
                                        <span className="team-name">{match.team1.name}</span>
                                        <span className="team-abbr">{match.team1.abbr}</span>
                                    </div>
                                    <span className="score">{match.score1}</span>
                                </div>

                                <div className="vs-separator">vs</div>

                                <div className="team-box">
                                    {match.team2.logo && <span className="team-logo">{match.team2.logo}</span>}
                                    <div className="team-info">
                                        <span className="team-name">{match.team2.name}</span>
                                        <span className="team-abbr">{match.team2.abbr}</span>
                                    </div>
                                    <span className="score">{match.score2}</span>
                                </div>
                            </div>

                            {match.odds && (
                                <div className="match-odds">
                                    <div className="odds-row">
                                        <div className="odds-cell">
                                            <span className="odds-label">Spread</span>
                                            <span className="odds-value">{match.odds.spread[0]}</span>
                                            <span className="odds-value">{match.odds.spread[1]}</span>
                                        </div>
                                        <div className="odds-cell">
                                            <span className="odds-label">Moneyline</span>
                                            <span className="odds-value">{match.odds.moneyline[0]}</span>
                                            <span className="odds-value">{match.odds.moneyline[1]}</span>
                                        </div>
                                        <div className="odds-cell">
                                            <span className="odds-label">Total</span>
                                            <span className="odds-value">{match.odds.total[0]}</span>
                                            <span className="odds-value">{match.odds.total[1]}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="match-footer">
                                <button className="bet-btn">Place Bet</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'scoreboards' && (
                <div className="scoreboards-section">
                    {content.scoreboards.map((board, idx) => (
                        <div key={idx} className="scoreboard-card">
                            <div className="scoreboard-scores">
                                {Object.entries(board).map(([key, value]) => (
                                    <div key={key} className="score-cell">
                                        <span className="score-label">{key}</span>
                                        <span className="score-value">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SportContentView;
