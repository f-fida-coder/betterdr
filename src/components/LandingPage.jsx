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
            <div className="banner-content-centered">
                <img src="/bgremlogo.png" alt="betterbet365" className="banner-logo" />
                <div className="banner-divider"></div>
                <p className="banner-tagline">THE PREMIUM CHOICE FOR WINNERS</p>
            </div>
            <footer className="main-footer">
                <div className="footer-content">
                    <div className="footer-left">
                        <img src="/bgremlogo.png" alt="Logo" className="footer-logo" />
                        <p className="copyright">© 2026 betterbet365 | All Rights Reserved</p>
                    </div>
                    <div className="footer-right">
                        <span>RESPONSIBLE GAMING</span>
                        <span>TERMS & CONDITIONS</span>
                        <span>PRIVACY POLICY</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
