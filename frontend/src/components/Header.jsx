import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const Header = ({ onLogin, isLoggedIn }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showMobileLogin, setShowMobileLogin] = useState(false);

    const handleLogin = async () => {
        if (username && password) {
            setIsLoggingIn(true);
            try {
                // Frontend only login - accept any credentials
                await onLogin(username, password);
                setUsername('');
                setPassword('');
                setShowMobileLogin(false);
            } catch (error) {
                alert(error.message);
            } finally {
                setIsLoggingIn(false);
            }
        } else {
            alert("Please enter username and password");
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <header className="main-header">
            <div className="logo">
                <img src="/bgremlogo.png" alt="betterbet365" />
            </div>
            <div className="login-section desktop-only">
                {!isLoggedIn ? (
                    <>
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="Username"
                                id="loginId"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                        </div>
                        <button
                            className="btn-login"
                            onClick={handleLogin}
                            style={isLoggingIn ? { opacity: 0.7 } : {}}
                        >
                            {isLoggingIn ? 'LOGGING IN...' : 'SIGN IN'}
                        </button>
                    </>
                ) : (
                    <button
                        className="btn-login"
                        style={{ background: '#00ff66', color: 'black', boxShadow: '0 0 30px rgba(0,255,102,0.4)' }}
                    >
                        WELCOME BACK
                    </button>
                )}
            </div>

            <div className="mobile-header-container mobile-only">
                <div className="top-header">

                    {isLoggedIn && (
                        <>
                            <div className="icon-btn">
                                <i className="fa-solid fa-magnifying-glass"></i>
                                <span>SEARCH</span>
                            </div>

                            <div className="icon-btn">
                                <i className="fa-solid fa-cash-register"></i>
                                <span>CASHIER</span>
                            </div>
                        </>
                    )}

                    <div className="right-section">
                        {!isLoggedIn ? (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <button className="mobile-login-btn" onClick={() => setShowMobileLogin(!showMobileLogin)}>LOGIN</button>
                            </div>
                        ) : (
                            <div className="mobile-user-trigger" onClick={() => setShowMobileLogin(!showMobileLogin)}>
                                <div style={{ width: '30px', height: '30px', background: '#00ff66', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontWeight: 'bold' }}>
                                    {username ? username.charAt(0).toUpperCase() : 'U'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {isLoggedIn && (
                    <div className="tabs-bar">
                        <div className="tab-item active">
                            <span className="tab-letter">S</span>
                            <span className="tab-text">STRAIGHT</span>
                        </div>
                        <div className="tab-item">
                            <span className="tab-letter">P</span>
                            <span className="tab-text">PARLAY</span>
                        </div>
                        <div className="tab-item">
                            <span className="tab-letter">T</span>
                            <span className="tab-text">TEASER</span>
                        </div>
                        <div className="tab-item">
                            <span className="tab-letter">I</span>
                            <span className="tab-text">IF BET</span>
                        </div>
                        <div className="tab-item">
                            <i className="fa-solid fa-desktop tab-icon"></i>
                            <span className="tab-text">BET LIVE</span>
                        </div>
                    </div>
                )}

                {isLoggedIn && (
                    <div className="info-bar">
                        <div className="info-bar-item">– UP NEXT –</div>
                        <div className="info-bar-item">– FEATURED –</div>
                    </div>
                )}
            </div>

            {
                showMobileLogin && createPortal(
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 99998,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'Arial, sans-serif',
                        padding: '20px',
                        boxSizing: 'border-box',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                    }}>
                        <div style={{
                            background: 'white',
                            width: '100%',
                            maxWidth: '400px',
                            borderRadius: '12px',
                            boxShadow: '0 30px 100px rgba(0,0,0,0.9)',
                            padding: '30px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            animation: 'fadeIn 0.4s ease-out'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h2 style={{ margin: 0, color: '#000', fontSize: '22px', fontWeight: 'bold' }}>SIGN IN</h2>
                                <span
                                    onClick={() => setShowMobileLogin(false)}
                                    style={{
                                        cursor: 'pointer',
                                        fontSize: '28px',
                                        fontWeight: 'bold',
                                        color: '#000',
                                        lineHeight: '1'
                                    }}
                                >
                                    ×
                                </span>
                            </div>

                            {!isLoggedIn ? (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        style={{
                                            width: '100%',
                                            padding: '12px 15px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            fontSize: '16px',
                                            color: '#333',
                                            background: 'white',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        style={{
                                            width: '100%',
                                            padding: '12px 15px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            fontSize: '16px',
                                            color: '#333',
                                            background: 'white',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <button 
                                        className="btn-login" 
                                        onClick={handleLogin}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                                            opacity: isLoggingIn ? 0.7 : 1
                                        }}
                                    >
                                        {isLoggingIn ? 'SIGNING IN...' : 'SIGN IN'}
                                    </button>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#000' }}>
                                    <div style={{ marginBottom: '15px', fontWeight: 'bold', fontSize: '18px' }}>WELCOME BACK</div>
                                    <button 
                                        className="btn-login" 
                                        onClick={() => setShowMobileLogin(false)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        MY ACCOUNT
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* RegisterModal removed */}
        </header >
    );
};

export default Header;
