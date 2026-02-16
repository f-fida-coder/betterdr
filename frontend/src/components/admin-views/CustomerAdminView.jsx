import React, { useState, useEffect } from 'react';
import { createUserByAdmin, createPlayerByAgent, createAgent, createSubAgent, getAgents, getMyPlayers, getMe, updateUserCredit, updateUserBalanceOwedByAgent, resetUserPasswordByAdmin, updateUserByAdmin, updateUserByAgent, getUserStatistics, getNextUsername, getUsersAdmin } from '../../api';

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
    minBet: '',
    maxBet: '',
    creditLimit: '1000',
    balanceOwed: '0',
    defaultMinBet: '25',
    defaultMaxBet: '200',
    defaultCreditLimit: '1000',
    defaultSettleLimit: '0',
    agentPrefix: '',
    parentAgentId: ''
  });
  const [creationType, setCreationType] = useState('player'); // player, agent, super_agent
  const [currentRole, setCurrentRole] = useState('admin');
  const [viewOnly, setViewOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('player'); // player, agent, master
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    phoneNumber: '',
    firstName: '',
    lastName: '',
    fullName: '',
    password: '',
    minBet: '25',
    maxBet: '200',
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

  const [assignmentSource, setAssignmentSource] = useState('admin'); // 'admin' or 'agent' (or 'master' for agent creation)
  const [listFilterOrigin, setListFilterOrigin] = useState('all'); // 'all', 'admin', 'upline'
  const [listFilterUplineId, setListFilterUplineId] = useState('');
  const [adminUsername, setAdminUsername] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setCustomers([]);
          setError('Please login to load users.');
          return;
        }
        const me = await getMe(token);
        setCurrentRole(me?.role || 'admin');
        setAdminUsername(me?.username || '');
        setViewOnly(Boolean(me?.viewOnly));

        if ((me?.role || 'admin') === 'agent') {
          const data = await getMyPlayers(token);
          setCustomers(data || []);
          // Also fetch next username for agent
          if (me?.username) {
            const { nextUsername } = await getNextUsername(me.username, token, { type: 'player' });
            setNewCustomer(prev => ({ ...prev, username: nextUsername }));
          }
        } else {
          const data = await getUsersAdmin(token);
          setCustomers(data || []);
          const agentsData = await getAgents(token);
          setAgents(agentsData || []);
          // Fetch next username for admin (direct)
          if (me?.username) {
            const { nextUsername } = await getNextUsername(me.username, token, { type: 'player' });
            setNewCustomer(prev => ({ ...prev, username: nextUsername }));
          }
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
        setError('Please login to create users.');
        return;
      }
      const payload = { ...newCustomer };
      if (payload.balance === '') delete payload.balance;

      if (creationType === 'player') {
        if (currentRole === 'agent' || currentRole === 'super_agent') {
          await createPlayerByAgent(payload, token);
        } else {
          await createUserByAdmin(payload, token);
        }
      } else if (creationType === 'agent') {
        if (currentRole === 'admin') {
          // Admin creating standard Agent
          await createAgent({ ...payload, role: 'agent' }, token);
        } else {
          // Super Agent creating Sub-Agent
          await createSubAgent(payload, token);
        }
      } else if (creationType === 'super_agent') {
        // Admin creating Master Agent
        await createAgent({ ...payload, role: 'super_agent' }, token);
      }

      alert(`${creationType === 'player' ? 'Player' : creationType === 'agent' ? 'Agent' : 'Master Agent'} initialized successfully!`);

      const cleanState = {
        username: '',
        phoneNumber: '',
        password: '',
        firstName: '',
        lastName: '',
        fullName: '',
        agentId: '',
        balance: '',
        minBet: '',
        maxBet: '',
        creditLimit: '1000',
        balanceOwed: '0',
        defaultMinBet: '25',
        defaultMaxBet: '200',
        defaultCreditLimit: '1000',
        defaultSettleLimit: '0',
        agentPrefix: '',
        parentAgentId: ''
      };

      // Reset form state first
      setNewCustomer(cleanState);
      setCreationType('player');

      // Then fetch next username for reset state (default: admin direct)
      if (adminUsername) {
        try {
          const { nextUsername } = await getNextUsername(adminUsername, token, { type: 'player' });
          setNewCustomer(prev => ({ ...prev, username: nextUsername }));
        } catch (e) {
          console.error("Failed to refresh username after create", e);
        }
      }

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

  const handlePrefixChange = async (prefix) => {
    const formatted = prefix.toUpperCase();
    setNewCustomer(prev => ({ ...prev, agentPrefix: formatted }));

    if (formatted.length >= 2) {
      const token = localStorage.getItem('token');
      const suffix = creationType === 'super_agent' ? 'MA' : '';
      try {
        const { nextUsername } = await getNextUsername(formatted, token, { suffix, type: 'agent' });
        setNewCustomer(prev => ({ ...prev, username: nextUsername }));
      } catch (err) {
        console.error('Failed to get next username from prefix:', err);
      }
    } else {
      setNewCustomer(prev => ({ ...prev, username: '' }));
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
          const { nextUsername } = await getNextUsername(selectedAgent.username, token, { type: 'player' });
          setNewCustomer(prev => ({ ...prev, username: nextUsername }));
        } catch (err) {
          console.error('Failed to get next username:', err);
        }
      }
    } else {
      // Direct assignment - use admin username
      if (adminUsername) {
        try {
          const { nextUsername } = await getNextUsername(adminUsername, token, { type: 'player' });
          setNewCustomer(prev => ({ ...prev, username: nextUsername }));
        } catch (err) {
          console.error('Failed to fetch username for admin:', err);
          setNewCustomer(prev => ({ ...prev, username: '' }));
        }
      } else {
        setNewCustomer(prev => ({ ...prev, username: '' }));
      }
    }
  };

  const handleCreationTypeChange = async (type) => {
    setCreationType(type);
    const token = localStorage.getItem('token');
    if (!token) return;

    if (type === 'super_agent' || type === 'agent') {
      // If admin is creating an agent, force assignmentSource to 'agent' (super agent)
      if (type === 'agent' && currentRole === 'admin') {
        setAssignmentSource('agent');
      }

      const suffix = type === 'super_agent' ? 'MA' : '';
      const prefixToUse = (currentRole === 'super_agent' && type === 'agent') ? adminUsername : newCustomer.agentPrefix;
      // ONLY Admin-created top-level Agents/MA start at 247. Sub-agents (created by MA) start at 101.
      const sequenceType = (currentRole === 'admin') ? 'agent' : 'player';

      if (prefixToUse) {
        try {
          const { nextUsername } = await getNextUsername(prefixToUse, token, { suffix, type: sequenceType });
          setNewCustomer(prev => ({ ...prev, username: nextUsername, agentPrefix: prefixToUse }));
        } catch (e) {
          console.error("Failed to re-fetch username on type change", e);
        }
      } else {
        setNewCustomer(prev => ({ ...prev, username: '' }));
      }
    } else {
      // Player
      setAssignmentSource('admin');
      handleAgentChange(''); // Reset to direct
    }
  };

  const updateAutoPassword = (firstName, lastName, phoneNumber) => {
    if (firstName && lastName && phoneNumber) {
      const last4 = phoneNumber.slice(-4);
      const first3First = firstName.slice(0, 3).toUpperCase();
      const first3Last = lastName.slice(0, 3).toUpperCase();
      const autoPass = `${first3First}${first3Last}${last4}`.toUpperCase();
      setNewCustomer(prev => ({ ...prev, password: autoPass }));
    }
  };

  const handleFirstNameChange = (val) => {
    // "always capatalized": Force ALL CAPS based on user feedback "like the passwords"
    const formatted = val.toUpperCase();

    setNewCustomer(prev => {
      const updated = { ...prev, firstName: formatted };
      updateAutoPassword(formatted, updated.lastName, updated.phoneNumber);
      return updated;
    });
  };

  const handleLastNameChange = (val) => {
    const formatted = val.toUpperCase();
    setNewCustomer(prev => {
      const updated = { ...prev, lastName: formatted };
      updateAutoPassword(updated.firstName, formatted, updated.phoneNumber);
      return updated;
    });
  };

  const handlePhoneChange = (val) => {
    // Remove all non-numeric characters
    const numeric = val.replace(/\D/g, '');
    let formatted = numeric;

    // Format as US phone: XXX-XXX-XXXX
    if (numeric.length > 0) {
      if (numeric.length <= 3) {
        formatted = numeric;
      } else if (numeric.length <= 6) {
        formatted = `${numeric.slice(0, 3)}-${numeric.slice(3)}`;
      } else {
        formatted = `${numeric.slice(0, 3)}-${numeric.slice(3, 6)}-${numeric.slice(6, 10)}`;
      }
    }

    setNewCustomer(prev => {
      const updated = { ...prev, phoneNumber: formatted };
      updateAutoPassword(updated.firstName, updated.lastName, formatted);
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
      minBet: customer.minBet || '25',
      maxBet: customer.maxBet || '200',
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

  const filteredCustomers = (() => {
    let result = [];
    if (sourceFilter === 'player') {
      result = customers;
      // Filter by Origin
      if (listFilterOrigin === 'admin') {
        result = result.filter(c => !c.agentId); // Direct from Admin
      } else if (listFilterOrigin === 'upline') {
        result = result.filter(c => c.agentId); // Created by Agent
        if (listFilterUplineId) {
          result = result.filter(c => c.agentId === listFilterUplineId);
        }
      }
    } else if (sourceFilter === 'agent') {
      result = agents.filter(a => a.role === 'agent');
      // Filter by Origin
      if (listFilterOrigin === 'admin') {
        result = result.filter(a => a.createdByModel === 'Admin');
      } else if (listFilterOrigin === 'upline') {
        result = result.filter(a => a.createdByModel === 'Agent'); // Created by Master Agent
        if (listFilterUplineId) {
          result = result.filter(a => a.createdBy === listFilterUplineId);
        }
      }
    } else if (sourceFilter === 'master') {
      result = agents.filter(a => a.role === 'super_agent');
      // Filter by Origin
      if (listFilterOrigin === 'admin') {
        result = result.filter(a => a.createdByModel === 'Admin');
      } else if (listFilterOrigin === 'upline') {
        result = result.filter(a => a.createdByModel === 'Agent'); // Created by Master Agent (if hierarchy allows MA to create MA)
        if (listFilterUplineId) {
          result = result.filter(a => a.createdBy === listFilterUplineId);
        }
      }
    }
    return result;
  })();

  const handleViewDetails = (customer) => {
    if (onViewChange) {
      onViewChange('user-details', customer.id || customer._id);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <div className="header-icon-title">
          <div className="glow-accent"></div>
          <h2>Administration Console</h2>
        </div>
        <button className="btn-create-premium" onClick={handleAddCustomer}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Initialize New Entry
        </button>
      </div>

      <div className="view-content">
        {loading && <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading Entries...</span>
        </div>}
        {error && <div className="error-state">{error}</div>}

        {!loading && !error && (
          <>
            <div className="filter-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', alignItems: 'end' }}>
              <div className="filter-group">
                <label>Type</label>
                <div className="s-wrapper">
                  <select
                    value={creationType}
                    onChange={(e) => handleCreationTypeChange(e.target.value)}
                  >
                    <option value="player">Player</option>
                    {currentRole === 'super_agent' && (
                      <option value="agent">Agent</option>
                    )}
                    {currentRole === 'admin' && (
                      <>
                        <option value="agent">Agent</option>
                        <option value="super_agent">Master Agent</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Player Creation - Source Selection */}
              {creationType === 'player' && currentRole !== 'agent' && (
                <div className="filter-group">
                  <label>Created By</label>
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: assignmentSource === 'admin' ? '#fff' : '#888' }}>
                      <input
                        type="radio"
                        name="source"
                        checked={assignmentSource === 'admin'}
                        onChange={() => {
                          setAssignmentSource('admin');
                          handleAgentChange(''); // Set to direct
                        }}
                      /> Admin
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: assignmentSource === 'agent' ? '#fff' : '#888' }}>
                      <input
                        type="radio"
                        name="source"
                        checked={assignmentSource === 'agent'}
                        onChange={() => {
                          setAssignmentSource('agent');
                          // If agents list has items, default to first? No, let user pick.
                        }}
                      /> Agent
                    </label>
                  </div>

                  {assignmentSource === 'admin' ? (
                    <div className="s-wrapper">
                      <input type="text" value={`Admin: ${adminUsername}`} readOnly className="readonly-input" />
                    </div>
                  ) : (
                    <div className="s-wrapper">
                      <select
                        value={newCustomer.agentId}
                        onChange={(e) => handleAgentChange(e.target.value)}
                      >
                        <option value="">Select Agent...</option>
                        {agents.map(agent => (
                          <option key={agent.id || agent._id} value={agent.id || agent._id}>
                            {agent.username}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Agent/Master Agent Creation - Source Selection */}
              {(creationType === 'agent' || creationType === 'super_agent') && currentRole === 'admin' && (
                <div className="filter-group">
                  <label>Created By</label>
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                    {creationType === 'super_agent' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: assignmentSource === 'admin' ? '#fff' : '#888' }}>
                        <input
                          type="radio"
                          name="ma_source"
                          checked={assignmentSource === 'admin'}
                          onChange={() => {
                            setAssignmentSource('admin');
                            setNewCustomer(prev => ({ ...prev, parentAgentId: '' }));
                          }}
                        /> Admin
                      </label>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: assignmentSource === 'agent' ? '#fff' : '#888' }}>
                      <input
                        type="radio"
                        name="ma_source"
                        checked={assignmentSource === 'agent'}
                        onChange={() => {
                          setAssignmentSource('agent');
                        }}
                      /> Master Agent
                    </label>
                  </div>

                  {assignmentSource === 'admin' ? (
                    <div className="s-wrapper">
                      <input type="text" value={`Admin: ${adminUsername}`} readOnly className="readonly-input" />
                    </div>
                  ) : (
                    <div className="s-wrapper">
                      <select
                        value={newCustomer.parentAgentId}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, parentAgentId: e.target.value }))}
                      >
                        <option value="">Select Master Agent...</option>
                        {agents.filter(a => a.role === 'master_agent').map(ma => (
                          <option key={ma.id || ma._id} value={ma.id || ma._id}>
                            {ma.username} (Master Agent)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              {(creationType === 'agent' || creationType === 'super_agent') && (currentRole !== 'super_agent' || creationType === 'super_agent') && (
                <div className="filter-group">
                  <label>Prefix</label>
                  <input
                    type="text"
                    value={newCustomer.agentPrefix}
                    onChange={(e) => handlePrefixChange(e.target.value)}
                    placeholder="Enter prefix"
                    maxLength={5}
                  />
                </div>
              )}

              <div className="filter-group">
                <label>Username</label>
                <input
                  type="text"
                  value={newCustomer.username}
                  placeholder="Auto-generated"
                  readOnly
                  className="readonly-input"
                />
              </div>
              <div className="filter-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={newCustomer.phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="User contact"
                />
              </div>
              <div className="filter-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={newCustomer.firstName}
                  onChange={(e) => handleFirstNameChange(e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div className="filter-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={newCustomer.lastName}
                  onChange={(e) => handleLastNameChange(e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
              <div className="filter-group">
                <label>Password</label>
                <input
                  type="text"
                  value={newCustomer.password.toUpperCase()}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, password: e.target.value.toUpperCase() }))}
                  placeholder="Set password"
                />
              </div>
              {creationType === 'player' && (
                <>
                  <div className="filter-group">
                    <label>Min bet:</label>
                    <input
                      type="number"
                      value={newCustomer.minBet}
                      placeholder="25"
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, minBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Max bet:</label>
                    <input
                      type="number"
                      value={newCustomer.maxBet}
                      placeholder="200"
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, maxBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Credit limit:</label>
                    <input
                      type="number"
                      value={newCustomer.creditLimit}
                      placeholder="1000"
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, creditLimit: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Settle limit:</label>
                    <input
                      type="number"
                      value={newCustomer.balanceOwed}
                      placeholder="0"
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, balanceOwed: e.target.value }))}
                    />
                  </div>
                </>
              )}
              {(creationType === 'agent' || creationType === 'super_agent') && (
                <>
                  <div className="filter-group">
                    <label>Min bet: (Standard)</label>
                    <input
                      type="number"
                      value={newCustomer.defaultMinBet}
                      placeholder="25"
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, defaultMinBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Max bet: (Standard)</label>
                    <input
                      type="number"
                      value={newCustomer.defaultMaxBet}
                      placeholder="200"
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, defaultMaxBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Credit limit: (Standard)</label>
                    <input
                      type="number"
                      value={newCustomer.defaultCreditLimit}
                      placeholder="1000"
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, defaultCreditLimit: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Settle limit: (Standard)</label>
                    <input
                      type="number"
                      value={newCustomer.defaultSettleLimit}
                      placeholder="0"
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, defaultSettleLimit: e.target.value }))}
                    />
                  </div>
                </>
              )}
              <div className="filter-group" style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleCreateCustomer}
                  disabled={viewOnly || createLoading || !newCustomer.username || !newCustomer.phoneNumber}
                >
                  {createLoading ? 'Deploying...' : `Create ${creationType === 'player' ? 'Player' : creationType === 'agent' ? 'Agent' : 'Master Agent'}`}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ backgroundColor: '#17a2b8', color: 'white', flex: 0.5 }}
                  onClick={() => {
                    const pass = newCustomer.password || (() => {
                      const last4 = (newCustomer.phoneNumber || '').replace(/\D/g, '').slice(-4);
                      const f3 = (newCustomer.firstName || '').slice(0, 3).toUpperCase();
                      const l3 = (newCustomer.lastName || '').slice(0, 3).toUpperCase();
                      return `${f3}${l3}${last4}`;
                    })();

                    let info = '';
                    if (creationType === 'player') {
                      info = `Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${newCustomer.username}
Password: ${pass}
Min bet: $${newCustomer.minBet || 25}
Max bet: $${newCustomer.maxBet || 200}
Credit: $${newCustomer.creditLimit || 1000}


PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. Settle up’s are +/-$200 so anything under $200 will push to the following week. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you’ll be required to settle your balance even if it’s under $200. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so we can get everyone paid quickly and as smoothly as possible. If you can’t pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send. 

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don’t respond or don’t pay on time or in full then you will be shown the same reciprocation when it comes to payouts. 

REFFERALS
$200 freeplay bonuses for any ACTIVE  and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vise versa. In order for you to get your free play bonus your refferal must go through one settle up of $200.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We’ve heard them all so don’t waste your time. 

FREEPLAY
I start all NEW players off with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. (This is to prevent everyone who abuses the free play to win free money and leave). When you place a bet you have to click “Use your freeplay balance $” (If you don’t you’re using your own money). Since we are very generous with freeplay unfortunately it is limited to straight bets only and no parlays. I offer 20% free play to anyone above settle to roll your balance to limit transactions. If you chose to roll for free play you must be actively betting with your own money or your free play will not count. 

I need active players so if you could do me a solid and place a bet today even if it’s with freeplay. Good luck! Lmk that you’ve read all the rules and or if you have any questions and need me to adjust anything!
`;
                    } else {
                      const typeLabel = creationType === 'agent' ? 'Agent' : 'Master Agent';
                      info = `Welcome to the team! Here’s your ${typeLabel} administrative account info.

Login: ${newCustomer.username}
Password: ${pass}

Standard Min bet: $${newCustomer.defaultMinBet || 25}
Standard Max bet: $${newCustomer.defaultMaxBet || 200}
Standard Credit: $${newCustomer.defaultCreditLimit || 1000}

Please ensure you manage your sectors responsibly and maintain clear communication with your assigned accounts. Good luck!
`;
                    }
                    navigator.clipboard.writeText(info).then(() => alert('Copied to clipboard!'));
                  }}
                >
                  Copy Info
                </button>
              </div>
            </div>

            <div className="table-container">
              {currentRole !== 'agent' && (
                <div className="table-actions" style={{ flexDirection: 'column', gap: '15px' }}>
                  {/* List Filters */}
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="filter-tab-group">
                      <button
                        className={`tab ${listFilterOrigin === 'all' ? 'active' : ''}`}
                        onClick={() => { setListFilterOrigin('all'); setListFilterUplineId(''); }}
                      >
                        All Sources
                      </button>
                      <button
                        className={`tab ${listFilterOrigin === 'admin' ? 'active' : ''}`}
                        onClick={() => { setListFilterOrigin('admin'); setListFilterUplineId(''); }}
                      >
                        By Admin
                      </button>
                      <button
                        className={`tab ${listFilterOrigin === 'upline' ? 'active' : ''}`}
                        onClick={() => { setListFilterOrigin('upline'); setListFilterUplineId(''); }}
                      >
                        {sourceFilter === 'player' ? 'By Agent' : 'By Master Agent'}
                      </button>
                    </div>

                    {/* Specific Upline Dropdown */}
                    {listFilterOrigin === 'upline' && (
                      <div className="s-wrapper" style={{ minWidth: '200px' }}>
                        <select
                          value={listFilterUplineId}
                          onChange={(e) => setListFilterUplineId(e.target.value)}
                          style={{ padding: '8px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }}
                        >
                          <option value="">
                            All {sourceFilter === 'player' ? 'Agents' : 'Master Agents'}
                          </option>
                          {sourceFilter === 'player'
                            ? agents.filter(a => a.role === 'agent' || a.role === 'master_agent').map(a => (
                              <option key={a.id || a._id} value={a.id || a._id}>{a.username}</option>
                            ))
                            : agents.filter(a => a.role === 'master_agent').map(ma => (
                              <option key={ma.id || ma._id} value={ma.id || ma._id}>{ma.username}</option>
                            ))
                          }
                        </select>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <div className="filter-tab-group">
                      {[
                        { id: 'player', label: 'Player' },
                        { id: 'agent', label: 'Agent' },
                        { id: 'master', label: 'Master' }
                      ].map(f => (
                        <button
                          key={f.id}
                          className={`tab ${sourceFilter === f.id ? 'active' : ''}`}
                          onClick={() => setSourceFilter(f.id)}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="scroll-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Identity</th>
                      <th>Access</th>
                      <th>{sourceFilter === 'player' ? 'First Name' : 'Full Name'}</th>
                      <th>{sourceFilter === 'player' ? 'Last Name' : 'Contact'}</th>
                      <th>{sourceFilter === 'player' ? 'Min bet' : 'Users'}</th>
                      <th>{sourceFilter === 'player' ? 'Max bet' : 'Agents'}</th>
                      <th>Credit Limit</th>
                      <th>Settle Limit</th>
                      <th>Net Balance</th>
                      <th>Status</th>
                      <th>Roles & Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr><td colSpan={11} className="empty-msg">No records found.</td></tr>
                    ) : (
                      filteredCustomers.map(customer => {
                        const customerId = customer.id || customer._id;
                        return (
                          <tr key={customerId} className={`customer-row role-${customer.role}`}>
                            <td className="user-cell">
                              <button className="user-link-btn" onClick={() => handleViewDetails(customer)}>
                                <div className={`avatar-small role-${customer.role}`}>{customer.username.charAt(0).toUpperCase()}</div>
                                <span>{customer.username.toUpperCase()}</span>
                              </button>
                            </td>
                            <td className="pass-cell">{customer.rawPassword || '••••••••'}</td>
                            <td>{customer.role === 'user' ? (customer.firstName || '—') : (customer.fullName || '—')}</td>
                            <td>{customer.role === 'user' ? (customer.lastName || '—') : (customer.phoneNumber || '—')}</td>
                            <td>{customer.role === 'user' ? Number(customer.minBet || 25).toLocaleString() : (customer.userCount || 0)}</td>
                            <td>{customer.role === 'user' ? Number(customer.maxBet || 200).toLocaleString() : (customer.subAgentCount || 0)}</td>
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
                                  {customer.role === 'user' && (
                                    <>
                                      <option value="ghost">Ghost</option>
                                      <option value="bot">Bot</option>
                                      <option value="sharp">Sharp</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </td>
                            <td>
                              <div className="hierarchy-info">
                                <span className={`role-badge ${customer.role}`}>
                                  {customer.role === 'super_agent' ? 'Master' : customer.role === 'agent' ? 'Agent' : 'Player'}
                                </span>
                                {customer.role === 'user' && (
                                  <div className="capability-mini-grid">
                                    {['sports', 'casino', 'racebook', 'live', 'props', 'liveCasino'].map(key => {
                                      const isEnabled = customer.settings?.[key] ?? true;
                                      return isEnabled ? <span key={key} className="cap-dot" title={key}></span> : null;
                                    })}
                                  </div>
                                )}
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


            {/* EDIT MODAL */}
            {
              showEditModal && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <h3>Edit {selectedCustomer?.role === 'user' ? 'Player' : selectedCustomer?.role === 'agent' ? 'Agent' : 'Master Agent'}: {selectedCustomer?.username}</h3>
                    <form onSubmit={handleUpdateCustomer}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                          <label>Min bet:</label>
                          <input
                            type="number"
                            value={editForm.minBet}
                            onChange={e => setEditForm({ ...editForm, minBet: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Max bet:</label>
                          <input
                            type="number"
                            value={editForm.maxBet}
                            onChange={e => setEditForm({ ...editForm, maxBet: e.target.value })}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                          <label>Credit limit:</label>
                          <input
                            type="number"
                            value={editForm.creditLimit}
                            onChange={e => setEditForm({ ...editForm, creditLimit: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Settle Limit:</label>
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

                      <div className="payment-apps-section">
                        <h4 className="section-title" style={{ color: '#0d3b5c', marginBottom: '15px' }}>Payment Apps</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <div className="form-group">
                            <label>Venmo</label>
                            <input
                              type="text"
                              value={editForm.apps.venmo}
                              onChange={e => setEditForm({ ...editForm, apps: { ...editForm.apps, venmo: e.target.value } })}
                              placeholder="@username"
                            />
                          </div>
                          <div className="form-group">
                            <label>Cashapp</label>
                            <input
                              type="text"
                              value={editForm.apps.cashapp}
                              onChange={e => setEditForm({ ...editForm, apps: { ...editForm.apps, cashapp: e.target.value } })}
                              placeholder="$cashtag"
                            />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <div className="form-group">
                            <label>Apple Pay</label>
                            <input
                              type="text"
                              value={editForm.apps.applePay}
                              onChange={e => setEditForm({ ...editForm, apps: { ...editForm.apps, applePay: e.target.value } })}
                              placeholder="Phone/Email"
                            />
                          </div>
                          <div className="form-group">
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

                      <div className="form-actions">
                        <button type="submit" className="btn-primary">Save Changes</button>
                        <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ marginLeft: 'auto', backgroundColor: '#17a2b8', color: 'white' }}
                          onClick={() => {
                            const pass = editForm.password || (() => {
                              const last4 = editForm.phoneNumber.replace(/\D/g, '').slice(-4);
                              const f3 = editForm.firstName.slice(0, 3).toUpperCase();
                              const l3 = editForm.lastName.slice(0, 3).toUpperCase();
                              return `${f3}${l3}${last4}`;
                            })();

                            const info = `Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${editForm.username || selectedCustomer.username}
Password: ${pass}
Min bet: $${editForm.minBet}
Max bet: $${editForm.maxBet}
Credit: $${editForm.creditLimit}


PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. Settle up’s are +/-$200 so anything under $200 will push to the following week. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you’ll be required to settle your balance even if it’s under $200. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so we can get everyone paid quickly and as smoothly as possible. If you can’t pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send. 

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don’t respond or don’t pay on time or in full then you will be shown the same reciprocation when it comes to payouts. 

REFFERALS
$200 freeplay bonuses for any ACTIVE  and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vise versa. In order for you to get your free play bonus your refferal must go through one settle up of $200.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We’ve heard them all so don’t waste your time. 

FREEPLAY
I start all NEW players off with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. (This is to prevent everyone who abuses the free play to win free money and leave). When you place a bet you have to click “Use your freeplay balance $” (If you don’t you’re using your own money). Since we are very generous with freeplay unfortunately it is limited to straight bets only and no parlays. I offer 20% free play to anyone above settle to roll your balance to limit transactions. If you chose to roll for free play you must be actively betting with your own money or your free play will not count. 

I need active players so if you could do me a solid and place a bet today even if it’s with freeplay. Good luck! Lmk that you’ve read all the rules and or if you have any questions and need me to adjust anything!
`;
                            navigator.clipboard.writeText(info).then(() => alert('Copied to clipboard!'));
                          }}
                        >
                          Copy Info
                        </button>
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

        /* Role Colors & Badges */
        .role-user { border-left: 3px solid #3b82f6; }
        .role-agent { border-left: 3px solid #10b981; }
        .role-super_agent { border-left: 3px solid #eab308; }

        .avatar-small.role-agent { border-color: #10b981; background: rgba(16,185,129,0.1); }
        .avatar-small.role-super_agent { border-color: #eab308; background: rgba(234,179,8,0.1); }

        .role-badge {
          display: inline-block; padding: 2px 8px; border-radius: 6px;
          font-size: 10px; font-weight: 800; text-transform: uppercase;
          margin-bottom: 4px;
        }
        .role-badge.user { background: rgba(59,130,246,0.1); color: #3b82f6; }
        .role-badge.agent { background: rgba(16,185,129,0.1); color: #10b981; }
        .role-badge.super_agent { background: rgba(234,179,8,0.1); color: #eab308; }

        .hierarchy-info { display: flex; flex-direction: column; gap: 4px; }
        .capability-mini-grid { display: flex; gap: 4px; }
        .cap-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }

      `}</style>
          </>
        )}
      </div>
    </div>
  );
}

export default CustomerAdminView;
