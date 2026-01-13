import React, { useState } from 'react';

function MessagingView() {
  const [messages, setMessages] = useState([
    { id: 1, from: 'User123', subject: 'Account Issue', date: '2025-01-13 10:30', read: false },
    { id: 2, from: 'User456', subject: 'Bonus Question', date: '2025-01-13 09:15', read: true },
    { id: 3, from: 'User789', subject: 'Withdrawal Status', date: '2025-01-12 15:45', read: true },
    { id: 4, from: 'Agent001', subject: 'Daily Report', date: '2025-01-12 14:20', read: true },
    { id: 5, from: 'User202', subject: 'Technical Problem', date: '2025-01-11 11:00', read: false },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Messaging Center</h2>
        <p className="count">Unread: {messages.filter(m => !m.read).length}</p>
      </div>
      <div className="view-content">
        <div className="messaging-container">
          <div className="message-list">
            {messages.map(msg => (
              <div key={msg.id} className={`message-item ${!msg.read ? 'unread' : ''}`}>
                <div className="message-header">
                  <h4>{msg.from}</h4>
                  <span className="date">{msg.date}</span>
                </div>
                <p className="subject">{msg.subject}</p>
                <div className="message-actions">
                  <button className="btn-small">Reply</button>
                  <button className="btn-small">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessagingView;
