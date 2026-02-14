import React, { useState } from 'react';

const Sidebar = () => {
    const [activeTab, setActiveTab] = useState('slip');

    return (
        <aside className="sidebar">
            <div className="bet-slip">
                <div className="slip-header">
                    <h3>Bet Slip</h3>
                    <div className="slip-count">2</div>
                </div>

                <div className="slip-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'slip' ? 'active' : ''}`}
                        onClick={() => setActiveTab('slip')}
                    >
                        SINGLE
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'parlay' ? 'active' : ''}`}
                        onClick={() => setActiveTab('parlay')}
                    >
                        PARLAY
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'mybets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('mybets')}
                    >
                        MY BETS
                    </button>
                </div>

                <div className="bets-container">
                    <div className="bet-item">
                        <div className="bet-item-header">
                            <span className="bet-item-team">LAKERS -5.5</span>
                            <span className="remove-bet">✕</span>
                        </div>
                        <div className="bet-item-match">Lakers vs Warriors</div>
                        <div className="bet-item-odds">
                            <span>Spread</span>
                            <span>-110</span>
                        </div>
                    </div>

                    <div className="bet-item">
                        <div className="bet-item-header">
                            <span className="bet-item-team">OVER 220.5</span>
                            <span className="remove-bet">✕</span>
                        </div>
                        <div className="bet-item-match">Knicks vs Celtics</div>
                        <div className="bet-item-odds">
                            <span>Total Points</span>
                            <span>-110</span>
                        </div>
                    </div>
                </div>

                <div className="slip-summary">
                    <div className="summary-row">
                        <span>Total Stake</span>
                        <span>$0.00</span>
                    </div>
                    <div className="summary-row">
                        <span>Est. Return</span>
                        <span className="summary-total">$0.00</span>
                    </div>
                    <button className="btn-place-bet">PLACE BET</button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
