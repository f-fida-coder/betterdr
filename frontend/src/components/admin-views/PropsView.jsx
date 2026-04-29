import React, { useEffect, useMemo, useState } from 'react';
import { deleteAdminBet, getAdminBets } from '../../api';

function PropsView() {
  const [activeTab, setActiveTab] = useState('agents');
  const [searchAgent, setSearchAgent] = useState('');
  const [searchPlayer, setSearchPlayer] = useState('');
  const [amountFilter, setAmountFilter] = useState('any');
  const [timeFilter, setTimeFilter] = useState('today');
  const [typeFilter, setTypeFilter] = useState('all-types');
  const [statusFilter, setStatusFilter] = useState('all-statuses');

  const [bettingData, setBettingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  const parseMoney = (value) => Number(String(value).replace(/[^0-9.-]+/g, '')) || 0;
  const formatMoney = (value) => `$${Math.round(Number(value || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const matchesAmountRange = (value, range) => {
    if (range === 'any') return true;
    if (range === 'under-100') return value < 100;
    if (range === '100-500') return value >= 100 && value <= 500;
    if (range === '500-1000') return value > 500 && value <= 1000;
    if (range === 'over-1000') return value > 1000;
    return true;
  };

  const getBetType = (bet) => {
    if (bet?.type) return bet.type;
    const text = (bet?.description || '').toLowerCase();
    if (text.includes('parlay')) return 'parlay';
    if (text.includes('teaser')) return 'teaser';
    return 'straight';
  };

  const filteredData = useMemo(() => (
    bettingData
      .filter(bet => {
        const agentMatch = String(bet.agent || '').toLowerCase().includes(searchAgent.toLowerCase());
        const customerMatch = String(bet.customer || '').toLowerCase().includes(searchPlayer.toLowerCase());
        const riskValue = parseMoney(bet.risk);
        const typeMatch = typeFilter === 'all-types' || getBetType(bet) === typeFilter;
        const statusMatch = statusFilter === 'all-statuses' || String(bet.status || '').toLowerCase() === statusFilter;
        return agentMatch && customerMatch && typeMatch && statusMatch && matchesAmountRange(riskValue, amountFilter);
      })
      .sort((a, b) => {
        if (activeTab === 'agents') return String(a.agent || '').localeCompare(String(b.agent || ''));
        return String(a.customer || '').localeCompare(String(b.customer || ''));
      })
  ), [bettingData, searchAgent, searchPlayer, amountFilter, typeFilter, statusFilter, activeTab]);

  const totals = filteredData.reduce(
    (acc, bet) => {
      acc.risk += parseMoney(bet.risk);
      acc.toWin += parseMoney(bet.toWin);
      const status = String(bet.status || 'pending').toLowerCase();
      acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
      return acc;
    },
    { risk: 0, toWin: 0, byStatus: {} }
  );

  const handleResetFilters = () => {
    setSearchAgent('');
    setSearchPlayer('');
    setAmountFilter('any');
    setTimeFilter('today');
    setTypeFilter('all-types');
    setStatusFilter('all-statuses');
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
      const mapped = (response?.bets || []).map(bet => ({
        ...bet,
        agent: String(bet.agent || 'direct'),
        customer: String(bet.customer || bet.username || ''),
        description: String(bet.description || bet.selection || ''),
        risk: Number(bet.risk || 0),
        toWin: Number(bet.toWin || 0),
        event: bet?.match?.homeTeam && bet?.match?.awayTeam ? `${bet.match.homeTeam} vs ${bet.match.awayTeam}` : '—',
        markets: Array.isArray(bet.markets) ? bet.markets : [],
        accepted: bet.accepted ? new Date(bet.accepted).toLocaleString() : '—'
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
    loadBets({ time: timeFilter, type: typeFilter, status: statusFilter });

    const interval = setInterval(() => {
      if (document.hidden) return;
      loadBets({
        agent: searchAgent,
        customer: searchPlayer,
        amount: amountFilter,
        time: timeFilter,
        type: typeFilter,
        status: statusFilter
      });
    }, 90000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadBets({
          agent: searchAgent,
          customer: searchPlayer,
          amount: amountFilter,
          time: timeFilter,
          type: typeFilter,
          status: statusFilter
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [searchAgent, searchPlayer, amountFilter, timeFilter, typeFilter, statusFilter]);

  const handleDeleteBet = async (betId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to delete bets.');
      return;
    }
    if (!window.confirm('Delete this bet? This cannot be undone.')) return;

    try {
      setNotice('');
      setDeleteLoadingId(betId);
      await deleteAdminBet(betId, token);
      setError('');
      setNotice('Bet deleted successfully.');
      await loadBets({
        agent: searchAgent,
        customer: searchPlayer,
        amount: amountFilter,
        time: timeFilter,
        type: typeFilter,
        status: statusFilter
      });
    } catch (err) {
      setError(err.message || 'Failed to delete bet');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleSearch = () => {
    setNotice('');
    loadBets({
      agent: searchAgent,
      customer: searchPlayer,
      amount: amountFilter,
      time: timeFilter,
      type: typeFilter,
      status: statusFilter
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
        {notice && <div style={{ padding: '12px 20px', color: '#15803d', textAlign: 'center', fontWeight: 600 }}>{notice}</div>}
        {!loading && (
          <>
            <div style={{ padding: '16px 20px', border: '1px solid #dbe4f0', borderRadius: '10px', marginBottom: '18px', background: '#f8fbff' }}>
              <strong style={{ display: 'block', marginBottom: '6px' }}>Live Sportsbook Tickets</strong>
              <span style={{ color: '#556274', fontSize: '14px' }}>
                This screen now shows real sportsbook tickets from the `bets` collection only. Manual dummy bet entry has been removed.
              </span>
            </div>

            <div className="stats-container">
              <div className="stat-card">
                <h3>Total Tickets</h3>
                <div className="amount">{filteredData.length}</div>
                <p className="change">Filtered by current criteria</p>
              </div>
              <div className="stat-card">
                <h3>Total Risk</h3>
                <div className="amount">{formatMoney(totals.risk)}</div>
                <p className="change">Across all tickets</p>
              </div>
              <div className="stat-card">
                <h3>Potential Payout</h3>
                <div className="amount">{formatMoney(totals.toWin)}</div>
                <p className="change">Current ticket payout value</p>
              </div>
              <div className="stat-card">
                <h3>Pending / Won / Lost</h3>
                <div className="amount">
                  {(totals.byStatus.pending || 0)} / {(totals.byStatus.won || 0)} / {(totals.byStatus.lost || 0)}
                </div>
                <p className="change">Void: {totals.byStatus.void || 0}</p>
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

              <div className="filter-group">
                <label>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all-statuses">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="void">Void</option>
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
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No sportsbook bets found for the current filters.</td>
                    </tr>
                  ) : filteredData.map((bet) => (
                    <tr key={bet.id}>
                      <td><strong>{bet.agent}</strong></td>
                      <td><strong>{bet.customer}</strong></td>
                      <td>
                        <div>{bet.accepted}</div>
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>{bet.event}</div>
                      </td>
                      <td><span className={`badge ${getBetType(bet)}`}>{getBetType(bet)}</span></td>
                      <td className="description-cell">
                        {String(bet.description || '').split('\n').filter(Boolean).map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                        {bet.markets.length > 0 ? (
                          <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '6px' }}>
                            Markets: {bet.markets.join(', ')}
                          </div>
                        ) : null}
                      </td>
                      <td><span className="amount-risk">{formatMoney(bet.risk)}</span></td>
                      <td><span className="amount-towin">{formatMoney(bet.toWin)}</span></td>
                      <td><span className={`badge ${bet.status}`}>{bet.status}</span></td>
                      <td>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteBet(bet.id)}
                          disabled={deleteLoadingId === bet.id || bet.status !== 'pending'}
                          title={bet.status === 'pending' ? 'Delete bet' : 'Only pending bets can be deleted'}
                        >
                          {deleteLoadingId === bet.id ? '...' : '×'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="summary-footer">
              <span>Total Records: {filteredData.length}</span>
              <span className="risk-summary">
                Risking: <span className="amount-risk">{formatMoney(totals.risk)}</span>
                Potential Payout: <span className="amount-towin">{formatMoney(totals.toWin)}</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PropsView;
