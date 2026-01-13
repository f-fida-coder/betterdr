import React, { useState } from 'react';

function FeedbackView() {
  const [feedbacks] = useState([
    { id: 1, user: 'User123', message: 'Great platform! Love the interface.', rating: 5, date: '2025-01-13' },
    { id: 2, user: 'User456', message: 'Withdrawals are too slow', rating: 2, date: '2025-01-13' },
    { id: 3, user: 'User789', message: 'Mobile app needs improvement', rating: 3, date: '2025-01-12' },
    { id: 4, user: 'User101', message: 'Excellent customer service!', rating: 5, date: '2025-01-12' },
    { id: 5, user: 'User202', message: 'More sports options needed', rating: 3, date: '2025-01-11' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Customer Feedback</h2>
      </div>
      <div className="view-content">
        <div className="feedback-container">
          {feedbacks.map(feedback => (
            <div key={feedback.id} className="feedback-card">
              <div className="feedback-header">
                <h4>{feedback.user}</h4>
                <div className="rating">
                  {'⭐'.repeat(feedback.rating)}
                </div>
                <span className="date">{feedback.date}</span>
              </div>
              <p className="feedback-message">{feedback.message}</p>
              <div className="feedback-actions">
                <button className="btn-small">Reply</button>
                <button className="btn-small">Mark as Reviewed</button>
                <button className="btn-small btn-danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FeedbackView;
