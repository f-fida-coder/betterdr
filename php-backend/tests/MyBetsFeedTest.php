<?php

declare(strict_types=1);

/**
 * My Bets feed — live-stake tickets can never fall out of the window.
 *
 * ISOLATED SUITE (mock SqlRepository double, no DB) driving the REAL
 * BetsController::computeUserBets.
 *
 * Recreates the production incident of 2026-07-13 (account NJG101):
 * 4 live-stake sportsbook tickets from Jul 6-9 (pending x3 + open parlay,
 * $664 held) buried under 50+ newer casino rounds and newer settled bets —
 * the merged feed's recency slice dropped every live ticket, so the player
 * saw "No pending tickets" under a $664 PENDING header. The fix unions
 * live-stake rows (pending/open/pending_approval) into the feed and exempts
 * them from the final recency cut; only settled history is truncated.
 */

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
    }
}

if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return gmdate(DATE_ATOM); }
        public static function id(string $id): string { return $id; }
    }
}

if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, mixed $default = null): mixed { return $default; }
    }
}

if (!class_exists('Logger')) {
    class Logger
    {
        public static function warn(string $m, array $c = [], string $ch = ''): void {}
        public static function info(string $m, array $c = [], string $ch = ''): void {}
        public static function error(string $m, array $c = [], string $ch = ''): void {}
        public static function exception(Throwable $e, string $context = ''): void {}
    }
}

if (!class_exists('Response')) {
    class Response
    {
        /** @var array{status:int,data:array<string,mixed>} */
        public static array $last = ['status' => 0, 'data' => []];
        public static function json(mixed $data, int $status = 200): void
        {
            self::$last = ['status' => $status, 'data' => is_array($data) ? $data : []];
        }
        public static function serverError(string $m, ?Throwable $e = null): void
        {
            self::$last = ['status' => 500, 'data' => ['message' => $m]];
        }
    }
}

if (!class_exists('Http')) {
    class Http
    {
        public static function header(string $name): string { return ''; }
        public static function jsonBody(): array { return []; }
    }
}

require_once __DIR__ . '/TestRunner.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/BetsController.php';

final class MyBetsMockSqlRepository extends SqlRepository
{
    /** @var array<string, array<int, array<string, mixed>>> */
    public array $collections;

    /** @param array<string, array<int, array<string, mixed>>> $seed */
    public function __construct(array $seed = [])
    {
        $this->collections = $seed;
    }

    public function insertOne(string $collection, array $document): string
    {
        $this->collections[$collection][] = $document;
        return (string) ($document['id'] ?? ('mock_' . count($this->collections[$collection])));
    }

    public function insertOneIfAbsent(string $collection, array $document): void
    {
        $this->insertOne($collection, $document);
    }

    public function updateOne(string $collection, array $query, array $updates): void
    {
        foreach ($this->collections[$collection] ?? [] as $i => $doc) {
            if ($this->matches($doc, $query)) {
                $this->collections[$collection][$i] = array_replace($doc, $updates);
                return;
            }
        }
    }

    public function findOne(string $collection, array $query, array $options = []): ?array
    {
        foreach ($this->collections[$collection] ?? [] as $doc) {
            if ($this->matches($doc, $query)) {
                return $doc;
            }
        }
        return null;
    }

    /** @return array<int, array<string, mixed>> */
    public function findMany(string $collection, array $query = [], array $options = []): array
    {
        $rows = [];
        foreach ($this->collections[$collection] ?? [] as $doc) {
            if ($this->matches($doc, $query)) {
                $rows[] = $doc;
            }
        }
        $sort = $options['sort'] ?? null;
        if (is_array($sort) && isset($sort['createdAt'])) {
            $dir = (int) $sort['createdAt'];
            usort($rows, static function (array $a, array $b) use ($dir): int {
                return $dir >= 0
                    ? strcmp((string) ($a['createdAt'] ?? ''), (string) ($b['createdAt'] ?? ''))
                    : strcmp((string) ($b['createdAt'] ?? ''), (string) ($a['createdAt'] ?? ''));
            });
        }
        $limit = (int) ($options['limit'] ?? 0);
        if ($limit > 0 && count($rows) > $limit) {
            $rows = array_slice($rows, 0, $limit);
        }
        return array_values($rows);
    }

    /**
     * @param array<string, mixed> $doc
     * @param array<string, mixed> $query
     */
    private function matches(array $doc, array $query): bool
    {
        foreach ($query as $field => $expected) {
            $actual = $doc[$field] ?? null;
            if (is_array($expected)) {
                if (array_key_exists('$in', $expected)) {
                    if (!in_array($actual, $expected['$in'], true)) {
                        return false;
                    }
                    continue;
                }
                if (array_key_exists('$nin', $expected)) {
                    if (in_array($actual, $expected['$nin'], true)) {
                        return false;
                    }
                    continue;
                }
                continue; // other operators: not needed by this suite
            }
            if ($actual !== $expected) {
                return false;
            }
        }
        return true;
    }
}

function myBetsController(MyBetsMockSqlRepository $db): BetsController
{
    $ref = new ReflectionClass(BetsController::class);
    /** @var BetsController $controller */
    $controller = $ref->newInstanceWithoutConstructor();
    foreach (['db'] as $prop) {
        if ($ref->hasProperty($prop)) {
            $p = $ref->getProperty($prop);
            $p->setValue($controller, $db);
        }
    }
    return $controller;
}

function myBetsCompute(BetsController $c, string $userId, string $status, int $limit): array
{
    $m = new ReflectionMethod($c, 'computeUserBets');
    return $m->invoke($c, $userId, $status, $limit);
}

/**
 * NJG101-shaped seed: 4 live tickets dated Jul 6-9, buried under $newerSettled
 * newer settled sportsbook bets and $casinoRounds newer casino rounds.
 *
 * @return array{0: MyBetsMockSqlRepository, 1: array<int, string>}
 */
function myBetsSeed(int $newerSettled, int $casinoRounds): array
{
    $userId = 'njg_test_user';
    $bets = [
        ['id' => 'live_manual_489', 'userId' => $userId, 'status' => 'pending', 'type' => 'manual', 'amount' => 489, 'riskAmount' => 489, 'createdAt' => '2026-07-09T18:05:47+00:00', 'selections' => []],
        ['id' => 'live_straight_50', 'userId' => $userId, 'status' => 'pending', 'type' => 'straight', 'amount' => 50, 'riskAmount' => 50, 'createdAt' => '2026-07-08T15:50:30+00:00', 'selections' => []],
        ['id' => 'live_straight_100', 'userId' => $userId, 'status' => 'pending', 'type' => 'straight', 'amount' => 100, 'riskAmount' => 100, 'createdAt' => '2026-07-07T19:36:35+00:00', 'selections' => []],
        ['id' => 'live_open_parlay_25', 'userId' => $userId, 'status' => 'open', 'type' => 'parlay', 'amount' => 25, 'riskAmount' => 25, 'createdAt' => '2026-07-06T19:24:29+00:00', 'selections' => []],
    ];
    $liveIds = array_map(static fn(array $b): string => (string) $b['id'], $bets);

    for ($i = 0; $i < $newerSettled; $i++) {
        $bets[] = [
            'id' => 'settled_' . $i,
            'userId' => $userId,
            'status' => $i % 2 === 0 ? 'won' : 'lost',
            'type' => 'straight',
            'amount' => 5,
            'riskAmount' => 5,
            'createdAt' => sprintf('2026-07-12T%02d:%02d:00+00:00', intdiv($i, 60) % 24, $i % 60),
            'selections' => [],
        ];
    }

    $casino = [];
    for ($i = 0; $i < $casinoRounds; $i++) {
        $casino[] = [
            'id' => 'casino_' . $i,
            'userId' => $userId,
            'game' => 'american-roulette',
            'roundId' => 'r_' . $i,
            'totalWager' => 1,
            'totalReturn' => $i % 3 === 0 ? 2 : 0,
            'createdAt' => sprintf('2026-07-13T%02d:%02d:00+00:00', intdiv($i, 60) % 24, $i % 60),
        ];
    }

    $db = new MyBetsMockSqlRepository([
        'bets' => $bets,
        'casino_bets' => $casino,
        'round_robin_groups' => [],
        'bet_selections' => [],
        'matches' => [],
    ]);

    return [$db, $liveIds];
}

TestRunner::run('Incident replay: 4 live tickets buried under 55 casino rounds + 55 settled bets STAY in the feed', function (): void {
    [$db, $liveIds] = myBetsSeed(55, 55);
    $c = myBetsController($db);
    $rows = myBetsCompute($c, 'njg_test_user', '', 50);

    $ids = array_map(static fn(array $r): string => (string) ($r['id'] ?? ''), $rows);
    foreach ($liveIds as $liveId) {
        TestRunner::assertContains($liveId, $ids, $liveId . ' present despite 110 newer items');
    }

    // The burial premise is real: every live ticket is OLDER than the 50th
    // newest item, so the pre-fix recency slice provably dropped all four.
    $byNewest = $rows;
    usort($byNewest, static fn(array $a, array $b): int => strcmp((string) $b['createdAt'], (string) $a['createdAt']));
    $liveRows = array_values(array_filter($rows, static fn(array $r): bool => in_array((string) ($r['status'] ?? ''), ['pending', 'open', 'pending_approval'], true)));
    TestRunner::assertEquals(4, count($liveRows), 'exactly the 4 live tickets are in the feed');
    $newestLiveCreated = max(array_map(static fn(array $r): string => (string) $r['createdAt'], $liveRows));
    TestRunner::assertTrue($newestLiveCreated < '2026-07-12T00:00:00+00:00', 'live tickets are all older than every buried item (premise held)');

    // Held stake visible in the feed == the PENDING header's $664.
    $heldStake = 0.0;
    foreach ($liveRows as $r) {
        $heldStake += (float) ($r['riskAmount'] ?? $r['amount'] ?? 0);
    }
    TestRunner::assertEquals(664.0, $heldStake, 'visible live risk equals the pendingBalance header ($664)');

    // Payload stays bounded: 50 settled max + the live tickets.
    $settledCount = count($rows) - count($liveRows);
    TestRunner::assertTrue($settledCount <= 50, 'settled history still truncated to the limit (got ' . $settledCount . ')');
    // Newest settled activity still leads the list.
    TestRunner::assertEquals('casino_54', (string) $rows[0]['id'], 'feed still opens with the newest item');
});

TestRunner::run('pending_approval tickets are live risk: never sliced, present in the feed', function (): void {
    [$db, $liveIds] = myBetsSeed(60, 60);
    $db->collections['bets'][] = [
        'id' => 'queued_bet_1',
        'userId' => 'njg_test_user',
        'status' => 'pending_approval',
        'type' => 'parlay',
        'amount' => 40,
        'riskAmount' => 40,
        'createdAt' => '2026-07-05T12:00:00+00:00',   // older than everything
        'selections' => [],
    ];
    $c = myBetsController($db);
    $rows = myBetsCompute($c, 'njg_test_user', '', 50);
    $ids = array_map(static fn(array $r): string => (string) ($r['id'] ?? ''), $rows);
    TestRunner::assertContains('queued_bet_1', $ids, 'approval-queued ticket survives 120 newer items');
    foreach ($liveIds as $liveId) {
        TestRunner::assertContains($liveId, $ids, $liveId . ' still present alongside the queued ticket');
    }
});

TestRunner::run('No live tickets: feed behaves exactly as before (recency window only)', function (): void {
    [$db] = myBetsSeed(60, 60);
    // Settle the four live tickets — no live risk remains.
    foreach ($db->collections['bets'] as $i => $bet) {
        if (in_array((string) $bet['status'], ['pending', 'open'], true)) {
            $db->collections['bets'][$i]['status'] = 'lost';
        }
    }
    $c = myBetsController($db);
    $rows = myBetsCompute($c, 'njg_test_user', '', 50);
    TestRunner::assertEquals(50, count($rows), 'plain history still truncates to the limit');
    $statuses = array_unique(array_map(static fn(array $r): string => (string) ($r['status'] ?? ''), $rows));
    TestRunner::assertTrue(!in_array('pending', $statuses, true) && !in_array('open', $statuses, true), 'no phantom live rows');
});

TestRunner::run('Explicit status filter path unchanged (no union, no double rows)', function (): void {
    [$db, $liveIds] = myBetsSeed(10, 10);
    $c = myBetsController($db);
    $rows = myBetsCompute($c, 'njg_test_user', 'pending', 50);
    $ids = array_map(static fn(array $r): string => (string) ($r['id'] ?? ''), $rows);
    TestRunner::assertEquals(3, count(array_unique($ids)), 'status=pending returns exactly the 3 pending tickets, deduped');
    TestRunner::assertContains('live_manual_489', $ids, 'pending filter still works');
});

TestRunner::run('Live tickets are never duplicated when they already sit inside the window', function (): void {
    [$db, $liveIds] = myBetsSeed(3, 3);   // tiny history: live rows are IN the window
    $c = myBetsController($db);
    $rows = myBetsCompute($c, 'njg_test_user', '', 50);
    $ids = array_map(static fn(array $r): string => (string) ($r['id'] ?? ''), $rows);
    TestRunner::assertEquals(count($ids), count(array_unique($ids)), 'no duplicate rows from the union');
    foreach ($liveIds as $liveId) {
        TestRunner::assertEquals(1, count(array_keys($ids, $liveId, true)), $liveId . ' appears exactly once');
    }
});
