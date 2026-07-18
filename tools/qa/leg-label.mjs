#!/usr/bin/env node
//
// leg-label.mjs — unit test for the shared one-line selection label
// (frontend/src/utils/legLabel.js), used by the betslip AND the receipt.
//
// Locks the short format per market type + the tricky edge cases: team-total
// disambiguation, alternate markets that already bake the line into the
// selection (must not double up), period suffixes, buy-points-adjusted lines,
// and the two data shapes (betslip `line`/`teamTotal.side` vs receipt
// `point`/`side`). DISPLAY ONLY — none of this touches the wire value.
//
// Zero external deps beyond the util chain; run: node tools/qa/leg-label.mjs

import { formatLegLabel } from '../../frontend/src/utils/legLabel.js';

let failures = 0;
let passes = 0;
const eq = (leg, expected, msg) => {
    const got = formatLegLabel(leg);
    if (got === expected) { passes++; console.log(`  PASS ${msg}`); }
    else { failures++; console.error(`  FAIL ${msg} — got "${got}", want "${expected}"`); }
};
const ok = (cond, msg) => { if (cond) { passes++; console.log(`  PASS ${msg}`); } else { failures++; console.error(`  FAIL ${msg}`); } };

console.log('Moneyline — keeps "ML" to disambiguate a no-line pick');
eq({ marketType: 'h2h', selectionFull: 'Cincinnati Reds' }, 'Cincinnati Reds ML', 'h2h -> "Team ML"');
eq({ marketType: 'h2h', selection: 'Detroit Tigers' }, 'Detroit Tigers ML', 'h2h from bare selection');
eq({ marketType: 'h2h_q1', selectionFull: 'Detroit Tigers' }, 'Detroit Tigers ML (1Q)', 'period ML shows (1Q)');

console.log('Spread — signed line implies spread, drop the word');
eq({ marketType: 'spreads', selectionFull: 'Detroit Tigers', line: -1.5 }, 'Detroit Tigers -1.5', 'favorite spread');
eq({ marketType: 'spreads', selectionFull: 'Chicago Bears', line: 2.5 }, 'Chicago Bears +2.5', 'dog spread is signed +');
eq({ marketType: 'spreads_1st_5_innings', selectionFull: 'Boston', line: -1.5 }, 'Boston -1.5 (F5)', 'period spread shows (F5)');
eq({ marketType: 'spreads', selectionFull: 'Detroit Tigers', line: -1 }, 'Detroit Tigers -1', 'buy-points-adjusted line (-1.5 bought to -1)');

console.log('Total — "Over 12" / "Under 8.5", no "Total" prefix');
eq({ marketType: 'totals', selection: 'Over', line: 12 }, 'Over 12', 'game total Over');
eq({ marketType: 'totals', selection: 'Under', line: 8.5 }, 'Under 8.5', 'game total Under');
eq({ marketType: 'totals_1st_5_innings', selection: 'Over', line: 8.5 }, 'Over 8.5 (F5)', 'period total shows (F5)');
eq({ marketType: 'totals', selection: 'Over', point: 8.5 }, 'Over 8.5', 'receipt shape (point instead of line)');

console.log('Team total — keeps "Team Total", never over-shortened to a game total');
eq({ marketType: 'team_totals', selectionFull: 'Tampa Bay Over', teamTotal: { side: 'over' }, line: 3.5 }, 'Tampa Bay Team Total Over 3.5', 'betslip shape (teamTotal.side)');
eq({ marketType: 'team_totals', selectionFull: 'Tampa Bay Under', side: 'under', point: 3.5 }, 'Tampa Bay Team Total Under 3.5', 'receipt shape (side + point)');
eq({ marketType: 'team_totals', selectionFull: 'Tampa Bay Under', line: 3.5 }, 'Tampa Bay Team Total Under 3.5', 'no side meta -> trailing-word Under');
// Disambiguation: a game total and a team total on the same number must differ.
ok(formatLegLabel({ marketType: 'totals', selection: 'Over', line: 3.5 }) !== formatLegLabel({ marketType: 'team_totals', selectionFull: 'Tampa Bay Over', line: 3.5 }), 'game total "Over 3.5" != team total "Tampa Bay Team Total Over 3.5"');

console.log('Alternate markets — selection already embeds the line, never double up');
eq({ marketType: 'alternate_spreads', selectionFull: 'Chicago -2.5', line: -2.5 }, 'Chicago -2.5', 'alt spread verbatim (not "Chicago -2.5 -2.5")');
eq({ marketType: 'alternate_totals', selectionFull: 'Over 48.5', line: 48.5 }, 'Over 48.5', 'alt total verbatim');

console.log('Outright — drops the redundant market word');
ok(/Super Bowl/.test(formatLegLabel({ marketType: 'outrights', selectionFull: 'Vikings to win Super Bowl' })) && !/\bBet\b/.test(formatLegLabel({ marketType: 'outrights', selectionFull: 'Vikings to win Super Bowl' })), 'outright keeps the future text, no "Bet"');

console.log('Player prop — unchanged (full pick preserved)');
ok(/Aaron Judge Over 1\.5/.test(formatLegLabel({ marketType: 'batter_home_runs', selectionFull: 'Aaron Judge Over 1.5' })), 'prop keeps the full "Player Over N" pick');

console.log('');
if (failures > 0) { console.error(`leg-label: ${failures} FAILED, ${passes} passed`); process.exit(1); }
console.log(`leg-label: all ${passes} assertions passed`);
