import React, { useState, useEffect, useMemo } from 'react';
import { createUserByAdmin, createPlayerByAgent, createAgent, createSubAgent, getAgents, getMyPlayers, getMe, updateUserCredit, updateUserBalanceOwedByAgent, resetUserPasswordByAdmin, updateUserByAdmin, updateUserByAgent, getUserStatistics, getNextUsername, getUsersAdmin, deleteUser, deleteAgent } from '../../api';

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
    referredByUserId: '',
    balance: '',
    minBet: '25',
    maxBet: '200',
    creditLimit: '1000',
    balanceOwed: '200',
    defaultMinBet: '25',
    defaultMaxBet: '200',
    defaultCreditLimit: '1000',
    defaultSettleLimit: '200',
    agentPrefix: '',
    parentAgentId: ''
  });
  const [creationType, setCreationType] = useState('player'); // player, agent, super_agent
  const [currentRole, setCurrentRole] = useState('admin');
  const [viewOnly, setViewOnly] = useState(false);
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
  const [bulkEditType, setBulkEditType] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [rowAddonDrafts, setRowAddonDrafts] = useState({});
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [expandedEditRowId, setExpandedEditRowId] = useState(null);
  const [rowDetailDrafts, setRowDetailDrafts] = useState({});
  const [headerAgentQuery, setHeaderAgentQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [headerAgentOpen, setHeaderAgentOpen] = useState(false);
  const [selectedHeaderAgentId, setSelectedHeaderAgentId] = useState('');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [agentSearchOpen, setAgentSearchOpen] = useState(false);
  const [quickEditModal, setQuickEditModal] = useState({
    open: false,
    type: '',
    customerId: null,
    username: '',
    value: ''
  });


  const [adminUsername, setAdminUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          setCustomers([]);
          setError('Please login to load users.');
          return;
        }
        const me = await getMe(token);
        setCurrentRole(me?.role || 'admin');
        setAdminUsername(me?.username || '');
        setCurrentUserId(me?.id || me?._id || '');
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
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Please login to create users.');
        return;
      }
      const requiredIdentityMissing =
        !String(newCustomer.username || '').trim() ||
        !String(newCustomer.firstName || '').trim() ||
        !String(newCustomer.lastName || '').trim() ||
        !String(newCustomer.phoneNumber || '').trim() ||
        !String(newCustomer.password || '').trim();

      if (requiredIdentityMissing) {
        setError('Username, first name, last name, phone number, and password are required.');
        return;
      }

      if (creationType === 'player') {
        const requiredLimitsMissing =
          String(newCustomer.minBet ?? '').trim() === '' ||
          String(newCustomer.maxBet ?? '').trim() === '' ||
          String(newCustomer.creditLimit ?? '').trim() === '' ||
          String(newCustomer.balanceOwed ?? '').trim() === '';
        if (requiredLimitsMissing) {
          setError('Min bet, max bet, credit limit, and settle limit are required for players.');
          return;
        }
      }

      const payload = { ...newCustomer };
      if (payload.balance === '') delete payload.balance;
      if (!payload.referredByUserId) delete payload.referredByUserId;
      if ((creationType === 'agent' || creationType === 'super_agent') && payload.agentId) {
        payload.parentAgentId = payload.agentId;
      }

      if (creationType === 'player') {
        if (currentRole === 'agent' || currentRole === 'super_agent' || currentRole === 'master_agent') {
          await createPlayerByAgent(payload, token);
        } else {
          await createUserByAdmin(payload, token);
        }
      } else if (creationType === 'agent') {
        if (currentRole === 'admin') {
          // Admin creating standard Agent
          await createAgent({ ...payload, role: 'agent' }, token);
        } else {
          // Super Agent creating Sub-Agent (Agent)
          await createSubAgent({ ...payload, role: 'agent' }, token);
        }
      } else if (creationType === 'super_agent') {
        if (currentRole === 'admin') {
          // Admin creating Master Agent
          await createAgent({ ...payload, role: 'master_agent' }, token); // Changed to master_agent for consistency if supported, or 'super_agent'
        } else {
          // Super Agent creating Sub-Master Agent
          await createSubAgent({ ...payload, role: 'master_agent' }, token);
        }
      }

      alert(`${creationType === 'player' ? 'Player' : creationType === 'agent' ? 'Agent' : 'Master Agent'} initialized successfully!`);

      const createdType = creationType;
      const cleanState = {
        username: '',
        phoneNumber: '',
        password: '',
        firstName: '',
        lastName: '',
        fullName: '',
        agentId: '',
        referredByUserId: '',
        balance: '',
        minBet: '',
        maxBet: '',
        creditLimit: '',
        balanceOwed: '',
        defaultMinBet: '',
        defaultMaxBet: '',
        defaultCreditLimit: '',
        defaultSettleLimit: '',
        agentPrefix: '',
        parentAgentId: ''
      };

      setNewCustomer(cleanState);
      setCreationType(createdType);
      setAgentSearchQuery('');
      setAgentSearchOpen(false);

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
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    setNewCustomer(prev => ({ ...prev, agentId, referredByUserId: '' }));
    const sequenceType = (creationType === 'player') ? 'player' : 'agent';
    const suffix = (creationType === 'super_agent') ? 'MA' : '';

    if (agentId) {
      const selectedAgent = agents.find(a => (a.id || a._id) === agentId);
      if (selectedAgent) {
        setAgentSearchQuery(selectedAgent.username || '');
        try {
          const { nextUsername } = await getNextUsername(selectedAgent.username, token, { suffix, type: sequenceType });
          setNewCustomer(prev => ({ ...prev, username: nextUsername }));
        } catch (err) {
          console.error('Failed to get next username:', err);
        }
      }
    } else {
      setAgentSearchQuery('');
      // Direct assignment - use admin username
      if (adminUsername) {
        try {
          const { nextUsername } = await getNextUsername(adminUsername, token, { suffix, type: sequenceType });
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
      const suffix = type === 'super_agent' ? 'MA' : '';
      let prefixToUse = newCustomer.agentPrefix; // Default to user input

      // If Admin is creating, and hasn't typed a prefix, maybe dont force one?
      // But if Super Agent is creating, we might want to default to their username if they are creating an agent?
      // Actually, existing logic for Super Agent creating Agent used adminUsername? That seems wrong if it was 'super_agent' creating.
      // Let's stick to using the input prefix if available, or just rely on the user typing it.

      // ONLY Admin-created top-level Agents/MA start at 247. Sub-agents (created by MA) start at 101?
      // Let's assume standard logic:
      // Admin creating Master Agent -> 247+
      // Master Agent creating Agent -> 101+?
      // The original code had: const sequenceType = (currentRole === 'admin') ? 'agent' : 'player';
      // checking backend: getNextUsername takes type='player' or 'agent'.
      // 'agent' type starts at 247. 'player' type starts at 101.

      // If creating a Master Agent (top level), likely want 247+ (type='agent').
      // If creating a Sub Agent, likely want 101+ (type='player' logic in backend? No, backend says 'player' starts 101, 'agent' starts 247).
      // Use type='agent' for all agents to be safe 247+, or 'player' for sub-agents if they are meant to look like players? 
      // Start with 'agent' type for all agent creations to keep IDs distinct from players.

      const sequenceType = 'agent';

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
      handleAgentChange(''); // Reset to direct
      setNewCustomer(prev => ({ ...prev, referredByUserId: '' }));
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

  const canCreateCustomer = !viewOnly
    && !createLoading
    && !!String(newCustomer.username || '').trim()
    && !!String(newCustomer.firstName || '').trim()
    && !!String(newCustomer.lastName || '').trim()
    && !!String(newCustomer.phoneNumber || '').trim()
    && !!String(newCustomer.password || '').trim()
    && (creationType !== 'player' || (
      String(newCustomer.minBet ?? '').trim() !== ''
      && String(newCustomer.maxBet ?? '').trim() !== ''
      && String(newCustomer.creditLimit ?? '').trim() !== ''
      && String(newCustomer.balanceOwed ?? '').trim() !== ''
    ));

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
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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

  const getPlayerAddonState = (customer) => {
    const customerId = customer.id || customer._id;
    const fallback = {
      sports: customer.settings?.sports ?? true,
      casino: customer.settings?.casino ?? true,
      racebook: customer.settings?.racebook ?? true
    };
    return rowAddonDrafts[customerId] || fallback;
  };

  const handleToggleAddonDraft = (customer, addonKey) => {
    const customerId = customer.id || customer._id;
    const current = getPlayerAddonState(customer);
    setRowAddonDrafts((prev) => ({
      ...prev,
      [customerId]: {
        ...current,
        [addonKey]: !current[addonKey]
      }
    }));
  };

  const saveAddonDraft = async (customer) => {
    const customerId = customer.id || customer._id;
    const draft = rowAddonDrafts[customerId];
    if (!draft) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      setActionLoadingId(customerId);
      const payload = {
        settings: {
          ...(customer.settings || {}),
          sports: !!draft.sports,
          casino: !!draft.casino,
          racebook: !!draft.racebook
        }
      };

      if (currentRole === 'agent') {
        await updateUserByAgent(customerId, payload, token);
      } else {
        await updateUserByAdmin(customerId, payload, token);
      }

      setCustomers(prev => prev.map(c => (
        (c.id || c._id) === customerId ? { ...c, settings: payload.settings } : c
      )));
      setRowAddonDrafts((prev) => {
        const next = { ...prev };
        delete next[customerId];
        return next;
      });
      setError('');
    } catch (err) {
      console.error('Addon save failed:', err);
      setError(err.message || 'Failed to save add-ons');
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
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
      phoneNumber: '',
      firstName: '',
      lastName: '',
      fullName: '',
      password: '', // Keep empty for no change
      minBet: '',
      maxBet: '',
      creditLimit: '',
      balanceOwed: '',
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
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    const customerId = selectedCustomer.id || selectedCustomer._id;
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const payload = {};
      if (editForm.phoneNumber.trim()) payload.phoneNumber = editForm.phoneNumber.trim();
      if (editForm.firstName.trim()) payload.firstName = editForm.firstName.trim();
      if (editForm.lastName.trim()) payload.lastName = editForm.lastName.trim();
      if (editForm.fullName.trim()) payload.fullName = editForm.fullName.trim();
      if (editForm.password.trim()) payload.password = editForm.password.trim();
      if (editForm.minBet !== '') payload.minBet = Number(editForm.minBet);
      if (editForm.maxBet !== '') payload.maxBet = Number(editForm.maxBet);
      if (editForm.creditLimit !== '') payload.creditLimit = Number(editForm.creditLimit);
      if (editForm.balanceOwed !== '') payload.balanceOwed = Number(editForm.balanceOwed);

      const appEntries = Object.entries(editForm.apps || {}).filter(([, val]) => (val || '').trim() !== '');
      if (appEntries.length > 0) {
        payload.apps = Object.fromEntries(appEntries.map(([key, val]) => [key, val.trim()]));
      }

      if (Object.keys(payload).length === 0) {
        setError('Enter at least one value before saving.');
        return;
      }

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

  const assignableAgents = useMemo(() => agents.filter((a) => {
    if (currentRole === 'admin') return true;
    if (currentRole === 'super_agent' || currentRole === 'master_agent') return true;
    return false;
  }), [agents, currentRole]);

  const filteredAssignableAgents = useMemo(() => assignableAgents.filter((a) => {
    if (!agentSearchQuery.trim()) return true;
    return (a.username || '').toLowerCase().includes(agentSearchQuery.trim().toLowerCase());
  }), [assignableAgents, agentSearchQuery]);

  const headerFilteredAgents = useMemo(() => assignableAgents.filter((a) => {
    if (!headerAgentQuery.trim()) return true;
    return (a.username || '').toLowerCase().includes(headerAgentQuery.trim().toLowerCase());
  }), [assignableAgents, headerAgentQuery]);

  const normalizedCustomerQuery = customerSearchQuery.trim().toLowerCase();

  const allPlayers = useMemo(() => customers.filter((c) => c.role === 'user'), [customers]);
  const searchedPlayers = useMemo(() => {
    if (!normalizedCustomerQuery) return allPlayers;
    return allPlayers.filter((c) => {
      const fields = [
        c.username,
        c.firstName,
        c.lastName,
        c.fullName,
        c.phoneNumber,
        c.rawPassword,
        c.referredByUsername,
        c.agentId?.username,
      ];
      return fields.some((value) => String(value || '').toLowerCase().includes(normalizedCustomerQuery));
    });
  }, [allPlayers, normalizedCustomerQuery]);

  const selectedHeaderAgent = assignableAgents.find((a) => String(a.id || a._id) === String(selectedHeaderAgentId));
  const isMasterSelection = !!selectedHeaderAgent && (selectedHeaderAgent.role === 'master_agent' || selectedHeaderAgent.role === 'super_agent');

  const filteredCustomers = useMemo(() => {
    if (!selectedHeaderAgentId) return searchedPlayers;
    if (!isMasterSelection) {
      return searchedPlayers.filter((c) => String(c.agentId?._id || c.agentId || '') === String(selectedHeaderAgentId));
    }

    const childAgents = assignableAgents.filter((a) => {
      const creatorId = String(a.createdBy?._id || a.createdBy || '');
      return a.role === 'agent' && creatorId === String(selectedHeaderAgentId);
    });
    const childAgentIds = new Set(childAgents.map((a) => String(a.id || a._id)));

    const playersUnderChildren = searchedPlayers.filter((c) => childAgentIds.has(String(c.agentId?._id || c.agentId || '')));
    const directUnderMaster = searchedPlayers.filter((c) => String(c.agentId?._id || c.agentId || '') === String(selectedHeaderAgentId));
    return [...playersUnderChildren, ...directUnderMaster];
  }, [selectedHeaderAgentId, isMasterSelection, searchedPlayers, assignableAgents]);

  const displayRows = useMemo(() => {
    if (!isMasterSelection) {
      return filteredCustomers.map((player) => ({ type: 'player', player }));
    }
    const childAgents = assignableAgents.filter((a) => {
      const creatorId = String(a.createdBy?._id || a.createdBy || '');
      return a.role === 'agent' && creatorId === String(selectedHeaderAgentId);
    });

    const rows = [];
    childAgents.forEach((agent) => {
      const agentId = String(agent.id || agent._id);
      const players = filteredCustomers.filter((p) => String(p.agentId?._id || p.agentId || '') === agentId);
      if (players.length > 0) {
        rows.push({ type: 'group', label: agent.username });
        players.forEach((player) => rows.push({ type: 'player', player }));
      }
    });

    const directPlayers = filteredCustomers.filter((p) => String(p.agentId?._id || p.agentId || '') === String(selectedHeaderAgentId));
    if (directPlayers.length > 0) {
      rows.push({ type: 'group', label: `${selectedHeaderAgent.username} (Direct)` });
      directPlayers.forEach((player) => rows.push({ type: 'player', player }));
    }

    return rows;
  }, [isMasterSelection, filteredCustomers, assignableAgents, selectedHeaderAgentId, selectedHeaderAgent]);

  const visiblePlayers = filteredCustomers;

  const openBulkEditModal = (type) => {
    setBulkEditType(type);
    setBulkEditValue('');
    setShowBulkEditModal(true);
  };

  const getBulkEditLabel = () => {
    switch (bulkEditType) {
      case 'creditLimit':
        return 'Credit Limit';
      case 'wagerLimit':
        return 'Wager Limit';
      case 'settleFigure':
        return 'Settle Figure';
      case 'status':
        return 'Status';
      default:
        return '';
    }
  };

  const getDisplayStatus = (status) => {
    const val = (status || '').toString().toLowerCase();
    if (val === 'active') return 'Active';
    if (val === 'read_only' || val === 'readonly') return 'Read Only';
    return 'Disabled';
  };

  const applyBulkEdit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setError('Please login to update players.');
      return;
    }
    if (visiblePlayers.length === 0) {
      setError('No players available for bulk update.');
      return;
    }

    let payload = null;
    if (bulkEditType === 'status') {
      const nextStatus = bulkEditValue || 'active';
      payload = { status: nextStatus };
    } else {
      const numericValue = Number(bulkEditValue);
      if (Number.isNaN(numericValue) || numericValue < 0) {
        setError('Please enter a valid non-negative number.');
        return;
      }
      if (bulkEditType === 'creditLimit') payload = { creditLimit: numericValue };
      if (bulkEditType === 'wagerLimit') payload = { wagerLimit: numericValue, maxBet: numericValue };
      if (bulkEditType === 'settleFigure') payload = { balanceOwed: numericValue };
    }

    try {
      setActionLoadingId('bulk-update');
      await Promise.all(visiblePlayers.map((player) => {
        const playerId = player.id || player._id;
        if (currentRole === 'agent') return updateUserByAgent(playerId, payload, token);
        return updateUserByAdmin(playerId, payload, token);
      }));

      setCustomers((prev) => prev.map((customer) => {
        if (customer.role !== 'user') return customer;
        return { ...customer, ...payload };
      }));
      setShowBulkEditModal(false);
      setError('');
    } catch (err) {
      console.error('Bulk update failed:', err);
      setError(err.message || 'Failed to update players');
    } finally {
      setActionLoadingId(null);
    }
  };

  const referralOptions = (() => {
    const playersOnly = customers.filter((c) => c.role === 'user');
    if (creationType !== 'player' && creationType !== 'agent' && creationType !== 'super_agent') return [];

    if (currentRole === 'agent') {
      return playersOnly;
    }

    if (newCustomer.agentId) {
      return playersOnly.filter((p) => String(p.agentId?._id || p.agentId || '') === String(newCustomer.agentId));
    }

    if (currentRole === 'master_agent' || currentRole === 'super_agent') {
      return playersOnly.filter((p) => String(p.agentId?._id || p.agentId || '') === String(currentUserId));
    }

    return playersOnly;
  })();

  const handleViewDetails = (customer) => {
    if (onViewChange) {
      onViewChange('user-details', customer.id || customer._id);
    }
  };

  const handleDelete = async (customer) => {
    const isAgent = customer.role === 'agent' || customer.role === 'master_agent';
    const typeLabel = isAgent ? 'Agent' : 'Player';

    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE ${typeLabel} "${customer.username}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Please login to delete.');
        return;
      }

      setActionLoadingId(customer.id || customer._id);

      if (isAgent) {
        await deleteAgent(customer.id || customer._id, token);
      } else {
        await deleteUser(customer.id || customer._id, token);
      }

      // Remove from state
      setCustomers(prev => prev.filter(c => (c.id || c._id) !== (customer.id || customer._id)));

      // Also remove from agents list if it was an agent
      if (isAgent) {
        setAgents(prev => prev.filter(a => (a.id || a._id) !== (customer.id || customer._id)));
      }

      alert(`${typeLabel} "${customer.username}" deleted successfully.`);
      setError('');

    } catch (err) {
      console.error('Delete failed:', err);
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRowDetailDraft = (customer) => {
    const customerId = customer.id || customer._id;
    return rowDetailDrafts[customerId] || {
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      password: '',
      creditLimit: String(customer.creditLimit ?? 0),
      wagerLimit: String(customer.wagerLimit ?? customer.maxBet ?? 0),
      settleFigure: String(customer.balanceOwed ?? 0),
      status: (customer.status || 'active').toLowerCase(),
      sports: customer.settings?.sports ?? true,
      casino: customer.settings?.casino ?? true,
      racebook: customer.settings?.racebook ?? true
    };
  };

  const toggleRowExpanded = (customer) => {
    const customerId = customer.id || customer._id;
    setExpandedRowId((prev) => (prev === customerId ? null : customerId));
    setExpandedEditRowId((prev) => (prev === customerId ? null : prev));
  };

  const startInlineEdit = (customer) => {
    const customerId = customer.id || customer._id;
    setExpandedRowId(customerId);
    setExpandedEditRowId(customerId);
    setRowDetailDrafts((prev) => ({
      ...prev,
      [customerId]: getRowDetailDraft(customer)
    }));
  };

  const updateRowDetailDraft = (customer, key, value) => {
    const customerId = customer.id || customer._id;
    const base = getRowDetailDraft(customer);
    setRowDetailDrafts((prev) => ({
      ...prev,
      [customerId]: {
        ...base,
        ...(prev[customerId] || {}),
        [key]: value
      }
    }));
  };

  const saveInlineRow = async (customer) => {
    const customerId = customer.id || customer._id;
    const draft = getRowDetailDraft(customer);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const payload = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      fullName: `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim(),
      creditLimit: Number(draft.creditLimit || 0),
      wagerLimit: Number(draft.wagerLimit || 0),
      maxBet: Number(draft.wagerLimit || 0),
      balanceOwed: Number(draft.settleFigure || 0),
      status: draft.status,
      settings: {
        ...(customer.settings || {}),
        sports: !!draft.sports,
        casino: !!draft.casino,
        racebook: !!draft.racebook
      }
    };

    try {
      setActionLoadingId(customerId);
      if (currentRole === 'agent') {
        await updateUserByAgent(customerId, payload, token);
      } else {
        await updateUserByAdmin(customerId, payload, token);
      }

      if ((draft.password || '').trim() !== '') {
        if (currentRole === 'admin') {
          await resetUserPasswordByAdmin(customerId, draft.password.trim(), token);
        } else {
          await updateUserByAgent(customerId, { password: draft.password.trim() }, token);
        }
      }

      setCustomers((prev) => prev.map((c) => (
        (c.id || c._id) === customerId
          ? {
              ...c,
              ...payload,
              rawPassword: (draft.password || '').trim() ? draft.password.trim() : (c.rawPassword || '')
            }
          : c
      )));
      setExpandedEditRowId(null);
      setRowDetailDrafts((prev) => {
        const next = { ...prev };
        delete next[customerId];
        return next;
      });
      setError('');
    } catch (err) {
      console.error('Inline save failed:', err);
      setError(err.message || 'Failed to save user details');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openQuickEditModal = (customer, type) => {
    const customerId = customer.id || customer._id;
    let value = '';
    if (type === 'name') value = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    if (type === 'password') value = customer.rawPassword || '';
    if (type === 'balance') value = String(customer.balance ?? 0);
    setQuickEditModal({
      open: true,
      type,
      customerId,
      username: customer.username,
      value
    });
  };

  const applyQuickEdit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token || !quickEditModal.customerId) return;

    try {
      setActionLoadingId(quickEditModal.customerId);
      if (quickEditModal.type === 'name') {
        const parts = quickEditModal.value.trim().split(/\s+/).filter(Boolean);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ');
        const payload = { firstName, lastName, fullName: quickEditModal.value.trim() };
        if (currentRole === 'agent') await updateUserByAgent(quickEditModal.customerId, payload, token);
        else await updateUserByAdmin(quickEditModal.customerId, payload, token);
        setCustomers((prev) => prev.map((c) => ((c.id || c._id) === quickEditModal.customerId ? { ...c, ...payload } : c)));
      }

      if (quickEditModal.type === 'password') {
        const nextPass = quickEditModal.value.trim();
        if (nextPass.length < 6) {
          setError('Password must be at least 6 characters.');
          return;
        }
        if (currentRole === 'admin') await resetUserPasswordByAdmin(quickEditModal.customerId, nextPass, token);
        else await updateUserByAgent(quickEditModal.customerId, { password: nextPass }, token);
        setCustomers((prev) => prev.map((c) => ((c.id || c._id) === quickEditModal.customerId ? { ...c, rawPassword: nextPass } : c)));
      }

      if (quickEditModal.type === 'balance') {
        const nextBalance = Number(quickEditModal.value);
        if (Number.isNaN(nextBalance)) {
          setError('Balance must be numeric.');
          return;
        }
        if (currentRole === 'agent') await updateUserBalanceOwedByAgent(quickEditModal.customerId, nextBalance, token);
        else await updateUserCredit(quickEditModal.customerId, { balance: nextBalance }, token);
        setCustomers((prev) => prev.map((c) => ((c.id || c._id) === quickEditModal.customerId ? { ...c, balance: nextBalance } : c)));
      }

      setQuickEditModal({ open: false, type: '', customerId: null, username: '', value: '' });
      setError('');
    } catch (err) {
      console.error('Quick edit failed:', err);
      setError(err.message || 'Failed to update value');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <div className="header-icon-title">
          <div className="glow-accent"></div>
          <h2>Administration Console</h2>
        </div>
        <div style={{ minWidth: '260px' }}>
          <input
            type="text"
            value={customerSearchQuery}
            onChange={(e) => setCustomerSearchQuery(e.target.value)}
            placeholder="Search user, name, phone, agent..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(15,23,42,0.6)', color: '#fff' }}
          />
        </div>
        <div
          className="agent-search-picker header-agent-picker"
          onFocus={() => setHeaderAgentOpen(true)}
          onBlur={() => setTimeout(() => setHeaderAgentOpen(false), 120)}
          tabIndex={0}
        >
          <div className="agent-search-head">
            <span className="agent-search-label">Agents</span>
            <input
              type="text"
              value={headerAgentQuery}
              onChange={(e) => {
                setHeaderAgentQuery(e.target.value);
                setHeaderAgentOpen(true);
              }}
              placeholder="Search agent..."
            />
          </div>
          {headerAgentOpen && (
            <div className="agent-search-list">
              <button
                type="button"
                className={`agent-search-item ${selectedHeaderAgentId ? '' : 'selected'}`}
                onClick={() => {
                  setSelectedHeaderAgentId('');
                  setHeaderAgentQuery('');
                  setHeaderAgentOpen(false);
                }}
              >
                <span>All Agents</span>
              </button>
              {headerFilteredAgents.map((a) => {
                const id = a.id || a._id;
                const isMaster = a.role === 'master_agent' || a.role === 'super_agent';
                return (
                  <button
                    key={id}
                    type="button"
                    className={`agent-search-item ${String(selectedHeaderAgentId || '') === String(id) ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedHeaderAgentId(id);
                      setHeaderAgentQuery(a.username || '');
                      setHeaderAgentOpen(false);
                    }}
                  >
                    <span>{a.username}</span>
                    <span className={`agent-type-badge ${isMaster ? 'master' : 'agent'}`}>{isMaster ? 'M' : 'A'}</span>
                  </button>
                );
              })}
              {headerFilteredAgents.length === 0 && (
                <div className="agent-search-empty">No matching agents</div>
              )}
            </div>
          )}
        </div>
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
                    {(currentRole === 'admin' || currentRole === 'super_agent' || currentRole === 'master_agent') && (
                      <>
                        <option value="agent">Agent</option>
                        <option value="super_agent">Master Agent</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Source Selection UI Removed - Enforcing strict hierarchy */}
              {/* Admin -> Direct | Master -> Direct | Agent -> Direct */}
              {(creationType === 'agent' || creationType === 'super_agent') && (currentRole !== 'super_agent' && currentRole !== 'master_agent' || creationType === 'super_agent') && (
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
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={newCustomer.phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="User contact"
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

              {/* Assign to Agent / Master Agent */}
              {(creationType === 'player' || creationType === 'agent' || creationType === 'super_agent')
                && (currentRole === 'admin' || currentRole === 'super_agent' || currentRole === 'master_agent') && (
                <div className="filter-group">
                  <label>{creationType === 'player' ? 'Assign to Agent' : 'Assign to Master Agent'}</label>
                  <div
                    className="agent-search-picker"
                    onFocus={() => setAgentSearchOpen(true)}
                    onBlur={() => setTimeout(() => setAgentSearchOpen(false), 120)}
                    tabIndex={0}
                  >
                    <div className="agent-search-head">
                    <span className="agent-search-label">Agents</span>
                      <input
                        type="text"
                        value={agentSearchQuery}
                        onChange={(e) => {
                          setAgentSearchQuery(e.target.value);
                          setAgentSearchOpen(true);
                        }}
                        placeholder="Search agent..."
                      />
                    </div>
                    {agentSearchOpen && (
                      <div className="agent-search-list">
                        <button
                          type="button"
                          className={`agent-search-item ${newCustomer.agentId ? '' : 'selected'}`}
                          onClick={() => {
                            handleAgentChange('');
                            setAgentSearchOpen(false);
                          }}
                        >
                          <span>{creationType === 'player' ? 'Direct (Under Me)' : 'Direct (Created By Me)'}</span>
                        </button>
                        {filteredAssignableAgents.map((a) => {
                          const id = a.id || a._id;
                          const isMaster = a.role === 'master_agent' || a.role === 'super_agent';
                          if ((creationType === 'agent' || creationType === 'super_agent') && !isMaster) {
                            return null;
                          }
                          return (
                            <button
                              key={id}
                              type="button"
                              className={`agent-search-item ${String(newCustomer.agentId || '') === String(id) ? 'selected' : ''}`}
                              onClick={() => {
                                handleAgentChange(id);
                                setAgentSearchOpen(false);
                              }}
                            >
                              <span>{a.username}</span>
                              <span className={`agent-type-badge ${isMaster ? 'master' : 'agent'}`}>{isMaster ? 'M' : 'A'}</span>
                            </button>
                          );
                        })}
                        {filteredAssignableAgents.length === 0 && (
                          <div className="agent-search-empty">No matching agents</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(creationType === 'player' || creationType === 'agent' || creationType === 'super_agent') && (
                <>
                  <div className="filter-group">
                    <label>Referred By Player</label>
                    <div className="s-wrapper">
                      <select
                        value={newCustomer.referredByUserId}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, referredByUserId: e.target.value }))}
                      >
                        <option value="">No referral</option>
                        {referralOptions.map((p) => (
                          <option key={p.id || p._id} value={p.id || p._id}>
                            {(p.username || '').toUpperCase()}
                            {p.fullName ? ` - ${p.fullName}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="filter-group">
                    <label>Min bet:</label>
                    <input
                      type="number"
                      value={newCustomer.minBet}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, minBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Max bet:</label>
                    <input
                      type="number"
                      value={newCustomer.maxBet}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, maxBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Credit limit:</label>
                    <input
                      type="number"
                      value={newCustomer.creditLimit}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, creditLimit: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Settle limit:</label>
                    <input
                      type="number"
                      value={newCustomer.balanceOwed}
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
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, defaultMinBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Max bet: (Standard)</label>
                    <input
                      type="number"
                      value={newCustomer.defaultMaxBet}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, defaultMaxBet: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Credit limit: (Standard)</label>
                    <input
                      type="number"
                      value={newCustomer.defaultCreditLimit}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, defaultCreditLimit: e.target.value }))}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Settle limit: (Standard)</label>
                    <input
                      type="number"
                      value={newCustomer.defaultSettleLimit}
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
                  disabled={!canCreateCustomer}
                >
                  {createLoading ? 'Deploying...' : `Create ${creationType === 'player' ? 'Player' : creationType === 'agent' ? 'Agent' : 'Master Agent'}`}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ backgroundColor: '#17a2b8', color: 'white', flex: 0.5 }}
                  onClick={() => {
                    const pass = newCustomer.password || 'N/A';

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
              <div className="scroll-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Password</th>
                      <th>Name</th>
                      <th className="clickable-col-head" onClick={() => openBulkEditModal('creditLimit')}>Credit Limit</th>
                      <th className="clickable-col-head" onClick={() => openBulkEditModal('wagerLimit')}>Wager Limit</th>
                      <th className="clickable-col-head" onClick={() => openBulkEditModal('settleFigure')}>Settle Figure</th>
                      <th>Balance</th>
                      <th className="clickable-col-head" onClick={() => openBulkEditModal('status')}>Status</th>
                      <th>Sportsbook</th>
                      <th>Casino</th>
                      <th>Horses</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.length === 0 ? (
                      <tr><td colSpan={12} className="empty-msg">No records found.</td></tr>
                    ) : (
                      displayRows.map((row, rowIndex) => {
                        if (row.type === 'group') {
                          return (
                            <tr key={`group-${row.label}-${rowIndex}`} className="agent-group-row">
                              <td colSpan={12}>{row.label}</td>
                            </tr>
                          );
                        }
                        const customer = row.player;
                        const customerId = customer.id || customer._id;
                        const addonState = getPlayerAddonState(customer);
                        const hasPendingAddonChanges = !!rowAddonDrafts[customerId];
                        const isExpanded = expandedRowId === customerId;
                        const isInlineEdit = expandedEditRowId === customerId;
                        const detailDraft = getRowDetailDraft(customer);

                        return (
                          <React.Fragment key={customerId}>
                            <tr className={`customer-row role-${customer.role}`}>
                              <td className="user-cell">
                                <button className="user-link-btn" onClick={() => handleViewDetails(customer)}>
                                  <span>{customer.username.toUpperCase()}</span>
                                </button>
                                {customer.role === 'user' && (
                                  <button className="row-expand-btn" type="button" onClick={() => toggleRowExpanded(customer)}>
                                    {isExpanded ? '⌄' : '›'}
                                  </button>
                                )}
                              </td>
                              <td className="pass-cell">{customer.rawPassword || ''}</td>
                              <td>{customer.role === 'user' ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || '—' : (customer.fullName || '—')}</td>
                              <td className="highlight-cell">{Number(customer.creditLimit || 1000).toLocaleString()}</td>
                              <td>{Number(customer.wagerLimit ?? customer.maxBet ?? 0).toLocaleString()}</td>
                              <td className="highlight-cell">{Number(customer.balanceOwed || 0).toLocaleString()}</td>
                              <td className={`balance-cell ${Number(customer.balance) < 0 ? 'neg' : 'pos'}`}>
                                {formatBalance(customer.balance)}
                              </td>
                              <td>{getDisplayStatus(customer.status)}</td>
                              <td>
                                {customer.role === 'user' ? (
                                  <label className="switch-mini">
                                    <input type="checkbox" checked={!!addonState.sports} onChange={() => handleToggleAddonDraft(customer, 'sports')} />
                                    <span className="slider-mini"></span>
                                  </label>
                                ) : '—'}
                              </td>
                              <td>
                                {customer.role === 'user' ? (
                                  <label className="switch-mini">
                                    <input type="checkbox" checked={!!addonState.casino} onChange={() => handleToggleAddonDraft(customer, 'casino')} />
                                    <span className="slider-mini"></span>
                                  </label>
                                ) : '—'}
                              </td>
                              <td>
                                {customer.role === 'user' ? (
                                  <label className="switch-mini">
                                    <input type="checkbox" checked={!!addonState.racebook} onChange={() => handleToggleAddonDraft(customer, 'racebook')} />
                                    <span className="slider-mini"></span>
                                  </label>
                                ) : '—'}
                              </td>
                              <td>
                                <div className="action-buttons-cell" style={{ display: 'flex', gap: '8px' }}>
                                  {customer.role === 'user' ? (
                                    <>
                                      <button
                                        className={`btn-secondary ${hasPendingAddonChanges ? 'btn-save-dirty' : 'btn-save-clean'}`}
                                        type="button"
                                        onClick={() => saveAddonDraft(customer)}
                                        disabled={!hasPendingAddonChanges || actionLoadingId === customerId}
                                      >
                                        Save
                                      </button>
                                      <button
                                        className="btn-secondary"
                                        type="button"
                                        onClick={() => (isInlineEdit ? saveInlineRow(customer) : startInlineEdit(customer))}
                                        disabled={actionLoadingId === customerId}
                                      >
                                        {isInlineEdit ? 'SAVE' : 'EDIT'}
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      className="btn-icon"
                                      title="Edit Customer"
                                      onClick={() => handleEditClick(customer)}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                  )}
                                  {currentRole === 'admin' && (
                                    <button
                                      className="btn-icon delete-btn"
                                      title="Delete Customer"
                                      onClick={() => handleDelete(customer)}
                                      style={{ color: '#ff4d4d' }}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {customer.role === 'user' && isExpanded && (
                              <tr className="expanded-detail-row">
                                <td colSpan={12}>
                                  <div className={`expanded-detail-grid ${isInlineEdit ? 'is-editing' : ''}`}>
                                    <div className="detail-card">
                                      <div className="detail-line"><span>Password</span><span>{customer.rawPassword || '—'} <button type="button" className="link-edit-btn" onClick={() => openQuickEditModal(customer, 'password')}>change</button></span></div>
                                      <div className="detail-line"><span>Name</span><span>{`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || '—'} <button type="button" className="link-edit-btn" onClick={() => openQuickEditModal(customer, 'name')}>change</button></span></div>
                                      <div className="detail-line"><span>Credit Limit</span><span>{isInlineEdit ? <input type="number" value={detailDraft.creditLimit} onChange={(e) => updateRowDetailDraft(customer, 'creditLimit', e.target.value)} /> : `$${Number(customer.creditLimit || 0).toLocaleString()}`}</span></div>
                                      <div className="detail-line"><span>Wager Limit</span><span>{isInlineEdit ? <input type="number" value={detailDraft.wagerLimit} onChange={(e) => updateRowDetailDraft(customer, 'wagerLimit', e.target.value)} /> : `$${Number(customer.wagerLimit ?? customer.maxBet ?? 0).toLocaleString()}`}</span></div>
                                      <div className="detail-line"><span>Settle Figure</span><span>{isInlineEdit ? <input type="number" value={detailDraft.settleFigure} onChange={(e) => updateRowDetailDraft(customer, 'settleFigure', e.target.value)} /> : `$${Number(customer.balanceOwed || 0).toLocaleString()}`}</span></div>
                                      <div className="detail-line"><span>Balance</span><span className={Number(customer.balance) < 0 ? 'neg' : 'pos'}>{formatBalance(customer.balance)} <button type="button" className="link-edit-btn" onClick={() => openQuickEditModal(customer, 'balance')}>change</button></span></div>
                                    </div>
                                    <div className="detail-card">
                                      <div className="detail-line"><span>Pending</span><span>{formatBalance(customer.pendingBalance || 0)}</span></div>
                                      <div className="detail-line"><span>Available</span><span>{formatBalance(customer.availableBalance ?? customer.balance ?? 0)}</span></div>
                                      <div className="detail-line"><span>FP Balance</span><span>{formatBalance(customer.freeplayBalance || 0)}</span></div>
                                      <div className="detail-line"><span>Parlay Max Wager</span><span>$0</span></div>
                                      <div className="detail-line"><span>Parlay Max Payout</span><span>$6,000</span></div>
                                      <div className="detail-line"><span>Status</span><span>{isInlineEdit ? (
                                        <select value={detailDraft.status} onChange={(e) => updateRowDetailDraft(customer, 'status', e.target.value)}>
                                          <option value="active">Active</option>
                                          <option value="disabled">Disabled</option>
                                          <option value="read_only">Read Only</option>
                                        </select>
                                      ) : getDisplayStatus(customer.status)}</span></div>
                                    </div>
                                    <div className="detail-card">
                                      <div className="detail-line"><span>Max Contest Wager</span><span>$0</span></div>
                                      <div className="detail-line"><span>Max Contest Payout</span><span>$5,000</span></div>
                                      <div className="detail-line"><span>Max Soccer Wager</span><span>$0</span></div>
                                      <div className="detail-line"><span>Sportsbook</span><span>{isInlineEdit ? <label className="switch-mini"><input type="checkbox" checked={!!detailDraft.sports} onChange={() => updateRowDetailDraft(customer, 'sports', !detailDraft.sports)} /><span className="slider-mini"></span></label> : (customer.settings?.sports ?? true ? 'On' : 'Off')}</span></div>
                                      <div className="detail-line"><span>Casino</span><span>{isInlineEdit ? <label className="switch-mini"><input type="checkbox" checked={!!detailDraft.casino} onChange={() => updateRowDetailDraft(customer, 'casino', !detailDraft.casino)} /><span className="slider-mini"></span></label> : (customer.settings?.casino ?? true ? 'On' : 'Off')}</span></div>
                                      <div className="detail-line"><span>Horses</span><span>{isInlineEdit ? <label className="switch-mini"><input type="checkbox" checked={!!detailDraft.racebook} onChange={() => updateRowDetailDraft(customer, 'racebook', !detailDraft.racebook)} /><span className="slider-mini"></span></label> : (customer.settings?.racebook ?? true ? 'On' : 'Off')}</span></div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
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
                            placeholder={selectedCustomer?.firstName || 'First name'}
                          />
                        </div>
                        <div className="form-group">
                          <label>Last Name</label>
                          <input
                            type="text"
                            value={editForm.lastName}
                            onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                            placeholder={selectedCustomer?.lastName || 'Last name'}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input
                          type="tel"
                          value={editForm.phoneNumber}
                          onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                          placeholder={selectedCustomer?.phoneNumber || 'Phone number'}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                          <label>Min bet:</label>
                          <input
                            type="number"
                            value={editForm.minBet}
                            onChange={e => setEditForm({ ...editForm, minBet: e.target.value })}
                            placeholder={`${selectedCustomer?.minBet ?? 25}`}
                          />
                        </div>
                        <div className="form-group">
                          <label>Max bet:</label>
                          <input
                            type="number"
                            value={editForm.maxBet}
                            onChange={e => setEditForm({ ...editForm, maxBet: e.target.value })}
                            placeholder={`${selectedCustomer?.maxBet ?? 200}`}
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
                            placeholder={`${selectedCustomer?.creditLimit ?? 1000}`}
                          />
                        </div>
                        <div className="form-group">
                          <label>Settle Limit:</label>
                          <input
                            type="number"
                            value={editForm.balanceOwed}
                            onChange={e => setEditForm({ ...editForm, balanceOwed: e.target.value })}
                            placeholder={`${selectedCustomer?.balanceOwed ?? 0}`}
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

                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          title="View Details"
                          onClick={() => handleViewDetails(selectedCustomer)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button
                          className="btn-icon"
                          title="Detailed View (Edit)"
                          onClick={() => handleEditClick(selectedCustomer)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button
                          className="btn-icon"
                          title="Adjust Balance / Settle"
                          onClick={() => handleAdjustBalance(selectedCustomer)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        </button>
                        <button
                          className="btn-icon"
                          title="Reset Password"
                          onClick={() => handleResetPassword(selectedCustomer)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </button>
                        {/* Delete Button - Admin Only */}
                        {currentRole === 'admin' && (
                          <button
                            className="btn-icon delete-btn"
                            title="Delete Customer"
                            onClick={() => handleDelete(selectedCustomer)}
                            style={{ color: '#ff4d4d' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        )}
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
                            const pass = selectedCustomer.rawPassword || editForm.password || 'N/A';

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

            {showBulkEditModal && (
              <div className="modal-overlay">
                <div className="modal-content bulk-edit-modal">
                  <h3>Edit {getBulkEditLabel()}</h3>
                  <form onSubmit={applyBulkEdit}>
                    <div className="form-group">
                      <label>{getBulkEditLabel()}</label>
                      {bulkEditType === 'status' ? (
                        <select
                          value={bulkEditValue}
                          onChange={(e) => setBulkEditValue(e.target.value)}
                          required
                        >
                          <option value="">Select status</option>
                          <option value="active">Active</option>
                          <option value="disabled">Disabled</option>
                          <option value="read_only">Read Only</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={bulkEditValue}
                          onChange={(e) => setBulkEditValue(e.target.value)}
                          placeholder="Enter amount"
                          required
                        />
                      )}
                    </div>
                    <p className="bulk-edit-hint">
                      This updates all players shown in the current list.
                    </p>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary" disabled={actionLoadingId === 'bulk-update'}>
                        {actionLoadingId === 'bulk-update' ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setShowBulkEditModal(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {quickEditModal.open && (
              <div className="modal-overlay">
                <div className="modal-content bulk-edit-modal">
                  <h3>
                    Edit {quickEditModal.type === 'name' ? 'Name' : quickEditModal.type === 'password' ? 'Password' : 'Balance'}: {quickEditModal.username}
                  </h3>
                  <form onSubmit={applyQuickEdit}>
                    <div className="form-group">
                      <label>
                        {quickEditModal.type === 'name' ? 'Name' : quickEditModal.type === 'password' ? 'Password' : 'Balance'}
                      </label>
                      <input
                        type={quickEditModal.type === 'balance' ? 'number' : 'text'}
                        value={quickEditModal.value}
                        onChange={(e) => setQuickEditModal((prev) => ({ ...prev, value: e.target.value }))}
                        autoFocus
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary" disabled={actionLoadingId === quickEditModal.customerId}>
                        {actionLoadingId === quickEditModal.customerId ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setQuickEditModal({ open: false, type: '', customerId: null, username: '', value: '' })}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

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
        .view-header h2 { font-size: 28px; font-weight: 800; margin: 0; color: #0f172a; }
        
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

        .agent-search-picker {
          position: relative;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
        }
        .header-agent-picker {
          min-width: 320px;
          max-width: 420px;
        }
        .agent-search-head {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
        }
        .agent-search-label {
          padding: 8px 10px;
          border-right: 1px solid #cbd5e1;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }
        .agent-search-head input {
          border: none !important;
          background: transparent !important;
          padding: 8px 10px !important;
          outline: none;
        }
        .agent-search-list {
          position: absolute;
          z-index: 30;
          left: 0;
          right: 0;
          top: calc(100% + 4px);
          max-height: 220px;
          overflow-y: auto;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 12px 22px rgba(15, 23, 42, 0.15);
        }
        .agent-search-item {
          width: 100%;
          border: none;
          background: #fff;
          padding: 8px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-size: 13px;
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
        }
        .agent-search-item:hover,
        .agent-search-item.selected {
          background: #e2f2ff;
        }
        .agent-type-badge {
          font-weight: 800;
          font-size: 13px;
          line-height: 1;
        }
        .agent-type-badge.master { color: #0f8a0f; }
        .agent-type-badge.agent { color: #dc2626; }
        .agent-search-empty {
          padding: 10px;
          color: #64748b;
          font-size: 12px;
        }

        .table-glass-container {
          background: rgba(30, 41, 59, 0.3); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px; padding: 20px;
        }
        .table-actions { margin-bottom: 20px; display: flex; justify-content: space-between; }
        .clickable-col-head { cursor: pointer; text-decoration: underline; text-decoration-style: dotted; }
        .clickable-col-head:hover { color: #3b82f6; }

        .scroll-wrapper { overflow-x: auto; }
        .row-expand-btn {
          border: none;
          background: transparent;
          color: #475569;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          margin-left: 8px;
        }
        .user-cell {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .expanded-detail-row td {
          background: #f0f6b3;
          padding: 12px 16px;
        }
        .expanded-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .detail-card {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
        }
        .detail-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 15px;
          color: #1e293b;
        }
        .detail-line:last-child {
          border-bottom: none;
        }
        .detail-line input,
        .detail-line select {
          width: 140px;
          border: 1px solid #94a3b8;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 14px;
          color: #0f172a;
          background: #fff;
        }
        .link-edit-btn {
          border: none;
          background: transparent;
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
          margin-left: 8px;
          font-size: 12px;
          text-transform: uppercase;
        }
        .premium-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
        .premium-table th { text-align: left; padding: 12px 16px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; }
        .customer-row { background: rgba(255,255,255,0.02); transition: all 0.2s; }
        .customer-row:hover { background: rgba(255,255,255,0.05); transform: translateY(-1px); }
        .customer-row td { padding: 16px; border-top: 1px solid rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.02); }
        .customer-row td:first-child { border-left: 1px solid rgba(255,255,255,0.02); border-radius: 12px 0 0 12px; }
        .customer-row td:last-child { border-right: 1px solid rgba(255,255,255,0.02); border-radius: 0 12px 12px 0; }
        .agent-group-row td {
          background: #073b53;
          color: #e8f5ff;
          font-weight: 700;
          letter-spacing: 0.3px;
          padding: 9px 12px;
        }

        .user-link-btn {
          background: none; border: none; display: flex; align-items: center; gap: 12px;
          color: #3b82f6; font-weight: 700; cursor: pointer; padding: 0;
        }
        .btn-save-clean {
          background: #94a3b8 !important;
          color: #fff !important;
          opacity: 0.7;
        }
        .btn-save-dirty {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
          color: #fff !important;
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
        }
        .btn-save-dirty:hover {
          filter: brightness(1.05);
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

        .switch-mini {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 28px;
        }
        .switch-mini input { opacity: 0; width: 0; height: 0; }
        .slider-mini {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #94a3b8;
          transition: .2s;
          border-radius: 999px;
        }
        .slider-mini:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 4px;
          top: 4px;
          background-color: white;
          transition: .2s;
          border-radius: 50%;
        }
        .switch-mini input:checked + .slider-mini { background-color: #10b981; }
        .switch-mini input:checked + .slider-mini:before { transform: translateX(24px); }

        .bulk-edit-modal { max-width: 560px; }
        .bulk-edit-hint { margin-top: 8px; color: #64748b; font-size: 13px; }

        @media (max-width: 1200px) {
          .expanded-detail-grid { grid-template-columns: 1fr; }
        }

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
    </div >
  );
}

export default CustomerAdminView;
