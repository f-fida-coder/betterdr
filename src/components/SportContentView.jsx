import React, { useState } from 'react';
import { placeBet } from '../api';
import useMatches from '../hooks/useMatches';

const SportContentView = ({ sportId, selectedItems = [] }) => {
    const [activeTab, setActiveTab] = useState('matches');

    const [content, setContent] = useState({ name: '', icon: '', matches: [], scoreboards: [] });
    const rawMatches = useMatches({ status: 'live-upcoming' });

    React.useEffect(() => {
        // Determine sport name and icon
        const sportMap = {
            nfl: { name: 'NFL', icon: 'fa-solid fa-football' },
            nba: { name: 'NBA', icon: 'fa-solid fa-basketball' },
            mlb: { name: 'MLB', icon: 'fa-solid fa-baseball' },
            nhl: { name: 'NHL', icon: 'fa-solid fa-hockey-puck' },
            epl: { name: 'EPL (Soccer)', icon: 'fa-solid fa-futbol' },
            boxing: { name: 'Boxing', icon: 'fa-solid fa-hand-fist' },
            mma: { name: 'MMA/UFC', icon: 'fa-solid fa-hand-fist' },
            ncaaf: { name: 'NCAA Football', icon: 'fa-solid fa-building-columns' },
            ncaab: { name: 'NCAA Basketball', icon: 'fa-solid fa-basketball' }
        };

        // Handle sub-categories (nfl-1st-quarter -> nfl)
        let resolvedSportId = sportId;
        let periodFilter = null;

        if (sportId) {
            if (sportId.startsWith('nfl-')) {
                resolvedSportId = 'nfl';
                if (sportId.includes('1st-quarter')) periodFilter = 'Q1';
                if (sportId.includes('2nd-quarter')) periodFilter = 'Q2';
                if (sportId.includes('1st-half')) periodFilter = 'H1';
            } else if (sportId.startsWith('ncaa-')) {
                resolvedSportId = 'ncaaf';
            }
        }

        const sportInfo = sportMap[resolvedSportId] || { name: 'Sports', icon: 'fa-solid fa-trophy' };

        // Map rawMatches into view-friendly structure and filter by sportId where possible
        const processMatches = () => {
            const matchesData = (rawMatches || []);

            const filteredMatches = matchesData.filter(m => {
                if (!resolvedSportId) return true;
                if (!m.sport) return true;
                // Flexible matching: 'americanfootball_nfl' contains 'nfl'
                return m.sport.toLowerCase().includes(resolvedSportId.toLowerCase()) || resolvedSportId.toLowerCase().includes(m.sport?.toLowerCase());
            }).map(match => {
                const lineKey = match.odds ? Object.keys(match.odds)[0] : null;
                const lines = lineKey ? match.odds[lineKey] : {};

                const spreadPoint = lines.spread?.point;
                const spreadHome = lines.spread?.home;
                const spreadAway = lines.spread?.away;

                // Determine score to show based on period filter
                let displayScore1 = match.score?.score_home ?? 0;
                let displayScore2 = match.score?.score_away ?? 0;

                return {
                    id: match.id || match._id || match.externalId,
                    time: match.startTime ? new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    date: match.startTime ? new Date(match.startTime).toLocaleDateString() : '',
                    team1: { name: match.homeTeam || match.home_team || '', abbr: (match.homeTeam || match.home_team || '').substring(0, 3).toUpperCase(), logo: '🔵' },
                    team2: { name: match.awayTeam || match.away_team || '', abbr: (match.awayTeam || match.away_team || '').substring(0, 3).toUpperCase(), logo: '🔴' },
                    score1: displayScore1,
                    score2: displayScore2,
                    period: match.score?.period, // e.g. 'Q1', '2nd Half'
                    status: match.status === 'live' || (match.score && (String(match.score.event_status || '').toUpperCase().includes('IN_PROGRESS') || String(match.score.event_status || '').toUpperCase().includes('LIVE'))) ? 'LIVE' : (match.status || 'Scheduled'),
                    odds: {
                        spread: [
                            `${spreadPoint || '-'} (${spreadHome || '-'})`,
                            `${spreadPoint ? -spreadPoint : '-'} (${spreadAway || '-'})`
                        ],
                        moneyline: [
                            `${lines.moneyline?.home || '-'}`,
                            `${lines.moneyline?.away || '-'}`
                        ],
                        total: [
                            `O ${lines.total?.total || '-'} (${lines.total?.over || '-'})`,
                            `U ${lines.total?.total || '-'} (${lines.total?.under || '-'})`
                        ]
                    },
                    rawMatch: match // Keep raw for betting
                };
            });

            setContent({
                ...sportInfo,
                matches: filteredMatches,
                scoreboards: []
            });
        };

        processMatches();

        // Auto-refresh every 5 seconds locally (re-process raw matches if they change)
        const interval = setInterval(processMatches, 5000);
        return () => clearInterval(interval);

    }, [sportId, rawMatches]);

    const handlePlaceBet = async (matchId, team, type, odds) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login to place a bet');
            return;
        }
        const amount = prompt("Enter bet amount:");
        if (!amount) return;

        try {
            await placeBet({
                matchId,
                selection: team, // 'home' or 'away' or team name
                odds: parseFloat(odds), // Simplified
                amount: parseFloat(amount),
                type: 'straight'
            }, token);
            alert('Bet Placed Successfully!');
        } catch (e) {
            alert(`Bet Failed: ${e.message}`);
        }
    };

    return (
        <div className="sport-content-view">
            <div className="content-header">
                <div className="content-title">
                    <i className={content.icon}></i>
                    <span>{content.name} - Live & Upcoming</span>
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
                    {content.matches.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: '8px' }}>
                            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                            <h3>No Live or Upcoming Matches Found</h3>
                            <p>There are no {content.name} matches available right now.</p>
                            <p style={{ fontSize: '0.9em' }}>Check back later for new updates.</p>
                        </div>
                    ) : (
                        content.matches.map((match) => (
                            <div key={match.id} className="match-card">
                                <div className="match-header">
                                    <div className="match-time">
                                        <span className="time">{match.time}</span>
                                        <span className="date">{match.date}</span>
                                    </div>
                                    <span className={`match-status ${match.status === 'LIVE' ? 'live' : ''}`}>{match.status}</span>
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

                                {match.odds && match.odds.spread[0] !== '-' && (
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
                                    <button
                                        className="bet-btn"
                                        onClick={() => handlePlaceBet(match.id, match.team1.name, 'straight', 1.90)} // Dummy odds for button click
                                    >Place Bet</button>
                                </div>
                            </div>
                        ))
                    )}
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
