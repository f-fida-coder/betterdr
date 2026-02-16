import React, { useEffect, useState } from 'react';
import { getMe, updateProfile } from '../../api';

const formatCurrency = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(num);
};

function ProfileView() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLayoutChange = async (e) => {
    const newLayout = e.target.value;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await updateProfile({ dashboardLayout: newLayout }, token);
      setProfile(prev => ({ ...prev, dashboardLayout: newLayout }));
      alert('Layout updated. The page will reload to apply changes.');
      window.location.reload();
    } catch (err) {
      alert('Failed to update layout: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login as admin to view profile.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getMe(token);
        setProfile(data);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>My Profile</h2>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading profile...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && profile && (
          <div className="settings-container">
            <div className="settings-form">
              <div className="form-section">
                <h3>Account</h3>
                <div className="form-group">
                  <label>Username:</label>
                  <input type="text" value={profile.username || ''} readOnly />
                </div>

                <div className="form-section">
                  <h3>Preferences</h3>
                  <div className="form-group">
                    <label>Dashboard Layout:</label>
                    <select
                      value={profile.dashboardLayout || 'tiles'}
                      onChange={handleLayoutChange}
                      disabled={saving}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="tiles">Tiles (Default)</option>
                      <option value="sidebar">Sidebar Navigation</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone Number:</label>
                  <input type="text" value={profile.phoneNumber || ''} readOnly />
                </div>
                <div className="form-group">
                  <label>Role:</label>
                  <input type="text" value={profile.role || ''} readOnly />
                </div>
                <div className="form-group">
                  <label>Super Admin:</label>
                  <input type="text" value={profile.isSuperAdmin ? 'Yes' : 'No'} readOnly />
                </div>
                <div className="form-group">
                  <label>Unlimited Balance:</label>
                  <input type="text" value={profile.unlimitedBalance ? 'Enabled' : 'Disabled'} readOnly />
                </div>
              </div>

              <div className="form-section">
                <h3>Balances</h3>
                <div className="form-group">
                  <label>Balance:</label>
                  <input type="text" value={formatCurrency(profile.balance)} readOnly />
                </div>
                <div className="form-group">
                  <label>Pending Balance:</label>
                  <input type="text" value={formatCurrency(profile.pendingBalance)} readOnly />
                </div>
                <div className="form-group">
                  <label>Available Balance:</label>
                  <input type="text" value={formatCurrency(profile.availableBalance)} readOnly />
                </div>
                <div className="form-group">
                  <label>Outstanding (Settle Limit):</label>
                  <input type="text" value={formatCurrency(profile.balanceOwed)} readOnly />
                </div>
                <div className="form-group">
                  <label>Credit Limit:</label>
                  <input type="text" value={formatCurrency(profile.creditLimit)} readOnly />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileView;
