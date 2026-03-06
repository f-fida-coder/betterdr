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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return [...filteredCustomers].sort((a, b) => {
      const aUsername = String(a?.username || '');
      const bUsername = String(b?.username || '');
      return collator.compare(aUsername, bUsername);
    });
  }, [filteredCustomers]);

  const openCustomerDetails = (customerId) => {
    if (!customerId || typeof onViewChange !== 'function') {
      return;
    }
    onViewChange('user-details', customerId);
  };

  const activeFilter = FILTER_OPTIONS.find((option) => option.value === playerFilter) || FILTER_OPTIONS[0];
  const showSummaryOnly = playerFilter === 'summary';
  const summaryDays = Array.isArray(summaryData?.days) ? summaryData.days : [];

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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default WeeklyFiguresView;
