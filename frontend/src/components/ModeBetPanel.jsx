import React, { useMemo, useState, useEffect, useRef } from 'react';
import { placeBet, normalizeBetMode, createRequestId } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatOdds } from '../utils/odds';
import BetConfirmationModal from './BetConfirmationModal';

// Minimal structural fallbacks — NO hardcoded multipliers.
// Real values always come from rulesByMode (loaded from DB via /api/betting/rules).
const DEFAULT_RULES = {
    straight: { minLegs: 1, maxLegs: 1, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
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

    const validationErrors = useMemo(() => {
        const errors = [];
        if (legCount < rule.minLegs || legCount > rule.maxLegs) {
            errors.push(`${MODE_TABS.find(t => t.id === normalizedMode)?.label || 'MODE'} requires ${rule.minLegs === rule.maxLegs ? rule.minLegs : `${rule.minLegs}-${rule.maxLegs}`} selections`);
        }
        if (!Number.isFinite(wagerAmount) || wagerAmount <= 0) {
            errors.push('Enter a valid wager amount');
        }
        if (!teaserValid) {
            errors.push(`Select teaser points: ${rule.teaserPointOptions.join(', ')}`);
        }
        if (!selections.every(sel => Number.isFinite(Number(sel.odds)) && Number(sel.odds) > 0)) {
            errors.push('One or more selections have invalid odds');
        }
        return errors;
    }, [legCount, normalizedMode, rule, selections, wagerAmount, teaserValid]);

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
        if (!Number.isFinite(wagerAmount) || wagerAmount <= 0 || legCount === 0) return 0;

        if (normalizedMode === 'straight') {
            return wagerAmount * Number(selections[0]?.odds || 0);
        }
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

    const totalRisk = normalizedMode === 'reverse'
        ? wagerAmount * 2
        : normalizedMode === 'straight'
            ? wagerAmount * Math.max(1, legCount)
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

    const removeSelection = (id) => {
        onSelectionsChange(selections.filter(sel => sel.id !== id));
    };

    const clearSlip = () => {
        onSelectionsChange([]);
        onWagerChange('');
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
        const payload = {
            type: normalizedMode,
            amount: wagerAmount,
            teaserPoints: normalizedMode === 'teaser' ? teaserPointValue : 0,
            useFreeplay: useFreeplay && hasFreeplay
        };

        if (normalizedMode === 'straight') {
            const sel = selections[0];
            payload.selections = [{
                matchId: sel.matchId,
                selection: sel.selection,
                odds: Number(sel.odds),
                // Canonical path for backend straight-market validation.
                type: sel.marketType || 'h2h',
                marketType: sel.marketType || 'h2h'
            }];
            // Keep legacy top-level fields for backward compatibility during migration.
            payload.matchId = sel.matchId;
            payload.selection = sel.selection;
            payload.odds = Number(sel.odds);
            payload.marketType = sel.marketType || 'h2h';
            payload.type = normalizedMode;
        } else {
            payload.selections = selections.map(sel => ({
                matchId: sel.matchId,
                selection: sel.selection,
                odds: Number(sel.odds),
                type: sel.marketType || 'straight'
            }));
        }

        try {
            submissionLockRef.current = true;
            setPlacing(true);
            setShowConfirm(false);
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

    return (
        <div style={{
            ...containerStyle,
            display: 'flex',
            flexDirection: 'column',
            background: '#f8f9fb',
            border: '1px solid #d9dbe0',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
        }}>
            <div style={{ background: '#0f5db3', color: 'white', padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {MODE_TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onModeChange(tab.id)}
                            style={{
                                flex: 1,
                                border: 'none',
                                borderRadius: 6,
                                padding: '7px 4px',
                                fontSize: 11,
                                fontWeight: 700,
                                color: normalizeBetMode(mode) === tab.id ? '#0f5db3' : '#ffffff',
                                background: normalizeBetMode(mode) === tab.id ? '#ffffff' : 'rgba(255,255,255,0.18)',
                                cursor: 'pointer'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setIsOpen(false)}
                        title="Minimize"
                        style={{
                            border: 'none',
                            background: 'rgba(255,255,255,0.2)',
                            color: '#fff',
                            borderRadius: 6,
                            width: 34,
                            height: 34,
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        <i className="fa-solid fa-minus"></i>
                    </button>
                </div>
            </div>

            <div style={{ padding: 12, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>Selections ({legCount})</strong>
                    <button onClick={clearSlip} style={{ border: 'none', background: 'transparent', color: '#666', cursor: 'pointer' }}>Clear</button>
                </div>

                {legCount === 0 && (
                    <div style={{ fontSize: 13, color: '#666', padding: '8px 0' }}>
                        Click odds from the board to add selections.
                    </div>
                )}

                {selections.map((sel) => (
                    <div key={sel.id} style={{ border: '1px solid #d7dbe3', borderRadius: 8, padding: 8, marginBottom: 8, background: '#fff' }}>
                        <div style={{ fontSize: 12, color: '#555' }}>{sel.matchName}</div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{sel.selection}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12 }}>
                            <span>{sel.marketLabel}</span>
                            <span>{formatOdds(sel.odds, oddsFormat)}</span>
                        </div>
                        <div style={{ marginTop: 6 }}>
                            <button
                                onClick={() => removeSelection(sel.id)}
                                style={{ border: 'none', background: '#f2f3f6', color: '#444', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}

                <div style={{ marginTop: 10 }}>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Stake</label>
                    <input
                        type="number"
                        min="0"
                        value={wager}
                        onChange={(e) => onWagerChange(e.target.value)}
                        placeholder="0.00"
                        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cfd4dd' }}
                    />
                    <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                        Balance: ${formatAmount(balance)}
                        {hasFreeplay && (
                            <span style={{ marginLeft: 8, color: '#0b6623' }}>
                                | Freeplay: ${formatAmount(parsedFreeplayBalance)}
                                {freeplayExpiryLabel && (
                                    <span style={{ color: '#888', fontStyle: 'italic' }}> (exp {freeplayExpiryLabel})</span>
                                )}
                            </span>
                        )}
                    </div>
                    {hasFreeplay && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
                            <input
                                type="checkbox"
                                checked={useFreeplay}
                                onChange={(e) => setUseFreeplay(e.target.checked)}
                                style={{ width: 15, height: 15, cursor: 'pointer' }}
                            />
                            <span style={{ color: useFreeplay ? '#0b6623' : '#444', fontWeight: useFreeplay ? 700 : 400 }}>
                                Use Freeplay Credits
                                {useFreeplay && ' (profit only credited on win)'}
                            </span>
                        </label>
                    )}
                </div>

                {normalizedMode === 'teaser' && Array.isArray(rule.teaserPointOptions) && rule.teaserPointOptions.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Teaser Points</label>
                        <select
                            value={teaserPoints}
                            onChange={(e) => onTeaserPointsChange(e.target.value)}
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cfd4dd' }}
                        >
                            <option value="">Select points</option>
                            {rule.teaserPointOptions.map(point => (
                                <option key={point} value={point}>{point}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#eef3fa', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Risk</span>
                        <strong>${formatAmount(totalRisk)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span>Potential Payout</span>
                        <strong>${formatAmount(potentialPayout)}</strong>
                    </div>
                </div>

                {validationErrors.map(err => (
                    submitAttempted ? <div key={err} style={{ color: '#a11', fontSize: 12, marginTop: 7 }}>{err}</div> : null
                )).filter(Boolean)}
                {message && (
                    <div style={{ color: message.type === 'error' ? '#a11' : '#0b6623', fontSize: 12, marginTop: 7 }}>
                        {message.text}
                    </div>
                )}

                <button
                    onClick={handlePlaceBet}
                    disabled={!canPlace}
                    style={{
                        width: '100%',
                        marginTop: 12,
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 10px',
                        fontWeight: 800,
                        color: 'white',
                        background: canPlace ? '#0f5db3' : '#9ca5b3',
                        cursor: canPlace ? 'pointer' : 'not-allowed'
                    }}
                >
                    {placing ? 'Placing...' : 'Place Bet'}
                </button>
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
