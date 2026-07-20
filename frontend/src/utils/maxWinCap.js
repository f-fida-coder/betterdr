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

// True when the cap actually binds at this stake/odds — drives the single
// static limits note (capLimitsNote) and nothing else.
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
// The ONLY cap message the UI may show (Nicky 2026-07-20): a static limits
// line, never derived from the specific ticket's calculation. No other
// wording, no capped-stake figures.
export const capLimitsNote = (minBet, cap) => {
    const m = Math.floor(Number(minBet) || 0);
    const c = Math.floor(Number(cap) || 0);
    return m > 0 ? `Min bet $${m}, max payout $${c}` : `Max payout $${c}`;
};

// Mirror-image of the old cap-snap note for the FLOOR case: a WIN-mode
// back-solve produced a stake below the account minimum, so it was
// auto-raised to the minimum and the To-Win recomputed at that stake.
// Informational, not blocking.
export const stakeAutoRaisedNote = (minBet) => (
    `Stake raised to the $${Math.floor(Number(minBet) || 0).toLocaleString('en-US')} minimum bet — To-Win recalculated at this stake.`
);
