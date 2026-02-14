import React, { useState, useEffect } from 'react';
import { getUserStatistics } from '../../api';

function UserStatisticsView({ userId, onBack }) {
    const [userStats, setUserStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Please login to view statistics.');
                    return;
                }
                const data = await getUserStatistics(userId, token);
                console.log('User stats data:', data); // Temporary debug
                setUserStats(data);
                setError('');
            } catch (err) {
                console.error('Failed to fetch stats:', err);
                setError('Failed to load user statistics.');
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchStats();
        } else {
            setLoading(false);
            setError('No user selected');
        }
    }, [userId]);

    // Safe Date Helper
    const safeDate = (dateString) => {
        if (!dateString) return '—';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const safeDateTime = (dateString) => {
        if (!dateString) return 'Never';
        try {
            return new Date(dateString).toLocaleString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    if (loading) return <div className="admin-view"><div className="view-content">Loading statistics...</div></div>;

    if (error) {
        return (
            <div className="admin-view">
                <div className="view-content error">
                    <p>{error}</p>
                    <button className="btn-secondary" onClick={onBack}>Back</button>
                </div>
            </div>
        );
    }

    // Strict validation
    if (!userStats || !userStats.user) {
        return (
            <div className="admin-view">
                <div className="view-content">
                    <p>No stats available</p>
                    <button className="btn-secondary" onClick={onBack}>Back</button>
                </div>
            </div>
        );
    }

    // Creating safe derived values
    const user = userStats.user || {};
    const stats = userStats.stats || {};
    const creator = userStats.creator;
    const agent = userStats.agent;

    return (
        <div className="admin-view">
            <div className="view-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="btn-secondary" onClick={onBack}>&larr; Back</button>
                    <h2>User Statistics: {user.username || 'Unknown'}</h2>
                </div>
            </div>

            <div className="view-content">
                <div className="stats-grid">
                    <div className="stat-section">
                        <h4>Profile</h4>
                        <div className="detail-row"><label>Username:</label> <span>{user.username || '—'}</span></div>
                        <div className="detail-row"><label>Name:</label> <span>{user.firstName || ''} {user.lastName || ''}</span></div>
                        <div className="detail-row"><label>Phone:</label> <span>{user.phoneNumber || '—'}</span></div>
                        <div className="detail-row"><label>Status:</label> <span className={`badge ${user.status || ''}`}>{user.status || '—'}</span></div>
                        <div className="detail-row"><label>Created At:</label> <span>{safeDate(user.createdAt)}</span></div>
                        <div className="detail-row"><label>Created By:</label> <span>{creator ? `${creator.username} (${creator.role})` : 'System'}</span></div>
                        {agent && <div className="detail-row"><label>Agent:</label> <span>{agent.username}</span></div>}
                    </div>

                    <div className="stat-section">
                        <h4>Financials</h4>
                        <div className="detail-row"><label>Balance:</label> <span>${Number(user.balance || 0).toFixed(2)}</span></div>
                        <div className="detail-row"><label>Credit Limit:</label> <span>${Number(user.creditLimit || 0).toFixed(2)}</span></div>
                        <div className="detail-row"><label>Owed:</label> <span>${Number(user.balanceOwed || 0).toFixed(2)}</span></div>
                        <div className="detail-row"><label>Net Earnings:</label> <span className={(stats.netProfit || 0) >= 0 ? 'text-success' : 'text-danger'}>${Number(stats.netProfit || 0).toFixed(2)}</span></div>
                    </div>

                    <div className="stat-section full-width">
                        <h4>Betting History</h4>
                        <div className="stats-cards">
                            <div className="stat-card">
                                <span className="stat-value">{stats.totalBets || 0}</span>
                                <span className="stat-label">Total Bets</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value">{stats.wins || 0} - {stats.losses || 0} - {stats.voids || 0}</span>
                                <span className="stat-label">W - L - V</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value">${Number(stats.totalWagered || 0).toFixed(2)}</span>
                                <span className="stat-label">Total Wagered</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value text-success">${Number(stats.totalWon || 0).toFixed(2)}</span>
                                <span className="stat-label">Total Won</span>
                            </div>
                        </div>
                        <div className="detail-row" style={{ marginTop: '10px' }}><label>Last Bet:</label> <span>{safeDateTime(stats.lastBetDate)}</span></div>
                    </div>
                </div>

                <style>{`
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 1000px; margin: 0 auto; }
        .stat-section { background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border: 1px solid #e0e0e0; }
        .stat-section.full-width { grid-column: span 2; }
        .stat-section h4 { border-bottom: 2px solid #f0f0f0; padding-bottom: 12px; margin-bottom: 20px; color: #0d3b5c; font-size: 1.1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 1rem; border-bottom: 1px solid #f5f5f5; }
        .detail-row:last-child { border-bottom: none; }
        .detail-row label { color: #666; font-weight: 500; }
        .detail-row span { color: #333; font-weight: 600; }
        .text-success { color: #28a745 !important; }
        .text-danger { color: #dc3545 !important; }
        .stats-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 15px; }
        .stat-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #0d3b5c;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .stat-value { display: block; font-size: 1.8rem; font-weight: 700; margin-bottom: 8px; color: #0d3b5c; }
        .stat-label { font-size: 0.85rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        
        /* Badge Styles Override for this view */
        .badge { padding: 5px 10px; border-radius: 4px; font-size: 0.85rem; }
        .badge.active { background-color: #d4edda; color: #155724; }
        .badge.suspended { background-color: #f8d7da; color: #721c24; }
        `}</style>
            </div>
        </div>
    );
}

export default UserStatisticsView;
