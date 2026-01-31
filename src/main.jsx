import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './mobile.css'
import App from './App.jsx'
import AdminLogin from './components/AdminLogin.jsx'
import AdminPanel from './components/AdminPanel.jsx'

// Protected Route Component for Admin
const ProtectedAdminRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/admin" replace />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminLogin />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
