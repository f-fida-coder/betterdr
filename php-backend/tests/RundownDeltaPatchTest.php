<?php

declare(strict_types=1);

/**
 * Unit tests for RundownSyncService delta-patch helpers.
 *
 * Covers the new period-market patching logic that flows live price
 * ticks from /markets/delta and the WebSocket feed into the existing
 * match doc's extendedMarkets[] array. The regression these guard
 * against is the one that motivated this whole plan: pre-fix, the
 * delta path only knew about CORE markets (h2h/spreads/totals) and
 * silently dropped every period market tick, so live Q1-Q4 / H1-H2 /
 * F5/F7 odds appeared stale to players until the next 5-min full
 * prematch refresh.
 *
 * Note: applyDelta() itself is private (DB write + lookup), so we
 * exercise patchExtendedMarketOutcome() via reflection — that's the
 * only stateful piece worth unit-testing directly. End-to-end DB
 * behavior is verified via the local odds-worker run in Phase A6/A7.
 */

require_once dirname(__DIR__) . '/src/Autoloader.php';
Autoloader::register();
require_once dirname(__DIR__) . '/src/RundownAffiliateMap.php';
require_once dirname(__DIR__) . '/src/RundownSportMap.php';
require_once dirname(__DIR__) . '/src/RundownMarketMap.php';
require_once dirname(__DIR__) . '/src/RundownEventMapper.php';

if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return '2026-05-28T12:00:00+00:00'; }
    }
}
if (!class_exists('Env')) {
    final class Env { public static function get(string $key, string $default = ''): string { return $default; } }
}
if (!class_exists('Logger')) {
    final class Logger {
        public static function info(string $msg, array $ctx = [], string $channel = ''): void {}
        public static function warning(string $msg, array $ctx = [], string $channel = ''): void {}
        public static function error(string $msg, array $ctx = [], string $channel = ''): void {}
        public static function exception(\Throwable $e, string $msg = '', string $channel = ''): void {}
    }
}
if (!class_exists('SharedFileCache')) {
    final class SharedFileCache {
        public static function get(string $ns, string $key, int $ttl): mixed { return null; }
        public static function put(string $ns, string $key, mixed $v): void {}
        public static function remember(string $ns, string $key, int $ttl, \Closure $cb): mixed { return $cb(); }
        public static function peek(string $ns, string $key): mixed { return null; }
    }
}
if (!class_exists('CircuitBreaker')) {
    final class CircuitBreaker {
        public static function isOpen(string $key): bool { return false; }
        public static function recordSuccess(string $key): void {}
        public static function recordFailure(string $key): void {}
    }
}
if (!class_exists('SportsbookHealth')) {
    final class SportsbookHealth {
        public static function recordOddsSourceSuccess(): void {}
        public static function recordOddsSourceFailure(string $reason): void {}
        public static function sportsbookSnapshot($db): array { return []; }
    }
}
if (!class_exists('RundownClient')) {
    final class RundownClient {
        public static function isConfigured(): bool { return false; }
        public static function getDelta(string $cursor, array $params): ?array { return null; }
        public static function getEvent(string $eventId, array $params): ?array { return null; }
        public static function getSportEvents(int $sportId, string $date, array $params): ?array { return null; }
        public static function getEventDelta(string $cursor, array $params): ?array { return null; }
        public static function latestQuotaSnapshot(): array { return []; }
    }
}
if (!class_exists('RundownDeltaCursor')) {
    final class RundownDeltaCursor {
        public static function get(int $sportId): ?string { return null; }
        public static function put(int $sportId, string $cursor): void {}
        public static function isStale(int $sportId): bool { return false; }
        public static function clear(int $sportId): void {}
    }
}
if (!class_exists('BetSettlementService')) {
    final class BetSettlementService {
        public static function settlePendingMatches($db, int $limit, string $source): array { return []; }
    }
}

require_once dirname(__DIR__) . '/src/RundownSyncService.php';

// Bridge to private helpers via reflection.
function rdtPatchExt(array $ext, string $bookKey, string $bookName, string $marketKey, string $participant, ?array $outcome): array
{
    $ref = new ReflectionClass(RundownSyncService::class);
    $m = $ref->getMethod('patchExtendedMarketOutcome');
    $m->setAccessible(true);
    return $m->invoke(null, $ext, ['key' => $bookKey, 'name' => $bookName], $marketKey, $participant, $outcome);
}

// ── patchExtendedMarketOutcome ───────────────────────────────────────────

TestRunner::run('patchExtendedMarketOutcome: insert into empty list creates row', function (): void {
    $out = rdtPatchExt(
        [],
        'pinnacle', 'Pinnacle',
        'h2h_q1',
        'Oklahoma City Thunder',
        ['name' => 'Oklahoma City Thunder', 'price' => -160, 'point' => null, 'book' => 'pinnacle']
    );
    TestRunner::assertEquals(1, count($out), 'one market row');
    TestRunner::assertEquals('h2h_q1', $out[0]['key']);
    TestRunner::assertEquals(1, count($out[0]['outcomes']));
    TestRunner::assertEquals(-160, $out[0]['outcomes'][0]['price']);
    TestRunner::assertEquals('pinnacle', $out[0]['outcomes'][0]['book']);
});

TestRunner::run('patchExtendedMarketOutcome: update existing outcome by (name, book) identity', function (): void {
    $seed = [['key' => 'h2h_q1', 'outcomes' => [
        ['name' => 'Oklahoma City Thunder', 'price' => -150, 'book' => 'pinnacle'],
        ['name' => 'San Antonio Spurs',     'price' => 130,  'book' => 'pinnacle'],
    ]]];
    $out = rdtPatchExt(
        $seed,
        'pinnacle', 'Pinnacle',
        'h2h_q1',
        'Oklahoma City Thunder',
        ['name' => 'Oklahoma City Thunder', 'price' => -175, 'point' => null, 'book' => 'pinnacle']
    );
    TestRunner::assertEquals(2, count($out[0]['outcomes']));
    $okc = null;
    foreach ($out[0]['outcomes'] as $o) {
        if ($o['name'] === 'Oklahoma City Thunder' && $o['book'] === 'pinnacle') $okc = $o;
    }
    TestRunner::assertNotNull($okc, 'OKC row found');
    TestRunner::assertEquals(-175, $okc['price'], 'price overwritten');
});

TestRunner::run('patchExtendedMarketOutcome: same (name, different book) does NOT collide', function (): void {
    // Two affiliates posting the same Q1 spread on OKC must coexist.
    $seed = [['key' => 'spreads_q1', 'outcomes' => [
        ['name' => 'Oklahoma City Thunder', 'price' => -110, 'point' => -2.5, 'book' => 'pinnacle'],
    ]]];
    $out = rdtPatchExt(
        $seed,
        'draftkings', 'DraftKings',
        'spreads_q1',
        'Oklahoma City Thunder',
        ['name' => 'Oklahoma City Thunder', 'price' => -108, 'point' => -2.5, 'book' => 'draftkings']
    );
    TestRunner::assertEquals(2, count($out[0]['outcomes']), 'both bookmakers present');
});

TestRunner::run('patchExtendedMarketOutcome: off-board (null outcome) removes the row', function (): void {
    $seed = [['key' => 'totals_q1', 'outcomes' => [
        ['name' => 'Over',  'price' => -110, 'point' => 56.5, 'book' => 'pinnacle'],
        ['name' => 'Under', 'price' => -110, 'point' => 56.5, 'book' => 'pinnacle'],
    ]]];
    $out = rdtPatchExt($seed, 'pinnacle', 'Pinnacle', 'totals_q1', 'Over', null);
    TestRunner::assertEquals(1, count($out[0]['outcomes']));
    TestRunner::assertEquals('Under', $out[0]['outcomes'][0]['name']);
});

TestRunner::run('patchExtendedMarketOutcome: point=null removes any stale point on update', function (): void {
    $seed = [['key' => 'h2h_h1', 'outcomes' => [
        ['name' => 'Detroit Tigers', 'price' => -120, 'point' => -1.5, 'book' => 'fanduel'],
    ]]];
    $out = rdtPatchExt(
        $seed,
        'fanduel', 'FanDuel',
        'h2h_h1',
        'Detroit Tigers',
        ['name' => 'Detroit Tigers', 'price' => -130, 'point' => null, 'book' => 'fanduel']
    );
    TestRunner::assertFalse(isset($out[0]['outcomes'][0]['point']), 'point removed when null');
    TestRunner::assertEquals(-130, $out[0]['outcomes'][0]['price']);
});

TestRunner::run('patchExtendedMarketOutcome: missing key adds a fresh market row', function (): void {
    $seed = [['key' => 'h2h_q1', 'outcomes' => [
        ['name' => 'Team A', 'price' => -110, 'book' => 'pinnacle'],
    ]]];
    $out = rdtPatchExt(
        $seed,
        'pinnacle', 'Pinnacle',
        'spreads_q1',
        'Team A',
        ['name' => 'Team A', 'price' => -105, 'point' => -3.5, 'book' => 'pinnacle']
    );
    TestRunner::assertEquals(2, count($out));
});

// ── Live delta market routing ────────────────────────────────────────────
//
// Period prices used to freeze because the live delta poll filtered to the
// core 8 market_ids (Rundown 400s on the full 75-id list — the 12-cap). The
// fix drops the market_ids filter entirely: the unfiltered cursor delta
// streams every change, and applyDelta() routes the relevant ones (core +
// periods) and skips the rest BEFORE locking a row. These tests pin that
// contract.

TestRunner::run('csvForLivePolling stays core-only (snapshot path is 12-capped)', function (): void {
    // csvForLivePolling feeds the /sports/{id}/events/{date} SNAPSHOT, which
    // enforces Rundown's 12-market_ids cap — so it must remain core-only.
    // Live period freshness no longer depends on this list; it comes from the
    // unfiltered delta poll instead.
    $csv = RundownMarketMap::csvForLivePolling();
    $ids = array_map('intval', explode(',', $csv));
    foreach ([1, 2, 3, 94, 41, 42, 43, 96] as $coreId) {
        TestRunner::assertTrue(in_array($coreId, $ids, true), "missing core id {$coreId}");
    }
    TestRunner::assertTrue(count($ids) <= 12, 'snapshot market_ids must respect the 12-cap, got ' . count($ids));
    foreach ([981, 1013, 1017, 4, 1010, 769, 1112, 1024, 1150] as $periodId) {
        TestRunner::assertTrue(!in_array($periodId, $ids, true), "period id {$periodId} must NOT be in the capped snapshot list");
    }
});

TestRunner::run('isLiveDeltaRelevant accepts core + period IDs, rejects props/unknown', function (): void {
    // Core (prematch + live variants).
    foreach ([1, 2, 3, 94, 41, 42, 43, 96] as $coreId) {
        TestRunner::assertTrue(RundownMarketMap::isLiveDeltaRelevant($coreId), "core id {$coreId} should be relevant");
    }
    // Periods across every sport we serve (H1/H2, Q1-Q4, innings, NHL P, sets).
    foreach ([4, 1010, 981, 1013, 1017, 1024, 769, 1112, 1150] as $periodId) {
        TestRunner::assertTrue(RundownMarketMap::isPeriodMarketId($periodId), "period id {$periodId} should be a period market");
        TestRunner::assertTrue(RundownMarketMap::isLiveDeltaRelevant($periodId), "period id {$periodId} should be relevant");
    }
    // Player props and unknown IDs are skipped before any DB lock.
    foreach ([29, 35, 38, 39, 93, 0, -1, 999999] as $skipId) {
        TestRunner::assertTrue(!RundownMarketMap::isLiveDeltaRelevant($skipId), "id {$skipId} should be skipped");
    }
});
