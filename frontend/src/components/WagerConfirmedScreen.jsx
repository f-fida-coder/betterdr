import React from 'react';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatOdds, formatLineValue, formatSpreadValue, americanToDecimal } from '../utils/odds';
import { isOutrightLeg, outrightMarketLabelForLeg } from '../utils/outrightLabel';
import { getSiteTimezone, getSiteTimezoneLabel } from '../utils/timezone';
import { prettyPlayerMarketLabel, isPlayerPropMarket } from '../utils/propBuilderMarkets';

// 2dp w/ thousands separator. Mirrors the bet-review modal's formatAmount
// so the post-placement Risk/Win tiles match exactly. Integer rounding
// previously made a Win-mode parlay placed for $1000 read as "$169 / $997"
// here even when the modal showed "$169.49 / $1,000.00". Negatives clamp
// to 0 since potentialPayout − risk can briefly be negative for malformed
// records.
const fmtMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0.00';
    const safe = n > 0 ? n : 0;
    return safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtTimestamp = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const tz = getSiteTimezone();
    const formatted = d.toLocaleString('en-US', {
        timeZone: tz,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    return `${formatted} ${getSiteTimezoneLabel(tz)}`;
};

const lineSuffix = (leg) => {
    const market = String(leg?.marketType || '').toLowerCase();
    const label = market === 'spreads'
        ? formatSpreadValue(leg?.point ?? leg?.line, { fallback: '' })
        : formatLineValue(leg?.point ?? leg?.line, { fallback: '' });
    return label ? ` (${label})` : '';
};

// Friendly stat label appended inline for player-prop legs (DISPLAY only):
// "Osuna Over 0.5 Runs Scored". Empty for game markets.
const propMarketSuffix = (leg) => (
    isPlayerPropMarket(leg?.marketType) ? ` ${prettyPlayerMarketLabel(leg?.marketType)}` : ''
);

// Market name appended for outright/futures legs (DISPLAY only):
// "Minnesota Vikings To Win Super Bowl" (PO 2026-07-08 — bare name + odds
// didn't say which future). Empty for every other market, and empty when
// the label can't be resolved so the row falls back to name + odds.
const outrightMarketSuffix = (leg) => {
    if (!isOutrightLeg(leg)) return '';
    const label = outrightMarketLabelForLeg(leg);
    return label ? ` ${label}` : '';
};

// "Line moved" note under a repriced leg. Booking auto-accepts favorable
// moves and small in-band adverse moves, placing at the official current
// price; when that happened the leg carries the audit-only
// clientOddsAmerican (the slip's price at submit). Surfacing the move here
// is what keeps the receipt from silently disagreeing with the slip the
// player just saw. Green when the booked price pays more, muted otherwise
// (an in-band move is routine, not an error).
const LegPriceMovedNote = ({ leg, oddsFormat }) => {
    const clientAm = Number(leg?.clientOddsAmerican);
    const bookedAm = Number(leg?.oddsAmerican);
    if (!Number.isFinite(clientAm) || clientAm === 0 || clientAm === bookedAm) return null;
    const clientDec = americanToDecimal(clientAm);
    const bookedDec = Number(leg?.odds) > 1 ? Number(leg.odds) : americanToDecimal(bookedAm);
    if (!clientDec || !bookedDec) return null;
    const improved = bookedDec >= clientDec;
    return (
        <div style={{ fontSize: 11, marginTop: 2, fontWeight: 700, color: improved ? '#16a34a' : '#64748b' }}>
            {improved ? 'Price improved' : 'Line moved'}: {formatOdds(clientDec, oddsFormat)} → {formatOdds(bookedDec, oddsFormat)}
        </div>
    );
};

const matchTitle = (leg) => {
    const home = leg?.matchSnapshot?.homeTeamFull || leg?.matchSnapshot?.homeTeam || leg?.match?.homeTeamFull || leg?.match?.homeTeam;
    const away = leg?.matchSnapshot?.awayTeamFull || leg?.matchSnapshot?.awayTeam || leg?.match?.awayTeamFull || leg?.match?.awayTeam;
    if (home && away) return `${away} @ ${home}`;
    return leg?.matchName || '';
};

const matchStartTime = (leg) => {
    const iso = leg?.matchSnapshot?.startTime || leg?.match?.startTime || leg?.startTime;
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const tz = getSiteTimezone();
    const formatted = d.toLocaleString('en-US', {
        timeZone: tz,
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    return `${formatted} ${getSiteTimezoneLabel(tz)}`;
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
                        const win = Math.max(0, Number(bet?.potentialPayout ?? 0) - risk);
                        const odds = bet?.combinedOdds ?? bet?.odds;
                        const selections = Array.isArray(bet?.selections) ? bet.selections : [];
                        const summaryLines = String(bet?.description || '').split('\n').filter(Boolean);
                        const placedAt = fmtTimestamp(bet?.createdAt);
                        const betType = String(bet?.type || 'straight').replace(/_/g, ' ').toUpperCase();
                        const usedFreeplay = bet?.isFreeplay === true || isFreeplay;

                        // Calculate breakdown
                        const fpRaw = Number(bet?.freeplayAmountUsed ?? 0);
                        let fpUsed = Number.isFinite(fpRaw) && fpRaw > 0 ? Math.min(fpRaw, risk) : 0;
                        if (fpUsed === 0 && bet?.isFreeplay === true && risk > 0) {
                            fpUsed = risk;
                        }
                        const cashRisk = Math.max(0, risk - fpUsed);
                        let breakdownText = '';
                        if (fpUsed > 0 && cashRisk > 0) {
                            breakdownText = `$${fpUsed.toFixed(2)} freeplay, $${cashRisk.toFixed(2)} credit used`;
                        } else if (fpUsed > 0) {
                            breakdownText = `$${fpUsed.toFixed(2)} freeplay used`;
                        } else {
                            breakdownText = `$${cashRisk.toFixed(2)} credit used`;
                        }

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

                                {/* Freeplay/Credit breakdown row */}
                                <div style={{ fontSize: 12, color: '#0f172a', marginBottom: 8, marginTop: -4 }}>
                                    <strong>Stake Breakdown:</strong> {breakdownText}
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
                                                    {leg.selection || '-'}{propMarketSuffix(leg)}{outrightMarketSuffix(leg)}{lineSuffix(leg)}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                                    {matchTitle(leg) || (leg.matchId || '')}
                                                </div>
                                                {matchStartTime(leg) && (
                                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                                        <i className="fa-regular fa-clock" style={{ marginRight: 4 }} />
                                                        {matchStartTime(leg)}
                                                    </div>
                                                )}
                                                <LegPriceMovedNote leg={leg} oddsFormat={oddsFormat} />
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
