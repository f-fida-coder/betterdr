import React, { useState } from 'react';
import { registerUser } from '../api';

const RegisterModal = ({ onClose, onOpenLogin }) => {
    const isMobile = window.innerWidth <= 768;
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!formData.username || !formData.email || !formData.password) {
            setError('Please fill all required fields');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');
        try {
            console.log('Registering user:', formData.username);
            const result = await registerUser({
                username: formData.username,
                email: formData.email,
                password: formData.password
            });
            console.log('Registration successful:', result);
            alert('Registration successful! Please login with your credentials.');
            setFormData({ username: '', email: '', password: '', confirmPassword: '' });
            onClose();
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.8)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            padding: isMobile ? '20px' : '0',
            boxSizing: 'border-box',
            overflow: 'auto',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            inset: 0
        }}>
            <div style={{
                background: 'white',
                width: isMobile ? '100%' : '500px',
                maxWidth: '100%',
                height: isMobile ? 'auto' : '460px',
                maxHeight: isMobile ? '85vh' : 'none',
                borderRadius: '12px',
                boxShadow: '0 30px 100px rgba(0,0,0,0.9)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                animation: 'fadeIn 0.4s ease-out',
                margin: 'auto',
                marginTop: isMobile ? '0' : 'auto',
                marginBottom: isMobile ? '0' : 'auto'
            }}>
                <div style={{
                    padding: isMobile ? '15px 15px 0 15px' : '20px 20px 0 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ margin: 0, color: '#000', fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold' }}>JOIN NOW!!!</h2>
                    <span
                        onClick={onClose}
                        style={{
                            cursor: 'pointer',
                            fontSize: isMobile ? '28px' : '24px',
                            fontWeight: 'bold',
                            color: '#000',
                            lineHeight: '1'
                        }}
                    >
                        ×
                    </span>
                </div>

                <div className="modal-content-scroll" style={{ overflowY: 'auto', padding: isMobile ? '15px' : '20px', flex: 1 }}>

                    <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#666', lineHeight: '1.4', marginBottom: '20px', marginTop: '0' }}>
                        In accordance with Michigan law the company can no longer take players who are physically in the state of Michigan. Any client that resides in Michigan with a balance will be given a full refund.
                    </p>

                    {error && <p style={{ color: 'red', fontSize: '12px', textAlign: 'center' }}>{error}</p>}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input type="text" name="username" placeholder="Username*" value={formData.username} style={inputStyle} onChange={handleChange} onKeyPress={handleKeyPress} />
                        <input type="email" name="email" placeholder="Email*" value={formData.email} style={inputStyle} onChange={handleChange} onKeyPress={handleKeyPress} />
                        <input type="password" name="password" placeholder="Password*" value={formData.password} style={inputStyle} onChange={handleChange} onKeyPress={handleKeyPress} />
                        <input type="password" name="confirmPassword" placeholder="Confirm Password*" value={formData.confirmPassword} style={inputStyle} onChange={handleChange} onKeyPress={handleKeyPress} />
                    </div>

                    <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" id="terms" style={{ width: '16px', height: '16px' }} />
                        <label htmlFor="terms" style={{ fontSize: isMobile ? '12px' : '14px', color: '#666' }}>Agree to terms and conditions</label>
                    </div>

                    <p style={{ fontSize: isMobile ? '10px' : '11px', color: '#666', lineHeight: '1.4', marginTop: '15px' }}>
                        NOTE: Automated betting systems, sharp action, past post wagers or any other exploitation of our offerings is prohibited. Assigned wager limits on the account are to be respected at all times. Any attempt to override these wager limits is prohibited. Any account that has been determined to have violated these terms may risk account closure and forfeiture of funds. Successive accounts created through individuals and/or syndicates or with matching IP addresses will also be flagged.<br />
                        By entering your number, you agree to receive mobile messages. Message frequency varies. Message and data rates may apply. View our Privacy Policy and SMS Terms (Reply STOP to unsubscribe).
                    </p>

                    <button disabled={loading} onClick={handleSubmit} style={{
                        width: '100%',
                        padding: isMobile ? '12px' : '15px',
                        background: '#dc3545', // Red
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: isMobile ? '16px' : '18px',
                        fontWeight: 'bold',
                        marginTop: '20px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        opacity: loading ? 0.7 : 1
                    }}>
                        {loading ? 'SUBMITTING...' : 'SUBMIT'}
                    </button>

                    {/* Already Registered */}
                    <div style={{ textAlign: 'center', marginTop: '15px', paddingBottom: '10px' }}>
                        <span style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 'bold' }}>Already registered </span>
                        <a 
                            href="#" 
                            onClick={(e) => {
                                e.preventDefault();
                                onClose();
                                if (onOpenLogin) {
                                    setTimeout(() => onOpenLogin(), 100);
                                }
                            }}
                            style={{ fontSize: isMobile ? '12px' : '14px', color: '#dc3545', textDecoration: 'underline', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Sign in here
                        </a>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .modal-content-scroll::-webkit-scrollbar {
                    width: 8px;
                }
                .modal-content-scroll::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }
                .modal-content-scroll::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 4px;
                }
                .modal-content-scroll::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `}</style>
        </div>
    );
};

const inputStyle = {
    width: '100%',
    padding: '12px 15px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
    color: '#333',
    background: 'white',
    boxSizing: 'border-box'
};

export default RegisterModal;
