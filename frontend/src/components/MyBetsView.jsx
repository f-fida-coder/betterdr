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

// Last token of a team name as the player-facing short label —
// "New York Knicks" → "Knicks", "Los Angeles Angels" → "Angels".
// Falls back to the whole string when there's only one token, so
// single-word names ("Suns", "Heat") survive untouched.
const shortTeam = (name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return '';
    const tokens = trimmed.split(/\s+/);
    return tokens[tokens.length - 1];
};

// One-line collapsed summary for the LEFT side of the ticket row.
// Produces "Knicks -19.5", "Over 220.5", "Lakers ML", or
// "3-leg Parlay" — the same shorthand a player would speak aloud
// instead of the full matchup + market badge breakdown the expanded
// view shows. For combined modes (parlay/teaser/if_bet/reverse) we
// always lead with leg count so the row stays scannable in lists
// mixing single-game tickets with multi-leg ones.
const ticketSummary = (bet) => {
    const selections = Array.isArray(bet?.selections) ? bet.selections : [];
    const type = String(bet?.type || 'straight').toLowerCase();
    if (selections.length > 1 || type === 'parlay' || type === 'teaser' || type === 'if_bet' || type === 'reverse') {
        const label = type === 'teaser' ? 'Teaser'
            : type === 'if_bet' ? 'If Bet'
                : type === 'reverse' ? 'Reverse'
                    : 'Parlay';
        return `${selections.length || 1}-leg ${label}`;
    }
    const leg = selections[0] || {};
    const market = String(leg?.marketType || '').toLowerCase();
    const point = Number.isFinite(Number(leg?.point)) ? Number(leg.point) : null;
    const selection = String(leg?.selection || '').trim();
    if (market === 'spreads') {
        const line = point === null ? '' : formatLineValue(point, { signed: true });
        const team = shortTeam(selection) || selection;
        return line ? `${team} ${line}` : team || 'Spread';
    }
    if (market === 'totals') {
        const isUnder = selection.toLowerCase().startsWith('u');
        const line = point === null ? '' : formatLineValue(Math.abs(point));
        return line ? `${isUnder ? 'Under' : 'Over'} ${line}` : (isUnder ? 'Under' : 'Over');
    }
    // h2h / moneyline / fallback
    const team = shortTeam(selection) || selection || 'Pick';
    return `${team} ML`;
};

// Right-side amount + sign + colour theme for the collapsed row.
//   won  → +profit, green
//   lost → -risk, red
//   void → "Refund $X", muted
//   pending → potential win, neutral (no sign)
// Returns { text, theme } so the renderer can apply a single class
// without re-deriving the status logic at the call site.
const ticketAmount = (bet) => {
    const status = normalizeStatus(bet?.status);
    const risk = Number(bet?.riskAmount || bet?.amount || 0);
    const potential = Number(bet?.potentialPayout || 0);
    const profit = Math.max(0, potential - risk);
    if (status === 'won') return { text: `+$${Math.round(profit)}`, theme: 'won' };
    if (status === 'lost') return { text: `-$${Math.round(risk)}`, theme: 'lost' };
    if (status === 'void') return { text: `Refund $${Math.round(risk)}`, theme: 'void' };
    return { text: `$${Math.round(profit)}`, theme: 'pending' };
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
    // Set of bet ids the user has expanded. Tap-to-expand replaces the
    // dense per-card top row + meta line + leg list + 3-column footer
    // that used to render unconditionally; the collapsed view now shows
    // only `[summary] [amount]`, and the rest reveals on tap.
    const [expandedIds, setExpandedIds] = useState(() => new Set());
    const toggleExpanded = (id) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

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
                        { id: 'pending', label: 'Pending' },
                        { id: 'graded', label: 'Graded' },
                        { id: 'figures', label: 'Figures' },
                        { id: 'transactions', label: 'Transactions' },
                    ].map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={`my-bets-filter-chip ${activeTab === option.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(option.id)}
                        >
                            {option.label}
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
                    <>
                    <div className="my-bets-list">
                        {visibleBets.map((bet) => {
                            const betId = bet.id || bet.ticketId;
                            const selections = Array.isArray(bet.selections) ? bet.selections : [];
                            const risk = Number(bet.riskAmount || bet.amount || 0);
                            const unitStake = Number(bet.unitStake || 0);
                            const status = normalizeStatus(bet.status);
                            const ticketPayout = payoutValue(bet);
                            const betType = String(bet.type || 'straight').replace(/_/g, ' ').toUpperCase();
                            const summary = ticketSummary(bet);
                            const amount = ticketAmount(bet);
                            const expanded = expandedIds.has(betId);

                            return (
                                <article key={betId} className={`my-bet-row ${amount.theme} ${expanded ? 'expanded' : ''}`}>
                                    <button
                                        type="button"
                                        className="my-bet-row-summary"
                                        onClick={() => toggleExpanded(betId)}
                                        aria-expanded={expanded}
                                    >
                                        <span className="my-bet-row-label">{summary}</span>
                                        <span className={`my-bet-row-amount ${amount.theme}`}>{amount.text}</span>
                                    </button>
                                    {expanded && (
                                        <div className="my-bet-row-detail">
                                            <div className="my-bet-row-detail-meta">
                                                <span>{matchLabel(bet)}</span>
                                                <span className="my-bet-row-detail-dot">•</span>
                                                <span>{formatTimestamp(bet.createdAt)}</span>
                                            </div>
                                            <div className="my-bet-row-detail-meta">
                                                <span>{betType}</span>
                                                {bet.ticketId ? <><span className="my-bet-row-detail-dot">•</span><span className="my-bet-row-detail-ticket">#{String(bet.ticketId).slice(0, 12)}</span></> : null}
                                            </div>

                                            {selections.length > 0 ? (
                                                <div className="my-bet-row-legs">
                                                    {selections.map((leg, idx) => {
                                                        const legTheme = statusTheme(leg?.status);
                                                        const home = leg?.matchSnapshot?.homeTeam || '';
                                                        const away = leg?.matchSnapshot?.awayTeam || '';
                                                        const rawPick = leg?.selection || '';
                                                        const { label, pick, line } = legPickLabel(leg);
                                                        const displayPick = pick || rawPick || '—';
                                                        return (
                                                            <div key={`${betId}-leg-${idx}`} className="my-bet-row-leg">
                                                                <div className="my-bet-row-leg-teams">{away || 'Away'} @ {home || 'Home'}</div>
                                                                <div className="my-bet-row-leg-pick">
                                                                    <span className="my-bet-row-leg-market">{label}</span>
                                                                    <span>{displayPick}{line ? ` ${line}` : ''}</span>
                                                                    <span className="my-bet-row-leg-odds">{formatOdds(leg.odds, oddsFormat)}</span>
                                                                    <span className={`my-bet-row-leg-status ${legTheme}`}>{formatStatus(leg.status)}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}

                                            {String(bet.type || '').toLowerCase() === 'reverse' && unitStake > 0 ? (
                                                <div className="my-bet-row-note">Reverse ticket unit stake: {money(unitStake)} each way</div>
                                            ) : null}

                                            <div className="my-bet-row-detail-stats">
                                                <div><span>Risk</span><strong>{money(risk)}</strong></div>
                                                <div><span>Odds</span><strong>{formatOdds(bet.combinedOdds || bet.odds, oddsFormat)}</strong></div>
                                                <div className="highlight">
                                                    <span>{payoutLabel(status)}</span>
                                                    <strong className={`my-bet-row-amount ${amount.theme}`}>
                                                        {status === 'pending' ? money(ticketPayout) : amount.text}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                    {/* Bottom totals — Pending shows risk + potential win,
                        Graded shows net P/L (won profit minus lost risk;
                        voids cancel out). Hidden when the list is empty
                        (the empty state owns its own messaging). */}
                    {visibleBets.length > 0 && (
                        <div className={`my-bets-totals ${activeTab === 'graded' ? 'graded' : 'pending'}`}>
                            {(() => {
                                if (activeTab === 'pending') {
                                    const totalRisk = visibleBets.reduce((sum, b) => sum + Number(b?.riskAmount || b?.amount || 0), 0);
                                    const totalWin = visibleBets.reduce((sum, b) => {
                                        const r = Number(b?.riskAmount || b?.amount || 0);
                                        const p = Number(b?.potentialPayout || 0);
                                        return sum + Math.max(0, p - r);
                                    }, 0);
                                    return (
                                        <>
                                            <span><span className="totals-label">Total Risk</span> <strong>{money(totalRisk)}</strong></span>
                                            <span><span className="totals-label">Total Win</span> <strong>{money(totalWin)}</strong></span>
                                        </>
                                    );
                                }
                                const net = visibleBets.reduce((sum, b) => {
                                    const s = normalizeStatus(b?.status);
                                    const r = Number(b?.riskAmount || b?.amount || 0);
                                    const p = Number(b?.potentialPayout || 0);
                                    if (s === 'won') return sum + Math.max(0, p - r);
                                    if (s === 'lost') return sum - r;
                                    return sum;
                                }, 0);
                                const sign = net > 0 ? '+' : net < 0 ? '-' : '';
                                const cls = net > 0 ? 'won' : net < 0 ? 'lost' : 'void';
                                return (
                                    <span className="my-bets-totals-net">
                                        <span className="totals-label">Net P/L</span>
                                        <strong className={cls}>{sign}${Math.abs(Math.round(net))}</strong>
                                    </span>
                                );
                            })()}
                        </div>
                    )}
                    </>
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
