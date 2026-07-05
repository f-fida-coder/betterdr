<?php

declare(strict_types=1);

/**
 * Locks OddsApiCardMarketsService — the fail-closed event matcher, the
 * card-market builder (decimal contract + Rundown-canonical team names),
 * and the narrow three-key write.
 *
 * ISOLATED SUITE (see run.php): needs an INSTANCE-method SqlRepository
 * double (findOne/findMany/updateOne) — the shared-process stub is
 * static-only, and the real class needs a DB.
 */

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

class Logger
{
    public static array $lines = [];
    public static function info(string $m, array $c = [], string $ch = 'api'): void { self::$lines[] = $m; }
    public static function warning(string $m, array $c = [], string $ch = 'api'): void { self::$lines[] = $m; }
    public static function error(string $m, array $c = [], string $ch = 'error'): void { self::$lines[] = $m; }
    public static function exception(Throwable $e, string $m = '', array $c = [], string $ch = 'error'): void {}
}

/** In-memory SharedFileCache so map/log caches never leak across tests or runs. */
class SharedFileCache
{
    private static array $store = [];
    public static function get(string $ns, string $key, int $ttl): ?array { return self::$store[$ns . '|' . $key] ?? null; }
    public static function peek(string $ns, string $key): ?array { return self::$store[$ns . '|' . $key] ?? null; }
    public static function remember(string $ns, string $key, int $ttl, callable $cb): array
    {
        $existing = self::$store[$ns . '|' . $key] ?? null;
        if (is_array($existing)) return $existing;
        return self::$store[$ns . '|' . $key] = $cb();
    }
    public static function put(string $ns, string $key, array $payload): array { return self::$store[$ns . '|' . $key] = $payload; }
    public static function forget(string $ns, string $key): void { unset(self::$store[$ns . '|' . $key]); }
    public static function reset(): void { self::$store = []; }
}

/** Instance-method repo double: canned rows + updateOne capture. */
class SqlRepository
{
    public array $rows = [];
    public array $updates = [];
    public static function nowUtc(): string { return '2026-07-05T12:00:00+00:00'; }
    public static function id(string $id): string { return $id; }

    public function findOne(string $collection, array $filter): ?array
    {
        foreach ($this->rows as $row) {
            if (isset($filter['id']) && ($row['id'] ?? '') === $filter['id']) return $row;
        }
        return null;
    }

    public function findMany(string $collection, array $filter, array $options = []): array
    {
        $out = [];
        foreach ($this->rows as $row) {
            if (isset($filter['sportKey']) && ($row['sportKey'] ?? '') !== $filter['sportKey']) continue;
            if (isset($filter['status']) && ($row['status'] ?? '') !== $filter['status']) continue;
            if (isset($filter['startTime']['$gte']) && strtotime((string) $row['startTime']) < strtotime((string) $filter['startTime']['$gte'])) continue;
            if (isset($filter['startTime']['$lte']) && strtotime((string) $row['startTime']) > strtotime((string) $filter['startTime']['$lte'])) continue;
            $out[] = $row;
        }
        return $out;
    }

    public function updateOne(string $collection, array $filter, array $set): void
    {
        $this->updates[] = ['collection' => $collection, 'filter' => $filter, 'set' => $set];
    }
}

class ApiException extends RuntimeException
{
    public function __construct(string $message, int $code = 0, private array $extra = [])
    {
        parent::__construct($message, $code);
    }
    public function payload(): array { return $this->extra; }
}

require_once dirname(__DIR__) . '/src/OddsMarketCatalog.php';
require_once dirname(__DIR__) . '/src/SportsbookBetSupport.php';
require_once dirname(__DIR__) . '/src/RundownSportMap.php';
require_once dirname(__DIR__) . '/src/RundownMarketMap.php';
require_once dirname(__DIR__) . '/src/RundownAffiliateMap.php';
require_once dirname(__DIR__) . '/src/RundownEventMapper.php';
require_once dirname(__DIR__) . '/src/OddsApiAllowlist.php';
require_once dirname(__DIR__) . '/src/OddsApiEventMapper.php';
require_once dirname(__DIR__) . '/src/OddsApiCardMarketsService.php';
require_once dirname(__DIR__) . '/src/CardBetGradingService.php';

// A kickoff comfortably in the future so rowEligible passes.
define('CMT_KICKOFF_TS', time() + 6 * 3600);
define('CMT_KICKOFF_ISO', gmdate(DATE_ATOM, CMT_KICKOFF_TS));

function cmtRundownRow(array $overrides = []): array
{
    return array_merge([
        'id'           => 'aaaaaaaaaaaaaaaaaaaaaaaa',
        'sportKey'     => 'soccer_epl',
        'status'       => 'scheduled',
        'oddsSource'   => 'therundown',
        'homeTeam'     => 'Arsenal',
        'homeTeamFull' => 'Arsenal',
        'awayTeam'     => 'Chelsea',
        'awayTeamFull' => 'Chelsea',
        'startTime'    => CMT_KICKOFF_ISO,
    ], $overrides);
}

function cmtToaEvent(array $overrides = []): array
{
    return array_merge([
        'id'            => 'toaevt-' . substr(sha1(json_encode($overrides)), 0, 8),
        'home_team'     => 'Arsenal',
        'away_team'     => 'Chelsea',
        'commence_time' => CMT_KICKOFF_ISO,
    ], $overrides);
}

function cmtStats(): array
{
    return ['unmatched' => 0, 'ambiguous' => 0];
}

TestRunner::run('cards matcher: exact + containment names attach to the one Rundown row', function (): void {
    SharedFileCache::reset();
    $db = new SqlRepository();
    $db->rows = [cmtRundownRow()];
    $stats = cmtStats();
    $hit = OddsApiCardMarketsService::resolveRundownMatch($db, 'soccer_epl', cmtToaEvent(), $stats);
    TestRunner::assertEquals('aaaaaaaaaaaaaaaaaaaaaaaa', (string) ($hit['id'] ?? ''), 'exact names match');

    // The Odds API long form vs a Rundown short form — containment path.
    $db->rows = [cmtRundownRow(['homeTeam' => 'Arsenal', 'homeTeamFull' => 'Arsenal FC', 'awayTeam' => 'Chelsea', 'awayTeamFull' => 'Chelsea FC'])];
    $stats = cmtStats();
    $hit = OddsApiCardMarketsService::resolveRundownMatch($db, 'soccer_epl', cmtToaEvent(['id' => 'toaevt-b', 'home_team' => 'Arsenal FC', 'away_team' => 'Chelsea FC']), $stats);
    TestRunner::assertEquals('aaaaaaaaaaaaaaaaaaaaaaaa', (string) ($hit['id'] ?? ''), 'containment (FC suffix) matches');
});

TestRunner::run('cards matcher: fail-closed refusals', function (): void {
    SharedFileCache::reset();
    $db = new SqlRepository();

    // Orientation swap: toa home == rundown AWAY → refuse (never attach swapped).
    $db->rows = [cmtRundownRow()];
    $stats = cmtStats();
    $r = OddsApiCardMarketsService::resolveRundownMatch($db, 'soccer_epl', cmtToaEvent(['id' => 't1', 'home_team' => 'Chelsea', 'away_team' => 'Arsenal']), $stats);
    TestRunner::assertEquals(null, $r, 'swapped orientation refused');
    TestRunner::assertEquals(1, $stats['unmatched'], 'counted unmatched');

    // Ambiguity: two eligible candidate rows → refuse.
    $db->rows = [cmtRundownRow(), cmtRundownRow(['id' => 'bbbbbbbbbbbbbbbbbbbbbbbb'])];
    $stats = cmtStats();
    $r = OddsApiCardMarketsService::resolveRundownMatch($db, 'soccer_epl', cmtToaEvent(['id' => 't2']), $stats);
    TestRunner::assertEquals(null, $r, 'two candidates → ambiguous → refused');
    TestRunner::assertEquals(1, $stats['ambiguous'], 'counted ambiguous');

    // Kickoff outside the ±300s tolerance → no candidates.
    $db->rows = [cmtRundownRow(['startTime' => gmdate(DATE_ATOM, CMT_KICKOFF_TS + 3600)])];
    $stats = cmtStats();
    $r = OddsApiCardMarketsService::resolveRundownMatch($db, 'soccer_epl', cmtToaEvent(['id' => 't3']), $stats);
    TestRunner::assertEquals(null, $r, 'kickoff 1h apart refused');

    // Row owned by theoddsapi (not Rundown) → ineligible.
    $db->rows = [cmtRundownRow(['oddsSource' => 'theoddsapi'])];
    $stats = cmtStats();
    $r = OddsApiCardMarketsService::resolveRundownMatch($db, 'soccer_epl', cmtToaEvent(['id' => 't4']), $stats);
    TestRunner::assertEquals(null, $r, 'non-Rundown-owned row refused (cards ride Rundown matches only)');
});

TestRunner::run('cards eligibility: Rundown-owned, scheduled, future only', function (): void {
    TestRunner::assertEquals(true,  OddsApiCardMarketsService::rowEligible(cmtRundownRow()), 'happy path');
    TestRunner::assertEquals(false, OddsApiCardMarketsService::rowEligible(cmtRundownRow(['status' => 'live'])), 'live refused (prematch only)');
    TestRunner::assertEquals(false, OddsApiCardMarketsService::rowEligible(cmtRundownRow(['startTime' => gmdate(DATE_ATOM, time() - 60)])), 'past kickoff refused');
    TestRunner::assertEquals(false, OddsApiCardMarketsService::rowEligible(cmtRundownRow(['oddsSource' => 'theoddsapi'])), 'wrong owner refused');
});

TestRunner::run('cards builder: decimal contract, canonical names, house-safe dedupe', function (): void {
    $_ENV['SPORTSBOOK_PREFERRED_BOOKS'] = 'betmgm,draftkings';
    $event = [
        'id' => 'evt-odds',
        'bookmakers' => [
            ['key' => 'draftkings', 'markets' => [
                ['key' => 'alternate_totals_cards', 'outcomes' => [
                    ['name' => 'Over',  'point' => 4.5, 'price' => -110],
                    ['name' => 'Under', 'point' => 4.5, 'price' => -110],
                ]],
                ['key' => 'alternate_spreads_cards', 'outcomes' => [
                    ['name' => 'Arsenal FC', 'point' => -1.5, 'price' => 120],
                    ['name' => 'Chelsea FC', 'point' => 1.5,  'price' => -150],
                    ['name' => 'Unrelated Club', 'point' => 1.5, 'price' => -120], // neither team → drop
                ]],
                ['key' => 'h2h', 'outcomes' => [['name' => 'Arsenal', 'price' => -200]]], // off-scope key → ignored
            ]],
            ['key' => 'betmgm', 'markets' => [
                ['key' => 'alternate_totals_cards', 'outcomes' => [
                    ['name' => 'Over', 'point' => 4.5, 'price' => -115],   // preferred book wins the rung
                    ['name' => 'Over', 'point' => 1.91, 'price' => 1.91],  // decimal leak (|price|<100) → drop
                ]],
            ]],
        ],
    ];
    $markets = OddsApiCardMarketsService::buildCardMarkets($event, 'Arsenal', 'Arsenal', 'Chelsea', 'Chelsea');
    $byKey = [];
    foreach ($markets as $m) { $byKey[$m['key']] = $m['outcomes']; }

    TestRunner::assertEquals(2, count($byKey), 'exactly the two card market keys, h2h ignored');

    $totals = $byKey['alternate_totals_cards'];
    TestRunner::assertEquals(2, count($totals), 'one house-safe rung per (side, point) after dedupe');
    foreach ($totals as $o) {
        if ($o['name'] === 'Over') {
            TestRunner::assertEqualsFloat(1.8696, (float) $o['price'], 'preferred book (betmgm -115) wins the Over rung, DECIMAL', 0.001);
            TestRunner::assertEquals('betmgm', $o['book'], 'book tag kept');
        }
    }

    $spreads = $byKey['alternate_spreads_cards'];
    $names = array_map(static fn ($o) => $o['name'], $spreads);
    sort($names);
    TestRunner::assertEquals(['Arsenal', 'Chelsea'], $names, 'handicap names canonicalized to the Rundown row names; unknown club dropped');
    foreach ($spreads as $o) {
        if ($o['name'] === 'Arsenal') {
            TestRunner::assertEqualsFloat(2.2, (float) $o['price'], '+120 → 2.20 decimal (board contract)', 0.001);
            TestRunner::assertEqualsFloat(-1.5, (float) $o['point'], 'handicap point preserved', 0.001);
        }
    }
    unset($_ENV['SPORTSBOOK_PREFERRED_BOOKS']);
});

TestRunner::run('cards serve gate: visible ⟺ placeable, fail-closed on every edge', function (): void {
    $now = time();
    $fresh = gmdate(DATE_ATOM, $now - 300);
    $row = cmtRundownRow([
        'cardMarkets'         => [['key' => 'alternate_totals_cards', 'outcomes' => [['name' => 'Over', 'point' => 4.5, 'price' => 1.87]]]],
        'cardMarketsSyncedAt' => $fresh,
        'cardMarketsSource'   => 'theoddsapi',
    ]);

    // Betting flag OFF (default) → dark, even with perfect data.
    unset($_ENV['SPORTSBOOK_CARDS_BETTING_ENABLED']);
    TestRunner::assertEquals([], OddsApiCardMarketsService::servableCardMarkets($row, $now), 'flag off → cards dark on both surfaces');

    $_ENV['SPORTSBOOK_CARDS_BETTING_ENABLED'] = 'true';
    $served = OddsApiCardMarketsService::servableCardMarkets($row, $now);
    TestRunner::assertEquals(1, count($served), 'flag on + fresh + prematch → served');
    TestRunner::assertEquals('alternate_totals_cards', $served[0]['key'], 'market shape passes through');

    // Kickoff passed → dark (active close; feed has no live signal).
    $past = $row;
    $past['startTime'] = gmdate(DATE_ATOM, $now - 60);
    TestRunner::assertEquals([], OddsApiCardMarketsService::servableCardMarkets($past, $now), 'post-kickoff → dark');

    // Stale sync (31 min > 1800s default) → dark.
    $stale = $row;
    $stale['cardMarketsSyncedAt'] = gmdate(DATE_ATOM, $now - 1860);
    TestRunner::assertEquals([], OddsApiCardMarketsService::servableCardMarkets($stale, $now), 'stale sync → dark');

    // Wrong / missing provider tag → dark.
    $wrongTag = $row;
    $wrongTag['cardMarketsSource'] = 'rundown';
    TestRunner::assertEquals([], OddsApiCardMarketsService::servableCardMarkets($wrongTag, $now), 'wrong provider tag → dark');

    // No card data at all → dark.
    TestRunner::assertEquals([], OddsApiCardMarketsService::servableCardMarkets(cmtRundownRow(), $now), 'no cardMarkets key → dark');
    unset($_ENV['SPORTSBOOK_CARDS_BETTING_ENABLED']);
});

TestRunner::run('cards composition: straight-only across every multi-leg type', function (): void {
    $cardLeg  = ['matchId' => 'm1', 'marketType' => 'alternate_totals_cards', 'selection' => 'Over', 'point' => 4.5];
    $spreadLeg = ['matchId' => 'm2', 'marketType' => 'spreads', 'selection' => 'Arsenal', 'point' => -0.5];

    // Straight with a card leg: allowed.
    SportsbookBetSupport::validateTicketComposition('straight', [$cardLeg]);
    TestRunner::assertEquals(true, true, 'straight card bet passes composition');

    foreach (['parlay', 'round_robin', 'if_bet', 'reverse', 'teaser'] as $type) {
        $threw = '';
        try {
            SportsbookBetSupport::validateTicketComposition($type, [$cardLeg, $spreadLeg]);
        } catch (ApiException $e) {
            $threw = (string) ($e->payload()['code'] ?? '');
        }
        TestRunner::assertEquals('CARDS_STRAIGHT_ONLY', $threw, "card leg in {$type} → CARDS_STRAIGHT_ONLY");
    }

    // Handicap card key rejected too (suffix rule).
    $threw = '';
    try {
        SportsbookBetSupport::validateTicketComposition('parlay', [
            ['matchId' => 'm1', 'marketType' => 'alternate_spreads_cards', 'selection' => 'Arsenal', 'point' => -1.5],
            $spreadLeg,
        ]);
    } catch (ApiException $e) {
        $threw = (string) ($e->payload()['code'] ?? '');
    }
    TestRunner::assertEquals('CARDS_STRAIGHT_ONLY', $threw, 'card handicap leg in parlay rejected');

    // Non-card parlay unaffected.
    SportsbookBetSupport::validateTicketComposition('parlay', [
        $spreadLeg,
        ['matchId' => 'm3', 'marketType' => 'totals', 'selection' => 'Over', 'point' => 2.5],
    ]);
    TestRunner::assertEquals(true, true, 'ordinary two-event parlay still passes');
});

TestRunner::run('cards manual grade: pure guard matrix (Cards-3 scope fence)', function (): void {
    $bet = ['status' => 'pending', 'type' => 'straight'];
    $cardLeg = ['marketType' => 'alternate_totals_cards', 'status' => 'pending'];

    TestRunner::assertEquals(null, CardBetGradingService::gradeableCardBetError($bet, [$cardLeg]), 'pending straight single card leg → gradable');
    TestRunner::assertEquals('bet_not_found', CardBetGradingService::gradeableCardBetError(null, [$cardLeg]), 'missing bet refused');
    TestRunner::assertEquals('bet_not_pending', CardBetGradingService::gradeableCardBetError(['status' => 'won', 'type' => 'straight'], [$cardLeg]), 'terminal bet refused (idempotency — no double payout)');
    TestRunner::assertEquals('bet_not_straight', CardBetGradingService::gradeableCardBetError(['status' => 'pending', 'type' => 'parlay'], [$cardLeg]), 'non-straight refused');
    TestRunner::assertEquals('bet_leg_count', CardBetGradingService::gradeableCardBetError($bet, [$cardLeg, $cardLeg]), 'two pending legs refused');
    TestRunner::assertEquals('bet_leg_count', CardBetGradingService::gradeableCardBetError($bet, []), 'zero pending legs refused');
    TestRunner::assertEquals('not_a_card_bet', CardBetGradingService::gradeableCardBetError($bet, [['marketType' => 'totals', 'status' => 'pending']]), 'NON-card leg refused — endpoint can only grade card bets');
});

TestRunner::run('cards write: exactly three namespaced keys, nothing else', function (): void {
    $db = new SqlRepository();
    OddsApiCardMarketsService::writeCardMarkets($db, 'aaaaaaaaaaaaaaaaaaaaaaaa', [['key' => 'alternate_totals_cards', 'outcomes' => []]]);
    TestRunner::assertEquals(1, count($db->updates), 'one update issued');
    $set = $db->updates[0]['set'];
    $keys = array_keys($set);
    sort($keys);
    TestRunner::assertEquals(['cardMarkets', 'cardMarketsSource', 'cardMarketsSyncedAt'], $keys, 'the narrow write NEVER carries other keys — ownership contract');
    TestRunner::assertEquals('theoddsapi', $set['cardMarketsSource'], 'provider tag');

    $db2 = new SqlRepository();
    OddsApiCardMarketsService::writeCardMarkets($db2, '', []);
    TestRunner::assertEquals(0, count($db2->updates), 'blank match id → no write');
});

TestRunner::run('cards matcher: USA alias bridges The Odds API vs Rundown naming', function (): void {
    // WC 2026: The Odds API says "USA", Rundown says "United States".
    // 'usa' (3 chars) is below the containment threshold, so without the
    // post-normalization alias the sides can never match.
    TestRunner::assertEquals(true, OddsApiCardMarketsService::sideMatches('USA', 'United States', 'United States'), 'USA matches United States');
    TestRunner::assertEquals(true, OddsApiCardMarketsService::sideMatches('United States', 'United States', 'United States'), 'full name still matches itself');
    TestRunner::assertEquals(false, OddsApiCardMarketsService::sideMatches('USA', 'Belgium', 'Belgium'), 'USA does not match the opponent');
    TestRunner::assertEquals(false, OddsApiCardMarketsService::sideMatches('US', 'United States', 'United States'), 'unknown short form still refused (fail-closed)');
});
