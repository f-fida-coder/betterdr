import React from 'react';




const BettingGrid = () => {
    const [matches, setMatches] = React.useState([]);

    React.useEffect(() => {
        const fetchMatches = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/matches');
                const data = await response.json();

                // Map backend data to frontend structure
                const formattedMatches = data.map(match => {
                    const lineKey = match.odds ? Object.keys(match.odds)[0] : null;
                    const lines = lineKey ? match.odds[lineKey] : {};
                    const startTime = new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return {
                        id: match.id,
                        team1: match.homeTeam,
                        team2: match.awayTeam,
                        score1: match.score?.score_home || 0,
                        score2: match.score?.score_away || 0,
                        time: startTime, // Add time field for JSX
                        status: match.status === 'live' ? (match.score?.period ? `Q${match.score.period}` : 'LIVE') : 'PRE-GAME',
                        isLive: match.status === 'live',
                        spread: {
                            label: lines.spread?.point || '-',
                            val1: lines.spread?.home || '-',
                            val2: lines.spread?.away || '-'
                        },
                        money: {
                            val1: lines.moneyline?.home || '-',
                            val2: lines.moneyline?.away || '-'
                        },
                        total: {
                            label: lines.total?.total || '-',
                            val1: lines.total?.over || '-',
                            val2: lines.total?.under || '-'
                        }
                    };
                });

                setMatches(formattedMatches);
            } catch (error) {
                console.error('Error fetching matches:', error);
            }
        };

        fetchMatches();

        // Optional: Set up polling
        const interval = setInterval(fetchMatches, 60000);
        return () => clearInterval(interval);
    }, []);
    return (
        <div className="betting-grid">
            {matches.map(match => (
                <div key={match.id} className="bet-card glass-panel">
                    <div className="match-status">
                        {match.isLive ? (
                            <span className="live">LIVE</span>
                        ) : (
                            <span>{match.time}</span>
                        )}
                        <span>{match.status || 'PRE-GAME'}</span>
                    </div>

                    <div className="teams-display">
                        <div className="team">
                            <h3>{match.team1}</h3>
                        </div>
                        <div className="score">
                            {match.isLive ? (
                                <span>{match.score1} - {match.score2}</span>
                            ) : (
                                <span className="vs">VS</span>
                            )}
                        </div>
                        <div className="team">
                            <h3>{match.team2}</h3>
                        </div>
                    </div>

                    <div className="odds-row">
                        <div className="odds-btn">
                            <span className="label">SPREAD {match.spread.label}</span>
                            <span className="value">{match.spread.val1}</span>
                        </div>
                        <div className="odds-btn">
                            <span className="label">MONEYLINE</span>
                            <span className="value">{match.money.val1}</span>
                        </div>
                        <div className="odds-btn">
                            <span className="label">TOTAL {match.total.label}</span>
                            <span className="value">O {match.total.val1}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BettingGrid;
