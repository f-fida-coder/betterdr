import React, { useState } from 'react';

function GamesEventsView() {
  const [periodFilter, setPeriodFilter] = useState('game');
  const [gamesFilter, setGamesFilter] = useState('all');
  const [selectedSports, setSelectedSports] = useState([]);
  const [showNoEventsModal, setShowNoEventsModal] = useState(true);

  const sportsIcons = [
    { id: 'nfl', label: 'NFL', icon: '🏈' },
    { id: 'nba', label: 'NBA', icon: '🏀' },
    { id: 'mlb', label: 'MLB', icon: '⚾' },
    { id: 'nhl', label: 'NHL', icon: '🏒' },
    { id: 'soccer', label: 'Soccer', icon: '⚽' },
    { id: 'tennis', label: 'Tennis', icon: '🎾' },
    { id: 'golf', label: 'Golf', icon: '⛳' },
    { id: 'boxing', label: 'Boxing', icon: '🥊' },
    { id: 'esports', label: 'Esports', icon: '🎮' },
    { id: 'props', label: 'Props', icon: '📊' },
    { id: 'futures', label: 'Futures', icon: '📈' },
    { id: 'contests', label: 'Contests', icon: '🏆' },
  ];

  const toggleSport = (sportId) => {
    setSelectedSports(prev =>
      prev.includes(sportId)
        ? prev.filter(id => id !== sportId)
        : [...prev, sportId]
    );
  };

  const eventColumns = [
    { header: 'Period', key: 'period' },
    { header: 'Game', key: 'game' },
    { header: 'Time', key: 'time' },
    { header: 'Event', key: 'event' },
    { header: 'Spread', key: 'spread' },
    { header: 'Moneyline', key: 'moneyline' },
    { header: 'Total', key: 'total' },
    { header: 'Team Total', key: 'teamTotal' },
    { header: 'OS', key: 'os' },
    { header: 'US', key: 'us' },
  ];

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Games & Events Management</h2>
      </div>

      <div className="view-content">
        {/* Top Controls */}
        <div className="games-controls">
          <div className="control-group">
            <label>Period:</label>
            <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
              <option value="game">Game</option>
              <option value="live">Live</option>
              <option value="finished">Finished</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          <div className="control-group">
            <label>Games to show:</label>
            <select value={gamesFilter} onChange={(e) => setGamesFilter(e.target.value)}>
              <option value="all">All Games</option>
              <option value="today">Today Only</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="this-week">This Week</option>
            </select>
          </div>
        </div>

        {/* Sports Icons */}
        <div className="sports-icons-container">
          {sportsIcons.map(sport => (
            <button
              key={sport.id}
              className={`sport-icon-btn ${selectedSports.includes(sport.id) ? 'active' : ''}`}
              onClick={() => toggleSport(sport.id)}
              title={sport.label}
            >
              <span className="icon">{sport.icon}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
          ))}
        </div>

        {/* Games Table - Hidden when no events */}
        {!showNoEventsModal && (
          <div className="table-container scrollable">
            <table className="data-table events-table">
              <thead>
                <tr>
                  {eventColumns.map(col => (
                    <th key={col.key}>{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Empty state - no games for this period */}
              </tbody>
            </table>
          </div>
        )}

        {/* No Events Modal */}
        {showNoEventsModal && (
          <div className="modal-overlay">
            <div className="modal-content no-events-modal">
              <button
                className="modal-close"
                onClick={() => setShowNoEventsModal(false)}
              >
                ×
              </button>
              <h3>Today there aren't any event's</h3>
              <p>There are no games for today, would you like to view the Full Board?</p>
              <div className="modal-buttons">
                <button
                  className="btn-success"
                  onClick={() => {
                    setShowNoEventsModal(false);
                    setGamesFilter('all');
                  }}
                >
                  Yes
                </button>
                <button
                  className="btn-danger"
                  onClick={() => setShowNoEventsModal(false)}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Status Legend */}
        <div className="game-status-legend">
          <h4>Status Legend:</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="status-badge live">Live</span>
              <span>Game is currently in progress</span>
            </div>
            <div className="legend-item">
              <span className="status-badge scheduled">Scheduled</span>
              <span>Game is scheduled for future date</span>
            </div>
            <div className="legend-item">
              <span className="status-badge finished">Finished</span>
              <span>Game has ended</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h4>Quick Actions:</h4>
          <button className="btn-primary">Add Game</button>
          <button className="btn-secondary">Import Games</button>
          <button className="btn-secondary">Update Odds</button>
          <button className="btn-danger">Clear Cache</button>
        </div>
      </div>
    </div>
  );
}

export default GamesEventsView;
