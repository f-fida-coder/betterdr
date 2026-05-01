import React from 'react';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatOdds, formatLineValue } from '../utils/odds';

const fmtMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return Math.floor(n).toLocaleString();
};

const fmtTimestamp = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const lineSuffix = (leg) => {
    const market = String(leg?.marketType || '').toLowerCase();
    const signed = market === 'spreads';
    const label = formatLineValue(leg?.point ?? leg?.line, { signed, fallback: '' });
    return label ? ` (${label})` : '';
};

const matchTitle = (leg) => {
    const home = leg?.matchSnapshot?.homeTeam || leg?.match?.homeTeam;
    const away = leg?.matchSnapshot?.awayTeam || leg?.match?.awayTeam;
    if (home && away) return `${away} @ ${home}`;
    return leg?.matchName || '';
};

/**
 * Post-placement confirmation screen. Modeled on the reference UI: green
 * "Wager Confirmed" banner, ticket details with risk + win headline tiles,
 * highlighted ticket id, and a three-button action row (Pending / Main
 * Menu / Continue). Renders for one OR many bets (straight mode places N
 * separate tickets in one tap — we list them all so the user has receipts
 * for every leg).
 */
const WagerConfirmedScreen = ({
    open,
    bets = [],
    isFreeplay = false,
    onPending,
    onMainMenu,
    onContinue,
}) => {
    const { oddsFormat } = useOddsFormat();
    if (!open || bets.length === 0) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Wager Confirmed"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2200,
                background: 'rgba(15,23,42,0.55)',
                backdropFilter: 'blur(2px)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                overflowY: 'auto',
                padding: '12px 12px calc(24px + env(safe-area-inset-bottom, 0px))',
            }}
        >
            <div
                style={{
                    background: '#fff',
                    width: '100%',
                    maxWidth: 480,
                    borderRadius: 14,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Down chevron handle — visual cue that the sheet can be
                    dismissed with Continue/Main Menu. Pure decoration. */}
                <button
                    type="button"
                    onClick={onContinue}
                    aria-label="Close confirmation"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '8px 0 0',
                        cursor: 'pointer',
                        color: '#9ca3af',
                    }}
                >
                    <i className="fa-solid fa-chevron-down" />
                </button>

                <div
                    style={{
                        background: '#15803d',
                        color: '#fff',
                        textAlign: 'center',
                        padding: '14px 16px',
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        fontSize: 16,
                        margin: '8px 12px 0',
                        borderRadius: 6,
                    }}
                >
                    Bet Confirmed
                </div>

                <div style={{ padding: '12px 16px 16px' }}>
                    {bets.map((bet, idx) => {
                        const ticketId = bet?.ticketId || bet?.id || '';
                        const risk = Number(bet?.riskAmount ?? bet?.amount ?? 0);
                        // Credit-based "Win" = profit only (the amount credited
                        // on settlement). potentialPayout is gross (risk + profit),
                        // which would mislead a credit-line player into thinking
                        // their available balance grows by the full payout on win.
                        const win = Math.max(0, Number(bet?.potentialPayout ?? 0) - risk);
                        const odds = bet?.combinedOdds ?? bet?.odds;
                        const selections = Array.isArray(bet?.selections) ? bet.selections : [];
                        const summaryLines = String(bet?.description || '').split('\n').filter(Boolean);
                        const placedAt = fmtTimestamp(bet?.createdAt);
                        const betType = String(bet?.type || 'straight').replace(/_/g, ' ').toUpperCase();
                        const usedFreeplay = bet?.isFreeplay === true || isFreeplay;

                        return (
                            <div
                                key={ticketId || idx}
                                style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 10,
                                    padding: 14,
                                    marginTop: idx === 0 ? 0 : 12,
                                    background: '#fff',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', letterSpacing: 0.4 }}>
                                        {betType}
                                        {usedFreeplay && (
                                            <span style={{
                                                marginLeft: 8,
                                                background: '#dcfce7',
                                                color: '#15803d',
                                                fontSize: 10,
                                                fontWeight: 800,
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                letterSpacing: 0.5,
                                            }}>FREEPLAY</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>{placedAt}</div>
                                </div>

                                {/* Per-leg lines. Falls back to the joined
                                    description line when the response only
                                    carries the description string (rare but
                                    possible for replay paths). */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                                    {selections.length > 0 ? selections.map((leg, j) => (
                                        <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
                                            <i className="fa-solid fa-circle-check" style={{ color: '#16a34a', marginTop: 3, fontSize: 11 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>
                                                    {leg.selection || '-'}{lineSuffix(leg)}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                                    {matchTitle(leg) || (leg.matchId || '')}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                {formatOdds(leg.odds, oddsFormat)}
                                            </div>
                                        </div>
                                    )) : summaryLines.map((line, j) => (
                                        <div key={j} style={{ fontSize: 13, color: '#0f172a' }}>{line}</div>
                                    ))}
                                </div>

                                {/* Risk + Win headline tiles. Mimics the
                                    reference design — slate label header,
                                    big number underneath, side-by-side. */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                                    <div>
                                        <div style={{ background: '#475569', color: '#fff', textAlign: 'center', padding: '6px 0', fontSize: 12, fontWeight: 700 }}>
                                            Risk
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                                            {fmtMoney(risk)}
                                        </div>
                                    </div>
                                    <div style={{ borderLeft: '1px solid #e5e7eb' }}>
                                        <div style={{ background: '#15803d', color: '#fff', textAlign: 'center', padding: '6px 0', fontSize: 12, fontWeight: 700 }}>
                                            Win
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                                            {fmtMoney(win)}
                                        </div>
                                    </div>
                                </div>

                                {/* Combined odds — subtle row beneath the
                                    Risk/Win tiles so the user can see the
                                    rate they got at without it competing
                                    with the headline numbers. */}
                                {odds ? (
                                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                                        <span>Combined Odds</span>
                                        <strong style={{ color: '#0f172a' }}>{formatOdds(odds, oddsFormat)}</strong>
                                    </div>
                                ) : null}

                                {/* Highlighted ticket id — copyable selector
                                    so the user can paste it into a support
                                    ticket if they ever need to dispute. */}
                                {ticketId && (
                                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            background: '#fef08a',
                                            padding: '6px 12px',
                                            borderRadius: 4,
                                            fontWeight: 700,
                                            fontSize: 13,
                                            color: '#0f172a',
                                            userSelect: 'all',
                                        }}>
                                            Ticket: {ticketId}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Action row — fixed three-button layout matching the
                        reference. Pending = jump to ticket center filtered
                        on this user's pending bets. Main Menu = close back
                        to the odds board. Continue = clear slip but stay
                        in betslip context for follow-up wagers. */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: 6,
                        marginTop: 14,
                    }}>
                        <button
                            type="button"
                            onClick={onPending}
                            style={{
                                background: '#475569',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                padding: '12px 0',
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            Pending
                        </button>
                        <button
                            type="button"
                            onClick={onMainMenu}
                            style={{
                                background: '#475569',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                padding: '12px 0',
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            Main Menu
                        </button>
                        <button
                            type="button"
                            onClick={onContinue}
                            style={{
                                background: '#15803d',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                padding: '12px 0',
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WagerConfirmedScreen;
