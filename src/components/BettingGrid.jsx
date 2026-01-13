import React from 'react';

const matches = [
    {
        id: 1,
        team1: 'L.A. LAKERS',
        team2: 'G.S. WARRIORS',
        score1: 112,
        score2: 108,
        status: 'Q4 2:30',
        isLive: true,
        spread: { label: '-5.5', val1: '-110', val2: '-110' },
        money: { val1: '-220', val2: '+180' },
        total: { label: '228.5', val1: '-110', val2: '-110' }
    },
    {
        id: 2,
        team1: 'BOSTON CELTICS',
        team2: 'MIAMI HEAT',
        score1: 98,
        score2: 95,
        status: 'Q3 8:15',
        isLive: true,
        spread: { label: '-3.5', val1: '-105', val2: '-115' },
        money: { val1: '-160', val2: '+140' },
        total: { label: '215.5', val1: '-110', val2: '-110' }
    },
    {
        id: 3,
        team1: 'DALLAS MAVERICKS',
        team2: 'PHOENIX SUNS',
        time: 'Today 8:00 PM',
        isLive: false,
        spread: { label: '-2.5', val1: '-110', val2: '-110' },
        money: { val1: '-135', val2: '+115' },
        total: { label: '224.5', val1: '-110', val2: '-110' }
    },
    {
        id: 4,
        team1: 'DENVER NUGGETS',
        team2: 'L.A. CLIPPERS',
        time: 'Today 10:30 PM',
        isLive: false,
        spread: { label: '-4.0', val1: '-110', val2: '-110' },
        money: { val1: '-175', val2: '+150' },
        total: { label: '220.0', val1: '-110', val2: '-110' }
    }
];

const BettingGrid = () => {
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
