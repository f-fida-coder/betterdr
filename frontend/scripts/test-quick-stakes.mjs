// Mockup test for the Quick Stake middle-three edit rules in
// AccountPanel.jsx. Pure-JS replica of the hydration + save
// validation logic — runs in Node, no React/DOM/network.
//
// Why this exists: AccountPanel renders a 5-chip row where the outer
// two pin to the agent-set Min/Max bet and the middle three are
// player-editable. The component holds the rules inside its save
// handler, which is awkward to unit-test in isolation, so this file
// mirrors them and runs scripted scenarios against the mirror.
//
// Run: node frontend/scripts/test-quick-stakes.mjs
// Exit 0 = pass, 1 = any failure.

import { computeMidQuickStakes } from '../src/utils/money.js';

let passes = 0;
const failures = [];

function expect(label, expected, actual) {
    const ok = JSON.stringify(expected) === JSON.stringify(actual);
    if (ok) {
        passes++;
        console.log(`  ✓ ${label}`);
        return;
    }
    failures.push(label);
    console.log(`  ✗ ${label}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
}

// ---- Mirror of pickInitialMids from AccountPanel.jsx ----
function pickInitialMids(savedArr, lockedMin, lockedMax) {
    const [autoMid1, autoMid2, autoMid3] = computeMidQuickStakes(lockedMin, lockedMax);
    if (Array.isArray(savedArr) && savedArr.length === 5) {
        const m1 = Number(savedArr[1]);
        const m2 = Number(savedArr[2]);
        const m3 = Number(savedArr[3]);
        if ([m1, m2, m3].every((n) => Number.isFinite(n) && n > 0)) {
            return [String(m1), String(m2), String(m3)];
        }
    }
    return [String(autoMid1), String(autoMid2), String(autoMid3)];
}

// ---- Mirror of handleSave validation from AccountPanel.jsx ----
// Returns { ok: true, payload } on success, { ok: false, error } on
// failure. payload matches the body the component sends to updateProfile.
function validateAndBuildPayload({ mode, amount, midStakes, lockedMin, lockedMax }) {
    const parsedAmount = Number(amount);
    if (amount !== '' && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
        return { ok: false, error: 'Default amount must be a positive number' };
    }
    const quickStakes = [
        String(lockedMin),
        midStakes[0],
        midStakes[1],
        midStakes[2],
        String(lockedMax),
    ];
    const parsedQuickStakes = quickStakes.map((v) => Number(v));
    if (parsedQuickStakes.some((n) => !Number.isFinite(n) || n <= 0)) {
        return { ok: false, error: 'Quick stake values must be positive numbers' };
    }
    const [, midA, midB, midC] = parsedQuickStakes;
    if (midA <= lockedMin || midC >= lockedMax) {
        return { ok: false, error: `Quick stakes must be between $${lockedMin} and $${lockedMax}` };
    }
    if (!(midA < midB && midB < midC)) {
        return { ok: false, error: 'Quick stakes must increase from left to right' };
    }
    return {
        ok: true,
        payload: {
            mode,
            amount: amount === '' ? 0 : Math.round(parsedAmount * 100) / 100,
            quickStakes: parsedQuickStakes,
        },
    };
}

console.log('hydration — first-open with no saved profile');
expect(
    'auto-derives mids [500,1000,1500] from [25,2000]',
    ['500', '1000', '1500'],
    pickInitialMids(null, 25, 2000),
);
expect(
    'auto-derives mids for narrow range [10,100]',
    ['35', '55', '80'],
    pickInitialMids(undefined, 10, 100),
);

console.log('hydration — returning user with saved quickStakes');
expect(
    'uses saved middle 3 verbatim',
    ['200', '750', '1750'],
    pickInitialMids([25, 200, 750, 1750, 2000], 25, 2000),
);
expect(
    'falls back to auto when saved array is wrong length',
    ['500', '1000', '1500'],
    pickInitialMids([25, 200, 1750, 2000], 25, 2000),
);
expect(
    'falls back to auto when a saved mid is non-positive',
    ['500', '1000', '1500'],
    pickInitialMids([25, 200, 0, 1750, 2000], 25, 2000),
);
expect(
    'falls back to auto when a saved mid is non-numeric',
    ['500', '1000', '1500'],
    pickInitialMids([25, 200, 'oops', 1750, 2000], 25, 2000),
);

console.log('save validation — happy paths');
{
    const result = validateAndBuildPayload({
        mode: 'risk', amount: '1000',
        midStakes: ['500', '1000', '1500'],
        lockedMin: 25, lockedMax: 2000,
    });
    expect('valid auto-derived row saves', true, result.ok);
    expect('payload carries the full 5-chip array', [25, 500, 1000, 1500, 2000], result.payload.quickStakes);
    expect('payload preserves mode', 'risk', result.payload.mode);
    expect('payload normalizes amount', 1000, result.payload.amount);
}
{
    const result = validateAndBuildPayload({
        mode: 'win', amount: '',
        midStakes: ['100', '250', '750'],
        lockedMin: 25, lockedMax: 2000,
    });
    expect('user-customized row saves', true, result.ok);
    expect('amount empty → coerces to 0', 0, result.payload.amount);
    expect('full array reflects edits', [25, 100, 250, 750, 2000], result.payload.quickStakes);
}

console.log('save validation — rejects bad inputs');
{
    const result = validateAndBuildPayload({
        mode: 'risk', amount: '1000',
        midStakes: ['', '1000', '1500'],
        lockedMin: 25, lockedMax: 2000,
    });
    expect('rejects empty middle value', false, result.ok);
    expect('error mentions positive numbers', true, /positive numbers/.test(result.error || ''));
}
{
    const result = validateAndBuildPayload({
        mode: 'risk', amount: '1000',
        midStakes: ['1500', '1000', '500'], // descending
        lockedMin: 25, lockedMax: 2000,
    });
    expect('rejects descending order', false, result.ok);
    expect('error mentions increasing', true, /increase/.test(result.error || ''));
}
{
    const result = validateAndBuildPayload({
        mode: 'risk', amount: '1000',
        midStakes: ['500', '500', '1500'], // tied
        lockedMin: 25, lockedMax: 2000,
    });
    expect('rejects tied middles', false, result.ok);
}
{
    const result = validateAndBuildPayload({
        mode: 'risk', amount: '1000',
        midStakes: ['20', '1000', '1500'], // below lockedMin
        lockedMin: 25, lockedMax: 2000,
    });
    expect('rejects mid below Min', false, result.ok);
    expect('error names the bounds', true, /\$25.*\$2000/.test(result.error || ''));
}
{
    const result = validateAndBuildPayload({
        mode: 'risk', amount: '1000',
        midStakes: ['500', '1000', '2500'], // above lockedMax
        lockedMin: 25, lockedMax: 2000,
    });
    expect('rejects mid above Max', false, result.ok);
}
{
    const result = validateAndBuildPayload({
        mode: 'risk', amount: '1000',
        midStakes: ['500', '1000', '2000'], // mid equals Max
        lockedMin: 25, lockedMax: 2000,
    });
    expect('rejects mid that equals Max (strict <)', false, result.ok);
}
{
    const result = validateAndBuildPayload({
        mode: 'risk', amount: '1000',
        midStakes: ['25', '1000', '1500'], // mid equals Min
        lockedMin: 25, lockedMax: 2000,
    });
    expect('rejects mid that equals Min (strict >)', false, result.ok);
}

console.log('original screenshot scenario reproduces clean');
{
    // User's screenshot: Min=$25, Max=$2000, default amount=$1000.
    // With fix, the row hydrates as [25, 500, 1000, 1500, 2000] —
    // the middle three are editable, and saving them works.
    const initialMids = pickInitialMids(null, 25, 2000);
    expect('initial mids match screenshot row', ['500', '1000', '1500'], initialMids);
    // User edits middle three to [100, 500, 1500]:
    const result = validateAndBuildPayload({
        mode: 'win', amount: '1000',
        midStakes: ['100', '500', '1500'],
        lockedMin: 25, lockedMax: 2000,
    });
    expect('custom edit saves', true, result.ok);
    expect('persisted row', [25, 100, 500, 1500, 2000], result.payload.quickStakes);
}

console.log('');
if (failures.length > 0) {
    console.log(`FAIL: ${failures.length} assertion(s) failed (${passes} passed)`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
}
console.log(`PASS: ${passes} assertions, 0 failures`);
process.exit(0);
