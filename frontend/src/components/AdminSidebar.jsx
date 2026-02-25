import React from 'react';
import { hasViewPermission } from '../utils/adminPermissions';
import { ADMIN_NAV_ITEMS } from '../config/adminNavigation';

function AdminSidebar({ activeView, onViewChange, onOpenScoreboard, isOpen, role = 'admin', permissions = null }) {
  const effectiveRole = role || 'admin';
  const filteredItems = ADMIN_NAV_ITEMS.filter(
    (item) =>
      item.showInSidebar &&
      item.roles &&
      item.roles.includes(effectiveRole) &&
      hasViewPermission(effectiveRole, permissions, item.id)
  );

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        {filteredItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => {
              if (item.id === 'scores' && typeof onOpenScoreboard === 'function') {
                onOpenScoreboard();
                return;
              }
              onViewChange(item.id);
            }}
            title={item.label}
          >
            <span className="nav-icon">{item.sidebarIcon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
