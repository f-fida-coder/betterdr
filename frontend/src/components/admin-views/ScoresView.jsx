import React, { useEffect, useState } from 'react';
import { getAdminMatches, updateAdminMatch } from '../../api';

function ScoresView() {
  const [sportFilter, setSportFilter] = useState('all');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ scoreHome: '', scoreAway: '', status: 'scheduled' });
  const [actionLoading, setActionLoading] = useState(false);

  const loadMatches = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to view scores.');
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

  const filteredMatches = sportFilter === 'all'
    ? matches
    : matches.filter(m => String(m.sport || '').toLowerCase() === sportFilter.toLowerCase());

  const openUpdateModal = (match) => {
    const scoreHome = match.score?.score_home ?? match.score?.scoreHome ?? '';
    const scoreAway = match.score?.score_away ?? match.score?.scoreAway ?? '';
    setSelectedMatch(match);
    setUpdateForm({
      scoreHome: scoreHome === 0 ? 0 : scoreHome,
      scoreAway: scoreAway === 0 ? 0 : scoreAway,
      status: match.status || 'scheduled'
    });
    setShowUpdateModal(true);
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to update scores.');
      return;
    }
    try {
      setActionLoading(true);
      await updateAdminMatch(selectedMatch.id || selectedMatch._id, {
        status: updateForm.status,
        score: {
          scoreHome: Number(updateForm.scoreHome) || 0,
          scoreAway: Number(updateForm.scoreAway) || 0
        },
        lastUpdated: new Date()
      }, token);
      setShowUpdateModal(false);
      loadMatches();
    } catch (err) {
      setError(err.message || 'Failed to update score');
    } finally {
      setActionLoading(false);
    }
  };

  const getMatchStatus = (match) => match.status || 'scheduled';

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
            className={sportFilter === 'basketball' ? 'active' : ''}
            onClick={() => setSportFilter('basketball')}
          >
            🏀 NBA
          </button>
          <button 
            className={sportFilter === 'tennis' ? 'active' : ''}
            onClick={() => setSportFilter('tennis')}
          >
            🎾 Tennis
          </button>
          <button 
            className={sportFilter === 'football' ? 'active' : ''}
            onClick={() => setSportFilter('football')}
          >
            🏈 Football
          </button>
        </div>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading scores...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <div className="filtered-matches-section">
          <div className="table-container scrollable">
            <table className="data-table live-matches-table">
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Odds</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map(match => (
                  <tr key={match.id || match._id}>
                    <td><strong>{match.homeTeam} vs {match.awayTeam}</strong></td>
                    <td>{match.startTime ? new Date(match.startTime).toLocaleString() : '—'}</td>
                    <td><span className={`badge ${getMatchStatus(match)}`}>{getMatchStatus(match)}</span></td>
                    <td>
                      {(match.score?.score_home ?? match.score?.scoreHome ?? 0)}
                      {' - '}
                      {(match.score?.score_away ?? match.score?.scoreAway ?? 0)}
                    </td>
                    <td>{match.odds ? JSON.stringify(match.odds) : '—'}</td>
                    <td>
                      <button className="btn-small" onClick={() => openUpdateModal(match)}>Update</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      {showUpdateModal && selectedMatch && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Update Score</h3>
            <div className="view-details">
              <div className="filter-group">
                <label>Home Score</label>
                <input
                  type="number"
                  value={updateForm.scoreHome}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, scoreHome: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Away Score</label>
                <input
                  type="number"
                  value={updateForm.scoreAway}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, scoreAway: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select value={updateForm.status} onChange={(e) => setUpdateForm(prev => ({ ...prev, status: e.target.value }))}>
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="finished">Finished</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowUpdateModal(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleUpdate} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoresView;
