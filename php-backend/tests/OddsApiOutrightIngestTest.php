<?php

declare(strict_types=1);

/**
 * Locks OddsApiSyncService::buildOutrightDoc — The Odds API → `outrights`
 * table doc builder (the SOLE futures writer after the Rundown outrights
 * pipeline was retired 2026-07-05).
 *
 * MONEY-CRITICAL: outrights.price is RAW AMERICAN (450 / -150), never
 * decimal. The odds-inflation emergency fix depends on exactly ONE
 * American→decimal conversion happening at each reader boundary — these
 * tests assert the builder stores verbatim AND that the stored value runs
 * through the real placement converter (SportsbookBetSupport::
 * outrightPriceToOdds) to the correct decimal.
 */

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
        public function __construct(string $message, int $code = 0, private array $extra = [])
        {
            parent::__construct($message, $code);
        }
    }
}
if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, ?string $default = null): ?string
        {
            if (array_key_exists($key, $_ENV)) {
                return $_ENV[$key];
            }
            $v = getenv($key);
            return $v === false ? $default : $v;
        }
    }
}
if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return '2026-07-05T12:00:00+00:00'; }
        public static function id(string $id): string { return $id; }
    }
}
if (!class_exists('SportsMatchStatus')) {
    class SportsMatchStatus
    {
        public static function effectiveStatus(array $match): string
        {
            return (string) ($match['effectiveStatus'] ?? $match['status'] ?? 'pending');
        }
    }
}
if (!class_exists('PlayerPropSettlement')) {
    class PlayerPropSettlement
    {
        public static function isGradableProp(string $marketType): bool { return false; }
        public static function grade(array $selection, array $stats): string { return 'pending'; }
    }
}

require_once dirname(__DIR__) . '/src/OddsMarketCatalog.php';
require_once dirname(__DIR__) . '/src/SportsbookBetSupport.php';
require_once dirname(__DIR__) . '/src/RundownSportMap.php';
require_once dirname(__DIR__) . '/src/RundownMarketMap.php';
require_once dirname(__DIR__) . '/src/RundownAffiliateMap.php';
require_once dirname(__DIR__) . '/src/RundownEventMapper.php';
require_once dirname(__DIR__) . '/src/OddsApiAllowlist.php';
require_once dirname(__DIR__) . '/src/OddsApiEventMapper.php';
require_once dirname(__DIR__) . '/src/OddsApiClient.php';
require_once dirname(__DIR__) . '/src/OddsApiSyncService.php';

/** One outright event in The Odds API's real response shape. */
function otaEvent(array $bookmakers, string $id = 'fut123'): array
{
    return [
        'id'            => $id,
        'sport_key'     => 'golf_masters_tournament_winner',
        'sport_title'   => 'Masters Tournament Winner',
        'commence_time' => '2027-04-08T11:00:00Z',
        'home_team'     => null,
        'away_team'     => null,
        'bookmakers'    => $bookmakers,
    ];
}

function otaBook(string $key, array $outcomes): array
{
    return [
        'key'     => $key,
        'title'   => ucfirst($key),
        'markets' => [['key' => 'outrights', 'outcomes' => $outcomes]],
    ];
}

/** name → raw stored price from the doc's single synthetic book. */
function otaOutcomesByName(?array $doc): array
{
    $out = [];
    foreach (($doc['bookmakers'][0]['markets'][0]['outcomes'] ?? []) as $o) {
        $out[$o['name']] = $o['price'];
    }
    return $out;
}

TestRunner::run('outright ingest: RAW AMERICAN stored verbatim — never converted', function (): void {
    $doc = OddsApiSyncService::buildOutrightDoc(otaEvent([
        otaBook('draftkings', [
            ['name' => 'Scottie Scheffler', 'price' => 450],
            ['name' => 'Rory McIlroy',      'price' => -150],
            ['name' => 'Jon Rahm',          'price' => 1200.0], // float from JSON — collapses to int
        ]),
    ]), 'golf_masters_tournament_winner');
    $byName = otaOutcomesByName($doc);
    TestRunner::assertEquals(450,  $byName['Scottie Scheffler'], '+450 stored as int 450 — NOT 5.5');
    TestRunner::assertEquals(-150, $byName['Rory McIlroy'],      '-150 stored as int -150 — NOT 1.67');
    TestRunner::assertEquals(1200, $byName['Jon Rahm'],          '1200.0 float collapses to int 1200, value unchanged');

    // End-to-end boundary conversion: the stored raw price through the REAL
    // placement converter yields the correct decimal, exactly once.
    $p = SportsbookBetSupport::outrightPriceToOdds($byName['Scottie Scheffler']);
    TestRunner::assertEquals(450, $p['american'], 'placement boundary reads it back as +450');
    TestRunner::assertEqualsFloat(5.5, $p['decimal'], 'placement boundary: +450 → 5.50 decimal', 0.001);
    $p = SportsbookBetSupport::outrightPriceToOdds($byName['Rory McIlroy']);
    TestRunner::assertEqualsFloat(1.6667, $p['decimal'], 'placement boundary: -150 → 1.6667 decimal', 0.001);
});

TestRunner::run('outright ingest: decimal leak is dropped, never stored', function (): void {
    // 1.91 pretending to be a price: dropped by the |american| >= 100 guard;
    // only one real contender left → whole board refused.
    $doc = OddsApiSyncService::buildOutrightDoc(otaEvent([
        otaBook('draftkings', [
            ['name' => 'Player A', 'price' => 1.91],
            ['name' => 'Player B', 'price' => 450],
        ]),
    ]), 'golf_masters_tournament_winner');
    TestRunner::assertEquals(null, $doc, 'decimal-looking price dropped → <2 contenders → null');

    // With three contenders, the leak is dropped but the board survives.
    $doc = OddsApiSyncService::buildOutrightDoc(otaEvent([
        otaBook('draftkings', [
            ['name' => 'Player A', 'price' => 1.91],
            ['name' => 'Player B', 'price' => 450],
            ['name' => 'Player C', 'price' => -200],
        ]),
    ]), 'golf_masters_tournament_winner');
    $byName = otaOutcomesByName($doc);
    TestRunner::assertEquals(false, isset($byName['Player A']), 'leaked-decimal contender excluded');
    TestRunner::assertEquals(2, count($byName), 'remaining priced contenders kept');
});

TestRunner::run('outright ingest: >=2 priced contenders rule', function (): void {
    TestRunner::assertEquals(null, OddsApiSyncService::buildOutrightDoc(otaEvent([]), 'golf_masters_tournament_winner'), 'no books → null');
    TestRunner::assertEquals(null, OddsApiSyncService::buildOutrightDoc(otaEvent([
        otaBook('draftkings', [['name' => 'Lone Player', 'price' => 200]]),
    ]), 'golf_masters_tournament_winner'), 'single contender → null');
    TestRunner::assertEquals(null, OddsApiSyncService::buildOutrightDoc(otaEvent([
        otaBook('draftkings', [['name' => 'A', 'price' => 0], ['name' => 'B', 'price' => 0]]),
    ]), 'golf_masters_tournament_winner'), 'zero prices dropped → null');
});

TestRunner::run('outright ingest: preferred book wins, first-seen breaks ties', function (): void {
    $_ENV['SPORTSBOOK_PREFERRED_BOOKS'] = 'betmgm,draftkings';
    // draftkings listed first in the feed, but betmgm is preferred → betmgm's price wins.
    $doc = OddsApiSyncService::buildOutrightDoc(otaEvent([
        otaBook('draftkings', [['name' => 'Scottie Scheffler', 'price' => 500], ['name' => 'Rory McIlroy', 'price' => 900]]),
        otaBook('betmgm',     [['name' => 'Scottie Scheffler', 'price' => 450], ['name' => 'Rory McIlroy', 'price' => 950]]),
    ]), 'golf_masters_tournament_winner');
    $byName = otaOutcomesByName($doc);
    TestRunner::assertEquals(450, $byName['Scottie Scheffler'], 'preferred book (betmgm) price wins over feed order');
    unset($_ENV['SPORTSBOOK_PREFERRED_BOOKS']);

    // No preference configured → first-seen wins (deterministic, never best-for-player).
    $doc = OddsApiSyncService::buildOutrightDoc(otaEvent([
        otaBook('bookx', [['name' => 'Scottie Scheffler', 'price' => 500], ['name' => 'Rory McIlroy', 'price' => 900]]),
        otaBook('booky', [['name' => 'Scottie Scheffler', 'price' => 600], ['name' => 'Rory McIlroy', 'price' => 950]]),
    ]), 'golf_masters_tournament_winner');
    $byName = otaOutcomesByName($doc);
    TestRunner::assertEquals(500, $byName['Scottie Scheffler'], 'unranked books: first-seen price kept, NOT the higher +600');
});

TestRunner::run('outright ingest: identity + doc shape', function (): void {
    $doc = OddsApiSyncService::buildOutrightDoc(otaEvent([
        otaBook('draftkings', [['name' => 'A', 'price' => 200], ['name' => 'B', 'price' => -300]]),
    ], 'ev9'), 'golf_masters_tournament_winner');
    TestRunner::assertEquals('toa_ev9', $doc['eventId'], 'eventId is toa_-namespaced (no Rundown collision)');
    TestRunner::assertEquals('theoddsapi', $doc['oddsSource'], 'provider tag');
    TestRunner::assertEquals('open', $doc['status'], 'new boards open');
    TestRunner::assertEquals('Masters Tournament Winner', $doc['eventName'], 'eventName from sport_title');
    TestRunner::assertEquals('theoddsapi', $doc['bookmakers'][0]['key'], 'single synthetic book');
    TestRunner::assertEquals('outrights', $doc['bookmakers'][0]['markets'][0]['key'], 'market discriminator readers match on');
    TestRunner::assertEquals(2, $doc['outcomeCount'], 'outcomeCount mirrors outcomes');

    TestRunner::assertEquals(null, OddsApiSyncService::buildOutrightDoc(['id' => '', 'bookmakers' => []], 'golf_masters_tournament_winner'), 'missing event id → null');
    TestRunner::assertEquals(null, OddsApiSyncService::buildOutrightDoc(otaEvent([
        otaBook('draftkings', [['name' => 'A', 'price' => 200], ['name' => 'B', 'price' => -300]]),
    ]), ''), 'blank sportKey → null');
});

// ── House juice rounding on the RAW-AMERICAN outright path ─────────────────
// outrights.price bypasses the matches-board decimal choke point, so the
// SPORTSBOOK_JUICE_ROUND_ENABLED grid is applied at THIS storage point;
// display/placement/settlement read the stored integer and inherit it with
// no second rounding. Negative rounds AWAY from zero, positive TOWARD zero.
TestRunner::run('outright ingest: juice rounding rounds the stored American, house-favorable', function (): void {
    $origGetenv = getenv('SPORTSBOOK_JUICE_ROUND_ENABLED');
    $origEnv = $_ENV['SPORTSBOOK_JUICE_ROUND_ENABLED'] ?? null;
    putenv('SPORTSBOOK_JUICE_ROUND_ENABLED=true');
    $_ENV['SPORTSBOOK_JUICE_ROUND_ENABLED'] = 'true';
    try {
        $doc = OddsApiSyncService::buildOutrightDoc(otaEvent([
            otaBook('draftkings', [
                ['name' => 'Scottie Scheffler', 'price' => 453],   // +453 → +450 (toward zero)
                ['name' => 'Rory McIlroy',      'price' => -152],  // -152 → -155 (away from zero)
                ['name' => 'Jon Rahm',          'price' => 1200],  // on grid → unchanged
            ]),
        ]), 'golf_masters_tournament_winner');
        $byName = otaOutcomesByName($doc);
        TestRunner::assertEquals(450,  $byName['Scottie Scheffler'], '+453 stored as +450');
        TestRunner::assertEquals(-155, $byName['Rory McIlroy'],      '-152 stored as -155');
        TestRunner::assertEquals(1200, $byName['Jon Rahm'],          'on-grid +1200 unchanged');
        // Boundary conversion still exactly once, off the ROUNDED integer.
        $p = SportsbookBetSupport::outrightPriceToOdds($byName['Rory McIlroy']);
        TestRunner::assertEquals(-155, $p['american'], 'placement reads back the rounded price');
        TestRunner::assertEqualsFloat(1.0 + 100.0 / 155.0, $p['decimal'], 'decimal derives from -155, converted once', 0.0001);
        // The anti-inflation guard still runs FIRST: a leaked decimal is
        // dropped, never "repaired" onto the grid by the rounding step.
        $doc = OddsApiSyncService::buildOutrightDoc(otaEvent([
            otaBook('draftkings', [
                ['name' => 'Player A', 'price' => 1.91],
                ['name' => 'Player B', 'price' => 453],
                ['name' => 'Player C', 'price' => -200],
            ]),
        ]), 'golf_masters_tournament_winner');
        $byName = otaOutcomesByName($doc);
        TestRunner::assertEquals(false, isset($byName['Player A']), 'decimal leak still dropped with rounding on');
    } finally {
        if ($origGetenv === false) { putenv('SPORTSBOOK_JUICE_ROUND_ENABLED'); } else { putenv('SPORTSBOOK_JUICE_ROUND_ENABLED=' . $origGetenv); }
        if ($origEnv === null) { unset($_ENV['SPORTSBOOK_JUICE_ROUND_ENABLED']); } else { $_ENV['SPORTSBOOK_JUICE_ROUND_ENABLED'] = $origEnv; }
    }
});

TestRunner::run('outright ingest: juice rounding OFF (default) keeps the verbatim contract', function (): void {
    $doc = OddsApiSyncService::buildOutrightDoc(otaEvent([
        otaBook('draftkings', [
            ['name' => 'Scottie Scheffler', 'price' => 453],
            ['name' => 'Rory McIlroy',      'price' => -152],
        ]),
    ]), 'golf_masters_tournament_winner');
    $byName = otaOutcomesByName($doc);
    TestRunner::assertEquals(453,  $byName['Scottie Scheffler'], 'flag off → +453 verbatim');
    TestRunner::assertEquals(-152, $byName['Rory McIlroy'],      'flag off → -152 verbatim');
});
