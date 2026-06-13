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
    Env::$vals = []; // flag defaults to enabled

    $snap = [
        'sportKey'     => 'baseball_mlb',
        'homePitcher'  => ['id' => 777, 'name' => 'B Ashcraft', 'hand' => 'R'],
        'awayPitcher'  => ['id' => 555, 'name' => 'S Alcantara', 'hand' => 'R'],
    ];
    $matchSame = $snap; // pitchers unchanged at settlement
    $matchAwayChanged = array_merge($snap, ['awayPitcher' => ['id' => 999, 'name' => 'Sub', 'hand' => 'L']]);

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

    // Kill switch disables everything.
    Env::$vals = ['MLB_LISTED_PITCHER_VOID_ENABLED' => '0'];
    TestRunner::assertFalse(
        SportsbookBetSupport::listedPitcherVoid($matchAwayChanged, $baseSel),
        'kill switch off → no void'
    );
    Env::$vals = [];
});
