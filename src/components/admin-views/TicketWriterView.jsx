import React, { useState } from 'react';

function TicketWriterView() {
  const [formData, setFormData] = useState({
    betType: 'single',
    sport: 'nba',
    match: '',
    selection: '',
    odds: '',
    amount: '',
    customer: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Ticket created:', formData);
    alert('Ticket created successfully!');
    setFormData({
      betType: 'single',
      sport: 'nba',
      match: '',
      selection: '',
      odds: '',
      amount: '',
      customer: '',
    });
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Ticket Writer</h2>
        <p className="subtitle">Create custom betting tickets</p>
      </div>
      <div className="view-content">
        <div className="form-container">
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-section">
              <h3>Ticket Details</h3>
              
              <div className="form-group">
                <label>Customer:</label>
                <input
                  type="text"
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                  placeholder="Enter customer username"
                  required
                />
              </div>

              <div className="form-group">
                <label>Bet Type:</label>
                <select
                  name="betType"
                  value={formData.betType}
                  onChange={handleChange}
                >
                  <option value="single">Single</option>
                  <option value="parlay">Parlay</option>
                  <option value="teaser">Teaser</option>
                  <option value="round-robin">Round Robin</option>
                </select>
              </div>

              <div className="form-group">
                <label>Sport:</label>
                <select
                  name="sport"
                  value={formData.sport}
                  onChange={handleChange}
                >
                  <option value="nba">NBA</option>
                  <option value="nfl">NFL</option>
                  <option value="mlb">MLB</option>
                  <option value="soccer">Soccer</option>
                  <option value="tennis">Tennis</option>
                </select>
              </div>

              <div className="form-group">
                <label>Match:</label>
                <input
                  type="text"
                  name="match"
                  value={formData.match}
                  onChange={handleChange}
                  placeholder="e.g., Lakers vs Celtics"
                  required
                />
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
              <button type="submit" className="btn-primary">Create Ticket</button>
              <button type="reset" className="btn-secondary">Clear</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TicketWriterView;
