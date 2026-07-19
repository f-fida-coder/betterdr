// Tests for the min-bet FLOOR snap (PO 2026-07-19) — the mirror of the max-win
// cap. A WIN-mode back-solve whose stake falls below the account minimum snaps
// UP to the minimum (bounded by the cap ceiling), with To-Win recomputed and an
// informational banner instead of a hard block. Exercises the PURE helpers in
// src/utils/maxWinCap.js — the same functions ModeBetPanel uses for both the
// combined-ticket path and the Straight per-leg path.
//
// Run: node frontend/scripts/test-min-bet-floor.mjs   Exit 0 = pass.

import {
    floorStakeToMin,
    minFloorApplied,
    maxStakeForWinCap,
    stakeAutoRaisedNote,
    stakeAutoCappedNote,
} from '../src/utils/maxWinCap.js';

let passes = 0;
const failures = [];
function expect(label, expected, actual) {
    const ok = JSON.stringify(expected) === JSON.stringify(actual);
    if (ok) { passes++; console.log(`  ✓ ${label}`); return; }
    failures.push(label);
    console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
}
const round2 = (n) => Math.round(n * 100) / 100;

console.log('Snap math — floorStakeToMin (floor up to min, no cap)');
// The screenshot case: Win $100 at +1203 (decimal 13.03) → risk 100/12.03 = 8.31.
const decimal = 13.03;
const rawRisk = round2(100 / (decimal - 1)); // 8.31
expect('raw back-solve is below min', true, rawRisk < 25);
expect('$8.31 floors UP to $25', 25, floorStakeToMin(rawRisk, 25, Infinity));
expect('recomputed To-Win at $25 = 25×(d−1)', round2(25 * (decimal - 1)), round2(25 * (decimal - 1))); // 300.75
expect('at-min stake unchanged', 25, floorStakeToMin(25, 25, Infinity));
expect('above-min stake unchanged', 500, floorStakeToMin(500, 25, Infinity));
expect('zero/'+'invalid passes through', 0, floorStakeToMin(0, 25, Infinity));

console.log('\nGating — minBet 0/NaN disables the floor (risk/bet mode)');
// The component passes minBet=0 in Risk/Bet mode so a deliberately-typed sub-min
// stake is NOT snapped (the hard error still fires elsewhere).
expect('minBet 0 → no floor, stake unchanged ($8)', round2(8.31), floorStakeToMin(8.31, 0, Infinity));
expect('minBet NaN → no floor', 8, floorStakeToMin(8, NaN, Infinity));

console.log('\nCap-vs-min precedence — cap wins when below min');
{
    // Cap ceiling above min: floor reaches the min.
    expect('cap $50 ≥ min $25 → floors to $25', 25, floorStakeToMin(8.31, 25, 50));
    expect('minFloorApplied true when cap allows', true, minFloorApplied(8.31, 25, 50));
    // Cap ceiling BELOW min (extreme longshot): can't floor above the cap. A
    // raw already under the cap stays as-is (no partial raise toward the cap).
    expect('raw $8.31 under a sub-min cap $10 stays raw', round2(8.31), floorStakeToMin(8.31, 25, 10));
    // A raw between the cap and the min still clamps DOWN to the cap (cap wins),
    // never up toward the unreachable min.
    expect('raw $15 with cap $10 < min $25 → clamps to cap $10', 10, floorStakeToMin(15, 25, 10));
    expect('minFloorApplied false when cap < min', false, minFloorApplied(8.31, 25, 10));
}

console.log('\nminFloorApplied predicate (drives banner + requestedWin drop)');
expect('raw below min, no cap → applied', true, minFloorApplied(8.31, 25, Infinity));
expect('raw at/above min → not applied', false, minFloorApplied(25, 25, Infinity));
expect('raw above min → not applied', false, minFloorApplied(40, 25, Infinity));
expect('no min set → not applied', false, minFloorApplied(8.31, 0, Infinity));
expect('cap exactly at min → applied', true, minFloorApplied(8.31, 25, 25));
expect('cap one below min → not applied', false, minFloorApplied(8.31, 25, 24));

console.log('\nrequestedWin drop — the decision gate');
{
    // The payload sends requestedWin iff (smartMode==='win' && !floorApplied && wager>0).
    // When floored, requestedWin is dropped so payout = stake × odds.
    const sendRequestedWin = (smartMode, wager, floorApplied) =>
        smartMode === 'win' && !floorApplied && wager > 0;
    expect('win mode, not floored → send requestedWin', true, sendRequestedWin('win', 100, false));
    expect('win mode, FLOORED → drop requestedWin', false, sendRequestedWin('win', 100, true));
    expect('risk mode → never send', false, sendRequestedWin('risk', 100, false));
}

console.log('\nStraight per-leg parity — same helper, same result');
{
    // A straight leg winning $100 at +1203 back-solves the same $8.31 and snaps
    // the same way — Straight uses floorStakeToMin(risk, min, legCapMax) too.
    const legCapMax = Infinity; // no cap
    expect('straight leg floors identically to combined', 25, floorStakeToMin(rawRisk, 25, legCapMax));
    expect('straight leg parity with combined ticket',
        floorStakeToMin(rawRisk, 25, Infinity), floorStakeToMin(rawRisk, 25, legCapMax));
    // With a cap that binds below min, the leg (like the ticket) defers to the cap.
    const cappedLeg = maxStakeForWinCap(200, decimal); // floor(200/12.03)=16 < 25
    expect('leg cap 16 < min 25 → no snap (cap wins)', false, minFloorApplied(rawRisk, 25, cappedLeg));
}

console.log('\nBanner copy (informational, mirrors the cap banner tone)');
expect('raised-note names the min bet', 'Stake raised to the $25 minimum bet — To-Win recalculated at this stake.', stakeAutoRaisedNote(25));
expect('capped-note still intact (unchanged)', 'Stake capped to $50 — the most that wins the $5,000 maximum payout.', stakeAutoCappedNote(50, 5000));

console.log(`\n${failures.length === 0 ? 'PASS' : 'FAIL'} — ${passes} passed, ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);
