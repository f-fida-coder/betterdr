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
      try {
        const token = localStorage.getItem('token');
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
      } catch {
        if (isMounted) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          setIsAllowed(false);
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
