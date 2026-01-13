import React, { useState } from 'react';

function AdminHeader({ onMenuToggle, onLogout }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
              👤 ADMIN ▼
            </button>
            {showDropdown && (
              <div className="dropdown-menu">
                <a href="#profile" onClick={() => setShowDropdown(false)}>👤 Profile</a>
                <a href="#settings" onClick={() => setShowDropdown(false)}>⚙️ Settings</a>
                <a href="#logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>🚪 Logout</a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="admin-header-bottom">
        <div className="balance-section">
          <div className="balance-item">
            <span className="balance-label">My Balance</span>
            <span className="balance-amount">$0</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">Week</span>
            <span className="balance-amount green">$3,206</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">Today</span>
            <span className="balance-amount green">$3,206</span>
          </div>
        </div>
        <div className="active-accounts">
          <span className="label">Active Accts</span>
          <span className="count">201</span>
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
