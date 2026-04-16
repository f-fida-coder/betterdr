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
)
