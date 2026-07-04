<?php

declare(strict_types=1);

/**
 * OddsApiEventMapper::toMatchDoc() — proves the supplemental feed lands in
 * the EXACT doc shape the existing pipeline grades, including 3-way soccer
 * h2h (Draw as a third outcome of the plain 'h2h' market). One suite runs a
 * mapped doc through the REAL SportsbookBetSupport grader end-to-end, and
 * one covers the post-kickoff hard-suspend predicate.
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

/** Trimmed real-shape The Odds API event: 3-way h2h + spreads + totals, two books. */
function oamFixtureEvent(): array
{
    return [
        'id'            => 'evt123abc',
        'sport_key'     => 'soccer_efl_champ',
        'sport_title'   => 'Championship',
        'commence_time' => '2026-07-06T14:00:00Z',
        'home_team'     => 'Leeds United',
        'away_team'     => 'Norwich City',
        'bookmakers'    => [
            [
                // Pinnacle first with a QUARTER Asian main — must be promoted
                // to DraftKings' clean set below.
                'key' => 'pinnacle', 'title' => 'Pinnacle', 'last_update' => '2026-07-05T11:59:00Z',
                'markets' => [
                    ['key' => 'spreads', 'outcomes' => [
                        ['name' => 'Leeds United', 'price' => -102, 'point' => -0.25],
                        ['name' => 'Norwich City', 'price' => -108, 'point' => 0.25],
                    ]],
                ],
            ],
            [
                'key' => 'draftkings', 'title' => 'DraftKings', 'last_update' => '2026-07-05T11:58:00Z',
                'markets' => [
                    ['key' => 'h2h', 'outcomes' => [
                        ['name' => 'Leeds United', 'price' => -110],
                        ['name' => 'Norwich City', 'price' => 240],
                        ['name' => 'Draw',          'price' => 230],
                    ]],
                    ['key' => 'spreads', 'outcomes' => [
                        ['name' => 'Leeds United', 'price' => -105, 'point' => -0.5],
                        ['name' => 'Norwich City', 'price' => -115, 'point' => 0.5],
                    ]],
                    ['key' => 'totals', 'outcomes' => [
                        ['name' => 'Over',  'price' => -110, 'point' => 2.5],
                        ['name' => 'Under', 'price' => -110, 'point' => 2.5],
                    ]],
                    // Off-scope market key: must drop.
                    ['key' => 'btts', 'outcomes' => [['name' => 'Yes', 'price' => -120]]],
                ],
            ],
        ],
    ];
}

function oamMarket(array $doc, string $book, string $marketKey): ?array
{
    foreach (($doc['odds']['bookmakers'] ?? []) as $bm) {
        if (($bm['key'] ?? '') !== $book) continue;
        foreach (($bm['markets'] ?? []) as $m) {
            if (($m['key'] ?? '') === $marketKey) return $m;
        }
    }
    return null;
}

TestRunner::run('oddsapi mapper: identity, namespacing, doc shell', function (): void {
    $doc = OddsApiEventMapper::toMatchDoc(oamFixtureEvent(), 'soccer_efl_champ');
    TestRunner::assertEquals('toa_evt123abc', $doc['externalId'], 'externalId is toa_-prefixed');
    TestRunner::assertEquals(substr(sha1('theoddsapi:evt123abc'), 0, 24), $doc['id'], 'deterministic provider-prefixed id');
    TestRunner::assertEquals(24, strlen((string) $doc['id']), 'id is 24 hex chars');
    TestRunner::assertEquals(false, $doc['id'] === RundownEventMapper::deterministicMatchId('evt123abc'), 'can never collide with a Rundown id for the same raw event id');
    TestRunner::assertEquals('theoddsapi', $doc['oddsSource'], 'provider tag');
    TestRunner::assertEquals('scheduled', $doc['status'], 'prematch-only status');
    TestRunner::assertEquals('soccer_efl_champ', $doc['sportKey'], 'sportKey preserved');
    TestRunner::assertEquals('EFL Championship', $doc['sport'], 'display name mapped');
    TestRunner::assertEquals('Leeds United', $doc['homeTeam'], 'homeTeam verbatim');
    TestRunner::assertEquals('Leeds United', $doc['homeTeamFull'], 'full name mirrors verbatim name');
    TestRunner::assertEquals('', $doc['homeTeamId'], 'no Rundown team id (no logo, by scope)');
    TestRunner::assertEquals([], $doc['extendedMarkets'], 'no extended markets from this feed');
    TestRunner::assertEquals([], $doc['playerProps'], 'no player props from this feed');
});

TestRunner::run('oddsapi mapper: 3-way h2h is a plain h2h market with Draw', function (): void {
    $doc = OddsApiEventMapper::toMatchDoc(oamFixtureEvent(), 'soccer_efl_champ');
    $h2h = oamMarket($doc, 'draftkings', 'h2h');
    TestRunner::assertEquals(3, count($h2h['outcomes']), 'three outcomes: home, away, Draw');
    $byName = [];
    foreach ($h2h['outcomes'] as $o) { $byName[$o['name']] = $o; }
    TestRunner::assertEquals(true, isset($byName['Draw']), 'Draw outcome present under the h2h key');
    TestRunner::assertEqualsFloat(1.9091, (float) $byName['Leeds United']['price'], 'home -110 → 1.909 decimal', 0.001);
    TestRunner::assertEqualsFloat(3.4, (float) $byName['Norwich City']['price'], 'away +240 → 3.40 decimal', 0.001);
    TestRunner::assertEqualsFloat(3.3, (float) $byName['Draw']['price'], 'Draw +230 → 3.30 decimal', 0.001);
    TestRunner::assertEquals(null, oamMarket($doc, 'draftkings', 'btts'), 'off-scope market key dropped');
    TestRunner::assertEquals(null, oamMarket($doc, 'draftkings', 'h2h_3_way'), 'no new market key invented');
});

TestRunner::run('oddsapi mapper: totals + quarter-line promote', function (): void {
    $doc = OddsApiEventMapper::toMatchDoc(oamFixtureEvent(), 'soccer_efl_champ');
    $totals = oamMarket($doc, 'draftkings', 'totals');
    TestRunner::assertEquals(2, count($totals['outcomes']), 'Over + Under');
    TestRunner::assertEqualsFloat(2.5, (float) $totals['outcomes'][0]['point'], 'totals line preserved', 0.001);
    // Pinnacle's quarter (-0.25/+0.25) main must be replaced by DraftKings'
    // clean ±0.5 set (same interim policy as the Rundown soccer board).
    $pinSpreads = oamMarket($doc, 'pinnacle', 'spreads');
    $points = array_map(static fn ($o) => (float) $o['point'], $pinSpreads['outcomes']);
    sort($points);
    TestRunner::assertEquals([-0.5, 0.5], $points, 'quarter main promoted to the clean whole/half line');
});

TestRunner::run('oddsapi mapper: refusals — past kickoff, no books, bad prices, foreign names', function (): void {
    $ev = oamFixtureEvent();
    TestRunner::assertEquals(null, OddsApiEventMapper::toMatchDoc($ev, 'soccer_efl_champ', '2026-07-06T14:00:01+00:00'), 'at/past kickoff → null (prematch only)');

    $noBooks = $ev; $noBooks['bookmakers'] = [];
    TestRunner::assertEquals(null, OddsApiEventMapper::toMatchDoc($noBooks, 'soccer_efl_champ'), 'no priced markets → null (no empty-odds rows)');

    $badPrice = $ev;
    $badPrice['bookmakers'][1]['markets'][0]['outcomes'][0]['price'] = 1.91; // decimal leaked in
    $doc = OddsApiEventMapper::toMatchDoc($badPrice, 'soccer_efl_champ');
    $h2h = oamMarket($doc, 'draftkings', 'h2h');
    TestRunner::assertEquals(2, count($h2h['outcomes']), 'decimal-looking price dropped, never converted');

    $foreign = $ev;
    $foreign['bookmakers'][1]['markets'][0]['outcomes'][0]['name'] = 'Wrong Club FC';
    $doc = OddsApiEventMapper::toMatchDoc($foreign, 'soccer_efl_champ');
    $h2h = oamMarket($doc, 'draftkings', 'h2h');
    TestRunner::assertEquals(2, count($h2h['outcomes']), 'outcome name matching neither team nor Draw is dropped');
});

TestRunner::run('oddsapi mapper: isPastKickoff hard-suspend predicate', function (): void {
    $doc = OddsApiEventMapper::toMatchDoc(oamFixtureEvent(), 'soccer_efl_champ');
    $kickoffTs = strtotime('2026-07-06T14:00:00Z');

    TestRunner::assertEquals(false, OddsApiEventMapper::isPastKickoff($doc, $kickoffTs - 60), 'before kickoff → bettable');
    TestRunner::assertEquals(true, OddsApiEventMapper::isPastKickoff($doc, $kickoffTs), 'AT kickoff → suspended');
    TestRunner::assertEquals(true, OddsApiEventMapper::isPastKickoff($doc, $kickoffTs + 60), 'past kickoff → suspended');

    $noStart = $doc;
    $noStart['startTime'] = '';
    TestRunner::assertEquals(true, OddsApiEventMapper::isPastKickoff($noStart, $kickoffTs - 60), 'unparseable start on a theoddsapi row → fail closed');

    $rundownRow = $doc;
    $rundownRow['oddsSource'] = 'therundown';
    TestRunner::assertEquals(false, OddsApiEventMapper::isPastKickoff($rundownRow, $kickoffTs + 3600), 'Rundown rows are NEVER touched by this suspend');
});

TestRunner::run('oddsapi mapper: mapped doc grades in the REAL settlement engine', function (): void {
    $doc = OddsApiEventMapper::toMatchDoc(oamFixtureEvent(), 'soccer_efl_champ');

    // Simulate the match finishing 2-2 exactly as a real score sync would:
    // BOTH doc.status AND score.event_status must go terminal — the real
    // SportsMatchStatus::effectiveStatus() normalizes from the two together,
    // and a 'finished' status with a still-scheduled event_status is refused
    // (grades stay pending). The future settlement chunk must stamp both.
    $finished = $doc;
    $finished['status'] = 'finished';
    $finished['score']['event_status'] = 'STATUS_FINAL';
    $finished['score']['score_home'] = 2;
    $finished['score']['score_away'] = 2;

    $grade = static fn (array $sel): string =>
        SportsbookBetSupport::selectionResultDetailed($finished, $sel)['status'];

    TestRunner::assertEquals('won',  $grade(['selection' => 'Draw', 'marketType' => 'h2h']), '2-2: Draw leg WINS');
    TestRunner::assertEquals('void', $grade(['selection' => 'Leeds United', 'marketType' => 'h2h']), '2-2: home ML leg voids (2-way push rule)');
    TestRunner::assertEquals('won',  $grade(['selection' => 'Over', 'marketType' => 'totals', 'point' => 2.5]), '2-2: Over 2.5 wins (4 goals)');
    TestRunner::assertEquals('lost', $grade(['selection' => 'Under', 'marketType' => 'totals', 'point' => 2.5]), '2-2: Under 2.5 loses');

    $finished['score']['score_home'] = 3;
    $finished['score']['score_away'] = 1;
    $grade31 = static fn (array $sel): string =>
        SportsbookBetSupport::selectionResultDetailed($finished, $sel)['status'];
    TestRunner::assertEquals('won',  $grade31(['selection' => 'Leeds United', 'marketType' => 'h2h']), '3-1: home ML wins');
    TestRunner::assertEquals('lost', $grade31(['selection' => 'Draw', 'marketType' => 'h2h']), '3-1: Draw loses');
    TestRunner::assertEquals('lost', $grade31(['selection' => 'Norwich City', 'marketType' => 'h2h']), '3-1: away ML loses');
    TestRunner::assertEquals('won',  $grade31(['selection' => 'Leeds United', 'marketType' => 'spreads', 'point' => -0.5]), '3-1: home -0.5 covers');
});

TestRunner::run('oddsapi mapper: prematch soft freshness override', function (): void {
    $toa = ['oddsSource' => 'theoddsapi'];
    $rd  = ['oddsSource' => 'therundown'];

    TestRunner::assertEquals(120, OddsApiEventMapper::prematchSoftFreshnessSeconds($rd, 120), 'Rundown rows: default passes through UNTOUCHED');
    TestRunner::assertEquals(120, OddsApiEventMapper::prematchSoftFreshnessSeconds([], 120), 'untagged rows: default passes through');
    TestRunner::assertEquals(720, OddsApiEventMapper::prematchSoftFreshnessSeconds($toa, 120), 'theoddsapi rows: widened to 720s default');

    $_ENV['ODDS_API_PREMATCH_FRESHNESS_SECONDS'] = '3600';
    TestRunner::assertEquals(900, OddsApiEventMapper::prematchSoftFreshnessSeconds($toa, 120), 'config cannot stretch past the 900s hard cap');
    $_ENV['ODDS_API_PREMATCH_FRESHNESS_SECONDS'] = '60';
    TestRunner::assertEquals(120, OddsApiEventMapper::prematchSoftFreshnessSeconds($toa, 120), 'override never narrows below the platform default');
    unset($_ENV['ODDS_API_PREMATCH_FRESHNESS_SECONDS']);
});

TestRunner::run('oddsapi mapper: every allowlisted soccer league has a display name', function (): void {
    foreach (OddsApiAllowlist::keysFor(OddsApiAllowlist::CATEGORY_SOCCER) as $key) {
        TestRunner::assertEquals(true, OddsApiEventMapper::displayName($key) !== $key, "display name mapped for {$key}");
    }
});
