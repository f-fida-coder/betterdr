import React, { useState, useEffect } from 'react';
import { getMySubAgents, createSubAgent, suspendUser, unsuspendUser, updateAgent, resetAgentPasswordByAdmin, getNextUsername, getMe } from '../../api';

function SubAgentManagerView() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);

    const [newAgent, setNewAgent] = useState({ username: '', phoneNumber: '', password: '', fullName: '', agentPrefix: '' });
    const [editForm, setEditForm] = useState({ id: '', phoneNumber: '', password: '' });
    const [error, setError] = useState(null);
    const [masterUsername, setMasterUsername] = useState('');

    useEffect(() => {
        fetchSubAgents();
        fetchMe();
    }, []);

    const fetchMe = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const me = await getMe(token);
                setMasterUsername(me?.username || '');
            }
        } catch (e) {
            console.error('Failed to fetch profile:', e);
        }
    };

    const fetchSubAgents = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const data = await getMySubAgents(token);
            setAgents(data || []);
            setError(null);
        } catch (error) {
            console.error('Failed to fetch sub-agents:', error);
            setError(error.message || 'Failed to fetch sub-agents');
        } finally {
            setLoading(false);
        }
    };

    const handlePrefixChange = async (prefix) => {
        const formatted = prefix.toUpperCase();
        setNewAgent(prev => ({ ...prev, agentPrefix: formatted }));

        if (formatted.length >= 2) {
            const token = localStorage.getItem('token');
            // Sub-agents created by Super Agents don't get 'MA' suffix
            try {
                const { nextUsername } = await getNextUsername(formatted, token, { type: 'player' });
                setNewAgent(prev => ({ ...prev, username: nextUsername }));
            } catch (err) {
                console.error('Failed to get next username from prefix:', err);
            }
        } else {
            setNewAgent(prev => ({ ...prev, username: '' }));
        }
    };

    const handleCreateSubAgent = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No token found');

            await createSubAgent(newAgent, token);
            alert('Sub-Agent created successfully');
            setShowAddModal(false);
            setNewAgent({ username: '', phoneNumber: '', password: '', fullName: '', agentPrefix: '' });
            fetchSubAgents();
        } catch (error) {
            alert('Failed to create sub-agent: ' + error.message);
        }
    };

    const openEditModal = (agent) => {
        setEditForm({
            id: agent.id || agent._id,
            phoneNumber: agent.phoneNumber || '',
            password: ''
        });
        setSelectedAgent(agent);
        setShowEditModal(true);
    };

    const handleUpdateSubAgent = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const updateData = { phoneNumber: editForm.phoneNumber };
            if (editForm.password) updateData.password = editForm.password;

            await updateAgent(editForm.id, updateData, token);
            alert('Sub-Agent updated successfully');
            setShowEditModal(false);
            fetchSubAgents();
        } catch (error) {
            alert('Failed to update sub-agent: ' + error.message);
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
            fetchSubAgents();
        } catch (error) {
            alert(`Failed to ${action} agent: ` + error.message);
        }
    };

    const handleResetPassword = async (agent) => {
        const password = window.prompt(`Enter new password for agent ${agent.username}:`);
        if (!password) return;
        try {
            const token = localStorage.getItem('token');
            await resetAgentPasswordByAdmin(agent.id || agent._id, password, token);
            alert('Password reset successful');
        } catch (error) {
            alert('Reset failed: ' + error.message);
        }
    };

    return (
        <div className="admin-view">
            <div className="view-header">
                <h2>Sub-Agent Management</h2>
                {localStorage.getItem('userRole') !== 'admin' && (
                    <button className="btn-primary" onClick={() => {
                        setShowAddModal(true);
                        if (masterUsername) {
                            handlePrefixChange(masterUsername);
                        }
                    }}>Add Sub-Agent</button>
                )}
            </div>

            {
                showAddModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>New Sub-Agent</h3>
                            <form onSubmit={handleCreateSubAgent}>
                                {!masterUsername && (
                                    <div className="form-group">
                                        <label>Prefix</label>
                                        <input
                                            type="text"
                                            value={newAgent.agentPrefix}
                                            onChange={e => handlePrefixChange(e.target.value)}
                                            placeholder="Enter prefix"
                                            maxLength={5}
                                            required
                                        />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Username</label>
                                    <input type="text" value={newAgent.username} readOnly style={{ background: '#222', color: '#888' }} />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input type="tel" value={newAgent.phoneNumber} onChange={e => setNewAgent({ ...newAgent, phoneNumber: e.target.value })} required />
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
                )
            }

            {
                showEditModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Edit Sub-Agent: {selectedAgent?.username}</h3>
                            <form onSubmit={handleUpdateSubAgent}>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input type="tel" value={editForm.phoneNumber} onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>New Password (leave blank to keep)</label>
                                    <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                                </div>
                                <div className="modal-actions">
                                    <button type="submit" className="btn-primary">Save Changes</button>
                                    <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            <div className="view-content">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Phone Number</th>
                                <th>Status</th>
                                <th>Users</th>
                                <th>Balance</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5">Loading sub-agents...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="5" className="error">{error}</td></tr>
                            ) : agents.length === 0 ? (
                                <tr><td colSpan="5">No sub-agents found.</td></tr>
                            ) : agents.map(agent => (
                                <tr key={agent.id || agent._id}>
                                    <td>{agent.username}</td>
                                    <td>{agent.phoneNumber}</td>
                                    <td><span className={`badge ${agent.status}`}>{agent.status}</span></td>
                                    <td>{agent.userCount || 0}</td>
                                    <td>${Number(agent.balance || 0).toFixed(2)}</td>
                                    <td>
                                        <button className="btn-small" onClick={() => openEditModal(agent)}>Edit</button>
                                        <button className={`btn-small ${agent.status === 'suspended' ? 'btn-success' : 'btn-danger'}`} onClick={() => handleToggleStatus(agent)}>
                                            {agent.status === 'suspended' ? 'Activate' : 'Deactivate'}
                                        </button>
                                        <button className="btn-small btn-secondary" onClick={() => handleResetPassword(agent)}>Reset Path</button>
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
      `}</style>
        </div >
    );
}

export default SubAgentManagerView;
