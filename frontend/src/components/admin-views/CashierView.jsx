import React, { useEffect, useMemo, useState } from 'react';
import {
  getAgents,
  getCashierSummary,
  getMyPlayers,
  getTransactionsHistory,
  getUsersAdmin,
  updateUserCredit,
  updateUserFreeplay,
  getMe
} from '../../api';

const TX_OPTIONS = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdraw' },
  { value: 'credit_adj', label: 'Credit Adj' },
  { value: 'debit_adj', label: 'Debit Adj' },
  { value: 'fp_deposit', label: 'FP Deposit' }
];

const ENTRY_COUNT = 10;

const toDateInput = (value = new Date()) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const defaultDescriptionByType = {
  deposit: 'Customer Deposit',
  withdrawal: 'Customer Withdrawal',
  credit_adj: 'Customer Credit Adjustment',
  debit_adj: 'Customer Debit Adjustment',
  fp_deposit: 'Customer Freeplay Deposit'
};

const createEntry = (id, agentId = '') => ({
  id,
  agentId,
  searchQuery: '',
  selectedUserId: '',
  type: 'deposit',
  amount: '',
  figureDate: toDateInput(),
  description: defaultDescriptionByType.deposit,
  searchOpen: false,
  busy: false,
  error: ''
});

function CashierView() {
  const [role, setRole] = useState('admin');
  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [mode, setMode] = useState('manual');
  const [agentQuery, setAgentQuery] = useState('');
  const [expandedAgents, setExpandedAgents] = useState({});
  const [manualEntries, setManualEntries] = useState(() => Array.from({ length: ENTRY_COUNT }, (_, i) => createEntry(`manual-${i + 1}`)));
  const [agentEntries, setAgentEntries] = useState({});
  const [summary, setSummary] = useState({ totalDeposits: 0, totalWithdrawals: 0, pendingCount: 0 });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [localRecent, setLocalRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const usersById = useMemo(() => {
    const map = new Map();
    for (const user of users) {
      const id = String(user.id || user._id || '');
      if (id) map.set(id, user);
    }
    return map;
  }, [users]);

  const filteredAgents = useMemo(() => {
    const q = agentQuery.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((agent) => {
      const username = String(agent.username || '').toLowerCase();
      const phone = String(agent.phoneNumber || '').toLowerCase();
      return username.includes(q) || phone.includes(q);
    });
  }, [agents, agentQuery]);

  const loadSummary = async (token, currentRole) => {
    if (currentRole !== 'admin') return;
    try {
      const summaryData = await getCashierSummary(token);
      setSummary({
        totalDeposits: Number(summaryData?.totalDeposits || 0),
        totalWithdrawals: Number(summaryData?.totalWithdrawals || 0),
        pendingCount: Number(summaryData?.pendingCount || 0)
      });
    } catch {
      // Keep cashier usable even if summary endpoint fails.
    }
  };

  const loadRecentTransactions = async (token, currentRole) => {
    if (currentRole !== 'admin') {
      setRecentTransactions(localRecent);
      return;
    }
    try {
      const data = await getTransactionsHistory({
        user: '',
        type: 'all',
        status: 'all',
        time: '30d',
        limit: 30
      }, token);
      setRecentTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
    } catch {
      setRecentTransactions(localRecent);
    }
  };

  const loadCashierData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to view cashier data.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const me = await getMe(token);
      const currentRole = String(me?.role || 'admin');
      setRole(currentRole);

      let userList = [];
      if (currentRole === 'admin') {
        userList = await getUsersAdmin(token);
      } else {
        userList = await getMyPlayers(token);
      }
      setUsers(Array.isArray(userList) ? userList : []);

      if (currentRole === 'admin' || currentRole === 'master_agent' || currentRole === 'super_agent') {
        try {
          const agentList = await getAgents(token);
          const normalizedAgents = Array.isArray(agentList) ? agentList : [];
          setAgents(normalizedAgents);
          setExpandedAgents((prev) => {
            const next = { ...prev };
            for (const agent of normalizedAgents) {
              const id = String(agent.id || agent._id || '');
              if (id && typeof next[id] !== 'boolean') next[id] = false;
            }
            return next;
          });
          setAgentEntries((prev) => {
            const next = { ...prev };
            for (const agent of normalizedAgents) {
              const id = String(agent.id || agent._id || '');
              if (id && !next[id]) next[id] = createEntry(id, id);
            }
            return next;
          });
        } catch {
          setAgents([]);
        }
      } else {
        setAgents([]);
      }

      await Promise.all([
        loadSummary(token, currentRole),
        loadRecentTransactions(token, currentRole)
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load cashier data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashierData();
  }, []);

  useEffect(() => {
    if (role !== 'admin') {
      setRecentTransactions(localRecent);
    }
  }, [localRecent, role]);

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '—';
    const num = Number(amount);
    if (Number.isNaN(num)) return '—';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getEntryUserOptions = (entry) => {
    const query = String(entry.searchQuery || '').trim().toLowerCase();
    const scopedUsers = users.filter((user) => {
      if (!entry.agentId) return true;
      const userAgentId = String(user?.agentId?._id || user?.agentId || '');
      return userAgentId === String(entry.agentId);
    });

    const filtered = scopedUsers.filter((user) => {
      if (!query) return true;
      const username = String(user.username || '').toLowerCase();
      const fullName = String(user.fullName || `${user.firstName || ''} ${user.lastName || ''}`).toLowerCase();
      const phone = String(user.phoneNumber || '').toLowerCase();
      return username.includes(query) || fullName.includes(query) || phone.includes(query);
    });

    return filtered.slice(0, 12);
  };

  const resolveTransactionDisplayType = (txn) => {
    const reason = String(txn?.reason || '').toUpperCase();
    const type = String(txn?.type || '').toLowerCase();

    if (reason === 'FREEPLAY_ADJUSTMENT') return 'FP Deposit';
    if (reason === 'CASHIER_DEPOSIT' || type === 'deposit') return 'Deposit';
    if (reason === 'CASHIER_WITHDRAWAL' || type === 'withdrawal') return 'Withdraw';
    if (reason === 'CASHIER_CREDIT_ADJUSTMENT') return 'Credit Adj';
    if (reason === 'CASHIER_DEBIT_ADJUSTMENT') return 'Debit Adj';
    return 'Adjustment';
  };

  const isCreditDirection = (type) => type === 'deposit' || type === 'credit_adj';

  const updateEntryById = (id, updater, isAgentMode = false) => {
    if (isAgentMode) {
      setAgentEntries((prev) => {
        const existing = prev[id];
        if (!existing) return prev;
        return { ...prev, [id]: updater(existing) };
      });
      return;
    }

    setManualEntries((prev) => prev.map((entry) => (entry.id === id ? updater(entry) : entry)));
  };

  const applyEntry = async (entry, isAgentMode = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to continue.');
      return;
    }

    const amount = Number(entry.amount || 0);
    const selectedUserId = String(entry.selectedUserId || '');
    const user = usersById.get(selectedUserId);

    if (!user) {
      updateEntryById(entry.id, (e) => ({ ...e, error: 'Select a customer first.' }), isAgentMode);
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      updateEntryById(entry.id, (e) => ({ ...e, error: 'Enter a valid amount.' }), isAgentMode);
      return;
    }

    const currentBalance = Number(user.balance || 0);
    const currentFreeplay = Number(user.freeplayBalance || 0);
    const description = (entry.description || '').trim() || defaultDescriptionByType[entry.type];
    const effectiveDescription = entry.figureDate ? `${description} (Figure Date: ${entry.figureDate})` : description;

    updateEntryById(entry.id, (e) => ({ ...e, busy: true, error: '' }), isAgentMode);
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let nextBalance = currentBalance;
      let nextFreeplay = currentFreeplay;
      let reason = 'CASHIER_CREDIT_ADJUSTMENT';
      let txType = 'adjustment';

      if (entry.type === 'fp_deposit') {
        nextFreeplay = currentFreeplay + amount;
        await updateUserFreeplay(selectedUserId, nextFreeplay, token, effectiveDescription);
      } else {
        const isCredit = isCreditDirection(entry.type);
        nextBalance = isCredit ? currentBalance + amount : Math.max(0, currentBalance - amount);

        if (entry.type === 'deposit') {
          reason = 'CASHIER_DEPOSIT';
          txType = 'deposit';
        } else if (entry.type === 'withdrawal') {
          reason = 'CASHIER_WITHDRAWAL';
          txType = 'withdrawal';
        } else if (entry.type === 'credit_adj') {
          reason = 'CASHIER_CREDIT_ADJUSTMENT';
          txType = 'adjustment';
        } else {
          reason = 'CASHIER_DEBIT_ADJUSTMENT';
          txType = 'adjustment';
        }

        await updateUserCredit(selectedUserId, {
          balance: nextBalance,
          type: txType,
          reason,
          description: effectiveDescription
        }, token);
      }

      setUsers((prev) => prev.map((item) => {
        const id = String(item.id || item._id || '');
        if (id !== selectedUserId) return item;
        return {
          ...item,
          balance: nextBalance,
          freeplayBalance: nextFreeplay
        };
      }));

      const localRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: entry.type === 'deposit' ? 'deposit' : entry.type === 'withdrawal' ? 'withdrawal' : 'adjustment',
        user: user.username,
        userId: selectedUserId,
        amount,
        date: new Date().toISOString(),
        status: 'completed',
        reason: entry.type === 'fp_deposit' ? 'FREEPLAY_ADJUSTMENT' : reason,
        description: effectiveDescription
      };
      setLocalRecent((prev) => [localRecord, ...prev].slice(0, 30));

      await Promise.all([
        loadSummary(token, role),
        loadRecentTransactions(token, role)
      ]);

      updateEntryById(entry.id, (e) => ({
        ...e,
        amount: '',
        description: defaultDescriptionByType[e.type],
        busy: false,
        error: ''
      }), isAgentMode);

      setSuccess(`Transaction applied for ${user.username}.`);
    } catch (err) {
      updateEntryById(entry.id, (e) => ({ ...e, busy: false, error: err.message || 'Failed to apply transaction.' }), isAgentMode);
    } finally {
      setSaving(false);
    }
  };

  const renderCustomerCell = (entry, onChangeEntry, onSelectUser) => {
    const options = getEntryUserOptions(entry);

    return (
      <div className="cashier-customer-cell">
        <button type="button" className="cashier-find-btn">Find</button>
        <div className="cashier-customer-search">
          <input
            type="text"
            placeholder="Search ..."
            value={entry.searchQuery}
            onFocus={() => onChangeEntry({ ...entry, searchOpen: true })}
            onBlur={() => setTimeout(() => onChangeEntry({ ...entry, searchOpen: false }), 120)}
            onChange={(e) => onChangeEntry({ ...entry, searchQuery: e.target.value, searchOpen: true, selectedUserId: '' })}
          />
          {entry.searchOpen && (
            <div className="cashier-search-dropdown">
              {options.length === 0 ? (
                <div className="cashier-search-empty">No matching users</div>
              ) : (
                options.map((user) => {
                  const userId = String(user.id || user._id || '');
                  return (
                    <button
                      key={userId}
                      type="button"
                      className="cashier-search-item"
                      onMouseDown={() => onSelectUser(user)}
                    >
                      <span>{String(user.username || '').toUpperCase()}</span>
                      <small>{user.fullName || `${user.firstName || ''} ${user.lastName || ''}`}</small>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRow = (entry, isAgentMode = false) => {
    const selectedUser = usersById.get(String(entry.selectedUserId || ''));
    const settle = Number(selectedUser?.balanceOwed || 0);
    const balance = Number(selectedUser?.balance || 0);

    const updateEntry = (nextEntry) => {
      updateEntryById(entry.id, () => nextEntry, isAgentMode);
    };

    return (
      <tr key={entry.id}>
        <td>
          {renderCustomerCell(entry, updateEntry, (user) => {
            const userId = String(user.id || user._id || '');
            updateEntry({
              ...entry,
              selectedUserId: userId,
              searchQuery: user.username || '',
              searchOpen: false,
              error: ''
            });
          })}
        </td>
        <td className="cashier-num">{selectedUser ? formatAmount(settle) : '--'}</td>
        <td className="cashier-num">{selectedUser ? formatAmount(balance) : '--'}</td>
        <td>
          <select
            value={entry.type}
            onChange={(e) => updateEntry({
              ...entry,
              type: e.target.value,
              description: defaultDescriptionByType[e.target.value] || entry.description
            })}
          >
            {TX_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </td>
        <td>
          <div className="cashier-amount-wrap">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={entry.amount}
              onChange={(e) => updateEntry({ ...entry, amount: e.target.value })}
            />
            <button type="button" className="cashier-zero-btn" onClick={() => updateEntry({ ...entry, amount: '0' })}>Zero</button>
          </div>
        </td>
        <td>
          <input
            type="date"
            value={entry.figureDate}
            onChange={(e) => updateEntry({ ...entry, figureDate: e.target.value })}
          />
        </td>
        <td>
          <input
            type="text"
            placeholder="Description"
            value={entry.description}
            onChange={(e) => updateEntry({ ...entry, description: e.target.value })}
          />
        </td>
        <td>
          <button
            type="button"
            className="cashier-continue-btn"
            disabled={entry.busy || saving}
            onClick={() => applyEntry(entry, isAgentMode)}
          >
            {entry.busy ? 'Saving...' : 'Continue'}
          </button>
          {entry.error && <div className="cashier-row-error">{entry.error}</div>}
        </td>
      </tr>
    );
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Cashier</h2>
      </div>

      <div className="view-content cashier-v2">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading cashier data...</div>}
        {!loading && (
          <>
            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}

            <div className="cashier-summary">
              <div className="summary-card">
                <h3>Total Deposits (Today)</h3>
                <p className="amount">{formatAmount(summary.totalDeposits)}</p>
              </div>
              <div className="summary-card">
                <h3>Total Withdrawals (Today)</h3>
                <p className="amount">{formatAmount(summary.totalWithdrawals)}</p>
              </div>
              <div className="summary-card">
                <h3>Pending Transactions</h3>
                <p className="amount">{Number(summary.pendingCount || 0)}</p>
              </div>
            </div>

            <div className="cashier-top-filters">
              <div className="cashier-agent-filter">
                <span>Agents</span>
                <input
                  type="text"
                  placeholder="Search ..."
                  value={agentQuery}
                  onChange={(e) => setAgentQuery(e.target.value)}
                />
              </div>

              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="manual">Manual Mode</option>
                <option value="agent">Agent Mode</option>
              </select>
            </div>

            {mode === 'manual' ? (
              <div className="cashier-grid-wrap">
                <table className="data-table cashier-entry-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Settle</th>
                      <th>Balance</th>
                      <th>Transaction</th>
                      <th>Amount</th>
                      <th>Figure Date</th>
                      <th>Description</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualEntries.map((entry) => renderRow(entry, false))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="cashier-agent-mode">
                {filteredAgents.length === 0 ? (
                  <div className="cashier-empty">No agents found.</div>
                ) : (
                  filteredAgents.map((agent) => {
                    const agentId = String(agent.id || agent._id || '');
                    const entry = agentEntries[agentId] || createEntry(agentId, agentId);
                    const isOpen = !!expandedAgents[agentId];

                    return (
                      <div key={agentId} className="cashier-agent-card">
                        <button
                          type="button"
                          className="cashier-agent-head"
                          onClick={() => setExpandedAgents((prev) => ({ ...prev, [agentId]: !prev[agentId] }))}
                        >
                          <span>{isOpen ? '−' : '+'}</span>
                          <span>{String(agent.username || '').toUpperCase()}</span>
                        </button>

                        {isOpen && (
                          <div className="cashier-agent-body">
                            <table className="data-table cashier-entry-table">
                              <thead>
                                <tr>
                                  <th>Customer</th>
                                  <th>Settle</th>
                                  <th>Balance</th>
                                  <th>Transaction</th>
                                  <th>Amount</th>
                                  <th>Figure Date</th>
                                  <th>Description</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {renderRow(entry, true)}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="table-container">
              <h3>Recent Transactions</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length === 0 ? (
                    <tr><td colSpan={6} className="empty-msg">No recent transactions.</td></tr>
                  ) : (
                    recentTransactions.map((txn) => {
                      const displayType = resolveTransactionDisplayType(txn);
                      const isPositive = displayType === 'Deposit' || displayType === 'Credit Adj' || displayType === 'FP Deposit';
                      return (
                        <tr key={txn.id}>
                          <td>{displayType}</td>
                          <td>{txn.user || 'Unknown'}</td>
                          <td className={isPositive ? 'positive' : 'negative'}>{formatAmount(txn.amount)}</td>
                          <td>{txn.date ? new Date(txn.date).toLocaleString() : '—'}</td>
                          <td><span className={`badge ${txn.status || 'completed'}`}>{txn.status || 'completed'}</span></td>
                          <td>{txn.description || '—'}</td>
                        </tr>
                      );
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

export default CashierView;
