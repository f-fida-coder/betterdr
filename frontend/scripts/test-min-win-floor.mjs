// Tests for the $25 minimum-WIN floor (Nicky 2026-07-20): any ticket whose
// win prices under $25 — every sub-+100 price, standard -110 juice included —
// has its stake auto-bumped UP to the smallest whole dollar that clears the
// floor ($25 @ -130 → $33). Mirror of php-backend/tests/MinWinFloorTest.php;
// exercises the PURE helpers in src/utils/maxWinCap.js and the RR worst-child
// scan in src/utils/roundRobin.mjs that ModeBetPanel wires into the straight
// per-leg, combined-ticket, and round-robin stake paths.
//
// Run: node frontend/scripts/test-min-win-floor.mjs   Exit 0 = pass.

import {
    MIN_WIN_FLOOR,
    stakeForMinWin,
    minWinBumpApplied,
    minWinRaisedNote,
} from '../src/utils/maxWinCap.js';
import { roundRobinMinChildDecimal } from '../src/utils/roundRobin.mjs';

let passes = 0;
const failures = [];
function expect(label, expected, actual) {
    const ok = JSON.stringify(expected) === JSON.stringify(actual);
    if (ok) { passes++; console.log(`  ✓ ${label}`); return; }
    failures.push(label);
    console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
}
const dec = (american) => (american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american));

console.log('Floor constant — locked to the server default');
expect('MIN_WIN_FLOOR is $25', 25, MIN_WIN_FLOOR);

console.log('\nstakeForMinWin — screenshot cases and boundaries');
// Mets ML -130 (the screenshot): 25 / (100/130) = 32.5 exactly → $33.
expect('-130 → $33', 33, stakeForMinWin(dec(-130)));
// Standard -110 juice: 27.4999… → 27.5 after the 4dp dust round → $28.
expect('-110 → $28', 28, stakeForMinWin(dec(-110)));
// -200: exactly 50 — integer boundary must NOT overshoot to 51.
expect('-200 → $50 exact', 50, stakeForMinWin(dec(-200)));
// -125: 31.25 → $32.
expect('-125 → $32', 32, stakeForMinWin(dec(-125)));
// +100: rate 1.0 → $25 (the rule boundary: +100 or better needs no bump).
expect('+100 → $25', 25, stakeForMinWin(dec(100)));
// Degenerate odds refuse (callers leave the stake alone on 0).
expect('decimal 1.0 → 0 (unpriceable)', 0, stakeForMinWin(1.0));
expect('NaN → 0', 0, stakeForMinWin(NaN));
expect('floor 0 → 0 (disabled)', 0, stakeForMinWin(dec(-130), 0));

console.log('\nminWinBumpApplied — trigger predicate (drives bump + note + requestedWin drop)');
expect('$25 @ -130 → bump', true, minWinBumpApplied(25, dec(-130)));
expect('$25 @ -110 → bump (everyday juice qualifies)', true, minWinBumpApplied(25, dec(-110)));
expect('$25 @ +100 → no bump', false, minWinBumpApplied(25, dec(100)));
expect('$25 @ +150 → no bump', false, minWinBumpApplied(25, dec(150)));
expect('$33 @ -130 → no bump (already at target)', false, minWinBumpApplied(33, dec(-130)));
expect('$30 @ -130 (typed above min, still sub-floor) → bump', true, minWinBumpApplied(30, dec(-130)));
expect('$500 @ -130 → no bump (win $384)', false, minWinBumpApplied(500, dec(-130)));
expect('zero risk → no bump', false, minWinBumpApplied(0, dec(-130)));

console.log('\nCombined-mode decimals — same helper, ticket-level basis');
{
    // Parlay of two -250s (locked basis 1.96154 mirrors the server lock): $26.
    expect('two -250 parlay basis → $26', 26, stakeForMinWin(1.9615384615384617));
    // Teaser 2-leg 1.8 multiplier: 25/0.8 = 31.25 → $32.
    expect('teaser 1.8 multiplier → $32', 32, stakeForMinWin(1.8));
    // Reverse unit-space basis 2c−1 for two -900s: c = 1.23457 → 2c−1 = 1.46914
    // → unit ceil(25/0.46914) = $54 (matches the server's $54).
    const c = dec(-900) * dec(-900);
    expect('reverse two -900 unit basis → $54', 54, stakeForMinWin(2 * c - 1));
}

console.log('\nOpen parlay — real-legs basis at create, monotonicity thereafter');
{
    // 1-leg start at -130: ticketDecimalOdds for OP is the REAL legs' product
    // (placeholders are display-only), American-locked like a closed parlay →
    // the panel pre-bumps $25 → $33, matching placeOpenParlay's create check.
    expect('1-leg OP start at -130 → $33', 33, stakeForMinWin(dec(-130)));
    // Why there is no add-leg re-check: each added leg multiplies the
    // combined by d > 1, so the win at the committed stake only grows.
    const combinedAfterAdd = dec(-130) * dec(-110);
    expect('adding a -110 leg raises the combined above the create basis', true, combinedAfterAdd > dec(-130));
    expect('committed $33 still clears the floor after the add', true, 33 * (combinedAfterAdd - 1) >= 25);
}

console.log('\nroundRobinMinChildDecimal — worst child drives the shared stake');
{
    // 3 legs at -300 / -300 / +150, by 2's: children AB (1.3333²=1.77778),
    // AC (1.3333×2.5=3.3333), BC (same) → worst is AB.
    const legs = [dec(-300), dec(-300), dec(150)];
    const worst = roundRobinMinChildDecimal(legs, [2]);
    expect('worst child is the favorite pair (≈1.77778)', true, Math.abs(worst - (4 / 3) * (4 / 3)) < 1e-9);
    expect('RR bump from worst child → $33', 33, stakeForMinWin(worst));
    // By 2's + 3's: the full triple (5.9259) never beats the AB pair.
    expect('adding size 3 keeps the same worst child', true, Math.abs(roundRobinMinChildDecimal(legs, [2, 3]) - worst) < 1e-12);
    // Haircut shrinks a same-game child's profit and can flip the worst child.
    const haircut20OnFirstPair = (indexes) => (indexes.length === 2 && indexes[0] === 0 && indexes[1] === 1 ? 0.2 : 0);
    const worstHc = roundRobinMinChildDecimal(legs, [2], haircut20OnFirstPair);
    expect('haircut lowers the worst child decimal', true, worstHc < worst);
    // Empty/invalid inputs refuse.
    expect('no legs → 0', 0, roundRobinMinChildDecimal([], [2]));
    expect('no valid sizes → 0', 0, roundRobinMinChildDecimal(legs, [9]));
}

console.log('\nBanner copy — informational, same family as the min-bet note');
expect('note names the floor', 'Stake raised so this ticket wins at least $25 — To-Win updated.', minWinRaisedNote());

console.log(`\n${failures.length === 0 ? 'PASS' : 'FAIL'} — ${passes} passed, ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);
