import React, { useEffect, useMemo, useState } from 'react';
import { getAdminHeaderSummary, getAgents, getMe, getMyPlayers, getUsersAdmin, linkedAgentName } from '../api';
import AgentTreeView from './admin-views/AgentTreeView';
import { annotateDuplicatePlayers } from '../utils/duplicatePlayers';

const createDefaultHeaderSummary = () => ({
  totalBalance: 0,
  totalOutstanding: 0,
  totalPlayerFees: 0,
  paidPlayerFees: 0,
  unpaidPlayerFees: 0,
  weekNet: 0,
  todayNet: 0,
  activeAccounts: 0,
  agentDeposits: 0,
  agentWithdrawals: 0,
  houseDeposits: 0,
  houseWithdrawals: 0,
  agentPercent: null,
  agentCollections: 0,
  houseCollections: 0,
  netCollections: 0,
  commissionableProfit: 0,
  agentSplit: 0,
  kickToHouse: 0,
  houseProfit: 0,
  previousMakeup: 0,
  makeupReduction: 0,
  weeklyMakeupAddition: 0,
  cumulativeMakeup: 0,
  previousBalanceOwed: 0,
  fundingAdjustment: 0,
  balanceOwed: 0,
  sportsbookHealth: null
});

const normalizeHeaderSummary = (headerData = null) => ({
  totalBalance: headerData?.totalBalance ?? 0,
  totalOutstanding: headerData?.totalOutstanding ?? 0,
  totalPlayerFees: headerData?.totalPlayerFees ?? 0,
  paidPlayerFees: headerData?.paidPlayerFees ?? 0,
  unpaidPlayerFees: headerData?.unpaidPlayerFees ?? 0,
  weekNet: headerData?.weekNet ?? 0,
  todayNet: headerData?.todayNet ?? 0,
  activeAccounts: headerData?.activeAccounts ?? 0,
  agentDeposits: headerData?.agentDeposits ?? 0,
  agentWithdrawals: headerData?.agentWithdrawals ?? 0,
  houseDeposits: headerData?.houseDeposits ?? 0,
  houseWithdrawals: headerData?.houseWithdrawals ?? 0,
  agentPercent: headerData?.agentPercent ?? null,
  agentCollections: headerData?.agentCollections ?? 0,
  houseCollections: headerData?.houseCollections ?? 0,
  netCollections: headerData?.netCollections ?? 0,
  commissionableProfit: headerData?.commissionableProfit ?? 0,
  agentSplit: headerData?.agentSplit ?? 0,
  kickToHouse: headerData?.kickToHouse ?? 0,
  houseProfit: headerData?.houseProfit ?? 0,
  previousMakeup: headerData?.previousMakeup ?? 0,
  makeupReduction: headerData?.makeupReduction ?? 0,
  weeklyMakeupAddition: headerData?.weeklyMakeupAddition ?? 0,
  cumulativeMakeup: headerData?.cumulativeMakeup ?? 0,
  previousBalanceOwed: headerData?.previousBalanceOwed ?? 0,
  fundingAdjustment: headerData?.fundingAdjustment ?? 0,
  balanceOwed: headerData?.balanceOwed ?? 0,
  sportsbookHealth: headerData?.sportsbookHealth ?? null
});

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
  const [allAgents, setAllAgents] = useState([]);
  const [selectedSearchPlayer, setSelectedSearchPlayer] = useState(null);
  const [summary, setSummary] = useState(createDefaultHeaderSummary);
  const [profile, setProfile] = useState(null);

  const toPlayerList = (users) => (
    Array.isArray(users) ? users : []
  ).filter((u) => {
    const roleKey = String(u?.role || '').toLowerCase();
    return roleKey === '' || roleKey === 'user' || roleKey === 'player';
  });

  const applyHeaderSummary = (headerData) => {
    setSummary(normalizeHeaderSummary(headerData));
  };

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const refreshHeaderSummary = async () => {
      try {
        const headerData = await getAdminHeaderSummary(token);
        if (cancelled) return;
        applyHeaderSummary(headerData);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to refresh admin header summary:', error);
        }
      }
    };

    const loadHeaderContext = async () => {
      try {
        const [headerData, meData] = await Promise.all([
          getAdminHeaderSummary(token),
          getMe(token)
        ]);
        if (cancelled) return;
        applyHeaderSummary(headerData);
        setProfile(meData || null);

        const roleKey = String(meData?.role || role || '').toLowerCase();
        const isAgentRole = roleKey === 'agent';
        const [users, agentsData] = await Promise.all([
          isAgentRole ? getMyPlayers(token) : getUsersAdmin(token),
          isAgentRole ? Promise.resolve([]) : getAgents(token).catch(() => []),
        ]);
        if (cancelled) return;
        const onlyPlayers = toPlayerList(users);
        setAllPlayers(onlyPlayers);
        setSearchablePlayers(onlyPlayers);
        setAllAgents(Array.isArray(agentsData) ? agentsData : []);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load admin header summary:', error);
        }
      }
    };

    loadHeaderContext();
    const intervalId = window.setInterval(refreshHeaderSummary, 15000);
    const handleWindowFocus = () => {
      refreshHeaderSummary();
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [role]);

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
  const getPlayerId = (player) => String(player?.id || '');
  const getPlayerFullName = (player) => (
    player?.fullName || `${player?.firstName || ''} ${player?.lastName || ''}`.trim()
  );

  const allPlayersWithDuplicateMeta = useMemo(
    () => annotateDuplicatePlayers(allPlayers),
    [allPlayers]
  );

  const duplicateMetaByPlayerId = useMemo(() => {
    const map = new Map();
    allPlayersWithDuplicateMeta.forEach((player) => {
      const id = getPlayerId(player);
      if (!id) return;
      map.set(id, {
        isDuplicatePlayer: player?.isDuplicatePlayer === true,
        duplicateMatchCount: Number(player?.duplicateMatchCount || 0),
        duplicateReasons: Array.isArray(player?.duplicateReasons) ? player.duplicateReasons : [],
        duplicateGroupKeys: Array.isArray(player?.duplicateGroupKeys) ? player.duplicateGroupKeys : [],
      });
    });
    return map;
  }, [allPlayersWithDuplicateMeta]);

  const searchablePlayersWithDuplicateMeta = useMemo(() => {
    const localAnnotated = annotateDuplicatePlayers(searchablePlayers);
    return localAnnotated.map((player) => {
      const id = getPlayerId(player);
      const globalMeta = id ? duplicateMetaByPlayerId.get(id) : null;
      if (!globalMeta) {
        return player;
      }
      return {
        ...player,
        isDuplicatePlayer: globalMeta.isDuplicatePlayer,
        duplicateMatchCount: globalMeta.duplicateMatchCount,
        duplicateReasons: globalMeta.duplicateReasons,
        duplicateGroupKeys: globalMeta.duplicateGroupKeys,
      };
    });
  }, [searchablePlayers, duplicateMetaByPlayerId]);

  const formatDuplicateReasons = (player) => {
    const reasons = Array.isArray(player?.duplicateReasons) ? player.duplicateReasons : [];
    if (reasons.length === 0) return '';
    const ordered = Array.from(new Set(reasons)).sort((a, b) => a.localeCompare(b));
    return ordered.map((reason) => {
      if (reason === 'phone') return 'Phone';
      if (reason === 'email') return 'Email';
      if (reason === 'name') return 'Name';
      return String(reason || '').trim();
    }).filter(Boolean).join(', ');
  };

  const playerMatchesHeaderSearch = (player, rawQuery) => {
    const query = normalizeSearchValue(rawQuery);
    if (!query) return true;

    const userId = normalizeSearchValue(getPlayerId(player));
    const username = normalizeSearchValue(player?.username);
    const fullName = normalizeSearchValue(getPlayerFullName(player));
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

  const agentMatchesHeaderSearch = (agent, rawQuery) => {
    const query = normalizeSearchValue(rawQuery);
    if (!query) return true;
    const username = normalizeSearchValue(agent?.username);
    const fullName = normalizeSearchValue(getPlayerFullName(agent));
    const displayPassword = normalizeSearchValue(agent?.displayPassword);
    const phone = normalizeSearchValue(agent?.phoneNumber);
    const queryDigits = String(rawQuery || '').replace(/\D/g, '');
    const phoneDigits = String(agent?.phoneNumber || '').replace(/\D/g, '');
    return username.includes(query)
      || fullName.includes(query)
      || displayPassword.includes(query)
      || phone.includes(query)
      || (queryDigits !== '' && phoneDigits.includes(queryDigits));
  };

  const getAgentRoleLabel = (agent) => {
    const r = String(agent?.role || '').toLowerCase();
    if (r === 'master_agent' || r === 'super_agent') return 'Master';
    return 'Agent';
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
    setHeaderPlayerOpen(true);
  };

  const handleMobilePlayerSearchSubmit = (e) => {
    e.preventDefault();
    const query = headerSearchQuery.trim();
    if (!query) return;
    setHeaderPlayerOpen(true);
  };

  const selectPlayerFromSearch = (player, closeMobileSheet = false) => {
    if (!player) return;
    const userId = getPlayerId(player);
    if (userId && onViewChange) {
      onViewChange('user-details', userId);
    }
    setHeaderSearchQuery(player.username || '');
    setSelectedSearchPlayer(player);
    setHeaderPlayerOpen(false);
    if (closeMobileSheet) {
      setShowMobilePlayerSearch(false);
    }
  };

  const selectAgentFromSearch = (agent, closeMobileSheet = false) => {
    if (!agent) return;
    const agentId = getPlayerId(agent);
    if (agentId && onViewChange) {
      onViewChange('user-details', agentId);
    }
    setHeaderSearchQuery(agent.username || '');
    setSelectedSearchPlayer(null);
    setHeaderPlayerOpen(false);
    if (closeMobileSheet) {
      setShowMobilePlayerSearch(false);
    }
  };

  const filteredPlayers = useMemo(() => {
    const query = headerSearchQuery.trim();
    if (!query) return [];
    return searchablePlayersWithDuplicateMeta.filter((player) => playerMatchesHeaderSearch(player, query));
  }, [searchablePlayersWithDuplicateMeta, headerSearchQuery]);

  const filteredAgents = useMemo(() => {
    const query = headerSearchQuery.trim();
    if (!query) return [];
    return allAgents.filter((agent) => agentMatchesHeaderSearch(agent, query));
  }, [allAgents, headerSearchQuery]);

  const hasSearchQuery = headerSearchQuery.trim() !== '';
  const hasAnyResults = filteredPlayers.length > 0 || filteredAgents.length > 0;

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
  const activeAccountsCount = Number(summary.activeAccounts);
  const headerBalance = summary.totalBalance;
  const agentCollectionsValue = Number(summary.agentCollections ?? 0);
  const houseCollectionsValue = Number(summary.houseCollections ?? 0);
  const netCollectionsValue = Number(summary.netCollections ?? 0);
  const cumulativeMakeupValue = Number(summary.cumulativeMakeup ?? 0);
  const previousMakeupValue = Number(summary.previousMakeup ?? 0);
  const agentSplitValue = Number(summary.agentSplit ?? 0);
  const kickToHouseValue = Number(summary.kickToHouse ?? 0);
  const previousBalanceOwedValue = Number(summary.previousBalanceOwed ?? 0);
  const balanceOwedValue = Number(summary.balanceOwed ?? 0);
  const agentPercentValue = summary.agentPercent;
  const housePercentValue = agentPercentValue != null ? (100 - agentPercentValue) : null;
  const totalPlayerFeesValue = Number(summary.totalPlayerFees ?? 0);
  const houseProfitValue = Number(summary.houseProfit ?? 0);
  const fundingAdjustmentValue = Number(summary.fundingAdjustment ?? 0);

  const openWeeklyCollections = (summaryFocus) => {
    if (typeof onViewChange !== 'function') {
      return;
    }
    onViewChange('weekly-figures', {
      summaryFocus,
      timePeriod: 'this-week',
      playerFilter: 'all-players',
      actorLabel: displayName,
    });
  };


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
                placeholder="Search players & agents..."
                value={headerSearchQuery}
                style={{ textTransform: 'uppercase' }}
                onChange={(e) => {
                  const nextValue = e.target.value.toUpperCase();
                  setHeaderSearchQuery(nextValue);
                  setHeaderPlayerOpen(true);
                  if (nextValue.trim() === '') {
                    setSelectedSearchPlayer(null);
                  }
                }}
              />
              {headerPlayerOpen && hasSearchQuery && (
                <div className="admin-header-search-list">
                  {hasAnyResults ? (
                    <>
                      {filteredPlayers.length > 0 && filteredAgents.length > 0 && (
                        <div className="search-section-label">Players</div>
                      )}
                      {filteredPlayers.map((player, idx) => {
                        const userId = getPlayerId(player);
                        const fullName = getPlayerFullName(player);
                        const displayPassword = String(player.displayPassword || '').trim().toUpperCase() || '—';
                        const phone = String(player.phoneNumber || '').trim() || '—';
                        const duplicateReasonLabel = formatDuplicateReasons(player);
                        return (
                          <button
                            key={`player-${String(userId || player.username || idx)}`}
                            type="button"
                            className={`admin-header-search-item ${player.isDuplicatePlayer ? 'is-duplicate-player' : ''}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectPlayerFromSearch(player)}
                          >
                            <span className="search-item-user-wrap">
                              <span className="search-item-user">{String(player.username || '').toUpperCase()}</span>
                              {player.isDuplicatePlayer && (
                                <span className="search-item-dup-badge">Duplicate Player</span>
                              )}
                            </span>
                            <span className="search-item-pass">{displayPassword}</span>
                            <span className="search-item-name-wrap">
                              <span className="search-item-name">{fullName || '—'}</span>
                              <span className="search-item-phone">{phone}</span>
                              {player.isDuplicatePlayer && duplicateReasonLabel && (
                                <span className="search-item-dup-reason">{duplicateReasonLabel}</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                      {filteredPlayers.length > 0 && filteredAgents.length > 0 && (
                        <div className="search-section-label">Agents</div>
                      )}
                      {filteredAgents.map((agent, idx) => {
                        const agentId = getPlayerId(agent);
                        const fullName = getPlayerFullName(agent);
                        const displayPassword = String(agent.displayPassword || '').trim().toUpperCase() || '—';
                        const phone = String(agent.phoneNumber || '').trim() || '—';
                        const roleLabel = getAgentRoleLabel(agent);
                        return (
                          <button
                            key={`agent-${String(agentId || agent.username || idx)}`}
                            type="button"
                            className="admin-header-search-item search-item-agent"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectAgentFromSearch(agent)}
                          >
                            <span className="search-item-user-wrap">
                              <span className="search-item-user">{String(agent.username || '').toUpperCase()}</span>
                              <span className="search-item-role-badge">{roleLabel}</span>
                            </span>
                            <span className="search-item-pass">{displayPassword}</span>
                            <span className="search-item-name-wrap">
                              <span className="search-item-name">{fullName || '—'}</span>
                              <span className="search-item-phone">{phone}</span>
                            </span>
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <div className="admin-header-search-empty">No matching results</div>
                  )}
                </div>
              )}
            </div>
            {selectedSearchPlayer && (
              <div className={`admin-header-selected-player ${selectedSearchPlayer.isDuplicatePlayer ? 'is-duplicate-player' : ''}`}>
                <div className="selected-player-main">
                  <span className="selected-player-user">{String(selectedSearchPlayer.username || '').toUpperCase()}</span>
                  {selectedSearchPlayer.isDuplicatePlayer && (
                    <span className="search-item-dup-badge">Duplicate Player</span>
                  )}
                </div>
                <span className="selected-player-name">{getPlayerFullName(selectedSearchPlayer) || '—'}</span>
              </div>
            )}
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
              placeholder="Search players & agents..."
              value={headerSearchQuery}
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                const nextValue = e.target.value.toUpperCase();
                setHeaderSearchQuery(nextValue);
                if (nextValue.trim() === '') {
                  setSelectedSearchPlayer(null);
                }
              }}
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
          {selectedSearchPlayer && (
            <div className={`mobile-player-selected-card ${selectedSearchPlayer.isDuplicatePlayer ? 'is-duplicate-player' : ''}`}>
              <div className="selected-player-main">
                <span className="selected-player-user">{String(selectedSearchPlayer.username || '').toUpperCase()}</span>
                {selectedSearchPlayer.isDuplicatePlayer && (
                  <span className="search-item-dup-badge">Duplicate Player</span>
                )}
              </div>
              <span className="selected-player-name">{getPlayerFullName(selectedSearchPlayer) || '—'}</span>
            </div>
          )}

          <div className="mobile-player-search-results">
            {!hasSearchQuery ? null : !hasAnyResults ? (
              <div className="admin-header-search-empty">No matching results</div>
            ) : (
              <>
                {filteredPlayers.length > 0 && filteredAgents.length > 0 && (
                  <div className="search-section-label">Players</div>
                )}
                {filteredPlayers.map((player, idx) => {
                  const userId = getPlayerId(player);
                  const fullName = getPlayerFullName(player);
                  const displayPassword = String(player.displayPassword || '').trim().toUpperCase() || '—';
                  const phone = String(player.phoneNumber || '').trim() || '—';
                  const duplicateReasonLabel = formatDuplicateReasons(player);
                  return (
                    <button
                      key={`player-${String(userId || player.username || idx)}`}
                      type="button"
                      className={`mobile-player-search-item ${player.isDuplicatePlayer ? 'is-duplicate-player' : ''}`}
                      onClick={() => selectPlayerFromSearch(player, true)}
                    >
                      <span className="search-item-user-wrap">
                        <span className="search-item-user">{String(player.username || '').toUpperCase()}</span>
                        {player.isDuplicatePlayer && (
                          <span className="search-item-dup-badge">Duplicate Player</span>
                        )}
                      </span>
                      <span className="search-item-pass">{displayPassword}</span>
                      <span className="search-item-name-wrap">
                        <span className="search-item-name">{fullName || '—'}</span>
                        <span className="search-item-phone">{phone}</span>
                        {player.isDuplicatePlayer && duplicateReasonLabel && (
                          <span className="search-item-dup-reason">{duplicateReasonLabel}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {filteredPlayers.length > 0 && filteredAgents.length > 0 && (
                  <div className="search-section-label">Agents</div>
                )}
                {filteredAgents.map((agent, idx) => {
                  const agentId = getPlayerId(agent);
                  const fullName = getPlayerFullName(agent);
                  const displayPassword = String(agent.displayPassword || '').trim().toUpperCase() || '—';
                  const phone = String(agent.phoneNumber || '').trim() || '—';
                  const roleLabel = getAgentRoleLabel(agent);
                  return (
                    <button
                      key={`agent-${String(agentId || agent.username || idx)}`}
                      type="button"
                      className="mobile-player-search-item search-item-agent"
                      onClick={() => selectAgentFromSearch(agent, true)}
                    >
                      <span className="search-item-user-wrap">
                        <span className="search-item-user">{String(agent.username || '').toUpperCase()}</span>
                        <span className="search-item-role-badge">{roleLabel}</span>
                      </span>
                      <span className="search-item-pass">{displayPassword}</span>
                      <span className="search-item-name-wrap">
                        <span className="search-item-name">{fullName || '—'}</span>
                        <span className="search-item-phone">{phone}</span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {showStats && (
        <div className="admin-header-bottom">
          <div className="admin-stats-grid">
            {/* Group 1: Week / Today */}
            <div className="stat-group stat-group-green">
              <button
                type="button"
                className="stat-row stat-row-button"
                onClick={() => onViewChange?.('weekly-figures', {
                  timePeriod: 'this-week',
                  playerFilter: 'active-week',
                  openDropdown: 'period',
                  actorLabel: displayName,
                })}
                aria-label={`Open weekly reports week selector for ${displayName}`}
              >
                <span className="stat-label">Week</span>
                <span className={`stat-value ${getSignedValueClass(summary.weekNet)}`}>{formatCurrency(summary.weekNet)}</span>
              </button>
              <div className="stat-row">
                <span className="stat-label">Today</span>
                <span className={`stat-value ${getSignedValueClass(summary.todayNet)}`}>{formatCurrency(summary.todayNet)}</span>
              </div>
            </div>

            {/* Group 2: Active Players + Player Fees (agent) or Active Accts + Balance (other) */}
            <div className="stat-group stat-group-red">
              {roleKey === 'agent' ? (
                <button
                  type="button"
                  className="stat-row stat-row-button"
                  onClick={() => onViewChange?.('weekly-figures', {
                    timePeriod: 'this-week',
                    playerFilter: 'active-week',
                    actorLabel: displayName,
                  })}
                  aria-label={`Open weekly figures for ${displayName} active players this week`}
                >
                  <span className="stat-label">Active Players</span>
                  <span className="stat-value highlight">{formatCount(summary.activeAccounts)}</span>
                </button>
              ) : (
                <div className="stat-row">
                  <span className="stat-label">Active Accts</span>
                  <span className="stat-value highlight">{formatCount(summary.activeAccounts)}</span>
                </div>
              )}
              {roleKey === 'agent' ? (
                <div className="stat-row">
                  <span className="stat-label">Player Fees</span>
                  <span className="stat-value">{formatCurrency(summary.totalPlayerFees ?? 0)}</span>
                </div>
              ) : (
                <div className="stat-row">
                  <span className="stat-label">Balance</span>
                  <span className={`stat-value ${getSignedValueClass(headerBalance)}`}>{formatCurrency(headerBalance)}</span>
                </div>
              )}
            </div>

            {/* ── Excel Section 1 (Green): Collections ── */}
            {roleKey === 'agent' && (
              <div className="stat-group stat-group-green">
                <button
                  type="button"
                  className="stat-row stat-row-button"
                  onClick={() => {
                    if (typeof onViewChange === 'function') {
                      onViewChange('transaction-history', { enteredBy: displayName, collectionType: 'agent' });
                    }
                  }}
                  aria-label={`View agent collection transactions`}
                >
                  <span className="stat-label">Agent Collections</span>
                  <span className={`stat-value ${getSignedValueClass(agentCollectionsValue)}`}>{formatCurrency(agentCollectionsValue)}</span>
                </button>
                <button
                  type="button"
                  className="stat-row stat-row-button"
                  onClick={() => {
                    if (typeof onViewChange === 'function') {
                      onViewChange('transaction-history', { enteredBy: 'HOUSE', collectionType: 'house' });
                    }
                  }}
                  aria-label={`View house collection transactions`}
                >
                  <span className="stat-label">House Collections</span>
                  <span className={`stat-value ${getSignedValueClass(houseCollectionsValue)}`}>{formatCurrency(houseCollectionsValue)}</span>
                </button>
                <div className="stat-row">
                  <span className="stat-label">Previous Makeup</span>
                  <span className={`stat-value ${previousMakeupValue > 0 ? 'negative' : 'neutral'}`}>{formatCurrency(previousMakeupValue > 0 ? -previousMakeupValue : 0)}</span>
                </div>
              </div>
            )}

            {/* ── Excel Section 2 (Yellow): Net / Split ── */}
            {roleKey === 'agent' && (
              <div className="stat-group stat-group-yellow">
                <div className="stat-row">
                  <span className="stat-label">Net Collections</span>
                  <span className={`stat-value ${getSignedValueClass(netCollectionsValue)}`}>{formatCurrency(netCollectionsValue)}</span>
                </div>
                {agentSplitValue > 0 && (
                  <>
                    <div className="stat-row">
                      <span className="stat-label">Agent Split{agentPercentValue != null ? ` ${agentPercentValue}%` : ''}</span>
                      <span className={`stat-value ${getSignedValueClass(agentSplitValue)}`}>{formatCurrency(agentSplitValue)}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Kick to House{housePercentValue != null ? ` ${housePercentValue}%` : ''}</span>
                      <span className={`stat-value ${getSignedValueClass(kickToHouseValue)}`}>{formatCurrency(kickToHouseValue)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Excel Section 3 (Pink/Orange): Balance Owed Breakdown ── */}
            {roleKey === 'agent' && (
              <div className="stat-group stat-group-salmon">
                {cumulativeMakeupValue > 0 && (
                  <div className="stat-row">
                    <span className="stat-label">Remaining Makeup</span>
                    <span className="stat-value negative">{formatCurrency(-cumulativeMakeupValue)}</span>
                  </div>
                )}
                {previousBalanceOwedValue !== 0 && (
                  <button
                    type="button"
                    className="stat-row stat-row-button"
                    onClick={() => {
                      if (typeof onViewChange === 'function') {
                        onViewChange('weekly-figures', {
                          timePeriod: 'last-week',
                          playerFilter: 'all-players',
                          actorLabel: displayName,
                        });
                      }
                    }}
                    aria-label="View last week figures"
                  >
                    <span className="stat-label">Previous Balance</span>
                    <span className={`stat-value ${getSignedValueClass(previousBalanceOwedValue)}`}>{formatCurrency(previousBalanceOwedValue)}</span>
                  </button>
                )}
                {houseProfitValue > 0 && (
                  <div className="stat-row">
                    <span className="stat-label">House Profit</span>
                    <span className={`stat-value ${getSignedValueClass(houseProfitValue)}`}>{formatCurrency(houseProfitValue)}</span>
                  </div>
                )}
                <div className="stat-row">
                  <span className="stat-label">House Collections</span>
                  <span className={`stat-value ${getSignedValueClass(-houseCollectionsValue)}`}>{formatCurrency(-houseCollectionsValue)}</span>
                </div>
                {fundingAdjustmentValue !== 0 && (
                  <div className="stat-row">
                    <span className="stat-label">Payments</span>
                    <span className={`stat-value ${getSignedValueClass(-fundingAdjustmentValue)}`}>{formatCurrency(-fundingAdjustmentValue)}</span>
                  </div>
                )}
                <div className="stat-row stat-row-total">
                  <span className="stat-label">Balance Owed / House Money</span>
                  <span className={`stat-value ${getSignedValueClass(balanceOwedValue)}`}>{formatCurrency(balanceOwedValue)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Balance Adjustment modal removed */}

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
