import React, { useState, useEffect } from 'react';
import { createUserByAdmin, getAgents } from '../../api';

function CustomerAdminView({ onViewChange }) {
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ username: '', email: '', password: '', fullName: '', agentId: '' });

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
      await createUserByAdmin(newCustomer, token);
      setNewCustomer({ username: '', email: '', password: '', fullName: '', agentId: '' });
      setError('');
      const response = await fetch('http://localhost:5000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Create user failed:', err);
      setError(err.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const updateCustomerStatus = async (customerId, nextStatus) => {
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

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Customer Administration</h2>
        <button className="btn-primary" onClick={handleAddCustomer}>Add New Customer</button>
      </div>
      <div className="view-content">
        {loading && <div style={{padding: '20px', textAlign: 'center'}}>Loading users...</div>}
        {error && <div style={{padding: '20px', color: 'red', textAlign: 'center'}}>{error}</div>}
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
            <button
              className="btn-primary"
              onClick={handleCreateCustomer}
              disabled={createLoading || !newCustomer.username || !newCustomer.email || !newCustomer.password}
            >
              {createLoading ? 'Saving...' : 'Create Customer'}
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Balance</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>No users found</td>
                  </tr>
                ) : (
                  customers.map(customer => {
                    const customerId = customer.id || customer._id;
                    return (
                    <tr key={customerId}>
                      <td>{customer.username}</td>
                      <td>{customer.email}</td>
                      <td><span className={`badge ${customer.status}`}>{customer.status}</span></td>
                      <td>{formatBalance(customer.balance)}</td>
                      <td><span className={`badge ${customer.role}`}>{customer.role}</span></td>
                      <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
                      <td>
                        {customer.status === 'suspended' ? (
                          <button
                            className="btn-small"
                            onClick={() => updateCustomerStatus(customerId, 'active')}
                            disabled={actionLoadingId === customerId}
                          >
                            {actionLoadingId === customerId ? 'Working...' : 'Unsuspend'}
                          </button>
                        ) : (
                          <button
                            className="btn-small btn-danger"
                            onClick={() => updateCustomerStatus(customerId, 'suspended')}
                            disabled={actionLoadingId === customerId}
                          >
                            {actionLoadingId === customerId ? 'Working...' : 'Suspend'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )})
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
