import React, { useState } from 'react';

function PendingView() {
  const [pending] = useState([
    { id: 1, type: 'Withdrawal', amount: '$500.00', user: 'User123', date: '2025-01-13', status: 'pending' },
    { id: 2, type: 'Deposit', amount: '$1,000.00', user: 'User456', date: '2025-01-13', status: 'pending' },
    { id: 3, type: 'Verification', amount: 'N/A', user: 'User789', date: '2025-01-12', status: 'pending' },
    { id: 4, type: 'Bonus Claim', amount: '$100.00', user: 'User101', date: '2025-01-12', status: 'pending' },
    { id: 5, type: 'Account Update', amount: 'N/A', user: 'User202', date: '2025-01-11', status: 'pending' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Pending Items</h2>
        <p className="count">{pending.length} pending items</p>
      </div>
      <div className="view-content">
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
                  <td>{item.amount}</td>
                  <td>{item.user}</td>
                  <td>{item.date}</td>
                  <td><span className="badge pending">{item.status}</span></td>
                  <td>
                    <button className="btn-small btn-approve">Approve</button>
                    <button className="btn-small btn-decline">Decline</button>
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

export default PendingView;
