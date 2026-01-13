import React from 'react';

const leagues = [
    { id: 'all', name: 'ALL', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Olympic_rings_without_rims.svg' },
    { id: 'nba', name: 'NBA', icon: 'https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg' },
    { id: 'nfl', name: 'NFL', icon: 'https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg' },
    { id: 'mlb', name: 'MLB', icon: '/mlb.svg' },     { id: 'nhl', name: 'NHL', icon: 'https://upload.wikimedia.org/wikipedia/en/3/3a/05_NHL_Shield.svg' },
    { id: 'soccer', name: 'SOCCER', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/FIFA_logo_without_slogan.svg' },
    { id: 'boxing', name: 'UFC', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/UFC_logo.svg' },
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
