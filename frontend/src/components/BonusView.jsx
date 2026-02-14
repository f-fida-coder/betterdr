import React, { useState } from 'react';
import '../bonus.css';
import { createDeposit } from '../api';

const BonusView = () => {
    const [activeTab, setActiveTab] = useState('deposits');
    const [selectedMethod, setSelectedMethod] = useState('visa');
    const [depositAmount, setDepositAmount] = useState('');

    const handleDeposit = async (methodName, amountValue) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login to deposit');
            return;
        }
        const amount = amountValue ?? depositAmount;
        if (!amount || isNaN(amount)) return;

        try {
            const data = await createDeposit(parseFloat(amount), token);
            alert(`Deposit Initiated! Client Secret: ${data.clientSecret.substring(0, 10)}...`);
        } catch (e) {
            alert(`Deposit Error: ${e.message}`);
        }
    };

    const tabs = [
        { id: 'deposits', label: 'Deposits', icon: 'fa-solid fa-arrow-down' },
        { id: 'withdrawals', label: 'Withdrawals', icon: 'fa-solid fa-arrow-up' },
        { id: 'loyalty', label: 'Loyalty', icon: 'fa-regular fa-star' },
        { id: 'requests', label: 'Requests', icon: 'fa-regular fa-file-lines' }
    ];

    const depositMethods = [
        { id: 'visa', name: 'Mastercard / Visa', icon: 'fa-brands fa-cc-visa', color: '#1a1f71', time: 'Instant', fee: 'Low fees' },
        { id: 'apple', name: 'Apple Pay', icon: 'fa-brands fa-apple', color: '#ffffff', time: 'Instant', fee: 'No extra fees' },
        { id: 'btc', name: 'Bitcoin', icon: 'fa-brands fa-bitcoin', color: '#f7931a', time: '10–30 min', fee: 'Network fee' },
        { id: 'eth', name: 'Ethereum', icon: 'fa-brands fa-ethereum', color: '#627eea', time: '5–20 min', fee: 'Network fee' },
        { id: 'usdt', name: 'USDT (TRC20)', icon: 'fa-solid fa-coins', color: '#26a17b', time: '5–15 min', fee: 'Low fee' },
        { id: 'ltc', name: 'Litecoin', icon: 'fa-solid fa-circle-nodes', color: '#345d9d', time: '5–15 min', fee: 'Low fee' },
        { id: 'sol', name: 'Solana', icon: 'fa-solid fa-bolt', color: '#14f195', time: '1–3 min', fee: 'Low fee' },
        { id: 'bank', name: 'Bank Transfer', icon: 'fa-solid fa-building-columns', color: '#94a3b8', time: '1–3 days', fee: 'No fee' }
    ];

    const quickAmounts = [25, 50, 100, 250, 500, 1000];

    const selectedMethodInfo = depositMethods.find(m => m.id === selectedMethod) || depositMethods[0];

    return (
        <div className="bonus-view-container">
            <div className="bonus-shell">
                <aside className="bonus-sidebar">
                    <div className="sidebar-brand">
                        <span className="brand-chip">Wallet</span>
                        <h2>Bonus Center</h2>
                        <p>Manage deposits, withdrawals, and loyalty rewards.</p>
                    </div>
                    <div className="sidebar-nav">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                type="button"
                            >
                                <span className="sidebar-icon"><i className={tab.icon}></i></span>
                                <div>
                                    <div className="sidebar-title">{tab.label}</div>
                                    <div className="sidebar-subtitle">
                                        {tab.id === 'deposits' && 'Add funds instantly'}
                                        {tab.id === 'withdrawals' && 'Secure payout options'}
                                        {tab.id === 'loyalty' && 'Rewards & tiers'}
                                        {tab.id === 'requests' && 'Track activity'}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="sidebar-footer">
                        <div className="footer-card">
                            <span>Need assistance?</span>
                            <button type="button">Contact Support</button>
                        </div>
                    </div>
                </aside>

                <section className="bonus-main">
                    <div className="bonus-top">
                        <div>
                            <span className="bonus-eyebrow">Wallet Overview</span>
                            <h1>Fast, secure transactions</h1>
                            <p>All payment tools in one place. Choose a method, enter an amount, and confirm.</p>
                        </div>
                        <div className="bonus-top-stats">
                            <div>
                                <span>Processing</span>
                                <strong>Instant / Same Day</strong>
                            </div>
                            <div>
                                <span>Security</span>
                                <strong>Encrypted & Verified</strong>
                            </div>
                        </div>
                    </div>

                    {activeTab === 'deposits' && (
                        <div className="bonus-section">
                            <div className="section-header">
                                <div>
                                    <h2 className="section-title">Choose a deposit method</h2>
                                    <p className="section-subtitle">Pick a method, enter amount, and confirm.</p>
                                </div>
                                <div className="section-badge">
                                    <i className="fa-solid fa-lock"></i> Secure
                                </div>
                            </div>
                            <div className="deposit-layout">
                                <div className="deposit-methods-grid">
                                    {depositMethods.map((method) => (
                                        <button
                                            key={method.id}
                                            className={`deposit-method-card ${selectedMethod === method.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedMethod(method.id)}
                                            type="button"
                                        >
                                            <div className="method-icon" style={{ color: method.color }}>
                                                <i className={method.icon}></i>
                                            </div>
                                            <div className="method-info">
                                                <div className="method-name">{method.name}</div>
                                                <div className="method-meta">
                                                    <span><i className="fa-regular fa-clock"></i> {method.time}</span>
                                                    <span><i className="fa-solid fa-tag"></i> {method.fee}</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="deposit-panel">
                                    <div className="panel-header">
                                        <div>
                                            <div className="panel-title">Deposit Summary</div>
                                            <div className="panel-subtitle">Review and confirm your deposit.</div>
                                        </div>
                                        <div className="panel-pill">{selectedMethodInfo?.name}</div>
                                    </div>

                                    <div className="amount-input">
                                        <label>Amount</label>
                                        <div className="input-row">
                                            <span className="currency">$</span>
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Enter amount"
                                                value={depositAmount}
                                                onChange={(e) => setDepositAmount(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="quick-amounts">
                                        {quickAmounts.map((amount) => (
                                            <button
                                                key={amount}
                                                type="button"
                                                className={`chip ${Number(depositAmount) === amount ? 'active' : ''}`}
                                                onClick={() => setDepositAmount(String(amount))}
                                            >
                                                ${amount}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="panel-summary">
                                        <div>
                                            <span>Processing time</span>
                                            <strong>{selectedMethodInfo?.time}</strong>
                                        </div>
                                        <div>
                                            <span>Fees</span>
                                            <strong>{selectedMethodInfo?.fee}</strong>
                                        </div>
                                    </div>

                                    <button
                                        className="method-select-btn full"
                                        onClick={() => handleDeposit(selectedMethodInfo?.name, depositAmount)}
                                    >
                                        Deposit Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'withdrawals' && (
                        <div className="bonus-section">
                            <div className="section-header">
                                <div>
                                    <h2 className="section-title">Withdraw funds</h2>
                                    <p className="section-subtitle">Secure payout options with verification.</p>
                                </div>
                            </div>
                            <div className="bonus-grid-2">
                                <div className="info-card">
                                    <div className="info-card-header">
                                        <div>
                                            <h3>Withdrawals Portal</h3>
                                            <p>Secure your winnings with verified withdrawal options.</p>
                                        </div>
                                        <span className="status-pill">No pending</span>
                                    </div>
                                    <div className="info-list">
                                        <div>
                                            <span>Standard processing</span>
                                            <strong>1–3 business days</strong>
                                        </div>
                                        <div>
                                            <span>Verification</span>
                                            <strong>Identity check required</strong>
                                        </div>
                                        <div>
                                            <span>Minimum withdrawal</span>
                                            <strong>$20</strong>
                                        </div>
                                    </div>
                                    <button className="method-select-btn full" type="button">
                                        Request Withdrawal
                                    </button>
                                </div>
                                <div className="info-card muted">
                                    <h3>Available Methods</h3>
                                    <div className="method-list">
                                        <div><i className="fa-brands fa-cc-visa"></i> Card Refund</div>
                                        <div><i className="fa-brands fa-bitcoin"></i> Bitcoin</div>
                                        <div><i className="fa-brands fa-ethereum"></i> Ethereum</div>
                                        <div><i className="fa-solid fa-coins"></i> USDT (TRC20)</div>
                                        <div><i className="fa-solid fa-circle-nodes"></i> Litecoin</div>
                                        <div><i className="fa-solid fa-bolt"></i> Solana</div>
                                        <div><i className="fa-solid fa-building-columns"></i> Bank Transfer</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'loyalty' && (
                        <div className="bonus-section">
                            <div className="section-header">
                                <div>
                                    <h2 className="section-title">Loyalty rewards</h2>
                                    <p className="section-subtitle">Earn points and unlock exclusive perks.</p>
                                </div>
                            </div>
                            <div className="bonus-grid-2">
                                <div className="info-card">
                                    <div className="info-card-header">
                                        <div>
                                            <h3>Loyalty Overview</h3>
                                            <p>Earn points on every wager and unlock VIP perks.</p>
                                        </div>
                                        <span className="status-pill gold">Gold Tier</span>
                                    </div>
                                    <div className="loyalty-progress">
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: '72%' }}></div>
                                        </div>
                                        <div className="progress-labels">
                                            <span>2,880 / 4,000 pts</span>
                                            <span>Next: Platinum</span>
                                        </div>
                                    </div>
                                    <div className="info-list">
                                        <div><span>Weekly cashback</span><strong>3%</strong></div>
                                        <div><span>Priority support</span><strong>Enabled</strong></div>
                                        <div><span>Exclusive promos</span><strong>3 active</strong></div>
                                    </div>
                                </div>
                                <div className="info-card muted">
                                    <h3>Tier Benefits</h3>
                                    <div className="tier-grid">
                                        <div className="tier-card">
                                            <h4>Silver</h4>
                                            <p>1% cashback, weekly draws</p>
                                        </div>
                                        <div className="tier-card active">
                                            <h4>Gold</h4>
                                            <p>3% cashback, VIP promos</p>
                                        </div>
                                        <div className="tier-card">
                                            <h4>Platinum</h4>
                                            <p>5% cashback, concierge</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'requests' && (
                        <div className="bonus-section">
                            <div className="section-header">
                                <div>
                                    <h2 className="section-title">Recent activity</h2>
                                    <p className="section-subtitle">Track deposits and withdrawals in real time.</p>
                                </div>
                            </div>
                            <div className="bonus-grid-2">
                                <div className="info-card">
                                    <div className="info-card-header">
                                        <div>
                                            <h3>Active Requests</h3>
                                            <p>Track your latest deposits and withdrawals.</p>
                                        </div>
                                        <span className="status-pill">Updated</span>
                                    </div>
                                    <div className="request-list">
                                        <div className="request-item">
                                            <div>
                                                <strong>Deposit • $250</strong>
                                                <span>Mastercard / Visa</span>
                                            </div>
                                            <span className="request-status success">Completed</span>
                                        </div>
                                        <div className="request-item">
                                            <div>
                                                <strong>Withdrawal • $120</strong>
                                                <span>Bank Transfer</span>
                                            </div>
                                            <span className="request-status pending">Pending</span>
                                        </div>
                                        <div className="request-item">
                                            <div>
                                                <strong>Deposit • $75</strong>
                                                <span>Bitcoin</span>
                                            </div>
                                            <span className="request-status review">Review</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="info-card muted">
                                    <h3>Need help?</h3>
                                    <p>Contact support for large withdrawals or verification help.</p>
                                    <button className="method-select-btn full" type="button">
                                        Contact Support
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default BonusView;
