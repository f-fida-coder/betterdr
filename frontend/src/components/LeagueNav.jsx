import React from 'react';

const leagues = [
    { id: 'all', name: 'ALL', icon: '/all.svg' },
    { id: 'nba', name: 'NBA', icon: '/nba.svg' },
    { id: 'nfl', name: 'NFL', icon: '/nfl.svg' },
    { id: 'mlb', name: 'MLB', icon: '/mlb.svg' },
    { id: 'nhl', name: 'NHL', icon: '/nhl.svg' },
    { id: 'soccer', name: 'SOCCER', icon: '/soccer.svg' },
    { id: 'boxing', name: 'UFC', icon: '/ufc.svg' },
];

const LeagueNav = ({ activeLeague, onSelectLeague }) => {
    return (
        <nav className="league-nav">
            <div className="nav-container">
                <div className="league-icons">
                    {leagues.map((league) => (
                        <div
                            key={league.id}
                            className={`league-item ${activeLeague === league.id ? 'active' : ''}`}
                            onClick={() => onSelectLeague(league.id)}
                        >
                            <img src={league.icon} alt={league.name} />
                            <span>{league.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default LeagueNav;
