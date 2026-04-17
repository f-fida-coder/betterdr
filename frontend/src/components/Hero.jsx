import React, { useState, useEffect } from 'react';

const BANNER_DATA = [
    {
        fallback: '/hero-banner-home.jpg',
        webp: '/hero-banner-home.webp',
        title: 'N.Y KNICKS VS DETROIT',
        subtitle: 'Tonight @ 7:00 P.M | Madison Square Garden'
    },
    {
        fallback: '/arena-banner-home.jpg',
        webp: '/arena-banner-home.webp',
        title: 'UPCOMING NFL SUNDAY',
        subtitle: 'Pre-game Analysis & Live Odds Starts @ 1PM'
    },
    {
        fallback: '/football-banner-home.jpg',
        webp: '/football-banner-home.webp',
        title: 'PREMIER LEAGUE ACTION',
        subtitle: 'Matchday 24: Liverpool vs Man City'
    }
];

const IMAGE_DIMENSION = 800;

const Hero = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isImageReady, setIsImageReady] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const preloadRemainingBanners = () => {
            if (navigator.connection?.saveData) {
                return;
            }

            BANNER_DATA.slice(1).forEach(({ webp, fallback }) => {
                const preloadedImage = new Image();
                preloadedImage.src = webp || fallback;
            });
        };

        if (typeof window.requestIdleCallback === 'function') {
            const idleId = window.requestIdleCallback(preloadRemainingBanners, { timeout: 2500 });
            return () => window.cancelIdleCallback(idleId);
        }

        const timeoutId = window.setTimeout(preloadRemainingBanners, 1500);
        return () => window.clearTimeout(timeoutId);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (document.hidden) return;
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
                <picture className="hero-banner-picture">
                    <source srcSet={currentBanner.webp} type="image/webp" />
                    <img
                        key={currentBanner.fallback}
                        className={`hero-banner-image ${isImageReady ? 'is-ready' : ''}`}
                        src={currentBanner.fallback}
                        alt="Sportsbook board"
                        id="heroImage"
                        width={IMAGE_DIMENSION}
                        height={IMAGE_DIMENSION}
                        decoding="async"
                        fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
                        loading={currentIndex === 0 ? 'eager' : 'lazy'}
                        onLoad={() => setIsImageReady(true)}
                        onError={() => setIsImageReady(true)}
                    />
                </picture>
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
                    <picture>
                        <source srcSet="/promo-football-home.webp" type="image/webp" />
                        <img
                            src="/promo-football-home.jpg"
                            alt="NFL Promo"
                            width={IMAGE_DIMENSION}
                            height={IMAGE_DIMENSION}
                            loading="lazy"
                            decoding="async"
                        />
                    </picture>
                    <div className="promo-text">
                        <h3>NFL PLAYOFFS</h3>
                        <p>Live Odds & Analysis</p>
                    </div>
                    <div className="promo-badge">bettorplays247</div>
                </div>
                <div className="promo-card">
                    <picture>
                        <source srcSet="/arena-banner-home.webp" type="image/webp" />
                        <img
                            src="/arena-banner-home.jpg"
                            alt="Arena Promo"
                            width={IMAGE_DIMENSION}
                            height={IMAGE_DIMENSION}
                            loading="lazy"
                            decoding="async"
                        />
                    </picture>
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
