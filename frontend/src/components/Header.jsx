import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const Header = ({ onLogin, isLoggedIn }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showMobileLogin, setShowMobileLogin] = useState(false);
    // Inline error message. Native alert() was unreliable on mobile —
    // the dialog could appear behind the modal overlay or get dismissed
    // by the keyboard, hiding messages like "invalid password" or
    // "no VPNs allowed." Rendered inline in the form instead.
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async () => {
        setErrorMessage('');
        if (username && password) {
            setIsLoggingIn(true);
            try {
                await onLogin(username, password);
                setUsername('');
                setPassword('');
                setShowMobileLogin(false);
            } catch (error) {
                setErrorMessage(error?.message || 'Login failed. Please try again.');
            } finally {
                setIsLoggingIn(false);
            }
        } else {
            setErrorMessage('Please enter username and password');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    const closeMobileLogin = () => {
        setShowMobileLogin(false);
        setErrorMessage('');
    };

    return (
        <header className={`main-header${!isLoggedIn ? ' is-mobile-loggedout' : ''}`}>
            <div className="logo">
                <picture>
                    <source srcSet="/logo.webp" type="image/webp" />
                    <img
                        src="/logo.png"
                        alt="bettorplays247"
                        width="384"
                        height="384"
                        decoding="async"
                    />
                </picture>
            </div>

            {!isLoggedIn ? (
                <div className="mobile-inline-login">
                    <input
                        type="text"
                        placeholder="Login ID"
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); if (errorMessage) setErrorMessage(''); }}
                        onKeyPress={handleKeyPress}
                        className="mobile-inline-input"
                        autoComplete="username"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (errorMessage) setErrorMessage(''); }}
                        onKeyPress={handleKeyPress}
                        className="mobile-inline-input"
                        autoComplete="current-password"
                    />

                    {errorMessage && (
                        <div role="alert" className="mobile-inline-error">{errorMessage}</div>
                    )}
                    <button
                        className="mobile-inline-submit"
                        onClick={handleLogin}
                        disabled={isLoggingIn}
                    >
                        {isLoggingIn ? 'SIGNING IN...' : 'LOGIN'}
                    </button>
                </div>
            ) : null}

            <div className="login-section desktop-only" style={{ position: 'relative' }}>
                {!isLoggedIn ? (
                    <>
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="Username"
                                id="loginId"
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); if (errorMessage) setErrorMessage(''); }}
                                onKeyPress={handleKeyPress}
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                id="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); if (errorMessage) setErrorMessage(''); }}
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
                        {errorMessage && (
                            <div
                                role="alert"
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    right: 0,
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#b91c1c',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                                    zIndex: 50,
                                }}
                            >
                                {errorMessage}
                            </div>
                        )}
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
                {isLoggedIn && (
                    <div className="landing-top-bar">
                        <div className="icon-btn">
                            <i className="fa-solid fa-magnifying-glass"></i>
                            <span>SEARCH</span>
                        </div>
                        <div className="icon-btn">
                            <i className="fa-solid fa-cash-register"></i>
                            <span>CASHIER</span>
                        </div>
                        <div className="mobile-user-trigger" onClick={() => setShowMobileLogin(!showMobileLogin)}>
                            <div style={{ width: '30px', height: '30px', background: '#00ff66', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontWeight: 'bold' }}>
                                {username ? username.charAt(0).toUpperCase() : 'U'}
                            </div>
                        </div>
                    </div>
                )}

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
                            padding: '28px 24px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            animation: 'fadeIn 0.4s ease-out'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '4px' }}>
                                <span
                                    onClick={closeMobileLogin}
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

                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                                <picture>
                                    <source srcSet="/logo.webp" type="image/webp" />
                                    <img
                                        src="/logo.png"
                                        alt="bettorplays247"
                                        style={{ width: '160px', height: 'auto' }}
                                    />
                                </picture>
                            </div>

                            {!isLoggedIn ? (
                                <>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input
                                            type="text"
                                            placeholder="Login ID"
                                            value={username}
                                            onChange={(e) => { setUsername(e.target.value); if (errorMessage) setErrorMessage(''); }}
                                            onKeyPress={handleKeyPress}
                                            style={{
                                                width: '100%',
                                                padding: '14px 44px 14px 16px',
                                                borderRadius: '8px',
                                                border: '1px solid #ccc',
                                                fontSize: '16px',
                                                color: '#333',
                                                background: 'white',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <i
                                            className="fa-solid fa-key"
                                            style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 16, pointerEvents: 'none' }}
                                        />
                                    </div>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input
                                            type="password"
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); if (errorMessage) setErrorMessage(''); }}
                                            onKeyPress={handleKeyPress}
                                            style={{
                                                width: '100%',
                                                padding: '14px 44px 14px 16px',
                                                borderRadius: '8px',
                                                border: '1px solid #ccc',
                                                fontSize: '16px',
                                                color: '#333',
                                                background: 'white',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <i
                                            className="fa-solid fa-key"
                                            style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 16, pointerEvents: 'none' }}
                                        />
                                    </div>

                                    {errorMessage && (
                                        <div
                                            role="alert"
                                            style={{
                                                background: '#fef2f2',
                                                border: '1px solid #fecaca',
                                                color: '#b91c1c',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                lineHeight: 1.35,
                                                textAlign: 'center',
                                            }}
                                        >
                                            {errorMessage}
                                        </div>
                                    )}

                                    <button
                                        className="btn-login"
                                        onClick={handleLogin}
                                        style={{
                                            width: '100%',
                                            padding: '14px',
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '17px',
                                            fontWeight: 'bold',
                                            letterSpacing: '0.5px',
                                            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                                            opacity: isLoggingIn ? 0.7 : 1
                                        }}
                                    >
                                        {isLoggingIn ? 'SIGNING IN...' : 'LOGIN'}
                                    </button>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#000' }}>
                                    <div style={{ marginBottom: '15px', fontWeight: 'bold', fontSize: '18px' }}>WELCOME BACK</div>
                                    <button
                                        className="btn-login"
                                        onClick={closeMobileLogin}
                                        style={{
                                            width: '100%',
                                            padding: '14px',
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '17px',
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
