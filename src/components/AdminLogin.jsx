import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api';

const AdminLogin = () => {
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
            // Get real JWT from backend (supports test admin credentials)
            const result = await loginUser(username, password);
            console.log('✅ Login successful:', result);
            console.log('📝 Token received:', result.token ? result.token.substring(0, 50) + '...' : 'NO TOKEN');

            // Must be admin role
            if (result.role !== 'admin') {
                throw new Error('Not authorized: admin role required');
            }

            // Persist token for admin API calls
            localStorage.setItem('token', result.token);
            const storedToken = localStorage.getItem('token');
            console.log('💾 Token stored in localStorage:', storedToken ? storedToken.substring(0, 50) + '...' : 'FAILED');
            console.log('✅ localStorage.token === result.token:', storedToken === result.token);
            
            sessionStorage.setItem('adminAuthenticated', 'true');
            sessionStorage.setItem('adminUsername', username);

            // Navigate to admin panel
            navigate('/admin/dashboard');
        } catch (err) {
            console.error('❌ Admin login failed:', err);
            setError(err.message || 'Invalid admin credentials');
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
                        ADMIN LOGIN
                    </h2>
                    <p style={{ 
                        color: '#666', 
                        fontSize: '14px', 
                        marginTop: '10px' 
                    }}>
                        Admin Panel Access
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
                            onKeyPress={handleKeyPress}
                            placeholder="Enter admin username"
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
                            placeholder="Enter admin password"
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
                        {isLoggingIn ? 'LOGGING IN...' : 'LOGIN'}
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
