import React, { useEffect, useMemo, useState } from 'react';
import {
  createAgent,
  createPlayerByAgent,
  createSubAgent,
  createUserByAdmin,
  getAgents,
  getMe,
  getMyPlayers,
  getNextUsername,
  getUsersAdmin,
  importUsersSpreadsheet
} from '../../api';
import { formatUsPhone, generateIdentityPassword, normalizeIdentityName } from '../../utils/identityPassword';

const derivePlayerPrefix = (value) => {
  const normalized = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!normalized) return '';
  const alphaLead = normalized.match(/^[A-Z]+/);
  if (alphaLead && alphaLead[0]) {
    return alphaLead[0];
  }
  const withoutTrailingDigits = normalized.replace(/\d+$/, '');
  return withoutTrailingDigits || normalized;
};

const normalizeAgentUsername = (value) => String(value || '').trim().toUpperCase();
const isMasterAgentUsername = (value) => normalizeAgentUsername(value).endsWith('MA');
const normalizeAgentRole = (value) => String(value || '').trim().toLowerCase();
const isMasterAccountOption = (agent) => {
  const role = normalizeAgentRole(agent?.role);
  if (role === 'master_agent' || role === 'super_agent') return true;
  if (role === 'agent') return false;
  return isMasterAgentUsername(agent?.username);
};

const buildCopyInfo = (creationType, customer) => {
  const pass = customer.password || 'N/A';

  if (creationType === 'player') {
    return `Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${customer.username}
Password: ${pass}
Min bet: $${customer.minBet || 25}
Max bet: $${customer.maxBet || 200}
Credit: $${customer.creditLimit || 1000}


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
  }

  const typeLabel = creationType === 'agent' ? 'Agent' : 'Master Agent';
  const limitsBlock = creationType === 'agent'
    ? `
Standard Min bet: $${customer.defaultMinBet || 25}
Standard Max bet: $${customer.defaultMaxBet || 200}
Standard Credit: $${customer.defaultCreditLimit || 1000}
`
    : '';

  return `Welcome to the team! Here’s your ${typeLabel} administrative account info.

Login: ${customer.username}
Password: ${pass}
${limitsBlock}
Please ensure you manage your sectors responsibly and maintain clear communication with your assigned accounts. Good luck!
`;
};

function CustomerCreationWorkspace({ initialType = 'player' }) {
  const withTimeout = (promise, timeoutMs, message) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), Math.max(1000, timeoutMs));
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
  };

  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [selectedImportFileName, setSelectedImportFileName] = useState('');
  const [importSummary, setImportSummary] = useState('');
  const [importedUsernames, setImportedUsernames] = useState([]);
  const [importForceAgentAssignment, setImportForceAgentAssignment] = useState(true);
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
  const [creationType, setCreationType] = useState(initialType || 'player');
  const [currentRole, setCurrentRole] = useState('admin');
  const [viewOnly, setViewOnly] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [agentSearchOpen, setAgentSearchOpen] = useState(false);
  const [referralSearchQuery, setReferralSearchQuery] = useState('');
  const [referralSearchOpen, setReferralSearchOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    const fetchContext = async () => {
      try {
        setLoadingContext(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          setCustomers([]);
          setAgents([]);
          setError('Please login to load users.');
          return;
        }

        const storedRole = String(localStorage.getItem('userRole') || '').toLowerCase();
        let me = null;

        try {
          me = await getMe(token, { timeoutMs: 30000 });
        } catch (meError) {
          console.warn('CustomerCreationWorkspace: getMe failed, falling back to stored role.', meError);
        }

        const resolvedRole = String(me?.role || storedRole || 'admin').toLowerCase();
        setCurrentRole(resolvedRole);
        setAdminUsername(me?.username || '');
        setCurrentUserId(me?.id || me?._id || '');
        setViewOnly(Boolean(me?.viewOnly));

        if (resolvedRole === 'agent') {
          const data = await getMyPlayers(token);
          setCustomers(data || []);
          setAgents([]);
        } else {
          const [usersData, agentsData] = await Promise.all([
            getUsersAdmin(token),
            getAgents(token)
          ]);
          setCustomers(usersData || []);
          setAgents(agentsData || []);
        }
        setError('');

        if (me?.username) {
          try {
            const playerPrefix = derivePlayerPrefix(me.username);
            if (!playerPrefix) return;
            const { nextUsername } = await getNextUsername(playerPrefix, token, { type: 'player' });
            setNewCustomer((prev) => ({ ...prev, username: nextUsername }));
          } catch (usernameErr) {
            console.error('Failed to prefetch next username:', usernameErr);
          }
        }
      } catch (err) {
        console.error('Error fetching add-customer context:', err);
        setError('Failed to load users: ' + err.message);
      } finally {
        setLoadingContext(false);
      }
    };

    fetchContext();
  }, []);

  useEffect(() => {
    if (!initialType || initialType === creationType) return;
    const run = async () => {
      await handleCreationTypeChange(initialType);
    };
    run();
  }, [initialType]);

  const handleCreateCustomer = async () => {
    try {
      setCreateLoading(true);
      setDuplicateWarning(null);
      setError('');
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
        if (currentRole !== 'agent' && !String(newCustomer.agentId || '').trim()) {
          setError('Please assign this player to a regular Agent.');
          return;
        }
      }

      const payload = { ...newCustomer };
      if (payload.balance === '') delete payload.balance;
      if (creationType !== 'player') {
        delete payload.referredByUserId;
        delete payload.minBet;
        delete payload.maxBet;
        delete payload.creditLimit;
        delete payload.balanceOwed;
        if (creationType === 'super_agent') {
          delete payload.defaultMinBet;
          delete payload.defaultMaxBet;
          delete payload.defaultCreditLimit;
          delete payload.defaultSettleLimit;
        }
      } else if (!payload.referredByUserId) {
        delete payload.referredByUserId;
      }
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
          await createAgent({ ...payload, role: 'agent' }, token);
        } else {
          await createSubAgent({ ...payload, role: 'agent' }, token);
        }
      } else if (creationType === 'super_agent') {
        if (currentRole === 'admin') {
          await createAgent({ ...payload, role: 'master_agent' }, token);
        } else {
          await createSubAgent({ ...payload, role: 'master_agent' }, token);
        }
      }

      const createdType = creationType;
      setError('');
      setDuplicateWarning(null);
      setImportSummary('');
      setImportedUsernames([]);

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
      setReferralSearchOpen(false);
      setImportFile(null);
      setSelectedImportFileName('');
      setImportForceAgentAssignment(true);
      setImportSummary(`${createdType === 'player' ? 'Player' : createdType === 'agent' ? 'Agent' : 'Master Agent'} created successfully.`);

      if (currentRole === 'agent') {
        const data = await getMyPlayers(token);
        setCustomers(data || []);
      } else {
        const [usersData, agentsData] = await Promise.all([
          getUsersAdmin(token),
          getAgents(token)
        ]);
        setCustomers(usersData || []);
        setAgents(agentsData || []);
      }
    } catch (err) {
      console.error('Create user failed:', err);
      const duplicateMatches = Array.isArray(err?.duplicateMatches)
        ? err.duplicateMatches
        : (Array.isArray(err?.details?.matches) ? err.details.matches : []);
      const isDuplicateError = err?.isDuplicate === true
        || err?.duplicate === true
        || err?.code === 'DUPLICATE_PLAYER'
        || err?.details?.duplicate === true;
      if (isDuplicateError) {
        setDuplicateWarning({
          message: err?.message || 'Likely duplicate player detected.',
          matches: duplicateMatches,
        });
      } else {
        setDuplicateWarning(null);
      }
      setError(err.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleImportCustomers = async () => {
    try {
      setImportLoading(true);
      setError('');
      setImportSummary('');
      setImportedUsernames([]);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Please login to import users.');
        return;
      }
      if (!importFile) {
        setError('Please choose an Excel/CSV file first.');
        return;
      }
      if (importForceAgentAssignment && currentRole === 'admin' && !newCustomer.agentId) {
        setError('Select an agent first, or uncheck "Assign all to selected agent".');
        return;
      }

      const result = await withTimeout(
        importUsersSpreadsheet(importFile, token, {
          defaultAgentId: newCustomer.agentId || '',
          timeoutMs: 45000,
          forceAgentAssignment: importForceAgentAssignment
        }),
        50000,
        'Import request timed out. Please try again.'
      );

      const createdRowsCount = Array.isArray(result?.createdRows) ? result.createdRows.length : 0;
      const createdFromPayload = Number(result?.created);
      const failedFromPayload = Number(result?.failed);
      const created = Number.isFinite(createdFromPayload) ? createdFromPayload : createdRowsCount;
      const failed = Number.isFinite(failedFromPayload) ? failedFromPayload : 0;
      const serverMessage = String(result?.message || '').trim();

      if (!Number.isFinite(createdFromPayload) && !Number.isFinite(failedFromPayload)) {
        setImportSummary(serverMessage || `Import complete: ${created} created, ${failed} failed.`);
      } else {
        setImportSummary(`Import complete: ${created} created, ${failed} failed.${serverMessage ? ` ${serverMessage}` : ''}`);
      }

      const createdUsernames = Array.isArray(result?.createdRows)
        ? result.createdRows
          .map((row) => String(row?.username || '').toUpperCase())
          .filter(Boolean)
        : [];
      setImportedUsernames(createdUsernames);
      setImportFile(null);
      setSelectedImportFileName('');

      try {
        if (currentRole === 'agent') {
          const data = await withTimeout(getMyPlayers(token), 15000, 'Players refresh timed out');
          setCustomers(data || []);
        } else {
          const [usersData, agentsData] = await Promise.all([
            withTimeout(getUsersAdmin(token), 15000, 'Users refresh timed out'),
            withTimeout(getAgents(token), 15000, 'Agents refresh timed out')
          ]);
          setCustomers(usersData || []);
          setAgents(agentsData || []);
        }
      } catch (refreshErr) {
        console.warn('Post-import refresh failed:', refreshErr);
        setImportSummary((prev) => `${prev} Imported, but refresh failed: ${refreshErr.message || 'please reload page.'}`);
      }
    } catch (err) {
      console.error('Import users failed:', err);
      setError(err.message || 'Failed to import users');
    } finally {
      setImportLoading(false);
    }
  };

  const handlePrefixChange = async (prefix) => {
    const formatted = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setNewCustomer((prev) => ({ ...prev, agentPrefix: formatted }));

    if (formatted.length >= 2) {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const suffix = creationType === 'super_agent' ? 'MA' : '';
      const usernameScopeAgentId = (
        creationType === 'agent'
          ? (newCustomer.agentId || ((currentRole === 'master_agent' || currentRole === 'super_agent') ? currentUserId : ''))
          : ''
      );
      try {
        const query = { suffix, type: 'agent' };
        if (usernameScopeAgentId) {
          query.agentId = usernameScopeAgentId;
        }
        const { nextUsername } = await getNextUsername(formatted, token, query);
        setNewCustomer((prev) => ({ ...prev, username: nextUsername }));
      } catch (err) {
        console.error('Failed to get next username from prefix:', err);
      }
    } else {
      setNewCustomer((prev) => ({ ...prev, username: '' }));
    }
  };

  const handleAgentChange = async (agentId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    setNewCustomer((prev) => ({ ...prev, agentId, referredByUserId: '' }));
    const sequenceType = creationType === 'player' ? 'player' : 'agent';
    const suffix = creationType === 'super_agent' ? 'MA' : '';

    if (agentId) {
      const selectedAgent = agents.find((a) => (a.id || a._id) === agentId);
      if (selectedAgent) {
        setAgentSearchQuery(selectedAgent.username || '');
        try {
          const playerPrefix = derivePlayerPrefix(selectedAgent.username);
          if (!playerPrefix) {
            setNewCustomer((prev) => ({ ...prev, username: '' }));
            return;
          }
          const query = sequenceType === 'player'
            ? { suffix, type: sequenceType, agentId }
            : { suffix, type: sequenceType, ...(creationType === 'agent' ? { agentId } : {}) };
          const { nextUsername } = await getNextUsername(playerPrefix, token, query);
          setNewCustomer((prev) => ({ ...prev, username: nextUsername, agentPrefix: playerPrefix }));
        } catch (err) {
          console.error('Failed to get next username:', err);
        }
      }
    } else {
      setAgentSearchQuery('');
      if (creationType === 'player' && (currentRole === 'admin' || isMasterContext)) {
        setNewCustomer((prev) => ({ ...prev, username: '' }));
        return;
      }
      if (adminUsername) {
        try {
          const playerPrefix = derivePlayerPrefix(adminUsername);
          if (!playerPrefix) {
            setNewCustomer((prev) => ({ ...prev, username: '' }));
            return;
          }
          const query = { suffix, type: sequenceType };
          if (sequenceType === 'agent' && creationType === 'agent' && (currentRole === 'master_agent' || currentRole === 'super_agent') && currentUserId) {
            query.agentId = currentUserId;
          }
          const { nextUsername } = await getNextUsername(playerPrefix, token, query);
          setNewCustomer((prev) => ({ ...prev, username: nextUsername, agentPrefix: playerPrefix }));
        } catch (err) {
          console.error('Failed to fetch username for admin:', err);
          setNewCustomer((prev) => ({ ...prev, username: '' }));
        }
      } else {
        setNewCustomer((prev) => ({ ...prev, username: '' }));
      }
    }
  };

  const handleCreationTypeChange = async (type) => {
    setCreationType(type);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    if (type === 'super_agent' || type === 'agent') {
      const selectedAgentId = String(newCustomer.agentId || '').trim();
      const selectedAgent = selectedAgentId
        ? agents.find((agent) => String(agent.id || agent._id || '') === selectedAgentId)
        : null;
      const hasValidMasterAssignment = Boolean(selectedAgent && isMasterAccountOption(selectedAgent));
      if (!hasValidMasterAssignment) {
        setAgentSearchQuery('');
        setNewCustomer((prev) => ({ ...prev, agentId: '', parentAgentId: '' }));
      }

      setReferralSearchQuery('');
      setReferralSearchOpen(false);
      setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
      const suffix = type === 'super_agent' ? 'MA' : '';
      const prefixToUse = newCustomer.agentPrefix;
      const sequenceType = 'agent';

      if (prefixToUse) {
        try {
          const query = { suffix, type: sequenceType };
          if (type === 'agent' && newCustomer.agentId) {
            query.agentId = newCustomer.agentId;
          } else if (type === 'agent' && (currentRole === 'master_agent' || currentRole === 'super_agent') && currentUserId) {
            query.agentId = currentUserId;
          }
          const { nextUsername } = await getNextUsername(prefixToUse, token, query);
          setNewCustomer((prev) => ({ ...prev, username: nextUsername, agentPrefix: prefixToUse }));
        } catch (e) {
          console.error('Failed to re-fetch username on type change', e);
        }
      } else {
        setNewCustomer((prev) => ({ ...prev, username: '' }));
      }
    } else {
      await handleAgentChange('');
      setReferralSearchOpen(false);
      setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
    }
  };

  const updateAutoPassword = (firstName, lastName, phoneNumber) => {
    const autoPass = generateIdentityPassword(firstName, lastName, phoneNumber, newCustomer.username);
    setNewCustomer((prev) => ({ ...prev, password: autoPass }));
  };

  const handleFirstNameChange = (val) => {
    const formatted = normalizeIdentityName(val);
    setNewCustomer((prev) => {
      const updated = { ...prev, firstName: formatted };
      updateAutoPassword(formatted, updated.lastName, updated.phoneNumber);
      return updated;
    });
  };

  const handleLastNameChange = (val) => {
    const formatted = normalizeIdentityName(val);
    setNewCustomer((prev) => {
      const updated = { ...prev, lastName: formatted };
      updateAutoPassword(updated.firstName, formatted, updated.phoneNumber);
      return updated;
    });
  };

  const handlePhoneChange = (val) => {
    const formatted = formatUsPhone(val);

    setNewCustomer((prev) => {
      const updated = { ...prev, phoneNumber: formatted };
      updateAutoPassword(updated.firstName, updated.lastName, formatted);
      return updated;
    });
  };

  const canCreateCustomer = !viewOnly
    && !createLoading
    && !!String(newCustomer.username || '').trim()
    && !!String(newCustomer.firstName || '').trim()
    && !!String(newCustomer.lastName || '').trim()
    && !!String(newCustomer.phoneNumber || '').trim()
    && !!String(newCustomer.password || '').trim()
    && (creationType !== 'player' || currentRole === 'agent' || !!String(newCustomer.agentId || '').trim())
    && (creationType !== 'player' || (
      String(newCustomer.minBet ?? '').trim() !== ''
      && String(newCustomer.maxBet ?? '').trim() !== ''
      && String(newCustomer.creditLimit ?? '').trim() !== ''
      && String(newCustomer.balanceOwed ?? '').trim() !== ''
    ));

  const assignableAgents = useMemo(() => agents.filter(() => {
    if (currentRole === 'admin') return true;
    if (currentRole === 'super_agent' || currentRole === 'master_agent') return true;
    return false;
  }), [agents, currentRole]);

  const isMasterContext = currentRole === 'master_agent' || currentRole === 'super_agent';
  const isMasterAssignmentMode = creationType === 'agent' || creationType === 'super_agent';
  const requiresPlayerAgentSelection = creationType === 'player' && (currentRole === 'admin' || isMasterContext);

  const directAssignmentLabel = useMemo(() => {
    if (creationType === 'player') {
      return 'Direct (Under Me)';
    }
    if (isMasterContext) {
      const meLabel = String(adminUsername || '').trim().toUpperCase();
      return meLabel ? `${meLabel} (Me)` : 'Direct (Created By Me)';
    }
    return 'Direct (Created By Me)';
  }, [creationType, isMasterContext, adminUsername]);

  const visibleAssignableAgents = useMemo(() => {
    if (creationType === 'player') {
      return assignableAgents.filter((agent) => !isMasterAccountOption(agent));
    }
    if (isMasterAssignmentMode) {
      return assignableAgents.filter((agent) => isMasterAccountOption(agent));
    }
    return assignableAgents;
  }, [assignableAgents, isMasterAssignmentMode, creationType]);

  useEffect(() => {
    if (!isMasterAssignmentMode) return;

    const selectedId = String(newCustomer.agentId || '').trim();
    if (!selectedId) return;

    const selectedAgent = agents.find((agent) => String(agent.id || agent._id || '') === selectedId);
    if (selectedAgent && isMasterAccountOption(selectedAgent)) return;

    setNewCustomer((prev) => {
      if (!String(prev.agentId || '').trim()) return prev;
      return {
        ...prev,
        agentId: '',
        parentAgentId: '',
      };
    });
    setAgentSearchQuery('');
  }, [isMasterAssignmentMode, newCustomer.agentId, agents]);

  const showDirectAssignmentOption = useMemo(() => {
    if (requiresPlayerAgentSelection) {
      return false;
    }
    const query = String(agentSearchQuery || '').trim().toLowerCase();
    if (!query) {
      return true;
    }
    return directAssignmentLabel.toLowerCase().includes(query);
  }, [agentSearchQuery, directAssignmentLabel, requiresPlayerAgentSelection]);

  useEffect(() => {
    if (!requiresPlayerAgentSelection) {
      return;
    }
    if (String(newCustomer.agentId || '').trim() !== '') {
      return;
    }
    const fallbackId = String(visibleAssignableAgents[0]?.id || visibleAssignableAgents[0]?._id || '');
    if (!fallbackId) {
      return;
    }
    handleAgentChange(fallbackId);
  }, [requiresPlayerAgentSelection, visibleAssignableAgents, newCustomer.agentId]);

  useEffect(() => {
    if (creationType !== 'player') return;
    const typed = String(agentSearchQuery || '').trim().toLowerCase();
    if (!typed) return;

    const exact = visibleAssignableAgents.find((a) => String(a.username || '').trim().toLowerCase() === typed);
    if (!exact) return;

    const exactId = String(exact.id || exact._id || '');
    if (!exactId) return;
    if (String(newCustomer.agentId || '') === exactId) return;

    handleAgentChange(exactId);
  }, [agentSearchQuery, visibleAssignableAgents, creationType, newCustomer.agentId]);

  const filteredAssignableAgents = useMemo(() => visibleAssignableAgents.filter((agent) => {
    const query = String(agentSearchQuery || '').trim().toLowerCase();
    if (!query) return true;
    const username = String(agent.username || '').toLowerCase();
    const fullName = String(agent.fullName || '').toLowerCase();
    const roleLabel = isMasterAccountOption(agent)
      ? 'master agent'
      : 'agent';
    return username.includes(query) || fullName.includes(query) || roleLabel.includes(query);
  }), [visibleAssignableAgents, agentSearchQuery]);

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
      return [];
    }

    return playersOnly;
  })();

  const referralSearchOptions = useMemo(() => (
    referralOptions
      .map((player) => {
        const id = String(player.id || player._id || '').trim();
        const username = String(player.username || '').trim();
        const fullName = String(player.fullName || '').trim();
        if (!id || !username) return null;
        const label = `${username.toUpperCase()}${fullName ? ` - ${fullName}` : ''}`;
        return {
          id,
          label,
          labelLower: label.toLowerCase(),
          usernameLower: username.toLowerCase(),
        };
      })
      .filter(Boolean)
  ), [referralOptions]);

  const filteredReferralOptions = useMemo(() => {
    const typed = String(referralSearchQuery || '').trim().toLowerCase();
    if (!typed) {
      return referralSearchOptions.slice(0, 20);
    }
    return referralSearchOptions
      .filter((option) => option.labelLower.includes(typed) || option.usernameLower.includes(typed))
      .slice(0, 20);
  }, [referralSearchOptions, referralSearchQuery]);

  const selectedReferralOption = useMemo(() => {
    const selectedId = String(newCustomer.referredByUserId || '').trim();
    if (!selectedId) return null;
    return referralSearchOptions.find((option) => option.id === selectedId) || null;
  }, [newCustomer.referredByUserId, referralSearchOptions]);

  useEffect(() => {
    if (selectedReferralOption) {
      setReferralSearchQuery(selectedReferralOption.label);
      return;
    }
    if (!String(newCustomer.referredByUserId || '').trim()) {
      setReferralSearchQuery('');
    }
  }, [selectedReferralOption, newCustomer.referredByUserId]);

  const handleReferralSearchChange = (value) => {
    setReferralSearchQuery(value);
    const typed = String(value || '').trim().toLowerCase();
    if (!typed) {
      setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
      return;
    }

    const exactMatch = referralSearchOptions.find(
      (option) => option.labelLower === typed || option.usernameLower === typed
    );

    setNewCustomer((prev) => ({
      ...prev,
      referredByUserId: exactMatch ? exactMatch.id : '',
    }));
  };

  const handleReferralSearchBlur = () => {
    const typed = String(referralSearchQuery || '').trim().toLowerCase();
    if (!typed) {
      setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
      return;
    }

    const exactMatch = referralSearchOptions.find(
      (option) => option.labelLower === typed || option.usernameLower === typed
    );
    if (exactMatch) {
      setReferralSearchQuery(exactMatch.label);
      setNewCustomer((prev) => ({ ...prev, referredByUserId: exactMatch.id }));
      return;
    }

    const partialMatches = referralSearchOptions.filter(
      (option) => option.labelLower.includes(typed) || option.usernameLower.includes(typed)
    );
    if (partialMatches.length === 1) {
      setReferralSearchQuery(partialMatches[0].label);
      setNewCustomer((prev) => ({ ...prev, referredByUserId: partialMatches[0].id }));
      return;
    }

    setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
  };

  const handleReferralSelect = (option) => {
    if (!option) {
      setReferralSearchQuery('');
      setNewCustomer((prev) => ({ ...prev, referredByUserId: '' }));
      setReferralSearchOpen(false);
      return;
    }
    setReferralSearchQuery(option.label);
    setNewCustomer((prev) => ({ ...prev, referredByUserId: option.id }));
    setReferralSearchOpen(false);
  };

  return (
    <>
      {loadingContext && (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading setup...</span>
        </div>
      )}
      {!loadingContext && (
        <>
          {error && <div className="error-state">{error}</div>}
          {duplicateWarning && (
            <div className="duplicate-warning-state">
              <div className="duplicate-warning-title">Duplicate Player</div>
              <div className="duplicate-warning-message">{duplicateWarning.message}</div>
              {duplicateWarning.matches.length > 0 && (
                <div className="duplicate-warning-list">
                  {duplicateWarning.matches.map((match, idx) => (
                    <div
                      key={`${match.id || match.username || 'duplicate'}-${idx}`}
                      className="duplicate-warning-item"
                    >
                      <strong>{String(match.username || 'UNKNOWN')}</strong>
                      <span>{String(match.fullName || 'No name')}</span>
                      <span>{String(match.phoneNumber || 'No phone')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {importSummary && <div className="success-state">{importSummary}</div>}
          {importedUsernames.length > 0 && (
            <div className="success-state" style={{ marginTop: '8px' }}>
              Imported usernames: {importedUsernames.slice(0, 20).join(', ')}{importedUsernames.length > 20 ? ` (+${importedUsernames.length - 20} more)` : ''}
            </div>
          )}

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

            {(creationType === 'player' || creationType === 'agent' || creationType === 'super_agent')
              && (currentRole === 'admin' || currentRole === 'super_agent' || currentRole === 'master_agent') && (
                <div className="filter-group">
                  <label>{creationType === 'player' ? 'Assign to Agent' : 'Assign to Master Agent'}</label>
                  <div
                    className="agent-search-picker"
                    onFocus={() => setAgentSearchOpen(true)}
                    onBlur={() => {
                      const typed = String(agentSearchQuery || '').trim().toLowerCase();
                      const typedMatchesDirectSelf = (
                        isMasterAssignmentMode
                        && isMasterContext
                        && typed !== ''
                        && directAssignmentLabel.toLowerCase().includes(typed)
                        && filteredAssignableAgents.length === 0
                      );
                      if (typedMatchesDirectSelf) {
                        handleAgentChange('');
                        setAgentSearchQuery(String(adminUsername || '').toUpperCase());
                        setTimeout(() => setAgentSearchOpen(false), 120);
                        return;
                      }
                      if (
                        isMasterAssignmentMode
                        && isMasterContext
                        && String(adminUsername || '').trim() !== ''
                        && typed === String(adminUsername).trim().toLowerCase()
                      ) {
                        handleAgentChange('');
                        setAgentSearchQuery(String(adminUsername).toUpperCase());
                        setTimeout(() => setAgentSearchOpen(false), 120);
                        return;
                      }
                      const exact = visibleAssignableAgents.find((a) => String(a.username || '').trim().toLowerCase() === typed);
                      const exactId = String(exact?.id || exact?._id || '');
                      if (exactId && String(newCustomer.agentId || '') !== exactId) {
                        handleAgentChange(exactId);
                      }
                      setTimeout(() => setAgentSearchOpen(false), 120);
                    }}
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
                        placeholder={isMasterAssignmentMode ? 'Search master agent...' : 'Search agent...'}
                      />
                    </div>
                    {agentSearchOpen && (
                      <div className="agent-search-list">
                        {showDirectAssignmentOption && (
                          <button
                            type="button"
                            className={`agent-search-item ${newCustomer.agentId ? '' : 'selected'}`}
                            onClick={() => {
                              handleAgentChange('');
                              if (isMasterAssignmentMode && isMasterContext && String(adminUsername || '').trim() !== '') {
                                setAgentSearchQuery(String(adminUsername).toUpperCase());
                              }
                              setAgentSearchOpen(false);
                            }}
                          >
                            <span>{directAssignmentLabel}</span>
                          </button>
                        )}
                        {filteredAssignableAgents.map((a) => {
                          const id = a.id || a._id;
                          const isMaster = isMasterAccountOption(a);
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
                        {filteredAssignableAgents.length === 0 && !showDirectAssignmentOption && (
                          <div className="agent-search-empty">No matching agents</div>
                        )}
                      </div>
                    )}
                  </div>
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
              <label>Password <span className="locked-chip">Locked</span></label>
              <input
                type="text"
                value={newCustomer.password.toUpperCase()}
                readOnly
                className="readonly-input"
                placeholder="Auto-generated from name + phone"
              />
            </div>

            {creationType === 'player' && (
              <>
                <div className="filter-group">
                  <label>Min bet:</label>
                  <input
                    type="number"
                    value={newCustomer.minBet}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, minBet: e.target.value }))}
                  />
                </div>
                <div className="filter-group">
                  <label>Max bet:</label>
                  <input
                    type="number"
                    value={newCustomer.maxBet}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, maxBet: e.target.value }))}
                  />
                </div>
                <div className="filter-group">
                  <label>Credit limit:</label>
                  <input
                    type="number"
                    value={newCustomer.creditLimit}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, creditLimit: e.target.value }))}
                  />
                </div>
                <div className="filter-group">
                  <label>Settle limit:</label>
                  <input
                    type="number"
                    value={newCustomer.balanceOwed}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, balanceOwed: e.target.value }))}
                  />
                </div>
                <div className="filter-group">
                  <label>Referred By Player</label>
                  <div
                    className="agent-search-picker referral-search-picker"
                    onFocus={() => setReferralSearchOpen(true)}
                    onBlur={() => {
                      setTimeout(() => {
                        handleReferralSearchBlur();
                        setReferralSearchOpen(false);
                      }, 120);
                    }}
                    tabIndex={0}
                  >
                    <div className="referral-search-head">
                      <input
                        type="text"
                        value={referralSearchQuery}
                        onChange={(e) => {
                          handleReferralSearchChange(e.target.value);
                          setReferralSearchOpen(true);
                        }}
                        onFocus={() => setReferralSearchOpen(true)}
                        placeholder="Search player (leave blank for no referral)"
                        autoComplete="off"
                      />
                    </div>
                    {referralSearchOpen && (
                      <div className="agent-search-list">
                        <button
                          type="button"
                          className={`agent-search-item ${newCustomer.referredByUserId ? '' : 'selected'}`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleReferralSelect(null);
                          }}
                        >
                          <span>No referral</span>
                        </button>
                        {filteredReferralOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`agent-search-item ${String(newCustomer.referredByUserId || '') === String(option.id) ? 'selected' : ''}`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleReferralSelect(option);
                            }}
                          >
                            <span>{option.label}</span>
                          </button>
                        ))}
                        {filteredReferralOptions.length === 0 && (
                          <div className="agent-search-empty">No matching players</div>
                        )}
                      </div>
                    )}
                  </div>
                  <small style={{ display: 'block', marginTop: '6px', color: '#64748b' }}>
                    {selectedReferralOption ? `Selected: ${selectedReferralOption.label}` : 'No referral selected'}
                  </small>
                </div>
              </>
            )}
            {creationType === 'agent' && (
              <>
                <div className="filter-group">
                  <label>Min bet: (Standard)</label>
                  <input
                    type="number"
                    value={newCustomer.defaultMinBet}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, defaultMinBet: e.target.value }))}
                  />
                </div>
                <div className="filter-group">
                  <label>Max bet: (Standard)</label>
                  <input
                    type="number"
                    value={newCustomer.defaultMaxBet}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, defaultMaxBet: e.target.value }))}
                  />
                </div>
                <div className="filter-group">
                  <label>Credit limit: (Standard)</label>
                  <input
                    type="number"
                    value={newCustomer.defaultCreditLimit}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, defaultCreditLimit: e.target.value }))}
                  />
                </div>
                <div className="filter-group">
                  <label>Settle limit: (Standard)</label>
                  <input
                    type="number"
                    value={newCustomer.defaultSettleLimit}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, defaultSettleLimit: e.target.value }))}
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
                  navigator.clipboard.writeText(buildCopyInfo(creationType, newCustomer)).then(() => alert('Copied to clipboard!'));
                }}
              >
                Copy Info
              </button>
            </div>

            {(currentRole === 'admin' || currentRole === 'master_agent' || currentRole === 'super_agent' || currentRole === 'agent') && (
              <div className="filter-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                  <label>Import Players (.xlsx / .csv)</label>
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setImportFile(file);
                      setSelectedImportFileName(file?.name || '');
                    }}
                  />
                  {selectedImportFileName && (
                    <small style={{ display: 'block', marginTop: '6px', color: '#64748b' }}>
                      Selected file: {selectedImportFileName}
                    </small>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                    <input
                      type="checkbox"
                      checked={importForceAgentAssignment}
                      onChange={(e) => setImportForceAgentAssignment(e.target.checked)}
                    />
                    {currentRole === 'agent'
                      ? 'Assign all imported players to me'
                      : 'Assign all imported players to selected agent'}
                  </label>
                  {importForceAgentAssignment && currentRole === 'admin' && !newCustomer.agentId && (
                    <small style={{ display: 'block', marginTop: '4px', color: '#ef4444' }}>
                      Pick an agent in "Assign to Agent" before importing.
                    </small>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleImportCustomers}
                  disabled={!importFile || importLoading}
                  style={{ minWidth: '140px' }}
                >
                  {importLoading ? 'Importing...' : 'Import File'}
                </button>
              </div>
            )}
          </div>

          <style>{`
            .agent-search-picker {
              position: relative;
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              background: #f8fafc;
              z-index: 20;
            }
            .agent-search-picker:focus-within {
              z-index: 120;
            }
            .referral-search-picker {
              z-index: 24;
            }
            .referral-search-picker:focus-within {
              z-index: 160;
            }
            .agent-search-head {
              display: grid;
              grid-template-columns: auto 1fr;
              align-items: center;
            }
            .referral-search-head {
              display: block;
            }
            .agent-search-label {
              padding: 10px 12px;
              border-right: 1px solid #cbd5e1;
              color: #334155;
              font-size: 13px;
              font-weight: 600;
              white-space: nowrap;
            }
            .agent-search-head input {
              border: none !important;
              background: transparent !important;
              padding: 10px 12px !important;
              outline: none;
              width: 100%;
              min-height: 42px;
            }
            .referral-search-head input {
              border: none !important;
              background: transparent !important;
              padding: 10px 12px !important;
              outline: none;
              width: 100%;
              min-height: 42px;
            }
            .agent-search-list {
              position: absolute;
              z-index: 180;
              left: 0;
              right: 0;
              top: calc(100% + 6px);
              max-height: 240px;
              overflow-y: auto;
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              background: #ffffff;
              box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
            }
            .agent-search-item {
              width: 100%;
              border: none;
              background: #fff;
              padding: 10px 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              cursor: pointer;
              font-size: 13px;
              color: #1e293b;
              border-bottom: 1px solid #e2e8f0;
              text-align: left;
            }
            .agent-search-item:last-child {
              border-bottom: none;
            }
            .agent-search-item:hover,
            .agent-search-item.selected {
              background: #e2f2ff;
            }
            .agent-type-badge {
              font-weight: 800;
              font-size: 12px;
              line-height: 1;
              letter-spacing: 0.03em;
            }
            .agent-type-badge.master { color: #0f8a0f; }
            .agent-type-badge.agent { color: #dc2626; }
            .agent-type-badge.super { color: #5b21b6; }
            .agent-type-badge.admin { color: #1d4ed8; }
            .agent-search-empty {
              padding: 10px 12px;
              color: #64748b;
              font-size: 12px;
            }
            .locked-chip {
              display: inline-flex;
              align-items: center;
              margin-left: 6px;
              padding: 1px 6px;
              border-radius: 999px;
              border: 1px solid #d1d5db;
              background: #f8fafc;
              color: #334155;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.02em;
              text-transform: uppercase;
            }
            .duplicate-warning-state {
              border: 1px solid #f1d178;
              border-radius: 10px;
              background: #fff8dd;
              color: #6b4e00;
              padding: 12px;
              margin-top: 10px;
            }
            .duplicate-warning-title {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              margin-bottom: 4px;
            }
            .duplicate-warning-message {
              font-size: 13px;
              line-height: 1.4;
              margin-bottom: 8px;
            }
            .duplicate-warning-list {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .duplicate-warning-item {
              display: grid;
              grid-template-columns: minmax(78px, auto) 1fr;
              gap: 2px 10px;
              border: 1px solid #ecd28b;
              border-radius: 8px;
              background: #fffdf2;
              padding: 8px 10px;
              font-size: 12px;
              line-height: 1.25;
            }
            .duplicate-warning-item strong {
              color: #4f3200;
            }
            .duplicate-warning-item span:last-child {
              color: #6f5400;
            }
            @media (max-width: 600px) {
              .duplicate-warning-item {
                grid-template-columns: 1fr;
                gap: 3px;
              }
            }
          `}</style>
        </>
      )}
    </>
  );
}

export default CustomerCreationWorkspace;
