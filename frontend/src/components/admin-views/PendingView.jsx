import React, { useState, useEffect } from 'react';
import { getAdminBets, getPendingItems, approvePendingItem, declinePendingItem } from '../../api';

function PendingView() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    const fetchPending = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view pending items.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [pendingTransactions, pendingBets] = await Promise.all([
          getPendingItems(token),
          getAdminBets({ status: 'pending', limit: 300 }, token)
        ]);

        const txRows = Array.isArray(pendingTransactions) ? pendingTransactions.map((item) => ({
          id: `transaction-${item.id}`,
          entityId: item.id,
          source: 'transaction',
          type: item.type || 'transaction',
          details: 'Pending wallet/payment transaction',
          amount: Number(item.amount || 0),
          user: item.user || 'Unknown',
          date: item.date || null,
          status: item.status || 'pending',
        })) : [];

        const betRows = Array.isArray(pendingBets?.bets) ? pendingBets.bets.map((bet) => ({
          id: `bet-${bet.id}`,
          entityId: bet.id,
          source: 'sportsbook',
          type: bet.type || 'bet',
          details: bet.match?.homeTeam && bet.match?.awayTeam
            ? `${bet.match.homeTeam} vs ${bet.match.awayTeam}`
            : (bet.description || 'Pending sportsbook bet'),
          amount: Number(bet.risk || bet.amount || 0),
          user: bet.customer || bet.username || 'Unknown',
          date: bet.createdAt || null,
          status: bet.status || 'pending',
        })) : [];

        const combined = [...betRows, ...txRows].sort((a, b) => {
          const aTime = a.date ? new Date(a.date).getTime() : 0;
          const bTime = b.date ? new Date(b.date).getTime() : 0;
          return bTime - aTime;
        });

        setPending(combined);
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
      setError('Please login to approve items.');
      return;
    }
    try {
      setActionLoadingId(itemId);
      await approvePendingItem(itemId, token);
      setPending(prev => prev.filter(item => item.entityId !== itemId));
    } catch (err) {
      setError(err.message || 'Failed to approve item');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (itemId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to decline items.');
      return;
    }
    try {
      setActionLoadingId(itemId);
      await declinePendingItem(itemId, token);
      setPending(prev => prev.filter(item => item.entityId !== itemId));
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
    return `$${Math.round(num)}`;
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  const filteredItems = sourceFilter === 'all'
    ? pending
    : pending.filter((item) => item.source === sourceFilter);

  const pendingSummary = pending.reduce((acc, item) => {
    acc[item.source] = (acc[item.source] || 0) + 1;
    if (item.source === 'sportsbook') {
      acc.betExposure += Number(item.amount || 0);
    }
    return acc;
  }, { sportsbook: 0, transaction: 0, betExposure: 0 });

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
        <>
        <div className="stats-container">
          <div className="stat-card">
            <h3>Total Pending</h3>
            <div className="amount">{pending.length}</div>
            <p className="change">Transactions + sportsbook bets</p>
          </div>
          <div className="stat-card">
            <h3>Pending Bets</h3>
            <div className="amount">{pendingSummary.sportsbook}</div>
            <p className="change">Sportsbook tickets awaiting settlement</p>
          </div>
          <div className="stat-card">
            <h3>Pending Transactions</h3>
            <div className="amount">{pendingSummary.transaction}</div>
            <p className="change">Wallet/payment approvals</p>
          </div>
          <div className="stat-card">
            <h3>Bet Exposure</h3>
            <div className="amount">{formatAmount(pendingSummary.betExposure)}</div>
            <p className="change">Risk currently locked in pending bets</p>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-group">
            <label>Source</label>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="all">All Pending Items</option>
              <option value="sportsbook">Sportsbook Bets</option>
              <option value="transaction">Transactions</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Details</th>
                <th>Amount</th>
                <th>User</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No pending items found.</td></tr>
              ) : filteredItems.map(item => (
                <tr key={item.id}>
                  <td><span className={`badge ${item.source}`}>{item.source}</span></td>
                  <td>{item.type}</td>
                  <td>{item.details}</td>
                  <td>{formatAmount(item.amount)}</td>
                  <td>{item.user}</td>
                  <td>{formatDate(item.date)}</td>
                  <td><span className="badge pending">{item.status}</span></td>
                  <td>
                    {item.source === 'transaction' ? (
                      <>
                        <button
                          className="btn-small btn-approve"
                          onClick={() => handleApprove(item.entityId)}
                          disabled={actionLoadingId === item.entityId}
                        >
                          {actionLoadingId === item.entityId ? 'Working...' : 'Approve'}
                        </button>
                        <button
                          className="btn-small btn-decline"
                          onClick={() => handleDecline(item.entityId)}
                          disabled={actionLoadingId === item.entityId}
                        >
                          {actionLoadingId === item.entityId ? 'Working...' : 'Decline'}
                        </button>
                      </>
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>Settles from sportsbook results</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

export default PendingView;
