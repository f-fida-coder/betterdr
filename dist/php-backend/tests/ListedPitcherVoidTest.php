<?php

declare(strict_types=1);

/**
 * Unit tests for the MLB listed-pitcher void rule:
 *   - RundownEventMapper pitcher extraction (id/name/hand)
 *   - SportsbookBetSupport::listedPitcherVoid branch table (money-critical:
 *     a wrong true here refunds a real bet; a wrong false denies a refund).
 */

require_once dirname(__DIR__) . '/src/RundownAffiliateMap.php';
require_once dirname(__DIR__) . '/src/RundownSportMap.php';
require_once dirname(__DIR__) . '/src/RundownMarketMap.php';
require_once dirname(__DIR__) . '/src/RundownEventMapper.php';

if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return '2026-06-13T12:00:00+00:00'; }
        public static function id(string $v): string { return $v; }
    }
}

// Env stub — listedPitcherVoid reads MLB_LISTED_PITCHER_VOID_ENABLED.
if (!class_exists('Env')) {
    class Env
    {
        public static array $vals = [];
        public static function get(string $k, mixed $d = null): mixed { return self::$vals[$k] ?? $d; }
    }
}
// SportsMatchStatus stub — only effectiveStatus is referenced by methods we
// don't call here, but the class must exist for the file to load cleanly.
if (!class_exists('SportsMatchStatus')) {
    class SportsMatchStatus
    {
        public static function effectiveStatus(array $m): string { return (string) ($m['status'] ?? ''); }
    }
}

require_once dirname(__DIR__) . '/src/SportsbookBetSupport.php';

TestRunner::run('RundownEventMapper pitcher extraction', function () {
    // Minimal MLB event with both pitchers listed.
    $event = [
        'event_id'   => 'evt-1',
        'sport_id'   => 3, // MLB
        'event_date' => '2026-06-13T22:40:00Z',
        'teams'      => [
            ['team_id' => 10, 'name' => 'Miami', 'abbreviation' => 'MIA', 'is_away' => true, 'is_home' => false],
            ['team_id' => 20, 'name' => 'Pittsburgh', 'abbreviation' => 'PIT', 'is_away' => false, 'is_home' => true],
        ],
        'score'      => ['event_status' => 'STATUS_SCHEDULED'],
        'schedule'   => ['event_name' => 'Miami at Pittsburgh'],
        'markets'    => [],
        'pitcher_away' => ['id' => 555, 'name' => 'Sandy Alcantara', 'throws_right_handed' => true, 'throws_left_handed' => null],
        'pitcher_home' => ['id' => 777, 'name' => 'Braxton Ashcraft', 'throws_right_handed' => true],
    ];
    $doc = RundownEventMapper::toMatchDoc($event, 'baseball_mlb');
    TestRunner::assertNotNull($doc, 'maps MLB event');
    TestRunner::assertEquals(555, $doc['awayPitcher']['id'], 'away pitcher id');
    TestRunner::assertEquals('Sandy Alcantara', $doc['awayPitcher']['name'], 'away pitcher name');
    TestRunner::assertEquals('R', $doc['awayPitcher']['hand'], 'away pitcher hand R');
    TestRunner::assertEquals('R', $doc['homePitcher']['hand'], 'home pitcher hand R');

    // No pitcher object → null (non-baseball / not announced).
    $event2 = $event;
    unset($event2['pitcher_away'], $event2['pitcher_home']);
    $doc2 = RundownEventMapper::toMatchDoc($event2, 'baseball_mlb');
    TestRunner::assertNull($doc2['awayPitcher'], 'null when no pitcher listed');
});

TestRunner::run('listedPitcherVoid branch table', function () {
    // Real Env::get reads $_ENV first; unset → falls back to default '1' (enabled).
    unset($_ENV['MLB_LISTED_PITCHER_VOID_ENABLED'], $_SERVER['MLB_LISTED_PITCHER_VOID_ENABLED']);
    putenv('MLB_LISTED_PITCHER_VOID_ENABLED');

    // startTime = first pitch; pitchersSyncedAt AFTER it means the settlement
    // doc's starters were confirmed post-first-pitch (the void-hardening gate).
    $gameStart = '2026-06-13T22:40:00+00:00';
    $freshSync = '2026-06-13T23:30:00+00:00'; // > start → confirmed actual starter
    $snap = [
        'sportKey'     => 'baseball_mlb',
        'startTime'    => $gameStart,
        'homePitcher'  => ['id' => 777, 'name' => 'B Ashcraft', 'hand' => 'R'],
        'awayPitcher'  => ['id' => 555, 'name' => 'S Alcantara', 'hand' => 'R'],
    ];
    $matchSame = array_merge($snap, ['pitchersSyncedAt' => $freshSync]); // pitchers unchanged at settlement
    $matchAwayChanged = array_merge($snap, ['pitchersSyncedAt' => $freshSync, 'awayPitcher' => ['id' => 999, 'name' => 'Sub', 'hand' => 'L']]);

    $baseSel = ['marketType' => 'h2h', 'matchSnapshot' => $snap, 'pitcherAction' => ['home' => false, 'away' => false]];

    // No change → no void.
    TestRunner::assertFalse(
        SportsbookBetSupport::listedPitcherVoid($matchSame, $baseSel),
        'same pitchers → no void'
    );

    // Away pitcher changed, no action → void.
    TestRunner::assertTrue(
        SportsbookBetSupport::listedPitcherVoid($matchAwayChanged, $baseSel),
        'away changed, no action → void'
    );

    // Away pitcher changed but player took Action on away → no void.
    $selActionAway = array_merge($baseSel, ['pitcherAction' => ['home' => false, 'away' => true]]);
    TestRunner::assertFalse(
        SportsbookBetSupport::listedPitcherVoid($matchAwayChanged, $selActionAway),
        'away changed, away action → no void'
    );

    // Player props are exempt even on a change.
    $selProp = array_merge($baseSel, ['marketType' => 'pitcher_strikeouts']);
    TestRunner::assertFalse(
        SportsbookBetSupport::listedPitcherVoid($matchAwayChanged, $selProp),
        'player prop → no void'
    );

    // Missing current id (settlement has no pitcher) → never void on a guess.
    $matchMissing = array_merge($snap, ['awayPitcher' => null]);
    TestRunner::assertFalse(
        SportsbookBetSupport::listedPitcherVoid($matchMissing, $baseSel),
        'missing current pitcher → no void'
    );

    // Non-baseball → rule never applies.
    $nbaSnap = array_merge($snap, ['sportKey' => 'basketball_nba']);
    $nbaSel = array_merge($baseSel, ['matchSnapshot' => $nbaSnap]);
    TestRunner::assertFalse(
        SportsbookBetSupport::listedPitcherVoid(array_merge($matchAwayChanged, ['sportKey' => 'basketball_nba']), $nbaSel),
        'non-baseball → no void'
    );

    // Void hardening: a pitcher id synced BEFORE first pitch is a pre-game
    // probable, not the confirmed starter — never void off it.
    $matchStale = array_merge($matchAwayChanged, ['pitchersSyncedAt' => '2026-06-13T20:00:00+00:00']);
    TestRunner::assertFalse(
        SportsbookBetSupport::listedPitcherVoid($matchStale, $baseSel),
        'pitchers synced pre-first-pitch → no void (stale probable)'
    );

    // No pitcher-sync stamp at all → cannot confirm the actual starter → no void.
    $matchNoStamp = array_merge($matchAwayChanged, ['pitchersSyncedAt' => '']);
    TestRunner::assertFalse(
        SportsbookBetSupport::listedPitcherVoid($matchNoStamp, $baseSel),
        'missing pitchersSyncedAt → no void'
    );

    // Kill switch disables everything.
    $_ENV['MLB_LISTED_PITCHER_VOID_ENABLED'] = '0';
    TestRunner::assertFalse(
        SportsbookBetSupport::listedPitcherVoid($matchAwayChanged, $baseSel),
        'kill switch off → no void'
    );
    unset($_ENV['MLB_LISTED_PITCHER_VOID_ENABLED'], $_SERVER['MLB_LISTED_PITCHER_VOID_ENABLED']);
    putenv('MLB_LISTED_PITCHER_VOID_ENABLED');
});

TestRunner::run('baseballOfficialGameStatus 8½/9 rule', function () {
    unset($_ENV['MLB_OFFICIAL_GAME_RULE_ENABLED'], $_SERVER['MLB_OFFICIAL_GAME_RULE_ENABLED']);
    putenv('MLB_OFFICIAL_GAME_RULE_ENABLED');

    $mlb = static fn(array $score): array => ['sportKey' => 'baseball_mlb', 'score' => $score];

    // Full 9 innings via game_period → official.
    TestRunner::assertEquals('official',
        SportsbookBetSupport::baseballOfficialGameStatus($mlb(['game_period' => 9])),
        '9 innings (game_period) → official');

    // 9 innings via the per-inning line score length → official.
    TestRunner::assertEquals('official',
        SportsbookBetSupport::baseballOfficialGameStatus($mlb([
            'score_home_by_period' => [0,1,0,0,2,0,0,1,0],
            'score_away_by_period' => [0,0,0,1,0,0,0,0,0],
        ])),
        '9-inning line score → official');

    // 8½: home ahead, bottom 9th not batted (home 8 entries, away 9, period 9).
    TestRunner::assertEquals('official',
        SportsbookBetSupport::baseballOfficialGameStatus($mlb([
            'game_period' => 9,
            'score_home_by_period' => [1,0,0,0,1,0,0,1],
            'score_away_by_period' => [0,0,0,0,0,1,0,0,0],
        ])),
        '8½ with home ahead → official');

    // Extra innings → always official.
    TestRunner::assertEquals('official',
        SportsbookBetSupport::baseballOfficialGameStatus($mlb(['game_period' => 11])),
        'extra innings → official');

    // Rain-shortened to 7 → positively short → void.
    TestRunner::assertEquals('short',
        SportsbookBetSupport::baseballOfficialGameStatus($mlb([
            'game_period' => 7,
            'score_home_by_period' => [0,1,0,0,0,2,0],
            'score_away_by_period' => [0,0,1,0,0,0,0],
        ])),
        '7 innings → short (no action)');

    // No inning signal at all → unknown (manual review, never auto-void).
    TestRunner::assertEquals('unknown',
        SportsbookBetSupport::baseballOfficialGameStatus($mlb(['score_home' => 4, 'score_away' => 2])),
        'no inning data → unknown');

    // Non-baseball → rule N/A.
    TestRunner::assertEquals('official',
        SportsbookBetSupport::baseballOfficialGameStatus(['sportKey' => 'basketball_nba', 'score' => ['game_period' => 4]]),
        'non-baseball → official (N/A)');

    // Kill switch → grade as before regardless of innings.
    $_ENV['MLB_OFFICIAL_GAME_RULE_ENABLED'] = '0';
    TestRunner::assertEquals('official',
        SportsbookBetSupport::baseballOfficialGameStatus($mlb(['game_period' => 5])),
        'kill switch off → official');
    unset($_ENV['MLB_OFFICIAL_GAME_RULE_ENABLED'], $_SERVER['MLB_OFFICIAL_GAME_RULE_ENABLED']);
    putenv('MLB_OFFICIAL_GAME_RULE_ENABLED');
});

TestRunner::run('selectionResult MLB official-game integration', function () {
    unset($_ENV['MLB_OFFICIAL_GAME_RULE_ENABLED'], $_SERVER['MLB_OFFICIAL_GAME_RULE_ENABLED']);
    putenv('MLB_OFFICIAL_GAME_RULE_ENABLED');

    $base = [
        'sportKey' => 'baseball_mlb',
        'status'   => 'finished', // SportsMatchStatus stub returns this verbatim
        'homeTeam' => 'Pirates',
        'awayTeam' => 'Marlins',
    ];

    // Full 9, home wins ML → graded won (rule does not interfere).
    $full = array_merge($base, [
        'score' => [
            'score_home' => 5, 'score_away' => 3, 'game_period' => 9,
            'score_home_by_period' => [0,1,0,2,0,0,1,1,0],
            'score_away_by_period' => [0,0,1,0,0,1,0,1,0],
        ],
    ]);
    TestRunner::assertEquals('won',
        SportsbookBetSupport::selectionResult($full, ['marketType' => 'h2h', 'selection' => 'Pirates']),
        'official 9-inning game grades normally');

    // Called after 7 → totals leg voids (no action).
    $short = array_merge($base, [
        'score' => [
            'score_home' => 2, 'score_away' => 1, 'game_period' => 7,
            'score_home_by_period' => [0,1,0,0,0,1,0],
            'score_away_by_period' => [0,0,1,0,0,0,0],
        ],
    ]);
    TestRunner::assertEquals('void',
        SportsbookBetSupport::selectionResult($short, ['marketType' => 'totals', 'selection' => 'Over', 'point' => 8.5]),
        'shortened <9 innings → void');

    // Finished but no inning signal → pending for manual review (no auto-void).
    $ambiguous = array_merge($base, [
        'score' => ['score_home' => 4, 'score_away' => 2],
    ]);
    TestRunner::assertEquals('pending',
        SportsbookBetSupport::selectionResult($ambiguous, ['marketType' => 'h2h', 'selection' => 'Pirates']),
        'finished, no innings → pending (manual review)');

    unset($_ENV['MLB_OFFICIAL_GAME_RULE_ENABLED'], $_SERVER['MLB_OFFICIAL_GAME_RULE_ENABLED']);
    putenv('MLB_OFFICIAL_GAME_RULE_ENABLED');
});
