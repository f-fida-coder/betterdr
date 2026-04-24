import React, { useState, useEffect, useCallback } from 'react';
import { getSystemStats, refreshOdds, getAdminEntityCatalog, getCostMetrics, getSettings, updateSettings, openOddsCircuitBreaker, resetOddsCircuitBreaker, getAdminAuditLog } from '../../api';

const defaultCostThresholds = {
    alertCostDailySpikePercent: 35,
    alertCostAboveAvgMultiplier: 1.5,
    alertCostDailyMaxDollars: 10,
    alertMinRequestsForCostAlert: 150,
};

const toFiniteNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const SystemMonitorView = () => {
    const [stats, setStats] = useState(null);
    const [entityCatalog, setEntityCatalog] = useState(null);
    const [costMetrics, setCostMetrics] = useState(null);
    const [costThresholds, setCostThresholds] = useState(defaultCostThresholds);
    const [savingThresholds, setSavingThresholds] = useState(false);
    const [thresholdMessage, setThresholdMessage] = useState('');
    const [breakerBusy, setBreakerBusy] = useState(false);
    const [breakerMessage, setBreakerMessage] = useState('');
    const [auditLog, setAuditLog] = useState([]);
    const [auditPage, setAuditPage] = useState(1);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditHasMore, setAuditHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please login to view system monitor');
            }
            const [statsData, catalogData, costData, settingsData] = await Promise.all([
                getSystemStats(token),
                getAdminEntityCatalog(token),
                getCostMetrics({ days: 7 }),
                getSettings(token),
            ]);
            setStats(statsData);
            setEntityCatalog(catalogData);
            setCostMetrics(costData?.costs || null);
            setCostThresholds({
                alertCostDailySpikePercent: Number(settingsData?.alertCostDailySpikePercent ?? defaultCostThresholds.alertCostDailySpikePercent),
                alertCostAboveAvgMultiplier: Number(settingsData?.alertCostAboveAvgMultiplier ?? defaultCostThresholds.alertCostAboveAvgMultiplier),
                alertCostDailyMaxDollars: Number(settingsData?.alertCostDailyMaxDollars ?? defaultCostThresholds.alertCostDailyMaxDollars),
                alertMinRequestsForCostAlert: Number(settingsData?.alertMinRequestsForCostAlert ?? defaultCostThresholds.alertMinRequestsForCostAlert),
            });
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

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchStats();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    if (loading && !stats) return <div className="admin-content-card">Loading System Monitor...</div>;

    const fetchAuditLogPage = async (page) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            setAuditLoading(true);
            const data = await getAdminAuditLog({ token, page, limit: 50 });
            if (page === 1) {
                setAuditLog(data.items || []);
            } else {
                setAuditLog(prev => [...prev, ...(data.items || [])]);
            }
            setAuditHasMore((data.items || []).length === 50);
            setAuditPage(page);
        } catch {
            // non-critical, fail silently
        } finally {
            setAuditLoading(false);
        }
    };

    const ACTION_LABELS = {
        impersonate_user: 'Impersonate User',
        reset_user_password: 'Reset Password',
        odds_circuit_breaker_open: 'Breaker Opened',
        odds_circuit_breaker_reset: 'Breaker Reset',
    };

    const counts = stats?.counts || { users: 0, bets: 0, matches: 0 };
    const liveMatches = stats?.liveMatches || [];
    const catalogItems = entityCatalog?.items || [];
    const catalogSummary = entityCatalog?.summary || { links: 0, collections: 0, rows: 0 };
    const sportsbookHealth = stats?.sportsbookHealth || {};
    const oddsHealth = sportsbookHealth?.oddsSync || {};
    const settlementHealth = sportsbookHealth?.settlement || {};
    const circuitState = String(oddsHealth?.circuitBreaker?.state || 'unknown');
    const topCostEndpoints = costMetrics?.topEndpoints || [];
    const costRecommendations = costMetrics?.recommendations || [];
    const costHistory = costMetrics?.history || [];
    const costAlerts = costMetrics?.alerts || [];
    const maxHistoryCost = costHistory.reduce((max, row) => {
        const value = Number(row?.costDollars || 0);
        return value > max ? value : max;
    }, 0);

    const handleRefreshOdds = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please login first');
            }
            const data = await refreshOdds(token);
            alert(
                `Odds Refreshed! Created: ${data.results?.created || 0}, Updated: ${data.results?.updated || 0}, ` +
                `Score-only updates: ${data.results?.scoreOnlyUpdates || 0}, Settled: ${data.results?.settled || 0}`
            );
            fetchStats(); // Refresh stats too
        } catch (error) {
            console.error('Refresh error:', error);
            alert(error.message || 'Error refreshing odds');
        }
    };

    const handleOpenBreaker = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please login first');
            }
            const confirmed = window.confirm('Open odds circuit breaker now? Upstream sync will be skipped during cooldown.');
            if (!confirmed) return;
            setBreakerBusy(true);
            setBreakerMessage('');
            await openOddsCircuitBreaker({ token, cooldownSeconds: 180, reason: 'manual_admin_open_from_system_monitor' });
            setBreakerMessage('Circuit breaker opened for cooldown window.');
            await fetchStats();
        } catch (error) {
            setBreakerMessage(error.message || 'Failed to open circuit breaker');
        } finally {
            setBreakerBusy(false);
        }
    };

    const handleResetBreaker = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please login first');
            }
            const confirmed = window.confirm('Reset odds circuit breaker now? This allows upstream sync attempts immediately.');
            if (!confirmed) return;
            setBreakerBusy(true);
            setBreakerMessage('');
            await resetOddsCircuitBreaker({ token, reason: 'manual_admin_reset_from_system_monitor' });
            setBreakerMessage('Circuit breaker reset.');
            await fetchStats();
        } catch (error) {
            setBreakerMessage(error.message || 'Failed to reset circuit breaker');
        } finally {
            setBreakerBusy(false);
        }
    };

    const handleThresholdChange = (field, value) => {
        setThresholdMessage('');
        setCostThresholds((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSaveThresholds = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please login first');
            }
            const normalized = {
                alertCostDailySpikePercent: Math.min(1000, Math.max(1, toFiniteNumber(costThresholds.alertCostDailySpikePercent, defaultCostThresholds.alertCostDailySpikePercent))),
                alertCostAboveAvgMultiplier: Math.min(20, Math.max(1.1, toFiniteNumber(costThresholds.alertCostAboveAvgMultiplier, defaultCostThresholds.alertCostAboveAvgMultiplier))),
                alertCostDailyMaxDollars: Math.min(100000, Math.max(0.01, toFiniteNumber(costThresholds.alertCostDailyMaxDollars, defaultCostThresholds.alertCostDailyMaxDollars))),
                alertMinRequestsForCostAlert: Math.min(1000000, Math.max(1, Math.round(toFiniteNumber(costThresholds.alertMinRequestsForCostAlert, defaultCostThresholds.alertMinRequestsForCostAlert)))),
            };
            setSavingThresholds(true);
            setThresholdMessage('');
            await updateSettings(normalized, token);
            setCostThresholds(normalized);
            setThresholdMessage('Cost alert thresholds saved.');
            await fetchStats();
        } catch (error) {
            setThresholdMessage(error.message || 'Failed to save thresholds');
        } finally {
            setSavingThresholds(false);
        }
    };

    return (
        <div className="admin-view-container">
            <div className="monitor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                        <h3>Tracked Matches</h3>
                        <p>{counts.matches}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon users"><i className="fa-solid fa-dollar-sign"></i></div>
                    <div className="stat-info">
                        <h3>Daily API Cost</h3>
                        <p>${Number(costMetrics?.costDollars || 0).toFixed(2)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bets"><i className="fa-solid fa-chart-line"></i></div>
                    <div className="stat-info">
                        <h3>Projected Monthly Cost</h3>
                        <p>${Number(costMetrics?.projectedMonthlyDollars || 0).toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="admin-content-card" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                    <h3><i className="fa-solid fa-sliders"></i> Cost Alert Thresholds</h3>
                </div>
                <div style={{ color: '#9aa3b2', marginBottom: '12px', fontSize: '0.9rem' }}>
                    Updates are persisted in admin settings and immediately affect cost anomaly detection.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <label style={{ display: 'grid', gap: '6px', color: '#d9dde8' }}>
                        Daily Spike Percent
                        <input
                            type="number"
                            min="1"
                            max="1000"
                            step="0.1"
                            value={costThresholds.alertCostDailySpikePercent}
                            onChange={(e) => handleThresholdChange('alertCostDailySpikePercent', e.target.value)}
                        />
                    </label>
                    <label style={{ display: 'grid', gap: '6px', color: '#d9dde8' }}>
                        Above-Average Multiplier
                        <input
                            type="number"
                            min="1.1"
                            max="20"
                            step="0.1"
                            value={costThresholds.alertCostAboveAvgMultiplier}
                            onChange={(e) => handleThresholdChange('alertCostAboveAvgMultiplier', e.target.value)}
                        />
                    </label>
                    <label style={{ display: 'grid', gap: '6px', color: '#d9dde8' }}>
                        Daily Budget Max ($)
                        <input
                            type="number"
                            min="0.01"
                            max="100000"
                            step="0.1"
                            value={costThresholds.alertCostDailyMaxDollars}
                            onChange={(e) => handleThresholdChange('alertCostDailyMaxDollars', e.target.value)}
                        />
                    </label>
                    <label style={{ display: 'grid', gap: '6px', color: '#d9dde8' }}>
                        Min Requests For Budget Alert
                        <input
                            type="number"
                            min="1"
                            max="1000000"
                            step="1"
                            value={costThresholds.alertMinRequestsForCostAlert}
                            onChange={(e) => handleThresholdChange('alertMinRequestsForCostAlert', e.target.value)}
                        />
                    </label>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={handleSaveThresholds}
                        disabled={savingThresholds}
                        style={{
                            background: '#1f9d63',
                            color: 'white',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            cursor: savingThresholds ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {savingThresholds ? 'Saving...' : 'Save Thresholds'}
                    </button>
                    {thresholdMessage && (
                        <span style={{ color: /(failed|invalid|error)/i.test(thresholdMessage) ? '#ffb3b3' : '#9cf0c6' }}>
                            {thresholdMessage}
                        </span>
                    )}
                </div>
            </div>

            <div className="admin-content-card" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                    <h3><i className="fa-solid fa-coins"></i> API Cost Monitor (Phase 4)</h3>
                </div>
                <div style={{ color: '#666', marginBottom: '10px', fontSize: '0.9rem' }}>
                    Day: {costMetrics?.day || '—'} | Requests: {costMetrics?.requests ?? 0} | Avg Duration: {costMetrics?.avgDurationMs ?? 0}ms
                </div>
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Endpoint</th>
                                <th>Requests</th>
                                <th>Avg Duration (ms)</th>
                                <th>Daily Cost ($)</th>
                                <th>5xx Rate (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topCostEndpoints.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center">No cost telemetry yet.</td>
                                </tr>
                            ) : (
                                topCostEndpoints.map((row) => (
                                    <tr key={row.endpoint}>
                                        <td><code>{row.endpoint}</code></td>
                                        <td>{row.requests}</td>
                                        <td>{row.avgDurationMs}</td>
                                        <td>${Number(row.costDollars || 0).toFixed(4)}</td>
                                        <td>{row.error5xxRatePercent}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {costRecommendations.length > 0 && (
                    <div style={{ marginTop: '14px', padding: '12px', borderRadius: '8px', background: 'rgba(0, 128, 96, 0.12)', color: '#b7f7e8' }}>
                        <strong>Recommendations:</strong>
                        <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                            {costRecommendations.map((item, idx) => (
                                <li key={`cost-rec-${idx}`}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {costAlerts.length > 0 && (
                    <div style={{ marginTop: '14px', padding: '12px', borderRadius: '8px', background: 'rgba(255, 120, 80, 0.13)', color: '#ffd9c9' }}>
                        <strong>Cost Alerts:</strong>
                        <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                            {costAlerts.map((item, idx) => (
                                <li key={`cost-alert-${idx}`}>
                                    {item.message}
                                    {item.valuePercent !== undefined ? ` (${item.valuePercent}% change)` : ''}
                                    {item.valueDollars !== undefined ? ` ($${Number(item.valueDollars).toFixed(2)})` : ''}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div style={{ marginTop: '16px' }}>
                    <h4 style={{ color: '#d9dde8', marginBottom: '10px' }}>7-Day Cost Trend</h4>
                    {costHistory.length === 0 ? (
                        <div style={{ color: '#9aa3b2' }}>No history available yet.</div>
                    ) : (
                        <div style={{ display: 'grid', gap: '8px' }}>
                            {costHistory.map((row) => {
                                const cost = Number(row.costDollars || 0);
                                const widthPercent = maxHistoryCost > 0 ? Math.max(4, (cost / maxHistoryCost) * 100) : 4;
                                return (
                                    <div key={row.day} style={{ display: 'grid', gridTemplateColumns: '96px 1fr 72px', gap: '10px', alignItems: 'center' }}>
                                        <div style={{ color: '#9aa3b2', fontSize: '0.85rem' }}>{row.day}</div>
                                        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    width: `${widthPercent}%`,
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                                                    borderRadius: '999px'
                                                }}
                                            />
                                        </div>
                                        <div style={{ color: '#f8d39d', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${cost.toFixed(2)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="admin-content-card" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                    <h3><i className="fa-solid fa-heart-pulse"></i> Sportsbook Feed Health</h3>
                </div>
                <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={handleOpenBreaker}
                        disabled={breakerBusy}
                        style={{
                            background: '#8b1e1e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '7px 12px',
                            fontWeight: 700,
                            cursor: breakerBusy ? 'not-allowed' : 'pointer',
                            opacity: breakerBusy ? 0.6 : 1,
                        }}
                    >
                        Open Breaker
                    </button>
                    <button
                        type="button"
                        onClick={handleResetBreaker}
                        disabled={breakerBusy}
                        style={{
                            background: '#14532d',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '7px 12px',
                            fontWeight: 700,
                            cursor: breakerBusy ? 'not-allowed' : 'pointer',
                            opacity: breakerBusy ? 0.6 : 1,
                        }}
                    >
                        Reset Breaker
                    </button>
                    {breakerMessage && (
                        <span style={{ color: /(failed|error)/i.test(breakerMessage) ? '#ffb3b3' : '#9cf0c6', fontSize: '0.9rem' }}>
                            {breakerMessage}
                        </span>
                    )}
                </div>
                <div className="stats-grid" style={{ marginBottom: 0 }}>
                    <div className="stat-card">
                        <div className="stat-icon matches"><i className="fa-solid fa-signal"></i></div>
                        <div className="stat-info">
                            <h3>Odds Feed</h3>
                            <p>{oddsHealth?.bettingSuspended ? 'STALE / CLOSED' : 'OK'}</p>
                            <small>Last odds sync: {oddsHealth?.lastOddsSuccessAt ? new Date(oddsHealth.lastOddsSuccessAt).toLocaleString() : 'Never'}</small>
                            <small style={{ display: 'block' }}>Age: {oddsHealth?.syncAgeSeconds ?? '—'}s</small>
                            <small style={{ display: 'block' }}>
                                Circuit: {circuitState.toUpperCase()}
                                {oddsHealth?.circuitBreaker?.failureCount !== undefined ? ` (${oddsHealth.circuitBreaker.failureCount}/${oddsHealth?.circuitBreaker?.threshold ?? 0})` : ''}
                            </small>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bets"><i className="fa-solid fa-flag-checkered"></i></div>
                        <div className="stat-info">
                            <h3>Results Feed</h3>
                            <p>{oddsHealth?.lastScoresSuccessAt ? 'SYNCING' : 'UNKNOWN'}</p>
                            <small>Last score sync: {oddsHealth?.lastScoresSuccessAt ? new Date(oddsHealth.lastScoresSuccessAt).toLocaleString() : 'Never'}</small>
                            <small style={{ display: 'block' }}>Failures: {oddsHealth?.consecutiveFailures ?? 0}</small>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon users"><i className="fa-solid fa-scale-balanced"></i></div>
                        <div className="stat-info">
                            <h3>Settlement</h3>
                            <p>{settlementHealth?.lastRunStatus || 'unknown'}</p>
                            <small>Last success: {settlementHealth?.lastSuccessAt ? new Date(settlementHealth.lastSuccessAt).toLocaleString() : 'Never'}</small>
                            <small style={{ display: 'block' }}>Last match: {settlementHealth?.lastMatchId || '—'}</small>
                        </div>
                    </div>
                </div>
                {(oddsHealth?.lastError || settlementHealth?.lastError) && (
                    <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(255, 80, 80, 0.12)', color: '#ffb3b3' }}>
                        <div><strong>Last sync error:</strong> {oddsHealth?.lastError || '—'}</div>
                        <div><strong>Last settlement error:</strong> {settlementHealth?.lastError || '—'}</div>
                    </div>
                )}
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
                                    <tr key={m.id}>
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

            <div className="admin-content-card" style={{ marginTop: '20px' }}>
                <div className="card-header">
                    <h3><i className="fa-solid fa-diagram-project"></i> Dashboard Link to Entity/Table Map</h3>
                </div>
                <div style={{ color: '#666', marginBottom: '10px', fontSize: '0.9rem' }}>
                    Links: {catalogSummary.links} | Collections: {catalogSummary.collections} | Total Rows: {catalogSummary.rows}
                </div>
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Dashboard Link</th>
                                <th>Collections</th>
                                <th>Tables / Views</th>
                                <th>API Routes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {catalogItems.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center">No entity catalog data found.</td>
                                </tr>
                            ) : (
                                catalogItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <strong>{item.label}</strong>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{item.id}</div>
                                        </td>
                                        <td>
                                            {(item.collections || []).map((col) => (
                                                <div key={`${item.id}-${col.collection}`} style={{ marginBottom: '4px' }}>
                                                    <code>{col.collection}</code> ({col.rows})
                                                </div>
                                            ))}
                                        </td>
                                        <td>
                                            {(item.collections || []).map((col) => (
                                                <div key={`${item.id}-${col.collection}-table`} style={{ marginBottom: '4px', fontSize: '0.85rem' }}>
                                                    <div><code>{col.table}</code> {col.exists ? '' : '(missing)'}</div>
                                                    <div><code>{col.entityView}</code> | <code>{col.flatTable}</code></div>
                                                </div>
                                            ))}
                                        </td>
                                        <td>
                                            {(item.routes || []).map((route) => (
                                                <div key={`${item.id}-${route}`} style={{ marginBottom: '2px', fontSize: '0.85rem' }}>
                                                    <code>{route}</code>
                                                </div>
                                            ))}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .monitor-header {
                    background: linear-gradient(135deg, #0d3b5c 0%, #1a5f7a 100%);
                    border-radius: 12px;
                    padding: 12px;
                    gap: 10px;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                }
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
                .table-responsive {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .admin-table {
                    min-width: 640px;
                    width: 100%;
                    border-collapse: collapse;
                }
                @media (max-width: 768px) {
                    .monitor-header {
                        align-items: flex-start !important;
                    }
                    .monitor-header button {
                        width: 100%;
                        min-height: 42px;
                    }
                    .stat-card {
                        padding: 1rem;
                        gap: 0.8rem;
                    }
                    .stat-info p {
                        font-size: 1.4rem;
                    }
                }
            `}</style>

            {/* ── Audit Log ─────────────────────────────────────────────── */}
            <div className="admin-content-card" style={{ marginTop: '24px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3><i className="fa-solid fa-clipboard-list"></i> Admin Audit Log</h3>
                    <button
                        type="button"
                        onClick={() => fetchAuditLogPage(1)}
                        disabled={auditLoading}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#2c3e50', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                    >
                        {auditLoading ? 'Loading…' : 'Load'}
                    </button>
                </div>
                {auditLog.length === 0 && !auditLoading && (
                    <p style={{ color: '#aaa', padding: '12px 0' }}>Click Load to fetch recent admin actions.</p>
                )}
                {auditLog.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', color: '#9ca3af' }}>
                                    <th style={{ padding: '6px 10px' }}>Time</th>
                                    <th style={{ padding: '6px 10px' }}>Action</th>
                                    <th style={{ padding: '6px 10px' }}>Actor</th>
                                    <th style={{ padding: '6px 10px' }}>Target / Detail</th>
                                    <th style={{ padding: '6px 10px' }}>IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLog.map((row, i) => (
                                    <tr key={row.id || i} style={{ borderBottom: '1px solid #1e2a38' }}>
                                        <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: '#9ca3af' }}>
                                            {row.createdAt ? new Date(row.createdAt).toLocaleString() : (row.timestamp ? new Date(row.timestamp * 1000).toLocaleString() : '—')}
                                        </td>
                                        <td style={{ padding: '6px 10px', fontWeight: 600, color: /breaker_open|impersonate/.test(row.action || '') ? '#f97316' : '#e5e7eb' }}>
                                            {ACTION_LABELS[row.action] || row.action || '—'}
                                        </td>
                                        <td style={{ padding: '6px 10px', color: '#e5e7eb' }}>
                                            {row.actorUsername || row.actorId || '—'}
                                            {row.actorRole ? <span style={{ color: '#6b7280', marginLeft: 4 }}>({row.actorRole})</span> : null}
                                        </td>
                                        <td style={{ padding: '6px 10px', color: '#d1d5db' }}>
                                            {row.targetUsername || row.reason || row.targetId || '—'}
                                        </td>
                                        <td style={{ padding: '6px 10px', color: '#6b7280', fontFamily: 'monospace' }}>{row.ip || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {auditHasMore && (
                            <div style={{ textAlign: 'center', padding: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => fetchAuditLogPage(auditPage + 1)}
                                    disabled={auditLoading}
                                    style={{ padding: '6px 18px', borderRadius: '6px', border: 'none', background: '#374151', color: '#fff', cursor: 'pointer' }}
                                >
                                    {auditLoading ? 'Loading…' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemMonitorView;