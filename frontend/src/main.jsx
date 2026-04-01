import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './mobile.css'
import App from './App.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { getMe, getSession, logoutSession } from './api'
import { useEffect, useState } from 'react'
import { ToastProvider } from './contexts/ToastContext.jsx'

const clearAuthSession = () => {
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
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const storedRole = String(localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || '').toLowerCase();

      try {
        // 1. Try Bearer-token validation first (fast, no cookie dependency).
        if (token) {
          if (!localStorage.getItem('token')) {
            localStorage.setItem('token', token);
          }
          const me = await getMe(token);
          const role = String(me?.role || '').toLowerCase();
          if (role) {
            localStorage.setItem('userRole', role);
            sessionStorage.setItem('userRole', role);
          }
          if (isMounted) {
            setIsAllowed(allowedRoles.includes(role));
            setIsChecking(false);
          }
          return;
        }

        // 2. No localStorage token — try cookie-based session restore.
        //    This covers the case where the user reloaded and App.jsx session
        //    restore hasn't populated localStorage yet (race condition).
        const session = await getSession({ timeoutMs: 6000 });
        if (session?.token) {
          // Sync localStorage so subsequent checks are instant.
          localStorage.setItem('token', session.token);
          localStorage.setItem('userRole', session.role || 'user');
          const role = String(session.role || '').toLowerCase();
          if (isMounted) {
            setIsAllowed(allowedRoles.includes(role));
            setIsChecking(false);
          }
          return;
        }

        // 3. Neither method worked — deny.
        if (isMounted) {
          setIsAllowed(false);
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
                  <AdminPanel role="admin" onExit={handleExitToHome} />
                </ProtectedRoleRoute>
              </RouteShell>
            }
          />
          <Route
            path="/agent/dashboard"
            element={
              <RouteShell>
                <ProtectedRoleRoute allowedRoles={['agent']}>
                  <AdminPanel role="agent" onExit={handleExitToHome} />
                </ProtectedRoleRoute>
              </RouteShell>
            }
          />
          <Route
            path="/super_agent/dashboard"
            element={
              <RouteShell>
                <ProtectedRoleRoute allowedRoles={['super_agent', 'master_agent']}>
                  <AdminPanel role="super_agent" onExit={handleExitToHome} />
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
