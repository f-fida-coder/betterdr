import React, { useState } from 'react';

function CashierView() {
  const [transactions] = useState([
    { id: 1, type: 'Deposit', user: 'User123', amount: '$500.00', date: '2025-01-13', status: 'completed' },
    { id: 2, type: 'Withdrawal', user: 'User456', amount: '$1,000.00', date: '2025-01-13', status: 'processing' },
    { id: 3, type: 'Deposit', user: 'User789', amount: '$250.00', date: '2025-01-12', status: 'completed' },
    { id: 4, type: 'Withdrawal', user: 'User101', amount: '$750.00', date: '2025-01-12', status: 'completed' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Cashier Management</h2>
      </div>
      <div className="view-content">
        <div className="cashier-summary">
          <div className="summary-card">
            <h3>Total Deposits (Today)</h3>
            <p className="amount">$3,250.50</p>
          </div>
          <div className="summary-card">
            <h3>Total Withdrawals (Today)</h3>
            <p className="amount">$2,100.00</p>
          </div>
          <div className="summary-card">
            <h3>Pending Transactions</h3>
            <p className="amount">1</p>
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
                  <td>{txn.amount}</td>
                  <td>{txn.date}</td>
                  <td><span className={`badge ${txn.status}`}>{txn.status}</span></td>
                  <td>
                    <button className="btn-small">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CashierView;
