import React, { useState, useEffect } from 'react';
import { createUserByAdmin, createPlayerByAgent, getAgents, getMyPlayers, getMe, updateUserCredit, updateUserBalanceOwedByAgent, resetUserPasswordByAdmin, updateUserByAdmin, updateUserByAgent, getUserStatistics, getNextUsername, getUsersAdmin } from '../../api';

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
    balanceOwed: '0',
    apps: {
      venmo: '',
      cashapp: '',
      applePay: '',
      zelle: '',
      paypal: '',
      btc: '',
      other: ''
    }
  });
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    customerId: null,
    username: '',
    currentBalance: 0,
    nextBalance: ''
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
          const data = await getUsersAdmin(token);
          setCustomers(data || []);
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
        const data = await getUsersAdmin(token);
        setCustomers(data || []);
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
      setError('Please login to update user status.');
      return;
    }

    try {
      setActionLoadingId(customerId);
      const payload = { status: nextStatus };

      if (currentRole === 'agent') {
        await updateUserByAgent(customerId, payload, token);
      } else {
        await updateUserByAdmin(customerId, payload, token);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#28a745'; // Green
      case 'disabled':
      case 'read only':
      case 'ghost':
      case 'bot':
      case 'sharp':
      case 'suspended':
        return '#dc3545'; // Red
      default: return '#6c757d'; // Grey
    }
  };

  const handleAgentChange = async (agentId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setNewCustomer(prev => ({ ...prev, agentId }));

    if (agentId) {
      const selectedAgent = agents.find(a => (a.id || a._id) === agentId);
      if (selectedAgent) {
        try {
          const { nextUsername } = await getNextUsername(selectedAgent.username, token);
          setNewCustomer(prev => ({ ...prev, username: nextUsername }));
        } catch (err) {
          console.error('Failed to get next username:', err);
        }
      }
    } else {
      setNewCustomer(prev => ({ ...prev, username: '' }));
    }
  };

  const updateAutoPassword = (firstName, lastName, phoneNumber) => {
    if (firstName && lastName && phoneNumber) {
      const last4 = phoneNumber.slice(-4);
      const first3First = firstName.slice(0, 3).toUpperCase();
      const first3Last = lastName.slice(0, 3).toUpperCase();
      const autoPass = `${first3First}${first3Last}${last4}`;
      setNewCustomer(prev => ({ ...prev, password: autoPass }));
    }
  };

  const handleFirstNameChange = (val) => {
    setNewCustomer(prev => {
      const updated = { ...prev, firstName: val };
      updateAutoPassword(val, updated.lastName, updated.phoneNumber);
      return updated;
    });
  };

  const handleLastNameChange = (val) => {
    setNewCustomer(prev => {
      const updated = { ...prev, lastName: val };
      updateAutoPassword(updated.firstName, val, updated.phoneNumber);
      return updated;
    });
  };

  const handlePhoneChange = (val) => {
    setNewCustomer(prev => {
      const updated = { ...prev, phoneNumber: val };
      updateAutoPassword(updated.firstName, updated.lastName, val);
      return updated;
    });
  };

  const formatBalance = (balance) => {
    if (balance === null || balance === undefined || balance === '') return '—';
    const num = Number(balance);
    if (Number.isNaN(num)) return '—';
    return `$${num.toFixed(2)}`;
  };

  const handleAdjustBalance = (customer) => {
    setBalanceForm({
      customerId: customer.id || customer._id,
      username: customer.username,
      currentBalance: customer.balance ?? 0,
      nextBalance: `${customer.balance ?? 0}`
    });
    setShowBalanceModal(true);
    setError('');
  };

  const handleConfirmBalanceUpdate = async (e) => {
    e.preventDefault();
    const { customerId, nextBalance: inputBalance } = balanceForm;
    const nextBalance = Number(inputBalance);

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
      setShowBalanceModal(false);
      setError('');
    } catch (err) {
      console.error('Balance update failed:', err);
      setError(err.message || 'Failed to update balance');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleAddon = async (customer, addonKey) => {
    const customerId = customer.id || customer._id;
    const currentSettings = customer.settings || {
      sports: true,
      casino: true,
      racebook: true,
      live: true,
      props: true,
      liveCasino: true
    };
    const updatedSettings = {
      ...currentSettings,
      [addonKey]: !currentSettings[addonKey]
    };

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      setActionLoadingId(customerId);
      const payload = { settings: updatedSettings };

      if (currentRole === 'agent') {
        await updateUserByAgent(customerId, payload, token);
      } else {
        await updateUserByAdmin(customerId, payload, token);
      }

      setCustomers(prev => prev.map(c => (
        (c.id || c._id) === customerId ? { ...c, settings: updatedSettings } : c
      )));
      setError('');
    } catch (err) {
      console.error('Addon toggle failed:', err);
      setError(err.message || 'Failed to toggle addon');
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
      balanceOwed: customer.balanceOwed || '0',
      apps: customer.apps || {
        venmo: '',
        cashapp: '',
        applePay: '',
        zelle: '',
        paypal: '',
        btc: '',
        other: ''
      }
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
    <div className="admin-view premium-admin-theme">
      <div className="view-header">
        <div className="header-icon-title">
          <div className="glow-accent"></div>
          <h2>Customer Administration</h2>
        </div>
        <button className="btn-create-premium" onClick={handleAddCustomer}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add New Customer
        </button>
      </div>

      <div className="view-content">
        {loading && <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading Elite Customers...</span>
        </div>}
        {error && <div className="error-state">{error}</div>}

        {!loading && !error && (
          <>
            <div className="premium-toolbar">
              <div className="toolbar-section">
                {currentRole !== 'agent' && (
                  <div className="t-group">
                    <label>Agent Assignment</label>
                    <div className="s-wrapper">
                      <select
                        value={newCustomer.agentId}
                        onChange={(e) => handleAgentChange(e.target.value)}
                      >
                        <option value="">Direct / Unassigned</option>
                        {agents.map(agent => (
                          <option key={agent.id || agent._id} value={agent.id || agent._id}>
                            {agent.username}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="t-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={newCustomer.username}
                    placeholder="Auto-generated"
                    readOnly
                    className="readonly-input"
                  />
                </div>
                <div className="t-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={newCustomer.firstName}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="t-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={newCustomer.lastName}
                    onChange={(e) => handleLastNameChange(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="toolbar-section">
                <div className="t-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={newCustomer.phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="User contact"
                  />
                </div>
                <div className="t-group">
                  <label>Password</label>
                  <input
                    type="text"
                    value={newCustomer.password}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Set password"
                  />
                </div>
                <div className="t-group small">
                  <label>Min bet:</label>
                  <input
                    type="number"
                    value={newCustomer.minBet}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, minBet: e.target.value }))}
                  />
                </div>
                <div className="t-group small">
                  <label>Max bet:</label>
                  <input
                    type="number"
                    value={newCustomer.maxBet}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, maxBet: e.target.value }))}
                  />
                </div>
                <div className="t-group small">
                  <label>Credit limit:</label>
                  <input
                    type="number"
                    value={newCustomer.creditLimit}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, creditLimit: e.target.value }))}
                  />
                </div>
                <button
                  className="btn-submit-premium"
                  onClick={handleCreateCustomer}
                  disabled={viewOnly || createLoading || !newCustomer.username || !newCustomer.phoneNumber}
                >
                  {createLoading ? 'Deploying...' : 'Create Customer'}
                </button>
              </div>
            </div>

            <div className="table-glass-container">
              {currentRole !== 'agent' && (
                <div className="table-actions">
                  <div className="filter-tab-group">
                    {['all', 'admin', 'agent'].map(f => (
                      <button
                        key={f}
                        className={`tab ${sourceFilter === f ? 'active' : ''}`}
                        onClick={() => setSourceFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="scroll-wrapper">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Access</th>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Min bet:</th>
                      <th>Max bet:</th>
                      <th>Credit limit:</th>
                      <th>Settle Limit:</th>
                      <th>Net Balance</th>
                      <th>Role/Status</th>
                      <th>Capabilities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr><td colSpan={11} className="empty-msg">No elite customers found in this sector.</td></tr>
                    ) : (
                      filteredCustomers.map(customer => {
                        const customerId = customer.id || customer._id;
                        return (
                          <tr key={customerId} className="customer-row">
                            <td className="user-cell">
                              <button className="user-link-btn" onClick={() => handleViewDetails(customer)}>
                                <div className="avatar-small">{customer.username.charAt(0).toUpperCase()}</div>
                                <span>{customer.username}</span>
                              </button>
                            </td>
                            <td className="pass-cell">{customer.rawPassword || '••••••••'}</td>
                            <td>{customer.firstName || '—'}</td>
                            <td>{customer.lastName || '—'}</td>
                            <td>{Number(customer.minBet || 1).toLocaleString()}</td>
                            <td>{Number(customer.maxBet || 5000).toLocaleString()}</td>
                            <td className="highlight-cell">{Number(customer.creditLimit || 1000).toLocaleString()}</td>
                            <td className="highlight-cell">{Number(customer.balanceOwed || 0).toLocaleString()}</td>
                            <td className={`balance-cell ${Number(customer.balance) < 0 ? 'neg' : 'pos'}`}>
                              <button onClick={() => handleAdjustBalance(customer)}>
                                {formatBalance(customer.balance)}
                              </button>
                            </td>
                            <td>
                              <div className="status-pill-container">
                                <select
                                  value={customer.status || 'active'}
                                  onChange={(e) => updateCustomerStatus(customerId, e.target.value)}
                                  disabled={actionLoadingId === customerId || viewOnly}
                                  className={`status-select ${customer.status || 'active'}`}
                                >
                                  <option value="active">Active</option>
                                  <option value="disabled">Disabled</option>
                                  <option value="suspended">Suspended</option>
                                  <option value="ghost">Ghost</option>
                                  <option value="bot">Bot</option>
                                </select>
                              </div>
                            </td>
                            <td>
                              <div className="capability-grid">
                                {[
                                  { key: 'sports', label: 'SB' },
                                  { key: 'casino', label: 'CV' },
                                  { key: 'racebook', label: 'RB' },
                                  { key: 'live', label: 'DL' },
                                  { key: 'props', label: 'PP' },
                                  { key: 'liveCasino', label: 'LC' }
                                ].map(addon => {
                                  const isEnabled = customer.settings?.[addon.key] ?? true;
                                  return (
                                    <button
                                      key={addon.key}
                                      className={`cap-tag ${isEnabled ? 'on' : 'off'}`}
                                      onClick={() => handleToggleAddon(customer, addon.key)}
                                      title={addon.label}
                                    >
                                      {addon.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* EDIT MODAL */}
      {
        showEditModal && (
          <div className="modal-overlay">
            <div className="modal-glass-content">
              <h3>Edit Customer: {selectedCustomer?.username}</h3>
              <form onSubmit={handleUpdateCustomer}>
                <div className="p-grid">
                  <div className="p-field">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={editForm.firstName}
                      onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                    />
                  </div>
                  <div className="p-field">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={editForm.lastName}
                      onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="p-field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phoneNumber}
                    onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="p-grid">
                  <div className="p-field">
                    <label>Min bet:</label>
                    <input
                      type="number"
                      value={editForm.minBet}
                      onChange={e => setEditForm({ ...editForm, minBet: e.target.value })}
                    />
                  </div>
                  <div className="p-field">
                    <label>Max bet:</label>
                    <input
                      type="number"
                      value={editForm.maxBet}
                      onChange={e => setEditForm({ ...editForm, maxBet: e.target.value })}
                    />
                  </div>
                </div>
                <div className="p-grid">
                  <div className="p-field">
                    <label>Credit limit:</label>
                    <input
                      type="number"
                      value={editForm.creditLimit}
                      onChange={e => setEditForm({ ...editForm, creditLimit: e.target.value })}
                    />
                  </div>
                  <div className="p-field">
                    <label>Settle Limit:</label>
                    <input
                      type="number"
                      value={editForm.balanceOwed}
                      onChange={e => setEditForm({ ...editForm, balanceOwed: e.target.value })}
                    />
                  </div>
                </div>
                <div className="p-field">
                  <label>New Password (leave blank to keep)</label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  />
                </div>

                <div className="payment-apps-section">
                  <h4 className="section-title">Payment Apps</h4>
                  <div className="p-grid">
                    <div className="p-field">
                      <label>Venmo</label>
                      <input
                        type="text"
                        value={editForm.apps.venmo}
                        onChange={e => setEditForm({ ...editForm, apps: { ...editForm.apps, venmo: e.target.value } })}
                        placeholder="@username"
                      />
                    </div>
                    <div className="p-field">
                      <label>Cashapp</label>
                      <input
                        type="text"
                        value={editForm.apps.cashapp}
                        onChange={e => setEditForm({ ...editForm, apps: { ...editForm.apps, cashapp: e.target.value } })}
                        placeholder="$cashtag"
                      />
                    </div>
                  </div>
                  <div className="p-grid">
                    <div className="p-field">
                      <label>Apple Pay</label>
                      <input
                        type="text"
                        value={editForm.apps.applePay}
                        onChange={e => setEditForm({ ...editForm, apps: { ...editForm.apps, applePay: e.target.value } })}
                        placeholder="Phone/Email"
                      />
                    </div>
                    <div className="p-field">
                      <label>Zelle</label>
                      <input
                        type="text"
                        value={editForm.apps.zelle}
                        onChange={e => setEditForm({ ...editForm, apps: { ...editForm.apps, zelle: e.target.value } })}
                        placeholder="Phone/Email"
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-premium-actions">
                  <button type="submit" className="btn-save-premium">Save Changes</button>
                  <button type="button" className="btn-cancel-premium" onClick={() => setShowEditModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* BALANCE MODAL */}
      {/* BALANCE MODAL */}
      {
        showBalanceModal && (
          <div className="modal-overlay">
            <div className="modal-glass-content">
              <h3>Adjust Balance: {balanceForm.username}</h3>
              <form onSubmit={handleConfirmBalanceUpdate}>
                <div className="premium-field-info">
                  <label>Current Net Balance</label>
                  <div className={`large-val ${balanceForm.currentBalance < 0 ? 'neg' : 'pos'}`}>
                    {formatBalance(balanceForm.currentBalance)}
                  </div>
                </div>

                <div className="p-field">
                  <label>New Net Balance</label>
                  <div className="input-with-symbol">
                    <span className="sym">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={balanceForm.nextBalance}
                      onChange={e => setBalanceForm({ ...balanceForm, nextBalance: e.target.value })}
                      autoFocus
                      required
                    />
                  </div>
                  <small className="field-hint">Setting a new net balance will adjust the credit/owed amount accordingly.</small>
                </div>

                <div className="modal-premium-actions">
                  <button type="submit" className="btn-save-premium" disabled={actionLoadingId !== null}>
                    {actionLoadingId !== null ? 'Updating...' : 'Confirm Adjustment'}
                  </button>
                  <button type="button" className="btn-cancel-premium" onClick={() => setShowBalanceModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      <style>{`
        .premium-admin-theme { 
          background: #0f172a; 
          min-height: 100vh; color: #f8fafc; 
          font-family: 'Inter', sans-serif;
          padding: 24px;
        }
        .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; border: none; padding: 0; }
        .header-icon-title { display: flex; align-items: center; gap: 16px; }
        .glow-accent { width: 8px; height: 32px; background: #3b82f6; border-radius: 4px; box-shadow: 0 0 15px #3b82f6; }
        .view-header h2 { font-size: 28px; font-weight: 800; margin: 0; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        
        .btn-create-premium {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white; border: none; padding: 12px 24px; border-radius: 12px;
          font-weight: 700; display: flex; align-items: center; gap: 10px;
          cursor: pointer; box-shadow: 0 10px 20px rgba(37,99,235,0.2);
          transition: all 0.2s;
        }
        .btn-create-premium:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(37,99,235,0.3); }

        .premium-toolbar {
          background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 20px;
          margin-bottom: 32px; backdrop-filter: blur(10px);
        }
        .toolbar-section { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; }
        .t-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 150px; }
        .t-group.small { flex: 0 1 100px; min-width: 80px; }
        .t-group label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.5px; }
        .t-group input, .t-group select {
          background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: white;
          padding: 10px 14px; border-radius: 8px; font-size: 14px; outline: none; transition: all 0.2s;
        }
        .t-group input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .readonly-input { background: rgba(0,0,0,0.2) !important; color: #64748b !important; }

        .btn-submit-premium {
          background: #f8fafc; color: #0f172a; border: none; padding: 12px 24px;
          border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .btn-submit-premium:hover { background: #fff; transform: scale(1.02); }

        .table-glass-container {
          background: rgba(30, 41, 59, 0.3); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px; padding: 20px;
        }
        .table-actions { margin-bottom: 20px; display: flex; justify-content: space-between; }
        .filter-tab-group { display: flex; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 10px; }
        .filter-tab-group .tab {
          background: none; border: none; color: #64748b; padding: 6px 16px;
          border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer; transition: all 0.2s;
        }
        .filter-tab-group .tab.active { background: #1e293b; color: #f8fafc; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }

        .scroll-wrapper { overflow-x: auto; }
        .premium-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
        .premium-table th { text-align: left; padding: 12px 16px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; }
        .customer-row { background: rgba(255,255,255,0.02); transition: all 0.2s; }
        .customer-row:hover { background: rgba(255,255,255,0.05); transform: translateY(-1px); }
        .customer-row td { padding: 16px; border-top: 1px solid rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.02); }
        .customer-row td:first-child { border-left: 1px solid rgba(255,255,255,0.02); border-radius: 12px 0 0 12px; }
        .customer-row td:last-child { border-right: 1px solid rgba(255,255,255,0.02); border-radius: 0 12px 12px 0; }

        .user-link-btn {
          background: none; border: none; display: flex; align-items: center; gap: 12px;
          color: #3b82f6; font-weight: 700; cursor: pointer; padding: 0;
        }
        .avatar-small {
          width: 32px; height: 32px; background: #334155; color: white;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; border: 2px solid rgba(59,130,246,0.3);
        }
        
        .highlight-cell { color: #10b981; font-weight: 700; }
        .balance-cell button {
          background: none; border: none; font-weight: 800; cursor: pointer;
          color: inherit; text-decoration: underline; text-decoration-style: dotted;
        }
        .balance-cell.pos { color: #10b981; }
        .balance-cell.neg { color: #ef4444; }

        .status-select {
          background: none; border: none; color: white; font-weight: 700;
          text-transform: uppercase; font-size: 10px; cursor: pointer; padding: 4px 8px;
          border-radius: 6px; min-width: 90px;
        }
        .status-select.active { background: rgba(16,185,129,0.1); color: #10b981; }
        .status-select.disabled, .status-select.suspended { background: rgba(239,68,68,0.1); color: #ef4444; }

        .capability-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
        .cap-tag {
          border: none; border-radius: 4px; padding: 2px 4px; font-size: 9px;
          font-weight: 800; cursor: pointer; transition: all 0.2s;
        }
        .cap-tag.on { background: #10b981; color: white; }
        .cap-tag.off { background: rgba(255,255,255,0.05); color: #64748b; }

        .loading-state { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .spinner { width: 40px; height: 40px; border: 4px solid rgba(59,130,246,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Modal Enhancements */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-glass-content { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; width: 100%; max-width: 650px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        .modal-glass-content h3 { margin: 0 0 24px 0; font-size: 20px; font-weight: 800; color: #fff; }
        
        .p-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .p-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .p-field label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.5px; }
        .p-field input { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: white; padding: 12px 16px; border-radius: 12px; font-size: 14px; outline: none; }
        .p-field input:focus { border-color: #3b82f6; }
        
        .modal-premium-actions { display: flex; gap: 12px; margin-top: 32px; }
        .btn-save-premium { flex: 2; background: #3b82f6; color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-save-premium:hover { background: #2563eb; transform: translateY(-1px); }
        .btn-cancel-premium { flex: 1; background: rgba(255,255,255,0.05); color: #94a3b8; border: none; padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        
        .premium-field-info { background: rgba(0,0,0,0.2); border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: center; }
        .premium-field-info label { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; font-weight: 800; }
        .large-val { font-size: 32px; font-weight: 900; }
        .input-with-symbol { position: relative; }
        .input-with-symbol .sym { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #64748b; font-weight: 700; }
        .input-with-symbol input { padding-left: 32px; width: 100%; font-size: 18px; font-weight: 800; }
        .field-hint { font-size: 12px; color: #64748b; margin-top: 4px; }
      `}</style>
    </div >
  );
}

export default CustomerAdminView;
