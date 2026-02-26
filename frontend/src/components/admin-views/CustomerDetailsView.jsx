import React, { useEffect, useMemo, useState } from 'react';
import {
  getUserStatistics,
  getAgents,
  getTransactionsHistory,
  getAdminBets,
  deleteAdminTransactions,
  updateUserFreeplay,
  updateUserByAdmin,
  updateUserByAgent,
  updateUserCredit,
  resetUserPasswordByAdmin,
  impersonateUser
} from '../../api';

const DEFAULT_FORM = {
  password: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  minBet: 0,
  agentId: '',
  status: 'active',
  creditLimit: 0,
  wagerLimit: 0,
  settleLimit: 0,
  accountType: 'credit',
  zeroBalanceWeekly: 'standard',
  tempCredit: 0,
  expiresOn: '',
  enableCaptcha: false,
  cryptoPromoPct: 0,
  promoType: 'promo_credit',
  playerNotes: '',
  sportsbook: true,
  casino: true,
  horses: true,
  messaging: false,
  dynamicLive: true,
  propPlus: true,
  liveCasino: false
  ,
  freePlayPercent: 20,
  maxFpCredit: 0,
  dlMinStraightBet: 25,
  dlMaxStraightBet: 250,
  dlMaxPerOffering: 500,
  dlMaxBetPerEvent: 500,
  dlMaxWinSingleBet: 1000,
  dlMaxWinEvent: 3000,
  dlDelaySec: 7,
  dlMaxFavoriteLine: -10000,
  dlMaxDogLine: 10000,
  dlMinParlayBet: 10,
  dlMaxParlayBet: 100,
  dlMaxWinEventParlay: 3000,
  dlMaxDogLineParlays: 1000,
  dlWagerCoolOffSec: 30,
  dlLiveParlays: false,
  dlBlockPriorStart: true,
  dlBlockHalftime: true,
  dlIncludeGradedInLimits: false,
  dlUseRiskLimits: false,
  casinoDefaultMaxWinDay: 10000,
  casinoDefaultMaxLossDay: 10000,
  casinoDefaultMaxWinWeek: 10000,
  casinoDefaultMaxLossWeek: 10000,
  casinoAgentMaxWinDay: 1000,
  casinoAgentMaxLossDay: 1000,
  casinoAgentMaxWinWeek: 5000,
  casinoAgentMaxLossWeek: 5000,
  casinoPlayerMaxWinDay: 1000,
  casinoPlayerMaxLossDay: 1000,
  casinoPlayerMaxWinWeek: 5000,
  casinoPlayerMaxLossWeek: 5000
};

function CustomerDetailsView({ userId, onBack, role = 'admin' }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customer, setCustomer] = useState(null);
  const [stats, setStats] = useState({});
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showBasicsMenu, setShowBasicsMenu] = useState(false);
  const [activeSection, setActiveSection] = useState('basics');
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState('');
  const [txSuccess, setTxSuccess] = useState('');
  const [txDisplayFilter, setTxDisplayFilter] = useState('7d');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txStatusFilter, setTxStatusFilter] = useState('all');
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [showNewTxModal, setShowNewTxModal] = useState(false);
  const [newTxType, setNewTxType] = useState('credit');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxDescription, setNewTxDescription] = useState('');
  const [performancePeriod, setPerformancePeriod] = useState('daily');
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState('');
  const [performanceRows, setPerformanceRows] = useState([]);
  const [performanceSelectedKey, setPerformanceSelectedKey] = useState('');
  const [performanceDayBets, setPerformanceDayBets] = useState([]);
  const [freePlayRows, setFreePlayRows] = useState([]);
  const [freePlayLoading, setFreePlayLoading] = useState(false);
  const [freePlayError, setFreePlayError] = useState('');
  const [freePlaySuccess, setFreePlaySuccess] = useState('');
  const [freePlayDisplayFilter, setFreePlayDisplayFilter] = useState('7d');
  const [freePlaySelectedIds, setFreePlaySelectedIds] = useState([]);
  const [showNewFreePlayModal, setShowNewFreePlayModal] = useState(false);
  const [newFreePlayAmount, setNewFreePlayAmount] = useState('');
  const [newFreePlayDescription, setNewFreePlayDescription] = useState('');
  const [dynamicLiveSaving, setDynamicLiveSaving] = useState(false);
  const [dynamicLiveError, setDynamicLiveError] = useState('');
  const [dynamicLiveSuccess, setDynamicLiveSuccess] = useState('');
  const [casinoSaving, setCasinoSaving] = useState(false);
  const [casinoError, setCasinoError] = useState('');
  const [casinoSuccess, setCasinoSuccess] = useState('');
  const [copyNotice, setCopyNotice] = useState('');

  const quickMenuItems = [
    { id: 'basics', label: 'The Basics', icon: '🪪' },
    { id: 'transactions', label: 'Transactions', icon: '💳' },
    { id: 'pending', label: 'Pending', icon: '🕒' },
    { id: 'performance', label: 'Performance', icon: '📄' },
    { id: 'analysis', label: 'Analysis', icon: '📈' },
    { id: 'freeplays', label: 'Free Plays', icon: '🤲' },
    { id: 'dynamic-live', label: 'Dynamic Live', icon: '🖥️' },
    { id: 'live-casino', label: 'Live Casino', icon: '🎴' },
    { id: 'crash', label: 'Crash', icon: '🚀' },
    { id: 'player-info', label: 'Player Info', icon: 'ℹ️' },
    { id: 'offerings', label: 'Offerings', icon: '🔁' },
    { id: 'limits', label: 'Limits', icon: '✋' },
    { id: 'vig-setup', label: 'Vig Setup', icon: '🛡️' },
    { id: 'parlays', label: 'Parlays', icon: '🔢' },
    { id: 'teasers', label: 'Teasers', icon: '8️⃣' },
    { id: 'buying-pts', label: 'Buying Pts', icon: '🛒' },
    { id: 'risk-mngmt', label: 'Risk Mngmt', icon: '💲' },
    { id: 'communication', label: 'Communication', icon: '📞' }
  ];

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError('');
        setSuccess('');
        setTxSuccess('');
        setTxError('');
        setCustomer(null);
        setForm(DEFAULT_FORM);
        setActiveSection('basics');

        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please login to view details.');
          return;
        }

        const [detailData, agentsData] = await Promise.all([
          getUserStatistics(userId, token),
          ['admin', 'super_agent', 'master_agent'].includes(role) ? getAgents(token) : Promise.resolve([])
        ]);

        const user = detailData?.user;
        const userSettings = user?.settings || {};
        const dl = userSettings.dynamicLiveLimits || {};
        const dlf = userSettings.dynamicLiveFlags || {};
        const csl = userSettings.liveCasinoLimits || {};
        const cslDefault = csl.default || {};
        const cslAgent = csl.agent || {};
        const cslPlayer = csl.player || {};
        if (!user) {
          setError('User not found.');
          return;
        }

        setCustomer(user);
        setStats(detailData?.stats || {});
        setAgents(Array.isArray(agentsData) ? agentsData : []);
        setForm({
          password: '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phoneNumber: user.phoneNumber || '',
          minBet: Number(user.minBet || 0),
          agentId: user.agentId?._id || user.agentId || '',
          status: (user.status || 'active').toLowerCase(),
          creditLimit: Number(user.creditLimit || 0),
          wagerLimit: Number(user.wagerLimit ?? user.maxBet ?? 0),
          settleLimit: Number(user.balanceOwed || 0),
          accountType: userSettings.accountType || 'credit',
          zeroBalanceWeekly: userSettings.zeroBalanceWeekly || 'standard',
          tempCredit: Number(userSettings.tempCredit || 0),
          expiresOn: userSettings.expiresOn || '',
          enableCaptcha: !!userSettings.enableCaptcha,
          cryptoPromoPct: Number(userSettings.cryptoPromoPct || 0),
          promoType: userSettings.promoType || 'promo_credit',
          playerNotes: userSettings.playerNotes || '',
          sportsbook: userSettings.sports ?? true,
          casino: userSettings.casino ?? true,
          horses: userSettings.racebook ?? true,
          messaging: userSettings.messaging ?? false,
          dynamicLive: userSettings.live ?? true,
          propPlus: userSettings.props ?? true,
          liveCasino: userSettings.liveCasino ?? false,
          freePlayPercent: Number(userSettings.freePlayPercent ?? 20),
          maxFpCredit: Number(userSettings.maxFpCredit ?? 0),
          dlMinStraightBet: Number(dl.minStraightBet ?? 25),
          dlMaxStraightBet: Number(dl.maxStraightBet ?? 250),
          dlMaxPerOffering: Number(dl.maxPerOffering ?? 500),
          dlMaxBetPerEvent: Number(dl.maxBetPerEvent ?? 500),
          dlMaxWinSingleBet: Number(dl.maxWinSingleBet ?? 1000),
          dlMaxWinEvent: Number(dl.maxWinEvent ?? 3000),
          dlDelaySec: Number(dl.delaySec ?? 7),
          dlMaxFavoriteLine: Number(dl.maxFavoriteLine ?? -10000),
          dlMaxDogLine: Number(dl.maxDogLine ?? 10000),
          dlMinParlayBet: Number(dl.minParlayBet ?? 10),
          dlMaxParlayBet: Number(dl.maxParlayBet ?? 100),
          dlMaxWinEventParlay: Number(dl.maxWinEventParlay ?? 3000),
          dlMaxDogLineParlays: Number(dl.maxDogLineParlays ?? 1000),
          dlWagerCoolOffSec: Number(dl.wagerCoolOffSec ?? 30),
          dlLiveParlays: !!dlf.liveParlays,
          dlBlockPriorStart: dlf.blockPriorStart ?? true,
          dlBlockHalftime: dlf.blockHalftime ?? true,
          dlIncludeGradedInLimits: !!dlf.includeGradedInLimits,
          dlUseRiskLimits: !!dlf.useRiskLimits,
          casinoDefaultMaxWinDay: Number(cslDefault.maxWinDay ?? 10000),
          casinoDefaultMaxLossDay: Number(cslDefault.maxLossDay ?? 10000),
          casinoDefaultMaxWinWeek: Number(cslDefault.maxWinWeek ?? 10000),
          casinoDefaultMaxLossWeek: Number(cslDefault.maxLossWeek ?? 10000),
          casinoAgentMaxWinDay: Number(cslAgent.maxWinDay ?? 1000),
          casinoAgentMaxLossDay: Number(cslAgent.maxLossDay ?? 1000),
          casinoAgentMaxWinWeek: Number(cslAgent.maxWinWeek ?? 5000),
          casinoAgentMaxLossWeek: Number(cslAgent.maxLossWeek ?? 5000),
          casinoPlayerMaxWinDay: Number(cslPlayer.maxWinDay ?? 1000),
          casinoPlayerMaxLossDay: Number(cslPlayer.maxLossDay ?? 1000),
          casinoPlayerMaxWinWeek: Number(cslPlayer.maxWinWeek ?? 5000),
          casinoPlayerMaxLossWeek: Number(cslPlayer.maxLossWeek ?? 5000)
        });
      } catch (err) {
        console.error('Failed to load player details:', err);
        setError(err.message || 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchDetails();
  }, [role, userId]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (activeSection !== 'transactions' || !customer) return;
      try {
        setTxLoading(true);
        setTxError('');
        const token = localStorage.getItem('token');
        if (!token) {
          setTxError('Please login to view transactions.');
          return;
        }

        const data = await getTransactionsHistory({
          user: customer.username || '',
          type: txTypeFilter,
          status: txStatusFilter,
          time: txDisplayFilter,
          limit: 300
        }, token);
        const list = Array.isArray(data?.transactions) ? data.transactions : [];
        const forCustomer = list.filter((txn) => String(txn.userId || '') === String(userId));
        setTransactions(forCustomer);
      } catch (err) {
        setTxError(err.message || 'Failed to load transactions');
      } finally {
        setTxLoading(false);
      }
    };

    loadTransactions();
  }, [activeSection, customer, txTypeFilter, txStatusFilter, txDisplayFilter, userId]);

  useEffect(() => {
    const loadPerformance = async () => {
      if (activeSection !== 'performance' || !customer?.username) return;
      try {
        setPerformanceLoading(true);
        setPerformanceError('');
        const token = localStorage.getItem('token');
        if (!token) {
          setPerformanceError('Please login to view performance.');
          return;
        }

        const data = await getAdminBets({
          customer: customer.username,
          time: '30d',
          type: 'all-types',
          limit: 500
        }, token);
        const bets = Array.isArray(data?.bets) ? data.bets : [];
        const grouped = new Map();

        for (const bet of bets) {
          const dtRaw = bet?.createdAt;
          const dt = new Date(dtRaw);
          if (Number.isNaN(dt.getTime())) continue;
          const year = dt.getFullYear();
          const month = String(dt.getMonth() + 1).padStart(2, '0');
          const day = String(dt.getDate()).padStart(2, '0');
          const key = `${year}-${month}-${day}`;

          const amount = Number(bet?.amount || 0);
          const toWin = Number(bet?.potentialPayout || 0);
          const status = String(bet?.status || '').toLowerCase();
          const net = status === 'won' ? Math.max(0, toWin - amount) : status === 'lost' ? -amount : 0;

          if (!grouped.has(key)) grouped.set(key, { date: dt, net: 0, wagers: [] });
          const row = grouped.get(key);
          row.net += net;
          row.wagers.push({
            id: bet.id,
            label: `${bet?.match?.awayTeam || ''} vs ${bet?.match?.homeTeam || ''}`.trim() || (bet.selection || 'Wager'),
            amount: net
          });
        }

        const rows = Array.from(grouped.entries())
          .map(([key, value]) => ({
            key,
            date: value.date,
            periodLabel: value.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', weekday: 'long' }),
            net: value.net,
            wagers: value.wagers
          }))
          .sort((a, b) => b.key.localeCompare(a.key));

        setPerformanceRows(rows);
        const firstKey = rows[0]?.key || '';
        setPerformanceSelectedKey(firstKey);
        setPerformanceDayBets(rows[0]?.wagers || []);
      } catch (err) {
        setPerformanceError(err.message || 'Failed to load performance');
        setPerformanceRows([]);
        setPerformanceSelectedKey('');
        setPerformanceDayBets([]);
      } finally {
        setPerformanceLoading(false);
      }
    };

    loadPerformance();
  }, [activeSection, customer?.username]);

  useEffect(() => {
    const loadFreePlay = async () => {
      if (activeSection !== 'freeplays' || !customer?.username) return;
      try {
        setFreePlayLoading(true);
        setFreePlayError('');
        const token = localStorage.getItem('token');
        if (!token) {
          setFreePlayError('Please login to view free play.');
          return;
        }
        const data = await getTransactionsHistory({
          user: customer.username,
          type: 'adjustment',
          status: 'all',
          time: freePlayDisplayFilter,
          limit: 300
        }, token);
        const list = Array.isArray(data?.transactions) ? data.transactions : [];
        const filtered = list.filter((txn) => {
          if (String(txn.userId || '') !== String(userId)) return false;
          const reason = String(txn.reason || '').toUpperCase();
          const desc = String(txn.description || '').toLowerCase();
          return reason === 'FREEPLAY_ADJUSTMENT' || desc.includes('freeplay') || desc.includes('free play');
        });
        setFreePlayRows(filtered);
      } catch (err) {
        setFreePlayError(err.message || 'Failed to load free play');
      } finally {
        setFreePlayLoading(false);
      }
    };

    loadFreePlay();
  }, [activeSection, customer?.username, freePlayDisplayFilter, userId]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fullName = useMemo(() => {
    const byFields = `${form.firstName || ''} ${form.lastName || ''}`.trim();
    if (byFields) return byFields;
    if (customer?.fullName) return customer.fullName;
    return '';
  }, [form.firstName, form.lastName, customer?.fullName]);

  const displayName = useMemo(() => {
    return fullName || customer?.username || 'Player';
  }, [fullName, customer?.username]);

  const displayPassword = useMemo(() => {
    if (!customer) return '';
    return customer.displayPassword || 'Not set';
  }, [customer]);

  const available = useMemo(() => {
    return Number(form.creditLimit || 0) - Number(customer?.pendingBalance || 0);
  }, [form.creditLimit, customer?.pendingBalance]);

  const txSummary = useMemo(() => {
    let nonPostedCasino = 0;
    for (const txn of transactions) {
      if (txn?.status === 'pending' && String(txn?.type || '').toLowerCase().includes('casino')) {
        nonPostedCasino += Number(txn.amount || 0);
      }
    }
    return {
      pending: Number(customer?.pendingBalance || 0),
      available: Number(available || 0),
      carry: Number(customer?.balance || 0),
      nonPostedCasino
    };
  }, [transactions, customer?.pendingBalance, customer?.balance, available]);

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  const handleImpersonate = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = await impersonateUser(userId, token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Impersonation failed: ' + err.message);
    }
  };

  const copyText = async (text, label = 'Copied') => {
    try {
      const next = String(text ?? '');
      if (!next) return;
      await navigator.clipboard.writeText(next);
      setCopyNotice(`${label} copied`);
      window.setTimeout(() => setCopyNotice(''), 1400);
    } catch {
      setCopyNotice('Copy failed');
      window.setTimeout(() => setCopyNotice(''), 1400);
    }
  };

  const copyAllDetails = async () => {
    const details = [
      `Login: ${customer?.username || ''}`,
      `Password: ${displayPassword || ''}`,
      `Min bet: ${Number(customer?.minBet ?? 0)}`,
      `Max bet: ${Number(customer?.maxBet ?? customer?.wagerLimit ?? form.wagerLimit ?? 0)}`,
      `Credit: ${Number(form.creditLimit || customer?.creditLimit || 0)}`,
      `Settle: ${Number(form.settleLimit || customer?.balanceOwed || 0)}`
    ].join('\n');
    await copyText(details, 'All details');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        return;
      }

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        fullName: fullName,
        status: form.status,
        minBet: Number(form.minBet || 0),
        creditLimit: Number(form.creditLimit || 0),
        maxBet: Number(form.wagerLimit || 0),
        wagerLimit: Number(form.wagerLimit || 0),
        balanceOwed: Number(form.settleLimit || 0),
        settings: {
          accountType: form.accountType,
          zeroBalanceWeekly: form.zeroBalanceWeekly,
          tempCredit: Number(form.tempCredit || 0),
          expiresOn: form.expiresOn || '',
          enableCaptcha: !!form.enableCaptcha,
          cryptoPromoPct: Number(form.cryptoPromoPct || 0),
          promoType: form.promoType,
          playerNotes: form.playerNotes,
          sports: !!form.sportsbook,
          casino: !!form.casino,
          racebook: !!form.horses,
          messaging: !!form.messaging,
          live: !!form.dynamicLive,
          props: !!form.propPlus,
          liveCasino: !!form.liveCasino
        }
      };

      if (['admin', 'super_agent', 'master_agent'].includes(role) && form.agentId) {
        payload.agentId = form.agentId;
      }

      if (role === 'agent') {
        await updateUserByAgent(userId, payload, token);
      } else {
        await updateUserByAdmin(userId, payload, token);
      }

      if ((form.password || '').trim() !== '') {
        if (role === 'admin') {
          await resetUserPasswordByAdmin(userId, form.password.trim(), token);
        } else {
          await updateUserByAgent(userId, { password: form.password.trim() }, token);
        }
      }

        setCustomer((prev) => ({
        ...prev,
        ...payload,
        settings: {
          ...(prev?.settings || {}),
          ...payload.settings
        }
      }));
      setForm((prev) => ({ ...prev, password: '' }));
      setSuccess('Changes saved successfully.');
    } catch (err) {
      console.error('Failed to save player details:', err);
      setError(err.message || 'Failed to save details');
    } finally {
      setSaving(false);
    }
  };

  const updateBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !customer) return;
      await updateUserCredit(userId, { balance: Number(customer.balance || 0) }, token);
      setSuccess('Balance updated.');
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to update balance');
    }
  };

  const toTxDate = (value) => {
    if (!value) return '—';
    const dateValue = value?.$date || value;
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString();
  };

  const txIsDebit = (txn) => {
    const type = String(txn?.type || '').toLowerCase();
    return ['withdrawal', 'bet_placed', 'bet_lost', 'fee', 'debit'].includes(type);
  };

  const openSection = (sectionId) => {
    if (sectionId === 'transactions') {
      setActiveSection('transactions');
      setTxDisplayFilter('7d');
      setTxTypeFilter('adjustment');
      setTxStatusFilter('all');
    } else if (sectionId === 'pending') {
      setActiveSection('transactions');
      setTxDisplayFilter('7d');
      setTxTypeFilter('adjustment');
      setTxStatusFilter('pending');
    } else if (sectionId === 'performance') {
      setActiveSection('performance');
    } else if (sectionId === 'freeplays') {
      setActiveSection('freeplays');
    } else if (sectionId === 'dynamic-live') {
      setActiveSection('dynamic-live');
    } else if (sectionId === 'live-casino') {
      setActiveSection('live-casino');
    } else {
      setActiveSection('basics');
    }
    setShowBasicsMenu(false);
    setSuccess('');
    setTxSuccess('');
    setError('');
    setTxError('');
    setPerformanceError('');
    setFreePlayError('');
    setFreePlaySuccess('');
    setDynamicLiveError('');
    setDynamicLiveSuccess('');
    setCasinoError('');
    setCasinoSuccess('');
  };

  const activePerformanceRow = useMemo(() => {
    return performanceRows.find((row) => row.key === performanceSelectedKey) || null;
  }, [performanceRows, performanceSelectedKey]);

  useEffect(() => {
    if (!activePerformanceRow) {
      setPerformanceDayBets([]);
      return;
    }
    setPerformanceDayBets(activePerformanceRow.wagers || []);
  }, [activePerformanceRow]);

  const performanceResult = useMemo(() => {
    return performanceDayBets.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }, [performanceDayBets]);

  const freePlayPending = useMemo(() => {
    return freePlayRows
      .filter((txn) => String(txn.status || '').toLowerCase() === 'pending')
      .reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
  }, [freePlayRows]);

  const freePlayBalance = Number(customer?.freeplayBalance || 0);

  const refreshFreePlay = async () => {
    if (!customer?.username) return;
    try {
      setFreePlayLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const data = await getTransactionsHistory({
        user: customer.username,
        type: 'adjustment',
        status: 'all',
        time: freePlayDisplayFilter,
        limit: 300
      }, token);
      const list = Array.isArray(data?.transactions) ? data.transactions : [];
      setFreePlayRows(list.filter((txn) => {
        if (String(txn.userId || '') !== String(userId)) return false;
        const reason = String(txn.reason || '').toUpperCase();
        const desc = String(txn.description || '').toLowerCase();
        return reason === 'FREEPLAY_ADJUSTMENT' || desc.includes('freeplay') || desc.includes('free play');
      }));
    } catch (err) {
      setFreePlayError(err.message || 'Failed to refresh free play');
    } finally {
      setFreePlayLoading(false);
    }
  };

  const handleCreateFreePlay = async () => {
    try {
      const amount = Number(newFreePlayAmount || 0);
      if (amount <= 0 || Number.isNaN(amount)) {
        setFreePlayError('Enter a valid free play amount greater than 0.');
        return;
      }
      const token = localStorage.getItem('token');
      if (!token || !customer) {
        setFreePlayError('Please login again.');
        return;
      }
      const nextFreeplay = Number(customer.freeplayBalance || 0) + amount;
      await updateUserFreeplay(userId, nextFreeplay, token, newFreePlayDescription.trim());
      setCustomer((prev) => ({ ...prev, freeplayBalance: nextFreeplay }));
      if (newFreePlayDescription.trim()) {
        setFreePlaySuccess(`Free play added. Note: "${newFreePlayDescription.trim()}"`);
      } else {
        setFreePlaySuccess('Free play added successfully.');
      }
      setFreePlayError('');
      setShowNewFreePlayModal(false);
      setNewFreePlayAmount('');
      setNewFreePlayDescription('');
      await refreshFreePlay();
    } catch (err) {
      setFreePlayError(err.message || 'Failed to add free play');
    }
  };

  const toggleFreePlaySelection = (txId) => {
    setFreePlaySelectedIds((prev) => (
      prev.includes(txId) ? prev.filter((id) => id !== txId) : [...prev, txId]
    ));
  };

  const handleDeleteFreePlaySelected = async () => {
    try {
      if (freePlaySelectedIds.length === 0) return;
      const token = localStorage.getItem('token');
      if (!token) {
        setFreePlayError('Please login again.');
        return;
      }
      const result = await deleteAdminTransactions(freePlaySelectedIds, token);
      const deleted = Number(result?.deleted || 0);
      const skipped = Number(result?.skipped || 0);
      setFreePlaySelectedIds([]);
      setFreePlaySuccess(`Deleted ${deleted} free play transaction(s).${skipped > 0 ? ` Skipped ${skipped}.` : ''}`);
      setFreePlayError('');
      await refreshFreePlay();
    } catch (err) {
      setFreePlayError(err.message || 'Failed to delete free play transactions');
    }
  };

  const handleSaveFreePlaySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFreePlayError('Please login again.');
        return;
      }
      const settingsPayload = {
        settings: {
          freePlayPercent: Number(form.freePlayPercent || 0),
          maxFpCredit: Number(form.maxFpCredit || 0)
        }
      };
      if (role === 'agent') {
        await updateUserByAgent(userId, settingsPayload, token);
      } else {
        await updateUserByAdmin(userId, settingsPayload, token);
      }
      setFreePlaySuccess('Free play settings saved.');
      setFreePlayError('');
    } catch (err) {
      setFreePlayError(err.message || 'Failed to save free play settings');
    }
  };

  const handleSaveDynamicLive = async () => {
    try {
      setDynamicLiveSaving(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setDynamicLiveError('Please login again.');
        return;
      }
      const payload = {
        settings: {
          dynamicLiveLimits: {
            minStraightBet: Number(form.dlMinStraightBet || 0),
            maxStraightBet: Number(form.dlMaxStraightBet || 0),
            maxPerOffering: Number(form.dlMaxPerOffering || 0),
            maxBetPerEvent: Number(form.dlMaxBetPerEvent || 0),
            maxWinSingleBet: Number(form.dlMaxWinSingleBet || 0),
            maxWinEvent: Number(form.dlMaxWinEvent || 0),
            delaySec: Number(form.dlDelaySec || 0),
            maxFavoriteLine: Number(form.dlMaxFavoriteLine || 0),
            maxDogLine: Number(form.dlMaxDogLine || 0),
            minParlayBet: Number(form.dlMinParlayBet || 0),
            maxParlayBet: Number(form.dlMaxParlayBet || 0),
            maxWinEventParlay: Number(form.dlMaxWinEventParlay || 0),
            maxDogLineParlays: Number(form.dlMaxDogLineParlays || 0),
            wagerCoolOffSec: Number(form.dlWagerCoolOffSec || 0)
          },
          dynamicLiveFlags: {
            liveParlays: !!form.dlLiveParlays,
            blockPriorStart: !!form.dlBlockPriorStart,
            blockHalftime: !!form.dlBlockHalftime,
            includeGradedInLimits: !!form.dlIncludeGradedInLimits,
            useRiskLimits: !!form.dlUseRiskLimits
          }
        }
      };
      if (role === 'agent') {
        await updateUserByAgent(userId, payload, token);
      } else {
        await updateUserByAdmin(userId, payload, token);
      }
      setDynamicLiveSuccess('Dynamic Live settings saved.');
      setDynamicLiveError('');
    } catch (err) {
      setDynamicLiveError(err.message || 'Failed to save Dynamic Live settings');
    } finally {
      setDynamicLiveSaving(false);
    }
  };

  const handleSaveCasinoLimits = async () => {
    try {
      setCasinoSaving(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setCasinoError('Please login again.');
        return;
      }
      const payload = {
        settings: {
          liveCasinoLimits: {
            default: {
              maxWinDay: Number(form.casinoDefaultMaxWinDay || 0),
              maxLossDay: Number(form.casinoDefaultMaxLossDay || 0),
              maxWinWeek: Number(form.casinoDefaultMaxWinWeek || 0),
              maxLossWeek: Number(form.casinoDefaultMaxLossWeek || 0)
            },
            agent: {
              maxWinDay: Number(form.casinoAgentMaxWinDay || 0),
              maxLossDay: Number(form.casinoAgentMaxLossDay || 0),
              maxWinWeek: Number(form.casinoAgentMaxWinWeek || 0),
              maxLossWeek: Number(form.casinoAgentMaxLossWeek || 0)
            },
            player: {
              maxWinDay: Number(form.casinoPlayerMaxWinDay || 0),
              maxLossDay: Number(form.casinoPlayerMaxLossDay || 0),
              maxWinWeek: Number(form.casinoPlayerMaxWinWeek || 0),
              maxLossWeek: Number(form.casinoPlayerMaxLossWeek || 0)
            }
          }
        }
      };
      if (role === 'agent') {
        await updateUserByAgent(userId, payload, token);
      } else {
        await updateUserByAdmin(userId, payload, token);
      }
      setCasinoSuccess('Live Casino limits saved.');
      setCasinoError('');
    } catch (err) {
      setCasinoError(err.message || 'Failed to save Live Casino limits');
    } finally {
      setCasinoSaving(false);
    }
  };

  const refreshTransactions = async () => {
    if (!customer) return;
    setTxLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const data = await getTransactionsHistory({
        user: customer.username || '',
        type: txTypeFilter,
        status: txStatusFilter,
        time: txDisplayFilter,
        limit: 300
      }, token);
      const list = Array.isArray(data?.transactions) ? data.transactions : [];
      setTransactions(list.filter((txn) => String(txn.userId || '') === String(userId)));
    } catch (err) {
      setTxError(err.message || 'Failed to refresh transactions');
    } finally {
      setTxLoading(false);
    }
  };

  const handleCreateTransaction = async () => {
    try {
      const amount = Number(newTxAmount || 0);
      if (amount <= 0 || Number.isNaN(amount)) {
        setTxError('Enter a valid amount greater than 0.');
        return;
      }
      const token = localStorage.getItem('token');
      if (!token || !customer) {
        setTxError('Please login again.');
        return;
      }
      const currentBalance = Number(customer.balance || 0);
      const nextBalance = newTxType === 'credit'
        ? currentBalance + amount
        : Math.max(0, currentBalance - amount);
      await updateUserCredit(userId, { balance: nextBalance }, token);
      setCustomer((prev) => ({ ...prev, balance: nextBalance }));
      setTxSuccess('Transaction saved and balance updated.');
      setTxError('');
      setShowNewTxModal(false);
      setNewTxAmount('');
      setNewTxDescription('');
      await refreshTransactions();
    } catch (err) {
      setTxError(err.message || 'Failed to save transaction');
    }
  };

  const toggleTxSelection = (txId) => {
    setSelectedTxIds((prev) => (
      prev.includes(txId) ? prev.filter((id) => id !== txId) : [...prev, txId]
    ));
  };

  const handleDeleteSelected = async () => {
    try {
      if (selectedTxIds.length === 0) return;
      const token = localStorage.getItem('token');
      if (!token) {
        setTxError('Please login again.');
        return;
      }
      const result = await deleteAdminTransactions(selectedTxIds, token);
      setSelectedTxIds([]);
      await refreshTransactions();
      const deleted = Number(result?.deleted || 0);
      const skipped = Number(result?.skipped || 0);
      setTxSuccess(`Deleted ${deleted} transaction(s).${skipped > 0 ? ` Skipped ${skipped} (non-adjustment or invalid).` : ''}`);
      setTxError('');
    } catch (err) {
      setTxError(err.message || 'Failed to delete selected transactions');
    }
  };

  if (loading) {
    return <div className="admin-view"><div className="view-content">Loading player details...</div></div>;
  }

  if (!customer) {
    return <div className="admin-view"><div className="view-content">User not found.</div></div>;
  }

  return (
    <div className="customer-details-v2">
      <div className="top-panel">
        <div className="top-left">
          <button className="btn btn-back" onClick={onBack}>Customer Admin</button>
          <div className="player-card">
            <div className="player-card-head">
              <div className="player-title-wrap">
                <h2>{customer.username || 'USER'}</h2>
                <span className="player-badge">PLAYER</span>
              </div>
              <div className="top-actions">
                <button className="btn btn-user" onClick={handleImpersonate}>Login User</button>
                <button className="btn btn-copy-all" onClick={copyAllDetails}>Copy Details</button>
              </div>
            </div>

            <div className="creds-box">
              <div className="creds-row">
                <span>Login:</span>
                <div className="creds-pill">{customer.username || ''}</div>
                <button className="copy-mini" onClick={() => copyText(customer.username, 'Login')}>📋</button>
              </div>
              <div className="creds-row">
                <span>Password:</span>
                <div className="creds-pill">{displayPassword}</div>
                <button className="copy-mini" onClick={() => copyText(displayPassword, 'Password')}>📋</button>
              </div>
            </div>

            <div className="limits-box">
              <div className="limit-item">
                <label>Min bet:</label>
                <strong>{Number(customer.minBet ?? 0).toLocaleString()}</strong>
              </div>
              <div className="limit-item">
                <label>Max bet:</label>
                <strong>{Number(customer.maxBet ?? customer.wagerLimit ?? form.wagerLimit ?? 0).toLocaleString()}</strong>
              </div>
              <div className="limit-item">
                <label>Credit:</label>
                <strong className="money-green">{Number(form.creditLimit || customer.creditLimit || 0).toLocaleString()}</strong>
              </div>
              <div className="limit-item">
                <label>Settle:</label>
                <strong className="money-green">{Number(form.settleLimit || customer.balanceOwed || 0).toLocaleString()}</strong>
              </div>
            </div>
          </div>
          {copyNotice && (
            <div className="copy-notice">{copyNotice}</div>
          )}
          <div className="agent-line">Agent {customer.agentUsername || customer.agentId?.username || '—'}</div>
          <div className="top-actions mobile-only">
            <button className="btn btn-user" onClick={handleImpersonate}>Login User</button>
            <button className="btn btn-copy-all" onClick={copyAllDetails}>Copy Details</button>
          </div>
        </div>
        <div className="top-right">
          <button type="button" className={`metric ${activeSection === 'transactions' ? 'metric-active' : ''}`} onClick={() => openSection('transactions')}>
            <span>Balance</span>
            <b className={Number(customer.balance || 0) < 0 ? 'neg' : 'pos'}>{formatCurrency(customer.balance || 0)}</b>
          </button>
          <button type="button" className={`metric ${activeSection === 'transactions' && txStatusFilter === 'pending' ? 'metric-active' : ''}`} onClick={() => openSection('pending')}>
            <span>Pending</span>
            <b className="neutral">{formatCurrency(customer.pendingBalance || 0)}</b>
          </button>
          <div className="metric"><span>Available</span><b className="neutral">{formatCurrency(available)}</b></div>
          <button type="button" className={`metric ${activeSection === 'freeplays' ? 'metric-active' : ''}`} onClick={() => openSection('freeplays')}>
            <span>Freeplay</span>
            <b className="neutral">{formatCurrency(customer.freeplayBalance || 0)}</b>
          </button>
          <button type="button" className={`metric ${activeSection === 'performance' ? 'metric-active' : ''}`} onClick={() => openSection('performance')}>
            <span>Lifetime +/-</span>
            <b className={Number(stats.netProfit || 0) < 0 ? 'neg' : 'pos'}>{formatCurrency(stats.netProfit || 0)}</b>
          </button>
        </div>
      </div>

      <div className="basics-header">
        <div className="basics-left">
          <button
            type="button"
            className="dot-grid-btn"
            onClick={() => setShowBasicsMenu((prev) => !prev)}
            aria-label="Open quick sections menu"
          >
            <div className="dot-grid" aria-hidden="true">
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
            </div>
          </button>
          <h3>{activeSection === 'transactions' ? 'Transactions' : activeSection === 'performance' ? 'Performance' : activeSection === 'freeplays' ? 'Free Play' : activeSection === 'dynamic-live' ? 'Dynamic Live' : activeSection === 'live-casino' ? 'Live Casino' : 'The Basics'}</h3>
        </div>
        {activeSection === 'transactions' ? (
          <button className="btn btn-back" onClick={() => setShowNewTxModal(true)}>New transaction</button>
        ) : activeSection === 'freeplays' ? (
          <button className="btn btn-back" onClick={() => setShowNewFreePlayModal(true)}>New Free Play</button>
        ) : activeSection === 'dynamic-live' ? (
          <button className="btn btn-save" onClick={handleSaveDynamicLive} disabled={dynamicLiveSaving}>{dynamicLiveSaving ? 'Saving...' : 'Save'}</button>
        ) : activeSection === 'live-casino' ? (
          <button className="btn btn-save" onClick={handleSaveCasinoLimits} disabled={casinoSaving}>{casinoSaving ? 'Saving...' : 'Save'}</button>
        ) : activeSection === 'performance' ? (
          <span></span>
        ) : (
          <button className="btn btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        )}
      </div>

      {showBasicsMenu && (
        <>
          <button type="button" className="menu-backdrop" onClick={() => setShowBasicsMenu(false)} aria-label="Close quick sections menu"></button>
          <div className="basics-quick-menu">
            <button type="button" className="menu-close" onClick={() => setShowBasicsMenu(false)} aria-label="Close menu">x</button>
            <div className="menu-grid">
              {quickMenuItems.map((item) => (
                <button key={item.id} type="button" className="menu-item" onClick={() => openSection(item.id)}>
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {activeSection === 'transactions' ? txError && <div className="alert error">{txError}</div> : activeSection === 'performance' ? performanceError && <div className="alert error">{performanceError}</div> : activeSection === 'freeplays' ? freePlayError && <div className="alert error">{freePlayError}</div> : activeSection === 'dynamic-live' ? dynamicLiveError && <div className="alert error">{dynamicLiveError}</div> : activeSection === 'live-casino' ? casinoError && <div className="alert error">{casinoError}</div> : error && <div className="alert error">{error}</div>}
      {activeSection === 'transactions' ? txSuccess && <div className="alert success">{txSuccess}</div> : activeSection === 'freeplays' ? freePlaySuccess && <div className="alert success">{freePlaySuccess}</div> : activeSection === 'dynamic-live' ? dynamicLiveSuccess && <div className="alert success">{dynamicLiveSuccess}</div> : activeSection === 'live-casino' ? casinoSuccess && <div className="alert success">{casinoSuccess}</div> : success && <div className="alert success">{success}</div>}

      {activeSection === 'transactions' ? (
        <div className="transactions-wrap">
          <div className="tx-controls">
            <div className="tx-field">
              <label>Display</label>
              <select value={txDisplayFilter} onChange={(e) => setTxDisplayFilter(e.target.value)}>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="this-month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div className="tx-field">
              <label>Filter Transactions</label>
              <select value={txTypeFilter} onChange={(e) => setTxTypeFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="adjustment">Non-Wager</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="bet_placed">Wagers</option>
              </select>
            </div>
            <div className="tx-stat"><label>Pending</label><b>{formatCurrency(txSummary.pending)}</b></div>
            <div className="tx-stat"><label>Available</label><b>{formatCurrency(txSummary.available)}</b></div>
            <div className="tx-stat"><label>Carry</label><b className={txSummary.carry < 0 ? 'neg' : ''}>{formatCurrency(txSummary.carry)}</b></div>
            <div className="tx-stat"><label>Non-Posted Casino</label><b>{formatCurrency(txSummary.nonPostedCasino)}</b></div>
          </div>

          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Credit</th>
                  <th>Debit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  <tr><td colSpan={5} className="tx-empty">Loading transactions...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={5} className="tx-empty">No transactions found</td></tr>
                ) : transactions.map((txn) => {
                  const isDebit = txIsDebit(txn);
                  const amount = Number(txn.amount || 0);
                  const credit = isDebit ? 0 : amount;
                  const debit = isDebit ? amount : 0;
                  const selected = selectedTxIds.includes(txn.id);
                  return (
                    <tr key={txn.id} className={selected ? 'selected' : ''} onClick={() => toggleTxSelection(txn.id)}>
                      <td>{toTxDate(txn.date)}</td>
                      <td>{txn.description || txn.type || 'Transaction'}</td>
                      <td>{credit > 0 ? formatCurrency(credit) : '—'}</td>
                      <td>{debit > 0 ? formatCurrency(debit) : '—'}</td>
                      <td className={Number(customer.balance || 0) < 0 ? 'neg' : ''}>{formatCurrency(customer.balance || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button className="btn btn-danger" onClick={handleDeleteSelected} disabled={selectedTxIds.length === 0}>Delete</button>
        </div>
      ) : activeSection === 'performance' ? (
        <div className="performance-wrap">
          <div className="perf-controls">
            <div className="tx-field">
              <label>Time</label>
              <select value={performancePeriod} onChange={(e) => setPerformancePeriod(e.target.value)}>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
          <div className="performance-grid">
            <div className="perf-left">
              <table className="perf-table">
                <thead>
                  <tr><th>Period</th><th>Net</th></tr>
                </thead>
                <tbody>
                  {performanceLoading ? (
                    <tr><td colSpan={2} className="tx-empty">Loading performance...</td></tr>
                  ) : performanceRows.length === 0 ? (
                    <tr><td colSpan={2} className="tx-empty">No performance data</td></tr>
                  ) : performanceRows.map((row) => (
                    <tr key={row.key} className={performanceSelectedKey === row.key ? 'selected' : ''} onClick={() => setPerformanceSelectedKey(row.key)}>
                      <td>{row.periodLabel}</td>
                      <td>{Number(row.net || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="perf-right">
              <div className="perf-title-row">
                <div>Wagers: <b>{performanceDayBets.length}</b></div>
                <div>Result: <b>{formatCurrency(performanceResult)}</b></div>
              </div>
              <table className="perf-table">
                <thead>
                  <tr><th>{activePerformanceRow?.periodLabel || 'Selected Day'}</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {performanceDayBets.length === 0 ? (
                    <tr><td colSpan={2} className="tx-empty">No data available in table</td></tr>
                  ) : performanceDayBets.map((wager) => (
                    <tr key={wager.id}>
                      <td>{wager.label || 'Wager'}</td>
                      <td>{Number(wager.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSection === 'freeplays' ? (
        <div className="transactions-wrap">
          <div className="tx-controls freeplay-controls">
            <div className="tx-field">
              <label>Display</label>
              <select value={freePlayDisplayFilter} onChange={(e) => setFreePlayDisplayFilter(e.target.value)}>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="this-month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div className="tx-stat"><label>Balance</label><b>{Number(freePlayBalance).toFixed(2)}</b></div>
            <div className="tx-stat"><label>Pending</label><b>{Number(freePlayPending).toFixed(2)}</b></div>
          </div>

          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Credit</th>
                  <th>Debit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {freePlayLoading ? (
                  <tr><td colSpan={6} className="tx-empty">Loading free play...</td></tr>
                ) : freePlayRows.length === 0 ? (
                  <tr><td colSpan={6} className="tx-empty">No free play transactions found</td></tr>
                ) : freePlayRows.map((txn) => {
                  const amount = Number(txn.amount || 0);
                  const credit = amount > 0 ? amount : 0;
                  const selected = freePlaySelectedIds.includes(txn.id);
                  return (
                    <tr key={txn.id} className={selected ? 'selected' : ''} onClick={() => toggleFreePlaySelection(txn.id)}>
                      <td>{customer.username}</td>
                      <td>{toTxDate(txn.date)}</td>
                      <td>{txn.description || 'Free Play Adjustment'}</td>
                      <td>{credit > 0 ? Number(credit).toFixed(2) : '—'}</td>
                      <td>—</td>
                      <td>{Number(freePlayBalance).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="freeplay-bottom-row">
            <button className="btn btn-danger" onClick={handleDeleteFreePlaySelected} disabled={freePlaySelectedIds.length === 0}>Delete</button>
            <button className="btn btn-back freeplay-settings-btn" onClick={handleSaveFreePlaySettings}>Detailed Free Play Settings</button>
            <div className="freeplay-inputs">
              <div className="tx-field">
                <label>Free Play %</label>
                <input type="number" value={form.freePlayPercent} onChange={(e) => setField('freePlayPercent', e.target.value)} />
              </div>
              <div className="tx-field">
                <label>Max FP Credit</label>
                <input type="number" value={form.maxFpCredit} onChange={(e) => setField('maxFpCredit', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      ) : activeSection === 'dynamic-live' ? (
        <div className="dynamic-live-wrap">
          <div className="tx-field dl-top-select">
            <label>View Settings</label>
            <select value="wagering_limits" readOnly>
              <option value="wagering_limits">Wagering Limits</option>
            </select>
          </div>
          <div className="dynamic-live-grid">
            <div className="dl-col">
              <label>Min Straight Bet :</label><input type="number" value={form.dlMinStraightBet} onChange={(e) => setField('dlMinStraightBet', e.target.value)} />
              <label>Max Straight Bet :</label><input type="number" value={form.dlMaxStraightBet} onChange={(e) => setField('dlMaxStraightBet', e.target.value)} />
              <label>Max Per Offering :</label><input type="number" value={form.dlMaxPerOffering} onChange={(e) => setField('dlMaxPerOffering', e.target.value)} />
              <label>Max Bet Per Event :</label><input type="number" value={form.dlMaxBetPerEvent} onChange={(e) => setField('dlMaxBetPerEvent', e.target.value)} />
              <label>Max Win for Single Bet :</label><input type="number" value={form.dlMaxWinSingleBet} onChange={(e) => setField('dlMaxWinSingleBet', e.target.value)} />
              <label>Max Win for Event :</label><input type="number" value={form.dlMaxWinEvent} onChange={(e) => setField('dlMaxWinEvent', e.target.value)} />
              <label>Delay (sec) - minimum 5 :</label><input type="number" value={form.dlDelaySec} onChange={(e) => setField('dlDelaySec', e.target.value)} />
            </div>
            <div className="dl-col">
              <label>Max Favorite Line :</label><input type="number" value={form.dlMaxFavoriteLine} onChange={(e) => setField('dlMaxFavoriteLine', e.target.value)} />
              <label>Max Dog Line :</label><input type="number" value={form.dlMaxDogLine} onChange={(e) => setField('dlMaxDogLine', e.target.value)} />
              <label>Min Parlay Bet :</label><input type="number" value={form.dlMinParlayBet} onChange={(e) => setField('dlMinParlayBet', e.target.value)} />
              <label>Max Parlay Bet :</label><input type="number" value={form.dlMaxParlayBet} onChange={(e) => setField('dlMaxParlayBet', e.target.value)} />
              <label>Max Win for Event(parlay only) :</label><input type="number" value={form.dlMaxWinEventParlay} onChange={(e) => setField('dlMaxWinEventParlay', e.target.value)} />
              <label>Max Dog Line (Parlays) :</label><input type="number" value={form.dlMaxDogLineParlays} onChange={(e) => setField('dlMaxDogLineParlays', e.target.value)} />
              <label>Wager Cool-Off (sec) :</label><input type="number" value={form.dlWagerCoolOffSec} onChange={(e) => setField('dlWagerCoolOffSec', e.target.value)} />
            </div>
            <div className="dl-col-toggles">
              {[['Live Parlays', 'dlLiveParlays'], ['Block Wagering Prior To Start', 'dlBlockPriorStart'], ['Block Wagering at Halftime', 'dlBlockHalftime'], ['Include Graded Wagers in Limits', 'dlIncludeGradedInLimits'], ['Use Risk (not Volume) for Limits', 'dlUseRiskLimits']].map(([label, key]) => (
                <div className="switch-row" key={key}>
                  <span>{label} :</span>
                  <label className="switch">
                    <input type="checkbox" checked={!!form[key]} onChange={(e) => setField(key, e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeSection === 'live-casino' ? (
        <div className="live-casino-wrap">
          <div className="live-casino-grid">
            <div></div>
            <div className="lc-col-head">Default</div>
            <div className="lc-col-head">Agent</div>
            <div className="lc-col-head">Player</div>

            <div className="lc-label">Max Win Per Day</div>
            <input type="number" value={form.casinoDefaultMaxWinDay} onChange={(e) => setField('casinoDefaultMaxWinDay', e.target.value)} />
            <input type="number" value={form.casinoAgentMaxWinDay} onChange={(e) => setField('casinoAgentMaxWinDay', e.target.value)} />
            <input type="number" value={form.casinoPlayerMaxWinDay} onChange={(e) => setField('casinoPlayerMaxWinDay', e.target.value)} />

            <div className="lc-label">Max Loss Per Day</div>
            <input type="number" value={form.casinoDefaultMaxLossDay} onChange={(e) => setField('casinoDefaultMaxLossDay', e.target.value)} />
            <input type="number" value={form.casinoAgentMaxLossDay} onChange={(e) => setField('casinoAgentMaxLossDay', e.target.value)} />
            <input type="number" value={form.casinoPlayerMaxLossDay} onChange={(e) => setField('casinoPlayerMaxLossDay', e.target.value)} />

            <div className="lc-label">Max Win Per Week</div>
            <input type="number" value={form.casinoDefaultMaxWinWeek} onChange={(e) => setField('casinoDefaultMaxWinWeek', e.target.value)} />
            <input type="number" value={form.casinoAgentMaxWinWeek} onChange={(e) => setField('casinoAgentMaxWinWeek', e.target.value)} />
            <input type="number" value={form.casinoPlayerMaxWinWeek} onChange={(e) => setField('casinoPlayerMaxWinWeek', e.target.value)} />

            <div className="lc-label">Max Loss Per Week</div>
            <input type="number" value={form.casinoDefaultMaxLossWeek} onChange={(e) => setField('casinoDefaultMaxLossWeek', e.target.value)} />
            <input type="number" value={form.casinoAgentMaxLossWeek} onChange={(e) => setField('casinoAgentMaxLossWeek', e.target.value)} />
            <input type="number" value={form.casinoPlayerMaxLossWeek} onChange={(e) => setField('casinoPlayerMaxLossWeek', e.target.value)} />
          </div>

          <p className="lc-note">
            *Players that do not have a limit will be assigned the default limit or agent limit if one exists. Once player limits are assigned they will have to be manually overridden either by changing them individually or by changing an agent and sending through the new default limits they want to apply.
          </p>
        </div>
      ) : (
      <>

      <div className="basics-grid">
        <div className="col-card">
          <label>First Name</label>
          <input
            value={form.firstName}
            placeholder="Enter first name"
            onChange={(e) => setField('firstName', e.target.value)}
          />

          <label>Last Name</label>
          <input
            value={form.lastName}
            placeholder="Enter last name"
            onChange={(e) => setField('lastName', e.target.value)}
          />

          <label>Phone Number</label>
          <input
            type="tel"
            value={form.phoneNumber}
            placeholder="Enter phone number"
            onChange={(e) => setField('phoneNumber', e.target.value)}
          />

          <label>Password</label>
          <input value={form.password} placeholder={displayPassword} onChange={(e) => setField('password', e.target.value)} />

          <label>Master Agent</label>
          {['admin', 'super_agent', 'master_agent'].includes(role) ? (
            <select value={form.agentId} onChange={(e) => setField('agentId', e.target.value)}>
              <option value="">None</option>
              {agents.map((a) => {
                const id = a.id || a._id;
                return <option key={id} value={id}>{a.username}</option>;
              })}
            </select>
          ) : (
            <input value={customer.agentUsername || '—'} readOnly />
          )}

          <label>Account Status</label>
          <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="read_only">Read Only</option>
          </select>

          <div className="switch-list">
            {[['Sportsbook', 'sportsbook'], ['LV Casino', 'casino'], ['Racebook', 'horses'], ['Messaging', 'messaging'], ['Dynamic Live', 'dynamicLive'], ['Prop Plus', 'propPlus'], ['Live Casino', 'liveCasino']].map(([label, key]) => (
              <div className="switch-row" key={key}>
                <span>{label}</span>
                <label className="switch">
                  <input type="checkbox" checked={!!form[key]} onChange={(e) => setField(key, e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="col-card">
          <label>Website</label>
          <input value={window.location.hostname} readOnly />

          <label>Account Type</label>
          <select value={form.accountType} onChange={(e) => setField('accountType', e.target.value)}>
            <option value="credit">Credit</option>
            <option value="post_up">Post Up</option>
          </select>

          <label>Min bet</label>
          <input type="number" value={form.minBet} onChange={(e) => setField('minBet', e.target.value)} />

          <label>Max bet</label>
          <input type="number" value={form.wagerLimit} onChange={(e) => setField('wagerLimit', e.target.value)} />

          <label>Credit Limit</label>
          <input type="number" value={form.creditLimit} onChange={(e) => setField('creditLimit', e.target.value)} />

          <label>Settle Limit</label>
          <input type="number" value={form.settleLimit} onChange={(e) => setField('settleLimit', e.target.value)} />

          <label>Zero Balance / Weekly</label>
          <select value={form.zeroBalanceWeekly} onChange={(e) => setField('zeroBalanceWeekly', e.target.value)}>
            <option value="standard">Standard</option>
            <option value="zero_balance">Zero Balance</option>
            <option value="weekly">Weekly</option>
          </select>

          <label>Temporary Credit</label>
          <input type="number" value={form.tempCredit} onChange={(e) => setField('tempCredit', e.target.value)} />
        </div>

        <div className="col-card">
          <div className="switch-row inline-top">
            <span>Enable Captcha</span>
            <label className="switch">
              <input type="checkbox" checked={form.enableCaptcha} onChange={(e) => setField('enableCaptcha', e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>

          <label>Crypto Promo (%)</label>
          <input type="number" value={form.cryptoPromoPct} onChange={(e) => setField('cryptoPromoPct', e.target.value)} />

          <label>Promo Type</label>
          <select value={form.promoType} onChange={(e) => setField('promoType', e.target.value)}>
            <option value="promo_credit">Promo Credit</option>
            <option value="bonus_credit">Bonus Credit</option>
            <option value="none">None</option>
          </select>

          <label>Expires On</label>
          <input type="date" value={form.expiresOn} onChange={(e) => setField('expiresOn', e.target.value)} />

          <label>Player Notes</label>
          <textarea rows={9} placeholder="For agent reference only" value={form.playerNotes} onChange={(e) => setField('playerNotes', e.target.value)} />

          <label>Balance</label>
          <input type="number" value={customer.balance ?? 0} onChange={(e) => setCustomer((prev) => ({ ...prev, balance: Number(e.target.value || 0) }))} />
          <button className="btn btn-user" onClick={updateBalance}>Update Balance</button>
        </div>
      </div>

      <div className="bottom-line">
        <span>Total Wagered: {formatCurrency(stats.totalWagered || 0)}</span>
        <span>Net: <b className={Number(stats.netProfit || 0) < 0 ? 'neg' : 'pos'}>{formatCurrency(stats.netProfit || 0)}</b></span>
      </div>
      </>
      )}

      {showNewTxModal && (
        <div className="modal-overlay" onClick={() => setShowNewTxModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h4>New transaction</h4>
            <label>Type</label>
            <select value={newTxType} onChange={(e) => setNewTxType(e.target.value)}>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            <label>Amount</label>
            <input type="number" value={newTxAmount} onChange={(e) => setNewTxAmount(e.target.value)} placeholder="0.00" />
            <label>Description</label>
            <input value={newTxDescription} onChange={(e) => setNewTxDescription(e.target.value)} placeholder="Optional note" />
            <div className="modal-actions">
              <button className="btn btn-back" onClick={() => setShowNewTxModal(false)}>Cancel</button>
              <button className="btn btn-save" onClick={handleCreateTransaction}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showNewFreePlayModal && (
        <div className="modal-overlay" onClick={() => setShowNewFreePlayModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h4>New Free Play</h4>
            <label>Amount</label>
            <input type="number" value={newFreePlayAmount} onChange={(e) => setNewFreePlayAmount(e.target.value)} placeholder="0.00" />
            <label>Description</label>
            <input value={newFreePlayDescription} onChange={(e) => setNewFreePlayDescription(e.target.value)} placeholder="Optional note" />
            <div className="modal-actions">
              <button className="btn btn-back" onClick={() => setShowNewFreePlayModal(false)}>Cancel</button>
              <button className="btn btn-save" onClick={handleCreateFreePlay}>Save</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .customer-details-v2 { background:#f3f4f6; min-height:100vh; padding:16px; color:#1f2937; }
        .top-panel { display:flex; justify-content:space-between; align-items:flex-start; background:#fff; border:1px solid #d1d5db; border-radius:8px; padding:16px; box-shadow:0 1px 6px rgba(15, 23, 42, 0.04); }
        .top-left h2 { margin:0; font-size:18px; line-height:1.2; }
        .agent-line { margin-top:4px; color:#4b5563; font-size:14px; }
        .top-actions { display:flex; gap:8px; }

        .btn { border:none; border-radius:3px; cursor:pointer; font-weight:600; }
        .btn-back { background:#3db3d7; color:#fff; padding:8px 14px; }
        .btn-user { background:#2f7fb6; color:#fff; padding:8px 14px; }
        .btn-copy-all { background:#139cc9; color:#fff; padding:8px 14px; }
        .btn-save { background:#35b49f; color:#fff; padding:9px 20px; min-width:130px; font-size:14px; }

        .player-card {
          margin-top: 10px;
          border: 1px solid #d6e2f3;
          border-radius: 4px;
          padding: 12px;
          background: #fff;
          max-width: 720px;
          box-shadow: none;
        }
        .player-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .player-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .player-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 10px;
          border-radius: 4px;
          border: 1px solid #9ec4f2;
          color: #1f5fb9;
          font-weight: 700;
          font-size: 13px;
        }
        .creds-box {
          border: 1px solid #d6e2f3;
          border-radius: 4px;
          padding: 10px;
          background: #fff;
        }
        .creds-row {
          display: grid;
          grid-template-columns: 120px 160px 32px;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .creds-row:last-child { margin-bottom: 0; }
        .creds-row span {
          font-size: 14px;
          font-weight: 700;
          color: #64748b;
        }
        .creds-pill {
          border: none;
          background: transparent;
          border-radius: 0;
          padding: 0;
          font-size: 14px;
          font-weight: 700;
          color: #334155;
          line-height: 1.1;
        }
        .copy-mini {
          border: none;
          background: transparent;
          color: #5b93ed;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }
        .limits-box {
          margin-top: 12px;
          border: 1px solid #d6e2f3;
          border-radius: 4px;
          padding: 12px;
          background: #fff;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 28px;
        }
        .limit-item label {
          display: block;
          margin: 0 0 4px;
          text-transform: uppercase;
          color: #8aa0bc;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .limit-item strong {
          color: #1e293b;
          font-size: 16px;
          line-height: 1;
        }
        .limit-item .money-green {
          color: #08916a;
        }
        .copy-notice {
          margin-top: 6px;
          color: #1f5fb9;
          font-size: 13px;
          font-weight: 700;
        }
        .mobile-only { display: none; }

        .top-right { text-align:right; display:flex; flex-direction:column; gap:8px; }
        .metric {
          border: none;
          background: transparent;
          text-align: right;
          cursor: pointer;
          padding: 0;
        }
        .metric.metric-active { opacity: 1; }
        .metric:not(.metric-active) { opacity: 0.95; }
        .metric span { display:block; font-size:12px; color:#374151; }
        .metric b { font-size:16px; line-height:1.1; font-weight:700; }
        .metric .neg { color:#dc2626; }
        .metric .pos { color:#15803d; }
        .metric .neutral { color:#111827; }
        .metric-circle { background: transparent; border: none; border-radius: 0; padding: 0; margin-top: 0; }

        .basics-header { margin-top:8px; background:#fff; border:1px solid #d1d5db; border-radius:10px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; }
        .basics-left { display:flex; align-items:center; gap:10px; }
        .basics-left h3 { margin:0; font-size:22px; line-height:1.1; font-weight:700; }
        .dot-grid { width:20px; display:grid; grid-template-columns:repeat(3, 4px); gap:3px; }
        .dot-grid span { width:4px; height:4px; background:#4b5563; border-radius:50%; display:block; }
        .dot-grid-btn {
          border: none;
          background: transparent;
          padding: 2px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .dot-grid-btn:hover { background: #e5e7eb; }

        .menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
          border: none;
          background: rgba(15, 23, 42, 0.15);
        }
        .basics-quick-menu {
          position: absolute;
          z-index: 50;
          left: 24px;
          top: 245px;
          width: 300px;
          height: 300px;
          max-width: calc(100vw - 48px);
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.2);
          padding: 10px 8px 10px;
          overflow: hidden;
        }
        .menu-close {
          border: none;
          background: #374151;
          color: #fff;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          margin-left: auto;
          display: block;
          font-weight: 700;
        }
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px 10px;
          padding: 8px 2px 2px;
          height: 248px;
          overflow-y: auto;
        }
        .menu-item {
          border: none;
          background: transparent;
          text-align: center;
          cursor: pointer;
          padding: 4px;
          color: #1f2937;
        }
        .menu-item:hover .menu-icon {
          transform: translateY(-1px);
        }
        .menu-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          margin: 0 auto 6px;
          display: grid;
          place-items: center;
          font-size: 20px;
          line-height: 1;
          color: #1f2937;
          background: #f3f4f6;
          transition: transform 0.15s ease;
        }
        .menu-item:nth-child(1) .menu-icon { color:#ef4444; }
        .menu-item:nth-child(2) .menu-icon { color:#65a30d; }
        .menu-item:nth-child(3) .menu-icon { color:#3b82f6; }
        .menu-item:nth-child(4) .menu-icon { color:#a16207; }
        .menu-item:nth-child(5) .menu-icon { color:#0d9488; }
        .menu-item:nth-child(6) .menu-icon { color:#f97316; }
        .menu-item:nth-child(7) .menu-icon { color:#111827; }
        .menu-item:nth-child(8) .menu-icon { color:#1d4ed8; }
        .menu-item:nth-child(9) .menu-icon { color:#4b5563; }
        .menu-item:nth-child(10) .menu-icon { color:#0ea5e9; }
        .menu-item:nth-child(11) .menu-icon { color:#4f46e5; }
        .menu-item:nth-child(12) .menu-icon { color:#b91c1c; }
        .menu-item:nth-child(13) .menu-icon { color:#60a5fa; }
        .menu-item:nth-child(14) .menu-icon { color:#6b7280; }
        .menu-item:nth-child(15) .menu-icon { color:#84a34a; }
        .menu-item:nth-child(16) .menu-icon { color:#c084fc; }
        .menu-item:nth-child(17) .menu-icon { color:#d97706; }
        .menu-item:nth-child(18) .menu-icon { color:#16a34a; }
        .menu-label {
          font-size: 11px;
          font-weight: 600;
          line-height: 1.1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .alert { margin-top:8px; padding:10px 12px; border-radius:3px; }
        .alert.error { background:#fee2e2; color:#991b1b; border:1px solid #fecaca; }
        .alert.success { background:#dcfce7; color:#166534; border:1px solid #bbf7d0; }

        .transactions-wrap {
          margin-top: 8px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 12px;
        }
        .tx-controls {
          display: grid;
          grid-template-columns: 1.2fr 1.2fr repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }
        .tx-field label, .tx-stat label {
          display: block;
          color: #4b5563;
          font-size: 12px;
          margin-bottom: 4px;
        }
        .tx-field select {
          width: 100%;
          border: none;
          border-bottom: 1px solid #6b7280;
          background: transparent;
          font-size: 16px;
          padding: 4px 0;
          color: #111827;
          outline: none;
        }
        .tx-field input {
          width: 100%;
          border: none;
          border-bottom: 1px solid #6b7280;
          background: transparent;
          font-size: 16px;
          padding: 4px 0;
          color: #111827;
          outline: none;
        }
        .tx-stat b {
          display: block;
          font-size: 22px;
          line-height: 1.05;
          font-weight: 500;
          color: #111827;
        }
        .tx-stat .neg { color: #dc2626; }
        .tx-table-wrap {
          border: 1px solid #cbd5e1;
          min-height: 360px;
          overflow: auto;
          background: #fff;
        }
        .tx-table {
          width: 100%;
          border-collapse: collapse;
        }
        .tx-table th {
          background: #1f3345;
          color: #fff;
          text-align: left;
          font-size: 16px;
          padding: 10px 12px;
          position: sticky;
          top: 0;
        }
        .tx-table td {
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 12px;
          font-size: 14px;
          color: #1f2937;
        }
        .tx-table tr.selected td { background: #eff6ff; }
        .tx-table tr { cursor: pointer; }
        .tx-empty {
          text-align: center;
          padding: 24px !important;
          color: #6b7280 !important;
        }
        .btn-danger {
          margin-top: 10px;
          background: #dc3f51;
          color: #fff;
          padding: 10px 30px;
        }
        .btn-danger:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .freeplay-controls {
          grid-template-columns: 1.2fr 1fr 1fr;
        }
        .freeplay-bottom-row {
          margin-top: 10px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: end;
          gap: 12px;
        }
        .freeplay-settings-btn {
          justify-self: center;
          min-width: 320px;
          text-align: center;
        }
        .freeplay-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          min-width: 360px;
        }

        .performance-wrap {
          margin-top: 8px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 12px;
        }
        .perf-controls {
          display: grid;
          grid-template-columns: 220px;
          gap: 10px;
          margin-bottom: 10px;
        }
        .performance-grid {
          display: grid;
          grid-template-columns: 480px 1fr;
          gap: 16px;
          min-height: 420px;
        }
        .perf-left {
          border: 1px solid #cbd5e1;
          max-height: 420px;
          overflow-y: auto;
        }
        .perf-right {
          border: 1px solid #cbd5e1;
          padding: 0;
        }
        .perf-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 18px;
          line-height: 1;
          padding: 8px 0 8px 0;
        }
        .perf-title-row b { font-size: 26px; font-weight: 700; }
        .perf-table {
          width: 100%;
          border-collapse: collapse;
        }
        .perf-table th {
          background: #1f3345;
          color: #fff;
          text-align: left;
          font-size: 14px;
          padding: 8px 10px;
          position: sticky;
          top: 0;
        }
        .perf-table td {
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 10px;
          font-size: 14px;
          color: #1f2937;
        }
        .perf-table tr.selected td { background: #f1f5f9; }

        .dynamic-live-wrap {
          margin-top: 8px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 12px;
        }
        .dl-top-select {
          width: 220px;
          margin-bottom: 12px;
        }
        .dynamic-live-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 28px;
        }
        .dl-col, .dl-col-toggles {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .dl-col label {
          font-size: 13px;
          color: #4b5563;
        }
        .dl-col input {
          border: none;
          border-bottom: 1px solid #6b7280;
          background: transparent;
          font-size: 16px;
          line-height: 1;
          color: #111827;
          padding: 2px 0 4px;
          outline: none;
        }
        .dl-col-toggles .switch-row {
          justify-content: space-between;
          font-size: 15px;
          line-height: 1.15;
          padding: 10px 0;
        }

        .live-casino-wrap {
          margin-top: 8px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 12px 18px 22px;
        }
        .live-casino-grid {
          display: grid;
          grid-template-columns: 220px 130px 130px 130px;
          gap: 10px 20px;
          align-items: center;
          max-width: 760px;
        }
        .lc-col-head {
          font-size: 18px;
          color: #374151;
          font-weight: 700;
        }
        .lc-label {
          font-size: 14px;
          color: #374151;
          font-weight: 600;
        }
        .live-casino-grid input {
          width: 100%;
          border: 1px solid #d1d5db;
          background: #fff;
          border-radius: 4px;
          font-size: 14px;
          line-height: 1;
          padding: 4px 8px;
          color: #111827;
        }
        .lc-note {
          margin-top: 16px;
          max-width: 1200px;
          font-size: 13px;
          line-height: 1.35;
          color: #374151;
        }

        .basics-grid { margin-top:8px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
        .col-card { background:#fff; border:1px solid #d1d5db; padding:12px; display:flex; flex-direction:column; min-height:560px; }
        .col-card label { color:#4b5563; font-size:13px; margin-top:8px; margin-bottom:4px; }
        .col-card input, .col-card select, .col-card textarea { width:100%; border:none; border-bottom:1px solid #6b7280; background:transparent; font-size:18px; padding:4px 0; color:#111827; outline:none; }
        .col-card textarea { border:1px solid #6b7280; min-height:160px; font-size:16px; padding:6px; }

        .switch-list { margin-top:8px; }
        .switch-row { display:flex; align-items:center; justify-content:space-between; padding:6px 0; font-size:16px; }
        .switch-row.inline-top { margin-top:8px; }
        .switch {
          position:relative;
          display:inline-block;
          width:58px;
          height:32px;
          flex-shrink:0;
        }
        .switch input { opacity:0; width:0; height:0; }
        .slider {
          position:absolute;
          cursor:pointer;
          top:0;
          left:0;
          right:0;
          bottom:0;
          background-color:#b0b7c3;
          transition:.2s;
          border-radius:999px;
        }
        .slider:before {
          position:absolute;
          content:'';
          height:24px;
          width:24px;
          left:4px;
          top:4px;
          background:white;
          transition:.2s;
          border-radius:50%;
        }
        .switch input:checked + .slider { background:#16a34a; }
        .switch input:checked + .slider:before { transform:translateX(26px); }

        .bottom-line { margin-top:10px; font-size:14px; color:#374151; display:flex; gap:22px; }
        .bottom-line .neg { color:#dc2626; }
        .bottom-line .pos { color:#15803d; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-card {
          width: 380px;
          max-width: calc(100vw - 32px);
          border-radius: 8px;
          background: #fff;
          padding: 16px;
          border: 1px solid #d1d5db;
          box-shadow: 0 12px 30px rgba(0,0,0,0.25);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .modal-card h4 { margin: 0 0 6px; font-size: 18px; }
        .modal-card label { font-size: 13px; color: #4b5563; }
        .modal-card input, .modal-card select {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 8px 10px;
          font-size: 14px;
          color: #111827;
        }
        .modal-actions {
          margin-top: 8px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        @media (max-width: 1300px) {
          .basics-grid { grid-template-columns:1fr; }
          .top-panel { flex-direction:column; gap:12px; }
          .top-right { text-align:left; }
          .player-card { max-width: 100%; }
          .player-card-head { flex-direction: column; align-items: flex-start; }
          .creds-row { grid-template-columns: 90px 1fr 32px; }
          .limits-box { grid-template-columns: 1fr; }
          .top-actions { display: none; }
          .mobile-only { display: flex; margin-top: 8px; }
          .tx-controls { grid-template-columns: 1fr 1fr; }
          .tx-stat b { font-size: 20px; }
          .freeplay-controls { grid-template-columns: 1fr 1fr; }
          .freeplay-bottom-row { grid-template-columns: 1fr; }
          .freeplay-inputs { min-width: 0; grid-template-columns: 1fr; }
          .performance-grid { grid-template-columns: 1fr; }
          .perf-left { max-height: 300px; }
          .perf-title-row { font-size: 20px; }
          .perf-title-row b { font-size: 24px; }
          .dynamic-live-grid { grid-template-columns: 1fr; }
          .dl-col input { font-size: 20px; }
          .dl-col-toggles .switch-row { font-size: 18px; }
          .live-casino-grid { grid-template-columns: 1fr 1fr; max-width: none; }
          .lc-col-head, .lc-label, .live-casino-grid input { font-size: 18px; }
          .lc-note { font-size: 14px; }
        }
      `}</style>
    </div>
  );
}

export default CustomerDetailsView;
