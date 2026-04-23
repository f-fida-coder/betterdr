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
    // Per-selection stake for straight mode. Keyed by selection id; value is
    // the raw input string (not coerced) so "10.", "1.5" etc. can be typed
    // without React fighting the user. Calculations Number() this down.
    const [perSelectionWagers, setPerSelectionWagers] = useState({});
    const [showModeDropdown, setShowModeDropdown] = useState(false);
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
    const wagerAmount = Number(wager);
    const teaserPointValue = Number(teaserPoints || 0);
    const teaserValid = normalizedMode !== 'teaser'
        || !Array.isArray(rule.teaserPointOptions)
        || rule.teaserPointOptions.length === 0
        || rule.teaserPointOptions.includes(teaserPointValue);

    // Per-selection wager helpers — only meaningful in straight mode where
    // each leg is an independent bet. For combined modes (parlay / teaser /
    // if_bet / reverse) the single `wagerAmount` applies to the whole ticket.
    const wagerForSelection = React.useCallback((sel) => {
        if (normalizedMode !== 'straight') return wagerAmount;
        const raw = perSelectionWagers[sel?.id];
        const num = Number(raw);
        return Number.isFinite(num) && num > 0 ? num : 0;
    }, [normalizedMode, perSelectionWagers, wagerAmount]);
    const straightTotalRisk = useMemo(() => {
        if (normalizedMode !== 'straight') return 0;
        return selections.reduce((acc, sel) => acc + wagerForSelection(sel), 0);
    }, [normalizedMode, selections, wagerForSelection]);
    const hasAnyStraightAmount = normalizedMode === 'straight' && straightTotalRisk > 0;

    // Drop stale per-selection wager entries when their selection leaves
    // the slip (otherwise the map grows forever and would skew totals if
    // an id got recycled).
    useEffect(() => {
        setPerSelectionWagers((prev) => {
            const idsInSlip = new Set(selections.map((s) => s.id));
            const next = {};
            let changed = false;
            Object.keys(prev).forEach((k) => {
                if (idsInSlip.has(k) || idsInSlip.has(Number(k))) next[k] = prev[k];
                else changed = true;
            });
            return changed ? next : prev;
        });
    }, [selections]);

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
        } else if (!Number.isFinite(wagerAmount) || wagerAmount <= 0) {
            errors.push('Enter a valid wager amount');
        }
        if (!teaserValid) {
            errors.push(`Select teaser points: ${rule.teaserPointOptions.join(', ')}`);
        }
        if (!selections.every(sel => Number.isFinite(Number(sel.odds)) && Number(sel.odds) > 0)) {
            errors.push('One or more selections have invalid odds');
        }
        return errors;
    }, [legCount, normalizedMode, rule, selections, wagerAmount, teaserValid, hasAnyStraightAmount]);

    const ticketSignature = useMemo(() => JSON.stringify({
        type: normalizedMode,
        amount: Number.isFinite(wagerAmount) ? Math.round(wagerAmount) : null,
        teaserPoints: normalizedMode === 'teaser' ? Math.round(teaserPointValue) : 0,
        selections: selections.map((sel) => ({
            matchId: String(sel?.matchId || ''),
            selection: String(sel?.selection || ''),
            marketType: String(sel?.marketType || ''),
            odds: Number.isFinite(Number(sel?.odds)) ? Number(Number(sel.odds).toFixed(4)) : null,
        })),
    }), [normalizedMode, selections, teaserPointValue, wagerAmount]);

    const potentialPayout = useMemo(() => {
        if (legCount === 0) return 0;

        if (normalizedMode === 'straight') {
            // Each leg is its own bet of `wagerForSelection(sel)`, so the
            // max possible payout is the sum of each leg's (stake × odds).
            return selections.reduce((acc, sel) => acc + (wagerForSelection(sel) * Number(sel.odds || 0)), 0);
        }
        if (!Number.isFinite(wagerAmount) || wagerAmount <= 0) return 0;
        if (normalizedMode === 'parlay') {
            const combined = selections.reduce((acc, sel) => acc * Number(sel.odds || 1), 1);
            return wagerAmount * combined;
        }
        if (normalizedMode === 'teaser') {
            return wagerAmount * getTeaserMultiplier(rule, legCount);
        }
        if (normalizedMode === 'if_bet') {
            const firstTwo = selections.slice(0, 2).reduce((acc, sel) => acc * Number(sel.odds || 1), 1);
            return wagerAmount * firstTwo;
        }
        if (normalizedMode === 'reverse') {
            const firstTwo = selections.slice(0, 2).reduce((acc, sel) => acc * Number(sel.odds || 1), 1);
            return wagerAmount * firstTwo * 2;
        }
        return 0;
    }, [wagerAmount, legCount, normalizedMode, selections, rule]);

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

    const impliedProbability = useMemo(() => {
        if (!Number.isFinite(ticketDecimalOdds) || ticketDecimalOdds <= 1) return null;
        return (1 / ticketDecimalOdds) * 100;
    }, [ticketDecimalOdds]);

    const totalRisk = normalizedMode === 'reverse'
        ? wagerAmount * 2
        : normalizedMode === 'straight'
            ? straightTotalRisk
            : wagerAmount;
    const rawAvailableBalance = availableBalance !== null && availableBalance !== undefined
        ? availableBalance
        : balance;
    const parsedAvailableBalance = Number(rawAvailableBalance);
    const effectiveAvailableBalance = useFreeplay
        ? parsedFreeplayBalance
        : (Number.isFinite(parsedAvailableBalance) ? parsedAvailableBalance : 0);
    const canPlace = validationErrors.length === 0 && !placing;
    const hasSelections = legCount > 0;
    const [isOpen, setIsOpen] = useState(hasSelections);

    useEffect(() => {
        if (hasSelections) {
            setIsOpen(true);
        }
    }, [hasSelections]);

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
        setPerSelectionWagers({});
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
            const payload = {
                type: normalizedMode,
                amount: wagerAmount,
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

    const containerStyle = isMobile
        ? {
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '62vh',
            zIndex: 1200,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16
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
            </div>

            {/* Mode selector — Back pill + current-mode dropdown.
                Matches the reference sportsbook layout: one yellow Back
                button, one dark pill showing the active mode that opens
                a full-list dropdown. Click outside closes it. */}
            <div style={{
                background: '#fff',
                padding: '10px 12px',
                borderBottom: `1px solid ${palette.cardBorder}`,
                position: 'relative',
            }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                    <button
                        type="button"
                        onClick={() => { setShowModeDropdown(false); setIsOpen(false); }}
                        style={{
                            background: '#facc15',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: 8,
                            padding: '0 16px',
                            fontWeight: 800,
                            fontSize: 12,
                            letterSpacing: 0.3,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexShrink: 0,
                        }}
                    >
                        <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} /> Back
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowModeDropdown((v) => !v)}
                        aria-haspopup="listbox"
                        aria-expanded={showModeDropdown}
                        style={{
                            flex: 1,
                            background: palette.headerBg,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '10px 14px',
                            fontWeight: 800,
                            fontSize: 13,
                            letterSpacing: 0.6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            textTransform: 'uppercase',
                        }}
                    >
                        <span>{MODE_TABS.find((t) => t.id === normalizedMode)?.label || 'STRAIGHT'}</span>
                        <i className={`fa-solid fa-chevron-${showModeDropdown ? 'up' : 'down'}`} style={{ fontSize: 11, color: '#38bdf8' }} />
                    </button>
                </div>

                {showModeDropdown && (
                    <>
                        {/* Invisible backdrop so tapping outside closes */}
                        <div
                            onClick={() => setShowModeDropdown(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 10,
                            }}
                        />
                        <div
                            role="listbox"
                            style={{
                                position: 'absolute',
                                top: 'calc(100% - 2px)',
                                right: 12,
                                left: 'auto',
                                width: 'calc(66% - 12px)',
                                background: palette.headerBg,
                                borderRadius: 10,
                                overflow: 'hidden',
                                boxShadow: '0 16px 40px -12px rgba(15,23,42,0.55)',
                                zIndex: 20,
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            {MODE_TABS.map((tab) => {
                                const active = normalizedMode === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        role="option"
                                        aria-selected={active}
                                        onClick={() => { onModeChange(tab.id); setShowModeDropdown(false); }}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            background: active ? '#1e293b' : 'transparent',
                                            color: active ? '#38bdf8' : '#e2e8f0',
                                            border: 'none',
                                            borderTop: '1px solid rgba(255,255,255,0.06)',
                                            padding: '14px 16px',
                                            textAlign: 'center',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            letterSpacing: 0.6,
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            transition: 'background 120ms ease',
                                        }}
                                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            <div style={{ padding: '14px 14px 18px', overflowY: 'auto' }}>
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

                {/* Selection cards */}
                {selections.map((sel, idx) => {
                    const legLabel = legLabelFor(normalizedMode, idx, legCount);
                    const tint = tintForMarket(sel.marketType);
                    return (
                        <div
                            key={sel.id}
                            style={{
                                position: 'relative',
                                border: `1px solid ${palette.cardBorder}`,
                                borderLeft: `3px solid ${tint.color}`,
                                borderRadius: 10,
                                padding: '12px 40px 12px 12px',
                                marginBottom: 8,
                                background: palette.cardBg,
                                boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                            }}
                        >
                            {legLabel && (
                                <div style={{
                                    fontSize: 9,
                                    fontWeight: 800,
                                    color: palette.accent,
                                    letterSpacing: 0.6,
                                    textTransform: 'uppercase',
                                    marginBottom: 6,
                                }}>
                                    {legLabel}
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 9,
                                        color: palette.textFaint,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        fontWeight: 600,
                                    }}>
                                        {sel.matchName}
                                    </div>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: palette.textPrimary,
                                        marginTop: 2,
                                        lineHeight: 1.25,
                                    }}>
                                        {sel.selection}
                                    </div>
                                    <div style={{ marginTop: 6 }}>
                                        <span style={{
                                            display: 'inline-block',
                                            fontSize: 9,
                                            fontWeight: 700,
                                            letterSpacing: 0.5,
                                            color: tint.color,
                                            background: tint.bg,
                                            padding: '2px 7px',
                                            borderRadius: 999,
                                            textTransform: 'uppercase',
                                        }}>
                                            {marketLabelFor(sel.marketType, sel.marketLabel)}
                                        </span>
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: 15,
                                    fontWeight: 800,
                                    color: oddsColour(sel.odds),
                                    whiteSpace: 'nowrap',
                                    paddingTop: 2,
                                }}>
                                    {formatOddsSign(sel.odds)}
                                </div>
                            </div>

                            {/* Per-selection stake — straight mode only. In
                                combined modes (parlay / teaser / etc.) the
                                one global wager applies to the whole ticket,
                                so the inline input would be misleading. */}
                            {normalizedMode === 'straight' && (() => {
                                const raw = perSelectionWagers[sel.id] ?? '';
                                const amt = wagerForSelection(sel);
                                const toWin = amt > 0 ? amt * Number(sel.odds || 0) - amt : 0;
                                return (
                                    <div style={{
                                        marginTop: 10,
                                        display: 'grid',
                                        gridTemplateColumns: '1fr auto',
                                        gap: 8,
                                        alignItems: 'center',
                                    }}>
                                        <div style={{
                                            position: 'relative',
                                            border: `1px solid ${palette.cardBorder}`,
                                            borderRadius: 8,
                                            background: '#fbfbfd',
                                            transition: 'border-color 120ms ease',
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                left: 10,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: palette.textFaint,
                                                pointerEvents: 'none',
                                            }}>$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                inputMode="decimal"
                                                placeholder="Risk"
                                                value={raw}
                                                onChange={(e) => setPerSelectionWagers((prev) => ({ ...prev, [sel.id]: e.target.value }))}
                                                onFocus={(e) => { e.currentTarget.parentElement.style.borderColor = palette.accent; }}
                                                onBlur={(e) => { e.currentTarget.parentElement.style.borderColor = palette.cardBorder; }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 10px 8px 22px',
                                                    border: 'none',
                                                    outline: 'none',
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: palette.textPrimary,
                                                    boxSizing: 'border-box',
                                                    background: 'transparent',
                                                    borderRadius: 8,
                                                }}
                                            />
                                        </div>
                                        <div style={{
                                            fontSize: 10,
                                            color: palette.textMuted,
                                            textAlign: 'right',
                                            minWidth: 74,
                                            lineHeight: 1.25,
                                        }}>
                                            <div style={{ fontSize: 9, letterSpacing: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>To Win</div>
                                            <div style={{ color: toWin > 0 ? palette.success : palette.textFaint, fontWeight: 800, fontSize: 12 }}>
                                                ${formatAmount(toWin)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <button
                                onClick={() => removeSelection(sel.id)}
                                aria-label="Remove selection"
                                style={{
                                    position: 'absolute',
                                    top: 6,
                                    right: 6,
                                    width: 22,
                                    height: 22,
                                    border: 'none',
                                    background: 'transparent',
                                    color: palette.textFaint,
                                    cursor: 'pointer',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = palette.dangerSoft; e.currentTarget.style.color = palette.danger; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = palette.textFaint; }}
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
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

                {/* Straight-mode: a compact "fill all" row instead of a
                    global stake input, since each card has its own. */}
                {legCount > 0 && normalizedMode === 'straight' && (
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
                            {QUICK_STAKES.map(v => (
                                <button
                                    key={v}
                                    onClick={() => {
                                        // Fill every leg with the same amount
                                        setPerSelectionWagers(() => {
                                            const next = {};
                                            selections.forEach((sel) => { next[sel.id] = String(v); });
                                            return next;
                                        });
                                    }}
                                    style={{
                                        flex: '1 1 0',
                                        minWidth: 54,
                                        padding: '7px 6px',
                                        border: `1px solid ${palette.cardBorder}`,
                                        background: '#fff',
                                        color: palette.textPrimary,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        borderRadius: 6,
                                        transition: 'all 120ms ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = palette.headerBg; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = palette.headerBg; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = palette.textPrimary; e.currentTarget.style.borderColor = palette.cardBorder; }}
                                >
                                    ${v}
                                </button>
                            ))}
                            <button
                                onClick={() => setPerSelectionWagers({})}
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

                {/* Combined-mode stake block (parlay / teaser / if_bet / reverse) */}
                {legCount > 0 && normalizedMode !== 'straight' && (
                    <div style={{
                        marginTop: 16,
                        background: '#fff',
                        border: `1px solid ${palette.cardBorder}`,
                        borderRadius: 12,
                        padding: 14,
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                        }}>
                            <div style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: palette.textMuted,
                                textTransform: 'uppercase',
                                letterSpacing: 0.6,
                            }}>
                                Stake
                            </div>
                            <div style={{ fontSize: 10, color: palette.textFaint }}>
                                Balance <span style={{ color: palette.textPrimary, fontWeight: 700 }}>${formatAmount(balance)}</span>
                                {hasFreeplay && (
                                    <span style={{ marginLeft: 6, color: palette.success, fontWeight: 700 }}>
                                        +${formatAmount(parsedFreeplayBalance)} FP
                                    </span>
                                )}
                            </div>
                        </div>
                        <div style={{
                            position: 'relative',
                            border: `1px solid ${palette.cardBorder}`,
                            borderRadius: 10,
                            overflow: 'hidden',
                            background: '#fbfbfd',
                            transition: 'border-color 120ms ease',
                        }}>
                            <span style={{
                                position: 'absolute',
                                left: 12,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: 14,
                                fontWeight: 700,
                                color: palette.textFaint,
                                pointerEvents: 'none',
                            }}>$</span>
                            <input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                value={wager}
                                onChange={(e) => onWagerChange(e.target.value)}
                                placeholder="0.00"
                                onFocus={(e) => { e.currentTarget.parentElement.style.borderColor = palette.accent; }}
                                onBlur={(e) => { e.currentTarget.parentElement.style.borderColor = palette.cardBorder; }}
                                style={{
                                    width: '100%',
                                    padding: '11px 12px 11px 26px',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: 16,
                                    fontWeight: 800,
                                    color: palette.textPrimary,
                                    boxSizing: 'border-box',
                                    background: 'transparent',
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                            {QUICK_STAKES.map(v => {
                                const active = Number(wager) === v;
                                return (
                                    <button
                                        key={v}
                                        onClick={() => onWagerChange(String(v))}
                                        style={{
                                            flex: '1 1 0',
                                            minWidth: 60,
                                            padding: '9px 6px',
                                            border: `1px solid ${active ? palette.headerBg : palette.cardBorder}`,
                                            background: active ? palette.headerBg : '#fff',
                                            color: active ? '#fff' : palette.textPrimary,
                                            fontSize: 13,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            borderRadius: 8,
                                            transition: 'all 120ms ease',
                                        }}
                                    >
                                        ${v}
                                    </button>
                                );
                            })}
                        </div>
                        {hasFreeplay && (
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginTop: 12,
                                padding: '8px 10px',
                                background: useFreeplay ? palette.successSoft : '#f8fafc',
                                borderRadius: 8,
                                fontSize: 12,
                                cursor: 'pointer',
                                userSelect: 'none',
                                border: `1px solid ${useFreeplay ? palette.success : palette.cardBorder}`,
                                transition: 'all 120ms ease',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={useFreeplay}
                                    onChange={(e) => setUseFreeplay(e.target.checked)}
                                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: palette.success }}
                                />
                                <span style={{ color: useFreeplay ? palette.success : palette.textPrimary, fontWeight: 700 }}>
                                    Use Freeplay
                                </span>
                                {freeplayExpiryLabel && (
                                    <span style={{ color: palette.textFaint, marginLeft: 'auto', fontStyle: 'italic', fontSize: 11 }}>
                                        exp {freeplayExpiryLabel}
                                    </span>
                                )}
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
                wager={wagerAmount}
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
