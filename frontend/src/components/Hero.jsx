import React, { useState, useEffect } from 'react';

const BANNER_DATA = [
    { img: '/hero-banner.png', title: 'N.Y KNICKS VS DETROIT', subtitle: 'Tonight @ 7:00 P.M | Madison Square Garden' },
    { img: '/arena-banner.png', title: 'UPCOMING NFL SUNDAY', subtitle: 'Pre-game Analysis & Live Odds Starts @ 1PM' },
    { img: '/football-banner.png', title: 'PREMIER LEAGUE ACTION', subtitle: 'Matchday 24: Liverpool vs Man City' }
];

const Hero = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % BANNER_DATA.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const currentBanner = BANNER_DATA[currentIndex];

    return (
        <div className="hero-container">
            <section className="hero-section">
                <img
                    src={currentBanner.img}
                    alt="Featured Match"
                    id="heroImage"
                    style={{ animation: 'fadeIn 0.5s ease-in-out' }}
                />
                <div className="hero-overlay">
                    <div className="hero-text">
                        <span className="hero-badge">FEATURED MATCH</span>
                        <h1 id="heroTitle">{currentBanner.title}</h1>
                        <p id="heroSubtitle">{currentBanner.subtitle}</p>
                    </div>
                    <button className="btn-login" style={{ background: 'var(--gold)', color: 'black' }}>BET NOW</button>
                </div>
                <div className="hero-controls">
                    {BANNER_DATA.map((_, index) => (
                        <div
                            key={index}
                            className={`control-dot ${index === currentIndex ? 'active' : ''}`}
                            onClick={() => setCurrentIndex(index)}
                        ></div>
                    ))}
                </div>
            </section>

            <div className="promo-flex-row">
                <div className="promo-card">
                    <img src="/promo-football.png" alt="NFL Promo" />
                    <div className="promo-text">
                        <h3>NFL PLAYOFFS</h3>
                        <p>Live Odds & Analysis</p>
                    </div>
                    <div className="promo-badge">betterbet365</div>
                </div>
                <div className="promo-card">
                    <img src="/arena-banner.png" alt="Arena Promo" />
                    <div className="promo-text">
                        <h3>NBA FINALS</h3>
                        <p>Get in on the action</p>
                    </div>
                    <div className="promo-badge">betterbet365</div>
                </div>
            </div>
        </div>
    );
};

export default Hero;
