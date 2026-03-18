import React, { useState, useEffect } from 'react';

const BANNER_DATA = [
    { img: '/hero-banner.png', title: 'N.Y KNICKS VS DETROIT', subtitle: 'Tonight @ 7:00 P.M | Madison Square Garden' },
    { img: '/arena-banner.png', title: 'UPCOMING NFL SUNDAY', subtitle: 'Pre-game Analysis & Live Odds Starts @ 1PM' },
    { img: '/football-banner.png', title: 'PREMIER LEAGUE ACTION', subtitle: 'Matchday 24: Liverpool vs Man City' }
];

const Hero = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isImageReady, setIsImageReady] = useState(false);

    useEffect(() => {
        BANNER_DATA.forEach(({ img }) => {
            const preloadedImage = new Image();
            preloadedImage.src = img;
        });
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % BANNER_DATA.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setIsImageReady(false);
    }, [currentIndex]);

    const currentBanner = BANNER_DATA[currentIndex];

    return (
        <div className="hero-container">
            <section className="hero-section">
                <img
                    key={currentBanner.img}
                    className={`hero-banner-image ${isImageReady ? 'is-ready' : ''}`}
                    src={currentBanner.img}
                    alt="Sportsbook board"
                    id="heroImage"
                    onLoad={() => setIsImageReady(true)}
                    onError={() => setIsImageReady(true)}
                />
                <div className="hero-overlay">
                    <div className="hero-text">
                        <span className="hero-badge">TODAY'S BOARD</span>
                        <h1 id="heroTitle">{currentBanner.title}</h1>
                        <p id="heroSubtitle">{currentBanner.subtitle}</p>
                    </div>
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
                    <div className="promo-badge">bettorplays247</div>
                </div>
                <div className="promo-card">
                    <img src="/arena-banner.png" alt="Arena Promo" />
                    <div className="promo-text">
                        <h3>NBA FINALS</h3>
                        <p>Get in on the action</p>
                    </div>
                    <div className="promo-badge">bettorplays247</div>
                </div>
            </div>
        </div>
    );
};

export default Hero;
