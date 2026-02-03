import React, { useEffect, useState } from 'react';
import { getCashierSummary, getCashierTransactions } from '../../api';

function CashierView() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalDeposits: 0, totalWithdrawals: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const loadCashier = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to view cashier data.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [summaryData, txnData] = await Promise.all([
        getCashierSummary(token),
        getCashierTransactions(token, 50)
      ]);
      setSummary(summaryData);
      setTransactions(txnData || []);
      setError('');
    } catch (err) {
      console.error('Failed to load cashier data:', err);
      setError(err.message || 'Failed to load cashier data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashier();
  }, []);

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
        <h2>Cashier Management</h2>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading cashier data...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <>
        <div className="cashier-summary">
          <div className="summary-card">
            <h3>Total Deposits (Today)</h3>
            <p className="amount">{formatAmount(summary.totalDeposits)}</p>
          </div>
          <div className="summary-card">
            <h3>Total Withdrawals (Today)</h3>
            <p className="amount">{formatAmount(summary.totalWithdrawals)}</p>
          </div>
          <div className="summary-card">
            <h3>Pending Transactions</h3>
            <p className="amount">{summary.pendingCount}</p>
          </div>
        </div>

        <div className="table-container">
          <h3>Recent Transactions</h3>
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
                  <td>{txn.type}</td>
                  <td>{txn.user}</td>
                  <td>{formatAmount(txn.amount)}</td>
                  <td>{new Date(txn.date).toLocaleDateString()}</td>
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
              <p><strong>Type:</strong> {selectedTxn.type}</p>
              <p><strong>User:</strong> {selectedTxn.user}</p>
              <p><strong>Amount:</strong> {formatAmount(selectedTxn.amount)}</p>
              <p><strong>Status:</strong> {selectedTxn.status}</p>
              <p><strong>Date:</strong> {new Date(selectedTxn.date).toLocaleString()}</p>
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

export default CashierView;
