import React, { useState, useEffect } from 'react';
import { createUserByAdmin, createPlayerByAgent, getAgents, getMyPlayers, getMe, updateUserCredit, updateUserBalanceOwedByAgent, resetUserPasswordByAdmin, updateUserByAdmin, updateUserByAgent, getUserStatistics } from '../../api';

function CustomerAdminView({ onViewChange }) {
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    username: '',
    phoneNumber: '',
    password: '',
    firstName: '',
    lastName: '',
    fullName: '',
    agentId: '',
    balance: '',
    minBet: '1',
    maxBet: '5000',
    creditLimit: '1000',
    balanceOwed: '0'
  });
  const [currentRole, setCurrentRole] = useState('admin');
  const [viewOnly, setViewOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    phoneNumber: '',
    firstName: '',
    lastName: '',
    fullName: '',
    password: '',
    minBet: '1',
    maxBet: '5000',
    creditLimit: '1000',
    balanceOwed: '0'
  });



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
      setNewCustomer({
        username: '',
        phoneNumber: '',
        password: '',
        firstName: '',
        lastName: '',
        fullName: '',
        agentId: '',
        balance: '',
        minBet: '1',
        maxBet: '5000',
        creditLimit: '1000',
        balanceOwed: '0'
      });
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

  const handleEditClick = (customer) => {
    setSelectedCustomer(customer);
    setEditForm({
      phoneNumber: customer.phoneNumber || '',
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      fullName: customer.fullName || '',
      password: '', // Keep empty for no change
      minBet: customer.minBet || '1',
      maxBet: customer.maxBet || '5000',
      creditLimit: customer.creditLimit || '1000',
      balanceOwed: customer.balanceOwed || '0'
    });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    const customerId = selectedCustomer.id || selectedCustomer._id;
    try {
      const token = localStorage.getItem('token');
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;

      if (currentRole === 'agent') {
        await updateUserByAgent(customerId, payload, token);
      } else {
        await updateUserByAdmin(customerId, payload, token);
      }

      setCustomers(prev => prev.map(c => (
        (c.id || c._id) === customerId ? { ...c, ...payload } : c
      )));
      setShowEditModal(false);
      setError('');
    } catch (err) {
      console.error('Update customer failed:', err);
      setError(err.message || 'Failed to update customer');
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (currentRole === 'agent' || sourceFilter === 'all') return true;
    const hasAgent = Boolean(customer.agentId);
    if (sourceFilter === 'agent') return hasAgent;
    if (sourceFilter === 'admin') return !hasAgent;
    return true;
  });

  const handleViewDetails = (customer) => {
    if (onViewChange) {
      onViewChange('user-details', customer.id || customer._id);
    }
  };

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
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={newCustomer.phoneNumber}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="Phone Number"
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
                <label>First Name</label>
                <input
                  type="text"
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div className="filter-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
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
                <label>Min Bet</label>
                <input
                  type="number"
                  value={newCustomer.minBet}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, minBet: e.target.value }))}
                  placeholder="1"
                />
              </div>
              <div className="filter-group">
                <label>Max Bet</label>
                <input
                  type="number"
                  value={newCustomer.maxBet}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, maxBet: e.target.value }))}
                  placeholder="5000"
                />
              </div>
              <div className="filter-group">
                <label>Credit</label>
                <input
                  type="number"
                  value={newCustomer.creditLimit}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, creditLimit: e.target.value }))}
                  placeholder="1000"
                />
              </div>
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
                disabled={viewOnly || createLoading || !newCustomer.username || !newCustomer.phoneNumber || !newCustomer.password}
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
                    <th>Password</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Min Bet</th>
                    <th>Max Bet</th>
                    <th>Credit</th>
                    <th>Settle</th>
                    <th>Balance</th>
                    <th>Status</th>
                    {currentRole !== 'agent' && <th>Agent</th>}
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
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn-small btn-secondary" onClick={() => handleResetPassword(customer)}>Reset</button>
                          </td>
                          <td>{customer.firstName || '—'}</td>
                          <td>{customer.lastName || '—'}</td>
                          <td>{customer.minBet || '1'}</td>
                          <td>{customer.maxBet || '5000'}</td>
                          <td>{formatBalance(customer.creditLimit)}</td>
                          <td>{formatBalance(customer.balanceOwed)}</td>
                          <td>{formatBalance(customer.balance)}</td>
                          <td>
                            <span className={`badge ${customer.status}`}>{customer.status}</span>
                            {customer.isActive && <span className="badge active-customer" style={{ marginLeft: '5px', background: '#28a745', color: 'white' }}>Active</span>}
                          </td>
                          {currentRole !== 'agent' && (
                            <td>{customer.agentId?.username || 'Admin'}</td>
                          )}
                          <td>
                            <button className="btn-small btn-info" onClick={() => handleViewDetails(customer)} style={{ marginRight: '8px' }}>View</button>
                            <button
                              className="btn-small btn-primary"
                              onClick={() => handleEditClick(customer)}
                              style={{ marginRight: '8px' }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-small"
                              onClick={() => handleAdjustBalance(customer)}
                              disabled={viewOnly || actionLoadingId === customerId}
                            >
                              {actionLoadingId === customerId ? 'Working...' : 'Adj Bal'}
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

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Customer: {selectedCustomer?.username}</h3>
            <form onSubmit={handleUpdateCustomer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Min Bet</label>
                  <input
                    type="number"
                    value={editForm.minBet}
                    onChange={e => setEditForm({ ...editForm, minBet: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Max Bet</label>
                  <input
                    type="number"
                    value={editForm.maxBet}
                    onChange={e => setEditForm({ ...editForm, maxBet: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Credit</label>
                  <input
                    type="number"
                    value={editForm.creditLimit}
                    onChange={e => setEditForm({ ...editForm, creditLimit: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Settle (Balance Owed)</label>
                  <input
                    type="number"
                    value={editForm.balanceOwed}
                    onChange={e => setEditForm({ ...editForm, balanceOwed: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>New Password (leave blank to keep)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Save Changes</button>
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATS MODAL REMOVED */}
    </div>
  );
}

export default CustomerAdminView;
