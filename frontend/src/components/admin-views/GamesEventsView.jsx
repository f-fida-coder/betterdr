import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createAdminMatch, getAdminMatches, refreshOdds, clearCache, settleMatchBets } from '../../api';

function GamesEventsView() {
  const [periodFilter, setPeriodFilter] = useState('game');
  const [gamesFilter, setGamesFilter] = useState('all');
  const [selectedSports, setSelectedSports] = useState([]);
  const [showNoEventsModal, setShowNoEventsModal] = useState(false);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMatch, setNewMatch] = useState({
    homeTeam: '',
    awayTeam: '',
    startTime: '',
    sport: 'basketball',
    status: 'scheduled'
  });
  const MIN_LOADING_MS = 600;

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

  const loadMatches = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to load games.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getAdminMatches(token);
      setMatches(data || []);
      setError('');
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError(err.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const filterByTime = (match) => {
    if (!match?.startTime) return gamesFilter === 'all';
    if (gamesFilter === 'all') return true;
    const date = new Date(match.startTime);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfTomorrow = new Date(startOfTomorrow.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (gamesFilter === 'today') return date >= startOfToday && date < startOfTomorrow;
    if (gamesFilter === 'tomorrow') return date >= startOfTomorrow && date < endOfTomorrow;
    if (gamesFilter === 'this-week') return date >= startOfToday && date < endOfWeek;
    return true;
  };

  const filterByPeriod = (match) => {
    if (periodFilter === 'game') return true;
    return match?.status === periodFilter;
  };

  const filterBySport = (match) => {
    if (!selectedSports.length) return true;
    const normalized = String(match?.sport || '').toLowerCase();
    return selectedSports.includes(normalized);
  };

  const filteredMatches = matches
    .filter(filterByTime)
    .filter(filterByPeriod)
    .filter(filterBySport);

  useEffect(() => {
    if (!loading && filteredMatches.length === 0) {
      setShowNoEventsModal(true);
    }
  }, [loading, filteredMatches.length]);

  const handleAddGame = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to add games.');
      return;
    }
    try {
      setActionLoading('add');
      await createAdminMatch({
        homeTeam: newMatch.homeTeam.trim(),
        awayTeam: newMatch.awayTeam.trim(),
        startTime: newMatch.startTime,
        sport: newMatch.sport,
        status: newMatch.status
      }, token);
      setNewMatch({ homeTeam: '', awayTeam: '', startTime: '', sport: 'basketball', status: 'scheduled' });
      setShowAddModal(false);
      loadMatches();
    } catch (err) {
      setError(err.message || 'Failed to add game');
    } finally {
      setActionLoading('');
    }
  };

  const handleRefreshOdds = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to update odds.');
      return;
    }
    try {
      const startedAt = Date.now();
      setActionLoading('odds');
      await refreshOdds(token);
      loadMatches();
    } catch (err) {
      setError(err.message || 'Failed to update odds');
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS - elapsed));
      }
      setActionLoading('');
    }
  };

  const handleClearCache = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to clear cache.');
      return;
    }
    try {
      setActionLoading('cache');
      await clearCache(token);
    } catch (err) {
      setError(err.message || 'Failed to clear cache');
    } finally {
      setActionLoading('');
    }
  };

  const handleSettleMatch = async (match) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to settle matches.');
      return;
    }

    const winnerChoice = window.prompt(
      `Set winner for ${match.homeTeam} vs ${match.awayTeam}. Type "home" or "away":`,
      'home'
    );
    if (!winnerChoice) return;

    const normalized = winnerChoice.trim().toLowerCase();
    if (normalized !== 'home' && normalized !== 'away') {
      setError('Winner must be "home" or "away".');
      return;
    }

    const winner = normalized === 'home' ? match.homeTeam : match.awayTeam;

    try {
      setActionLoading(`settle-${match.id || match._id}`);
      await settleMatchBets({ matchId: match.id || match._id, winner }, token);
      await loadMatches();
      setError('');
      alert('Match settled successfully.');
    } catch (err) {
      setError(err.message || 'Failed to settle match');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Games & Events Management</h2>
      </div>

      {actionLoading === 'odds' && createPortal(
        <div className="admin-loading-overlay">
          <div className="admin-loading-card">
            <div className="admin-spinner" />
            <div>Refreshing odds & scores...</div>
          </div>
        </div>,
        document.body
      )}

      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading games...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map(match => (
                  <tr key={match.id || match._id}>
                    <td>{match.status || 'scheduled'}</td>
                    <td>{match.homeTeam} vs {match.awayTeam}</td>
                    <td>{match.startTime ? new Date(match.startTime).toLocaleString() : '—'}</td>
                    <td>{match.sport || '—'}</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>
                      <button
                        className="btn-small"
                        onClick={() => handleSettleMatch(match)}
                        disabled={actionLoading === `settle-${match.id || match._id}`}
                      >
                        {actionLoading === `settle-${match.id || match._id}` ? 'Settling...' : 'Settle'}
                      </button>
                    </td>
                  </tr>
                ))}
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
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>Add Game</button>
          <button className="btn-secondary" onClick={handleRefreshOdds} disabled={actionLoading === 'odds'}>
            {actionLoading === 'odds' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="admin-inline-spinner" /> Working...
              </span>
            ) : 'Import Games'}
          </button>
          <button className="btn-secondary" onClick={handleRefreshOdds} disabled={actionLoading === 'odds'}>
            {actionLoading === 'odds' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="admin-inline-spinner" /> Working...
              </span>
            ) : 'Update Odds'}
          </button>
          <button className="btn-danger" onClick={handleClearCache} disabled={actionLoading === 'cache'}>
            {actionLoading === 'cache' ? 'Working...' : 'Clear Cache'}
          </button>
        </div>
        </>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Game</h3>
            <div className="view-details">
              <div className="filter-group">
                <label>Home Team</label>
                <input
                  type="text"
                  value={newMatch.homeTeam}
                  onChange={(e) => setNewMatch(prev => ({ ...prev, homeTeam: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Away Team</label>
                <input
                  type="text"
                  value={newMatch.awayTeam}
                  onChange={(e) => setNewMatch(prev => ({ ...prev, awayTeam: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Start Time</label>
                <input
                  type="datetime-local"
                  value={newMatch.startTime}
                  onChange={(e) => setNewMatch(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Sport</label>
                <select value={newMatch.sport} onChange={(e) => setNewMatch(prev => ({ ...prev, sport: e.target.value }))}>
                  <option value="basketball">Basketball</option>
                  <option value="football">Football</option>
                  <option value="baseball">Baseball</option>
                  <option value="hockey">Hockey</option>
                  <option value="soccer">Soccer</option>
                  <option value="tennis">Tennis</option>
                  <option value="golf">Golf</option>
                  <option value="boxing">Boxing</option>
                  <option value="esports">Esports</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select value={newMatch.status} onChange={(e) => setNewMatch(prev => ({ ...prev, status: e.target.value }))}>
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="finished">Finished</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleAddGame}
                disabled={actionLoading === 'add' || !newMatch.homeTeam.trim() || !newMatch.awayTeam.trim() || !newMatch.startTime}
              >
                {actionLoading === 'add' ? 'Saving...' : 'Add Game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GamesEventsView;
