import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAgent } from '../api';

const AgentLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        setIsLoggingIn(true);

        try {
            const result = await loginAgent(username, password);

            const allowedRoles = ['agent', 'master_agent', 'super_agent'];
            if (!allowedRoles.includes(result.role)) {
                throw new Error('Not authorized: valid agent role required');
            }

            localStorage.setItem('token', result.token);
            localStorage.setItem('userRole', result.role);

            if (result.role === 'super_agent') {
                sessionStorage.setItem('super_agentAuthenticated', 'true');
                sessionStorage.setItem('super_agentUsername', username);
                navigate('/super_agent/dashboard');
            } else {
                sessionStorage.setItem('agentAuthenticated', 'true');
                sessionStorage.setItem('agentUsername', username);
                navigate('/agent/dashboard');
            }
        } catch (err) {
            console.error('❌ Agent login failed:', err);
            setError(err.message || 'Invalid agent credentials');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0b3d2a 0%, #0f172a 100%)',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                width: '100%',
                maxWidth: '400px',
                margin: '20px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <img
                        src="/bgremlogo.png"
                        alt="Agent"
                        style={{ height: '60px', marginBottom: '20px' }}
                    />
                    <h2 style={{
                        margin: 0,
                        color: '#0b3d2a',
                        fontSize: '28px',
                        fontWeight: 'bold'
                    }}>
                        AGENT LOGIN
                    </h2>
                    <p style={{
                        color: '#666',
                        fontSize: '14px',
                        marginTop: '10px'
                    }}>
                        Agent Dashboard Access
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#333',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter agent username"
                            style={{
                                width: '100%',
                                padding: '12px 15px',
                                borderRadius: '6px',
                                border: '2px solid #ddd',
                                fontSize: '16px',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.3s',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#0b3d2a'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#333',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter agent password"
                            style={{
                                width: '100%',
                                padding: '12px 15px',
                                borderRadius: '6px',
                                border: '2px solid #ddd',
                                fontSize: '16px',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.3s',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#0b3d2a'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: '#ffe6e6',
                            color: '#d32f2f',
                            padding: '12px',
                            borderRadius: '6px',
                            marginBottom: '20px',
                            fontSize: '14px',
                            textAlign: 'center',
                            border: '1px solid #ffcccc'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoggingIn}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: isLoggingIn ? '#999' : '#0b3d2a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                            transition: 'background 0.3s',
                            marginBottom: '15px'
                        }}
                        onMouseEnter={(e) => !isLoggingIn && (e.target.style.background = '#0a2d1f')}
                        onMouseLeave={(e) => !isLoggingIn && (e.target.style.background = '#0b3d2a')}
                    >
                        {isLoggingIn ? 'LOGGING IN...' : 'LOGIN'}
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <small style={{ color: '#888' }}>Authorized access only</small>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgentLogin;
