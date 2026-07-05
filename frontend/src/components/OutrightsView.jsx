import React, { useEffect, useMemo, useState } from 'react';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatOdds, americanToDecimal } from '../utils/odds';
import { getOutrights } from '../api';
import { getSiteTimezone } from '../utils/timezone';

// CONTRACT: the `outrights` table's `price` field stores the feed's AMERICAN
// odds (e.g. 450 = +450), UNLIKE the matches board which stores decimal. Every
// reader here converts American -> decimal at the boundary so the rest of the
// app (betslip, payout, settlement) keeps its app-wide DECIMAL convention. If a
// writer is ever changed to store DECIMAL in `price`, REMOVE these
// americanToDecimal() conversions together with the backend kill-switch — do
// NOT keep both, or you re-introduce a double-conversion bug.
const dispatchAddToSlip = (event, outcome) => {
    // Reuses the existing 'betslip:add' event the slip already listens to.
    // matchId carries the outright row id (24-hex ObjectId) so the backend
    // can route to OutrightSettlementService via the matchType=='outrights'
    // discriminator in BetsController::placeBet.
    window.dispatchEvent(new CustomEvent('betslip:add', { detail: {
        matchId: event.id || event.eventId,
        outrightId: event.id || event.eventId,
        marketType: 'outrights',
        selection: outcome.name,
        // price is AMERICAN — hand the slip the decimal it expects.
        odds: americanToDecimal(outcome.price),
        sportKey: event.sportKey,
        eventName: event.eventName,
        homeTeam: event.eventName,            // slip uses these for label
        awayTeam: outcome.name,
        commenceTime: event.commenceTime,
        isOutright: true,
    }}));
};

const formatStartTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { timeZone: getSiteTimezone(), month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Map a sport key (e.g. `americanfootball_ncaaf_championship_winner`,
 * `golf_masters_tournament_winner`) to the family/division it belongs to.
 * Returned `id` is the grouping key (stable across renders); `label` and
 * `emoji` drive the division heading the player sees.
 */
const sportFamilyFromKey = (sportKey) => {
    const k = String(sportKey || '').toLowerCase();
    if (k.startsWith('americanfootball')) return { id: 'football', label: 'FOOTBALL', emoji: '🏈' };
    if (k.startsWith('basketball')) return { id: 'basketball', label: 'BASKETBALL', emoji: '🏀' };
    if (k.startsWith('baseball')) return { id: 'baseball', label: 'BASEBALL', emoji: '⚾' };
    if (k.startsWith('icehockey') || k.startsWith('hockey')) return { id: 'hockey', label: 'HOCKEY', emoji: '🏒' };
    if (k.startsWith('soccer')) return { id: 'soccer', label: 'SOCCER', emoji: '⚽' };
    if (k.startsWith('golf')) return { id: 'golf', label: 'GOLF', emoji: '⛳' };
    if (k.startsWith('tennis')) return { id: 'tennis', label: 'TENNIS', emoji: '🎾' };
    if (k.startsWith('mma') || k.startsWith('martialarts')) return { id: 'mma', label: 'MARTIAL ARTS', emoji: '🥊' };
    if (k.startsWith('boxing')) return { id: 'boxing', label: 'BOXING', emoji: '🥊' };
    if (k.startsWith('cricket')) return { id: 'cricket', label: 'CRICKET', emoji: '🏏' };
    if (k.startsWith('rugbyleague') || k.startsWith('rugbyunion') || k.startsWith('rugby')) return { id: 'rugby', label: 'RUGBY', emoji: '🏉' };
    if (k.startsWith('aussierules')) return { id: 'aussierules', label: 'AUSSIE RULES', emoji: '🏉' };
    if (k.startsWith('lacrosse')) return { id: 'lacrosse', label: 'LACROSSE', emoji: '🥍' };
    return { id: 'other', label: 'OTHER', emoji: '🏆' };
};

/**
 * Map a sport key to the LEAGUE-level category that nests under the division —
 * e.g. `americanfootball_nfl_*` → "NFL FUTURES" (the heading the screenshot
 * wants under FOOTBALL). Known leagues get a curated label; anything else is
 * derived from the key so a new league never renders blank. Returned `id` is a
 * stable grouping key; `label` is the heading the player sees.
 */
const LEAGUE_LABELS = {
    americanfootball_nfl: 'NFL', americanfootball_ncaaf: 'NCAAF',
    americanfootball_cfl: 'CFL', americanfootball_ufl: 'UFL',
    basketball_nba: 'NBA', basketball_wnba: 'WNBA', basketball_ncaab: 'NCAA',
    basketball_euroleague: 'EUROLEAGUE',
    baseball_mlb: 'MLB', baseball_npb: 'NPB', baseball_kbo: 'KBO',
    icehockey_nhl: 'NHL',
    soccer_epl: 'PREMIER LEAGUE', soccer_uefa_champs_league: 'UEFA CHAMPIONS LEAGUE',
    soccer_uefa_europa_league: 'UEFA EUROPA LEAGUE', soccer_uefa_euro: 'EURO',
    soccer_fifa_world_cup: 'WORLD CUP', soccer_spain_la_liga: 'LA LIGA',
    soccer_italy_serie_a: 'SERIE A', soccer_germany_bundesliga: 'BUNDESLIGA',
    soccer_france_ligue_one: 'LIGUE 1',
    golf_pga: 'PGA', golf_masters: 'THE MASTERS', golf_us_open: 'U.S. OPEN',
    golf_the_open: 'THE OPEN', golf_pga_championship: 'PGA CHAMPIONSHIP',
    tennis_atp: 'ATP', tennis_wta: 'WTA',
};

const leagueCategoryFromKey = (sportKey, familyLabel) => {
    const k = String(sportKey || '').toLowerCase();
    // Longest-prefix match wins so `golf_pga_championship` beats `golf_pga`.
    let bestKey = '';
    for (const prefix of Object.keys(LEAGUE_LABELS)) {
        if (k.startsWith(prefix) && prefix.length > bestKey.length) bestKey = prefix;
    }
    if (bestKey) {
        return { id: bestKey, label: `${LEAGUE_LABELS[bestKey]} FUTURES` };
    }
    // Fallback: drop the leading family token, drop trailing winner/championship
    // noise, title-case what's left. e.g. `cricket_ipl_winner` → "IPL FUTURES".
    const parts = k.split('_').filter(Boolean);
    if (parts.length > 1) parts.shift();
    const cleaned = parts
        .filter((p) => !['winner', 'championship', 'tournament', 'outright', 'outrights'].includes(p))
        .join(' ')
        .trim();
    const label = cleaned ? cleaned.toUpperCase() : String(familyLabel || 'FUTURES');
    return { id: k || 'unknown', label: `${label} FUTURES` };
};

/**
 * Pick the first bookmaker's `outrights` market outcomes, sorted by price
 * (lowest decimal = strongest favorite first). Outright responses sometimes
 * also expose `outrights_lay`; we ignore those for display.
 */
const extractOutcomes = (primaryBookmaker) => {
    if (!primaryBookmaker || !Array.isArray(primaryBookmaker.markets)) return [];
    const market = primaryBookmaker.markets.find((m) => m && m.key === 'outrights');
    if (!market || !Array.isArray(market.outcomes)) return [];
    return [...market.outcomes].sort((a, b) => {
        const pa = Number(a?.price);
        const pb = Number(b?.price);
        if (!Number.isFinite(pa)) return 1;
        if (!Number.isFinite(pb)) return -1;
        return pa - pb;
    });
};

/**
 * OutrightsView
 *
 * Renders the futures / outright leaderboard. Optional sportKey scopes to a
 * single tournament/championship; otherwise shows every open outright grouped
 * by sport. Backed by /api/outrights and /api/outrights/sports.
 */
const OutrightsView = ({ sportKey = '', families = [], boardKeys = [], title = 'Futures' }) => {
    // Defensive: useOddsFormat() returns the context default object, but if
    // the provider tree ever swaps out mid-render we'd destructure undefined
    // and trip the global ErrorBoundary. Pull the value indirectly so the
    // component can't crash on a missing context shape.
    const oddsCtx = useOddsFormat();
    const oddsFormat = (oddsCtx && oddsCtx.oddsFormat) || 'american';
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        getOutrights(sportKey)
            .then((data) => {
                if (cancelled) return;
                setRows(Array.isArray(data) ? data : []);
            })
            .catch((e) => {
                if (cancelled) return;
                setError(e?.message || 'Failed to load futures');
                setRows([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [sportKey]);

    // Optional scoping, narrowest wins. `boardKeys` is an exact sport-key
    // allowlist (multi-selected sidebar board leaves) — only those boards
    // render. `families` is the coarser fallback when a selection can't
    // name its boards. Client-side either way: /api/outrights already
    // ships the full open list and it's small (futures move slowly), so
    // one fetch serves every scope. Both empty = all boards.
    const familySet = useMemo(() => new Set(families), [families]);
    const boardKeySet = useMemo(
        () => new Set(boardKeys.map((k) => String(k).toLowerCase())),
        [boardKeys],
    );
    // boardKeys arrives in the user's TICK ORDER (selection array →
    // resolver preserves it), and the owner wants that order to win:
    // first-ticked board's sport block on top. Map key → tick index so
    // grouping below can sort by it.
    const boardKeyOrder = useMemo(() => {
        const map = new Map();
        boardKeys.forEach((k, i) => {
            const key = String(k).toLowerCase();
            if (!map.has(key)) map.set(key, i);
        });
        return map;
    }, [boardKeys]);
    const scopedRows = useMemo(() => {
        if (boardKeySet.size > 0) {
            return rows.filter((row) => boardKeySet.has(String(row.sportKey || '').toLowerCase()));
        }
        if (familySet.size === 0) return rows;
        return rows.filter((row) => familySet.has(sportFamilyFromKey(row.sportKey).id));
    }, [rows, familySet, boardKeySet]);

    // Two-level grouping: DIVISION (Football, Basketball, …) → LEAGUE CATEGORY
    // ("NFL FUTURES", "NCAAF FUTURES", …) → individual market cards. This mirrors
    // the competitor layout: under the FOOTBALL division sits an "NFL Futures"
    // category, and each future (To Win Super Bowl, MVP, …) is a card under it.
    const groups = useMemo(() => {
        const byFamily = new Map();
        for (const row of scopedRows) {
            const sk = row.sportKey || 'unknown';
            const family = sportFamilyFromKey(sk);
            if (!byFamily.has(family.id)) {
                byFamily.set(family.id, { ...family, categories: new Map() });
            }
            const cats = byFamily.get(family.id).categories;
            const cat = leagueCategoryFromKey(sk, family.label);
            if (!cats.has(cat.id)) {
                cats.set(cat.id, { ...cat, events: [] });
            }
            cats.get(cat.id).events.push(row);
        }

        // Earliest tick index across a set of events; Infinity when the view
        // isn't board-scoped (or a row somehow isn't in the tick map).
        const tickIndexOf = (events) => Math.min(
            ...events.map((e) => {
                const idx = boardKeyOrder.get(String(e.sportKey || '').toLowerCase());
                return idx === undefined ? Infinity : idx;
            }),
        );

        const ordered = [...byFamily.values()].map((fam) => {
            const categories = [...fam.categories.values()];
            if (boardKeyOrder.size > 0) {
                // Board-scoped view: categories follow tick order so two
                // same-sport boards stay adjacent under one sport heading
                // but sit in the order the user picked them.
                categories.sort((a, b) => tickIndexOf(a.events) - tickIndexOf(b.events));
            } else {
                // Categories alphabetical within a division for a stable order.
                categories.sort((a, b) => a.label.localeCompare(b.label));
            }
            return {
                id: fam.id,
                label: fam.label,
                emoji: fam.emoji,
                tickIndex: tickIndexOf(categories.flatMap((c) => c.events)),
                categories,
            };
        });

        if (boardKeyOrder.size > 0) {
            // Owner requirement (2026-07-06): with multiple boards ticked,
            // sport blocks render in FIRST-TICK order, not the fixed
            // priority order — first-ticked board's section on top.
            ordered.sort((a, b) => a.tickIndex - b.tickIndex);
            return ordered;
        }

        // Stable, opinionated division order — major US team sports first,
        // then global/niche. Anything unmapped (e.g. cricket, rugby) falls
        // to the end alphabetically.
        const priority = ['football', 'basketball', 'baseball', 'hockey', 'soccer', 'golf', 'tennis', 'mma', 'boxing'];
        ordered.sort((a, b) => {
            const ai = priority.indexOf(a.id);
            const bi = priority.indexOf(b.id);
            if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
        return ordered;
    }, [scopedRows, boardKeyOrder]);

    const subtitle = useMemo(() => {
        if (sportKey) return sportKey.replace(/_/g, ' ').toUpperCase();
        const divisionCount = groups.length;
        const eventCount = scopedRows.length;
        if (eventCount === 0) return 'Live & Upcoming';
        return `${eventCount} market${eventCount === 1 ? '' : 's'} · ${divisionCount} division${divisionCount === 1 ? '' : 's'}`;
    }, [sportKey, groups.length, scopedRows.length]);

    if (loading) {
        return (
            <main className="dash-main" style={pageStyle}>
                <FuturesHeader title={title} subtitle="Loading…" />
                <div style={infoMessageStyle}>Loading futures…</div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="dash-main" style={pageStyle}>
                <FuturesHeader title={title} subtitle="Error" />
                <div style={{ ...infoMessageStyle, color: '#dc2626' }}>{error}</div>
            </main>
        );
    }

    if (scopedRows.length === 0) {
        return (
            <main className="dash-main" style={pageStyle}>
                <FuturesHeader title={title} subtitle="Nothing posted right now" />
                <div style={emptyStateStyle}>
                    No {families.length > 0 ? `${families.join(' / ')} ` : ''}futures available right now. Check back closer to a tournament.
                </div>
            </main>
        );
    }

    return (
        <main className="dash-main" style={pageStyle}>
            <FuturesHeader title={title} subtitle={subtitle} />
            <div style={{ padding: '12px 12px 24px' }}>
                {groups.map((group) => (
                    <section key={group.id} style={{ marginBottom: 20 }}>
                        {!sportKey && families.length !== 1 && (
                            <div style={divisionHeadingStyle}>
                                <span style={{ fontSize: 16, marginRight: 8 }}>{group.emoji}</span>
                                {group.label}
                            </div>
                        )}
                        {group.categories.map((category) => (
                            <div key={category.id} style={{ marginBottom: 14 }}>
                                <div style={categoryHeadingStyle}>{category.label}</div>
                                {category.events.map((event) => {
                                    const outcomes = extractOutcomes(event.primaryBookmaker);
                                    return (
                                        <article key={event.id || event.eventId} style={cardStyle}>
                                            <header style={cardHeaderStyle}>
                                                <div style={cardTitleStyle}>{event.eventName || event.sportKey}</div>
                                                {/* Bookmaker count is deliberately NOT shown here — it's
                                                    house-internal sourcing detail (admin views keep it). */}
                                                <div style={cardMetaStyle}>
                                                    {formatStartTime(event.commenceTime)}
                                                </div>
                                            </header>
                                            {outcomes.length === 0 ? (
                                                <div style={{ padding: 12, color: '#64748b', fontSize: 12 }}>
                                                    No prices posted yet.
                                                </div>
                                            ) : (
                                                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                                    {outcomes.map((o, i) => (
                                                        <li
                                                            key={`${event.id}-${o.name}-${i}`}
                                                            style={{ borderTop: i === 0 ? 'none' : '1px solid #f1f5f9' }}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => dispatchAddToSlip(event, o)}
                                                                style={outcomeButtonStyle}
                                                            >
                                                                <span style={outcomeNameStyle}>
                                                                    {i < 3 && (
                                                                        <span style={rankBadgeStyle(i)}>{i + 1}</span>
                                                                    )}
                                                                    {o.name}
                                                                </span>
                                                                <span style={oddsPillStyle}>
                                                                    {/* price is AMERICAN (see CONTRACT note up top) — convert to
                                                                        decimal so formatOdds renders the real +450 / 5.50, not +44900. */}
                                                                    {formatOdds(americanToDecimal(o.price), oddsFormat)}
                                                                </span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        ))}
                    </section>
                ))}
            </div>
        </main>
    );
};

/** Orange-banded page header — same architectural feel as the red mobile
 *  sport header (`#ff5051` strip in MobileContentView) but uses the orange
 *  family already present in the app so FUTURES reads as its own section
 *  rather than a regular sport. */
const FuturesHeader = ({ title, subtitle }) => (
    <div style={futuresHeaderStyle}>
        <div style={futuresTitleStyle}>{title}</div>
        {subtitle && <div style={futuresSubtitleStyle}>{subtitle}</div>}
    </div>
);

const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    backgroundColor: '#f4f5f7',
};

const futuresHeaderStyle = {
    padding: '12px 14px',
    backgroundColor: '#ff5051',
    borderBottom: '1px solid #e63a3b',
    flexShrink: 0,
};

const futuresTitleStyle = {
    fontSize: 16,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    lineHeight: 1.2,
};

const futuresSubtitleStyle = {
    fontSize: 11,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: 600,
    marginTop: 3,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
};

const divisionHeadingStyle = {
    fontSize: 13,
    fontWeight: 900,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '6px 10px',
    marginBottom: 10,
    background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
    borderLeft: '4px solid #ff5051',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
};

const categoryHeadingStyle = {
    fontSize: 12,
    fontWeight: 800,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '4px 2px 8px',
    display: 'flex',
    alignItems: 'center',
};

const cardStyle = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    margin: '0 0 10px',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const cardHeaderStyle = {
    padding: '11px 12px',
    borderBottom: '1px solid #e2e8f0',
    background: 'linear-gradient(180deg, #fff7ed 0%, #fff 100%)',
};

const cardTitleStyle = {
    fontWeight: 700,
    fontSize: 14,
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const cardMetaStyle = {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
};

const outcomeButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '11px 12px',
    minHeight: 44,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    font: 'inherit',
};

const outcomeNameStyle = {
    fontSize: 13,
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    marginRight: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
};

const oddsPillStyle = {
    fontSize: 13,
    fontWeight: 800,
    color: '#16a34a',
    minWidth: 60,
    textAlign: 'right',
    flexShrink: 0,
};

const rankBadgeStyle = (i) => {
    const palette = ['#f97316', '#fb923c', '#fdba74'];
    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        borderRadius: 9,
        fontSize: 10,
        fontWeight: 800,
        color: '#fff',
        background: palette[i] || '#cbd5e1',
        flexShrink: 0,
    };
};

const infoMessageStyle = {
    color: '#64748b',
    fontSize: 13,
    padding: '20px 16px',
};

const emptyStateStyle = {
    color: '#64748b',
    fontSize: 13,
    padding: '40px 16px',
    textAlign: 'center',
};

export default React.memo(OutrightsView);
