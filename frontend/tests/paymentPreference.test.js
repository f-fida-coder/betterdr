/**
 * Unit tests for frontend/src/utils/paymentApps.js — the payout-preference
 * ranking sync rule (mirrored server-side in
 * OnboardingPolicy::normalizePaymentPreferenceOrder — keep in lockstep).
 * Self-contained — Node.js built-ins only, no npm packages required.
 *
 * Usage: node frontend/tests/paymentPreference.test.js
 */

import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const utilPath = pathToFileURL(path.join(__dirname, '../src/utils/paymentApps.js')).href;

const {
    isFilledHandle,
    filledAppKeys,
    normalizePreferenceOrder,
    movePreferenceKey,
} = await import(utilPath);

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

const apps = (overrides = {}) => ({
    venmo: '@v', cashapp: 'N/A', applePay: 'a@b.c', zelle: 'N/A', paypal: 'p', btc: 'N/A',
    ...overrides,
});

test('isFilledHandle — real handles yes; blank/N/A/n a-variants no', () => {
    assert.equal(isFilledHandle('@fida'), true);
    assert.equal(isFilledHandle(''), false);
    assert.equal(isFilledHandle('   '), false);
    assert.equal(isFilledHandle('N/A'), false);
    assert.equal(isFilledHandle('n/a'), false);
    assert.equal(isFilledHandle(undefined), false);
    assert.equal(isFilledHandle(42), false);
});

test('filledAppKeys — canonical order, N/A excluded', () => {
    assert.deepEqual(filledAppKeys(apps()), ['venmo', 'applePay', 'paypal']);
});

test('untouched widget → canonical-order default', () => {
    assert.deepEqual(normalizePreferenceOrder([], apps()), ['venmo', 'applePay', 'paypal']);
    assert.deepEqual(normalizePreferenceOrder(undefined, apps()), ['venmo', 'applePay', 'paypal']);
});

test('saved order preserved for still-filled apps', () => {
    assert.deepEqual(
        normalizePreferenceOrder(['paypal', 'venmo', 'applePay'], apps()),
        ['paypal', 'venmo', 'applePay'],
    );
});

test('app flipped to N/A drops out, renumbering has no gaps', () => {
    // paypal was ranked #1 but is now N/A → list is exactly the remaining two.
    assert.deepEqual(
        normalizePreferenceOrder(['paypal', 'venmo', 'applePay'], apps({ paypal: 'N/A' })),
        ['venmo', 'applePay'],
    );
});

test('newly-filled app joins at the end in canonical position', () => {
    // zelle goes from N/A to a real handle → appended after the saved ranking.
    assert.deepEqual(
        normalizePreferenceOrder(['paypal', 'venmo', 'applePay'], apps({ zelle: '555-1234' })),
        ['paypal', 'venmo', 'applePay', 'zelle'],
    );
});

test('unknown keys and duplicates in a stale/tampered saved order are dropped', () => {
    assert.deepEqual(
        normalizePreferenceOrder(['other', 'venmo', 'venmo', 'junk'], apps()),
        ['venmo', 'applePay', 'paypal'],
    );
});

test('all N/A → empty ranking; single filled app → single entry (widget hides <2)', () => {
    assert.deepEqual(normalizePreferenceOrder(['venmo'], { venmo: 'N/A' }), []);
    assert.deepEqual(normalizePreferenceOrder([], apps({ applePay: 'N/A', paypal: 'N/A' })), ['venmo']);
});

test('movePreferenceKey — reorders, clamps, no-ops cleanly', () => {
    assert.deepEqual(movePreferenceKey(['a', 'b', 'c'], 'c', 0), ['c', 'a', 'b']);
    assert.deepEqual(movePreferenceKey(['a', 'b', 'c'], 'a', 99), ['a', 'b', 'c'].slice(1).concat('a') && ['b', 'c', 'a']);
    assert.deepEqual(movePreferenceKey(['a', 'b', 'c'], 'x', 1), ['a', 'b', 'c']);
    const same = ['a', 'b', 'c'];
    assert.equal(movePreferenceKey(same, 'b', 1), same, 'no move returns the same reference');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
