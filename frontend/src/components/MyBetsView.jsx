import React, { useEffect, useMemo, useState } from 'react';
import { getMyBets } from '../api';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatLineValue, formatOdds } from '../utils/odds';
import '../mybets.css';

const money = (value) => `$${Math.round(Number(value || 0))}`;
const normalizeStatus = (value) => String(value || 'pending').trim().toLowerCase();

const formatStatus = (value) => {
    const normalized = normalizeStatus(value);
    if (normalized === 'won') return 'WON';
    if (normalized === 'lost') return 'LOST';
    if (normalized === 'void') return 'VOID';
    return 'PENDING';
};

const statusLabel = (value) => {
    const normalized = normalizeStatus(value);
    if (normalized === 'won') return 'Won';
    if (normalized === 'lost') return 'Lost';
    if (normalized === 'void') return 'Void';
    return 'Pending';
};

const statusTheme = (value) => {
    const normalized = normalizeStatus(value);
    if (normalized === 'won') return 'won';
    if (normalized === 'lost') return 'lost';
    if (normalized === 'void') return 'void';
    return 'pending';
};

const matchLabel = (bet) => {
    if (bet?.match?.homeTeam && bet?.match?.awayTeam) {
        return `${bet.match.homeTeam} vs ${bet.match.awayTeam}`;
    }
    if (Array.isArray(bet?.selections) && bet.selections.length > 1) {
        return `${bet.selections.length}-leg ticket`;
    }
    if (bet?.matchSnapshot?.homeTeam && bet?.matchSnapshot?.awayTeam) {
        return `${bet.matchSnapshot.homeTeam} vs ${bet.matchSnapshot.awayTeam}`;
    }
    return 'Ticket';
};

const lineLabel = (leg) => {
    const label = formatLineValue(leg?.point, { signed: String(leg?.marketType || '').toLowerCase() === 'spreads', fallback: '' });
    return label ? ` (${label})` : '';
};

const payoutLabel = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'won') return 'Paid Out';
    if (normalized === 'void') return 'Refund';
    if (normalized === 'lost') return 'Payout';
    return 'Potential Payout';
};

const payoutValue = (bet) => {
    const status = normalizeStatus(bet?.status);
    const risk = Number(bet?.riskAmount || bet?.amount || 0);
    const potential = Number(bet?.potentialPayout || 0);

    if (status === 'won') return potential;
    if (status === 'void') return risk;
    if (status === 'lost') return 0;
    return potential;
};

const formatTimestamp = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const MyBetsView = () => {
    const { oddsFormat } = useOddsFormat();
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchBets = async ({ silent = false } = {}) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to view your bets.');
            setLoading(false);
            return;
        }

        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const data = await getMyBets(token);
            setBets(Array.isArray(data) ? data : []);
            setError(null);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch bets:', err);
            setError('Failed to load bets.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void fetchBets();

        const interval = window.setInterval(() => {
            void fetchBets({ silent: true });
        }, 20000);

        return () => window.clearInterval(interval);
    }, []);

    const summary = useMemo(() => {
        return bets.reduce((acc, bet) => {
            const status = normalizeStatus(bet?.status);
            const risk = Number(bet?.riskAmount || bet?.amount || 0);

            acc.total += 1;
            acc.risk += risk;

            if (status === 'won') acc.won += 1;
            else if (status === 'lost') acc.lost += 1;
            else if (status === 'void') acc.void += 1;
            else {
                acc.pending += 1;
                acc.pendingRisk += risk;
            }

            return acc;
        }, {
            total: 0,
            pending: 0,
            won: 0,
            lost: 0,
            void: 0,
            risk: 0,
            pendingRisk: 0,
        });
    }, [bets]);

    const filterCounts = useMemo(() => {
        const counts = { all: bets.length, pending: 0, won: 0, lost: 0, void: 0 };
        bets.forEach((bet) => {
            const s = normalizeStatus(bet?.status);
            if (counts[s] !== undefined) counts[s] += 1;
        });
        return counts;
    }, [bets]);

    const filteredBets = useMemo(() => {
        if (statusFilter === 'all') return bets;
        return bets.filter((bet) => normalizeStatus(bet?.status) === statusFilter);
    }, [bets, statusFilter]);

    if (loading) {
        return (
            <div className="my-bets-page">
                <div className="my-bets-shell">
                    <div className="my-bets-empty">
                        <div className="my-bets-empty-icon"><i className="fa-solid fa-ticket"></i></div>
                        <h3>Loading your bet history...</h3>
                        <p>Fetching the latest ticket results.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="my-bets-page">
                <div className="my-bets-shell">
                    <div className="my-bets-empty error">
                        <div className="my-bets-empty-icon"><i className="fa-solid fa-circle-exclamation"></i></div>
                        <h3>Unable to load bets</h3>
                        <p>{error}</p>
                        <button type="button" className="my-bets-refresh-btn" onClick={() => void fetchBets()} style={{ marginTop: 16 }}>
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="my-bets-page">
            <div className="my-bets-shell">
                {/* Hero */}
                <div className="my-bets-hero">
                    <div>
                        <span className="my-bets-eyebrow">Ticket Center</span>
                        <h2>My Bets</h2>
                        <p>Track all your pending, settled, and voided tickets in one place.</p>
                    </div>
                    <div className="my-bets-hero-actions">
                        <button
                            type="button"
                            className="my-bets-refresh-btn"
                            onClick={() => void fetchBets({ silent: true })}
                            disabled={refreshing}
                        >
                            <i className={`fa-solid fa-arrows-rotate${refreshing ? ' fa-spin' : ''}`} style={{ marginRight: 6 }}></i>
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <div className="my-bets-updated">Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</div>
                    </div>
                </div>

                {/* Summary Grid */}
                <div className="my-bets-summary-grid">
                    <div className="my-bets-summary-card">
                        <span>Total Tickets</span>
                        <strong>{summary.total}</strong>
                    </div>
                    <div className="my-bets-summary-card accent-pending">
                        <span>Pending</span>
                        <strong>{summary.pending}</strong>
                        <small>{money(summary.pendingRisk)} at risk</small>
                    </div>
                    <div className="my-bets-summary-card accent-won">
                        <span>Won</span>
                        <strong>{summary.won}</strong>
                    </div>
                    <div className="my-bets-summary-card accent-lost">
                        <span>Lost</span>
                        <strong>{summary.lost}</strong>
                    </div>
                    <div className="my-bets-summary-card accent-void">
                        <span>Void</span>
                        <strong>{summary.void}</strong>
                    </div>
                    <div className="my-bets-summary-card">
                        <span>Total Risked</span>
                        <strong>{money(summary.risk)}</strong>
                    </div>
                </div>

                {/* Filter Chips */}
                <div className="my-bets-filter-row">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'pending', label: 'Pending' },
                        { id: 'won', label: 'Won' },
                        { id: 'lost', label: 'Lost' },
                        { id: 'void', label: 'Void' },
                    ].map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={`my-bets-filter-chip ${statusFilter === option.id ? 'active' : ''}`}
                            onClick={() => setStatusFilter(option.id)}
                        >
                            {option.label} ({filterCounts[option.id] || 0})
                        </button>
                    ))}
                </div>

                {/* Bet Cards */}
                {filteredBets.length === 0 ? (
                    <div className="my-bets-empty">
                        <div className="my-bets-empty-icon"><i className="fa-solid fa-receipt"></i></div>
                        <h3>No bets in this view</h3>
                        <p>{statusFilter === 'all' ? 'You have not placed any bets yet.' : `No ${statusFilter} tickets found right now.`}</p>
                    </div>
                ) : (
                    <div className="my-bets-list">
                        {filteredBets.map((bet) => {
                            const betId = bet._id || bet.id || bet.ticketId;
                            const selections = Array.isArray(bet.selections) ? bet.selections : [];
                            const summaryLines = String(bet.description || bet.selection || 'MULTI').split('\n').filter(Boolean);
                            const risk = Number(bet.riskAmount || bet.amount || 0);
                            const unitStake = Number(bet.unitStake || 0);
                            const status = normalizeStatus(bet.status);
                            const theme = statusTheme(status);
                            const ticketPayout = payoutValue(bet);

                            return (
                                <article key={betId} className={`my-bet-card ${theme}`}>
                                    {/* Header Row */}
                                    <div className="my-bet-card-top">
                                        <div className="my-bet-card-meta">
                                            <span className={`my-bet-status ${theme}`}>{formatStatus(status)}</span>
                                            <span className="my-bet-type">{String(bet.type || 'straight').replace(/_/g, ' ').toUpperCase()}</span>
                                            {bet.ticketId ? <span className="my-bet-ticket">#{bet.ticketId}</span> : null}
                                        </div>
                                        <div className="my-bet-card-time">{formatTimestamp(bet.createdAt)}</div>
                                    </div>

                                    {/* Body */}
                                    <div className="my-bet-card-body">
                                        <div className="my-bet-main">
                                            <div className="my-bet-match" title={matchLabel(bet)}>{matchLabel(bet)}</div>
                                            <div className="my-bet-subtext">
                                                <span>{selections.length || 1} leg{(selections.length || 1) > 1 ? 's' : ''}</span>
                                                <span>•</span>
                                                <span>{statusLabel(status)} ticket</span>
                                            </div>
                                            <div className="my-bet-summary-lines">
                                                {summaryLines.length > 0 ? summaryLines.map((line, index) => (
                                                    <div key={`${betId}-summary-${index}`} className="my-bet-summary-line" title={line}>{line}</div>
                                                )) : (
                                                    <div className="my-bet-summary-line">MULTI</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="my-bet-stats">
                                            <div className="my-bet-stat">
                                                <span>Risk</span>
                                                <strong>{money(risk)}</strong>
                                            </div>
                                            <div className="my-bet-stat">
                                                <span>Odds</span>
                                                <strong>{formatOdds(bet.combinedOdds || bet.odds, oddsFormat)}</strong>
                                            </div>
                                            <div className="my-bet-stat">
                                                <span>{payoutLabel(status)}</span>
                                                <strong>{money(ticketPayout)}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reverse note */}
                                    {String(bet.type || '').toLowerCase() === 'reverse' && unitStake > 0 ? (
                                        <div className="my-bet-note">Reverse ticket unit stake: {money(unitStake)} each way</div>
                                    ) : null}

                                    {/* Leg Details */}
                                    {selections.length > 0 ? (
                                        <details className="my-bet-legs" open={selections.length === 1}>
                                            <summary>
                                                <span>
                                                    <i className="fa-solid fa-list-ul" style={{ marginRight: 6, fontSize: 12 }}></i>
                                                    Leg Details
                                                </span>
                                                <span>{selections.length} total</span>
                                            </summary>
                                            <div className="my-bet-leg-list">
                                                {selections.map((leg, idx) => {
                                                    const legTheme = statusTheme(leg?.status);
                                                    return (
                                                        <div key={`${betId}-leg-${idx}`} className="my-bet-leg-item">
                                                            <div className="my-bet-leg-main">
                                                                <div className="my-bet-leg-match">
                                                                    {leg.matchSnapshot?.homeTeam && leg.matchSnapshot?.awayTeam
                                                                        ? `${leg.matchSnapshot.homeTeam} vs ${leg.matchSnapshot.awayTeam}`
                                                                        : (leg.matchId || 'Match')}
                                                                </div>
                                                                <div className="my-bet-leg-pick">
                                                                    {leg.selection || '-'}
                                                                    {lineLabel(leg)}
                                                                </div>
                                                            </div>
                                                            <div className="my-bet-leg-meta">
                                                                <span>{String(leg.marketType || '-').toUpperCase()}</span>
                                                                <span>{formatOdds(leg.odds, oddsFormat)}</span>
                                                                <span className={`my-bet-leg-status ${legTheme}`}>{formatStatus(leg.status)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    ) : null}
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBetsView;
