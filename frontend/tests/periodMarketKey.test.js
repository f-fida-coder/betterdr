/**
 * Unit tests for splitPeriodMarketKey in frontend/src/utils/periods.js —
 * the single decoder for period-suffixed betslip market keys.
 *
 * Context (2026-07-17): board period tabs used to hardcode the FULL-GAME
 * market key ('totals') at add-to-slip while displaying period numbers, so
 * an F5 "Over 3.5 -180" leg booked as full-game "Over 8.5 -110" (silent
 * market substitution — ticket 2104a022bc8b1393c7d8bfec). Slip legs now
 * carry the SUFFIXED key end-to-end; this helper is what every display
 * surface uses to resolve the base market + period chip label, so its
 * split/fall-through rules are load-bearing:
 *   - only real period families split (qN / hN / pN / 1st_N_innings / set_N)
 *   - h2h_3_way*, alt/card/prop keys pass through UNCHANGED as `base`
 *     (display logic exact-matches those keys)
 *
 * Imports the REAL module (pure ESM, no React) — no inline replica.
 * Self-contained: no npm packages required.
 * Usage: node frontend/tests/periodMarketKey.test.js
 */

import assert from 'node:assert/strict';
import { splitPeriodMarketKey, periodFromSuffix } from '../src/utils/periods.js';

// ── Period keys split into base + chip label ─────────────────────────────────
assert.deepEqual(
    splitPeriodMarketKey('totals_1st_5_innings'),
    { base: 'totals', suffix: '_1st_5_innings', periodLabel: 'F5' },
);
assert.deepEqual(
    splitPeriodMarketKey('h2h_q1'),
    { base: 'h2h', suffix: '_q1', periodLabel: '1Q' },
);
assert.deepEqual(
    splitPeriodMarketKey('spreads_h1'),
    { base: 'spreads', suffix: '_h1', periodLabel: '1H' },
);
assert.deepEqual(
    splitPeriodMarketKey('spreads_p3'),
    { base: 'spreads', suffix: '_p3', periodLabel: 'P3' },
);
assert.deepEqual(
    splitPeriodMarketKey('totals_set_2'),
    { base: 'totals', suffix: '_set_2', periodLabel: 'Set 2' },
);

// ── Non-period keys pass through whole, with no label ────────────────────────
for (const key of [
    'totals', 'spreads', 'h2h',                    // full-game core
    'h2h_3_way', 'h2h_3_way_h1',                   // 3-way is NOT a period split
    'alternate_totals_cards', 'alternate_spreads', // alt/card families
    'player_points_q1',                            // prop keys keep their own labels
    'team_totals', 'manual', 'outrights', '',
]) {
    const out = splitPeriodMarketKey(key);
    assert.equal(out.base, key.toLowerCase(), `${key} passes through as base`);
    assert.equal(out.suffix, '', `${key} has no period suffix`);
    assert.equal(out.periodLabel, '', `${key} has no period label`);
}

// ── Case-insensitive (stored legs may vary) ──────────────────────────────────
assert.equal(splitPeriodMarketKey('TOTALS_1ST_5_INNINGS').base, 'totals');
assert.equal(splitPeriodMarketKey('TOTALS_1ST_5_INNINGS').periodLabel, 'F5');

// ── periodFromSuffix stays consistent with the chip presets ──────────────────
assert.equal(periodFromSuffix('_1st_5_innings').label, 'F5');
assert.equal(periodFromSuffix('_q4').label, '4Q');
assert.equal(periodFromSuffix(''), null); // empty → null

console.log('periodMarketKey.test.js: all assertions passed');
