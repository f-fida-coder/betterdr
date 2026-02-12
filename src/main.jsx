import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './mobile.css'
import App from './App.jsx'
import AdminLogin from './components/AdminLogin.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import AgentLogin from './components/AgentLogin.jsx'

// Protected Route Component for Admin
const ProtectedAdminRoute = ({ children }) => {
  const isAuth = sessionStorage.getItem('adminAuthenticated') === 'true';
  // Fallback: If session is lost but token exists in localStorage, it might still be valid
  // but for safety with the current architecture, we rely on the set flags.
  return isAuth ? children : <Navigate to="/admin" replace />;
};

const ProtectedAgentRoute = ({ children }) => {
  const isAuth = sessionStorage.getItem('agentAuthenticated') === 'true';
  return isAuth ? children : <Navigate to="/" replace />;
};

const ProtectedSuperAgentRoute = ({ children }) => {
  const isAuth = sessionStorage.getItem('super_agentAuthenticated') === 'true';
  return isAuth ? children : <Navigate to="/" replace />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="/agent" element={<Navigate to="/" replace />} />
        <Route path="/super_agent" element={<Navigate to="/" replace />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminPanel role="admin" onExit={() => {
                sessionStorage.removeItem('adminAuthenticated');
                sessionStorage.removeItem('adminUsername');
                localStorage.removeItem('token');
                window.location.href = '/';
              }} />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/agent/dashboard"
          element={
            <ProtectedAgentRoute>
              <AdminPanel role="agent" onExit={() => {
                sessionStorage.removeItem('agentAuthenticated');
                sessionStorage.removeItem('agentUsername');
                localStorage.removeItem('token');
                window.location.href = '/';
              }} />
            </ProtectedAgentRoute>
          }
        />
        <Route
          path="/super_agent/dashboard"
          element={
            <ProtectedSuperAgentRoute>
              <AdminPanel role="super_agent" onExit={() => {
                sessionStorage.removeItem('super_agentAuthenticated');
                sessionStorage.removeItem('super_agentUsername');
                localStorage.removeItem('token');
                window.location.href = '/';
              }} />
            </ProtectedSuperAgentRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
