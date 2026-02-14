import React, { useEffect, useState } from 'react';
import { getAdminMatches, createAdminMatch, updateAdminMatch } from '../../api';

function GameAdminView() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [formData, setFormData] = useState({
    homeTeam: '',
    awayTeam: '',
    sport: '',
    startTime: '',
    status: 'scheduled'
  });

  const formatMoney = (value) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return `$${num.toFixed(2)}`;
  };

  const loadGames = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to manage games.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getAdminMatches(token);
      setGames(data || []);
      setError('');
    } catch (err) {
      console.error('Failed to load games:', err);
      setError(err.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const openAddModal = () => {
    setFormData({
      homeTeam: '',
      awayTeam: '',
      sport: '',
      startTime: '',
      status: 'scheduled'
    });
    setShowAddModal(true);
  };

  const openEditModal = (game) => {
    setSelectedGame(game);
    setFormData({
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      sport: game.sport,
      startTime: new Date(game.startTime).toISOString().slice(0, 16),
      status: game.status
    });
    setShowEditModal(true);
  };

  const openViewModal = (game) => {
    setSelectedGame(game);
    setShowViewModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to add games.');
      return;
    }

    try {
      const payload = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString()
      };
      const created = await createAdminMatch(payload, token);
      setGames(prev => [...prev, {
        id: created._id || created.id,
        homeTeam: created.homeTeam,
        awayTeam: created.awayTeam,
        sport: created.sport,
        startTime: created.startTime,
        status: created.status,
        activeBets: 0,
        revenue: 0
      }]);
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || 'Failed to create match');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to update games.');
      return;
    }

    try {
      const payload = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString()
      };
      const updated = await updateAdminMatch(selectedGame.id || selectedGame._id, payload, token);
      setGames(prev => prev.map(game => {
        const gameId = game.id || game._id;
        if (gameId === (selectedGame.id || selectedGame._id)) {
          return {
            ...game,
            homeTeam: updated.homeTeam,
            awayTeam: updated.awayTeam,
            sport: updated.sport,
            startTime: updated.startTime,
            status: updated.status
          };
        }
        return game;
      }));
      setShowEditModal(false);
    } catch (err) {
      setError(err.message || 'Failed to update match');
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Game Administration</h2>
        <button className="btn-primary" onClick={openAddModal}>Add New Game</button>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading games...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Sport</th>
                <th>Start Time</th>
                <th>Status</th>
                <th>Active Bets</th>
                <th>Revenue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {games.map(game => (
                <tr key={game.id || game._id}>
                  <td>{game.homeTeam} vs {game.awayTeam}</td>
                  <td>{game.sport}</td>
                  <td>{new Date(game.startTime).toLocaleString()}</td>
                  <td><span className={`badge ${game.status}`}>{game.status}</span></td>
                  <td>{game.activeBets}</td>
                  <td>{formatMoney(game.revenue)}</td>
                  <td>
                    <button className="btn-small" onClick={() => openEditModal(game)}>Edit</button>
                    <button className="btn-small" onClick={() => openViewModal(game)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Game</h3>
            <form onSubmit={handleCreate} className="admin-form">
              <div className="form-group">
                <label>Home Team</label>
                <input name="homeTeam" value={formData.homeTeam} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Away Team</label>
                <input name="awayTeam" value={formData.awayTeam} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Sport</label>
                <input name="sport" value={formData.sport} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Start Time</label>
                <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="scheduled">scheduled</option>
                  <option value="live">live</option>
                  <option value="finished">finished</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Create</button>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedGame && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Game</h3>
            <form onSubmit={handleUpdate} className="admin-form">
              <div className="form-group">
                <label>Home Team</label>
                <input name="homeTeam" value={formData.homeTeam} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Away Team</label>
                <input name="awayTeam" value={formData.awayTeam} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Sport</label>
                <input name="sport" value={formData.sport} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Start Time</label>
                <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="scheduled">scheduled</option>
                  <option value="live">live</option>
                  <option value="finished">finished</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedGame && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Game Details</h3>
            <div className="view-details">
              <p><strong>Match:</strong> {selectedGame.homeTeam} vs {selectedGame.awayTeam}</p>
              <p><strong>Sport:</strong> {selectedGame.sport}</p>
              <p><strong>Start Time:</strong> {new Date(selectedGame.startTime).toLocaleString()}</p>
              <p><strong>Status:</strong> {selectedGame.status}</p>
              <p><strong>Active Bets:</strong> {selectedGame.activeBets}</p>
              <p><strong>Revenue:</strong> {formatMoney(selectedGame.revenue)}</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameAdminView;
