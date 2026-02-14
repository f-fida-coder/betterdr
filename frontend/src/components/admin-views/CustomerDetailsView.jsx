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
    const [formData, setFormData] = useState({
        password: '',
        firstName: '',
        lastName: '',
        agentId: '',
        status: 'active',
        creditLimit: 1000,
        balanceOwed: 0,
        minBet: 1,
        maxBet: 5000
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
                    role === 'admin' ? getAgents(token) : Promise.resolve([])
                ]);

                if (statsData && statsData.user) {
                    setCustomer(statsData.user);
                    setStats(statsData.stats || {});
                    setFormData({
                        password: '',
                        firstName: statsData.user.firstName || '',
                        lastName: statsData.user.lastName || '',
                        agentId: statsData.user.agentId || '',
                        status: statsData.user.status || 'active',
                        creditLimit: statsData.user.creditLimit || 1000,
                        balanceOwed: statsData.user.balanceOwed || 0,
                        minBet: statsData.user.minBet || 1,
                        maxBet: statsData.user.maxBet || 5000
                    });
                }
                setAgents(agentsData || []);
                setError('');
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError('Failed to load customer details.');
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

            setSuccess('Customer updated successfully!');
            setFormData(prev => ({ ...prev, password: '' }));
        } catch (err) {
            console.error('Failed to update customer:', err);
            setError(err.message || 'Failed to update customer');
        } finally {
            setSaving(false);
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
                                <h2>{customer.username}</h2>
                                <button className="login-btn-prof" onClick={handleImpersonate}>
                                    Login User
                                </button>
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
                                    <span className="val">{customer.rawPassword || '********'}</span>
                                    <button className="copy-icon" onClick={() => copyToClipboard(customer.rawPassword, 'Password')}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="betting-limits-block">
                            <div className="limit-row">
                                <span className="label">Min bet:</span>
                                <span className="value">{Number(customer.minBet || 1).toLocaleString()}</span>
                            </div>
                            <div className="limit-row">
                                <span className="label">Max bet:</span>
                                <span className="value">{Number(customer.maxBet || 5000).toLocaleString()}</span>
                            </div>
                            <div className="limit-row highlight">
                                <span className="label">Credit limit:</span>
                                <span className="value">{Number(customer.creditLimit || 1000).toLocaleString()}</span>
                            </div>
                            <div className="limit-row highlight">
                                <span className="label">Settle Limit:</span>
                                <span className="value">{Number(customer.balanceOwed || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="metrics-stacked">
                        <div className="metric-item">
                            <label>Balance</label>
                            <span className={`value ${Number(customer.balance) < 0 ? 'negative' : 'positive'}`}>
                                {formatCurrency(customer.balance)}
                            </span>
                        </div>
                        <div className="metric-item">
                            <label>Pending</label>
                            <span className="value">$0.00</span>
                        </div>
                        <div className="metric-item glass">
                            <label>Available</label>
                            <span className="value positive large">
                                {Number(available).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="details-content">
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

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="text"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={customer.rawPassword || "Enter new password"}
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
                            placeholder="Customer Name"
                        />
                    </div>

                    <div className="form-group">
                        <label>Agent Assignment</label>
                        {role === 'admin' ? (
                            <div className="select-wrapper">
                                <select name="agentId" value={formData.agentId} onChange={handleChange}>
                                    <option value="">None</option>
                                    {agents.map(a => (
                                        <option key={a._id} value={a._id}>{a.username}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <input type="text" value={customer.agentId?.username || 'None'} readOnly disabled />
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

                    <div className="form-group">
                        <label>Min bet:</label>
                        <input
                            type="text"
                            name="minBet"
                            value={formData.minBet}
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
                </form>
            </div>

            <style>{`
                .customer-details-view.premium-theme { 
                    background: #0f172a; 
                    min-height: 100vh; 
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    color: #f8fafc;
                }
                .details-header { 
                    background: rgba(30, 41, 59, 0.7); 
                    backdrop-filter: blur(12px);
                    padding: 32px; 
                    border-bottom: 1px solid rgba(255,255,255,0.1); 
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .header-top { display: flex; gap: 48px; align-items: start; }
                .back-btn { 
                    background: rgba(255,255,255,0.05); 
                    border: 1px solid rgba(255,255,255,0.1); 
                    padding: 10px;
                    border-radius: 12px;
                    cursor: pointer; 
                    color: #94a3b8; 
                    transition: all 0.2s ease;
                }
                .back-btn:hover { background: rgba(30, 41, 59, 0.8); color: #fff; transform: translateX(-4px); }
                
                .left-info { flex: 1; display: flex; flex-direction: column; gap: 24px; }
                .user-title { display: flex; align-items: center; gap: 20px; }
                .user-title h2 { margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; color: #fff; }
                
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
                    color: #cbd5e1; 
                    font-family: 'JetBrains Mono', monospace; 
                    background: rgba(255,255,255,0.05); 
                    padding: 4px 12px; 
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.05);
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
                    background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); 
                    padding: 24px; 
                    border-radius: 20px; 
                    border: 1px solid rgba(255,255,255,0.1);
                    max-width: 440px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                }
                .limit-row { display: flex; flex-direction: column; gap: 4px; }
                .limit-row .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: 0.5px; }
                .limit-row .value { font-size: 20px; font-weight: 700; color: #f8fafc; }
                .limit-row.highlight .value { color: #10b981; }

                .metrics-stacked {
                    display: flex; flex-direction: column; gap: 20px; text-align: right;
                    min-width: 200px; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 40px;
                }
                .metric-item { display: flex; flex-direction: column; gap: 6px; }
                .metric-item label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 800; }
                .metric-item .value { font-size: 24px; font-weight: 800; color: #fff; }
                .metric-item .value.negative { color: #ef4444; }
                .metric-item .value.positive { color: #10b981; }
                .metric-item.glass {
                    background: rgba(16, 185, 129, 0.1);
                    padding: 12px;
                    border-radius: 16px;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                .metric-item .value.large { font-size: 32px; background: linear-gradient(to bottom, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

                .details-content { padding: 40px; max-width: 1000px; margin: 0 auto; }
                .section-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px;
                }
                .section-title { display: flex; align-items: center; gap: 16px; }
                .glow-icon { width: 12px; height: 12px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 15px #3b82f6; }
                .section-header h3 { margin: 0; font-size: 24px; font-weight: 800; color: #fff; }

                .save-btn {
                    background: #fff; color: #0f172a; border: none; padding: 12px 40px;
                    border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer;
                    transition: all 0.2s;
                }
                .save-btn:hover { background: #e2e8f0; transform: scale(1.05); }
                .save-btn:disabled { background: #334155; color: #64748b; cursor: not-allowed; }

                .basics-form { 
                    display: grid; grid-template-columns: 1fr 1fr; gap: 40px; 
                    background: rgba(30, 41, 59, 0.4); 
                    padding: 40px; 
                    border-radius: 24px; 
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .form-group { display: flex; flex-direction: column; gap: 10px; }
                .form-group label { font-size: 12px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                .form-group input, .form-group select { 
                    border: 1px solid rgba(255,255,255,0.1); 
                    padding: 14px 16px; 
                    font-size: 16px; 
                    outline: none; 
                    background: rgba(15, 23, 42, 0.6); 
                    border-radius: 12px;
                    color: #fff;
                    transition: border-color 0.2s;
                }
                .form-group input:focus { border-color: #3b82f6; }
                
                .alert { grid-column: span 2; padding: 16px; border-radius: 12px; font-size: 14px; font-weight: 500; }
                .alert.error { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
                .alert.success { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
            `}</style>
        </div>
    );
}

export default CustomerDetailsView;
