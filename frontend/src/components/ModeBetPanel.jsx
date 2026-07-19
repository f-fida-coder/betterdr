import React, { useMemo, useState, useEffect, useRef } from 'react';
import { placeBet, quoteBet, createOpenParlay, normalizeBetMode, createRequestId, fetchBuyPointsLadder } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatOdds, decimalToAmerican, americanToDecimal, roundCombinedToAmericanDecimal } from '../utils/odds';
import { computeMidQuickStakes } from '../utils/money';
import { maxStakeForWinCap, maxStakeNote, cannotFitCapNote, winTargetCappedNote, stakeAutoCappedNote } from '../utils/maxWinCap';
import { formatSiteDateTime } from '../utils/timezone';
import { isMlbSportKey, formatPitcherLabel } from '../utils/pitchers';
import { adjustSpread, teaserSportGroup, teaserPointsForSport } from '../utils/teaserAdjustment';
import BetConfirmationModal from './BetConfirmationModal';
import WagerConfirmedScreen from './WagerConfirmedScreen';
import TeaserTypePicker from './TeaserTypePicker';
import { useDismissableSurface } from '../hooks/useDismissableSurface';
import { prettyPlayerMarketLabel, isPlayerPropMarket, formatPropSelectionTitle } from '../utils/propBuilderMarkets';
import { splitPeriodMarketKey } from '../utils/periods';
import { straightDefaultMode, parlayDefaultMode, defaultModeForBucket, reseedModeForBucket } from '../utils/betDefaults';
import { formatLegLabel } from '../utils/legLabel';
import { roundRobinCombinationCount, roundRobinMaxWin as computeRoundRobinMaxWin } from '../utils/roundRobin';

// Minimal structural fallbacks — NO hardcoded multipliers.
// Real values always come from rulesByMode (loaded from DB via /api/betting/rules).
const DEFAULT_RULES = {
    // Straight isn't a single-leg limit — each selection is a separate
    // independent wager, so its 12-slip cap is unrelated to parlay's.
    straight:     { minLegs: 1, maxLegs: 12, teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
    // parlay max legs 8 per Nicky, 2026-07-11 — must match BetModeRules.php default.
    parlay:       { minLegs: 2, maxLegs: 8,  teaserPointOptions: [], payoutProfile: { type: 'odds_product', multipliers: {} } },
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

// Round Robin combination-count + max-win math lives in ../utils/roundRobin
// (imported above) so it is unit-tested in CI — the previous inline copy
// carried a stale `k >= N` bound that zeroed the "By N's" preview.

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

// Bet-type base label: 'Spread', 'Moneyline', 'Total'. Period-suffixed core
// keys ('totals_1st_5_innings', 'h2h_q1', …). The one-line selection label
// (moneyline/spread/total/team-total/period) is built by the shared
// ../utils/legLabel formatLegLabel — used by the betslip, the receipt, and
// mirrored by My Bets — so all surfaces read identically.

// Line notation used in the Buy Points dropdown: -10.5 -> '-10.5',
// 47.5 -> '47.5' (unsigned for totals), 10 -> '+10' / '10'. DECIMALS by
// PO ruling 2026-07-07 (was half-glyph '½' notation, which read as
// "-0½" on half-point lines and mismatched the rest of the app — board
// cells, betslip legs, and receipts all render decimals via
// formatLineValue/formatSpreadValue).
const formatBuyPointsLine = (n, signed) => {
    if (!Number.isFinite(n)) return '';
    const numText = trimNumber(Math.abs(n));
    if (!signed) return numText;
    if (n === 0) return numText;
    return n < 0 ? `-${numText}` : `+${numText}`;
};

// Format a Buy Points option label for the dropdown row, e.g. '-10.5 -110'
// for spreads or '54.5 -120' for totals.
const formatBuyPointsLabel = (option, marketType) => {
    const m = String(marketType || '').toLowerCase();
    const lineText = m === 'totals'
        ? formatBuyPointsLine(option.line, false)
        : formatBuyPointsLine(option.line, true);
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
            // BUY-ONLY (Nicky): surface only rungs in the BUY direction (easier
            // line, more juice) — never sells (harder line for a better payout).
            // The backend already sends a buy-only ladder; this is a belt-and-
            // suspenders guard so a sell can't render even if a stray rung slips
            // into alternateLines. lineStep encodes the buy direction (spreads
            // +0.5; totals Over -0.5 / Under +0.5).
            if (Math.sign(delta) !== Math.sign(lineStep)) return;
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
    // Pre-submit re-quote (combined modes): the review modal opens on a server
    // quote so the price it shows is exactly what the book will honor. Holds the
    // reconciled snapshot + a loading/error status; `baselineCombined` is the
    // American combined the player last SAW (the slip's, then each prior quote's)
    // so the modal can render the "+210 → +212" combined delta Nicky watches.
    const [reviewQuote, setReviewQuote] = useState({ status: 'idle', data: null, error: '', baselineCombined: null });
    // Open-parlay "no open slots" prompt: shown when every declared leg is
    // already attached at place time (that ticket is a regular parlay in
    // disguise; the server rejects it with OPEN_PARLAY_NO_OPEN_SLOTS).
    const [showNoOpenSlots, setShowNoOpenSlots] = useState(false);
    // Set by the prompt's "Place as Regular Parlay": the mode switch runs
    // through onModeChange — the SAME handler the P tab uses — and once
    // this panel re-renders in parlay mode the effect below re-enters the
    // normal place flow. Parlay validation, freeplay policy, confirmation
    // modal, and line-moved handling are all the parlay path's own; the OP
    // payload is never reused with a different type stamp.
    const [convertToParlayPending, setConvertToParlayPending] = useState(false);
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
    // Split Straight/Parlay default modes (PO 2026-07-19) — pure resolution +
    // fallback lives in utils/betDefaults so it's unit-tested and shared with
    // AccountPanel. Straight uses `mode`; every parlay-like tab uses the
    // independent `parlayMode` (falling back to `mode` on pre-split accounts).
    const defaultStakeMode = straightDefaultMode(userBetDefaults);
    const parlayStakeMode = parlayDefaultMode(userBetDefaults);
    const defaultStakeModeForBucket = (m) => defaultModeForBucket(userBetDefaults, m);
    // Split defaults (PO 2026-07-13): straight unit vs parlay unit. Each reads
    // its own field and falls back to the legacy single `amount` so accounts
    // saved before the split behave exactly as before. Scope (a): ONLY straight
    // seeds from straightDefault; parlay/teaser/round-robin/if-bet/reverse all
    // seed from parlayDefault.
    const legacyDefaultAmount = Number(userBetDefaults?.amount);
    const positiveOr = (val, fallback) => (Number.isFinite(Number(val)) && Number(val) > 0 ? Number(val) : fallback);
    const straightDefaultAmount = positiveOr(
        userBetDefaults?.straightDefault,
        positiveOr(legacyDefaultAmount, 0)
    );
    const parlayDefaultAmount = positiveOr(
        userBetDefaults?.parlayDefault,
        positiveOr(legacyDefaultAmount, 0)
    );
    // The seed for the CURRENT mode. Scope (a): only 'straight' uses the
    // straight default; every parlay-like mode (parlay/teaser/round_robin/
    // if_bet/reverse) uses the parlay default.
    const defaultAmountForMode = (m) => (m === 'straight' ? straightDefaultAmount : parlayDefaultAmount);
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
    // Seed the initial mode from the CURRENT tab's bucket (straight vs parlay).
    const [stakeMode, setStakeMode] = useState(() => defaultStakeModeForBucket(normalizeBetMode(mode)));
    // The last mode we AUTO-SEEDED (bucket default). A straight↔parlay tab
    // switch only re-seeds the mode while it still equals this — a mode the
    // user manually clicked is never overwritten. Nulled on manual selection.
    const lastSeededModeRef = useRef(defaultStakeModeForBucket(normalizeBetMode(mode)));
    // Manual mode change from a pill/box — forget the auto-seed so a later
    // bucket switch won't stomp the user's deliberate choice (mirrors how a
    // typed wager forgets its seed).
    const setStakeModeUser = (m) => { lastSeededModeRef.current = null; setStakeMode(m); };
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
    // The last value we AUTO-SEEDED into the wager (bucket default). A mode
    // switch only re-seeds the wager when it's empty or still equals this — a
    // user-TYPED amount is never overwritten. null once the user edits away.
    const lastSeededWagerRef = useRef(null);
    // Live snapshot for the betslip:open listener (registered with [] deps, so
    // its closure would otherwise read a stale mode/wager/defaults).
    const seedCtxRef = useRef({});
    useEffect(() => {
        // Only the saved mode fields drive the re-seed. Hashing the whole
        // userBetDefaults object would re-fire the reset on unrelated profile
        // updates (amount changes, balance refresh bundles, etc.) and silently
        // snap a manual WIN click back to the saved default. Narrow the sig to
        // both mode fields so the reset triggers only when the user actually
        // saves a new Straight OR Parlay mode preference.
        const sig = JSON.stringify({
            mode: userBetDefaults?.mode ?? null,
            parlayMode: userBetDefaults?.parlayMode ?? null,
        });
        if (sig === lastBetDefaultsSigRef.current) return;
        lastBetDefaultsSigRef.current = sig;
        // Re-seed to the CURRENT tab's bucket default (straight vs parlay).
        const seeded = defaultStakeModeForBucket(normalizeBetMode(mode));
        lastSeededModeRef.current = seeded;
        setStakeMode(seeded);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userBetDefaults, defaultStakeMode, parlayStakeMode]);
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
            // System-forced (not a manual pick): keep the seed ref in step with
            // the forced value so leaving RR for the Straight bucket still
            // re-seeds the straight mode instead of leaking RR's forced Risk.
            lastSeededModeRef.current = 'risk';
            setStakeMode('risk');
        }
    }, [normalizedMode, stakeMode]);
    // Raw user-typed amount in the shared Bet Amount input. Always parsed
    // as a number for arithmetic but kept untouched in `wager` so React
    // doesn't fight the user mid-typing ("10.", "1.5", etc.).
    const wagerAmount = Number(wager);
    // Explicit WIN-pill parlays (Nicky product sign-off 2026-07-11 — the one
    // sanctioned exception to his risk-only parlay rule): the
    // typed number is a
    // To-Win target and the canonical Risk is back-solved from it. ONLY the
    // explicit WIN pill qualifies — Bet-mode smart resolution stays
    // risk-anchored for parlays (that path caused the original gross-up
    // bug), and open parlays stay risk-anchored because their combined odds
    // aren't final until all declared legs fill.
    const parlayWinAnchored = normalizedMode === 'parlay' && !isOpenParlay && stakeMode === 'win';
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
        const baseLabel = formatLegLabel(sel);
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
            // Short format: "{team} {teased line}" (the signed line implies spread).
            const team = String(sel?.selectionFull || sel?.selection || 'Pick').trim();
            mainText = `${team} ${adjSign}`;
            bpText = `(BP ${baseSign})`;
        } else {
            const isUnder = String(sel?.selection || '').toUpperCase().startsWith('U');
            const sideWord = isUnder ? 'Under' : 'Over';
            const sideShort = isUnder ? 'U' : 'O';
            // Short format: "Over 48.5" (no "Total" prefix).
            mainText = `${sideWord} ${trim(Math.abs(adjN))}`;
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
        // Straight-leg display clamp (PO 2026-07-13): the card must show the
        // stake placement will actually debit. Placement has always capped
        // each leg at its own cap-limited stake (capStakeForSelection); the
        // card previously showed the raw shared wager instead — e.g. Apply
        // To All $1000 over a leg whose cap-limited max is $109 displayed
        // Risk $1000 while debiting $109. Clamp the derived pair the same
        // way (win recomputed from the clamped risk on the leg's own odds).
        const clampToLegCap = (pair) => {
            if (normalizedMode !== 'straight') return pair;
            const cap = Number(user?.maxWinCap);
            if (!(Number.isFinite(cap) && cap > 0)) return pair;
            const ms = maxStakeForWinCap(cap, Number(sel?.odds || 0));
            if (!Number.isFinite(ms) || ms < 1 || !(pair?.risk > ms)) return pair;
            const d = Number(sel?.odds);
            const win = d > 1 ? Math.round(ms * (d - 1) * 100) / 100 : pair.win;
            return { ...pair, risk: ms, win };
        };
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
                return clampToLegCap({ risk: safe, win: Math.round(rawWin * 100) / 100, source: 'risk' });
            }
            const rawRisk = american < 0 ? safe * (-american) / 100 : safe * 100 / american;
            return clampToLegCap({ risk: Math.round(rawRisk * 100) / 100, win: safe, source: 'win' });
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
        return clampToLegCap({ ...computed, source: computedSource });
    }, [stakeMode, wager, normalizedMode, user?.maxWinCap]);

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

    // ── Max-WIN stake cap ────────────────────────────────────────────────
    // Mirror of the server house win ceiling (user.maxWinCap = MAX_PARLAY_PAYOUT).
    // Live-caps the stake to the amount that wins EXACTLY the cap so a customer
    // can't over-risk a high-plus-money selection for no extra upside. Server
    // re-enforces at placement — this is UX only. `maxStake` is in the units the
    // player types (the wager); reverse doubles the risk per wager. Round Robin
    // is left to its own per-child server cap (its stake maps to N combos).
    // Declared BEFORE effectiveCombinedRisk, which clamps win-anchored parlay
    // stakes with it (hooks are consts — referencing it earlier is a TDZ crash).
    const winCapState = useMemo(() => {
        const cap = Number(user?.maxWinCap);
        if (!Number.isFinite(cap) || cap <= 0 || normalizedMode === 'round_robin') {
            return { cap: cap > 0 ? cap : 0, maxStake: Infinity, blocked: false };
        }
        if (normalizedMode === 'straight') {
            // Tightest per-selection cap binds the shared stake field. Each
            // selection is its own bet; the server caps each individually.
            let maxStake = Infinity;
            let blocked = false;
            for (const sel of selections) {
                const ms = maxStakeForWinCap(cap, Number(sel?.odds || 0));
                if (ms < 1) blocked = true;
                if (ms < maxStake) maxStake = ms;
            }
            return { cap, maxStake, blocked };
        }
        const d = Number(ticketDecimalOdds || 0);
        if (!(d > 1)) return { cap, maxStake: Infinity, blocked: false };
        const riskFactor = normalizedMode === 'reverse' ? 2 : 1; // totalRisk = wager × riskFactor
        const maxRisk = maxStakeForWinCap(cap, d);               // max total risk under the cap
        const maxStake = Number.isFinite(maxRisk) ? Math.floor(maxRisk / riskFactor) : Infinity;
        return { cap, maxStake, blocked: Number.isFinite(maxStake) && maxStake < 1 };
    }, [user?.maxWinCap, normalizedMode, selections, ticketDecimalOdds]);

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
        // the typed base is exactly what's charged, and To-Win is derived
        // downstream (risk × combined decimal). ONE sanctioned exception
        // (Nicky sign-off 2026-07-11): the explicit WIN pill on a
        // CLOSED parlay makes the
        // typed number a To-Win target and back-solves the canonical Risk on
        // the same American-int basis every other mode uses (resolveStake).
        // Bet-mode smart resolution still risk-anchors (it caused the original
        // gross-up bug) and open parlays still risk-anchor (odds not final).
        // Other combined modes (teaser/if_bet/reverse) keep their To-Win
        // conversion unchanged.
        if (normalizedMode === 'parlay') {
            if (parlayWinAnchored) {
                const { risk } = resolveStake('win', wagerAmount, ticketDecimalOdds);
                if (!(Number.isFinite(risk) && risk > 0)) return 0;
                // Clamp to the cap-limited stake HERE, not just at placement,
                // so the Risk box, all limit gates, and the debited amount are
                // the same number (no display/wire divergence at the cap edge,
                // where the back-solved 2dp risk can exceed the whole-dollar
                // floor placement would send).
                return Number.isFinite(winCapState.maxStake) ? Math.min(risk, winCapState.maxStake) : risk;
            }
            // Same clamp for the risk-anchored parlay stake: the input snaps
            // at the write (applyTypedWager) and re-snaps on cap tightening,
            // but derive-clamping here too keeps the Risk box, limit gates
            // and wire identical during the render between those events.
            const risk = Number.isFinite(wagerAmount) && wagerAmount > 0 ? wagerAmount : 0;
            return Number.isFinite(winCapState.maxStake) ? Math.min(risk, winCapState.maxStake) : risk;
        }
        const sourceWager = normalizedMode === 'reverse' ? wagerAmount / 2 : wagerAmount;
        const { risk } = resolveStake(stakeMode, sourceWager, ticketDecimalOdds);
        const safeRisk = Number.isFinite(risk) && risk > 0 ? risk : 0;
        // Teaser / if_bet / reverse: same derive-clamp, on the SAME scale the
        // limit gate compares against (limitFlags: effectiveCombinedRisk >
        // winCapState.maxStake) — reverse's 2× factor is already inside
        // winCapState. Round robin stays exempt (maxStake = Infinity).
        if (Number.isFinite(winCapState.maxStake)) {
            return Math.min(safeRisk, winCapState.maxStake);
        }
        return safeRisk;
    }, [normalizedMode, stakeMode, wagerAmount, ticketDecimalOdds, parlayWinAnchored, winCapState]);

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
    // Clamp any wager to the cap-limited stake (auto-cap). Identity when the
    // cap doesn't bind. Used at placement so the server receives a compliant
    // stake; `capStakeForSelection` caps a single straight leg by its own odds.
    const capStakeForSelection = React.useCallback((sel, amount) => {
        const cap = Number(user?.maxWinCap);
        if (!Number.isFinite(cap) || cap <= 0) return amount;
        const ms = maxStakeForWinCap(cap, Number(sel?.odds || 0));
        return Number.isFinite(ms) ? Math.min(amount, ms) : amount;
    }, [user?.maxWinCap]);

    const limitFlags = useMemo(() => {
        const violatingIds = new Set();
        const messages = { min: null, max: null, capInfo: null, winCap: null };
        const winCap = Number(user?.maxWinCap) > 0 ? Number(user.maxWinCap) : 0;
        const capMaxStakeFor = (odds) => (winCap > 0 ? maxStakeForWinCap(winCap, Number(odds || 0)) : Infinity);
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
                const selCapMax = capMaxStakeFor(sel?.odds); // Infinity when cap off / not binding
                // Selection can't fit under the cap at any stake (extreme
                // longshot) → hard block with a clear message.
                if (selCapMax < 1) {
                    if (!messages.winCap) messages.winCap = cannotFitCapNote(winCap);
                    violatingIds.add(sel.id);
                    continue;
                }
                // Cap-overrides-min (PO 2026-07-09): when the cap forces the max
                // stake below the player's min bet, a sub-min stake is ALLOWED —
                // don't flag it as a min breach. Only genuine under-min (where the
                // cap isn't the binding reason) still breaches.
                const capOverridesMin = Number.isFinite(selCapMax) && selCapMax < minBet && risk <= selCapMax;
                const minBreach = hasMin && risk > 0 && risk < minBet && !capOverridesMin;
                const maxBreach = hasMax && risk > maxBet;
                if (minBreach && !messages.min) {
                    messages.min = `Min bet $${minBet} — ${labelFor(sel)} risks only $${fmt(risk)}`;
                }
                if (maxBreach && !messages.max) {
                    messages.max = `Max bet $${maxBet} — ${labelFor(sel)} risks $${fmt(risk)}`;
                }
                // At/over the cap-limited stake → the snapped-stake note. After
                // the per-leg display clamp the derived risk can EQUAL but never
                // exceed the leg cap, so >= is the honest trigger (same derived
                // "typed over == sitting at" trick as the win-anchor note).
                if (Number.isFinite(selCapMax) && risk >= selCapMax && !messages.winCap) {
                    messages.winCap = stakeAutoCappedNote(selCapMax, winCap);
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
            // Max-win cap on the combined ticket. Reverse stakes 2× the wager,
            // so its cap-limited wager is half the cap-limited total risk.
            const riskFactor = normalizedMode === 'reverse' ? 2 : 1;
            const capMaxRisk = winCap > 0 ? maxStakeForWinCap(winCap, Number(ticketDecimalOdds || 0)) : Infinity;
            const capMaxStake = Number.isFinite(capMaxRisk) ? Math.floor(capMaxRisk / riskFactor) : Infinity;
            const capOverridesMin = Number.isFinite(capMaxStake) && capMaxStake < minBet && effectiveCombinedRisk <= capMaxStake;
            if (winCap > 0 && capMaxStake < 1) {
                messages.winCap = cannotFitCapNote(winCap);
            }
            if (hasMin && effectiveCombinedRisk < minBet && !capOverridesMin) {
                messages.min = `Min bet $${minBet} — ticket risks only $${fmt(effectiveCombinedRisk)}`;
            }
            if (hasMax && effectiveCombinedRisk > maxBet) {
                messages.max = `Max bet $${maxBet} — ticket risks $${fmt(effectiveCombinedRisk)}`;
            }
            if (parlayPayoutCap > 0 && winValue > parlayPayoutCap) {
                messages.capInfo = `Max parlay payout $${fmt(parlayPayoutCap)} — winnings capped (uncapped: $${fmt(winValue)})`;
            }
            // Max-win note takes precedence over the 3×maxBet capInfo when it
            // binds tighter — it's the reason the stake is limited.
            if (Number.isFinite(capMaxStake) && capMaxStake >= 1 && effectiveCombinedRisk > capMaxStake && !messages.winCap) {
                messages.winCap = maxStakeNote(capMaxStake, winCap);
            }
        }
        return { violatingIds, messages };
    }, [normalizedMode, selections, effectiveStakeForSelection, effectiveCombinedRisk, ticketDecimalOdds, user?.minBet, user?.maxBet, user?.maxWinCap]);

    // ── Round Robin derived state ────────────────────────────────────
    // Available "By X's" sizes given the current selection count. Round
    // Robin is undefined for fewer than 3 legs and capped at 8; sizes
    // outside [2, n] aren't accepted by the backend so we don't offer
    // them either. k = n allowed since 2026-07-17 ("By N's" on N legs =
    // the single full parlay — matches competitor round robin pickers;
    // backend bound changed in the same commit). Drops sizes that fall
    // out of range whenever the slip's legCount changes.
    const roundRobinAvailableSizes = useMemo(() => {
        if (legCount < 3) return [];
        const sizes = [];
        for (let k = 2; k <= legCount; k++) sizes.push(k);
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

    // Sum of every child parlay's max payout — read-only display. The
    // combinatorial iteration + k-bound live in the tested ../utils/roundRobin
    // helper; the SGP profit-haircut stays here because it needs the raw
    // selection shape (matchId sharing + player-prop detection). For each
    // combination the helper multiplies the snapped leg odds, then this
    // callback shrinks a SAME-GAME child's profit (2+ legs share a matchId,
    // allowed since 2026-07-17) exactly like the backend's priceRoundRobinChild
    // so the display can't overstate the booked max win. Cross-game children
    // return fraction 0. Display-only; the backend stays the authority.
    const roundRobinMaxWin = useMemo(() => {
        if (normalizedMode !== 'round_robin') return 0;
        const legDecimals = selections.map((sel) => exactDecimalForLeg(sel?.odds));
        return computeRoundRobinMaxWin(
            legDecimals,
            roundRobinSizes,
            roundRobinStakePerParlay,
            (indexes) => sgpHaircutFraction(indexes.map((idx) => selections[idx]).filter(Boolean)),
        );
    }, [normalizedMode, roundRobinSizes, roundRobinStakePerParlay, legCount, selections]);

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
        // Max-win cap BLOCK (a selection can't fit under the cap at any stake).
        // The over-cap note is non-blocking — it auto-caps at placement — so
        // only the hard block enters validationErrors and gates the button.
        if (winCapState.blocked && limitFlags.messages.winCap) errors.push(limitFlags.messages.winCap);
        return errors;
    }, [legCount, normalizedMode, rule, selections, effectiveCombinedRisk, teaserValid, hasAnyStraightAmount, limitFlags, winCapState, roundRobinSizes, roundRobinStakePerParlay, roundRobinParlayCount, roundRobinMaxParlays, activeTeaserPointOptions, slipTeaserGroups, selectedTeaserType, teaserTypeRequired, teaserTypeReady, isOpenParlay, openParlayTargetLegs]);

    const ticketSignature = useMemo(() => JSON.stringify({
        type: normalizedMode,
        amount: Number.isFinite(effectiveCombinedRisk) ? Math.round(effectiveCombinedRisk) : null,
        teaserPoints: normalizedMode === 'teaser' ? Math.round(teaserPointValue) : 0,
        selections: selections.map((sel) => ({
            matchId: String(sel?.matchId || ''),
            selection: String(sel?.selection || ''),
            marketType: String(sel?.marketType || ''),
            odds: Number.isFinite(Number(sel?.odds)) ? Number(Number(sel.odds).toFixed(4)) : null,
            // Line identity mirrors the placement payload (point, falling
            // back to the board `line`) so a moved line = a new requestId.
            ...(Number.isFinite(Number(sel?.point))
                ? { point: Number(sel.point) }
                : (Number.isFinite(Number(sel?.line)) ? { point: Number(sel.line) } : {})),
            // STRAIGHT-mode stakes live PER LEG (effectiveCombinedRisk is 0
            // for straight, so the ticket-level `amount` above never sees
            // them) and MUST be in the signature: the requestId reuses while
            // the signature is unchanged, and the backend 409s a reused
            // requestId whose payload hash changed. Without this, a rejected
            // straight/outright attempt poisoned the slip — every new stake
            // re-sent the old requestId (REQUEST_ID_REUSED) until the leg was
            // removed and re-added. Constant 0 on combined modes, so their
            // rotation semantics are untouched. Do not "simplify" this away.
            wager: Number(wagerForSelection(sel).toFixed(2)),
        })),
    }), [normalizedMode, selections, teaserPointValue, effectiveCombinedRisk, wagerForSelection]);

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

    // Tightest win ceiling that applies to this ticket — the 3×maxBet parlay
    // payout cap and/or the house absolute max-win cap. 0 = no cap configured.
    const effectiveWinCap = useMemo(() => {
        const caps = [parlayPayoutCap, winCapState.cap].filter((c) => Number.isFinite(c) && c > 0);
        return caps.length ? Math.min(...caps) : 0;
    }, [parlayPayoutCap, winCapState.cap]);

    // Single write path for a typed stake (Bet Amount input, quick-stake
    // chips, AND the editable parlay summary boxes). Win-anchored writes
    // clamp an over-cap To-Win target at the WRITE, so the STORED anchor is
    // the clamped value — re-quotes then re-solve risk from the clamped
    // target instead of re-solving the over-cap number and re-clamping on
    // every odds move. Everything else passes through as-is (typed-RISK
    // semantics unchanged: whole dollars, digits only).
    //
    // `asWin` defaults to the current render's anchor for the legacy callers
    // (input/chips, where the mode isn't changing mid-event). The Win summary
    // box passes `true` EXPLICITLY: its edit flips stakeMode to 'win' in the
    // same event, so the closure's parlayWinAnchored is stale-false on the
    // first keystroke and the clamp would be skipped for e.g. a pasted
    // over-cap value.
    // Display-truth stake snap (PO 2026-07-13). Placement has ALWAYS clamped
    // the wire amount to the cap-limited stake, so an over-cap input placed a
    // smaller bet than the field showed. Snap the field itself DOWN at the
    // write — same pattern as the win-anchor clamp below, one write path for
    // input + quick chips + summary boxes. Scope: closed parlay / teaser /
    // if_bet / reverse (winCapState.maxStake already halves for reverse).
    // Round robin (server caps per child, rejects not clamps) and open parlay
    // (odds not final) keep their own contracts; straight legs snap per-card.
    const capSnapInScope = ['parlay', 'teaser', 'if_bet', 'reverse'].includes(normalizedMode) && !isOpenParlay;

    const applyTypedWager = React.useCallback((raw, asWin = parlayWinAnchored) => {
        if (asWin && effectiveWinCap > 0 && Number(raw) > effectiveWinCap) {
            onWagerChange(String(Math.floor(effectiveWinCap)));
            return;
        }
        if (!asWin && capSnapInScope
            && Number.isFinite(winCapState.maxStake) && winCapState.maxStake >= 1
            && Number(raw) > winCapState.maxStake) {
            onWagerChange(String(winCapState.maxStake));
            return;
        }
        onWagerChange(raw);
    }, [parlayWinAnchored, effectiveWinCap, onWagerChange, capSnapInScope, winCapState.maxStake]);

    // Cap tightening: adding a leg (or an odds move) can drop the cap-limited
    // max below the stake already sitting in the field. Re-snap so the field
    // never lingers over the amount placement would actually debit.
    useEffect(() => {
        if (!capSnapInScope || parlayWinAnchored) return;
        const ms = winCapState.maxStake;
        if (Number.isFinite(ms) && ms >= 1 && Number(wager) > ms) {
            onWagerChange(String(ms));
        }
    }, [capSnapInScope, parlayWinAnchored, winCapState.maxStake, wager, onWagerChange]);

    // Informational (non-blocking) note when the win-anchored target sits at
    // the cap — after the write-clamp above, "typed over the cap" and "typed
    // exactly the cap" are the same stored state, and the message is honest
    // for both. Derived, not stored, so it can never go stale.
    const winAnchorCapNote = parlayWinAnchored && effectiveWinCap > 0 && wagerAmount >= effectiveWinCap
        ? winTargetCappedNote(effectiveWinCap)
        : '';

    // Stake-was-snapped note (derived, same never-stale trick as the
    // win-anchor note above: after the write-snap, "typed over the cap" and
    // "sitting exactly at the cap" are the same stored state, and the copy is
    // honest for both). Rendered as the PROMINENT banner variant — the player
    // must see they are now staking the capped amount, not what they typed.
    const stakeSnapNote = capSnapInScope && !parlayWinAnchored
        && winCapState.cap > 0
        && Number.isFinite(winCapState.maxStake) && winCapState.maxStake >= 1
        && wagerAmount > 0 && wagerAmount >= winCapState.maxStake
        ? stakeAutoCappedNote(winCapState.maxStake, winCapState.cap)
        : '';

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
        // never the typed value — EXCEPT the sanctioned WIN-pill case
        // (Nicky sign-off 2026-07-11): a closed parlay with the
        // explicit WIN pill pins the
        // typed To-Win target, exactly like teaser/if_bet/reverse Win mode.
        // The receipt matches because placement sends requestedWin and the
        // backend pins potentialPayout = risk + requestedWin (±$2 guard) —
        // showing the back-computed value instead would resurrect the
        // "$1000 typed renders $999.79" drift this pin exists to kill.
        // Open parlay stays derived-only (odds not final while legs fill);
        // Bet-mode parlays stay risk-anchored so rawWin is derived for them.
        // The pin only holds while the typed target is actually achievable:
        // when the cap clamps the back-solved risk (totalRisk < solved risk),
        // pinning the typed value would overstate the payout by up to
        // (d−1) dollars, so fall through to the derived win from the ACTUAL
        // stored risk instead.
        const parlayWinPin = parlayWinAnchored && summarySmartMode === 'win'
            && Math.abs(resolveStake('win', wagerAmount, ticketDecimalOdds).risk - totalRisk) < 0.005;
        const otherModeWinPin = !isOpenParlay && normalizedMode !== 'parlay' && normalizedMode !== 'straight' && summarySmartMode === 'win';
        if ((parlayWinPin || otherModeWinPin) && wagerAmount > 0 && legCount > 0) {
            rawWin = wagerAmount;
        } else {
            rawWin = Math.max(0, potentialPayout - totalRisk);
        }
        if (parlayPayoutCap > 0 && rawWin > parlayPayoutCap) rawWin = parlayPayoutCap;
        // House absolute max-win cap: the displayed To-Win never exceeds it, so
        // the number matches the payout the auto-capped stake will actually win.
        if (winCapState.cap > 0 && rawWin > winCapState.cap) rawWin = winCapState.cap;
        return rawWin;
    }, [stakeMode, wagerAmount, legCount, normalizedMode, potentialPayout, totalRisk, parlayPayoutCap, ticketDecimalOdds, isOpenParlay, winCapState, parlayWinAnchored]);
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
    ) || stakeSnapNote || limitFlags.messages.winCap || winAnchorCapNote || limitFlags.messages.capInfo || '';
    // The snapped-stake message gets the emphasized banner treatment.
    const amountWarningEmphasized = amountWarning !== '' && amountWarning === stakeSnapNote;
    const hasSelections = legCount > 0;
    const [isOpen, setIsOpen] = useState(false);

    // External open signal (fired by the Betslip button in DashboardHeader).
    // Using an event keeps this component's state encapsulated so the
    // header doesn't need to lift `isOpen` through App → Shell → here.
    useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
            // Pre-fill the Bet Amount with the user's saved default for the
            // CURRENT mode (straight vs parlay-like), but only when the input
            // is empty so we don't stomp a value the user just typed before
            // reopening the slip. Record what we seeded so a subsequent mode
            // switch can safely re-seed it (but never a typed amount).
            const ctx = seedCtxRef.current;
            const seed = ctx.defaultAmountForMode ? ctx.defaultAmountForMode(ctx.normalizedMode) : 0;
            const w = ctx.wager;
            if (seed > 0 && (w === '' || w === null || w === undefined)) {
                onWagerChange(String(seed));
                lastSeededWagerRef.current = seed;
            }
            // Re-seed the mode only on the FIRST open per session/mode/
            // user context so a manual WIN click doesn't get nuked when
            // the user closes-and-reopens the slip. The ref is reset
            // when normalizedMode or user?.id changes (see the dedicated
            // effect below) so a context switch still picks up the
            // saved default on its next first open.
            if (!slipFirstOpenedRef.current) {
                slipFirstOpenedRef.current = true;
                // Read the CURRENT bucket's default mode via the live snapshot,
                // not the closure: this listener registers once ([] deps), so a
                // bare value would freeze at first render and stomp a just-saved
                // preference. ctx.defaultStakeMode is already resolved for the
                // active tab's bucket (straight → mode, parlay-like → parlayMode).
                const seededMode = ctx.defaultStakeMode || 'risk';
                lastSeededModeRef.current = seededMode;
                setStakeMode(seededMode);
            }
        };
        window.addEventListener('betslip:open', handleOpen);
        return () => window.removeEventListener('betslip:open', handleOpen);
    }, []);

    // Keep the open-listener's live snapshot current every render. The mode is
    // resolved for the ACTIVE tab's bucket so an open on the Parlay tab seeds
    // parlayMode, and on Straight seeds mode.
    seedCtxRef.current = {
        normalizedMode,
        wager,
        defaultAmountForMode,
        defaultStakeMode: defaultStakeModeForBucket(normalizedMode),
    };

    // Re-seed the stake when the mode switches between buckets (straight ↔
    // parlay-like), but ONLY while the wager is untouched — empty, or still
    // equal to the value we last auto-seeded. A user-typed amount is left
    // alone. This is what makes "$1000 straight → switch to parlay → $100"
    // visible while never stomping a deliberate stake. Initial seeding stays
    // with the betslip:open handler (skip this effect's mount run) so the
    // wager isn't pre-filled before the slip is ever opened.
    const bucketSeedMountedRef = useRef(false);
    useEffect(() => {
        if (!bucketSeedMountedRef.current) {
            bucketSeedMountedRef.current = true;
            return;
        }
        const seed = defaultAmountForMode(normalizedMode);
        if (seed <= 0) return;
        const isEmpty = wager === '' || wager === null || wager === undefined;
        const isUntouchedSeed = lastSeededWagerRef.current !== null
            && Number(wager) === Number(lastSeededWagerRef.current);
        if (isEmpty || isUntouchedSeed) {
            if (Number(wager) !== seed) onWagerChange(String(seed));
            lastSeededWagerRef.current = seed;
        }
        // Depend on the bucket (straight vs parlay-like), not raw mode, so
        // teaser↔parlay (same bucket) doesn't needlessly re-fire.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normalizedMode === 'straight', straightDefaultAmount, parlayDefaultAmount]);

    // Re-seed the STAKE MODE when the tab crosses the straight↔parlay bucket
    // boundary (Decision B, PO 2026-07-19) — mirrors the amount re-seed above,
    // with the same "don't stomp a manual selection" guard: only re-seed while
    // the mode still equals what we last auto-seeded (a pill the user clicked
    // nulled the ref). Same bucket boolean dep so within-bucket switches
    // (parlay↔teaser↔RR↔reverse↔if_bet↔open) never re-fire. Mount run is
    // skipped — initial seeding is the useState init + the betslip:open handler.
    const bucketModeSeedMountedRef = useRef(false);
    useEffect(() => {
        if (!bucketModeSeedMountedRef.current) {
            bucketModeSeedMountedRef.current = true;
            return;
        }
        const { mode: nextMode, seeded, changed } = reseedModeForBucket({
            stakeMode,
            lastSeeded: lastSeededModeRef.current,
            bucketMode: defaultStakeModeForBucket(normalizedMode),
        });
        lastSeededModeRef.current = seeded;
        if (changed) setStakeMode(nextMode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normalizedMode === 'straight', defaultStakeMode, parlayStakeMode]);

    // When the user types/clears the field, forget the seed so a later mode
    // switch treats it as a deliberate amount (never overwrites it).
    useEffect(() => {
        const isEmpty = wager === '' || wager === null || wager === undefined;
        if (isEmpty) {
            lastSeededWagerRef.current = null;
        } else if (lastSeededWagerRef.current !== null
            && Number(wager) !== Number(lastSeededWagerRef.current)) {
            lastSeededWagerRef.current = null;
        }
    }, [wager]);

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

    // On-demand totals ladders: totals buy points are default-hidden on the
    // board payload (server gate BUY_POINTS_TOTALS_ON_BOARD), so a totals leg
    // arrives with no alternateLines. Tapping the collapsed Buy Points row
    // fetches this ONE leg's ladder and grafts it onto the leg, after which
    // the standard dropdown (buildBuyPointsOptions) takes over unchanged.
    // Per-leg status: 'loading' | 'none' (server says no ladder) | 'error'
    // (tap again to retry); absent = not asked yet or already grafted. All
    // transient component state — nothing persisted anywhere.
    const [buyPointsFetch, setBuyPointsFetch] = useState({});
    // One in-flight fetch per leg (double-tap guard).
    const buyPointsInFlightRef = useRef(new Set());
    // Latest selections for the async graft: the fetch can resolve after the
    // slip changed (leg added/removed), and mapping over a stale closure
    // array would clobber those edits.
    const selectionsRef = useRef(selections);
    selectionsRef.current = selections;

    const revealBuyPoints = async (sel) => {
        if (buyPointsInFlightRef.current.has(sel.id)) return;
        const token = localStorage.getItem('token');
        if (!token) return;
        buyPointsInFlightRef.current.add(sel.id);
        setBuyPointsFetch((s) => ({ ...s, [sel.id]: 'loading' }));
        try {
            const data = await fetchBuyPointsLadder(
                sel.matchId,
                { selection: sel.selection, point: Number(sel.line) },
                token
            );
            // Keep only shape-valid rungs (finite line, decimal odds > 1) —
            // a malformed entry would be dropped by buildBuyPointsOptions
            // anyway, and an all-invalid ladder must resolve to 'none', not
            // an endlessly re-tappable pill.
            const alts = (Array.isArray(data?.alternateLines) ? data.alternateLines : [])
                .filter((alt) => Number.isFinite(Number(alt?.line)) && Number(alt?.odds) > 1);
            if (alts.length === 0) {
                setBuyPointsFetch((s) => ({ ...s, [sel.id]: 'none' }));
                return;
            }
            const current = selectionsRef.current;
            if (!current.some((s) => s.id === sel.id)) return; // leg removed mid-fetch
            const next = current.map((s) => (s.id === sel.id ? { ...s, alternateLines: alts } : s));
            // Sync the ref BEFORE the parent re-renders: a second graft
            // resolving in the same tick must see this one's result, or its
            // map over the pre-graft array would silently drop it.
            selectionsRef.current = next;
            onSelectionsChange(next);
            setBuyPointsFetch((s) => {
                const nextState = { ...s };
                delete nextState[sel.id];
                return nextState;
            });
            setOpenBuyPointsId(sel.id); // open the dropdown the player asked for
        } catch {
            setBuyPointsFetch((s) => ({ ...s, [sel.id]: 'error' }));
        } finally {
            buyPointsInFlightRef.current.delete(sel.id);
        }
    };

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
        const seededMode = defaultStakeModeForBucket(normalizedMode);
        lastSeededModeRef.current = seededMode;
        setStakeMode(seededMode);
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

    // Pre-submit re-quote is scoped to the combined modes that carry a single
    // combined price (where Nicky's "slip 210 → book 212" gap lives). Straight /
    // Round Robin / open parlay keep their existing per-leg placement flow.
    const quoteEligible = ['parlay', 'teaser', 'if_bet', 'reverse'].includes(normalizedMode) && !isOpenParlay;

    // Build the quote payload — the SAME selections + amount the placement will
    // send, so the server prices the identical ticket (odds are read from the
    // slip, which patchSlipToQuote reconciles to the quote before Confirm).
    const buildQuotePayload = () => {
        // Parlays: risk-anchored unless the explicit WIN pill is active
        // (parlayWinAnchored — the Nicky-sanctioned exception; Bet-mode never
        // win-resolves for parlays). MUST match placement's combinedSmartMode
        // below or the quoted ticket and the booked ticket diverge.
        const combinedSmartMode = normalizedMode === 'parlay'
            ? (parlayWinAnchored ? 'win' : 'risk')
            : (stakeMode === 'bet' ? resolveBetSmartMode(ticketDecimalOdds) : stakeMode);
        const requestedWin = combinedSmartMode === 'win' && Number.isFinite(Number(wager)) && Number(wager) > 0
            ? Math.round(Number(wager)) : 0;
        const cappedRisk = (winCapState.cap > 0 && Number.isFinite(winCapState.maxStake))
            ? Math.min(effectiveCombinedRisk, winCapState.maxStake) : effectiveCombinedRisk;
        const cappedReqWin = winCapState.cap > 0 ? Math.min(requestedWin, winCapState.cap) : requestedWin;
        return {
            type: normalizedMode,
            amount: cappedRisk,
            ...(cappedReqWin > 0 ? { requestedWin: cappedReqWin } : {}),
            ...(normalizedMode === 'teaser' ? { teaserPoints: teaserPointValue } : {}),
            ...(normalizedMode === 'teaser' && selectedTeaserTypeId ? { teaserTypeId: selectedTeaserTypeId } : {}),
            selections: selections.map((sel) => ({
                matchId: sel.matchId,
                selection: sel.selection,
                odds: Number(sel.odds),
                type: sel.marketType || 'straight',
                // Exact clicked line: alt rungs carry it as `point`; core board
                // legs carry it as `line`. Send it (except Buy Points, which
                // keeps its no-point contract) so the server pins/validates the
                // rung the user actually clicked and can never book a moved or
                // substituted line silently.
                ...(Number.isFinite(Number(sel.point))
                    ? { point: Number(sel.point) }
                    : (Math.abs(Number(sel.boughtPoints) || 0) <= 1e-9 && Number.isFinite(Number(sel.line))
                        ? { point: Number(sel.line) }
                        : {})),
                ...(Math.abs(Number(sel.boughtPoints)) > 1e-9 ? { boughtPoints: Number(sel.boughtPoints) } : {}),
            })),
        };
    };

    // Reconcile the slip legs to the quoted (current) odds so the modal's
    // per-leg rows + delta chips render the move, and the placement payload
    // (which reads sel.odds) then sends exactly the quoted price. priceMovedFrom
    // keeps the ORIGINAL slip baseline across re-quotes (chained moves show
    // slip → current), matching handleOddsChanged's convention.
    const patchSlipToQuote = (legs) => {
        const matchKey = (l) => `${String(l.matchId || '')}::${String(l.marketType || '').toLowerCase()}::${String(l.selection || '')}`;
        const byQualified = new Map(legs.map((l) => [matchKey(l), l]));
        const patched = selections.map((s) => {
            const leg = byQualified.get(matchKey(s))
                || legs.find((l) => String(l.matchId || '') === String(s.matchId || '') && String(l.selection || '') === String(s.selection || ''));
            const newOdds = Number(leg?.oddsDecimal);
            if (!Number.isFinite(newOdds) || newOdds <= 1 || Math.abs(newOdds - Number(s.odds)) < 1e-9) return s;
            const movedFrom = Number.isFinite(Number(s.priceMovedFrom)) ? Number(s.priceMovedFrom) : Number(s.odds);
            const { wagerOverride: _drop, ...rest } = s;
            return {
                ...rest,
                odds: newOdds,
                ...(Number.isFinite(movedFrom) && Math.abs(movedFrom - newOdds) > 1e-9 ? { priceMovedFrom: movedFrom } : {}),
            };
        });
        onSelectionsChange(patched);
    };

    // Fetch a server quote for the open review modal. `baselineCombined` is the
    // American combined the player last saw (slip on first open, prior quote on
    // a re-quote), used for the modal's combined delta. Never books.
    const runQuote = async (baselineCombined) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setReviewQuote({ status: 'loading', data: null, error: '', baselineCombined: baselineCombined ?? null });
        try {
            const res = await quoteBet(buildQuotePayload(), token);
            if (!res?.ok) {
                setReviewQuote({ status: 'error', data: null, error: res?.error || 'Could not price the bet', baselineCombined: baselineCombined ?? null });
                return;
            }
            if (Array.isArray(res.legs)) patchSlipToQuote(res.legs);
            setReviewQuote({ status: 'ready', data: res, error: '', baselineCombined: baselineCombined ?? null });
        } catch (err) {
            setReviewQuote({ status: 'error', data: null, error: err?.message || 'Could not price the bet', baselineCombined: baselineCombined ?? null });
        }
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
        // Open parlay with zero open slots: every declared leg is already
        // attached — the server refuses to book it (OPEN_PARLAY_NO_OPEN_SLOTS),
        // so intercept with an explicit choice instead of bouncing the call.
        if (isOpenParlay && legCount >= openParlayTargetLegs) {
            setShowNoOpenSlots(true);
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
        // Combined modes: open the modal on a fresh server quote so the price it
        // shows is exactly what the book will honor. Baseline = the slip's own
        // combined (the number the player was looking at), so the modal renders
        // the "slip → quoted" combined delta. Straight/RR/open-parlay skip this.
        if (quoteEligible) {
            const baseline = totalRisk > 0 ? decimalToAmerican((totalRisk + displayWinAmount) / totalRisk) : null;
            runQuote(baseline);
        } else {
            setReviewQuote({ status: 'idle', data: null, error: '', baselineCombined: null });
        }
    };

    // Completes the no-open-slots "Place as Regular Parlay" conversion: by
    // the time this fires the panel has re-rendered in parlay mode (mode is
    // a prop; slip legs and wager are lifted state, so both survive the
    // switch), and handlePlaceBet here IS the normal parlay entry point —
    // parlay validation → standard confirmation modal → placeBet('parlay').
    useEffect(() => {
        if (!convertToParlayPending || isOpenParlay) return;
        setConvertToParlayPending(false);
        handlePlaceBet();
        // handlePlaceBet is re-created each render; the pending flag is the
        // real trigger and is cleared synchronously above.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [convertToParlayPending, isOpenParlay]);

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
            // Tag the pre-move price (decimal) so the slip leg and the
            // review modal render an inline "old → new" delta chip until
            // placement — without it the explicit ODDS_CHANGED flow shows
            // only the NEW number and reads as "odds not matching" against
            // whatever the player remembered. Chained moves keep the
            // ORIGINAL baseline (+100 → +105 → +110 renders "+100 → +110").
            // Display-only slip state: the placement payload picks its
            // fields explicitly and never sends this.
            const movedFrom = Number.isFinite(Number(rest.priceMovedFrom))
                ? Number(rest.priceMovedFrom)
                : Number(s.odds);
            return {
                ...rest,
                odds: next,
                ...(Number.isFinite(movedFrom) && Math.abs(movedFrom - next) > 1e-9
                    ? { priceMovedFrom: movedFrom }
                    : {}),
            };
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
                    // Auto-cap each leg's stake to the max that wins the house
                    // cap (per-selection odds). The server re-enforces; capping
                    // here means the player is charged the compliant stake and
                    // the receipt matches the note they saw.
                    .map((sel) => {
                        const amount = capStakeForSelection(sel, wagerForSelection(sel));
                        return { sel, amount, requestedWin: Math.min(winForSelection(sel), Number(user?.maxWinCap) > 0 ? Number(user.maxWinCap) : Infinity) };
                    })
                    .filter(({ amount }) => amount > 0);
                // Collect each leg's placement response so the Wager
                // Confirmed sheet can show one ticket card per leg —
                // straight mode places N independent tickets, all of
                // which are receipts the user expects to see.
                const placedTickets = [];
                // True if ANY placed leg was routed to the approval queue
                // (settings.requiresBetApproval / threshold). A queued bet is a
                // distinct outcome from a live placement and must NOT read as a
                // green "placed" — the backend returns approvalPending per leg.
                let anyApprovalPending = false;
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
                        if (legResult?.approvalPending) anyApprovalPending = true;
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
                    // A queued (approval-required) bet is surfaced as info, not
                    // a green "placed" success — the stake is held but the bet
                    // is not live until an agent/admin approves it.
                    const text = anyApprovalPending
                        ? (placed.length === 1
                            ? 'Bet submitted — awaiting approval.'
                            : `${placed.length} straight bets submitted — awaiting approval.`)
                        : (placed.length === 1
                            ? 'Bet placed successfully'
                            : `${placed.length} straight bets placed`);
                    setMessage({ type: anyApprovalPending ? 'info' : 'success', text });
                    showToast(text, anyApprovalPending ? 'info' : 'success');
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
            // ONE exception (Nicky sign-off 2026-07-11): the explicit
            // WIN pill on a closed
            // parlay (parlayWinAnchored) sends the typed To-Win target as
            // requestedWin so the backend's ±$2 pin books exactly the number
            // the slip showed. Bet-mode never win-resolves for parlays.
            // Other combined modes keep Bet/Win To-Win pinning.
            const combinedSmartMode = normalizedMode === 'parlay'
                ? (parlayWinAnchored ? 'win' : 'risk')
                : (stakeMode === 'bet' ? resolveBetSmartMode(ticketDecimalOdds) : stakeMode);
            const combinedRequestedWin = combinedSmartMode === 'win' && Number.isFinite(Number(wager)) && Number(wager) > 0
                ? Math.round(Number(wager))
                : 0;
            // Auto-cap the combined-ticket stake to the max that wins the house
            // cap (Round Robin caps per-child server-side, so leave its stake).
            // Server re-enforces regardless.
            const cappedCombinedRisk = (winCapState.cap > 0 && Number.isFinite(winCapState.maxStake))
                ? Math.min(effectiveCombinedRisk, winCapState.maxStake)
                : effectiveCombinedRisk;
            const cappedCombinedRequestedWin = winCapState.cap > 0
                ? Math.min(combinedRequestedWin, winCapState.cap)
                : combinedRequestedWin;
            const payload = {
                type: normalizedMode,
                amount: normalizedMode === 'round_robin' ? roundRobinStakePerParlay : cappedCombinedRisk,
                // Reviewed-quote lock: the player confirmed a server-quoted price,
                // so the book must honor it exactly (or better) — 'exact' policy
                // server-side. The slip odds were reconciled to the quote by
                // patchSlipToQuote, so this payload already carries the quoted
                // prices. A late adverse tick returns ODDS_CHANGED → re-quote.
                ...(quoteEligible && reviewQuote.status === 'ready' ? { reviewedQuote: true } : {}),
                ...(normalizedMode === 'round_robin'
                    ? { sizes: [...roundRobinSizes].sort((a, b) => a - b) }
                    : (cappedCombinedRequestedWin > 0 ? { requestedWin: cappedCombinedRequestedWin } : {})),
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
                    // Exact clicked line: alt rungs carry it as `point`; core
                    // board legs carry it as `line`. Send it (except Buy
                    // Points, which keeps its no-point contract) so the server
                    // pins/validates the rung the user actually clicked and can
                    // never book a moved or substituted line silently.
                    ...(Number.isFinite(Number(sel.point))
                        ? { point: Number(sel.point) }
                        : (Math.abs(Number(sel.boughtPoints) || 0) <= 1e-9 && Number.isFinite(Number(sel.line))
                            ? { point: Number(sel.line) }
                            : {})),
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
            // A queued (approval-required) bet is a distinct outcome from a live
            // placement — surface it as info, not a green "placed" success.
            const approvalPending = !!result?.approvalPending;
            setMessage({ type: approvalPending ? 'info' : 'success', text: successText });
            showToast(successText, approvalPending ? 'info' : 'success');
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
            // Reviewed-quote late tick: the price moved adversely between the
            // quote and this Confirm tap, so the 'exact' policy rejected it
            // (never silently booked worse). Re-open the review modal on a FRESH
            // quote showing the new delta and require a new Confirm — never an
            // automatic silent retry. Baseline = the price the player just
            // confirmed (the prior quote's combined), so the delta reads
            // "what you saw → new".
            if (quoteEligible && String(error?.code || '') === 'ODDS_CHANGED') {
                handleOddsChanged(error); // patch slip to the server's new odds + reset requestId
                setShowConfirm(true);
                runQuote(reviewQuote.data?.combinedAmerican ?? null);
                return;
            }
            if (handleOddsChanged(error)) {
                return;
            }
            // Max-win cap rejection (authoritative server guard). The betslip
            // auto-caps the stake, so this normally only fires if the odds moved
            // between entry and submit or on an exotic multi-selection edge the
            // live UI didn't pre-cap. Surface the server's own message (it names
            // the exact allowed stake), falling back to a generic cap line.
            if (String(error?.code || '') === 'MAX_WIN_EXCEEDED') {
                const capText = error.message
                    || (Number(error?.allowedStake) >= 1
                        ? `Max payout reached — reduce your stake to $${Math.floor(Number(error.allowedStake)).toLocaleString('en-US')} or less.`
                        : 'This selection exceeds the maximum payout limit.');
                setMessage({ type: 'error', text: capText });
                showToast(capText, 'error');
                return;
            }
            // Server-side onboarding gate: the player dismissed (or never saw)
            // the first-login setup, so placement is blocked until bet
            // defaults + rules acknowledgment are complete. Re-open the gate
            // right here instead of leaving them stuck on an error toast.
            if (String(error?.code || '') === 'ONBOARDING_REQUIRED') {
                window.dispatchEvent(new Event('onboarding:show'));
                const gateText = error.message || 'Finish your account setup to place bets.';
                setMessage({ type: 'error', text: gateText });
                showToast(gateText, 'warning');
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
                                    // Open parlay locks WIN too: its combined odds aren't final until
                                    // every declared leg fills, so a To-Win target is undefined — the
                                    // committed stake is always the risk.
                                    const lockedOut = (normalizedMode === 'round_robin' && (m.id === 'win' || m.id === 'bet'))
                                        || (isOpenParlay && m.id === 'win');
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => { if (!lockedOut) setStakeModeUser(m.id); }}
                                            disabled={lockedOut}
                                            title={lockedOut
                                                ? (isOpenParlay
                                                    ? 'Open parlays are risk-based — odds aren\'t final until all legs fill'
                                                    : 'Not available for Round Robin — use stake per parlay')
                                                : undefined}
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
                                    // "Amount" (not "Bet Amount") + a smaller
                                    // placeholder font (mode-bet-amount-input
                                    // ::placeholder in index.css) so the hint fits
                                    // the narrow flex:1 input between the
                                    // BET/RISK/WIN toggle and CLEAR on mobile, where
                                    // "Bet Amount" truncated to "Bet Amo…". Typed
                                    // numbers stay at the full 14px below. The "$"
                                    // prefix + "APPLY TO ALL" title keep it clear.
                                    className="mode-bet-amount-input"
                                    placeholder="Amount"
                                    value={wager}
                                    onChange={(e) => applyTypedWager(String(e.target.value).replace(/\D/g, ''))}
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
                                    padding: amountWarningEmphasized ? '9px 12px' : '6px 10px',
                                    fontSize: amountWarningEmphasized ? 12.5 : 11,
                                    fontWeight: amountWarningEmphasized ? 800 : 700,
                                    color: '#b45309',
                                    background: '#fef3c7',
                                    border: amountWarningEmphasized ? '2px solid #f59e0b' : '1px solid #fcd34d',
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
                                            onClick={() => applyTypedWager(String(v))}
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
                                    : 'All declared slots are filled — raise the leg count to keep it open, or place as a regular parlay.'}
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
                    // One-line selection label (shared formatLegLabel via
                    // legPreviewLine). Teaser mode swaps in the adjusted line +
                    // a muted "(BP …)" base-line suffix; every other mode gets
                    // the plain short label ("Detroit Tigers -1.5", "Over 12").
                    const legLabelText = legPreviewLine(sel);
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
                    // Totals legs arrive with no alternateLines (server default-
                    // hides totals ladders) → options is just [base]. Show the
                    // collapsed on-demand trigger instead of the dropdown; a
                    // successful reveal grafts alternateLines onto the leg and
                    // options.length > 1 flips this leg to the dropdown above.
                    // Gated on the server's per-outcome buyPointsAvailable hint
                    // so disabled sports get NO pill at all instead of a
                    // tap-to-dead-end.
                    const buyPointsFetchState = buyPointsFetch[sel.id];
                    const showBuyPointsTrigger = supportsBuyPoints
                        && market === 'totals'
                        && sel.buyPointsAvailable === true
                        && buyPointsOptions.length === 1;
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
                                {/* Title + odds on ONE line: title (left, wraps)
                                    and the American odds (right, pinned). Short
                                    titles sit truly on one line (compaction win);
                                    a long prop title wraps to extra lines while
                                    the odds stay pinned top-right — never
                                    truncated, so the full prop text is always
                                    visible. Applies to every bet-type tab since
                                    this is the shared leg renderer. */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    gap: 8,
                                    marginBottom: matchTimeLabel ? 2 : 5,
                                }}>
                                    {/* Left group: title text + LIVE pill.
                                        min-width:0 lets it shrink and wrap
                                        instead of pushing the odds off-card. */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                        minWidth: 0,
                                        flex: '1 1 auto',
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: palette.textPrimary,
                                        lineHeight: 1.2,
                                    }}>
                                        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{isProp
                                            ? formatPropSelectionTitle(sel.selectionFull || sel.selection, propMarketLabel)
                                            : legLabelText}</span>
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
                                    {/* Right group: odds (+ optional ODDS_CHANGED
                                        delta chip). flex-shrink:0 + nowrap keeps
                                        it intact and pinned; the title wraps to
                                        make room instead. */}
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'baseline',
                                        gap: 6,
                                        flexShrink: 0,
                                        whiteSpace: 'nowrap',
                                        fontSize: 13,
                                    }}>
                                        {/* ODDS_CHANGED delta chip: old → new, set by
                                            handleOddsChanged when the server repriced
                                            this leg. Green when the new price pays
                                            more (higher decimal), muted otherwise. */}
                                        {Number.isFinite(Number(sel.priceMovedFrom))
                                            && Math.abs(Number(sel.priceMovedFrom) - Number(sel.odds)) > 1e-9 && (
                                            <span style={{
                                                fontSize: 10.5,
                                                fontWeight: 800,
                                                padding: '1px 7px',
                                                borderRadius: 999,
                                                whiteSpace: 'nowrap',
                                                background: Number(sel.odds) >= Number(sel.priceMovedFrom) ? 'rgba(22,163,74,0.12)' : '#f1f5f9',
                                                color: Number(sel.odds) >= Number(sel.priceMovedFrom) ? '#16a34a' : '#64748b',
                                            }}>
                                                {formatOddsSign(sel.priceMovedFrom)} → {formatOddsSign(sel.odds)}
                                            </span>
                                        )}
                                        <span style={{ fontWeight: 800, color: palette.success, fontVariantNumeric: 'tabular-nums' }}>
                                            {formatOddsSign(sel.odds)}
                                        </span>
                                    </span>
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

                                {/* Collapsed Buy Points trigger — TOTALS only.
                                    Totals ladders are default-hidden on the
                                    board (books don't advertise them; Nicky
                                    2026-07-17). Same pill as the dropdown
                                    trigger above so it reads as one family;
                                    first tap fetches this leg's ladder, then
                                    the dropdown above takes over. 'none' =
                                    server confirmed no ladder → inert row so
                                    the tap doesn't feel swallowed. */}
                                {showBuyPointsTrigger && (
                                    <div style={{ marginTop: 6 }}>
                                        <button
                                            type="button"
                                            onClick={() => revealBuyPoints(sel)}
                                            disabled={buyPointsFetchState === 'loading' || buyPointsFetchState === 'none'}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8,
                                                padding: '5px 10px',
                                                background: '#fff',
                                                border: `1px solid ${palette.cardBorder}`,
                                                borderRadius: 8,
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: palette.textPrimary,
                                                cursor: buyPointsFetchState === 'none' ? 'default' : 'pointer',
                                                opacity: buyPointsFetchState === 'none' ? 0.6 : 1,
                                                transition: 'border-color 120ms ease',
                                                lineHeight: 1.2,
                                            }}
                                        >
                                            <span style={{ color: palette.textMuted, letterSpacing: 0.3 }}>Buy Points</span>
                                            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                                <span style={{ fontVariantNumeric: 'tabular-nums', color: buyPointsFetchState ? palette.textMuted : palette.textPrimary }}>
                                                    {buyPointsFetchState === 'loading' ? 'Loading…'
                                                        : buyPointsFetchState === 'none' ? 'Not available'
                                                        : buyPointsFetchState === 'error' ? 'Tap to retry'
                                                        : 'Show options'}
                                                </span>
                                                {buyPointsFetchState !== 'none' && (
                                                    <i className="fa-solid fa-chevron-down" style={{ fontSize: 10, color: palette.textFaint }} />
                                                )}
                                            </span>
                                        </button>
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
                                                            let cleaned = String(e.target.value).replace(/\D/g, '');
                                                            // Per-leg stake snap (PO 2026-07-13): a typed
                                                            // Risk over this leg's cap-limited stake — or a
                                                            // typed Win over the cap itself — snaps down at
                                                            // the write, same as the shared input. Placement
                                                            // already clamps the wire; this keeps the card
                                                            // showing the amount actually debited/paid.
                                                            const legCap = Number(user?.maxWinCap);
                                                            if (legCap > 0 && cleaned !== '') {
                                                                if (field.id === 'risk') {
                                                                    const ms = maxStakeForWinCap(legCap, Number(sel?.odds || 0));
                                                                    if (Number.isFinite(ms) && ms >= 1 && Number(cleaned) > ms) cleaned = String(ms);
                                                                } else if (Number(cleaned) > legCap) {
                                                                    cleaned = String(Math.floor(legCap));
                                                                }
                                                            }
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
                        {/* Risk / Win summary boxes. CLOSED parlays make both
                            EDITABLE (PO follow-up 2026-07-11): each box is a
                            second writer to the SAME (stakeMode, wager) state
                            the BET/RISK/WIN pill drives — editing Risk ≡
                            clicking RISK + typing that value, editing Win ≡
                            clicking WIN + typing. The pill highlight follows
                            automatically and the back-solve / cap clamp /
                            requestedWin / gates all run off the shared
                            derivation, so a box edit can't bypass anything the
                            pill path doesn't. Display follows the straight-card
                            convention (see the per-card inputs above): the
                            ANCHORED box shows the raw typed string so it
                            doesn't snap to a formatted value mid-type; the
                            derived box shows the formatted computed value.
                            Teaser / if_bet / reverse and OPEN parlay keep
                            read-only spans — open parlay's odds aren't final
                            until all declared legs fill, and the other modes
                            anchor via the pill only. */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 8,
                        }}>
                            {[
                                { id: 'risk', label: 'Risk:', anchored: !parlayWinAnchored, display: formatMoney2dp(totalRisk), positive: totalRisk > 0, color: palette.textPrimary, capChip: false },
                                { id: 'win', label: 'Win:', anchored: parlayWinAnchored, display: formatMoney2dp(displayWinAmount), positive: displayWinAmount > 0, color: palette.success, capChip: parlayPayoutCap > 0 && displayWinAmount >= parlayPayoutCap },
                            ].map((box) => {
                                const editable = normalizedMode === 'parlay' && !isOpenParlay;
                                const valueColor = box.positive ? box.color : palette.textFaint;
                                const boxStyle = {
                                    background: '#f8fafc',
                                    border: `1px solid ${palette.cardBorder}`,
                                    borderRadius: 6,
                                    padding: '6px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 6,
                                };
                                if (!editable) {
                                    return (
                                        <div key={box.id} style={boxStyle}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{box.label}</span>
                                            <span style={{ fontSize: 13, fontWeight: 800, color: valueColor, fontVariantNumeric: 'tabular-nums' }}>
                                                ${box.display}
                                                {box.capChip && (
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: palette.textMuted, marginLeft: 4 }}>(max)</span>
                                                )}
                                            </span>
                                        </div>
                                    );
                                }
                                return (
                                    <label key={box.id} style={{ ...boxStyle, cursor: 'text' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{box.label}</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, minWidth: 0 }}>
                                            <span style={{ fontSize: 13, fontWeight: 800, color: valueColor }}>$</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={box.anchored ? wager : box.display}
                                                onFocus={() => {
                                                    // Clear-on-tap (PO 2026-07-11): focusing the
                                                    // box that is NOT the current anchor switches
                                                    // the anchor to this box's unit and clears the
                                                    // wager so the user types a fresh value —
                                                    // never a silent reinterpretation of the old
                                                    // number in the new unit (Risk $50 must not
                                                    // become a $50 To-Win target). Focusing the
                                                    // box that already IS the anchor edits the
                                                    // existing value in place, nothing wiped.
                                                    if (!box.anchored) {
                                                        setStakeModeUser(box.id === 'win' ? 'win' : 'risk');
                                                        onWagerChange('');
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    // Whole-dollar amounts only — same digit
                                                    // strip as every other stake entry point.
                                                    const cleaned = String(e.target.value).replace(/\D/g, '');
                                                    setStakeModeUser(box.id === 'win' ? 'win' : 'risk');
                                                    // Explicit asWin: stakeMode just flipped in
                                                    // this same event, so the closure's default
                                                    // would be stale on the first keystroke.
                                                    applyTypedWager(cleaned, box.id === 'win');
                                                }}
                                                placeholder="0"
                                                style={{
                                                    width: 84,
                                                    border: 'none',
                                                    outline: 'none',
                                                    background: 'transparent',
                                                    fontSize: 13,
                                                    fontWeight: 800,
                                                    color: valueColor,
                                                    textAlign: 'right',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    padding: 0,
                                                    margin: 0,
                                                }}
                                            />
                                            {box.capChip && (
                                                <span style={{ fontSize: 10, fontWeight: 700, color: palette.textMuted, marginLeft: 4 }}>(max)</span>
                                            )}
                                        </span>
                                    </label>
                                );
                            })}
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
            {showNoOpenSlots && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15,23,42,0.55)',
                        zIndex: 1200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                    onClick={() => setShowNoOpenSlots(false)}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 12,
                            padding: '18px 16px 14px',
                            maxWidth: 380,
                            width: '100%',
                            boxShadow: '0 20px 50px -12px rgba(15,23,42,0.45)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                            No open legs left
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 14 }}>
                            All {openParlayTargetLegs} declared legs are already filled, so this ticket has
                            no open slots — it would just be a regular parlay.
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setShowNoOpenSlots(false);
                                setConvertToParlayPending(true);
                                if (onModeChange) onModeChange('parlay');
                            }}
                            style={{
                                width: '100%',
                                border: 'none',
                                borderRadius: 10,
                                padding: '12px 10px',
                                fontWeight: 800,
                                fontSize: 12,
                                letterSpacing: 0.6,
                                color: '#fff',
                                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                marginBottom: 8,
                            }}
                        >
                            Place as Regular Parlay
                        </button>
                        {openParlayTargetLegs < OPEN_PARLAY_MAX_LEGS && (
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNoOpenSlots(false);
                                    setOpenParlayTargetLegs(Math.min(openParlayTargetLegs + 1, OPEN_PARLAY_MAX_LEGS));
                                }}
                                style={{
                                    width: '100%',
                                    borderRadius: 10,
                                    padding: '12px 10px',
                                    fontWeight: 800,
                                    fontSize: 12,
                                    letterSpacing: 0.6,
                                    color: '#0f172a',
                                    background: '#fff',
                                    border: '1px solid #cbd5e1',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    marginBottom: 8,
                                }}
                            >
                                Keep it open — make it {openParlayTargetLegs + 1} legs
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowNoOpenSlots(false)}
                            style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                color: '#64748b',
                                fontSize: 12,
                                fontWeight: 700,
                                padding: '8px 0 2px',
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
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
                // When a server quote is ready, its payout is authoritative —
                // the modal shows exactly what the book will pay (closes the
                // slip→receipt gap). Falls back to the client estimate while the
                // quote is loading or for non-quoted modes.
                potentialPayout={(quoteEligible && reviewQuote.status === 'ready' && reviewQuote.data)
                    ? reviewQuote.data.potentialPayout
                    : (normalizedMode === 'straight' ? potentialPayout : (totalRisk + displayWinAmount))}
                // The re-quote snapshot: status (loading/ready/error), the server
                // combined + payout, and the baseline combined for the delta chip.
                reviewQuote={quoteEligible ? reviewQuote : null}
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
