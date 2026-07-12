import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  addOpenParlayLeg,
  bootstrapAuthSession,
  clearAuthBootstrapCache,
  createRequestId,
  getMe,
  getMatches,
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
import { seedMatchesPreload } from './hooks/useMatches';
import { findSportItemById } from './data/sportsData';
import LandingPage from './components/LandingPage';
import LoadingSpinner from './components/LoadingSpinner';
import { useToast } from './contexts/ToastContext';
import { OddsFormatProvider } from './contexts/OddsFormatContext';
import { formatLineValue, formatOdds, formatSpreadValue, normalizeOddsFormat, readStoredOddsFormat, writeStoredOddsFormat } from './utils/odds';
import useWebSocket from './hooks/useWebSocket';
import useLiveSyncPoll from './hooks/useLiveSyncPoll';
import useNetworkStatus from './hooks/useNetworkStatus';
import NetworkStatusBanner from './components/NetworkStatusBanner';
import './index.css';
import './dashboard.css';

const UserDashboardShell = React.lazy(() => import('./components/UserDashboardShell'));

// Structural placeholder only — no hardcoded multipliers.
// Real values are loaded from /api/betting/rules (DB) on login and merged in below.
const DEFAULT_BET_MODE_RULES = {
  straight: { minLegs: 1, maxLegs: 12, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
  // parlay max legs 8 per Nicky, 2026-07-11 — must match BetModeRules.php default.
  parlay:   { minLegs: 2, maxLegs: 8,  teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
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
  // Open-parlay RESUME mode. When set, the player tapped "Open N" on a pending
  // open parlay and is now adding the remaining legs from the board. A board
  // tap is intercepted (NOT added to the slip) → a confirm dialog → on confirm
  // the existing addOpenParlayLeg endpoint is called for `betId`.
  //   resumeOpenParlay: { betId, targetLegs, legsAdded } | null
  //   resumeConfirmLeg: the tapped board item awaiting confirmation | null
  //   resumeAddingRef:  in-flight guard so concurrent taps/adds can't race
  const [resumeOpenParlay, setResumeOpenParlay] = useState(null);
  const [resumeConfirmLeg, setResumeConfirmLeg] = useState(null);
  const resumeAddingRef = useRef(false);
  const [wager, setWager] = useState('');
  const [teaserPoints, setTeaserPoints] = useState('');
  // Picked teaser-type id (e.g. 'standard_6_4'). null until the user
  // chooses a type from the picker; lifted to App so MobileContentView
  // can use it to render adjusted spreads in the games board while
  // ModeBetPanel uses it to drive the slip's payout/labels and to
  // include teaserTypeId on the placement payload.
  const [selectedTeaserTypeId, setSelectedTeaserTypeId] = useState(null);
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
    // ws-server.php broadcasts the body under `data`; the REST event log shape
    // uses `payload`. Accept either so sportKey/userId targeting works on both
    // the WebSocket path and any payload-shaped message.
    const payload = message.data ?? message.payload ?? {};

    // bet:settled is fanned out from BetSettlementService /
    // OutrightSettlementService after a per-ticket commit. The MyBets
    // listener subscribes to a `bets:refresh` window event; this dispatch
    // is the WS path, useLiveSyncPoll's poll is the REST fallback.
    if (channel === 'bet:settled') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bets:refresh', {
          detail: {
            reason: 'realtime',
            userId: payload?.userId ?? null,
            betId: payload?.betId ?? null,
            status: payload?.status ?? null,
          },
        }));
      }
      return;
    }

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
      // Phase 2 added a scores-only channel — fires when the fast
      // scores tick (~20s) updates the score on a row without
      // touching odds. We still want to refetch the matches payload
      // so the player sees the new score; the row's lastOddsSyncAt
      // is intentionally NOT advanced by this channel, so the
      // bet-ability gate stays honest.
      && channel !== 'odds:sport:score'
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
      const sportKey = (payload && (payload.sport_key || payload.sportKey)) || null;
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
    // Odds/score events are public display signals, same as GET /api/matches.
    // Keep this transport on for logged-out visitors too so Live Now updates
    // from the VPS WebSocket/event bus without requiring a login. Bet placement
    // still re-validates odds server-side before money moves.
    enabled: true,
  });

  // Realtime-staleness watchdog. A WebSocket can report "connected" while
  // silently delivering nothing — a half-open socket, or the publish side
  // hiccupping — which would freeze live odds until the slow 15s useMatches
  // backstop and make the player reach for Refresh. We treat realtime as
  // STALE when the socket is down OR no odds event has landed for
  // REALTIME_SILENT_MS, and let the cheap sync-poll cover the gap. Each
  // realtime event resets the timer (the effect re-runs on lastRealtimeEventAt),
  // so a healthy, actively-delivering socket keeps the poll OFF (no double
  // refetch); only genuine quiet windows fall back to polling.
  const REALTIME_SILENT_MS = 12000;
  const [realtimeSilent, setRealtimeSilent] = useState(true);
  useEffect(() => {
    if (!realtimeConnected) {
      setRealtimeSilent(true);
      return undefined;
    }
    setRealtimeSilent(false);
    const t = window.setTimeout(() => setRealtimeSilent(true), REALTIME_SILENT_MS);
    return () => window.clearTimeout(t);
  }, [realtimeConnected, lastRealtimeEventAt]);

  // Hostinger-compatible push-feel transport: poll /api/sync/recent for fresh
  // events from the worker's event log whenever realtime is down OR has gone
  // quiet (the watchdog above). In production the WebSocket on port 5001 isn't
  // reachable, so this is the path most users traverse. Each request is a tiny
  // file-read on the backend — no DB, no upstream API, no long-poll — so a 3s
  // cadence is safe for shared PHP-FPM and gives live odds a near-instant,
  // no-Refresh-needed feel. When a healthy WS is actively delivering, the
  // watchdog keeps this OFF so dev/WS users don't double-fetch.
  useLiveSyncPoll({
    enabled: !realtimeConnected || realtimeSilent,
    intervalMs: 3000,
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

  // Kick off the default-landing /api/matches fetch at App mount, in
  // parallel with the auth bootstrap and the lazy UserDashboardShell
  // chunk download. The promise is seeded into useMatches' in-flight
  // dedupe map so when SportContentView mounts a moment later, its
  // first fetch picks up the same request instead of starting a new
  // round-trip. Shaves the cumulative wait of (auth bootstrap +
  // chunk fetch) off perceived TTI on cold loads. Public endpoint, no
  // auth required, so firing pre-bootstrap is safe. The preload self-
  // invalidates after PRELOAD_MAX_AGE_MS in useMatches if the user
  // lingered on the landing page too long.
  useEffect(() => {
    // Default landing section in DashboardMain.jsx is
    //   { sportId: null, filter: null, status: 'live-upcoming', limit: 6 }
    // which becomes scopeKey "all::6" inside SportContentView. Mirror
    // that here so the cacheKey lines up.
    const preloadPromise = getMatches('live-upcoming', {
      payload: 'core',
      limit: 6,
      trigger: 'preload',
    }).catch(() => []);  // swallow errors — useMatches will retry on its own
    seedMatchesPreload('live-upcoming', 'all::6', preloadPromise);
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
      // RESUME MODE: route the tap to the open-parlay confirm dialog instead of
      // the slip. Race-safe — ignore the tap while an add is in flight or a
      // confirm is already open (only the first pending leg is kept), so a
      // double-tap or second selection can't commit two legs at once.
      if (resumeOpenParlay) {
        if (resumeAddingRef.current) {
          showToast('Still adding your last leg — one sec.', 'info');
          return;
        }
        setResumeConfirmLeg((current) => current || { ...item });
        return;
      }
      // Teaser bets price off pregame spreads — real US books reject
      // live legs, and the backend would refuse this ticket at placement
      // anyway. Bounce live selections at the add boundary so the user
      // gets immediate feedback instead of a delayed placement error.
      // The board already hides live cards in teaser mode, so reaching
      // this guard means the user toggled to teaser AFTER queuing a
      // live leg in another mode.
      if (item.isLive && String(betMode || '').toLowerCase() === 'teaser') {
        showToast('Live games can’t be added to a teaser — teaser pricing requires pregame spreads.', 'warning');
        return;
      }
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
  }, [betMode, showToast, resumeOpenParlay]);

  const { data: userData, error: userQueryError, refetch: refetchUser } = useQuery({
    queryKey: ['user', token],
    queryFn: async () => {
      if (!token) return null;
      const userData = await getMe(token);
      primeAuthBootstrapCache({ token, role: userData?.role, user: userData, source: 'user-query' });
      return userData;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  // `onSuccess` / `onError` were removed in @tanstack/react-query v5,
  // so the previous in-options callbacks were dead code — the local
  // `user` state never got the refreshed values after refetchUser()
  // fired (e.g. on `user:refresh` after a bet placement). The display
  // path still worked because `currentUser = userData || user` reads
  // userData directly, but consumers that read `user` (subscriptions
  // / effects keyed on `setUser` outputs) saw stale data. Mirror
  // onSuccess via a useEffect here; the onError equivalent (auth-
  // failure logout) is wired after handleLogout is declared further
  // down so we don't hit the TDZ for that callback.
  useEffect(() => {
    if (userData) setUser(userData);
  }, [userData]);

  const currentUser = userData || user;

  useEffect(() => {
    if (!currentUser?.id) return;
    const preferredFormat = normalizeOddsFormat(currentUser?.settings?.oddsFormat || readStoredOddsFormat(currentUser.id));
    applyOddsFormat(preferredFormat, currentUser.id);
  }, [currentUser?.id, currentUser?.settings?.oddsFormat, applyOddsFormat]);

  // Hydrate the display timezone from the persisted user setting. The
  // localStorage copy is just a fast-path mirror; the backend's
  // settings.timezone is the source of truth so the player's choice
  // follows them across browsers and devices.
  useEffect(() => {
    if (!currentUser?.id) return;
    const stored = currentUser?.settings?.timezone;
    if (typeof stored === 'string' && stored.length > 0) {
      // setSiteTimezone validates the value, writes localStorage, and
      // dispatches the `siteTimezone:change` event for any view that
      // wants to repaint.
      import('./utils/timezone').then(({ setSiteTimezone }) => setSiteTimezone(stored));
    }
  }, [currentUser?.id, currentUser?.settings?.timezone]);

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
    setSelectedTeaserTypeId(null);
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

  // Auth-failure logout effect — the v4 onError handler that lived on
  // the useQuery options was removed in v5, so 401/403 responses from
  // /auth/me no longer triggered a logout. Reattach here, after
  // handleLogout exists, to keep "session invalidated → kick the user"
  // working without a TDZ when the component first mounts.
  useEffect(() => {
    if (userQueryError && (userQueryError.status === 401 || userQueryError.status === 403)) {
      handleLogout();
    }
  }, [userQueryError, handleLogout]);

  const handleViewChange = useCallback((view) => {
    setDashboardView(view);
    setMobileSidebarOpen(false);
    setMobileResultsActive(false);
  }, []);

  // ── Open-parlay resume ────────────────────────────────────────────────
  // Enter resume mode for a pending open parlay and jump to the board so the
  // player can add the remaining legs. Each board tap is confirmed, then sent
  // to the EXISTING addOpenParlayLeg endpoint — never a new bet/placement.
  const handleResumeOpenParlay = useCallback((bet) => {
    const betId = bet?.id || bet?.ticketId;
    const targetLegs = Number(bet?.targetLegs) || 0;
    const legsAdded = Array.isArray(bet?.selections) ? bet.selections.length : 0;
    if (!betId || targetLegs < 2 || legsAdded >= targetLegs) return;
    setResumeOpenParlay({ betId, targetLegs, legsAdded });
    setResumeConfirmLeg(null);
    setDashboardView('dashboard');
    setMobileSidebarOpen(false);
    const left = targetLegs - legsAdded;
    showToast(`Resuming open parlay — tap ${left} more selection${left === 1 ? '' : 's'} to add.`, 'info');
  }, [showToast]);

  const exitResumeOpenParlay = useCallback(() => {
    setResumeOpenParlay(null);
    setResumeConfirmLeg(null);
    resumeAddingRef.current = false;
  }, []);

  const cancelResumeConfirm = useCallback(() => {
    setResumeConfirmLeg(null);
  }, []);

  // Commit the confirmed leg to the open ticket via addOpenParlayLeg. The
  // in-flight guard blocks concurrent adds; server-side rules (cap, past-post,
  // duplicate game, odds-acceptance) are surfaced verbatim as toasts — we do
  // NOT reimplement or bypass any of them here.
  const confirmResumeAddLeg = useCallback(async () => {
    const item = resumeConfirmLeg;
    const resume = resumeOpenParlay;
    if (!item || !resume || resumeAddingRef.current) return;
    resumeAddingRef.current = true;
    try {
      const leg = {
        matchId: item.matchId,
        selection: item.selection,
        odds: Number(item.odds),
        marketType: item.marketType,
        type: item.marketType,
        // Send `point` EXACTLY like the normal betslip placement does
        // (ModeBetPanel keys off sel.point, not the always-present sel.line):
        // only genuine alt-rung / point-carrying selections include a point, so
        // a MAIN-line spread/total/ML sends none and takes the lenient
        // name-match path at validation — the same path a straight bet uses.
        // Using item.line here forced every main line through the strict
        // alt-line authentication and rejected it ("Line X is no longer offered").
        ...(Number.isFinite(Number(item.point)) ? { point: Number(item.point) } : {}),
        ...(item.selectionFull ? { selectionFull: item.selectionFull } : {}),
      };
      await addOpenParlayLeg(resume.betId, leg, token, { requestId: createRequestId() });
      const nextAdded = resume.legsAdded + 1;
      // Refresh pending list ("Open N" ticks down) and the header balances.
      window.dispatchEvent(new CustomEvent('bets:refresh'));
      window.dispatchEvent(new CustomEvent('user:refresh'));
      if (nextAdded >= resume.targetLegs) {
        setResumeOpenParlay(null);
        showToast('Open parlay complete — all legs added.', 'success');
      } else {
        setResumeOpenParlay({ ...resume, legsAdded: nextAdded });
        showToast(`Leg added — ${resume.targetLegs - nextAdded} to go.`, 'success');
      }
    } catch (err) {
      const code = err?.code || err?.payload?.code;
      const msg = code === 'ODDS_CHANGED'
        ? 'Odds moved — tap the selection again to add at the new price.'
        : (err?.message || 'Could not add that leg to your open parlay.');
      showToast(msg, 'error');
    } finally {
      resumeAddingRef.current = false;
      setResumeConfirmLeg(null);
    }
  }, [resumeConfirmLeg, resumeOpenParlay, token, showToast]);

  // Human label for the confirm dialog, e.g. "Ghana +2 -104".
  const resumeLegLabel = useCallback((item) => {
    if (!item) return '';
    const name = String(item.selectionFull || item.selection || '').trim();
    const mt = String(item.marketType || '').toLowerCase();
    let line = '';
    if (mt === 'spreads' && Number.isFinite(Number(item.line))) {
      line = ` ${formatSpreadValue(Number(item.line))}`;
    } else if (mt === 'totals' && Number.isFinite(Number(item.line))) {
      line = ` ${formatLineValue(Math.abs(Number(item.line)))}`;
    }
    const price = formatOdds(item.odds, oddsFormat);
    return `${name}${line} ${price}`.trim();
  }, [oddsFormat]);

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
    // Drop the picked teaser type whenever we switch modes (incl.
    // teaser→teaser via re-entry). The picker re-renders so the user
    // makes a fresh choice — avoids carrying a 7/5 selection from
    // last session into a brand-new slip.
    if (normalized !== 'teaser') {
      setSelectedTeaserTypeId(null);
      setTeaserPoints('');
    } else {
      // Switching INTO teaser: prune any live legs the user queued in
      // straight/parlay mode. Backend rejects them and the board hides
      // them — leaving stale live legs visible in the slip would let
      // the user hit "Place" and get a confusing failure.
      setSlipSelections(prev => prev.filter(sel => !sel.isLive));
    }
  }, []);

  // Wrapper around setSelectedTeaserTypeId that also clears the
  // legacy teaserPoints field whenever the type is reset to null
  // (e.g. user tapped "Change" in the board picker). Without this
  // a stale teaserPoints value from the previous type would survive
  // until the user re-picks and the auto-sync useEffect in
  // ModeBetPanel re-fires — visible as "Pick a teaser type" warning
  // in the slip while teaserPoints is non-empty.
  const handleTeaserTypeChange = useCallback((id) => {
    setSelectedTeaserTypeId(id);
    if (id === null) {
      setTeaserPoints('');
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
    // Mobile (≤768): drives MobileContentView via mobileViewState='results'.
    // Tablet (769–1024): CSS overlays the sidebar full-width on top of
    // DashboardMain; without closing it here the user sees no change after
    // Continue because the overlaid sidebar still covers the results.
    // Desktop (>1024): sidebar isn't overlaid, so this is a no-op.
    setMobileResultsActive(true);
    setMobileSidebarOpen(false);
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
      let next = prev.filter(s => !quickFilters.has(s));
      // Ticking a SPECIFIC futures board while the top-level FUTURES tab is
      // active must deselect the tab: the resolver's "unscoped wins" rule
      // would otherwise keep widening the view to every board, so the user
      // ticks "To Win World Series" and still sees the whole catalog under
      // a FUTURES header. A user picking a named board wants that board.
      const item = findSportItemById(sport);
      if (item?.type === 'futures' && item.family) {
        next = next.filter((s) => {
          const other = findSportItemById(s);
          return !(other?.type === 'futures' && !other.family);
        });
      }
      return [...next, sport];
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
            selectedTeaserTypeId={selectedTeaserTypeId}
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
            onTeaserTypeChange={handleTeaserTypeChange}
            onBetPlaced={handleBetPlaced}
            onResumeOpenParlay={handleResumeOpenParlay}
          />
          {resumeOpenParlay && (
            <ResumeOpenParlayBanner
              remaining={Math.max(0, resumeOpenParlay.targetLegs - resumeOpenParlay.legsAdded)}
              onDone={exitResumeOpenParlay}
            />
          )}
          {resumeConfirmLeg && (
            <ResumeAddLegDialog
              label={resumeLegLabel(resumeConfirmLeg)}
              onConfirm={confirmResumeAddLeg}
              onCancel={cancelResumeConfirm}
            />
          )}
        </Suspense>
      )}
      </div>
    </OddsFormatProvider>
  );
}

// Sticky banner shown while resuming an open parlay, so the player knows board
// taps are adding to the existing ticket (not starting a new bet) and can exit.
// Fixed + full-width with a max content width → reads the same on mobile and
// desktop. z-index above the board, below toasts/dialogs.
function ResumeOpenParlayBanner({ remaining, onDone }) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1400,
        background: '#ff5051',
        color: '#fff',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.18)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 0 }}>
          <i className="fa-solid fa-layer-group" style={{ marginRight: 8 }} />
          Adding to your open parlay — {remaining} leg{remaining === 1 ? '' : 's'} left
        </span>
        <button
          type="button"
          onClick={onDone}
          style={{
            flexShrink: 0,
            padding: '6px 16px',
            fontSize: 13,
            fontWeight: 800,
            color: '#ff5051',
            background: '#fff',
            border: 'none',
            borderRadius: 999,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

// Per-tap confirmation before an irreversible open-parlay leg is committed.
// Centered modal; responsive via max-width + width percentage.
function ResumeAddLegDialog({ label, onConfirm, onCancel }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#fff',
          borderRadius: 14,
          padding: '20px 18px 16px',
          boxShadow: '0 18px 50px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
          Add this leg?
        </div>
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
          Add the following to your open parlay:
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: '#0f172a',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '10px 12px',
            margin: '8px 0 6px',
            wordBreak: 'break-word',
          }}
        >
          {label || 'Selection'}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>
          Open-parlay legs can’t be removed once added.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: 14,
              fontWeight: 700,
              color: '#475569',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: 14,
              fontWeight: 800,
              color: '#fff',
              background: '#16a34a',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
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
