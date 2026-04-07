import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getWeeklyFigures } from '../../api';
import { annotateDuplicatePlayers } from '../../utils/duplicatePlayers';

const WEEK_OPTIONS = [
  { value: 'this-week', label: 'This Week' },
  { value: 'last-week', label: 'Last Week' },
  ...Array.from({ length: 16 }, (_, index) => {
    const weeksAgo = index + 2;
    return { value: `weeks-ago-${weeksAgo}`, label: `${weeksAgo} Week's ago` };
  }),
];

const DEFAULT_WEEKLY_PERIOD = 'this-week';
const DEFAULT_WEEKLY_FILTER = 'active-week';
const DEFAULT_OPEN_DROPDOWN = null;

const FILTER_OPTIONS = [
  {
    value: 'all-players',
    label: 'All Players',
    description: 'Shows all players in the selected week scope.',
  },
  {
    value: 'active-week',
    label: 'Active For The Week',
    description: 'Shows only active players for the selected week.',
  },
  {
    value: 'with-balance',
    label: 'With A Balance',
    description: 'Shows only players with a balance.',
  },
  {
    value: 'big-figures',
    label: 'Big Figures',
    description: 'Shows players with absolute balance greater than $1,000 (winners and losers).',
  },
  {
    value: 'over-settle-winners',
    label: 'Over Settle Winners',
    description: 'Shows over-settle winners.',
  },
  {
    value: 'over-settle-losers',
    label: 'Over Settle Losers',
    description: 'Shows over-settle losers.',
  },
  {
    value: 'inactive-losers-14d',
    label: 'Inactive Losers 14 Days',
    description: 'Shows only inactive losers from the last 14 days.',
  },
];

const parseNumericAmount = (value) => {
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  if (typeof value === 'string') {
    const sanitized = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(sanitized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const getLifetimePerformance = (customer) => {
  const value = customer?.lifetimePerformance
    ?? customer?.lifetimePlusMinus
    ?? customer?.lifetime
    ?? 0;
  return parseNumericAmount(value);
};

const cycleOptionValue = (options, currentValue, direction) => {
  if (!Array.isArray(options) || options.length === 0) {
    return currentValue;
  }
  const currentIndex = options.findIndex((option) => option.value === currentValue);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeIndex + direction + options.length) % options.length;
  return options[nextIndex]?.value ?? currentValue;
};

const normalizeOpenDropdown = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'period' || normalized === 'filter' ? normalized : DEFAULT_OPEN_DROPDOWN;
};

function WeeklyFiguresView({ onViewChange = null, viewContext = null }) {
  const [timePeriod, setTimePeriod] = useState(() => String(viewContext?.timePeriod || DEFAULT_WEEKLY_PERIOD));
  const [playerFilter, setPlayerFilter] = useState(() => String(viewContext?.playerFilter || DEFAULT_WEEKLY_FILTER));
  const [openDropdown, setOpenDropdown] = useState(() => normalizeOpenDropdown(viewContext?.openDropdown));
  const [summaryData, setSummaryData] = useState(null);
  const [settlementData, setSettlementData] = useState(null);
  const [weekDates, setWeekDates] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const periodFilterRef = useRef(null);
  const collator = useMemo(
    () => new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }),
    []
  );
  const summaryFocus = String(viewContext?.summaryFocus || '').trim().toLowerCase();
  const focusActorLabel = String(viewContext?.actorLabel || '').trim().toUpperCase();
  const isAgentCollectionsFocus = summaryFocus === 'agent-collections';
  const isHouseCollectionsFocus = summaryFocus === 'house-collections';
  const isCollectionsFocus = isAgentCollectionsFocus || isHouseCollectionsFocus;

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

  const formatCurrency = (value) => {
    const rounded = roundForDisplay(value);
    if (rounded === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(rounded);
  };

  const getSignedValueClass = (value) => {
    const rounded = roundForDisplay(value);
    if (rounded === null || rounded === 0) return 'is-neutral';
    return rounded > 0 ? 'is-positive' : 'is-negative';
  };

  const getSettlementValueClass = (value) => {
    const rounded = roundForDisplay(value);
    if (rounded === null || rounded === 0) return 'neutral';
    return rounded > 0 ? 'positive' : 'negative';
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

  const isActiveForWeek = (customer) => {
    if (typeof customer?.activeForWeek === 'boolean') {
      return customer.activeForWeek;
    }
    const week = Number(customer?.week || 0);
    if (Array.isArray(customer?.daily)) {
      return customer.daily.some((value) => Math.abs(Number(value || 0)) > 0.01);
    }
    return Math.abs(week) > 0.01;
  };

  const getFocusedCollectionValue = (customer) => {
    if (isAgentCollectionsFocus) {
      return parseNumericAmount(customer?.agentCollections ?? 0);
    }
    if (isHouseCollectionsFocus) {
      return parseNumericAmount(customer?.houseCollections ?? 0);
    }
    return 0;
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
        setSettlementData(data.settlement || null);
        setWeekDates(data.startDate && data.endDate ? { start: data.startDate, end: data.endDate } : null);
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
    if (!viewContext || typeof viewContext !== 'object') {
      return;
    }
    setTimePeriod(String(viewContext?.timePeriod || DEFAULT_WEEKLY_PERIOD));
    setPlayerFilter(String(viewContext?.playerFilter || DEFAULT_WEEKLY_FILTER));
    setSelectedDayIndex(0);
    setOpenDropdown(normalizeOpenDropdown(viewContext?.openDropdown));
  }, [viewContext]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!periodFilterRef.current) return;
      if (!periodFilterRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const customersWithDuplicateFlags = useMemo(() => annotateDuplicatePlayers(customers), [customers]);
  const includeAllPlayers = playerFilter === 'all-players';

  const matchesFilter = (customer) => {
    const balance = Number(customer.balance || 0);
    const settleLimit = Math.abs(Number(customer.settleLimit ?? customer.balanceOwed ?? 0));
    const activeThisWeek = isActiveForWeek(customer);

    if (playerFilter === 'all-players') {
      return true;
    }
    if (playerFilter === 'with-balance') {
      return Math.abs(balance) > 0.01;
    }
    if (playerFilter === 'active-week') {
      return activeThisWeek;
    }
    if (playerFilter === 'big-figures') {
      return Math.abs(balance) > 1000;
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
    return true;
  };

  const customersWithFilterState = useMemo(() => (
    customersWithDuplicateFlags.map((customer) => ({
      ...customer,
      matchesSelectedFilter: matchesFilter(customer),
    }))
  ), [customersWithDuplicateFlags, playerFilter]);

  const filteredCustomers = useMemo(() => {
    const baseList = includeAllPlayers
      ? customersWithFilterState
      : customersWithFilterState.filter((customer) => customer.matchesSelectedFilter);

    if (!isCollectionsFocus) {
      return baseList;
    }

    return baseList.filter((customer) => Math.abs(getFocusedCollectionValue(customer)) > 0.01);
  }, [customersWithFilterState, getFocusedCollectionValue, includeAllPlayers, isCollectionsFocus]);

  const customerComparator = useMemo(() => {
    return (a, b) => {
      const aUsername = String(a?.username || '');
      const bUsername = String(b?.username || '');
      const usernameFallback = collator.compare(aUsername, bUsername);

      if (isCollectionsFocus) {
        const diff = Math.abs(getFocusedCollectionValue(b)) - Math.abs(getFocusedCollectionValue(a));
        return diff !== 0 ? diff : usernameFallback;
      }

      if (includeAllPlayers) {
        return usernameFallback;
      }

      if (playerFilter === 'over-settle-winners') {
        const diff = Number(b?.balance || 0) - Number(a?.balance || 0);
        return diff !== 0 ? diff : usernameFallback;
      }
      if (playerFilter === 'over-settle-losers' || playerFilter === 'inactive-losers-14d') {
        const diff = Math.abs(Number(b?.balance || 0)) - Math.abs(Number(a?.balance || 0));
        return diff !== 0 ? diff : usernameFallback;
      }
      if (playerFilter === 'big-figures') {
        const diff = Math.abs(Number(b?.balance || 0)) - Math.abs(Number(a?.balance || 0));
        return diff !== 0 ? diff : usernameFallback;
      }
      return usernameFallback;
    };
  }, [collator, getFocusedCollectionValue, includeAllPlayers, isCollectionsFocus, playerFilter]);

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
  const activePeriod = WEEK_OPTIONS.find((option) => option.value === timePeriod) || WEEK_OPTIONS[0];
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

  const decoratedCustomers = useMemo(() => {
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
        },
      };
    });
  }, [sortedCustomers]);

  const groupedCustomers = useMemo(() => {
    const groupsMap = new Map();

    decoratedCustomers.forEach((customer) => {
      const hierarchy = customer.hierarchy || {};
      const hierarchyPath = String(hierarchy.path || 'UNASSIGNED');
      const key = hierarchyPath;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          hierarchyLabel: hierarchyPath,
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

    groups = groups.map((group) => {
      const dayTotal = group.customers.reduce((sum, customer) => {
        const amount = Number(customer?.daily?.[selectedDayIndex] ?? 0);
        return sum + (Number.isNaN(amount) ? 0 : amount);
      }, 0);
      const balanceTotal = group.customers.reduce((sum, customer) => {
        const amount = parseNumericAmount(customer?.balance ?? 0);
        return sum + (Number.isNaN(amount) ? 0 : amount);
      }, 0);
      const lifetimeTotal = group.customers.reduce((sum, customer) => {
        const amount = getLifetimePerformance(customer);
        return sum + (Number.isNaN(amount) ? 0 : amount);
      }, 0);

      return {
        ...group,
        totals: {
          players: group.customers.length,
          day: dayTotal,
          balance: balanceTotal,
          lifetime: lifetimeTotal,
        },
      };
    });

    return groups;
  }, [collator, customerComparator, decoratedCustomers, selectedDayIndex]);

  const selectedDayLabel = summaryDays[selectedDayIndex]?.day || 'Day';
  const selectedMetricLabel = summaryDays.length > 0 ? selectedDayLabel : 'Selected Metric';

  const changeDay = (direction) => {
    if (!Array.isArray(summaryDays) || summaryDays.length === 0) return;
    setSelectedDayIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return summaryDays.length - 1;
      if (next >= summaryDays.length) return 0;
      return next;
    });
  };

  const changeTimePeriod = (direction) => {
    setTimePeriod((currentValue) => cycleOptionValue(WEEK_OPTIONS, currentValue, direction));
    setOpenDropdown(null);
  };

  const changePlayerFilter = (direction) => {
    setPlayerFilter((currentValue) => cycleOptionValue(FILTER_OPTIONS, currentValue, direction));
    setOpenDropdown(null);
  };

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown((currentValue) => (currentValue === dropdownName ? null : dropdownName));
  };

  const selectTimePeriod = (value) => {
    setTimePeriod(value);
    setOpenDropdown(null);
  };

  const selectPlayerFilter = (value) => {
    setPlayerFilter(value);
    setOpenDropdown(null);
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

  const visibleCustomers = useMemo(() => sortedCustomers, [sortedCustomers]);

  const focusMessage = useMemo(() => {
    const actorLabel = focusActorLabel || 'THIS AGENT';
    if (summaryFocus === 'agent-collections') {
      return `Opened from Agent Collections for ${actorLabel}. Showing This Week collections automatically.`;
    }
    if (summaryFocus === 'house-collections') {
      return `Opened from House Collection for ${actorLabel}. Showing This Week collections automatically.`;
    }
    return '';
  }, [focusActorLabel, summaryFocus]);

  const focusedCollectionSummary = useMemo(() => {
    if (!isCollectionsFocus) {
      return null;
    }
    const total = visibleCustomers.reduce((sum, customer) => sum + getFocusedCollectionValue(customer), 0);
    return {
      label: isAgentCollectionsFocus ? 'Agent Collections' : 'House Collection',
      count: visibleCustomers.length,
      total,
    };
  }, [getFocusedCollectionValue, isAgentCollectionsFocus, isCollectionsFocus, visibleCustomers]);

  const dynamicSummary = useMemo(() => {
    const playerCount = visibleCustomers.length;
    const selectedMetricTotal = visibleCustomers.reduce((sum, customer) => {
      return sum + getCustomerSelectedDayAmount(customer);
    }, 0);
    const balanceTotal = visibleCustomers.reduce((sum, customer) => {
      return sum + parseNumericAmount(customer?.balance ?? 0);
    }, 0);
    const lifetimeTotal = visibleCustomers.reduce((sum, customer) => {
      return sum + getLifetimePerformance(customer);
    }, 0);
    return { playerCount, selectedMetricTotal, balanceTotal, lifetimeTotal };
  }, [visibleCustomers, selectedDayIndex]);

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
    <div className="admin-view weekly-figures-view">
      <div className="view-header">
        <h2>Weekly Figures - Customer Tracking</h2>
        <div className="period-filter" ref={periodFilterRef}>
          <div className={`period-filter-control weekly-period-select${openDropdown === 'period' ? ' is-open' : ''}`} role="group" aria-label="Week period control">
            <button
              type="button"
              className="period-filter-value-button"
              onClick={() => toggleDropdown('period')}
              aria-label="Open week period options"
              aria-haspopup="listbox"
              aria-expanded={openDropdown === 'period'}
            >
              <span className="period-filter-value">{activePeriod.label}</span>
            </button>
            <div className="period-filter-stepper">
              <button
                type="button"
                className="period-filter-step-btn"
                onClick={() => changeTimePeriod(-1)}
                aria-label="Previous week period"
              >
                <i className="fa-solid fa-angle-up" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                className="period-filter-step-btn"
                onClick={() => changeTimePeriod(1)}
                aria-label="Next week period"
              >
                <i className="fa-solid fa-angle-down" aria-hidden="true"></i>
              </button>
            </div>
            {openDropdown === 'period' && (
              <div className="period-filter-menu" role="listbox" aria-label="Week period options">
                {WEEK_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`period-filter-menu-item${option.value === timePeriod ? ' is-selected' : ''}`}
                    onClick={() => selectTimePeriod(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={`period-filter-control weekly-filter-select${openDropdown === 'filter' ? ' is-open' : ''}`} role="group" aria-label="Player filter control">
            <button
              type="button"
              className="period-filter-value-button"
              onClick={() => toggleDropdown('filter')}
              aria-label="Open player filter options"
              aria-haspopup="listbox"
              aria-expanded={openDropdown === 'filter'}
            >
              <span className="period-filter-value">{activeFilter.label}</span>
            </button>
            <div className="period-filter-stepper">
              <button
                type="button"
                className="period-filter-step-btn"
                onClick={() => changePlayerFilter(-1)}
                aria-label="Previous player filter"
              >
                <i className="fa-solid fa-angle-up" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                className="period-filter-step-btn"
                onClick={() => changePlayerFilter(1)}
                aria-label="Next player filter"
              >
                <i className="fa-solid fa-angle-down" aria-hidden="true"></i>
              </button>
            </div>
            {openDropdown === 'filter' && (
              <div className="period-filter-menu" role="listbox" aria-label="Player filter options">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`period-filter-menu-item${option.value === playerFilter ? ' is-selected' : ''}`}
                    onClick={() => selectPlayerFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="view-content">
        {focusMessage && <div className="weekly-focus-banner">{focusMessage}</div>}
        {focusedCollectionSummary && (
          <div className="weekly-focus-banner">
            {focusedCollectionSummary.label}: {focusedCollectionSummary.count} player{focusedCollectionSummary.count === 1 ? '' : 's'} matched, total {formatMoney(focusedCollectionSummary.total)}
          </div>
        )}
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading weekly figures...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && summaryData && (
          <>
            {settlementData && weekDates && (
              <div className="summary-section weekly-settlement-section">
                <div className="summary-header">
                  <h3>
                    {new Date(weekDates.start).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                    {' – '}
                    {(() => {
                      const end = new Date(weekDates.end);
                      end.setDate(end.getDate() - 1);
                      return end.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
                    })()}
                    {' Report'}
                  </h3>
                </div>
                <div className="weekly-settlement-grid">
                  <div className="stat-group stat-group-green">
                    <div className="stat-row">
                      <span className="stat-label">Agent Collections</span>
                      <span className={`stat-value ${getSettlementValueClass(settlementData.agentCollections)}`}>{formatCurrency(settlementData.agentCollections)}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">House Collections</span>
                      <span className={`stat-value ${getSettlementValueClass(settlementData.houseCollections)}`}>{formatCurrency(settlementData.houseCollections)}</span>
                    </div>
                    {Number(settlementData.previousMakeup || 0) > 0 && (
                      <div className="stat-row">
                        <span className="stat-label">Previous Makeup</span>
                        <span className="stat-value negative">{formatCurrency(-(settlementData.previousMakeup))}</span>
                      </div>
                    )}
                  </div>
                  <div className="stat-group stat-group-yellow">
                    <div className="stat-row">
                      <span className="stat-label">Net Collections</span>
                      <span className={`stat-value ${getSettlementValueClass(settlementData.netCollections)}`}>{formatCurrency(settlementData.netCollections)}</span>
                    </div>
                    {Number(settlementData.agentSplit || 0) > 0 && (
                      <>
                        <div className="stat-row">
                          <span className="stat-label">Agent Split{settlementData.agentPercent != null ? ` ${settlementData.agentPercent}%` : ''}</span>
                          <span className={`stat-value ${getSettlementValueClass(settlementData.agentSplit)}`}>{formatCurrency(settlementData.agentSplit)}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Kick to House{settlementData.agentPercent != null ? ` ${100 - settlementData.agentPercent}%` : ''}</span>
                          <span className={`stat-value ${getSettlementValueClass(settlementData.kickToHouse)}`}>{formatCurrency(settlementData.kickToHouse)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="stat-group stat-group-red">
                    <div className="stat-row">
                      <span className="stat-label">Active Players</span>
                      <span className="stat-value highlight">{settlementData.activePlayers}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Player Fees</span>
                      <span className="stat-value">{formatCurrency(settlementData.totalPlayerFees)}</span>
                    </div>
                  </div>
                  <div className="stat-group stat-group-salmon">
                    {Number(settlementData.cumulativeMakeup || 0) > 0 && (
                      <div className="stat-row">
                        <span className="stat-label">Remaining Makeup</span>
                        <span className="stat-value negative">{formatCurrency(-(settlementData.cumulativeMakeup))}</span>
                      </div>
                    )}
                    {Number(settlementData.previousBalanceOwed || 0) !== 0 && (
                      <div className="stat-row">
                        <span className="stat-label">Previous Balance</span>
                        <span className={`stat-value ${getSettlementValueClass(settlementData.previousBalanceOwed)}`}>{formatCurrency(settlementData.previousBalanceOwed)}</span>
                      </div>
                    )}
                    {Number(settlementData.houseProfit || 0) > 0 && (
                      <div className="stat-row">
                        <span className="stat-label">House Profit</span>
                        <span className={`stat-value ${getSettlementValueClass(settlementData.houseProfit)}`}>{formatCurrency(settlementData.houseProfit)}</span>
                      </div>
                    )}
                    <div className="stat-row">
                      <span className="stat-label">House Collections</span>
                      <span className={`stat-value ${getSettlementValueClass(-(settlementData.houseCollections))}`}>{formatCurrency(-(settlementData.houseCollections))}</span>
                    </div>
                    {Number(settlementData.fundingAdjustment || 0) !== 0 && (
                      <div className="stat-row">
                        <span className="stat-label">Payments</span>
                        <span className={`stat-value ${getSettlementValueClass(-(settlementData.fundingAdjustment))}`}>{formatCurrency(-(settlementData.fundingAdjustment))}</span>
                      </div>
                    )}
                    <div className="stat-row stat-row-total">
                      <span className="stat-label">Balance Owed / House Money</span>
                      <span className={`stat-value ${getSettlementValueClass(settlementData.balanceOwed)}`}>{formatCurrency(settlementData.balanceOwed)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="summary-section">
              <div className="summary-header">
                <h3>Summary</h3>
              </div>
              <div className="table-container">
                <table className="data-table customer-table">
                  <thead>
                    <tr>
                      <th>Summary</th>
                      <th>{selectedMetricLabel}</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{dynamicSummary.playerCount} {playerFilter === 'active-week' ? 'Active Players' : 'Players'}</td>
                      <td className={`weekly-amount ${getSignedValueClass(dynamicSummary.selectedMetricTotal)}`}>
                        {formatMoney(dynamicSummary.selectedMetricTotal)}
                      </td>
                      <td className={`weekly-amount ${getSignedValueClass(dynamicSummary.balanceTotal)}`}>
                        {formatMoney(dynamicSummary.balanceTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="customer-section">
              <div className="section-header">
                <h3>{activeFilter.label}</h3>
              </div>
              <div className="weekly-mobile-customer-shell">
                <div className="weekly-mobile-groups">
                  {groupedCustomers.length > 0 ? groupedCustomers.map((group) => {
                    const isOverSettle = playerFilter === 'over-settle-winners' || playerFilter === 'over-settle-losers';
                    return (
                    <section key={group.key} className={`weekly-mobile-group weekly-mobile-table-block${isOverSettle ? ' weekly-mobile-has-lifetime' : ''}`}>
                      <div className="weekly-mobile-hierarchy">{group.hierarchyLabel}</div>
                      <div className="weekly-mobile-table-head">
                        <span>Customer</span>
                        <div className="weekly-mobile-table-day-head">{renderInlineDayToggle()}</div>
                        <span>Balance</span>
                        {isOverSettle && <span className="weekly-mobile-lifetime-head">Lifetime</span>}
                      </div>
                      <div className="weekly-mobile-rows">
                        {group.customers.map((customer, rowIdx) => {
                          const dayValue = getCustomerSelectedDayAmount(customer);
                          const balanceValue = parseNumericAmount(customer?.balance ?? 0);
                          const primaryValue = dayValue;
                          const secondaryValue = balanceValue;
                          const lifetimeValue = getLifetimePerformance(customer);
                          return (
                            <div
                              key={`${group.key}-${String(customer.id || customer.username || rowIdx)}`}
                              className={`weekly-mobile-table-row ${customer.isDuplicatePlayer ? 'weekly-duplicate-row' : ''}`}
                            >
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
                                {customer.isDuplicatePlayer && (
                                  <span className="duplicate-player-badge">Duplicate Player</span>
                                )}
                              </div>
                              <div className={`weekly-mobile-day-cell ${getSignedValueClass(primaryValue)}`}>
                                {formatMobileCellNumber(primaryValue)}
                              </div>
                              <div className={`weekly-mobile-balance-cell ${getSignedValueClass(secondaryValue)}`}>
                                <span className="weekly-mobile-balance-value">{formatMobileCellNumber(secondaryValue)}</span>
                              </div>
                              {isOverSettle && (
                                <div className={`weekly-mobile-lifetime-cell ${getSignedValueClass(lifetimeValue)}`}>
                                  {formatMobileCellNumber(lifetimeValue)}
                                </div>
                              )}
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
                          {isOverSettle && (
                            <div className={`weekly-mobile-lifetime-cell ${getSignedValueClass(group.totals.lifetime)}`}>
                              {formatMobileCellNumber(group.totals.lifetime)}
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                    );
                  }) : (
                    <div className="weekly-empty-state">
                      No players matched this filter.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WeeklyFiguresView;
