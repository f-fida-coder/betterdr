import React, { useState } from 'react';

const FeedbackModal = ({ isOpen, onClose }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [category, setCategory] = useState('ui-ux');
    const [comment, setComment] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitted(true);
                setTimeout(() => {
            setIsSubmitted(false);
            setRating(0);
            setComment('');
            onClose();
        }, 3000);
    };

    const categories = [
        { id: 'ui-ux', label: 'UI/UX Design' },
        { id: 'markets', label: 'Betting Markets' },
        { id: 'performance', label: 'Performance' },
        { id: 'bugs', label: 'Bugs/Issues' },
        { id: 'other', label: 'Other' }
    ];

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div className="feedback-modal-content" style={{
                background: '#1a1a1a',
                width: '100%',
                maxWidth: '450px',
                borderRadius: '16px',
                padding: '30px',
                position: 'relative',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                border: '1px solid #333',
                color: 'white',
                fontFamily: 'Inter, sans-serif'
            }} onClick={e => e.stopPropagation()}>

                <button onClick={onClose} style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'transparent',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '20px'
                }}>
                    <i className="fa-solid fa-xmark"></i>
                </button>

                {!isSubmitted ? (
                    <>
                        <h2 style={{ marginBottom: '10px', fontSize: '24px', fontWeight: '800' }}>Your Feedback</h2>
                        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '25px' }}>Help us improve your betterbet365 experience.</p>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Rate your experience</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHover(star)}
                                            onMouseLeave={() => setHover(0)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '28px',
                                                color: (hover || rating) >= star ? '#ffcc00' : '#333',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <i className={((hover || rating) >= star) ? 'fa-solid fa-star' : 'fa-regular fa-star'}></i>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>What's this about?</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                border: '1px solid',
                                                borderColor: category === cat.id ? '#00703c' : '#333',
                                                background: category === cat.id ? 'rgba(0, 112, 60, 0.1)' : 'transparent',
                                                color: category === cat.id ? '#00e676' : '#888',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Comment area */}
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Message</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Tell us what's on your mind..."
                                    style={{
                                        width: '100%',
                                        height: '120px',
                                        background: '#222',
                                        border: '1px solid #333',
                                        borderRadius: '12px',
                                        padding: '15px',
                                        color: 'white',
                                        fontSize: '14px',
                                        resize: 'none',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: '#00703c',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                <i className="fa-solid fa-paper-plane"></i>
                                SUBMIT FEEDBACK
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'rgba(0, 112, 60, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 25px',
                            color: '#00e676',
                            fontSize: '40px'
                        }}>
                            <i className="fa-solid fa-check"></i>
                        </div>
                        <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '10px' }}>Thank You!</h2>
                        <p style={{ color: '#aaa', fontSize: '15px', lineHeight: '1.6' }}>
                            Your feedback helps us build a better platform. We've received your comments and will review them shortly.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;
