import React, { useState, useEffect } from 'react';
import { getSystemStats, refreshOdds } from '../../api';

const SystemMonitorView = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please login to view system monitor');
            }
            const data = await getSystemStats(token);
            setStats(data);
            setLastUpdated(new Date());
            setLoading(false);
        } catch (error) {
            console.error('Monitor Error:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(() => {
            if (document.hidden) return;
            fetchStats();
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !stats) return <div className="admin-content-card">Loading System Monitor...</div>;

    const counts = stats?.counts || { users: 0, bets: 0, matches: 0 };
    const liveMatches = stats?.liveMatches || [];

    const handleRefreshOdds = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please login first');
            }
            const data = await refreshOdds(token);
            alert(`Odds Refreshed! Created: ${data.results?.created || 0}, Updated: ${data.results?.updated || 0}`);
            fetchStats(); // Refresh stats too
        } catch (error) {
            console.error('Refresh error:', error);
            alert(error.message || 'Error refreshing odds');
        }
    };

    return (
        <div className="admin-view-container">
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: '#fff', margin: 0 }}>System Monitor</h2>
                <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
                    Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                </div>
                <button
                    onClick={handleRefreshOdds}
                    style={{
                        background: '#e67e22',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    🔄 Refresh Live Odds
                </button>
            </div>

            {/* Quick Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon users"><i className="fa-solid fa-users"></i></div>
                    <div className="stat-info">
                        <h3>Total Users</h3>
                        <p>{counts.users}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bets"><i className="fa-solid fa-ticket"></i></div>
                    <div className="stat-info">
                        <h3>Total Bets</h3>
                        <p>{counts.bets}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon matches"><i className="fa-solid fa-futbol"></i></div>
                    <div className="stat-info">
                        <h3>Active Matches</h3>
                        <p>{counts.matches}</p>
                    </div>
                </div>
            </div>

            {/* Live Data Inspector */}
            <div className="admin-content-card">
                <div className="card-header">
                    <h3><i className="fa-solid fa-satellite-dish"></i> Live & Scored Matches (DB View)</h3>
                </div>
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Sport</th>
                                <th>Match</th>
                                <th>Scores</th>
                                <th>Status</th>
                                <th>Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {liveMatches.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center">No live or scored matches found.</td>
                                </tr>
                            ) : (
                                liveMatches.map(m => (
                                    <tr key={m.id || m._id}>
                                        <td>{m.sport?.replace('_', ' ').toUpperCase()}</td>
                                        <td>{m.homeTeam} <span className="vs">vs</span> {m.awayTeam}</td>
                                        <td className="score-cell">
                                            <span className="score-badge home">{(m.score?.score_home ?? m.score?.scoreHome ?? 0)}</span>
                                            -
                                            <span className="score-badge away">{(m.score?.score_away ?? m.score?.scoreAway ?? 0)}</span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${m.status}`}>{m.status}</span>
                                        </td>
                                        <td>{new Date(m.lastUpdated).toLocaleTimeString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .view-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .last-updated {
                    font-size: 0.9rem;
                    color: #888;
                    font-family: monospace;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                .stat-card {
                    background: #1e1e1e;
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    border: 1px solid #333;
                }
                .stat-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                }
                .stat-icon.users { background: rgba(52, 152, 219, 0.2); color: #3498db; }
                .stat-icon.bets { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
                .stat-icon.matches { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
                .stat-info h3 { margin: 0; font-size: 0.9rem; color: #888; }
                .stat-info p { margin: 0; font-size: 1.8rem; font-weight: bold; color: #fff; }
                
                .admin-table th {
                    background-color: #333;
                    color: white;
                    padding: 12px;
                    text-align: left;
                }
                .admin-table td {
                    padding: 12px;
                    border-bottom: 1px solid #eee;
                    color: #333; /* Dark text for readability */
                    background-color: #fff; /* Ensure white background */
                }
                .admin-table tr:hover td {
                    background-color: #f5f5f5;
                }
                .score-cell { font-weight: bold; color: #000; }
                .score-badge { 
                    display: inline-block; 
                    padding: 2px 6px; 
                    background: #eee; 
                    color: #333;
                    border: 1px solid #ccc;
                    border-radius: 4px; 
                    margin: 0 4px;
                }
                .vs { color: #555; font-size: 0.8rem; }
            `}</style>
        </div>
    );
};

export default SystemMonitorView;
