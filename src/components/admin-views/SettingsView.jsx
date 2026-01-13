import React, { useState } from 'react';

function SettingsView() {
  const [settings, setSettings] = useState({
    platformName: 'Sports Betting Platform',
    dailyBetLimit: '10000',
    weeklyBetLimit: '50000',
    maxOdds: '100',
    minBet: '1',
    maxBet: '5000',
    maintenanceMode: false,
    emailNotifications: true,
    twoFactor: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Platform Settings</h2>
      </div>
      <div className="view-content">
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
                  name="emailNotifications"
                  checked={settings.emailNotifications}
                  onChange={handleChange}
                  id="emailNotifications"
                />
                <label htmlFor="emailNotifications">Enable Email Notifications</label>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleSave} className="btn-primary">Save Settings</button>
              <button type="reset" className="btn-secondary">Reset</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
