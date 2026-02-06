import React, { useState } from 'react';
import Header from './Header';
import LeagueNav from './LeagueNav';
import Hero from './Hero';

const LandingPage = ({ onLogin, isLoggedIn }) => {
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [activeLeague, setActiveLeague] = useState('all');

    const handleFormLogin = async () => {
        try {
            await onLogin(loginForm.username, loginForm.password);
            setLoginError('');
        } catch (err) {
            setLoginError(err.message || 'Login failed');
        }
    };

    return (
        <div className="landing-page">
            <Header onLogin={onLogin} isLoggedIn={isLoggedIn} />
            <LeagueNav activeLeague={activeLeague} onSelectLeague={setActiveLeague} />

            <Hero />

            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', marginBottom: '40px' }}>
                <div style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: 'rgba(0,0,0,0.85)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '30px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(20px)'
                }}>
                    <h2 style={{ margin: '0 0 8px', color: 'white', textAlign: 'center', fontSize: '24px', fontWeight: 900 }}>WELCOME BACK</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>Sign in to access your dashboard</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 700, marginLeft: '4px' }}>USERNAME</label>
                            <input
                                type="text"
                                placeholder="Enter username"
                                value={loginForm.username}
                                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'all 0.3s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#ff1e1e'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 700, marginLeft: '4px' }}>PASSWORD</label>
                            <input
                                type="password"
                                placeholder="Enter password"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                                onKeyPress={(e) => e.key === 'Enter' && handleFormLogin()}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'all 0.3s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#ff1e1e'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                            />
                        </div>

                        <button
                            onClick={handleFormLogin}
                            style={{
                                padding: '14px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #ff1e1e 0%, #a30000 100%)',
                                color: 'white',
                                fontWeight: 800,
                                fontSize: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                marginTop: '10px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                boxShadow: '0 4px 15px rgba(255, 30, 30, 0.4)'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            Log In to Dashboard
                        </button>

                        {loginError && (
                            <div style={{
                                color: '#ffb3b3',
                                fontSize: '13px',
                                textAlign: 'center',
                                padding: '10px',
                                background: 'rgba(255, 30, 30, 0.1)',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 30, 30, 0.2)'
                            }}>
                                {loginError}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bottom-banner">
                <div className="banner-overlay">
                    <div className="banner-content-centered">
                        <img src="/bgremlogo.png" alt="betterbet365" style={{ height: '70px', marginBottom: '20px', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4)) brightness(1.1)' }} />
                        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '20px' }}></div>
                        <p style={{ color: 'white', fontSize: '14px', fontWeight: 700, letterSpacing: '4px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>THE PREMIUM CHOICE FOR WINNERS</p>
                    </div>
                </div>
            </div>

            <footer className="main-footer" style={{ padding: '60px 20px', background: 'rgba(0,0,0,0.5)', marginTop: '40px' }}>
                <div className="footer-content" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="footer-left">
                        <img src="/bgremlogo.png" alt="Logo" style={{ height: '40px', opacity: 0.7 }} />
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '10px' }}>© 2026 betterbet365 | All Rights Reserved</p>
                    </div>
                    <div className="footer-right" style={{ display: 'flex', gap: '30px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 700 }}>RESPONSIBLE GAMING</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 700 }}>TERMS & CONDITIONS</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 700 }}>PRIVACY POLICY</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
