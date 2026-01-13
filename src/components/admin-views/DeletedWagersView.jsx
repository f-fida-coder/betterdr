import React, { useState } from 'react';

function DeletedWagersView() {
  const [wagers] = useState([
    { id: 1, user: 'User123', amount: '$100.00', sport: 'NBA', date: '2025-01-13', reason: 'User Cancelled' },
    { id: 2, user: 'User456', amount: '$250.00', sport: 'NFL', date: '2025-01-13', reason: 'System Error' },
    { id: 3, user: 'User789', amount: '$50.00', sport: 'Premier League', date: '2025-01-12', reason: 'Invalid Bet' },
    { id: 4, user: 'User101', amount: '$200.00', sport: 'NBA', date: '2025-01-12', reason: 'User Cancelled' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Deleted Wagers</h2>
      </div>
      <div className="view-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Amount</th>
                <th>Sport</th>
                <th>Date</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {wagers.map(wager => (
                <tr key={wager.id}>
                  <td>{wager.user}</td>
                  <td>{wager.amount}</td>
                  <td>{wager.sport}</td>
                  <td>{wager.date}</td>
                  <td>{wager.reason}</td>
                  <td>
                    <button className="btn-small">View</button>
                    <button className="btn-small">Restore</button>
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

export default DeletedWagersView;
