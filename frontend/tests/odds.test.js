/**
 * Unit tests for frontend/src/utils/odds.js
 * Self-contained — Node.js built-ins only, no npm packages required.
 *
 * Usage: node frontend/tests/odds.test.js
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const oddsPath = pathToFileURL(path.join(__dirname, '../src/utils/odds.js')).href;

const {
    normalizeOddsFormat,
    parseOddsNumber,
    decimalToAmerican,
    americanToDecimal,
    formatOdds,
    formatLineValue,
    formatSpreadDisplay,
    formatTotalDisplay,
} = await import(oddsPath);

// ── Minimal test harness ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function test(label, fn) {
    try {
        fn();
        passed++;
        console.log(`  \x1b[32m✓\x1b[0m  ${label}`);
    } catch (e) {
        failed++;
        failures.push(`${label}: ${e.message}`);
        console.log(`  \x1b[31m✗\x1b[0m  ${label}`);
        console.log(`       ${e.message}`);
    }
}

function suite(name) {
    console.log(`\n  \x1b[1;34m» ${name}\x1b[0m`);
}

// ── normalizeOddsFormat ───────────────────────────────────────────────────────

suite('normalizeOddsFormat');

test('american string', () => assert.equal(normalizeOddsFormat('american'), 'american'));
test('American uppercase', () => assert.equal(normalizeOddsFormat('American'), 'american'));
test('AMERICAN all caps', () => assert.equal(normalizeOddsFormat('AMERICAN'), 'american'));
test('decimal string', () => assert.equal(normalizeOddsFormat('decimal'), 'decimal'));
test('empty string → decimal', () => assert.equal(normalizeOddsFormat(''), 'decimal'));
test('null → decimal', () => assert.equal(normalizeOddsFormat(null), 'decimal'));
test('unknown value → decimal', () => assert.equal(normalizeOddsFormat('fractional'), 'decimal'));

// ── parseOddsNumber ───────────────────────────────────────────────────────────

suite('parseOddsNumber');

test('valid positive decimal', () => assert.equal(parseOddsNumber(2.5), 2.5));
test('string number', () => assert.equal(parseOddsNumber('1.85'), 1.85));
test('zero → null', () => assert.equal(parseOddsNumber(0), null));
test('negative → null', () => assert.equal(parseOddsNumber(-1.5), null));
test('null → null', () => assert.equal(parseOddsNumber(null), null));
test('NaN → null', () => assert.equal(parseOddsNumber(NaN), null));
test('Infinity → null', () => assert.equal(parseOddsNumber(Infinity), null));
test('"abc" → null', () => assert.equal(parseOddsNumber('abc'), null));

// ── decimalToAmerican ─────────────────────────────────────────────────────────

suite('decimalToAmerican');

// Favourites (decimal < 2): American = -100 / (decimal - 1)
test('1.5 → -200', () => assert.equal(decimalToAmerican(1.5), -200));
test('1.25 → -400', () => assert.equal(decimalToAmerican(1.25), -400));
test('1.91 → ~-110', () => {
    const result = decimalToAmerican(1.91);
    assert.ok(result !== null && result >= -111 && result <= -109, `expected ~-110, got ${result}`);
});

// Even money (decimal = 2): American = +100
test('2.0 → +100', () => assert.equal(decimalToAmerican(2.0), 100));

// Underdogs (decimal > 2): American = (decimal - 1) * 100
test('3.0 → +200', () => assert.equal(decimalToAmerican(3.0), 200));
test('2.5 → +150', () => assert.equal(decimalToAmerican(2.5), 150));
test('11.0 → +1000', () => assert.equal(decimalToAmerican(11.0), 1000));

// Edge cases
test('1.0 → null (no profit)', () => assert.equal(decimalToAmerican(1.0), null));
test('0 → null', () => assert.equal(decimalToAmerican(0), null));
test('null → null', () => assert.equal(decimalToAmerican(null), null));
test('negative → null', () => assert.equal(decimalToAmerican(-2.0), null));

// ── americanToDecimal ─────────────────────────────────────────────────────────

suite('americanToDecimal');

// Positive American: decimal = 1 + (american / 100)
test('+100 → 2.0', () => assert.equal(americanToDecimal(100), 2.0));
test('+200 → 3.0', () => assert.equal(americanToDecimal(200), 3.0));
test('+150 → 2.5', () => assert.equal(americanToDecimal(150), 2.5));
test('+1000 → 11.0', () => assert.equal(americanToDecimal(1000), 11.0));

// Negative American: decimal = 1 + (100 / abs(american))
test('-200 → 1.5', () => assert.equal(americanToDecimal(-200), 1.5));
test('-400 → 1.25', () => assert.equal(americanToDecimal(-400), 1.25));
test('-110 → ~1.909', () => {
    const result = americanToDecimal(-110);
    assert.ok(result !== null && Math.abs(result - 1.9090909) < 0.0001, `expected ~1.9091, got ${result}`);
});

// Edge cases
test('0 → null', () => assert.equal(americanToDecimal(0), null));
test('"abc" → null', () => assert.equal(americanToDecimal('abc'), null));

// ── Round-trip: decimalToAmerican → americanToDecimal ─────────────────────────

suite('Round-trip conversion');

function roundTrip(decimal) {
    const american = decimalToAmerican(decimal);
    if (american === null) return null;
    return americanToDecimal(american);
}

test('2.0 round-trip', () => {
    const result = roundTrip(2.0);
    assert.ok(Math.abs(result - 2.0) < 0.01, `expected ~2.0, got ${result}`);
});
test('3.0 round-trip', () => {
    const result = roundTrip(3.0);
    assert.ok(Math.abs(result - 3.0) < 0.01, `expected ~3.0, got ${result}`);
});
test('1.5 round-trip', () => {
    const result = roundTrip(1.5);
    assert.ok(Math.abs(result - 1.5) < 0.01, `expected ~1.5, got ${result}`);
});
test('1.91 round-trip', () => {
    const result = roundTrip(1.91);
    assert.ok(Math.abs(result - 1.91) < 0.02, `expected ~1.91, got ${result}`);
});

// ── formatOdds ────────────────────────────────────────────────────────────────

suite('formatOdds');

test('decimal format 2.0', () => assert.equal(formatOdds(2.0, 'decimal'), '2.00'));
test('decimal format 1.85', () => assert.equal(formatOdds(1.85, 'decimal'), '1.85'));
test('american format 2.0 → +100', () => assert.equal(formatOdds(2.0, 'american'), '+100'));
test('american format 3.0 → +200', () => assert.equal(formatOdds(3.0, 'american'), '+200'));
test('american format 1.5 → -200', () => assert.equal(formatOdds(1.5, 'american'), '-200'));
test('american plus sign on positive', () => {
    const result = formatOdds(2.5, 'american');
    assert.ok(result.startsWith('+'), `expected leading +, got ${result}`);
});
test('invalid value returns fallback', () => assert.equal(formatOdds(0, 'decimal', '-'), '-'));
test('null returns fallback', () => assert.equal(formatOdds(null, 'decimal', 'N/A'), 'N/A'));
test('default format is decimal', () => assert.equal(formatOdds(2.0), '2.00'));

// ── formatLineValue ───────────────────────────────────────────────────────────

suite('formatLineValue');

test('positive point', () => assert.equal(formatLineValue(3.5), '3.5'));
test('negative point', () => assert.equal(formatLineValue(-3.5), '-3.5'));
test('zero', () => assert.equal(formatLineValue(0), '0'));
test('negative zero', () => assert.equal(formatLineValue(-0), '0'));
test('signed positive', () => assert.equal(formatLineValue(7.5, { signed: true }), '+7.5'));
test('signed negative', () => assert.equal(formatLineValue(-7.5, { signed: true }), '-7.5'));
test('signed zero', () => assert.equal(formatLineValue(0, { signed: true }), '0'));
test('invalid → fallback', () => assert.equal(formatLineValue(NaN, { fallback: 'PK' }), 'PK'));

// ── formatSpreadDisplay ───────────────────────────────────────────────────────

suite('formatSpreadDisplay');

test('spread +3.5 at 1.91', () => {
    const result = formatSpreadDisplay(3.5, 1.91, 'decimal');
    assert.ok(result.startsWith('+3.5'), `expected starts with +3.5, got ${result}`);
});
test('spread -3.5 at 1.91 decimal', () => {
    const result = formatSpreadDisplay(-3.5, 1.91, 'decimal');
    assert.ok(result.startsWith('-3.5'), `expected starts with -3.5, got ${result}`);
});
test('invalid price → "-"', () => assert.equal(formatSpreadDisplay(3.5, 0, 'decimal'), '-'));
test('invalid point → "-"', () => assert.equal(formatSpreadDisplay(NaN, 1.91, 'decimal'), '-'));

// ── formatTotalDisplay ────────────────────────────────────────────────────────

suite('formatTotalDisplay');

test('Over 48.5 decimal', () => {
    const result = formatTotalDisplay('Over', 48.5, 1.91, 'decimal');
    assert.ok(result.startsWith('Over 48.5'), `expected starts with "Over 48.5", got ${result}`);
});
test('Under 48.5 decimal', () => {
    const result = formatTotalDisplay('Under', 48.5, 1.91, 'decimal');
    assert.ok(result.startsWith('Under 48.5'), `expected starts with "Under 48.5", got ${result}`);
});
test('invalid price → "-"', () => assert.equal(formatTotalDisplay('Over', 48.5, 0, 'decimal'), '-'));

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n  ────────────────────────────────────────');
if (failed === 0) {
    console.log(`  \x1b[1;32m✓ All ${passed} assertions passed\x1b[0m\n`);
} else {
    console.log(`  \x1b[1;31m✗ ${failed} failed / ${passed + failed} total\x1b[0m`);
    console.log('\n  \x1b[1;31mFailures:\x1b[0m');
    failures.forEach(f => console.log(`    • ${f}`));
    console.log('');
}

process.exit(failed > 0 ? 1 : 0);
