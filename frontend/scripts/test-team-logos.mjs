// Mockup test for team-logo resolution. Covers:
//   1. logoUrlForTeam returns the right ESPN URL for the Athletics post-
//      rebrand naming (was the user-reported bug — Arsenal cannon
//      appeared on the slip).
//   2. Existing mappings still resolve (no regressions in the alias
//      additions).
//   3. Unknown teams fall through to null (so the caller can decide
//      to render the initials fallback).
//
// Run: node frontend/scripts/test-team-logos.mjs
// Exit 0 = pass, 1 = any failure.

import { logoUrlForTeam, normalizeTeamName } from '../src/utils/teamLogos.js';

// Shim localStorage for the cache layer used by logoUrlForTeam.
globalThis.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
};

let passes = 0;
const failures = [];

function expect(label, expected, actual) {
    const ok = expected === actual;
    if (ok) { passes++; console.log(`  ✓ ${label}`); return; }
    failures.push(label);
    console.log(`  ✗ ${label}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
}

const ESPN_OAK = 'https://a.espncdn.com/i/teamlogos/mlb/500/oak.png';
const ESPN_BAL = 'https://a.espncdn.com/i/teamlogos/mlb/500/bal.png';
const ESPN_HOU = 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png';
const ESPN_BOS = 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png';
const ESPN_LAL = 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png';
const ARSENAL  = 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg';

console.log('Athletics post-rebrand — was returning Arsenal cannon');
expect('"Athletics" → MLB oak', ESPN_OAK, logoUrlForTeam('Athletics'));
expect('"athletics" lowercase → MLB oak', ESPN_OAK, logoUrlForTeam('athletics'));
expect('"Sacramento Athletics" → MLB oak', ESPN_OAK, logoUrlForTeam('Sacramento Athletics'));
expect('"Las Vegas Athletics" → MLB oak', ESPN_OAK, logoUrlForTeam('Las Vegas Athletics'));
expect('"Oakland Athletics" → MLB oak (regression check)', ESPN_OAK, logoUrlForTeam('Oakland Athletics'));
expect('Arsenal still resolves to Arsenal (sanity)', ARSENAL, logoUrlForTeam('Arsenal'));

console.log('Sample of the visible teams in the screenshot');
expect('Tampa Bay Rays', 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png', logoUrlForTeam('Tampa Bay Rays'));
expect('Boston Red Sox', ESPN_BOS, logoUrlForTeam('Boston Red Sox'));
expect('Baltimore Orioles', ESPN_BAL, logoUrlForTeam('Baltimore Orioles'));
expect('Minnesota Twins', 'https://a.espncdn.com/i/teamlogos/mlb/500/min.png', logoUrlForTeam('Minnesota Twins'));
expect('Cleveland Guardians', 'https://a.espncdn.com/i/teamlogos/mlb/500/cle.png', logoUrlForTeam('Cleveland Guardians'));
expect('Houston Astros', ESPN_HOU, logoUrlForTeam('Houston Astros'));
expect('Cincinnati Reds', 'https://a.espncdn.com/i/teamlogos/mlb/500/cin.png', logoUrlForTeam('Cincinnati Reds'));

console.log('City/abbr live-feed context stays in correct league');
expect('BOS + baseball_mlb context -> MLB BOS logo', ESPN_BOS, logoUrlForTeam('BOS', { sportKey: 'baseball_mlb', sport: '', abbr: '' }));
expect('BAL + sport="Baseball" context -> MLB BAL logo', ESPN_BAL, logoUrlForTeam('BAL', { sportKey: '', sport: 'Baseball', abbr: '' }));
expect('LAL + sport="Basketball" context -> NBA LAL logo', ESPN_LAL, logoUrlForTeam('LAL', { sportKey: '', sport: 'Basketball', abbr: '' }));

console.log('Normalization handles common feed variations');
expect('apostrophes stripped', 'a s', normalizeTeamName("A's"));
expect('extra whitespace collapses', 'oakland athletics', normalizeTeamName('  Oakland   Athletics '));
expect('punctuation stripped', 'st louis cardinals', normalizeTeamName('St. Louis Cardinals'));

console.log('Unknown team → null (caller will render initials fallback)');
expect('"Acme Widgets FC" → null', null, logoUrlForTeam('Acme Widgets FC'));
expect('empty string → null', null, logoUrlForTeam(''));
expect('null input → null', null, logoUrlForTeam(null));

console.log('');
if (failures.length > 0) {
    console.log(`FAIL: ${failures.length} assertion(s) failed (${passes} passed)`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
}
console.log(`PASS: ${passes} assertions, 0 failures`);
process.exit(0);
