import React, { useState } from 'react';

function AgentAdminView() {
  const [agents] = useState([
    { id: 1, name: 'Agent 001', email: 'agent001@example.com', status: 'active', customers: 45, revenue: '$12,500' },
    { id: 2, name: 'Agent 002', email: 'agent002@example.com', status: 'active', customers: 38, revenue: '$9,800' },
    { id: 3, name: 'Agent 003', email: 'agent003@example.com', status: 'inactive', customers: 52, revenue: '$15,200' },
    { id: 4, name: 'Agent 004', email: 'agent004@example.com', status: 'active', customers: 32, revenue: '$8,600' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Agent Administration</h2>
        <button className="btn-primary">Add New Agent</button>
      </div>
      <div className="view-content">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Customers</th>
                <th>Revenue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id}>
                  <td>{agent.name}</td>
                  <td>{agent.email}</td>
                  <td><span className={`badge ${agent.status}`}>{agent.status}</span></td>
                  <td>{agent.customers}</td>
                  <td>{agent.revenue}</td>
                  <td>
                    <button className="btn-small">Edit</button>
                    <button className="btn-small">View</button>
                    <button className="btn-small btn-danger">Deactivate</button>
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

export default AgentAdminView;
