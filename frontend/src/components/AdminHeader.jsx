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
  role = 'admin',
  showStats = true
}) {
  const canOpenMobileMenu = typeof onMenuToggle === 'function';
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAgentTree, setShowAgentTree] = useState(false);
  const [showMobilePlayerSearch, setShowMobilePlayerSearch] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [agentTreeSearchQuery, setAgentTreeSearchQuery] = useState('');
  const [headerPlayerOpen, setHeaderPlayerOpen] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [searchablePlayers, setSearchablePlayers] = useState([]);
  const [summary, setSummary] = useState({
    totalBalance: null,
    totalOutstanding: null,
    weekNet: null,
    todayNet: null,
    activeAccounts: null
  });
  const [profile, setProfile] = useState(null);

  const toPlayerList = (users) => (
    Array.isArray(users) ? users : []
  ).filter((u) => {
    const roleKey = String(u?.role || '').toLowerCase();
    return roleKey === '' || roleKey === 'user' || roleKey === 'player';
  });

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
        const onlyPlayers = toPlayerList(users);
        setAllPlayers(onlyPlayers);
        setSearchablePlayers(onlyPlayers);
      } catch (error) {
        console.error('Failed to load admin header summary:', error);
      }
    };

    loadSummary();
  }, []);

  const roundForDisplay = (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (Number.isNaN(num)) return null;
    const rounded = Math.round(num);
    return Object.is(rounded, -0) ? 0 : rounded;
  };

  const formatCurrency = (value) => {
    const rounded = roundForDisplay(value);
    if (rounded === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(rounded);
  };

  const getSignedValueClass = (value) => {
    const rounded = roundForDisplay(value);
    if (rounded === null || rounded === 0) return 'neutral';
    return rounded > 0 ? 'positive' : 'negative';
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
    setShowMobilePlayerSearch(false);
    if (onViewChange) onViewChange(view);
  };

  const openAccountTreeSearch = (seedQuery = '') => {
    setShowUserMenu(false);
    setShowMobilePlayerSearch(false);
    setHeaderPlayerOpen(false);
    setAgentTreeSearchQuery(String(seedQuery || '').trim());
    setShowAgentTree(true);
  };

  const toggleAccountTreeSearch = (seedQuery = '') => {
    setShowUserMenu(false);
    setShowMobilePlayerSearch(false);
    setHeaderPlayerOpen(false);
    setAgentTreeSearchQuery(String(seedQuery || '').trim());
    setShowAgentTree((prev) => !prev);
  };

  const toggleMobilePlayerSearch = () => {
    setShowUserMenu(false);
    setShowAgentTree(false);
    setShowMobilePlayerSearch((prev) => !prev);
  };

  useEffect(() => {
    setHeaderPlayerOpen(showMobilePlayerSearch);
  }, [showMobilePlayerSearch]);

  const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

  const playerMatchesHeaderSearch = (player, rawQuery) => {
    const query = normalizeSearchValue(rawQuery);
    if (!query) return true;

    const userId = normalizeSearchValue(player?.id || player?._id || player?.mongo_id);
    const username = normalizeSearchValue(player?.username);
    const fullName = normalizeSearchValue(
      player?.fullName
      || `${player?.firstName || ''} ${player?.lastName || ''}`.trim()
    );
    const displayPassword = normalizeSearchValue(player?.displayPassword);
    const phone = normalizeSearchValue(player?.phoneNumber);
    const queryDigits = String(rawQuery || '').replace(/\D/g, '');
    const phoneDigits = String(player?.phoneNumber || '').replace(/\D/g, '');

    return userId.includes(query)
      || username.includes(query)
      || fullName.includes(query)
      || displayPassword.includes(query)
      || phone.includes(query)
      || (queryDigits !== '' && phoneDigits.includes(queryDigits));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const query = headerSearchQuery.trim();
    let cancelled = false;
    const timerId = window.setTimeout(async () => {
      if (cancelled) return;

      if (query === '') {
        setSearchablePlayers(allPlayers);
        return;
      }

      try {
        const users = await getUsersAdmin(token, { q: query });
        if (cancelled) return;
        const onlyPlayers = toPlayerList(users);
        setSearchablePlayers(onlyPlayers);
      } catch (error) {
        if (cancelled) return;
        console.warn('Backend player search failed, using local fallback:', error);
        setSearchablePlayers(allPlayers.filter((player) => playerMatchesHeaderSearch(player, query)));
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [allPlayers, headerSearchQuery]);

  const handleHeaderSearchSubmit = (e) => {
    e.preventDefault();
    const query = headerSearchQuery.trim();
    if (!query) return;
    const normalizedQuery = normalizeSearchValue(query);
    const exact = filteredPlayers.find((player) => {
      const username = normalizeSearchValue(player?.username);
      const displayPassword = normalizeSearchValue(player?.displayPassword);
      return username === normalizedQuery || displayPassword === normalizedQuery;
    });
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
    if (!showMobilePlayerSearch) {
      openAccountTreeSearch(query);
    }
  };

  const handleMobilePlayerSearchSubmit = (e) => {
    e.preventDefault();
    const query = headerSearchQuery.trim();
    if (!query) return;

    const normalizedQuery = normalizeSearchValue(query);
    const exact = filteredPlayers.find((player) => {
      const username = normalizeSearchValue(player?.username);
      const displayPassword = normalizeSearchValue(player?.displayPassword);
      return username === normalizedQuery || displayPassword === normalizedQuery;
    });
    const chosenPlayer = exact || filteredPlayers[0] || null;
    if (!chosenPlayer) {
      return;
    }

    const userId = chosenPlayer.id || chosenPlayer._id || chosenPlayer.mongo_id;
    if (userId && onViewChange) {
      onViewChange('user-details', userId);
    }
    setHeaderSearchQuery(chosenPlayer.username || '');
    setHeaderPlayerOpen(false);
    setShowMobilePlayerSearch(false);
  };

  const filteredPlayers = useMemo(() => {
    const query = headerSearchQuery.trim();
    if (!query) return [];
    return searchablePlayers
      .filter((player) => playerMatchesHeaderSearch(player, query))
      .slice(0, 10);
  }, [searchablePlayers, headerSearchQuery]);
  const hasSearchQuery = headerSearchQuery.trim() !== '';

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
  const headerBalance = summary.totalOutstanding;

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
            onClick={toggleMobilePlayerSearch}
            aria-label="Search players"
            title="Search players"
          >
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          </button>
          {canOpenMobileMenu && (
            <button type="button" className="mobile-menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
              ☰
            </button>
          )}
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
              {headerPlayerOpen && hasSearchQuery && (
                <div className="admin-header-search-list">
                  {filteredPlayers.length > 0 ? filteredPlayers.map((player) => {
                    const userId = player.id || player._id || player.mongo_id;
                    const fullName = player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim();
                    const displayPassword = String(player.displayPassword || '').trim().toUpperCase() || '—';
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
                        <span className="search-item-user">{String(player.username || '').toUpperCase()}</span>
                        <span className="search-item-pass">{displayPassword}</span>
                        <span className="search-item-name">{fullName || '—'}</span>
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
                  toggleAccountTreeSearch();
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

      {showMobilePlayerSearch && (
        <div className="mobile-player-search-sheet" role="dialog" aria-label="Player search">
          <form className="mobile-player-search-form" onSubmit={handleMobilePlayerSearchSubmit}>
            <span className="search-icon" aria-hidden="true">
              <i className="fa-solid fa-magnifying-glass"></i>
            </span>
            <input
              type="text"
              autoFocus
              placeholder="Search players..."
              value={headerSearchQuery}
              onChange={(e) => setHeaderSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="mobile-player-search-close"
              onClick={() => setShowMobilePlayerSearch(false)}
              aria-label="Close player search"
            >
              ✕
            </button>
          </form>

          <div className="mobile-player-search-results">
            {!hasSearchQuery ? null : (
              filteredPlayers.length > 0 ? filteredPlayers.map((player) => {
                const userId = player.id || player._id || player.mongo_id;
                const fullName = player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim();
                const displayPassword = String(player.displayPassword || '').trim().toUpperCase() || '—';
                return (
                  <button
                    key={String(userId || player.username)}
                    type="button"
                    className="mobile-player-search-item"
                    onClick={() => {
                      if (userId && onViewChange) {
                        onViewChange('user-details', userId);
                      }
                      setHeaderSearchQuery(player.username || '');
                      setHeaderPlayerOpen(false);
                      setShowMobilePlayerSearch(false);
                    }}
                  >
                    <span className="search-item-user">{String(player.username || '').toUpperCase()}</span>
                    <span className="search-item-pass">{displayPassword}</span>
                    <span className="search-item-name">{fullName || '—'}</span>
                  </button>
                );
              }) : (
                <div className="admin-header-search-empty">No matching players</div>
              )
            )}
          </div>
        </div>
      )}

      {showStats && (
        <div className="admin-header-bottom">
          <div className="admin-stats-grid">
            {/* Row 1 */}
            <div className="stat-box">
              <span className="stat-label">Week</span>
              <span className={`stat-value ${getSignedValueClass(summary.weekNet)}`}>{formatCurrency(summary.weekNet)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Today</span>
              <span className={`stat-value ${getSignedValueClass(summary.todayNet)}`}>{formatCurrency(summary.todayNet)}</span>
            </div>

            {/* Row 2 */}
            <div className="stat-box">
              <span className="stat-label">Active Accts</span>
              <span className="stat-value highlight">{formatCount(summary.activeAccounts)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Balance</span>
              <span className={`stat-value ${getSignedValueClass(headerBalance)}`}>
                {formatCurrency(headerBalance)}
              </span>
            </div>
          </div>
        </div>
      )}

      {showAgentTree && (
        <AgentTreeView
          onClose={() => setShowAgentTree(false)}
          initialQuery={agentTreeSearchQuery}
          onRestoreBaseContext={onRestoreBaseContext}
          canRestoreBaseContext={canRestoreBaseContext}
          baseContextLabel={baseContextLabel}
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
