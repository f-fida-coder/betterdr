import React, { useState } from 'react';
import { getAgents, createAgent } from '../../api';

function AgentAdminView() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgent, setNewAgent] = useState({ username: '', email: '', password: '' });

  React.useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = await getAgents(token);
      setAgents(data);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN FOUND');

      if (!token) {
        alert('ERROR: No token found! Please login first.');
        return;
      }

      console.log('Creating agent with data:', newAgent);
      const result = await createAgent(newAgent, token);
      console.log('Agent created:', result);
      alert('Agent created successfully');
      setShowAddModal(false);
      setNewAgent({ username: '', email: '', password: '' });
      fetchAgents();
    } catch (error) {
      console.error('Agent creation error:', error);
      alert('Failed to create agent: ' + error.message);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Agent Administration</h2>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>Add New Agent</button>
      </div>

      {showAddModal && (
        <div style={{ padding: '20px', background: '#333', marginBottom: '20px', borderRadius: '8px' }}>
          <h3>New Agent</h3>
          <form onSubmit={handleCreateAgent} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Username</label>
              <input type="text" value={newAgent.username} onChange={e => setNewAgent({ ...newAgent, username: e.target.value })} required style={{ padding: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
              <input type="email" value={newAgent.email} onChange={e => setNewAgent({ ...newAgent, email: e.target.value })} required style={{ padding: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
              <input type="password" value={newAgent.password} onChange={e => setNewAgent({ ...newAgent, password: e.target.value })} required style={{ padding: '8px' }} />
            </div>
            <button type="submit" className="btn-primary">Create</button>
            <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          </form>
        </div>
      )}

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
              {loading ? (
                <tr><td colSpan="6">Loading agents...</td></tr>
              ) : agents.map(agent => (
                <tr key={agent.id}>
                  <td>{agent.username}</td>
                  <td>{agent.email}</td>
                  <td><span className={`badge ${agent.status}`}>{agent.status}</span></td>
                  <td>{agent.userCount || 0}</td>
                  <td>{agent.balance || '$0.00'}</td>
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
