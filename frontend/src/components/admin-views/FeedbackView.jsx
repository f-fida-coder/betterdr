import React, { useEffect, useState } from 'react';
import { deleteFeedback, getFeedback, markFeedbackReviewed, replyFeedback } from '../../api';

function FeedbackView() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadFeedback = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to view feedback.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getFeedback({ status: statusFilter }, token);
      setFeedbacks(data.feedbacks || []);
      setError('');
    } catch (err) {
      console.error('Failed to load feedback:', err);
      setError(err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, [statusFilter]);

  const openReplyModal = (feedback) => {
    setSelectedFeedback(feedback);
    setReplyText(feedback.adminReply || '');
    setShowReplyModal(true);
  };

  const handleReply = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to reply.');
      return;
    }
    try {
      setActionLoadingId(selectedFeedback.id);
      await replyFeedback(selectedFeedback.id, { reply: replyText }, token);
      setShowReplyModal(false);
      loadFeedback();
    } catch (err) {
      setError(err.message || 'Failed to reply');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReviewed = async (feedbackId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to mark reviewed.');
      return;
    }
    try {
      setActionLoadingId(feedbackId);
      await markFeedbackReviewed(feedbackId, token);
      loadFeedback();
    } catch (err) {
      setError(err.message || 'Failed to mark reviewed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (feedbackId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to delete feedback.');
      return;
    }
    try {
      setActionLoadingId(feedbackId);
      await deleteFeedback(feedbackId, token);
      setFeedbacks(prev => prev.filter(item => item.id !== feedbackId));
    } catch (err) {
      setError(err.message || 'Failed to delete feedback');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Customer Feedback</h2>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading feedback...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <>
        <div className="filter-section">
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
        </div>
        <div className="feedback-container">
          {feedbacks.map(feedback => (
            <div key={feedback.id} className="feedback-card">
              <div className="feedback-header">
                <h4>{feedback.user}</h4>
                <div className="rating">
                  {'⭐'.repeat(feedback.rating || 0)}
                </div>
                <span className="date">{feedback.date ? new Date(feedback.date).toLocaleDateString() : '—'}</span>
              </div>
              <p className="feedback-message">{feedback.message}</p>
              {feedback.adminReply && <p className="feedback-message"><strong>Reply:</strong> {feedback.adminReply}</p>}
              <div className="feedback-actions">
                <button className="btn-small" onClick={() => openReplyModal(feedback)}>Reply</button>
                <button
                  className="btn-small"
                  onClick={() => handleReviewed(feedback.id)}
                  disabled={actionLoadingId === feedback.id}
                >
                  {actionLoadingId === feedback.id ? 'Working...' : 'Mark as Reviewed'}
                </button>
                <button
                  className="btn-small btn-danger"
                  onClick={() => handleDelete(feedback.id)}
                  disabled={actionLoadingId === feedback.id}
                >
                  {actionLoadingId === feedback.id ? 'Working...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
        )}
      </div>

      {showReplyModal && selectedFeedback && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reply to Feedback</h3>
            <div className="view-details">
              <p><strong>User:</strong> {selectedFeedback.user}</p>
              <p><strong>Message:</strong> {selectedFeedback.message}</p>
              <div className="filter-group">
                <label>Reply</label>
                <textarea
                  rows="4"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowReplyModal(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleReply}
                disabled={actionLoadingId === selectedFeedback.id || !replyText.trim()}
              >
                {actionLoadingId === selectedFeedback.id ? 'Saving...' : 'Save Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedbackView;
