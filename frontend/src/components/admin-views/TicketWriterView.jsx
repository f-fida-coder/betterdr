import React, { useEffect, useState } from 'react';
import { API_URL, createTicketWriterBet, getAdminMatches } from '../../api';

function TicketWriterView() {
  const [formData, setFormData] = useState({
    betType: 'straight',
    matchId: '',
    selection: '',
    odds: '1.90',
    amount: '50',
    userId: '',
  });
  const [matches, setMatches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to create tickets.');
      return;
    }
    try {
      setCreateLoading(true);
      await createTicketWriterBet({
        userId: formData.userId,
        matchId: formData.matchId,
        amount: Number(formData.amount) || 0,
        odds: Number(formData.odds) || 0,
        type: formData.betType,
        selection: formData.selection.trim(),
        status: 'pending'
      }, token);
      setFormData({
        betType: 'straight',
        matchId: '',
        selection: '',
        odds: '1.90',
        amount: '50',
        userId: '',
      });
      setError('');
    } catch (err) {
      console.error('Ticket creation failed:', err);
      setError(err.message || 'Failed to create ticket');
    } finally {
      setCreateLoading(false);
    }
  };

  useEffect(() => {
    const loadReference = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to load ticket data.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [matchesData, usersData] = await Promise.all([
          getAdminMatches(token),
          fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
        ]);
        setMatches(matchesData || []);
        setCustomers(usersData || []);
        setError('');
      } catch (err) {
        console.error('Failed to load ticket data:', err);
        setError(err.message || 'Failed to load ticket data');
      } finally {
        setLoading(false);
      }
    };

    loadReference();
  }, []);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Ticket Writer</h2>
        <p className="subtitle">Create custom betting tickets</p>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading ticket data...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <div className="form-container">
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-section">
              <h3>Ticket Details</h3>
              
              <div className="form-group">
                <label>Customer:</label>
                <select name="userId" value={formData.userId} onChange={handleChange} required>
                  <option value="">Select customer</option>
                  {customers.map(customer => (
                    <option key={customer.id || customer._id} value={customer.id || customer._id}>
                      {customer.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Bet Type:</label>
                <select
                  name="betType"
                  value={formData.betType}
                  onChange={handleChange}
                >
                  <option value="straight">Straight</option>
                  <option value="parlay">Parlay</option>
                  <option value="teaser">Teaser</option>
                </select>
              </div>

              <div className="form-group">
                <label>Match:</label>
                <select
                  name="matchId"
                  value={formData.matchId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select match</option>
                  {matches.map(match => (
                    <option key={match.id || match._id} value={match.id || match._id}>
                      {match.homeTeam} vs {match.awayTeam}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Selection:</label>
                <input
                  type="text"
                  name="selection"
                  value={formData.selection}
                  onChange={handleChange}
                  placeholder="e.g., Lakers to win"
                  required
                />
              </div>

              <div className="form-group">
                <label>Odds:</label>
                <input
                  type="number"
                  name="odds"
                  value={formData.odds}
                  onChange={handleChange}
                  placeholder="e.g., 1.95"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Bet Amount:</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="e.g., 100"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={createLoading}>
                {createLoading ? 'Saving...' : 'Create Ticket'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setFormData({
                  betType: 'straight',
                  matchId: '',
                  selection: '',
                  odds: '1.90',
                  amount: '50',
                  userId: '',
                })}
              >
                Clear
              </button>
            </div>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}

export default TicketWriterView;
