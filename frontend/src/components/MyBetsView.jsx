import React, { useEffect, useMemo, useState } from 'react';
import { getMyBets, getUserFigures, getUserTransactions } from '../api';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatLineValue, formatOdds } from '../utils/odds';
import { fetchTeamBadgeUrl, createFallbackTeamLogoDataUri } from '../utils/teamLogos';
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

// One-line description for a single leg, e.g. "Lakers -4 -110".
// Used for both single-game tickets and the indented leg rows under
// a multi-leg parent. Returns the raw string the UI renders verbatim
// in the Description column.
const legDescription = (leg, oddsFormat) => {
    const market = String(leg?.marketType || '').toLowerCase();
    const point = Number.isFinite(Number(leg?.point)) ? Number(leg.point) : null;
    const selection = String(leg?.selection || '').trim();
    const odds = formatOdds(leg?.odds, oddsFormat);
    if (market === 'spreads') {
        const team = shortTeam(selection) || selection;
        const line = point === null ? '' : formatLineValue(point, { signed: true });
        return [team, line, odds].filter(Boolean).join(' ');
    }
    if (market === 'totals') {
        const isUnder = selection.toLowerCase().startsWith('u');
        const line = point === null ? '' : formatLineValue(Math.abs(point));
        return [`${isUnder ? 'Under' : 'Over'}`, line, odds].filter(Boolean).join(' ');
    }
    const team = shortTeam(selection) || selection || 'Pick';
    return [team, odds].filter(Boolean).join(' ');
};

// Parent-row label for multi-leg tickets, e.g. "Parlay - 3 Teams".
const multiLegLabel = (bet) => {
    const type = String(bet?.type || '').toLowerCase();
    const count = Array.isArray(bet?.selections) ? bet.selections.length : 0;
    const noun = type === 'teaser' ? 'Teaser'
        : type === 'if_bet' ? 'If Bet'
            : type === 'reverse' ? 'Reverse'
                : 'Parlay';
    return `${noun} - ${count} Teams`;
};

const isMultiLegBet = (bet) => {
    const type = String(bet?.type || '').toLowerCase();
    if (type === 'parlay' || type === 'teaser' || type === 'if_bet' || type === 'reverse') return true;
    return Array.isArray(bet?.selections) && bet.selections.length > 1;
};

// Team name to use when rendering a leg's logo. For totals we pull
// from matchSnapshot since the selection is "Over"/"Under", not a team.
const legTeamForLogo = (leg) => {
    const market = String(leg?.marketType || '').toLowerCase();
    if (market === 'totals') {
        return String(leg?.matchSnapshot?.homeTeam || '').trim() || null;
    }
    return String(leg?.selection || '').trim() || null;
};

// Team whose logo represents this ticket on the collapsed row. For
// straight spreads/h2h it's the picked team (taken from leg.selection,
// which already resolves "Los Angeles Angels" vs "Angels" depending on
// what the betslip stored). Totals don't have a single team — we fall
// back to the home team of the matchup. Multi-leg tickets return null
// (the row renders a multi-leg badge instead of a logo).
const primaryTeamFor = (bet) => {
    const selections = Array.isArray(bet?.selections) ? bet.selections : [];
    if (selections.length !== 1) return null;
    const leg = selections[0];
    const market = String(leg?.marketType || '').toLowerCase();
    if (market === 'spreads' || market === 'h2h' || market === '') {
        return String(leg?.selection || '').trim() || null;
    }
    if (market === 'totals') {
        return String(leg?.matchSnapshot?.homeTeam || '').trim() || null;
    }
    return String(leg?.selection || '').trim() || null;
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
    // Map<team name, logo url> populated lazily as bets land. We render
    // an SVG initials fallback immediately and replace with the real
    // crest when fetchTeamBadgeUrl resolves, so the row never shows a
    // broken image and the list doesn't block on the network. Same
    // pattern ScoreboardSidebar uses.
    const [teamLogos, setTeamLogos] = useState({});
    useEffect(() => {
        let mounted = true;
        const teamsToLoad = new Set();
        bets.forEach((bet) => {
            const team = primaryTeamFor(bet);
            if (team && !teamLogos[team]) teamsToLoad.add(team);
            // Also queue every leg in multi-leg tickets so the
            // indented leg rows render their crests, not just the
            // single-leg parent rows.
            const selections = Array.isArray(bet?.selections) ? bet.selections : [];
            if (selections.length > 1) {
                selections.forEach((leg) => {
                    const legTeam = legTeamForLogo(leg);
                    if (legTeam && !teamLogos[legTeam]) teamsToLoad.add(legTeam);
                });
            }
        });
        if (teamsToLoad.size === 0) return undefined;
        (async () => {
            const updates = {};
            await Promise.all(
                Array.from(teamsToLoad).map(async (team) => {
                    try {
                        const url = await fetchTeamBadgeUrl(team);
                        if (url) updates[team] = url;
                    } catch {
                        // fallback stays as-is
                    }
                })
            );
            if (mounted && Object.keys(updates).length > 0) {
                setTeamLogos((prev) => ({ ...prev, ...updates }));
            }
        })();
        return () => { mounted = false; };
    }, [bets]);

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
                    {/* Table-style ticket list:
                          [Description] [Risk] [To Win]
                        Multi-leg tickets render a parent row with the
                        ticket-level Risk/Win, then each leg as an
                        indented sub-row whose Risk/Win cells stay
                        empty (the parent already owns the totals).
                        Single-game tickets render as a single row. */}
                    <div className="my-bets-table">
                        <div className="my-bets-table-header">
                            <span className="my-bets-table-col-desc">Description</span>
                            <span className="my-bets-table-col-risk">Risk</span>
                            <span className="my-bets-table-col-win">To Win</span>
                        </div>
                        {visibleBets.map((bet) => {
                            const betId = bet.id || bet.ticketId;
                            const selections = Array.isArray(bet.selections) ? bet.selections : [];
                            const risk = Number(bet.riskAmount || bet.amount || 0);
                            const status = normalizeStatus(bet.status);
                            const ticketPayout = payoutValue(bet);
                            const amount = ticketAmount(bet);
                            const isMulti = isMultiLegBet(bet);
                            // For graded rows, "To Win" cell shows the
                            // signed outcome (+$X green / -$X red /
                            // Refund grey). Pending shows the unsigned
                            // potential win in neutral text so it
                            // matches the competitor reference exactly.
                            const winCell = status === 'pending' ? money(ticketPayout) : amount.text;
                            const winTheme = status === 'pending' ? 'pending' : amount.theme;

                            if (isMulti) {
                                return (
                                    <React.Fragment key={betId}>
                                        <div className="my-bets-table-row parent">
                                            <span className="my-bets-table-col-desc">{multiLegLabel(bet)}</span>
                                            <span className="my-bets-table-col-risk">{money(risk)}</span>
                                            <span className={`my-bets-table-col-win ${winTheme}`}>{winCell}</span>
                                        </div>
                                        {selections.map((leg, idx) => {
                                            const legTeam = legTeamForLogo(leg);
                                            const legLogo = legTeam
                                                ? (teamLogos[legTeam] || createFallbackTeamLogoDataUri(legTeam))
                                                : null;
                                            return (
                                                <div key={`${betId}-leg-${idx}`} className="my-bets-table-row leg">
                                                    <span className="my-bets-table-col-desc">
                                                        {legLogo && (
                                                            <img
                                                                src={legLogo}
                                                                alt=""
                                                                className="my-bets-table-logo"
                                                                loading="lazy"
                                                                onError={(e) => { e.currentTarget.src = createFallbackTeamLogoDataUri(legTeam || ''); }}
                                                            />
                                                        )}
                                                        <span className="my-bets-table-leg-text">{legDescription(leg, oddsFormat)}</span>
                                                    </span>
                                                    <span className="my-bets-table-col-risk" />
                                                    <span className="my-bets-table-col-win" />
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            }

                            const leg = selections[0] || {};
                            const legTeam = legTeamForLogo(leg);
                            const logoSrc = legTeam
                                ? (teamLogos[legTeam] || createFallbackTeamLogoDataUri(legTeam))
                                : null;
                            return (
                                <div key={betId} className="my-bets-table-row">
                                    <span className="my-bets-table-col-desc">
                                        {logoSrc && (
                                            <img
                                                src={logoSrc}
                                                alt=""
                                                className="my-bets-table-logo"
                                                loading="lazy"
                                                onError={(e) => { e.currentTarget.src = createFallbackTeamLogoDataUri(legTeam || ''); }}
                                            />
                                        )}
                                        <span className="my-bets-table-leg-text">{legDescription(leg, oddsFormat)}</span>
                                    </span>
                                    <span className="my-bets-table-col-risk">{money(risk)}</span>
                                    <span className={`my-bets-table-col-win ${winTheme}`}>{winCell}</span>
                                </div>
                            );
                        })}
                        {/* Bottom totals row — same 3-column grid so the
                            Risk + Win values land in their respective
                            columns. Graded uses the same layout but the
                            Win total is the signed Net P/L. */}
                        {(() => {
                            if (activeTab === 'pending') {
                                const totalRisk = visibleBets.reduce((sum, b) => sum + Number(b?.riskAmount || b?.amount || 0), 0);
                                const totalWin = visibleBets.reduce((sum, b) => {
                                    const r = Number(b?.riskAmount || b?.amount || 0);
                                    const p = Number(b?.potentialPayout || 0);
                                    return sum + Math.max(0, p - r);
                                }, 0);
                                return (
                                    <div className="my-bets-table-totals">
                                        <span>Total Risk : <strong className="risk-total">{money(totalRisk)}</strong></span>
                                        <span>Total Win : <strong>{money(totalWin)}</strong></span>
                                    </div>
                                );
                            }
                            const totalRisk = visibleBets.reduce((sum, b) => sum + (normalizeStatus(b?.status) === 'lost' ? Number(b?.riskAmount || b?.amount || 0) : 0), 0);
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
                                <div className="my-bets-table-totals">
                                    <span>Total Risk : <strong className="risk-total">{money(totalRisk)}</strong></span>
                                    <span>Net P/L : <strong className={cls}>{sign}${Math.abs(Math.round(net))}</strong></span>
                                </div>
                            );
                        })()}
                    </div>
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
                bet_won: 1, fp_bet_won: 1, bet_void: 1, fp_bet_void: 1, bet_void_admin: 1, fp_bet_void_admin: 1,
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
