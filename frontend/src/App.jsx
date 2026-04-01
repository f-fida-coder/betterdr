import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginUser, getMe, getSession, logoutSession, getPublicBetModeRules, normalizeBetMode, updateProfile } from './api';
import Header from './components/Header';
import LeagueNav from './components/LeagueNav';
import Hero from './components/Hero';
import DashboardHeader from './components/DashboardHeader';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardMain from './components/DashboardMain';
import PrimeLiveView from './components/PrimeLiveView';
import UltraLiveView from './components/UltraLiveView';
import CasinoView from './components/CasinoView';
import LiveCasinoView from './components/LiveCasinoView';
import PropsView from './components/PropsView';
import RulesView from './components/RulesView';
import BonusView from './components/BonusView';
import MobileGridMenu from './components/MobileGridMenu';
import MobileContentView from './components/MobileContentView';
import PromoCard from './components/PromoCard';
import TutorialsView from './components/TutorialsView';
import SupportView from './components/SupportView';
import ChatWidget from './components/ChatWidget';
import MyBetsView from './components/MyBetsView';
import AdminPanel from './components/AdminPanel';
import LandingPage from './components/LandingPage';
import ModeBetPanel from './components/ModeBetPanel';
import LoadingSpinner from './components/LoadingSpinner';
import { useToast } from './contexts/ToastContext';
import { OddsFormatProvider } from './contexts/OddsFormatContext';
import { normalizeOddsFormat, readStoredOddsFormat, writeStoredOddsFormat } from './utils/odds';
import './index.css';
import './dashboard.css';

// Structural placeholder only — no hardcoded multipliers.
// Real values are loaded from /api/betting/rules (DB) on login and merged in below.
const DEFAULT_BET_MODE_RULES = {
  straight: { minLegs: 1, maxLegs: 1, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
  parlay:   { minLegs: 2, maxLegs: 12, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
  teaser:   { minLegs: 2, maxLegs: 6,  teaserPointOptions: [], payoutProfile: { type: 'table_multiplier', multipliers: {} } },
  if_bet:   { minLegs: 2, maxLegs: 2,  teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
  reverse:  { minLegs: 2, maxLegs: 2,  teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
};

function App() {
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
  const [isMobileSportsSelectionMode, setIsMobileSportsSelectionMode] = useState(false);
  const isMobileViewport = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(max-width: 768px)').matches;

  const [user, setUser] = useState(null); // Store full user object
  const [oddsFormat, setOddsFormat] = useState(readStoredOddsFormat());
  const [isUpdatingOddsFormat, setIsUpdatingOddsFormat] = useState(false);
  const [isSessionBootstrapping, setIsSessionBootstrapping] = useState(true);

  const applyOddsFormat = (nextFormat, userId = '') => {
    const normalized = normalizeOddsFormat(nextFormat);
    setOddsFormat(normalized);
    writeStoredOddsFormat(normalized, userId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oddsFormat:change', { detail: normalized }));
    }
    return normalized;
  };

  // On mount: attempt to restore session from the httpOnly cookie.
  // If the cookie is valid the backend returns a fresh token + user data.
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const result = await getSession({ timeoutMs: 8000 });
        if (isMounted && result?.token) {
          setToken(result.token);
          // Keep localStorage in sync so ProtectedRoleRoute can validate
          // without a second network round-trip on the same page load.
          localStorage.setItem('token', result.token);
          localStorage.setItem('userRole', result.role || 'user');
          setIsLoggedIn(true);
          document.body.classList.add('dashboard-mode');
          setUser({
            username: result.username,
            phoneNumber: result.phoneNumber,
            balance: result.balance,
            pendingBalance: result.pendingBalance,
            availableBalance: result.availableBalance,
            id: result.id,
            role: result.role,
            unlimitedBalance: result.unlimitedBalance,
            settings: result.settings || null,
          });
        }
      } catch {
        // No valid cookie — user needs to log in
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

  useEffect(() => {
    if (!user?.id) return;
    const preferredFormat = normalizeOddsFormat(user?.settings?.oddsFormat || readStoredOddsFormat(user.id));
    applyOddsFormat(preferredFormat, user.id);
  }, [user?.id, user?.settings?.oddsFormat]);

  useEffect(() => {
    const loadBetModeRules = async () => {
      if (!token) return;
      try {
        const payload = await getPublicBetModeRules(token);
        const mapped = (payload?.rules || []).reduce((acc, rule) => {
          acc[normalizeBetMode(rule.mode)] = rule;
          return acc;
        }, {});
        if (Object.keys(mapped).length > 0) {
          setBetModeRules(prev => ({ ...prev, ...mapped }));
        }
      } catch (error) {
        console.warn('Failed to load bet mode rules:', error.message);
      }
    };

    loadBetModeRules();
  }, [token]);

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

  // Redirect admins/agents who land on root "/" to their dashboard (once).
  // Only fires when on "/" to prevent redirect loops with ProtectedRoleRoute.
  useEffect(() => {
    if (!user || hasRedirectedRole.current) return;
    const isAdminLike = ['admin', 'agent', 'super_agent', 'master_agent'].includes(user.role);
    if (!isAdminLike || location.pathname !== '/') return;

    const targetPath = user.role === 'admin'
      ? '/admin/dashboard'
      : ((user.role === 'super_agent' || user.role === 'master_agent') ? '/super_agent/dashboard' : '/agent/dashboard');
    hasRedirectedRole.current = true;
    navigate(targetPath, { replace: true });
  }, [user, navigate, location.pathname]);

  // Listen for user refresh events (e.g., after placing a bet)
  useEffect(() => {
    const handleUserRefresh = () => {
      if (token) {
        fetchUserData(token);
      }
    };

    window.addEventListener('user:refresh', handleUserRefresh);

    return () => {
      window.removeEventListener('user:refresh', handleUserRefresh);
    };
  }, [token]);

  const fetchUserData = async (authToken) => {
    try {
      const userData = await getMe(authToken);
      setUser(userData);
    } catch (e) {
      console.error('Failed to fetch user data', e);
      // Logout only when token is invalid/forbidden; keep session on transient errors.
      if (e?.status === 401 || e?.status === 403) {
        handleLogout();
      }
    }
  };

  const handleLogin = async (username, password) => {
    try {
      // Call real backend authentication
      const result = await loginUser(username, password);

      // Primary auth: httpOnly cookie is set by the backend on every login response.
      // localStorage write below is kept for backward compat with legacy admin/agent
      // components — migrate them to use the cookie/session gradually.
      setToken(result.token);
      localStorage.setItem('token', result.token);
      localStorage.setItem('userRole', result.role);

      // Store user data from the backend response
      setUser({
        username: result.username,
        phoneNumber: result.phoneNumber,
        balance: result.balance,
        pendingBalance: result.pendingBalance,
        availableBalance: result.availableBalance,
        id: result.id,
        role: result.role,
        unlimitedBalance: result.unlimitedBalance,
        settings: result.settings || null,
      });

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

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setSlipSelections([]);
    setWager('');
    setTeaserPoints('');
    hasRedirectedRole.current = false; // allow redirect again on next login
    localStorage.removeItem('token');   // clear legacy cache
    localStorage.removeItem('userRole');
    document.body.classList.remove('dashboard-mode');
    // Clear the httpOnly cookie server-side (best-effort, fire-and-forget)
    logoutSession();
    handleHomeClick();
  };

  const handleViewChange = (view) => {
    setDashboardView(view);
    setMobileSidebarOpen(false);
  };

  const handleBetModeChange = (mode) => {
    const normalized = normalizeBetMode(mode);
    setBetMode(normalized);
    if (normalized === 'straight') {
      setSlipSelections(prev => (prev.length > 0 ? [prev[prev.length - 1]] : []));
    }
  };

  const handleHomeClick = () => {
    setDashboardView('dashboard');
    setSelectedSports([]);
    setActiveLeague('all');
    setIsMobileSportsSelectionMode(false);
    setMobileSidebarOpen(false);
  };

  const handleContinue = () => {
    setIsMobileSportsSelectionMode(false);
  };

  const handleSportToggle = (sport) => {
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
  };

  const handleOddsFormatChange = async (nextFormat) => {
    const userId = user?.id || '';
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
  };

  const oddsFormatContextValue = {
    oddsFormat,
    setOddsFormat: handleOddsFormatChange,
    isUpdatingOddsFormat,
  };


  return (
    <OddsFormatProvider value={oddsFormatContextValue}>
      <div className="app-container">
      {/* Standard User Interface */}
      {isSessionBootstrapping ? (
        <LoadingSpinner variant="overlay" label="Loading session..." />
      ) : !isLoggedIn ? (
        <LandingPage onLogin={handleLogin} isLoggedIn={isLoggedIn} />
      ) : (
        <div className="dashboard-layout">
            <DashboardHeader
            username={user?.username || 'Guest'}
            balance={user?.balance ?? null}
            pendingBalance={user?.pendingBalance ?? null}
            availableBalance={user?.availableBalance ?? user?.balance ?? null}
            role={user?.role} // Pass role
            unlimitedBalance={user?.unlimitedBalance} // Pass unlimitedBalance
            onLogout={handleLogout}
            onViewChange={handleViewChange}
            activeBetMode={betMode}
            onBetModeChange={handleBetModeChange}
            currentView={dashboardView}
            onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            selectedSports={selectedSports}
            onContinue={handleContinue}
            isMobileSportsSelectionMode={isMobileSportsSelectionMode}
            onHomeClick={handleHomeClick}
          />

          <div className={`dashboard-content-area ${isMobileSportsSelectionMode ? 'mobile-sports-mode' : ''}`} style={{ position: 'relative', marginTop: '0' }}>
            {mobileSidebarOpen && (
              <MobileGridMenu
                onClose={() => setMobileSidebarOpen(false)}
                onViewChange={handleViewChange}
              />
            )}

            {dashboardView === 'dashboard' && (
              <>
                {isMobileViewport && isMobileSportsSelectionMode ? (
                  // Mobile: Show only sidebar for sports selection
                  <DashboardSidebar
                    selectedSports={selectedSports}
                    onToggleSport={handleSportToggle}
                    betMode={betMode}
                    isOpen={true}
                    onCloseSidebar={() => setMobileSidebarOpen(false)}
                    isMobileSportsSelectionMode={isMobileSportsSelectionMode}
                  />
                ) : isMobileViewport && selectedSports && selectedSports.length > 0 ? (
                  // Mobile: Show content after Continue
                  <MobileContentView selectedSports={selectedSports} />
                ) : (
                  // Desktop or default view
                  <>
                    <DashboardSidebar
                      selectedSports={selectedSports}
                      onToggleSport={handleSportToggle}
                      betMode={betMode}
                      isOpen={mobileSidebarOpen}
                      onCloseSidebar={() => setMobileSidebarOpen(false)}
                      isMobileSportsSelectionMode={isMobileSportsSelectionMode}
                    />
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                      {showPromo && <PromoCard />}
                      <div style={{ flex: 1 }}>
                        <DashboardMain selectedSports={selectedSports} activeBetMode={betMode} />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {dashboardView === 'prime-live' && <PrimeLiveView />}

            {dashboardView === 'ultra-live' && <UltraLiveView />}

            {dashboardView === 'casino' && (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <CasinoView />
              </div>
            )}

            {dashboardView === 'live-casino' && (
              <div style={{ flex: 1, backgroundColor: '#505050', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <LiveCasinoView />
              </div>
            )}

            {dashboardView === 'props' && <PropsView />}

            {dashboardView === 'rules' && <RulesView />}

            {dashboardView === 'bonus' && <BonusView />}

            {dashboardView === 'tutorials' && <TutorialsView />}

            {dashboardView === 'support' && <SupportView />}

            {dashboardView === 'my-bets' && <MyBetsView />}
          </div>

          <ChatWidget />

          <div className="desktop-feedback-trigger" style={{
            position: 'fixed',
            bottom: '0',
            left: '0',
            width: '260px',
            background: '#004d26',
            color: 'white',
            padding: '10px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '12px',
            zIndex: 100
          }}>
            FEEDBACK
          </div>

          {isLoggedIn && user && user.role === 'user' && (
            <ModeBetPanel
              user={user}
              balance={user.balance}
              availableBalance={user.availableBalance ?? user.balance}
              freeplayBalance={user.freeplayBalance ?? 0}
              freeplayExpiresAt={user.freeplayExpiresAt ?? null}
              mode={betMode}
              onModeChange={handleBetModeChange}
              selections={slipSelections}
              onSelectionsChange={setSlipSelections}
              wager={wager}
              onWagerChange={setWager}
              teaserPoints={teaserPoints}
              onTeaserPointsChange={setTeaserPoints}
              rulesByMode={betModeRules}
              onBetPlaced={() => fetchUserData(token)}
            />
          )}

          <div style={{
            position: 'fixed',
            bottom: '40px',
            left: '20px',
            width: '50px',
            height: '50px',
            background: '#a30000',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            zIndex: 21,
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            border: '2px solid white'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
        </div>
      )}
      </div>
    </OddsFormatProvider>
  );
}

export default App;
