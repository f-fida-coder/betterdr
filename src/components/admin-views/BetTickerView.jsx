import React, { useState, useEffect } from 'react';
import { getAdminBets } from '../../api';

function BetTickerView() {
  const [bets, setBets] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchBets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const data = await getAdminBets({}, token); // Fetch all latest bets

      if (data && Array.isArray(data.bets)) {
        const mappedBets = data.bets.map(b => ({
          id: b._id || b.id,
          user: b.userId?.username || 'Unknown',
          type: b.matchSnapshot?.status === 'live' ? 'LIVE' : 'UPCOMING', // Infer from snapshot or Match
          match: b.description || (b.matchSnapshot ? `${b.matchSnapshot.homeTeam} vs ${b.matchSnapshot.awayTeam}` : 'Unknown Match'),
          bet: `${b.selection} @ ${parseFloat(b.odds).toFixed(2)}`,
          amount: `$${parseFloat(b.amount).toFixed(2)}`,
          odds: parseFloat(b.odds).toFixed(2),
          time: new Date(b.createdAt).toLocaleTimeString(),
          status: b.matchSnapshot?.status === 'live' ? 'LIVE' : 'UPCOMING', // Simplified status mapping
          originalStatus: b.status
        }));
        setBets(mappedBets);
      }
    } catch (error) {
      console.error('Failed to fetch admin bets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
    const interval = setInterval(fetchBets, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

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
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Loading bets...</td></tr>
                ) : filteredBets.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No bets found</td></tr>
                ) : (
                  filteredBets.map(bet => (
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
                  ))
                )}
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
            <span className="value">${bets.reduce((sum, b) => sum + parseFloat(b.amount.replace('$', '')), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="summary-stat">
            <span className="label">Avg Odds</span>
            <span className="value">{bets.length > 0 ? (bets.reduce((sum, b) => sum + parseFloat(b.odds), 0) / bets.length).toFixed(2) : '0.00'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BetTickerView;
