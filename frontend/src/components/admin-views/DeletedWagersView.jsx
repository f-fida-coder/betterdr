import React, { useEffect, useState } from 'react';
import { getDeletedWagers, restoreDeletedWager } from '../../api';

function DeletedWagersView() {
  const [wagers, setWagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ user: '', sport: 'all', status: 'all', time: '30d' });
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedWager, setSelectedWager] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const loadWagers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to view deleted wagers.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getDeletedWagers(filters, token);
      setWagers(data.wagers || []);
      setError('');
    } catch (err) {
      console.error('Failed to load deleted wagers:', err);
      setError(err.message || 'Failed to load deleted wagers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWagers();
  }, [filters]);

  const handleRestore = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to restore wagers.');
      return;
    }
    try {
      setActionLoadingId(id);
      await restoreDeletedWager(id, token);
      setWagers(prev => prev.map(w => (w.id === id ? { ...w, status: 'restored', restoredAt: new Date().toISOString() } : w)));
    } catch (err) {
      setError(err.message || 'Failed to restore wager');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openViewModal = (wager) => {
    setSelectedWager(wager);
    setShowViewModal(true);
  };

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '—';
    const num = Number(amount);
    if (Number.isNaN(num)) return '—';
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Deleted Wagers</h2>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading deleted wagers...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <>
        <div className="filter-section">
          <div className="filter-group">
            <label>User</label>
            <input
              type="text"
              value={filters.user}
              onChange={(e) => setFilters(prev => ({ ...prev, user: e.target.value }))}
              placeholder="Search user"
            />
          </div>
          <div className="filter-group">
            <label>Sport</label>
            <select value={filters.sport} onChange={(e) => setFilters(prev => ({ ...prev, sport: e.target.value }))}>
              <option value="all">All</option>
              <option value="NBA">NBA</option>
              <option value="NFL">NFL</option>
              <option value="MLB">MLB</option>
              <option value="NHL">NHL</option>
              <option value="Soccer">Soccer</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
              <option value="all">All</option>
              <option value="deleted">Deleted</option>
              <option value="restored">Restored</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Time</label>
            <select value={filters.time} onChange={(e) => setFilters(prev => ({ ...prev, time: e.target.value }))}>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="this-month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Amount</th>
                <th>Sport</th>
                <th>Date</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {wagers.map(wager => (
                <tr key={wager.id}>
                  <td>{wager.user}</td>
                  <td>{formatAmount(wager.amount)}</td>
                  <td>{wager.sport}</td>
                  <td>{wager.deletedAt ? new Date(wager.deletedAt).toLocaleDateString() : '—'}</td>
                  <td>{wager.reason}</td>
                  <td><span className={`badge ${wager.status}`}>{wager.status}</span></td>
                  <td>
                    <button className="btn-small" onClick={() => openViewModal(wager)}>View</button>
                    <button
                      className="btn-small"
                      onClick={() => handleRestore(wager.id)}
                      disabled={wager.status === 'restored' || actionLoadingId === wager.id}
                    >
                      {actionLoadingId === wager.id ? 'Working...' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>

      {showViewModal && selectedWager && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Deleted Wager Details</h3>
            <div className="view-details">
              <p><strong>User:</strong> {selectedWager.user}</p>
              <p><strong>Amount:</strong> {formatAmount(selectedWager.amount)}</p>
              <p><strong>Sport:</strong> {selectedWager.sport}</p>
              <p><strong>Reason:</strong> {selectedWager.reason}</p>
              <p><strong>Status:</strong> {selectedWager.status}</p>
              <p><strong>Deleted At:</strong> {selectedWager.deletedAt ? new Date(selectedWager.deletedAt).toLocaleString() : '—'}</p>
              <p><strong>Restored At:</strong> {selectedWager.restoredAt ? new Date(selectedWager.restoredAt).toLocaleString() : '—'}</p>
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

export default DeletedWagersView;
