import React, { useState, useEffect } from 'react';
import { createUserByAdmin, createPlayerByAgent, getAgents, getMyPlayers, getMe, updateUserCredit, updateUserBalanceOwedByAgent, resetUserPasswordByAdmin } from '../../api';

function CustomerAdminView({ onViewChange }) {
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ username: '', email: '', password: '', fullName: '', agentId: '', balance: '' });
  const [currentRole, setCurrentRole] = useState('admin');
  const [viewOnly, setViewOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setCustomers([]);
          setError('Please login as admin to load users.');
          return;
        }
        const me = await getMe(token);
        setCurrentRole(me?.role || 'admin');
        setViewOnly(Boolean(me?.viewOnly));

        if ((me?.role || 'admin') === 'agent') {
          const data = await getMyPlayers(token);
          setCustomers(data || []);
        } else {
          const response = await fetch('http://localhost:5000/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) {
            throw new Error('Failed to fetch users');
          }
          const data = await response.json();
          setCustomers(data);
          const agentsData = await getAgents(token);
          setAgents(agentsData || []);
        }
        setError('');
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleAddCustomer = () => {
    if (onViewChange) {
      onViewChange('add-customer');
    }
  };

  const handleCreateCustomer = async () => {
    try {
      setCreateLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login as admin to create users.');
        return;
      }
      const payload = { ...newCustomer };
      if (payload.balance === '') delete payload.balance;
      if (currentRole === 'agent') {
        await createPlayerByAgent(payload, token);
      } else {
        await createUserByAdmin(payload, token);
      }
      setNewCustomer({ username: '', email: '', password: '', fullName: '', agentId: '', balance: '' });
      setError('');
      if (currentRole === 'agent') {
        const data = await getMyPlayers(token);
        setCustomers(data || []);
      } else {
        const response = await fetch('http://localhost:5000/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
        }
      }
    } catch (err) {
      console.error('Create user failed:', err);
      setError(err.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const updateCustomerStatus = async (customerId, nextStatus) => {
    if (currentRole === 'agent') {
      setError('Agents cannot change customer status in this view.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to update user status.');
      return;
    }

    const endpoint = nextStatus === 'suspended'
      ? 'http://localhost:5000/api/admin/suspend'
      : 'http://localhost:5000/api/admin/unsuspend';

    try {
      setActionLoadingId(customerId);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: customerId })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update user status');
      }

      setCustomers(prev => prev.map(c => (
        (c.id || c._id) === customerId ? { ...c, status: nextStatus } : c
      )));
      setError('');
    } catch (err) {
      console.error('Status update failed:', err);
      setError(err.message || 'Failed to update user status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatBalance = (balance) => {
    if (balance === null || balance === undefined || balance === '') return '—';
    const num = Number(balance);
    if (Number.isNaN(num)) return '—';
    return `$${num.toFixed(2)}`;
  };

  const handleAdjustBalance = async (customer) => {
    const customerId = customer.id || customer._id;
    const currentBalance = customer.balance ?? 0;
    const input = window.prompt('Enter new balance:', `${currentBalance}`);
    if (input === null) return;
    const nextBalance = Number(input);
    if (Number.isNaN(nextBalance) || nextBalance < 0) {
      setError('Balance must be a non-negative number.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to update balance.');
        return;
      }

      setActionLoadingId(customerId);
      if (currentRole === 'agent') {
        await updateUserBalanceOwedByAgent(customerId, nextBalance, token);
      } else {
        await updateUserCredit(customerId, { balance: nextBalance }, token);
      }

      setCustomers(prev => prev.map(c => (
        (c.id || c._id) === customerId
          ? { ...c, balance: nextBalance, availableBalance: Math.max(0, nextBalance - Number(c.pendingBalance || 0)) }
          : c
      )));
      setError('');
    } catch (err) {
      console.error('Balance update failed:', err);
      setError(err.message || 'Failed to update balance');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetPassword = async (customer) => {
    const customerId = customer.id || customer._id;
    const newPassword = window.prompt(`Enter new password for ${customer.username}:`, '');

    if (newPassword === null) return;

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to reset password.');
        return;
      }

      setActionLoadingId(customerId);
      await resetUserPasswordByAdmin(customerId, newPassword, token);
      alert(`Password for ${customer.username} has been reset successfully.`);
      setError('');
    } catch (err) {
      console.error('Password reset failed:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (currentRole === 'agent' || sourceFilter === 'all') return true;
    const hasAgent = Boolean(customer.agentId);
    if (sourceFilter === 'agent') return hasAgent;
    if (sourceFilter === 'admin') return !hasAgent;
    return true;
  });

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Customer Administration</h2>
        <button className="btn-primary" onClick={handleAddCustomer}>Add New Customer</button>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading users...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
          <>
            <div className="filter-section">
              <div className="filter-group">
                <label>Username</label>
                <input
                  type="text"
                  value={newCustomer.username}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Username"
                />
              </div>
              <div className="filter-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                />
              </div>
              <div className="filter-group">
                <label>Password</label>
                <input
                  type="password"
                  value={newCustomer.password}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                />
              </div>
              <div className="filter-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={newCustomer.fullName}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              {currentRole !== 'agent' && (
                <div className="filter-group">
                  <label>Agent</label>
                  <select
                    value={newCustomer.agentId}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, agentId: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {agents.map(agent => (
                      <option key={agent.id || agent._id} value={agent.id || agent._id}>
                        {agent.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="filter-group">
                <label>Starting Balance</label>
                <input
                  type="number"
                  value={newCustomer.balance}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, balance: e.target.value }))}
                  placeholder="1000"
                  min="0"
                />
              </div>
              <button
                className="btn-primary"
                onClick={handleCreateCustomer}
                disabled={viewOnly || createLoading || !newCustomer.username || !newCustomer.email || !newCustomer.password}
              >
                {viewOnly ? 'View-only (Unpaid)' : createLoading ? 'Saving...' : 'Create Customer'}
              </button>
            </div>
            <div className="table-container">
              {currentRole !== 'agent' && (
                <div className="filter-section" style={{ marginBottom: '10px' }}>
                  <div className="filter-group">
                    <label>Source</label>
                    <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                      <option value="all">All</option>
                      <option value="admin">Created by Admin</option>
                      <option value="agent">Created by Agent</option>
                    </select>
                  </div>
                </div>
              )}
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    {currentRole !== 'agent' && <th>Agent</th>}
                    <th>Balance</th>
                    <th>Outstanding</th>
                    <th>Pending</th>
                    <th>Available</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={currentRole !== 'agent' ? 11 : 10} style={{ textAlign: 'center', padding: '20px' }}>No users found</td>
                    </tr>
                  ) : (
                    filteredCustomers.map(customer => {
                      const customerId = customer.id || customer._id;
                      return (
                        <tr key={customerId}>
                          <td>{customer.username}</td>
                          <td>{customer.email}</td>
                          <td>
                            <span className={`badge ${customer.status}`}>{customer.status}</span>
                            {customer.isActive && <span className="badge active-customer" style={{ marginLeft: '5px', background: '#28a745', color: 'white' }}>Active</span>}
                          </td>
                          {currentRole !== 'agent' && (
                            <td>{customer.agentId?.username || 'Admin'}</td>
                          )}
                          <td>{formatBalance(customer.balance)}</td>
                          <td>{formatBalance(customer.balanceOwed)}</td>
                          <td>{formatBalance(customer.pendingBalance)}</td>
                          <td>{formatBalance(customer.availableBalance)}</td>
                          <td><span className={`badge ${customer.role}`}>{customer.role}</span></td>
                          <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button
                              className="btn-small"
                              onClick={() => handleAdjustBalance(customer)}
                              disabled={viewOnly || actionLoadingId === customerId}
                            >
                              {actionLoadingId === customerId ? 'Working...' : 'Adjust Balance'}
                            </button>
                            {currentRole !== 'agent' && (
                              customer.status === 'suspended' ? (
                                <button
                                  className="btn-small"
                                  onClick={() => updateCustomerStatus(customerId, 'active')}
                                  disabled={actionLoadingId === customerId}
                                  style={{ marginLeft: '8px' }}
                                >
                                  {actionLoadingId === customerId ? 'Working...' : 'Unsuspend'}
                                </button>
                              ) : (
                                <button
                                  className="btn-small btn-danger"
                                  onClick={() => updateCustomerStatus(customerId, 'suspended')}
                                  disabled={actionLoadingId === customerId}
                                  style={{ marginLeft: '8px' }}
                                >
                                  {actionLoadingId === customerId ? 'Working...' : 'Suspend'}
                                </button>
                              )
                            )}
                            <button
                              className="btn-small btn-secondary"
                              onClick={() => handleResetPassword(customer)}
                              disabled={actionLoadingId === customerId}
                              style={{ marginLeft: '8px' }}
                            >
                              Reset Pass
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CustomerAdminView;
