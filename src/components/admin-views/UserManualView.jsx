import React from 'react';

function UserManualView() {
  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>User Manual</h2>
      </div>
      <div className="view-content">
        <div className="manual-container">
          <section className="manual-section">
            <h3>Getting Started</h3>
            <p>Welcome to the Sports Betting Admin Panel. This comprehensive guide will help you navigate and manage all aspects of the platform.</p>
          </section>

          <section className="manual-section">
            <h3>Dashboard Overview</h3>
            <p>The main dashboard provides quick access to key metrics and functions:</p>
            <ul>
              <li><strong>Weekly Figures:</strong> View revenue and betting statistics</li>
              <li><strong>Pending Items:</strong> Manage pending transactions and requests</li>
              <li><strong>Customer Management:</strong> Add and manage customer accounts</li>
              <li><strong>Cashier:</strong> Handle deposits and withdrawals</li>
            </ul>
          </section>

          <section className="manual-section">
            <h3>Managing Customers</h3>
            <p>Use the Customer Admin section to:</p>
            <ul>
              <li>View all registered customers</li>
              <li>Check customer account balance</li>
              <li>Suspend or activate accounts</li>
              <li>View customer betting history</li>
            </ul>
          </section>

          <section className="manual-section">
            <h3>Handling Transactions</h3>
            <p>The Cashier section allows you to:</p>
            <ul>
              <li>Process deposits and withdrawals</li>
              <li>View transaction history</li>
              <li>Track pending transactions</li>
              <li>Generate financial reports</li>
            </ul>
          </section>

          <section className="manual-section">
            <h3>Analysis & Reports</h3>
            <p>Use the Analysis section to:</p>
            <ul>
              <li>View betting trends</li>
              <li>Analyze customer behavior</li>
              <li>Generate revenue reports</li>
              <li>Identify risk factors</li>
            </ul>
          </section>

          <section className="manual-section">
            <h3>Settings & Configuration</h3>
            <p>Configure platform settings including:</p>
            <ul>
              <li>Bet limits and restrictions</li>
              <li>Security preferences</li>
              <li>Email notifications</li>
              <li>Maintenance mode</li>
            </ul>
          </section>

          <section className="manual-section">
            <h3>Support & Help</h3>
            <p>For additional help, please contact our support team at support@sportsbet.com or use the in-app messaging feature.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default UserManualView;
