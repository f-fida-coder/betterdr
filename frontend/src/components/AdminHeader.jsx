import React, { useEffect, useState } from 'react';
import { getAdminHeaderSummary, getMe } from '../api';
import AgentTreeView from './admin-views/AgentTreeView';

function AdminHeader({ onMenuToggle, onLogout, onViewChange }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAgentTree, setShowAgentTree] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [agentTreeSearchQuery, setAgentTreeSearchQuery] = useState('');
  const [summary, setSummary] = useState({
    totalBalance: null,
    weekNet: null,
    todayNet: null,
    activeAccounts: null
  });
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadSummary = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const [headerData, meData] = await Promise.all([
          getAdminHeaderSummary(token),
          getMe(token)
        ]);
        setSummary({
          totalBalance: headerData?.totalBalance ?? 0,
          totalOutstanding: headerData?.totalOutstanding ?? 0,
          weekNet: headerData?.weekNet ?? 0,
          todayNet: headerData?.todayNet ?? 0,
          activeAccounts: headerData?.activeAccounts ?? 0
        });
        setProfile(meData || null);
      } catch (error) {
        console.error('Failed to load admin header summary:', error);
      }
    };

    loadSummary();
  }, []);

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatCount = (value) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return num.toLocaleString('en-US');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    setShowDropdown(false);
    if (onLogout) {
      onLogout();
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleViewChange = (view) => {
    setShowDropdown(false);
    if (onViewChange) onViewChange(view);
  };

  const handleHeaderSearchSubmit = (e) => {
    e.preventDefault();
    setAgentTreeSearchQuery(headerSearchQuery.trim());
    setShowAgentTree(true);
  };

  const displayName = profile?.username ? profile.username.toUpperCase() : 'ADMIN';
  const myBalance = profile?.unlimitedBalance ? 'Unlimited' : (profile?.balance ?? null);

  // For Admin, show Total Outstanding from all users. For Agent/User, show their own.
  // const isSuperAdmin = profile?.role === 'admin' || profile?.role === 'super_agent' || profile?.role === 'agent';
  // const outstandingDisplay = isSuperAdmin ? summary.totalOutstanding : (profile?.balanceOwed ?? null);
  // const outstandingLabel = isSuperAdmin ? 'Outstanding Balance' : 'Outstanding';

  return (
    <div className="admin-header">
      <div className="admin-header-top">
        <div className="admin-header-left">
          <button className="mobile-menu-toggle" onClick={onMenuToggle}>
            ☰
          </button>
          <h1 className="admin-title">Admin Manager</h1>
          <form className="admin-header-search" onSubmit={handleHeaderSearchSubmit}>
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder="Search accounts..."
              value={headerSearchQuery}
              onChange={(e) => setHeaderSearchQuery(e.target.value)}
            />
          </form>
        </div>
        <div className="admin-header-right">
          <div className="header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="tree-view-trigger"
              onClick={() => setShowAgentTree(true)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🌳 Agent Tree
            </button>
            <div className="user-menu">
              <button
                className="user-button"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                👤 {displayName} ▼
              </button>
              {showDropdown && (
                <div className="dropdown-menu">
                  <button type="button" onClick={() => handleViewChange('profile')}>👤 Profile</button>
                  <button type="button" onClick={() => handleViewChange('settings')}>⚙️ Settings</button>
                  <button type="button" onClick={handleLogout}>🚪 Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-header-bottom">
        <div className="admin-stats-grid">
          {/* Row 1 */}
          <div className="stat-box">
            <span className="stat-label">Week</span>
            <span className="stat-value green">{formatCurrency(summary.weekNet)}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Today</span>
            <span className="stat-value green">{formatCurrency(summary.todayNet)}</span>
          </div>

          {/* Row 2 */}
          <div className="stat-box">
            <span className="stat-label">Active Accts</span>
            <span className="stat-value highlight">{formatCount(summary.activeAccounts)}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Balance</span>
            <span className="stat-value">{myBalance === 'Unlimited' ? 'Unlimited' : formatCurrency(myBalance)}</span>
          </div>
        </div>
      </div>

      {showLogoutModal && (
        <div className="modal-overlay logout-modal-overlay">
          <div className="modal-content logout-modal">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout from the admin panel?</p>
            <div className="modal-buttons">
              <button className="btn-danger" onClick={confirmLogout}>Yes, Logout</button>
              <button className="btn-secondary" onClick={cancelLogout}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAgentTree && (
        <AgentTreeView
          onClose={() => setShowAgentTree(false)}
          initialQuery={agentTreeSearchQuery}
          onGo={(id, role) => {
            setShowAgentTree(false);
            if (role === 'player') {
              handleViewChange('user-details', id);
            } else {
              // For agents, we might want to go to sub-agent-admin or a specific agent view if created
              handleViewChange('sub-agent-admin', id);
            }
          }}
        />
      )}
    </div>
  );
}

export default AdminHeader;
