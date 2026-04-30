import React, { useEffect, useMemo, useState } from 'react';
import { getMyBets, getUserFigures, getUserTransactions } from '../api';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatLineValue, formatOdds } from '../utils/odds';
import '../mybets.css';

const money = (value) => `$${Math.round(Number(value || 0))}`;
const moneySigned = (value) => {
    const n = Number(value || 0);
    if (n > 0) return `+$${Math.abs(Math.round(n))}`;
    if (n < 0) return `-$${Math.abs(Math.round(n))}`;
    return '$0';
};
const normalizeStatus = (value) => String(value || 'pending').trim().toLowerCase();

// Cross-render handoff: AccountPanel (and the header BALANCE box) sets
// this before navigating to /my-bets so the view mounts with the
// requested tab active. A window event would race the listener
// registration, so we use module state + read on mount.
let pendingInitialFilter = null;
export const setMyBetsInitialFilter = (filter) => {
    if (['pending', 'graded', 'figures', 'transactions', 'won', 'lost', 'void', 'all'].includes(filter)) {
        pendingInitialFilter = filter;
    }
};

// Player-facing market label + line for one leg row. Maps the internal
// market type (h2h / spreads / totals) to the universal sportsbook
// shorthand (ML / Spread / Over / Under). Returns { label, line } so the
// caller can render `{label} {line}` without trailing whitespace when the
// line is empty (e.g. moneyline). A non-zero `teaserAdjustment` or an
// explicit `buyPoints` flag adds a trailing "(BP)" so buy-points / teaser
// shifts are visually distinct from the base line.
const legPickLabel = (leg) => {
    const market = String(leg?.marketType || '').toLowerCase();
    const selection = String(leg?.selection || '').trim();
    const pointRaw = leg?.point;
    const point = Number.isFinite(Number(pointRaw)) ? Number(pointRaw) : null;
    const isBuyPoints = !!leg?.buyPoints
        || (Number.isFinite(Number(leg?.teaserAdjustment)) && Number(leg.teaserAdjustment) !== 0);
    const bpSuffix = isBuyPoints ? ' (BP)' : '';

    if (market === 'spreads') {
        const line = point === null ? '' : formatLineValue(point, { signed: true });
        return { label: 'Spread', pick: selection, line: line ? `${line}${bpSuffix}` : bpSuffix.trim() };
    }
    if (market === 'totals') {
        const isUnder = selection.toLowerCase().startsWith('u');
        const line = point === null ? '' : formatLineValue(Math.abs(point));
        return {
            label: isUnder ? 'Under' : 'Over',
            pick: '',
            line: line ? `${line}${bpSuffix}` : bpSuffix.trim(),
        };
    }
    // h2h / moneyline / anything else: never show a line, never the
    // stored point=0 sentinel that older rows leak into selection text.
    return { label: 'ML', pick: selection, line: '' };
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

const payoutLabel = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'won') return 'Won';
    if (normalized === 'void') return 'Refund';
    if (normalized === 'lost') return 'Lost';
    return 'Win';
};

const payoutValue = (bet) => {
    const status = normalizeStatus(bet?.status);
    const risk = Number(bet?.riskAmount || bet?.amount || 0);
    const potential = Number(bet?.potentialPayout || 0);
    const profit = Math.max(0, potential - risk);

    if (status === 'won') return profit;
    if (status === 'void') return risk;
    if (status === 'lost') return 0;
    return profit;
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

const settledTimestamp = (bet) => bet?.settledAt || bet?.updatedAt || bet?.createdAt;

const WEEK_OPTIONS = [
    { id: 0, label: 'This Week' },
    { id: 1, label: 'Last Week' },
    ...Array.from({ length: 10 }, (_, i) => ({ id: i + 2, label: `${i + 2} Weeks Ago` })),
];

const MyBetsView = () => {
    const { oddsFormat } = useOddsFormat();
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(() => {
        const initial = pendingInitialFilter;
        pendingInitialFilter = null;
        // Legacy filter values from AccountPanel collapse to the
        // appropriate new tab: won/lost/void → graded, all → pending.
        if (initial === 'won' || initial === 'lost' || initial === 'void') return 'graded';
        if (initial === 'all') return 'pending';
        return initial || 'pending';
    });

    const fetchBets = async ({ silent = false } = {}) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to view your bets.');
            setLoading(false);
            return;
        }

        if (!silent) {
            setLoading(true);
        }

        try {
            const data = await getMyBets(token);
            setBets(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch bets:', err);
            setError('Failed to load bets.');
        } finally {
            setLoading(false);
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

    const pendingBets = useMemo(
        () => bets.filter((bet) => normalizeStatus(bet?.status) === 'pending'),
        [bets],
    );

    // Graded = settled tickets (won + lost + void) merged into one
    // chronological list, sorted by settledAt desc. Players don't see
    // the won-vs-lost split — that distinction is intentionally omitted
    // to discourage emotional/chasing behavior.
    const gradedBets = useMemo(() => {
        const settled = bets.filter((bet) => ['won', 'lost', 'void'].includes(normalizeStatus(bet?.status)));
        return settled.slice().sort((a, b) => {
            const ta = new Date(settledTimestamp(a)).getTime() || 0;
            const tb = new Date(settledTimestamp(b)).getTime() || 0;
            return tb - ta;
        });
    }, [bets]);

    const tabCounts = {
        pending: pendingBets.length,
        graded: gradedBets.length,
    };

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

    const visibleBets = activeTab === 'pending' ? pendingBets : activeTab === 'graded' ? gradedBets : [];

    return (
        <div className="my-bets-page">
            <div className="my-bets-shell">
                {/* Ticket Center hero (title + Updated timestamp + refresh
                    icon) and the 4-card summary strip (Total Tickets /
                    Pending / At Risk / Total Risked) used to live here.
                    Both got removed: the top header already shows the
                    live PENDING tile (= same SUM as the old At Risk
                    card), and the per-ticket cards below carry their
                    own RISK/ODDS/WIN footers — the summary grid was
                    visual noise duplicating numbers a player can read
                    directly. Auto-refresh still runs every 20s. */}
                <div className="my-bets-filter-row">
                    {[
                        { id: 'pending', label: 'Pending', showCount: true },
                        { id: 'graded', label: 'Graded', showCount: true },
                        { id: 'figures', label: 'Figures' },
                        { id: 'transactions', label: 'Transactions' },
                    ].map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={`my-bets-filter-chip ${activeTab === option.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(option.id)}
                        >
                            <span>{option.label}</span>
                            {option.showCount ? (
                                <span className="my-bets-filter-count">{tabCounts[option.id] || 0}</span>
                            ) : null}
                        </button>
                    ))}
                </div>

                {activeTab === 'figures' ? (
                    <FiguresTab />
                ) : activeTab === 'transactions' ? (
                    <TransactionsTab />
                ) : visibleBets.length === 0 ? (
                    <div className="my-bets-empty">
                        <div className="my-bets-empty-icon"><i className="fa-solid fa-receipt"></i></div>
                        <h3>No bets in this view</h3>
                        <p>{activeTab === 'pending' ? 'No pending tickets right now.' : 'No graded tickets yet.'}</p>
                    </div>
                ) : (
                    <div className="my-bets-list">
                        {visibleBets.map((bet) => {
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
                                    <div className="my-bet-card-top">
                                        <div className="my-bet-card-meta">
                                            <span className={`my-bet-status ${theme}`}>{formatStatus(status)}</span>
                                            <span className="my-bet-type">{betType}</span>
                                            {bet.ticketId ? <span className="my-bet-ticket">#{String(bet.ticketId).slice(0, 12)}</span> : null}
                                        </div>
                                        <div className="my-bet-card-time">{formatTimestamp(bet.createdAt)}</div>
                                    </div>

                                    <div className="my-bet-card-title">
                                        <div className="my-bet-match" title={matchLabel(bet)}>{matchLabel(bet)}</div>
                                        <div className="my-bet-subtext">
                                            {isMulti ? `${selections.length} legs` : '1 leg'}
                                            <span className="my-bet-subdot">•</span>
                                            {statusLabel(status)}
                                        </div>
                                    </div>

                                    {selections.length > 0 ? (
                                        <div className="my-bet-leg-list">
                                            {selections.map((leg, idx) => {
                                                const legTheme = statusTheme(leg?.status);
                                                const home = leg?.matchSnapshot?.homeTeam || '';
                                                const away = leg?.matchSnapshot?.awayTeam || '';
                                                const rawPick = leg?.selection || '';
                                                const { label, pick, line } = legPickLabel(leg);
                                                const displayPick = pick || rawPick || '—';
                                                const pickIsAway = away && rawPick && rawPick.toLowerCase() === away.toLowerCase();
                                                const pickIsHome = home && rawPick && rawPick.toLowerCase() === home.toLowerCase();
                                                return (
                                                    <div key={`${betId}-leg-${idx}`} className="my-bet-leg-item">
                                                        <div className="my-bet-leg-teams">
                                                            <span className={`my-bet-team ${pickIsAway ? 'picked' : ''}`}>{away || 'Away'}</span>
                                                            <span className="my-bet-team-vs">@</span>
                                                            <span className={`my-bet-team ${pickIsHome ? 'picked' : ''}`}>{home || 'Home'}</span>
                                                        </div>
                                                        <div className="my-bet-leg-pick-row">
                                                            <span className="my-bet-leg-market">{label}</span>
                                                            <span className="my-bet-leg-pick">{displayPick}{line ? ` ${line}` : ''}</span>
                                                            <span className="my-bet-leg-odds">{formatOdds(leg.odds, oddsFormat)}</span>
                                                            <span className={`my-bet-leg-status ${legTheme}`}>{formatStatus(leg.status)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : null}

                                    {String(bet.type || '').toLowerCase() === 'reverse' && unitStake > 0 ? (
                                        <div className="my-bet-note">Reverse ticket unit stake: {money(unitStake)} each way</div>
                                    ) : null}

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
                                            <strong>
                                                {status === 'won' ? `+${money(ticketPayout)}` : money(ticketPayout)}
                                            </strong>
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

const FiguresTab = () => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to view figures.');
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        getUserFigures(token, weekOffset)
            .then((res) => { if (!cancelled) { setData(res); setLoading(false); } })
            .catch((err) => {
                console.error('Failed to load figures:', err);
                if (!cancelled) {
                    setError('Failed to load figures.');
                    setLoading(false);
                }
            });
        return () => { cancelled = true; };
    }, [weekOffset]);

    const renderAmount = (value) => {
        const n = Number(value || 0);
        const className = n > 0 ? 'figures-amount positive' : n < 0 ? 'figures-amount negative' : 'figures-amount';
        return <span className={className}>{moneySigned(n)}</span>;
    };

    const hasActivity = data && (
        Number(data.weekTotal || 0) !== 0
        || Number(data.transactions || 0) !== 0
        || Number(data.carryForward || 0) !== 0
        || (Array.isArray(data.days) && data.days.some((d) => Number(d.pl || 0) !== 0))
    );

    return (
        <div className="figures-tab">
            <div className="figures-controls">
                <select
                    className="figures-week-select"
                    value={weekOffset}
                    onChange={(e) => setWeekOffset(Number(e.target.value))}
                    aria-label="Select week"
                >
                    {WEEK_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="my-bets-empty">
                    <div className="my-bets-empty-icon"><i className="fa-solid fa-chart-column"></i></div>
                    <h3>Loading figures…</h3>
                </div>
            ) : error ? (
                <div className="my-bets-empty error">
                    <h3>{error}</h3>
                </div>
            ) : !hasActivity ? (
                <div className="my-bets-empty">
                    <div className="my-bets-empty-icon"><i className="fa-solid fa-chart-column"></i></div>
                    <h3>No activity this week.</h3>
                </div>
            ) : (
                <div className="figures-table">
                    <div className="figures-row">
                        <span className="figures-label">Carry forward</span>
                        <span className="figures-amount">{money(data.carryForward)}</span>
                    </div>
                    {data.days.map((d) => (
                        <div key={d.label} className="figures-row">
                            <span className="figures-label">{d.label} <span className="figures-date">({d.date})</span></span>
                            {renderAmount(d.pl)}
                        </div>
                    ))}
                    <div className="figures-row figures-row-total">
                        <span className="figures-label">Week total</span>
                        {renderAmount(data.weekTotal)}
                    </div>
                    <div className="figures-row">
                        <span className="figures-label">Transactions</span>
                        {renderAmount(data.transactions)}
                    </div>
                    <div className="figures-row figures-row-total">
                        <span className="figures-label">End balance</span>
                        <span className="figures-amount">{money(data.endBalance)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const PAGE_SIZE = 50;

const TransactionsTab = () => {
    const [rows, setRows] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    const loadPage = async (pageOffset, append) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to view transactions.');
            setLoading(false);
            return;
        }
        if (append) setLoadingMore(true); else setLoading(true);
        setError(null);
        try {
            const res = await getUserTransactions(token, { limit: PAGE_SIZE, offset: pageOffset });
            const next = Array.isArray(res?.transactions) ? res.transactions : [];
            setRows((prev) => append ? [...prev, ...next] : next);
            setHasMore(Boolean(res?.hasMore));
            setOffset(pageOffset);
        } catch (err) {
            console.error('Failed to load transactions:', err);
            setError('Failed to load transactions.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        void loadPage(0, false);
    }, []);

    const handleLoadMore = () => {
        if (loadingMore || !hasMore) return;
        void loadPage(offset + PAGE_SIZE, true);
    };

    const renderDelta = (tx) => {
        const value = tx.delta != null ? Number(tx.delta) : null;
        if (value == null) {
            // Some legacy rows have no balance snapshot — fall back to a
            // signed amount based on the type so the column isn't blank.
            const signedTypes = {
                bet_placed: -1, fp_bet_placed: -1,
                casino_bet_debit: -1, withdrawal: -1, bet_lost: -1, fp_bet_lost: -1,
                bet_won: 1, fp_bet_won: 1, bet_void: 1, fp_bet_void: 1, bet_void_admin: 1,
                fp_deposit: 1, deposit: 1, casino_bet_credit: 1,
            };
            const sign = signedTypes[String(tx.type || '').toLowerCase()] || 0;
            const signed = sign * Number(tx.amount || 0);
            return <span className={signed > 0 ? 'tx-amount positive' : signed < 0 ? 'tx-amount negative' : 'tx-amount'}>{moneySigned(signed)}</span>;
        }
        return <span className={value > 0 ? 'tx-amount positive' : value < 0 ? 'tx-amount negative' : 'tx-amount'}>{moneySigned(value)}</span>;
    };

    return (
        <div className="transactions-tab">
            {loading ? (
                <div className="my-bets-empty">
                    <div className="my-bets-empty-icon"><i className="fa-solid fa-list"></i></div>
                    <h3>Loading transactions…</h3>
                </div>
            ) : error ? (
                <div className="my-bets-empty error">
                    <h3>{error}</h3>
                </div>
            ) : rows.length === 0 ? (
                <div className="my-bets-empty">
                    <div className="my-bets-empty-icon"><i className="fa-solid fa-list"></i></div>
                    <h3>No transactions yet.</h3>
                </div>
            ) : (
                <>
                    <div className="transactions-list">
                        <div className="tx-row tx-row-header">
                            <span className="tx-when">Date</span>
                            <span className="tx-label">Type</span>
                            <span className="tx-amount-col">Amount</span>
                            <span className="tx-balance">Balance</span>
                        </div>
                        {rows.map((tx) => (
                            <div key={tx.id} className="tx-row">
                                <span className="tx-when">{formatTimestamp(tx.createdAt)}</span>
                                <span className="tx-label">
                                    {tx.label}
                                    {tx.isFreeplay ? <span className="tx-fp-tag">FP</span> : null}
                                </span>
                                <span className="tx-amount-col">{renderDelta(tx)}</span>
                                <span className="tx-balance">{tx.balanceAfter != null ? money(tx.balanceAfter) : '—'}</span>
                            </div>
                        ))}
                    </div>
                    {hasMore ? (
                        <div className="transactions-load-more-row">
                            <button
                                type="button"
                                className="transactions-load-more-btn"
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? 'Loading…' : 'Load More'}
                            </button>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
};

export default MyBetsView;
