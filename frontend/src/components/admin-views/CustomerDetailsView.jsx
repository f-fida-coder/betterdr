import React, { useEffect, useMemo, useState } from 'react';
import {
  getAdminHeaderSummary,
  getUserStatistics,
  getAgents,
  getTransactionsHistory,
  getDeletedWagers,
  getAdminBets,
  deleteAdminBet,
  deleteAdminTransactions,
  updateUserFreeplay,
  updateUserByAdmin,
  updateUserByAgent,
  updateUserCredit,
  updateAgentCredit,
  impersonateUser,
  updateAgent,
  getAgentCommissionChain,
  calculateCommission,
  validateCommissionChain,
  linkedAgentName,
} from '../../api';
import { formatTransactionType, isDebitTransaction } from '../../utils/transactionPresentation';
import { resolveDepositFreeplayBonusPreview } from '../../utils/freeplayBonus';
import { formatUsPhone, generateIdentityPassword, normalizeIdentityName } from '../../utils/identityPassword';
import { getMoneyToneClass, toMoneyNumber } from '../../utils/money';

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
  liveCasino: false,
  appsVenmo: '',
  appsCashapp: '',
  appsApplePay: '',
  appsZelle: '',
  appsPaypal: '',
  appsBtc: '',
  appsOther: ''
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

const TRANSACTION_TYPE_OPTIONS = [
  {
    value: 'deposit',
    label: 'Deposits',
    balanceDirection: 'credit',
    apiType: 'deposit',
    reason: 'ADMIN_DEPOSIT',
    defaultDescription: 'Deposits'
  },
  {
    value: 'withdrawal',
    label: 'Withdrawals',
    balanceDirection: 'debit',
    apiType: 'withdrawal',
    reason: 'ADMIN_WITHDRAWAL',
    defaultDescription: 'Withdrawals'
  },
  {
    value: 'credit_adj',
    label: 'Credit Adj',
    balanceDirection: 'credit',
    apiType: 'adjustment',
    reason: 'ADMIN_CREDIT_ADJUSTMENT',
    defaultDescription: 'Credit Adj'
  },
  {
    value: 'debit_adj',
    label: 'Debit Adj',
    balanceDirection: 'debit',
    apiType: 'adjustment',
    reason: 'ADMIN_DEBIT_ADJUSTMENT',
    defaultDescription: 'Debit Adj'
  },
  {
    value: 'promotional_credit',
    label: 'Promotional Credit',
    balanceDirection: 'credit',
    apiType: 'adjustment',
    reason: 'ADMIN_PROMOTIONAL_CREDIT',
    defaultDescription: 'Promotional Credit'
  },
  {
    value: 'promotional_debit',
    label: 'Promotional Debit',
    balanceDirection: 'debit',
    apiType: 'adjustment',
    reason: 'ADMIN_PROMOTIONAL_DEBIT',
    defaultDescription: 'Promotional Debit'
  }
];

// Agent-side transactions invert direction relative to players. An agent's
// displayed figure represents what they owe the house, so any positive action
// (deposit, credit, promo credit) REDUCES that figure, and any negative action
// (withdrawal, debit, promo debit) INCREASES it.
const AGENT_TRANSACTION_TYPE_OPTIONS = [
  {
    value: 'deposit',
    label: 'Deposits',
    balanceDirection: 'debit',
    apiType: 'deposit',
    reason: 'AGENT_DEPOSIT',
    defaultDescription: 'Deposits'
  },
  {
    value: 'withdrawal',
    label: 'Withdrawals',
    balanceDirection: 'credit',
    apiType: 'withdrawal',
    reason: 'AGENT_WITHDRAWAL',
    defaultDescription: 'Withdrawals'
  },
  {
    value: 'credit_adj',
    label: 'Credit Adj',
    balanceDirection: 'debit',
    apiType: 'adjustment',
    reason: 'AGENT_CREDIT_ADJUSTMENT',
    defaultDescription: 'Credit Adj'
  },
  {
    value: 'debit_adj',
    label: 'Debit Adj',
    balanceDirection: 'credit',
    apiType: 'adjustment',
    reason: 'AGENT_DEBIT_ADJUSTMENT',
    defaultDescription: 'Debit Adj'
  },
  {
    value: 'promotional_credit',
    label: 'Promotional Credit',
    balanceDirection: 'credit',
    apiType: 'adjustment',
    reason: 'AGENT_PROMOTIONAL_CREDIT',
    defaultDescription: 'Promotional Credit'
  },
  {
    value: 'promotional_debit',
    label: 'Promotional Debit',
    balanceDirection: 'debit',
    apiType: 'adjustment',
    reason: 'AGENT_PROMOTIONAL_DEBIT',
    defaultDescription: 'Promotional Debit'
  }
];

const TRANSACTION_FILTER_OPTIONS = [
  { value: 'deposit_withdrawal', label: 'Deposits/Withdrawals' },
  { value: 'credit_debit_adjustments', label: 'Credit/Debit Adjustments' },
  { value: 'promotional_adjustments', label: 'Promotional Credits/Debits' },
  { value: 'freeplay_transactions', label: 'Freeplay Transactions' },
  { value: 'all_transactions', label: 'All Transactions' },
  { value: 'deleted_transactions', label: 'Deleted Transactions' },
  { value: 'non_wager', label: 'Non-Wagers' },
  { value: 'wagers_only', label: 'Wagers' }
];

const normalizeTxnValue = (value) => String(value || '').trim().toLowerCase();
const normalizeTxnReason = (value) => String(value || '').trim().toUpperCase();
const WAGER_ONLY_TYPES = new Set(['bet_placed', 'bet_placed_admin', 'casino_bet_debit']);
const WAGER_RELATED_TYPES = new Set([
  ...WAGER_ONLY_TYPES,
  'bet_won',
  'bet_lost',
  'bet_refund',
  'bet_void',
  'bet_void_admin',
  'casino_bet_credit'
]);
const DELETED_CHANGED_TYPES = new Set(['bet_void', 'bet_void_admin', 'deleted_wager']);
const CREDIT_DEBIT_ADJUSTMENT_REASONS = new Set(['ADMIN_CREDIT_ADJUSTMENT', 'ADMIN_DEBIT_ADJUSTMENT']);
const PROMOTIONAL_ADJUSTMENT_REASONS = new Set(['ADMIN_PROMOTIONAL_CREDIT', 'ADMIN_PROMOTIONAL_DEBIT']);
const FREEPLAY_TRANSACTION_REASONS = new Set(['FREEPLAY_ADJUSTMENT', 'DEPOSIT_FREEPLAY_BONUS', 'REFERRAL_FREEPLAY_BONUS', 'NEW_PLAYER_FREEPLAY_BONUS']);

const isFreePlayTransaction = (txn) => {
  const txnType = normalizeTxnValue(txn?.type);
  const reason = normalizeTxnReason(txn?.reason);
  const desc = String(txn?.description || '').toLowerCase();

  return txnType === 'fp_deposit'
    || FREEPLAY_TRANSACTION_REASONS.has(reason)
    || (
      (txnType === 'adjustment' || txnType === 'fp_deposit')
      && (desc.includes('freeplay') || desc.includes('free play'))
    );
};

const isCreditDebitAdjustmentTransaction = (txn) => {
  const txnType = normalizeTxnValue(txn?.type);
  const reason = normalizeTxnReason(txn?.reason);

  return txnType === 'credit_adj'
    || txnType === 'debit_adj'
    || CREDIT_DEBIT_ADJUSTMENT_REASONS.has(reason);
};

const isPromotionalAdjustmentTransaction = (txn) => {
  const reason = normalizeTxnReason(txn?.reason);
  return PROMOTIONAL_ADJUSTMENT_REASONS.has(reason);
};

const PLAYER_COPY_DETAILS_FOOTER = `PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you'll be required to settle your balance even if it's under your settle limit. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so  we can get everyone paid quickly and as smoothly as possible. If you can't pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send.

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don't respond or don't pay on time or in full then you will be shown the same reciprocation when it comes to payouts.

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We've heard them all so don't waste your time.

FREEPLAY
I start all NEW players off with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. (This is to prevent everyone who abuses the free play to win free money and leave). When you place a bet you have to click "Use your freeplay balance $" (If you don't you're using your own money). Since we are very generous with freeplay unfortunately it is limited to straight bets only and no parlays. I offer 20% free play to anyone above settle to roll your balance to limit transactions. If you chose to roll for free play you must be actively betting with your own money or your free play will not count.

I need active players so if you could do me a solid and place a bet today even if it's with freeplay. Good luck! Lmk that you've read all the rules and or if you have any questions and need me to adjust anything!`;

const normalizeCustomerFinancials = (user) => {
  if (!user || typeof user !== 'object') return user;

  // Agents store these as default* fields in the agents table; players store
  // them under the same name in the users table. Fall back to the default*
  // names so the same UI code can read either record type.
  return {
    ...user,
    minBet: toMoneyNumber(user.minBet ?? user.defaultMinBet, 0),
    maxBet: toMoneyNumber(user.maxBet ?? user.wagerLimit ?? user.defaultMaxBet, 0),
    wagerLimit: toMoneyNumber(user.wagerLimit ?? user.maxBet ?? user.defaultMaxBet, 0),
    creditLimit: toMoneyNumber(user.creditLimit ?? user.defaultCreditLimit, 0),
    balanceOwed: toMoneyNumber(user.balanceOwed ?? user.defaultSettleLimit, 0),
    balance: toMoneyNumber(user.balance, 0),
    pendingBalance: toMoneyNumber(user.pendingBalance, 0),
    freeplayBalance: toMoneyNumber(user.freeplayBalance, 0),
    lifetime: toMoneyNumber(user.lifetime, 0),
    lifetimePlusMinus: toMoneyNumber(user.lifetimePlusMinus ?? user.lifetime, 0)
  };
};

const pickMoneyValue = (primary, fallback = 0) => (
  primary === '' || primary === null || primary === undefined
    ? toMoneyNumber(fallback, 0)
    : toMoneyNumber(primary, 0)
);

const normalizeTransactionNoteToken = (value) => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
);

const getTransactionDisplayLabel = (txn) => {
  const txnType = normalizeTxnValue(txn?.type);
  if (txnType === 'deleted_wager') {
    return String(txn?.status || '').trim().toLowerCase() === 'restored'
      ? 'Changed Wager'
      : 'Deleted Transaction';
  }
  return formatTransactionType(txn);
};

const getTransactionNotes = (txn) => {
  const rawDescription = String(txn?.description || '').trim();
  if (!rawDescription) return '—';

  const rawToken = normalizeTransactionNoteToken(rawDescription);
  const labelToken = normalizeTransactionNoteToken(getTransactionDisplayLabel(txn));
  if (!rawToken) return '—';
  if (
    labelToken
    && (rawToken === labelToken || rawToken === `${labelToken}s` || `${rawToken}s` === labelToken)
  ) {
    return '—';
  }

  return rawDescription;
};

const getTransactionEnteredBy = (txn) => String(
  txn?.actorUsername
  ?? txn?.deletedByUsername
  ?? ''
).trim() || '—';

const txDateToEpoch = (value) => {
  if (!value) return 0;
  const dateValue = value?.$date || value;
  const parsed = new Date(dateValue);
  const ms = parsed.getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

const mapDeletedWagerToTx = (wager) => {
  const amount = Math.abs(Number(wager?.amount || 0));
  const sport = String(wager?.sport || '').trim();
  const reason = String(wager?.reason || '').trim();
  const status = String(wager?.status || 'deleted').trim().toLowerCase() || 'deleted';
  const descriptor = status === 'restored' ? 'Changed Wager' : 'Deleted Wager';
  const parts = [descriptor];
  if (sport) parts.push(`(${sport})`);
  if (reason) parts.push(`- ${reason}`);

  return {
    id: `deleted-wager-${String(wager?.id || '')}`,
    type: 'deleted_wager',
    entrySide: 'CREDIT',
    sourceType: null,
    referenceType: 'DeletedWager',
    referenceId: wager?.id || null,
    user: wager?.user || 'Unknown',
    userId: wager?.userId || null,
    amount,
    date: wager?.deletedAt || wager?.restoredAt || null,
    balanceBefore: null,
    balanceAfter: null,
    status,
    reason: reason ? reason.toUpperCase().replace(/\s+/g, '_') : null,
    description: parts.join(' ')
  };
};

const getApiTypeForTransactionFilter = (filterValue) => {
  const normalizedFilter = normalizeTxnValue(filterValue);
  if (
    normalizedFilter === 'betting_adjustments'
    || normalizedFilter === 'credit_debit_adjustments'
    || normalizedFilter === 'promotional_adjustments'
  ) {
    return 'adjustment';
  }
  return 'all';
};

const matchesTransactionFilter = (txn, filterValue) => {
  const normalizedFilter = normalizeTxnValue(filterValue);
  if (normalizedFilter === '' || normalizedFilter === 'all' || normalizedFilter === 'all_transactions') {
    return true;
  }

  const txnType = normalizeTxnValue(txn?.type);
  if (normalizedFilter === 'non_wager') {
    return !WAGER_RELATED_TYPES.has(txnType);
  }
  if (normalizedFilter === 'deposit_withdrawal') {
    return txnType === 'deposit' || txnType === 'withdrawal';
  }
  if (normalizedFilter === 'betting_adjustments' || normalizedFilter === 'credit_debit_adjustments') {
    return isCreditDebitAdjustmentTransaction(txn);
  }
  if (normalizedFilter === 'promotional_adjustments') {
    return isPromotionalAdjustmentTransaction(txn);
  }
  if (normalizedFilter === 'freeplay_transactions') {
    return isFreePlayTransaction(txn);
  }
  if (normalizedFilter === 'wagers_only') {
    return WAGER_ONLY_TYPES.has(txnType);
  }
  if (normalizedFilter === 'deleted_changed' || normalizedFilter === 'deleted_transactions') {
    return DELETED_CHANGED_TYPES.has(txnType);
  }

  return true;
};

const getTransactionUserId = (txn) => {
  if (!txn || typeof txn !== 'object') return '';
  return String(
    txn.userId
    ?? txn.playerId
    ?? txn.user?.id
    ?? txn.user?.id
    ?? ''
  ).trim();
};

const getTransactionUsername = (txn) => {
  if (!txn || typeof txn !== 'object') return '';
  return String(
    txn.user
    ?? txn.username
    ?? txn.playerUsername
    ?? txn.playerName
    ?? ''
  ).trim().toLowerCase();
};

const isTransactionForCustomer = (txn, userId, username, linkedCounterpart) => {
  const txUserId = getTransactionUserId(txn);
  if (txUserId !== '') {
    if (txUserId === String(userId)) return true;
    // Also match linked counterpart (agent ↔ MA same-person pair)
    if (linkedCounterpart?.id && txUserId === String(linkedCounterpart.id)) return true;
    return false;
  }

  const txUsername = getTransactionUsername(txn);
  const normalizedUsername = String(username || '').trim().toLowerCase();
  if (txUsername !== '' && normalizedUsername !== '') {
    if (txUsername === normalizedUsername) return true;
    // Also match linked counterpart username
    if (linkedCounterpart?.username && txUsername === String(linkedCounterpart.username).trim().toLowerCase()) return true;
    return false;
  }

  // If backend already scoped to a specific user and row does not carry user info,
  // keep it instead of dropping potentially valid records.
  return true;
};

function CustomerDetailsView({ userId, onBack, onNavigateToUser, role = 'admin', viewContext = null }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customer, setCustomer] = useState(null);
  const [stats, setStats] = useState({});
  const [referredBy, setReferredBy] = useState(null);
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showBasicsMenu, setShowBasicsMenu] = useState(false);
  const [activeSection, setActiveSection] = useState('basics');
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState('');
  const [txSuccess, setTxSuccess] = useState('');
  const [txDisplayFilter, setTxDisplayFilter] = useState('7d');
  const [txTypeFilter, setTxTypeFilter] = useState('deposit_withdrawal');
  const [txStatusFilter, setTxStatusFilter] = useState('all');
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [showNewTxModal, setShowNewTxModal] = useState(false);
  const [newTxType, setNewTxType] = useState('deposit');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxDescription, setNewTxDescription] = useState('');
  const [newTxApplyFreeplayBonus, setNewTxApplyFreeplayBonus] = useState(true);
  const [showTxConfirm, setShowTxConfirm] = useState(false);
  const [txSubmitting, setTxSubmitting] = useState(false);
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
  const [freePlayModalMode, setFreePlayModalMode] = useState('deposit'); // 'deposit' | 'withdraw'
  const [newFreePlayAmount, setNewFreePlayAmount] = useState('');
  const [newFreePlayDescription, setNewFreePlayDescription] = useState('');
  const [showFpConfirm, setShowFpConfirm] = useState(false);
  const [dynamicLiveSaving, setDynamicLiveSaving] = useState(false);
  const [dynamicLiveError, setDynamicLiveError] = useState('');
  const [dynamicLiveSuccess, setDynamicLiveSuccess] = useState('');
  const [casinoSaving, setCasinoSaving] = useState(false);
  const [casinoError, setCasinoError] = useState('');
  const [casinoSuccess, setCasinoSuccess] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState('');
  const [agentSettlementBalance, setAgentSettlementBalance] = useState(null);
  // Pending sportsbook bets (for the dedicated Pending section so the
  // agent can see and delete unsettled wagers per-customer). Loaded on
  // demand when the Pending tile / quick menu item is clicked.
  const [pendingBets, setPendingBets] = useState([]);
  const [pendingBetsLoading, setPendingBetsLoading] = useState(false);
  const [pendingBetsError, setPendingBetsError] = useState('');
  const [pendingBetsNotice, setPendingBetsNotice] = useState('');
  const [pendingBetDeletingId, setPendingBetDeletingId] = useState('');

  // Commission / hierarchy state (agents only)
  const [commissionChain, setCommissionChain] = useState(null);      // { upline, downlines, chainTotal, isValid }
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionError, setCommissionError] = useState('');
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionSaveError, setCommissionSaveError] = useState('');
  const [commissionSaveSuccess, setCommissionSaveSuccess] = useState('');
  const [commissionEditField, setCommissionEditField] = useState(null);
  const [commissionEditValue, setCommissionEditValue] = useState('');
  const [agentPercentDraft, setAgentPercentDraft] = useState('');    // editable draft value
  const [playerRateDraft, setPlayerRateDraft] = useState('');        // editable draft value
  const [hiringAgentPercentDraft, setHiringAgentPercentDraft] = useState('');
  const [hiringAgentIdDraft, setHiringAgentIdDraft] = useState('');
  const [subAgentPercentDraft, setSubAgentPercentDraft] = useState('');
  const [extraSubAgentsDraft, setExtraSubAgentsDraft] = useState([]);
  const [calcAmount, setCalcAmount] = useState('');                   // calculator input
  const [calcResult, setCalcResult] = useState(null);                 // calculateCommission result
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState('');
  const [validateResult, setValidateResult] = useState(null);         // validateCommissionChain result

  const quickMenuItems = [
    { id: 'basics', label: 'The Basics', icon: '🪪' },
    { id: 'transactions', label: 'Transactions', icon: '💳' },
    { id: 'pending', label: 'Pending', icon: '🕒' },
    { id: 'performance', label: 'Performance', icon: '📄' },
    { id: 'analysis', label: 'Analysis', icon: '📈' },
    { id: 'freeplays', label: 'Free Plays', icon: '🤲' },
    { id: 'commission', label: 'Commission', icon: '🌿' },
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

  const loadAgentSettlementBalance = async (token, agentId) => {
    const safeAgentId = String(agentId || '').trim();
    if (!safeAgentId) return null;
    try {
      const summary = await getAdminHeaderSummary(token, { agentId: safeAgentId });
      const balanceOwed = Number(summary?.balanceOwed);
      return Number.isFinite(balanceOwed) ? balanceOwed : null;
    } catch (err) {
      console.warn('Failed to load live agent settlement balance:', err);
      return null;
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError('');
        setSuccess('');
        setTxSuccess('');
        setTxError('');
        setDuplicateWarning(null);
        setCustomer(null);
        setAgentSettlementBalance(null);
        setCommissionChain(null);
        setForm(DEFAULT_FORM);
        setActiveSection('basics');

        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please login to view details.');
          return;
        }

        const [detailData, agentsData] = await Promise.all([
          getUserStatistics(userId, token),
          ['admin', 'super_agent', 'master_agent', 'agent'].includes(role) ? getAgents(token) : Promise.resolve([])
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

        // Pre-populate commission drafts for agent accounts
        const userRole = String(user?.role || '').toLowerCase();
        const userIsAgent = userRole === 'agent' || userRole === 'master_agent' || userRole === 'super_agent';
        const normalizedUser = normalizeCustomerFinancials(user);
        const liveSettlementBalance = userIsAgent
          ? await loadAgentSettlementBalance(token, user.id || userId)
          : null;

        setCustomer(normalizedUser);
        setAgentSettlementBalance(liveSettlementBalance);
        setStats(detailData?.stats || {});
        setReferredBy(detailData?.referredBy || null);
        setAgents(Array.isArray(agentsData) ? agentsData : []);

        if (userIsAgent) {
          setAgentPercentDraft(user?.agentPercent != null ? String(user.agentPercent) : '');
          setPlayerRateDraft(user?.playerRate != null ? String(user.playerRate) : '');
          setHiringAgentPercentDraft(user?.hiringAgentPercent != null ? String(user.hiringAgentPercent) : '');
          setHiringAgentIdDraft(normalizedUser.parentAgentId || normalizedUser.masterAgentId || normalizedUser.createdBy?.id || normalizedUser.createdBy || '');
          setSubAgentPercentDraft(user?.subAgentPercent != null ? String(user.subAgentPercent) : '');
          setExtraSubAgentsDraft(Array.isArray(user?.extraSubAgents) ? user.extraSubAgents.map((sa, i) => ({ id: i, name: sa.name || '', percent: sa.percent != null ? String(sa.percent) : '' })) : []);
        }
        setForm({
          password: '',
          firstName: normalizedUser.firstName || '',
          lastName: normalizedUser.lastName || '',
          phoneNumber: normalizedUser.phoneNumber || '',
          minBet: normalizedUser.minBet,
          agentId: (
            userIsAgent
              ? (normalizedUser.parentAgentId || normalizedUser.masterAgentId || '')
              : role === 'admin'
                ? (normalizedUser.masterAgentId || normalizedUser.agentId?.id || normalizedUser.agentId || '')
                : (normalizedUser.agentId?.id || normalizedUser.agentId || '')
          ),
          status: (normalizedUser.status || 'active').toLowerCase(),
          creditLimit: normalizedUser.creditLimit,
          wagerLimit: normalizedUser.wagerLimit,
          settleLimit: normalizedUser.balanceOwed,
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
          casinoPlayerMaxLossWeek: Number(cslPlayer.maxLossWeek ?? 5000),
          appsVenmo: user.apps?.venmo || '',
          appsCashapp: user.apps?.cashapp || '',
          appsApplePay: user.apps?.applePay || '',
          appsZelle: user.apps?.zelle || '',
          appsPaypal: user.apps?.paypal || '',
          appsBtc: user.apps?.btc || '',
          appsOther: user.apps?.other || ''
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

  // Pending sportsbook bets — fetched on demand for the dedicated Pending
  // section. Mirrors the bettorjuice365 layout (Description / Risk / To
  // Win + totals row) with an extra Delete column so an agent can void a
  // pending wager without leaving the customer page. Risk stays as-is in
  // the bet doc (we delegate the refund to deleteAdminBet on the
  // backend).
  const loadPendingBets = async (showLoader = true) => {
    if (!customer?.username) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setPendingBetsError('Please login to view pending bets.');
      return;
    }
    try {
      if (showLoader) setPendingBetsLoading(true);
      setPendingBetsError('');
      const data = await getAdminBets({
        customer: customer.username,
        status: 'pending',
        limit: 500,
      }, token);
      const bets = Array.isArray(data?.bets) ? data.bets : [];
      setPendingBets(bets);
    } catch (err) {
      setPendingBetsError(err?.message || 'Failed to load pending bets');
    } finally {
      if (showLoader) setPendingBetsLoading(false);
    }
  };

  const handleDeletePendingBet = async (betId) => {
    if (!betId) return;
    if (!window.confirm('Delete this pending bet? Risk will be refunded to the player.')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      setPendingBetDeletingId(betId);
      setPendingBetsError('');
      setPendingBetsNotice('');
      const result = await deleteAdminBet(betId, token);
      // Apply the refunded balances returned by the backend so the player
      // card's Pending / Available / Balance / Freeplay tiles update in
      // place — without this they stay stale until a full reload.
      const updated = result?.user;
      if (updated) {
        setCustomer((prev) => prev ? {
          ...prev,
          balance: toMoneyNumber(updated.balance, prev.balance),
          pendingBalance: toMoneyNumber(updated.pendingBalance, prev.pendingBalance),
          freeplayBalance: toMoneyNumber(updated.freeplayBalance, prev.freeplayBalance),
        } : prev);
      }
      setPendingBetsNotice('Bet deleted.');
      await loadPendingBets(false);
    } catch (err) {
      setPendingBetsError(err?.message || 'Failed to delete bet');
    } finally {
      setPendingBetDeletingId('');
    }
  };

  // Load commission chain when the 'commission' section is opened for an agent
  const loadCommissionChain = async () => {
    if (!userId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      setCommissionLoading(true);
      setCommissionError('');
      const data = await getAgentCommissionChain(userId, token);
      setCommissionChain(data);
    } catch (err) {
      setCommissionError(err.message || 'Failed to load commission chain');
    } finally {
      setCommissionLoading(false);
    }
  };

  const handleSaveCommission = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const pct = parseFloat(agentPercentDraft);
    const rate = parseFloat(playerRateDraft);
    if (agentPercentDraft !== '' && (isNaN(pct) || pct < 0 || pct > 100)) {
      setCommissionSaveError('Agent % must be a number between 0 and 100');
      return;
    }
    if (playerRateDraft !== '' && (isNaN(rate) || rate < 0)) {
      setCommissionSaveError('Player Rate must be a valid dollar amount');
      return;
    }
    try {
      setCommissionSaving(true);
      setCommissionSaveError('');
      setCommissionSaveSuccess('');
      const payload = {};
      if (agentPercentDraft !== '') payload.agentPercent = pct;
      if (playerRateDraft !== '') payload.playerRate = rate;
      if (hiringAgentPercentDraft !== '') payload.hiringAgentPercent = parseFloat(hiringAgentPercentDraft);
      if (subAgentPercentDraft !== '') payload.subAgentPercent = parseFloat(subAgentPercentDraft);
      payload.extraSubAgents = extraSubAgentsDraft
        .filter((sa) => sa.name.trim() !== '' || sa.percent !== '')
        .map((sa) => ({ name: sa.name.trim(), percent: parseFloat(sa.percent) || 0 }));
      if (hiringAgentIdDraft) payload.parentAgentId = hiringAgentIdDraft;
      await updateAgent(userId, payload, token);
      setCustomer((prev) => ({
        ...prev,
        agentPercent: agentPercentDraft !== '' ? pct : prev.agentPercent,
        playerRate: playerRateDraft !== '' ? rate : prev.playerRate,
        hiringAgentPercent: hiringAgentPercentDraft !== '' ? parseFloat(hiringAgentPercentDraft) : prev.hiringAgentPercent,
        subAgentPercent: subAgentPercentDraft !== '' ? parseFloat(subAgentPercentDraft) : prev.subAgentPercent,
        extraSubAgents: payload.extraSubAgents,
      }));
      setCommissionSaveSuccess('Saved successfully');
      // Reload chain to reflect new values
      await loadCommissionChain();
    } catch (err) {
      setCommissionSaveError(err.message || 'Failed to save commission');
    } finally {
      setCommissionSaving(false);
    }
  };

  const handleChangeHiringAgent = async (newParentId) => {
    setHiringAgentIdDraft(newParentId);
    if (!newParentId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      setCommissionSaving(true);
      setCommissionSaveError('');
      setCommissionSaveSuccess('');
      await updateAgent(userId, { parentAgentId: newParentId }, token);
      setCommissionSaveSuccess('Master agent updated');
      await loadCommissionChain();
    } catch (err) {
      setCommissionSaveError(err.message || 'Failed to update master agent');
    } finally {
      setCommissionSaving(false);
    }
  };

  const handleCalculateCommission = async () => {
    const token = localStorage.getItem('token');
    const amount = parseFloat(calcAmount);
    if (!token || isNaN(amount) || amount <= 0) {
      setCalcError('Enter a valid positive amount');
      return;
    }
    try {
      setCalcLoading(true);
      setCalcError('');
      setCalcResult(null);
      const data = await calculateCommission(userId, amount, token);
      setCalcResult(data);
    } catch (err) {
      setCalcError(err.message || 'Calculation failed');
    } finally {
      setCalcLoading(false);
    }
  };

  const handleValidateChain = async () => {
    if (!commissionChain?.upline) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const nodes = commissionChain.upline.map((n) => ({
        id: n.id,
        username: n.username,
        agentPercent: n.agentPercent,
      }));
      const result = await validateCommissionChain(nodes, token);
      setValidateResult(result);
    } catch (err) {
      setValidateResult({ isValid: false, errors: [err.message] });
    }
  };

  const loadCustomerTransactions = async (tokenValue) => {
    if (!customer?.username) return [];

    const token = tokenValue || localStorage.getItem('token');
    if (!token) {
      throw new Error('Please login to view transactions.');
    }

    const params = {
      user: customer.username || '',
      type: getApiTypeForTransactionFilter(txTypeFilter),
      status: txStatusFilter,
      time: txDisplayFilter,
      limit: 300
    };
    if (userId) {
      params.userId = userId;
    }
    const data = await getTransactionsHistory(params, token);
    const list = Array.isArray(data?.transactions) ? data.transactions : [];
    const forCustomer = list.filter((txn) => isTransactionForCustomer(txn, userId, customer.username, linkedCounterpart));

    let mergedRows = [...forCustomer];
    if (['deleted_changed', 'deleted_transactions'].includes(normalizeTxnValue(txTypeFilter))) {
      try {
        const deletedWagersData = await getDeletedWagers({
          user: customer.username || '',
          status: 'all',
          sport: 'all',
          time: txDisplayFilter,
          limit: 300
        }, token);
        const deletedRows = (Array.isArray(deletedWagersData?.wagers) ? deletedWagersData.wagers : [])
          .filter((wager) => String(wager?.userId || '') === String(userId))
          .map(mapDeletedWagerToTx);
        mergedRows = [...mergedRows, ...deletedRows];
      } catch (deletedErr) {
        console.warn('Deleted/Changed wagers could not be loaded:', deletedErr);
      }
    }

    return mergedRows
      .filter((txn) => matchesTransactionFilter(txn, txTypeFilter))
      .sort((a, b) => txDateToEpoch(b?.date) - txDateToEpoch(a?.date));
  };

  useEffect(() => {
    const loadTransactions = async () => {
      if (activeSection !== 'transactions' || !customer) return;
      try {
        setTxLoading(true);
        setTxError('');
        const rows = await loadCustomerTransactions();
        setTransactions(rows);
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
          time: performancePeriod === 'weekly' ? '90d' : performancePeriod === 'yearly' ? 'all' : '30d',
          type: 'all-types',
          limit: 500
        }, token);
        const bets = Array.isArray(data?.bets) ? data.bets : [];
        const grouped = new Map();

        const getIsoWeekNumber = (date) => {
          const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
          const dayNum = temp.getUTCDay() || 7;
          temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
          return Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
        };

        for (const bet of bets) {
          const dtRaw = bet?.createdAt;
          const dt = new Date(dtRaw);
          if (Number.isNaN(dt.getTime())) continue;

          let key = '';
          let periodLabel = '';
          if (performancePeriod === 'daily') {
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            key = `${year}-${month}-${day}`;
            periodLabel = dt.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
              weekday: 'long'
            });
          } else if (performancePeriod === 'weekly') {
            const isoYear = dt.getFullYear();
            const week = String(getIsoWeekNumber(dt)).padStart(2, '0');
            key = `${isoYear}-W${week}`;
            const startOfWeek = new Date(dt);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
            startOfWeek.setDate(diff);
            periodLabel = `Week of ${startOfWeek.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`;
          } else if (performancePeriod === 'monthly') {
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            key = `${year}-${month}`;
            periodLabel = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          } else {
            const year = dt.getFullYear();
            key = `${year}`;
            periodLabel = `${year}`;
          }

          const amount = Number(bet?.amount || 0);
          const toWin = Number(bet?.potentialPayout || 0);
          const status = String(bet?.status || '').toLowerCase();
          const net = status === 'won' ? Math.max(0, toWin - amount) : status === 'lost' ? -amount : 0;

          if (!grouped.has(key)) grouped.set(key, { date: dt, net: 0, wagers: [], periodLabel });
          const row = grouped.get(key);
          row.net += net;
          row.wagers.push({
            id: bet.id || `${key}-${row.wagers.length + 1}`,
            label: `${bet?.match?.awayTeam || ''} vs ${bet?.match?.homeTeam || ''}`.trim() || (bet.selection || 'Wager'),
            amount: net
          });
        }

        const rows = Array.from(grouped.entries())
          .map(([key, value]) => ({
            key,
            date: value.date,
            periodLabel: value.periodLabel,
            net: value.net,
            wagers: value.wagers
          }))
          .sort((a, b) => b.key.localeCompare(a.key));

        // Keep yearly performance aligned with account lifetime (+/-), including legacy/imported carry.
        if (performancePeriod === 'yearly') {
          const lifetimeValue = toMoneyNumber(customer?.lifetimePlusMinus ?? customer?.lifetime, 0);
          if (Number.isFinite(lifetimeValue)) {
            const computedNet = rows.reduce((sum, row) => sum + Number(row.net || 0), 0);
            const carry = lifetimeValue - computedNet;
            if (Math.abs(carry) >= 0.01) {
              const targetYear = String(new Date().getFullYear());
              let targetIndex = rows.findIndex((row) => row.key === targetYear);
              if (targetIndex < 0) {
                rows.unshift({
                  key: targetYear,
                  date: new Date(),
                  periodLabel: targetYear,
                  net: 0,
                  wagers: [],
                });
                targetIndex = 0;
              }
              rows[targetIndex] = {
                ...rows[targetIndex],
                net: Number(rows[targetIndex].net || 0) + carry,
                wagers: [
                  ...(Array.isArray(rows[targetIndex].wagers) ? rows[targetIndex].wagers : []),
                  {
                    id: `lifetime-carry-${rows[targetIndex].key}`,
                    label: 'Lifetime +/- Carry',
                    amount: carry,
                    synthetic: true,
                  }
                ],
              };
            }
          }
        }

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
  }, [activeSection, customer?.username, customer?.lifetimePlusMinus, customer?.lifetime, performancePeriod]);

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
          type: 'all',
          status: 'all',
          time: freePlayDisplayFilter,
          limit: 300
        }, token);
        const list = Array.isArray(data?.transactions) ? data.transactions : [];
        const filtered = list.filter((txn) => (
          isTransactionForCustomer(txn, userId, customer.username, linkedCounterpart)
          && isFreePlayTransaction(txn)
        ));
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

  const handleFirstNameChange = (value) => {
    setDuplicateWarning(null);
    setForm((prev) => ({ ...prev, firstName: normalizeIdentityName(value) }));
  };

  const handleLastNameChange = (value) => {
    setDuplicateWarning(null);
    setForm((prev) => ({ ...prev, lastName: normalizeIdentityName(value) }));
  };

  const handlePhoneChange = (value) => {
    setDuplicateWarning(null);
    setForm((prev) => ({ ...prev, phoneNumber: formatUsPhone(value) }));
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

  const generatedPassword = useMemo(() => (
    generateIdentityPassword(form.firstName, form.lastName, form.phoneNumber, customer?.username || '')
  ), [form.firstName, form.lastName, form.phoneNumber, customer?.username]);

  const displayPassword = useMemo(() => {
    if (!customer) return '';
    return generatedPassword || customer.displayPassword || 'Not set';
  }, [customer, generatedPassword]);

  const duplicateMatchReasons = useMemo(() => {
    const reasons = new Set();
    const matches = Array.isArray(duplicateWarning?.matches) ? duplicateWarning.matches : [];
    matches.forEach((match) => {
      const reasonList = Array.isArray(match?.matchReasons) ? match.matchReasons : [];
      reasonList.forEach((reason) => {
        const normalized = String(reason || '').trim().toLowerCase();
        if (normalized) reasons.add(normalized);
      });
    });
    return reasons;
  }, [duplicateWarning]);

  const hasPhoneDuplicate = duplicateMatchReasons.has('phone');
  const hasPasswordDuplicate = duplicateMatchReasons.has('password');

  const roleBadgeLabel = useMemo(() => {
    const roleKey = String(customer?.role || 'player').toLowerCase();
    if (roleKey === 'user' || roleKey === 'player') return 'PLAYER';
    return roleKey.replace(/_/g, ' ').toUpperCase();
  }, [customer?.role]);

  const isAgent = useMemo(() => {
    const roleKey = String(customer?.role || 'player').toLowerCase();
    return roleKey === 'agent' || roleKey === 'master_agent' || roleKey === 'master agent' || roleKey === 'super_agent' || roleKey === 'super agent';
  }, [customer?.role]);

  // Find linked counterpart (NJG365 ↔ NJG365MA) for transaction history sharing
  const linkedCounterpart = useMemo(() => {
    if (!isAgent || !customer?.username || !agents?.length) return null;
    const upper = String(customer.username).toUpperCase();
    if (upper.endsWith('MA')) {
      const base = upper.slice(0, -2);
      const linked = agents.find((a) => String(a.username || '').toUpperCase() === base);
      return linked ? { id: linked.id, username: base } : null;
    } else {
      const maName = upper + 'MA';
      const linked = agents.find((a) => String(a.username || '').toUpperCase() === maName);
      return linked ? { id: linked.id, username: maName } : null;
    }
  }, [isAgent, customer?.username, agents]);

  const hiringAgentUsername = useMemo(() => {
    if (!hiringAgentIdDraft) return '';
    const match = agents.find((a) => a.id === hiringAgentIdDraft);
    return match ? String(match.username || '').toUpperCase() : String(customer?.createdByUsername || customer?.createdBy?.username || '').toUpperCase();
  }, [hiringAgentIdDraft, agents, customer]);

  const customerBalance = toMoneyNumber(customer?.balance, 0);
  const pendingBalance = toMoneyNumber(customer?.pendingBalance, 0);
  const freeplayBalanceValue = toMoneyNumber(customer?.freeplayBalance, 0);
  const lifetimePlusMinusValue = toMoneyNumber(customer?.lifetimePlusMinus ?? customer?.lifetime, 0);
  const creditLimitValue = pickMoneyValue(form.creditLimit, customer?.creditLimit ?? customer?.defaultCreditLimit);
  const settleLimitValue = pickMoneyValue(form.settleLimit, customer?.balanceOwed ?? customer?.defaultSettleLimit);
  const minBetValue = toMoneyNumber(customer?.minBet ?? customer?.defaultMinBet ?? form.minBet, 0);
  const maxBetValue = toMoneyNumber(customer?.maxBet ?? customer?.defaultMaxBet ?? customer?.wagerLimit ?? form.wagerLimit, 0);
  const displayedAgentBalance = isAgent && agentSettlementBalance !== null
    ? toMoneyNumber(agentSettlementBalance, 0)
    : customerBalance;
  const agentSettlementLabel = 'Balance Owed / House Money';

  const available = useMemo(() => {
    return creditLimitValue + customerBalance - pendingBalance;
  }, [creditLimitValue, customerBalance, pendingBalance]);

  const txSummary = useMemo(() => {
    let nonPostedCasino = 0;
    for (const txn of transactions) {
      if (txn?.status === 'pending' && String(txn?.type || '').toLowerCase().includes('casino')) {
        nonPostedCasino += Number(txn.amount || 0);
      }
    }
    return {
      pending: pendingBalance,
      available: isAgent ? customerBalance : Number(available || 0),
      carry: isAgent && agentSettlementBalance !== null ? displayedAgentBalance : customerBalance,
      nonPostedCasino
    };
  }, [transactions, pendingBalance, customerBalance, available, isAgent, agentSettlementBalance, displayedAgentBalance]);

  // Whole-dollar display uses Math.ceil so admin/agent figures never read
  // *below* the stored value — matches the player's /auth/me payload (PHP
  // ceil() in buildAuthPayload). Round() drifts down for cents > 0 and
  // produced "agent says $1999, player says $2000" mismatches on the
  // same stored 1999.26.
  const roundDisplayedMoney = (value) => {
    return Math.ceil(toMoneyNumber(value, 0));
  };

  const amountFromDisplayedMoney = (value) => String(Math.abs(roundDisplayedMoney(value)));

  const formatCurrency = (value) => {
    return '$' + roundDisplayedMoney(value).toLocaleString('en-US');
  };

  const formatDetailMoney = (value) => {
    const num = toMoneyNumber(value, 0);
    return `$${Math.ceil(num).toLocaleString('en-US')}`;
  };

  const handleImpersonate = async () => {
    setImpersonateError('');
    setImpersonating(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No admin token found. Please log in again.');

      const data = await impersonateUser(userId, token);
      if (!data?.token) throw new Error('Login failed: no token returned from server.');

      // Save original admin token so we can return later
      if (!sessionStorage.getItem('impersonationBaseToken')) {
        sessionStorage.setItem('impersonationBaseToken', token);
        const storedRole = localStorage.getItem('userRole') || '';
        if (storedRole) sessionStorage.setItem('impersonationBaseRole', storedRole);
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', String(data?.role || 'user'));
      localStorage.removeItem('user');

      const nextRole = String(data?.role || '').toLowerCase();
      let nextPath = '/';
      if (nextRole === 'admin') {
        nextPath = '/admin/dashboard';
      } else if (nextRole === 'agent') {
        nextPath = '/agent/dashboard';
      } else if (nextRole === 'master_agent' || nextRole === 'super_agent') {
        nextPath = '/super_agent/dashboard';
      }

      window.location.href = nextPath;
    } catch (err) {
      setImpersonateError(err.message || 'Failed to login as user. Please try again.');
      setImpersonating(false);
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

  const referredById = String(referredBy?.id || '').trim();
  const referredByDisplayName = useMemo(() => {
    if (!referredBy) return '—';
    const firstName = referredBy.firstName || '';
    const lastName = referredBy.lastName || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return fullName || referredBy.username || referredBy.id || '—';
  }, [referredBy]);
  const canOpenReferredByProfile = referredById !== '' && referredById !== String(userId || '').trim() && typeof onNavigateToUser === 'function';

  const openReferredByProfile = () => {
    if (!canOpenReferredByProfile) return;
    onNavigateToUser(referredById);
  };

  const copyAllDetails = async () => {
    const minBet = minBetValue;
    const maxBet = maxBetValue;
    const credit = creditLimitValue;
    const settle = settleLimitValue;
    const copiedPassword = String(displayPassword ?? '');
    const roleKey = String(customer?.role || '').toLowerCase();
    const isPlayerAccount = roleKey === 'user' || roleKey === 'player' || roleKey === '';
    const siteUrl = 'https://bettorplays247.com';

    const plainLines = isPlayerAccount
      ? [
        "Here's your account info. PLEASE READ ALL RULES THOROUGHLY.",
        '',
        `Login: ${customer?.username || ''}`,
        `Password: ${copiedPassword}`,
        `Min bet: ${formatDetailMoney(minBet)}`,
        `Max bet: ${formatDetailMoney(maxBet)}`,
        `Credit: ${formatDetailMoney(credit)}`,
        `Settle: +/- ${formatDetailMoney(settle)}`,
        '',
        `Site: ${siteUrl}`,
        '',
        PLAYER_COPY_DETAILS_FOOTER
      ]
      : [
        `Login: ${customer?.username || ''}`,
        `Password: ${copiedPassword}`,
        `Min bet: ${formatDetailMoney(minBet)}`,
        `Max bet: ${formatDetailMoney(maxBet)}`,
        `Credit: ${formatDetailMoney(credit)}`,
        `Settle: +/- ${formatDetailMoney(settle)}`,
        '',
        `Site: ${siteUrl}`
      ];

    const plainText = plainLines.join('\n');

    const htmlLines = plainLines.map((line) => {
      return line === '' ? '<br>' : line;
    });
    const htmlText = `<div style="font-family:sans-serif;white-space:pre-wrap;">${htmlLines.join('<br>')}</div>`;

    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([htmlText], { type: 'text/html' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      setCopyNotice('All details copied');
      window.setTimeout(() => setCopyNotice(''), 1400);
    } catch {
      setCopyNotice('Copy failed');
      window.setTimeout(() => setCopyNotice(''), 1400);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      setDuplicateWarning(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        return;
      }

      const normalizedFirstName = normalizeIdentityName(form.firstName).trim();
      const normalizedLastName = normalizeIdentityName(form.lastName).trim();
      const normalizedPhoneNumber = formatUsPhone(form.phoneNumber).trim();
      const policyPassword = isAgent ? '' : generateIdentityPassword(
        normalizedFirstName,
        normalizedLastName,
        normalizedPhoneNumber,
        customer?.username || ''
      );
      if (!isAgent && (!normalizedFirstName || !normalizedLastName || !normalizedPhoneNumber || !policyPassword)) {
        setError('First name, last name, and phone number are required to generate password.');
        return;
      }

      const payload = {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        phoneNumber: normalizedPhoneNumber,
        fullName: `${normalizedFirstName} ${normalizedLastName}`.trim(),
        password: policyPassword,
        allowDuplicateSave: true,
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

      payload.apps = {
        venmo: form.appsVenmo || '',
        cashapp: form.appsCashapp || '',
        applePay: form.appsApplePay || '',
        zelle: form.appsZelle || '',
        paypal: form.appsPaypal || '',
        btc: form.appsBtc || '',
        other: form.appsOther || ''
      };

      if (['admin', 'super_agent', 'master_agent'].includes(role) && form.agentId) {
        payload.agentId = form.agentId;
      }

      let result = null;
      if (isAgent) {
        // For agents: update the agents collection. The limit fields live as
        // default* in the agents table, not minBet/maxBet/etc.
        const agentPayload = {
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          fullName: `${normalizedFirstName} ${normalizedLastName}`.trim(),
          phoneNumber: normalizedPhoneNumber,
          defaultMinBet: Number(form.minBet || 0),
          defaultMaxBet: Number(form.wagerLimit || 0),
          defaultCreditLimit: Number(form.creditLimit || 0),
          defaultSettleLimit: Number(form.settleLimit || 0),
        };
        // Only send parentAgentId when user explicitly selected a new parent.
        // Sending empty string for top-level MAs (no parent) triggers a backend
        // "Cannot remove parent assignment" error.
        if (form.agentId) {
          agentPayload.parentAgentId = form.agentId;
        }
        await updateAgent(userId, agentPayload, token);
        result = {};
      } else if (role === 'agent') {
        result = await updateUserByAgent(userId, payload, token);
      } else {
        result = await updateUserByAdmin(userId, payload, token);
      }
      const persistedPayload = { ...payload };
      delete persistedPayload.allowDuplicateSave;
      if (isAgent) {
        // For agents, merge the agent-format fields so the normalizer's
        // default* fallback values stay consistent with what was saved.
        setCustomer((prev) => ({
          ...prev,
          firstName: persistedPayload.firstName,
          lastName: persistedPayload.lastName,
          fullName: persistedPayload.fullName,
          phoneNumber: persistedPayload.phoneNumber,
          status: persistedPayload.status,
          defaultMinBet: Number(form.minBet || 0),
          defaultMaxBet: Number(form.wagerLimit || 0),
          defaultCreditLimit: Number(form.creditLimit || 0),
          defaultSettleLimit: Number(form.settleLimit || 0),
          minBet: Number(form.minBet || 0),
          maxBet: Number(form.wagerLimit || 0),
          creditLimit: Number(form.creditLimit || 0),
          balanceOwed: Number(form.settleLimit || 0),
          displayPassword: prev?.displayPassword || '',
        }));
      } else {
        setCustomer((prev) => ({
          ...prev,
          ...persistedPayload,
          displayPassword: policyPassword || prev?.displayPassword || '',
          settings: {
            ...(prev?.settings || {}),
            ...persistedPayload.settings
          }
        }));
      }
      const duplicateWarningPayload = result?.duplicateWarning;
      if (duplicateWarningPayload && typeof duplicateWarningPayload === 'object') {
        setDuplicateWarning({
          message: duplicateWarningPayload.message || 'Likely duplicate player detected.',
          matches: Array.isArray(duplicateWarningPayload.matches) ? duplicateWarningPayload.matches : [],
        });
        setSuccess('Changes saved with duplicate warning.');
      } else {
        setSuccess('Changes saved successfully.');
      }
    } catch (err) {
      console.error('Failed to save player details:', err);
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
        setError('');
        return;
      }
      setError(err.message || 'Failed to save details');
    } finally {
      setSaving(false);
    }
  };

  const updateBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !customer) return;
      await updateUserCredit(userId, { balance: toMoneyNumber(customer.balance, 0) }, token);
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

  const openSection = (sectionId) => {
    if (sectionId === 'transactions') {
      setActiveSection('transactions');
      setTxDisplayFilter('7d');
      setTxTypeFilter('deposit_withdrawal');
      setTxStatusFilter('all');
    } else if (sectionId === 'pending') {
      setActiveSection('pending-bets');
      setPendingBetsError('');
      setPendingBetsNotice('');
      loadPendingBets();
    } else if (sectionId === 'performance') {
      setActiveSection('performance');
    } else if (sectionId === 'freeplays') {
      setActiveSection('freeplays');
    } else if (sectionId === 'dynamic-live') {
      setActiveSection('dynamic-live');
    } else if (sectionId === 'live-casino') {
      setActiveSection('live-casino');
    } else if (sectionId === 'commission') {
      setActiveSection('commission');
      // Lazy-load chain data the first time (or reload if stale)
      if (!commissionChain) loadCommissionChain();
    } else {
      setActiveSection('basics');
    }
    setShowBasicsMenu(false);
    setSuccess('');
    setTxSuccess('');
    setError('');
    setDuplicateWarning(null);
    setTxError('');
    setPerformanceError('');
    setFreePlayError('');
    setFreePlaySuccess('');
    setDynamicLiveError('');
    setDynamicLiveSuccess('');
    setCasinoError('');
    setCasinoSuccess('');
  };

  const openTransactionSlip = () => {
    openSection('transactions');
    const balance = isAgent ? displayedAgentBalance : toMoneyNumber(customer?.balance, 0);
    // Player rule: positive balance → withdrawal default (player has money to take out).
    // Agent rule (inverted): positive balance → deposit (settle what's owed),
    //                       negative balance → withdrawal (collect what's owed back).
    const defaultType = isAgent
      ? (balance > 0 ? 'deposit' : 'withdrawal')
      : (balance > 0 ? 'withdrawal' : 'deposit');
    setNewTxType(defaultType);
    setNewTxAmount('');
    setNewTxDescription('');
    setNewTxApplyFreeplayBonus(true);
    setTxError('');
    setShowNewTxModal(true);
  };

  // Auto-open the deposit modal when navigated from the admin header's
  // Balance Owed click for agents. Fires once after customer loads.
  const autoOpenDepositRequested = Boolean(viewContext?.autoOpenDeposit);
  const [autoOpenDone, setAutoOpenDone] = useState(false);
  useEffect(() => {
    setAutoOpenDone(false);
  }, [userId, autoOpenDepositRequested]);
  useEffect(() => {
    if (!autoOpenDepositRequested || autoOpenDone) return;
    if (!customer?.id) return;
    if (!isAgent) return;
    openTransactionSlip();
    setAutoOpenDone(true);
  }, [autoOpenDepositRequested, autoOpenDone, customer?.id, isAgent]);

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

  const performanceWagerCount = useMemo(() => {
    return performanceDayBets.filter((row) => !row?.synthetic).length;
  }, [performanceDayBets]);

  const txModalBalance = useMemo(
    () => (isAgent ? displayedAgentBalance : toMoneyNumber(customer?.balance, 0)),
    [isAgent, displayedAgentBalance, customer?.balance]
  );
  const txModalCarry = useMemo(
    () => (isAgent ? toMoneyNumber(customer?.balance, 0) : toMoneyNumber(txSummary?.carry, 0)),
    [isAgent, customer?.balance, txSummary?.carry]
  );

  const freePlayPending = useMemo(() => {
    return freePlayRows
      .filter((txn) => String(txn.status || '').toLowerCase() === 'pending')
      .reduce((sum, txn) => sum + toMoneyNumber(txn.amount, 0), 0);
  }, [freePlayRows]);

  const freePlayBalance = freeplayBalanceValue;

  const roundMoney = (value) => {
    const num = toMoneyNumber(value, 0);
    if (!Number.isFinite(num)) return 0;
    return Math.round(num * 100) / 100;
  };

  const getSignedBalanceColor = (value) => {
    const tone = getMoneyToneClass(value);
    if (tone === 'neg') return '#dc2626';
    if (tone === 'pos') return '#16a34a';
    return '#000000';
  };

  const getAgentSettlementToneClass = (value) => {
    const tone = getMoneyToneClass(value);
    if (tone === 'pos') return 'neg';
    if (tone === 'neg') return 'pos';
    return 'neutral';
  };

  const getDisplayMoneyToneClass = (value) => (
    isAgent ? getAgentSettlementToneClass(value) : getMoneyToneClass(value)
  );

  const getDisplayMoneyColor = (value, invert = isAgent) => {
    const tone = invert ? getAgentSettlementToneClass(value) : getMoneyToneClass(value);
    if (tone === 'neg') return '#dc2626';
    if (tone === 'pos') return '#16a34a';
    return '#000000';
  };

  const txTypeOptions = isAgent ? AGENT_TRANSACTION_TYPE_OPTIONS : TRANSACTION_TYPE_OPTIONS;
  const selectedTxDraftType = txTypeOptions.find((option) => option.value === newTxType)
    || txTypeOptions[0];
  const txDraftAmount = Number(newTxAmount || 0);
  const txDraftHasAmount = Number.isFinite(txDraftAmount) && txDraftAmount > 0;
  const txDraftCanContinue = txDraftHasAmount;
  const txDraftFreeplayPreview = useMemo(
    () => resolveDepositFreeplayBonusPreview(customer, txDraftAmount),
    [customer, txDraftAmount]
  );

  const freePlayIsWithdraw = freePlayModalMode === 'withdraw';
  const freePlayDraftAmount = Number(newFreePlayAmount || 0);
  const freePlayDraftHasAmount = Number.isFinite(freePlayDraftAmount) && freePlayDraftAmount > 0;
  const freePlayDraftCanContinue = freePlayDraftHasAmount;

  const refreshFreePlay = async () => {
    if (!customer?.username) return;
    try {
      setFreePlayLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const data = await getTransactionsHistory({
        user: customer.username,
        type: 'all',
        status: 'all',
        time: freePlayDisplayFilter,
        limit: 300
      }, token);
      const list = Array.isArray(data?.transactions) ? data.transactions : [];
      setFreePlayRows(list.filter((txn) => (
        isTransactionForCustomer(txn, userId, customer.username, linkedCounterpart)
        && isFreePlayTransaction(txn)
      )));
    } catch (err) {
      setFreePlayError(err.message || 'Failed to refresh free play');
    } finally {
      setFreePlayLoading(false);
    }
  };

  const formatDeleteSummary = (result, noun = 'transaction') => {
    const deleted = Number(result?.deleted || 0);
    const skipped = Number(result?.skipped || 0);
    const cascadeDeleted = Number(result?.cascadeDeleted || 0);
    const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
    const firstWarning = warnings.find((item) => typeof item?.message === 'string' && item.message.trim() !== '');

    let message = deleted > 0
      ? `Deleted ${deleted} ${noun}(s).`
      : `No ${noun}(s) were deleted.`;
    if (cascadeDeleted > 0) {
      message += ` Linked free play deleted: ${cascadeDeleted}.`;
    }
    if (skipped > 0) {
      message += ` Skipped ${skipped}.`;
    }
    if (firstWarning) {
      message += ` ${firstWarning.message}`;
    }
    if (deleted > 0 || cascadeDeleted > 0) {
      message += ' Balances and totals were updated.';
    } else {
      message += ' Balances and totals were not changed.';
    }
    return message;
  };

  const applyDeleteFeedback = (result, noun, setSuccessState, setErrorState) => {
    const deleted = Number(result?.deleted || 0);
    const cascadeDeleted = Number(result?.cascadeDeleted || 0);
    const message = formatDeleteSummary(result, noun);
    if (deleted > 0 || cascadeDeleted > 0) {
      setSuccessState(message);
      setErrorState('');
      return;
    }
    setSuccessState('');
    setErrorState(message);
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
      const currentFP = toMoneyNumber(customer.freeplayBalance, 0);
      const isWithdraw = freePlayModalMode === 'withdraw';
      const result = await updateUserFreeplay(userId, {
        operationMode: 'transaction',
        amount,
        direction: isWithdraw ? 'debit' : 'credit',
        description: newFreePlayDescription.trim(),
      }, token);
      const nextFreeplay = toMoneyNumber(result?.user?.freeplayBalance, NaN);
      const nextExpiresAt = result?.user?.freeplayExpiresAt ?? null;
      setCustomer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          freeplayBalance: Number.isFinite(nextFreeplay)
            ? nextFreeplay
            : roundMoney(currentFP + (isWithdraw ? -amount : amount)),
          freeplayExpiresAt: nextExpiresAt,
        };
      });
      const verb = isWithdraw ? 'withdrawn' : 'added';
      if (newFreePlayDescription.trim()) {
        setFreePlaySuccess(`Free play ${verb}. Note: "${newFreePlayDescription.trim()}"`);
      } else {
        setFreePlaySuccess(`Free play ${verb} successfully.`);
      }
      setFreePlayError('');
      setShowNewFreePlayModal(false);
      setShowFpConfirm(false);
      setNewFreePlayAmount('');
      setNewFreePlayDescription('');
      await refreshFreePlay();
    } catch (err) {
      setFreePlayError(err.message || 'Failed to update free play');
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
      if (!window.confirm(`Delete ${freePlaySelectedIds.length} selected free play transaction(s)?`)) {
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setFreePlayError('Please login again.');
        return;
      }
      const result = await deleteAdminTransactions(freePlaySelectedIds, token);
      setFreePlaySelectedIds([]);
      applyDeleteFeedback(result, 'free play transaction', setFreePlaySuccess, setFreePlayError);
      await refreshFreePlay();
      await refreshTransactions();
      await refreshCustomerFinancials();
    } catch (err) {
      setFreePlayError(err.message || 'Failed to delete free play transactions');
    }
  };

  const handleDeleteSingleFreePlayTransaction = async (txId) => {
    try {
      if (!txId) return;
      if (!window.confirm('Delete this free play transaction?')) {
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setFreePlayError('Please login again.');
        return;
      }
      const result = await deleteAdminTransactions([txId], token);
      setFreePlaySelectedIds((prev) => prev.filter((id) => id !== txId));
      applyDeleteFeedback(result, 'free play transaction', setFreePlaySuccess, setFreePlayError);
      await refreshFreePlay();
      await refreshTransactions();
      await refreshCustomerFinancials();
    } catch (err) {
      setFreePlayError(err.message || 'Failed to delete free play transaction');
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
      if (!token) {
        setTxError('Please login to view transactions.');
        return;
      }
      const rows = await loadCustomerTransactions(token);
      setTransactions(rows);
    } catch (err) {
      setTxError(err.message || 'Failed to refresh transactions');
    } finally {
      setTxLoading(false);
    }
  };

  const refreshCustomerFinancials = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const detailData = await getUserStatistics(userId, token);
      const latestUser = detailData?.user;
      if (!latestUser || typeof latestUser !== 'object') return;
      const normalizedLatestUser = normalizeCustomerFinancials(latestUser);
      const latestUserRole = String(latestUser?.role || '').toLowerCase();
      const latestUserIsAgent = latestUserRole === 'agent'
        || latestUserRole === 'master_agent'
        || latestUserRole === 'super_agent';
      const liveSettlementBalance = latestUserIsAgent
        ? await loadAgentSettlementBalance(token, latestUser.id || userId)
        : null;
      setCustomer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          balance: normalizedLatestUser.balance,
          pendingBalance: normalizedLatestUser.pendingBalance,
          freeplayBalance: normalizedLatestUser.freeplayBalance,
          lifetime: normalizedLatestUser.lifetime,
          lifetimePlusMinus: normalizedLatestUser.lifetimePlusMinus,
          balanceOwed: normalizedLatestUser.balanceOwed,
          creditLimit: normalizedLatestUser.creditLimit,
          updatedAt: normalizedLatestUser.updatedAt,
        };
      });
      setAgentSettlementBalance(liveSettlementBalance);
      if (detailData?.stats && typeof detailData.stats === 'object') {
        setStats(detailData.stats);
      }
      if (detailData?.referredBy !== undefined) {
        setReferredBy(detailData.referredBy || null);
      }
    } catch (err) {
      console.warn('Failed to refresh customer financials after transaction update:', err);
    }
  };

  const handleCreateTransaction = async () => {
    if (txSubmitting) return;
    setTxSubmitting(true);
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
      const activeTxTypeOptions = isAgent ? AGENT_TRANSACTION_TYPE_OPTIONS : TRANSACTION_TYPE_OPTIONS;
      const selectedTxType = activeTxTypeOptions.find((option) => option.value === newTxType)
        || activeTxTypeOptions[0];
      const currentBalance = toMoneyNumber(customer.balance, 0);
      const nextBalance = roundMoney(currentBalance + (selectedTxType.balanceDirection === 'credit' ? amount : -amount));
      const customDescription = newTxDescription.trim();
      let result;
      if (isAgent) {
        result = await updateAgentCredit(userId, {
          amount,
          direction: selectedTxType.balanceDirection,
          type: selectedTxType.apiType,
          description: customDescription || selectedTxType.defaultDescription,
        }, token);
      } else {
        result = await updateUserCredit(userId, {
          operationMode: 'transaction',
          amount,
          direction: selectedTxType.balanceDirection,
          type: selectedTxType.apiType,
          reason: selectedTxType.reason,
          description: customDescription || selectedTxType.defaultDescription,
          applyDepositFreeplayBonus: newTxApplyFreeplayBonus,
        }, token);
      }
      const freePlayBonusAmount = isAgent ? 0 : toMoneyNumber(result?.freeplayBonus?.amount, 0);
      const referralBonusAmount = isAgent ? 0 : toMoneyNumber(result?.referralBonus?.amount, 0);
      setCustomer((prev) => {
        if (!prev) return prev;
        const serverBalance = isAgent
          ? toMoneyNumber(result?.agent?.balance, NaN)
          : toMoneyNumber(result?.user?.balance, NaN);
        const nextBalanceValue = Number.isFinite(serverBalance) ? serverBalance : nextBalance;
        const serverFreeplay = toMoneyNumber(result?.user?.freeplayBalance, NaN);
        const nextFreeplayValue = Number.isFinite(serverFreeplay) ? serverFreeplay : toMoneyNumber(prev.freeplayBalance, 0);
        const rawLifetime = result?.user?.lifetimePlusMinus
          ?? result?.user?.lifetime
          ?? prev.lifetimePlusMinus
          ?? prev.lifetime
          ?? 0;
        const parsedLifetime = toMoneyNumber(rawLifetime, NaN);
        const nextLifetime = Number.isFinite(parsedLifetime)
          ? parsedLifetime
          : toMoneyNumber(prev.lifetimePlusMinus ?? prev.lifetime, 0);

        return {
          ...prev,
          balance: nextBalanceValue,
          freeplayBalance: nextFreeplayValue,
          lifetime: nextLifetime,
          lifetimePlusMinus: nextLifetime
        };
      });
      const successParts = ['Transaction saved and balance updated.'];
      if (freePlayBonusAmount > 0) {
        successParts.push(`Auto free play bonus added: ${formatCurrency(freePlayBonusAmount)}.`);
      }
      if (referralBonusAmount > 0) {
        successParts.push(`Referral bonus granted: ${formatCurrency(referralBonusAmount)}.`);
      }
      setTxSuccess(successParts.join(' '));
      setTxError('');
      setShowNewTxModal(false);
      setShowTxConfirm(false);
      setNewTxType('deposit');
      setNewTxAmount('');
      setNewTxDescription('');
      setNewTxApplyFreeplayBonus(true);
      await refreshTransactions();
    } catch (err) {
      setTxError(err.message || 'Failed to save transaction');
    } finally {
      setTxSubmitting(false);
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
      if (!window.confirm(`Delete ${selectedTxIds.length} selected transaction(s)?`)) {
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setTxError('Please login again.');
        return;
      }
      const result = await deleteAdminTransactions(selectedTxIds, token);
      setSelectedTxIds([]);
      await refreshTransactions();
      await refreshFreePlay();
      await refreshCustomerFinancials();
      applyDeleteFeedback(result, 'transaction', setTxSuccess, setTxError);
    } catch (err) {
      setTxError(err.message || 'Failed to delete selected transactions');
    }
  };

  const handleDeleteSingleTransaction = async (txId) => {
    try {
      if (!txId) return;
      if (!window.confirm('Delete this transaction?')) {
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setTxError('Please login again.');
        return;
      }
      const result = await deleteAdminTransactions([txId], token);
      setSelectedTxIds((prev) => prev.filter((id) => id !== txId));
      await refreshTransactions();
      await refreshFreePlay();
      await refreshCustomerFinancials();
      applyDeleteFeedback(result, 'transaction', setTxSuccess, setTxError);
    } catch (err) {
      setTxError(err.message || 'Failed to delete transaction');
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
        <div className="player-card">
          <div className="player-card-head">
            <div className="player-title-wrap">
              <div className="player-title-main">
                <span className="player-kicker">Player ID</span>
                <h2>{isAgent ? (() => {
                  const u = String(customer.username || '').toUpperCase();
                  const maName = u + 'MA';
                  const linked = agents?.find((a) => String(a.username || '').toUpperCase() === maName);
                  return linked ? `${u} (${maName})` : u;
                })() : (customer.username || 'USER')}</h2>
              </div>
              <span className="player-badge">{roleBadgeLabel}</span>
            </div>
          </div>

          <div className="paired-grid">
            <div className="detail-item">
              <span className="detail-label">Login</span>
              <strong className="detail-value">{customer.username || ''}</strong>
            </div>
            {isAgent ? (
              <button type="button" className={`detail-item detail-metric${activeSection === 'commission' ? ' detail-metric-active' : ''}`} onClick={() => openSection('commission')}>
                <span className="detail-label">{String(customer?.username || 'Agent').toUpperCase()} %</span>
                <strong className="detail-value">{customer?.agentPercent != null ? `${customer.agentPercent}%` : '—'}</strong>
              </button>
            ) : (
              <button type="button" className={`detail-item detail-metric${activeSection === 'transactions' ? ' detail-metric-active' : ''}`} onClick={openTransactionSlip}>
                <span className="detail-label">Balance</span>
                <strong className={`detail-value ${getMoneyToneClass(customerBalance)}`}>{formatCurrency(customerBalance)}</strong>
              </button>
            )}

            <div className="detail-item">
              <span className="detail-label">Password</span>
              <strong className="detail-value detail-secret">{displayPassword}</strong>
            </div>
            {isAgent ? (() => {
              const agentPct = customer?.agentPercent != null ? parseFloat(customer.agentPercent) : null;
              const hiringPct = customer?.hiringAgentPercent != null ? parseFloat(customer.hiringAgentPercent) : null;
              const housePct = 5;
              const hiringEffective = (hiringPct != null && agentPct != null) ? (hiringPct - agentPct) : null;
              const isDirectUnderHouse = hiringPct == null || hiringEffective === 0;
              const uplinePct = (!isDirectUnderHouse && hiringPct != null) ? (100 - housePct - hiringPct) : null;
              const showUpline = uplinePct != null && uplinePct > 0;
              const showHiring = !isDirectUnderHouse && hiringEffective > 0;
              // Right-column items (only visible ones, stacked top-down)
              const rightItems = [];
              if (showHiring) rightItems.push(<div key="hiring" className="detail-item detail-metric"><span className="detail-label">Hiring Agent %</span><strong className="detail-value">{hiringEffective}%</strong></div>);
              if (showUpline) rightItems.push(<div key="upline" className="detail-item detail-metric"><span className="detail-label">Upline Agent %</span><strong className="detail-value">{uplinePct}%</strong></div>);
              rightItems.push(<div key="house" className="detail-item detail-metric"><span className="detail-label">House %</span><strong className="detail-value">5%</strong></div>);
              rightItems.push(<button key="prate" type="button" className={`detail-item detail-metric${activeSection === 'commission' ? ' detail-metric-active' : ''}`} onClick={() => openSection('commission')}><span className="detail-label">Player Rate</span><strong className="detail-value">{customer?.playerRate != null ? `$${customer.playerRate}` : '—'}</strong></button>);
              // Left column stays fixed: Min Bet, Max Bet, Credit, Settle
              // Grid: left[0] right[0], left[1] right[1], ...
              return (<>
                {rightItems[0] || <div className="detail-item detail-empty" aria-hidden="true"></div>}
                <div className="detail-item"><span className="detail-label">Standard Min Bet</span><strong className="detail-value">{formatDetailMoney(minBetValue)}</strong></div>
                {rightItems[1] || <div className="detail-item detail-empty" aria-hidden="true"></div>}
                <div className="detail-item"><span className="detail-label">Standard Max Bet</span><strong className="detail-value">{formatDetailMoney(maxBetValue)}</strong></div>
                {rightItems[2] || <div className="detail-item detail-empty" aria-hidden="true"></div>}
                <div className="detail-item"><span className="detail-label">Standard Credit</span><strong className="detail-value">{formatDetailMoney(creditLimitValue)}</strong></div>
                {rightItems[3] || <div className="detail-item detail-empty" aria-hidden="true"></div>}
                <div className="detail-item"><span className="detail-label">Standard Settle</span><strong className="detail-value">+/- {formatDetailMoney(settleLimitValue)}</strong></div>
              </>);
            })() : (
            <>
              <button type="button" className={`detail-item detail-metric${activeSection === 'pending-bets' ? ' detail-metric-active' : ''}`} onClick={() => openSection('pending')}>
                <span className="detail-label">Pending</span>
                <strong className="detail-value neutral">{formatCurrency(pendingBalance)}</strong>
              </button>

              <div className="detail-item">
                <span className="detail-label">Min Bet</span>
                <strong className="detail-value">{formatDetailMoney(minBetValue)}</strong>
              </div>
              <div className="detail-item detail-metric">
                <span className="detail-label">Available</span>
                <strong className="detail-value neutral">{formatCurrency(available)}</strong>
              </div>

              <div className="detail-item">
                <span className="detail-label">Max Bet</span>
                <strong className="detail-value">{formatDetailMoney(maxBetValue)}</strong>
              </div>
              {!isAgent && (
                <button type="button" className={`detail-item detail-metric${activeSection === 'freeplays' ? ' detail-metric-active' : ''}`} onClick={() => openSection('freeplays')}>
                  <span className="detail-label">Freeplay</span>
                  <strong className="detail-value neutral">{formatCurrency(freeplayBalanceValue)}</strong>
                </button>
              )}

              <div className="detail-item">
                <span className="detail-label">Credit</span>
                <strong className="detail-value">{formatDetailMoney(creditLimitValue)}</strong>
              </div>
              <button type="button" className={`detail-item detail-metric${activeSection === 'performance' ? ' detail-metric-active' : ''}`} onClick={() => openSection('performance')}>
                <span className="detail-label">Lifetime +/-</span>
                <strong className={`detail-value ${getMoneyToneClass(lifetimePlusMinusValue)}`}>{formatCurrency(lifetimePlusMinusValue)}</strong>
              </button>

              <div className="detail-item">
                <span className="detail-label">Settle</span>
                <strong className="detail-value">+/- {formatDetailMoney(settleLimitValue)}</strong>
              </div>
              <button
                type="button"
                className={`detail-item ${canOpenReferredByProfile ? 'detail-link-item' : ''}`}
                onClick={openReferredByProfile}
                disabled={!canOpenReferredByProfile}
              >
                <span className="detail-label">Referred By</span>
                <strong className={`detail-value ${canOpenReferredByProfile ? 'detail-link-value' : ''}`} style={{ fontSize: '0.8em', wordBreak: 'break-all' }}>
                  {referredByDisplayName}
                </strong>
              </button>
            </>
            )}
            {isAgent ? (
              <button type="button" className={`detail-item detail-metric${activeSection === 'transactions' ? ' detail-metric-active' : ''}`} onClick={openTransactionSlip}>
                <span className="detail-label">{agentSettlementLabel}</span>
                <strong className={`detail-value ${getDisplayMoneyToneClass(displayedAgentBalance)}`}>{formatCurrency(displayedAgentBalance)}</strong>
              </button>
            ) : null}
          </div>

          <div className="player-card-foot">
            <div className="details-domain">
              <span className="domain-label">Site</span>
              <span style={{ fontWeight: 700 }}>bettorplays247.com</span>
            </div>
            <div className="top-actions">
              <button className="btn btn-copy-all" onClick={copyAllDetails}>Copy Details</button>
              <button className="btn btn-user" onClick={handleImpersonate} disabled={impersonating}>
                {impersonating ? 'Logging in...' : 'Login User'}
              </button>
            </div>
          </div>
        </div>
        {impersonateError && (
          <div className="copy-notice" style={{ color: '#c0392b', background: '#ffeaea' }}>{impersonateError}</div>
        )}
        {copyNotice && (
          <div className="copy-notice">{copyNotice}</div>
        )}
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
          <h3>{activeSection === 'transactions' ? 'Transactions' : activeSection === 'pending-bets' ? 'Pending Bets' : activeSection === 'performance' ? 'Performance' : activeSection === 'freeplays' ? 'Free Play' : activeSection === 'dynamic-live' ? 'Dynamic Live' : activeSection === 'live-casino' ? 'Live Casino' : activeSection === 'commission' ? 'Commission Tree' : 'The Basics'}</h3>
        </div>
        {activeSection === 'transactions' ? (
          <button className="btn btn-back" onClick={openTransactionSlip}>New transaction</button>
        ) : activeSection === 'pending-bets' ? (
          <button className="btn btn-back" onClick={() => loadPendingBets()} disabled={pendingBetsLoading}>{pendingBetsLoading ? 'Loading...' : 'Refresh'}</button>
        ) : activeSection === 'freeplays' ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-back" onClick={() => { setFreePlayModalMode('withdraw'); setFreePlayError(''); setShowNewFreePlayModal(true); }}>Withdraw</button>
            <button className="btn btn-save" onClick={() => { setFreePlayModalMode('deposit'); setFreePlayError(''); setShowNewFreePlayModal(true); }}>Add Free Play</button>
          </div>
        ) : activeSection === 'dynamic-live' ? (
          <button className="btn btn-save" onClick={handleSaveDynamicLive} disabled={dynamicLiveSaving}>{dynamicLiveSaving ? 'Saving...' : 'Save'}</button>
        ) : activeSection === 'live-casino' ? (
          <button className="btn btn-save" onClick={handleSaveCasinoLimits} disabled={casinoSaving}>{casinoSaving ? 'Saving...' : 'Save'}</button>
        ) : activeSection === 'commission' ? (
          <button className="btn btn-back" onClick={loadCommissionChain} disabled={commissionLoading}>{commissionLoading ? 'Loading...' : 'Refresh'}</button>
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

      {activeSection === 'transactions' ? txError && <div className="alert error">{txError}</div> : activeSection === 'pending-bets' ? pendingBetsError && <div className="alert error">{pendingBetsError}</div> : activeSection === 'performance' ? performanceError && <div className="alert error">{performanceError}</div> : activeSection === 'freeplays' ? freePlayError && <div className="alert error">{freePlayError}</div> : activeSection === 'dynamic-live' ? dynamicLiveError && <div className="alert error">{dynamicLiveError}</div> : activeSection === 'live-casino' ? casinoError && <div className="alert error">{casinoError}</div> : error && <div className="alert error">{error}</div>}
      {activeSection === 'transactions' ? txSuccess && <div className="alert success">{txSuccess}</div> : activeSection === 'freeplays' ? freePlaySuccess && <div className="alert success">{freePlaySuccess}</div> : activeSection === 'dynamic-live' ? dynamicLiveSuccess && <div className="alert success">{dynamicLiveSuccess}</div> : activeSection === 'live-casino' ? casinoSuccess && <div className="alert success">{casinoSuccess}</div> : success && <div className="alert success">{success}</div>}
      {activeSection === 'basics' && duplicateWarning && (
        <div className="duplicate-warning-state">
          <div className="duplicate-warning-title">Duplicate Player</div>
          <div className="duplicate-warning-message">{duplicateWarning.message}</div>
          {Array.isArray(duplicateWarning.matches) && duplicateWarning.matches.length > 0 && (
            <div className="duplicate-warning-list">
              {duplicateWarning.matches.map((match, idx) => (
                <div key={`${match.id || match.username || 'duplicate'}-${idx}`} className="duplicate-warning-item">
                  <strong>{String(match.username || 'UNKNOWN')}</strong>
                  <span>{String(match.fullName || 'No name')}</span>
                  <span>{String(match.phoneNumber || 'No phone')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'commission' && (
        <div className="commission-section">

          {/* ── Inline Editable Commission Fields ──────────────────── */}
          <div className="commission-edit-card">
            <h4 className="commission-card-title">Commission Settings</h4>
            {(() => {
              const openEdit = (field, currentValue) => {
                setCommissionEditField(field);
                setCommissionEditValue(currentValue != null ? String(currentValue) : '');
              };
              const closeEdit = () => { setCommissionEditField(null); setCommissionEditValue(''); };

              const saveField = async () => {
                const token = localStorage.getItem('token');
                if (!token || !commissionEditField) return;
                try {
                  setCommissionSaving(true);
                  const payload = {};
                  if (commissionEditField === 'agentPercent') {
                    const pct = parseFloat(commissionEditValue);
                    if (isNaN(pct) || pct < 0 || pct > 100) { setCommissionSaveError('Must be 0-100'); return; }
                    payload.agentPercent = pct;
                  } else if (commissionEditField === 'playerRate') {
                    const rate = parseFloat(commissionEditValue);
                    if (isNaN(rate) || rate < 0) { setCommissionSaveError('Must be a positive number'); return; }
                    payload.playerRate = rate;
                  }
                  await updateAgent(userId, payload, token);
                  setCommissionSaveError('');
                  setCommissionSaveSuccess('Saved');
                  closeEdit();
                  const detailData = await getUserStatistics(userId, token);
                  if (detailData?.user) setCustomer(normalizeCustomerFinancials(detailData.user));
                  setCommissionChain(null);
                  setTimeout(() => setCommissionSaveSuccess(''), 2000);
                } catch (err) {
                  setCommissionSaveError(err.message || 'Save failed');
                } finally {
                  setCommissionSaving(false);
                }
              };

              const fields = [
                { key: 'agentPercent', label: 'Agent %', value: customer?.agentPercent, display: customer?.agentPercent != null ? `${customer.agentPercent}%` : '—', editable: true },
                { key: 'playerRate', label: 'Player Rate', value: customer?.playerRate, display: customer?.playerRate != null ? `$${customer.playerRate}` : '—', editable: true },
              ];

              return (
                <div className="commission-inline-fields">
                  {fields.map((f) => (
                    <div key={f.key} className="commission-inline-row">
                      <span className="commission-inline-label">{f.label}</span>
                      {commissionEditField === f.key ? (
                        <div className="commission-inline-edit">
                          <input
                            type="number"
                            min="0"
                            max={f.key === 'agentPercent' ? '100' : undefined}
                            step="0.01"
                            className="commission-inline-input"
                            value={commissionEditValue}
                            onChange={(e) => setCommissionEditValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') closeEdit(); }}
                          />
                          <button className="commission-inline-save" onClick={saveField} disabled={commissionSaving}>
                            {commissionSaving ? '...' : 'Save'}
                          </button>
                          <button className="commission-inline-cancel" onClick={closeEdit}>Cancel</button>
                        </div>
                      ) : (
                        <button className="commission-inline-value" onClick={() => f.editable && openEdit(f.key, f.value)}>
                          {f.display}
                          {f.editable && <span className="commission-inline-edit-icon">&#9998;</span>}
                        </button>
                      )}
                    </div>
                  ))}
                  {commissionSaveError && <div className="alert error" style={{ marginTop: 8, fontSize: '0.85rem' }}>{commissionSaveError}</div>}
                  {commissionSaveSuccess && <div className="alert success" style={{ marginTop: 8, fontSize: '0.85rem' }}>{commissionSaveSuccess}</div>}
                </div>
              );
            })()}
          </div>

          {/* ── Hierarchy Box ──────────────────────────────────────── */}
          {commissionLoading && <div className="commission-loading">Loading chain...</div>}
          {commissionError && <div className="alert error">{commissionError}</div>}
          {commissionChain && !commissionLoading && (
            <>
              {/* Validity banner */}
              <div className={`commission-validity-banner ${commissionChain.isValid ? 'valid' : 'invalid'}`}>
                <span className="commission-validity-icon">{commissionChain.isValid ? '✓' : '!'}</span>
                <span>
                  Chain total: <strong>{commissionChain.chainTotal}%</strong>
                  {commissionChain.isValid ? ' — Valid' : ' — Must equal 100%'}
                </span>
                <button className="btn-text-sm" onClick={handleValidateChain} style={{ marginLeft: 12 }}>Re-validate</button>
              </div>
              {validateResult && (
                <div className={`commission-validity-banner ${validateResult.isValid ? 'valid' : 'invalid'}`} style={{ marginTop: 4 }}>
                  {validateResult.isValid ? 'Validation passed' : validateResult.errors?.join('; ')}
                </div>
              )}

              {/* ── Hierarchy summary box (top-down: House → Uplines → Agent) ── */}
              <div className="commission-hierarchy-box">
                {/* Admin/House row — always at top */}
                {commissionChain.upline.find((n) => n.role === 'admin') && (
                  <div className="ch-row ch-row-upline">
                    <span className="ch-row-label">House</span>
                    <span className="ch-row-username">({commissionChain.upline.find((n) => n.role === 'admin').username || '—'})</span>
                    <span className="ch-row-pct">(5%)</span>
                  </div>
                )}

                {/* Middle upline nodes — hiring agents / master agents (reversed for top-down) */}
                {[...commissionChain.upline]
                  .filter((n, idx) => idx > 0 && n.role !== 'admin')
                  .reverse()
                  .map((node, idx, arr) => (
                  <div key={node.id || idx} className="ch-row ch-row-hiring">
                    <span className="ch-row-label">{idx === arr.length - 1 ? 'Hiring Agent' : 'Upline Agent'}</span>
                    <span className="ch-row-username">
                      ({node.isSharedNode && node.linkedUsername ? `${node.username}/${node.linkedUsername}` : (node.username || '—')})
                    </span>
                    <span className={`ch-row-pct ${node.effectivePercent == null && node.agentPercent == null ? 'unset' : ''}`}>
                      {node.effectivePercent != null ? `(${node.effectivePercent}%)` : (node.agentPercent != null ? `(${node.agentPercent}%)` : '(not set)')}
                    </span>
                    {idx === arr.length - 1 && (
                      <select
                        className="ch-row-ma-select"
                        value={hiringAgentIdDraft}
                        onChange={(e) => handleChangeHiringAgent(e.target.value)}
                        disabled={commissionSaving}
                      >
                        <option value="">Change Master Agent</option>
                        {agents
                          .filter((a) => {
                            const r = String(a.role || '').toLowerCase();
                            return r === 'master_agent' || r === 'super_agent';
                          })
                          .map((a) => {
                            const id = a.id;
                            return <option key={id} value={id}>{String(a.username || '').toUpperCase()}</option>;
                          })}
                      </select>
                    )}
                  </div>
                ))}

                {/* Current agent — at bottom */}
                {commissionChain.upline[0] && (
                  <div className="ch-row ch-row-agent">
                    <span className="ch-row-label">Agent</span>
                    <span className="ch-row-username">
                      ({commissionChain.upline[0].isSharedNode && commissionChain.upline[0].linkedUsername ? `${commissionChain.upline[0].username}/${commissionChain.upline[0].linkedUsername}` : (commissionChain.upline[0].username || '—')})
                    </span>
                    <span className={`ch-row-pct ${commissionChain.upline[0].agentPercent == null ? 'unset' : ''}`}>
                      {commissionChain.upline[0].agentPercent != null ? `(${commissionChain.upline[0].agentPercent}%)` : '(not set)'}
                    </span>
                  </div>
                )}

                {/* Divider before sub-agents */}
                {commissionChain.downlines.length > 0 && (
                  <div className="ch-divider" />
                )}

                {/* Sub-agents (direct children) */}
                {commissionChain.downlines.map((d, idx) => (
                  <div key={d.id || idx} className="ch-row ch-row-sub">
                    <span className="ch-row-label">Sub Agent {idx + 1}</span>
                    <span className="ch-row-username">({d.username || '—'})</span>
                    <span className={`ch-row-pct ${d.agentPercent == null ? 'unset' : ''}`}>
                      {d.agentPercent != null ? `(${d.agentPercent}%)` : '(not set)'}
                    </span>
                    <span className={`ch-row-status ${d.status === 'active' ? 'active' : 'inactive'}`}>{d.status || ''}</span>
                  </div>
                ))}

                {commissionChain.downlines.length === 0 && (
                  <div className="ch-row ch-row-empty">
                    <span className="ch-row-label" style={{ color: '#94a3b8', fontStyle: 'italic' }}>No sub-agents yet</span>
                  </div>
                )}
              </div>

              {/* Commission Calculator */}
              <div className="commission-tree-card">
                <h4 className="commission-card-title">Commission Calculator</h4>
                <p className="commission-calc-hint">Enter an amount to see how it distributes across the chain.</p>
                <div className="commission-calc-row">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    className="commission-input"
                    placeholder="Amount (e.g. 1000)"
                    value={calcAmount}
                    onChange={(e) => { setCalcAmount(String(e.target.value).replace(/\D/g, '')); setCalcResult(null); setCalcError(''); }}
                  />
                  <button className="btn btn-back" onClick={handleCalculateCommission} disabled={calcLoading}>
                    {calcLoading ? 'Calculating...' : 'Calculate'}
                  </button>
                </div>
                {calcError && <div className="alert error" style={{ marginTop: 8 }}>{calcError}</div>}
                {calcResult && (
                  <div className="calc-result">
                    {!calcResult.isValid && (
                      <div className="alert error" style={{ marginBottom: 8 }}>
                        Chain total is {calcResult.chainTotal}% — percentages must sum to 100% for accurate results.
                      </div>
                    )}
                    <table className="commission-table">
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Role</th>
                          <th>%</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calcResult.distributions.map((d, idx) => (
                          <tr key={d.id || idx}>
                            <td className="commission-username">{d.isSharedNode && d.linkedUsername ? `${d.username}/${d.linkedUsername}` : (d.username || '—')}</td>
                            <td>{d.role ? d.role.replace(/_/g, ' ') : '—'}</td>
                            <td>{d.effectivePercent != null ? `${d.effectivePercent}%` : (d.agentPercent != null ? `${d.agentPercent}%` : '—')}</td>
                            <td className="commission-amount">${Math.ceil(Number(d.amount || 0))}</td>
                          </tr>
                        ))}
                        <tr className="commission-total-row">
                          <td colSpan={3}><strong>Total</strong></td>
                          <td className="commission-amount">
                            <strong>${Math.ceil(calcResult.distributions.reduce((s, d) => s + Number(d.amount || 0), 0))}</strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

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
                {TRANSACTION_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="tx-stat"><label>Pending</label><b>{formatCurrency(txSummary.pending)}</b></div>
            <div className="tx-stat"><label>{isAgent ? 'Funding Wallet' : 'Available'}</label><b>{formatCurrency(txSummary.available)}</b></div>
            <div className="tx-stat">
              <label>{isAgent ? 'House Money' : 'Carry'}</label>
              <b className={isAgent ? getAgentSettlementToneClass(txSummary.carry) : (txSummary.carry < 0 ? 'neg' : '')}>{formatCurrency(txSummary.carry)}</b>
            </div>
            <div className="tx-stat"><label>Non-Posted Casino</label><b>{formatCurrency(txSummary.nonPostedCasino)}</b></div>
          </div>

          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Notes</th>
                  <th>Credit</th>
                  <th>Debit</th>
                  <th>Balance</th>
                  <th>Entered By</th>
                  <th className="tx-actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  <tr><td colSpan={8} className="tx-empty">Loading transactions...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={8} className="tx-empty">No transactions found</td></tr>
                ) : transactions.map((txn) => {
                  const isDebit = isDebitTransaction(txn);
                  const amount = toMoneyNumber(txn.amount, 0);
                  const credit = isDebit ? 0 : amount;
                  const debit = isDebit ? amount : 0;
                  const balanceAfter = txn.balanceAfter;
                  const displayDescription = getTransactionDisplayLabel(txn);
                  const notes = getTransactionNotes(txn);
                  const enteredBy = getTransactionEnteredBy(txn);
                  const selected = selectedTxIds.includes(txn.id);
                  return (
                    <tr key={txn.id} className={selected ? 'selected' : ''} onClick={() => toggleTxSelection(txn.id)}>
                      <td>{toTxDate(txn.date)}</td>
                      <td>{displayDescription}</td>
                      <td>{notes}</td>
                      <td>{credit > 0 ? formatCurrency(credit) : '—'}</td>
                      <td>{debit > 0 ? formatCurrency(debit) : '—'}</td>
                      <td className={getMoneyToneClass(balanceAfter)}>{balanceAfter !== null && balanceAfter !== undefined ? formatCurrency(balanceAfter) : '—'}</td>
                      <td>{enteredBy}</td>
                      <td className="tx-actions-col">
                        <button
                          type="button"
                          className="tx-row-delete"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteSingleTransaction(txn.id);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button className="btn btn-danger" onClick={handleDeleteSelected} disabled={selectedTxIds.length === 0}>Delete Selected</button>
        </div>
      ) : activeSection === 'pending-bets' ? (
        <div className="transactions-wrap">
          {pendingBetsNotice && <div className="alert success">{pendingBetsNotice}</div>}
          {(() => {
            // Build the player-facing description for one bet, mirroring
            // the bettorjuice365 reference: top-line label "Parlay - N
            // Teams" / "Straight" + an indented list of legs ("Lakers
            // -4 -110"). For a single-leg straight we collapse to one
            // line so the row reads cleanly.
            const americanFromDecimal = (dec) => {
              const d = Number(dec);
              if (!Number.isFinite(d) || d <= 1) return '';
              const american = d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
              return american > 0 ? `+${american}` : `${american}`;
            };
            const legLine = (leg) => {
              const market = String(leg?.marketType || '').toLowerCase();
              const selection = String(leg?.selection || '').trim();
              const point = Number(leg?.point);
              const american = americanFromDecimal(leg?.odds);
              if (market === 'spreads' && Number.isFinite(point)) {
                const signed = point > 0 ? `+${point}` : `${point}`;
                return `${selection} ${signed}${american ? ` ${american}` : ''}`.trim();
              }
              if (market === 'totals' && Number.isFinite(point)) {
                const isUnder = selection.toLowerCase().startsWith('u');
                return `${isUnder ? 'Under' : 'Over'} ${Math.abs(point)}${american ? ` ${american}` : ''}`.trim();
              }
              return `${selection || 'ML'}${american ? ` ${american}` : ''}`.trim();
            };
            const winFromBet = (bet) => {
              const risk = Number(bet?.amount || 0);
              const payout = Number(bet?.potentialPayout || 0);
              return Math.max(0, payout - risk);
            };
            const totalRisk = pendingBets.reduce((sum, b) => sum + Number(b?.amount || 0), 0);
            const totalWin = pendingBets.reduce((sum, b) => sum + winFromBet(b), 0);
            return (
              <div className="tx-table-wrap">
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Risk</th>
                      <th>To Win</th>
                      <th className="tx-actions-col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBetsLoading ? (
                      <tr><td colSpan={4} className="tx-empty">Loading pending bets...</td></tr>
                    ) : pendingBets.length === 0 ? (
                      <tr><td colSpan={4} className="tx-empty">No pending bets</td></tr>
                    ) : pendingBets.map((bet) => {
                      const type = String(bet?.type || 'straight').toLowerCase();
                      const selections = Array.isArray(bet?.selections) ? bet.selections : [];
                      const isMulti = selections.length > 1;
                      const headline = isMulti
                        ? (type === 'parlay' ? `Parlay - ${selections.length} Teams`
                            : type === 'teaser' ? `Teaser - ${selections.length} Teams`
                            : type === 'if_bet' ? `If Bet - ${selections.length} Legs`
                            : type === 'reverse' ? `Reverse - ${selections.length} Legs`
                            : `${type.toUpperCase()} - ${selections.length} Legs`)
                        : (selections[0] ? legLine(selections[0]) : 'Straight');
                      const risk = Number(bet?.amount || 0);
                      const win = winFromBet(bet);
                      return (
                        <tr key={bet.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{headline}</div>
                            {isMulti && (
                              <div style={{ marginTop: 4, paddingLeft: 12, fontSize: 12, color: '#475569' }}>
                                {selections.map((leg, i) => (
                                  <div key={`${bet.id}-leg-${i}`}>{legLine(leg)}</div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="neg" style={{ fontWeight: 700 }}>{formatCurrency(risk)}</td>
                          <td style={{ fontWeight: 700 }}>{formatCurrency(win)}</td>
                          <td className="tx-actions-col">
                            <button
                              type="button"
                              className="tx-row-delete"
                              onClick={() => handleDeletePendingBet(bet.id)}
                              disabled={pendingBetDeletingId === bet.id}
                            >
                              {pendingBetDeletingId === bet.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {pendingBets.length > 0 && (
                    <tfoot>
                      <tr>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>Total Risk: <span className="neg">{formatCurrency(totalRisk)}</span> &nbsp; Total Win: <strong>{formatCurrency(totalWin)}</strong></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            );
          })()}
        </div>
      ) : activeSection === 'performance' ? (
        <div className="performance-wrap">
          <div className="perf-controls">
            <div className="tx-field">
              <label>Time</label>
              <select value={performancePeriod} onChange={(e) => setPerformancePeriod(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
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
                      <td>{Math.ceil(Number(row.net || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="perf-right">
              <div className="perf-title-row">
                <div>Wagers: <b>{performanceWagerCount}</b></div>
                <div>Result: <b>{formatCurrency(performanceResult)}</b></div>
              </div>
              <table className="perf-table">
                <thead>
                  <tr><th>{activePerformanceRow?.periodLabel || 'Selected Period'}</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {performanceDayBets.length === 0 ? (
                    <tr><td colSpan={2} className="tx-empty">No data available in table</td></tr>
                  ) : performanceDayBets.map((wager) => (
                    <tr key={wager.id} className={wager?.synthetic ? 'perf-synthetic' : ''}>
                      <td>{wager.label || 'Wager'}</td>
                      <td>{Math.ceil(Number(wager.amount || 0))}</td>
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
            <div className="tx-stat"><label>Balance</label><b>{Math.ceil(Number(freePlayBalance))}</b></div>
            <div className="tx-stat"><label>Pending</label><b>{Math.ceil(Number(freePlayPending))}</b></div>
          </div>

          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Notes</th>
                  <th>Credit</th>
                  <th>Debit</th>
                  <th>Balance</th>
                  <th>Entered By</th>
                  <th className="tx-actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {freePlayLoading ? (
                  <tr><td colSpan={9} className="tx-empty">Loading free play...</td></tr>
                ) : freePlayRows.length === 0 ? (
                  <tr><td colSpan={9} className="tx-empty">No free play transactions found</td></tr>
                ) : freePlayRows.map((txn) => {
                  const amount = toMoneyNumber(txn.amount, 0);
                  const balanceBefore = toMoneyNumber(txn.balanceBefore, 0);
                  const balanceAfter = toMoneyNumber(txn.balanceAfter ?? freePlayBalance, 0);
                  const isCredit = balanceAfter >= balanceBefore;
                  const credit = isCredit ? amount : 0;
                  const debit = !isCredit ? amount : 0;
                  const rowBalance = toMoneyNumber(txn?.balanceAfter ?? freePlayBalance, 0);
                  const displayDescription = getTransactionDisplayLabel(txn);
                  const notes = getTransactionNotes(txn);
                  const enteredBy = getTransactionEnteredBy(txn);
                  const selected = freePlaySelectedIds.includes(txn.id);
                  return (
                    <tr key={txn.id} className={selected ? 'selected' : ''} onClick={() => toggleFreePlaySelection(txn.id)}>
                      <td>{customer.username}</td>
                      <td>{toTxDate(txn.date)}</td>
                      <td>{displayDescription}</td>
                      <td>{notes}</td>
                      <td>{credit > 0 ? Math.ceil(credit) : '—'}</td>
                      <td>{debit > 0 ? Math.ceil(debit) : '—'}</td>
                      <td>{Math.ceil(rowBalance)}</td>
                      <td>{enteredBy}</td>
                      <td className="tx-actions-col">
                        <button
                          type="button"
                          className="tx-row-delete"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteSingleFreePlayTransaction(txn.id);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="freeplay-bottom-row">
            <button className="btn btn-danger" onClick={handleDeleteFreePlaySelected} disabled={freePlaySelectedIds.length === 0}>Delete Selected</button>
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
            onChange={(e) => handleFirstNameChange(e.target.value)}
          />

          <label>Last Name</label>
          <input
            value={form.lastName}
            placeholder="Enter last name"
            onChange={(e) => handleLastNameChange(e.target.value)}
          />

          <label>Phone Number</label>
          <input
            type="tel"
            value={form.phoneNumber}
            placeholder="Enter phone number"
            onChange={(e) => handlePhoneChange(e.target.value)}
            className={hasPhoneDuplicate ? 'duplicate-input' : ''}
          />

          <label>Password <span className="lock-badge">Locked</span></label>
          <input
            value={displayPassword}
            readOnly
            placeholder="Auto-generated from identity"
            className={`password-input-dark ${hasPasswordDuplicate ? 'duplicate-input' : ''}`}
          />

          <label>Master Agent</label>
          {['admin', 'super_agent', 'master_agent'].includes(role) ? (
            <select value={form.agentId} onChange={(e) => setField('agentId', e.target.value)}>
              <option value="">None</option>
              {agents
                .filter((a) => {
                  const r = String(a.role || '').toLowerCase();
                  return r === 'master_agent' || r === 'super_agent';
                })
                .map((a) => {
                  const id = a.id;
                  return <option key={id} value={id}>{a.username}</option>;
                })}
            </select>
          ) : (
            <input value={customer.masterAgentUsername || customer.agentUsername || '—'} readOnly />
          )}

          <label>Account Status</label>
          <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="read_only">Read Only</option>
          </select>

          <div className="switch-list">
            {[['Sportsbook', 'sportsbook'], ['Digital Casino', 'casino'], ['Racebook', 'horses'], ['Messaging', 'messaging'], ['Dynamic Live', 'dynamicLive'], ['Prop Plus', 'propPlus'], ['Live Casino', 'liveCasino']].map(([label, key]) => (
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

      <div className="apps-card">
        <h3 className="apps-title">Apps</h3>
        <div className="apps-grid">
          <div className="apps-field">
            <label>Venmo:</label>
            <input value={form.appsVenmo} onChange={(e) => setField('appsVenmo', e.target.value)} placeholder="@username" />
          </div>
          <div className="apps-field">
            <label>Cashapp:</label>
            <input value={form.appsCashapp} onChange={(e) => setField('appsCashapp', e.target.value)} placeholder="$cashtag" />
          </div>
          <div className="apps-field">
            <label>Apple Pay:</label>
            <input value={form.appsApplePay} onChange={(e) => setField('appsApplePay', e.target.value)} placeholder="Phone or email" />
          </div>
          <div className="apps-field">
            <label>Zelle:</label>
            <input value={form.appsZelle} onChange={(e) => setField('appsZelle', e.target.value)} placeholder="Phone or email" />
          </div>
          <div className="apps-field">
            <label>PayPal:</label>
            <input value={form.appsPaypal} onChange={(e) => setField('appsPaypal', e.target.value)} placeholder="Email or @username" />
          </div>
          <div className="apps-field">
            <label>BTC:</label>
            <input value={form.appsBtc} onChange={(e) => setField('appsBtc', e.target.value)} placeholder="Wallet address" />
          </div>
          <div className="apps-field apps-field-full">
            <label>Other:</label>
            <input value={form.appsOther} onChange={(e) => setField('appsOther', e.target.value)} placeholder="Other handle" />
          </div>
        </div>
      </div>

      <div className="bottom-line">
        <span>Total Wagered: {formatCurrency(stats.totalWagered || 0)}</span>
        <span>Net: <b className={getMoneyToneClass(stats.netProfit || 0)}>{formatCurrency(stats.netProfit || 0)}</b></span>
      </div>
      </>
      )}

      {showNewTxModal && (
        <div className="modal-overlay" onClick={() => { setShowNewTxModal(false); setShowTxConfirm(false); setNewTxApplyFreeplayBonus(true); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {!showTxConfirm ? (
              <>
                <h4>New transaction</h4>
                <label>Transaction</label>
                <select
                  value={newTxType}
                  onChange={(e) => {
                    setNewTxType(e.target.value);
                    if (e.target.value === 'deposit') {
                      setNewTxApplyFreeplayBonus(true);
                    }
                    setTxError('');
                  }}
                >
                  {txTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <label>Amount</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={newTxAmount}
                  onChange={(e) => {
                    setNewTxAmount(e.target.value === '' ? '' : String(Math.round(Number(e.target.value))));
                    setTxError('');
                  }}
                  placeholder="0"
                />
                <div className="tx-modal-balance-strip" role="status" aria-live="polite">
                  <div className="tx-modal-balance-item">
                    <span>{isAgent ? agentSettlementLabel : 'Current Balance'}</span>
                    <b
                      className={isAgent ? getAgentSettlementToneClass(txModalBalance) : getMoneyToneClass(txModalBalance)}
                      style={{ cursor: 'pointer' }}
                      title="Click to use this amount"
                      onClick={() => setNewTxAmount(amountFromDisplayedMoney(txModalBalance))}
                    >
                      {formatCurrency(txModalBalance)}
                    </b>
                  </div>
                  <div className="tx-modal-balance-item">
                    <span>{isAgent ? 'Funding Wallet' : 'Carry'}</span>
                    <b
                      className={isAgent ? getMoneyToneClass(txModalCarry) : getMoneyToneClass(txModalCarry)}
                      style={{ cursor: 'pointer' }}
                      title="Click to use this amount"
                      onClick={() => setNewTxAmount(amountFromDisplayedMoney(txModalCarry))}
                    >
                      {formatCurrency(txModalCarry)}
                    </b>
                  </div>
                </div>
                <label>Description</label>
                <input value={newTxDescription} onChange={(e) => setNewTxDescription(e.target.value)} placeholder="Optional note" />
                {selectedTxDraftType.value === 'deposit' && !isAgent && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '14px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      background: '#f9fafb',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newTxApplyFreeplayBonus}
                      onChange={(e) => setNewTxApplyFreeplayBonus(e.target.checked)}
                    />
                    <span style={{ fontWeight: 600, color: '#111827' }}>
                      {`${txDraftFreeplayPreview.percent}% Freeplay (${formatCurrency(txDraftFreeplayPreview.bonusAmount)})`}
                    </span>
                  </label>
                )}
                {txError && (
                  <div style={{ marginTop: '12px', marginBottom: '12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontWeight: 600 }}>
                    {txError}
                  </div>
                )}
                <div className="modal-actions">
                  <button className="btn btn-back" onClick={() => { setShowNewTxModal(false); setNewTxApplyFreeplayBonus(true); }}>Cancel</button>
                  <button className="btn btn-save" disabled={!txDraftCanContinue} onClick={() => {
                    if (!txDraftHasAmount) { setTxError('Enter a valid amount greater than 0.'); return; }
                    setTxError('');
                    setShowTxConfirm(true);
                  }}>Next</button>
                </div>
              </>
            ) : (() => {
              const amount = txDraftAmount;
              const selectedTxType = selectedTxDraftType;
              const prevBal = txModalBalance;
              const newBal = roundMoney(prevBal + (selectedTxType.balanceDirection === 'credit' ? amount : -amount));
              const isDebit = selectedTxType.balanceDirection === 'debit';
              const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
              const balanceLabel = isAgent ? agentSettlementLabel : 'Balance';
              return (
                <>
                  <h4 style={{ marginBottom: '16px' }}>Confirm Transaction</h4>
                  <div className="tx-confirm-table">
                    <div className="tx-confirm-row"><span>Date</span><span>{today}</span></div>
                    <div className="tx-confirm-row"><span>Previous {balanceLabel}</span><span style={{ color: getDisplayMoneyColor(prevBal) }}>{formatCurrency(prevBal)}</span></div>
                    <div className="tx-confirm-row"><span>{selectedTxType.label} :</span><span style={{ color: getDisplayMoneyColor(newBal) }}>{isDebit ? '-' : ''}{formatCurrency(amount)}</span></div>
                    {selectedTxType.value === 'deposit' && !isAgent && (
                      <div className="tx-confirm-row">
                        <span>Freeplay Bonus</span>
                        <span style={{ color: newTxApplyFreeplayBonus ? '#166534' : '#6b7280' }}>
                          {newTxApplyFreeplayBonus
                            ? `${txDraftFreeplayPreview.percent}% (${formatCurrency(txDraftFreeplayPreview.bonusAmount)})`
                            : 'Off'}
                        </span>
                      </div>
                    )}
                    <div className="tx-confirm-row tx-confirm-total"><span>New {balanceLabel}</span><span style={{ color: getDisplayMoneyColor(newBal) }}>{formatCurrency(newBal)}</span></div>
                  </div>
                  {txError && (
                    <div style={{ marginTop: '12px', marginBottom: '12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontWeight: 600 }}>
                      {txError}
                    </div>
                  )}
                  <div className="modal-actions">
                    <button className="btn btn-back" onClick={() => setShowTxConfirm(false)}>Cancel</button>
                    <button className="btn btn-save" disabled={!txDraftCanContinue || txSubmitting} onClick={handleCreateTransaction}>{txSubmitting ? 'Saving…' : 'Confirm'}</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {showNewFreePlayModal && (
        <div className="modal-overlay" onClick={() => { setShowNewFreePlayModal(false); setShowFpConfirm(false); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {!showFpConfirm ? (
              <>
                <h4>{freePlayModalMode === 'withdraw' ? 'Withdraw Free Play' : 'New Free Play'}</h4>
                <label>Transaction</label>
                <div className="fp-modal-type-badge" style={{ background: freePlayModalMode === 'withdraw' ? '#fee2e2' : undefined, color: freePlayModalMode === 'withdraw' ? '#dc2626' : undefined }}>
                  {freePlayModalMode === 'withdraw' ? 'Withdraw' : 'Deposit'}
                </div>
                <label>Amount</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={newFreePlayAmount}
                  onChange={(e) => {
                    setNewFreePlayAmount(e.target.value === '' ? '' : String(Math.round(Number(e.target.value))));
                    setFreePlayError('');
                  }}
                  placeholder="0"
                />
                <div className="tx-modal-balance-strip fp-modal-balance-strip" role="status" aria-live="polite">
                  <div className="tx-modal-balance-item">
                    <span>Free Play Balance</span>
                    <b
                      className={getMoneyToneClass(freePlayBalance)}
                      style={{ cursor: 'pointer' }}
                      title="Click to use this amount"
                      onClick={() => setNewFreePlayAmount(amountFromDisplayedMoney(freePlayBalance))}
                    >
                      {formatCurrency(freePlayBalance)}
                    </b>
                  </div>
                </div>
                <label>Description</label>
                <input value={newFreePlayDescription} onChange={(e) => setNewFreePlayDescription(e.target.value)} placeholder="Optional note" />
                {freePlayError && (
                  <div style={{ marginTop: '12px', marginBottom: '12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontWeight: 600 }}>
                    {freePlayError}
                  </div>
                )}
                <div className="modal-actions">
                  <button className="btn btn-back" onClick={() => setShowNewFreePlayModal(false)}>Cancel</button>
                  <button className="btn btn-save" disabled={!freePlayDraftCanContinue} onClick={() => {
                    if (!freePlayDraftHasAmount) { setFreePlayError('Enter a valid free play amount greater than 0.'); return; }
                    setFreePlayError('');
                    setShowFpConfirm(true);
                  }}>Next</button>
                </div>
              </>
            ) : (() => {
              const amount = freePlayDraftAmount;
              const isWithdraw = freePlayIsWithdraw;
              const prevBal = freePlayBalance;
              const newBal = roundMoney(prevBal + (isWithdraw ? -amount : amount));
              const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
              return (
                <>
                  <h4 style={{ marginBottom: '16px' }}>Confirm Free Play</h4>
                  <div className="tx-confirm-table">
                    <div className="tx-confirm-row"><span>Date</span><span>{today}</span></div>
                    <div className="tx-confirm-row"><span>Previous Balance</span><span style={{ color: getSignedBalanceColor(prevBal) }}>{formatCurrency(prevBal)}</span></div>
                    <div className="tx-confirm-row"><span>{isWithdraw ? 'Withdrawals' : 'Deposits'} :</span><span style={{ color: isWithdraw ? '#dc2626' : '#1f2937' }}>{isWithdraw ? '-' : ''}{formatCurrency(amount)}</span></div>
                    <div className="tx-confirm-row tx-confirm-total"><span>New Balance</span><span style={{ color: getSignedBalanceColor(newBal) }}>{formatCurrency(newBal)}</span></div>
                  </div>
                  {freePlayError && (
                    <div style={{ marginTop: '12px', marginBottom: '12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontWeight: 600 }}>
                      {freePlayError}
                    </div>
                  )}
                  <div className="modal-actions">
                    <button className="btn btn-back" onClick={() => setShowFpConfirm(false)}>Cancel</button>
                    <button className="btn btn-save" disabled={!freePlayDraftCanContinue} onClick={handleCreateFreePlay}>Confirm</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <style>{`
        .customer-details-v2 { background:#f3f4f6; min-height:100vh; padding:10px; color:#1f2937; }
        .top-panel {
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
        }
        .top-left h2 { margin:0; font-size:22px; line-height:1.05; font-weight: 700; letter-spacing: 0.15px; }
        .agent-line { margin-top:3px; color:#4b5563; font-size:12px; }
        .top-actions { display:flex; gap:8px; flex-wrap: wrap; justify-content: flex-end; }

        .btn { border:none; border-radius:3px; cursor:pointer; font-weight:600; }
        .btn-back { background:#3db3d7; color:#fff; padding:7px 12px; font-size:13px; }
        .btn-user { background:#2f7fb6; color:#fff; padding:7px 12px; font-size:13px; }
        .btn-copy-all { background:#139cc9; color:#fff; padding:7px 12px; font-size:13px; }
        .btn-save { background:#35b49f; color:#fff; padding:8px 16px; min-width:108px; font-size:13px; }

        .player-card {
          border: 1px solid #d6e2f3;
          border-radius: 10px;
          padding: 10px;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
          max-width: 100%;
          box-shadow: inset 0 0 0 1px rgba(225, 236, 247, 0.7);
        }
        .player-card-head {
          margin-bottom: 9px;
        }
        .player-title-wrap {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .player-title-main {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .player-kicker {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.7px;
          color: #5e7a95;
          text-transform: uppercase;
        }
        .player-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid #8cb4df;
          background: #edf5ff;
          color: #245d98;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 7px;
        }
        .paired-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }
        .detail-metric {
          align-items: flex-end;
          text-align: right;
        }
        button.detail-item {
          cursor: pointer;
          font-family: inherit;
          text-align: right;
          border: 1px solid #dde7f2;
        }
        button.detail-item:disabled {
          cursor: default;
        }
        button.detail-item:hover {
          background: #eef5ff;
          border-color: #a8c9e8;
        }
        button.detail-item:disabled:hover {
          background: #f8fbff;
          border-color: #dde7f2;
        }
        .detail-metric-active {
          background: #deeeff !important;
          border-color: #4f9bce !important;
        }
        .detail-link-item {
          align-items: flex-start;
          text-align: left;
        }
        .detail-link-value {
          color: #1d4ed8;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .detail-empty {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
          pointer-events: none;
        }
        .detail-value.pos { color: #16a34a; }
        .detail-value.neg { color: #dc2626; }
        .detail-value.neutral { color: #000000; }
        .detail-item {
          border: 1px solid #dde7f2;
          background: #f8fbff;
          border-radius: 8px;
          padding: 8px 9px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .detail-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: #607992;
        }
        .detail-value {
          margin: 0;
          font-size: 14px;
          line-height: 1.2;
          color: #1f2937;
          font-weight: 600;
        }
        .detail-secret {
          letter-spacing: 0.35px;
          font-weight: 600;
        }
        .player-card-foot {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e3ecf5;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
        }
        .details-domain {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .domain-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.65px;
          color: #607992;
          text-transform: uppercase;
        }
        .details-domain strong {
          font-size: 14px;
          line-height: 1.1;
          font-weight: 600;
          color: #1f2937;
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
        .creds-pill-password {
          color: #020617;
          font-weight: 300;
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
          margin-top: 8px;
          color: #1f5fb9;
          font-size: 12px;
          font-weight: 700;
        }
        .mobile-only { display: none; }

        .top-right {
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border: 1px solid #d6e2ec;
          border-radius: 10px;
          padding: 8px;
          background: linear-gradient(180deg, #f8fbff 0%, #f4f8fc 100%);
        }
        .summary-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.7px;
          color: #5e7690;
          text-transform: uppercase;
          padding: 0 2px 2px;
        }
        .metric {
          border: 1px solid #d6e3ef;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
          padding: 7px 9px;
          border-radius: 8px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-height: 48px;
        }
        .metric:hover { border-color: #9ec0df; box-shadow: 0 2px 10px rgba(14, 75, 128, 0.12); }
        .metric.metric-active {
          border-color: #4f86bc;
          box-shadow: 0 0 0 2px rgba(79, 134, 188, 0.18);
          transform: translateY(-1px);
        }
        .metric.metric-static {
          cursor: default;
        }
        .metric span {
          display:block;
          font-size:10px;
          color:#4a6279;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-weight: 700;
        }
        .metric b {
          font-size:18px;
          line-height:1;
          font-weight:700;
          font-variant-numeric: tabular-nums;
        }
        .metric .neg { color:#dc2626; }
        .metric .pos { color:#15803d; }
        .metric .neutral { color:#000000; }
        .metric-circle { background: transparent; border: none; border-radius: 0; padding: 0; margin-top: 0; }

        .basics-header { margin-top:8px; background:#fff; border:1px solid #d1d5db; border-radius:8px; padding:8px 10px; display:flex; align-items:center; justify-content:space-between; }
        .basics-left { display:flex; align-items:center; gap:10px; }
        .basics-left h3 { margin:0; font-size:16px; line-height:1.1; font-weight:700; }
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
          width: 280px;
          height: 280px;
          max-width: calc(100vw - 48px);
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.2);
          padding: 8px 7px 8px;
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
          gap: 12px 8px;
          padding: 8px 2px 2px;
          height: 232px;
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

        .alert { margin-top:8px; padding:8px 10px; border-radius:3px; font-size: 12px; }
        .alert.error { background:#fee2e2; color:#991b1b; border:1px solid #fecaca; }
        .alert.success { background:#dcfce7; color:#166534; border:1px solid #bbf7d0; }
        .duplicate-warning-state {
          border: 1px solid #f1d178;
          border-radius: 10px;
          background: #fff8dd;
          color: #6b4e00;
          padding: 12px;
          margin-top: 8px;
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

        .transactions-wrap {
          margin-top: 8px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px;
        }
        .tx-controls {
          display: grid;
          grid-template-columns: 1.2fr 1.2fr repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 9px;
        }
        .tx-field label, .tx-stat label {
          display: block;
          color: #4b5563;
          font-size: 11px;
          margin-bottom: 2px;
        }
        .tx-field select {
          width: 100%;
          border: none;
          border-bottom: 1px solid #6b7280;
          background: transparent;
          font-size: 13px;
          padding: 3px 0;
          color: #111827;
          outline: none;
        }
        .tx-field input {
          width: 100%;
          border: none;
          border-bottom: 1px solid #6b7280;
          background: transparent;
          font-size: 13px;
          padding: 3px 0;
          color: #111827;
          outline: none;
        }
        .tx-stat b {
          display: block;
          font-size: 15px;
          line-height: 1.05;
          font-weight: 600;
          color: #111827;
        }
        .tx-stat .neg { color: #dc2626; }
        .tx-table-wrap {
          border: 1px solid #cbd5e1;
          min-height: 250px;
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
          font-size: 13px;
          padding: 8px 10px;
          position: sticky;
          top: 0;
        }
        .tx-table td {
          border-bottom: 1px solid #e5e7eb;
          padding: 7px 10px;
          font-size: 12px;
          color: #1f2937;
        }
        .tx-actions-col {
          width: 96px;
          min-width: 96px;
          text-align: center;
          white-space: nowrap;
        }
        .tx-table th.tx-actions-col,
        .tx-table td.tx-actions-col {
          text-align: center;
          padding-left: 6px;
          padding-right: 6px;
        }
        .tx-row-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 26px;
          padding: 6px 10px;
          border: 1px solid #f5c2ca;
          border-radius: 999px;
          background: #fff5f6;
          color: #b42333;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .tx-row-delete:hover {
          background: #ffe9ed;
          border-color: #ed9daa;
          color: #9f1f2f;
        }
        .tx-row-delete:focus-visible {
          outline: 2px solid #d9465a;
          outline-offset: 1px;
        }
        .tx-row-delete:active {
          transform: translateY(1px);
        }
        .tx-row-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          padding: 8px 18px;
          font-size: 13px;
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
          border-radius: 8px;
          padding: 10px;
        }
        .perf-controls {
          display: grid;
          grid-template-columns: 220px;
          gap: 10px;
          margin-bottom: 8px;
        }
        .performance-grid {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 12px;
          min-height: 320px;
        }
        .perf-left {
          border: 1px solid #cbd5e1;
          max-height: 320px;
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
          font-size: 14px;
          line-height: 1;
          padding: 8px 0 8px 0;
        }
        .perf-title-row b { font-size: 18px; font-weight: 700; }
        .perf-table {
          width: 100%;
          border-collapse: collapse;
        }
        .perf-table th {
          background: #1f3345;
          color: #fff;
          text-align: left;
          font-size: 12px;
          padding: 8px 10px;
          position: sticky;
          top: 0;
        }
        .perf-table td {
          border-bottom: 1px solid #e5e7eb;
          padding: 7px 9px;
          font-size: 12px;
          color: #1f2937;
        }
        .perf-table tr.selected td { background: #f1f5f9; }
        .perf-table tr.perf-synthetic td {
          background: #fff7ed;
          color: #7c2d12;
          font-weight: 600;
        }

        .dynamic-live-wrap {
          margin-top: 8px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px;
        }
        .dl-top-select {
          width: 190px;
          margin-bottom: 8px;
        }
        .dynamic-live-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
        }
        .dl-col, .dl-col-toggles {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .dl-col label {
          font-size: 12px;
          color: #4b5563;
        }
        .dl-col input {
          border: none;
          border-bottom: 1px solid #6b7280;
          background: transparent;
          font-size: 13px;
          line-height: 1;
          color: #111827;
          padding: 2px 0 4px;
          outline: none;
        }
        .dl-col-toggles .switch-row {
          justify-content: space-between;
          font-size: 12px;
          line-height: 1.15;
          padding: 7px 0;
        }

        .live-casino-wrap {
          margin-top: 8px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 14px 16px;
        }
        .live-casino-grid {
          display: grid;
          grid-template-columns: 200px 120px 120px 120px;
          gap: 8px 14px;
          align-items: center;
          max-width: 760px;
        }
        .lc-col-head {
          font-size: 14px;
          color: #374151;
          font-weight: 700;
        }
        .lc-label {
          font-size: 12px;
          color: #374151;
          font-weight: 600;
        }
        .live-casino-grid input {
          width: 100%;
          border: 1px solid #d1d5db;
          background: #fff;
          border-radius: 4px;
          font-size: 12px;
          line-height: 1;
          padding: 4px 8px;
          color: #111827;
        }
        .lc-note {
          margin-top: 10px;
          max-width: 1200px;
          font-size: 11px;
          line-height: 1.35;
          color: #374151;
        }

        .basics-grid { margin-top:8px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
        .col-card { background:#fff; border:1px solid #d1d5db; padding:10px; display:flex; flex-direction:column; min-height:500px; }
        .col-card label { color:#4b5563; font-size:11px; margin-top:7px; margin-bottom:3px; }
        .lock-badge {
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
        .col-card input, .col-card select, .col-card textarea { width:100%; border:none; border-bottom:1px solid #6b7280; background:transparent; font-size:14px; padding:3px 0; color:#111827; outline:none; }
        .col-card .duplicate-input {
          border-bottom-color: #b45309 !important;
          background: #fff7ed !important;
          box-shadow: inset 0 -1px 0 #b45309;
        }
        .col-card .password-input-dark {
          background: transparent;
          color: #020617;
          border: none;
          border-bottom: 1px solid #6b7280;
          border-radius: 0;
          padding: 3px 0;
          font-weight: 300;
        }
        .col-card .password-input-dark::placeholder {
          color: #0f172a;
          opacity: 1;
          font-weight: 300;
        }
        .col-card .password-input-dark:focus {
          border-bottom-color: #111827;
          box-shadow: none;
        }
        .col-card textarea { border:1px solid #6b7280; min-height:120px; font-size:13px; padding:5px; }

        .switch-list { margin-top:6px; }
        .switch-row { display:flex; align-items:center; justify-content:space-between; padding:5px 0; font-size:13px; }
        .switch-row.inline-top { margin-top:8px; }
        .switch {
          position:relative;
          display:inline-block;
          width:46px;
          height:24px;
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
          height:18px;
          width:18px;
          left:3px;
          top:3px;
          background:white;
          transition:.2s;
          border-radius:50%;
        }
        .switch input:checked + .slider { background:#16a34a; }
        .switch input:checked + .slider:before { transform:translateX(22px); }

        .bottom-line { margin-top:10px; font-size:12px; color:#374151; display:flex; gap:14px; flex-wrap: wrap; }
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
          width: 340px;
          max-width: calc(100vw - 32px);
          border-radius: 6px;
          background: #fff;
          padding: 12px;
          border: 1px solid #d1d5db;
          box-shadow: 0 12px 30px rgba(0,0,0,0.25);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .modal-card h4 { margin: 0 0 6px; font-size: 15px; }
        .modal-card label { font-size: 12px; color: #4b5563; }
        .modal-card input, .modal-card select {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 7px 9px;
          font-size: 13px;
          color: #111827;
        }
        .fp-modal-type-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 14px;
          border-radius: 6px;
          background: #e8f5ee;
          border: 1px solid #a7d7b8;
          color: #1a7a42;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 10px;
          letter-spacing: 0.02em;
        }
        .fp-modal-balance-strip {
          grid-template-columns: 1fr;
        }
        .tx-modal-balance-strip {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin: 2px 0 8px;
        }
        .tx-modal-balance-item {
          border: 1px solid #dbe7f3;
          border-radius: 8px;
          background: #f8fbff;
          padding: 7px 8px;
        }
        .tx-modal-balance-item span {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.45px;
          text-transform: uppercase;
          color: #607992;
          margin-bottom: 4px;
        }
        .tx-modal-balance-item b {
          display: block;
          font-size: 16px;
          line-height: 1;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #111827;
        }
        .tx-modal-balance-item b.neg { color: #dc2626; }
        .tx-modal-balance-item b.pos { color: #15803d; }
        .tx-modal-balance-item b.neutral { color: #000000; }
        .apps-card { background:#fff; border:1px solid #d1d5db; padding:16px; margin-top:10px; border-radius:4px; }
        .apps-title { font-size:15px; font-weight:700; color:#1e3a5f; margin:0 0 12px 0; }
        .apps-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; }
        .apps-field { display:flex; flex-direction:column; }
        .apps-field label { color:#4b5563; font-size:11px; margin-bottom:3px; font-weight:600; }
        .apps-field input { width:100%; border:none; border-bottom:1px solid #6b7280; background:transparent; font-size:14px; padding:3px 0; color:#111827; outline:none; }
        .apps-field input:focus { border-bottom-color:#1e40af; }
        .apps-field-full { grid-column:1/-1; }
        .tx-confirm-table {
          width: 100%;
          border-top: 1px solid #e5e7eb;
          margin-bottom: 20px;
        }
        .tx-confirm-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
          color: #374151;
        }
        .tx-confirm-row span:first-child { font-weight: 500; }
        .tx-confirm-row span:last-child { font-weight: 600; }
        .tx-confirm-total span:first-child { font-weight: 700; font-size: 15px; }
        .tx-confirm-total span:last-child { font-weight: 700; font-size: 15px; }
        .modal-actions {
          margin-top: 8px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        @media (max-width: 1300px) {
          .basics-grid { grid-template-columns:1fr; }
          .player-card { max-width: 100%; }
          .player-card-foot { flex-direction: column; align-items: flex-start; }
          .creds-row { grid-template-columns: 90px 1fr 32px; }
          .limits-box { grid-template-columns: 1fr; }
          .top-actions { justify-content: flex-start; width: 100%; }
          .tx-controls { grid-template-columns: 1fr 1fr; }
          .tx-stat b { font-size: 14px; }
          .freeplay-controls { grid-template-columns: 1fr 1fr; }
          .freeplay-bottom-row { grid-template-columns: 1fr; }
          .freeplay-inputs { min-width: 0; grid-template-columns: 1fr; }
          .performance-grid { grid-template-columns: 1fr; }
          .perf-left { max-height: 300px; }
          .perf-title-row { font-size: 14px; }
          .perf-title-row b { font-size: 18px; }
          .dynamic-live-grid { grid-template-columns: 1fr; }
          .dl-col input { font-size: 13px; }
          .dl-col-toggles .switch-row { font-size: 12px; }
          .live-casino-grid { grid-template-columns: 1fr 1fr; max-width: none; }
          .lc-col-head, .lc-label, .live-casino-grid input { font-size: 13px; }
          .lc-note { font-size: 11px; }
        }

        @media (max-width: 768px) {
          .top-panel,
          .tx-panel,
          .performance-panel,
          .dynamic-live-card,
          .live-casino-card {
            padding: 8px;
          }

          .top-actions {
            width: 100%;
          }

          .details-grid {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .paired-grid {
            grid-template-columns: 1fr 1fr;
            gap: 5px;
          }

          .detail-item {
            padding: 5px 7px;
            gap: 2px;
          }

          .detail-label {
            font-size: 9px;
            letter-spacing: 0.4px;
          }

          .detail-value {
            font-size: 12px;
          }

          .player-card {
            width: 100%;
            max-width: 100%;
            padding: 8px;
          }

          .player-card-head {
            margin-bottom: 6px;
          }

          .top-left h2 {
            font-size: 17px;
          }

          .player-badge {
            font-size: 9px;
            padding: 3px 7px;
          }

          .player-card-foot {
            align-items: stretch;
            margin-top: 7px;
            padding-top: 7px;
          }

          .details-domain strong {
            font-size: 12px;
          }

          .domain-label {
            font-size: 9px;
          }

          .top-actions .btn {
            flex: 1 1 calc(50% - 4px);
            text-align: center;
          }

          /* Compact financial summary — tight rows like bettorjuice */
          .top-right {
            padding: 6px;
            gap: 4px;
          }

          .summary-title {
            font-size: 9px;
            padding: 0 2px 1px;
          }

          .metric {
            min-height: 34px;
            padding: 5px 8px;
            border-radius: 6px;
          }

          .metric span {
            font-size: 9px;
          }

          .metric b {
            font-size: 14px;
          }

          .tx-controls,
          .freeplay-controls {
            grid-template-columns: 1fr;
          }

          .tx-summary {
            grid-template-columns: 1fr 1fr;
          }
          .tx-actions-col {
            width: 70px;
            min-width: 70px;
          }
          .tx-row-delete {
            min-height: 24px;
            padding: 4px 6px;
            font-size: 10px;
          }

          .perf-title-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .modal-actions {
            flex-direction: column;
            justify-content: stretch;
          }

          .modal-actions button {
            width: 100%;
          }

          .tx-modal-balance-strip {
            grid-template-columns: 1fr;
          }

          .live-casino-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .customer-details-v2 {
            padding: 5px;
          }

          .top-panel,
          .transactions-wrap,
          .performance-wrap,
          .dynamic-live-wrap,
          .live-casino-wrap,
          .col-card {
            padding: 7px;
          }

          .tx-summary {
            grid-template-columns: 1fr 1fr;
          }

          .details-grid {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .detail-item {
            padding: 4px 6px;
          }

          .detail-label {
            font-size: 8px;
          }

          .detail-value {
            font-size: 11px;
          }

          .top-left h2 {
            font-size: 15px;
          }

          .metric {
            min-height: 30px;
            padding: 4px 7px;
          }

          .metric span {
            font-size: 8px;
          }

          .metric b {
            font-size: 13px;
          }

          .basics-left h3 {
            font-size: 14px;
          }

          .btn-save,
          .btn-back,
          .btn-user,
          .btn-copy-all {
            font-size: 11px;
            padding: 5px 8px;
          }

          .basics-header {
            padding: 6px 8px;
          }
        }
      `}</style>
    </div>
  );
}

export default CustomerDetailsView;
