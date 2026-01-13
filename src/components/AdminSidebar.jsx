import React from 'react';

function AdminSidebar({ activeView, onViewChange, isOpen }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'weekly-figures', label: 'Weekly Figures', icon: '📊' },
    { id: 'pending', label: 'Pending', icon: '📋' },
    { id: 'messaging', label: 'Messaging', icon: '✉️' },
    { id: 'game-admin', label: 'Game Admin', icon: '🎮' },
    { id: 'customer-admin', label: 'Customer Admin', icon: '👤' },
    { id: 'cashier', label: 'Cashier', icon: '💰' },
    { id: 'add-customer', label: 'Add Customer', icon: '➕' },
    { id: 'third-party-limits', label: '3rd Party Limits', icon: '🔒' },
    { id: 'props', label: 'Props / Betting', icon: '🎯' },
    { id: 'agent-performance', label: 'Agent Performance', icon: '📈' },
    { id: 'analysis', label: 'Analysis', icon: '📉' },
    { id: 'ip-tracker', label: 'IP Tracker', icon: '🌐' },
    { id: 'transactions-history', label: 'Transactions History', icon: '📑' },
    { id: 'collections', label: 'Collections', icon: '📦' },
    { id: 'deleted-wagers', label: 'Deleted Wagers', icon: '🗑️' },
    { id: 'games-events', label: 'Games & Events', icon: '🏟️' },
    { id: 'sportsbook-links', label: 'Sportsbook Links', icon: '🔗' },
    { id: 'bet-ticker', label: 'Bet Ticker', icon: '⏱️' },
    { id: 'ticketwriter', label: 'TicketWriter', icon: '✏️' },
    { id: 'scores', label: 'Scores', icon: '🏆' },
    { id: 'agent-admin', label: 'Agent Admin', icon: '👨‍💼' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'rules', label: 'Rules', icon: '📋' },
    { id: 'feedback', label: 'Feedback', icon: '💬' },
    { id: 'faq', label: 'FAQ', icon: '❓' },
    { id: 'user-manual', label: 'User Manual', icon: '📖' },
  ];

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
            title={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
