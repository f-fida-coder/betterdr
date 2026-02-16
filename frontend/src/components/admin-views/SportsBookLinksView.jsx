import React, { useEffect, useState } from 'react';
import { createSportsbookLink, getSportsbookLinks, testSportsbookLink, updateSportsbookLink } from '../../api';

function SportsBookLinksView() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', status: 'active', notes: '' });
  const [showViewModal, setShowViewModal] = useState(false);

  const loadLinks = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to view sportsbook links.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getSportsbookLinks(token);
      setLinks(data.links || []);
      setError('');
    } catch (err) {
      console.error('Failed to load sportsbook links:', err);
      setError(err.message || 'Failed to load sportsbook links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const openCreateModal = () => {
    setEditingLink(null);
    setForm({ name: '', url: '', status: 'active', notes: '' });
    setShowFormModal(true);
  };

  const openEditModal = (link) => {
    setEditingLink(link);
    setForm({ name: link.name, url: link.url, status: link.status, notes: link.notes || '' });
    setShowFormModal(true);
  };

  const openViewModal = (link) => {
    setEditingLink(link);
    setShowViewModal(true);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to save links.');
      return;
    }
    try {
      setActionLoadingId(editingLink?.id || 'new');
      if (editingLink) {
        await updateSportsbookLink(editingLink.id, form, token);
      } else {
        await createSportsbookLink(form, token);
      }
      setShowFormModal(false);
      loadLinks();
    } catch (err) {
      setError(err.message || 'Failed to save link');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTest = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to test links.');
      return;
    }
    try {
      setActionLoadingId(id);
      const response = await testSportsbookLink(id, token);
      setLinks(prev => prev.map(link => (link.id === id ? { ...link, lastSync: response.lastSync } : link)));
    } catch (err) {
      setError(err.message || 'Failed to test link');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Sportsbook Links</h2>
        <button className="btn-primary" onClick={openCreateModal}>Add New Link</button>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading links...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider Name</th>
                <th>API URL</th>
                <th>Status</th>
                <th>Last Sync</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {links.map(link => (
                <tr key={link.id}>
                  <td>{link.name}</td>
                  <td className="monospace">{link.url}</td>
                  <td><span className={`badge ${link.status}`}>{link.status}</span></td>
                  <td>{link.lastSync ? new Date(link.lastSync).toLocaleString() : '—'}</td>
                  <td>
                    <button className="btn-small" onClick={() => openEditModal(link)}>Edit</button>
                    <button
                      className="btn-small"
                      onClick={() => handleTest(link.id)}
                      disabled={actionLoadingId === link.id}
                    >
                      {actionLoadingId === link.id ? 'Working...' : 'Test'}
                    </button>
                    <button className="btn-small" onClick={() => openViewModal(link)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingLink ? 'Edit Link' : 'Add Link'}</h3>
            <div className="view-details">
              <div className="filter-group">
                <label>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>URL</label>
                <input
                  type="text"
                  value={form.url}
                  onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={actionLoadingId || !form.name.trim() || !form.url.trim()}
              >
                {actionLoadingId ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && editingLink && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Link Details</h3>
            <div className="view-details">
              <p><strong>Name:</strong> {editingLink.name}</p>
              <p><strong>URL:</strong> {editingLink.url}</p>
              <p><strong>Status:</strong> {editingLink.status}</p>
              <p><strong>Last Sync:</strong> {editingLink.lastSync ? new Date(editingLink.lastSync).toLocaleString() : '—'}</p>
              {editingLink.notes && <p><strong>Notes:</strong> {editingLink.notes}</p>}
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

export default SportsBookLinksView;
