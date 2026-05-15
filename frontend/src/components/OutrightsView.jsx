import React, { useEffect, useMemo, useState } from 'react';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatOdds } from '../utils/odds';
import { getOutrights } from '../api';

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
        odds: outcome.price,
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
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Map an odds-api sport key (e.g. `americanfootball_ncaaf_championship_winner`,
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
const OutrightsView = ({ sportKey = '', title = 'Futures' }) => {
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

    // Group rows by sport DIVISION (Football, Baseball, Basketball, …),
    // not by raw odds-api sport key. Two NFL + NCAAF futures should sit
    // under one "FOOTBALL" heading; NBA + WNBA under "BASKETBALL"; the
    // three golf majors under "GOLF"; etc.
    const groups = useMemo(() => {
        const byFamily = new Map();
        for (const row of rows) {
            const sk = row.sportKey || 'unknown';
            const family = sportFamilyFromKey(sk);
            if (!byFamily.has(family.id)) {
                byFamily.set(family.id, { ...family, events: [] });
            }
            byFamily.get(family.id).events.push(row);
        }
        const ordered = [...byFamily.values()];
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
    }, [rows]);

    const subtitle = useMemo(() => {
        if (sportKey) return sportKey.replace(/_/g, ' ').toUpperCase();
        const divisionCount = groups.length;
        const eventCount = rows.length;
        if (eventCount === 0) return 'Live & Upcoming';
        return `${eventCount} market${eventCount === 1 ? '' : 's'} · ${divisionCount} division${divisionCount === 1 ? '' : 's'}`;
    }, [sportKey, groups.length, rows.length]);

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

    if (rows.length === 0) {
        return (
            <main className="dash-main" style={pageStyle}>
                <FuturesHeader title={title} subtitle="Nothing posted right now" />
                <div style={emptyStateStyle}>
                    No futures available right now. Check back closer to a tournament.
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
                        {!sportKey && (
                            <div style={divisionHeadingStyle}>
                                <span style={{ fontSize: 16, marginRight: 8 }}>{group.emoji}</span>
                                {group.label}
                            </div>
                        )}
                        {group.events.map((event) => {
                            const outcomes = extractOutcomes(event.primaryBookmaker);
                            return (
                                <article key={event.id || event.eventId} style={cardStyle}>
                                    <header style={cardHeaderStyle}>
                                        <div style={cardTitleStyle}>{event.eventName || event.sportKey}</div>
                                        <div style={cardMetaStyle}>
                                            {formatStartTime(event.commenceTime)}
                                            {event.bookmakerCount > 0 && (
                                                <span style={{ marginLeft: 8 }}>
                                                    {event.bookmakerCount} book{event.bookmakerCount === 1 ? '' : 's'}
                                                </span>
                                            )}
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
                                                            {formatOdds(o.price, oddsFormat)}
                                                        </span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </article>
                            );
                        })}
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
