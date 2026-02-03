import React, { useState, useEffect } from 'react';
import { getPendingItems, approvePendingItem, declinePendingItem } from '../../api';

function PendingView() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    const fetchPending = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login as admin to view pending items.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getPendingItems(token);
        setPending(data || []);
        setError('');
      } catch (err) {
        console.error('Failed to load pending items:', err);
        setError(err.message || 'Failed to load pending items');
      } finally {
        setLoading(false);
      }
    };

    fetchPending();
  }, []);

  const handleApprove = async (itemId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to approve items.');
      return;
    }
    try {
      setActionLoadingId(itemId);
      await approvePendingItem(itemId, token);
      setPending(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      setError(err.message || 'Failed to approve item');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (itemId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to decline items.');
      return;
    }
    try {
      setActionLoadingId(itemId);
      await declinePendingItem(itemId, token);
      setPending(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      setError(err.message || 'Failed to decline item');
    } finally {
      setActionLoadingId(null);
    }
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
        <h2>Pending Items</h2>
        <p className="count">{pending.length} pending items</p>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading pending items...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>User</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(item => (
                <tr key={item.id}>
                  <td>{item.type}</td>
                  <td>{formatAmount(item.amount)}</td>
                  <td>{item.user}</td>
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                  <td><span className="badge pending">{item.status}</span></td>
                  <td>
                    <button
                      className="btn-small btn-approve"
                      onClick={() => handleApprove(item.id)}
                      disabled={actionLoadingId === item.id}
                    >
                      {actionLoadingId === item.id ? 'Working...' : 'Approve'}
                    </button>
                    <button
                      className="btn-small btn-decline"
                      onClick={() => handleDecline(item.id)}
                      disabled={actionLoadingId === item.id}
                    >
                      {actionLoadingId === item.id ? 'Working...' : 'Decline'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}

export default PendingView;
