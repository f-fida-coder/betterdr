import React from 'react';

function AdminDashboard({ onMenuClick }) {
  const menuItems = [
    // Row 1 - Teal
    { id: 'weekly-figures', label: 'Weekly Figures', icon: '📊', color: 'teal' },
    { id: 'pending', label: 'Pending', icon: '📋', color: 'teal' },
    { id: 'messaging', label: 'Messaging', icon: '✉️', color: 'teal' },
    { id: 'game-admin', label: 'Game Admin', icon: '🎮', color: 'teal' },
    { id: 'customer-admin', label: 'Customer Admin', icon: '👤', color: 'teal' },
    { id: 'cashier', label: 'Cashier', icon: '💰', color: 'teal' },
    
    // Row 2 - Light Gray/Blue
    { id: 'add-customer', label: 'Add Customer', icon: '➕', color: 'light-gray' },
    { id: 'third-party-limits', label: '3rd Party Limits', icon: '🔒', color: 'light-gray' },
    { id: 'props', label: 'Props / Betting', icon: '🎯', color: 'light-blue' },
    { id: 'agent-performance', label: 'Agent Performance', icon: '📈', color: 'light-blue' },
    { id: 'analysis', label: 'Analysis', icon: '📉', color: 'light-blue' },
    { id: 'ip-tracker', label: 'IP Tracker', icon: '🌐', color: 'light-blue' },
    
    // Row 3 - Blue/Orange
    { id: 'collections', label: 'Collections', icon: '📦', color: 'light-blue' },
    { id: 'deleted-wagers', label: 'Deleted Wagers', icon: '🗑️', color: 'light-blue' },
    { id: 'games-events', label: 'Games & Events', icon: '🏟️', color: 'orange' },
    { id: 'sportsbook-links', label: 'Sportsbook Links', icon: '🔗', color: 'orange' },
    { id: 'bet-ticker', label: 'Bet Ticker', icon: '⏱️', color: 'orange' },
    { id: 'ticketwriter', label: 'TicketWriter', icon: '✏️', color: 'orange' },
    
    // Row 4 - Green/Gray/Black
    { id: 'scores', label: 'Scores', icon: '🏆', color: 'green' },
    { id: 'agent-admin', label: 'Agent Admin', icon: '👨‍💼', color: 'green' },
    { id: 'billing', label: 'Billing', icon: '💳', color: 'green' },
    { id: 'settings', label: 'Settings', icon: '⚙️', color: 'green' },
    { id: 'rules', label: 'Rules', icon: '📋', color: 'green' },
    { id: 'feedback', label: 'Feedback', icon: '💬', color: 'light-gray' },
    { id: 'faq', label: 'FAQ', icon: '❓', color: 'black' },
    
    // Row 5 - Black
    { id: 'user-manual', label: 'User Manual', icon: '📖', color: 'black' },
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-grid">
        {menuItems.map(item => (
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
