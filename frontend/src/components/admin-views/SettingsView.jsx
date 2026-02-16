import React, { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../api';

function SettingsView() {
  const [settings, setSettings] = useState({
    platformName: 'Sports Betting Platform',
    dailyBetLimit: '10000',
    weeklyBetLimit: '50000',
    maxOdds: '100',
    minBet: '1',
    maxBet: '5000',
    maintenanceMode: false,
    smsNotifications: true,
    twoFactor: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to load settings.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getSettings(token);
        setSettings({
          platformName: data.platformName,
          dailyBetLimit: data.dailyBetLimit,
          weeklyBetLimit: data.weeklyBetLimit,
          maxOdds: data.maxOdds,
          minBet: data.minBet,
          maxBet: data.maxBet,
          maintenanceMode: data.maintenanceMode,
          smsNotifications: data.smsNotifications,
          twoFactor: data.twoFactor,
        });
        setError('');
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to save settings.');
      return;
    }
    try {
      setSaving(true);
      await updateSettings(settings, token);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Platform Settings</h2>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading settings...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
          <div className="settings-container">
            <form className="settings-form">
              <div className="form-section">
                <h3>General Settings</h3>
                <div className="form-group">
                  <label>Platform Name:</label>
                  <input
                    type="text"
                    name="platformName"
                    value={settings.platformName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Bet Limits</h3>
                <div className="form-group">
                  <label>Daily Bet Limit ($):</label>
                  <input
                    type="number"
                    name="dailyBetLimit"
                    value={settings.dailyBetLimit}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Weekly Bet Limit ($):</label>
                  <input
                    type="number"
                    name="weeklyBetLimit"
                    value={settings.weeklyBetLimit}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Max Odds:</label>
                  <input
                    type="number"
                    name="maxOdds"
                    value={settings.maxOdds}
                    onChange={handleChange}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Minimum Bet ($):</label>
                  <input
                    type="number"
                    name="minBet"
                    value={settings.minBet}
                    onChange={handleChange}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Maximum Bet ($):</label>
                  <input
                    type="number"
                    name="maxBet"
                    value={settings.maxBet}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Security Settings</h3>
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    name="twoFactor"
                    checked={settings.twoFactor}
                    onChange={handleChange}
                    id="twoFactor"
                  />
                  <label htmlFor="twoFactor">Require Two-Factor Authentication</label>
                </div>
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    name="maintenanceMode"
                    checked={settings.maintenanceMode}
                    onChange={handleChange}
                    id="maintenanceMode"
                  />
                  <label htmlFor="maintenanceMode">Maintenance Mode</label>
                </div>
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    name="smsNotifications"
                    checked={settings.smsNotifications}
                    onChange={handleChange}
                    id="smsNotifications"
                  />
                  <label htmlFor="smsNotifications">Enable SMS Notifications</label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleSave} className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsView;
