// Mockup test for the "+" (More Bets) modal in MatchDetailView.jsx.
// Pure-JS replica of the section-filter pipeline — runs in Node,
// no React/DOM/network.
//
// Why this exists: the `+` action button opens MatchDetailView, which is
// supposed to surface ONLY the bet types the player can't already reach
// from the row or the period-tab strip on the list view:
//   - Game Spread / ML / Total → already on the row, NOT in the modal
//   - 1H / 2H / 1Q–4Q / P1–P3 Spread / ML / Total → already on the
//     period-tab strip, NOT in the modal
//   - Alt spreads, alt totals, team totals (game + per-period), soccer
//     alts (BTTS / DNB / DC / 3-way ML) → these ARE the modal's content
//
// This test pins that contract. If a future edit re-introduces the
// raw spread/ML/total sections (game OR period), this test fails and
// the build blocks the regression. It also verifies that closed-period
// suppression still hides per-period alts mid-live-game.
//
// Run: node frontend/scripts/test-alt-bets-priority.mjs
// Exit 0 = pass, 1 = any failure.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(__dirname, '../src/components/MatchDetailView.jsx');
const source = fs.readFileSync(sourcePath, 'utf8');

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

function expectTrue(label, condition) {
    if (condition) {
        passes++;
        console.log(`  ✓ ${label}`);
        return;
    }
    failures.push(label);
    console.log(`  ✗ ${label}`);
}

// ─────────────────────────────────────────────────────────────────────────
// Source-level pins: the alt sections must be present, and the raw
// game/period spread/ML/total sections must NOT be present.
// ─────────────────────────────────────────────────────────────────────────

console.log('\nSource-level pins (what must be in SECTION_DEFS):');

expectTrue('alternate_spreads is present', /key:\s*'alternate_spreads'/.test(source));
expectTrue('alternate_totals is present', /key:\s*'alternate_totals'/.test(source));
expectTrue('team_totals is present', /key:\s*'team_totals'/.test(source));
expectTrue('alternate_team_totals is present', /key:\s*'alternate_team_totals'/.test(source));
expectTrue('per-period team_totals_h1 is present', /key:\s*'team_totals_h1'/.test(source));
expectTrue('per-period team_totals_q1 is present', /key:\s*'team_totals_q1'/.test(source));
expectTrue('per-period alternate_spreads_h1 is present', /key:\s*'alternate_spreads_h1'/.test(source));
expectTrue('per-period alternate_totals_q1 is present', /key:\s*'alternate_totals_q1'/.test(source));

console.log('\nSource-level pins (what must NOT be in SECTION_DEFS — already on row/tabs):');

// Game-level raw markets — these live on the match row itself.
expectTrue("plain 'spreads' is NOT in SECTION_DEFS", !/key:\s*'spreads'\s*,/.test(source));
expectTrue("plain 'h2h' is NOT in SECTION_DEFS", !/key:\s*'h2h'\s*,/.test(source));
expectTrue("plain 'totals' is NOT in SECTION_DEFS", !/key:\s*'totals'\s*,/.test(source));

// Period raw markets — these are reached via the period-tab strip.
expectTrue("'spreads_q1' is NOT in SECTION_DEFS", !/key:\s*'spreads_q1'/.test(source));
expectTrue("'totals_q4' is NOT in SECTION_DEFS", !/key:\s*'totals_q4'/.test(source));
expectTrue("'h2h_h1' is NOT in SECTION_DEFS", !/key:\s*'h2h_h1'/.test(source));
expectTrue("'spreads_p2' is NOT in SECTION_DEFS", !/key:\s*'spreads_p2'/.test(source));
expectTrue("MLB '5_innings' raw markets are NOT in SECTION_DEFS", !/_1st_5_innings/.test(source));

console.log('\nSource-level pins (default expanded + subtitle):');

expectTrue('default expanded state includes alternate_spreads: true', /alternate_spreads:\s*true/.test(source));
expectTrue('default expanded state includes alternate_totals: true', /alternate_totals:\s*true/.test(source));
expectTrue('default expanded state includes team_totals: true', /team_totals:\s*true/.test(source));
expectTrue('modal subtitle reads "Alt Lines & Totals"', /Alt Lines & Totals/.test(source));

// ─────────────────────────────────────────────────────────────────────────
// Behavioral simulation: mirror the section-filter pipeline and run
// the actual logic against fixture market data.
// ─────────────────────────────────────────────────────────────────────────

console.log('\nBehavioral pipeline (mirrored from MatchDetailView):');

// Mirror of the SECTION_DEFS subset relevant to behavior tests.
// Keep keys/order aligned with src/components/MatchDetailView.jsx — the
// source-level pins above guard membership of the real list.
const SECTION_DEFS = [
    { key: 'alternate_spreads', label: 'Alt Game Spread', kind: 'alt-lines' },
    { key: 'alternate_totals', label: 'Alt Game Total', kind: 'alt-lines' },
    { key: 'team_totals', label: 'Team Totals', kind: 'team-totals' },
    { key: 'alternate_team_totals', label: 'Alt Team Totals', kind: 'team-totals' },
    { key: 'alternate_spreads_h1', label: 'Alt 1H Spread', kind: 'alt-lines' },
    { key: 'team_totals_h1', label: '1H Team Totals', kind: 'team-totals' },
    { key: 'alternate_spreads_q1', label: 'Alt 1Q Spread', kind: 'alt-lines' },
    { key: 'team_totals_q1', label: '1Q Team Totals', kind: 'team-totals' },
];

// Mirror of MatchDetailView's marketsByKey + availableSections, minus
// React. Markets come from match.odds.markets and payload.extendedMarkets.
function availableSections(match, payload) {
    const idx = {};
    const base = Array.isArray(match?.odds?.markets) ? match.odds.markets : [];
    const extended = Array.isArray(payload?.extendedMarkets) ? payload.extendedMarkets : [];
    [...base, ...extended].forEach((m) => {
        if (!m || !m.key) return;
        idx[String(m.key).toLowerCase()] = m;
    });

    // Closed-period filter — must match the suffix-based version in
    // MatchDetailView.sectionPeriodToken (matches `_q1` / `_h2` / `_p3`
    // at the end of any section key, including alt and team-total keys).
    const eventStatus = String(match?.score?.event_status || '').toUpperCase();
    const isLive = match?.status === 'live'
        || eventStatus.includes('IN_PROGRESS')
        || eventStatus.includes('LIVE');
    const periodNum = Number(match?.score?.period || 0);
    const isSoccer = String(match?.sportKey || '').toLowerCase().startsWith('soccer');
    const quarterMap = { q1: 1, q2: 2, q3: 3, q4: 4 };
    const halfMap = isSoccer ? { h1: 1, h2: 2 } : { h1: 2, h2: 4 };
    const periodMap = { p1: 1, p2: 2, p3: 3 };

    function isClosed(key) {
        if (!isLive || !Number.isFinite(periodNum) || periodNum <= 0) return false;
        const k = String(key || '').toLowerCase();
        let token = null;
        let m = k.match(/_(q[1-4])$/);
        if (m) token = m[1];
        if (!token) { m = k.match(/_(h[12])$/); if (m) token = m[1]; }
        if (!token) { m = k.match(/_(p[1-3])$/); if (m) token = m[1]; }
        if (!token) return false;
        const threshold = quarterMap[token] ?? halfMap[token] ?? periodMap[token];
        if (threshold === undefined) return false;
        return periodNum > threshold;
    }

    return SECTION_DEFS.filter((s) => {
        if (!idx[s.key.toLowerCase()]) return false;
        if (isClosed(s.key)) return false;
        return true;
    });
}

function mkMarket(key) {
    return { key, outcomes: [{ name: 'A', price: -110, point: 0 }, { name: 'B', price: -110, point: 0 }] };
}

// Scenario 1: book offers a full alt set → alt sections all render in
// declared order, and game spread/ML/total are silently ignored even
// when present in the payload (they're row-level, not modal-level).
{
    const match = {
        odds: {
            markets: [
                mkMarket('spreads'),
                mkMarket('h2h'),
                mkMarket('totals'),
            ],
        },
    };
    const payload = {
        extendedMarkets: [
            mkMarket('alternate_spreads'),
            mkMarket('alternate_totals'),
            mkMarket('team_totals'),
            mkMarket('alternate_team_totals'),
        ],
    };
    const sections = availableSections(match, payload);
    expect(
        'pregame + full alt set → only alt/team-totals render, in declared order',
        ['alternate_spreads', 'alternate_totals', 'team_totals', 'alternate_team_totals'],
        sections.map((s) => s.key),
    );
}

// Scenario 2: book offers ONLY main lines (no alts) → modal is empty.
// The player is supposed to use the row buttons in this case.
{
    const match = {
        odds: {
            markets: [
                mkMarket('spreads'),
                mkMarket('h2h'),
                mkMarket('totals'),
            ],
        },
    };
    const sections = availableSections(match, { extendedMarkets: [] });
    expect(
        'no alt markets → modal renders empty (player uses row instead)',
        [],
        sections.map((s) => s.key),
    );
}

// Scenario 3: book offers per-period alts → they DO render in the modal
// (the period-tab strip only covers raw spread/ML/total, not alts).
{
    const match = {
        odds: { markets: [] },
    };
    const payload = {
        extendedMarkets: [
            mkMarket('alternate_spreads'),
            mkMarket('team_totals'),
            mkMarket('alternate_spreads_h1'),
            mkMarket('team_totals_h1'),
            mkMarket('team_totals_q1'),
        ],
    };
    const sections = availableSections(match, payload);
    expect(
        'per-period alt sections render alongside game alts',
        ['alternate_spreads', 'team_totals', 'alternate_spreads_h1', 'team_totals_h1', 'team_totals_q1'],
        sections.map((s) => s.key),
    );
}

// Scenario 4: live mid-Q3 — per-period alts for closed periods are dropped.
{
    const match = {
        status: 'live',
        sportKey: 'basketball_nba',
        score: { event_status: 'IN_PROGRESS', period: 3 },
        odds: { markets: [] },
    };
    const payload = {
        extendedMarkets: [
            mkMarket('alternate_spreads'),
            mkMarket('team_totals'),
            mkMarket('alternate_spreads_q1'),  // closed: period 3 > 1
            mkMarket('team_totals_q1'),        // closed
            mkMarket('alternate_spreads_h1'),  // closed: period 3 > 2 (halftime over)
            mkMarket('team_totals_h1'),        // closed
        ],
    };
    const sections = availableSections(match, payload);
    const keys = sections.map((s) => s.key);
    expect(
        'live mid-Q3 → game alts preserved, 1Q/1H alts dropped',
        ['alternate_spreads', 'team_totals'],
        keys,
    );
    expectTrue('1Q alt spreads do NOT leak through when period > 1', !keys.includes('alternate_spreads_q1'));
    expectTrue('1Q team totals do NOT leak through when period > 1', !keys.includes('team_totals_q1'));
    expectTrue('1H alt spreads do NOT leak through after halftime', !keys.includes('alternate_spreads_h1'));
    expectTrue('1H team totals do NOT leak through after halftime', !keys.includes('team_totals_h1'));
}

// Scenario 5: empty match (no markets at all) → empty section list.
{
    const sections = availableSections({}, {});
    expect('empty match → no sections', [], sections.map((s) => s.key));
}

// ─────────────────────────────────────────────────────────────────────────

console.log(`\n${passes} passed${failures.length ? `, ${failures.length} FAILED` : ''}.`);
if (failures.length) {
    console.log('\nFAILED:');
    failures.forEach((f) => console.log('  - ' + f));
    process.exit(1);
}
process.exit(0);
