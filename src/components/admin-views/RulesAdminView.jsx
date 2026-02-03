import React, { useEffect, useState } from 'react';
import { createRule, deleteRule, getRules, updateRule } from '../../api';

function RulesAdminView() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({ title: '', items: '', status: 'active' });
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadRules = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to view rules.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getRules(token);
      setRules(data.rules || []);
      setError('');
    } catch (err) {
      console.error('Failed to load rules:', err);
      setError(err.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const openCreateModal = () => {
    setEditingRule(null);
    setForm({ title: '', items: '', status: 'active' });
    setShowFormModal(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setForm({ title: rule.title, items: (rule.items || []).join('\n'), status: rule.status || 'active' });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to save rules.');
      return;
    }
    try {
      setActionLoadingId(editingRule?.id || 'new');
      const payload = {
        title: form.title.trim(),
        items: form.items.split('\n').map(item => item.trim()).filter(Boolean),
        status: form.status
      };
      if (editingRule) {
        await updateRule(editingRule.id || editingRule._id, payload, token);
      } else {
        await createRule(payload, token);
      }
      setShowFormModal(false);
      loadRules();
    } catch (err) {
      setError(err.message || 'Failed to save rule');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (ruleId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to delete rules.');
      return;
    }
    try {
      setActionLoadingId(ruleId);
      await deleteRule(ruleId, token);
      setRules(prev => prev.filter(rule => (rule.id || rule._id) !== ruleId));
    } catch (err) {
      setError(err.message || 'Failed to delete rule');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Rules & Regulations</h2>
        <button className="btn-primary" onClick={openCreateModal}>Add New Rule</button>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading rules...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <div className="rules-container">
          {rules.map(rule => (
            <div key={rule.id || rule._id} className="rule-card">
              <h3>{rule.title}</h3>
              <ul>
                {(rule.items || []).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
              <div className="table-actions">
                <button className="btn-small" onClick={() => openEditModal(rule)}>Edit</button>
                <button
                  className="btn-small btn-danger"
                  onClick={() => handleDelete(rule.id || rule._id)}
                  disabled={actionLoadingId === (rule.id || rule._id)}
                >
                  {actionLoadingId === (rule.id || rule._id) ? 'Working...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingRule ? 'Edit Rule' : 'Add Rule'}</h3>
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
                <label>Items (one per line)</label>
                <textarea
                  rows="6"
                  value={form.items}
                  onChange={(e) => setForm(prev => ({ ...prev, items: e.target.value }))}
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
                disabled={actionLoadingId || !form.title.trim()}
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

export default RulesAdminView;
