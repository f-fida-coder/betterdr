// Max-WIN payout cap — the client mirror of the server's house win ceiling
// (MAX_PARLAY_PAYOUT, surfaced to the client as user.maxWinCap).
//
// RULE (Nicky 2026-07-20 — REVERSES the 2026-07-09/07-13 stake-cap design):
// the cap TRUNCATES the ticket's WIN and NEVER touches the stake. Min bet is
// a hard floor the cap cannot undercut — a player can always put at least
// the minimum on any offered selection; at extreme odds the payout simply
// tops out at the cap ($25 @ +100000 risks $25 and pays $5,000).
//
// The old stake-clamp helpers (maxStakeForWinCap, exceedsCapAtAnyStake) and
// their copy (stakeAutoCappedNote, subMinCapAllowedNote, winTargetCappedNote,
// maxStakeNote, cannotFitCapNote) are deliberately GONE — nothing in the UI
// may display, mention, or derive the old intermediate capped-stake number.
// The server re-enforces the truncation authoritatively at placement AND at
// settlement (payoutCapAmount snapshot); this file is UX only.

// The one truncated To-Win value: stake × (decimal − 1), topped at the cap.
// The stake passes through untouched — only the win is capped. cap <= 0
// (disabled) or degenerate inputs → plain uncapped win.
export const cappedWinForStake = (stake, decimalOdds, cap) => {
    const d = Number(decimalOdds);
    const s = Number(stake);
    if (!Number.isFinite(d) || d <= 1 || !Number.isFinite(s) || s <= 0) return 0;
    const rawWin = s * (d - 1);
    const c = Number(cap);
    return Number.isFinite(c) && c > 0 ? Math.min(rawWin, c) : rawWin;
};

// True when the cap actually binds at this stake/odds. Since 2026-07-23
// (Fida: no banner while the cap binds) nothing in the UI consumes this —
// kept for tests/future use; the truncation itself lives in
// cappedWinForStake and the panel's displayWinAmount clamp.
export const winTruncationActive = (stake, decimalOdds, cap) => {
    const d = Number(decimalOdds);
    const s = Number(stake);
    const c = Number(cap);
    if (!Number.isFinite(d) || d <= 1 || !Number.isFinite(s) || s <= 0) return false;
    return Number.isFinite(c) && c > 0 && s * (d - 1) > c;
};

// ── Min-bet FLOOR snap ──────────────────────────────────────────────────────
// A WIN-mode back-solve can produce a stake BELOW the account minimum (a
// small To-Win target at high odds). Snap the stake UP to the minimum and
// recompute the win. Under the 2026-07-20 rule the floor is UNCONDITIONAL —
// no cap ceiling bounds it anymore. The CALLER gates this to win-mode
// back-solve only; a deliberately typed sub-min Risk must still error.

// Effective stake after flooring UP to `minBet` when the raw stake is below
// it. A minBet of 0/NaN disables the floor (identity).
export const floorStakeToMin = (risk, minBet) => {
    const r = Number(risk);
    if (!Number.isFinite(r) || r <= 0) return r;
    const m = Number(minBet);
    return Number.isFinite(m) && m > 0 && r < m ? m : r;
};

// True when the floor actually snapped the stake up.
export const minFloorApplied = (rawRisk, minBet) => {
    const r = Number(rawRisk);
    const m = Number(minBet);
    return Number.isFinite(r) && r > 0 && Number.isFinite(m) && m > 0 && r < m;
};

// ── Centralized copy ────────────────────────────────────────────────────────
// The ONLY cap message left in the UI, and ONLY on the MAX_WIN_EXCEEDED
// error path (a pre-reversal backend rejecting during a mismatched-deploy
// window). Fida 2026-07-23 (revising 2026-07-22): the informational banner
// while the cap merely binds is GONE — a capped ticket shows no cap copy
// at all, just the truncated To-Win number. Still never a capped-stake
// figure or a derived calculation.
export const capLimitsNote = (cap) => {
    const c = Math.floor(Number(cap) || 0);
    return `Max payout $${c} — winnings capped at this amount`;
};

// Mirror-image of the old cap-snap note for the FLOOR case: a WIN-mode
// back-solve produced a stake below the account minimum, so it was
// auto-raised to the minimum and the To-Win recomputed at that stake.
// Informational, not blocking.
export const stakeAutoRaisedNote = (minBet) => (
    `Stake raised to the $${Math.floor(Number(minBet) || 0).toLocaleString('en-US')} minimum bet — To-Win recalculated at this stake.`
);

// ── Minimum-WIN floor ───────────────────────────────────────────────────────
// NEW RULE (Nicky 2026-07-20): every ticket must be able to WIN at least $25
// — "the only way you can bet $25 is if it's +100 or higher". At any
// sub-+100 price (standard -110 juice included) the stake AUTO-BUMPS UP to
// the smallest whole dollar whose win clears the floor ($25 @ -130 books as
// $33). Stake moves UP, never the win down — the mirror of the max-win cap
// above. The server enforces this authoritatively (MIN_WIN_FLOOR env,
// default 25; quote + placement bump identically and REJECT
// MIN_WIN_UNREACHABLE when the required stake exceeds maxBet); this mirror
// exists so the panel shows the bumped stake BEFORE submit and the booked
// ticket never surprises the player. Keep the constant in lockstep with the
// server default — if MIN_WIN_FLOOR is ever changed on the server, this
// mirror must change with it (same trap as user.maxWinCap).
export const MIN_WIN_FLOOR = 25;

// Smallest whole-dollar stake whose win clears the floor at these decimal
// odds: ceil(floor / (decimal − 1)), with a 4dp dust round so an exact
// boundary (32.5 @ -130) ceils to 33, not 34. Mirrors the server's
// bumpedUnitStakeForMinWin. Returns 0 when no bump is derivable (degenerate
// odds) — callers must treat 0 as "leave the stake alone".
export const stakeForMinWin = (decimalOdds, floor = MIN_WIN_FLOOR) => {
    const d = Number(decimalOdds);
    const f = Number(floor);
    if (!Number.isFinite(d) || d <= 1 || !Number.isFinite(f) || f <= 0) return 0;
    return Math.ceil(Math.round((f / (d - 1)) * 10000) / 10000);
};

// True when the min-win floor actually bumps this stake — i.e. the win at
// the raw stake is under the floor AND a bump target exists above it.
export const minWinBumpApplied = (risk, decimalOdds, floor = MIN_WIN_FLOOR) => {
    const r = Number(risk);
    const d = Number(decimalOdds);
    const f = Number(floor);
    if (!Number.isFinite(r) || r <= 0 || !Number.isFinite(d) || d <= 1 || !Number.isFinite(f) || f <= 0) return false;
    const target = stakeForMinWin(d, f);
    return target > 0 && r < target && r * (d - 1) < f;
};

// Informational note for the bump — same amber, non-blocking family as
// stakeAutoRaisedNote. One wording everywhere.
export const minWinRaisedNote = (floor = MIN_WIN_FLOOR) => (
    `Stake raised so this ticket wins at least $${Math.floor(Number(floor) || 0).toLocaleString('en-US')} — To-Win updated.`
);
