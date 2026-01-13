import React, { useState, useRef, useEffect } from 'react';

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: 'Hello! How can we help you today?', sender: 'agent' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newUserMsg = { id: Date.now(), text: inputValue, sender: 'user' };
        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');

                setTimeout(() => {
            const responses = [
                "Thanks for reaching out! An agent will be with you shortly.",
                "Could you provide more details about your issue?",
                "We appreciate your feedback.",
                "Have you checked our Tutorials page for this info?",
                "Interesting question! Let me check that for you."
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            const newAgentMsg = { id: Date.now() + 1, text: randomResponse, sender: 'agent' };
            setMessages(prev => [...prev, newAgentMsg]);
        }, 1000);
    };

    return (
        <div className="chat-widget-container" style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000, fontFamily: 'Inter, sans-serif' }}>
            {isOpen && (
                <div style={{
                    width: '350px',
                    height: '500px',
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    marginBottom: '20px',
                    border: '1px solid #e0e0e0',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{ background: '#00703c', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{ width: '30px', height: '30px', background: 'white', borderRadius: '50%', color: '#00703c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fa-solid fa-headset"></i>
                                </div>
                                <div style={{ width: '8px', height: '8px', background: '#00ff00', borderRadius: '50%', position: 'absolute', bottom: '0', right: '0', border: '1px solid #00703c' }}></div>
                            </div>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '14px' }}>Support Team</div>
                                <div style={{ fontSize: '10px', opacity: 0.8 }}>Online</div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {messages.map(msg => (
                            <div key={msg.id} style={{
                                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                            }}>
                                <div style={{
                                    background: msg.sender === 'user' ? '#00703c' : 'white',
                                    color: msg.sender === 'user' ? 'white' : '#333',
                                    padding: '12px 16px',
                                    borderRadius: msg.sender === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                                    boxShadow: msg.sender === 'agent' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                                    fontSize: '13px',
                                    lineHeight: '1.4'
                                }}>
                                    {msg.text}
                                </div>
                                <div style={{ fontSize: '10px', color: '#aaa', marginTop: '5px', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSend} style={{ padding: '15px', background: 'white', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type a message..."
                            style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
                        />
                        <button type="submit" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#00703c', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            <i className="fa-solid fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            )}

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: '#00703c',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0, 112, 60, 0.4)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        transition: 'transform 0.2s',
                        animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                    <i className="fa-solid fa-comment-dots"></i>
                </button>
            )}
            <style>
                {`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes bounceIn {
                    from { opacity: 0; transform: scale(0.5); }
                    to { opacity: 1; transform: scale(1); }
                }
                `}
            </style>
        </div>
    );
};

export default ChatWidget;
