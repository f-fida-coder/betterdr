import React from 'react';

function AdminDashboard({ onMenuClick, role = 'admin', layoutPref = 'tiles', isMobile = false }) {
  // ... menuItems definitions (kept same) ...
  const menuItems = [
    // Row 1 - Teal
    { id: 'weekly-figures', label: 'Weekly Figures', icon: '📊', color: 'teal', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'pending', label: 'Pending', icon: '📋', color: 'teal', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'messaging', label: 'Messaging', icon: '✉️', color: 'teal', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'game-admin', label: 'Game Admin', icon: '🎮', color: 'teal', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'customer-admin', label: 'Customer Admin', icon: '👤', color: 'teal', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'agent-manager', label: 'Agent Management', icon: '👨‍👩‍👧‍👦', color: 'teal', roles: ['admin', 'master_agent'] },
    { id: 'cashier', label: 'Cashier', icon: '💰', color: 'teal', roles: ['admin', 'agent', 'master_agent'] },

    // Row 2 - Light Gray/Blue
    { id: 'add-customer', label: 'Add Customer', icon: '➕', color: 'light-gray', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'third-party-limits', label: '3rd Party Limits', icon: '🔒', color: 'light-gray', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'props', label: 'Props / Betting', icon: '🎯', color: 'light-blue', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'agent-performance', label: 'Agent Performance', icon: '📈', color: 'light-blue', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'analysis', label: 'Analysis', icon: '📉', color: 'light-blue', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'ip-tracker', label: 'IP Tracker', icon: '🌐', color: 'light-blue', roles: ['admin', 'agent', 'master_agent'] },

    // Row 3 - Blue/Orange
    { id: 'collections', label: 'Collections', icon: '📦', color: 'light-blue', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'deleted-wagers', label: 'Deleted Wagers', icon: '🗑️', color: 'light-blue', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'games-events', label: 'Games & Events', icon: '🏟️', color: 'orange', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'sportsbook-links', label: 'Sportsbook Links', icon: '🔗', color: 'orange', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'bet-ticker', label: 'Bet Ticker', icon: '⏱️', color: 'orange', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'ticketwriter', label: 'TicketWriter', icon: '✏️', color: 'orange', roles: ['admin', 'agent', 'master_agent'] },

    // Row 4 - Green/Gray/Black
    { id: 'scores', label: 'Scores', icon: '🏆', color: 'green', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'master-agent-admin', label: 'Master Agent Admin', icon: '👨‍💼', color: 'green', roles: ['admin'] },
    { id: 'billing', label: 'Billing', icon: '💳', color: 'green', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'settings', label: 'Settings', icon: '⚙️', color: 'green', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'rules', label: 'Rules', icon: '📋', color: 'green', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'feedback', label: 'Feedback', icon: '💬', color: 'light-gray', roles: ['admin', 'agent', 'master_agent'] },
    { id: 'faq', label: 'FAQ', icon: '❓', color: 'black', roles: ['admin', 'agent', 'master_agent'] },

    // Row 5 - Black
    { id: 'user-manual', label: 'User Manual', icon: '📖', color: 'black', roles: ['admin', 'agent', 'master_agent'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles && item.roles.includes(role));

  if (isMobile && layoutPref === 'sidebar') {
    return (
      <div className="admin-dashboard">
        <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
          <h2>Welcome</h2>
          <p>Select an option from the sidebar to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-grid">
        {filteredItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`grid-card ${item.color}`}
            onClick={() => onMenuClick(item.id)}
          >
            <div className="card-icon">{item.icon}</div>
            <div className="card-label">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
