import React, { useState, useEffect } from 'react';
import { getUserStatistics, updateUserByAdmin, updateUserByAgent, getAgents, impersonateUser } from '../../api';

function CustomerDetailsView({ userId, onBack, role = 'admin' }) {
    const [customer, setCustomer] = useState(null);
    const [stats, setStats] = useState(null);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [referredBy, setReferredBy] = useState(null);
    const [referralStats, setReferralStats] = useState({
        referredCount: 0,
        referralBonusGranted: false,
        referralBonusAmount: 0,
        referralBonusGrantedAt: null,
        referralQualifiedDepositAt: null
    });
    const [activeTab, setActiveTab] = useState('basics'); // 'basics' or 'freeplay'
    const [freeplayAmount, setFreeplayAmount] = useState('');
    const [adjustingFreeplay, setAdjustingFreeplay] = useState(false);
    const [formData, setFormData] = useState({
        password: '',
        firstName: '',
        lastName: '',
        agentId: '',
        status: 'active',
        creditLimit: 1000,
        balanceOwed: 0,
        freeplayBalance: 0,
        minBet: 25,
        maxBet: 200,
        defaultMinBet: 25,
        defaultMaxBet: 200,
        defaultCreditLimit: 1000,
        defaultSettleLimit: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Please login to view details.');
                    return;
                }

                const [statsData, agentsData] = await Promise.all([
                    getUserStatistics(userId, token),
                    ['admin', 'master_agent', 'super_agent'].includes(role) ? getAgents(token) : Promise.resolve([])
                ]);

                if (statsData && statsData.user) {
                    setCustomer(statsData.user);
                    setStats(statsData.stats || {});
                    setReferredBy(statsData.referredBy || null);
                    setReferralStats(statsData.referralStats || {
                        referredCount: 0,
                        referralBonusGranted: false,
                        referralBonusAmount: 0,
                        referralBonusGrantedAt: null,
                        referralQualifiedDepositAt: null
                    });
                    setFormData({
                        password: '',
                        firstName: statsData.user.firstName || '',
                        lastName: statsData.user.lastName || '',
                        agentId: statsData.user.agentId || '',
                        status: statsData.user.status || 'active',
                        creditLimit: statsData.user.creditLimit || 1000,
                        balanceOwed: statsData.user.balanceOwed || 0,
                        freeplayBalance: statsData.user.freeplayBalance || 0,
                        minBet: statsData.user.minBet || 25,
                        maxBet: statsData.user.maxBet || 200,
                        defaultMinBet: statsData.user.defaultMinBet || 25,
                        defaultMaxBet: statsData.user.defaultMaxBet || 200,
                        defaultCreditLimit: statsData.user.defaultCreditLimit || 1000,
                        defaultSettleLimit: statsData.user.defaultSettleLimit || 0
                    });
                }
                setAgents(agentsData || []);
                setError('');
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError('Failed to load details.');
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchData();
        }
    }, [userId, role]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError('');
            setSuccess('');
            const token = localStorage.getItem('token');

            const payload = { ...formData };
            if (!payload.password) delete payload.password;

            if (role === 'agent') {
                await updateUserByAgent(userId, payload, token);
            } else {
                await updateUserByAdmin(userId, payload, token);
            }

            setSuccess('Profile updated successfully!');
            setFormData(prev => ({ ...prev, password: '' }));
        } catch (err) {
            console.error('Failed to update:', err);
            setError(err.message || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    const handleAdjustFreeplay = async (mode) => {
        if (!freeplayAmount || isNaN(freeplayAmount)) return;
        try {
            setAdjustingFreeplay(true);
            const token = localStorage.getItem('token');
            const current = Number(formData.freeplayBalance || 0);
            const adjust = Number(freeplayAmount);
            const nextFreeplay = mode === 'add' ? current + adjust : Math.max(0, current - adjust);

            const { updateUserFreeplay } = await import('../../api');
            await updateUserFreeplay(userId, nextFreeplay, token);

            setFormData(prev => ({ ...prev, freeplayBalance: nextFreeplay }));
            setFreeplayAmount('');
            setSuccess(`Freeplay ${mode === 'add' ? 'added' : 'removed'} successfully!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to adjust freeplay');
        } finally {
            setAdjustingFreeplay(false);
        }
    };

    const handleImpersonate = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await impersonateUser(userId, token);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            window.location.href = '/dashboard';
        } catch (err) {
            setError('Impersonation failed: ' + err.message);
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        setSuccess(`${label} copied!`);
        setTimeout(() => setSuccess(''), 2000);
    };

    const formatCurrency = (val) => {
        const num = Number(val || 0);
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            signDisplay: 'always'
        }).format(num);
    };

    if (loading) return <div className="admin-view"><div className="view-content">Loading...</div></div>;
    if (!customer) return <div className="admin-view"><div className="view-content">Not found. <button onClick={onBack}>Back</button></div></div>;

    const available = Number(formData.creditLimit || 0) - Number(formData.balanceOwed || 0);
    const displayPassword = customer.rawPassword || (() => {
        const last4 = (customer.phoneNumber || '').replace(/\D/g, '').slice(-4);
        const f3 = (customer.firstName || '').slice(0, 3).toUpperCase();
        const l3 = (customer.lastName || '').slice(0, 3).toUpperCase();
        return `${f3}${l3}${last4}`;
    })();
    const roleLabel = customer.role === 'user' ? 'Player' : customer.role === 'agent' ? 'Agent' : 'Master Agent';

    return (
        <div className="customer-details-view premium-theme">
            <div className="details-header">
                <div className="header-top">
                    <button className="back-btn" onClick={onBack}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="left-info">
                        <div className="user-profile">
                            <div className="user-title">
                                <div className="title-wrap">
                                    <h2>{customer.username}</h2>
                                    <span className={`role-chip role-${customer.role}`}>{roleLabel}</span>
                                </div>
                                <div className="profile-actions">
                                    <button className="login-btn-prof" onClick={handleImpersonate}>
                                        Login User
                                    </button>
                                    <button
                                        className="login-btn-prof secondary"
                                        onClick={() => {
                                            const pass = displayPassword;

                                            let info = '';
                                            if (customer.role === 'user') {
                                                info = `Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${customer.username}
Password: ${pass}
Min bet: $${customer.minBet || 25}
Max bet: $${customer.maxBet || 200}
Credit: $${customer.creditLimit || 1000}


PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. Settle up’s are +/-$200 so anything under $200 will push to the following week. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you’ll be required to settle your balance even if it’s under $200. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so we can get everyone paid quickly and as smoothly as possible. If you can’t pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send. 

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don’t respond or don’t pay on time or in full then you will be shown the same reciprocation when it comes to payouts. 

REFFERALS
$200 freeplay bonuses for any ACTIVE  and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vise versa. In order for you to get your free play bonus your refferal must go through one settle up of $200.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We’ve heard them all so don’t waste your time. 

FREEPLAY
I start all NEW players off with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. (This is to prevent everyone who abuses the free play to win free money and leave). When you place a bet you have to click “Use your freeplay balance $” (If you don’t you’re using your own money). Since we are very generous with freeplay unfortunately it is limited to straight bets only and no parlays. I offer 20% free play to anyone above settle to roll your balance to limit transactions. If you chose to roll for free play you must be actively betting with your own money or your free play will not count. 

I need active players so if you could do me a solid and place a bet today even if it’s with freeplay. Good luck! Lmk that you’ve read all the rules and or if you have any questions and need me to adjust anything!
`;
                                            } else {
                                                const typeLabel = customer.role === 'agent' ? 'Agent' : 'Master Agent';
                                                info = `Welcome to the team! Here’s your ${typeLabel} administrative account info.

Login: ${customer.username}
Password: ${pass}

Min bet: $${customer.defaultMinBet || 25}
Max bet: $${customer.defaultMaxBet || 200}
Credit: $${customer.defaultCreditLimit || 1000}

Please ensure you manage your sectors responsibly and maintain clear communication with your assigned accounts. Good luck!
`;
                                            }
                                            copyToClipboard(info, 'All Details');
                                        }}
                                    >
                                        Copy Details
                                    </button>
                                </div>
                            </div>
                            <div className="cred-block">
                                <div className="cred-item">
                                    <label>Login:</label>
                                    <span className="val">{customer.username}</span>
                                    <button className="copy-icon" onClick={() => copyToClipboard(customer.username, 'Username')}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                    </button>
                                </div>
                                <div className="cred-item">
                                    <label>Password:</label>
                                    <span className="val">
                                        {displayPassword}
                                    </span>
                                    <button className="copy-icon" onClick={() => {
                                        copyToClipboard(displayPassword, 'Password');
                                    }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="betting-limits-block">
                            <div className="limit-row">
                                <span className="label">Min bet:</span>
                                <span className="value">{Number(customer.role === 'user' ? customer.minBet : (customer.defaultMinBet || 25)).toLocaleString()}</span>
                            </div>
                            <div className="limit-row">
                                <span className="label">Max bet:</span>
                                <span className="value">{Number(customer.role === 'user' ? customer.maxBet : (customer.defaultMaxBet || 200)).toLocaleString()}</span>
                            </div>
                            <div className="limit-row highlight">
                                <span className="label">Credit limit:</span>
                                <span className="value">{Number(customer.role === 'user' ? customer.creditLimit : (customer.defaultCreditLimit || 1000)).toLocaleString()}</span>
                            </div>
                            <div className="limit-row highlight">
                                <span className="label">Settle Limit:</span>
                                <span className="value">{Number(customer.role === 'user' ? (customer.balanceOwed || 0) : (customer.defaultSettleLimit || 0)).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="right-summary">
                        <div className="metrics-stacked">
                            <div className="metric-item">
                                <label>Balance</label>
                                <span className={`value ${Number(customer.balance) < 0 ? 'negative' : 'positive'}`}>
                                    {formatCurrency(customer.balance)}
                                </span>
                            </div>
                            <div className="metric-item">
                                <label>Pending</label>
                                <span className="value">{Number(customer.pendingBalance || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                            <div className="metric-item">
                                <label>Freeplay</label>
                                <span className="value freeplay-val">
                                    {Number(formData.freeplayBalance || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </span>
                            </div>
                            <div className="metric-item glass">
                                <label>Available</label>
                                <span className="value positive large">
                                    {Number(available).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </span>
                            </div>
                            <div className="metric-item glass">
                                <label>LIFETIME +/-</label>
                                <span className={`value ${Number(stats?.netProfit || 0) < 0 ? 'negative' : 'positive'} large`}>
                                    {formatCurrency(stats?.netProfit || 0)}
                                </span>
                            </div>
                        </div>

                        {customer.role === 'user' && (
                            <div className="referral-strip">
                                <div className="referral-block">
                                    <span className="ref-label">Referred By</span>
                                    <span className="ref-value">
                                        {referredBy?.username ? `${referredBy.username}${referredBy.fullName ? ` (${referredBy.fullName})` : ''}` : 'Direct / None'}
                                    </span>
                                </div>
                                <div className="referral-block">
                                    <span className="ref-label">Players Referred</span>
                                    <span className="ref-value">{Number(referralStats?.referredCount || 0)}</span>
                                </div>
                                <div className="referral-block">
                                    <span className="ref-label">Referral Bonus</span>
                                    <span className={`ref-value ${referralStats?.referralBonusGranted ? 'ok' : 'pending'}`}>
                                        {referralStats?.referralBonusGranted
                                            ? `${Number(referralStats?.referralBonusAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} granted`
                                            : 'Pending qualification'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'basics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('basics')}
                >
                    Basics
                </button>
                <button
                    className={`tab-btn ${activeTab === 'freeplay' ? 'active' : ''}`}
                    onClick={() => setActiveTab('freeplay')}
                >
                    Freeplay
                </button>
            </div>

            <div className="details-content">
                {activeTab === 'basics' ? (
                    <>
                        <div className="section-header">
                            <div className="section-title">
                                <div className="glow-icon"></div>
                                <h3>The Basics</h3>
                            </div>
                            <button type="submit" form="details-form" className="save-btn" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>

                        <form id="details-form" onSubmit={handleSave} className="basics-form">
                            {error && <div className="alert error">{error}</div>}
                            {success && <div className="alert success">{success}</div>}
                            {/* Basics form content continues... */}
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="text"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder={displayPassword || "Enter new password"}
                                />
                            </div>

                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={`${formData.firstName} ${formData.lastName}`.trim()}
                                    onChange={(e) => {
                                        const parts = e.target.value.split(' ');
                                        setFormData(prev => ({
                                            ...prev,
                                            firstName: parts[0] || '',
                                            lastName: parts.slice(1).join(' ') || ''
                                        }));
                                    }}
                                    placeholder="Full Name/Contact Name"
                                />
                            </div>

                            <div className="form-group">
                                <label>Agent Assignment</label>
                                {['admin', 'master_agent', 'super_agent'].includes(role) ? (
                                    <div className="select-wrapper">
                                        <select name="agentId" value={formData.agentId} onChange={handleChange}>
                                            <option value="">None</option>
                                            {agents.map(a => (
                                                <option key={a._id} value={a._id}>{a.username}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <input type="text" value={customer.agentUsername || 'None'} readOnly disabled />
                                )}
                            </div>

                            <div className="form-group">
                                <label>Account Status</label>
                                <div className="select-wrapper">
                                    <select name="status" value={formData.status} onChange={handleChange}>
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                            </div>

                            {customer.role === 'user' ? (
                                <>
                                    <div className="form-group">
                                        <label>Min bet:</label>
                                        <input
                                            type="text"
                                            name="minBet"
                                            value={formData.minBet}
                                            placeholder="25"
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '');
                                                if (!isNaN(val)) setFormData(prev => ({ ...prev, minBet: val }));
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Max bet:</label>
                                        <input
                                            type="text"
                                            name="maxBet"
                                            value={formData.maxBet}
                                            placeholder="200"
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '');
                                                if (!isNaN(val)) setFormData(prev => ({ ...prev, maxBet: val }));
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Credit limit:</label>
                                        <input
                                            type="text"
                                            name="creditLimit"
                                            value={formData.creditLimit}
                                            placeholder="1000"
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '');
                                                if (!isNaN(val)) setFormData(prev => ({ ...prev, creditLimit: val }));
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Settle Limit:</label>
                                        <input
                                            type="text"
                                            name="balanceOwed"
                                            value={formData.balanceOwed}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '');
                                                if (!isNaN(val)) setFormData(prev => ({ ...prev, balanceOwed: val }));
                                            }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label>Min bet:</label>
                                        <input
                                            type="text"
                                            name="defaultMinBet"
                                            value={formData.defaultMinBet}
                                            placeholder="25"
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '');
                                                if (!isNaN(val)) setFormData(prev => ({ ...prev, defaultMinBet: val }));
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Max bet:</label>
                                        <input
                                            type="text"
                                            name="defaultMaxBet"
                                            value={formData.defaultMaxBet}
                                            placeholder="200"
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '');
                                                if (!isNaN(val)) setFormData(prev => ({ ...prev, defaultMaxBet: val }));
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Credit limit:</label>
                                        <input
                                            type="text"
                                            name="defaultCreditLimit"
                                            value={formData.defaultCreditLimit}
                                            placeholder="1000"
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '');
                                                if (!isNaN(val)) setFormData(prev => ({ ...prev, defaultCreditLimit: val }));
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Settle limit:</label>
                                        <input
                                            type="text"
                                            name="defaultSettleLimit"
                                            value={formData.defaultSettleLimit}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '');
                                                if (!isNaN(val)) setFormData(prev => ({ ...prev, defaultSettleLimit: val }));
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </form>
                    </>
                ) : (
                    <div className="freeplay-management">
                        <div className="section-header">
                            <div className="section-title">
                                <div className="glow-icon" style={{ background: '#3b82f6', boxShadow: '0 0 15px #3b82f6' }}></div>
                                <h3>Freeplay Management</h3>
                            </div>
                        </div>

                        <div className="freeplay-card glass-effect">
                            <div className="card-top">
                                <div className="balance-info">
                                    <span className="label">Current Freeplay Balance</span>
                                    <span className="value">{Number(formData.freeplayBalance || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                </div>
                            </div>

                            <div className="adjustment-controls">
                                <div className="input-group">
                                    <label>Adjustment Amount</label>
                                    <div className="amount-input">
                                        <span className="currency-symbol">$</span>
                                        <input
                                            type="number"
                                            value={freeplayAmount}
                                            onChange={(e) => setFreeplayAmount(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="action-btns">
                                    <button
                                        className="adjust-btn add"
                                        onClick={() => handleAdjustFreeplay('add')}
                                        disabled={adjustingFreeplay || !freeplayAmount}
                                    >
                                        Add Freeplay
                                    </button>
                                    <button
                                        className="adjust-btn remove"
                                        onClick={() => handleAdjustFreeplay('remove')}
                                        disabled={adjustingFreeplay || !freeplayAmount}
                                    >
                                        Remove Freeplay
                                    </button>
                                </div>
                            </div>

                            {error && <div className="alert error" style={{ marginTop: '20px' }}>{error}</div>}
                            {success && <div className="alert success" style={{ marginTop: '20px' }}>{success}</div>}
                        </div>

                        <div className="info-notice">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                            <p>Adjustments to freeplay balance are logged as transactions for auditing purposes.</p>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                 .customer-details-view.premium-theme { 
                     background: #f8fafc; 
                     min-height: 100vh; 
                     font-family: 'Inter', system-ui, -apple-system, sans-serif;
                     color: #1e293b;
                 }
                 .details-header { 
                     background: #ffffff; 
                     backdrop-filter: blur(12px);
                     padding: 32px; 
                     border-bottom: 1px solid #e2e8f0; 
                     position: sticky;
                     top: 0;
                     z-index: 10;
                     box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                 }
                 .header-top { display: flex; gap: 48px; align-items: start; }
                 .back-btn { 
                     background: #f1f5f9; 
                     border: 1px solid #e2e8f0; 
                     padding: 10px;
                     border-radius: 12px;
                     cursor: pointer; 
                     color: #64748b; 
                     transition: all 0.2s ease;
                 }
                 .back-btn:hover { background: #e2e8f0; color: #1e293b; transform: translateX(-4px); }
                 
                 .left-info { flex: 1; display: flex; flex-direction: column; gap: 24px; }
                 .user-title { display: flex; align-items: center; gap: 20px; }
                 .user-title h2 { margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; }
                 
                 .login-btn-prof {
                     background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                     color: white; 
                     border: none; 
                     padding: 8px 24px;
                     border-radius: 100px; 
                     font-size: 14px; 
                     font-weight: 700; 
                     cursor: pointer;
                     box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
                     transition: all 0.2s ease;
                 }
                 .login-btn-prof:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); }
  
                 .cred-block { display: flex; flex-direction: column; gap: 10px; }
                 .cred-item { display: flex; align-items: center; gap: 12px; font-size: 14px; }
                 .cred-item label { color: #64748b; width: 80px; font-weight: 600; }
                 .cred-item .val { 
                     color: #334155; 
                     font-family: 'JetBrains Mono', monospace; 
                     background: #f1f5f9; 
                     padding: 4px 12px; 
                     border-radius: 8px;
                     border: 1px solid #e2e8f0;
                     font-weight: 600;
                 }
                 .copy-icon { 
                     background: none; 
                     border: none; 
                     cursor: pointer; 
                     color: #3b82f6; 
                     opacity: 0.6;
                     transition: opacity 0.2s;
                 }
                 .copy-icon:hover { opacity: 1; }
  
                 .betting-limits-block {
                     display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
                     background: #ffffff; 
                     padding: 24px; 
                     border-radius: 20px; 
                     border: 1px solid #e2e8f0;
                     max-width: 440px;
                     box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                 }
                 .limit-row { display: flex; flex-direction: column; gap: 4px; }
                 .limit-row .label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 800; letter-spacing: 0.5px; }
                 .limit-row .value { font-size: 20px; font-weight: 700; color: #1e293b; }
                 .limit-row.highlight .value { color: #059669; }
  
                 .metrics-stacked {
                     display: flex; flex-direction: column; gap: 20px; text-align: right;
                     min-width: 200px; border-left: 1px solid #e2e8f0; padding-left: 40px;
                 }
                 .metric-item { display: flex; flex-direction: column; gap: 6px; }
                 .metric-item label { font-size: 12px; text-transform: uppercase; color: #94a3b8; font-weight: 800; }
                 .metric-item .value { font-size: 24px; font-weight: 800; color: #0f172a; }
                 .metric-item .value.negative { color: #dc2626; }
                 .metric-item .value.positive { color: #059669; }
                 .metric-item.glass {
                     background: #f0fdf4;
                     padding: 12px;
                     border-radius: 16px;
                     border: 1px solid #bcf1d3;
                 }
                 .metric-item .value.large { font-size: 32px; background: linear-gradient(to bottom, #0f172a, #334155); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  
                 .tab-navigation {
                     display: flex;
                     gap: 4px;
                     padding: 0 40px;
                     margin-top: -1px;
                     background: #ffffff;
                     border-bottom: 1px solid #e2e8f0;
                     box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                 }
                 .tab-btn {
                     padding: 16px 32px;
                     background: none;
                     border: none;
                     border-bottom: 2px solid transparent;
                     color: #94a3b8;
                     font-weight: 700;
                     font-size: 14px;
                     cursor: pointer;
                     transition: all 0.2s;
                 }
                 .tab-btn:hover { color: #1e293b; }
                 .tab-btn.active {
                     color: #2563eb;
                     border-bottom-color: #2563eb;
                 }
  
                 .details-content { padding: 40px; max-width: 1000px; margin: 0 auto; }
                 .section-header {
                     display: flex; justify-content: space-between; align-items: center;
                     margin-bottom: 40px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;
                 }
                 .section-title { display: flex; align-items: center; gap: 16px; }
                 .glow-icon { width: 12px; height: 12px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
                 .section-header h3 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
  
                 .save-btn {
                     background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); 
                     color: #ffffff; border: none; padding: 12px 40px;
                     border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer;
                     transition: all 0.2s;
                     box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
                 }
                 .save-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4); }
                 .save-btn:disabled { background: #94a3b8; color: #ffffff; cursor: not-allowed; box-shadow: none; }
  
                 .basics-form { 
                     display: grid; grid-template-columns: 1fr 1fr; gap: 40px; 
                     background: #ffffff; 
                     padding: 40px; 
                     border-radius: 24px; 
                     border: 1px solid #e2e8f0;
                     box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                 }
                 .form-group { display: flex; flex-direction: column; gap: 10px; }
                 .form-group label { font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                 .form-group input, .form-group select { 
                     border: 1px solid #e2e8f0; 
                     padding: 14px 16px; 
                     font-size: 16px; 
                     outline: none; 
                     background: #f8fafc; 
                     border-radius: 12px;
                     color: #1e293b;
                     transition: all 0.2s;
                 }
                 .form-group input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
                 
                 .freeplay-card {
                     background: #ffffff;
                     padding: 40px;
                     border-radius: 24px;
                     border: 1px solid #e2e8f0;
                     box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                 }

                 .referral-strip {
                    margin-top: 14px;
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 10px;
                 }
                 .referral-block {
                    border: 1px solid #d9e6f7;
                    border-radius: 10px;
                    background: #f7fbff;
                    padding: 10px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                 }
                 .ref-label {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #6b7f9e;
                 }
                 .ref-value {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1f3f73;
                 }
                 .ref-value.ok { color: #0b7f4f; }
                 .ref-value.pending { color: #9a6b00; }

                 @media (max-width: 900px) {
                    .referral-strip { grid-template-columns: 1fr; }
                 }
                 .card-top { margin-bottom: 40px; border-bottom: 1px solid #f1f5f9; padding-bottom: 32px; }
                 .balance-info { display: flex; flex-direction: column; gap: 8px; }
                 .balance-info .label { font-size: 14px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: 1px; }
                 .balance-info .value { font-size: 48px; font-weight: 900; color: #2563eb; }
  
                 .adjustment-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: end; }
                 .amount-input { position: relative; }
                 .currency-symbol { position: absolute; left: 16px; top: 14px; color: #64748b; font-weight: 700; }
                 .amount-input input { padding-left: 32px; width: 100%; box-sizing: border-box; }
  
                 .action-btns { display: flex; gap: 16px; }
                 .adjust-btn {
                     flex: 1; padding: 14px; border: none; border-radius: 12px; 
                     font-weight: 800; font-size: 14px; cursor: pointer; transition: all 0.2s;
                 }
                 .adjust-btn.add { 
                     background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                     color: white; 
                     box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
                 }
                 .adjust-btn.remove { 
                     background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                     color: white; 
                     box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
                 }
                 .adjust-btn:hover { transform: translateY(-2px); opacity: 0.95; box-shadow: 0 6px 15px rgba(0,0,0,0.1); }
                 .adjust-btn:disabled { background: #cbd5e1; color: #64748b; cursor: not-allowed; transform: none; box-shadow: none; }
  
                 .info-notice {
                     display: flex; gap: 12px; align-items: center; margin-top: 32px;
                     background: #f0f7ff; padding: 16px 24px; 
                     border-radius: 16px; border: 1px solid #d0e7ff;
                     color: #64748b; font-size: 14px;
                 }
                 .info-notice p { margin: 0; }
  
                 .alert { grid-column: span 2; padding: 16px; border-radius: 12px; font-size: 14px; font-weight: 500; }
                 .alert.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
                 .alert.success { background: #f0fdf4; color: #15803d; border: 1px solid #bcf1d3; }

                 .customer-details-view.premium-theme .details-header {
                     position: relative;
                     top: 0;
                     border-radius: 14px;
                     margin: 14px;
                     padding: 24px;
                     border: 1px solid #e4edf8;
                     box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
                 }
                 .customer-details-view.premium-theme {
                     font-weight: 400;
                     color: #1e293b;
                 }
                 .customer-details-view.premium-theme .header-top {
                     display: grid;
                     grid-template-columns: 1.45fr 1fr;
                     gap: 22px;
                     align-items: start;
                 }
                 .customer-details-view.premium-theme .back-btn {
                     display: inline-flex;
                     align-items: center;
                     justify-content: center;
                     width: 42px;
                     height: 42px;
                 }
                 .customer-details-view.premium-theme .left-info {
                     background: #fff;
                     border: 1px solid #e4edf8;
                     border-radius: 12px;
                     padding: 16px;
                 }
                 .customer-details-view.premium-theme .title-wrap {
                     display: flex;
                     align-items: center;
                     gap: 12px;
                 }
                 .customer-details-view.premium-theme .user-title {
                     justify-content: space-between;
                     align-items: center;
                     gap: 16px;
                     flex-wrap: wrap;
                 }
                 .customer-details-view.premium-theme .user-title h2 {
                     font-size: 38px;
                     letter-spacing: -1px;
                     font-weight: 600;
                 }
                 .customer-details-view.premium-theme .role-chip {
                     font-size: 11px;
                     font-weight: 600;
                     text-transform: uppercase;
                     border-radius: 999px;
                     padding: 5px 10px;
                 }
                 .customer-details-view.premium-theme .role-chip.role-user {
                     color: #0b5fc2;
                     background: #eaf4ff;
                     border: 1px solid #b8d9fb;
                 }
                 .customer-details-view.premium-theme .role-chip.role-agent {
                     color: #0f766e;
                     background: #e7fffb;
                     border: 1px solid #9ce6dc;
                 }
                 .customer-details-view.premium-theme .role-chip.role-master_agent,
                 .customer-details-view.premium-theme .role-chip.role-super_agent {
                     color: #9a6200;
                     background: #fff8e9;
                     border: 1px solid #f3d08b;
                 }
                 .customer-details-view.premium-theme .profile-actions {
                     display: flex;
                     align-items: center;
                     gap: 10px;
                 }
                 .customer-details-view.premium-theme .login-btn-prof {
                     height: 40px;
                     padding: 0 16px;
                     border-radius: 10px;
                 }
                 .customer-details-view.premium-theme .login-btn-prof.secondary {
                     background: linear-gradient(135deg, #0891b2 0%, #0ea5e9 100%);
                     box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);
                 }
                 .customer-details-view.premium-theme .cred-block {
                     background: #f8fbff;
                     border: 1px solid #e4edf8;
                     border-radius: 10px;
                     padding: 12px;
                 }
                 .customer-details-view.premium-theme .betting-limits-block {
                     max-width: none;
                     border-radius: 12px;
                     border: 1px solid #e4edf8;
                     box-shadow: none;
                     padding: 16px;
                 }
                 .customer-details-view.premium-theme .right-summary {
                     display: flex;
                     flex-direction: column;
                     gap: 12px;
                 }
                 .customer-details-view.premium-theme .metrics-stacked {
                     border-left: none;
                     padding-left: 0;
                     min-width: 0;
                     display: grid;
                     grid-template-columns: repeat(2, minmax(0, 1fr));
                     gap: 12px;
                     text-align: left;
                 }
                 .customer-details-view.premium-theme .metric-item {
                     border: 1px solid #e4edf8;
                     border-radius: 12px;
                     padding: 10px 12px;
                     background: #fff;
                 }
                 .customer-details-view.premium-theme .metric-item .value {
                     font-size: 28px;
                     line-height: 1.1;
                     font-weight: 600;
                 }
                 .customer-details-view.premium-theme .metric-item .value.large {
                     font-size: 34px;
                 }
                 .customer-details-view.premium-theme .metric-item .value.freeplay-val {
                     color: #1f6fda;
                 }
                 .customer-details-view.premium-theme .tab-navigation {
                     margin: 0 14px;
                     padding: 6px;
                     border: 1px solid #e4edf8;
                     border-top: none;
                     border-radius: 0 0 12px 12px;
                     gap: 6px;
                     box-shadow: none;
                 }
                 .customer-details-view.premium-theme .tab-btn {
                     border-radius: 8px;
                     border: 1px solid transparent;
                     padding: 10px 16px;
                 }
                 .customer-details-view.premium-theme .tab-btn.active {
                     background: #edf5ff;
                     border-color: #c6ddff;
                     border-bottom-color: #c6ddff;
                     color: #1257b5;
                 }
                 .customer-details-view.premium-theme .details-content {
                     max-width: 1320px;
                     padding: 22px 18px 32px;
                 }
                 .customer-details-view.premium-theme .section-header {
                     background: #fff;
                     border: 1px solid #e4edf8;
                     border-radius: 12px;
                     padding: 14px 16px;
                     margin-bottom: 16px;
                 }
                 .customer-details-view.premium-theme .section-header h3 {
                     font-size: 28px;
                     letter-spacing: -0.6px;
                     font-weight: 600;
                 }
                 .customer-details-view.premium-theme .save-btn {
                     height: 42px;
                     padding: 0 20px;
                     border-radius: 10px;
                 }
                 .customer-details-view.premium-theme .basics-form {
                     border-radius: 12px;
                     border: 1px solid #e4edf8;
                     padding: 20px;
                     gap: 16px;
                 }
                 .customer-details-view.premium-theme .form-group label {
                     font-weight: 600;
                     letter-spacing: 0.2px;
                 }
                 .customer-details-view.premium-theme .form-group input,
                 .customer-details-view.premium-theme .form-group select {
                     font-weight: 400;
                 }
                 .customer-details-view.premium-theme .referral-strip {
                     margin-top: 0;
                     gap: 10px;
                 }

                 @media (max-width: 1200px) {
                     .customer-details-view.premium-theme .header-top {
                         grid-template-columns: 1fr;
                     }
                 }
                 @media (max-width: 760px) {
                     .customer-details-view.premium-theme .details-header {
                         margin: 8px;
                         padding: 12px;
                     }
                     .customer-details-view.premium-theme .user-title h2 {
                         font-size: 30px;
                     }
                     .customer-details-view.premium-theme .profile-actions {
                         width: 100%;
                     }
                     .customer-details-view.premium-theme .profile-actions .login-btn-prof {
                         flex: 1;
                     }
                     .customer-details-view.premium-theme .metrics-stacked {
                         grid-template-columns: 1fr;
                     }
                     .customer-details-view.premium-theme .referral-strip {
                         grid-template-columns: 1fr;
                     }
                     .customer-details-view.premium-theme .details-content {
                         padding: 12px 10px 24px;
                     }
                     .customer-details-view.premium-theme .basics-form {
                         grid-template-columns: 1fr;
                     }
                 }
             `}</style>
        </div >
    );
}

export default CustomerDetailsView;
