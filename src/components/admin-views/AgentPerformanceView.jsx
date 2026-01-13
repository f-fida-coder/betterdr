import React, { useState } from 'react';

function AgentPerformanceView() {
  const [agents] = useState([
    { id: 1, name: 'Agent 001', revenue: '$12,500.00', customers: 45, winRate: '51.2%', trend: 'up' },
    { id: 2, name: 'Agent 002', revenue: '$9,800.00', customers: 38, winRate: '49.8%', trend: 'down' },
    { id: 3, name: 'Agent 003', revenue: '$15,200.00', customers: 52, winRate: '53.1%', trend: 'up' },
    { id: 4, name: 'Agent 004', revenue: '$8,600.00', customers: 32, winRate: '50.5%', trend: 'stable' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Agent Performance</h2>
      </div>
      <div className="view-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Revenue</th>
                <th>Customers</th>
                <th>Win Rate</th>
                <th>Trend</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id}>
                  <td>{agent.name}</td>
                  <td>{agent.revenue}</td>
                  <td>{agent.customers}</td>
                  <td>{agent.winRate}</td>
                  <td>
                    <span className={`trend ${agent.trend}`}>
                      {agent.trend === 'up' ? '📈' : agent.trend === 'down' ? '📉' : '➡️'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-small">View Details</button>
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

export default AgentPerformanceView;
