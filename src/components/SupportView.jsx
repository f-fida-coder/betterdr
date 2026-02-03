import React, { useEffect, useState } from 'react';
import { getMyMessages, createMessage } from '../api';

const SupportView = () => {
    const [messages, setMessages] = useState([]);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const loadMessages = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to contact support.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await getMyMessages(token);
            setMessages(data || []);
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMessages();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to contact support.');
            return;
        }
        if (!body.trim()) {
            setError('Message is required.');
            return;
        }

        try {
            setSending(true);
            const trimmedSubject = subject.trim() || body.trim().split(' ').slice(0, 6).join(' ');
            const newMessage = await createMessage(trimmedSubject, body.trim(), token);
            setMessages(prev => [newMessage, ...prev]);
            setSubject('');
            setBody('');
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '10px' }}>Contact Support</h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                    Send a message to the support team. Replies appear in your thread below.
                </p>

                <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666' }}>Subject (optional)</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Subject"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666' }}>Message</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Describe your issue"
                                rows={5}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={sending}
                            >
                                {sending ? 'Sending...' : 'Send Message'}
                            </button>
                            {error && <span style={{ color: '#b00020', fontSize: '12px' }}>{error}</span>}
                        </div>
                    </div>
                </form>

                <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ marginBottom: '10px' }}>Your Messages</h3>
                    {loading && <div style={{ padding: '10px 0' }}>Loading messages...</div>}
                    {!loading && messages.length === 0 && <div style={{ padding: '10px 0', color: '#777' }}>No messages yet.</div>}
                    {!loading && messages.map(msg => (
                        <div key={msg._id} style={{ borderTop: '1px solid #f0f0f0', padding: '12px 0' }}>
                            <div style={{ fontSize: '12px', color: '#888' }}>{new Date(msg.createdAt).toLocaleString()}</div>
                            <div style={{ fontWeight: '600', marginTop: '6px' }}>{msg.subject}</div>
                            <div style={{ marginTop: '6px' }}>{msg.body}</div>
                            {msg.replies && msg.replies.length > 0 && (
                                <div style={{ marginTop: '10px', paddingLeft: '12px', borderLeft: '2px solid #e0e0e0' }}>
                                    {msg.replies.map((reply, idx) => (
                                        <div key={`${msg._id}-reply-${idx}`} style={{ marginBottom: '8px' }}>
                                            <div style={{ fontSize: '12px', color: '#888' }}>{new Date(reply.createdAt).toLocaleString()}</div>
                                            <div style={{ marginTop: '4px' }}>{reply.message}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SupportView;
