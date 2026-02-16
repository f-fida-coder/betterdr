import React, { useState, useEffect } from 'react';
import { getWeeklyFigures } from '../../api';

function WeeklyFiguresView() {
  const [timePeriod, setTimePeriod] = useState('this-week');
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredData = customers.filter(customer =>
    customer.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Weekly Figures - Summary & Customer Tracking</h2>
        <div className="period-filter">
          <button
            className={timePeriod === 'this-week' ? 'active' : ''}
            onClick={() => setTimePeriod('this-week')}
          >
            This Week
          </button>
          <button
            className={timePeriod === 'last-week' ? 'active' : ''}
            onClick={() => setTimePeriod('last-week')}
          >
            Last Week
          </button>
          <button
            className={timePeriod === 'previous' ? 'active' : ''}
            onClick={() => setTimePeriod('previous')}
          >
            Previous Weeks
          </button>
        </div>
      </div>

      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading weekly figures...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && summaryData && (
          <>
            <div className="summary-section">
              <div className="summary-header">
                <h3>Summary</h3>
              </div>
              <table className="summary-table">
                <thead>
                  <tr>
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
                  <tr>
                    <td><strong>{summaryData.totalPlayers} Players</strong></td>
                    {summaryData.days.map((day, idx) => (
                      <td key={idx} style={{ color: day.amount < 0 ? '#e74c3c' : '#27ae60' }}>
                        {formatMoney(day.amount)}
                      </td>
                    ))}
                    <td style={{ color: summaryData.weekTotal < 0 ? '#e74c3c' : '#27ae60' }}>{formatMoney(summaryData.weekTotal)}</td>
                    <td style={{ color: summaryData.balanceTotal < 0 ? '#e74c3c' : '#27ae60' }}>{formatMoney(summaryData.balanceTotal)}</td>
                    <td>{formatMoney(summaryData.pendingTotal)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="dead-agents-row">
                <span><strong>DEAD / AGENTS / MANAGERS</strong></span>
                <span className="value">{summaryData.deadAccounts} / {summaryData.agentsManagers}</span>
              </div>
            </div>

            {/* Customer Table Section */}
            <div className="customer-section">
              <div className="section-header">
                <h3>Customer</h3>
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="table-container scrollable">
                <table className="data-table customer-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Name</th>
                      <th>Phone Number</th>
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
                    {filteredData.map((customer, idx) => (
                      <tr key={idx}>
                        <td><strong>{customer.username}</strong></td>
                        <td>{customer.name}</td>
                        <td>{customer.phoneNumber}</td>
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
