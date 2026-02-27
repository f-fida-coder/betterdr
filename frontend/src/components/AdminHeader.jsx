import React, { useEffect, useState } from 'react';
import { getAdminHeaderSummary, getMe } from '../api';
import AgentTreeView from './admin-views/AgentTreeView';

function AdminHeader({
  onMenuToggle,
  onLogout,
  onViewChange,
  onSwitchContext,
  onRestoreBaseContext,
  canRestoreBaseContext = false,
  baseContextLabel = 'Admin',
  role = 'admin'
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
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
    if (onLogout) {
      onLogout();
    }
  };

  const handleViewChange = (view) => {
    if (onViewChange) onViewChange(view);
  };

  const handleHeaderSearchSubmit = (e) => {
    e.preventDefault();
    setAgentTreeSearchQuery(headerSearchQuery.trim());
    setShowAgentTree(true);
  };

  const displayName = profile?.username
    ? profile.username.toUpperCase()
    : (
        sessionStorage.getItem(`${role}Username`)
        || sessionStorage.getItem('super_agentUsername')
        || sessionStorage.getItem('agentUsername')
        || sessionStorage.getItem('adminUsername')
        || localStorage.getItem('userRole')
        || 'USER'
      ).toUpperCase();
  const roleKey = (profile?.role || role || 'admin').toLowerCase();
  const roleLabel = roleKey === 'master_agent'
    ? 'MASTER'
    : roleKey === 'super_agent'
      ? 'MASTER'
      : roleKey === 'agent'
        ? 'AGENT'
        : 'ADMIN';
  const mobileUserLabel = displayName;
  const myBalance = profile?.unlimitedBalance ? 'Unlimited' : (profile?.balance ?? null);

  // For Admin, show Total Outstanding from all users. For Agent/User, show their own.
  // const isSuperAdmin = profile?.role === 'admin' || profile?.role === 'super_agent' || profile?.role === 'agent';
  // const outstandingDisplay = isSuperAdmin ? summary.totalOutstanding : (profile?.balanceOwed ?? null);
  // const outstandingLabel = isSuperAdmin ? 'Outstanding Balance' : 'Outstanding';

  return (
    <div className="admin-header">
      <div className="admin-header-top">
        <div className="admin-header-left">
          <button
            type="button"
            className="home-nav-btn"
            onClick={() => handleViewChange('dashboard')}
            aria-label="Go to admin home"
          >
            <i className="fa-solid fa-house" aria-hidden="true"></i>
            <span>Home</span>
          </button>
          <button
            type="button"
            className="mobile-search-toggle"
            onClick={() => {
              setAgentTreeSearchQuery(headerSearchQuery.trim());
              setShowAgentTree(true);
            }}
            aria-label="Search accounts"
            title="Search accounts"
          >
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          </button>
          <button type="button" className="mobile-menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
            ☰
          </button>
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
          <div className="header-actions">
            <button
              type="button"
              className="user-chip"
              onClick={() => setShowUserMenu((prev) => !prev)}
              title="Open account menu"
              aria-expanded={showUserMenu}
            >
              <span className="user-chip-desktop">{roleLabel}: {displayName}</span>
              <span className="user-chip-mobile">{mobileUserLabel}</span>
              <span
                className={`user-chip-caret ${showAgentTree ? 'open' : ''}`}
                aria-hidden="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(false);
                  setShowAgentTree((prev) => !prev);
                }}
              >
                ▼
              </span>
            </button>
            {showUserMenu && (
              <div className="dropdown-menu user-chip-menu">
                <button type="button" onClick={() => { setShowUserMenu(false); handleViewChange('profile'); }}>Profile</button>
                <button type="button" onClick={() => { setShowUserMenu(false); handleViewChange('settings'); }}>Settings</button>
                {canRestoreBaseContext && (
                  <button type="button" onClick={() => { setShowUserMenu(false); onRestoreBaseContext?.(); }}>
                    Back to {baseContextLabel}
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              className="power-logout-btn"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              ⏻
            </button>
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

      {showAgentTree && (
        <AgentTreeView
          onClose={() => setShowAgentTree(false)}
          initialQuery={agentTreeSearchQuery}
          onGo={(id, role) => {
            setShowAgentTree(false);
            if (onSwitchContext) {
              onSwitchContext(id, role);
            }
          }}
        />
      )}
    </div>
  );
}

export default AdminHeader;
