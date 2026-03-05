import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './mobile.css'
import App from './App.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { getMe } from './api'
import { useEffect, useState } from 'react'
import { ToastProvider } from './contexts/ToastContext.jsx'

const ProtectedRoleRoute = ({ children, allowedRoles }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      const storedRole = String(localStorage.getItem('userRole') || '').toLowerCase();

      try {
        if (!token) {
          if (isMounted) {
            setIsAllowed(false);
            setIsChecking(false);
          }
          return;
        }

        const me = await getMe(token);
        const role = String(me?.role || '').toLowerCase();
        if (isMounted) {
          setIsAllowed(allowedRoles.includes(role));
          setIsChecking(false);
        }
      } catch (error) {
        if (isMounted) {
          // Clear session only for invalid/forbidden credentials.
          if (error?.status === 401 || error?.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
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
                  <AdminPanel role="admin" onExit={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userRole');
                    window.location.href = '/';
                  }} />
                </ProtectedRoleRoute>
              </RouteShell>
            }
          />
          <Route
            path="/agent/dashboard"
            element={
              <RouteShell>
                <ProtectedRoleRoute allowedRoles={['agent']}>
                  <AdminPanel role="agent" onExit={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userRole');
                    window.location.href = '/';
                  }} />
                </ProtectedRoleRoute>
              </RouteShell>
            }
          />
          <Route
            path="/super_agent/dashboard"
            element={
              <RouteShell>
                <ProtectedRoleRoute allowedRoles={['super_agent', 'master_agent']}>
                  <AdminPanel role="super_agent" onExit={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userRole');
                    window.location.href = '/';
                  }} />
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
