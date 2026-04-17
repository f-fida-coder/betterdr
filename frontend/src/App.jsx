import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  bootstrapAuthSession,
  clearAuthBootstrapCache,
  getMe,
  getPublicBetModeRules,
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
import './index.css';
import './dashboard.css';

const UserDashboardShell = React.lazy(() => import('./components/UserDashboardShell'));

// Structural placeholder only — no hardcoded multipliers.
// Real values are loaded from /api/betting/rules (DB) on login and merged in below.
const DEFAULT_BET_MODE_RULES = {
  straight: { minLegs: 1, maxLegs: 1, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
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
  const isMobileViewport = useMemo(() => typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(max-width: 768px)').matches, []);

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
      console.debug('Performance Metric:', metric);
    });
    
    // Optimize image loading strategies
    optimizeImageLoading();
    
    // Add DNS prefetch and preconnect hints
    addResourceHints();
  }, []);

  const [user, setUser] = useState(null); // Store full user object
  const [oddsFormat, setOddsFormat] = useState(readStoredOddsFormat());
  const [isUpdatingOddsFormat, setIsUpdatingOddsFormat] = useState(false);
  const [isSessionBootstrapping, setIsSessionBootstrapping] = useState(true);

  const applyOddsFormat = useCallback((nextFormat, userId = '') => {
    const normalized = normalizeOddsFormat(nextFormat);
    setOddsFormat(normalized);
    writeStoredOddsFormat(normalized, userId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oddsFormat:change', { detail: normalized }));
    }
    return normalized;
  }, []);

  // On mount: attempt to restore session from the httpOnly cookie.
  // If the cookie is valid the backend returns a fresh token + user data.
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const result = await bootstrapAuthSession({ timeoutMs: 8000 });
        if (isMounted && result?.token) {
          setToken(result.token);
          setIsLoggedIn(true);
          document.body.classList.add('dashboard-mode');
          setUser(result.user || null);
        }
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          clearAuthBootstrapCache();
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          document.body.classList.remove('dashboard-mode');
        }
      } finally {
        if (isMounted) {
          setIsSessionBootstrapping(false);
        }
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const normalizedMode = normalizeBetMode(betMode);
      const dedupeKey = `${item.matchId}-${item.marketType}-${item.selection}`;

      setSlipSelections(prev => {
        const existing = prev.find(sel => sel.dedupeKey === dedupeKey);
        if (existing) return prev;
        const next = [...prev, { ...item, id: Date.now() + Math.random(), dedupeKey }];
        if (normalizedMode === 'straight') {
          return [next[next.length - 1]];
        }
        return next;
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
      const authenticatedUser = {
        username: result.username,
        phoneNumber: result.phoneNumber,
        balance: result.balance,
        pendingBalance: result.pendingBalance,
        availableBalance: result.availableBalance,
        id: result.id,
        role: result.role,
        unlimitedBalance: result.unlimitedBalance,
        settings: result.settings || null,
      };

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

  const handleSportToggle = useCallback((sport) => {
    // When user changes selection, exit results state
    setMobileResultsActive(false);
    const quickFilters = new Set(['up-next', 'commercial-live']);
    setSelectedSports(prev => {
      const isSelected = prev.includes(sport);
      if (isSelected) {
        return prev.filter(s => s !== sport);
      }
      if (quickFilters.has(sport)) {
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
      <div className="app-container">
      {/* Standard User Interface */}
      {isSessionBootstrapping ? (
        <LoadingSpinner variant="overlay" label="Loading session..." />
      ) : !isLoggedIn ? (
        <LandingPage onLogin={handleLogin} isLoggedIn={isLoggedIn} />
      ) : (
        <Suspense fallback={<LoadingSpinner variant="overlay" label="Loading dashboard..." />}>
          <UserDashboardShell
            user={currentUser}
            token={token}
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
