import React from 'react';

function RulesAdminView() {
  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Rules & Regulations</h2>
        <button className="btn-primary">Add New Rule</button>
      </div>
      <div className="view-content">
        <div className="rules-container">
          <div className="rule-card">
            <h3>Betting Rules</h3>
            <ul>
              <li>Minimum bet amount: $1.00</li>
              <li>Maximum bet amount: $5,000.00</li>
              <li>Maximum odds allowed: 100.00</li>
              <li>Bets must be placed before match start</li>
              <li>Cash-out allowed for live bets</li>
            </ul>
            <button className="btn-small">Edit</button>
          </div>

          <div className="rule-card">
            <h3>Account Rules</h3>
            <ul>
              <li>Daily deposit limit: $10,000</li>
              <li>Weekly withdrawal limit: $50,000</li>
              <li>Account verification required for withdrawals</li>
              <li>Age restriction: 18+ only</li>
              <li>One account per person</li>
            </ul>
            <button className="btn-small">Edit</button>
          </div>

          <div className="rule-card">
            <h3>Bonus Rules</h3>
            <ul>
              <li>Welcome bonus: 100% up to $500</li>
              <li>Bonus code valid for 30 days</li>
              <li>Wagering requirement: 5x bonus amount</li>
              <li>Minimum odds: 1.5</li>
              <li>Not applicable to live bets</li>
            </ul>
            <button className="btn-small">Edit</button>
          </div>

          <div className="rule-card">
            <h3>Withdrawal Rules</h3>
            <ul>
              <li>Processing time: 24-48 hours</li>
              <li>Minimum withdrawal: $10</li>
              <li>Maximum withdrawal: $50,000 per week</li>
              <li>Bank verification required</li>
              <li>Funds must be earned through betting</li>
            </ul>
            <button className="btn-small">Edit</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RulesAdminView;
