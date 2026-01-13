import React from 'react';
import '../tutorials.css';

const TutorialsView = () => {
    const tutorials = [
        { id: 1, title: 'How Upgrades Work', desc: 'Learn how to maximize your betting strategy with our new upgrade system.', icon: 'fa-solid fa-arrow-up-right-dots', tag: 'Beginner' },
        { id: 2, title: 'Understanding Moneyline', desc: 'The simplest bet explained. Who will win the game outright?', icon: 'fa-solid fa-money-bill-wave', tag: 'Basics' },
        { id: 3, title: 'Parlay Betting Guide', desc: 'Combine multiple bets for bigger payouts. High risk, high reward.', icon: 'fa-solid fa-layer-group', tag: 'Advanced' },
        { id: 4, title: 'Live Betting Strategies', desc: 'How to bet on games while they are in progress.', icon: 'fa-solid fa-desktop', tag: 'Live' },
        { id: 5, title: 'Prop Bets Explained', desc: 'Betting on individual player performances and stats.', icon: 'fa-solid fa-user-tag', tag: 'Intermediate' },
        { id: 6, title: 'Responsible Gaming', desc: 'Tips for maintaining a healthy and fun betting experience.', icon: 'fa-solid fa-shield-heart', tag: 'Important' }
    ];

    return (
        <div className="tutorials-container">
            <div className="tutorials-header">
                <h1>Betting Tutorials & Guides</h1>
                <p>Master the art of sports betting with our expert guides</p>
            </div>

            <div className="tutorials-grid">
                {tutorials.map(tut => (
                    <div className="tutorial-card" key={tut.id}>
                        <div className="tutorial-img-placeholder">
                            <i className={tut.icon}></i>
                        </div>
                        <div className="tutorial-content">
                            <div className="tutorial-tags">
                                <span className="tag">{tut.tag}</span>
                            </div>
                            <h3>{tut.title}</h3>
                            <p>{tut.desc}</p>
                            <span className="read-btn">Read Article <i className="fa-solid fa-arrow-right"></i></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TutorialsView;
