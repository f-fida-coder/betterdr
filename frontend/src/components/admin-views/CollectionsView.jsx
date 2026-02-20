import React, { useEffect, useState } from 'react';
import { collectCollection, createCollection, getCollections, getUsersAdmin } from '../../api';

function CollectionsView() {
  const [collections, setCollections] = useState([]);
  const [summary, setSummary] = useState({ totalOutstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({ user: '', status: 'all', overdue: '0' });
  const [createLoading, setCreateLoading] = useState(false);
  const [newCollection, setNewCollection] = useState({ userId: '', amount: '', dueDate: '', notes: '' });
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const loadCollections = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to view collections.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getCollections({
        user: filters.user,
        status: filters.status,
        overdue: filters.overdue,
        limit: 200
      }, token);
      setCollections(data.collections || []);
      setSummary(data.summary || { totalOutstanding: 0 });
      setError('');
    } catch (err) {
      console.error('Failed to load collections:', err);
      setError(err.message || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, [filters]);

  useEffect(() => {
    const loadCustomers = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const data = await getUsersAdmin(token);
        setCustomers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load customers:', err);
      }
    };

    loadCustomers();
  }, []);

  const handleCreateCollection = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to create collections.');
      return;
    }

    try {
      setCreateLoading(true);
      await createCollection({
        userId: newCollection.userId,
        amount: Number(newCollection.amount) || 0,
        dueDate: newCollection.dueDate || null,
        notes: newCollection.notes.trim() || null
      }, token);
      setNewCollection({ userId: '', amount: '', dueDate: '', notes: '' });
      setError('');
      loadCollections();
    } catch (err) {
      setError(err.message || 'Failed to create collection');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCollect = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to collect.');
      return;
    }
    try {
      setActionLoadingId(id);
      await collectCollection(id, token);
      setCollections(prev => prev.map(col => (col.id === id ? { ...col, status: 'collected', attempts: (col.attempts || 0) + 1, lastAttemptAt: new Date().toISOString() } : col)));
    } catch (err) {
      setError(err.message || 'Failed to collect');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openViewModal = (collection) => {
    setSelectedCollection(collection);
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
        <h2>Collections</h2>
        <p className="count">Total Outstanding: {formatAmount(summary.totalOutstanding)}</p>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading collections...</div>}
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
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="collected">Collected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Overdue Only</label>
            <select value={filters.overdue} onChange={(e) => setFilters(prev => ({ ...prev, overdue: e.target.value }))}>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-group">
            <label>Customer</label>
            <select
              value={newCollection.userId}
              onChange={(e) => setNewCollection(prev => ({ ...prev, userId: e.target.value }))}
            >
              <option value="">Select customer</option>
              {customers.map(customer => (
                <option key={customer.id || customer._id} value={customer.id || customer._id}>
                  {customer.username}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Amount</label>
            <input
              type="number"
              value={newCollection.amount}
              onChange={(e) => setNewCollection(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div className="filter-group">
            <label>Due Date</label>
            <input
              type="date"
              value={newCollection.dueDate}
              onChange={(e) => setNewCollection(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Notes</label>
            <input
              type="text"
              value={newCollection.notes}
              onChange={(e) => setNewCollection(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleCreateCollection}
            disabled={createLoading || !newCollection.userId || !newCollection.amount}
          >
            {createLoading ? 'Saving...' : 'Create Collection'}
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {collections.map(collection => (
                <tr key={collection.id}>
                  <td>{collection.user}</td>
                  <td>{formatAmount(collection.amount)}</td>
                  <td>{collection.dueDate ? new Date(collection.dueDate).toLocaleDateString() : '—'}</td>
                  <td><span className={`badge ${collection.status}`}>{collection.status}</span></td>
                  <td>{collection.attempts || 0}</td>
                  <td>
                    <button
                      className="btn-small"
                      onClick={() => handleCollect(collection.id)}
                      disabled={collection.status === 'collected' || actionLoadingId === collection.id}
                    >
                      {actionLoadingId === collection.id ? 'Working...' : 'Collect'}
                    </button>
                    <button className="btn-small" onClick={() => openViewModal(collection)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>

      {showViewModal && selectedCollection && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Collection Details</h3>
            <div className="view-details">
              <p><strong>User:</strong> {selectedCollection.user}</p>
              <p><strong>Amount:</strong> {formatAmount(selectedCollection.amount)}</p>
              <p><strong>Due Date:</strong> {selectedCollection.dueDate ? new Date(selectedCollection.dueDate).toLocaleDateString() : '—'}</p>
              <p><strong>Status:</strong> {selectedCollection.status}</p>
              <p><strong>Attempts:</strong> {selectedCollection.attempts || 0}</p>
              <p><strong>Last Attempt:</strong> {selectedCollection.lastAttemptAt ? new Date(selectedCollection.lastAttemptAt).toLocaleString() : '—'}</p>
              {selectedCollection.notes && <p><strong>Notes:</strong> {selectedCollection.notes}</p>}
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

export default CollectionsView;
