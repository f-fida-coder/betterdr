import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import RegisterModal from './RegisterModal';

const Header = ({ onLogin, isLoggedIn }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showMobileLogin, setShowMobileLogin] = useState(false);

    const handleLogin = () => {
        if (username && password) {
            setIsLoggingIn(true);
            setTimeout(() => {
                setIsLoggingIn(false);
                onLogin(username);
            }, 1000);
        } else {
                        alert("Please enter username and password");
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
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            className="btn-login"
                            onClick={handleLogin}
                            style={isLoggingIn ? { opacity: 0.7 } : {}}
                        >
                            {isLoggingIn ? 'LOGGING IN...' : 'SIGN IN'}
                        </button>
                        <button
                            className="btn-login"
                            onClick={() => setShowRegisterModal(true)}
                            style={{ marginLeft: '15px' }}
                        >
                            REGISTER
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
                                <button className="mobile-join-btn" onClick={() => setShowRegisterModal(true)}>JOIN NOW</button>
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
                showMobileLogin && (
                    <div className="mobile-login-dropdown">
                        {!isLoggedIn ? (
                            <>
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="mobile-input"
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mobile-input"
                                />
                                <button className="btn-login mobile-btn" onClick={handleLogin}>
                                    {isLoggingIn ? '...' : 'SIGN IN'}
                                </button>
                                <button className="btn-login mobile-btn register" onClick={() => { setShowRegisterModal(true); setShowMobileLogin(false); }}>
                                    REGISTER
                                </button>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', color: 'white' }}>
                                <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>WELCOME BACK</div>
                                <button className="btn-login" style={{ width: '100%' }}>MY ACCOUNT</button>
                            </div>
                        )}
                    </div>
                )
            }

            {showRegisterModal && createPortal(
                <RegisterModal onClose={() => setShowRegisterModal(false)} />,
                document.body
            )}
        </header >
    );
};

export default Header;
