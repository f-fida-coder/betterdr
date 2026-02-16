import React from 'react';

function AdminSidebar({ activeView, onViewChange, isOpen, role = 'admin' }) {

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'weekly-figures', label: 'Weekly Figures', icon: '📊', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'pending', label: 'Pending', icon: '📋', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'messaging', label: 'Messaging', icon: '✉️', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'game-admin', label: 'Game Admin', icon: '🎮', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'customer-admin', label: 'Customer Admin', icon: '👤', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'agent-manager', label: 'Agent Management', icon: '👨‍👩‍👧‍👦', roles: ['admin', 'super_agent', 'master_agent'] },
    { id: 'cashier', label: 'Cashier', icon: '💰', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'add-customer', label: 'Add Customer', icon: '➕', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'third-party-limits', label: '3rd Party Limits', icon: '🔒', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'props', label: 'Props / Betting', icon: '🎯', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'agent-performance', label: 'Agent Performance', icon: '📈', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'analysis', label: 'Analysis', icon: '📉', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'ip-tracker', label: 'IP Tracker', icon: '🌐', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'transactions-history', label: 'Transactions History', icon: '📑', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'collections', label: 'Collections', icon: '📦', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'deleted-wagers', label: 'Deleted Wagers', icon: '🗑️', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'games-events', label: 'Games & Events', icon: '🏟️', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'sportsbook-links', label: 'Sportsbook Links', icon: '🔗', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'bet-ticker', label: 'Bet Ticker', icon: '⏱️', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'ticketwriter', label: 'TicketWriter', icon: '✏️', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'scores', label: 'Scores', icon: '🏆', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'master-agent-admin', label: 'Master Agent Admin', icon: '👨‍💼', roles: ['admin'] },
    { id: 'billing', label: 'Billing', icon: '💳', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'settings', label: 'Settings', icon: '⚙️', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'monitor', label: 'System Monitor', icon: '🖥️', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'rules', label: 'Rules', icon: '📋', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'feedback', label: 'Feedback', icon: '💬', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'faq', label: 'FAQ', icon: '❓', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
    { id: 'user-manual', label: 'User Manual', icon: '📖', roles: ['admin', 'agent', 'super_agent', 'master_agent'] },
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
