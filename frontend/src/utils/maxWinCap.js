// Max-WIN stake cap — the client mirror of the server's house win ceiling
// (MAX_PARLAY_PAYOUT, surfaced to the client as user.maxWinCap). The betslip
// live-caps a stake to the amount that wins EXACTLY the cap, so a customer
// can't over-risk a high-plus-money selection for no extra upside. The server
// re-enforces this authoritatively at placement — this file is UX only.
//
// Single source of the cap math + copy so no component reinvents either. The
// arithmetic must match SportsbookBetSupport::allowedStakeForWinCap /
// assertWinWithinCap (floor(cap/(dec−1))) exactly.

// Largest whole-dollar stake whose win fits under the cap at a given combined
// DECIMAL odds: floor(cap / (decimal − 1)). floor (not round) so the capped
// To-Win never exceeds the cap. Returns:
//   - Infinity when the cap is disabled (<= 0) or odds are degenerate (<= 1) —
//     i.e. "no cap applies, don't constrain the stake".
//   - 0 when even a $1 stake would bust the cap (extreme longshot) — caller
//     must BLOCK the selection, not offer a $0 bet.
export const maxStakeForWinCap = (cap, decimalOdds) => {
    const c = Number(cap);
    const d = Number(decimalOdds);
    if (!Number.isFinite(c) || c <= 0) return Infinity;      // cap disabled
    if (!Number.isFinite(d) || d <= 1) return Infinity;      // no win multiple → nothing to cap
    return Math.floor(c / (d - 1));
};

// True when a selection/ticket can NEVER fit under the cap (maxStake floored
// below $1). These get blocked outright rather than auto-capped.
export const exceedsCapAtAnyStake = (cap, decimalOdds) => (
    maxStakeForWinCap(cap, decimalOdds) < 1
);

// The one capped To-Win value: min(stake, maxStake) × (decimal − 1), so the
// displayed win reflects the cap when the stake is above the ceiling.
export const cappedToWin = (stake, decimalOdds, cap) => {
    const d = Number(decimalOdds);
    const s = Number(stake);
    if (!Number.isFinite(d) || d <= 1 || !Number.isFinite(s) || s <= 0) return 0;
    const maxS = maxStakeForWinCap(cap, d);
    const effectiveStake = Number.isFinite(maxS) ? Math.min(s, maxS) : s;
    return effectiveStake * (d - 1);
};

// ── Min-bet FLOOR snap (mirror of the max-win cap) ──────────────────────────
// A WIN-mode back-solve can produce a stake BELOW the account minimum (a small
// To-Win target at very high odds). Instead of hard-blocking, snap the stake UP
// to the minimum and recompute the win. The floor is bounded by the cap ceiling
// (`maxStake`) so the cap still wins when it sits below the min — cap-vs-min
// precedence. The CALLER gates this to win-mode back-solve only; a deliberately
// typed sub-min Risk must still error.

// Effective stake after flooring UP to `minBet` (when the raw stake is below it)
// and clamping DOWN to `maxStake` (the cap ceiling; pass Infinity when no cap).
// A minBet of 0/NaN disables the floor, so this doubles as the plain cap clamp.
export const floorStakeToMin = (risk, minBet, maxStake = Infinity) => {
    const r = Number(risk);
    if (!Number.isFinite(r) || r <= 0) return r;
    const m = Number(minBet);
    // Raise to the min ONLY when the cap allows reaching it. When the cap sits
    // below the min (extreme longshot), don't partially raise toward the cap —
    // the cap wins and the sub-min stake stands (matches capOverridesMin).
    if (Number.isFinite(m) && m > 0 && r < m && (!Number.isFinite(maxStake) || maxStake >= m)) {
        return m;
    }
    return Number.isFinite(maxStake) ? Math.min(r, maxStake) : r;
};

// True when the floor actually snapped the stake up: the raw back-solved stake
// is below the min AND the cap ceiling allows reaching the min. When the cap is
// below the min (extreme longshot), the floor can't apply — the cap wins and
// the sub-min stake is allowed as-is (no snap, no min error).
export const minFloorApplied = (rawRisk, minBet, maxStake = Infinity) => {
    const r = Number(rawRisk);
    const m = Number(minBet);
    if (!Number.isFinite(r) || r <= 0 || !(Number.isFinite(m) && m > 0)) return false;
    if (r >= m) return false;
    return !Number.isFinite(maxStake) || maxStake >= m;
};

// ── Centralized copy ────────────────────────────────────────────────────────
// $X with thousands separators, no cents (matches ticket money style).
const dollars = (n) => `$${Math.floor(Number(n) || 0).toLocaleString('en-US')}`;

// Inline note shown under the stake field for a cap-limited selection, e.g.
// "Max bet on this selection: $50 (max payout $5,000)".
export const maxStakeNote = (maxStake, cap) => (
    `Max bet on this selection: ${dollars(maxStake)} (max payout ${dollars(cap)})`
);

// Shown when a selection can't fit under the cap at any stake (extreme longshot).
export const cannotFitCapNote = (cap) => (
    `This selection exceeds the maximum payout limit of ${dollars(cap)}.`
);

// Message when the stake was auto-reduced to the cap-limited amount.
export const stakeAutoCappedNote = (maxStake, cap) => (
    `Stake capped to ${dollars(maxStake)} — the most that wins the ${dollars(cap)} maximum payout.`
);

// Mirror-image of stakeAutoCappedNote for the FLOOR case: a WIN-mode back-solve
// produced a stake below the account minimum, so it was auto-raised to the
// minimum and the To-Win recomputed at that stake. Informational, not blocking.
export const stakeAutoRaisedNote = (minBet) => (
    `Stake raised to the ${dollars(minBet)} minimum bet — To-Win recalculated at this stake.`
);

// Shown when a typed To-Win target sits at the ticket's win ceiling
// (win-anchored parlays: the WIN pill makes the typed number a payout target,
// and over-cap targets are clamped to the cap at the input).
export const winTargetCappedNote = (cap) => (
    `To-Win capped at ${dollars(cap)} — the maximum payout on this ticket.`
);
