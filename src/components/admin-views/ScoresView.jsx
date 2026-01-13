import React, { useState } from 'react';

function ScoresView() {
  const [sportFilter, setSportFilter] = useState('all');
  
  const featuredMatches = [
    {
      id: 1,
      sport: 'Soccer',
      title: 'FEATURED MATCHES',
      category: 'Featured Match',
      matches: [
        { id: 11, teams: 'Newcastle vs Man City', time: '01:00', odds: { '1': 2.55, 'X': 3.50, '2': 2.50 }, boost: 'BET BOOST ➤' },
        { id: 12, teams: 'Borussia Dortmund vs Werder Bremen', time: '00:30', odds: { '1': 1.40, 'X': 5.00, '2': 7.50 }, boost: 'BET BOOST ➤' },
        { id: 13, teams: 'Roma vs Torino', time: '01:00', odds: { '1': 1.61, 'X': 3.75, '2': 5.50 }, boost: null },
      ]
    },
    {
      id: 2,
      sport: 'NBA',
      title: 'FEATURED PROPS',
      category: 'Props & Specials',
      matches: [
        { id: 21, teams: 'PHX Suns vs MIA Heat', time: '05:40', odds: { 'Spread': 1.90, 'Total': 1.90, 'ML': 1.95 }, boost: '+15% ACCA BOOST' },
        { id: 22, teams: 'MIN Timberwolves vs MIL Bucks', time: '06:10', odds: { 'Spread': 1.90, 'Total': 1.90, 'ML': 2.25 }, boost: null },
        { id: 23, teams: 'SA Spurs vs OKC Thunder', time: '06:10', odds: { 'Spread': 1.90, 'Total': 1.90, 'ML': 3.50 }, boost: null },
      ]
    },
    {
      id: 3,
      sport: 'Tennis',
      title: 'ATP/WTA MATCHES',
      category: 'Tennis Props',
      matches: [
        { id: 31, teams: 'Marcos Giron vs Alex Michelsen', time: '03:30', odds: { '1': 2.00, '2': 1.80 }, boost: '+20% ACCA BOOST' },
        { id: 32, teams: 'Ben Shelton vs Francisco Comesana', time: '03:30', odds: { '1': 1.25, '2': 4.00 }, boost: null },
        { id: 33, teams: 'Jenson Brooksby vs Sebastian Baez', time: '05:00', odds: { '1': 1.57, '2': 2.37 }, boost: null },
      ]
    }
  ];

  const allMatches = featuredMatches.flatMap(category => 
    category.matches.map(m => ({ ...m, sport: category.sport }))
  );

  const filteredMatches = sportFilter === 'all' 
    ? allMatches 
    : allMatches.filter(m => m.sport.toLowerCase() === sportFilter.toLowerCase());

  const getMatchStatus = (match) => {
    const hour = parseInt(match.time.split(':')[0]);
    if (hour < 1) return 'LIVE';
    if (hour < 6) return 'UPCOMING';
    return 'SCHEDULED';
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Featured Matches & Scores</h2>
        <div className="sport-filter">
          <button 
            className={sportFilter === 'all' ? 'active' : ''}
            onClick={() => setSportFilter('all')}
          >
            All Sports
          </button>
          <button 
            className={sportFilter === 'soccer' ? 'active' : ''}
            onClick={() => setSportFilter('soccer')}
          >
            ⚽ Soccer
          </button>
          <button 
            className={sportFilter === 'nba' ? 'active' : ''}
            onClick={() => setSportFilter('nba')}
          >
            🏀 NBA
          </button>
          <button 
            className={sportFilter === 'tennis' ? 'active' : ''}
            onClick={() => setSportFilter('tennis')}
          >
            🎾 Tennis
          </button>
        </div>
      </div>
      <div className="view-content">
        {/* Featured Match Cards */}
        {sportFilter === 'all' ? (
          <>
            {featuredMatches.map(category => (
              <div key={category.id} className="featured-section">
                <h3 className="section-title">{category.title}</h3>
                <div className="featured-matches-grid">
                  {category.matches.map(match => (
                    <div key={match.id} className="featured-card">
                      <div className="card-header">
                        <span className="boost-badge">{match.boost || 'FEATURED'}</span>
                      </div>
                      <div className="card-content">
                        <h4>{match.teams}</h4>
                        <div className="match-meta">
                          <span className="time">{match.time}</span>
                          <span className={`status ${getMatchStatus(match)}`}>{getMatchStatus(match)}</span>
                        </div>
                      </div>
                      <div className="card-odds">
                        {Object.entries(match.odds).map(([key, value]) => (
                          <div key={key} className="odd-item">
                            <span className="odd-label">{key}</span>
                            <span className="odd-value">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="filtered-matches-section">
            <div className="table-container scrollable">
              <table className="data-table live-matches-table">
                <thead>
                  <tr>
                    <th>Match</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th colSpan="3">Odds</th>
                    <th>Boost</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map(match => (
                    <tr key={match.id}>
                      <td><strong>{match.teams}</strong></td>
                      <td>{match.time}</td>
                      <td><span className={`badge ${getMatchStatus(match)}`}>{getMatchStatus(match)}</span></td>
                      {Object.entries(match.odds).map(([key, value]) => (
                        <td key={key} className="odds-td"><span className="odds-yellow">{value}</span></td>
                      ))}
                      <td>{match.boost ? <span className="boost-text">{match.boost}</span> : '-'}</td>
                      <td>
                        <button className="btn-small">Update</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScoresView;
