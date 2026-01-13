import React, { useState } from 'react';
import '../bonus.css';

const BonusView = () => {
    const [activeTab, setActiveTab] = useState('deposits');

    const tabs = [
        { id: 'deposits', label: 'Deposits', icon: 'fa-solid fa-arrow-down' },
        { id: 'withdrawals', label: 'Withdrawals', icon: 'fa-solid fa-arrow-up' },
        { id: 'loyalty', label: 'Loyalty', icon: 'fa-regular fa-star' },
        { id: 'requests', label: 'Requests', icon: 'fa-regular fa-file-lines' }
    ];

    const depositMethods = [
        { id: 'btc', name: 'Bitcoin', icon: 'fa-brands fa-bitcoin', color: '#f7931a' },
        { id: 'ltc', name: 'Litecoin', icon: 'fa-solid fa-circle-nodes', color: '#345d9d' },
        { id: 'visa', name: 'Mastercard / Visa', icon: 'fa-brands fa-cc-visa', color: '#1a1f71' },
        { id: 'apple', name: 'Apple Pay', icon: 'fa-brands fa-apple', color: '#ffffff' },
        { id: 'bank', name: 'Bank Transfer', icon: 'fa-solid fa-building-columns', color: '#94a3b8' }
    ];

    return (
        <div className="bonus-view-container">
            <div className="bonus-card">
                <div className="bonus-tabs">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`bonus-tab-item ${activeTab === tab.id ? 'active' : ''}`}
                        >
                            <span className="tab-icon-small">
                                <i className={tab.icon}></i>
                            </span>
                            <span className="tab-label-text">{tab.label}</span>
                        </div>
                    ))}
                </div>

                <div className="bonus-content">
                    {activeTab === 'deposits' && (
                        <div className="deposit-section">
                            <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '30px', color: '#fff' }}>Recommended Methods</h2>
                            <div className="deposit-methods-grid">
                                {depositMethods.map((method) => (
                                    <div key={method.id} className="deposit-method-card">
                                        <div className="method-icon" style={{ color: method.color }}>
                                            <i className={method.icon}></i>
                                        </div>
                                        <div className="method-info">
                                            <div className="method-name">{method.name}</div>
                                            <div className="method-status">Fast Processing</div>
                                        </div>
                                        <button className="method-select-btn">Deposit Now</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'withdrawals' && (
                        <div className="safe-secure-seal">
                            <div className="seal-icon">
                                <i className="fa-solid fa-money-bill-transfer"></i>
                            </div>
                            <div className="seal-label">Withdrawals Portal</div>
                            <div className="seal-subtext">You have no pending withdrawals. Withdraw your winnings using our secure channels.</div>
                        </div>
                    )}

                    {activeTab === 'loyalty' && (
                        <div className="safe-secure-seal">
                            <div className="seal-icon">
                                <i className="fa-solid fa-crown" style={{ color: '#fbbf24' }}></i>
                            </div>
                            <div className="seal-label">Loyalty Points</div>
                            <div className="seal-subtext">Play games to earn points and climb the ranks for exclusive rewards!</div>
                        </div>
                    )}

                    {activeTab === 'requests' && (
                        <div className="safe-secure-seal">
                            <div className="seal-icon">
                                <i className="fa-solid fa-clipboard-list"></i>
                            </div>
                            <div className="seal-label">Active Requests</div>
                            <div className="seal-subtext">All your deposit and withdrawal requests will appear here for tracking.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BonusView;
