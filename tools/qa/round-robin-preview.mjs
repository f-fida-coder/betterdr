#!/usr/bin/env node
//
// round-robin-preview.mjs — executable unit test for the betslip's Round Robin
// preview math (frontend/src/utils/roundRobin.mjs).
//
// WHY THIS EXISTS: the preview count helper once carried a stale `k >= N` bound
// that dropped the "By N's" size (k = N, the single full parlay). That zeroed
// the on-screen Parlays / Total Risk / Max Win while the backend still booked a
// real stake — a preview/reality mismatch that shipped because the helper was
// inline and untested. This test locks the bound and the full preview triple,
// and pins them to the SAME truth table the backend asserts
// (php-backend/tests/RoundRobinSizingTest.php), so FE and BE can't drift.
//
// Zero-dependency; run with `node tools/qa/round-robin-preview.mjs`.
// Exit 0 = all pass, 1 = any failure. Wired into CI (.github/workflows/ci.yml).

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
    nCr,
    roundRobinCombinationCount,
    roundRobinMaxWin,
    roundRobinPreview,
} from '../../frontend/src/utils/roundRobin.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

let failures = 0;
let passes = 0;
const near = (a, b, eps = 1e-6) => Math.abs(Number(a) - Number(b)) <= eps;
const ok = (cond, msg) => { if (cond) { passes++; console.log(`  PASS ${msg}`); } else { failures++; console.error(`  FAIL ${msg}`); } };
const eq = (actual, expected, msg) => ok(near(actual, expected), `${msg} (got ${actual}, want ${expected})`);

// ── Independent reference: what the BACKEND books ────────────────────────────
// The backend debits `combinationCount(n, sizes) * stakePerParlay` and books one
// child parlay per combination. We recompute that here from first principles
// (a second, deliberately-separate nCr) so the assertions below compare the FE
// util against an independent oracle, not against itself.
const refNcr = (n, k) => {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
    return Math.round(r);
};
const backendCombinationCount = (n, sizes) =>
    (sizes || []).reduce((sum, s) => (Number(s) >= 2 && Number(s) <= n ? sum + refNcr(n, Number(s)) : sum), 0);
const backendBookedRisk = (n, sizes, stakePerParlay) => backendCombinationCount(n, sizes) * stakePerParlay;

console.log('nCr — identity edges the inclusive bound relies on');
eq(nCr(3, 3), 1, 'C(3,3) = 1');
eq(nCr(8, 8), 1, 'C(8,8) = 1');
eq(nCr(3, 4), 0, 'C(3,4) = 0 (k > n)');
eq(nCr(4, 2), 6, 'C(4,2) = 6');
eq(nCr(5, 2), 10, 'C(5,2) = 10');

console.log('roundRobinCombinationCount — SAME truth table as RoundRobinSizingTest.php');
// These five lines are copied verbatim from the backend suite's expectations.
eq(roundRobinCombinationCount(3, [2, 3]), 4, 'N=3 by 2s+3s -> 3 + 1 = 4');
eq(roundRobinCombinationCount(3, [3]), 1, 'N=3 by 3s -> 1 (k=N regression)');
eq(roundRobinCombinationCount(4, [2, 3, 4]), 11, 'N=4 all -> 6 + 4 + 1 = 11');
eq(roundRobinCombinationCount(5, [5]), 1, 'N=5 by 5s -> 1 (k=N regression)');
eq(roundRobinCombinationCount(5, [2, 3, 4, 5]), 26, 'N=5 all -> 10 + 10 + 5 + 1 = 26');
eq(roundRobinCombinationCount(3, [4]), 0, 'k > N contributes nothing');
eq(roundRobinCombinationCount(3, [1]), 0, 'k < 2 contributes nothing');
eq(roundRobinCombinationCount(3, [2, 4, 1]), 3, 'mixed: only valid k=2 counts');

console.log('k=N regression — the exact By-4s-on-4-legs case from the bug report');
// 4 legs, each -110 (decimal 1.9091), $100/parlay, By 4's. Under the old
// `k >= N` bound every one of these was 0.
const legs4 = [1.90909091, 1.90909091, 1.90909091, 1.90909091];
const p4 = roundRobinPreview(legs4, [4], 100);
eq(p4.parlayCount, 1, 'By 4s on 4 legs -> 1 parlay (was 0)');
eq(p4.totalRisk, 100, 'total risk = 1 x $100 = $100 (was $0)');
ok(p4.maxWin > 100, `max win non-zero and > stake (got ${p4.maxWin.toFixed(2)})`);
// Exact: stake x product of the four snapped decimals.
const expectedMaxWin4 = 100 * legs4.reduce((a, d) => a * d, 1);
eq(p4.maxWin, expectedMaxWin4, 'max win = stake x product(odds) for the single full parlay');

console.log('Preview <-> backend-booking parity across k=N for N = 2..6');
// For each N, "By N's" (the k=N single full parlay) AND "all sizes" must have
// the FE total risk equal EXACTLY what the backend would debit.
for (let n = 2; n <= 6; n++) {
    const legs = Array.from({ length: n }, (_, i) => 1.5 + i * 0.1); // distinct odds so product is order-sensitive
    const stake = 25;
    const allSizes = Array.from({ length: n - 1 }, (_, i) => i + 2); // [2..n]
    for (const sizes of [[n], allSizes]) {
        const fe = roundRobinPreview(legs, sizes, stake);
        const wantCount = backendCombinationCount(n, sizes);
        const wantRisk = backendBookedRisk(n, sizes, stake);
        eq(fe.parlayCount, wantCount, `N=${n} sizes=[${sizes}] parlayCount matches backend`);
        eq(fe.totalRisk, wantRisk, `N=${n} sizes=[${sizes}] totalRisk == backend debit (count x stake)`);
        ok(sizes.includes(n) ? fe.maxWin > 0 : fe.maxWin >= 0, `N=${n} sizes=[${sizes}] maxWin computed (k=N non-zero)`);
    }
}

console.log('SGP haircut — same-game child profit is shrunk, not the full payout');
// Two legs of the same game (indexes 0,1 share a "game"), 20% profit haircut.
const legsSg = [2.0, 2.0]; // product 4.0 -> profit 3.0
const noHaircut = roundRobinMaxWin(legsSg, [2], 100);
const withHaircut = roundRobinMaxWin(legsSg, [2], 100, () => 0.20);
eq(noHaircut, 400, 'cross-game: 100 x 4.0 = 400');
// profit 300 shrunk 20% -> 240; payout 100 + 240 = 340.
eq(withHaircut, 340, 'same-game: profit haircut 20% -> 100 + 300*0.8 = 340');
ok(withHaircut < noHaircut, 'haircut lowers max win, never raises it');

console.log('Degenerate inputs — no throw, no NaN, no negative');
eq(roundRobinPreview([], [2], 100).parlayCount, 0, 'no legs -> 0 parlays');
eq(roundRobinPreview(legs4, [], 100).totalRisk, 0, 'no sizes -> $0 risk');
eq(roundRobinPreview(legs4, [4], 0).maxWin, 0, 'zero stake -> $0 max win');
eq(roundRobinPreview(legs4, [4], -5).totalRisk, 0, 'negative stake clamps to $0');

console.log('');
if (failures > 0) {
    console.error(`round-robin-preview: ${failures} FAILED, ${passes} passed`);
    process.exit(1);
}
console.log(`round-robin-preview: all ${passes} assertions passed`);
