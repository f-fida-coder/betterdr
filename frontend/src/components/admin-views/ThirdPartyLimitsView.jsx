import React, { useEffect, useMemo, useState } from 'react';
import { createThirdPartyLimit, getThirdPartyLimits, updateThirdPartyLimit } from '../../api';

function ThirdPartyLimitsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [usageFilter, setUsageFilter] = useState('all');
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ dailyLimit: '', monthlyLimit: '', used: '', status: 'active' });
  const [newLimit, setNewLimit] = useState({ provider: '', dailyLimit: 0, monthlyLimit: 0, used: 0, status: 'active' });
  const [createLoading, setCreateLoading] = useState(false);

  const formatMoney = (value) => `$${Number(value || 0).toLocaleString()}`;
  const getUsagePercent = (limit) => {
    const divisor = limit.monthlyLimit || 1;
    return Math.min((limit.used / divisor) * 100, 100);
  };
  const getUsageClass = (percent) => {
    if (percent >= 85) return 'critical';
    if (percent >= 65) return 'warning';
    return 'normal';
  };

  const totals = useMemo(() => limits.reduce(
    (acc, limit) => {
      acc.daily += limit.dailyLimit;
      acc.monthly += limit.monthlyLimit;
      acc.used += limit.used;
      return acc;
    },
    { daily: 0, monthly: 0, used: 0 }
  ), [limits]);

  const loadLimits = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLimits([]);
        setError('Please login as admin to load limits.');
        return;
      }
      const data = await getThirdPartyLimits(token);
      setLimits(data);
      setError('');
    } catch (err) {
      console.error('Error loading third party limits:', err);
      setError(err.message || 'Failed to load limits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLimits();
    const interval = setInterval(loadLimits, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredLimits = limits.filter(limit => {
    const matchesSearch = limit.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || limit.status === statusFilter;
    const usagePercent = getUsagePercent(limit);
    const matchesUsage = usageFilter === 'all'
      || (usageFilter === 'over-80' && usagePercent >= 80)
      || (usageFilter === '60-80' && usagePercent >= 60 && usagePercent < 80)
      || (usageFilter === 'under-60' && usagePercent < 60);

    return matchesSearch && matchesStatus && matchesUsage;
  });

  const startEditing = (limit) => {
    setEditingId(limit.id);
    setEditForm({
      dailyLimit: limit.dailyLimit,
      monthlyLimit: limit.monthlyLimit,
      used: limit.used,
      status: limit.status
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ dailyLimit: '', monthlyLimit: '', used: '', status: 'active' });
  };

  const saveLimit = async (limitId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login as admin to update limits.');
        return;
      }
      const payload = {
        dailyLimit: Number(editForm.dailyLimit) || 0,
        monthlyLimit: Number(editForm.monthlyLimit) || 0,
        used: Number(editForm.used) || 0,
        status: editForm.status
      };
      const updated = await updateThirdPartyLimit(limitId, payload, token);
      setLimits(prev => prev.map(limit => (limit.id === limitId ? { ...limit, ...updated.limit } : limit)));
      cancelEditing();
      setError('');
    } catch (err) {
      console.error('Error updating limit:', err);
      setError(err.message || 'Failed to update limit');
    }
  };

  const handleCreateLimit = async () => {
    try {
      setCreateLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login as admin to create limits.');
        return;
      }
      const payload = {
        provider: newLimit.provider.trim(),
        dailyLimit: Number(newLimit.dailyLimit) || 0,
        monthlyLimit: Number(newLimit.monthlyLimit) || 0,
        used: Number(newLimit.used) || 0,
        status: newLimit.status
      };
      const response = await createThirdPartyLimit(payload, token);
      setLimits(prev => [...prev, response.limit]);
      setNewLimit({ provider: '', dailyLimit: 0, monthlyLimit: 0, used: 0, status: 'active' });
      setError('');
    } catch (err) {
      console.error('Error creating limit:', err);
      setError(err.message || 'Failed to create limit');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>3rd Party Limits</h2>
        <span className="count">{filteredLimits.length} providers</span>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading limits...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <>
        <div className="filter-section">
          <div className="filter-group">
            <label>Provider</label>
            <input
              type="text"
              placeholder="Provider name"
              value={newLimit.provider}
              onChange={(e) => setNewLimit(prev => ({ ...prev, provider: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Daily Limit</label>
            <input
              type="number"
              value={newLimit.dailyLimit}
              onChange={(e) => setNewLimit(prev => ({ ...prev, dailyLimit: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Monthly Limit</label>
            <input
              type="number"
              value={newLimit.monthlyLimit}
              onChange={(e) => setNewLimit(prev => ({ ...prev, monthlyLimit: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Used</label>
            <input
              type="number"
              value={newLimit.used}
              onChange={(e) => setNewLimit(prev => ({ ...prev, used: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select
              value={newLimit.status}
              onChange={(e) => setNewLimit(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="warning">Warning</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <button className="btn-primary" onClick={handleCreateLimit} disabled={createLoading || !newLimit.provider.trim()}>
            {createLoading ? 'Saving...' : 'Add Provider'}
          </button>
        </div>

        <div className="stats-container limits-summary">
          <div className="stat-card">
            <h3>Total Providers</h3>
            <div className="amount">{limits.length}</div>
            <p className="change">Active: {limits.filter(l => l.status === 'active').length}</p>
          </div>
          <div className="stat-card">
            <h3>Daily Limit Total</h3>
            <div className="amount">{formatMoney(totals.daily)}</div>
            <p className="change">Across all providers</p>
          </div>
          <div className="stat-card">
            <h3>Monthly Limit Total</h3>
            <div className="amount">{formatMoney(totals.monthly)}</div>
            <p className="change">Capacity for the month</p>
          </div>
          <div className="stat-card">
            <h3>Used This Month</h3>
            <div className="amount">{formatMoney(totals.used)}</div>
            <p className="change">Utilization: {((totals.used / (totals.monthly || 1)) * 100).toFixed(1)}%</p>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-group">
            <label>Provider</label>
            <input
              type="text"
              placeholder="Search provider"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="warning">Warning</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Utilization</label>
            <select value={usageFilter} onChange={(e) => setUsageFilter(e.target.value)}>
              <option value="all">All Levels</option>
              <option value="over-80">Over 80%</option>
              <option value="60-80">60% - 80%</option>
              <option value="under-60">Under 60%</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Daily Limit</th>
                <th>Monthly Limit</th>
                <th>Used</th>
                <th>Utilization</th>
                <th>Status</th>
                <th>Last Sync</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLimits.map(limit => {
                const usagePercent = getUsagePercent(limit);
                return (
                  <tr key={limit.id}>
                    <td><strong>{limit.provider}</strong></td>
                    <td>
                      {editingId === limit.id ? (
                        <input
                          type="number"
                          value={editForm.dailyLimit}
                          onChange={(e) => setEditForm(prev => ({ ...prev, dailyLimit: e.target.value }))}
                          className="inline-input"
                        />
                      ) : (
                        formatMoney(limit.dailyLimit)
                      )}
                    </td>
                    <td>
                      {editingId === limit.id ? (
                        <input
                          type="number"
                          value={editForm.monthlyLimit}
                          onChange={(e) => setEditForm(prev => ({ ...prev, monthlyLimit: e.target.value }))}
                          className="inline-input"
                        />
                      ) : (
                        formatMoney(limit.monthlyLimit)
                      )}
                    </td>
                    <td>
                      {editingId === limit.id ? (
                        <input
                          type="number"
                          value={editForm.used}
                          onChange={(e) => setEditForm(prev => ({ ...prev, used: e.target.value }))}
                          className="inline-input"
                        />
                      ) : (
                        formatMoney(limit.used)
                      )}
                    </td>
                    <td>
                      <div className="usage-meter">
                        <div className="usage-bar">
                          <div
                            className={`usage-fill ${getUsageClass(usagePercent)}`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                        <span className="usage-text">{usagePercent.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      {editingId === limit.id ? (
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                        >
                          <option value="active">Active</option>
                          <option value="warning">Warning</option>
                          <option value="paused">Paused</option>
                        </select>
                      ) : (
                        <span className={`badge ${limit.status}`}>{limit.status}</span>
                      )}
                    </td>
                    <td>{limit.lastSync ? new Date(limit.lastSync).toLocaleString() : '—'}</td>
                    <td>
                      <div className="table-actions">
                        {editingId === limit.id ? (
                          <>
                            <button className="btn-small" onClick={() => saveLimit(limit.id)}>Save</button>
                            <button className="btn-small" onClick={cancelEditing}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-small" onClick={() => startEditing(limit)}>Edit</button>
                            <button className="btn-small">View</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

export default ThirdPartyLimitsView;
