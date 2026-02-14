import React, { useEffect, useState } from 'react';
import { createManualSection, deleteManualSection, getManualSections, updateManualSection } from '../../api';

function UserManualView() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', order: 0, status: 'active' });
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadSections = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to view manual.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getManualSections(token);
      setSections(data.sections || []);
      setError('');
    } catch (err) {
      console.error('Failed to load manual:', err);
      setError(err.message || 'Failed to load manual');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const openCreateModal = () => {
    setEditingSection(null);
    setForm({ title: '', content: '', order: 0, status: 'active' });
    setShowFormModal(true);
  };

  const openEditModal = (section) => {
    setEditingSection(section);
    setForm({ title: section.title, content: section.content, order: section.order || 0, status: section.status || 'active' });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to save manual sections.');
      return;
    }
    try {
      setActionLoadingId(editingSection?.id || 'new');
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        order: Number(form.order) || 0,
        status: form.status
      };
      if (editingSection) {
        await updateManualSection(editingSection.id || editingSection._id, payload, token);
      } else {
        await createManualSection(payload, token);
      }
      setShowFormModal(false);
      loadSections();
    } catch (err) {
      setError(err.message || 'Failed to save section');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (sectionId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to delete sections.');
      return;
    }
    try {
      setActionLoadingId(sectionId);
      await deleteManualSection(sectionId, token);
      setSections(prev => prev.filter(section => (section.id || section._id) !== sectionId));
    } catch (err) {
      setError(err.message || 'Failed to delete section');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>User Manual</h2>
        <button className="btn-primary" onClick={openCreateModal}>Add Section</button>
      </div>
      <div className="view-content">
        <div className="manual-container">
          {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading manual...</div>}
          {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
          {!loading && !error && sections.map(section => (
            <section key={section.id || section._id} className="manual-section">
              <h3>{section.title}</h3>
              <p>{section.content}</p>
              <div className="table-actions">
                <button className="btn-small" onClick={() => openEditModal(section)}>Edit</button>
                <button
                  className="btn-small btn-danger"
                  onClick={() => handleDelete(section.id || section._id)}
                  disabled={actionLoadingId === (section.id || section._id)}
                >
                  {actionLoadingId === (section.id || section._id) ? 'Working...' : 'Delete'}
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>

      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingSection ? 'Edit Section' : 'Add Section'}</h3>
            <div className="view-details">
              <div className="filter-group">
                <label>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Content</label>
                <textarea
                  rows="6"
                  value={form.content}
                  onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm(prev => ({ ...prev, order: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={actionLoadingId || !form.title.trim() || !form.content.trim()}
              >
                {actionLoadingId ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManualView;
