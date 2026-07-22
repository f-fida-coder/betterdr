/**
 * Unit tests for resolveQuickStakes in frontend/src/utils/money.js —
 * the betslip's 5-chip quick-stake row resolver (saved customization vs
 * live agent Min/Max vs derived fallback).
 * Self-contained — Node.js built-ins only, no npm packages required.
 *
 * Usage: node frontend/tests/quickStakes.test.js
 */

import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moneyPath = pathToFileURL(path.join(__dirname, '../src/utils/money.js')).href;

const { resolveQuickStakes, computeMidQuickStakes } = await import(moneyPath);

// ── Minimal test harness ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

const test = (name, fn) => {
    try {
        fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        failed++;
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
    }
};

// ── Saved customization applies ───────────────────────────────────────────────

test('saved mids inside live limits are used verbatim (the NJG379 bug case)', () => {
    assert.deepEqual(
        resolveQuickStakes([25, 50, 100, 150, 200], 25, 200),
        [25, 50, 100, 150, 200],
    );
});

test('no saved row → derived spread (pre-customization behavior preserved)', () => {
    assert.deepEqual(resolveQuickStakes(undefined, 25, 200), [25, 70, 115, 155, 200]);
    assert.deepEqual(resolveQuickStakes(null, 25, 200), [25, 70, 115, 155, 200]);
});

test('stale saved OUTER chips are ignored — outers always pin to live Min/Max', () => {
    // Player saved when limits were 10/300; agent since moved them to 25/200.
    // Mids still fit → keep mids, pin outers to the live limits.
    assert.deepEqual(
        resolveQuickStakes([10, 50, 100, 150, 300], 25, 200),
        [25, 50, 100, 150, 200],
    );
});

// ── Agent limit changes AFTER a save (the requested coverage) ─────────────────

test('agent LOWERS max below a saved mid → whole row falls back to derived', () => {
    // Saved [25, 50, 100, 150, 200], agent drops max to 100: the $150 chip
    // (and the $100 chip, no longer strictly inside) would be invalid —
    // never render them; derive a fresh spread from the live 25..100.
    const row = resolveQuickStakes([25, 50, 100, 150, 200], 25, 100);
    assert.deepEqual(row, [25, ...computeMidQuickStakes(25, 100), 100]);
    assert.ok(row.every((v) => v >= 25 && v <= 100), 'no chip may exceed the live limits');
});

test('agent RAISES min above a saved mid → whole row falls back to derived', () => {
    // Saved mids 50/100/150, agent raises min to 60: the $50 chip is now
    // below the minimum bet — reject the row, derive from 60..200.
    const row = resolveQuickStakes([25, 50, 100, 150, 200], 60, 200);
    assert.deepEqual(row, [60, ...computeMidQuickStakes(60, 200), 200]);
    assert.ok(row.every((v) => v >= 60), 'no chip may sit below the live minimum');
});

test('agent RAISES max with saved mids still inside → mids kept, outer follows', () => {
    assert.deepEqual(
        resolveQuickStakes([25, 50, 100, 150, 200], 25, 5000),
        [25, 50, 100, 150, 5000],
    );
});

test('mid exactly EQUAL to a live limit is rejected (strictly-inside rule)', () => {
    // Save-time validation requires mids strictly between Min and Max; a
    // limit change that lands exactly on a mid must reject too (a chip
    // duplicating the Min/Max chip reads as a broken row).
    const row = resolveQuickStakes([25, 50, 100, 150, 200], 25, 150);
    assert.deepEqual(row, [25, ...computeMidQuickStakes(25, 150), 150]);
});

// ── Junk / malformed saves fall back ─────────────────────────────────────────

test('malformed saved rows fall back to derived', () => {
    const derived = [25, 70, 115, 155, 200];
    assert.deepEqual(resolveQuickStakes([25, 50, 100], 25, 200), derived, 'wrong length');
    assert.deepEqual(resolveQuickStakes([25, 'x', 100, 150, 200], 25, 200), derived, 'non-numeric mid');
    assert.deepEqual(resolveQuickStakes([25, 150, 100, 50, 200], 25, 200), derived, 'descending mids');
    assert.deepEqual(resolveQuickStakes([25, 100, 100, 150, 200], 25, 200), derived, 'equal mids');
    assert.deepEqual(resolveQuickStakes([25, 0, 100, 150, 200], 25, 200), derived, 'zero mid');
    assert.deepEqual(resolveQuickStakes([25, -50, 100, 150, 200], 25, 200), derived, 'negative mid');
});

test('degenerate live limits (max <= min) fall back without throwing', () => {
    const row = resolveQuickStakes([25, 50, 100, 150, 200], 200, 200);
    assert.equal(row.length, 5);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
