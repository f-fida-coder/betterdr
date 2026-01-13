import React, { useState } from 'react';

function CollectionsView() {
  const [collections] = useState([
    { id: 1, user: 'User123', amount: '$500.00', dueDate: '2025-01-15', status: 'overdue', attempts: 2 },
    { id: 2, user: 'User456', amount: '$1,000.00', dueDate: '2025-01-20', status: 'pending', attempts: 0 },
    { id: 3, user: 'User789', amount: '$250.00', dueDate: '2025-01-18', status: 'overdue', attempts: 3 },
    { id: 4, user: 'User101', amount: '$750.00', dueDate: '2025-01-22', status: 'pending', attempts: 1 },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Collections</h2>
        <p className="count">Total Outstanding: $2,500.00</p>
      </div>
      <div className="view-content">
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
                  <td>{collection.amount}</td>
                  <td>{collection.dueDate}</td>
                  <td><span className={`badge ${collection.status}`}>{collection.status}</span></td>
                  <td>{collection.attempts}</td>
                  <td>
                    <button className="btn-small">Collect</button>
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

export default CollectionsView;
