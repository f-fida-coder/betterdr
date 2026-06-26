import React, { useMemo, useState, useEffect, useRef } from 'react';
import { placeBet, createOpenParlay, normalizeBetMode, createRequestId } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatOdds, decimalToAmerican, americanToDecimal, roundCombinedToAmericanDecimal } from '../utils/odds';
import { computeMidQuickStakes } from '../utils/money';
import { formatSiteDateTime } from '../utils/timezone';
import { isMlbSportKey, formatPitcherLabel } from '../utils/pitchers';
import { adjustSpread, teaserSportGroup, teaserPointsForSport } from '../utils/teaserAdjustment';
import BetConfirmationModal from './BetConfirmationModal';
import WagerConfirmedScreen from './WagerConfirmedScreen';
import TeaserTypePicker from './TeaserTypePicker';
import { useDismissableSurface } from '../hooks/useDismissableSurface';
import { prettyPlayerMarketLabel, isPlayerPropMarket, formatPropSelectionTitle } from '../utils/propBuilderMarkets';

// Minimal structural fallbacks — NO hardcoded multipliers.
// Real values always come from rulesByMode (loaded from DB via /api/betting/rules).
const DEFAULT_RULES = {
    // Straight isn't a single-leg limit — each selection is a separate
    // independent wager. Cap at 12 matches parlay for consistency.
    straight:     { minLegs: 1, maxLegs: 12, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
    parlay:       { minLegs: 2, maxLegs: 12, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
    teaser:       { minLegs: 2, maxLegs: 6,  teaserPointOptions: [], payoutProfile: { type: 'table_multiplier', multipliers: {} } },
    if_bet:       { minLegs: 2, maxLegs: 2,  teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
    reverse:      { minLegs: 2, maxLegs: 2,  teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
    // Round Robin = automatic parlay generator. minLegs/maxLegs apply to
    // the selection set (not per-parlay); maxParlaysPerGroup caps the
    // total nCr fan-out so a "By 2's,3's,4's on 8 legs" placement can't
    // drop ~250 child rows in one transaction. Mirrors backend rule.
    round_robin:  { minLegs: 3, maxLegs: 8,  teaserPointOptions: [], maxParlaysPerGroup: 50, payoutProfile: { type: 'odds_product', multipliers: {} } },
};

const MODE_TABS = [
    { id: 'straight', label: 'STRAIGHT', icon: 'S' },
    { id: 'parlay', label: 'PARLAY', icon: 'P' },
    { id: 'teaser', label: 'TEASER', icon: 'T' },
    { id: 'if_bet', label: 'IF BET', icon: 'I' },
    { id: 'reverse', label: 'REVERSE', icon: 'R' },
    { id: 'round_robin', label: 'ROUND ROBIN', icon: 'RR' },
];

// Open Parlay declared-leg-count bounds. Mirrors the backend
// (OpenParlayService::MIN_TARGET_LEGS / MAX_LEGS) — the user declares up front
// how many legs the ticket will hold, commits the full stake, and fills the
// remaining slots over time. Keep these in sync with the server.
const OPEN_PARLAY_MIN_LEGS = 2;
const OPEN_PARLAY_MAX_LEGS = 8;
// PREVIEW-ONLY default for an open parlay's not-yet-added legs. The betslip
// prices an open parlay as if all declared legs already exist, with each
// unfilled slot treated as a -110 placeholder, so the player sees a full
// declared-parlay payout up front (capped). These placeholders live ONLY in
// the slip's payout preview — they are never sent to placement and never enter
// settlement, which grades only the real added legs at their real odds.
const OPEN_PARLAY_PLACEHOLDER_AMERICAN = -110;

// nCr-based combination count for the Round Robin live readout. n is the
// selection count, `sizes` is the user's chosen "By X's" set. Mirrors
// php-backend RoundRobinService::combinationCount.
const nCr = (n, k) => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let result = 1;
    for (let i = 0; i < k; i++) {
        result = Math.floor((result * (n - i)) / (i + 1));
    }
    return result;
};
const roundRobinCombinationCount = (selectionCount, sizes) => {
    let total = 0;
    for (const size of (sizes || [])) {
        const k = Number(size);
        if (!Number.isFinite(k) || k < 2 || k >= selectionCount) continue;
        total += nCr(selectionCount, k);
    }
    return total;
};

// ── Same-Game Parlay (SGP) correlation profit-haircut ───────────────────────
// The backend (SportsbookBetSupport::calculatePotentialPayout) shrinks a
// same-game parlay's PROFIT before paying it out, because legs from one event
// are correlated. The betslip must mirror this exactly or it over-promises a
// payout the ticket will never pay (e.g. a 3-leg NYY@DET parlay with a prop
// showed To Win $1000 but the ticket paid $649.90).
//
// MUST stay in sync with the backend constants
// SportsbookBetSupport::SGP_DEFAULT_HAIRCUT_PCT (0.20) and
// SGP_DEFAULT_PROP_HAIRCUT_PCT (0.35). Backend remains the payout authority;
// this is only a display mirror.
// TODO(sgp-settings): fetch sgpHaircutPct / sgpPlayerPropHaircutPct from the
// platform-settings API and thread them in instead of these hardcoded defaults.
const SGP_HAIRCUT_PCT = 0.20;
const SGP_PROP_HAIRCUT_PCT = 0.35;

// True when ANY event appears on 2+ legs — the backend's exact same-game test
// (isSameGameTicket: a matchId seen >= 2 times), NOT "all legs same game".
const isSameGameSlip = (selections) => {
    const counts = new Map();
    for (const sel of (selections || [])) {
        const mid = String(sel?.matchId || '');
        if (!mid) continue;
        const n = (counts.get(mid) || 0) + 1;
        if (n >= 2) return true;
        counts.set(mid, n);
    }
    return false;
};

// Correlation haircut fraction for a same-game slip (0 when cross-game). The
// larger player-prop rate applies when ANY leg is a player prop — identical to
// the backend's sameGameHaircutFraction.
const sgpHaircutFraction = (selections) => {
    if (!isSameGameSlip(selections)) return 0;
    const hasProp = (selections || []).some((sel) => isPlayerPropMarket(sel?.marketType));
    return hasProp ? SGP_PROP_HAIRCUT_PCT : SGP_HAIRCUT_PCT;
};

// Apply the PROFIT-ONLY haircut to a combined decimal: new = 1 + (d-1)(1-f).
// Mirrors SportsbookBetSupport::applyProfitHaircut. Stake is never touched.
const applySgpHaircut = (combinedDecimal, fraction) => {
    if (fraction <= 0 || !(combinedDecimal > 1)) return combinedDecimal;
    return 1 + (combinedDecimal - 1) * (1 - fraction);
};

const formatAmount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? String(Math.round(n)) : '0';
};

const getTeaserMultiplier = (rule, legCount, teaserType = null) => {
    const typeRaw = teaserType?.payoutProfile?.multipliers?.[String(legCount)];
    const typeParsed = Number(typeRaw);
    if (Number.isFinite(typeParsed) && typeParsed > 0) return typeParsed;
    const raw = rule?.payoutProfile?.multipliers?.[String(legCount)];
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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

// Stake-mode toggle.
//   risk → entered amount is the stake; Win back-computes from odds.
//   win  → entered amount is the desired payout; Risk back-computes.
//   bet  → "smart" mode used by every other US book — for each leg the
//          system picks the more intuitive interpretation based on the
//          price: MINUS juice (laying) → input is Win; PLUS juice
//          (taking) → input is Risk. So $2,000 in Bet on a -110 spread
//          means "win $2,000", and the same $2,000 on a +345 dog means
//          "risk $2,000 to win $6,900." Per-leg in straight mode (each
//          leg's own odds decide); per-ticket in combined modes (one
//          combined American number drives it).
//
// Bet mode was previously stripped because an earlier pass treated it
// as a duplicate of Risk. It isn't — minus-juice users almost always
// think in dollars-to-win, plus-juice users think in dollars-to-risk,
// and Bet captures that without forcing the player to flip the toggle
// between every leg.
const STAKE_MODES = [
    { id: 'bet', label: 'Bet' },
    { id: 'risk', label: 'Risk' },
    { id: 'win', label: 'Win' },
];

// Given decimal odds, decide which underlying mode 'bet' resolves to.
// Minus juice → 'win'; plus juice (and even +100) → 'risk'. Called by
// resolveStake AND by the placement payload builders so the wire-level
// `requestedWin` flag matches what the UI computed.
const resolveBetSmartMode = (decimalOdds) => {
    const d = Number(decimalOdds);
    if (!Number.isFinite(d) || d <= 1) return 'risk';
    const american = d >= 2
        ? Math.round((d - 1) * 100)
        : Math.round(-100 / (d - 1));
    return american < 0 ? 'win' : 'risk';
};

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

    // Bet mode resolves per-call to either 'win' (minus juice) or 'risk'
    // (plus juice) so the math below stays in two branches. We don't
    // mutate the parameter — we read the resolved mode locally — so the
    // caller's `stakeMode` state remains 'bet' for the toggle pill.
    const effectiveMode = mode === 'bet' ? (american < 0 ? 'win' : 'risk') : mode;

    if (effectiveMode === 'win') {
        // Desired profit = safeAmt. Risk = profit × |american| / 100 (neg)
        // or Risk = profit × 100 / american (pos). Round to 2dp.
        const rawRisk = american < 0
            ? safeAmt * (-american) / 100
            : safeAmt * 100 / american;
        return { risk: Math.round(rawRisk * 100) / 100, win: safeAmt };
    }
    // 'risk' — amount IS the stake. Win = stake × 100/|american|
    // (neg) or stake × american/100 (pos). Round to 2dp.
    const rawWin = american < 0
        ? safeAmt * 100 / (-american)
        : safeAmt * american / 100;
    return { risk: safeAmt, win: Math.round(rawWin * 100) / 100 };
};

const formatMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return '0';
    return String(Math.round(n));
};

// Slip-summary money formatter — always 2dp with thousands separator
// ($699.30, $1,000.00, $12,345.67). Used for the parlay/teaser/etc.
// summary card's RISK / WIN readouts where a typed $1000 win must
// render as exactly "$1,000.00" instead of integer "$997" — the
// integer rounding hid the per-leg float drift between the
// American-int Risk basis and the per-leg-snapped Win basis. Negative
// inputs clamp to 0 so a transient potentialPayout < totalRisk during
// typing doesn't flash "-0.30".
const formatMoney2dp = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0.00';
    const safe = n > 0 ? n : 0;
    return safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    // Player props (and any non-core market) get the friendly stat label —
    // never the raw uppercase wire key (e.g. BATTER_RUNS_SCORED).
    return prettyPlayerMarketLabel(marketType) || 'Bet';
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
// Build the alternate-line options for a Spread/Total selection STRICTLY from
// `sel.alternateLines` — the server's feed-anchored ladder (the same prices
// placement reprices against). There is NO local fallback: if the server did
// not emit alts (sport not enabled, or the feed has no alt price), the only
// option is the base line and no buy-points dropdown is shown. Returns
// [original, ...alts] with the original flagged so the dropdown can render its
// checkmark.
//
// The SERVER is the sole buy-points gate now (BuyPointsPricing::isSportEnabled,
// driven by the BUY_POINTS_ENABLED_SPORTS env). While a sport is locked the
// server emits no `alternateLines` AND rejects any bought-point placement
// (BUY_POINTS_DISABLED), so this stays display == placed with no frontend
// redeploy needed to re-enable a verified sport.
const BUY_POINTS_ENABLED = true;

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
            if (Math.abs(delta) < 1e-9) return; // skip the base line (already added)
            // Show BOTH directions — buying (easier/cheaper) AND selling
            // (harder line for a better payout). The server already vetted and
            // priced every rung (feed-anchored or house-safe synthetic), so we
            // surface them all within the ±3.0 window.
            if (Math.abs(delta) > 3.0 + 1e-6) return;
            const altAmerican = decimalToAmerican(altDec);
            if (!Number.isFinite(altAmerican)) return;
            options.push({
                line: altLine,
                decimalOdds: altDec,
                americanOdds: altAmerican,
                isOriginal: false,
            });
        });
        // Nearest the base line first, then cap so the dropdown stays compact
        // (base + 5 nearest reference rungs ≈ the competitor's tight look). 6
        // (not 4) so a favorite's opposite-side reference line — e.g. +1.5 on a
        // -1.5 run line, which sits 5 rungs out across the win-zone gap — isn't
        // silently dropped.
        options.sort((a, b) => Math.abs(a.line - baseLine) - Math.abs(b.line - baseLine));
        return options.slice(0, 6);
    }

    // No server alternateLines → no buy-points (base line only, no dropdown).
    return [original];
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
    selectedTeaserTypeId = null,
    onTeaserTypeChange,
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
    // Saved mode is one of 'bet' | 'risk' | 'win'. Bet is the "smart"
    // mode (minus-juice → win, plus-juice → risk) and is the most
    // common preference among recreational players; anything else
    // falls through to 'risk' to preserve the historical default.
    const rawDefaultMode = String(userBetDefaults?.mode || '').toLowerCase();
    const defaultStakeMode = rawDefaultMode === 'win'
        ? 'win'
        : rawDefaultMode === 'bet'
            ? 'bet'
            : 'risk';
    const defaultStakeAmount = Number.isFinite(Number(userBetDefaults?.amount)) && Number(userBetDefaults.amount) > 0
        ? Number(userBetDefaults.amount)
        : 0;
    // Quick stakes are fully auto-derived from the player's admin-set Min /
    // Max bet so agents don't have to configure quick-stake values per
    // player. Outer chips pin to Min / Max (limits one tap away); middle
    // two are round numbers evenly distributed between them. Falls back to
    // the hardcoded extremes when the player has no min/max configured.
    const playerMinBet = Number(user?.minBet);
    const playerMaxBet = Number(user?.maxBet);
    const minBetChip = Number.isFinite(playerMinBet) && playerMinBet > 0 ? playerMinBet : QUICK_STAKES[0];
    const maxBetChip = Number.isFinite(playerMaxBet) && playerMaxBet > 0 ? playerMaxBet : QUICK_STAKES[3];
    const [mid1Chip, mid2Chip, mid3Chip] = computeMidQuickStakes(minBetChip, maxBetChip);
    const customQuickStakes = [minBetChip, mid1Chip, mid2Chip, mid3Chip, maxBetChip];

    // Single shared Bet/Risk/Win mode for the whole slip. The `wager`
    // value (driven by onWagerChange) is the user-typed Bet Amount in
    // their chosen mode; per-leg Risk/Win is back-calculated from each
    // leg's odds at render-time (see resolveStake helper). Replaces the
    // old per-selection wager map — there's now exactly one input.
    const [stakeMode, setStakeMode] = useState(defaultStakeMode);
    // Round Robin: which "By X's" sizes the user has selected. Multi-
    // select; empty = no parlays will be generated (Confirm disabled).
    // Reset whenever the slip's selection count changes so a previously
    // chosen size that's now out of range (e.g. picked "By 4's" with 5
    // legs, then dropped a leg) doesn't silently linger.
    const [roundRobinSizes, setRoundRobinSizes] = useState([]);
    // Open Parlay: the declared target leg count (2–8). The full stake commits
    // at placement and the player fills the remaining slots later. The declared
    // count can never sit below the legs already in the slip, so an effect
    // below auto-raises it as legs are added (you can't un-declare a leg you've
    // already picked). Default to the minimum.
    const [openParlayTargetLegs, setOpenParlayTargetLegs] = useState(OPEN_PARLAY_MIN_LEGS);
    // Track the user-prefs `betDefaults` signature so a refreshed
    // /auth/me payload (e.g. user just saved new defaults in Account)
    // re-seeds the slip mode without forcing a remount.
    const lastBetDefaultsSigRef = useRef('');
    // First-open-per-session gate for the drawer-open setStakeMode
    // reset below. Without this, every betslip:open event (including
    // re-opens after the user closed the slip) would wipe a manual
    // WIN selection back to the saved default. Reset to false on
    // bet-mode change and user change so a fresh context picks up the
    // saved default the first time the slip opens in that context.
    const slipFirstOpenedRef = useRef(false);
    useEffect(() => {
        // Only the saved `mode` field drives defaultStakeMode. Hashing
        // the whole userBetDefaults object would re-fire the reset on
        // unrelated profile updates (amount changes, balance refresh
        // bundles, etc.) and silently snap a manual WIN click back to
        // the saved default. Narrow the sig so the reset only triggers
        // when the user actually saves a new mode preference.
        const sig = JSON.stringify({
            mode: userBetDefaults?.mode ?? null,
        });
        if (sig === lastBetDefaultsSigRef.current) return;
        lastBetDefaultsSigRef.current = sig;
        setStakeMode(defaultStakeMode);
    }, [userBetDefaults, defaultStakeMode]);
    const requestStateRef = useRef({ requestId: '', signature: '' });
    // Per-leg idempotency for straight mode. Each leg places an independent
    // ticket, so it needs its OWN requestId (different legs must not collapse
    // into one bet) — but that id must stay STABLE across retries of the same
    // slip, or a leg that committed server-side but lost its response would
    // double-place on retry. Keyed by leg id, reset whenever the slip
    // signature changes (new selections or an odds patch = a genuinely new
    // bet that should get fresh ids).
    const legRequestStateRef = useRef({ signature: '', ids: {} });
    const submissionLockRef = useRef(false);

    const parsedFreeplayBalance = Number.isFinite(Number(freeplayBalance)) ? Number(freeplayBalance) : 0;
    const hasFreeplay = parsedFreeplayBalance > 0;
    // Freeplay can only be applied to ONE ticket at a time:
    //   - a single straight bet (1 selection)
    //   - a parlay / teaser / if-bet / reverse (multiple legs but ONE ticket)
    //   - a round robin (atomic placement, treated as one slip action)
    // Straight mode with multiple selections submits N independent tickets
    // and the system can't decide which ticket "owns" the freeplay pool —
    // the first ticket's win/loss math diverges from the rest's. Block the
    // combination entirely so the user funds those slips with credit and
    // saves freeplay for a single-ticket bet. Mirrored on the backend
    // (BetsController rejects type=straight + useFreeplay + slipSize>1).
    const freeplayMultiBetBlocked = normalizeBetMode(mode) === 'straight' && (selections?.length || 0) > 1;

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

    const isOpenParlay = normalizeBetMode(mode) === 'open_parlay';
    // Open parlay shares all parlay math/payout/validation; it only differs at
    // the placement endpoint, min-legs, freeplay, and labels. Map it to 'parlay'
    // everywhere downstream so the existing parlay paths run unchanged.
    const normalizedMode = isOpenParlay ? 'parlay' : normalizeBetMode(mode);
    const baseRule = rulesByMode[normalizedMode] || DEFAULT_RULES[normalizedMode] || DEFAULT_RULES.straight;
    // Open parlay can be committed with a single starting leg (the rest are
    // added later, each before its own game starts); it never auto-voids and
    // simply stays open until all declared legs are filled.
    const rule = isOpenParlay ? { ...baseRule, minLegs: 1, maxLegs: OPEN_PARLAY_MAX_LEGS } : baseRule;
    const legCount = selections.length;

    // Keep the declared target leg count valid: it can never be below the legs
    // already in the slip (you can't un-declare a leg you've picked), so raise
    // it to match when more legs are added, clamped to the 2–8 bounds. Removing
    // a leg never lowers an already-declared target.
    useEffect(() => {
        if (!isOpenParlay) return;
        const floor = Math.max(OPEN_PARLAY_MIN_LEGS, Math.min(legCount, OPEN_PARLAY_MAX_LEGS));
        setOpenParlayTargetLegs((prev) => {
            const next = Math.min(OPEN_PARLAY_MAX_LEGS, Math.max(floor, prev));
            return next === prev ? prev : next;
        });
    }, [isOpenParlay, legCount]);

    // If the user had Freeplay toggled on and then added a second leg
    // (flipping the slip into multi-bet straight mode), the gate above
    // would otherwise leave the checkbox stuck visually-checked. Force
    // it off so the betslip state matches the disabled control.
    useEffect(() => {
        if (freeplayMultiBetBlocked && useFreeplay) {
            setUseFreeplay(false);
        }
    }, [freeplayMultiBetBlocked, useFreeplay]);

    // Round Robin: stake input is per-parlay risk, and a "Win $X" target
    // is undefined when each child parlay has different combined odds.
    // Force Risk and lock the toggle off so the user can't land in an
    // ambiguous state.
    useEffect(() => {
        if (normalizedMode === 'round_robin' && stakeMode !== 'risk') {
            setStakeMode('risk');
        }
    }, [normalizedMode, stakeMode]);
    // Raw user-typed amount in the shared Bet Amount input. Always parsed
    // as a number for arithmetic but kept untouched in `wager` so React
    // doesn't fight the user mid-typing ("10.", "1.5", etc.).
    const wagerAmount = Number(wager);
    const teaserPointValue = Number(teaserPoints || 0);

    // Map a leg's sportKey to its teaser sport group. Mirrors
    // BetModeRules::teaserSportGroup on the backend so frontend +
    // backend agree on grouping. Returns null for sports that don't
    // have a teaser product (baseball, soccer, hockey, etc.).
    const teaserSportGroupOf = (sportKey) => {
        const k = String(sportKey || '').toLowerCase();
        if (!k) return null;
        if (k.startsWith('americanfootball_') || k === 'football') return 'football';
        if (k.startsWith('basketball_') || k === 'basketball') return 'basketball';
        return null;
    };

    // Distinct sport groups present in the current slip. Used to pick
    // which teaser-points list to show (football → 6/6.5/7, basketball
    // → 4/4.5/5) and to flag mixed-sport teasers as invalid (the
    // backend rejects them; surfacing the error here keeps the slip
    // honest before the user taps Place).
    const slipTeaserGroups = useMemo(() => {
        const groups = new Set();
        for (const sel of selections) {
            const g = teaserSportGroupOf(sel?.sportKey);
            if (g) groups.add(g);
        }
        return Array.from(groups);
    }, [selections]);

    // Resolve the effective teaser point options for the slip:
    //   - exactly one sport group → use that group's per-sport list
    //     (rule.teaserPointOptionsBySport[group], shipped from backend)
    //   - mixed groups or none identified → fall back to the legacy
    //     flat list rule.teaserPointOptions so older clients/data still
    //     render something rather than an empty selector
    const activeTeaserPointOptions = useMemo(() => {
        if (normalizedMode !== 'teaser') return [];
        const bySport = rule?.teaserPointOptionsBySport;
        if (slipTeaserGroups.length === 1 && bySport && Array.isArray(bySport[slipTeaserGroups[0]])) {
            return bySport[slipTeaserGroups[0]].map(Number);
        }
        return Array.isArray(rule?.teaserPointOptions) ? rule.teaserPointOptions.map(Number) : [];
    }, [normalizedMode, rule, slipTeaserGroups]);

    // Structured teaser-type catalog (new picker flow). Backend ships
    // a `teaserTypes` array on the teaser rule with id, label, points
    // per sport, tiesRule, payoutMode and payoutProfile. The selector
    // UI renders one card per active type; `selectedTeaserType` is the
    // resolved object for `selectedTeaserTypeId` so the rest of the
    // panel (summary chip, payload assembly, sport mismatch checks)
    // can read its points/ties without re-walking the array.
    const teaserTypes = useMemo(() => {
        if (normalizedMode !== 'teaser') return [];
        const list = Array.isArray(rule?.teaserTypes) ? rule.teaserTypes : [];
        return list.filter((t) => t && t.id && (t.isActive !== false));
    }, [normalizedMode, rule]);
    const selectedTeaserType = useMemo(() => {
        if (!selectedTeaserTypeId) return null;
        return teaserTypes.find((t) => t.id === selectedTeaserTypeId) || null;
    }, [teaserTypes, selectedTeaserTypeId]);

    // Sports present on the slip that the selected type DOESN'T price.
    // Empty when the type covers every slip sport (or no type / no
    // recognized sports). Drives two things: a clear error message
    // and the suppression of the misleading "Select teaser points"
    // hint that fires when auto-sync can't run for an unsupported
    // sport. Example: Super Teaser (football-only) with a basketball
    // leg → ['basketball'].
    const teaserSportsUncovered = useMemo(() => {
        if (!selectedTeaserType) return [];
        if (slipTeaserGroups.length === 0) return [];
        const map = selectedTeaserType.pointsBySport;
        if (!map || typeof map !== 'object') return slipTeaserGroups.slice();
        return slipTeaserGroups.filter((g) => {
            const v = Number(map[g]);
            return !Number.isFinite(v) || v <= 0;
        });
    }, [selectedTeaserType, slipTeaserGroups]);

    // Slip-card line preview. Mirrors the board's `teaserPreview` so the
    // user sees the SAME teased line on their slip leg as on the
    // games board. Returns either a plain string (no teaser adjustment
    // applies) or a React fragment (adjusted line + muted "(BP …)"
    // suffix). Display-only — the slip selection still stores the base
    // point; backend re-applies the adjustment at placement.
    //
    // Plain function (not useCallback) so it picks up the freshly-
    // computed `palette` each render. The work inside is cheap (one
    // arithmetic op + string formatting), and the slip render loop
    // calls it once per leg — memoizing buys nothing measurable.
    const legPreviewLine = (sel) => {
        const baseLabel = betTypeLineLabel(sel);
        if (normalizedMode !== 'teaser' || !selectedTeaserType) return baseLabel;
        const market = String(sel?.marketType || '').toLowerCase();
        if (market !== 'spreads' && market !== 'totals') return baseLabel;
        const sportGroup = teaserSportGroup(sel?.sportKey || sel?.sport);
        if (!sportGroup) return baseLabel;
        const points = teaserPointsForSport(selectedTeaserType, sportGroup);
        if (!points || points <= 0) return baseLabel;
        const adjusted = adjustSpread({
            marketType: market,
            selection: sel?.selection,
            point: sel?.line,
        }, points);
        if (!adjusted || adjusted.teaserAdjustment === 0) return baseLabel;

        // Format adjusted segment + base suffix. Spread keeps its
        // signed convention (+8.5 / -3); totals get an O/U prefix on
        // the base too so "(BP O 48.5)" reads cleanly.
        const trim = (n) => Number(n).toFixed(2).replace(/\.?0+$/, '');
        const baseN = Number(sel?.line);
        const adjN = adjusted.adjustedPoint;
        let mainText;
        let bpText;
        if (market === 'spreads') {
            const adjSign = adjN > 0 ? `+${trim(adjN)}` : trim(adjN);
            const baseSign = baseN > 0 ? `+${trim(baseN)}` : trim(baseN);
            mainText = `Spread ${adjSign}`;
            bpText = `(BP ${baseSign})`;
        } else {
            const isUnder = String(sel?.selection || '').toUpperCase().startsWith('U');
            const sideWord = isUnder ? 'Under' : 'Over';
            const sideShort = isUnder ? 'U' : 'O';
            mainText = `Total ${sideWord} ${trim(Math.abs(adjN))}`;
            bpText = `(BP ${sideShort} ${trim(Math.abs(baseN))})`;
        }
        return (
            <>
                {mainText}
                <span style={{
                    color: palette.textMuted || '#6b7280',
                    fontWeight: 500,
                    marginLeft: 6,
                    fontSize: '0.92em',
                }}>
                    {bpText}
                </span>
            </>
        );
    };

    // When a teaser type is picked AND the slip has exactly one sport
    // group, auto-sync the legacy `teaserPoints` value from the type's
    // pointsBySport map. Backend still validates the submitted value,
    // but driving it from the type means the user picks ONCE (the
    // type) instead of also picking the matching point button.
    // Mixed-sport slips are rejected at placement so we don't try to
    // pick a points value here — the user will see the error first.
    useEffect(() => {
        if (normalizedMode !== 'teaser') return;
        if (!selectedTeaserType) return;
        if (slipTeaserGroups.length !== 1) return;
        const sport = slipTeaserGroups[0];
        const pts = Number(selectedTeaserType?.pointsBySport?.[sport]);
        if (!Number.isFinite(pts) || pts <= 0) return;
        if (Number(teaserPoints) === pts) return;
        onTeaserPointsChange(String(pts));
    }, [normalizedMode, selectedTeaserType, slipTeaserGroups, teaserPoints, onTeaserPointsChange]);

    // teaserValid logic stays the same for legacy clients (no type
    // picked → must match the legacy point list). New clients with a
    // type picked are already constrained by the auto-sync above, so
    // teaserValid still passes once a sport-compatible type is in play.
    const teaserValid = normalizedMode !== 'teaser'
        || activeTeaserPointOptions.length === 0
        || activeTeaserPointOptions.includes(teaserPointValue);
    // Whether the slip is ready to ADD legs in teaser mode. False until
    // a type is picked from the new picker; legacy clients (rule with
    // no teaserTypes) skip this gate.
    const teaserTypeRequired = normalizedMode === 'teaser' && teaserTypes.length > 0;
    const teaserTypeReady = !teaserTypeRequired || !!selectedTeaserType;

    // Snap a raw decimal price to the exact decimal derived from its
    // American-integer rounding — the same basis the backend stores
    // (`oddsAmerican` → `americanToDecimalExact`). Without this snap,
    // a leg with raw upstream decimal 1.34 multiplied against another
    // 1.81 produces a combined of 2.4254, while the backend's
    // exact-decimal pair (1.34014 × 1.81301) is 2.4297. The two
    // diverge on the Win readout: resolveStake snaps to American +143
    // for Risk, but potentialPayout used the raw product, so a typed
    // $1000 win rendered as $997. Snapping per leg keeps both sides
    // using one consistent basis.
    const exactDecimalForLeg = (rawDecimal) => {
        const american = decimalToAmerican(rawDecimal);
        if (american === null) {
            const n = Number(rawDecimal);
            return Number.isFinite(n) && n > 1 ? n : 1;
        }
        const exact = americanToDecimal(american);
        return Number.isFinite(exact) && exact > 1 ? exact : 1;
    };

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
            const combined = selections.reduce((acc, sel) => acc * exactDecimalForLeg(sel?.odds), 1);
            return applySgpHaircut(combined, sgpHaircutFraction(selections));
        }
        if (normalizedMode === 'if_bet' || normalizedMode === 'reverse') {
            const firstTwo = selections.slice(0, 2);
            if (firstTwo.length < 2) return null;
            return firstTwo.reduce((acc, sel) => acc * exactDecimalForLeg(sel?.odds), 1);
        }
        if (normalizedMode === 'teaser') {
            // Teaser's stored "multiplier" IS already decimal odds — the
            // backend computes total payout as risk × multiplier (see
            // SportsbookBetSupport::potentialPayout), exactly the same
            // shape parlay uses with combined decimal odds. So the slip's
            // ticketDecimalOdds for teaser is just the multiplier value;
            // resolveStake's Win→Risk back-calc then matches what the
            // backend will price the bet at, rather than drifting (an
            // earlier `1 + multiplier` form double-counted the +1 and
            // produced a Risk preview ~38% too low for a typed Win).
            const m = getTeaserMultiplier(rule, legCount, selectedTeaserType);
            return Number.isFinite(m) && m > 1 ? m : null;
        }
        return null;
    }, [normalizedMode, selections, legCount, rule, selectedTeaserType]);

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
        // Surface which interpretation drove the math so winForSelection
        // can decide whether to send requestedWin to the backend. In Bet
        // mode each leg resolves independently — a -110 spread leg gets
        // source='win' (pin the typed dollars-to-win), a +345 dog leg
        // gets source='risk' (let the backend back-compute payout).
        const computedSource = stakeMode === 'bet'
            ? resolveBetSmartMode(sel?.odds)
            : stakeMode;
        return { ...computed, source: computedSource };
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

    // Per-leg user-intended Win for STRAIGHT mode. When the user typed in
    // Win mode (or edited the per-card Win input), this is the exact $$$
    // they want the bet to pay — passed to the backend as `requestedWin`
    // so potentialPayout is pinned to (risk + requestedWin) instead of
    // back-computed from rounded risk × decimal odds (which drifts to
    // $999 / $1001 on a typed $1000 win).
    const winForSelection = React.useCallback((sel) => {
        if (normalizedMode !== 'straight') return 0;
        const { win, source } = effectiveStakeForSelection(sel);
        if (source !== 'win' && stakeMode !== 'win') return 0;
        return Number.isFinite(win) && win > 0 ? Math.round(win) : 0;
    }, [normalizedMode, effectiveStakeForSelection, stakeMode]);

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
    //
    // Reverse is special: a 2-leg reverse is two if-bets (A→B and B→A),
    // each staking `unitStake`. Total risk = 2 × unitStake; total max
    // win = 2 × unitStake × (decAB − 1). The user types ONE number
    // (`wager`) and expects it to be the *total* — i.e. typing $1000 in
    // RISK mode should risk $1000, not $2000. So derive the per-direction
    // unitStake from half the wager, which is what the backend stores
    // as `amount` and doubles back to total risk.
    const effectiveCombinedRisk = useMemo(() => {
        if (normalizedMode === 'straight') return 0;
        // Nicky's rule: "a parlay always risks the base amount they choose."
        // For parlay (and open parlay → normalizedMode === 'parlay') the typed
        // number IS the risk — never the Bet-mode To-Win anchor, which grossed
        // up the stake on minus odds (typed $1,000 → risk $1,040 at ~-104) and
        // both displayed AND debited that inflated number. Risk-anchor here so
        // the typed base is exactly what's charged, regardless of the Bet/Risk/
        // Win pill, and To-Win is derived downstream (risk × combined decimal).
        // Other combined modes (teaser/if_bet/reverse) keep their To-Win
        // conversion unchanged.
        if (normalizedMode === 'parlay') {
            return Number.isFinite(wagerAmount) && wagerAmount > 0 ? wagerAmount : 0;
        }
        const sourceWager = normalizedMode === 'reverse' ? wagerAmount / 2 : wagerAmount;
        const { risk } = resolveStake(stakeMode, sourceWager, ticketDecimalOdds);
        return Number.isFinite(risk) && risk > 0 ? risk : 0;
    }, [normalizedMode, stakeMode, wagerAmount, ticketDecimalOdds]);

    // Per-account min/max bet limits from /auth/me payload. Backend
    // already enforces these (BetsController::placeBet) — checking
    // client-side too gives instant feedback instead of a round-trip
    // error after the user clicks Place Bet.
    //
    // Risk-anchored semantics (matches what mainstream sportsbooks
    // mean by "max bet"): both min and max gate the player's stake,
    // not the operator's payout. A $2k max bet means "you can put
    // down at most $2k on one ticket" — the win can be whatever the
    // odds resolve to, including $20k on a +900 underdog. This used
    // to be win-anchored, but that blocked otherwise-legal underdog
    // tickets the player expected to be allowed.
    //
    // Available credit is enforced separately at submit time (see the
    // totalRisk vs effectiveAvailableBalance check below) — that's
    // a wallet-level guard, not a per-ticket limit.
    //
    // Returns:
    //   - messages: { min, max } risk-anchored context strings that
    //     name the offending leg + actual numbers, e.g.
    //     "Max bet $2000 — 'Pirates vs Giants' risks $2500".
    //   - violatingIds: Set of selection IDs whose Risk trips a
    //     limit, used to flag the offending card with a red border.
    const limitFlags = useMemo(() => {
        const violatingIds = new Set();
        const messages = { min: null, max: null, capInfo: null };
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

        // Both min and max are risk-anchored on straight tickets: the
        // stake side has to land inside [minBet, maxBet]. The win side
        // is bounded only by the underlying odds × stake; an underdog
        // payout is allowed to exceed maxBet.
        if (normalizedMode === 'straight') {
            for (const sel of selections) {
                const { risk, win } = effectiveStakeForSelection(sel);
                if (!(risk > 0) && !(win > 0)) continue;
                const minBreach = hasMin && risk > 0 && risk < minBet;
                const maxBreach = hasMax && risk > maxBet;
                if (minBreach && !messages.min) {
                    messages.min = `Min bet $${minBet} — ${labelFor(sel)} risks only $${fmt(risk)}`;
                }
                if (maxBreach && !messages.max) {
                    messages.max = `Max bet $${maxBet} — ${labelFor(sel)} risks $${fmt(risk)}`;
                }
                if (minBreach || maxBreach) violatingIds.add(sel.id);
            }
        } else if (effectiveCombinedRisk > 0) {
            const winValue = effectiveCombinedRisk * Math.max(0, Number(ticketDecimalOdds) - 1);
            // Combined modes (parlay/teaser/if_bet/reverse) get the
            // same risk-side max-bet check as straight tickets — the
            // operator's "max bet" rule should apply to ticket stake
            // regardless of mode. ON TOP of that there's a payout
            // ceiling at 3× maxBet (operator policy on multi-leg
            // long shots): payouts above the ceiling aren't rejected,
            // they're just capped, and we surface an informational
            // "winnings capped" note instead of a hard block.
            const parlayPayoutCap = hasMax ? maxBet * 3 : 0;
            if (hasMin && effectiveCombinedRisk < minBet) {
                messages.min = `Min bet $${minBet} — ticket risks only $${fmt(effectiveCombinedRisk)}`;
            }
            if (hasMax && effectiveCombinedRisk > maxBet) {
                messages.max = `Max bet $${maxBet} — ticket risks $${fmt(effectiveCombinedRisk)}`;
            }
            if (parlayPayoutCap > 0 && winValue > parlayPayoutCap) {
                messages.capInfo = `Max parlay payout $${fmt(parlayPayoutCap)} — winnings capped (uncapped: $${fmt(winValue)})`;
            }
        }
        return { violatingIds, messages };
    }, [normalizedMode, selections, effectiveStakeForSelection, effectiveCombinedRisk, ticketDecimalOdds, user?.minBet, user?.maxBet]);

    // ── Round Robin derived state ────────────────────────────────────
    // Available "By X's" sizes given the current selection count. Round
    // Robin is undefined for fewer than 3 legs and capped at 8; sizes
    // outside [2, n-1] aren't generated by the backend so we don't
    // offer them either. Drops sizes that fall out of range whenever
    // the slip's legCount changes.
    const roundRobinAvailableSizes = useMemo(() => {
        if (legCount < 3) return [];
        const sizes = [];
        for (let k = 2; k < legCount; k++) sizes.push(k);
        return sizes;
    }, [legCount]);
    useEffect(() => {
        if (normalizedMode !== 'round_robin') return;
        const allowed = new Set(roundRobinAvailableSizes);
        setRoundRobinSizes(prev => {
            const filtered = prev.filter(s => allowed.has(s));
            return filtered.length === prev.length ? prev : filtered;
        });
    }, [normalizedMode, roundRobinAvailableSizes]);

    const roundRobinParlayCount = useMemo(() => {
        if (normalizedMode !== 'round_robin') return 0;
        return roundRobinCombinationCount(legCount, roundRobinSizes);
    }, [normalizedMode, legCount, roundRobinSizes]);

    const roundRobinMaxParlays = Number(rule?.maxParlaysPerGroup) > 0
        ? Number(rule.maxParlaysPerGroup)
        : DEFAULT_RULES.round_robin.maxParlaysPerGroup;

    // Per-parlay stake — the wager input is interpreted as "stake per
    // parlay" in Round Robin mode (the spec is explicit on this) so
    // typing $25 with 6 parlays = $150 total risk. Stake stays in Risk
    // mode regardless of the global Risk/Win toggle: a "win $X" target
    // is ambiguous when each child parlay has different combined odds,
    // and the standard sportsbook UX is per-parlay risk.
    const roundRobinStakePerParlay = useMemo(() => {
        if (normalizedMode !== 'round_robin') return 0;
        const n = Number(wagerAmount);
        return Number.isFinite(n) && n > 0 ? n : 0;
    }, [normalizedMode, wagerAmount]);

    const roundRobinTotalRisk = roundRobinStakePerParlay * roundRobinParlayCount;

    // Sum of every child parlay's max payout — read-only display.
    const roundRobinMaxWin = useMemo(() => {
        if (normalizedMode !== 'round_robin' || roundRobinParlayCount === 0 || roundRobinStakePerParlay <= 0) return 0;
        let total = 0;
        for (const size of roundRobinSizes) {
            const k = Number(size);
            if (!Number.isFinite(k) || k < 2 || k >= legCount) continue;
            // For each combination at this size, payout = stake × product(odds).
            // Iterating combinations to sum exactly matches the backend's
            // child-by-child accumulator and handles uneven leg odds
            // correctly (no shortcut average works here).
            const visit = (start, acc) => {
                if (acc.length === k) {
                    let combined = 1;
                    for (const idx of acc) combined *= exactDecimalForLeg(selections[idx]?.odds);
                    total += roundRobinStakePerParlay * combined;
                    return;
                }
                for (let i = start; i < legCount; i++) {
                    acc.push(i);
                    visit(i + 1, acc);
                    acc.pop();
                }
            };
            visit(0, []);
        }
        return total;
    }, [normalizedMode, roundRobinSizes, roundRobinStakePerParlay, roundRobinParlayCount, legCount, selections]);

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
            // Round Robin substitutes its own wager rule (per-parlay
            // stake × N parlays) for the single-ticket effectiveCombinedRisk
            // check; the regular check would mis-fire because there's no
            // single combined-odds figure for an N-parlay fan-out.
            if (normalizedMode === 'round_robin') {
                if (roundRobinSizes.length === 0) {
                    errors.push('Pick at least one Round Robin size (e.g. By 2’s)');
                }
                if (roundRobinStakePerParlay <= 0) {
                    errors.push('Enter a stake per parlay');
                }
                if (roundRobinParlayCount > roundRobinMaxParlays) {
                    errors.push(`Round Robin generates ${roundRobinParlayCount} parlays — limit is ${roundRobinMaxParlays}. Pick fewer sizes or selections.`);
                }
            } else if (effectiveCombinedRisk <= 0) {
                errors.push('Enter a valid wager amount');
            }
        }
        if (selectedTeaserType && teaserSportsUncovered.length > 0) {
            // Selected type can't price every sport on the slip.
            // Suppress the legacy "Select teaser points" hint because
            // the user can't satisfy it — the missing sport isn't in
            // the type's points table at all. The fix is to pick a
            // different type or remove the incompatible legs.
            const missing = teaserSportsUncovered.join(' / ');
            const label = selectedTeaserType.label || 'Selected teaser type';
            errors.push(`${label} doesn't cover ${missing}. Pick a different teaser type or remove ${missing} legs.`);
        } else if (!teaserValid) {
            errors.push(`Select teaser points: ${activeTeaserPointOptions.join(', ')}`);
        }
        // New picker flow: when the rule ships teaserTypes, the user
        // must pick one before placing. Legacy seeds (no teaserTypes
        // on the rule) skip this — teaserValid above handles them.
        if (teaserTypeRequired && !teaserTypeReady) {
            errors.push('Choose a teaser type to continue');
        }
        // Type-specific leg-count bounds. Surfaces only when the picked
        // type carries stricter bounds than the rule-level 2/6 above —
        // Super Teaser starts at 3 because its multiplier table has no
        // 2-team entry. Mirrors the backend check at BetsController so
        // Place stays disabled before submit instead of round-tripping
        // a 400 the user can't act on without re-staging the slip.
        if (selectedTeaserType) {
            const typeMin = Number.isFinite(Number(selectedTeaserType?.minLegs))
                ? Number(selectedTeaserType.minLegs) : null;
            const typeMax = Number.isFinite(Number(selectedTeaserType?.maxLegs))
                ? Number(selectedTeaserType.maxLegs) : null;
            const typeLabel = selectedTeaserType.label || 'Teaser type';
            if (typeMin !== null && legCount < typeMin) {
                errors.push(`${typeLabel} requires at least ${typeMin} teams`);
            }
            if (typeMax !== null && legCount > typeMax) {
                errors.push(`${typeLabel} allows at most ${typeMax} teams`);
            }
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
            // Per-sport teaser eligibility. Real US sportsbooks only offer
            // teasers on football and basketball — other sports' spreads
            // don't move enough to make a teaser meaningful. Legs without
            // a sportKey (older dispatchers haven't been threaded through
            // yet) are skipped at the frontend; the backend gate is the
            // source of truth and will catch them at placement.
            const ineligibleLegs = selections.filter((sel) => {
                const key = String(sel?.sportKey || '').toLowerCase();
                if (!key) return false;
                return teaserSportGroupOf(key) === null;
            });
            if (ineligibleLegs.length > 0) {
                errors.push('Teasers are only available on football and basketball — remove other-sport legs');
            }
            // Mixed-sport teasers are non-product. Football and
            // basketball teasers use different point values (6/6.5/7
            // vs 4/4.5/5), so a single ticket spanning both can't be
            // priced consistently. Backend also rejects this; the
            // matching frontend message keeps Place disabled and tells
            // the user exactly what to do.
            if (slipTeaserGroups.length > 1) {
                errors.push(`Teasers can't mix sports — split your ${slipTeaserGroups.join(' + ')} legs into separate teaser tickets`);
            }
        }
        // Open parlay: the declared leg count must be within 2–8 and never
        // below the legs already in the slip. The clamp effect normally keeps
        // this satisfied, but guard at submit so Place stays disabled (instead
        // of round-tripping the backend's OPEN_PARLAY_TARGET_LEGS_INVALID) if
        // the slip somehow holds more legs than the declared count.
        if (isOpenParlay) {
            if (openParlayTargetLegs < OPEN_PARLAY_MIN_LEGS || openParlayTargetLegs > OPEN_PARLAY_MAX_LEGS) {
                errors.push(`Choose how many legs this open parlay will have (${OPEN_PARLAY_MIN_LEGS}–${OPEN_PARLAY_MAX_LEGS})`);
            } else if (legCount > openParlayTargetLegs) {
                errors.push(`You've selected ${legCount} legs — declare at least ${legCount} for this open parlay`);
            }
        }
        if (!selections.every(sel => Number.isFinite(Number(sel.odds)) && Number(sel.odds) > 0)) {
            errors.push('One or more selections have invalid odds');
        }
        if (limitFlags.messages.min) errors.push(limitFlags.messages.min);
        if (limitFlags.messages.max) errors.push(limitFlags.messages.max);
        return errors;
    }, [legCount, normalizedMode, rule, selections, effectiveCombinedRisk, teaserValid, hasAnyStraightAmount, limitFlags, roundRobinSizes, roundRobinStakePerParlay, roundRobinParlayCount, roundRobinMaxParlays, activeTeaserPointOptions, slipTeaserGroups, selectedTeaserType, teaserTypeRequired, teaserTypeReady, isOpenParlay, openParlayTargetLegs]);

    const ticketSignature = useMemo(() => JSON.stringify({
        type: normalizedMode,
        amount: Number.isFinite(effectiveCombinedRisk) ? Math.round(effectiveCombinedRisk) : null,
        teaserPoints: normalizedMode === 'teaser' ? Math.round(teaserPointValue) : 0,
        selections: selections.map((sel) => ({
            matchId: String(sel?.matchId || ''),
            selection: String(sel?.selection || ''),
            marketType: String(sel?.marketType || ''),
            odds: Number.isFinite(Number(sel?.odds)) ? Number(Number(sel.odds).toFixed(4)) : null,
            ...(Number.isFinite(Number(sel?.point)) ? { point: Number(sel.point) } : {}),
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
            // Snap each leg's decimal through American int (matches
            // resolveStake's basis and the backend's exactDecimalForSelection).
            // Raw-decimal multiplication previously made Win read $997
            // for a typed $1000 because Risk used American int but
            // payout used raw decimals.
            const realCombined = applySgpHaircut(
                selections.reduce((acc, sel) => acc * exactDecimalForLeg(sel?.odds), 1),
                sgpHaircutFraction(selections),
            );
            // Open parlay PREVIEW: price as if all declared legs already exist.
            // Each unfilled slot (targetLegs − legCount) is a -110 placeholder,
            // so the previewed payout shows the full declared parlay. PREVIEW
            // ONLY — placeholders never reach placeOpenParlay / addOpenParlayLeg
            // / settlement. The preview intentionally starts high and shrinks
            // toward the true odds as real (often favored) legs replace
            // placeholders; displayWinAmount clamps it to the 3×maxBet cap.
            // Lock the combined to the rounded American line — the SAME basis
            // the backend stores (calculatePotentialPayout) and settles at, so
            // the slip's To-Win, stored potentialPayout, and payout never
            // diverge (Nicky's convention: $1,400, not $1,398.50). Applied to
            // the placeholder-inclusive open-parlay preview too so placement
            // and pending display stay on one number.
            if (isOpenParlay) {
                const placeholderCount = Math.max(0, openParlayTargetLegs - legCount);
                const combined = placeholderCount > 0
                    ? realCombined * Math.pow(americanToDecimal(OPEN_PARLAY_PLACEHOLDER_AMERICAN), placeholderCount)
                    : realCombined;
                return effectiveCombinedRisk * roundCombinedToAmericanDecimal(combined);
            }
            return effectiveCombinedRisk * roundCombinedToAmericanDecimal(realCombined);
        }
        if (normalizedMode === 'teaser') {
            return effectiveCombinedRisk * getTeaserMultiplier(rule, legCount, selectedTeaserType);
        }
        if (normalizedMode === 'if_bet') {
            const firstTwo = selections.slice(0, 2).reduce((acc, sel) => acc * exactDecimalForLeg(sel?.odds), 1);
            return effectiveCombinedRisk * firstTwo;
        }
        if (normalizedMode === 'reverse') {
            const firstTwo = selections.slice(0, 2).reduce((acc, sel) => acc * exactDecimalForLeg(sel?.odds), 1);
            return effectiveCombinedRisk * firstTwo * 2;
        }
        if (normalizedMode === 'round_robin') {
            // Gross payout (stake + profit) summed across every generated
            // child parlay. Matches the betslip's Max Win: the modal then
            // computes profit as potentialPayout − totalRisk and shows the
            // same number the user just saw on the slip.
            return roundRobinMaxWin;
        }
        return 0;
    }, [effectiveCombinedRisk, legCount, normalizedMode, selections, rule, selectedTeaserType, wagerForSelection, roundRobinMaxWin, isOpenParlay, openParlayTargetLegs]);

    const totalRisk = normalizedMode === 'reverse'
        ? effectiveCombinedRisk * 2
        : normalizedMode === 'straight'
            ? straightTotalRisk
            : normalizedMode === 'round_robin'
                ? roundRobinTotalRisk
                : effectiveCombinedRisk;

    // Combined-mode parlay payout cap: 3 × the player's max bet. Mirrors
    // the server-side clamp in BetsController so the Win readout never
    // promises more than the player will actually be paid out.
    const parlayPayoutCap = useMemo(() => {
        if (normalizedMode === 'straight') return 0;
        const maxBet = Number(user?.maxBet);
        return Number.isFinite(maxBet) && maxBet > 0 ? maxBet * 3 : 0;
    }, [normalizedMode, user?.maxBet]);

    // Display win = profit on full payoff. For combined modes, clamp at
    // the parlay payout cap so the user sees the same number the book
    // will actually credit.
    const displayWinAmount = useMemo(() => {
        // Win-mode pinning: when the user typed in WIN mode, the
        // backend pins potentialPayout = totalRisk + requestedWin
        // within ±$2 (BetsController.php:319-326), so the player is
        // guaranteed exactly the amount they typed. Display the same
        // value rather than the back-computed approximation —
        // floating-point drift between the per-leg snapped decimals
        // and the rounded-to-2dp Risk previously made a typed $1000
        // render as $999.79 even though the placed bet pays $1000.
        // Risk-mode keeps the recompute path because there's no
        // single user-typed Win to anchor against; we want the
        // payout based on actual stake × combined odds.
        // Bet mode anchors the same way Win mode does when the combined
        // ticket prices as minus juice — typed dollars-to-win must render
        // as the exact typed value (no $999.79 drift on a typed $1000).
        // Plus-juice Bet mode pins risk, so the back-computed payout is
        // already exact.
        const summarySmartMode = stakeMode === 'bet'
            ? resolveBetSmartMode(ticketDecimalOdds)
            : stakeMode;
        let rawWin;
        // Open parlay is risk-anchored: the displayed Win is always the
        // (capped) preview payout derived from the committed stake and the
        // full declared parlay (real legs + -110 placeholders) — never a
        // typed Win, since the odds aren't final while legs are still being
        // filled. So bypass the Win-mode pin for open parlays.
        // Parlays risk-anchor (Nicky's rule): the typed number is the RISK, so
        // To-Win is always the derived payout (risk × combined odds − risk),
        // never the typed value. Open parlay is already excluded via
        // !isOpenParlay; excluding normalizedMode 'parlay' also covers closed
        // parlays. Teaser/if_bet/reverse keep typed-Win pinning.
        if (!isOpenParlay && normalizedMode !== 'parlay' && summarySmartMode === 'win' && wagerAmount > 0 && legCount > 0 && normalizedMode !== 'straight') {
            rawWin = wagerAmount;
        } else {
            rawWin = Math.max(0, potentialPayout - totalRisk);
        }
        if (parlayPayoutCap > 0 && rawWin > parlayPayoutCap) return parlayPayoutCap;
        return rawWin;
    }, [stakeMode, wagerAmount, legCount, normalizedMode, potentialPayout, totalRisk, parlayPayoutCap, ticketDecimalOdds, isOpenParlay]);
    // Use the same pool the top bar's AVAILABLE tile shows: creditAvailable
    // for credit accounts, availableBalance for cash accounts. Otherwise the
    // bet-placement guard rejects with "Insufficient balance: $0.00" while
    // the user sees "AVAILABLE: $10,000".
    const parsedAvailableBalance = Number(headerAvailable);
    // When freeplay is checked, the player can stake up to freeplay + real
    // available — we apply freeplay first and charge the difference to the
    // real balance / credit line. The backend mirrors this split.
    const safeAvailable = Number.isFinite(parsedAvailableBalance) ? parsedAvailableBalance : 0;
    const effectiveAvailableBalance = useFreeplay
        ? parsedFreeplayBalance + safeAvailable
        : safeAvailable;
    const canPlace = validationErrors.length === 0 && !placing;
    // Pluck the amount-related warning (if any) for inline display under
    // the Bet Amount input. Matches the prefixes the validation builder
    // emits so the same string drives both the inline pill and the
    // disabled-button state.
    // Cap notices ("Max parlay payout …") are informational, not blocking
    // — they don't enter validationErrors, so the user can still place
    // the bet. Actual settled winnings are clamped server-side at the
    // same cap. Falls back to the cap message when no Min/Max bet error
    // is present.
    const amountWarning = validationErrors.find((e) =>
        typeof e === 'string' && (e.startsWith('Min bet') || e.startsWith('Max bet'))
    ) || limitFlags.messages.capInfo || '';
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
            // Re-seed the mode only on the FIRST open per session/mode/
            // user context so a manual WIN click doesn't get nuked when
            // the user closes-and-reopens the slip. The ref is reset
            // when normalizedMode or user?.id changes (see the dedicated
            // effect below) so a context switch still picks up the
            // saved default on its next first open.
            if (!slipFirstOpenedRef.current) {
                slipFirstOpenedRef.current = true;
                setStakeMode(defaultStakeMode);
            }
        };
        window.addEventListener('betslip:open', handleOpen);
        return () => window.removeEventListener('betslip:open', handleOpen);
    }, []);

    // Reset the first-open gate on bet-mode change and user change.
    // Mode change already clears teaser-specific state via the parent's
    // onModeChange wrapper (selections/teaserTypeId reset there); this
    // mirrors that for the stake-mode reset so a fresh context behaves
    // like a fresh session. User change also resets so account switches
    // (or login after logout) pick up the new user's saved default.
    useEffect(() => {
        slipFirstOpenedRef.current = false;
    }, [normalizedMode, user?.id]);

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
    // Shared dismiss behavior for the Buy Points dropdown: ESC / browser Back /
    // a nav-tab tap close it (it's the topmost transient surface while open).
    // The betslip itself isn't registered, so when no dropdown is open a tab
    // tap still switches bet mode as before.
    useDismissableSurface(openBuyPointsId !== null, () => setOpenBuyPointsId(null));

    // Apply a Buy Points alternate to a selection. Mutates this leg's
    // line + odds AND records the audit fields the placement payload
    // sends to the backend: `boughtPoints` (magnitude), `originalLine`,
    // `originalOdds`. The backend re-derives the expected American
    // price from BuyPointsPricing and rejects mismatched submissions —
    // so these fields aren't trusted, they're just what the client
    // believes (and what the API needs to know to even ATTEMPT the buy).
    //
    // We snapshot `originalLine` / `originalOdds` from the FIRST apply,
    // not from every apply: once the user has bought 0.5 points and
    // the line shows -3, a second apply that lands on -2.5 needs to
    // know the true pregame line was -3.5 so the boughtPoints sum
    // (=1.0) matches what the backend will compute.
    const applyBuyPoints = (selId, option) => {
        onSelectionsChange(
            selections.map((s) => {
                if (s.id !== selId) return s;
                const originalLine = Number.isFinite(Number(s.originalLine)) ? Number(s.originalLine) : Number(s.line);
                const originalOdds = Number.isFinite(Number(s.originalOdds)) ? Number(s.originalOdds) : Number(s.odds);
                const market = String(s.marketType || '').toLowerCase();
                // boughtPoints = magnitude. Direction is implicit from
                // market + side (mirrors the backend convention in
                // BuyPointsPricing::signedPointDelta).
                let bought = 0;
                if (Number.isFinite(originalLine) && Number.isFinite(Number(option.line))) {
                    if (market === 'spreads') {
                        bought = Number(option.line) - originalLine;
                    } else if (market === 'totals') {
                        const isUnder = String(s?.selection || '').toUpperCase().startsWith('U');
                        bought = isUnder
                            ? Number(option.line) - originalLine
                            : originalLine - Number(option.line);
                    }
                }
                // Snap to a half-point grid. SIGNED: positive = buy (easier),
                // negative = sell (harder line, better payout). Selecting the
                // original row produces bought ≈ 0.
                const snapped = Math.round(bought * 2) / 2;
                return {
                    ...s,
                    line: option.line,
                    odds: option.decimalOdds,
                    originalLine,
                    originalOdds,
                    boughtPoints: snapped,
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
        legRequestStateRef.current = { signature: '', ids: {} };
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

    // Stable-per-leg requestId for straight mode (see legRequestStateRef).
    const getRequestIdForLeg = (legId) => {
        if (legRequestStateRef.current.signature !== ticketSignature) {
            legRequestStateRef.current = { signature: ticketSignature, ids: {} };
        }
        const key = String(legId);
        if (!legRequestStateRef.current.ids[key]) {
            legRequestStateRef.current.ids[key] = createRequestId();
        }
        return legRequestStateRef.current.ids[key];
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
            const msg = useFreeplay
                ? `Bet exceeds freeplay + available. Combined: $${formatAmount(effectiveAvailableBalance)}`
                : `Insufficient balance for this bet. Available: $${formatAmount(effectiveAvailableBalance)}`;
            setMessage({ type: 'error', text: msg });
            showToast(msg, 'error');
            return;
        }
        setShowConfirm(true);
    };

    // ODDS_CHANGED auto-recovery. The backend now returns every moved
    // leg in a single 409 (`legs: [{matchId, selection, marketType,
    // officialOdds, ...}]`); patch each leg's odds in the slip in place
    // and surface a "review and confirm" banner so the user closes the
    // loop with one explicit tap. Returns true when it handled the
    // error so the calling catch can short-circuit its generic toast.
    // Falls back to the legacy single-leg payload (officialOdds /
    // selection / matchId at the top level) for older backends.
    const handleOddsChanged = (error) => {
        if (!error || String(error.code || '') !== 'ODDS_CHANGED') return false;
        const rawLegs = Array.isArray(error.legs) && error.legs.length > 0
            ? error.legs
            : (error.matchId && error.officialOdds
                ? [{
                    matchId: error.matchId,
                    selection: error.selection,
                    marketType: error.marketType,
                    officialOdds: error.officialOdds,
                    officialAmericanOdds: error.officialAmericanOdds,
                }]
                : []);
        if (rawLegs.length === 0) return false;

        const matchKey = (matchId, marketType, selection) =>
            `${String(matchId || '')}::${String(marketType || '').toLowerCase()}::${String(selection || '')}`;
        const updates = new Map();
        for (const leg of rawLegs) {
            const odds = Number(leg?.officialOdds);
            if (!Number.isFinite(odds) || odds <= 1) continue;
            updates.set(matchKey(leg.matchId, leg.marketType, leg.selection), odds);
        }
        if (updates.size === 0) return false;

        // Compute the patch SYNCHRONOUSLY against the current slip so
        // patchedCount is reliable. (Previously this counter was incremented
        // inside a setState updater, which React runs LATER during render — so
        // the patchedCount===0 check below always saw 0 and every odds change
        // dead-ended at "couldn't be refreshed", even when legs did match.)
        // The submission lock holds the slip stable during placement, so
        // reading `selections` here is safe.
        let patchedCount = 0;
        const patched = selections.map((s) => {
            // Backend may not echo the marketType verbatim — try a
            // marketType-qualified match first, then fall back to
            // (matchId, selection) so a leg whose marketType lookup
            // differs (e.g. spreads vs alternate spreads) still gets
            // patched. Without the fallback, the slip would silently
            // keep the stale price and the next click would fail again.
            const qualified = updates.get(matchKey(s.matchId, s.marketType, s.selection));
            const fallback = qualified === undefined
                ? Array.from(updates.entries()).find(([k]) => k.startsWith(`${String(s.matchId || '')}::`) && k.endsWith(`::${String(s.selection || '')}`))?.[1]
                : undefined;
            const next = qualified ?? fallback;
            if (next === undefined) return s;
            patchedCount += 1;
            // Drop any locally-typed wagerOverride: the user staked
            // against the old price, so re-running it through the same
            // override at a worse price would risk-bust their intent.
            // Letting the top Bet Amount auto-flow through (or having
            // them re-type) is the safe default after a price move.
            const { wagerOverride: _drop, ...rest } = s;
            return { ...rest, odds: next };
        });
        if (patchedCount > 0) {
            onSelectionsChange(patched);
        }

        // Force a fresh requestId on the next click — the slip
        // signature changes when we patch odds, but we also clear
        // explicitly here so the retry never collides with the
        // failed request's idempotency record.
        requestStateRef.current = { requestId: '', signature: '' };

        // Loop-proofing: the "tap PLACE to confirm" banner is ONLY safe to
        // show once we've actually rewritten at least one leg's baseline odds
        // to the server's new price. If patchedCount === 0 the slip still
        // holds the SAME stale price, so a second PLACE tap re-sends it and
        // the backend rejects again — the exact infinite confirm loop this
        // bug was. When nothing matched (e.g. a leg the backend identifies by
        // a name we can't reconcile), give an actionable dead-end instead of
        // inviting a doomed retry, so a loop can never form structurally —
        // independent of how cleanly the backend echoes the selection.
        if (patchedCount === 0) {
            const text = 'Odds changed — this selection couldn’t be refreshed automatically. Please remove and re-add it, then place again.';
            setMessage({ type: 'error', text });
            showToast(text, 'error');
            return true;
        }

        const text = patchedCount > 1
            ? `Odds updated on ${patchedCount} legs — review and tap PLACE to confirm at the new price.`
            : 'Odds updated — review and tap PLACE to confirm at the new price.';
        setMessage({ type: 'error', text });
        showToast(text, 'warning');
        return true;
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

        // Open parlay disallows freeplay (backend rejects useFreeplay with
        // OPEN_PARLAY_NO_FREEPLAY), so force it off regardless of the toggle.
        const useFp = !isOpenParlay && useFreeplay && hasFreeplay;

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
                    .map((sel) => ({ sel, amount: wagerForSelection(sel), requestedWin: winForSelection(sel) }))
                    .filter(({ amount }) => amount > 0);
                // Collect each leg's placement response so the Wager
                // Confirmed sheet can show one ticket card per leg —
                // straight mode places N independent tickets, all of
                // which are receipts the user expects to see.
                const placedTickets = [];
                for (const { sel, amount, requestedWin } of legsToSubmit) {
                    const payload = {
                        type: 'straight',
                        amount,
                        // Pin the user's typed Win so the backend doesn't
                        // back-compute payout from rounded risk × odds (which
                        // drifts to $999/$1001 on a typed $1000 win).
                        ...(requestedWin > 0 ? { requestedWin } : {}),
                        teaserPoints: 0,
                        useFreeplay: useFp,
                        // Tell the backend how many tickets this slip is
                        // about to place so it can refuse useFreeplay=true
                        // on a multi-bet straight slip. Frontend already
                        // gates the checkbox, but a tampered client can't
                        // bypass this without the backend cooperating.
                        slipSize: legsToSubmit.length,
                        selections: [{
                            matchId: sel.matchId,
                            selection: sel.selection,
                            odds: Number(sel.odds),
                            type: sel.marketType || 'h2h',
                            marketType: sel.marketType || 'h2h',
                            // Exact alt rung point (signed) so the server pins
                            // the rung by (name + point), not name alone.
                            ...(Number.isFinite(Number(sel.point)) ? { point: Number(sel.point) } : {}),
                            // Buy Points (spread/total only). SIGNED: + buys
                            // (easier), - sells (harder). Omitted when 0 so
                            // legacy backends don't see an unexpected field;
                            // backend default is 0.0 either way.
                            ...(Math.abs(Number(sel.boughtPoints)) > 1e-9 ? { boughtPoints: Number(sel.boughtPoints) } : {}),
                            // MLB listed-pitcher Action waiver, per side.
                            ...(isMlbSportKey(sel.sportKey) ? { pitcherAction: { home: !!sel.pitcherAction?.home, away: !!sel.pitcherAction?.away } } : {}),
                        }],
                        // Legacy top-level mirror for older backend path.
                        matchId: sel.matchId,
                        selection: sel.selection,
                        odds: Number(sel.odds),
                        marketType: sel.marketType || 'h2h',
                    };
                    // Per-leg request id: unique across legs (so the backend
                    // doesn't collapse them into one bet) but STABLE across
                    // retries of this same slip/leg (so a leg that committed
                    // server-side then lost its response can't double-place —
                    // the retry hits the idempotency replay instead).
                    const requestId = getRequestIdForLeg(sel.id);
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
                    // Drop the successfully-placed legs first so the
                    // remaining slip is exactly what still needs to go
                    // through. Order matters: handleOddsChanged below
                    // patches against the *post-drop* slip via the same
                    // onSelectionsChange ref, so doing the drop first
                    // avoids re-introducing already-placed legs when
                    // the auto-update reads the stale `selections` array.
                    if (placed.length > 0) {
                        const placedIds = new Set(placed.map((s) => s.id));
                        onSelectionsChange(selections.filter((s) => !placedIds.has(s.id)));
                    }
                    if (!handleOddsChanged(firstErr)) {
                        const errorText = firstErr?.message || 'Failed to place some bets';
                        const partialSummary = placed.length > 0
                            ? ` (${placed.length} of ${selections.length} placed first)`
                            : '';
                        setMessage({ type: 'error', text: errorText + partialSummary });
                        showToast(errorText + partialSummary, 'error');
                    }
                    window.dispatchEvent(new Event('user:refresh'));
                }
                return;
            }

            // Non-straight modes: single request carrying all legs.
            // The backend wants the actual Risk amount; if the user typed
            // in Win mode we already converted to Risk via resolveStake
            // against the ticket's combined decimal odds. Round Robin
            // overrides this — the wager input represents per-parlay
            // stake (the spec is explicit), and total risk = N parlays
            // × that stake; backend computes the same.
            // Combined modes have a single combined-American number, so
            // Bet resolves once for the whole ticket. Sending requestedWin
            // only when the resolved interpretation IS win avoids over-
            // pinning a plus-money parlay's payout (which the backend
            // already computes cleanly from risk × decimal).
            // Parlays risk-anchor (Nicky's rule): the typed number is the RISK,
            // not a To-Win target, so never pin requestedWin for them — let the
            // backend back-compute payout from risk × combined decimal odds.
            // Other combined modes keep Bet/Win To-Win pinning.
            const combinedSmartMode = normalizedMode === 'parlay'
                ? 'risk'
                : (stakeMode === 'bet' ? resolveBetSmartMode(ticketDecimalOdds) : stakeMode);
            const combinedRequestedWin = combinedSmartMode === 'win' && Number.isFinite(Number(wager)) && Number(wager) > 0
                ? Math.round(Number(wager))
                : 0;
            const payload = {
                type: normalizedMode,
                amount: normalizedMode === 'round_robin' ? roundRobinStakePerParlay : effectiveCombinedRisk,
                ...(normalizedMode === 'round_robin'
                    ? { sizes: [...roundRobinSizes].sort((a, b) => a - b) }
                    : (combinedRequestedWin > 0 ? { requestedWin: combinedRequestedWin } : {})),
                teaserPoints: normalizedMode === 'teaser' ? teaserPointValue : 0,
                // Picked teaser variant id. Backend uses this to pick
                // the type-specific payout multipliers AND to snapshot
                // tiesRule onto the bet doc for settlement-time
                // push-on-tie handling. Omitted on non-teaser bets and
                // on legacy clients that don't render the picker.
                ...(normalizedMode === 'teaser' && selectedTeaserTypeId
                    ? { teaserTypeId: selectedTeaserTypeId }
                    : {}),
                // Open parlay: the declared leg count (2–8). createOpenParlay
                // spreads betData into the body, so this reaches the backend's
                // required `targetLegs` field. Omitted on every other mode.
                ...(isOpenParlay ? { targetLegs: openParlayTargetLegs } : {}),
                useFreeplay: useFp,
                selections: selections.map((sel) => ({
                    matchId: sel.matchId,
                    selection: sel.selection,
                    odds: Number(sel.odds),
                    type: sel.marketType || 'straight',
                    // Exact alt rung point (signed) so the server pins the rung
                    // by (name + point), not name alone.
                    ...(Number.isFinite(Number(sel.point)) ? { point: Number(sel.point) } : {}),
                    ...(Math.abs(Number(sel.boughtPoints)) > 1e-9 ? { boughtPoints: Number(sel.boughtPoints) } : {}),
                    // MLB listed-pitcher Action waiver, per side.
                    ...(isMlbSportKey(sel.sportKey) ? { pitcherAction: { home: !!sel.pitcherAction?.home, away: !!sel.pitcherAction?.away } } : {}),
                })),
            };

            const requestId = getRequestIdForTicket();
            // Open parlay routes to the dedicated create endpoint (status='open',
            // legs added later). Payload shape is identical to a parlay placement;
            // createOpenParlay forces type='parlay' server-side.
            const result = isOpenParlay
                ? await createOpenParlay(payload, token, { requestId })
                : await placeBet(payload, token, { requestId });
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
            if (handleOddsChanged(error)) {
                return;
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
        headerBg: '#595959',
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
            <div style={{ flex: 1, minHeight: 0, padding: '14px 14px 18px', overflowY: 'auto' }}>
                {/* TEASER POINTS pinned to the top of the slip in teaser
                    mode so the user picks the point value first; the leg
                    cards below then show their already-shifted spreads.
                    Real sportsbooks lead with the points selector for
                    exactly this reason — picking 6 vs 7 changes every
                    spread underneath, and showing the resulting lines
                    without first revealing the choice is confusing. */}
                {/* In-slip teaser-type picker. Same component the games
                    board renders above the games list — both instances
                    read/write App's `selectedTeaserTypeId`, so picking
                    here also collapses the board picker (and vice
                    versa). Lets the user choose the type without
                    leaving the slip drawer. `containerStyle` strips the
                    board's outer 12px horizontal margin so the picker
                    aligns with the slip's other blocks. */}
                {normalizedMode === 'teaser' && teaserTypes.length > 0 && (
                    <TeaserTypePicker
                        normalizedBetMode={normalizedMode}
                        teaserTypes={teaserTypes}
                        selectedTeaserType={selectedTeaserType}
                        onTeaserTypeChange={onTeaserTypeChange}
                        slipSportGroups={slipTeaserGroups}
                        containerStyle={{ margin: '0 0 12px' }}
                    />
                )}

                {/* Legacy fallback — only renders when the rule was
                    seeded before teaserTypes existed. Same point-button
                    row that shipped before this change. */}
                {normalizedMode === 'teaser' && teaserTypes.length === 0 && activeTeaserPointOptions.length > 0 && (
                    <div style={{
                        background: '#fff',
                        border: `1px solid ${palette.cardBorder}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        marginBottom: 12,
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                        }}>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: palette.textMuted,
                                textTransform: 'uppercase',
                                letterSpacing: 0.6,
                            }}>Teaser Points</span>
                            {slipTeaserGroups.length === 1 && (
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: palette.textFaint,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.4,
                                }}>{slipTeaserGroups[0]}</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {activeTeaserPointOptions.map(point => {
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
                                {normalizedMode === 'round_robin' ? 'Stake per parlay' : 'Apply to all'}
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
                                    // Round Robin needs a single risk-per-parlay number; both Win and Bet
                                    // depend on combined odds and each child parlay has different odds,
                                    // so the smart-mode interpretation has no single answer. Lock both.
                                    const lockedOut = normalizedMode === 'round_robin' && (m.id === 'win' || m.id === 'bet');
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => { if (!lockedOut) setStakeMode(m.id); }}
                                            disabled={lockedOut}
                                            title={lockedOut ? 'Not available for Round Robin — use stake per parlay' : undefined}
                                            style={{
                                                background: lockedOut
                                                    ? '#cbd5e1'
                                                    : active
                                                        ? (m.id === 'win' ? '#16a34a' : '#ff5051')
                                                        : '#e8e8e8',
                                                color: lockedOut ? '#94a3b8' : (active ? '#fff' : '#333'),
                                                border: 'none',
                                                borderLeft: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.15)',
                                                padding: '8px 14px',
                                                fontWeight: 800,
                                                fontSize: 12,
                                                letterSpacing: 0.4,
                                                cursor: lockedOut ? 'not-allowed' : 'pointer',
                                                textTransform: 'uppercase',
                                                transition: 'background 100ms ease',
                                                minWidth: 50,
                                                opacity: lockedOut ? 0.7 : 1,
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

                        {/* Row 3: Use Freeplay (only when there's a freeplay balance).
                            Hidden for open parlay — backend rejects freeplay on it. */}
                        {hasFreeplay && !isOpenParlay && (
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginTop: 10,
                                padding: '6px 10px',
                                background: freeplayMultiBetBlocked ? '#f1f5f9'
                                    : useFreeplay ? palette.successSoft
                                    : '#f8fafc',
                                borderRadius: 8,
                                fontSize: 11,
                                cursor: freeplayMultiBetBlocked ? 'not-allowed' : 'pointer',
                                opacity: freeplayMultiBetBlocked ? 0.6 : 1,
                                userSelect: 'none',
                                border: `1px solid ${useFreeplay ? palette.success : palette.cardBorder}`,
                            }}
                            title={freeplayMultiBetBlocked
                                ? 'Freeplay can only be used on a single ticket — switch to Parlay/Teaser or remove the extra selections.'
                                : ''}>
                                <input
                                    type="checkbox"
                                    checked={useFreeplay}
                                    disabled={freeplayMultiBetBlocked}
                                    onChange={(e) => setUseFreeplay(e.target.checked)}
                                    style={{
                                        width: 13,
                                        height: 13,
                                        cursor: freeplayMultiBetBlocked ? 'not-allowed' : 'pointer',
                                        accentColor: palette.success,
                                    }}
                                />
                                <span style={{
                                    color: freeplayMultiBetBlocked ? palette.textMuted
                                        : useFreeplay ? palette.success
                                        : palette.textPrimary,
                                    fontWeight: 700,
                                }}>
                                    Use Freeplay (${formatAmount(parsedFreeplayBalance)})
                                    {useFreeplay && totalRisk > parsedFreeplayBalance && totalRisk > 0 && (
                                        <span style={{ marginLeft: 6, fontWeight: 600, color: palette.textPrimary }}>
                                            + ${formatAmount(totalRisk - parsedFreeplayBalance)} from balance
                                        </span>
                                    )}
                                    {freeplayMultiBetBlocked && (
                                        <span style={{
                                            display: 'block',
                                            marginTop: 2,
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: palette.textMuted,
                                        }}>
                                            Single ticket only — combine into a parlay or remove legs.
                                        </span>
                                    )}
                                </span>
                            </label>
                        )}

                        {normalizedMode === 'round_robin' && (() => {
                            const hasExposure = roundRobinTotalRisk > 0;
                            const maxProfit = Math.max(0, roundRobinMaxWin - roundRobinTotalRisk);
                            return (
                                <div style={{
                                    marginTop: 10,
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    background: hasExposure ? palette.accentSoft : '#f8fafc',
                                    border: `1px solid ${hasExposure ? palette.accent : palette.cardBorder}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                            Total Risk
                                            <span style={{ color: palette.textFaint, fontWeight: 700, marginLeft: 6 }}>
                                                {roundRobinParlayCount > 0
                                                    ? `(${roundRobinParlayCount} ${roundRobinParlayCount === 1 ? 'parlay' : 'parlays'})`
                                                    : '(pick sizes)'}
                                            </span>
                                        </span>
                                        <span style={{
                                            fontSize: 15,
                                            fontWeight: 800,
                                            color: hasExposure ? palette.accent : palette.textFaint,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}>
                                            ${formatMoney2dp(roundRobinTotalRisk)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                            Max Win
                                        </span>
                                        <span style={{
                                            fontSize: 15,
                                            fontWeight: 800,
                                            color: maxProfit > 0 ? palette.success : palette.textFaint,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}>
                                            ${formatMoney2dp(maxProfit)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}
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

                {isOpenParlay && legCount > 0 && (
                    <>
                        {/* Declared leg count picker (2–8). Buttons below the
                            current slip size are disabled — you can't declare
                            fewer legs than you've already selected. */}
                        <div style={{
                            background: palette.cardBg,
                            border: `1px solid ${palette.cardBorder}`,
                            padding: '10px 12px',
                            borderRadius: 8,
                            marginBottom: 10,
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                justifyContent: 'space-between',
                                marginBottom: 8,
                            }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: palette.textPrimary }}>
                                    How many legs?
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: palette.accent }}>
                                    Open Parlay — {legCount} of {openParlayTargetLegs} legs
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {Array.from(
                                    { length: OPEN_PARLAY_MAX_LEGS - OPEN_PARLAY_MIN_LEGS + 1 },
                                    (_, i) => OPEN_PARLAY_MIN_LEGS + i
                                ).map((n) => {
                                    const selected = openParlayTargetLegs === n;
                                    const disabled = n < legCount; // can't declare fewer than already picked
                                    return (
                                        <button
                                            key={n}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => setOpenParlayTargetLegs(n)}
                                            style={{
                                                minWidth: 40,
                                                padding: '8px 0',
                                                flex: '1 1 40px',
                                                borderRadius: 8,
                                                fontSize: 14,
                                                fontWeight: 700,
                                                cursor: disabled ? 'not-allowed' : 'pointer',
                                                border: `1px solid ${selected ? palette.accent : palette.cardBorder}`,
                                                background: selected ? palette.accent : palette.cardBg,
                                                color: selected ? '#fff' : (disabled ? palette.textFaint : palette.textPrimary),
                                                opacity: disabled ? 0.5 : 1,
                                                transition: 'all 0.12s ease',
                                            }}
                                        >{n}</button>
                                    );
                                })}
                            </div>
                            <div style={{ fontSize: 11, color: palette.textMuted, marginTop: 8 }}>
                                {legCount < openParlayTargetLegs
                                    ? `Add ${openParlayTargetLegs - legCount} more leg${openParlayTargetLegs - legCount === 1 ? '' : 's'} after placing — each before its game starts.`
                                    : 'All declared legs selected — you can place now.'}
                            </div>
                        </div>

                        <div style={{
                            fontSize: 12,
                            color: palette.textMuted,
                            background: '#f8fafc',
                            border: `1px solid ${palette.cardBorder}`,
                            padding: '8px 12px',
                            borderRadius: 8,
                            marginBottom: 10,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                        }}>
                            <i className="fa-solid fa-circle-info" style={{ marginTop: 2 }} />
                            <span>
                                Open parlay: the full stake is committed now, then
                                you fill the remaining legs over time — each leg must
                                be added before its own game starts. There's no time
                                limit; the ticket pays only once all {openParlayTargetLegs} legs
                                are filled and win. Any losing leg loses the ticket.
                                Freeplay can't be used.
                            </span>
                        </div>
                    </>
                )}
                {legCount === 1 && normalizedMode === 'parlay' && !isOpenParlay && (
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
                    // A `wagerOverride` only exists when the user has edited
                    // the per-card field directly (or hit Apply to All). Without
                    // one, both inputs render their formatted derived value so
                    // an Apply-to-All Win=$1000 still shows "$1000" on the leg.
                    // The earlier version keyed only on stakeSource, which left
                    // the input on the "source" side blank ("$0") whenever the
                    // top Bet Amount was driving the math.
                    const hasOverride = !!sel?.wagerOverride;
                    const riskInputValue = hasOverride && stakeSource === 'risk'
                        ? (sel?.wagerOverride?.riskRaw ?? '')
                        : (risk > 0 ? formatMoney(risk) : '');
                    const winInputValue = hasOverride && stakeSource === 'win'
                        ? (sel?.wagerOverride?.winRaw ?? '')
                        : (win > 0 ? formatMoney(win) : '');
                    const matchupTitle = String(sel.matchName || sel.selection || '').toUpperCase();
                    // Teaser-aware line text: legPreviewLine returns the
                    // adjusted line + a muted "(BP …)" suffix when teaser
                    // mode + a type is picked. Falls through to the plain
                    // base label in every other mode.
                    const betTypeText = legPreviewLine(sel);
                    // Player props show the friendly stat label inline right
                    // after the selection ("Osuna Over 0.5 Runs Scored") rather
                    // than as a separate raw-key line below the odds.
                    const isProp = isPlayerPropMarket(sel.marketType);
                    const propMarketLabel = isProp ? prettyPlayerMarketLabel(sel.marketType) : '';
                    // Game start time pinned to the site timezone (ET) so a
                    // glance at the bet slip answers "is this tonight?" the
                    // same way for every browser locale.
                    const startIso = sel?.matchSnapshot?.startTime || sel?.match?.startTime || sel?.startTime;
                    const matchTimeLabel = startIso ? formatSiteDateTime(startIso) : '';
                    const market = String(sel.marketType || '').toLowerCase();
                    // Buy Points is disabled in teaser mode: the tease
                    // already shifts the line in the player's favor by
                    // a fixed point count, and stacking a paid-juice
                    // BP shift on top is a non-product combination
                    // (real books burn BP entering a teaser). Hiding
                    // the selector keeps the slip honest with what the
                    // backend will price.
                    const supportsBuyPoints = BUY_POINTS_ENABLED && (market === 'spreads' || market === 'totals') && normalizedMode !== 'teaser';
                    const buyPointsOptions = supportsBuyPoints ? buildBuyPointsOptions(sel) : [];
                    const buyPointsOpen = openBuyPointsId === sel.id;
                    // Flags this leg if its *risk* (stake) trips the
                    // user's per-account min/max bet limit. Drives the
                    // red border + inline chip so the user sees *which*
                    // leg blocked the slip instead of guessing from a
                    // global toast. Min uses risk too — see the
                    // limitFlags useMemo above for the full rationale
                    // on the risk-anchored switch.
                    const legViolatesLimit = limitFlags.violatingIds.has(sel.id);
                    const legLimitMaxBet = Number(user?.maxBet);
                    const legLimitMinBet = Number(user?.minBet);
                    const legOverMax = Number.isFinite(legLimitMaxBet) && legLimitMaxBet > 0 && risk > legLimitMaxBet;
                    const legUnderMin = Number.isFinite(legLimitMinBet) && legLimitMinBet > 0 && risk > 0 && risk < legLimitMinBet;
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
                                padding: '5px 12px',
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
                            <div style={{ padding: '7px 12px 8px' }}>
                                {legLabel && (
                                    <div style={{
                                        fontSize: 9,
                                        fontWeight: 800,
                                        color: palette.accent,
                                        letterSpacing: 0.6,
                                        textTransform: 'uppercase',
                                        marginBottom: 2,
                                    }}>
                                        {legLabel}
                                    </div>
                                )}
                                <div style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: palette.textPrimary,
                                    lineHeight: 1.2,
                                    marginBottom: matchTimeLabel ? 2 : 5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                }}>
                                    <span>{isProp
                                        ? formatPropSelectionTitle(sel.selectionFull || sel.selection, propMarketLabel)
                                        : `${sel.selectionFull || sel.selection}${propMarketLabel ? ` ${propMarketLabel}` : ''}`}</span>
                                    {sel.isLive && (
                                        // LIVE BET pill — flagged at add-to-slip
                                        // time from match.isLive, which is true
                                        // whenever the upstream odds source reports
                                        // status='live' or score.event_status
                                        // contains IN_PROGRESS / LIVE. Surfaces
                                        // here so the user sees that this leg
                                        // priced against in-play odds, not
                                        // pre-game — useful for trader review
                                        // and for distinguishing the line on
                                        // settled tickets.
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '2px 8px',
                                            borderRadius: 4,
                                            background: '#ff5051',
                                            color: '#fff',
                                            fontSize: 10,
                                            fontWeight: 800,
                                            letterSpacing: 0.6,
                                            textTransform: 'uppercase',
                                            lineHeight: 1.2,
                                        }}>
                                            <span style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: '#fff',
                                                display: 'inline-block',
                                            }} />
                                            Live Bet
                                        </span>
                                    )}
                                </div>
                                {matchTimeLabel && (
                                    <div style={{
                                        fontSize: 10,
                                        color: palette.textMuted || '#6b7280',
                                        marginBottom: 5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        lineHeight: 1.1,
                                    }}>
                                        <i className="fa-regular fa-clock" />
                                        {matchTimeLabel}
                                    </div>
                                )}

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
                                        {isProp ? null : betTypeText}
                                    </span>
                                    <span style={{ fontWeight: 800, color: palette.success, fontVariantNumeric: 'tabular-nums' }}>
                                        {formatOddsSign(sel.odds)}
                                    </span>
                                </div>

                                {/* MLB listed-pitcher Action toggles. Each box
                                    starts UNCHECKED = listed pitcher (the leg
                                    voids if that starter is scratched). Checking
                                    a box waives the void for that side ("Action"
                                    — the bet stands regardless). Settlement reads
                                    the same flags (SportsbookBetSupport::
                                    listedPitcherVoid). */}
                                {isMlbSportKey(sel.sportKey) && (sel.pitchers?.away || sel.pitchers?.home) && (
                                    <div style={{ marginTop: 7, borderTop: `1px solid ${palette.cardBorder}`, paddingTop: 6 }}>
                                        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: palette.textMuted, marginBottom: 4 }}>
                                            Listed Pitchers
                                        </div>
                                        {[{ side: 'away', pitcher: sel.pitchers?.away }, { side: 'home', pitcher: sel.pitchers?.home }].map(({ side, pitcher }) => {
                                            if (!pitcher) return null;
                                            const checked = !!sel.pitcherAction?.[side];
                                            return (
                                                <label key={side} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: palette.textPrimary }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(e) => updateSelection(sel.id, { pitcherAction: { ...(sel.pitcherAction || {}), [side]: e.target.checked } })}
                                                        style={{ width: 15, height: 15, flexShrink: 0, accentColor: palette.accent, cursor: 'pointer' }}
                                                    />
                                                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {formatPitcherLabel(pitcher)}
                                                        <span style={{ color: palette.textMuted, fontWeight: 600 }}> · Action</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                        <div style={{ fontSize: 10, color: palette.textMuted, marginTop: 3, lineHeight: 1.3 }}>
                                            {sel.pitchers?.away && sel.pitchers?.home && sel.pitcherAction?.away && sel.pitcherAction?.home
                                                ? 'Action: bet stands regardless of pitching changes.'
                                                : 'Unchecked = listed pitcher; bet voids if that pitcher is scratched.'}
                                        </div>
                                    </div>
                                )}

                                {/* Buy Points selector — Spread/Total only.
                                    Tapping the trigger opens a popup of up
                                    to 5 alternate lines (original + 4 alts).
                                    Picking one updates this leg's line +
                                    odds in the parent state, which cascades
                                    through Risk/Win and the bottom totals. */}
                                {supportsBuyPoints && buyPointsOptions.length > 1 && (
                                    <div style={{ position: 'relative', marginTop: 6 }}>
                                        <button
                                            type="button"
                                            onClick={() => setOpenBuyPointsId(buyPointsOpen ? null : sel.id)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8,
                                                padding: '5px 10px',
                                                background: '#fff',
                                                border: `1px solid ${buyPointsOpen ? palette.accent : palette.cardBorder}`,
                                                borderRadius: 8,
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: palette.textPrimary,
                                                cursor: 'pointer',
                                                transition: 'border-color 120ms ease',
                                                lineHeight: 1.2,
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
                                            // Inline (in-flow) list so EVERY buy-points rung is
                                            // visible. An absolutely-positioned overlay was clipped
                                            // by the selection card's overflow:hidden, so only the
                                            // first rung showed. Rendering in flow grows the card and
                                            // the slip scrolls if needed — all rungs are reachable.
                                            <div style={{
                                                marginTop: 4,
                                                background: '#fff',
                                                border: `1px solid ${palette.cardBorder}`,
                                                borderRadius: 10,
                                                boxShadow: '0 12px 28px -10px rgba(15,23,42,0.35)',
                                                overflow: 'hidden',
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
                                        gap: 6,
                                        marginTop: 6,
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
                                                    padding: '2px 10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 6,
                                                    cursor: 'text',
                                                    lineHeight: 1.15,
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
                                                            padding: 0,
                                                            margin: 0,
                                                            lineHeight: 1.15,
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
                                                ? `Risks $${formatMoney(risk)} — over your $${formatMoney(legLimitMaxBet)} Max Bet`
                                                : `Risks only $${formatMoney(risk)} — under your $${formatMoney(legLimitMinBet)} Min Bet`}
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
                {legCount >= 2 && normalizedMode !== 'straight' && normalizedMode !== 'round_robin' && (
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
                                <span style={{ fontSize: 13, fontWeight: 800, color: totalRisk > 0 ? palette.textPrimary : palette.textFaint, fontVariantNumeric: 'tabular-nums' }}>
                                    ${formatMoney2dp(totalRisk)}
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
                                <span style={{ fontSize: 13, fontWeight: 800, color: displayWinAmount > 0 ? palette.success : palette.textFaint, fontVariantNumeric: 'tabular-nums' }}>
                                    ${formatMoney2dp(displayWinAmount)}
                                    {parlayPayoutCap > 0 && displayWinAmount >= parlayPayoutCap && (
                                        <span style={{ fontSize: 10, fontWeight: 700, color: palette.textMuted, marginLeft: 4 }}>(max)</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Round Robin: multi-select size chips + live readout. Sits
                    above the teaser block (only one mode is active at a
                    time so they never collide). Disabled until ≥3 legs
                    are picked; when fewer, render an explanation chip
                    instead of the chip row so the user sees why nothing
                    is happening. */}
                {normalizedMode === 'round_robin' && (
                    <div style={{ marginTop: 14 }}>
                        <div style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: palette.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: 0.6,
                            marginBottom: 8,
                        }}>Round Robin Sizes</div>
                        {legCount < 3 ? (
                            <div style={{
                                padding: '10px 12px',
                                border: `1px dashed ${palette.cardBorder}`,
                                borderRadius: 8,
                                fontSize: 12,
                                color: palette.textMuted,
                                background: '#fafbfc',
                            }}>
                                {legCount === 0
                                    ? 'Add at least 3 selections to start.'
                                    : `Round Robin needs at least 3 selections — add ${3 - legCount} more.`}
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {roundRobinAvailableSizes.map(size => {
                                        const selected = roundRobinSizes.includes(size);
                                        return (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => setRoundRobinSizes(prev => (
                                                    prev.includes(size)
                                                        ? prev.filter(s => s !== size)
                                                        : [...prev, size].sort((a, b) => a - b)
                                                ))}
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
                                                By {size}’s
                                            </button>
                                        );
                                    })}
                                </div>
                                <div style={{
                                    marginTop: 10,
                                    padding: '10px 12px',
                                    background: '#f8fafc',
                                    border: `1px solid ${palette.cardBorder}`,
                                    borderRadius: 8,
                                    fontSize: 12,
                                    color: palette.textPrimary,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: palette.textMuted }}>Parlays</span>
                                        <strong style={{
                                            color: roundRobinParlayCount > roundRobinMaxParlays ? palette.danger : palette.textPrimary,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}>
                                            {roundRobinParlayCount}{roundRobinParlayCount > roundRobinMaxParlays ? ` (limit ${roundRobinMaxParlays})` : ''}
                                        </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: palette.textMuted }}>Total Risk</span>
                                        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>${formatMoney2dp(roundRobinTotalRisk)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: palette.textMuted }}>Max Win</span>
                                        <strong style={{
                                            color: roundRobinMaxWin > 0 ? palette.success : palette.textFaint,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}>${formatMoney2dp(Math.max(0, roundRobinMaxWin - roundRobinTotalRisk))}</strong>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {legCount > 0 && validationErrors.map(err => (
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
                ))}
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
                                    if (isOpenParlay) return 'Place Open Parlay';
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
                // Pass the Win-pinned payout (totalRisk + displayWinAmount)
                // for combined modes so the confirmation modal's
                // "Win = potentialPayout − totalRisk" line matches what
                // the slip just showed and what the backend will pay
                // (BetsController.php:319-326 pins potentialPayout to
                // totalRisk + requestedWin within ±$2). Otherwise the
                // modal would re-derive Win from raw potentialPayout
                // and drift back to $997 on a typed $1000.
                potentialPayout={normalizedMode === 'straight' ? potentialPayout : (totalRisk + displayWinAmount)}
                // Per-leg stakes + the user's intended Win for STRAIGHT mode.
                // Win values come from resolveStake (American-integer math),
                // not recomputed from rounded decimal odds in the modal — that
                // recompute drifts to $1001 on a typed $1000 win when odds are
                // stored at 2-decimal precision (e.g. 1.87 vs exact 1.86956…).
                legStakes={normalizedMode === 'straight'
                    ? selections.map((sel) => wagerForSelection(sel))
                    : null}
                legWins={normalizedMode === 'straight'
                    ? selections.map((sel) => {
                        const { win } = effectiveStakeForSelection(sel);
                        return Number.isFinite(win) && win > 0 ? Math.round(win) : 0;
                    })
                    : null}
                isFreeplay={!isOpenParlay && useFreeplay && hasFreeplay}
                isOpenParlay={isOpenParlay}
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
