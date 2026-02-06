import React, { useState } from 'react';
import { getAgents, createAgent, updateAgent, suspendUser, unsuspendUser, resetAgentPasswordByAdmin } from '../../api';

function AgentAdminView() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const [newAgent, setNewAgent] = useState({ username: '', email: '', password: '' });
  const [editForm, setEditForm] = useState({ id: '', email: '', password: '', agentBillingRate: '', agentBillingStatus: 'paid' });
  const [error, setError] = useState(null);

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return `$${num.toFixed(2)}`;
  };

  React.useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const data = await getAgents(token);
      setAgents(data || []);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      setError(error.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      await createAgent(newAgent, token);
      alert('Agent created successfully');
      setShowAddModal(false);
      setNewAgent({ username: '', email: '', password: '' });
      fetchAgents();
    } catch (error) {
      console.error('Agent creation error:', error);
      alert('Failed to create agent: ' + error.message);
    }
  };

  const handleToggleStatus = async (agent) => {
    const isSuspended = agent.status === 'suspended';
    const action = isSuspended ? 'unsuspend' : 'suspend';

    if (!window.confirm(`Are you sure you want to ${action} ${agent.username}?`)) return;

    try {
      const token = localStorage.getItem('token');

      if (isSuspended) {
        await unsuspendUser(agent.id || agent._id, token);
      } else {
        await suspendUser(agent.id || agent._id, token);
      }
      fetchAgents();
    } catch (error) {
      alert(`Failed to ${action} agent: ` + error.message);
    }
  };

  const openEditModal = (agent) => {
    setEditForm({
      id: agent.id || agent._id,
      email: agent.email || '',
      password: '', // Don't show existing hash
      agentBillingRate: agent.agentBillingRate ?? '',
      agentBillingStatus: agent.agentBillingStatus || 'paid'
    });
    setSelectedAgent(agent);
    setShowEditModal(true);
  };

  // Placeholder update function - currently we don't have a specific "updateAgent" endpoint, 
  // but we can add it later. For now, we will simulate or just log.
  const handleUpdateAgent = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const updateData = { email: editForm.email, agentBillingRate: editForm.agentBillingRate, agentBillingStatus: editForm.agentBillingStatus };
      if (editForm.password) updateData.password = editForm.password;

      await updateAgent(editForm.id, updateData, token);
      alert('Agent updated successfully');
      setShowEditModal(false);
      fetchAgents();
    } catch (error) {
      console.error('Update Error:', error);
      alert('Failed to update agent: ' + error.message);
    }
  };

  const openViewModal = (agent) => {
    setSelectedAgent(agent);
    setShowViewModal(true);
  };

  const handleAdjustBalance = async (agent) => {
    const agentId = agent.id || agent._id;
    const currentBalance = agent.balance ?? 0;
    const input = window.prompt('Enter new agent balance:', `${currentBalance}`);
    if (input === null) return;
    const nextBalance = Number(input);
    if (Number.isNaN(nextBalance)) {
      alert('Balance must be a valid number.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      await updateAgent(agentId, { balance: nextBalance }, token);
      fetchAgents();
    } catch (err) {
      alert('Failed to update agent balance: ' + (err.message || 'Unknown error'));
    }
  };

  const handleResetPassword = async (agent) => {
    const agentId = agent.id || agent._id;
    const newPassword = window.prompt(`Enter new password for agent ${agent.username}:`, '');

    if (newPassword === null) return;

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      await resetAgentPasswordByAdmin(agentId, newPassword, token);
      alert(`Password for agent ${agent.username} has been reset successfully.`);
    } catch (err) {
      console.error('Agent password reset failed:', err);
      alert(err.message || 'Failed to reset agent password');
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Agent Administration</h2>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>Add New Agent</button>
      </div>

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>New Agent</h3>
            <form onSubmit={handleCreateAgent}>
              <div className="form-group">
                <label>Username</label>
                <input type="text" value={newAgent.username} onChange={e => setNewAgent({ ...newAgent, username: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={newAgent.email} onChange={e => setNewAgent({ ...newAgent, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={newAgent.password} onChange={e => setNewAgent({ ...newAgent, password: e.target.value })} required />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Create</button>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Agent: {selectedAgent?.username}</h3>
            <form onSubmit={handleUpdateAgent}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>New Password (leave blank to keep)</label>
                <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Rate per Customer (Weekly)</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.agentBillingRate}
                  onChange={e => setEditForm({ ...editForm, agentBillingRate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Billing Status</label>
                <select
                  value={editForm.agentBillingStatus}
                  onChange={e => setEditForm({ ...editForm, agentBillingStatus: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', background: '#333', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                >
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Save Changes</button>
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedAgent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Agent Details</h3>
            <div className="detail-row"><label>Username:</label> <span>{selectedAgent.username}</span></div>
            <div className="detail-row"><label>Email:</label> <span>{selectedAgent.email}</span></div>
            <div className="detail-row"><label>Status:</label> <span className={`badge ${selectedAgent.status}`}>{selectedAgent.status}</span></div>
            <div className="detail-row"><label>Created By:</label> <span>{selectedAgent.createdBy?.username || 'System'}</span></div>
            <div className="detail-row"><label>Created At:</label> <span>{new Date(selectedAgent.createdAt).toLocaleString()}</span></div>
            <div className="detail-row"><label>Customers:</label> <span>{selectedAgent.userCount}</span></div>
            <div className="detail-row"><label>Active Customers:</label> <span>{selectedAgent.activeCustomerCount || 0}</span></div>
            <div className="detail-row"><label>Balance:</label> <span>{formatMoney(selectedAgent.balance)}</span></div>
            <div className="detail-row"><label>Outstanding Balance:</label> <span>{formatMoney(selectedAgent.balanceOwed)}</span></div>
            <div className="detail-row"><label>Rate per Customer:</label> <span>${Number(selectedAgent.agentBillingRate || 0).toFixed(2)}</span></div>
            <div className="detail-row"><label>Weekly Charge:</label> <span>${Number(selectedAgent.weeklyCharge || 0).toFixed(2)}</span></div>
            <div className="detail-row"><label>Billing Status:</label> <span>{selectedAgent.agentBillingStatus || 'paid'}</span></div>
            <div className="detail-row"><label>View Only:</label> <span>{selectedAgent.viewOnly ? 'Yes' : 'No'}</span></div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
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
                <th>Created By</th>
                <th>Customers</th>
                <th>Balance</th>
                <th>Outstanding</th>
                <th>Rate/Customer</th>
                <th>Weekly Charge</th>
                <th>Billing</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9">Loading agents...</td></tr>
              ) : error ? (
                <tr><td colSpan="9">{error}</td></tr>
              ) : agents.length === 0 ? (
                <tr><td colSpan="9">No agents found.</td></tr>
              ) : agents.map(agent => (
                <tr key={agent.id || agent._id}>
                  <td>{agent.username}</td>
                  <td>{agent.email}</td>
                  <td><span className={`badge ${agent.status || ''}`}>{agent.status || 'unknown'}</span></td>
                  <td style={{ fontWeight: 'bold', color: agent.createdBy ? '#e67e22' : '#999' }}>
                    {agent.createdBy ? (agent.createdBy.username) : 'System'}
                  </td>
                  <td>{agent.userCount || 0}</td>
                  <td>{formatMoney(agent.balance)}</td>
                  <td>{formatMoney(agent.balanceOwed)}</td>
                  <td>${Number(agent.agentBillingRate || 0).toFixed(2)}</td>
                  <td>${Number(agent.weeklyCharge || 0).toFixed(2)}</td>
                  <td><span className={`badge ${agent.agentBillingStatus === 'unpaid' ? 'warning' : 'active'}`}>{agent.agentBillingStatus || 'paid'}</span></td>
                  <td>
                    <button className="btn-small" onClick={() => openEditModal(agent)}>Edit</button>
                    <button className="btn-small" onClick={() => openViewModal(agent)}>View</button>
                    <button className="btn-small" onClick={() => handleAdjustBalance(agent)}>Adjust Balance</button>
                    <button
                      className={`btn-small ${agent.status === 'suspended' ? 'btn-success' : 'btn-danger'}`}
                      onClick={() => handleToggleStatus(agent)}
                    >
                      {agent.status === 'suspended' ? 'Activate' : 'Deactivate'}
                    </button>
                    <button className="btn-small btn-secondary" onClick={() => handleResetPassword(agent)}>Reset Pass</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000;
        }
        .modal-content {
            background: #1e1e1e; padding: 2rem; border-radius: 8px; width: 400px; border: 1px solid #333; color: #fff;
        }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; color: #aaa; }
        .form-group input { width: 100%; padding: 0.5rem; background: #333; border: 1px solid #444; color: #fff; border-radius: 4px; }
        .modal-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .detail-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #333; }
        .detail-row label { color: #888; }
        .btn-success { background-color: #27ae60 !important; }
      `}</style>
    </div>
  );
}

export default AgentAdminView;
