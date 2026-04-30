import React, { useMemo, useState, useEffect, useRef } from 'react';
import { placeBet, normalizeBetMode, createRequestId } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatOdds, decimalToAmerican, americanToDecimal } from '../utils/odds';
import BetConfirmationModal from './BetConfirmationModal';
import WagerConfirmedScreen from './WagerConfirmedScreen';

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
    return Number.isFinite(n) ? String(Math.ceil(n)) : '0';
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

const legLabelFor = (mode, index, total) => {
    if (total < 2) return null;
    if (mode === 'if_bet') return index === 0 ? 'Leg 1 (Primary)' : index === 1 ? 'Leg 2 (If Win)' : null;
    if (mode === 'reverse') return index === 0 ? 'Leg A' : index === 1 ? 'Leg B (Reverses)' : null;
    return null;
};

// Constant for every user — explicit business decision: quick stake
// chips do not vary by per-user min/max or saved Bet Defaults. Anyone
// wanting a different amount uses the typed Bet Amount input instead.
const QUICK_STAKES = [25, 500, 1000, 3000];

// Risk / Win mode toggle. `risk` = entered amount is the stake; `win`
// flips the meaning so the entered amount is the desired payout and the
// stake gets back-calculated from the odds. `bet` was a duplicate of
// `risk` and was removed — legacy saved defaults of `bet` are normalised
// up to `risk` at read time so the UI never shows a third pill.
const STAKE_MODES = [
    { id: 'risk', label: 'Risk' },
    { id: 'win', label: 'Win' },
];

// Risk ↔ Win conversion using DECIMAL odds (the storage format the app
// uses everywhere internally — odds in selections are always >1, with
// the display layer converting to American only for rendering). For a
// decimal price D: Win = Risk × (D − 1), Risk = Win / (D − 1). Returns
// 0 (not NaN) on invalid input so the read-only readouts don't flash
// "NaN" while the user is mid-typing or while a leg awaits price.
//
// Architecture: decimal odds are converted to a rounded American integer
// first, then all Risk/Win arithmetic uses integer-based formulas. This
// eliminates the floating-point drift that arose from dividing by an
// imprecise decimal representation (e.g. 1000 / 0.6896551... ≠ 1450.00
// exactly in IEEE-754). Integer math: -145 Win $1000 → Risk = 1000×145/100
// = $1450.00 exactly; -110 Win $1000 → $1100.00 exactly.
const resolveStake = (mode, amount, decimalOdds) => {
    const amt = Number(amount);
    const safeAmt = Number.isFinite(amt) && amt > 0 ? amt : 0;
    const d = Number(decimalOdds);
    const validOdds = Number.isFinite(d) && d > 1;

    if (!validOdds || safeAmt === 0) {
        if (mode === 'win') return { risk: 0, win: safeAmt };
        return { risk: safeAmt, win: 0 };
    }

    // Convert decimal → American integer (same formula as decimalToAmerican).
    // This is the source of truth; all arithmetic below is integer-based.
    const american = d >= 2
        ? Math.round((d - 1) * 100)
        : Math.round(-100 / (d - 1));

    if (american === 0) {
        if (mode === 'win') return { risk: 0, win: safeAmt };
        return { risk: safeAmt, win: 0 };
    }

    if (mode === 'win') {
        // Desired profit = safeAmt. Risk = profit × |american| / 100 (neg)
        // or Risk = profit × 100 / american (pos). Round to 2dp.
        const rawRisk = american < 0
            ? safeAmt * (-american) / 100
            : safeAmt * 100 / american;
        return { risk: Math.round(rawRisk * 100) / 100, win: safeAmt };
    }
    // 'bet' and 'risk' — amount IS the stake. Win = stake × 100/|american|
    // (neg) or stake × american/100 (pos). Round to 2dp.
    const rawWin = american < 0
        ? safeAmt * 100 / (-american)
        : safeAmt * american / 100;
    return { risk: safeAmt, win: Math.round(rawWin * 100) / 100 };
};

const formatMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return '0';
    return String(Math.ceil(n));
};

// Trim trailing zeros: 1.50 -> "1.5", 47.0 -> "47", 47.5 -> "47.5".
const trimNumber = (n) => {
    if (!Number.isFinite(n)) return '';
    return Number(n.toFixed(2)).toString();
};

// Bet-type base label: 'Spread', 'Moneyline', 'Total'.
const betTypeBaseLabel = (marketType) => {
    const k = String(marketType || '').toLowerCase();
    if (k === 'h2h') return 'Moneyline';
    if (k === 'spreads') return 'Spread';
    if (k === 'totals') return 'Total';
    return MARKET_LABELS[k] || k.toUpperCase() || 'Bet';
};

// Bet-type + line shown to the left of American odds on the card. Returns
// 'Spread -1.5' / 'Spread +2.5', 'Moneyline', or 'Total Over 54.5' /
// 'Total Under 47.5' depending on market type and selection name.
const betTypeLineLabel = (sel) => {
    const base = betTypeBaseLabel(sel?.marketType);
    const market = String(sel?.marketType || '').toLowerCase();
    const line = Number(sel?.line);
    if (market === 'spreads' && Number.isFinite(line)) {
        const signed = line > 0 ? `+${trimNumber(line)}` : trimNumber(line);
        return `${base} ${signed}`;
    }
    if (market === 'totals' && Number.isFinite(line)) {
        const isUnder = String(sel?.selection || '').toUpperCase().startsWith('U');
        return `${base} ${isUnder ? 'Under' : 'Over'} ${trimNumber(Math.abs(line))}`;
    }
    return base;
};

// Halves notation used in the Buy Points dropdown: -10.5 -> '-10½',
// 47.5 -> '47½' (unsigned for totals), 10 -> '+10' / '10'.
const formatLineHalves = (n, signed) => {
    if (!Number.isFinite(n)) return '';
    const abs = Math.abs(n);
    const whole = Math.floor(abs);
    const frac = abs - whole;
    const isHalf = Math.abs(frac - 0.5) < 0.01;
    const numText = isHalf ? `${whole}½` : `${trimNumber(abs)}`;
    if (!signed) return numText;
    if (n === 0) return numText;
    return n < 0 ? `-${numText}` : `+${numText}`;
};

// Format a Buy Points option label for the dropdown row, e.g. '-10½ -110'
// for spreads or '54½ -120' for totals.
const formatBuyPointsLabel = (option, marketType) => {
    const m = String(marketType || '').toLowerCase();
    const lineText = m === 'totals'
        ? formatLineHalves(option.line, false)
        : formatLineHalves(option.line, true);
    const odds = option.americanOdds;
    const oddsText = Number.isFinite(odds) ? (odds > 0 ? `+${odds}` : `${odds}`) : '';
    return `${lineText} ${oddsText}`.trim();
};

// Step American odds 10 cents in the worse direction (each 0.5-pt buy
// makes the line easier but pays less). Skips the (-110, +110) interior
// where standard juice doesn't sit, which keeps the fallback ladder
// realistic enough for a sportsbook UI.
const nextAmericanOddsStep = (current) => {
    const candidate = current - 10;
    if (candidate < 110 && candidate > -110) return -110;
    return candidate;
};

// Build up to 5 alternate-line options for a Spread/Total selection.
// Prefers `sel.alternateLines` (Rundown feed shape: { line, odds }) when
// upstream has attached them; otherwise falls back to a local generator
// stepping ±0.5 in the favorable direction with ~10 cents of juice per
// step. Returns [original, ...alts] with the original flagged so the
// dropdown can render its checkmark.
const buildBuyPointsOptions = (sel) => {
    const market = String(sel?.marketType || '').toLowerCase();
    if (market !== 'spreads' && market !== 'totals') return [];

    const baseLine = Number(sel?.line);
    const baseDec = Number(sel?.odds);
    if (!Number.isFinite(baseLine) || !Number.isFinite(baseDec) || baseDec <= 1) return [];

    const baseAmerican = decimalToAmerican(baseDec);
    if (!Number.isFinite(baseAmerican) || baseAmerican === 0) return [];

    // Direction the line moves to "buy" points (make the bet easier).
    // Spreads: always +0.5 (favourite line moves toward 0; underdog gets
    // more cushion). Totals: Over wants a smaller total, Under wants a
    // larger total.
    let lineStep;
    if (market === 'spreads') {
        lineStep = 0.5;
    } else {
        const isUnder = String(sel?.selection || '').toUpperCase().startsWith('U');
        lineStep = isUnder ? 0.5 : -0.5;
    }

    const original = {
        line: baseLine,
        decimalOdds: baseDec,
        americanOdds: baseAmerican,
        isOriginal: true,
    };

    const apiAlts = Array.isArray(sel?.alternateLines) ? sel.alternateLines : null;
    if (apiAlts && apiAlts.length > 0) {
        const options = [original];
        apiAlts.forEach((alt) => {
            const altLine = Number(alt?.line);
            const altDec = Number(alt?.odds);
            if (!Number.isFinite(altLine) || !Number.isFinite(altDec) || altDec <= 1) return;
            const delta = altLine - baseLine;
            if (lineStep > 0 && delta <= 0) return;
            if (lineStep < 0 && delta >= 0) return;
            if (Math.abs(delta) > 2.5 + 1e-6) return;
            const altAmerican = decimalToAmerican(altDec);
            if (!Number.isFinite(altAmerican)) return;
            options.push({
                line: altLine,
                decimalOdds: altDec,
                americanOdds: altAmerican,
                isOriginal: false,
            });
        });
        options.sort((a, b) => Math.abs(a.line - baseLine) - Math.abs(b.line - baseLine));
        return options.slice(0, 5);
    }

    const options = [original];
    let prevAmerican = baseAmerican;
    for (let i = 1; i <= 4; i += 1) {
        const newLine = baseLine + (lineStep * i);
        const newAmerican = nextAmericanOddsStep(prevAmerican);
        const newDec = americanToDecimal(newAmerican);
        if (!Number.isFinite(newDec) || newDec <= 1) break;
        options.push({
            line: newLine,
            decimalOdds: newDec,
            americanOdds: newAmerican,
            isOriginal: false,
        });
        prevAmerican = newAmerican;
    }
    return options;
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
    // Holds the placed-ticket payload(s) from the most recent successful
    // /bets/place response so the Wager Confirmed sheet can show full
    // ticket details (id, legs, odds, risk, win, timestamp) without a
    // round-trip to /api/bets. Cleared when the user dismisses the sheet.
    const [confirmedBets, setConfirmedBets] = useState(null);
    // User-saved bet defaults (settings.betDefaults). Drives initial
    // values for the shared mode toggle, Bet Amount, and the editable
    // Quick Stake chips. Falls back to project defaults when the user
    // hasn't customised them yet.
    const userBetDefaults = (user?.settings?.betDefaults && typeof user.settings.betDefaults === 'object')
        ? user.settings.betDefaults
        : null;
    // Legacy users may still have `mode: 'bet'` saved on their profile —
    // collapse it to `risk` since the UI no longer offers `bet` as a
    // separate option (it was an exact behavioural duplicate of `risk`).
    const rawDefaultMode = String(userBetDefaults?.mode || '').toLowerCase();
    const defaultStakeMode = rawDefaultMode === 'win' ? 'win' : 'risk';
    const defaultStakeAmount = Number.isFinite(Number(userBetDefaults?.amount)) && Number(userBetDefaults.amount) > 0
        ? Number(userBetDefaults.amount)
        : 0;
    // Quick stakes pin the leftmost / rightmost chip to the player's
    // admin-set Min Bet and Max Bet (so the limits are always one tap
    // away). The middle two slots stay at fixed presets across all users
    // — saved settings.betDefaults.quickStakes are still ignored here so
    // every player sees the same mid-range chips. Falls back to the
    // hardcoded extremes when the player has no min/max configured.
    const playerMinBet = Number(user?.minBet);
    const playerMaxBet = Number(user?.maxBet);
    const minBetChip = Number.isFinite(playerMinBet) && playerMinBet > 0 ? Math.round(playerMinBet) : QUICK_STAKES[0];
    const maxBetChip = Number.isFinite(playerMaxBet) && playerMaxBet > 0 ? Math.round(playerMaxBet) : QUICK_STAKES[3];
    const customQuickStakes = [minBetChip, QUICK_STAKES[1], QUICK_STAKES[2], maxBetChip];

    // Single shared Bet/Risk/Win mode for the whole slip. The `wager`
    // value (driven by onWagerChange) is the user-typed Bet Amount in
    // their chosen mode; per-leg Risk/Win is back-calculated from each
    // leg's odds at render-time (see resolveStake helper). Replaces the
    // old per-selection wager map — there's now exactly one input.
    const [stakeMode, setStakeMode] = useState(defaultStakeMode);
    // Track the user-prefs `betDefaults` signature so a refreshed
    // /auth/me payload (e.g. user just saved new defaults in Account)
    // re-seeds the slip mode without forcing a remount.
    const lastBetDefaultsSigRef = useRef('');
    useEffect(() => {
        const sig = JSON.stringify(userBetDefaults || {});
        if (sig === lastBetDefaultsSigRef.current) return;
        lastBetDefaultsSigRef.current = sig;
        setStakeMode(defaultStakeMode);
    }, [userBetDefaults, defaultStakeMode]);
    const requestStateRef = useRef({ requestId: '', signature: '' });
    const submissionLockRef = useRef(false);

    const parsedFreeplayBalance = Number.isFinite(Number(freeplayBalance)) ? Number(freeplayBalance) : 0;
    const hasFreeplay = parsedFreeplayBalance > 0;

    // Mirrors DashboardHeader's `headerAvailable`: for credit-account players
    // (creditLimit > 0) the betslip's headline number is `creditAvailable`
    // (creditLimit - balanceOwed); for cash accounts it stays the spendable
    // cash. Keeping the two displays in sync prevents the betslip from
    // showing $0 when the header shows $10,000.
    const userCreditLimit = Number(user?.creditLimit ?? 0);
    const userCreditAvailable = Number(user?.creditAvailable ?? user?.creditLimit ?? 0);
    const userRole = String(user?.role || 'user').toLowerCase();
    const isCreditAccount = userRole === 'user' && userCreditLimit > 0;
    const fallbackAvailable = Number.isFinite(Number(availableBalance)) ? Number(availableBalance) : Number(balance) || 0;
    const headerAvailable = isCreditAccount
        ? (Number.isFinite(userCreditAvailable) ? userCreditAvailable : 0)
        : fallbackAvailable;
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

    /**
     * Patch a single selection in the slip. Used by the per-card editable
     * Risk / Win inputs so users can over-stake one leg of a straight
     * ticket without touching the others. The override is stored on the
     * selection itself (`wagerOverride`) so it survives re-renders and
     * doesn't leak across legs.
     */
    const updateSelection = React.useCallback((id, patch) => {
        onSelectionsChange(selections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    }, [onSelectionsChange, selections]);

    /**
     * Compute the effective {risk, win} a selection card should display.
     * If the user has typed into either of the per-card inputs (or hit
     * Apply to All), `wagerOverride.source` indicates which side is the
     * source of truth and the other is back-calculated from this leg's
     * decimal odds. Falls through to the top-panel mode + amount when no
     * override has been set yet.
     *
     * Defined *before* `wagerForSelection` (and friends) because they
     * reference it inside their useCallback dependency arrays — moving it
     * later in the file triggered a temporal-dead-zone ReferenceError on
     * first render the moment React tried to memoize the dependents.
     */
    const effectiveStakeForSelection = React.useCallback((sel) => {
        const override = sel?.wagerOverride;
        if (override && (override.source === 'risk' || override.source === 'win')) {
            const raw = override.source === 'risk' ? override.riskRaw : override.winRaw;
            const num = Number(raw);
            const safe = Number.isFinite(num) && num > 0 ? num : 0;
            const d = Number(sel?.odds);
            const validOdds = Number.isFinite(d) && d > 1;
            if (!validOdds || safe === 0) {
                return override.source === 'risk'
                    ? { risk: safe, win: 0, source: 'risk' }
                    : { risk: 0, win: safe, source: 'win' };
            }
            // Use American integer arithmetic to avoid decimal drift.
            const american = d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
            if (american === 0) {
                return override.source === 'risk'
                    ? { risk: safe, win: 0, source: 'risk' }
                    : { risk: 0, win: safe, source: 'win' };
            }
            if (override.source === 'risk') {
                const rawWin = american < 0 ? safe * 100 / (-american) : safe * american / 100;
                return { risk: safe, win: Math.round(rawWin * 100) / 100, source: 'risk' };
            }
            const rawRisk = american < 0 ? safe * (-american) / 100 : safe * 100 / american;
            return { risk: Math.round(rawRisk * 100) / 100, win: safe, source: 'win' };
        }
        const computed = resolveStake(stakeMode, wager, sel?.odds);
        return { ...computed, source: null };
    }, [stakeMode, wager]);

    // Per-leg Risk amount that's actually staked on a straight leg.
    // For combined modes this returns 0 because there's only ONE bet
    // (using `effectiveCombinedRisk` below), not N independent stakes.
    // Honors `wagerOverride` so a per-card edit immediately drives the
    // backend payload + bottom totals, not just the on-screen readout.
    const wagerForSelection = React.useCallback((sel) => {
        if (normalizedMode !== 'straight') return 0;
        const { risk } = effectiveStakeForSelection(sel);
        return Number.isFinite(risk) && risk > 0 ? risk : 0;
    }, [normalizedMode, effectiveStakeForSelection]);

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

    // Per-account min/max bet limits from /auth/me payload. Backend
    // already enforces these (BetsController::placeBet) — checking
    // client-side too gives instant feedback instead of a round-trip
    // error after the user clicks Place Bet.
    //
    // Win-anchored semantics (credit-bookie convention): both min and
    // max apply to the *win* amount, regardless of which side the
    // player typed. The agent's exposure on every ticket is the win —
    // what the book pays out if the bet hits — so limits cap that, not
    // the user's own credit obligation. A user with $10k available
    // credit on a -500 favorite can risk $10k to win $2k (above max)
    // and be fine, because the bookie's exposure is still $2k.
    //
    // Available credit is enforced separately at submit time (see the
    // totalRisk vs effectiveAvailableBalance check below) — that's
    // what bounds the risk side, not maxBet.
    //
    // Returns:
    //   - messages: { min, max } win-anchored context strings that
    //     name the offending leg + actual numbers, e.g. "Max bet to
    //     win $3000 — 'Yankees vs Rangers' wins $4000 (over limit)".
    //   - violatingIds: Set of selection IDs whose Win trips a limit,
    //     used to flag the offending card with a red border.
    const limitFlags = useMemo(() => {
        const violatingIds = new Set();
        const messages = { min: null, max: null };
        const minBet = Number(user?.minBet);
        const maxBet = Number(user?.maxBet);
        const hasMin = Number.isFinite(minBet) && minBet > 0;
        const hasMax = Number.isFinite(maxBet) && maxBet > 0;
        if (!hasMin && !hasMax) return { violatingIds, messages };

        const fmt = (v) => formatMoney(v);
        const labelFor = (sel) => {
            const t = String(sel?.matchName || sel?.selection || '').trim();
            return t ? `"${t}"` : 'one leg';
        };

        if (normalizedMode === 'straight') {
            for (const sel of selections) {
                const { risk, win } = effectiveStakeForSelection(sel);
                if (!(risk > 0) && !(win > 0)) continue;
                const minBreach = hasMin && win > 0 && win < minBet;
                const maxBreach = hasMax && win > maxBet;
                if (minBreach && !messages.min) {
                    messages.min = `Min bet $${minBet} — ${labelFor(sel)} wins only $${fmt(win)}`;
                }
                if (maxBreach && !messages.max) {
                    messages.max = `Max bet $${maxBet} — ${labelFor(sel)} wins $${fmt(win)}`;
                }
                if (minBreach || maxBreach) violatingIds.add(sel.id);
            }
        } else if (effectiveCombinedRisk > 0) {
            const winValue = effectiveCombinedRisk * Math.max(0, Number(ticketDecimalOdds) - 1);
            if (hasMin && winValue > 0 && winValue < minBet) {
                messages.min = `Min bet $${minBet} — ticket wins only $${fmt(winValue)}`;
            }
            if (hasMax && winValue > maxBet) {
                messages.max = `Max bet $${maxBet} — ticket wins $${fmt(winValue)}`;
            }
        }
        return { violatingIds, messages };
    }, [normalizedMode, selections, effectiveStakeForSelection, effectiveCombinedRisk, ticketDecimalOdds, user?.minBet, user?.maxBet]);

    const validationErrors = useMemo(() => {
        const errors = [];
        if (normalizedMode === 'straight') {
            // Straight mode is N independent single bets. Some rule tables
            // store straight.maxLegs=1 (single-ticket semantics), which would
            // incorrectly block valid multi-leg straight slips in this UI.
            // Keep straight capped by the app-level default instead.
            const straightMaxLegs = DEFAULT_RULES.straight.maxLegs;
            if (legCount > straightMaxLegs) {
                errors.push(`STRAIGHT supports up to ${straightMaxLegs} selections`);
            }
            // Valid when at least one leg has a positive stake. Zero-stake
            // legs are silently skipped at submit time, not surfaced as a
            // blocker, so the user can stake just some of the slip.
            if (!hasAnyStraightAmount) {
                errors.push('Enter a stake on at least one selection');
            }
        } else {
            if (legCount < rule.minLegs || legCount > rule.maxLegs) {
                errors.push(`${MODE_TABS.find(t => t.id === normalizedMode)?.label || 'MODE'} requires ${rule.minLegs === rule.maxLegs ? rule.minLegs : `${rule.minLegs}-${rule.maxLegs}`} selections`);
            }
            if (effectiveCombinedRisk <= 0) {
                errors.push('Enter a valid wager amount');
            }
        }
        if (!teaserValid) {
            errors.push(`Select teaser points: ${rule.teaserPointOptions.join(', ')}`);
        }
        // Teaser is point-shift only — moneylines have no line to shift,
        // so teaser legs must be spreads or totals exclusively. Blocks
        // accidental teaser tickets that the backend would reject anyway.
        if (normalizedMode === 'teaser') {
            const invalid = selections.filter((sel) => {
                const market = String(sel?.marketType || '').toLowerCase();
                return market !== 'spreads' && market !== 'totals';
            });
            if (invalid.length > 0) {
                errors.push('Teasers only accept spreads and totals — remove moneyline selections');
            }
        }
        if (!selections.every(sel => Number.isFinite(Number(sel.odds)) && Number(sel.odds) > 0)) {
            errors.push('One or more selections have invalid odds');
        }
        if (limitFlags.messages.min) errors.push(limitFlags.messages.min);
        if (limitFlags.messages.max) errors.push(limitFlags.messages.max);
        return errors;
    }, [legCount, normalizedMode, rule, selections, effectiveCombinedRisk, teaserValid, hasAnyStraightAmount, limitFlags]);

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

    const totalRisk = normalizedMode === 'reverse'
        ? effectiveCombinedRisk * 2
        : normalizedMode === 'straight'
            ? straightTotalRisk
            : effectiveCombinedRisk;
    // Use the same pool the top bar's AVAILABLE tile shows: creditAvailable
    // for credit accounts, availableBalance for cash accounts. Otherwise the
    // bet-placement guard rejects with "Insufficient balance: $0.00" while
    // the user sees "AVAILABLE: $10,000".
    const parsedAvailableBalance = Number(headerAvailable);
    const effectiveAvailableBalance = useFreeplay
        ? parsedFreeplayBalance
        : (Number.isFinite(parsedAvailableBalance) ? parsedAvailableBalance : 0);
    const canPlace = validationErrors.length === 0 && !placing;
    // Pluck the amount-related warning (if any) for inline display under
    // the Bet Amount input. Matches the prefixes the validation builder
    // emits so the same string drives both the inline pill and the
    // disabled-button state.
    const amountWarning = validationErrors.find((e) =>
        typeof e === 'string' && (e.startsWith('Min bet') || e.startsWith('Max bet'))
    ) || '';
    const hasSelections = legCount > 0;
    const [isOpen, setIsOpen] = useState(false);

    // External open signal (fired by the Betslip button in DashboardHeader).
    // Using an event keeps this component's state encapsulated so the
    // header doesn't need to lift `isOpen` through App → Shell → here.
    useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
            // Pre-fill the Bet Amount with the user's saved default, but
            // only when the input is currently empty so we don't stomp
            // a value the user just typed before reopening the slip.
            if (defaultStakeAmount > 0 && (wager === '' || wager === null || wager === undefined)) {
                onWagerChange(String(defaultStakeAmount));
            }
            // Re-seed the mode whenever the slip opens so the
            // user's most recently saved default is the one in effect.
            setStakeMode(defaultStakeMode);
        };
        window.addEventListener('betslip:open', handleOpen);
        return () => window.removeEventListener('betslip:open', handleOpen);
    }, []);

    // External close signal — fired by the top-left header slot when it's
    // showing "← Back" (i.e. the slip is open). Keeping this on a window
    // event mirrors the open path so the header doesn't need to lift
    // `isOpen` through App → Shell → here.
    useEffect(() => {
        const handleClose = () => setIsOpen(false);
        window.addEventListener('betslip:close', handleClose);
        return () => window.removeEventListener('betslip:close', handleClose);
    }, []);

    // Broadcast open/close transitions so the header can swap its top-left
    // slot between "☰ Sports" and "← Back". Using a window event keeps the
    // slip's local state encapsulated; no parent prop drilling required.
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('betslip:state', { detail: { open: isOpen } }));
    }, [isOpen]);

    const removeSelection = (id) => {
        onSelectionsChange(selections.filter(sel => sel.id !== id));
    };

    // Tracks which selection's Buy Points dropdown is currently open. Only
    // one can be open at a time — selecting an option, tapping outside, or
    // removing the selection closes it.
    const [openBuyPointsId, setOpenBuyPointsId] = useState(null);

    // Apply a Buy Points alternate to a selection. Mutates only that leg's
    // line + odds; downstream Risk/Win, parlay/teaser combined odds, and
    // the bottom Total Risk / Potential Payout summary all derive from
    // selections via useMemo so they recalc automatically.
    const applyBuyPoints = (selId, option) => {
        onSelectionsChange(
            selections.map((s) => {
                if (s.id !== selId) return s;
                return {
                    ...s,
                    line: option.line,
                    odds: option.decimalOdds,
                };
            })
        );
        setOpenBuyPointsId(null);
    };

    const clearSlip = () => {
        onSelectionsChange([]);
        onWagerChange('');
        setStakeMode(defaultStakeMode);
        setMessage(null);
        setSubmitAttempted(false);
        setUseFreeplay(false);
        requestStateRef.current = { requestId: '', signature: '' };
    };

    // Top Bet Amount auto-flows to every leg via effectiveStakeForSelection
    // — typing into a per-card Risk/Win field is the only thing that
    // creates a wagerOverride. The old explicit "Apply" button was
    // redundant in that flow and got removed; the slot now hosts Clear.
    const clearWager = React.useCallback(() => {
        // Wipe the top Bet Amount AND every per-card wagerOverride.
        // Without the override sweep, a leg the user previously typed into
        // would keep its stale Risk/Win after Clear while sibling legs
        // (no override) reset to $0 — the slip would look half-cleared.
        onWagerChange('');
        if (selections.some((s) => s?.wagerOverride)) {
            onSelectionsChange(selections.map((s) => {
                if (!s?.wagerOverride) return s;
                const { wagerOverride, ...rest } = s;
                return rest;
            }));
        }
    }, [onWagerChange, onSelectionsChange, selections]);

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
            // Tell the user *which* pool came up short. Previously a
            // freeplay-toggled bet that didn't fit fell through to the
            // generic "Insufficient balance" toast — making it look like
            // freeplay wasn't being honored at all.
            const msg = useFreeplay
                ? `Freeplay balance insufficient. Available: $${formatAmount(parsedFreeplayBalance)}`
                : `Insufficient balance for this bet. Available: $${formatAmount(effectiveAvailableBalance)}`;
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
                // Collect each leg's placement response so the Wager
                // Confirmed sheet can show one ticket card per leg —
                // straight mode places N independent tickets, all of
                // which are receipts the user expects to see.
                const placedTickets = [];
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
                        const legResult = await placeBet(payload, token, { requestId });
                        placed.push(sel);
                        if (Array.isArray(legResult?.bets)) {
                            placedTickets.push(...legResult.bets);
                        }
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
                    // Show the post-placement receipt screen (Wager
                    // Confirmed) before clearing — gives the user proof
                    // their ticket(s) landed and a one-tap path to view
                    // them in My Bets.
                    if (placedTickets.length > 0) {
                        setConfirmedBets(placedTickets);
                    }
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
            // Capture the placed ticket(s) for the Wager Confirmed sheet.
            // Combined-mode placements always produce a single ticket but
            // we still pass the whole `bets` array so the confirmation
            // component can stay shape-agnostic between straight and combo.
            if (Array.isArray(result?.bets) && result.bets.length > 0) {
                setConfirmedBets(result.bets);
            }
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
            {/* The dark BETSLIP title bar and the standalone yellow Back
                button row used to live here. Both got removed: the top
                header already shows the live Betslip count, and the
                top-left header slot now swaps to "← Back" while the slip
                is open (see DashboardHeader). The APPLY TO ALL panel
                below is now the visual top of the slip body. */}
            <div style={{ padding: '14px 14px 18px', overflowY: 'auto' }}>
                {/* Consolidated APPLY TO ALL panel — now the visual top
                    of the slip body. Owns: mode toggle, Bet Amount input,
                    quick-stake row, Use Freeplay. The previous duplicate
                    bottom block was removed; this is the single source of
                    stake control for the entire slip. Quick stake values
                    are user-editable (Account → Bet Defaults) and fall
                    back to the project defaults [10, 25, 50, 100]. */}
                {legCount > 0 && (
                    <div style={{
                        background: '#fff',
                        border: `1px solid ${palette.cardBorder}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        marginBottom: 12,
                    }}>
                        {/* Title row: APPLY TO ALL + Available Credit.
                            Mirrors the top header's "AVAILABLE" tile — for
                            credit-account players (creditLimit > 0) this is
                            creditLimit - balanceOwed, so the betslip and the
                            header always agree on what the user can wager. */}
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
                                Available Credit <span style={{ color: palette.textPrimary, fontWeight: 700 }}>${formatAmount(headerAvailable)}</span>
                            </span>
                        </div>

                        {/* Row 1: BET / RISK / WIN toggle + Bet Amount */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'stretch',
                            gap: 8,
                            marginBottom: 8,
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
                                    step="1"
                                    inputMode="numeric"
                                    placeholder="Bet Amount"
                                    value={wager}
                                    onChange={(e) => onWagerChange(String(e.target.value).replace(/\D/g, ''))}
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
                            {/* Clear — wipes the top Bet Amount and any
                                per-card wagerOverride so the slip resets
                                cleanly. Replaces the old "Apply" button:
                                the top wager already auto-flows into every
                                leg via effectiveStakeForSelection, so an
                                explicit Apply was redundant. */}
                            <button
                                type="button"
                                onClick={clearWager}
                                aria-label="Clear bet amount"
                                style={{
                                    background: palette.headerBg,
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '0 14px',
                                    fontSize: 11,
                                    fontWeight: 800,
                                    letterSpacing: 0.4,
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    flexShrink: 0,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Clear
                            </button>
                        </div>

                        {/* Inline min/max warning — sits between the Bet
                            Amount input and the quick-stake chips so the
                            user sees the constraint without clicking
                            PLACE BET. PLACE BET stays disabled while a
                            warning is present (canPlace mirrors this). */}
                        {amountWarning && (
                            <div
                                role="alert"
                                style={{
                                    margin: '4px 0 8px',
                                    padding: '6px 10px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#b45309',
                                    background: '#fef3c7',
                                    border: '1px solid #fcd34d',
                                    borderRadius: 6,
                                    letterSpacing: 0.2,
                                }}
                            >
                                {amountWarning}
                            </div>
                        )}

                        {/* Row 2: quick stakes — leftmost / rightmost are
                            pinned to the player's admin-set Min/Max bet
                            (with a small label underneath); the middle two
                            stay at fixed presets. Validation under the hood
                            is win-anchored (the configured value caps the
                            per-ticket WIN), but the chip label reads
                            "Min Bet" / "Max Bet" — the universal sportsbook
                            shorthand — and the inline amount warning above
                            spells out the win-anchored rule when it bites. */}
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            {customQuickStakes.map((v, i) => {
                                const active = Number(wager) === Number(v);
                                const limitLabel = i === 0 ? 'Min Bet' : i === customQuickStakes.length - 1 ? 'Max Bet' : '';
                                return (
                                    <div
                                        key={`${v}-${i}`}
                                        style={{ flex: '1 1 0', minWidth: 54, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                                    >
                                        <button
                                            onClick={() => onWagerChange(String(v))}
                                            style={{
                                                padding: '7px 6px',
                                                border: `1px solid ${active ? palette.headerBg : palette.cardBorder}`,
                                                background: active ? palette.headerBg : '#fff',
                                                color: active ? '#fff' : palette.textPrimary,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                borderRadius: 6,
                                                transition: 'all 120ms ease',
                                                width: '100%',
                                            }}
                                        >
                                            ${v}
                                        </button>
                                        {limitLabel && (
                                            <span style={{
                                                marginTop: 3,
                                                fontSize: 9,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.4,
                                                color: palette.textFaint,
                                                textAlign: 'center',
                                            }}>{limitLabel}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Row 3: Use Freeplay (only when there's a freeplay balance) */}
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
                        Add at least 2 selections to build a parlay.
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
                    // Effective {risk, win, source} pulls from `wagerOverride`
                    // when the user has typed into the per-card inputs (or
                    // tapped Apply to All) and otherwise falls back to the
                    // top-panel mode + amount.
                    const stake = effectiveStakeForSelection(sel);
                    const risk = stake.risk;
                    const win = stake.win;
                    const stakeSource = stake.source;
                    // What text to display in the Risk + Win inputs. We
                    // show the user's *raw* string for whichever side they
                    // last edited (so "10." doesn't snap to "10" mid-type)
                    // and the formatted derived value for the other side.
                    const riskInputValue = stakeSource === 'risk'
                        ? (sel?.wagerOverride?.riskRaw ?? '')
                        : (risk > 0 ? formatMoney(risk) : '');
                    const winInputValue = stakeSource === 'win'
                        ? (sel?.wagerOverride?.winRaw ?? '')
                        : (win > 0 ? formatMoney(win) : '');
                    const matchupTitle = String(sel.matchName || sel.selection || '').toUpperCase();
                    const betTypeText = betTypeLineLabel(sel);
                    const market = String(sel.marketType || '').toLowerCase();
                    const supportsBuyPoints = market === 'spreads' || market === 'totals';
                    const buyPointsOptions = supportsBuyPoints ? buildBuyPointsOptions(sel) : [];
                    const buyPointsOpen = openBuyPointsId === sel.id;
                    // Flags this leg if its *win* trips the user's per-account
                    // min/max bet limit. Drives the red border + inline chip
                    // so the user immediately sees *which* leg blocked the slip
                    // instead of guessing from a global toast. Win-anchored
                    // (not risk-anchored) per the credit-bookie convention —
                    // see the limitFlags useMemo above for the full rationale.
                    const legViolatesLimit = limitFlags.violatingIds.has(sel.id);
                    const legLimitMaxBet = Number(user?.maxBet);
                    const legLimitMinBet = Number(user?.minBet);
                    const legOverMax = Number.isFinite(legLimitMaxBet) && legLimitMaxBet > 0 && win > legLimitMaxBet;
                    const legUnderMin = Number.isFinite(legLimitMinBet) && legLimitMinBet > 0 && win > 0 && win < legLimitMinBet;
                    return (
                        <div
                            key={sel.id}
                            style={{
                                border: `1px solid ${legViolatesLimit ? palette.danger : palette.cardBorder}`,
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
                                <div style={{
                                    fontSize: 16,
                                    fontWeight: 800,
                                    color: palette.textPrimary,
                                    lineHeight: 1.3,
                                    marginBottom: 8,
                                }}>
                                    {sel.selection}
                                </div>

                                {/* Bet type + line on the left, American odds
                                    (always green) on the right. ML bets only
                                    show 'Moneyline' on the left. */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    fontSize: 13,
                                    gap: 8,
                                }}>
                                    <span style={{ fontWeight: 700, color: palette.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                                        {betTypeText}
                                    </span>
                                    <span style={{ fontWeight: 800, color: palette.success, fontVariantNumeric: 'tabular-nums' }}>
                                        {formatOddsSign(sel.odds)}
                                    </span>
                                </div>

                                {/* Buy Points selector — Spread/Total only.
                                    Tapping the trigger opens a popup of up
                                    to 5 alternate lines (original + 4 alts).
                                    Picking one updates this leg's line +
                                    odds in the parent state, which cascades
                                    through Risk/Win and the bottom totals. */}
                                {supportsBuyPoints && buyPointsOptions.length > 1 && (
                                    <div style={{ position: 'relative', marginTop: 8 }}>
                                        <button
                                            type="button"
                                            onClick={() => setOpenBuyPointsId(buyPointsOpen ? null : sel.id)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8,
                                                padding: '8px 10px',
                                                background: '#fff',
                                                border: `1px solid ${buyPointsOpen ? palette.accent : palette.cardBorder}`,
                                                borderRadius: 8,
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: palette.textPrimary,
                                                cursor: 'pointer',
                                                transition: 'border-color 120ms ease',
                                            }}
                                        >
                                            <span style={{ color: palette.textMuted, letterSpacing: 0.3 }}>Buy Points</span>
                                            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                    {formatBuyPointsLabel(buyPointsOptions[0], sel.marketType)}
                                                </span>
                                                <i className={`fa-solid ${buyPointsOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: 10, color: palette.textFaint }} />
                                            </span>
                                        </button>
                                        {buyPointsOpen && (
                                            <>
                                                {/* Click-away catcher — closes the popup
                                                    when the user taps anywhere outside. */}
                                                <div
                                                    onClick={() => setOpenBuyPointsId(null)}
                                                    style={{
                                                        position: 'fixed',
                                                        inset: 0,
                                                        zIndex: 1300,
                                                    }}
                                                />
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 'calc(100% + 4px)',
                                                    left: 0,
                                                    right: 0,
                                                    background: '#fff',
                                                    border: `1px solid ${palette.cardBorder}`,
                                                    borderRadius: 10,
                                                    boxShadow: '0 12px 28px -10px rgba(15,23,42,0.35)',
                                                    overflow: 'hidden',
                                                    zIndex: 1301,
                                                }}>
                                                    {buyPointsOptions.map((opt, optIdx) => {
                                                        const isCurrent = Math.abs(Number(sel.line) - opt.line) < 1e-6
                                                            && Math.abs(Number(sel.odds) - opt.decimalOdds) < 1e-3;
                                                        return (
                                                            <button
                                                                key={`${opt.line}-${opt.americanOdds}-${optIdx}`}
                                                                type="button"
                                                                onClick={() => applyBuyPoints(sel.id, opt)}
                                                                style={{
                                                                    width: '100%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 10,
                                                                    padding: '10px 12px',
                                                                    background: isCurrent ? palette.accentSoft : '#fff',
                                                                    border: 'none',
                                                                    borderBottom: optIdx === buyPointsOptions.length - 1
                                                                        ? 'none'
                                                                        : `1px solid ${palette.cardBorder}`,
                                                                    fontSize: 13,
                                                                    fontWeight: 700,
                                                                    color: palette.textPrimary,
                                                                    cursor: 'pointer',
                                                                    textAlign: 'left',
                                                                    fontVariantNumeric: 'tabular-nums',
                                                                }}
                                                            >
                                                                <span style={{
                                                                    width: 14,
                                                                    color: palette.accent,
                                                                    fontWeight: 900,
                                                                    flexShrink: 0,
                                                                }}>
                                                                    {isCurrent ? '✓' : ''}
                                                                </span>
                                                                <span>
                                                                    {formatBuyPointsLabel(opt, sel.marketType)}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Per-card Risk / Win — editable inputs in
                                    STRAIGHT mode. The user can type into
                                    either field; the other auto-derives
                                    from this leg's decimal odds. Edits
                                    are independent across cards, and per
                                    spec they never bleed back into the
                                    top APPLY TO ALL panel. Combined modes
                                    (parlay / teaser / if_bet / reverse)
                                    skip this block — there's only one
                                    combined ticket so the summary card
                                    below owns the math. */}
                                {normalizedMode === 'straight' && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 8,
                                        marginTop: 8,
                                    }}>
                                        {[
                                            { id: 'risk', label: 'Risk:', value: riskInputValue, color: palette.textPrimary, isPositive: risk > 0 },
                                            { id: 'win', label: 'Win:', value: winInputValue, color: palette.success, isPositive: win > 0 },
                                        ].map((field) => (
                                            <label
                                                key={field.id}
                                                style={{
                                                    background: '#f8fafc',
                                                    border: `1px solid ${palette.cardBorder}`,
                                                    borderRadius: 6,
                                                    padding: '4px 10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 6,
                                                    cursor: 'text',
                                                }}
                                            >
                                                <span style={{ fontSize: 10, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{field.label}</span>
                                                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, minWidth: 0 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 800, color: field.isPositive ? field.color : palette.textFaint }}>$</span>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={field.value}
                                                        onChange={(e) => {
                                                            // Whole-dollar amounts only — strip anything
                                                            // that isn't a digit so users can't enter
                                                            // cents.
                                                            const cleaned = String(e.target.value).replace(/\D/g, '');
                                                            updateSelection(sel.id, {
                                                                wagerOverride: field.id === 'risk'
                                                                    ? { source: 'risk', riskRaw: cleaned, winRaw: '' }
                                                                    : { source: 'win', riskRaw: '', winRaw: cleaned },
                                                            });
                                                        }}
                                                        placeholder="0"
                                                        style={{
                                                            width: 70,
                                                            border: 'none',
                                                            outline: 'none',
                                                            background: 'transparent',
                                                            fontSize: 12,
                                                            fontWeight: 800,
                                                            color: field.isPositive ? field.color : palette.textFaint,
                                                            textAlign: 'right',
                                                            fontVariantNumeric: 'tabular-nums',
                                                        }}
                                                    />
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Per-leg limit chip — surfaces *why* this
                                    card was flagged when its *win* exceeds
                                    the player's max or sits under the min.
                                    The label says "Max Bet" / "Min Bet"
                                    (universal sportsbook shorthand), but
                                    the message text leads with the actual
                                    win amount so the win-anchored rule is
                                    still legible. Mirrors the global amount
                                    warning pill but pinned to the offending
                                    leg so multi-leg slips don't leave the
                                    user hunting for the breach. */}
                                {legViolatesLimit && (legOverMax || legUnderMin) && (
                                    <div
                                        role="alert"
                                        style={{
                                            marginTop: 8,
                                            padding: '6px 10px',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: palette.danger,
                                            background: palette.dangerSoft,
                                            border: `1px solid ${palette.danger}`,
                                            borderRadius: 6,
                                            letterSpacing: 0.2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 11 }} />
                                        <span>
                                            {legOverMax
                                                ? `Wins $${formatMoney(win)} — over your $${formatMoney(legLimitMaxBet)} Max Bet`
                                                : `Wins only $${formatMoney(win)} — under your $${formatMoney(legLimitMinBet)} Min Bet`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Combined-mode summary — parlay / teaser / if_bet / reverse.
                    Renders ONE block under the selection cards showing the
                    combined ticket odds + the user's resolved Risk / Win.
                    Hidden for straight mode (each card owns its own numbers)
                    and when there are <2 selections in modes that need them
                    (the warning banner above already nudges the user). */}
                {legCount >= 2 && normalizedMode !== 'straight' && (
                    <div style={{
                        marginTop: 12,
                        background: '#fff',
                        border: `1px solid ${palette.cardBorder}`,
                        borderLeft: `3px solid ${palette.accent}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                        }}>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: palette.textMuted,
                                textTransform: 'uppercase',
                                letterSpacing: 0.6,
                            }}>
                                {normalizedMode === 'parlay' ? 'Parlay Odds'
                                    : normalizedMode === 'teaser' ? 'Teaser Odds'
                                        : normalizedMode === 'if_bet' ? 'If Bet Odds'
                                            : normalizedMode === 'reverse' ? 'Reverse Odds'
                                                : 'Combined Odds'}
                            </span>
                            <span style={{
                                fontSize: 16,
                                fontWeight: 800,
                                color: oddsColour(ticketDecimalOdds),
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                                {ticketDecimalOdds ? formatOddsSign(ticketDecimalOdds) : '—'}
                            </span>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 8,
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
                                <span style={{ fontSize: 13, fontWeight: 800, color: effectiveCombinedRisk > 0 ? palette.textPrimary : palette.textFaint, fontVariantNumeric: 'tabular-nums' }}>
                                    ${formatMoney(effectiveCombinedRisk)}
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
                                <span style={{ fontSize: 13, fontWeight: 800, color: potentialPayout > effectiveCombinedRisk ? palette.success : palette.textFaint, fontVariantNumeric: 'tabular-nums' }}>
                                    ${formatMoney(Math.max(0, potentialPayout - effectiveCombinedRisk))}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

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
                                <i className="fa-solid fa-check" /> {(() => {
                                    if (normalizedMode === 'straight') {
                                        return legCount > 1 ? `Place ${legCount} Bets` : 'Place Bet';
                                    }
                                    if (normalizedMode === 'parlay') return 'Place Parlay';
                                    if (normalizedMode === 'teaser') return 'Place Teaser';
                                    if (normalizedMode === 'if_bet') return 'Place If Bet';
                                    if (normalizedMode === 'reverse') return 'Place Reverse';
                                    return 'Place Bet';
                                })()}
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
            <WagerConfirmedScreen
                open={Array.isArray(confirmedBets) && confirmedBets.length > 0}
                bets={confirmedBets || []}
                isFreeplay={useFreeplay && hasFreeplay}
                onPending={() => {
                    setConfirmedBets(null);
                    setIsOpen(false);
                    // Sibling components own routing — fire a window event
                    // so any shell can react. App-level handler navigates
                    // to the My Bets ticket center on this signal.
                    window.dispatchEvent(new CustomEvent('navigate:view', { detail: { view: 'my-bets' } }));
                }}
                onMainMenu={() => {
                    setConfirmedBets(null);
                    setIsOpen(false);
                }}
                onContinue={() => {
                    setConfirmedBets(null);
                }}
            />
        </div>
    );
};

export default ModeBetPanel;
