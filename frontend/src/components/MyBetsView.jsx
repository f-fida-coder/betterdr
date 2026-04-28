import React, { useEffect, useMemo, useState } from 'react';
import { getMyBets } from '../api';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatLineValue, formatOdds } from '../utils/odds';
import '../mybets.css';

const money = (value) => `$${Math.round(Number(value || 0))}`;
const normalizeStatus = (value) => String(value || 'pending').trim().toLowerCase();

// Cross-render handoff: AccountPanel sets this before navigating to
// /my-bets so the view mounts with the requested filter. A window event
// would fire before MyBetsView's listener is registered (the view
// mounts on the next render), so we use module state + read on mount.
let pendingInitialFilter = null;
export const setMyBetsInitialFilter = (filter) => {
    if (['all', 'pending', 'won', 'lost', 'void', 'graded'].includes(filter)) {
        pendingInitialFilter = filter;
    }
};

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
    const [statusFilter, setStatusFilter] = useState(() => {
        const initial = pendingInitialFilter;
        pendingInitialFilter = null;
        return initial || 'all';
    });
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

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                void fetchBets({ silent: true });
            }
        };

        const interval = window.setInterval(() => {
            if (document.hidden) return;
            void fetchBets({ silent: true });
        }, 20000);

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
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
        // 'graded' is the union of settled outcomes — surfacing won, lost,
        // and void in one tab matches the AccountPanel sub-nav, which
        // groups them under "Graded" rather than three separate chips.
        if (statusFilter === 'graded') {
            return bets.filter((bet) => ['won', 'lost', 'void'].includes(normalizeStatus(bet?.status)));
        }
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
                {/* Hero — single compact bar: title + last-updated + refresh icon */}
                <div className="my-bets-hero">
                    <div className="my-bets-hero-text">
                        <span className="my-bets-eyebrow">Ticket Center</span>
                        <h2>My Bets</h2>
                        <p className="my-bets-updated">
                            Updated {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="my-bets-refresh-icon"
                        onClick={() => void fetchBets({ silent: true })}
                        disabled={refreshing}
                        aria-label="Refresh bets"
                    >
                        <i className={`fa-solid fa-arrows-rotate${refreshing ? ' fa-spin' : ''}`} />
                    </button>
                </div>

                {/* Compact summary strip — Total / Pending / At Risk only.
                    Won/Lost/Void counts already live in the filter chips, so
                    repeating them at the top was just visual noise. */}
                <div className="my-bets-summary-grid">
                    <div className="my-bets-summary-card">
                        <span>Tickets</span>
                        <strong>{summary.total}</strong>
                    </div>
                    <div className="my-bets-summary-card accent-pending">
                        <span>Pending</span>
                        <strong>{summary.pending}</strong>
                    </div>
                    <div className="my-bets-summary-card">
                        <span>At Risk</span>
                        <strong>{money(summary.pendingRisk)}</strong>
                    </div>
                    <div className="my-bets-summary-card">
                        <span>Total Risked</span>
                        <strong>{money(summary.risk)}</strong>
                    </div>
                </div>

                {/* Filter Chips — horizontal scroll on mobile so all 5 fit
                    cleanly without wrapping into a second row. */}
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
                            <span>{option.label}</span>
                            <span className="my-bets-filter-count">{filterCounts[option.id] || 0}</span>
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
                            const betId = bet.id || bet.ticketId;
                            const selections = Array.isArray(bet.selections) ? bet.selections : [];
                            const risk = Number(bet.riskAmount || bet.amount || 0);
                            const unitStake = Number(bet.unitStake || 0);
                            const status = normalizeStatus(bet.status);
                            const theme = statusTheme(status);
                            const ticketPayout = payoutValue(bet);
                            const betType = String(bet.type || 'straight').replace(/_/g, ' ').toUpperCase();
                            const isMulti = selections.length > 1;

                            return (
                                <article key={betId} className={`my-bet-card ${theme}`}>
                                    {/* Header Row */}
                                    <div className="my-bet-card-top">
                                        <div className="my-bet-card-meta">
                                            <span className={`my-bet-status ${theme}`}>{formatStatus(status)}</span>
                                            <span className="my-bet-type">{betType}</span>
                                            {bet.ticketId ? <span className="my-bet-ticket">#{String(bet.ticketId).slice(0, 12)}</span> : null}
                                        </div>
                                        <div className="my-bet-card-time">{formatTimestamp(bet.createdAt)}</div>
                                    </div>

                                    {/* Match title + leg count */}
                                    <div className="my-bet-card-title">
                                        <div className="my-bet-match" title={matchLabel(bet)}>{matchLabel(bet)}</div>
                                        <div className="my-bet-subtext">
                                            {isMulti ? `${selections.length} legs` : '1 leg'}
                                            <span className="my-bet-subdot">•</span>
                                            {statusLabel(status)}
                                        </div>
                                    </div>

                                    {/* Legs — always visible, no collapse. Each leg shows the
                                        full match, the side picked (highlighted), the line, the
                                        market type, the odds, and a per-leg status pill. */}
                                    {selections.length > 0 ? (
                                        <div className="my-bet-leg-list">
                                            {selections.map((leg, idx) => {
                                                const legTheme = statusTheme(leg?.status);
                                                const home = leg?.matchSnapshot?.homeTeam || '';
                                                const away = leg?.matchSnapshot?.awayTeam || '';
                                                const pick = leg?.selection || '—';
                                                const market = String(leg?.marketType || 'STRAIGHT').toUpperCase();
                                                const line = formatLineValue(leg?.point, {
                                                    signed: String(leg?.marketType || '').toLowerCase() === 'spreads',
                                                    fallback: '',
                                                });
                                                // Highlight the team the user actually picked so a
                                                // glance at the matchup makes the bet's stance obvious.
                                                const pickIsAway = away && pick && pick.toLowerCase() === away.toLowerCase();
                                                const pickIsHome = home && pick && pick.toLowerCase() === home.toLowerCase();
                                                return (
                                                    <div key={`${betId}-leg-${idx}`} className="my-bet-leg-item">
                                                        <div className="my-bet-leg-teams">
                                                            <span className={`my-bet-team ${pickIsAway ? 'picked' : ''}`}>{away || 'Away'}</span>
                                                            <span className="my-bet-team-vs">@</span>
                                                            <span className={`my-bet-team ${pickIsHome ? 'picked' : ''}`}>{home || 'Home'}</span>
                                                        </div>
                                                        <div className="my-bet-leg-pick-row">
                                                            <span className="my-bet-leg-market">{market}</span>
                                                            <span className="my-bet-leg-pick">{pick}{line ? ` ${line}` : ''}</span>
                                                            <span className="my-bet-leg-odds">{formatOdds(leg.odds, oddsFormat)}</span>
                                                            <span className={`my-bet-leg-status ${legTheme}`}>{formatStatus(leg.status)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : null}

                                    {/* Reverse note */}
                                    {String(bet.type || '').toLowerCase() === 'reverse' && unitStake > 0 ? (
                                        <div className="my-bet-note">Reverse ticket unit stake: {money(unitStake)} each way</div>
                                    ) : null}

                                    {/* Footer stats */}
                                    <div className="my-bet-stats">
                                        <div className="my-bet-stat">
                                            <span>Risk</span>
                                            <strong>{money(risk)}</strong>
                                        </div>
                                        <div className="my-bet-stat">
                                            <span>Odds</span>
                                            <strong>{formatOdds(bet.combinedOdds || bet.odds, oddsFormat)}</strong>
                                        </div>
                                        <div className="my-bet-stat highlight">
                                            <span>{payoutLabel(status)}</span>
                                            <strong>{money(ticketPayout)}</strong>
                                        </div>
                                    </div>
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
