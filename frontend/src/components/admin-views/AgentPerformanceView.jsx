import React, { useEffect, useState } from 'react';
import { getAgentPerformance, getAgentPerformanceDetails } from '../../api';

function AgentPerformanceView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [trendFilter, setTrendFilter] = useState('all');
  const [sortBy, setSortBy] = useState('revenue');
  const [period, setPeriod] = useState('30d');
  const [agents, setAgents] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, customers: 0, avgWinRate: 0, upAgents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [details, setDetails] = useState(null);

  const formatMoney = (value) => `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const filteredAgents = agents
    .filter((agent) => {
      const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTrend = trendFilter === 'all' || agent.trend === trendFilter;
      return matchesSearch && matchesTrend;
    })
    .sort((a, b) => {
      if (sortBy === 'customers') return b.customers - a.customers;
      if (sortBy === 'winRate') return b.winRate - a.winRate;
      return b.revenue - a.revenue;
    });

  const loadPerformance = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setAgents([]);
        setError('Please login to load performance.');
        return;
      }
      const response = await getAgentPerformance({ period }, token);
      const mapped = (response.agents || []).map((agent) => ({
        ...agent,
        lastActive: agent.lastActive ? new Date(agent.lastActive).toLocaleString() : '—'
      }));
      setAgents(mapped);
      setSummary(response.summary || { revenue: 0, customers: 0, avgWinRate: 0, upAgents: 0 });
      setError('');
    } catch (err) {
      console.error('Error loading agent performance:', err);
      setError(err.message || 'Failed to load agent performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformance();
    const interval = setInterval(loadPerformance, 30000);
    return () => clearInterval(interval);
  }, [period]);

  const handleViewDetails = async (agent) => {
    try {
      setDetailsOpen(true);
      setDetailsLoading(true);
      setDetailsError('');
      setDetails(null);

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please login to view details.');

      const payload = await getAgentPerformanceDetails(agent.id, { period }, token);
      setDetails(payload);
    } catch (err) {
      setDetailsError(err.message || 'Failed to load details');
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Agent Performance</h2>
        <span className="count">{filteredAgents.length} agents</span>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading performance...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && (
          <>
            <div className="stats-container">
              <div className="stat-card">
                <h3>Total Revenue</h3>
                <div className="amount">{formatMoney(summary.revenue)}</div>
                <p className="change">Across filtered agents</p>
              </div>
              <div className="stat-card">
                <h3>Active Customers</h3>
                <div className="amount">{summary.customers}</div>
                <p className="change">1+ bets in last 7 days</p>
              </div>
              <div className="stat-card">
                <h3>Avg. Win Rate</h3>
                <div className="amount">{Number(summary.avgWinRate || 0).toFixed(1)}%</div>
                <p className="change">Active-customer settled bets</p>
              </div>
              <div className="stat-card">
                <h3>Trending Up</h3>
                <div className="amount">{summary.upAgents}</div>
                <p className="change">Agents improving</p>
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-group">
                <label>Agent</label>
                <input
                  type="text"
                  placeholder="Search agent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Trend</label>
                <select value={trendFilter} onChange={(e) => setTrendFilter(e.target.value)}>
                  <option value="all">All Trends</option>
                  <option value="up">Trending Up</option>
                  <option value="stable">Stable</option>
                  <option value="down">Trending Down</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="revenue">Revenue</option>
                  <option value="customers">Active Customers</option>
                  <option value="winRate">Win Rate</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Period</label>
                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Tier</th>
                    <th>Revenue</th>
                    <th>Active / Total Customers</th>
                    <th>Win Rate</th>
                    <th>Trend</th>
                    <th>Last Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id}>
                      <td><strong>{agent.name}</strong></td>
                      <td><span className={`badge ${agent.tier}`}>{agent.tier}</span></td>
                      <td>{formatMoney(agent.revenue)}</td>
                      <td>{agent.customers} / {agent.totalCustomers || 0}</td>
                      <td>
                        <div className="win-rate">
                          <div className="win-rate-bar">
                            <div className="win-rate-fill" style={{ width: `${Math.min(agent.winRate, 100)}%` }} />
                          </div>
                          <span className="win-rate-value">{Number(agent.winRate || 0).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`trend ${agent.trend}`}>
                          {agent.trend === 'up' ? '📈' : agent.trend === 'down' ? '📉' : '➡️'}
                        </span>
                      </td>
                      <td>{agent.lastActive}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-small" onClick={() => handleViewDetails(agent)}>View Details</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {detailsOpen && (
        <div className="modal-overlay" onClick={() => setDetailsOpen(false)}>
          <div className="modal-content" style={{ width: 'min(980px, 95vw)', maxHeight: '86vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Agent Details</h3>
              <button className="btn-secondary" onClick={() => setDetailsOpen(false)}>Close</button>
            </div>

            {detailsLoading && <div style={{ padding: '12px' }}>Loading details...</div>}
            {detailsError && <div style={{ padding: '12px', color: 'red' }}>{detailsError}</div>}

            {details && !detailsLoading && (
              <>
                <div style={{ marginBottom: '14px', fontWeight: 700 }}>
                  {details.agent?.name} | Period: {details.summary?.period?.toUpperCase()}
                </div>

                <div className="stats-container" style={{ marginBottom: '16px' }}>
                  <div className="stat-card">
                    <h3>Active Customers</h3>
                    <div className="amount">{details.summary.activeCustomers} / {details.summary.totalCustomers}</div>
                    <p className="change">1+ bets in last 7 days</p>
                  </div>
                  <div className="stat-card">
                    <h3>Win Rate</h3>
                    <div className="amount">{Number(details.summary.winRate || 0).toFixed(1)}%</div>
                    <p className="change">Settled bets only</p>
                  </div>
                  <div className="stat-card">
                    <h3>Handle / GGR</h3>
                    <div className="amount">{formatMoney(details.summary.totalRisk)} / {formatMoney(details.summary.ggr)}</div>
                    <p className="change">Hold: {Number(details.summary.holdPct || 0).toFixed(1)}%</p>
                  </div>
                  <div className="stat-card">
                    <h3>Bets</h3>
                    <div className="amount">{details.summary.betsPlaced}</div>
                    <p className="change">Settled: {details.summary.settledBets} | Pending: {details.summary.pendingBets}</p>
                  </div>
                </div>

                <div className="table-container" style={{ marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>Top Customers</h4>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Bets</th>
                        <th>Risk</th>
                        <th>Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(details.topCustomers || []).map((row) => (
                        <tr key={row.userId}>
                          <td>{row.username}</td>
                          <td>{row.bets}</td>
                          <td>{formatMoney(row.risk)}</td>
                          <td>{Number(row.winRate || 0).toFixed(1)}%</td>
                        </tr>
                      ))}
                      {(!details.topCustomers || details.topCustomers.length === 0) && (
                        <tr><td colSpan="4">No customer performance data for this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="table-container">
                  <h4 style={{ margin: '0 0 8px 0' }}>Recent Bets</h4>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Accepted</th>
                        <th>Customer</th>
                        <th>Type</th>
                        <th>Selection</th>
                        <th>Risk</th>
                        <th>To Win</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(details.recentBets || []).map((row) => (
                        <tr key={row.id}>
                          <td>{new Date(row.accepted).toLocaleString()}</td>
                          <td>{row.customer}</td>
                          <td>{row.type}</td>
                          <td>{row.selection}</td>
                          <td>{formatMoney(row.risk)}</td>
                          <td>{formatMoney(row.toWin)}</td>
                          <td><span className={`badge ${row.status}`}>{row.status}</span></td>
                        </tr>
                      ))}
                      {(!details.recentBets || details.recentBets.length === 0) && (
                        <tr><td colSpan="7">No bets in this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentPerformanceView;
