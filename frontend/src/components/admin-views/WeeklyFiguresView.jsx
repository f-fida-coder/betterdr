import React, { useState, useEffect, useMemo } from 'react';
import { getWeeklyFigures } from '../../api';

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
    value: 'over-settle',
    label: 'Over Settle',
    description: 'Shows players whose balance is at or above their settle limit.',
  },
  {
    value: 'over-settle-winners',
    label: 'Over settle winners (highest to lowest)',
    description: 'Shows over-settle winners sorted highest to lowest balance.',
  },
  {
    value: 'over-settle-losers',
    label: 'Over settle losers (highest to lowest)',
    description: 'Shows over-settle losers sorted highest to lowest by loss amount.',
  },
  {
    value: 'inactive-losers-14d',
    label: 'Inactive losers 14 days (highest to lowest, losers only)',
    description: 'Shows inactive losers (14+ days) sorted highest to lowest by loss amount.',
  },
  {
    value: 'lifetime-winners',
    label: 'Lifetime winners (highest to lowest)',
    description: 'Shows lifetime winners sorted highest to lowest.',
  },
  {
    value: 'lifetime-losers',
    label: 'Lifetime losers (highest to lowest)',
    description: 'Shows lifetime losers sorted highest to lowest by loss amount.',
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

  const roundForDisplay = (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (Number.isNaN(num)) return null;
    const rounded = Math.round(num);
    return Object.is(rounded, -0) ? 0 : rounded;
  };

  const formatMoney = (value) => {
    const rounded = roundForDisplay(value);
    if (rounded === null) return '—';
    return rounded.toLocaleString('en-US');
  };

  const getSignedValueClass = (value) => {
    const rounded = roundForDisplay(value);
    if (rounded === null || rounded === 0) return 'is-neutral';
    return rounded > 0 ? 'is-positive' : 'is-negative';
  };

  const isInactiveFor14Days = (customer) => {
    if (typeof customer?.inactive14Days === 'boolean') {
      return customer.inactive14Days;
    }
    const source = customer?.lastActive || customer?.lastBetAt || customer?.updatedAt || '';
    const parsed = Date.parse(String(source || ''));
    if (Number.isNaN(parsed)) return false;
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    return (Date.now() - parsed) >= fourteenDaysMs;
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
    if (playerFilter !== 'all-players') {
      setMobileAgentSearch('');
    }
  }, [playerFilter]);

  const filteredCustomers = useMemo(() => customers.filter((customer) => {
    const balance = Number(customer.balance || 0);
    const week = Number(customer.week || 0);
    const lifetime = Number(customer.lifetime || 0);
    const settleLimit = Math.abs(Number(customer.settleLimit ?? customer.balanceOwed ?? 0));
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
    if (playerFilter === 'over-settle') {
      if (settleLimit <= 0.01) return false;
      return Math.abs(balance) >= settleLimit;
    }
    if (playerFilter === 'over-settle-winners') {
      if (settleLimit <= 0.01) return false;
      return balance >= settleLimit;
    }
    if (playerFilter === 'over-settle-losers') {
      if (settleLimit <= 0.01) return false;
      return balance <= -settleLimit;
    }
    if (playerFilter === 'inactive-losers-14d') {
      return isInactiveFor14Days(customer) && balance < -0.01;
    }
    if (playerFilter === 'lifetime-winners') {
      return lifetime > 0.01;
    }
    if (playerFilter === 'lifetime-losers') {
      return lifetime < -0.01;
    }
    if (playerFilter === 'summary') {
      return false;
    }
    return true;
  }), [customers, playerFilter]);

  const customerComparator = useMemo(() => {
    return (a, b) => {
      const aUsername = String(a?.username || '');
      const bUsername = String(b?.username || '');
      const usernameFallback = collator.compare(aUsername, bUsername);

      if (playerFilter === 'over-settle-winners') {
        const diff = Number(b?.balance || 0) - Number(a?.balance || 0);
        return diff !== 0 ? diff : usernameFallback;
      }
      if (playerFilter === 'over-settle-losers' || playerFilter === 'inactive-losers-14d') {
        const diff = Math.abs(Number(b?.balance || 0)) - Math.abs(Number(a?.balance || 0));
        return diff !== 0 ? diff : usernameFallback;
      }
      if (playerFilter === 'lifetime-winners') {
        const diff = Number(b?.lifetime || 0) - Number(a?.lifetime || 0);
        return diff !== 0 ? diff : usernameFallback;
      }
      if (playerFilter === 'lifetime-losers') {
        const diff = Math.abs(Number(b?.lifetime || 0)) - Math.abs(Number(a?.lifetime || 0));
        return diff !== 0 ? diff : usernameFallback;
      }

      return usernameFallback;
    };
  }, [collator, playerFilter]);

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort(customerComparator);
  }, [customerComparator, filteredCustomers]);

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

  const mobileDecoratedCustomers = useMemo(() => {
    return sortedCustomers.map((customer) => {
      const chain = Array.isArray(customer?.agentHierarchy)
        ? customer.agentHierarchy
          .map((item) => String(item || '').trim().toUpperCase())
          .filter(Boolean)
        : [];
      const directAgent = String(customer?.agentUsername || '').trim().toUpperCase()
        || (chain.length > 0 ? chain[chain.length - 1] : '');
      const hierarchyPath = String(customer?.agentHierarchyPath || '').trim().toUpperCase()
        || (chain.length > 0 ? chain.join(' / ') : (directAgent || 'UNASSIGNED'));

      return {
        ...customer,
        hierarchy: {
          path: hierarchyPath,
          directAgent,
          searchValue: `${hierarchyPath} ${directAgent}`.toLowerCase(),
        },
      };
    });
  }, [sortedCustomers]);

  const mobileGroupedCustomers = useMemo(() => {
    const groupsMap = new Map();
    const searchNeedle = mobileAgentSearch.trim().toLowerCase();

    mobileDecoratedCustomers.forEach((customer) => {
      const hierarchy = customer.hierarchy || {};
      const hierarchyPath = String(hierarchy.path || 'UNASSIGNED');
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
      group.customers = [...group.customers].sort(customerComparator);
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
  }, [collator, customerComparator, mobileAgentSearch, mobileDecoratedCustomers, selectedDayIndex]);

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
    return formatMoney(value);
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
                        <strong className={`weekly-amount ${getSignedValueClass(summaryDays[selectedDayIndex]?.amount ?? 0)}`}>
                          {formatMoney(summaryDays[selectedDayIndex]?.amount ?? 0)}
                        </strong>
                      </div>
                      <div className="weekly-mobile-summary-card">
                        <span className="weekly-mobile-summary-label">Week Total</span>
                        <strong className={`weekly-amount ${getSignedValueClass(summaryData.weekTotal)}`}>
                          {formatMoney(summaryData.weekTotal)}
                        </strong>
                      </div>
                      <div className="weekly-mobile-summary-card">
                        <span className="weekly-mobile-summary-label">Balances</span>
                        <strong className={`weekly-amount ${getSignedValueClass(summaryData.balanceTotal)}`}>
                          {formatMoney(summaryData.balanceTotal)}
                        </strong>
                      </div>
                      <div className="weekly-mobile-summary-card">
                        <span className="weekly-mobile-summary-label">Pending</span>
                        <strong className={`weekly-amount ${getSignedValueClass(summaryData.pendingTotal)}`}>
                          {formatMoney(summaryData.pendingTotal)}
                        </strong>
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
                            <td key={idx} className={`weekly-amount ${getSignedValueClass(day.amount)}`}>{formatMoney(day.amount)}</td>
                          ))}
                          <td className={`weekly-amount ${getSignedValueClass(summaryData.weekTotal)}`}>{formatMoney(summaryData.weekTotal)}</td>
                        </tr>
                        <tr>
                          <td>Player Balances</td>
                          {summaryDays.map((_, idx) => (
                            <td key={idx}>—</td>
                          ))}
                          <td className={`weekly-amount ${getSignedValueClass(summaryData.balanceTotal)}`}>{formatMoney(summaryData.balanceTotal)}</td>
                        </tr>
                        <tr>
                          <td>Pending</td>
                          {summaryDays.map((_, idx) => (
                            <td key={idx}>—</td>
                          ))}
                          <td className={`weekly-amount ${getSignedValueClass(summaryData.pendingTotal)}`}>{formatMoney(summaryData.pendingTotal)}</td>
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
                          <div className={`weekly-mobile-day-cell ${getSignedValueClass(mobileOverviewTotals.day)}`}>
                            {formatMobileCellNumber(mobileOverviewTotals.day)}
                          </div>
                          <div className={`weekly-mobile-balance-cell ${getSignedValueClass(mobileOverviewTotals.balance)}`}>
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
                                  <div className={`weekly-mobile-day-cell ${getSignedValueClass(dayValue)}`}>
                                    {formatMobileCellNumber(dayValue)}
                                  </div>
                                  <div className={`weekly-mobile-balance-cell ${getSignedValueClass(balanceValue)}`}>
                                    {formatMobileCellNumber(balanceValue)}
                                  </div>
                                </div>
                              );
                            })}
                            <div className="weekly-mobile-table-row weekly-mobile-group-total-row">
                              <div className="weekly-mobile-customer-cell">
                                <strong>{group.totals.players} Players</strong>
                              </div>
                              <div className={`weekly-mobile-day-cell ${getSignedValueClass(group.totals.day)}`}>
                                {formatMobileCellNumber(group.totals.day)}
                              </div>
                              <div className={`weekly-mobile-balance-cell ${getSignedValueClass(group.totals.balance)}`}>
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
                                <span className="customer-subname">
                                  {String(customer.agentHierarchyPath || customer.agentUsername || 'UNASSIGNED').toUpperCase()}
                                </span>
                              </div>
                            </td>
                            <td className={`weekly-amount ${getSignedValueClass(customer.carry)}`}>
                              {formatMoney(customer.carry)}
                            </td>
                            {customer.daily.map((value, dayIdx) => (
                              <td key={dayIdx} className={`weekly-amount ${getSignedValueClass(value)}`}>{formatMoney(value)}</td>
                            ))}
                            <td className={`weekly-amount ${getSignedValueClass(customer.week)}`}>{formatMoney(customer.week)}</td>
                            <td className={`weekly-amount ${getSignedValueClass(customer.balance)}`}>
                              {formatMoney(customer.balance)}
                            </td>
                            <td className={`weekly-amount ${getSignedValueClass(customer.pending)}`}>{formatMoney(customer.pending)}</td>
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
