import React from 'react';
import '../casino.css';

const games = [
    { title: 'Blackjack', limits: 'Min: $1 | Max: $100', color: '#006400', icon: 'fa-solid fa-diamond' },     { title: 'Blackjack Pro', limits: 'Min: $1 | Max: $50', color: '#004d00', icon: 'fa-solid fa-diamond' },
    { title: 'Blackjack VIP', limits: 'Min: $1 | Max: $25', color: '#003300', icon: 'fa-solid fa-crown' },
    { title: 'Baccarat', limits: 'Min: $1 | Max: $100', color: '#8b0000', icon: 'fa-solid fa-gem' },     { title: 'American Roulette', limits: 'Min: $1 | Max: $100', color: '#b22222', icon: 'fa-solid fa-dharmachakra' },
    { title: 'Single Zero Roulette', limits: 'Min: $1 | Max: $100', color: '#b8860b', icon: 'fa-solid fa-circle-notch' },     { title: 'Arabian Treasure', limits: 'Min: $0.30 | Max: $30', color: '#800080', icon: 'fa-solid fa-scroll' },     { title: 'Tales of Terror', limits: 'Min: $0.01 | Max: $25', color: '#2f4f4f', icon: 'fa-solid fa-ghost' },
    { title: 'Halloween', limits: 'Min: $0.01 | Max: $50', color: '#191970', icon: 'fa-solid fa-spider' },
    { title: 'BoggeyMan', limits: 'Min: $0.01 | Max: $50', color: '#000000', icon: 'fa-solid fa-mask' },
    { title: 'Burlesque', limits: 'Min: $0.01 | Max: $50', color: '#c71585', icon: 'fa-solid fa-feather' },     { title: 'City Animals', limits: 'Min: $0.01 | Max: $50', color: '#4169e1', icon: 'fa-solid fa-paw' },
    { title: 'Dino Gangsters', limits: 'Min: $0.30 | Max: $30', color: '#556b2f', icon: 'fa-solid fa-dragon' },
    { title: 'Bounty Hunter', limits: 'Min: $0.01 | Max: $45', color: '#a0522d', icon: 'fa-solid fa-hat-cowboy' },
    { title: 'Fruity Fortune', limits: 'Min: $0.05 | Max: $4.50', color: '#ff4500', icon: 'fa-solid fa-lemon' },
    { title: 'Frosty Christmas', limits: 'Min: $0.01 | Max: $50', color: '#00ced1', icon: 'fa-solid fa-snowflake' },
];

const CasinoView = () => {
    return (
        <div className="casino-wrapper">
            <div className="casino-subnav-bar">
                <div className="casino-nav-items">
                    <div className="casino-nav-item active">
                        <span className="casino-nav-icon"><i className="fa-solid fa-table-cells-large"></i></span>
                        <span>LOBBY</span>
                    </div>
                    <div className="casino-nav-item">
                        <span className="casino-nav-icon"><i className="fa-solid fa-playing-cards"></i></span>
                        <span>TABLE GAMES</span>
                    </div>
                    <div className="casino-nav-item">
                        <span className="casino-nav-icon"><i className="fa-solid fa-slot-machine"></i></span>
                        <span>SLOTS</span>
                    </div>
                    <div className="casino-nav-item">
                        <span className="casino-nav-icon"><i className="fa-solid fa-heart"></i></span>
                        <span>VIDEO POKER</span>
                    </div>
                    <div className="casino-nav-item">
                        <span className="casino-nav-icon"><i className="fa-solid fa-star"></i></span>
                        <span>SPECIALTY GAMES</span>
                    </div>
                </div>

                <div className="casino-search-container">
                    <input type="text" className="casino-search-input" placeholder="SEARCH GAMES" />
                    <button className="casino-search-btn"><i className="fa-solid fa-magnifying-glass"></i></button>
                </div>
            </div>

            <div className="casino-grid">
                {games.map((game, index) => (
                    <div className="casino-card" key={index}>
                        <div className="casino-card-image" style={{ background: `linear-gradient(45deg, #111, ${game.color})` }}>
                            <span style={{ fontSize: '60px', opacity: 0.5, color: 'white' }}>
                                <i className={game.icon}></i>
                            </span>
                            <div style={{ position: 'absolute' }}>
                                <div className="play-overlay">
                                    <i className="fa-solid fa-play"></i>
                                </div>
                            </div>
                        </div>
                        <div className="casino-card-info">
                            <div className="casino-game-title">{game.title}</div>
                            <div className="casino-bet-limits">{game.limits}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CasinoView;
