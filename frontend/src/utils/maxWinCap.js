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

// Shown when a typed To-Win target sits at the ticket's win ceiling
// (win-anchored parlays: the WIN pill makes the typed number a payout target,
// and over-cap targets are clamped to the cap at the input).
export const winTargetCappedNote = (cap) => (
    `To-Win capped at ${dollars(cap)} — the maximum payout on this ticket.`
);
