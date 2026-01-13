import React, { useState } from 'react';

function TransactionsHistoryView() {
  const [transactions] = useState([
    { id: 1, type: 'Deposit', user: 'User123', amount: '$500.00', date: '2025-01-13', time: '14:30', status: 'completed' },
    { id: 2, type: 'Withdrawal', user: 'User456', amount: '$1,000.00', date: '2025-01-13', time: '12:15', status: 'completed' },
    { id: 3, type: 'Bet', user: 'User789', amount: '-$100.00', date: '2025-01-13', time: '10:45', status: 'completed' },
    { id: 4, type: 'Payout', user: 'User101', amount: '+$250.00', date: '2025-01-12', time: '16:20', status: 'completed' },
    { id: 5, type: 'Bonus', user: 'User202', amount: '+$50.00', date: '2025-01-12', time: '09:00', status: 'completed' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Transactions History</h2>
      </div>
      <div className="view-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>User</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(txn => (
                <tr key={txn.id}>
                  <td>{txn.type}</td>
                  <td>{txn.user}</td>
                  <td className={txn.amount.startsWith('-') ? 'negative' : 'positive'}>{txn.amount}</td>
                  <td>{txn.date}</td>
                  <td>{txn.time}</td>
                  <td><span className={`badge ${txn.status}`}>{txn.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TransactionsHistoryView;
