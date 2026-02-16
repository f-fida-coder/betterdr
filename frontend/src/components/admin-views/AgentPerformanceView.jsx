import React, { useEffect, useState } from 'react';
import { createAgent, getAgentPerformance } from '../../api';

function AgentPerformanceView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [trendFilter, setTrendFilter] = useState('all');
  const [sortBy, setSortBy] = useState('revenue');
  const [period, setPeriod] = useState('30d');
  const [agents, setAgents] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, customers: 0, avgWinRate: 0, upAgents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newAgent, setNewAgent] = useState({ username: '', phoneNumber: '', password: '', fullName: '' });

  const formatMoney = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTrend = trendFilter === 'all' || agent.trend === trendFilter;
      return matchesSearch && matchesTrend;
    })
    .sort((a, b) => {
      if (sortBy === 'customers') return b.customers - a.customers;
      if (sortBy === 'winRate') return b.winRate - a.winRate;
      return b.revenue - a.revenue;
    });

  useEffect(() => {
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
        const mapped = response.agents.map(agent => ({
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

    loadPerformance();
    const interval = setInterval(loadPerformance, 30000);
    return () => clearInterval(interval);
  }, [period, refreshKey]);

  const handleCreateAgent = async () => {
    try {
      setCreateLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to create agents.');
        return;
      }
      await createAgent(newAgent, token);
      setNewAgent({ username: '', phoneNumber: '', password: '', fullName: '' });
      setError('');
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(err.message || 'Failed to create agent');
    } finally {
      setCreateLoading(false);
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
        {!loading && !error && (
          <>
            <div className="filter-section">
              <div className="filter-group">
                <label>Username</label>
                <input
                  type="text"
                  value={newAgent.username}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Agent username"
                />
              </div>
              <div className="filter-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={newAgent.phoneNumber}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="Phone Number"
                />
              </div>
              <div className="filter-group">
                <label>Password</label>
                <input
                  type="password"
                  value={newAgent.password}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="password"
                />
              </div>
              <div className="filter-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={newAgent.fullName}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <button
                className="btn-primary"
                onClick={handleCreateAgent}
                disabled={createLoading || !newAgent.username || !newAgent.phoneNumber || !newAgent.password}
              >
                {createLoading ? 'Saving...' : 'Create Agent'}
              </button>
            </div>

            <div className="stats-container">
              <div className="stat-card">
                <h3>Total Revenue</h3>
                <div className="amount">{formatMoney(summary.revenue)}</div>
                <p className="change">Across filtered agents</p>
              </div>
              <div className="stat-card">
                <h3>Total Customers</h3>
                <div className="amount">{summary.customers}</div>
                <p className="change">Active customer base</p>
              </div>
              <div className="stat-card">
                <h3>Avg. Win Rate</h3>
                <div className="amount">{summary.avgWinRate.toFixed(1)}%</div>
                <p className="change">Selected period</p>
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
                  <option value="customers">Customers</option>
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
                    <th>Customers</th>
                    <th>Win Rate</th>
                    <th>Trend</th>
                    <th>Last Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map(agent => (
                    <tr key={agent.id}>
                      <td><strong>{agent.name}</strong></td>
                      <td><span className={`badge ${agent.tier}`}>{agent.tier}</span></td>
                      <td>{formatMoney(agent.revenue)}</td>
                      <td>{agent.customers}</td>
                      <td>
                        <div className="win-rate">
                          <div className="win-rate-bar">
                            <div className="win-rate-fill" style={{ width: `${Math.min(agent.winRate, 100)}%` }} />
                          </div>
                          <span className="win-rate-value">{agent.winRate.toFixed(1)}%</span>
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
                          <button className="btn-small">View Details</button>
                          <button className="btn-small">Message</button>
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
    </div>
  );
}

export default AgentPerformanceView;
