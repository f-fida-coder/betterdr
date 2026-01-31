import React from 'react';

function AdminSidebar({ activeView, onViewChange, isOpen, role = 'admin' }) {

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', roles: ['admin', 'agent'] },
    { id: 'weekly-figures', label: 'Weekly Figures', icon: '📊', roles: ['admin'] },
    { id: 'pending', label: 'Pending', icon: '📋', roles: ['admin', 'agent'] },
    { id: 'messaging', label: 'Messaging', icon: '✉️', roles: ['admin'] },
    { id: 'game-admin', label: 'Game Admin', icon: '🎮', roles: ['admin'] },
    { id: 'customer-admin', label: 'Customer Admin', icon: '👤', roles: ['admin', 'agent'] },
    { id: 'cashier', label: 'Cashier', icon: '💰', roles: ['admin'] },
    { id: 'add-customer', label: 'Add Customer', icon: '➕', roles: ['admin', 'agent'] },
    { id: 'third-party-limits', label: '3rd Party Limits', icon: '🔒', roles: ['admin'] },
    { id: 'props', label: 'Props / Betting', icon: '🎯', roles: ['admin'] },
    { id: 'agent-performance', label: 'Agent Performance', icon: '📈', roles: ['admin'] },
    { id: 'analysis', label: 'Analysis', icon: '📉', roles: ['admin'] },
    { id: 'ip-tracker', label: 'IP Tracker', icon: '🌐', roles: ['admin'] },
    { id: 'transactions-history', label: 'Transactions History', icon: '📑', roles: ['admin'] },
    { id: 'collections', label: 'Collections', icon: '📦', roles: ['admin'] },
    { id: 'deleted-wagers', label: 'Deleted Wagers', icon: '🗑️', roles: ['admin'] },
    { id: 'games-events', label: 'Games & Events', icon: '🏟️', roles: ['admin'] },
    { id: 'sportsbook-links', label: 'Sportsbook Links', icon: '🔗', roles: ['admin'] },
    { id: 'bet-ticker', label: 'Bet Ticker', icon: '⏱️', roles: ['admin'] },
    { id: 'ticketwriter', label: 'TicketWriter', icon: '✏️', roles: ['admin'] },
    { id: 'scores', label: 'Scores', icon: '🏆', roles: ['admin'] },
    { id: 'agent-admin', label: 'Agent Admin', icon: '👨‍💼', roles: ['admin'] },
    { id: 'billing', label: 'Billing', icon: '💳', roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: '⚙️', roles: ['admin'] },
    { id: 'monitor', label: 'System Monitor', icon: '🖥️', roles: ['admin'] },
    { id: 'rules', label: 'Rules', icon: '📋', roles: ['admin'] },
    { id: 'feedback', label: 'Feedback', icon: '💬', roles: ['admin'] },
    { id: 'faq', label: 'FAQ', icon: '❓', roles: ['admin'] },
    { id: 'user-manual', label: 'User Manual', icon: '📖', roles: ['admin', 'agent'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles && item.roles.includes(role || 'admin'));

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        {filteredItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => { console.log('AdminSidebar: clicked', item.id); onViewChange(item.id); }}
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
