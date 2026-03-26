import React, { useEffect, useState } from 'react';
import { hasViewPermission } from '../utils/adminPermissions';
import { ADMIN_NAV_ITEMS } from '../config/adminNavigation';
import { getAdminHeaderSummary } from '../api';

function AdminDashboard({ onMenuClick, onOpenScoreboard, role = 'admin', layoutPref = 'tiles', isMobile = false, permissions = null }) {
  const effectiveRole = role || 'admin';
  const isAgent = effectiveRole === 'agent';
  const filteredItems = ADMIN_NAV_ITEMS.filter(
    (item) =>
      item.showInDashboard &&
      item.roles &&
      item.roles.includes(effectiveRole) &&
      hasViewPermission(effectiveRole, permissions, item.id)
  );
  const groupedCardColors = ['teal', 'light-blue', 'orange'];

  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!isAgent) return undefined;
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const load = async () => {
      try {
        const data = await getAdminHeaderSummary(token);
        if (!cancelled) setSummary(data);
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      }
    };
    load();
    const intervalId = window.setInterval(load, 15000);
    return () => { cancelled = true; window.clearInterval(intervalId); };
  }, [isAgent]);

  const fmt = (val) => {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    if (Number.isNaN(num)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(num));
  };

  const fmtCount = (val) => {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    if (Number.isNaN(num)) return '—';
    return num.toLocaleString('en-US');
  };

  const signClass = (val) => {
    const num = Number(val);
    if (!val || Number.isNaN(num) || num === 0) return '';
    return num > 0 ? 'positive' : 'negative';
  };

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
      {isAgent && summary && (
        <div className="agent-summary-boxes">
          <div className="agent-summary-box">
            <div className="agent-summary-row">
              <span className="agent-summary-label">Week</span>
              <span className={`agent-summary-value ${signClass(summary.weekNet)}`}>{fmt(summary.weekNet)}</span>
            </div>
            <div className="agent-summary-row">
              <span className="agent-summary-label">Today</span>
              <span className={`agent-summary-value ${signClass(summary.todayNet)}`}>{fmt(summary.todayNet)}</span>
            </div>
          </div>
          <div className="agent-summary-box">
            <div className="agent-summary-row">
              <span className="agent-summary-label">Active Players</span>
              <span className="agent-summary-value highlight">{fmtCount(summary.activeAccounts)}</span>
            </div>
            <div className="agent-summary-row">
              <span className="agent-summary-label">Player Fees</span>
              <span className="agent-summary-value">{fmt(summary.totalOutstanding)}</span>
            </div>
          </div>
          <div className="agent-summary-box">
            <div className="agent-summary-row">
              <span className="agent-summary-label">Agent Collections</span>
              <span className={`agent-summary-value ${signClass(summary.weekNet)}`}>{fmt(summary.weekNet > 0 ? summary.weekNet : 0)}</span>
            </div>
            <div className="agent-summary-row">
              <span className="agent-summary-label">House Collections</span>
              <span className={`agent-summary-value ${signClass(summary.weekNet)}`}>{fmt(summary.weekNet < 0 ? Math.abs(summary.weekNet) : 0)}</span>
            </div>
          </div>
          <div className="agent-summary-box">
            <div className="agent-summary-row">
              <span className="agent-summary-label">Makeup</span>
              <span className={`agent-summary-value ${signClass(-(summary.totalOutstanding || 0))}`}>{fmt(summary.totalOutstanding)}</span>
            </div>
            <div className="agent-summary-row">
              <span className="agent-summary-label">Balance</span>
              <span className={`agent-summary-value ${signClass(summary.totalBalance)}`}>{fmt(summary.totalBalance)}</span>
            </div>
          </div>
        </div>
      )}
      <div className="dashboard-grid">
        {filteredItems.map((item, index) => {
          const colorClass = groupedCardColors[Math.min(Math.floor(index / 8), groupedCardColors.length - 1)];
          return (
          <button
            key={item.id}
            type="button"
            className={`grid-card ${colorClass}`}
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
          );
        })}
      </div>
    </div>
  );
}

export default AdminDashboard;
