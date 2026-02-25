import React from 'react';
import { hasViewPermission } from '../utils/adminPermissions';
import { ADMIN_NAV_ITEMS } from '../config/adminNavigation';

function AdminDashboard({ onMenuClick, onOpenScoreboard, role = 'admin', layoutPref = 'tiles', isMobile = false, permissions = null }) {
  const effectiveRole = role || 'admin';
  const filteredItems = ADMIN_NAV_ITEMS.filter(
    (item) =>
      item.showInDashboard &&
      item.roles &&
      item.roles.includes(effectiveRole) &&
      hasViewPermission(effectiveRole, permissions, item.id)
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
            className={`grid-card ${item.dashboardColor}`}
            onClick={() => {
              if (item.id === 'scores' && typeof onOpenScoreboard === 'function') {
                onOpenScoreboard();
                return;
              }
              onMenuClick(item.id);
            }}
          >
            <div className="card-icon"><i className={item.dashboardIcon}></i></div>
            <div className="card-label">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
