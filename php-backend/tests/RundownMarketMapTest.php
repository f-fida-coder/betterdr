<?php

declare(strict_types=1);

/**
 * Unit tests for RundownMarketMap — period market resolution.
 *
 * Covers the sport-aware suffix routing: the same Rundown market_id can
 * map to different chips per sport (981 → q1 for NBA, p1 for NHL).
 * Drift between PERIOD_MARKETS and PERIOD_TOKEN_TO_SUFFIX shows up as
 * either silent dropped markets (suffix returns null) or wrong-sport
 * suffix bleed-through; both regressions are caught here.
 */

require_once dirname(__DIR__) . '/src/RundownMarketMap.php';

// ── PERIOD_MARKETS coverage ─────────────────────────────────────────────

TestRunner::run('basketball: NBA quarter market_ids → _qN', function (): void {
    TestRunner::assertEquals('h2h_q1',         RundownMarketMap::explicitPeriodKey(981,  'basketball_nba'));
    TestRunner::assertEquals('spreads_q1',     RundownMarketMap::explicitPeriodKey(957,  'basketball_nba'));
    TestRunner::assertEquals('totals_q1',      RundownMarketMap::explicitPeriodKey(958,  'basketball_nba'));
    TestRunner::assertEquals('team_totals_q1', RundownMarketMap::explicitPeriodKey(991,  'basketball_nba'));
    TestRunner::assertEquals('h2h_q2',         RundownMarketMap::explicitPeriodKey(1013, 'basketball_nba'));
    TestRunner::assertEquals('h2h_q3',         RundownMarketMap::explicitPeriodKey(1016, 'basketball_nba'));
    TestRunner::assertEquals('h2h_q4',         RundownMarketMap::explicitPeriodKey(1019, 'basketball_nba'));
});

TestRunner::run('basketball: NBA half market_ids → _hN', function (): void {
    TestRunner::assertEquals('h2h_h1',     RundownMarketMap::explicitPeriodKey(4,    'basketball_nba'));
    TestRunner::assertEquals('spreads_h1', RundownMarketMap::explicitPeriodKey(5,    'basketball_nba'));
    TestRunner::assertEquals('totals_h1',  RundownMarketMap::explicitPeriodKey(6,    'basketball_nba'));
    TestRunner::assertEquals('h2h_h2',     RundownMarketMap::explicitPeriodKey(1010, 'basketball_nba'));
    TestRunner::assertEquals('spreads_h2', RundownMarketMap::explicitPeriodKey(1009, 'basketball_nba'));
    TestRunner::assertEquals('totals_h2',  RundownMarketMap::explicitPeriodKey(1008, 'basketball_nba'));
});

TestRunner::run('basketball: in-play period variants share the same suffix', function (): void {
    // In-play first half / first quarter must collapse to the same chip
    // as their prematch counterparts — frontend only renders one chip
    // per period.
    TestRunner::assertEquals('h2h_h1', RundownMarketMap::explicitPeriodKey(1024, 'basketball_nba'));
    TestRunner::assertEquals('h2h_q1', RundownMarketMap::explicitPeriodKey(1032, 'basketball_nba'));
    TestRunner::assertEquals('h2h_q4', RundownMarketMap::explicitPeriodKey(1044, 'basketball_nba'));
});

TestRunner::run('americanfootball: NFL quarter/half routing matches basketball', function (): void {
    TestRunner::assertEquals('h2h_q1', RundownMarketMap::explicitPeriodKey(981,  'americanfootball_nfl'));
    TestRunner::assertEquals('h2h_h1', RundownMarketMap::explicitPeriodKey(4,    'americanfootball_nfl'));
    TestRunner::assertEquals('h2h_h2', RundownMarketMap::explicitPeriodKey(1010, 'americanfootball_ncaaf'));
});

TestRunner::run('hockey: NHL reuses "quarter" market_ids → _pN', function (): void {
    // Rundown ships market_id=981 as "moneyline_first_quarter" for NHL
    // events too, but semantically that's P1, not Q1. Suffix must be _p1.
    TestRunner::assertEquals('h2h_p1',     RundownMarketMap::explicitPeriodKey(981,  'icehockey_nhl'));
    TestRunner::assertEquals('spreads_p1', RundownMarketMap::explicitPeriodKey(957,  'icehockey_nhl'));
    TestRunner::assertEquals('h2h_p2',     RundownMarketMap::explicitPeriodKey(1013, 'icehockey_nhl'));
    TestRunner::assertEquals('h2h_p3',     RundownMarketMap::explicitPeriodKey(1016, 'icehockey_nhl'));
});

TestRunner::run('hockey: NHL has no 4th period — market_id=1019 returns null', function (): void {
    // 1019 = moneyline_fourth_quarter — invalid for hockey.
    TestRunner::assertEquals(null, RundownMarketMap::explicitPeriodKey(1019, 'icehockey_nhl'));
});

TestRunner::run('baseball: MLB innings markets emit _1st_N_innings suffix', function (): void {
    // Suffix MUST match the frontend's BASEBALL_PERIODS chip suffixes
    // (utils/periods.js) and OddsMarketCatalog's allow-list.
    TestRunner::assertEquals('h2h_1st_5_innings',     RundownMarketMap::explicitPeriodKey(769,  'baseball_mlb'));
    TestRunner::assertEquals('totals_1st_5_innings',  RundownMarketMap::explicitPeriodKey(780,  'baseball_mlb'));
    TestRunner::assertEquals('spreads_1st_5_innings', RundownMarketMap::explicitPeriodKey(791,  'baseball_mlb'));
    TestRunner::assertEquals('h2h_1st_1_innings',     RundownMarketMap::explicitPeriodKey(784,  'baseball_mlb'));
    TestRunner::assertEquals('totals_1st_1_innings',  RundownMarketMap::explicitPeriodKey(766,  'baseball_mlb'));
    TestRunner::assertEquals('spreads_1st_1_innings', RundownMarketMap::explicitPeriodKey(1129, 'baseball_mlb'));
});

TestRunner::run('baseball: F3/F7 market_ids stay removed (product 2026-07-06)', function (): void {
    // Board offers Game/F1/F5 only. If someone re-adds 1109-1114 to
    // PERIOD_MARKETS without the frontend counterpart (BASEBALL_PERIODS +
    // SUPPRESSED_PERIOD_SUFFIXES in utils/periods.js), this fails first.
    foreach ([1109, 1110, 1111, 1112, 1113, 1114] as $id) {
        TestRunner::assertEquals(null, RundownMarketMap::explicitPeriodKey($id, 'baseball_mlb'));
    }
});

TestRunner::run('soccer: 1H / 2H half markets route to _h1 / _h2', function (): void {
    TestRunner::assertEquals('h2h_h1',     RundownMarketMap::explicitPeriodKey(4,    'soccer_epl'));
    TestRunner::assertEquals('spreads_h1', RundownMarketMap::explicitPeriodKey(5,    'soccer_epl'));
    TestRunner::assertEquals('totals_h2',  RundownMarketMap::explicitPeriodKey(1008, 'soccer_epl'));
});

TestRunner::run('tennis: set markets keep set_1 / set_2 suffix', function (): void {
    TestRunner::assertEquals('h2h_set_1',     RundownMarketMap::explicitPeriodKey(1150, 'tennis_atp'));
    TestRunner::assertEquals('spreads_set_1', RundownMarketMap::explicitPeriodKey(1151, 'tennis_atp'));
    TestRunner::assertEquals('h2h_set_2',     RundownMarketMap::explicitPeriodKey(1153, 'tennis_atp'));
});

// ── Negative cases (no cross-sport bleed) ────────────────────────────────

TestRunner::run('negative: NBA-only period_token rejected on baseball', function (): void {
    // 981 has period_token=1st_quarter which baseball doesn't have.
    TestRunner::assertEquals(null, RundownMarketMap::explicitPeriodKey(981, 'baseball_mlb'));
});

TestRunner::run('negative: MLB inning token rejected on basketball', function (): void {
    // 769 has period_token=1st_5_innings which basketball doesn't have.
    TestRunner::assertEquals(null, RundownMarketMap::explicitPeriodKey(769, 'basketball_nba'));
});

TestRunner::run('negative: tennis set token rejected on football', function (): void {
    TestRunner::assertEquals(null, RundownMarketMap::explicitPeriodKey(1150, 'americanfootball_nfl'));
});

TestRunner::run('negative: missing sportKey returns null (refuse to guess)', function (): void {
    TestRunner::assertEquals(null, RundownMarketMap::explicitPeriodKey(981, null));
    TestRunner::assertEquals(null, RundownMarketMap::explicitPeriodKey(981, ''));
});

TestRunner::run('negative: unmapped market_id returns null', function (): void {
    TestRunner::assertEquals(null, RundownMarketMap::explicitPeriodKey(99999, 'basketball_nba'));
});

// ── keyForCoreWithPeriod cleanup ─────────────────────────────────────────

TestRunner::run('keyForCoreWithPeriod: live in-play core variant returns null (route via bookmakers)', function (): void {
    // market_id=41/42/43/96 with period_id=7 = full-game live odds, NOT
    // a period extra. Mapper must NOT emit `h2h_7_innings` or similar.
    TestRunner::assertEquals(null, RundownMarketMap::keyForCoreWithPeriod(41, 7, 'baseball_mlb'));
    TestRunner::assertEquals(null, RundownMarketMap::keyForCoreWithPeriod(42, 7, 'basketball_nba'));
    TestRunner::assertEquals(null, RundownMarketMap::keyForCoreWithPeriod(43, 7, 'icehockey_nhl'));
    TestRunner::assertEquals(null, RundownMarketMap::keyForCoreWithPeriod(96, 7, 'baseball_mlb'));
});

TestRunner::run('keyForCoreWithPeriod: legacy hockey/soccer core-with-period fallback still works', function (): void {
    TestRunner::assertEquals('h2h_h1', RundownMarketMap::keyForCoreWithPeriod(1, 1, 'soccer_epl'));
    TestRunner::assertEquals('h2h_p1', RundownMarketMap::keyForCoreWithPeriod(1, 1, 'icehockey_nhl'));
});

TestRunner::run('keyForCoreWithPeriod: MLB period_id=5/7 no longer mis-mapped', function (): void {
    // Old code produced `h2h_5_innings` / `h2h_7_innings` from
    // market_id=1 with period_id=5/7 — those were never legitimate
    // Rundown signals. The cleanup deletes that arm entirely.
    TestRunner::assertEquals(null, RundownMarketMap::keyForCoreWithPeriod(1, 5, 'baseball_mlb'));
    TestRunner::assertEquals(null, RundownMarketMap::keyForCoreWithPeriod(1, 7, 'baseball_mlb'));
});

// ── isLiveCoreVariant guard ──────────────────────────────────────────────

TestRunner::run('isLiveCoreVariant: identifies 41/42/43/96 only', function (): void {
    TestRunner::assertTrue(RundownMarketMap::isLiveCoreVariant(41));
    TestRunner::assertTrue(RundownMarketMap::isLiveCoreVariant(42));
    TestRunner::assertTrue(RundownMarketMap::isLiveCoreVariant(43));
    TestRunner::assertTrue(RundownMarketMap::isLiveCoreVariant(96));
    TestRunner::assertFalse(RundownMarketMap::isLiveCoreVariant(1));
    TestRunner::assertFalse(RundownMarketMap::isLiveCoreVariant(94));
    TestRunner::assertFalse(RundownMarketMap::isLiveCoreVariant(981));
});
