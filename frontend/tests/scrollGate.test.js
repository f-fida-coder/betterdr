/**
 * Unit tests for frontend/src/utils/scroll.js — the scroll-to-bottom
 * predicates gating the onboarding rules Accept buttons (Nicky 2026-07-22).
 * Self-contained — Node.js built-ins only, no npm packages required.
 *
 * Usage: node frontend/tests/scrollGate.test.js
 */

import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scrollPath = pathToFileURL(path.join(__dirname, '../src/utils/scroll.js')).href;

const {
    hasReachedScrollBottom,
    contentFitsWithoutScroll,
    SCROLL_BOTTOM_EPSILON_PX,
} = await import(scrollPath);

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

// Container: 400px viewport over 2000px of rules text.

test('unscrolled long content → Accept stays locked', () => {
    assert.equal(hasReachedScrollBottom(0, 400, 2000), false);
});

test('mid-scroll → still locked', () => {
    assert.equal(hasReachedScrollBottom(800, 400, 2000), false);
});

test('exact bottom → unlocked', () => {
    assert.equal(hasReachedScrollBottom(1600, 400, 2000), true);
});

test('within the epsilon of the bottom (iOS fractional pixels) → unlocked', () => {
    assert.equal(hasReachedScrollBottom(2000 - 400 - SCROLL_BOTTOM_EPSILON_PX, 400, 2000), true);
});

test('just beyond the epsilon → still locked', () => {
    assert.equal(hasReachedScrollBottom(2000 - 400 - SCROLL_BOTTOM_EPSILON_PX - 1, 400, 2000), false);
});

test('overscroll past the bottom (momentum bounce) → unlocked', () => {
    assert.equal(hasReachedScrollBottom(1650, 400, 2000), true);
});

test('short content that fits without a scrollbar counts as read', () => {
    assert.equal(contentFitsWithoutScroll(400, 300), true);
    assert.equal(contentFitsWithoutScroll(400, 400), true);
});

test('content that overflows does NOT auto-count as read', () => {
    assert.equal(contentFitsWithoutScroll(400, 2000), false);
});

test('non-finite measurements never unlock', () => {
    assert.equal(hasReachedScrollBottom(NaN, 400, 2000), false);
    assert.equal(hasReachedScrollBottom(0, undefined, 2000), false);
    assert.equal(hasReachedScrollBottom(0, 400, null), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
