import React, { useEffect, useMemo, useState } from 'react';
import { createMessage, getMyMessages, getSupportFaqs } from '../api';
import '../support.css';

const statusLabel = (msg) => {
    if (msg.status === 'closed') return 'Closed';
    if (Array.isArray(msg.replies) && msg.replies.length > 0) return 'Answered';
    return 'Open';
};

const SupportView = () => {
    const [messages, setMessages] = useState([]);
    const [faqs, setFaqs] = useState([]);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [faqQuery, setFaqQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [activeThreadId, setActiveThreadId] = useState(null);

    const loadSupportData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to contact support.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            const [userMessages, faqPayload] = await Promise.all([
                getMyMessages(token),
                getSupportFaqs(token)
            ]);
            const sortedMessages = Array.isArray(userMessages) ? userMessages : [];
            setMessages(sortedMessages);
            setFaqs(Array.isArray(faqPayload?.faqs) ? faqPayload.faqs : []);
            if (sortedMessages.length > 0) {
                setActiveThreadId((prev) => prev || (sortedMessages[0]._id || sortedMessages[0].id));
            }
        } catch (err) {
            setError(err.message || 'Failed to load support data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSupportData();
    }, []);

    const activeThread = useMemo(
        () => messages.find((message) => (message._id || message.id) === activeThreadId) || messages[0] || null,
        [messages, activeThreadId]
    );

    const filteredFaqs = useMemo(() => {
        const query = faqQuery.trim().toLowerCase();
        if (!query) return faqs;
        return faqs.filter((faq) =>
            String(faq.question || '').toLowerCase().includes(query)
            || String(faq.answer || '').toLowerCase().includes(query)
        );
    }, [faqs, faqQuery]);

    const handleSubmit = async (event) => {
        event.preventDefault();
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
            const message = await createMessage(trimmedSubject, body.trim(), token);
            setMessages((prev) => [message, ...prev]);
            setActiveThreadId(message._id || message.id);
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
        <div className="support-container">
            <div className="support-header">
                <div>
                    <h1>Support Center</h1>
                    <p>Contact operations team, track responses, and browse sportsbook FAQs.</p>
                </div>
                <button type="button" className="support-refresh" onClick={loadSupportData}>
                    <i className="fa-solid fa-rotate-right"></i> Refresh
                </button>
            </div>

            {error && <div className="support-error">{error}</div>}

            <div className="support-layout">
                <section className="support-left">
                    <div className="support-card">
                        <h2>Create Ticket</h2>
                        <form onSubmit={handleSubmit} className="support-form">
                            <label>
                                Subject (optional)
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Bet settlement, payout delay, limit issue..."
                                />
                            </label>
                            <label>
                                Message
                                <textarea
                                    rows={6}
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Describe issue with relevant bet IDs, timestamps, and details."
                                />
                            </label>
                            <button type="submit" className="primary-btn" disabled={sending}>
                                {sending ? 'Sending...' : 'Submit Ticket'}
                            </button>
                        </form>
                    </div>

                    <div className="support-card">
                        <div className="thread-list-head">
                            <h2>Your Tickets</h2>
                            <span>{messages.length}</span>
                        </div>
                        {loading && <div className="support-empty">Loading messages...</div>}
                        {!loading && messages.length === 0 && <div className="support-empty">No support tickets yet.</div>}
                        {!loading && messages.length > 0 && (
                            <div className="thread-list">
                                {messages.map((message) => {
                                    const id = message._id || message.id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            className={`thread-item ${id === (activeThread?._id || activeThread?.id) ? 'active' : ''}`}
                                            onClick={() => setActiveThreadId(id)}
                                        >
                                            <div>
                                                <strong>{message.subject}</strong>
                                                <p>{new Date(message.createdAt).toLocaleString()}</p>
                                            </div>
                                            <span className={`status ${statusLabel(message).toLowerCase()}`}>{statusLabel(message)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                <section className="support-middle">
                    <div className="support-card thread-view">
                        <h2>Ticket Thread</h2>
                        {!activeThread && <div className="support-empty">Select a ticket to view thread.</div>}
                        {activeThread && (
                            <div className="thread-content">
                                <div className="thread-main-message">
                                    <div className="thread-meta">
                                        <span>{new Date(activeThread.createdAt).toLocaleString()}</span>
                                        <span className={`status ${statusLabel(activeThread).toLowerCase()}`}>{statusLabel(activeThread)}</span>
                                    </div>
                                    <h3>{activeThread.subject}</h3>
                                    <p>{activeThread.body}</p>
                                </div>
                                <div className="thread-replies">
                                    {(activeThread.replies || []).length === 0 && <div className="support-empty">No replies yet.</div>}
                                    {(activeThread.replies || []).map((reply, idx) => (
                                        <div className="reply-item" key={`${activeThread._id || activeThread.id}-reply-${idx}`}>
                                            <div className="thread-meta">
                                                <span>{new Date(reply.createdAt).toLocaleString()}</span>
                                                <span>Support</span>
                                            </div>
                                            <p>{reply.message}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="support-right">
                    <div className="support-card">
                        <h2>FAQ</h2>
                        <input
                            type="text"
                            className="faq-search"
                            placeholder="Search FAQ"
                            value={faqQuery}
                            onChange={(e) => setFaqQuery(e.target.value)}
                        />
                        {filteredFaqs.length === 0 && <div className="support-empty">No FAQs found.</div>}
                        <div className="faq-list">
                            {filteredFaqs.map((faq) => (
                                <details key={faq._id || faq.id} className="faq-item">
                                    <summary>{faq.question}</summary>
                                    <p>{faq.answer}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SupportView;
