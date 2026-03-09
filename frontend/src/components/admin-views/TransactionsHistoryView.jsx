import React, { useEffect, useState } from 'react';
import { getTransactionsHistory } from '../../api';
import { formatTransactionType, isDebitTransaction } from '../../utils/transactionPresentation';

function TransactionsHistoryView() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('30d');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const loadTransactions = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to view transaction history.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getTransactionsHistory({
        user: userFilter,
        type: typeFilter,
        status: statusFilter,
        time: timeFilter,
        limit: 200
      }, token);
      setTransactions(data.transactions || []);
      setError('');
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      setError(err.message || 'Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [userFilter, typeFilter, statusFilter, timeFilter]);

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '—';
    const num = Number(amount);
    if (Number.isNaN(num)) return '—';
    return `$${num.toFixed(2)}`;
  };

  const openViewModal = (txn) => {
    setSelectedTxn(txn);
    setShowViewModal(true);
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Transactions History</h2>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading transactions...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <>
        <div className="filter-section">
          <div className="filter-group">
            <label>User</label>
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Search user"
            />
          </div>
          <div className="filter-group">
            <label>Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="wager">Wagers</option>
              <option value="payout">Payouts</option>
              <option value="casino">Casino Activity</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Time</label>
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
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
                <th>Type</th>
                <th>User</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(txn => (
                <tr key={txn.id}>
                  <td>{formatTransactionType(txn)}</td>
                  <td>{txn.user}</td>
                  <td className={isDebitTransaction(txn) ? 'negative' : 'positive'}>
                    {formatAmount(txn.amount)}
                  </td>
                  <td>{txn.date ? new Date(txn.date).toLocaleString() : '—'}</td>
                  <td><span className={`badge ${txn.status}`}>{txn.status}</span></td>
                  <td>
                    <button className="btn-small" onClick={() => openViewModal(txn)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>

      {showViewModal && selectedTxn && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Transaction Details</h3>
            <div className="view-details">
              <p><strong>Type:</strong> {formatTransactionType(selectedTxn)}</p>
              <p><strong>User:</strong> {selectedTxn.user}</p>
              <p><strong>Amount:</strong> {formatAmount(selectedTxn.amount)}</p>
              <p><strong>Status:</strong> {selectedTxn.status}</p>
              <p><strong>Date:</strong> {selectedTxn.date ? new Date(selectedTxn.date).toLocaleString() : '—'}</p>
              {selectedTxn.balanceBefore !== null && selectedTxn.balanceBefore !== undefined && <p><strong>Balance Before:</strong> {formatAmount(selectedTxn.balanceBefore)}</p>}
              {selectedTxn.balanceAfter !== null && selectedTxn.balanceAfter !== undefined && <p><strong>Balance After:</strong> {formatAmount(selectedTxn.balanceAfter)}</p>}
              {selectedTxn.referenceId && <p><strong>Reference:</strong> {selectedTxn.referenceId}</p>}
              {selectedTxn.description && <p><strong>Description:</strong> {selectedTxn.description}</p>}
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

export default TransactionsHistoryView;
