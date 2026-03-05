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

function WeeklyFiguresView() {
  const [timePeriod, setTimePeriod] = useState('this-week');
  const [playerFilter, setPlayerFilter] = useState('over-settle');
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
    const settleLimit = Number(customer.settleLimit || 0);
    const activeThisWeek = Array.isArray(customer.daily)
      ? customer.daily.some((value) => Math.abs(Number(value || 0)) > 0.01)
      : Math.abs(week) > 0.01;

    if (playerFilter === 'with-balance') {
      return Math.abs(balance) > 0.01;
    }
    if (playerFilter === 'active-week') {
      return activeThisWeek;
    }
    if (playerFilter === 'over-settle') {
      return settleLimit > 0 && Math.abs(balance) > settleLimit;
    }
    if (playerFilter === 'big-figures') {
      return Math.abs(week) >= 1000;
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
            <option value="with-balance">With A Balance</option>
            <option value="active-week">Active for the week</option>
            <option value="over-settle">Over Settle</option>
            <option value="all-players">All Players</option>
            <option value="big-figures">Big Figures</option>
            <option value="summary">Summary</option>
          </select>
        </div>
      </div>

      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading weekly figures...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && summaryData && (
          <>
            {/* Customer Table Section */}
            <div className="customer-section">
              <div className="section-header">
                <h3>Customer</h3>
              </div>

              <div className="table-container scrollable">
                <table className="data-table customer-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Carry</th>
                      {summaryData.days.map((day, idx) => (
                        <th key={idx}>{day.day}</th>
                      ))}
                      <th>Week</th>
                      <th>Balance</th>
                      <th>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCustomers.map((customer, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="customer-identity">
                            <strong className="customer-username">{customer.username}</strong>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WeeklyFiguresView;
