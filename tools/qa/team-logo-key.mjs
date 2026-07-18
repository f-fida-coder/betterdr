#!/usr/bin/env node
//
// team-logo-key.mjs — unit test for the My Bets logo-cache identity
// (frontend/src/utils/teamLogoKey.js).
//
// Regression for the "Dodgers and Rams both show the Angels logo" bug: the
// cache was keyed on the city-only display name ("Los Angeles"), so every
// same-city team — across sports — collapsed onto one crest. The key must now
// be unique per (sport, abbreviation). This locks that: same-city teams get
// DISTINCT keys, and the two crests of a game total differ.
//
// Zero-dep; run: node tools/qa/team-logo-key.mjs

import { teamLogoKey } from '../../frontend/src/utils/teamLogoKey.js';

let failures = 0;
let passes = 0;
const distinct = (label, ...keys) => {
    const uniq = new Set(keys);
    if (uniq.size === keys.length) { passes++; console.log(`  PASS ${label} — ${keys.length} distinct keys`); }
    else { failures++; console.error(`  FAIL ${label} — collision among [${keys.join(', ')}]`); }
};
const eq = (got, want, label) => {
    if (got === want) { passes++; console.log(`  PASS ${label}`); }
    else { failures++; console.error(`  FAIL ${label} — got "${got}", want "${want}"`); }
};

console.log('All-LA collision (the reported bug): every LA team must be distinct');
const dodgers = teamLogoKey('baseball_mlb', 'LAD', 'Los Angeles', 'Los Angeles Dodgers');
const angels = teamLogoKey('baseball_mlb', 'LAA', 'Los Angeles', 'Los Angeles Angels');
const rams = teamLogoKey('americanfootball_nfl', 'LAR', 'Los Angeles', 'Los Angeles Rams');
const chargers = teamLogoKey('americanfootball_nfl', 'LAC', 'Los Angeles', 'Los Angeles Chargers');
const lakers = teamLogoKey('basketball_nba', 'LAL', 'Los Angeles', 'Los Angeles Lakers');
const clippers = teamLogoKey('basketball_nba', 'LAC', 'Los Angeles', 'Los Angeles Clippers');
distinct('LA teams (Dodgers/Angels/Rams/Chargers/Lakers/Clippers)', dodgers, angels, rams, chargers, lakers, clippers);
eq(dodgers, 'baseball_mlb:lad', 'Dodgers -> baseball_mlb:lad');
eq(rams, 'americanfootball_nfl:lar', 'Rams -> americanfootball_nfl:lar (not the MLB Angels)');
// NBA LAC (Clippers) vs NFL LAC (Chargers): same abbr, different sport -> distinct.
distinct('same abbr across sports (NFL Chargers vs NBA Clippers, both LAC)', chargers, clippers);

console.log('New York collision: Yankees vs Mets vs Giants vs Jets');
const yankees = teamLogoKey('baseball_mlb', 'NYY', 'New York', 'New York Yankees');
const mets = teamLogoKey('baseball_mlb', 'NYM', 'New York', 'New York Mets');
const giants = teamLogoKey('americanfootball_nfl', 'NYG', 'New York', 'New York Giants');
const jets = teamLogoKey('americanfootball_nfl', 'NYJ', 'New York', 'New York Jets');
distinct('NY teams', yankees, mets, giants, jets);

console.log('Game total: the two matchup crests must differ (away vs home)');
// Dodgers @ Yankees total -> away Dodgers crest + home Yankees crest.
const totalAway = teamLogoKey('baseball_mlb', 'LAD', 'Los Angeles', 'Los Angeles Dodgers');
const totalHome = teamLogoKey('baseball_mlb', 'NYY', 'New York', 'New York Yankees');
distinct('total both-crests (Dodgers away vs Yankees home)', totalAway, totalHome);

console.log('Fallbacks: no abbr -> full name, then bare name; still sport-scoped');
eq(teamLogoKey('baseball_mlb', '', 'Los Angeles', 'Los Angeles Dodgers'), 'baseball_mlb:los angeles dodgers', 'no abbr -> full name');
eq(teamLogoKey('baseball_mlb', '', 'Los Angeles', ''), 'baseball_mlb:los angeles', 'no abbr/full -> bare name (sport-scoped)');
// Even with no abbr, two different full names in the same sport stay distinct.
distinct('no-abbr same city, different full names',
    teamLogoKey('baseball_mlb', '', 'Los Angeles', 'Los Angeles Dodgers'),
    teamLogoKey('baseball_mlb', '', 'Los Angeles', 'Los Angeles Angels'));
// A cross-sport pair with neither abbr nor full still can't collide (sport scope).
distinct('cross-sport bare names (MLB "Los Angeles" vs NFL "Los Angeles")',
    teamLogoKey('baseball_mlb', '', 'Los Angeles', ''),
    teamLogoKey('americanfootball_nfl', '', 'Los Angeles', ''));

console.log('');
if (failures > 0) { console.error(`team-logo-key: ${failures} FAILED, ${passes} passed`); process.exit(1); }
console.log(`team-logo-key: all ${passes} assertions passed`);
