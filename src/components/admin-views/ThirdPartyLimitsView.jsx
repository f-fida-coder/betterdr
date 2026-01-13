import React, { useState } from 'react';

function ThirdPartyLimitsView() {
  const [limits] = useState([
    { id: 1, provider: 'BetProvider A', dailyLimit: '$10,000', monthlyLimit: '$100,000', used: '$4,500', status: 'active' },
    { id: 2, provider: 'BetProvider B', dailyLimit: '$5,000', monthlyLimit: '$50,000', used: '$2,100', status: 'active' },
    { id: 3, provider: 'BetProvider C', dailyLimit: '$15,000', monthlyLimit: '$150,000', used: '$8,200', status: 'active' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>3rd Party Limits</h2>
      </div>
      <div className="view-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Daily Limit</th>
                <th>Monthly Limit</th>
                <th>Used</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {limits.map(limit => (
                <tr key={limit.id}>
                  <td>{limit.provider}</td>
                  <td>{limit.dailyLimit}</td>
                  <td>{limit.monthlyLimit}</td>
                  <td>{limit.used}</td>
                  <td><span className={`badge ${limit.status}`}>{limit.status}</span></td>
                  <td>
                    <button className="btn-small">Edit</button>
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

export default ThirdPartyLimitsView;
