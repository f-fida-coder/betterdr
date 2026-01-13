import React, { useState } from 'react';

function PropsView() {
  const [activeTab, setActiveTab] = useState('agents');
  const [searchAgent, setSearchAgent] = useState('');
  const [searchPlayer, setSearchPlayer] = useState('');
  const [amountFilter, setAmountFilter] = useState('any');
  const [timeFilter, setTimeFilter] = useState('today');
  const [typeFilter, setTypeFilter] = useState('all-types');

  const bettingData = [
    {
      agent: 'TRV965',
      customer: 'TRV183',
      password: 'Aiesha2858',
      accepted: 'Jan 5, 2026 11:04 AM',
      description: 'Parlay - 5 Teams\nMinnesota Wild ML -120\nG Dmitikov ML -225\nL Sonego ML -230\nNigeria ML -350\nM Linette ML -475',
      risk: '$1,000',
      toWin: '$4,913'
    },
    {
      agent: 'BLC365',
      customer: 'BLC102',
      password: 'Ricqui1608',
      accepted: 'Jan 5, 2026 4:34 AM',
      description: 'Houston Texans -3 -115',
      risk: '$575',
      toWin: '$500'
    },
    {
      agent: 'AMD365',
      customer: 'AMD113',
      password: 'Leah123',
      accepted: 'Jan 5, 2026 9:26 AM',
      description: 'Detroit Pistons +2 -119',
      risk: '$500',
      toWin: '$500'
    },
    {
      agent: 'TRV365',
      customer: 'TRV183',
      password: 'Aiesha2858',
      accepted: 'Jan 5, 2026 11:56 AM',
      description: 'Nigeria ML -125 - 1st Half',
      risk: '$525',
      toWin: '$500'
    },
    {
      agent: 'DHNC247',
      customer: 'DHN143',
      password: 'TREDVES316',
      accepted: 'Jan 5, 2026 12:25 PM',
      description: 'Ohio St ML -140 - 1st Half',
      risk: '$700',
      toWin: '$500'
    },
    {
      agent: 'STIRN247',
      customer: 'STIRN142',
      password: 'NICBEE-4453',
      accepted: 'Jan 5, 2026 12:38 PM',
      description: 'D Shapovalov ML -130',
      risk: '$650',
      toWin: '$500'
    },
    {
      agent: 'RILEY123',
      customer: 'JGI5',
      password: 'Abel',
      accepted: 'Jan 5, 2026 1:46 PM',
      description: 'Nigeria ML -105\nTeaser: 5 Teams / 7Pts Football',
      risk: '$400',
      toWin: '$875'
    },
    {
      agent: 'TSM247',
      customer: 'TSM193',
      password: 'JACDIC5521',
      accepted: 'Jan 5, 2026 1:00 PM',
      description: 'Miami Florida +3 / Oregon +11 / Los Angeles Rams -3 / Jacksonville Jaguars +8 / New England Patriots +3',
      risk: '$370',
      toWin: '$255'
    },
    {
      agent: 'BUS247',
      customer: 'BUS62713',
      password: 'KEL9833',
      accepted: 'Jan 5, 2026 11:33 AM',
      description: 'Ohio St ML -145',
      risk: '$370',
      toWin: '$255'
    },
    {
      agent: 'NJG365',
      customer: 'NJG363',
      password: 'Dalhir1531',
      accepted: 'Jan 5, 2026 9:18 AM',
      description: 'T7564382 | Basketball NBA Nica Zubac (LAC) 5+ Total Rebounds | Basketball NBA Handicap Win. DET (+6.5) (NY $ DET)',
      risk: '$250',
      toWin: '$372'
    },
    {
      agent: 'TXS365',
      customer: 'TXS105',
      password: 'Tripper407',
      accepted: 'Jan 5, 2026 10:20 AM',
      description: 'USC/Michigan St U 151 -110',
      risk: '$275',
      toWin: '$256'
    },
    {
      agent: 'MVU365',
      customer: 'MVU145',
      password: 'anitpa2096',
      accepted: 'Jan 5, 2026 10:36 AM',
      description: 'Ohio St ML -145',
      risk: '$362',
      toWin: '$250'
    }
  ];

  const filteredData = bettingData.filter(bet => {
    const agentMatch = bet.agent.toLowerCase().includes(searchAgent.toLowerCase());
    const customerMatch = bet.customer.toLowerCase().includes(searchPlayer.toLowerCase());
    return agentMatch && customerMatch;
  });

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Props / Betting Management</h2>
      </div>

      <div className="view-content">
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

          <button className="btn-primary">Search</button>
          <button className="btn-secondary">Settings</button>
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
                <th>Password</th>
                <th>Accepted (EST)</th>
                <th>Description</th>
                <th>Risk</th>
                <th>To Win</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((bet, idx) => (
                <tr key={idx}>
                  <td><strong>{bet.agent}</strong></td>
                  <td><strong>{bet.customer}</strong></td>
                  <td>{bet.password}</td>
                  <td>{bet.accepted}</td>
                  <td className="description-cell">
                    {bet.description.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </td>
                  <td><span className="amount-risk">{bet.risk}</span></td>
                  <td><span className="amount-towin">{bet.toWin}</span></td>
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
            Risking: <span className="amount-risk">${filteredData.reduce((sum, b) => sum + parseInt(b.risk.replace(/\D/g, '')), 0).toLocaleString()}</span>
            To Win: <span className="amount-towin">${filteredData.reduce((sum, b) => sum + parseInt(b.toWin.replace(/\D/g, '')), 0).toLocaleString()}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default PropsView;
