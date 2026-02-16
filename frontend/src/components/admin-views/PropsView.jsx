import React, { useEffect, useState } from 'react';
import { API_URL, createAdminBet, getAdminBets, getAdminMatches } from '../../api';

function PropsView() {
  const [activeTab, setActiveTab] = useState('agents');
  const [searchAgent, setSearchAgent] = useState('');
  const [searchPlayer, setSearchPlayer] = useState('');
  const [amountFilter, setAmountFilter] = useState('any');
  const [timeFilter, setTimeFilter] = useState('today');
  const [typeFilter, setTypeFilter] = useState('all-types');

  const [bettingData, setBettingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createBet, setCreateBet] = useState({
    userId: '',
    matchId: '',
    amount: 50,
    odds: 1.9,
    type: 'straight',
    selection: '',
    status: 'pending'
  });

  const parseMoney = (value) => Number(String(value).replace(/[^0-9.-]+/g, '')) || 0;
  const getBetType = (bet) => {
    if (bet?.type) return bet.type;
    const text = (bet?.description || '').toLowerCase();
    if (text.includes('parlay')) return 'parlay';
    if (text.includes('teaser')) return 'teaser';
    return 'straight';
  };
  const filteredData = bettingData
    .filter(bet => {
      const agentMatch = bet.agent.toLowerCase().includes(searchAgent.toLowerCase());
      const customerMatch = bet.customer.toLowerCase().includes(searchPlayer.toLowerCase());
      const riskValue = parseMoney(bet.risk);
      const typeMatch = typeFilter === 'all-types' || getBetType(bet) === typeFilter;
      return agentMatch && customerMatch && typeMatch && (amountFilter === 'any' || riskValue >= 0);
    })
    .sort((a, b) => {
      if (activeTab === 'agents') return a.agent.localeCompare(b.agent);
      return a.customer.localeCompare(b.customer);
    });

  const totals = filteredData.reduce(
    (acc, bet) => {
      acc.risk += parseMoney(bet.risk);
      acc.toWin += parseMoney(bet.toWin);
      return acc;
    },
    { risk: 0, toWin: 0 }
  );

  const handleResetFilters = () => {
    setSearchAgent('');
    setSearchPlayer('');
    setAmountFilter('any');
    setTimeFilter('today');
    setTypeFilter('all-types');
  };

  const loadBets = async (params) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setBettingData([]);
        setError('Please login to load bets.');
        return;
      }
      const response = await getAdminBets(params, token);
      const mapped = response.bets.map(bet => ({
        ...bet,
        risk: `$${Number(bet.risk || 0).toLocaleString()}`,
        toWin: `$${Number(bet.toWin || 0).toLocaleString()}`,
        accepted: new Date(bet.accepted).toLocaleString()
      }));
      setBettingData(mapped);
      setError('');
    } catch (err) {
      console.error('Error loading bets:', err);
      setError(err.message || 'Failed to load bets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBets({ time: timeFilter, type: typeFilter, amount: amountFilter });
    const loadReferenceData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const [usersData, matchesData] = await Promise.all([
          fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
          getAdminMatches(token)
        ]);
        setCustomers(usersData || []);
        setMatches(matchesData || []);
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    };

    loadReferenceData();
    const interval = setInterval(() => {
      loadBets({
        agent: searchAgent,
        customer: searchPlayer,
        amount: amountFilter,
        time: timeFilter,
        type: typeFilter
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [searchAgent, searchPlayer, amountFilter, timeFilter, typeFilter]);

  const handleCreateBet = async () => {
    try {
      setCreateLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to create bets.');
        return;
      }
      const payload = {
        userId: createBet.userId,
        matchId: createBet.matchId,
        amount: Number(createBet.amount) || 0,
        odds: Number(createBet.odds) || 0,
        type: createBet.type,
        selection: createBet.selection.trim(),
        status: createBet.status
      };
      await createAdminBet(payload, token);
      setCreateBet({
        userId: '',
        matchId: '',
        amount: 50,
        odds: 1.9,
        type: 'straight',
        selection: '',
        status: 'pending'
      });
      setError('');
      loadBets({
        agent: searchAgent,
        customer: searchPlayer,
        amount: amountFilter,
        time: timeFilter,
        type: typeFilter
      });
    } catch (err) {
      console.error('Error creating bet:', err);
      setError(err.message || 'Failed to create bet');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSearch = () => {
    loadBets({
      agent: searchAgent,
      customer: searchPlayer,
      amount: amountFilter,
      time: timeFilter,
      type: typeFilter
    });
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Props / Betting Management</h2>
      </div>

      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading bets...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
          <>
            <div className="filter-section">
              <div className="filter-group">
                <label>Customer</label>
                <select value={createBet.userId} onChange={(e) => setCreateBet(prev => ({ ...prev, userId: e.target.value }))}>
                  <option value="">Select customer</option>
                  {customers.map(customer => (
                    <option key={customer.id || customer._id} value={customer.id || customer._id}>
                      {customer.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Match</label>
                <select value={createBet.matchId} onChange={(e) => setCreateBet(prev => ({ ...prev, matchId: e.target.value }))}>
                  <option value="">Select match</option>
                  {matches.map(match => (
                    <option key={match.id} value={match.id}>
                      {match.homeTeam} vs {match.awayTeam}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Amount</label>
                <input
                  type="number"
                  value={createBet.amount}
                  onChange={(e) => setCreateBet(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Odds</label>
                <input
                  type="number"
                  step="0.01"
                  value={createBet.odds}
                  onChange={(e) => setCreateBet(prev => ({ ...prev, odds: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Type</label>
                <select value={createBet.type} onChange={(e) => setCreateBet(prev => ({ ...prev, type: e.target.value }))}>
                  <option value="straight">Straight</option>
                  <option value="parlay">Parlay</option>
                  <option value="teaser">Teaser</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Selection</label>
                <input
                  type="text"
                  placeholder="Selection"
                  value={createBet.selection}
                  onChange={(e) => setCreateBet(prev => ({ ...prev, selection: e.target.value }))}
                />
              </div>
              <button
                className="btn-primary"
                onClick={handleCreateBet}
                disabled={createLoading || !createBet.userId || !createBet.matchId || !createBet.selection.trim()}
              >
                {createLoading ? 'Saving...' : 'Create Bet'}
              </button>
            </div>

            <div className="stats-container">
              <div className="stat-card">
                <h3>Total Tickets</h3>
                <div className="amount">{filteredData.length}</div>
                <p className="change">Filtered by current criteria</p>
              </div>
              <div className="stat-card">
                <h3>Total Risk</h3>
                <div className="amount">${totals.risk.toLocaleString()}</div>
                <p className="change">Across all tickets</p>
              </div>
              <div className="stat-card">
                <h3>Total To Win</h3>
                <div className="amount">${totals.toWin.toLocaleString()}</div>
                <p className="change">Potential payouts</p>
              </div>
              <div className="stat-card">
                <h3>Average Risk</h3>
                <div className="amount">${(filteredData.length ? totals.risk / filteredData.length : 0).toFixed(0)}</div>
                <p className="change">Per ticket</p>
              </div>
            </div>
            {/* Filter Section */}
            <div className="filter-section">
              <div className="filter-group">
                <label>Agents</label>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchAgent}
                  onChange={(e) => setSearchAgent(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-group">
                <label>Players</label>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchPlayer}
                  onChange={(e) => setSearchPlayer(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-group">
                <label>Amount</label>
                <select value={amountFilter} onChange={(e) => setAmountFilter(e.target.value)}>
                  <option value="any">Any Amount</option>
                  <option value="under-100">Under $100</option>
                  <option value="100-500">$100 - $500</option>
                  <option value="500-1000">$500 - $1000</option>
                  <option value="over-1000">Over $1000</option>
                </select>
              </div>

              <button className="btn-primary" onClick={handleSearch}>Search</button>
              <button className="btn-secondary" onClick={handleResetFilters}>Reset Filters</button>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
              <button
                className={`tab ${activeTab === 'agents' ? 'active' : ''}`}
                onClick={() => setActiveTab('agents')}
              >
                Agents
              </button>
              <button
                className={`tab ${activeTab === 'players' ? 'active' : ''}`}
                onClick={() => setActiveTab('players')}
              >
                Players
              </button>
            </div>

            {/* Additional Filters */}
            <div className="additional-filters">
              <div className="filter-group">
                <label>Time</label>
                <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Type</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="all-types">All Types</option>
                  <option value="straight">Straight</option>
                  <option value="parlay">Parlay</option>
                  <option value="teaser">Teaser</option>
                </select>
              </div>
            </div>

            {/* Betting Table */}
            <div className="table-container scrollable">
              <table className="data-table betting-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Customer</th>
                    <th>Accepted (EST)</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Risk</th>
                    <th>To Win</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((bet, idx) => (
                    <tr key={idx}>
                      <td><strong>{bet.agent}</strong></td>
                      <td><strong>{bet.customer}</strong></td>
                      <td>{bet.accepted}</td>
                      <td><span className={`badge ${getBetType(bet)}`}>{getBetType(bet)}</span></td>
                      <td className="description-cell">
                        {bet.description.split('\n').map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </td>
                      <td><span className="amount-risk">{bet.risk}</span></td>
                      <td><span className="amount-towin">{bet.toWin}</span></td>
                      <td><span className={`badge ${bet.status}`}>{bet.status}</span></td>
                      <td><button className="btn-delete">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="summary-footer">
              <span>Total Records: {filteredData.length}</span>
              <span className="risk-summary">
                Risking: <span className="amount-risk">${totals.risk.toLocaleString()}</span>
                To Win: <span className="amount-towin">${totals.toWin.toLocaleString()}</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PropsView;
