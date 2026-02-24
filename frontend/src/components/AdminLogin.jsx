import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin, loginAgent } from '../api';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginRole, setLoginRole] = useState('admin'); // 'admin' or 'agent'
    const navigate = useNavigate();

    // Auto-redirect if already authenticated
    React.useEffect(() => {
        const isAuth = sessionStorage.getItem(`${loginRole}Authenticated`) === 'true';
        if (isAuth) {
            navigate(`/${loginRole}/dashboard`);
        }
    }, [loginRole, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        setIsLoggingIn(true);

        try {
            let result;
            if (loginRole === 'admin') {
                result = await loginAdmin(username, password);
                if (result.role !== 'admin') {
                    throw new Error('Not authorized: admin role required');
                }
                localStorage.setItem('token', result.token);
                sessionStorage.setItem('token', result.token);
                localStorage.setItem('userRole', result.role);
                sessionStorage.setItem('adminAuthenticated', 'true');
                sessionStorage.setItem('adminUsername', username);
                navigate('/admin/dashboard');
            } else {
                result = await loginAgent(username, password);
                const allowedRoles = ['agent', 'master_agent', 'super_agent'];
                if (!allowedRoles.includes(result.role)) {
                    throw new Error('Not authorized: valid agent role required');
                }
                localStorage.setItem('token', result.token);
                sessionStorage.setItem('token', result.token);
                localStorage.setItem('userRole', result.role);
                if (result.role === 'master_agent' || result.role === 'super_agent') {
                    sessionStorage.setItem('super_agentAuthenticated', 'true');
                    sessionStorage.setItem('super_agentUsername', username);
                    navigate('/super_agent/dashboard');
                } else {
                    sessionStorage.setItem('agentAuthenticated', 'true');
                    sessionStorage.setItem('agentUsername', username);
                    navigate('/agent/dashboard');
                }
            }
        } catch (err) {
            console.error(`❌ ${loginRole} login failed:`, err);
            setError(err.message || `Invalid ${loginRole} credentials`);
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0d3b5c 0%, #1a1a2e 100%)',
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
                        alt="Admin"
                        style={{ height: '60px', marginBottom: '20px' }}
                    />
                    <h2 style={{
                        margin: 0,
                        color: '#0d3b5c',
                        fontSize: '28px',
                        fontWeight: 'bold'
                    }}>
                        {loginRole === 'admin' ? 'ADMIN LOGIN' : 'AGENT LOGIN'}
                    </h2>
                    <p style={{
                        color: '#666',
                        fontSize: '14px',
                        marginTop: '10px'
                    }}>
                        {loginRole === 'admin' ? 'Admin Panel Access' : 'Agent Dashboard Access'}
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    {/* Role Selector */}
                    <div style={{ display: 'flex', marginBottom: '20px', background: '#f0f2f5', borderRadius: '8px', padding: '4px', border: '1px solid #e1e4e8' }}>
                        <button
                            type="button"
                            onClick={() => setLoginRole('admin')}
                            style={{
                                flex: 1,
                                background: loginRole === 'admin' ? '#0d3b5c' : 'transparent',
                                color: loginRole === 'admin' ? 'white' : '#666',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '10px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            ADMIN
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginRole('agent')}
                            style={{
                                flex: 1,
                                background: loginRole === 'agent' ? '#0d3b5c' : 'transparent',
                                color: loginRole === 'agent' ? 'white' : '#666',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '10px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            AGENT
                        </button>
                    </div>

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
                            onKeyPress={handleKeyPress}
                            placeholder={`Enter ${loginRole} username`}
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
                            onFocus={(e) => e.target.style.borderColor = '#0d3b5c'}
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
                            onKeyPress={handleKeyPress}
                            placeholder={`Enter ${loginRole} password`}
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
                            onFocus={(e) => e.target.style.borderColor = '#0d3b5c'}
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
                            background: isLoggingIn ? '#999' : '#0d3b5c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                            transition: 'background 0.3s',
                            marginBottom: '15px'
                        }}
                        onMouseEnter={(e) => !isLoggingIn && (e.target.style.background = '#0a2d45')}
                        onMouseLeave={(e) => !isLoggingIn && (e.target.style.background = '#0d3b5c')}
                    >
                        {isLoggingIn ? 'LOGGING IN...' : `LOGIN AS ${loginRole.toUpperCase()}`}
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <a
                            href="/"
                            style={{
                                color: '#0d3b5c',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}
                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                        >
                            ← Back to Main Site
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
