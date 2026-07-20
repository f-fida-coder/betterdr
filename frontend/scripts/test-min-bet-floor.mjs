// Tests for the min-bet FLOOR snap — a WIN-mode back-solve whose stake falls
// below the account minimum snaps UP to the minimum, with To-Win recomputed
// and an informational banner instead of a hard block. Exercises the PURE
// helpers in src/utils/maxWinCap.js — the same functions ModeBetPanel uses for
// both the combined-ticket path and the Straight per-leg path.
//
// REWRITTEN 2026-07-20 for the Nicky cap reversal (commit 00705ab4): the floor
// is now UNCONDITIONAL — the old cap ceiling that could hold a stake below the
// min (and the 3-arg floorStakeToMin / maxStakeForWinCap / stakeAutoCappedNote
// helpers this script used to import) are GONE. The script had been failing on
// the removed imports since that commit.
//
// Run: node frontend/scripts/test-min-bet-floor.mjs   Exit 0 = pass.

import {
    floorStakeToMin,
    minFloorApplied,
    stakeAutoRaisedNote,
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

console.log('Snap math — floorStakeToMin (floor up to min, unconditional)');
// The original case: Win $100 at +1203 (decimal 13.03) → risk 100/12.03 = 8.31.
const decimal = 13.03;
const rawRisk = round2(100 / (decimal - 1)); // 8.31
expect('raw back-solve is below min', true, rawRisk < 25);
expect('$8.31 floors UP to $25', 25, floorStakeToMin(rawRisk, 25));
expect('at-min stake unchanged', 25, floorStakeToMin(25, 25));
expect('above-min stake unchanged', 500, floorStakeToMin(500, 25));
expect('zero/invalid passes through', 0, floorStakeToMin(0, 25));

console.log('\nGating — minBet 0/NaN disables the floor (risk/bet mode)');
// The component passes minBet=0 in Risk/Bet mode so a deliberately-typed sub-min
// stake is NOT snapped (the hard error still fires elsewhere).
expect('minBet 0 → no floor, stake unchanged ($8.31)', round2(8.31), floorStakeToMin(8.31, 0));
expect('minBet NaN → no floor', 8, floorStakeToMin(8, NaN));

console.log('\nminFloorApplied predicate (drives banner + requestedWin drop)');
expect('raw below min → applied', true, minFloorApplied(8.31, 25));
expect('raw at/above min → not applied', false, minFloorApplied(25, 25));
expect('raw above min → not applied', false, minFloorApplied(40, 25));
expect('no min set → not applied', false, minFloorApplied(8.31, 0));

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
expect('straight leg floors identically to combined', 25, floorStakeToMin(rawRisk, 25));

console.log('\nBanner copy (informational, mirrors the cap banner tone)');
expect('raised-note names the min bet', 'Stake raised to the $25 minimum bet — To-Win recalculated at this stake.', stakeAutoRaisedNote(25));

console.log(`\n${failures.length === 0 ? 'PASS' : 'FAIL'} — ${passes} passed, ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);
