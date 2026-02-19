import React, { useEffect, useMemo, useState } from 'react';
import '../bonus.css';
import { getBalance, getWalletTransactions, requestDeposit, requestWithdrawal } from '../api';

const TABS = [
    { id: 'deposits', label: 'Deposits', icon: 'fa-solid fa-arrow-down' },
    { id: 'withdrawals', label: 'Withdrawals', icon: 'fa-solid fa-arrow-up' },
    { id: 'loyalty', label: 'Loyalty', icon: 'fa-regular fa-star' },
    { id: 'requests', label: 'Requests', icon: 'fa-regular fa-file-lines' }
];

const DEPOSIT_METHODS = [
    { id: 'mastercard_visa', label: 'Mastercard / Visa', eta: 'Instant', fee: 'Low fee', icon: 'fa-brands fa-cc-visa' },
    { id: 'apple_pay', label: 'Apple Pay', eta: 'Instant', fee: 'No extra fee', icon: 'fa-brands fa-apple' },
    { id: 'bitcoin', label: 'Bitcoin', eta: '10-30 min', fee: 'Network fee', icon: 'fa-brands fa-bitcoin' },
    { id: 'ethereum', label: 'Ethereum', eta: '5-20 min', fee: 'Network fee', icon: 'fa-brands fa-ethereum' },
    { id: 'bank_transfer', label: 'Bank Transfer', eta: '1-3 days', fee: 'No fee', icon: 'fa-solid fa-building-columns' }
];

const WITHDRAW_METHODS = [
    { id: 'bank_transfer', label: 'Bank Transfer', eta: '1-3 days', icon: 'fa-solid fa-building-columns' },
    { id: 'crypto', label: 'Crypto Wallet', eta: '15-60 min', icon: 'fa-solid fa-wallet' },
    { id: 'card_refund', label: 'Card Refund', eta: '1-5 days', icon: 'fa-brands fa-cc-visa' }
];

const QUICK_AMOUNTS = [25, 50, 100, 250, 500, 1000];

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const BonusView = () => {
    const token = localStorage.getItem('token');
    const [activeTab, setActiveTab] = useState('deposits');
    const [balance, setBalance] = useState({ balance: 0, pendingBalance: 0, availableBalance: 0 });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionBusy, setActionBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [depositMethod, setDepositMethod] = useState(DEPOSIT_METHODS[0].id);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState(WITHDRAW_METHODS[0].id);
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const loadWallet = async () => {
        if (!token) {
            setLoading(false);
            setError('Please login to access wallet.');
            return;
        }
        try {
            setLoading(true);
            setError('');
            const [wallet, txPayload] = await Promise.all([
                getBalance(token),
                getWalletTransactions(token, { limit: 100 })
            ]);
            setBalance({
                balance: Number(wallet?.balance || 0),
                pendingBalance: Number(wallet?.pendingBalance || 0),
                availableBalance: Number(wallet?.availableBalance || 0)
            });
            setTransactions(Array.isArray(txPayload?.transactions) ? txPayload.transactions : []);
        } catch (err) {
            setError(err.message || 'Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWallet();
    }, []);

    const depositMethodInfo = useMemo(
        () => DEPOSIT_METHODS.find((method) => method.id === depositMethod) || DEPOSIT_METHODS[0],
        [depositMethod]
    );

    const withdrawMethodInfo = useMemo(
        () => WITHDRAW_METHODS.find((method) => method.id === withdrawMethod) || WITHDRAW_METHODS[0],
        [withdrawMethod]
    );

    const walletStats = useMemo(() => {
        const completedDeposits = transactions
            .filter((tx) => tx.type === 'deposit' && tx.status === 'completed')
            .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const completedWithdrawals = transactions
            .filter((tx) => tx.type === 'withdrawal' && tx.status === 'completed')
            .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const settledBets = transactions
            .filter((tx) => tx.type === 'bet_placed')
            .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const loyaltyPoints = Math.floor((completedDeposits + settledBets) / 10);
        const loyaltyTarget = 4000;
        const loyaltyPct = Math.min(100, Math.round((loyaltyPoints / loyaltyTarget) * 100));
        return {
            completedDeposits,
            completedWithdrawals,
            settledBets,
            loyaltyPoints,
            loyaltyTarget,
            loyaltyPct
        };
    }, [transactions]);

    const requestItems = useMemo(() => {
        return [...transactions]
            .filter((tx) => tx.type === 'deposit' || tx.type === 'withdrawal')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [transactions]);

    const handleDepositRequest = async () => {
        const amount = Number(depositAmount);
        if (Number.isNaN(amount) || amount < 10) {
            setError('Deposit must be at least $10');
            return;
        }
        try {
            setActionBusy(true);
            setError('');
            const payload = await requestDeposit(amount, depositMethod, token);
            setMessage(payload.message || 'Deposit request submitted');
            setDepositAmount('');
            await loadWallet();
        } catch (err) {
            setError(err.message || 'Failed to submit deposit request');
        } finally {
            setActionBusy(false);
        }
    };

    const handleWithdrawalRequest = async () => {
        const amount = Number(withdrawAmount);
        if (Number.isNaN(amount) || amount < 20) {
            setError('Withdrawal must be at least $20');
            return;
        }
        if (amount > balance.availableBalance) {
            setError('Withdrawal exceeds available balance');
            return;
        }
        try {
            setActionBusy(true);
            setError('');
            const payload = await requestWithdrawal(amount, withdrawMethod, token);
            setMessage(payload.message || 'Withdrawal request submitted');
            setWithdrawAmount('');
            await loadWallet();
        } catch (err) {
            setError(err.message || 'Failed to submit withdrawal request');
        } finally {
            setActionBusy(false);
        }
    };

    return (
        <div className="bonus-view-container">
            <div className="bonus-shell">
                <aside className="bonus-sidebar">
                    <div className="sidebar-brand">
                        <span className="brand-chip">Wallet</span>
                        <h2>Cashier Center</h2>
                        <p>Professional cashier flow with secure approval and tracking.</p>
                    </div>

                    <div className="sidebar-wallet-cards">
                        <div className="wallet-card">
                            <span>Balance</span>
                            <strong>{money(balance.balance)}</strong>
                        </div>
                        <div className="wallet-card">
                            <span>Available</span>
                            <strong>{money(balance.availableBalance)}</strong>
                        </div>
                        <div className="wallet-card">
                            <span>Pending</span>
                            <strong>{money(balance.pendingBalance)}</strong>
                        </div>
                    </div>

                    <div className="sidebar-nav">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <i className={tab.icon}></i>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="bonus-main">
                    <div className="bonus-main-top">
                        <div>
                            <h1>Wallet & Bonus Operations</h1>
                            <p>All actions are DB-backed and approval-aware for sportsbook workflows.</p>
                        </div>
                        <button className="secondary-btn" onClick={loadWallet} type="button">
                            <i className="fa-solid fa-rotate-right"></i> Refresh
                        </button>
                    </div>

                    {message && <div className="bonus-banner success">{message}</div>}
                    {error && <div className="bonus-banner error">{error}</div>}
                    {loading && <div className="bonus-loading">Loading wallet data...</div>}

                    {!loading && activeTab === 'deposits' && (
                        <div className="bonus-content-grid">
                            <div className="bonus-card">
                                <h3>Deposit Methods</h3>
                                <div className="method-grid">
                                    {DEPOSIT_METHODS.map((method) => (
                                        <button
                                            key={method.id}
                                            type="button"
                                            className={`method-card ${depositMethod === method.id ? 'selected' : ''}`}
                                            onClick={() => setDepositMethod(method.id)}
                                        >
                                            <div className="method-head">
                                                <i className={method.icon}></i>
                                                <strong>{method.label}</strong>
                                            </div>
                                            <div className="method-meta">
                                                <span>{method.eta}</span>
                                                <span>{method.fee}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bonus-card summary">
                                <h3>Submit Deposit Request</h3>
                                <div className="input-label">Method</div>
                                <div className="pill">{depositMethodInfo.label}</div>
                                <div className="input-label">Amount</div>
                                <div className="amount-row">
                                    <span>$</span>
                                    <input
                                        type="number"
                                        min="10"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        placeholder="Enter amount"
                                    />
                                </div>
                                <div className="chips">
                                    {QUICK_AMOUNTS.map((amount) => (
                                        <button key={amount} className={`chip ${Number(depositAmount) === amount ? 'active' : ''}`} onClick={() => setDepositAmount(String(amount))} type="button">
                                            ${amount}
                                        </button>
                                    ))}
                                </div>
                                <button className="primary-btn" disabled={actionBusy} onClick={handleDepositRequest} type="button">
                                    {actionBusy ? 'Submitting...' : 'Request Deposit'}
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'withdrawals' && (
                        <div className="bonus-content-grid">
                            <div className="bonus-card">
                                <h3>Withdrawal Methods</h3>
                                <div className="method-grid">
                                    {WITHDRAW_METHODS.map((method) => (
                                        <button
                                            key={method.id}
                                            type="button"
                                            className={`method-card ${withdrawMethod === method.id ? 'selected' : ''}`}
                                            onClick={() => setWithdrawMethod(method.id)}
                                        >
                                            <div className="method-head">
                                                <i className={method.icon}></i>
                                                <strong>{method.label}</strong>
                                            </div>
                                            <div className="method-meta">
                                                <span>{method.eta}</span>
                                                <span>Approval required</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bonus-card summary">
                                <h3>Submit Withdrawal Request</h3>
                                <div className="input-label">Available Balance</div>
                                <div className="pill">{money(balance.availableBalance)}</div>
                                <div className="input-label">Method</div>
                                <div className="pill">{withdrawMethodInfo.label}</div>
                                <div className="input-label">Amount</div>
                                <div className="amount-row">
                                    <span>$</span>
                                    <input
                                        type="number"
                                        min="20"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="Enter amount"
                                    />
                                </div>
                                <button className="primary-btn" disabled={actionBusy} onClick={handleWithdrawalRequest} type="button">
                                    {actionBusy ? 'Submitting...' : 'Request Withdrawal'}
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'loyalty' && (
                        <div className="bonus-content-grid">
                            <div className="bonus-card">
                                <h3>Loyalty Progress</h3>
                                <div className="metric-row">
                                    <span>Current Points</span>
                                    <strong>{walletStats.loyaltyPoints}</strong>
                                </div>
                                <div className="progress-bar">
                                    <div style={{ width: `${walletStats.loyaltyPct}%` }}></div>
                                </div>
                                <div className="metric-row muted">
                                    <span>{walletStats.loyaltyPoints} / {walletStats.loyaltyTarget}</span>
                                    <span>{walletStats.loyaltyPct}%</span>
                                </div>
                            </div>
                            <div className="bonus-card">
                                <h3>Wallet Performance</h3>
                                <div className="metric-row"><span>Completed Deposits</span><strong>{money(walletStats.completedDeposits)}</strong></div>
                                <div className="metric-row"><span>Completed Withdrawals</span><strong>{money(walletStats.completedWithdrawals)}</strong></div>
                                <div className="metric-row"><span>Settled Bet Volume</span><strong>{money(walletStats.settledBets)}</strong></div>
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'requests' && (
                        <div className="bonus-card full">
                            <h3>Deposit/Withdrawal Requests</h3>
                            <div className="request-table">
                                <div className="request-head">
                                    <span>Type</span>
                                    <span>Amount</span>
                                    <span>Status</span>
                                    <span>Date</span>
                                    <span>Description</span>
                                </div>
                                {requestItems.length === 0 && <div className="request-empty">No requests found.</div>}
                                {requestItems.map((tx) => (
                                    <div key={tx.id} className="request-row">
                                        <span className="caps">{tx.type}</span>
                                        <span>{money(tx.amount)}</span>
                                        <span className={`status ${tx.status}`}>{tx.status}</span>
                                        <span>{new Date(tx.createdAt).toLocaleString()}</span>
                                        <span>{tx.description || '-'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default BonusView;
