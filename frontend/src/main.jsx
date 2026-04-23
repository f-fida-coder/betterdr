import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './mobile.css'
import App from './App.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import {
  bootstrapAuthSession,
  clearAuthBootstrapCache,
  getStoredAuthToken,
  getStoredUserRole,
  invalidateMeCache,
  logoutSession
} from './api'
import { useEffect, useState } from 'react'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { loadExternalPresentationAssets } from './utils/performanceOptimization.js'

const AdminPanel = lazy(() => import('./components/AdminPanel.jsx'))

const clearAuthSession = () => {
  const activeToken = getStoredAuthToken();
  clearAuthBootstrapCache();
  invalidateMeCache(activeToken);
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userRole');
  document.body.classList.remove('dashboard-mode');

  const sessionKeys = [
    'adminAuthenticated',
    'adminUsername',
    'agentAuthenticated',
    'agentUsername',
    'super_agentAuthenticated',
    'super_agentUsername',
    'impersonationBaseToken',
    'impersonationBaseRole',
    'impersonationBaseUsername',
    'impersonationBaseId',
    'postSwitchAdminView'
  ];
  sessionKeys.forEach((key) => sessionStorage.removeItem(key));
};

// Per-tab sentinel. Present for the lifetime of this tab session
// (same-tab refreshes preserve it; closing the tab or opening a new
// one drops it because sessionStorage is tab-scoped). Used to
// distinguish "fresh browser session" from "in-tab refresh" so that
// fresh sessions always force a re-login while refreshes don't kick
// the user out mid-workflow.
const TAB_SESSION_SENTINEL_KEY = '__bdr_tab_session';
const FRESH_SESSION_LOGOUT_TIMEOUT_MS = 1500;

const safeSessionGet = (key) => {
  try { return sessionStorage.getItem(key); } catch { return null; }
};
const safeSessionSet = (key, value) => {
  try { sessionStorage.setItem(key, value); } catch { /* private mode / quota */ }
};

// Runs once per tab: if this looks like a brand-new browser session
// (no sentinel yet), wipe any persisted creds and ask the backend to
// invalidate its httpOnly auth_token cookie so /auth/session can't
// auto-restore the user. Bounded by a timeout so a slow backend can't
// block first paint.
const clearIfFreshBrowserSession = async () => {
  if (safeSessionGet(TAB_SESSION_SENTINEL_KEY)) {
    return;
  }

  // Set sentinel up front: even if we race with another tab or an
  // early refresh, only one wipe path runs per tab session.
  safeSessionSet(TAB_SESSION_SENTINEL_KEY, '1');

  clearAuthSession();

  // Best-effort cookie invalidation. If this fails (offline, slow
  // backend), the worst case is that an in-tab /auth/session restore
  // could still recover the user — but the local creds are already
  // wiped, so the restore would only work if the httpOnly cookie is
  // still valid within its 8h TTL. We accept that as a tolerable edge.
  try {
    await Promise.race([
      logoutSession(),
      new Promise((resolve) => setTimeout(resolve, FRESH_SESSION_LOGOUT_TIMEOUT_MS)),
    ]);
  } catch {
    /* swallow — client state is already cleared */
  }
};

const ProtectedRoleRoute = ({ children, allowedRoles }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const validateToken = async () => {
      const token = getStoredAuthToken();
      const storedRole = getStoredUserRole();

      try {
        const auth = await bootstrapAuthSession({ timeoutMs: 6000 });
        const role = String(auth?.role || auth?.user?.role || '').toLowerCase();
        if (isMounted) {
          setIsAllowed(Boolean(auth?.token) && allowedRoles.includes(role));
          setIsChecking(false);
        }
      } catch (error) {
        if (isMounted) {
          // Clear session only for invalid/forbidden credentials.
          if (error?.status === 401 || error?.status === 403) {
            clearAuthSession();
            setIsAllowed(false);
          } else {
            // Network/timeouts should not instantly bounce valid users to landing.
            setIsAllowed(Boolean(token) && allowedRoles.includes(storedRole));
          }
          setIsChecking(false);
        }
      }
    };

    validateToken();
    return () => { isMounted = false; };
  }, [allowedRoles]);

  if (isChecking) {
    return <LoadingSpinner variant="overlay" label="Validating session..." />;
  }

  return isAllowed ? children : <Navigate to="/" replace />;
};

const RouteShell = ({ children }) => (
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
);

const handleExitToHome = async () => {
  clearAuthSession();
  try {
    await logoutSession();
  } catch {
    // Best effort: continue to root even if cookie cleanup request fails.
  } finally {
    window.location.replace('/');
  }
};

const mountApp = () => {
  // Read AFTER clearIfFreshBrowserSession completes: on fresh sessions
  // this is null, so asset preload only runs eagerly for deep-linked
  // protected paths (the user will still hit the login gate there).
  const storedBootstrapToken = getStoredAuthToken();
  const isProtectedPath = typeof window !== 'undefined'
    && /^\/(?:admin|agent|super_agent)(?:\/|$)/.test(window.location.pathname);

  loadExternalPresentationAssets({
    immediate: isProtectedPath || Boolean(storedBootstrapToken),
  });

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RouteShell><App /></RouteShell>} />
            <Route path="/admin" element={<Navigate to="/" replace />} />
            <Route path="/agent" element={<Navigate to="/" replace />} />
            <Route path="/super_agent" element={<Navigate to="/" replace />} />
            <Route
              path="/admin/dashboard"
              element={
                <RouteShell>
                  <ProtectedRoleRoute allowedRoles={['admin']}>
                    <Suspense fallback={<LoadingSpinner variant="overlay" label="Loading admin panel..." />}>
                      <AdminPanel role="admin" onExit={handleExitToHome} />
                    </Suspense>
                  </ProtectedRoleRoute>
                </RouteShell>
              }
            />
            <Route
              path="/agent/dashboard"
              element={
                <RouteShell>
                  <ProtectedRoleRoute allowedRoles={['agent']}>
                    <Suspense fallback={<LoadingSpinner variant="overlay" label="Loading agent panel..." />}>
                      <AdminPanel role="agent" onExit={handleExitToHome} />
                    </Suspense>
                  </ProtectedRoleRoute>
                </RouteShell>
              }
            />
            <Route
              path="/super_agent/dashboard"
              element={
                <RouteShell>
                  <ProtectedRoleRoute allowedRoles={['super_agent', 'master_agent']}>
                    <Suspense fallback={<LoadingSpinner variant="overlay" label="Loading panel..." />}>
                      <AdminPanel role="super_agent" onExit={handleExitToHome} />
                    </Suspense>
                  </ProtectedRoleRoute>
                </RouteShell>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </StrictMode>,
  );
};

// Fresh-session wipe runs before React mounts so the login screen
// renders in a clean, unauthenticated state. If the wipe itself
// throws (shouldn't — it already swallows), still mount so the app
// is reachable.
clearIfFreshBrowserSession().catch(() => {}).finally(mountApp);
