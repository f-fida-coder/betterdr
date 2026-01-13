import React from 'react';

function BetTickerView() {
  const [bets] = React.useState([
    { id: 1, user: 'User123', type: 'LIVE', match: 'Newcastle vs Man City', bet: 'Over 1 Corners in 1st Half', amount: '$100', odds: '2.55', time: '14:30', status: 'LIVE' },
    { id: 2, user: 'User456', type: 'LIVE', match: 'PHX Suns vs MIA Heat', bet: 'Spread +1.0', amount: '$250', odds: '1.90', time: '14:25', status: 'LIVE' },
    { id: 3, user: 'User789', type: 'UPCOMING', match: 'Roma vs Torino', bet: 'Both Teams to Score', amount: '$75', odds: '1.61', time: '14:20', status: 'UPCOMING' },
    { id: 4, user: 'User101', type: 'LIVE', match: 'MIN Timberwolves vs MIL Bucks', bet: 'Total U 227.5', amount: '$150', odds: '1.90', time: '14:15', status: 'LIVE' },
    { id: 5, user: 'User202', type: 'UPCOMING', match: 'Marcos Giron vs Alex Michelsen', bet: 'To Win Match', amount: '$200', odds: '2.00', time: '14:10', status: 'UPCOMING' },
    { id: 6, user: 'User303', type: 'LIVE', match: 'SA Spurs vs OKC Thunder', bet: 'Moneyline', amount: '$125', odds: '3.50', time: '14:05', status: 'LIVE' },
    { id: 7, user: 'User404', type: 'UPCOMING', match: 'Ben Shelton vs Francisco Comesana', bet: 'Parlay - 5 Teams', amount: '$180', odds: '1.25', time: '14:00', status: 'UPCOMING' },
    { id: 8, user: 'User505', type: 'LIVE', match: 'Borussia Dortmund vs Werder Bremen', bet: 'Over 1 Corners 1st Half', amount: '$90', odds: '1.40', time: '13:55', status: 'LIVE' },
  ]);

  const [filterType, setFilterType] = React.useState('all');

  const filteredBets = filterType === 'all' 
    ? bets 
    : bets.filter(b => b.type.toLowerCase() === filterType.toLowerCase());

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Live Bet Ticker</h2>
        <div className="ticker-filter">
          <button 
            className={filterType === 'all' ? 'active' : ''}
            onClick={() => setFilterType('all')}
          >
            All Bets
          </button>
          <button 
            className={filterType === 'live' ? 'active' : ''}
            onClick={() => setFilterType('live')}
          >
            🔴 Live
          </button>
          <button 
            className={filterType === 'upcoming' ? 'active' : ''}
            onClick={() => setFilterType('upcoming')}
          >
            ⏰ Upcoming
          </button>
        </div>
      </div>
      <div className="view-content">
        <div className="ticker-container">
          <div className="table-container scrollable">
            <table className="ticker-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>User</th>
                  <th>Match</th>
                  <th>Bet Details</th>
                  <th>Odds</th>
                  <th>Amount</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBets.map(bet => (
                  <tr key={bet.id} className={`ticker-row ${bet.status.toLowerCase()}`}>
                    <td>
                      <span className={`status-badge ${bet.status.toLowerCase()}`}>
                        {bet.status === 'LIVE' ? '🔴 LIVE' : '⏰ UPCOMING'}
                      </span>
                    </td>
                    <td><strong>{bet.user}</strong></td>
                    <td className="match-cell">{bet.match}</td>
                    <td className="bet-cell">{bet.bet}</td>
                    <td className="odds-cell"><span className="odds-highlight">{bet.odds}</span></td>
                    <td className="amount-cell"><strong>{bet.amount}</strong></td>
                    <td>{bet.time}</td>
                    <td>
                      <button className="btn-tiny">Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Activity Summary */}
        <div className="ticker-summary">
          <div className="summary-stat">
            <span className="label">Live Bets</span>
            <span className="value">{bets.filter(b => b.status === 'LIVE').length}</span>
          </div>
          <div className="summary-stat">
            <span className="label">Total Wagered</span>
            <span className="value">${bets.reduce((sum, b) => sum + parseInt(b.amount.replace('$', '')), 0).toLocaleString()}</span>
          </div>
          <div className="summary-stat">
            <span className="label">Avg Odds</span>
            <span className="value">{(bets.reduce((sum, b) => sum + parseFloat(b.odds), 0) / bets.length).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BetTickerView;
