import React, { useEffect, useMemo, useState } from 'react';
import { getAdminHeaderSummary, getAgents, getDownlineSummary, getGatewayHealth, getMe, getMyPlayers, getUsersAdmin, linkedAgentName } from '../api';
import AgentTreeView from './admin-views/AgentTreeView';
import AgentCutsTable from './AgentCutsTable';
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
  const [gatewayAlerts, setGatewayAlerts] = useState([]);
  const [gatewayAlertLevel, setGatewayAlertLevel] = useState('ok');
  const [profile, setProfile] = useState(null);
  const [downlineAgents, setDownlineAgents] = useState([]);
  // When set, the admin has selected a non-current week in the agent-cuts
  // dropdown. The header summary is refetched with this weekStart so the
  // WEEK stat reflects the selected period.
  const [selectedWeekStart, setSelectedWeekStart] = useState(null);

  const toPlayerList = (users) => (
    Array.isArray(users) ? users : []
  ).filter((u) => {
    const roleKey = String(u?.role || '').toLowerCase();
    return roleKey === '' || roleKey === 'user' || roleKey === 'player';
  });

  const applyHeaderSummary = (headerData) => {
    setSummary(normalizeHeaderSummary(headerData));
  };

  const applyGatewayHealth = (healthPayload) => {
    const alerts = Array.isArray(healthPayload?.observability?.alerts)
      ? healthPayload.observability.alerts.filter((item) => item && typeof item === 'object')
      : [];
    setGatewayAlerts(alerts.slice(0, 3));
    const hasCritical = alerts.some((item) => String(item?.severity || '').toLowerCase() === 'critical');
    if (hasCritical) {
      setGatewayAlertLevel('critical');
    } else if (alerts.length > 0) {
      setGatewayAlertLevel('warning');
    } else {
      setGatewayAlertLevel('ok');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const summaryParams = selectedWeekStart ? { weekStart: selectedWeekStart } : null;

    const refreshHeaderSummary = async () => {
      if (document.hidden) return;
      try {
        const [headerData, healthData] = await Promise.all([
          getAdminHeaderSummary(token, summaryParams),
          getGatewayHealth().catch(() => null),
        ]);
        if (cancelled) return;
        applyHeaderSummary(headerData);
        if (healthData) {
          applyGatewayHealth(healthData);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to refresh admin header summary:', error);
        }
      }
    };

    const loadHeaderContext = async () => {
      try {
        const [headerData, meData, healthData] = await Promise.all([
          getAdminHeaderSummary(token, summaryParams),
          getMe(token),
          getGatewayHealth().catch(() => null),
        ]);
        if (cancelled) return;
        applyHeaderSummary(headerData);
        setProfile(meData || null);
        if (healthData) {
          applyGatewayHealth(healthData);
        }

        const roleKey = String(meData?.role || role || '').toLowerCase();
        const isAgentRole = roleKey === 'agent';
        const isMasterRole = roleKey === 'master_agent' || roleKey === 'super_agent';
        const [users, agentsData, downlineData] = await Promise.all([
          isAgentRole ? getMyPlayers(token) : getUsersAdmin(token),
          getAgents(token).catch(() => []),
          (isMasterRole || roleKey === 'admin') ? getDownlineSummary(token).catch(() => ({ agents: [] })) : Promise.resolve({ agents: [] }),
        ]);
        if (cancelled) return;
        const onlyPlayers = toPlayerList(users);
        setAllPlayers(onlyPlayers);
        setSearchablePlayers(onlyPlayers);
        setAllAgents(Array.isArray(agentsData) ? agentsData : []);
        setDownlineAgents(Array.isArray(downlineData?.agents) ? downlineData.agents : []);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load admin header summary:', error);
        }
      }
    };

    loadHeaderContext();
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      refreshHeaderSummary();
    }, 15000);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadHeaderContext();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [role, selectedWeekStart]);

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

  const formatAbsoluteCurrency = (value) => {
    const rounded = roundForDisplay(value);
    if (rounded === null) return '—';
    return formatCurrency(Math.abs(rounded));
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

    if (query === 'duplicate' || query === 'duplicates' || query === 'dup') {
      return player?.isDuplicatePlayer === true;
    }

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

      const duplicateKeyword = query.toLowerCase();
      if (duplicateKeyword === 'duplicate' || duplicateKeyword === 'duplicates' || duplicateKeyword === 'dup') {
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

  // Sort search results so usernames with the same prefix appear in
  // numeric order (AVL100, AVL102, AVL103, AVL104, AVL105, AVL112)
  // instead of insertion / DB order.
  const compareUsernamesNumeric = (a, b) => {
    const ua = String(a?.username || '').toUpperCase();
    const ub = String(b?.username || '').toUpperCase();
    return ua.localeCompare(ub, undefined, { numeric: true, sensitivity: 'base' });
  };

  const filteredPlayers = useMemo(() => {
    const query = headerSearchQuery.trim();
    if (!query) return [];
    return [...searchablePlayersWithDuplicateMeta]
      .filter((player) => playerMatchesHeaderSearch(player, query))
      .sort(compareUsernamesNumeric);
  }, [searchablePlayersWithDuplicateMeta, headerSearchQuery]);

  const filteredAgents = useMemo(() => {
    const query = headerSearchQuery.trim();
    if (!query) return [];
    return [...allAgents]
      .filter((agent) => agentMatchesHeaderSearch(agent, query))
      .sort(compareUsernamesNumeric);
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
  const makeupReductionValue = Number(summary.makeupReduction ?? 0);
  const commissionableProfitValue = Number(summary.commissionableProfit ?? 0);
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
              onClick={() => toggleAccountTreeSearch()}
              title="Open agent tree"
              aria-expanded={showAgentTree}
            >
              <span className="user-chip-desktop">{roleLabel}: {displayName}</span>
              <span className="user-chip-mobile">{mobileUserLabel}</span>
              <span
                className={`user-chip-caret ${showAgentTree ? 'open' : ''}`}
                aria-hidden="true"
              >
                ▼
              </span>
            </button>
            <div className="power-menu-wrap">
              <button
                type="button"
                className="power-logout-btn"
                onClick={() => setShowUserMenu((prev) => !prev)}
                aria-label="Open account menu"
                aria-expanded={showUserMenu}
                title="Account menu"
              >
                ⏻
              </button>
              {showUserMenu && (
                <div className="dropdown-menu user-chip-menu">
                  <button type="button" onClick={() => { setShowUserMenu(false); handleViewChange('profile'); }}>
                    <i className="fa-solid fa-user" aria-hidden="true"></i>
                    Profile
                  </button>
                  <button type="button" onClick={() => { setShowUserMenu(false); handleViewChange('settings'); }}>
                    <i className="fa-solid fa-gear" aria-hidden="true"></i>
                    Settings
                  </button>
                  {canRestoreBaseContext && (
                    <button type="button" onClick={() => { setShowUserMenu(false); onRestoreBaseContext?.(); }}>
                      <i className="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i>
                      Back to {baseContextLabel}
                    </button>
                  )}
                  <button type="button" className="power-menu-logout" onClick={() => { setShowUserMenu(false); handleLogout(); }}>
                    <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
                    Log out
                  </button>
                </div>
              )}
            </div>
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

            {/* Group 2: Active Accts + Balance (admin only, not agent/MA) */}
            {roleKey !== 'agent' && roleKey !== 'master_agent' && roleKey !== 'super_agent' && (
              <div className="stat-group stat-group-red">
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
                <div className="stat-row">
                  <span className="stat-label">Player Fees</span>
                  <span className="stat-value">{formatCurrency(totalPlayerFeesValue)}</span>
                </div>
              </div>
            )}

            {/* ── MA Stats: Active Accts + Balance Owed to House ── */}
            {(roleKey === 'master_agent' || roleKey === 'super_agent') && (
              <div className="stat-group stat-group-red">
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
                <div className="stat-row">
                  <span className="stat-label">My Settlement to House</span>
                  <span className={`stat-value ${getSignedValueClass(balanceOwedValue)}`}>{formatCurrency(balanceOwedValue)}</span>
                </div>
              </div>
            )}

            {/* ── Collections (HOUSE/admin only, not MA/SA) ── */}

            {/* ── Agent Settlement Report Card ── */}
            {roleKey === 'agent' && (
              <div className="summary-section weekly-settlement-section dashboard-settlement">
                <div className="weekly-settlement-grid">
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
                    {previousMakeupValue > 0 && cumulativeMakeupValue > 0 && (
                      <div className="stat-row">
                        <span className="stat-label">Previous Makeup</span>
                        <span className="stat-value negative">{formatAbsoluteCurrency(previousMakeupValue)}</span>
                      </div>
                    )}
                  </div>
                  <div className="stat-group stat-group-yellow">
                    {makeupReductionValue > 0 ? (
                      <>
                        <div className="stat-row">
                          <span className="stat-label">Gross Collections</span>
                          <span className={`stat-value ${getSignedValueClass(netCollectionsValue)}`}>{formatCurrency(netCollectionsValue)}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Previous Makeup</span>
                          <span className="stat-value negative">{formatAbsoluteCurrency(makeupReductionValue)}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Net Collections</span>
                          <span className={`stat-value ${getSignedValueClass(commissionableProfitValue)}`}>{formatCurrency(commissionableProfitValue)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="stat-row">
                        <span className="stat-label">Net Collections</span>
                        <span className={`stat-value ${getSignedValueClass(netCollectionsValue)}`}>{formatCurrency(netCollectionsValue)}</span>
                      </div>
                    )}
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
                  <div className="stat-group stat-group-red">
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
                    <div className="stat-row">
                      <span className="stat-label">Player Fees</span>
                      <span className="stat-value">{formatCurrency(summary.totalPlayerFees ?? 0)}</span>
                    </div>
                  </div>
                  <div className="stat-group stat-group-salmon">
                    {cumulativeMakeupValue > 0 && (
                      <div className="stat-row">
                        <span className="stat-label">Remaining Makeup</span>
                        <span className="stat-value negative">{formatAbsoluteCurrency(cumulativeMakeupValue)}</span>
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
                    <button
                      type="button"
                      className="stat-row stat-row-button stat-row-total"
                      onClick={() => {
                        if (typeof onViewChange !== 'function') return;
                        const selfId = profile?.id ? String(profile.id) : '';
                        if (selfId) {
                          onViewChange('user-details', selfId, { autoOpenDeposit: true });
                        }
                      }}
                      aria-label="Open my agent profile and start a new deposit"
                    >
                      <span className="stat-label">Balance Owed / House Money</span>
                      <span className={`stat-value ${getSignedValueClass(balanceOwedValue)}`}>{formatCurrency(balanceOwedValue)}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Legacy agents flat list disabled — admin / MA / SA all get the tabbed AgentCutsTable below ── */}
          {false && (roleKey === 'master_agent' || roleKey === 'super_agent') && downlineAgents.length > 0 && (() => {
            const sorted = [...downlineAgents].sort((a, b) => {
              const pa = Number(a.profit ?? 0);
              const pb = Number(b.profit ?? 0);
              if (pb !== pa) return pb - pa;
              const ya = Number(a.yearlyProfit ?? 0);
              const yb = Number(b.yearlyProfit ?? 0);
              if (yb !== ya) return yb - ya;
              return (a.username ?? '').localeCompare(b.username ?? '');
            });
            const totalWeekly = sorted.reduce((s, a) => s + Number(a.profit ?? 0), 0);
            const totalYearly = sorted.reduce((s, a) => s + Number(a.yearlyProfit ?? 0), 0);
            return (
              <div className="downline-flat-list">
                <div className="downline-flat-header">
                  <span className="dfl-name">Agents</span>
                  <span className="dfl-cut">Cut</span>
                  <span className="dfl-weekly">Weekly</span>
                  <span className="dfl-yearly">Yearly</span>
                </div>
                {sorted.map((agent) => {
                  const profit = Number(agent.profit ?? 0);
                  const yearly = Number(agent.yearlyProfit ?? 0);
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      className="downline-flat-row"
                      onClick={() => { if (onSwitchContext) onSwitchContext(agent.id); }}
                    >
                      <span className="dfl-name">{agent.username}</span>
                      <span className="dfl-cut">{agent.myCut != null ? `${agent.myCut}%` : '—'}</span>
                      <span className={`dfl-weekly ${profit > 0 ? 'positive' : profit < 0 ? 'negative' : ''}`}>{formatCurrency(profit)}</span>
                      <span className={`dfl-yearly ${yearly > 0 ? 'positive' : yearly < 0 ? 'negative' : ''}`}>{formatCurrency(yearly)}</span>
                    </button>
                  );
                })}
                <div className="downline-flat-total">
                  <span className="dfl-name">PROFIT</span>
                  <span className="dfl-cut"></span>
                  <span className={`dfl-weekly ${totalWeekly > 0 ? 'positive' : ''}`}>{formatCurrency(totalWeekly)}</span>
                  <span className={`dfl-yearly ${totalYearly > 0 ? 'positive' : ''}`}>{formatCurrency(totalYearly)}</span>
                </div>
              </div>
            );
          })()}

          {/* ── Tabbed agent cuts table (admin, master_agent, super_agent) ── */}
          {(roleKey === 'admin' || roleKey === 'master_agent' || roleKey === 'super_agent') && (
            <AgentCutsTable
              onSelectAgent={(agentId) => {
                if (onSwitchContext) {
                  onSwitchContext(agentId);
                }
              }}
              onOpenOwedAgent={(agentId) => {
                if (typeof onViewChange === 'function' && agentId) {
                  onViewChange('user-details', agentId, {
                    autoOpenDeposit: true,
                    backView: 'dashboard',
                  });
                }
              }}
              onWeekChange={(weekIso, isCurrentWeek) => {
                // null weekStart = "current week" (header uses live start-of-week).
                // ISO string = historical week (header refetches with that param).
                setSelectedWeekStart(isCurrentWeek ? null : weekIso);
              }}
            />
          )}

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
