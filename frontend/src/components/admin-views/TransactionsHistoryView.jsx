import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getAgentTree, getTransactionsHistory, getUsersAdmin } from '../../api';
import { formatTransactionType } from '../../utils/transactionPresentation';

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

const toIsoDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMoney = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));
  const [agentsSearch, setAgentsSearch] = useState('');
  const [playersSearch, setPlayersSearch] = useState('');
  const [transactionType, setTransactionType] = useState('all-types');
  const [mode, setMode] = useState('player-transactions');
  const [startDate, setStartDate] = useState(today);
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

  const getAgentBadgeLabel = (role) => {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'master_agent') return 'MASTER';
    if (normalized === 'super_agent') return 'SUPER';
    if (normalized === 'admin') return 'ADMIN';
    return 'AGENT';
  };

  const loadHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to view transaction history.');
      setLoading(false);
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      setError('Start date cannot be after end date.');
      return;
    }

    try {
      setLoading(true);
      const data = await getTransactionsHistory({
        mode,
        agents: agentsSearch,
        players: playersSearch,
        transactionType,
        startDate,
        endDate,
        limit: isMobile ? 300 : 700,
      }, token);

      const list = Array.isArray(data?.rows)
        ? data.rows
        : (Array.isArray(data?.transactions) ? data.transactions : []);

      setRows(list);
      setSummary(data?.summary || { count: 0, grossAmount: 0, netAmount: 0, creditAmount: 0, debitAmount: 0 });
      setResultType(String(data?.resultType || 'transactions'));
      const apiTypeOptions = Array.isArray(data?.meta?.transactionTypes) ? data.meta.transactionTypes : [];
      setTypeOptions(apiTypeOptions.length > 0 ? apiTypeOptions : DEFAULT_TYPE_OPTIONS);
      setError('');
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
    loadHistory();
  };

  const modeLabel = MODE_OPTIONS.find((option) => option.value === mode)?.label || 'Transaction History';

  const renderTransactionsTable = () => (
    <div className="table-container txh-table-wrap">
      <table className="data-table txh-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Player</th>
            <th>Agent</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="txh-empty">No transactions matched these filters.</td>
            </tr>
          ) : rows.map((row, idx) => {
            const signed = Number(row?.signedAmount || 0);
            return (
              <tr key={`${String(row.id || row.transactionId || 'tx')}-${idx}`}>
                <td>{formatDateTime(row.date)}</td>
                <td>{String(row.playerUsername || 'Unknown').toUpperCase()}</td>
                <td>{String(row.agentUsername || 'UNASSIGNED').toUpperCase()}</td>
                <td>{formatTransactionType(row)}</td>
                <td className={signed < 0 ? 'negative' : 'positive'}>{signed < 0 ? '-' : ''}{formatMoney(Math.abs(signed || Number(row.amount || 0)))}</td>
                <td>{row.status || '—'}</td>
                <td>{row.description || row.reason || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderFreePlayAnalysisTable = () => (
    <div className="table-container txh-table-wrap">
      <table className="data-table txh-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Agent</th>
            <th>Tx Count</th>
            <th>Credits</th>
            <th>Debits</th>
            <th>Net</th>
            <th>Current Free Play</th>
            <th>Last Tx</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="txh-empty">No free play analysis data found.</td>
            </tr>
          ) : rows.map((row, idx) => (
            <tr key={`${String(row.playerId || row.playerUsername || 'fp')}-${idx}`}>
              <td>{String(row.playerUsername || 'Unknown').toUpperCase()}</td>
              <td>{String(row.agentUsername || 'UNASSIGNED').toUpperCase()}</td>
              <td>{Number(row.transactionCount || 0)}</td>
              <td className="positive">{formatMoney(row.creditAmount)}</td>
              <td className="negative">{formatMoney(row.debitAmount)}</td>
              <td className={Number(row.netAmount || 0) < 0 ? 'negative' : 'positive'}>{formatMoney(row.netAmount)}</td>
              <td>{formatMoney(row.currentFreeplayBalance)}</td>
              <td>{formatDateTime(row.lastTransactionAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPlayerSummaryTable = () => (
    <div className="table-container txh-table-wrap">
      <table className="data-table txh-table">
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
            <th>Current Balance</th>
            <th>Last Tx</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="txh-empty">No player summary data found.</td>
            </tr>
          ) : rows.map((row, idx) => (
            <tr key={`${String(row.playerId || row.playerUsername || 'summary')}-${idx}`}>
              <td>{String(row.playerUsername || 'Unknown').toUpperCase()}</td>
              <td>{String(row.agentUsername || 'UNASSIGNED').toUpperCase()}</td>
              <td>{Number(row.transactionCount || 0)}</td>
              <td className="positive">{formatMoney(row.creditAmount)}</td>
              <td className="negative">{formatMoney(row.debitAmount)}</td>
              <td className={Number(row.netAmount || 0) < 0 ? 'negative' : 'positive'}>{formatMoney(row.netAmount)}</td>
              <td>{formatMoney(row.wagerAmount)}</td>
              <td>{formatMoney(row.payoutAmount)}</td>
              <td>{formatMoney(row.currentBalance)}</td>
              <td>{formatDateTime(row.lastTransactionAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMobileRows = () => {
    if (rows.length === 0) {
      return <div className="txh-empty">No data matched these filters.</div>;
    }

    return (
      <div className="txh-mobile-list">
        {rows.map((row, index) => {
          const key = String(row.id || row.playerId || index);
          const isSummary = resultType === 'summary';
          const isAnalysis = resultType === 'analysis';
          const signed = Number(row.signedAmount || 0);

          if (isSummary || isAnalysis) {
            const net = Number(row.netAmount || 0);
            return (
              <article key={key} className="txh-mobile-card">
                <header>
                  <strong>{String(row.playerUsername || 'Unknown').toUpperCase()}</strong>
                  <span>{String(row.agentUsername || 'UNASSIGNED').toUpperCase()}</span>
                </header>
                <div className="txh-mobile-grid">
                  <div><label>Count</label><span>{Number(row.transactionCount || 0)}</span></div>
                  <div><label>Credit</label><span className="positive">{formatMoney(row.creditAmount)}</span></div>
                  <div><label>Debit</label><span className="negative">{formatMoney(row.debitAmount)}</span></div>
                  <div><label>Net</label><span className={net < 0 ? 'negative' : 'positive'}>{formatMoney(net)}</span></div>
                  {isSummary ? (
                    <>
                      <div><label>Wagered</label><span>{formatMoney(row.wagerAmount)}</span></div>
                      <div><label>Payout</label><span>{formatMoney(row.payoutAmount)}</span></div>
                      <div><label>Balance</label><span>{formatMoney(row.currentBalance)}</span></div>
                    </>
                  ) : (
                    <div><label>Free Play</label><span>{formatMoney(row.currentFreeplayBalance)}</span></div>
                  )}
                </div>
                <footer>{formatDateTime(row.lastTransactionAt)}</footer>
              </article>
            );
          }

          return (
            <article key={key} className="txh-mobile-card">
              <header>
                <strong>{String(row.playerUsername || 'Unknown').toUpperCase()}</strong>
                <span>{formatTransactionType(row)}</span>
              </header>
              <div className="txh-mobile-grid">
                <div><label>Agent</label><span>{String(row.agentUsername || 'UNASSIGNED').toUpperCase()}</span></div>
                <div><label>Status</label><span>{row.status || '—'}</span></div>
                <div><label>Amount</label><span className={signed < 0 ? 'negative' : 'positive'}>{signed < 0 ? '-' : ''}{formatMoney(Math.abs(signed || Number(row.amount || 0)))}</span></div>
                <div><label>Date</label><span>{formatDateTime(row.date)}</span></div>
              </div>
              <footer>{row.description || row.reason || '—'}</footer>
            </article>
          );
        })}
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
            <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className="txh-type-select" aria-label="Transactions type">
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select value={mode} onChange={(e) => setMode(e.target.value)} className="txh-mode-select" aria-label="Report mode">
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
          isMobile
            ? renderMobileRows()
            : (resultType === 'analysis'
              ? renderFreePlayAnalysisTable()
              : resultType === 'summary'
                ? renderPlayerSummaryTable()
                : renderTransactionsTable())
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
        .txh-table-wrap {
          overflow-x: auto;
        }
        .txh-table {
          min-width: 860px;
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
        .txh-mobile-list {
          display: grid;
          gap: 10px;
        }
        .txh-mobile-card {
          border: 1px solid #d8dee6;
          border-radius: 10px;
          background: #fff;
          padding: 12px;
          display: grid;
          gap: 8px;
        }
        .txh-mobile-card header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 13px;
        }
        .txh-mobile-card header strong {
          color: #0f2b42;
          font-size: 14px;
        }
        .txh-mobile-card header span {
          color: #4f5f70;
          font-size: 12px;
          text-align: right;
        }
        .txh-mobile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .txh-mobile-grid div {
          background: #f7f9fc;
          border: 1px solid #e5ebf1;
          border-radius: 8px;
          padding: 8px;
          display: grid;
          gap: 3px;
        }
        .txh-mobile-grid label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 700;
        }
        .txh-mobile-grid span {
          font-size: 12px;
          color: #111827;
          font-weight: 600;
        }
        .txh-mobile-card footer {
          font-size: 11px;
          color: #4b5563;
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
        }
      `}</style>
    </div>
  );
}

export default TransactionsHistoryView;
