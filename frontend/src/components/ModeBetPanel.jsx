import React, { useMemo, useState, useEffect, useRef } from 'react';
import { placeBet, normalizeBetMode, createRequestId } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatOdds } from '../utils/odds';
import BetConfirmationModal from './BetConfirmationModal';

// Minimal structural fallbacks — NO hardcoded multipliers.
// Real values always come from rulesByMode (loaded from DB via /api/betting/rules).
const DEFAULT_RULES = {
    // Straight isn't a single-leg limit — each selection is a separate
    // independent wager. Cap at 12 matches parlay for consistency.
    straight: { minLegs: 1, maxLegs: 12, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
    parlay:   { minLegs: 2, maxLegs: 12, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
    teaser:   { minLegs: 2, maxLegs: 6,  teaserPointOptions: [], payoutProfile: { type: 'table_multiplier', multipliers: {} } },
    if_bet:   { minLegs: 2, maxLegs: 2,  teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
    reverse:  { minLegs: 2, maxLegs: 2,  teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
};

const MODE_TABS = [
    { id: 'straight', label: 'STRAIGHT', icon: 'S' },
    { id: 'parlay', label: 'PARLAY', icon: 'P' },
    { id: 'teaser', label: 'TEASER', icon: 'T' },
    { id: 'if_bet', label: 'IF BET', icon: 'I' },
    { id: 'reverse', label: 'REVERSE', icon: 'R' }
];

const formatAmount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? String(Math.round(n)) : '0';
};

const getTeaserMultiplier = (rule, legCount) => {
    const raw = rule?.payoutProfile?.multipliers?.[String(legCount)];
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const MARKET_LABELS = {
    h2h: 'Moneyline',
    spreads: 'Spread',
    totals: 'Total',
    straight: 'Straight',
};
const marketLabelFor = (marketType = '', fallback = '') => {
    const key = String(marketType || '').toLowerCase();
    if (MARKET_LABELS[key]) return MARKET_LABELS[key];
    return fallback ? String(fallback).toUpperCase() : (key.toUpperCase() || 'BET');
};

const legLabelFor = (mode, index, total) => {
    if (total < 2) return null;
    if (mode === 'if_bet') return index === 0 ? 'Leg 1 (Primary)' : index === 1 ? 'Leg 2 (If Win)' : null;
    if (mode === 'reverse') return index === 0 ? 'Leg A' : index === 1 ? 'Leg B (Reverses)' : null;
    return null;
};

const QUICK_STAKES = [10, 25, 50, 100];

// Bet/Risk/Win mode toggle. `bet` and `risk` behave identically — the
// entered amount is the stake; `win` flips the meaning so the entered
// amount is the desired payout and the stake gets back-calculated from
// the odds.
const STAKE_MODES = [
    { id: 'bet', label: 'Bet' },
    { id: 'risk', label: 'Risk' },
    { id: 'win', label: 'Win' },
];

// Risk ↔ Win conversion using DECIMAL odds (the storage format the app
// uses everywhere internally — odds in selections are always >1, with
// the display layer converting to American only for rendering). For a
// decimal price D: Win = Risk × (D − 1), Risk = Win / (D − 1). Returns
// 0 (not NaN) on invalid input so the read-only readouts don't flash
// "NaN" while the user is mid-typing or while a leg awaits price.
const resolveStake = (mode, amount, decimalOdds) => {
    const amt = Number(amount);
    const safeAmt = Number.isFinite(amt) && amt > 0 ? amt : 0;
    const d = Number(decimalOdds);
    const validOdds = Number.isFinite(d) && d > 1;
    if (mode === 'win') {
        const risk = validOdds && safeAmt > 0 ? safeAmt / (d - 1) : 0;
        return { risk, win: safeAmt };
    }
    // 'bet' and 'risk' both treat amount as the stake.
    const win = validOdds && safeAmt > 0 ? safeAmt * (d - 1) : 0;
    return { risk: safeAmt, win };
};

const formatMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return '0.00';
    return (Math.round(n * 100) / 100).toFixed(2);
};

const ModeBetPanel = ({
    user,
    balance = 0,
    availableBalance = null,
    freeplayBalance = 0,
    freeplayExpiresAt = null,
    mode,
    onModeChange,
    selections,
    onSelectionsChange,
    wager,
    onWagerChange,
    teaserPoints,
    onTeaserPointsChange,
    rulesByMode,
    onBetPlaced
}) => {
    const { showToast } = useToast();
    const { oddsFormat } = useOddsFormat();
    const [message, setMessage] = useState(null);
    const [placing, setPlacing] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [useFreeplay, setUseFreeplay] = useState(false);
    // Single shared Bet/Risk/Win mode for the whole slip. The `wager`
    // value (driven by onWagerChange) is the user-typed Bet Amount in
    // their chosen mode; per-leg Risk/Win is back-calculated from each
    // leg's odds at render-time (see resolveStake helper). Replaces the
    // old per-selection wager map — there's now exactly one input.
    const [stakeMode, setStakeMode] = useState('risk');
    const requestStateRef = useRef({ requestId: '', signature: '' });
    const submissionLockRef = useRef(false);

    const parsedFreeplayBalance = Number.isFinite(Number(freeplayBalance)) ? Number(freeplayBalance) : 0;
    const hasFreeplay = parsedFreeplayBalance > 0;
    const freeplayExpiryLabel = (() => {
        if (!freeplayExpiresAt || !hasFreeplay) return null;
        const ts = typeof freeplayExpiresAt === 'number' ? freeplayExpiresAt * 1000 : Date.parse(freeplayExpiresAt);
        if (!Number.isFinite(ts)) return null;
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    })();

    useEffect(() => {
        const media = window.matchMedia('(max-width: 768px)');
        const sync = () => setIsMobile(media.matches);
        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

    const normalizedMode = normalizeBetMode(mode);
    const rule = rulesByMode[normalizedMode] || DEFAULT_RULES[normalizedMode] || DEFAULT_RULES.straight;
    const legCount = selections.length;
    // Raw user-typed amount in the shared Bet Amount input. Always parsed
    // as a number for arithmetic but kept untouched in `wager` so React
    // doesn't fight the user mid-typing ("10.", "1.5", etc.).
    const wagerAmount = Number(wager);
    const teaserPointValue = Number(teaserPoints || 0);
    const teaserValid = normalizedMode !== 'teaser'
        || !Array.isArray(rule.teaserPointOptions)
        || rule.teaserPointOptions.length === 0
        || rule.teaserPointOptions.includes(teaserPointValue);

    // Combined decimal odds the ticket pays at, by mode. Used to convert
    // a Win-mode shared input into the actual Risk amount the backend
    // receives for combined modes (parlay / teaser / if_bet / reverse).
    const ticketDecimalOdds = useMemo(() => {
        if (!legCount) return null;
        if (normalizedMode === 'straight') {
            const n = Number(selections[0]?.odds || 0);
            return n > 0 ? n : null;
        }
        if (normalizedMode === 'parlay') {
            return selections.reduce((acc, sel) => acc * Number(sel.odds || 1), 1);
        }
        if (normalizedMode === 'if_bet' || normalizedMode === 'reverse') {
            const firstTwo = selections.slice(0, 2);
            if (firstTwo.length < 2) return null;
            return firstTwo.reduce((acc, sel) => acc * Number(sel.odds || 1), 1);
        }
        return null;
    }, [normalizedMode, selections, legCount]);

    // Resolve the single shared (mode, amount) input into a per-leg
    // {risk, win} pair using that leg's own decimal odds. The card
    // readouts call this directly — the user's spec says each card
    // shows Risk/Win based on its own odds, regardless of bet type.
    const stakePairForSelection = React.useCallback((sel) => {
        return resolveStake(stakeMode, wager, sel?.odds);
    }, [stakeMode, wager]);

    // Per-leg Risk amount that's actually staked on a straight leg.
    // For combined modes this returns 0 because there's only ONE bet
    // (using `effectiveCombinedRisk` below), not N independent stakes.
    const wagerForSelection = React.useCallback((sel) => {
        if (normalizedMode !== 'straight') return 0;
        const { risk } = stakePairForSelection(sel);
        return Number.isFinite(risk) && risk > 0 ? risk : 0;
    }, [normalizedMode, stakePairForSelection]);

    const straightTotalRisk = useMemo(() => {
        if (normalizedMode !== 'straight') return 0;
        return selections.reduce((acc, sel) => acc + wagerForSelection(sel), 0);
    }, [normalizedMode, selections, wagerForSelection]);
    const hasAnyStraightAmount = normalizedMode === 'straight' && straightTotalRisk > 0;

    // Combined-mode resolved Risk: the actual stake the backend sees
    // after Bet/Risk/Win mode conversion against the ticket's combined
    // decimal odds. `bet` and `risk` pass straight through; `win` flips
    // the user-typed amount from "I want to win this much" into the
    // back-calculated Risk that produces that profit.
    const effectiveCombinedRisk = useMemo(() => {
        if (normalizedMode === 'straight') return 0;
        const { risk } = resolveStake(stakeMode, wagerAmount, ticketDecimalOdds);
        return Number.isFinite(risk) && risk > 0 ? risk : 0;
    }, [normalizedMode, stakeMode, wagerAmount, ticketDecimalOdds]);

    const validationErrors = useMemo(() => {
        const errors = [];
        if (legCount < rule.minLegs || legCount > rule.maxLegs) {
            errors.push(`${MODE_TABS.find(t => t.id === normalizedMode)?.label || 'MODE'} requires ${rule.minLegs === rule.maxLegs ? rule.minLegs : `${rule.minLegs}-${rule.maxLegs}`} selections`);
        }
        if (normalizedMode === 'straight') {
            // Valid when at least one leg has a positive stake. Zero-stake
            // legs are silently skipped at submit time, not surfaced as a
            // blocker, so the user can stake just some of the slip.
            if (!hasAnyStraightAmount) {
                errors.push('Enter a stake on at least one selection');
            }
        } else if (effectiveCombinedRisk <= 0) {
            errors.push('Enter a valid wager amount');
        }
        if (!teaserValid) {
            errors.push(`Select teaser points: ${rule.teaserPointOptions.join(', ')}`);
        }
        if (!selections.every(sel => Number.isFinite(Number(sel.odds)) && Number(sel.odds) > 0)) {
            errors.push('One or more selections have invalid odds');
        }
        return errors;
    }, [legCount, normalizedMode, rule, selections, effectiveCombinedRisk, teaserValid, hasAnyStraightAmount]);

    const ticketSignature = useMemo(() => JSON.stringify({
        type: normalizedMode,
        amount: Number.isFinite(effectiveCombinedRisk) ? Math.round(effectiveCombinedRisk) : null,
        teaserPoints: normalizedMode === 'teaser' ? Math.round(teaserPointValue) : 0,
        selections: selections.map((sel) => ({
            matchId: String(sel?.matchId || ''),
            selection: String(sel?.selection || ''),
            marketType: String(sel?.marketType || ''),
            odds: Number.isFinite(Number(sel?.odds)) ? Number(Number(sel.odds).toFixed(4)) : null,
        })),
    }), [normalizedMode, selections, teaserPointValue, effectiveCombinedRisk]);

    const potentialPayout = useMemo(() => {
        if (legCount === 0) return 0;

        if (normalizedMode === 'straight') {
            // Each leg is its own bet of `wagerForSelection(sel)`, so the
            // max possible payout is the sum of each leg's (stake × odds).
            return selections.reduce((acc, sel) => acc + (wagerForSelection(sel) * Number(sel.odds || 0)), 0);
        }
        if (effectiveCombinedRisk <= 0) return 0;
        if (normalizedMode === 'parlay') {
            const combined = selections.reduce((acc, sel) => acc * Number(sel.odds || 1), 1);
            return effectiveCombinedRisk * combined;
        }
        if (normalizedMode === 'teaser') {
            return effectiveCombinedRisk * getTeaserMultiplier(rule, legCount);
        }
        if (normalizedMode === 'if_bet') {
            const firstTwo = selections.slice(0, 2).reduce((acc, sel) => acc * Number(sel.odds || 1), 1);
            return effectiveCombinedRisk * firstTwo;
        }
        if (normalizedMode === 'reverse') {
            const firstTwo = selections.slice(0, 2).reduce((acc, sel) => acc * Number(sel.odds || 1), 1);
            return effectiveCombinedRisk * firstTwo * 2;
        }
        return 0;
    }, [effectiveCombinedRisk, legCount, normalizedMode, selections, rule, wagerForSelection]);

    const impliedProbability = useMemo(() => {
        if (!Number.isFinite(ticketDecimalOdds) || ticketDecimalOdds <= 1) return null;
        return (1 / ticketDecimalOdds) * 100;
    }, [ticketDecimalOdds]);

    const totalRisk = normalizedMode === 'reverse'
        ? effectiveCombinedRisk * 2
        : normalizedMode === 'straight'
            ? straightTotalRisk
            : effectiveCombinedRisk;
    const rawAvailableBalance = availableBalance !== null && availableBalance !== undefined
        ? availableBalance
        : balance;
    const parsedAvailableBalance = Number(rawAvailableBalance);
    const effectiveAvailableBalance = useFreeplay
        ? parsedFreeplayBalance
        : (Number.isFinite(parsedAvailableBalance) ? parsedAvailableBalance : 0);
    const canPlace = validationErrors.length === 0 && !placing;
    const hasSelections = legCount > 0;
    const [isOpen, setIsOpen] = useState(false);

    // External open signal (fired by the Betslip button in DashboardHeader).
    // Using an event keeps this component's state encapsulated so the
    // header doesn't need to lift `isOpen` through App → Shell → here.
    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('betslip:open', handleOpen);
        return () => window.removeEventListener('betslip:open', handleOpen);
    }, []);

    const removeSelection = (id) => {
        onSelectionsChange(selections.filter(sel => sel.id !== id));
    };

    const clearSlip = () => {
        onSelectionsChange([]);
        onWagerChange('');
        setStakeMode('risk');
        setMessage(null);
        setSubmitAttempted(false);
        setUseFreeplay(false);
        requestStateRef.current = { requestId: '', signature: '' };
    };

    const getRequestIdForTicket = () => {
        if (
            requestStateRef.current.requestId
            && requestStateRef.current.signature === ticketSignature
        ) {
            return requestStateRef.current.requestId;
        }

        const requestId = createRequestId();
        requestStateRef.current = {
            requestId,
            signature: ticketSignature,
        };
        return requestId;
    };

    const handlePlaceBet = async () => {
        if (placing || submissionLockRef.current) {
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            setSubmitAttempted(true);
            setMessage({ type: 'error', text: 'Please login to place bets' });
            showToast('Please login to place bets', 'error');
            return;
        }
        setSubmitAttempted(true);
        if (!canPlace) {
            if (validationErrors.length > 0) {
                showToast(validationErrors[0], 'warning');
            }
            return;
        }
        if (totalRisk > effectiveAvailableBalance) {
            const msg = 'Insufficient balance for this bet.';
            setMessage({ type: 'error', text: msg });
            showToast(msg, 'error');
            return;
        }
        setShowConfirm(true);
    };

    const executePlaceBet = async () => {
        if (submissionLockRef.current) {
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Please login to place bets', 'error');
            setShowConfirm(false);
            return;
        }

        const useFp = useFreeplay && hasFreeplay;

        try {
            submissionLockRef.current = true;
            setPlacing(true);
            setShowConfirm(false);

            if (normalizedMode === 'straight') {
                // Straight = N independent wagers of `wagerAmount` each.
                // Backend expects one request per leg. We submit sequentially
                // so a mid-batch failure stops immediately and reports which
                // legs succeeded, instead of optimistically charging for
                // bets that never landed.
                const placed = [];
                const failed = [];
                // Only submit legs with a positive stake — zero-stake legs
                // stay in the slip as untouched so the user can come back
                // to them without re-adding.
                const legsToSubmit = selections
                    .map((sel) => ({ sel, amount: wagerForSelection(sel) }))
                    .filter(({ amount }) => amount > 0);
                for (const { sel, amount } of legsToSubmit) {
                    const payload = {
                        type: 'straight',
                        amount,
                        teaserPoints: 0,
                        useFreeplay: useFp,
                        selections: [{
                            matchId: sel.matchId,
                            selection: sel.selection,
                            odds: Number(sel.odds),
                            type: sel.marketType || 'h2h',
                            marketType: sel.marketType || 'h2h',
                        }],
                        // Legacy top-level mirror for older backend path.
                        matchId: sel.matchId,
                        selection: sel.selection,
                        odds: Number(sel.odds),
                        marketType: sel.marketType || 'h2h',
                    };
                    // Fresh request id per leg so idempotency tracking on the
                    // backend doesn't collapse them into one bet.
                    const requestId = createRequestId();
                    try {
                        // eslint-disable-next-line no-await-in-loop
                        await placeBet(payload, token, { requestId });
                        placed.push(sel);
                    } catch (err) {
                        failed.push({ sel, err });
                        break;
                    }
                }

                requestStateRef.current = { requestId: '', signature: '' };

                if (failed.length === 0) {
                    const text = placed.length === 1
                        ? 'Bet placed successfully'
                        : `${placed.length} straight bets placed`;
                    setMessage({ type: 'success', text });
                    showToast(text, 'success');
                    clearSlip();
                    window.dispatchEvent(new Event('user:refresh'));
                    if (onBetPlaced) onBetPlaced();
                } else {
                    const firstErr = failed[0].err;
                    const errorText = firstErr?.message || 'Failed to place some bets';
                    const partialSummary = placed.length > 0
                        ? ` (${placed.length} of ${selections.length} placed first)`
                        : '';
                    setMessage({ type: 'error', text: errorText + partialSummary });
                    showToast(errorText + partialSummary, 'error');
                    // Drop the successfully-placed legs so the user can retry
                    // only the remaining ones instead of double-charging.
                    if (placed.length > 0) {
                        const placedIds = new Set(placed.map((s) => s.id));
                        onSelectionsChange(selections.filter((s) => !placedIds.has(s.id)));
                    }
                    window.dispatchEvent(new Event('user:refresh'));
                }
                return;
            }

            // Non-straight modes: single request carrying all legs.
            // The backend wants the actual Risk amount; if the user typed
            // in Win mode we already converted to Risk via resolveStake
            // against the ticket's combined decimal odds.
            const payload = {
                type: normalizedMode,
                amount: effectiveCombinedRisk,
                teaserPoints: normalizedMode === 'teaser' ? teaserPointValue : 0,
                useFreeplay: useFp,
                selections: selections.map((sel) => ({
                    matchId: sel.matchId,
                    selection: sel.selection,
                    odds: Number(sel.odds),
                    type: sel.marketType || 'straight',
                })),
            };

            const requestId = getRequestIdForTicket();
            const result = await placeBet(payload, token, { requestId });
            const successText = result?.message || 'Bet placed successfully';
            requestStateRef.current = { requestId: '', signature: '' };
            setMessage({ type: 'success', text: successText });
            showToast(successText, 'success');
            clearSlip();
            window.dispatchEvent(new Event('user:refresh'));
            if (onBetPlaced) onBetPlaced();
        } catch (error) {
            const blockingCodes = ['REQUEST_ID_REQUIRED', 'REQUEST_ID_REUSED'];
            if (blockingCodes.includes(String(error?.code || ''))) {
                requestStateRef.current = { requestId: '', signature: '' };
            }
            const errorText = error.message || 'Failed to place bet';
            setMessage({ type: 'error', text: errorText });
            showToast(errorText, 'error');
        } finally {
            submissionLockRef.current = false;
            setPlacing(false);
        }
    };

    // Mobile: full-screen panel that starts BELOW the dark header (~64px
    // for the 5-cell mh row) AND the bet-mode tabs row (~60px). Total ~124px
    // top-offset keeps the SPORT/MENU/Balance/Account row + STRAIGHT/PARLAY/
    // TEASER/IF BET/REVERSE row visible on top while the slip takes over the
    // rest of the screen — that way the user can switch bet mode (parent
    // tabs) without ever leaving the slip, which is exactly what made the
    // in-slip mode dropdown redundant.
    const containerStyle = isMobile
        ? {
            position: 'fixed',
            left: 0,
            right: 0,
            top: 124,
            bottom: 0,
            zIndex: 1200,
            borderRadius: 0,
        }
        : {
            position: 'fixed',
            right: 16,
            top: 150,
            width: 360,
            maxHeight: 'calc(100vh - 170px)',
            zIndex: 1200,
            borderRadius: 14
        };

    if (!isOpen) {
        // Mobile has a betslip button in the header (DashboardHeader). Rendering
        // the floating FAB too would be two triggers for the same panel.
        if (isMobile) return null;
        return (
            <button
                onClick={() => setIsOpen(true)}
                title="Open Bet Panel"
                style={{
                    position: 'fixed',
                    right: 18,
                    bottom: 18,
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#0f5db3',
                    color: '#fff',
                    zIndex: 1200,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.28)',
                    cursor: 'pointer',
                    fontSize: 22,
                    fontWeight: 900
                }}
            >
                <i className="fa-solid fa-ticket"></i>
            </button>
        );
    }

    // Visual tokens — centralised so colours/radii stay consistent across
    // the rebuilt sections below. Keeping them local avoids bloating a
    // global theme file just for this panel.
    const palette = {
        panelBg: '#f5f7fb',
        panelBorder: 'rgba(15,23,42,0.08)',
        headerBg: '#0f172a',
        accent: '#1e40af',
        accentSoft: '#dbeafe',
        cardBg: '#ffffff',
        cardBorder: '#e5e7eb',
        textPrimary: '#0f172a',
        textMuted: '#64748b',
        textFaint: '#94a3b8',
        success: '#16a34a',
        successSoft: '#dcfce7',
        danger: '#dc2626',
        dangerSoft: '#fee2e2',
        warn: '#b45309',
        warnSoft: '#fffbeb',
        warnBorder: '#fde68a',
    };
    const MARKET_TINT = {
        spreads: { bg: '#eff6ff', color: '#1d4ed8' },
        h2h: { bg: '#ecfdf5', color: '#047857' },
        totals: { bg: '#faf5ff', color: '#7e22ce' },
        default: { bg: '#f1f5f9', color: '#334155' },
    };
    const tintForMarket = (key) => {
        const k = String(key || '').toLowerCase().split('_')[0];
        return MARKET_TINT[k] || MARKET_TINT.default;
    };
    const formatOddsSign = (val) => {
        const num = Number(val);
        if (!Number.isFinite(num)) return formatOdds(val, oddsFormat);
        const formatted = formatOdds(val, oddsFormat);
        // formatOdds already handles american/decimal formatting; here we
        // just need to know which colour to use for display.
        return formatted;
    };
    const oddsColour = (val) => {
        if (oddsFormat !== 'american') return palette.textPrimary;
        const num = Number(val);
        if (!Number.isFinite(num)) return palette.textPrimary;
        // American: positive = underdog (green), negative = favourite (dark)
        return num > 0 ? palette.success : palette.textPrimary;
    };

    return (
        <div style={{
            ...containerStyle,
            display: 'flex',
            flexDirection: 'column',
            background: palette.panelBg,
            border: `1px solid ${palette.panelBorder}`,
            overflow: 'hidden',
            boxShadow: '0 20px 50px -20px rgba(15,23,42,0.35)',
            borderRadius: isMobile ? 0 : 14,
        }}>
            {/* Title bar */}
            <div style={{
                background: palette.headerBg,
                color: '#fff',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                    }}>
                        <i className="fa-solid fa-ticket" />
                    </div>
                    <div style={{ lineHeight: 1.1 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>BETSLIP</div>
                        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                            {legCount === 0 ? 'No selections yet' : `${legCount} selection${legCount === 1 ? '' : 's'}`}
                        </div>
                    </div>
                </div>
                {/* Close-by-chevron retained on desktop only — on mobile
                    the yellow Back button right below this row already
                    handles dismiss, and a second chevron next to it was
                    pure visual clutter. */}
                {!isMobile && (
                    <button
                        onClick={() => setIsOpen(false)}
                        aria-label="Minimize bet slip"
                        style={{
                            border: 'none',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            borderRadius: 8,
                            width: 34,
                            height: 34,
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        <i className="fa-solid fa-chevron-down" />
                    </button>
                )}
            </div>

            {/* Mode-control row — only the yellow Back button. The active
                bet mode (Straight / Parlay / Teaser / If Bet / Reverse) is
                already driven by the top-level tabs above the slip, so the
                old in-slip dropdown was redundant. Tapping Back collapses
                the slip back to the odds board. */}
            <div style={{
                background: '#fff',
                padding: '10px 12px',
                borderBottom: `1px solid ${palette.cardBorder}`,
            }}>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                        background: '#facc15',
                        color: '#0f172a',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontWeight: 800,
                        fontSize: 12,
                        letterSpacing: 0.3,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} /> Back
                </button>
            </div>

            <div style={{ padding: '14px 14px 18px', overflowY: 'auto' }}>
                {/* Shared Bet | Risk | Win toggle + single Bet Amount
                    input. The mode + amount typed here drive every
                    selection card's read-only Risk/Win readouts and the
                    final Place Bet payload — there is exactly one input
                    for the whole slip. */}
                {legCount > 0 && (
                    <div style={{
                        background: '#fff',
                        border: `1px solid ${palette.cardBorder}`,
                        borderRadius: 10,
                        padding: '10px 10px',
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'stretch',
                        gap: 8,
                    }}>
                        <div style={{
                            display: 'inline-flex',
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: `1px solid ${palette.cardBorder}`,
                            background: '#fff',
                            flexShrink: 0,
                        }}>
                            {STAKE_MODES.map((m, i) => {
                                const active = stakeMode === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setStakeMode(m.id)}
                                        style={{
                                            background: active
                                                ? (m.id === 'risk' ? '#ea580c' : m.id === 'win' ? '#16a34a' : '#0f172a')
                                                : '#475569',
                                            color: '#fff',
                                            border: 'none',
                                            borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.15)',
                                            padding: '8px 14px',
                                            fontWeight: 800,
                                            fontSize: 12,
                                            letterSpacing: 0.4,
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            transition: 'background 100ms ease',
                                            minWidth: 50,
                                        }}
                                    >
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{
                            position: 'relative',
                            flex: 1,
                            border: `1px solid ${palette.cardBorder}`,
                            borderRadius: 8,
                            background: '#fbfbfd',
                            transition: 'border-color 120ms ease',
                        }}>
                            <span style={{
                                position: 'absolute',
                                left: 12,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: 13,
                                fontWeight: 700,
                                color: palette.textFaint,
                                pointerEvents: 'none',
                            }}>$</span>
                            <input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                placeholder="Bet Amount"
                                value={wager}
                                onChange={(e) => onWagerChange(e.target.value)}
                                onFocus={(e) => { e.currentTarget.parentElement.style.borderColor = palette.accent; }}
                                onBlur={(e) => { e.currentTarget.parentElement.style.borderColor = palette.cardBorder; }}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px 10px 24px',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: palette.textPrimary,
                                    boxSizing: 'border-box',
                                    background: 'transparent',
                                    borderRadius: 8,
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Selections header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: palette.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                    }}>
                        Selections {legCount > 0 && <span style={{ color: palette.textPrimary, marginLeft: 4 }}>({legCount})</span>}
                    </div>
                    {legCount > 0 && (
                        <button
                            onClick={clearSlip}
                            style={{
                                border: 'none',
                                background: palette.dangerSoft,
                                color: palette.danger,
                                fontWeight: 700,
                                fontSize: 11,
                                padding: '4px 10px',
                                borderRadius: 999,
                                cursor: 'pointer',
                                letterSpacing: 0.4,
                            }}
                        >
                            CLEAR ALL
                        </button>
                    )}
                </div>

                {/* Empty state */}
                {legCount === 0 && (
                    <div style={{
                        padding: '36px 18px',
                        textAlign: 'center',
                        background: '#fff',
                        border: `1px dashed ${palette.cardBorder}`,
                        borderRadius: 12,
                    }}>
                        <div style={{
                            width: 46,
                            height: 46,
                            borderRadius: 999,
                            background: palette.accentSoft,
                            color: palette.accent,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            marginBottom: 10,
                        }}>
                            <i className="fa-solid fa-ticket" />
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: palette.textPrimary, marginBottom: 4 }}>
                            Your slip is empty
                        </div>
                        <div style={{ fontSize: 12, color: palette.textMuted }}>
                            Tap any odds on the board to add a selection.
                        </div>
                    </div>
                )}

                {legCount === 1 && normalizedMode === 'parlay' && (
                    <div style={{
                        fontSize: 12,
                        color: palette.warn,
                        background: palette.warnSoft,
                        border: `1px solid ${palette.warnBorder}`,
                        padding: '8px 12px',
                        borderRadius: 8,
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <i className="fa-solid fa-circle-info" />
                        Add at least one more selection for a parlay.
                    </div>
                )}
                {legCount < 2 && (normalizedMode === 'if_bet' || normalizedMode === 'reverse' || normalizedMode === 'teaser') && legCount > 0 && (
                    <div style={{
                        fontSize: 12,
                        color: palette.warn,
                        background: palette.warnSoft,
                        border: `1px solid ${palette.warnBorder}`,
                        padding: '8px 12px',
                        borderRadius: 8,
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <i className="fa-solid fa-circle-info" />
                        {(MODE_TABS.find(t => t.id === normalizedMode)?.label) || 'This mode'} requires at least 2 selections.
                    </div>
                )}

                {/* Selection cards — read-only display. Black header bar
                    with the full matchup + ⊗ remove icon; below it the
                    Game-* bet type tag, the picked team in bold, the
                    LISTED line/odds row, the Max Amount line, and the
                    auto-calculated Risk: / Win: readouts driven by the
                    shared (mode, amount) input above. No per-card input
                    fields — every leg is sized off the one shared
                    Bet Amount and its own decimal odds. */}
                {selections.map((sel, idx) => {
                    const legLabel = legLabelFor(normalizedMode, idx, legCount);
                    const { risk, win } = stakePairForSelection(sel);
                    const matchupTitle = String(sel.matchName || sel.selection || '').toUpperCase();
                    const betTypeLabel = `Game - ${marketLabelFor(sel.marketType, sel.marketLabel)}`;
                    const lineNumber = Number(sel.line);
                    const hasLine = Number.isFinite(lineNumber);
                    const lineText = hasLine
                        ? (sel.marketType === 'totals'
                            ? `${String(sel.selection || '').toUpperCase().startsWith('U') ? 'U' : 'O'} ${formatMoney(Math.abs(lineNumber))}`
                            : (lineNumber > 0 ? `+${formatMoney(lineNumber)}` : formatMoney(lineNumber)))
                        : '';
                    return (
                        <div
                            key={sel.id}
                            style={{
                                border: `1px solid ${palette.cardBorder}`,
                                borderRadius: 8,
                                marginBottom: 10,
                                background: palette.cardBg,
                                overflow: 'hidden',
                                boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                            }}
                        >
                            {/* Black header bar with matchup + ⊗ */}
                            <div style={{
                                background: palette.headerBg,
                                color: '#fff',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                            }}>
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    letterSpacing: 0.4,
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {matchupTitle}
                                </span>
                                <button
                                    onClick={() => removeSelection(sel.id)}
                                    aria-label="Remove selection"
                                    style={{
                                        background: 'rgba(255,255,255,0.12)',
                                        border: 'none',
                                        color: '#fff',
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        fontSize: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>

                            {/* Card body */}
                            <div style={{ padding: '10px 12px' }}>
                                {legLabel && (
                                    <div style={{
                                        fontSize: 9,
                                        fontWeight: 800,
                                        color: palette.accent,
                                        letterSpacing: 0.6,
                                        textTransform: 'uppercase',
                                        marginBottom: 4,
                                    }}>
                                        {legLabel}
                                    </div>
                                )}
                                <div style={{ fontSize: 12, color: palette.textMuted, fontWeight: 600, marginBottom: 2 }}>
                                    {betTypeLabel}
                                </div>
                                <div style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: palette.textPrimary,
                                    lineHeight: 1.3,
                                    marginBottom: 6,
                                }}>
                                    {sel.selection}
                                </div>

                                {/* LISTED row — line + odds. ML bets have
                                    no line, so the line-side stays blank
                                    and the odds align to the right. */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    fontSize: 12,
                                    color: palette.textPrimary,
                                    paddingTop: 4,
                                    borderTop: `1px solid ${palette.cardBorder}`,
                                }}>
                                    <span style={{ fontWeight: 700, color: palette.textMuted, letterSpacing: 0.4 }}>LISTED</span>
                                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'baseline' }}>
                                        {hasLine && (
                                            <span style={{ fontWeight: 700, color: palette.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                                                {lineText}
                                            </span>
                                        )}
                                        <span style={{ fontWeight: 800, color: oddsColour(sel.odds), fontVariantNumeric: 'tabular-nums' }}>
                                            {formatOddsSign(sel.odds)}
                                        </span>
                                    </span>
                                </div>

                                <div style={{ fontSize: 11, color: palette.textMuted, marginTop: 6 }}>
                                    Max Amount: 5,000.0
                                </div>

                                {/* Auto-calculated Risk / Win readouts —
                                    driven by the shared input at top. */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 8,
                                    marginTop: 8,
                                }}>
                                    <div style={{
                                        background: '#f8fafc',
                                        border: `1px solid ${palette.cardBorder}`,
                                        borderRadius: 6,
                                        padding: '6px 10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 6,
                                    }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>Risk:</span>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: risk > 0 ? palette.textPrimary : palette.textFaint, fontVariantNumeric: 'tabular-nums' }}>
                                            ${formatMoney(risk)}
                                        </span>
                                    </div>
                                    <div style={{
                                        background: '#f8fafc',
                                        border: `1px solid ${palette.cardBorder}`,
                                        borderRadius: 6,
                                        padding: '6px 10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 6,
                                    }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>Win:</span>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: win > 0 ? palette.success : palette.textFaint, fontVariantNumeric: 'tabular-nums' }}>
                                            ${formatMoney(win)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {normalizedMode === 'teaser' && Array.isArray(rule.teaserPointOptions) && rule.teaserPointOptions.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                        <div style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: palette.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: 0.6,
                            marginBottom: 8,
                        }}>Teaser Points</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {rule.teaserPointOptions.map(point => {
                                const selected = Number(teaserPoints) === Number(point);
                                return (
                                    <button
                                        key={point}
                                        onClick={() => onTeaserPointsChange(String(point))}
                                        style={{
                                            padding: '7px 14px',
                                            border: `1px solid ${selected ? palette.headerBg : palette.cardBorder}`,
                                            background: selected ? palette.headerBg : '#fff',
                                            color: selected ? '#fff' : palette.textPrimary,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            borderRadius: 999,
                                            transition: 'all 120ms ease',
                                        }}
                                    >
                                        +{point} pts
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* APPLY TO ALL — quick stake row that writes to the
                    single shared Bet Amount input at top. Visible in every
                    mode now that there's exactly one stake state to fill. */}
                {legCount > 0 && (
                    <div style={{
                        marginTop: 12,
                        background: '#fff',
                        border: `1px solid ${palette.cardBorder}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                        }}>
                            <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: palette.textMuted,
                                textTransform: 'uppercase',
                                letterSpacing: 0.6,
                            }}>
                                Apply to all
                            </span>
                            <span style={{ fontSize: 10, color: palette.textFaint }}>
                                Balance <span style={{ color: palette.textPrimary, fontWeight: 700 }}>${formatAmount(balance)}</span>
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {QUICK_STAKES.map(v => {
                                const active = Number(wager) === v;
                                return (
                                    <button
                                        key={v}
                                        onClick={() => onWagerChange(String(v))}
                                        style={{
                                            flex: '1 1 0',
                                            minWidth: 54,
                                            padding: '7px 6px',
                                            border: `1px solid ${active ? palette.headerBg : palette.cardBorder}`,
                                            background: active ? palette.headerBg : '#fff',
                                            color: active ? '#fff' : palette.textPrimary,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            borderRadius: 6,
                                            transition: 'all 120ms ease',
                                        }}
                                    >
                                        ${v}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => onWagerChange('')}
                                style={{
                                    padding: '7px 10px',
                                    border: `1px solid ${palette.cardBorder}`,
                                    background: '#fff',
                                    color: palette.textMuted,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    borderRadius: 6,
                                }}
                            >
                                Clear
                            </button>
                        </div>
                        {hasFreeplay && (
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginTop: 10,
                                padding: '6px 10px',
                                background: useFreeplay ? palette.successSoft : '#f8fafc',
                                borderRadius: 8,
                                fontSize: 11,
                                cursor: 'pointer',
                                userSelect: 'none',
                                border: `1px solid ${useFreeplay ? palette.success : palette.cardBorder}`,
                            }}>
                                <input
                                    type="checkbox"
                                    checked={useFreeplay}
                                    onChange={(e) => setUseFreeplay(e.target.checked)}
                                    style={{ width: 13, height: 13, cursor: 'pointer', accentColor: palette.success }}
                                />
                                <span style={{ color: useFreeplay ? palette.success : palette.textPrimary, fontWeight: 700 }}>
                                    Use Freeplay (${formatAmount(parsedFreeplayBalance)})
                                </span>
                            </label>
                        )}
                    </div>
                )}

                {/* Totals summary */}
                {legCount > 0 && (
                    <div style={{
                        marginTop: 10,
                        background: palette.headerBg,
                        borderRadius: 10,
                        padding: '12px 12px 14px',
                        color: '#fff',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>Total Risk</span>
                            <strong style={{ fontSize: 14, color: '#fff', fontWeight: 800 }}>${formatAmount(totalRisk)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
                            <span style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>Potential Payout</span>
                            <strong style={{ fontSize: 17, color: '#4ade80', fontWeight: 800 }}>${formatAmount(potentialPayout)}</strong>
                        </div>
                        {(ticketDecimalOdds !== null || impliedProbability !== null) && (
                            <div style={{
                                marginTop: 8,
                                paddingTop: 8,
                                borderTop: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 10,
                                color: '#cbd5e1',
                            }}>
                                {ticketDecimalOdds !== null && (
                                    <span>
                                        {normalizedMode === 'straight' ? 'Odds' : 'Combined'}{' '}
                                        <strong style={{ color: '#fff', marginLeft: 4 }}>{formatOdds(ticketDecimalOdds, oddsFormat)}</strong>
                                    </span>
                                )}
                                {impliedProbability !== null && (
                                    <span>
                                        Prob{' '}
                                        <strong style={{ color: '#fff', marginLeft: 4 }}>{impliedProbability.toFixed(1)}%</strong>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {validationErrors.map(err => (
                    submitAttempted ? (
                        <div key={err} style={{
                            color: palette.danger,
                            background: palette.dangerSoft,
                            padding: '8px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            marginTop: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}>
                            <i className="fa-solid fa-circle-exclamation" /> {err}
                        </div>
                    ) : null
                )).filter(Boolean)}
                {message && (
                    <div style={{
                        color: message.type === 'error' ? palette.danger : palette.success,
                        background: message.type === 'error' ? palette.dangerSoft : palette.successSoft,
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        marginTop: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}>
                        <i className={`fa-solid ${message.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} /> {message.text}
                    </div>
                )}

                {legCount > 0 && (
                    <button
                        onClick={handlePlaceBet}
                        disabled={!canPlace}
                        style={{
                            width: '100%',
                            marginTop: 12,
                            border: 'none',
                            borderRadius: 10,
                            padding: '13px 10px',
                            fontWeight: 800,
                            fontSize: 12,
                            letterSpacing: 0.8,
                            color: '#fff',
                            background: canPlace
                                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                                : '#94a3b8',
                            cursor: canPlace ? 'pointer' : 'not-allowed',
                            textTransform: 'uppercase',
                            boxShadow: canPlace ? '0 8px 20px -8px rgba(22,163,74,0.6)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            transition: 'all 150ms ease',
                        }}
                        onMouseEnter={(e) => { if (canPlace) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        {placing ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin" /> Placing…
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-check" /> Place {normalizedMode === 'straight' && legCount > 1 ? `${legCount} Bets` : 'Bet'}
                            </>
                        )}
                    </button>
                )}
            </div>
            <BetConfirmationModal
                isOpen={showConfirm}
                betType={normalizedMode}
                selections={selections}
                wager={normalizedMode === 'straight' ? straightTotalRisk : effectiveCombinedRisk}
                totalRisk={totalRisk}
                potentialPayout={potentialPayout}
                isFreeplay={useFreeplay && hasFreeplay}
                onCancel={() => setShowConfirm(false)}
                onConfirm={executePlaceBet}
                isSubmitting={placing}
            />
        </div>
    );
};

export default ModeBetPanel;
