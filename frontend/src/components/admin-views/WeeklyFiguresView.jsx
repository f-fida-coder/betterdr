import React, { useState, useEffect, useMemo } from 'react';
import { getAgentTree, getWeeklyFigures } from '../../api';

const WEEK_OPTIONS = [
  { value: 'this-week', label: 'This Week' },
  { value: 'last-week', label: 'Last Week' },
  ...Array.from({ length: 16 }, (_, index) => {
    const weeksAgo = index + 2;
    return { value: `weeks-ago-${weeksAgo}`, label: `${weeksAgo} Week's ago` };
  }),
];

const FILTER_OPTIONS = [
  {
    value: 'all-players',
    label: 'All Players',
    description: 'Shows every single player in the selected week.',
  },
  {
    value: 'active-week',
    label: 'Active For The Week',
    description: 'Shows players with activity in the selected week.',
  },
  {
    value: 'with-balance',
    label: 'With A Balance',
    description: 'Shows players with a balance above or below $0.01.',
  },
  {
    value: 'big-figures',
    label: 'Big Figures',
    description: 'Shows players up or down at least $1,000 for the week.',
  },
  {
    value: 'summary',
    label: 'Summary',
    description: 'Shows the full profit and loss summary for the selected week.',
  },
];

function WeeklyFiguresView({ onViewChange = null }) {
  const [timePeriod, setTimePeriod] = useState('this-week');
  const [playerFilter, setPlayerFilter] = useState('all-players');
  const [summaryData, setSummaryData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [agentTreeData, setAgentTreeData] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [mobileAgentSearch, setMobileAgentSearch] = useState('');
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const collator = useMemo(
    () => new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }),
    []
  );

  const formatMoney = (value) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return num.toFixed(2);
  };

  useEffect(() => {
    const fetchWeeklyFigures = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view weekly figures.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getWeeklyFigures(timePeriod, token);
        setSummaryData(data.summary);
        setCustomers(data.customers || []);
        setError('');
      } catch (err) {
        console.error('Failed to fetch weekly figures:', err);
        setError(err.message || 'Failed to load weekly figures');
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyFigures();
  }, [timePeriod]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let cancelled = false;
    const fetchAgentTree = async () => {
      try {
        const data = await getAgentTree(token);
        if (!cancelled) {
          setAgentTreeData(data || null);
        }
      } catch (treeErr) {
        console.warn('Failed to fetch agent tree for weekly figures mobile hierarchy:', treeErr);
      }
    };

    fetchAgentTree();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (playerFilter !== 'all-players') {
      setMobileAgentSearch('');
    }
  }, [playerFilter]);

  const filteredCustomers = customers.filter((customer) => {
    const balance = Number(customer.balance || 0);
    const week = Number(customer.week || 0);
    const activeThisWeek = Array.isArray(customer.daily)
      ? customer.daily.some((value) => Math.abs(Number(value || 0)) > 0.01)
      : Math.abs(week) > 0.01;

    if (playerFilter === 'with-balance') {
      return Math.abs(balance) > 0.01;
    }
    if (playerFilter === 'active-week') {
      return activeThisWeek;
    }
    if (playerFilter === 'big-figures') {
      return Math.abs(week) >= 1000;
    }
    if (playerFilter === 'summary') {
      return false;
    }
    return true;
  });

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      const aUsername = String(a?.username || '');
      const bUsername = String(b?.username || '');
      return collator.compare(aUsername, bUsername);
    });
  }, [collator, filteredCustomers]);

  const openCustomerDetails = (customerId) => {
    if (!customerId || typeof onViewChange !== 'function') {
      return;
    }
    onViewChange('user-details', customerId);
  };

  const activeFilter = FILTER_OPTIONS.find((option) => option.value === playerFilter) || FILTER_OPTIONS[0];
  const showSummaryOnly = playerFilter === 'summary';
  const summaryDays = Array.isArray(summaryData?.days) ? summaryData.days : [];

  useEffect(() => {
    if (!Array.isArray(summaryDays) || summaryDays.length === 0) {
      setSelectedDayIndex(0);
      return;
    }
    setSelectedDayIndex((prev) => {
      if (prev < 0) return 0;
      if (prev > summaryDays.length - 1) return summaryDays.length - 1;
      return prev;
    });
  }, [summaryDays]);

  const hierarchyContext = useMemo(() => {
    const byPlayerId = new Map();
    const rootAdmin = String(agentTreeData?.root?.username || 'ADMIN').toUpperCase();

    const parseNodeKind = (node) => {
      const nodeType = String(node?.nodeType || '').toLowerCase();
      if (nodeType === 'player') return 'player';
      if (nodeType === 'agent') return 'agent';
      const role = String(node?.role || '').toLowerCase();
      if (role === 'player' || role === 'user') return 'player';
      return 'agent';
    };

    const walk = (node, lineage = []) => {
      if (!node || typeof node !== 'object') return;
      const kind = parseNodeKind(node);

      if (kind === 'player') {
        const playerId = String(node.id || '').trim();
        if (playerId === '') return;

        const chain = lineage
          .map((ancestor) => String(ancestor?.username || '').toUpperCase())
          .filter(Boolean);
        const hierarchyPath = chain.length > 0 ? chain.join(' / ') : rootAdmin;

        byPlayerId.set(playerId, {
          chain,
          hierarchyPath,
          directAgent: chain[chain.length - 1] || '',
        });
        return;
      }

      const nextLineage = [...lineage, {
        id: String(node.id || ''),
        username: String(node.username || ''),
        role: String(node.role || ''),
      }];
      const children = Array.isArray(node.children) ? node.children : [];
      children.forEach((child) => walk(child, nextLineage));
    };

    const topNodes = Array.isArray(agentTreeData?.tree) ? agentTreeData.tree : [];
    topNodes.forEach((node) => walk(node, []));
    return { byPlayerId, rootAdmin };
  }, [agentTreeData]);

  const mobileDecoratedCustomers = useMemo(() => {
    return sortedCustomers.map((customer) => {
      const customerId = String(customer?.id || '').trim();
      const hierarchy = hierarchyContext.byPlayerId.get(customerId);
      const hierarchyPath = String(hierarchy?.hierarchyPath || '').trim() || hierarchyContext.rootAdmin || 'ADMIN';
      const directAgent = String(hierarchy?.directAgent || '').trim();

      return {
        ...customer,
        hierarchy: {
          path: hierarchyPath,
          directAgent,
          searchValue: `${hierarchyPath} ${directAgent}`.toLowerCase(),
        },
      };
    });
  }, [hierarchyContext.byPlayerId, hierarchyContext.rootAdmin, sortedCustomers]);

  const mobileGroupedCustomers = useMemo(() => {
    const groupsMap = new Map();
    const searchNeedle = mobileAgentSearch.trim().toLowerCase();

    mobileDecoratedCustomers.forEach((customer) => {
      const hierarchy = customer.hierarchy || {};
      const hierarchyPath = String(hierarchy.path || hierarchyContext.rootAdmin || 'ADMIN');
      const key = hierarchyPath;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          hierarchyLabel: hierarchyPath,
          searchValue: String(hierarchy.searchValue || '').trim().toLowerCase(),
          customers: [],
        });
      }
      groupsMap.get(key).customers.push(customer);
    });

    let groups = Array.from(groupsMap.values());
    groups.forEach((group) => {
      group.customers = [...group.customers].sort((a, b) => {
        const aUsername = String(a?.username || '');
        const bUsername = String(b?.username || '');
        return collator.compare(aUsername, bUsername);
      });
    });

    groups = groups.sort((a, b) => collator.compare(a.hierarchyLabel, b.hierarchyLabel));

    if (searchNeedle !== '') {
      groups = groups.filter((group) => group.searchValue.includes(searchNeedle));
    }

    groups = groups.map((group) => {
      const dayTotal = group.customers.reduce((sum, customer) => {
        const amount = Number(customer?.daily?.[selectedDayIndex] ?? 0);
        return sum + (Number.isNaN(amount) ? 0 : amount);
      }, 0);
      const balanceTotal = group.customers.reduce((sum, customer) => {
        const amount = Number(customer?.balance ?? 0);
        return sum + (Number.isNaN(amount) ? 0 : amount);
      }, 0);

      return {
        ...group,
        totals: {
          players: group.customers.length,
          day: dayTotal,
          balance: balanceTotal,
        },
      };
    });

    return groups;
  }, [collator, hierarchyContext.rootAdmin, mobileAgentSearch, mobileDecoratedCustomers, selectedDayIndex]);

  const selectedDayLabel = summaryDays[selectedDayIndex]?.day || 'Day';
  const selectedDayShortLabel = String(selectedDayLabel || 'Day').split(' ')[0];

  const changeDay = (direction) => {
    if (!Array.isArray(summaryDays) || summaryDays.length === 0) return;
    setSelectedDayIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return summaryDays.length - 1;
      if (next >= summaryDays.length) return 0;
      return next;
    });
  };

  const getCustomerSelectedDayAmount = (customer) => {
    if (!Array.isArray(customer?.daily) || customer.daily.length === 0) {
      return 0;
    }
    const amount = Number(customer.daily[selectedDayIndex] ?? 0);
    return Number.isNaN(amount) ? 0 : amount;
  };

  const formatMobileCellNumber = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    const isWhole = Math.abs(num % 1) < 0.000001;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: isWhole ? 0 : 2,
    });
  };

  const mobileOverviewTotals = useMemo(() => {
    const players = mobileDecoratedCustomers.length;
    const day = mobileDecoratedCustomers.reduce((sum, customer) => {
      const value = Number(customer?.daily?.[selectedDayIndex] ?? 0);
      return sum + (Number.isNaN(value) ? 0 : value);
    }, 0);
    const balance = mobileDecoratedCustomers.reduce((sum, customer) => {
      const value = Number(customer?.balance ?? 0);
      return sum + (Number.isNaN(value) ? 0 : value);
    }, 0);
    return { players, day, balance };
  }, [mobileDecoratedCustomers, selectedDayIndex]);

  const renderDayToggle = () => {
    if (!isMobile || summaryDays.length === 0) return null;
    return (
      <div className="weekly-mobile-day-toggle" role="group" aria-label="Switch displayed day">
        <button
          type="button"
          className="weekly-mobile-day-nav"
          onClick={() => changeDay(-1)}
          aria-label="Previous day"
        >
          <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
        </button>
        <span className="weekly-mobile-day-current">{selectedDayLabel}</span>
        <button
          type="button"
          className="weekly-mobile-day-nav"
          onClick={() => changeDay(1)}
          aria-label="Next day"
        >
          <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    );
  };

  const renderInlineDayToggle = () => (
    <div className="weekly-mobile-inline-day">
      <button
        type="button"
        className="weekly-mobile-inline-day-nav"
        onClick={() => changeDay(-1)}
        aria-label="Previous day"
      >
        <i className="fa-solid fa-caret-left" aria-hidden="true"></i>
      </button>
      <span>{selectedDayLabel}</span>
      <button
        type="button"
        className="weekly-mobile-inline-day-nav"
        onClick={() => changeDay(1)}
        aria-label="Next day"
      >
        <i className="fa-solid fa-caret-right" aria-hidden="true"></i>
      </button>
    </div>
  );

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Weekly Figures - Customer Tracking</h2>
        <div className="period-filter">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="weekly-period-select"
            aria-label="Select week period"
          >
            {WEEK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            className="weekly-filter-select"
            aria-label="Select player filter"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading weekly figures...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && summaryData && (
          <>
            <div className="weekly-filter-description">{activeFilter.description}</div>

            {showSummaryOnly ? (
              <div className="summary-section">
                <div className="summary-header">
                  <h3>Weekly Summary</h3>
                </div>
                {isMobile ? (
                  <>
                    {renderDayToggle()}
                    <div className="weekly-mobile-summary-grid">
                      <div className="weekly-mobile-summary-card">
                        <span className="weekly-mobile-summary-label">{selectedDayShortLabel}</span>
                        <strong>{formatMoney(summaryDays[selectedDayIndex]?.amount ?? 0)}</strong>
                      </div>
                      <div className="weekly-mobile-summary-card">
                        <span className="weekly-mobile-summary-label">Week Total</span>
                        <strong>{formatMoney(summaryData.weekTotal)}</strong>
                      </div>
                      <div className="weekly-mobile-summary-card">
                        <span className="weekly-mobile-summary-label">Balances</span>
                        <strong>{formatMoney(summaryData.balanceTotal)}</strong>
                      </div>
                      <div className="weekly-mobile-summary-card">
                        <span className="weekly-mobile-summary-label">Pending</span>
                        <strong>{formatMoney(summaryData.pendingTotal)}</strong>
                      </div>
                      <div className="weekly-mobile-summary-card">
                        <span className="weekly-mobile-summary-label">Total Players</span>
                        <strong>{summaryData.totalPlayers ?? 0}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="table-container scrollable">
                    <table className="summary-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          {summaryDays.map((day, idx) => (
                            <th key={idx}>{day.day}</th>
                          ))}
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Profit / Loss</td>
                          {summaryDays.map((day, idx) => (
                            <td key={idx}>{formatMoney(day.amount)}</td>
                          ))}
                          <td>{formatMoney(summaryData.weekTotal)}</td>
                        </tr>
                        <tr>
                          <td>Player Balances</td>
                          {summaryDays.map((_, idx) => (
                            <td key={idx}>—</td>
                          ))}
                          <td>{formatMoney(summaryData.balanceTotal)}</td>
                        </tr>
                        <tr>
                          <td>Pending</td>
                          {summaryDays.map((_, idx) => (
                            <td key={idx}>—</td>
                          ))}
                          <td>{formatMoney(summaryData.pendingTotal)}</td>
                        </tr>
                        <tr>
                          <td>Total Players</td>
                          {summaryDays.map((_, idx) => (
                            <td key={idx}>—</td>
                          ))}
                          <td>{summaryData.totalPlayers ?? 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="dead-agents-row">
                  <span>Suspended / Dead Accounts</span>
                  <span className="value">{summaryData.deadAccounts ?? 0}</span>
                </div>
              </div>
            ) : (
              <div className="customer-section">
                <div className="section-header">
                  <h3>{activeFilter.label}</h3>
                </div>
                {isMobile ? (
                  <div className="weekly-mobile-customer-shell">
                    {playerFilter === 'all-players' && (
                      <div className="weekly-mobile-agent-search-wrap">
                        <label htmlFor="weekly-agent-search">Search Agents</label>
                        <input
                          id="weekly-agent-search"
                          type="text"
                          value={mobileAgentSearch}
                          onChange={(e) => setMobileAgentSearch(e.target.value)}
                          placeholder="Find agent groups..."
                          className="weekly-mobile-agent-search-input"
                        />
                      </div>
                    )}

                    <div className="weekly-mobile-groups">
                      <section className="weekly-mobile-table-block weekly-mobile-overview-block">
                        <div className="weekly-mobile-table-head">
                          <span>Summary</span>
                          <span>{selectedDayLabel}</span>
                          <span>Balance</span>
                        </div>
                        <div className="weekly-mobile-table-row weekly-mobile-overview-row">
                          <div className="weekly-mobile-customer-cell">
                            <strong>{mobileOverviewTotals.players} Players</strong>
                          </div>
                          <div className={`weekly-mobile-day-cell ${mobileOverviewTotals.day < 0 ? 'is-negative' : mobileOverviewTotals.day > 0 ? 'is-positive' : ''}`}>
                            {formatMobileCellNumber(mobileOverviewTotals.day)}
                          </div>
                          <div className={`weekly-mobile-balance-cell ${mobileOverviewTotals.balance < 0 ? 'is-negative' : ''}`}>
                            {formatMobileCellNumber(mobileOverviewTotals.balance)}
                          </div>
                        </div>
                      </section>

                      {mobileGroupedCustomers.length > 0 ? mobileGroupedCustomers.map((group) => (
                        <section key={group.key} className="weekly-mobile-group weekly-mobile-table-block">
                          <div className="weekly-mobile-hierarchy">{group.hierarchyLabel}</div>
                          <div className="weekly-mobile-table-head">
                            <span>Customer</span>
                            {renderInlineDayToggle()}
                            <span>Balance</span>
                          </div>
                          <div className="weekly-mobile-rows">
                            {group.customers.map((customer, rowIdx) => {
                              const dayValue = getCustomerSelectedDayAmount(customer);
                              const balanceValue = Number(customer.balance || 0);
                              return (
                                <div key={`${group.key}-${String(customer.id || customer.username || rowIdx)}`} className="weekly-mobile-table-row">
                                  <div className="weekly-mobile-customer-cell weekly-mobile-user">
                                    {customer.id && typeof onViewChange === 'function' ? (
                                      <button
                                        type="button"
                                        className="customer-username customer-username-button"
                                        onClick={() => openCustomerDetails(customer.id)}
                                      >
                                        {customer.username}
                                      </button>
                                    ) : (
                                      <strong className="customer-username">{customer.username}</strong>
                                    )}
                                    <span className="weekly-mobile-fullname">{customer.name || '—'}</span>
                                  </div>
                                  <div className={`weekly-mobile-day-cell ${dayValue < 0 ? 'is-negative' : dayValue > 0 ? 'is-positive' : ''}`}>
                                    {formatMobileCellNumber(dayValue)}
                                  </div>
                                  <div className={`weekly-mobile-balance-cell ${balanceValue < 0 ? 'is-negative' : ''}`}>
                                    {formatMobileCellNumber(balanceValue)}
                                  </div>
                                </div>
                              );
                            })}
                            <div className="weekly-mobile-table-row weekly-mobile-group-total-row">
                              <div className="weekly-mobile-customer-cell">
                                <strong>{group.totals.players} Players</strong>
                              </div>
                              <div className={`weekly-mobile-day-cell ${group.totals.day < 0 ? 'is-negative' : group.totals.day > 0 ? 'is-positive' : ''}`}>
                                {formatMobileCellNumber(group.totals.day)}
                              </div>
                              <div className={`weekly-mobile-balance-cell ${group.totals.balance < 0 ? 'is-negative' : ''}`}>
                                {formatMobileCellNumber(group.totals.balance)}
                              </div>
                            </div>
                          </div>
                        </section>
                      )) : (
                        <div className="weekly-empty-state">
                          {mobileAgentSearch.trim()
                            ? 'No agent groups matched your search.'
                            : 'No players matched this filter.'}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="table-container scrollable">
                    <table className="data-table customer-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Carry</th>
                          {summaryDays.map((day, idx) => (
                            <th key={idx}>{day.day}</th>
                          ))}
                          <th>Week</th>
                          <th>Balance</th>
                          <th>Pending</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCustomers.length > 0 ? sortedCustomers.map((customer, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="customer-identity">
                                {customer.id && typeof onViewChange === 'function' ? (
                                  <button
                                    type="button"
                                    className="customer-username customer-username-button"
                                    onClick={() => openCustomerDetails(customer.id)}
                                  >
                                    {customer.username}
                                  </button>
                                ) : (
                                  <strong className="customer-username">{customer.username}</strong>
                                )}
                                <span className="customer-subname">
                                  {customer.name || '—'}
                                </span>
                              </div>
                            </td>
                            <td style={{ color: customer.carry < 0 ? '#e74c3c' : '#27ae60' }}>
                              {formatMoney(customer.carry)}
                            </td>
                            {customer.daily.map((value, dayIdx) => (
                              <td key={dayIdx}>{formatMoney(value)}</td>
                            ))}
                            <td>{formatMoney(customer.week)}</td>
                            <td style={{ color: customer.balance < 0 ? '#e74c3c' : '#27ae60' }}>
                              {formatMoney(customer.balance)}
                            </td>
                            <td>{formatMoney(customer.pending)}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={summaryDays.length + 5} className="weekly-empty-state">
                              No players matched this filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default WeeklyFiguresView;
