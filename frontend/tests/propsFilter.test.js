/**
 * Unit tests for the prop-builder filter pipeline that lives in
 * frontend/src/components/PropBuilderModal.jsx — specifically
 * `groupPropsByPlayer()` + the `filteredPlayers` useMemo.
 *
 * The production logic is replicated inline below (same pattern as
 * LiveFilterTest on the PHP side + baseballSituation.test.js on this
 * side). Keep the two in lockstep when PropBuilderModal changes.
 *
 * Self-contained: no npm packages required.
 * Usage: node frontend/tests/propsFilter.test.js
 */

import assert from 'node:assert/strict';

// ── Inline replicas — mirror PropBuilderModal.jsx ─────────────────────────────

/** Mirror of PropBuilderModal.jsx `groupPropsByPlayer` (line ~90). */
function groupPropsByPlayer(playerProps) {
    const byPlayer = new Map();
    (playerProps || []).forEach((market) => {
        const marketKey = String(market?.key || '');
        const outcomes = Array.isArray(market?.outcomes) ? market.outcomes : [];
        outcomes.forEach((outcome) => {
            const playerName = String(outcome?.description || outcome?.participant || outcome?.name || '').trim();
            if (!playerName) return;
            if (!byPlayer.has(playerName)) byPlayer.set(playerName, new Map());
            const byMarket = byPlayer.get(playerName);
            if (!byMarket.has(marketKey)) byMarket.set(marketKey, []);
            byMarket.get(marketKey).push(outcome);
        });
    });
    return byPlayer;
}

/** Mirror of PropBuilderModal.jsx `filteredPlayers` useMemo (post-dropdown refactor). */
function filterPlayers(byPlayer, playerFilter, marketFilter) {
    return Array.from(byPlayer.entries())
        .filter(([name]) => playerFilter === 'all' || name === playerFilter)
        .filter(([, byMarket]) => marketFilter === 'all' || byMarket.has(marketFilter))
        .sort(([a], [b]) => a.localeCompare(b));
}

/** Mirror of the dropdown roster memo. */
function playerNamesOf(byPlayer) {
    return Array.from(byPlayer.keys()).sort((a, b) => a.localeCompare(b));
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

const samplePropsPayload = [
    {
        key: 'player_assists',
        outcomes: [
            { description: 'Ausar Thompson', name: 'Over', point: 3.5, price: 121 },
            { description: 'Ausar Thompson', name: 'Under', point: 3.5, price: -161 },
            { description: 'Cade Cunningham', name: 'Over', point: 5.5, price: -110 },
            { description: 'Cade Cunningham', name: 'Under', point: 5.5, price: -110 },
        ],
    },
    {
        key: 'player_assists_alternate',
        outcomes: [
            { description: 'Ausar Thompson', name: 'Over', point: 2.5, price: -200 },
            { description: 'Ausar Thompson', name: 'Over', point: 4.5, price: 273 },
            { description: 'Cade Cunningham', name: 'Over', point: 7.5, price: 150 },
        ],
    },
    {
        key: 'player_blocks_alternate',
        outcomes: [
            { description: 'Ausar Thompson', name: 'Over', point: 0.5, price: -250 },
            { description: 'Ausar Thompson', name: 'Over', point: 1.5, price: 183 },
            // No blocks props for Cade Cunningham → filter combo test
        ],
    },
    {
        key: 'player_double_double',
        outcomes: [
            { description: 'Cade Cunningham', name: 'Yes', price: 250 },
        ],
    },
];

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

// ── Tests ─────────────────────────────────────────────────────────────────────

suite('groupPropsByPlayer — basic shape');
test('groups outcomes by player name', () => {
    const byPlayer = groupPropsByPlayer(samplePropsPayload);
    assert.equal(byPlayer.size, 2, 'two distinct players');
    assert.ok(byPlayer.has('Ausar Thompson'), 'Ausar Thompson present');
    assert.ok(byPlayer.has('Cade Cunningham'), 'Cade Cunningham present');
});

test('player → market map preserves outcome arrays', () => {
    const byPlayer = groupPropsByPlayer(samplePropsPayload);
    const ausar = byPlayer.get('Ausar Thompson');
    assert.equal(ausar.get('player_assists').length, 2, '2 assist outcomes (over + under)');
    assert.equal(ausar.get('player_assists_alternate').length, 2, '2 alt-line outcomes');
    assert.equal(ausar.get('player_blocks_alternate').length, 2, '2 alt-blocks outcomes');
});

test('skips outcomes with no identifier at all', () => {
    // Production fallback chain: description → participant → name.
    // Only outcomes with NONE of those (or all blank) are dropped.
    const garbagePayload = [{
        key: 'player_points',
        outcomes: [
            { description: '', name: '', point: 10, price: 100 },     // fully unnamed — dropped
            { description: null, point: 10, price: 100 },              // no name fields → dropped
            { description: 'Real Player', name: 'Over', point: 10, price: 100 },
        ],
    }];
    const byPlayer = groupPropsByPlayer(garbagePayload);
    assert.equal(byPlayer.size, 1, 'only the fully-identified outcome makes it through');
    assert.ok(byPlayer.has('Real Player'));
});

test('falls through description → participant → name', () => {
    // Anti-regression: some payloads use `participant` for the player
    // (DK feed historically), others put it under `name`. Both forms
    // need to surface in the dropdown.
    const variedPayload = [{
        key: 'player_points',
        outcomes: [
            { description: 'Has Description', point: 10, price: 100 },
            { participant: 'Has Participant', point: 10, price: 100 },
            { name: 'Has Only Name', point: 10, price: 100 },
        ],
    }];
    const byPlayer = groupPropsByPlayer(variedPayload);
    assert.equal(byPlayer.size, 3, 'all three fallback fields resolve to a player');
    assert.ok(byPlayer.has('Has Description'));
    assert.ok(byPlayer.has('Has Participant'));
    assert.ok(byPlayer.has('Has Only Name'));
});

test('handles empty payload gracefully', () => {
    assert.equal(groupPropsByPlayer([]).size, 0, 'empty array → empty map');
    assert.equal(groupPropsByPlayer(null).size, 0, 'null → empty map');
    assert.equal(groupPropsByPlayer(undefined).size, 0, 'undefined → empty map');
});

suite('playerNamesOf — dropdown roster');
test('returns sorted unique player names', () => {
    const byPlayer = groupPropsByPlayer(samplePropsPayload);
    const names = playerNamesOf(byPlayer);
    assert.deepEqual(names, ['Ausar Thompson', 'Cade Cunningham'], 'alphabetical roster');
});

test('empty data → empty roster (dropdown disables)', () => {
    const names = playerNamesOf(groupPropsByPlayer([]));
    assert.deepEqual(names, [], 'no players → empty dropdown');
});

suite('filterPlayers — single filter active');
test('playerFilter = all + marketFilter = all → every player passes', () => {
    const byPlayer = groupPropsByPlayer(samplePropsPayload);
    const result = filterPlayers(byPlayer, 'all', 'all');
    assert.equal(result.length, 2, 'both players visible with no filter');
});

test('playerFilter = "Ausar Thompson" → only Ausar visible', () => {
    const byPlayer = groupPropsByPlayer(samplePropsPayload);
    const result = filterPlayers(byPlayer, 'Ausar Thompson', 'all');
    assert.equal(result.length, 1);
    assert.equal(result[0][0], 'Ausar Thompson');
});

test('marketFilter narrows to players with that market', () => {
    const byPlayer = groupPropsByPlayer(samplePropsPayload);
    // Only Cade Cunningham has player_double_double in our fixture
    const result = filterPlayers(byPlayer, 'all', 'player_double_double');
    assert.equal(result.length, 1, 'only Cade matches double-double');
    assert.equal(result[0][0], 'Cade Cunningham');
});

suite('filterPlayers — composite filters');
test('player + market combo: Ausar + Blocks (Alt) → 1 row', () => {
    const byPlayer = groupPropsByPlayer(samplePropsPayload);
    const result = filterPlayers(byPlayer, 'Ausar Thompson', 'player_blocks_alternate');
    assert.equal(result.length, 1, 'Ausar has blocks (alt)');
    assert.equal(result[0][0], 'Ausar Thompson');
});

test('player + market combo: Cade + Blocks (Alt) → empty (Cade has no blocks)', () => {
    const byPlayer = groupPropsByPlayer(samplePropsPayload);
    const result = filterPlayers(byPlayer, 'Cade Cunningham', 'player_blocks_alternate');
    assert.equal(result.length, 0, 'no overlap → empty state should render');
});

test('player filter that doesn\'t exist in data → empty', () => {
    const byPlayer = groupPropsByPlayer(samplePropsPayload);
    const result = filterPlayers(byPlayer, 'Phantom Player', 'all');
    assert.equal(result.length, 0, 'stale selection → empty (effect resets to all)');
});

test('exact match — partial name does NOT pass through (dropdown semantics)', () => {
    // Previous text-search would have matched "Ausar" partial.
    // Dropdown uses exact equality so "Ausar" alone matches nothing.
    const byPlayer = groupPropsByPlayer(samplePropsPayload);
    const result = filterPlayers(byPlayer, 'Ausar', 'all');
    assert.equal(result.length, 0, '"Ausar" ≠ "Ausar Thompson" (exact match required)');
});

suite('filterPlayers — result ordering');
test('results sorted alphabetically by player name', () => {
    const reversedPayload = [
        {
            key: 'player_points',
            outcomes: [
                { description: 'Zion Williamson', name: 'Over', point: 22.5, price: 100 },
                { description: 'Anthony Edwards', name: 'Over', point: 25.5, price: -110 },
                { description: 'Mikal Bridges', name: 'Over', point: 18.5, price: 105 },
            ],
        },
    ];
    const byPlayer = groupPropsByPlayer(reversedPayload);
    const result = filterPlayers(byPlayer, 'all', 'all');
    const names = result.map(([name]) => name);
    assert.deepEqual(names, ['Anthony Edwards', 'Mikal Bridges', 'Zion Williamson'], 'alphabetical');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n  ────────────────────────────────────────');
if (failed === 0) {
    console.log(`  \x1b[1;32m✓ All ${passed} tests passed\x1b[0m\n`);
    process.exit(0);
} else {
    console.log(`  \x1b[1;31m✗ ${failed} failed / ${passed + failed} total\x1b[0m\n`);
    for (const f of failures) console.log(`    • ${f}`);
    process.exit(1);
}
