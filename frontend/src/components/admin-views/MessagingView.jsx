import React, { useState, useEffect } from 'react';
import { getMessages, replyToMessage, deleteMessage, markMessageRead } from '../../api';

function MessagingView() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view messages.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getMessages(token);
        setMessages(data || []);
        setError('');
      } catch (err) {
        console.error('Failed to fetch messages:', err);
        setError(err.message || 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  const handleReply = async (messageId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to reply.');
      return;
    }
    const reply = window.prompt('Enter your reply:');
    if (!reply) return;

    try {
      setActionLoadingId(messageId);
      await replyToMessage(messageId, reply, token);
      setMessages(prev => prev.map(msg => (
        msg._id === messageId ? { ...msg, read: true, replies: [...(msg.replies || []), { message: reply, createdAt: new Date() }] } : msg
      )));
    } catch (err) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (messageId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to delete messages.');
      return;
    }
    try {
      setActionLoadingId(messageId);
      await deleteMessage(messageId, token);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    } catch (err) {
      setError(err.message || 'Failed to delete message');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkRead = async (messageId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await markMessageRead(messageId, token);
      setMessages(prev => prev.map(msg => (
        msg._id === messageId ? { ...msg, read: true } : msg
      )));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Messaging Center</h2>
        <p className="count">Unread: {messages.filter(m => !m.read).length}</p>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading messages...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <div className="messaging-container">
          <div className="message-list">
            {messages.map(msg => (
              <div
                key={msg._id}
                className={`message-item ${!msg.read ? 'unread' : ''}`}
                onClick={() => handleMarkRead(msg._id)}
              >
                <div className="message-header">
                  <h4>{msg.fromName}</h4>
                  <span className="date">{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                <p className="subject">{msg.subject}</p>
                <p className="subject" style={{ opacity: 0.8 }}>{msg.body}</p>
                <div className="message-actions">
                  <button
                    className="btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReply(msg._id);
                    }}
                    disabled={actionLoadingId === msg._id}
                  >
                    {actionLoadingId === msg._id ? 'Working...' : 'Reply'}
                  </button>
                  <button
                    className="btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(msg._id);
                    }}
                    disabled={actionLoadingId === msg._id}
                  >
                    {actionLoadingId === msg._id ? 'Working...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default MessagingView;
