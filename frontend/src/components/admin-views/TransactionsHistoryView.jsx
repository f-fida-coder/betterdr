import { useEffect, useMemo, useRef, useState } from 'react';
import { getAgentTree, getTransactionsHistory, getUsersAdmin } from '../../api';
import { formatTransactionType, isDebitTransaction } from '../../utils/transactionPresentation';

const MODE_OPTIONS = [
  { value: 'player-transactions', label: 'Player Transactions' },
  { value: 'agent-transactions', label: 'Agent Transactions' },
  { value: 'deleted-transactions', label: 'Deleted Transactions' },
  { value: 'free-play-transactions', label: 'Free Play Transactions' },
  { value: 'free-play-analysis', label: 'Free Play Analysis' },
  { value: 'player-summary', label: 'Player Summary' },
];

const DEFAULT_TYPE_OPTIONS = [
  { value: 'all-types', label: 'Transactions Type' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'wager', label: 'Wager' },
  { value: 'payout', label: 'Payout' },
  { value: 'casino', label: 'Casino' },
  { value: 'fp_deposit', label: 'Free Play' },
];

const normalizeTypeValue = (value) => String(value || '').trim().toLowerCase();
const WAGER_TYPES = new Set(['bet_placed', 'bet_placed_admin', 'bet_lost', 'casino_bet_debit']);
const PAYOUT_TYPES = new Set(['bet_won', 'bet_refund', 'bet_void', 'bet_void_admin', 'casino_bet_credit']);
const ADJUSTMENT_TYPES = new Set(['adjustment', 'credit_adj', 'debit_adj']);
const DEBIT_TYPES = new Set(['withdrawal', 'bet_placed', 'bet_placed_admin', 'bet_lost', 'fee', 'debit', 'casino_bet_debit']);

const matchesTransactionType = (row, selectedType) => {
  const filterType = normalizeTypeValue(selectedType);
  if (!filterType || filterType === 'all-types') return true;

  const rowType = normalizeTypeValue(row?.type);
  const reason = normalizeTypeValue(row?.reason);
  if (rowType === filterType) return true;

  if (filterType === 'adjustment') {
    return ADJUSTMENT_TYPES.has(rowType);
  }
  if (filterType === 'wager') {
    return WAGER_TYPES.has(rowType);
  }
  if (filterType === 'payout') {
    return PAYOUT_TYPES.has(rowType);
  }
  if (filterType === 'casino') {
    return rowType.startsWith('casino_');
  }
  if (filterType === 'fp_deposit') {
    return rowType === 'fp_deposit' || reason === 'freeplay_adjustment';
  }

  return false;
};

const filterRowsBySelectedTypes = (rows, selectedTypes) => {
  if (!Array.isArray(rows)) return [];
  const normalized = Array.isArray(selectedTypes)
    ? selectedTypes.map((value) => normalizeTypeValue(value)).filter(Boolean)
    : [];
  if (normalized.length === 0 || normalized.includes('all-types')) {
    return rows;
  }
  return rows.filter((row) => normalized.some((typeValue) => matchesTransactionType(row, typeValue)));
};

const getSignedAmount = (row) => {
  const signedAmount = Number(row?.signedAmount);
  if (Number.isFinite(signedAmount) && signedAmount !== 0) return signedAmount;

  const amount = Number(row?.amount || 0);
  if (!Number.isFinite(amount)) return 0;
  if (amount < 0) return amount;

  const entrySide = String(row?.entrySide || '').trim().toUpperCase();
  if (entrySide === 'DEBIT') return -Math.abs(amount);
  if (entrySide === 'CREDIT') return Math.abs(amount);

  const balanceBefore = Number(row?.balanceBefore);
  const balanceAfter = Number(row?.balanceAfter);
  if (Number.isFinite(balanceBefore) && Number.isFinite(balanceAfter) && balanceBefore !== balanceAfter) {
    return balanceAfter < balanceBefore ? -Math.abs(amount) : Math.abs(amount);
  }

  const rowType = normalizeTypeValue(row?.type);
  if (DEBIT_TYPES.has(rowType)) return -Math.abs(amount);
  return isDebitTransaction(row) ? -Math.abs(amount) : Math.abs(amount);
};

const summarizeTransactionRows = (rows) => rows.reduce((acc, row) => {
  const signed = getSignedAmount(row);
  const abs = Math.abs(signed);
  acc.count += 1;
  acc.grossAmount += abs;
  acc.netAmount += signed;
  if (signed >= 0) {
    acc.creditAmount += signed;
  } else {
    acc.debitAmount += abs;
  }
  return acc;
}, { count: 0, grossAmount: 0, netAmount: 0, creditAmount: 0, debitAmount: 0 });

const toIsoDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMoney = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0';
  return Math.round(num).toLocaleString('en-US');
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const AGENT_ROLES = new Set(['admin', 'agent', 'master_agent', 'super_agent']);

const flattenAgentTreeOptions = (data) => {
  const seen = new Set();
  const out = [];

  const visitNode = (node) => {
    if (!node || typeof node !== 'object') return;
    const id = String(node.id || node._id || '').trim();
    const username = String(node.username || '').trim();
    const role = String(node.role || '').trim().toLowerCase();
    if (id && username && AGENT_ROLES.has(role) && !seen.has(id)) {
      seen.add(id);
      out.push({ id, username, role });
    }
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach(visitNode);
  };

  if (data?.root) {
    visitNode({ ...data.root, children: Array.isArray(data?.tree) ? data.tree : [] });
  } else if (Array.isArray(data?.tree)) {
    data.tree.forEach(visitNode);
  }

  return out;
};

const mapUsersToSuggestions = (users) => {
  if (!Array.isArray(users)) return [];
  const seen = new Set();
  const out = [];
  users.forEach((user) => {
    const id = String(user?.id || user?._id || '').trim();
    const username = String(user?.username || '').trim();
    if (!id || !username || seen.has(id)) return;
    seen.add(id);
    const fullName = String(
      user?.fullName
      || `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`
    ).trim();
    out.push({ id, username, fullName });
  });
  return out;
};

function TransactionsHistoryView() {
  const today = useMemo(() => toIsoDate(new Date()), []);
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toIsoDate(d);
  }, []);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));
  const [agentsSearch, setAgentsSearch] = useState('');
  const [playersSearch, setPlayersSearch] = useState('');
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState(['deposit', 'withdrawal']);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [mode, setMode] = useState('player-transactions');
  const [startDate, setStartDate] = useState(sevenDaysAgo);
  const [endDate, setEndDate] = useState(today);

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ count: 0, grossAmount: 0, netAmount: 0, creditAmount: 0, debitAmount: 0 });
  const [resultType, setResultType] = useState('transactions');
  const [typeOptions, setTypeOptions] = useState(DEFAULT_TYPE_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [agentSuggestOpen, setAgentSuggestOpen] = useState(false);
  const [playerSuggestOpen, setPlayerSuggestOpen] = useState(false);
  const [agentOptions, setAgentOptions] = useState([]);
  const [playerSuggestions, setPlayerSuggestions] = useState([]);
  const [playerSuggestLoading, setPlayerSuggestLoading] = useState(false);
  const playerSuggestCacheRef = useRef(new Map());

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const loadAgentOptions = async () => {
      try {
        const data = await getAgentTree(token);
        if (!active) return;
        setAgentOptions(flattenAgentTreeOptions(data));
      } catch (err) {
        console.error('Failed to fetch agent suggestions:', err);
        if (active) {
          setAgentOptions([]);
        }
      }
    };

    loadAgentOptions();
    return () => {
      active = false;
    };
  }, []);

  const agentSuggestions = useMemo(() => {
    const q = agentsSearch.trim().toLowerCase();
    const filtered = q === ''
      ? agentOptions
      : agentOptions.filter((agent) => (
        String(agent.username || '').toLowerCase().includes(q)
        || String(agent.role || '').replace(/_/g, ' ').includes(q)
      ));
    return filtered.slice(0, 12);
  }, [agentOptions, agentsSearch]);

  const playerSeedSuggestions = useMemo(() => {
    const seen = new Set();
    const out = [];
    rows.forEach((row) => {
      const username = String(row?.playerUsername || '').trim();
      if (!username) return;
      const key = username.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        id: key,
        username,
        fullName: String(row?.playerName || '').trim(),
      });
    });
    return out.slice(0, 12);
  }, [rows]);

  useEffect(() => {
    if (!playerSuggestOpen) return undefined;

    const token = localStorage.getItem('token');
    if (!token) {
      setPlayerSuggestions([]);
      setPlayerSuggestLoading(false);
      return undefined;
    }

    const q = playersSearch.trim();
    if (q === '') {
      setPlayerSuggestions([]);
      setPlayerSuggestLoading(false);
      return undefined;
    }

    const key = q.toLowerCase();
    const cached = playerSuggestCacheRef.current.get(key);
    if (cached) {
      setPlayerSuggestions(cached);
      setPlayerSuggestLoading(false);
      return undefined;
    }

    let cancelled = false;
    setPlayerSuggestLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const users = await getUsersAdmin(token, { q });
        if (cancelled) return;
        const mapped = mapUsersToSuggestions(users).slice(0, 12);
        playerSuggestCacheRef.current.set(key, mapped);
        setPlayerSuggestions(mapped);
      } catch (err) {
        console.error('Failed to fetch player suggestions:', err);
        if (!cancelled) {
          setPlayerSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setPlayerSuggestLoading(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [playersSearch, playerSuggestOpen]);

  const displayedPlayerSuggestions = useMemo(
    () => (playersSearch.trim() === '' ? playerSeedSuggestions : playerSuggestions),
    [playersSearch, playerSeedSuggestions, playerSuggestions]
  );
  const normalizedTypeOptions = useMemo(
    () => typeOptions
      .map((option) => ({
        value: normalizeTypeValue(option?.value),
        label: String(option?.label || option?.value || '').trim(),
      }))
      .filter((option) => option.value && option.label),
    [typeOptions]
  );
  const toggleableTypeOptions = useMemo(
    () => normalizedTypeOptions.filter((option) => option.value !== 'all-types'),
    [normalizedTypeOptions]
  );
  const toggleableTypeValues = useMemo(
    () => toggleableTypeOptions.map((option) => option.value),
    [toggleableTypeOptions]
  );
  const selectedTypeValues = useMemo(() => {
    if (selectedTransactionTypes.includes('all-types')) return ['all-types'];
    const allowed = new Set(toggleableTypeValues);
    const filtered = selectedTransactionTypes
      .map((value) => normalizeTypeValue(value))
      .filter((value) => allowed.has(value));
    return filtered.length > 0 ? filtered : ['all-types'];
  }, [selectedTransactionTypes, toggleableTypeValues]);

  const getAgentBadgeLabel = (role) => {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'master_agent') return 'MASTER';
    if (normalized === 'super_agent') return 'SUPER';
    if (normalized === 'admin') return 'ADMIN';
    return 'AGENT';
  };

  const loadHistory = async (overrides = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to view transaction history.');
      setLoading(false);
      return;
    }

    const effectiveMode = overrides.mode !== undefined ? overrides.mode : mode;
    const effectiveStart = overrides.startDate !== undefined ? overrides.startDate : startDate;
    const effectiveEnd = overrides.endDate !== undefined ? overrides.endDate : endDate;
    const effectiveTypeValues = overrides.selectedTypeValues !== undefined ? overrides.selectedTypeValues : selectedTypeValues;
    const effectiveAgents = overrides.agentsSearch !== undefined ? overrides.agentsSearch : agentsSearch;
    const effectivePlayers = overrides.playersSearch !== undefined ? overrides.playersSearch : playersSearch;

    if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
      setError('Start date cannot be after end date.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const transactionType = effectiveTypeValues.length === 1 ? effectiveTypeValues[0] : 'all-types';
      const hasScopedSearch = effectiveAgents.trim() !== '' || effectivePlayers.trim() !== '';
      const data = await getTransactionsHistory({
        mode: effectiveMode,
        agents: effectiveAgents,
        players: effectivePlayers,
        transactionType,
        startDate: effectiveStart,
        endDate: effectiveEnd,
        limit: hasScopedSearch ? 1000 : 700,
      }, token);

      const list = Array.isArray(data?.rows)
        ? data.rows
        : (Array.isArray(data?.transactions) ? data.transactions : []);

      const nextResultType = String(data?.resultType || 'transactions');
      const shouldApplyClientTypeFilter = nextResultType === 'transactions'
        && effectiveTypeValues.length > 1
        && !effectiveTypeValues.includes('all-types');
      const filteredRows = shouldApplyClientTypeFilter
        ? filterRowsBySelectedTypes(list, effectiveTypeValues)
        : list;
      setRows(filteredRows);
      setResultType(nextResultType);
      setSummary(
        nextResultType === 'transactions'
          ? (shouldApplyClientTypeFilter
            ? summarizeTransactionRows(filteredRows)
            : (data?.summary || summarizeTransactionRows(filteredRows)))
          : (data?.summary || { count: 0, grossAmount: 0, netAmount: 0, creditAmount: 0, debitAmount: 0 })
      );
      const apiTypeOptions = Array.isArray(data?.meta?.transactionTypes) ? data.meta.transactionTypes : [];
      setTypeOptions(apiTypeOptions.length > 0 ? apiTypeOptions : DEFAULT_TYPE_OPTIONS);
      setSearched(true);
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      setError(err.message || 'Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setTypeFilterOpen(false);
    loadHistory();
  };

  const handleToggleTransactionType = (typeValue) => {
    const normalizedValue = normalizeTypeValue(typeValue);
    if (!normalizedValue) return;
    if (normalizedValue === 'all-types' || toggleableTypeValues.length === 0) {
      setSelectedTransactionTypes(['all-types']);
      loadHistory({ selectedTypeValues: ['all-types'] });
      return;
    }

    setSelectedTransactionTypes((prev) => {
      const normalizedPrev = prev.includes('all-types')
        ? [...toggleableTypeValues]
        : prev
          .map((value) => normalizeTypeValue(value))
          .filter((value) => toggleableTypeValues.includes(value));

      const next = normalizedPrev.includes(normalizedValue)
        ? normalizedPrev.filter((value) => value !== normalizedValue)
        : [...normalizedPrev, normalizedValue];

      const nextTypes = (next.length === 0 || next.length === toggleableTypeValues.length)
        ? ['all-types']
        : next;

      // Trigger fetch with the resolved next value (state update is async)
      loadHistory({ selectedTypeValues: nextTypes });

      return nextTypes;
    });
  };

  const modeLabel = MODE_OPTIONS.find((option) => option.value === mode)?.label || 'Transaction History';

  const formatSignedAmount = (signed, fallback) => {
    const val = signed !== 0 ? signed : Number(fallback || 0);
    const abs = formatMoney(Math.abs(val));
    return val >= 0 ? `+$${abs}` : `-$${abs}`;
  };

  const renderTransactionsTable = () => {
    const totalSigned = rows.reduce((acc, row) => {
      return acc + getSignedAmount(row);
    }, 0);
    return (
      <div className="txh-table-wrap">
        <div className="txh-total-bar">
          Total: <span className={totalSigned < 0 ? 'negative' : 'txh-total-green'}>${formatMoney(Math.abs(totalSigned))}</span>
        </div>
        <div className="txh-scroll">
          <table className="txh-pro-table txh-pro-table-transactions">
            <thead>
              <tr>
                <th>Date</th>
                <th>Agent</th>
                <th>Customer</th>
                <th>Transaction</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Entered By</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="txh-empty-cell">No transactions matched these filters.</td></tr>
              ) : rows.map((row, idx) => {
                const signed = getSignedAmount(row);
                const isCredit = signed >= 0;
                return (
                  <tr key={`${String(row.id || row.transactionId || 'tx')}-${idx}`} className={idx % 2 === 0 ? 'txh-row-even' : 'txh-row-odd'}>
                    <td className="txh-col-date">{formatDateTime(row.date)}</td>
                    <td className="txh-col-user">{String(row.agentUsername || '—').toUpperCase()}</td>
                    <td className="txh-col-user">{String(row.playerUsername || '—').toUpperCase()}</td>
                    <td className="txh-col-type">{formatTransactionType(row)}</td>
                    <td className="txh-col-desc">{row.description || row.reason || '—'}</td>
                    <td className={`txh-col-amount ${isCredit ? 'txh-credit' : 'txh-debit'}`}>
                      {formatSignedAmount(signed, row.amount)}
                    </td>
                    <td className="txh-col-user">{String(row.actorUsername || row.enteredBy || 'ME').toUpperCase()}</td>
                  </tr>
                );
              })}
              {rows.length > 0 && (
                <tr className="txh-total-row">
                  <td colSpan={5}><strong>Total</strong></td>
                  <td className={`txh-col-amount ${totalSigned >= 0 ? 'txh-credit' : 'txh-debit'}`}>
                    <strong>{totalSigned >= 0 ? '+' : '-'}${formatMoney(Math.abs(totalSigned))}</strong>
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFreePlayAnalysisTable = () => {
    const totalCredits = rows.reduce((acc, r) => acc + Number(r.creditAmount || 0), 0);
    const totalDebits = rows.reduce((acc, r) => acc + Number(r.debitAmount || 0), 0);
    const totalNet = totalCredits - totalDebits;
    return (
      <div className="txh-table-wrap">
        <div className="txh-total-bar">
          Net Free Play: <span className={totalNet < 0 ? 'negative' : 'txh-total-green'}>${formatMoney(Math.abs(totalNet))}</span>
        </div>
        <div className="txh-scroll">
          <table className="txh-pro-table txh-pro-table-analysis">
            <thead>
              <tr>
                <th>Player</th>
                <th>Agent</th>
                <th>Tx Count</th>
                <th>Credits</th>
                <th>Debits</th>
                <th>Net</th>
                <th>Free Play Balance</th>
                <th>Last Transaction</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="txh-empty-cell">No free play analysis data found.</td></tr>
              ) : rows.map((row, idx) => {
                const net = Number(row.netAmount || 0);
                return (
                  <tr key={`${String(row.playerId || row.playerUsername || 'fp')}-${idx}`} className={idx % 2 === 0 ? 'txh-row-even' : 'txh-row-odd'}>
                    <td className="txh-col-user">{String(row.playerUsername || '—').toUpperCase()}</td>
                    <td className="txh-col-user">{String(row.agentUsername || '—').toUpperCase()}</td>
                    <td>{Number(row.transactionCount || 0)}</td>
                    <td className="txh-credit">+${formatMoney(row.creditAmount)}</td>
                    <td className="txh-debit">-${formatMoney(row.debitAmount)}</td>
                    <td className={net < 0 ? 'txh-debit' : 'txh-credit'}>{net >= 0 ? '+' : '-'}${formatMoney(Math.abs(net))}</td>
                    <td>${formatMoney(row.currentFreeplayBalance)}</td>
                    <td className="txh-col-date">{formatDateTime(row.lastTransactionAt)}</td>
                  </tr>
                );
              })}
              {rows.length > 0 && (
                <tr className="txh-total-row">
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className="txh-credit"><strong>+${formatMoney(totalCredits)}</strong></td>
                  <td className="txh-debit"><strong>-${formatMoney(totalDebits)}</strong></td>
                  <td className={totalNet < 0 ? 'txh-debit' : 'txh-credit'}><strong>{totalNet >= 0 ? '+' : '-'}${formatMoney(Math.abs(totalNet))}</strong></td>
                  <td colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPlayerSummaryTable = () => {
    const totalCredits = rows.reduce((acc, r) => acc + Number(r.creditAmount || 0), 0);
    const totalDebits = rows.reduce((acc, r) => acc + Number(r.debitAmount || 0), 0);
    const totalNet = totalCredits - totalDebits;
    return (
      <div className="txh-table-wrap">
        <div className="txh-total-bar">
          Net: <span className={totalNet < 0 ? 'negative' : 'txh-total-green'}>${formatMoney(Math.abs(totalNet))}</span>
        </div>
        <div className="txh-scroll">
          <table className="txh-pro-table txh-pro-table-summary">
            <thead>
              <tr>
                <th>Player</th>
                <th>Agent</th>
                <th>Tx Count</th>
                <th>Credits</th>
                <th>Debits</th>
                <th>Net</th>
                <th>Wagered</th>
                <th>Payout</th>
                <th>Balance</th>
                <th>Last Transaction</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={10} className="txh-empty-cell">No player summary data found.</td></tr>
              ) : rows.map((row, idx) => {
                const net = Number(row.netAmount || 0);
                return (
                  <tr key={`${String(row.playerId || row.playerUsername || 'summary')}-${idx}`} className={idx % 2 === 0 ? 'txh-row-even' : 'txh-row-odd'}>
                    <td className="txh-col-user">{String(row.playerUsername || '—').toUpperCase()}</td>
                    <td className="txh-col-user">{String(row.agentUsername || '—').toUpperCase()}</td>
                    <td>{Number(row.transactionCount || 0)}</td>
                    <td className="txh-credit">+${formatMoney(row.creditAmount)}</td>
                    <td className="txh-debit">-${formatMoney(row.debitAmount)}</td>
                    <td className={net < 0 ? 'txh-debit' : 'txh-credit'}>{net >= 0 ? '+' : '-'}${formatMoney(Math.abs(net))}</td>
                    <td>${formatMoney(row.wagerAmount)}</td>
                    <td>${formatMoney(row.payoutAmount)}</td>
                    <td>${formatMoney(row.currentBalance)}</td>
                    <td className="txh-col-date">{formatDateTime(row.lastTransactionAt)}</td>
                  </tr>
                );
              })}
              {rows.length > 0 && (
                <tr className="txh-total-row">
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className="txh-credit"><strong>+${formatMoney(totalCredits)}</strong></td>
                  <td className="txh-debit"><strong>-${formatMoney(totalDebits)}</strong></td>
                  <td className={totalNet < 0 ? 'txh-debit' : 'txh-credit'}><strong>{totalNet >= 0 ? '+' : '-'}${formatMoney(Math.abs(totalNet))}</strong></td>
                  <td colSpan={4} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-view txh-view">
      <div className="view-header">
        <h2>Transaction History</h2>
      </div>

      <div className="view-content txh-content">
        <form className="txh-filter-panel" onSubmit={handleSearch}>
          <div className={`txh-search-row${agentSuggestOpen ? ' txh-search-row-open' : ''}`}>
            <div className="txh-search-label">Agents</div>
            <div className="txh-search-input-wrap">
              <input
                type="text"
                value={agentsSearch}
                onChange={(e) => {
                  setAgentsSearch(e.target.value);
                  setAgentSuggestOpen(true);
                }}
                onFocus={() => setAgentSuggestOpen(true)}
                onBlur={() => setTimeout(() => setAgentSuggestOpen(false), 120)}
                placeholder="Search accounts..."
                className="txh-search-input"
                autoComplete="off"
              />
              {agentSuggestOpen && (
                <div className="txh-suggest-list" role="listbox" aria-label="Agent suggestions">
                  {agentSuggestions.length === 0 ? (
                    <div className="txh-suggest-empty">No matching agents</div>
                  ) : agentSuggestions.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      className="txh-suggest-item"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setAgentsSearch(String(agent.username || ''));
                        setAgentSuggestOpen(false);
                      }}
                    >
                      <span className="txh-suggest-main">{String(agent.username || '').toUpperCase()}</span>
                      <span className={`txh-agent-badge role-${String(agent.role || 'agent').replace(/_/g, '-')}`}>
                        {getAgentBadgeLabel(agent.role)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`txh-search-row${playerSuggestOpen ? ' txh-search-row-open' : ''}`}>
            <div className="txh-search-label">Players</div>
            <div className="txh-search-input-wrap">
              <input
                type="text"
                value={playersSearch}
                onChange={(e) => {
                  setPlayersSearch(e.target.value);
                  setPlayerSuggestOpen(true);
                }}
                onFocus={() => setPlayerSuggestOpen(true)}
                onBlur={() => setTimeout(() => setPlayerSuggestOpen(false), 120)}
                placeholder="Search accounts..."
                className="txh-search-input"
                autoComplete="off"
              />
              {playerSuggestOpen && (
                <div className="txh-suggest-list" role="listbox" aria-label="Player suggestions">
                  {playerSuggestLoading ? (
                    <div className="txh-suggest-empty">Loading players...</div>
                  ) : displayedPlayerSuggestions.length === 0 ? (
                    <div className="txh-suggest-empty">
                      {playersSearch.trim() === '' ? 'Type to search players' : 'No matching players'}
                    </div>
                  ) : displayedPlayerSuggestions.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      className="txh-suggest-item txh-suggest-item-player"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setPlayersSearch(String(player.username || ''));
                        setPlayerSuggestOpen(false);
                      }}
                    >
                      <span className="txh-suggest-main">{String(player.username || '').toUpperCase()}</span>
                      <span className="txh-suggest-meta">{player.fullName || 'Player account'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="txh-select-row">
            <div className="txh-type-filter-wrap">
              <button
                type="button"
                className={`txh-type-select txh-type-trigger${typeFilterOpen ? ' open' : ''}`}
                onClick={() => setTypeFilterOpen((prev) => !prev)}
                aria-expanded={typeFilterOpen}
                aria-haspopup="menu"
                aria-label="Transactions type"
              >
                <span>
                  {selectedTypeValues.includes('all-types')
                    ? 'All Types'
                    : `${selectedTypeValues.length} Type${selectedTypeValues.length !== 1 ? 's' : ''}`}
                </span>
                <i className={`fa-solid fa-chevron-${typeFilterOpen ? 'up' : 'down'}`} aria-hidden="true"></i>
              </button>
              {typeFilterOpen && (
                <>
                  <button
                    type="button"
                    className="txh-type-backdrop"
                    onClick={() => setTypeFilterOpen(false)}
                    aria-label="Close transaction type filters"
                  />
                  <div className="txh-type-menu" role="menu" aria-label="Transaction type filters">
                    {toggleableTypeOptions.length === 0 ? (
                      <div className="txh-type-empty">No transaction types available.</div>
                    ) : toggleableTypeOptions.map((option) => {
                      const checked = selectedTypeValues.includes('all-types') || selectedTypeValues.includes(option.value);
                      return (
                        <label key={option.value} className="txh-type-toggle-row">
                          <span>{option.label}</span>
                          <span className="txh-switch">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleTransactionType(option.value)}
                            />
                            <span className="txh-switch-slider"></span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <select
              value={mode}
              onChange={(e) => {
                const newMode = e.target.value;
                setMode(newMode);
                setTypeFilterOpen(false);
                loadHistory({ mode: newMode });
              }}
              className="txh-mode-select"
              aria-label="Report mode"
            >
              {MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="txh-date-row">
            <div className="txh-date-icon"><i className="fa-regular fa-calendar"></i></div>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="txh-date-input" aria-label="Start date" />
          </div>

          <div className="txh-date-row">
            <div className="txh-date-icon"><i className="fa-regular fa-calendar"></i></div>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="txh-date-input" aria-label="End date" />
          </div>

          <button type="submit" className="txh-search-btn" aria-label="Search">
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </form>

        <div className="txh-result-head">
          <h3>{modeLabel}</h3>
          <div className="txh-summary-inline">
            <span>{Number(summary.count || 0)} Rows</span>
            <span className={Number(summary.netAmount || 0) < 0 ? 'negative' : 'positive'}>Net: {formatMoney(summary.netAmount)}</span>
            <span>Gross: {formatMoney(summary.grossAmount)}</span>
          </div>
        </div>

        {loading && <div className="txh-empty">Loading transaction history...</div>}
        {!loading && error && <div className="txh-empty txh-error">{error}</div>}

        {!loading && !error && searched && (
          resultType === 'analysis'
            ? renderFreePlayAnalysisTable()
            : resultType === 'summary'
              ? renderPlayerSummaryTable()
              : renderTransactionsTable()
        )}
      </div>

      <style>{`
        .txh-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .txh-filter-panel {
          background: #f7f7f8;
          border: 1px solid #d9d9dc;
          border-radius: 6px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 760px;
          position: relative;
          isolation: isolate;
        }
        .txh-search-row,
        .txh-date-row {
          display: grid;
          grid-template-columns: 110px 1fr;
          align-items: stretch;
          border: 1px solid #d2d6db;
          border-radius: 4px;
          background: #fff;
          min-height: 48px;
        }
        .txh-search-row {
          position: relative;
          overflow: visible;
          z-index: 10;
        }
        .txh-search-row-open {
          z-index: 140;
        }
        .txh-date-row {
          grid-template-columns: 68px 1fr;
          overflow: hidden;
        }
        .txh-search-label,
        .txh-date-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid #d2d6db;
          font-size: 16px;
          color: #404246;
          background: #f2f3f5;
          font-weight: 500;
        }
        .txh-search-input,
        .txh-date-input {
          border: none;
          padding: 0 16px;
          font-size: 16px;
          outline: none;
          background: #fff;
          color: #1f2937;
          min-height: 48px;
        }
        .txh-search-input-wrap {
          position: relative;
          display: flex;
          min-height: 48px;
          align-items: center;
        }
        .txh-search-input {
          width: 100%;
        }
        .txh-suggest-list {
          position: absolute;
          top: calc(100% + 2px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #d2d6db;
          border-radius: 8px;
          box-shadow: 0 14px 26px rgba(15, 23, 42, 0.16);
          max-height: 260px;
          overflow-y: auto;
          z-index: 160;
        }
        .txh-suggest-item {
          width: 100%;
          border: 0;
          border-bottom: 1px solid #edf1f5;
          background: #fff;
          padding: 10px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          text-align: left;
        }
        .txh-suggest-item:last-child {
          border-bottom: 0;
        }
        .txh-suggest-item:hover {
          background: #f7fafc;
        }
        .txh-suggest-item-player {
          display: grid;
          justify-content: initial;
          gap: 2px;
        }
        .txh-suggest-main {
          color: #0f172a;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.02em;
        }
        .txh-suggest-meta {
          color: #475569;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .txh-suggest-empty {
          padding: 11px 12px;
          color: #64748b;
          font-size: 13px;
        }
        .txh-agent-badge {
          border-radius: 999px;
          background: #e2e8f0;
          color: #0f172a;
          padding: 4px 8px;
          font-size: 10px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .txh-agent-badge.role-admin {
          background: #dbeafe;
          color: #1e3a8a;
        }
        .txh-agent-badge.role-master-agent {
          background: #dcfce7;
          color: #166534;
        }
        .txh-agent-badge.role-super-agent {
          background: #ede9fe;
          color: #5b21b6;
        }
        .txh-agent-badge.role-agent {
          background: #ffe4e6;
          color: #9f1239;
        }
        .txh-search-input::placeholder {
          color: #a0a7b0;
        }
        .txh-select-row {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 10px;
          align-items: center;
        }
        .txh-type-select,
        .txh-mode-select {
          border: 1px solid #ccd2d9;
          min-height: 52px;
          border-radius: 12px;
          font-size: 19px;
          padding: 0 14px;
          outline: none;
          background-color: #fff;
          color: #222831;
        }
        .txh-type-select {
          background: linear-gradient(180deg, #3ec1f1 0%, #2baddf 100%);
          color: #fff;
          border-color: #24a1d3;
          border-radius: 6px;
          font-size: 18px;
        }
        .txh-type-filter-wrap {
          position: relative;
        }
        .txh-type-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          text-align: left;
        }
        .txh-type-trigger span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .txh-type-trigger i {
          font-size: 14px;
          line-height: 1;
        }
        .txh-type-trigger.open {
          filter: brightness(0.95);
        }
        .txh-type-backdrop {
          position: fixed;
          inset: 0;
          border: 0;
          background: transparent;
          z-index: 180;
        }
        .txh-type-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: min(460px, calc(100vw - 56px));
          border: 1px solid #d2d6db;
          border-radius: 6px;
          background: #fff;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.2);
          padding: 8px 12px 10px;
          z-index: 190;
          max-height: min(520px, calc(100dvh - 120px));
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .txh-type-empty {
          padding: 8px 0;
          color: #64748b;
          font-size: 14px;
        }
        .txh-type-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #eef1f5;
          font-size: 15px;
          line-height: 1.2;
          color: #111827;
        }
        .txh-type-toggle-row:last-child {
          border-bottom: 0;
        }
        .txh-switch {
          position: relative;
          width: 48px;
          height: 26px;
          display: inline-block;
          flex-shrink: 0;
        }
        .txh-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .txh-switch-slider {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: #b6bcc7;
          transition: 0.2s ease;
        }
        .txh-switch-slider:before {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          left: 3px;
          top: 3px;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.35);
          transition: 0.2s ease;
        }
        .txh-switch input:checked + .txh-switch-slider {
          background: #22c55e;
        }
        .txh-switch input:checked + .txh-switch-slider:before {
          transform: translateX(22px);
        }
        .txh-search-btn {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          border: none;
          background: #f4c233;
          color: #fff;
          font-size: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin-top: 2px;
        }
        .txh-search-btn:hover {
          filter: brightness(1.04);
        }
        .txh-result-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .txh-result-head h3 {
          margin: 0;
          font-size: 20px;
          color: #163047;
        }
        .txh-summary-inline {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 13px;
          color: #475569;
          font-weight: 600;
        }
        /* ── Table wrapper ── */
        .txh-table-wrap {
          display: flex;
          flex-direction: column;
          gap: 0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.10);
        }
        .txh-total-bar {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-bottom: none;
          padding: 10px 18px;
          font-size: 15px;
          font-weight: 600;
          color: #374151;
          text-align: right;
        }
        .txh-total-green { color: #16a34a; }
        .txh-scroll {
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          max-height: min(70vh, 720px);
          background: #fff;
        }
        /* ── Professional table ── */
        .txh-pro-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .txh-pro-table-transactions {
          min-width: 980px;
        }
        .txh-pro-table-analysis {
          min-width: 980px;
        }
        .txh-pro-table-summary {
          min-width: 1160px;
        }
        .txh-pro-table thead tr {
          background: #1a2535;
        }
        .txh-pro-table thead th {
          color: #fff;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 13px 14px;
          text-align: left;
          white-space: nowrap;
          border: none;
          border-right: 1px solid #314157;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .txh-pro-table thead th:last-child {
          border-right: none;
        }
        .txh-pro-table tbody tr {
          border-bottom: 1px solid #edf2f7;
          transition: background 0.12s;
        }
        .txh-pro-table tbody tr:hover {
          background: #f0f7ff !important;
        }
        .txh-row-even { background: #ffffff; }
        .txh-row-odd  { background: #f8fafc; }
        .txh-pro-table td {
          padding: 11px 14px;
          color: #1e293b;
          vertical-align: middle;
          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #edf2f7;
        }
        .txh-pro-table td:last-child {
          border-right: none;
        }
        .txh-col-date {
          white-space: nowrap;
          font-size: 12px;
          color: #475569;
          min-width: 170px;
        }
        .txh-col-user {
          font-weight: 700;
          letter-spacing: 0.02em;
          font-size: 12px;
          min-width: 100px;
        }
        .txh-col-type {
          font-weight: 600;
          min-width: 150px;
        }
        .txh-col-desc {
          color: #64748b;
          font-size: 12px;
          min-width: 220px;
          max-width: 320px;
          line-height: 1.35;
          word-break: break-word;
        }
        .txh-col-amount {
          font-weight: 700;
          font-size: 14px;
          white-space: nowrap;
          text-align: right;
          min-width: 130px;
        }
        .txh-credit { color: #16a34a; }
        .txh-debit  { color: #dc2626; }
        .txh-pro-table td.txh-credit,
        .txh-pro-table td.txh-credit strong {
          color: #16a34a;
        }
        .txh-pro-table td.txh-debit,
        .txh-pro-table td.txh-debit strong {
          color: #dc2626;
        }
        /* ── Total row ── */
        .txh-total-row {
          background: #1a2535 !important;
          border-top: 2px solid #334155;
        }
        .txh-total-row td {
          color: #fff;
          font-size: 13px;
          padding: 12px 14px;
          border-right-color: #314157;
          border-bottom: none;
        }
        .txh-total-row td.txh-credit,
        .txh-total-row td.txh-credit strong { color: #4ade80; }
        .txh-total-row td.txh-debit,
        .txh-total-row td.txh-debit strong { color: #f87171; }
        /* ── Empty / error ── */
        .txh-empty-cell {
          padding: 32px 18px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
        }
        .txh-empty {
          padding: 18px;
          border: 1px dashed #cdd5de;
          border-radius: 8px;
          color: #546172;
          background: #fff;
          text-align: center;
        }
        .txh-error {
          border-color: #fecaca;
          color: #b91c1c;
          background: #fff7f7;
        }
        @media (max-width: 768px) {
          .txh-filter-panel {
            padding: 10px;
            max-width: 100%;
          }
          .txh-search-row {
            grid-template-columns: 96px 1fr;
            min-height: 46px;
          }
          .txh-date-row {
            grid-template-columns: 58px 1fr;
            min-height: 46px;
          }
          .txh-search-input,
          .txh-date-input {
            min-height: 46px;
            font-size: 15px;
            padding: 0 12px;
          }
          .txh-search-label,
          .txh-date-icon {
            font-size: 14px;
          }
          .txh-select-row {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .txh-type-select,
          .txh-mode-select {
            min-height: 46px;
            font-size: 14px;
            padding: 0 10px;
          }
          .txh-type-menu {
            width: min(332px, calc(100vw - 24px));
            max-height: min(56dvh, 360px);
            padding: 6px 10px 10px;
          }
          .txh-type-toggle-row {
            gap: 8px;
            padding: 6px 0;
            font-size: 13px;
            line-height: 1.15;
          }
          .txh-switch {
            width: 42px;
            height: 22px;
          }
          .txh-switch-slider:before {
            width: 16px;
            height: 16px;
          }
          .txh-switch input:checked + .txh-switch-slider:before {
            transform: translateX(20px);
          }
          .txh-search-btn {
            width: 64px;
            height: 64px;
            font-size: 24px;
          }
          .txh-result-head h3 {
            font-size: 18px;
          }
          .txh-summary-inline {
            font-size: 12px;
            gap: 8px;
          }
          .txh-total-bar {
            padding: 10px 12px;
            font-size: 14px;
          }
          .txh-scroll {
            max-height: min(58vh, 560px);
          }
          .txh-pro-table {
            font-size: 12px;
          }
          .txh-pro-table-transactions {
            min-width: 860px;
          }
          .txh-pro-table-analysis {
            min-width: 900px;
          }
          .txh-pro-table-summary {
            min-width: 1040px;
          }
          .txh-pro-table thead th {
            padding: 11px 10px;
            font-size: 11px;
          }
          .txh-pro-table td {
            padding: 10px;
            font-size: 12px;
          }
          .txh-col-date {
            min-width: 150px;
          }
          .txh-col-user {
            min-width: 92px;
          }
          .txh-col-type {
            min-width: 140px;
          }
          .txh-col-desc {
            min-width: 190px;
            max-width: 240px;
          }
          .txh-col-amount {
            min-width: 120px;
          }
        }
      `}</style>
    </div>
  );
}

export default TransactionsHistoryView;
