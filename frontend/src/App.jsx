import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  bootstrapAuthSession,
  clearAuthBootstrapCache,
  getMe,
  getPublicBetModeRules,
  getStoredAuthToken,
  getStoredUserRole,
  invalidateMeCache,
  loginUser,
  logoutSession,
  normalizeBetMode,
  primeAuthBootstrapCache,
  primeMeCache,
  syncStoredAuth,
  updateProfile
} from './api';
import LandingPage from './components/LandingPage';
import LoadingSpinner from './components/LoadingSpinner';
import { useToast } from './contexts/ToastContext';
import { OddsFormatProvider } from './contexts/OddsFormatContext';
import { normalizeOddsFormat, readStoredOddsFormat, writeStoredOddsFormat } from './utils/odds';
import {
  registerServiceWorker,
  monitorCoreWebVitals,
  optimizeImageLoading,
  addResourceHints,
} from './utils/performanceOptimization';
import useWebSocket from './hooks/useWebSocket';
import useNetworkStatus from './hooks/useNetworkStatus';
import NetworkStatusBanner from './components/NetworkStatusBanner';
import './index.css';
import './dashboard.css';

const UserDashboardShell = React.lazy(() => import('./components/UserDashboardShell'));

// Structural placeholder only — no hardcoded multipliers.
// Real values are loaded from /api/betting/rules (DB) on login and merged in below.
const DEFAULT_BET_MODE_RULES = {
  straight: { minLegs: 1, maxLegs: 12, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
  parlay:   { minLegs: 2, maxLegs: 12, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
  teaser:   { minLegs: 2, maxLegs: 6,  teaserPointOptions: [], payoutProfile: { type: 'table_multiplier', multipliers: {} } },
  if_bet:   { minLegs: 2, maxLegs: 2,  teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
  reverse:  { minLegs: 2, maxLegs: 2,  teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { isOnline } = useNetworkStatus();
  const hasRedirectedRole = useRef(false);
  // Token lives in React memory only — never written to localStorage (XSS protection).
  // On page load we restore it from the httpOnly cookie via getSession().
  const [token, setToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeLeague, setActiveLeague] = useState('all');
  const [dashboardView, setDashboardView] = useState('dashboard');
  const [selectedSports, setSelectedSports] = useState([]);
  const [betMode, setBetMode] = useState('straight');
  const [slipSelections, setSlipSelections] = useState([]);
  const [wager, setWager] = useState('');
  const [teaserPoints, setTeaserPoints] = useState('');
  const [betModeRules, setBetModeRules] = useState(DEFAULT_BET_MODE_RULES);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  // Mobile navigation state: true = user clicked Continue and is viewing results
  const [mobileResultsActive, setMobileResultsActive] = useState(false);
  // Live-updating viewport flag. useMemo([]) froze this at initial mount,
  // so if the user loaded on desktop and then resized / switched to mobile
  // (dev tools, real rotate, or responsive testing), the value stayed false
  // and Continue never routed to <MobileContentView>. Listen to matchMedia
  // so the flag flips whenever the viewport crosses 768px.
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobileViewport(e.matches);
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else mql.addListener(handler); // Safari < 14 fallback
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else mql.removeListener(handler);
    };
  }, []);

  // Derived mobile state:
  //   'browsing'  — no actionable selection, showing sports menu
  //   'selected'  — child sport picked, showing Continue in header
  //   'results'   — Continue clicked, showing match results
  const mobileViewState = useMemo(() => mobileResultsActive && selectedSports.length > 0
    ? 'results'
    : selectedSports.length > 0
      ? 'selected'
      : 'browsing', [mobileResultsActive, selectedSports.length]);

  // Guard: if selection is emptied, always exit results mode
  useEffect(() => {
    if (selectedSports.length === 0 && mobileResultsActive) {
      setMobileResultsActive(false);
    }
  }, [selectedSports, mobileResultsActive]);

  // Phase 13: Initialize performance monitoring and service worker
  useEffect(() => {
    // Register service worker for offline support and caching
    registerServiceWorker();
    
    // Monitor Core Web Vitals for performance analysis
    monitorCoreWebVitals((metric) => {
      if (import.meta.env.DEV) {
        console.debug('Performance Metric:', metric);
      }
    });
    
    // Optimize image loading strategies
    optimizeImageLoading();
    
    // Add DNS prefetch and preconnect hints
    addResourceHints();
  }, []);

  const [user, setUser] = useState(null); // Store full user object
  const [oddsFormat, setOddsFormat] = useState(readStoredOddsFormat());
  const [isUpdatingOddsFormat, setIsUpdatingOddsFormat] = useState(false);
  const lastRealtimeRefreshRef = useRef(0);
  const [lastRealtimeEventAt, setLastRealtimeEventAt] = useState(null);

  const handleRealtimeMessage = useCallback((message) => {
    if (!message || message.type !== 'update') {
      return;
    }

    const channel = String(message.channel || '').trim();
    // odds:sync is the worker's full-cycle aggregate event; odds:sport:sync
    // fires from syncSingleSport for an individual sport (carries sportKey
    // in payload so subscribers can target). Both arrive AFTER the backend
    // has already written fresh data to DB and invalidated the public-
    // matches cache, so the frontend just needs to re-read — no need to
    // kick a second backend sync via /api/matches?refresh=true.
    if (
      channel !== 'odds:sync'
      && channel !== 'odds:sync:error'
      && channel !== 'odds:sport:sync'
    ) {
      return;
    }

    setLastRealtimeEventAt(Date.now());

    // Skip refetch if tab is hidden — useMatches's visibilitychange
    // handler will catch us up when the user returns. Saves needless
    // network/CPU on background tabs.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    const now = Date.now();
    // 1.2s debounce against bursty events (e.g. all tier-1 sports finishing
    // their cycle within ~100ms). Combined with the per-sport server-side
    // dedup, this keeps the refetch to roughly one /api/matches per burst.
    if ((now - lastRealtimeRefreshRef.current) < 1200) {
      return;
    }
    lastRealtimeRefreshRef.current = now;

    if (typeof window !== 'undefined') {
      const sportKey = (message.payload && (message.payload.sport_key || message.payload.sportKey)) || null;
      // matches:force-refetch reads from the freshly-invalidated public
      // cache directly; matches:refresh would kick the backend's slow
      // deferred-sync round-trip and serve a pre-sync snapshot.
      window.dispatchEvent(new CustomEvent('matches:force-refetch', {
        detail: {
          reason: 'realtime',
          channel,
          sportKey,
        },
      }));

      // Scoreboard has its own fetch path; keep it aligned with live updates.
      window.dispatchEvent(new CustomEvent('scoreboard:refresh', {
        detail: {
          reason: 'realtime',
          channel,
        },
      }));
    }
  }, []);

  const { connectionState: realtimeConnectionState, isConnected: realtimeConnected } = useWebSocket({
    channel: '*',
    onMessage: handleRealtimeMessage,
    enabled: isLoggedIn,
  });

  const seedSessionState = useCallback(({ token: nextToken = '', user: nextUser = null, role: nextRole = '' } = {}) => {
    const safeToken = String(nextToken || '').trim();
    const safeRole = String(nextRole || '').toLowerCase().trim();
    if (!safeToken) {
      return false;
    }

    setToken(safeToken);
    setIsLoggedIn(true);
    document.body.classList.add('dashboard-mode');

    if (nextUser && typeof nextUser === 'object') {
      setUser(nextUser);
    } else if (safeRole) {
      // Seed the role so redirects and role-gated UI can recover while /auth/me retries.
      setUser((prev) => prev || { role: safeRole });
    }

    return true;
  }, []);

  const applyOddsFormat = useCallback((nextFormat, userId = '') => {
    const normalized = normalizeOddsFormat(nextFormat);
    setOddsFormat(normalized);
    writeStoredOddsFormat(normalized, userId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oddsFormat:change', { detail: normalized }));
    }
    return normalized;
  }, []);

  // On mount: attempt to restore session from the httpOnly cookie in the background.
  // The landing page renders immediately; if the cookie is valid, we swap to the
  // dashboard once bootstrapAuthSession resolves with a fresh token + user data.
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const result = await bootstrapAuthSession({ timeoutMs: 8000 });
        if (isMounted && result?.token) {
          seedSessionState({
            token: result.token,
            user: result.user || null,
            role: result.role || result.user?.role || '',
          });
        }
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          clearAuthBootstrapCache();
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          document.body.classList.remove('dashboard-mode');
          return;
        }

        // Match ProtectedRoleRoute behavior: keep valid stored auth usable on transient failures.
        const storedToken = getStoredAuthToken();
        const storedRole = getStoredUserRole();
        if (isMounted && storedToken) {
          seedSessionState({ token: storedToken, role: storedRole });
        }
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [seedSessionState]);

  const { data: betModeRulesData } = useQuery({
    queryKey: ['betModeRules', token],
    queryFn: async () => {
      if (!token) return DEFAULT_BET_MODE_RULES;
      const payload = await getPublicBetModeRules(token);
      const mapped = (payload?.rules || []).reduce((acc, rule) => {
        acc[normalizeBetMode(rule.mode)] = rule;
        return acc;
      }, {});
      return Object.keys(mapped).length > 0 ? { ...DEFAULT_BET_MODE_RULES, ...mapped } : DEFAULT_BET_MODE_RULES;
    },
    enabled: !!token,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const currentBetModeRules = betModeRulesData || betModeRules;

  useEffect(() => {
    const handleAddToSlip = (e) => {
      const item = e.detail || {};
      if (!item.matchId || !item.selection) return;
      const dedupeKey = `${item.matchId}-${item.marketType}-${item.selection}`;

      // Silent add/remove: the user wanted the odds cell itself to act
      // as a checkbox — visual selected state on the cell + the header
      // Betslip counter ticking up are enough feedback. Toasts removed
      // because they covered the matchup the user was about to chain
      // into a parlay.
      setSlipSelections(prev => {
        const existing = prev.find(sel => sel.dedupeKey === dedupeKey);
        if (existing) {
          return prev.filter(sel => sel.dedupeKey !== dedupeKey);
        }
        const next = { ...item, id: Date.now() + Math.random(), dedupeKey };
        // Straight mode accumulates multiple selections. Each one is
        // placed as an independent single-leg ticket by the placement
        // loop in ModeBetPanel (per-selection amount + separate
        // requestId), so a user can queue up N straight bets before
        // submitting — the expected behavior in real sportsbooks.
        return [...prev, next];
      });
    };

    window.addEventListener('betslip:add', handleAddToSlip);
    return () => window.removeEventListener('betslip:add', handleAddToSlip);
  }, [betMode]);

  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ['user', token],
    queryFn: async () => {
      if (!token) return null;
      const userData = await getMe(token);
      primeAuthBootstrapCache({ token, role: userData?.role, user: userData, source: 'user-query' });
      return userData;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: (data) => {
      setUser(data);
    },
    onError: (error) => {
      if (error?.status === 401 || error?.status === 403) {
        handleLogout();
      }
    },
  });

  const currentUser = userData || user;

  useEffect(() => {
    if (!currentUser?.id) return;
    const preferredFormat = normalizeOddsFormat(currentUser?.settings?.oddsFormat || readStoredOddsFormat(currentUser.id));
    applyOddsFormat(preferredFormat, currentUser.id);
  }, [currentUser?.id, currentUser?.settings?.oddsFormat, applyOddsFormat]);

  // Redirect admins/agents who land on root "/" to their dashboard (once).
  useEffect(() => {
    if (!currentUser || hasRedirectedRole.current) return;
    const isAdminLike = ['admin', 'agent', 'super_agent', 'master_agent'].includes(currentUser.role);
    if (!isAdminLike || location.pathname !== '/') return;

    const targetPath = currentUser.role === 'admin'
      ? '/admin/dashboard'
      : ((currentUser.role === 'super_agent' || currentUser.role === 'master_agent') ? '/super_agent/dashboard' : '/agent/dashboard');
    hasRedirectedRole.current = true;
    navigate(targetPath, { replace: true });
  }, [currentUser, navigate, location.pathname]);

  // Listen for user refresh events (e.g., after placing a bet)
  useEffect(() => {
    const handleUserRefresh = () => {
      if (token) {
        refetchUser();
      }
    };

    window.addEventListener('user:refresh', handleUserRefresh);

    return () => {
      window.removeEventListener('user:refresh', handleUserRefresh);
    };
  }, [token, refetchUser]);

  const handleLogin = async (username, password) => {
    try {
      // Call real backend authentication
      const result = await loginUser(username, password);
      // Keep the full /auth/login payload (creditLimit, creditAvailable,
      // freeplayBalance, balanceOwed, nonPostedCasino, …) so the Account
      // panel and header tiles render the correct values immediately
      // instead of falling back to $0 while /auth/me re-fetches.
      const { token: _loginToken, message: _loginMessage, ...authenticatedUser } = result;

      // Primary auth: httpOnly cookie is set by the backend on every login response.
      // localStorage write below is kept for backward compat with legacy admin/agent
      // components — migrate them to use the cookie/session gradually.
      setToken(result.token);
      syncStoredAuth({ token: result.token, role: result.role });
      primeMeCache(result.token, authenticatedUser);
      primeAuthBootstrapCache({ token: result.token, role: result.role, user: authenticatedUser, source: 'login' });

      // Store user data from the backend response
      setUser(authenticatedUser);

      setIsLoggedIn(true);
      document.body.classList.add('dashboard-mode');

      // Sync with explicit admin routes if applicable
      // Sync with explicit admin routes if applicable
      // Sync with explicit admin routes if applicable
      if (result.role === 'admin' || result.role === 'agent' || result.role === 'super_agent' || result.role === 'master_agent') {
        const roleKey = result.role === 'admin' ? 'admin' : ((result.role === 'super_agent' || result.role === 'master_agent') ? 'super_agent' : 'agent');
        // Use React Router navigation for smoother transitions
        navigate(`/${roleKey}/dashboard`);
      }
    } catch (err) {
      throw err;
    }
  };

  const handleLogout = useCallback(() => {
    const activeToken = token;
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setSlipSelections([]);
    setWager('');
    setTeaserPoints('');
    hasRedirectedRole.current = false; // allow redirect again on next login
    clearAuthBootstrapCache();
    invalidateMeCache(activeToken || '');
    localStorage.removeItem('token');   // clear legacy cache
    localStorage.removeItem('userRole');
    document.body.classList.remove('dashboard-mode');
    // Clear the httpOnly cookie server-side (best-effort, fire-and-forget)
    logoutSession();
    handleHomeClick();
  }, [token]);

  const handleViewChange = useCallback((view) => {
    setDashboardView(view);
    setMobileSidebarOpen(false);
    setMobileResultsActive(false);
  }, []);

  // Bridge for components that aren't passed `onViewChange` directly
  // (e.g. the Wager Confirmed sheet rendered inside ModeBetPanel) — they
  // dispatch this event and we route it through the same handler the
  // header / sidebar use, keeping nav state in one place.
  useEffect(() => {
    const handleNavigate = (event) => {
      const target = event?.detail?.view;
      if (typeof target === 'string' && target.length > 0) {
        handleViewChange(target);
      }
    };
    window.addEventListener('navigate:view', handleNavigate);
    return () => window.removeEventListener('navigate:view', handleNavigate);
  }, [handleViewChange]);

  const handleBetModeChange = useCallback((mode) => {
    const normalized = normalizeBetMode(mode);
    setBetMode(normalized);
    if (normalized === 'straight') {
      setSlipSelections(prev => (prev.length > 0 ? [prev[prev.length - 1]] : []));
    }
  }, []);

  const handleHomeClick = useCallback(() => {
    setDashboardView('dashboard');
    setSelectedSports([]);
    setActiveLeague('all');
    setMobileSidebarOpen(false);
    setMobileResultsActive(false);
  }, []);

  const handleContinue = useCallback(() => {
    setMobileResultsActive(true);
  }, []);

  // Go back from results to selection menu, preserving current sport selection
  const handleMobileBack = useCallback(() => {
    setMobileResultsActive(false);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setMobileSidebarOpen(prev => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const handleBetPlaced = useCallback(() => {
    refetchUser();
  }, [refetchUser]);

  const handleSportToggle = useCallback((sport, options = {}) => {
    // When user changes selection, exit results state
    setMobileResultsActive(false);
    const quickFilters = new Set(['up-next', 'commercial-live']);
    // `replace` is set by the mobile row click path (no checkboxes →
    // visually single-select). When true, any prior real-sport
    // selection is dropped so `selectedSports[0]` always reflects the
    // sport the user just tapped. Desktop checkbox path leaves it
    // undefined and keeps the additive behavior.
    const replace = options.replace === true;
    setSelectedSports(prev => {
      const isSelected = prev.includes(sport);
      if (isSelected) {
        return prev.filter(s => s !== sport);
      }
      if (quickFilters.has(sport)) {
        return [sport];
      }
      if (replace) {
        return [sport];
      }
      return [...prev.filter(s => !quickFilters.has(s)), sport];
    });
  }, []);

  const handleOddsFormatChange = useCallback(async (nextFormat) => {
    const userId = currentUser?.id || '';
    const normalized = applyOddsFormat(nextFormat, userId);

    setUser(prev => (
      prev
        ? {
          ...prev,
          settings: {
            ...(prev.settings || {}),
            oddsFormat: normalized,
          },
        }
        : prev
    ));

    if (!token) return;

    try {
      setIsUpdatingOddsFormat(true);
      const response = await updateProfile({ settings: { oddsFormat: normalized } }, token);
      const persistedSettings = response?.user?.settings;
      if (persistedSettings && userId) {
        writeStoredOddsFormat(persistedSettings.oddsFormat || normalized, userId);
      }
      if (persistedSettings) {
        setUser(prev => (
          prev
            ? {
              ...prev,
              settings: persistedSettings,
            }
            : prev
        ));
      }
    } catch (error) {
      console.error('Failed to persist odds format:', error);
      showToast('Odds format updated locally, but profile sync failed.', 'warning');
    } finally {
      setIsUpdatingOddsFormat(false);
    }
  }, [currentUser?.id, token, applyOddsFormat, showToast]);

  const oddsFormatContextValue = useMemo(() => ({
    oddsFormat,
    setOddsFormat: handleOddsFormatChange,
    isUpdatingOddsFormat,
  }), [oddsFormat, handleOddsFormatChange, isUpdatingOddsFormat]);


  return (
    <OddsFormatProvider value={oddsFormatContextValue}>
      <NetworkStatusBanner isOnline={isOnline} />
      <div className="app-container">
      {/* Public landing renders immediately; session restore happens in the background. */}
      {!isLoggedIn ? (
        <LandingPage onLogin={handleLogin} isLoggedIn={isLoggedIn} />
      ) : (
        <Suspense fallback={<LoadingSpinner variant="overlay" label="Loading dashboard..." />}>
          <UserDashboardShell
            user={currentUser}
            token={token}
            realtimeConnectionState={realtimeConnected ? 'open' : realtimeConnectionState}
            lastRealtimeEventAt={lastRealtimeEventAt}
            dashboardView={dashboardView}
            selectedSports={selectedSports}
            betMode={betMode}
            mobileSidebarOpen={mobileSidebarOpen}
            showPromo={showPromo}
            mobileViewState={mobileViewState}
            isMobileViewport={isMobileViewport}
            slipSelections={slipSelections}
            wager={wager}
            teaserPoints={teaserPoints}
            betModeRules={currentBetModeRules}
            onLogout={handleLogout}
            onViewChange={handleViewChange}
            onToggleSidebar={handleToggleSidebar}
            onContinue={handleContinue}
            onMobileBack={handleMobileBack}
            onHomeClick={handleHomeClick}
            onSportToggle={handleSportToggle}
            onBetModeChange={handleBetModeChange}
            onCloseSidebar={handleCloseSidebar}
            onSelectionsChange={setSlipSelections}
            onWagerChange={setWager}
            onTeaserPointsChange={setTeaserPoints}
            onBetPlaced={handleBetPlaced}
          />
        </Suspense>
      )}
      </div>
    </OddsFormatProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}

export default App;
