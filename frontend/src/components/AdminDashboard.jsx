import React from 'react';
import { hasViewPermission } from '../utils/adminPermissions';

function AdminDashboard({ onMenuClick, onOpenScoreboard, role = 'admin', layoutPref = 'tiles', isMobile = false, permissions = null }) {
  // ... menuItems definitions (kept same) ...
  const menuItems = [
    // Row 1 - Teal
    { id: 'weekly-figures', label: 'Weekly Figures', icon: 'fa-solid fa-chart-line', color: 'teal', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'pending', label: 'Pending', icon: 'fa-solid fa-calendar-check', color: 'teal', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'messaging', label: 'Messaging', icon: 'fa-solid fa-envelope', color: 'teal', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'game-admin', label: 'Game Admin', icon: 'fa-solid fa-gamepad', color: 'teal', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'customer-admin', label: 'Customer Admin', icon: 'fa-solid fa-user-shield', color: 'teal', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'agent-manager', label: 'Agent Management', icon: 'fa-solid fa-users-gear', color: 'teal', roles: ['admin', 'master_agent', 'super_agent'] },
    { id: 'cashier', label: 'Cashier', icon: 'fa-solid fa-money-bill-wave', color: 'teal', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },

    // Row 2 - Light Gray/Blue
    { id: 'third-party-limits', label: '3rd Party Limits', icon: 'fa-solid fa-lock', color: 'light-gray', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'add-customer', label: 'Add Customer', icon: 'fa-solid fa-user-plus', color: 'light-gray', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'props', label: 'Props / Betting', icon: 'fa-solid fa-bullseye', color: 'light-blue', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'agent-performance', label: 'Agent Performance', icon: 'fa-solid fa-list-check', color: 'light-blue', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'analysis', label: 'Analysis', icon: 'fa-solid fa-arrow-trend-up', color: 'light-blue', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'ip-tracker', label: 'IP Tracker', icon: 'fa-solid fa-globe', color: 'light-blue', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },

    // Row 3 - Blue/Orange
    { id: 'collections', label: 'Collections', icon: 'fa-solid fa-box-archive', color: 'light-blue', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'deleted-wagers', label: 'Deleted Wagers', icon: 'fa-solid fa-trash', color: 'light-blue', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'games-events', label: 'Games & Events', icon: 'fa-solid fa-calendar-days', color: 'orange', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'sportsbook-links', label: 'Sportsbook Links', icon: 'fa-solid fa-lines-leaning', color: 'orange', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'bet-ticker', label: 'Bet Ticker', icon: 'fa-solid fa-clock', color: 'orange', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'ticketwriter', label: 'TicketWriter', icon: 'fa-solid fa-pen-to-square', color: 'orange', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },

    // Row 4 - Green/Gray/Black
    { id: 'scores', label: 'Scores', icon: 'fa-solid fa-trophy', color: 'orange', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'master-agent-admin', label: 'Master Agent Admin', icon: 'fa-solid fa-user-tie', color: 'green', roles: ['admin', 'master_agent', 'super_agent'] },
    { id: 'billing', label: 'Billing', icon: 'fa-solid fa-sack-dollar', color: 'green', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'settings', label: 'Settings', icon: 'fa-solid fa-gear', color: 'green', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'rules', label: 'Rules', icon: 'fa-solid fa-list-check', color: 'green', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'feedback', label: 'Feedback', icon: 'fa-solid fa-wrench', color: 'light-gray', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
    { id: 'faq', label: 'FAQ', icon: 'fa-solid fa-circle-question', color: 'black', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },

    // Row 5 - Black
    { id: 'user-manual', label: 'User Manual', icon: 'fa-solid fa-book', color: 'black', roles: ['admin', 'agent', 'master_agent', 'super_agent'] },
  ];

  const filteredItems = menuItems.filter(
    (item) => item.roles && item.roles.includes(role) && hasViewPermission(role, permissions, item.id)
  );

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
            onClick={() => {
              if (item.id === 'scores' && typeof onOpenScoreboard === 'function') {
                onOpenScoreboard();
                return;
              }
              onMenuClick(item.id);
            }}
          >
            <div className="card-icon"><i className={item.icon}></i></div>
            <div className="card-label">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
