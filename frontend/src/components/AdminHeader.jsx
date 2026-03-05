import React, { useEffect, useMemo, useState } from 'react';
import { getAdminHeaderSummary, getMe, getMyPlayers, getUsersAdmin } from '../api';
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
  const [headerPlayerOpen, setHeaderPlayerOpen] = useState(false);
  const [searchablePlayers, setSearchablePlayers] = useState([]);
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

        const roleKey = String(meData?.role || role || '').toLowerCase();
        const users = roleKey === 'agent'
          ? await getMyPlayers(token)
          : await getUsersAdmin(token);
        const onlyPlayers = (Array.isArray(users) ? users : []).filter((u) => String(u?.role || '').toLowerCase() === 'user');
        setSearchablePlayers(onlyPlayers);
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
    const query = headerSearchQuery.trim();
    if (!query) return;
    const exact = filteredPlayers.find((player) => String(player.username || '').toLowerCase() === query.toLowerCase());
    if (exact) {
      const userId = exact.id || exact._id || exact.mongo_id;
      if (userId && onViewChange) {
        onViewChange('user-details', userId);
      }
      setHeaderPlayerOpen(false);
      return;
    }
    if (filteredPlayers[0]) {
      const userId = filteredPlayers[0].id || filteredPlayers[0]._id || filteredPlayers[0].mongo_id;
      if (userId && onViewChange) {
        onViewChange('user-details', userId);
      }
      setHeaderPlayerOpen(false);
      return;
    }
    setAgentTreeSearchQuery(query);
    setShowAgentTree(true);
  };

  const filteredPlayers = useMemo(() => {
    const query = headerSearchQuery.trim().toLowerCase();
    if (!query) return searchablePlayers.slice(0, 10);
    return searchablePlayers
      .filter((player) => {
        const username = String(player?.username || '').toLowerCase();
        const fullName = String(
          player?.fullName
          || `${player?.firstName || ''} ${player?.lastName || ''}`.trim()
        ).toLowerCase();
        return username.includes(query) || fullName.includes(query);
      })
      .slice(0, 10);
  }, [searchablePlayers, headerSearchQuery]);

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
            <div
              className="admin-header-player-search"
              onFocus={() => setHeaderPlayerOpen(true)}
              onBlur={() => setTimeout(() => setHeaderPlayerOpen(false), 120)}
            >
              <span className="search-icon" aria-hidden="true">
                <i className="fa-solid fa-magnifying-glass"></i>
              </span>
              <input
                type="text"
                placeholder="Search players..."
                value={headerSearchQuery}
                onChange={(e) => {
                  setHeaderSearchQuery(e.target.value);
                  setHeaderPlayerOpen(true);
                }}
              />
              {headerPlayerOpen && (
                <div className="admin-header-search-list">
                  {filteredPlayers.length > 0 ? filteredPlayers.map((player) => {
                    const userId = player.id || player._id || player.mongo_id;
                    const fullName = player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim();
                    return (
                      <button
                        key={String(userId || player.username)}
                        type="button"
                        className="admin-header-search-item"
                        onClick={() => {
                          if (userId && onViewChange) {
                            onViewChange('user-details', userId);
                          }
                          setHeaderSearchQuery(player.username || '');
                          setHeaderPlayerOpen(false);
                        }}
                      >
                        <span>{String(player.username || '').toUpperCase()}</span>
                        <span>{fullName || '—'}</span>
                      </button>
                    );
                  }) : (
                    <div className="admin-header-search-empty">No matching players</div>
                  )}
                </div>
              )}
            </div>
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
