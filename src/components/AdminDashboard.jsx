import React from 'react';

function AdminDashboard({ onMenuClick, role = 'admin' }) {
  const menuItems = [
    // Row 1 - Teal
    { id: 'weekly-figures', label: 'Weekly Figures', icon: '📊', color: 'teal', roles: ['admin'] },
    { id: 'pending', label: 'Pending', icon: '📋', color: 'teal', roles: ['admin', 'agent'] },
    { id: 'messaging', label: 'Messaging', icon: '✉️', color: 'teal', roles: ['admin'] },
    { id: 'game-admin', label: 'Game Admin', icon: '🎮', color: 'teal', roles: ['admin'] },
    { id: 'customer-admin', label: 'Customer Admin', icon: '👤', color: 'teal', roles: ['admin', 'agent'] },
    { id: 'cashier', label: 'Cashier', icon: '💰', color: 'teal', roles: ['admin'] },
    
    // Row 2 - Light Gray/Blue
    { id: 'add-customer', label: 'Add Customer', icon: '➕', color: 'light-gray', roles: ['admin', 'agent'] },
    { id: 'third-party-limits', label: '3rd Party Limits', icon: '🔒', color: 'light-gray', roles: ['admin'] },
    { id: 'props', label: 'Props / Betting', icon: '🎯', color: 'light-blue', roles: ['admin'] },
    { id: 'agent-performance', label: 'Agent Performance', icon: '📈', color: 'light-blue', roles: ['admin'] },
    { id: 'analysis', label: 'Analysis', icon: '📉', color: 'light-blue', roles: ['admin'] },
    { id: 'ip-tracker', label: 'IP Tracker', icon: '🌐', color: 'light-blue', roles: ['admin'] },
    
    // Row 3 - Blue/Orange
    { id: 'collections', label: 'Collections', icon: '📦', color: 'light-blue', roles: ['admin'] },
    { id: 'deleted-wagers', label: 'Deleted Wagers', icon: '🗑️', color: 'light-blue', roles: ['admin'] },
    { id: 'games-events', label: 'Games & Events', icon: '🏟️', color: 'orange', roles: ['admin'] },
    { id: 'sportsbook-links', label: 'Sportsbook Links', icon: '🔗', color: 'orange', roles: ['admin'] },
    { id: 'bet-ticker', label: 'Bet Ticker', icon: '⏱️', color: 'orange', roles: ['admin'] },
    { id: 'ticketwriter', label: 'TicketWriter', icon: '✏️', color: 'orange', roles: ['admin'] },
    
    // Row 4 - Green/Gray/Black
    { id: 'scores', label: 'Scores', icon: '🏆', color: 'green', roles: ['admin'] },
    { id: 'agent-admin', label: 'Agent Admin', icon: '👨‍💼', color: 'green', roles: ['admin'] },
    { id: 'billing', label: 'Billing', icon: '💳', color: 'green', roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: '⚙️', color: 'green', roles: ['admin'] },
    { id: 'rules', label: 'Rules', icon: '📋', color: 'green', roles: ['admin'] },
    { id: 'feedback', label: 'Feedback', icon: '💬', color: 'light-gray', roles: ['admin'] },
    { id: 'faq', label: 'FAQ', icon: '❓', color: 'black', roles: ['admin'] },
    
    // Row 5 - Black
    { id: 'user-manual', label: 'User Manual', icon: '📖', color: 'black', roles: ['admin', 'agent'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles && item.roles.includes(role));

  return (
    <div className="admin-dashboard">
      <div className="dashboard-grid">
        {filteredItems.map(item => (
          <button
            key={item.id}
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
