import React, { useEffect, useState } from 'react';
import { getAdminHeaderSummary, getMe } from '../api';

function AdminHeader({ onMenuToggle, onLogout, onViewChange }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [summary, setSummary] = useState({
    totalBalance: null,
    weekNet: null,
    todayNet: null,
    activeAccounts: null
  });
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadSummary = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const [headerData, meData] = await Promise.all([
          getAdminHeaderSummary(token),
          getMe(token)
        ]);
        setSummary({
          totalBalance: headerData?.totalBalance ?? 0,
          totalOutstanding: headerData?.totalOutstanding ?? 0,
          weekNet: headerData?.weekNet ?? 0,
          todayNet: headerData?.todayNet ?? 0,
          activeAccounts: headerData?.activeAccounts ?? 0
        });
        setProfile(meData || null);
      } catch (error) {
        console.error('Failed to load admin header summary:', error);
      }
    };

    loadSummary();
  }, []);

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatCount = (value) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return num.toLocaleString('en-US');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    setShowDropdown(false);
    if (onLogout) {
      onLogout();
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleViewChange = (view) => {
    setShowDropdown(false);
    if (onViewChange) onViewChange(view);
  };

  const displayName = profile?.username ? profile.username.toUpperCase() : 'ADMIN';
  const myBalance = profile?.unlimitedBalance ? 'Unlimited' : (profile?.balance ?? null);

  // For Admin, show Total Outstanding from all users. For Agent/User, show their own.
  const isSuperAdmin = profile?.role === 'admin';
  const outstandingDisplay = isSuperAdmin ? summary.totalOutstanding : (profile?.balanceOwed ?? null);
  const outstandingLabel = isSuperAdmin ? 'Outstanding Balance' : 'Outstanding';

  return (
    <div className="admin-header">
      <div className="admin-header-top">
        <div className="admin-header-left">
          <button className="mobile-menu-toggle" onClick={onMenuToggle}>
            ☰
          </button>
          <h1 className="admin-title">Admin Manager</h1>
        </div>
        <div className="admin-header-right">
          <div className="user-menu">
            <button
              className="user-button"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              👤 {displayName} ▼
            </button>
            {showDropdown && (
              <div className="dropdown-menu">
                <button type="button" onClick={() => handleViewChange('profile')}>👤 Profile</button>
                <button type="button" onClick={() => handleViewChange('settings')}>⚙️ Settings</button>
                <button type="button" onClick={handleLogout}>🚪 Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="admin-header-bottom">
        <div className="balance-section">
          <div className="balance-item">
            <span className="balance-label">My Balance</span>
            <span className="balance-amount">{myBalance === 'Unlimited' ? 'Unlimited' : formatCurrency(myBalance)}</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">{outstandingLabel}</span>
            <span className="balance-amount">{formatCurrency(outstandingDisplay)}</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">Week Profit</span>
            <span className="balance-amount green">{formatCurrency(summary.weekNet)}</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">Today Profit</span>
            <span className="balance-amount green">{formatCurrency(summary.todayNet)}</span>
          </div>
        </div>
        <div className="active-accounts">
          <span className="label">Active Accts</span>
          <span className="count">{formatCount(summary.activeAccounts)}</span>
        </div>
      </div>

      {showLogoutModal && (
        <div className="modal-overlay logout-modal-overlay">
          <div className="modal-content logout-modal">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout from the admin panel?</p>
            <div className="modal-buttons">
              <button className="btn-danger" onClick={confirmLogout}>Yes, Logout</button>
              <button className="btn-secondary" onClick={cancelLogout}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminHeader;
