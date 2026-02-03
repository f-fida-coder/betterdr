import React, { useEffect, useState } from 'react';
import { createFaq, deleteFaq, getFaqs, updateFaq } from '../../api';

function FAQView() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', status: 'active', order: 0 });
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadFaqs = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to view FAQs.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getFaqs(token);
      setFaqs(data.faqs || []);
      setError('');
    } catch (err) {
      console.error('Failed to load FAQs:', err);
      setError(err.message || 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const openCreateModal = () => {
    setEditingFaq(null);
    setForm({ question: '', answer: '', status: 'active', order: 0 });
    setShowFormModal(true);
  };

  const openEditModal = (faq) => {
    setEditingFaq(faq);
    setForm({ question: faq.question, answer: faq.answer, status: faq.status || 'active', order: faq.order || 0 });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to save FAQs.');
      return;
    }
    try {
      setActionLoadingId(editingFaq?.id || 'new');
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        status: form.status,
        order: Number(form.order) || 0
      };
      if (editingFaq) {
        await updateFaq(editingFaq.id || editingFaq._id, payload, token);
      } else {
        await createFaq(payload, token);
      }
      setShowFormModal(false);
      loadFaqs();
    } catch (err) {
      setError(err.message || 'Failed to save FAQ');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (faqId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login as admin to delete FAQs.');
      return;
    }
    try {
      setActionLoadingId(faqId);
      await deleteFaq(faqId, token);
      setFaqs(prev => prev.filter(faq => (faq.id || faq._id) !== faqId));
    } catch (err) {
      setError(err.message || 'Failed to delete FAQ');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>FAQ Management</h2>
        <button className="btn-primary" onClick={openCreateModal}>Add New FAQ</button>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading FAQs...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <div className="faq-container">
          {faqs.map(faq => (
            <div key={faq.id || faq._id} className="faq-item">
              <div className="faq-question">
                <h4>Q: {faq.question}</h4>
                <button className="btn-small" onClick={() => openEditModal(faq)}>Edit</button>
                <button
                  className="btn-small btn-danger"
                  onClick={() => handleDelete(faq.id || faq._id)}
                  disabled={actionLoadingId === (faq.id || faq._id)}
                >
                  {actionLoadingId === (faq.id || faq._id) ? 'Working...' : 'Delete'}
                </button>
              </div>
              <div className="faq-answer">
                <p>A: {faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</h3>
            <div className="view-details">
              <div className="filter-group">
                <label>Question</label>
                <input
                  type="text"
                  value={form.question}
                  onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Answer</label>
                <textarea
                  rows="4"
                  value={form.answer}
                  onChange={(e) => setForm(prev => ({ ...prev, answer: e.target.value }))}
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
                <label>Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm(prev => ({ ...prev, order: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={actionLoadingId || !form.question.trim() || !form.answer.trim()}
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

export default FAQView;
