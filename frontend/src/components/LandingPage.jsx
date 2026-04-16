import React, { useState } from 'react';
import Header from './Header';
import LeagueNav from './LeagueNav';
import Hero from './Hero';

const LandingPage = ({ onLogin, isLoggedIn }) => {
    const [activeLeague, setActiveLeague] = useState('all');

    return (
        <div className="landing-page">
            <Header onLogin={onLogin} isLoggedIn={isLoggedIn} />
            <LeagueNav activeLeague={activeLeague} onSelectLeague={setActiveLeague} />
            <Hero />
            <div className="banner-content-centered">
                <picture>
                    <source srcSet="/logo.webp" type="image/webp" />
                    <img
                        src="/logo.png"
                        alt="bettorplays247"
                        className="banner-logo"
                        width="384"
                        height="384"
                        loading="lazy"
                        decoding="async"
                    />
                </picture>
                <div className="banner-divider"></div>
                <p className="banner-tagline">THE PREMIUM CHOICE FOR WINNERS</p>
            </div>
            <footer className="main-footer">
                <div className="footer-content">
                    <div className="footer-left">
                        <picture>
                            <source srcSet="/logo.webp" type="image/webp" />
                            <img
                                src="/logo.png"
                                alt="Logo"
                                className="footer-logo"
                                width="384"
                                height="384"
                                loading="lazy"
                                decoding="async"
                            />
                        </picture>
                        <p className="copyright">© 2026 bettorplays247 | All Rights Reserved</p>
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
