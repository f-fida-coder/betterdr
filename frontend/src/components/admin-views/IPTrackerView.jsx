import React, { useEffect, useState } from 'react';
import { blockIp, getIpTracker, unblockIp, whitelistIp } from '../../api';

function IPTrackerView({ canManage = true }) {
  const [ipData, setIpData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedIp, setSelectedIp] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const loadIps = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to view IP tracker.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getIpTracker({ search, status: statusFilter }, token);
      setIpData(data.logs || []);
      setError('');
    } catch (err) {
      console.error('Failed to load IP tracker:', err);
      setError(err.message || 'Failed to load IP tracker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIps();
  }, [search, statusFilter]);

  const handleBlock = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to block IPs.');
      return;
    }
    if (!canManage) {
      setError('You do not have permission to manage IP actions.');
      return;
    }
    try {
      setActionLoadingId(id);
      await blockIp(id, token);
      setIpData(prev => prev.map(ip => (ip.id === id ? { ...ip, status: 'blocked' } : ip)));
    } catch (err) {
      setError(err.message || 'Failed to block IP');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnblock = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to unblock IPs.');
      return;
    }
    if (!canManage) {
      setError('You do not have permission to manage IP actions.');
      return;
    }
    try {
      setActionLoadingId(id);
      await unblockIp(id, token);
      setIpData(prev => prev.map(ip => (ip.id === id ? { ...ip, status: 'active' } : ip)));
    } catch (err) {
      setError(err.message || 'Failed to unblock IP');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWhitelist = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to whitelist IPs.');
      return;
    }
    if (!canManage) {
      setError('You do not have permission to manage IP actions.');
      return;
    }
    try {
      setActionLoadingId(id);
      await whitelistIp(id, token);
      setIpData(prev => prev.map(ip => (ip.id === id ? { ...ip, status: 'whitelisted' } : ip)));
    } catch (err) {
      setError(err.message || 'Failed to whitelist IP');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openViewModal = (ip) => {
    setSelectedIp(ip);
    setShowViewModal(true);
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>IP Tracker</h2>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading IP logs...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
          <>
            <div className="filter-section">
              <div className="filter-group">
                <label>Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="User or IP"
                />
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>

            {!canManage && (
              <div style={{ marginBottom: '12px', color: '#f59e0b', fontWeight: 600 }}>
                View-only mode: IP actions are disabled by your permissions.
              </div>
            )}

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>User</th>
                    <th>Country</th>
                    <th>City</th>
                    <th>Last Active</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ipData.map(ip => (
                    <tr key={ip.id}>
                      <td className="monospace">{ip.ip}</td>
                      <td>{ip.user}</td>
                      <td>{ip.country || 'Unknown'}</td>
                      <td>{ip.city || 'Unknown'}</td>
                      <td>{ip.lastActive ? new Date(ip.lastActive).toLocaleString() : '—'}</td>
                      <td><span className={`badge ${ip.status}`}>{ip.status}</span></td>
                      <td>
                        <button className="btn-small" onClick={() => openViewModal(ip)}>View</button>
                        {ip.status === 'blocked' ? (
                            <button
                              className="btn-small"
                              onClick={() => handleUnblock(ip.id)}
                              disabled={actionLoadingId === ip.id || !canManage}
                            >
                              {actionLoadingId === ip.id ? 'Working...' : 'Unblock'}
                            </button>
                        ) : ip.status === 'whitelisted' ? (
                            <button
                              className="btn-small"
                              onClick={() => handleUnblock(ip.id)}
                              disabled={actionLoadingId === ip.id || !canManage}
                            >
                              {actionLoadingId === ip.id ? 'Working...' : 'Un-whitelist'}
                            </button>
                        ) : (
                          <>
                            <button
                              className="btn-small btn-danger"
                              onClick={() => handleBlock(ip.id)}
                              disabled={actionLoadingId === ip.id || !canManage}
                            >
                              {actionLoadingId === ip.id ? 'Working...' : 'Block'}
                            </button>
                            <button
                              className="btn-small btn-primary"
                              onClick={() => handleWhitelist(ip.id)}
                              disabled={actionLoadingId === ip.id || !canManage}
                              style={{ marginLeft: '4px', backgroundColor: '#3b82f6' }}
                            >
                              {actionLoadingId === ip.id ? '...' : 'Whitelist'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showViewModal && selectedIp && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>IP Details</h3>
            <div className="view-details">
              <p><strong>IP:</strong> {selectedIp.ip}</p>
              <p><strong>User:</strong> {selectedIp.user}</p>
              <p><strong>Country:</strong> {selectedIp.country || 'Unknown'}</p>
              <p><strong>City:</strong> {selectedIp.city || 'Unknown'}</p>
              <p><strong>Status:</strong> {selectedIp.status}</p>
              <p><strong>Last Active:</strong> {selectedIp.lastActive ? new Date(selectedIp.lastActive).toLocaleString() : '—'}</p>
              <p><strong>User Agent:</strong> {selectedIp.userAgent || '—'}</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IPTrackerView;
