<?php

declare(strict_types=1);

/**
 * Arabian Phase-3 provably-fair — DB-level chain proofs (commit-reveal rotating
 * chain, Option A). Isolated suite: mock Response/SqlRepository/… doubles drive
 * the REAL placeArabianBet through the seed chain.
 *
 * Covers: chain linkage across consecutive spins (each revealed seed hashes to
 * the prior spin's serverSeedHashNext), one unrevealed seed at rest, replay does
 * NOT advance the chain, and loud-fail 409 without a chain.
 */

if (!class_exists('ApiException')) { class ApiException extends RuntimeException {} }
if (!class_exists('SqlRepository')) { class SqlRepository { public static function nowUtc(): string { return date('c'); } public static function id(string $id): string { return $id; } } }
if (!class_exists('Response')) {
    class Response {
        public static array $last = ['status' => 0, 'data' => []];
        public static function json(array $data, int $status = 200): void { self::$last = ['status' => $status, 'data' => $data]; }
        public static function reset(): void { self::$last = ['status' => 0, 'data' => []]; }
        public static function serverError(string $m, ?Throwable $e = null): void { self::$last = ['status' => 500, 'data' => ['message' => $m]]; }
    }
}
if (!class_exists('Http')) { class Http { public static function header(string $n): string { return ''; } public static function jsonBody(): array { return []; } } }
if (!class_exists('IpUtils')) { class IpUtils { public static function clientIp(): string { return '127.0.0.1'; } } }
if (!class_exists('RateLimiter')) { class RateLimiter { public static function enforce(mixed $db, string $k, int $l, int $w): bool { return false; } } }
if (!class_exists('Env')) { class Env { public static function get(string $k, mixed $d = null): mixed { return $d; } } }
if (!class_exists('SportsbookBetSupport')) { class SportsbookBetSupport {} }
if (!class_exists('SportsMatchStatus')) { class SportsMatchStatus { public static function effectiveStatus(array $m): string { return (string) ($m['effectiveStatus'] ?? $m['status'] ?? 'pending'); } } }

require_once __DIR__ . '/TestRunner.php';
require_once __DIR__ . '/../src/CasinoController.php';

function arabFairCall(object $t, string $m, mixed ...$a): mixed
{
    return (new ReflectionMethod($t, $m))->invoke($t, ...$a);
}

final class ArabianMockSqlRepository extends SqlRepository
{
    /** @var array<string, array<int, array<string, mixed>>> */
    public array $collections;
    private int $nextId = 1;

    public function __construct(array $seed = []) { $this->collections = $seed; }
    public function beginTransaction(): void {}
    public function commit(): void {}
    public function rollback(): void {}

    public function findOne(string $collection, array $query): ?array
    {
        foreach ($this->collections[$collection] ?? [] as $doc) {
            if ($this->matches($doc, $query)) { return $doc; }
        }
        return null;
    }
    public function findOneForUpdate(string $collection, array $query): ?array { return $this->findOne($collection, $query); }
    public function findMany(string $collection, array $query = [], array $options = []): array
    {
        $rows = [];
        foreach ($this->collections[$collection] ?? [] as $doc) {
            if ($this->matches($doc, $query)) { $rows[] = $doc; }
        }
        return array_values($rows);
    }
    public function insertOne(string $collection, array $document): string
    {
        if (!isset($document['id']) || trim((string) $document['id']) === '') { $document['id'] = 'mock_' . $this->nextId++; }
        $this->collections[$collection] ??= [];
        $this->collections[$collection][] = $document;
        return (string) $document['id'];
    }
    public function insertOneIfAbsent(string $collection, array $document): bool
    {
        foreach ($this->collections[$collection] ?? [] as $doc) {
            if (($doc['id'] ?? null) === ($document['id'] ?? null)) { return false; }
        }
        $this->insertOne($collection, $document);
        return true;
    }
    public function updateOne(string $collection, array $query, array $updates): void
    {
        $this->collections[$collection] ??= [];
        foreach ($this->collections[$collection] as $idx => $doc) {
            if ($this->matches($doc, $query)) { $this->collections[$collection][$idx] = array_replace($doc, $updates); return; }
        }
    }
    private function matches(array $doc, array $query): bool
    {
        foreach ($query as $field => $expected) {
            $actual = $doc[$field] ?? null;
            if (is_array($expected)) { continue; }
            if ($actual !== $expected) { return false; }
        }
        return true;
    }
}

function arabFairHarness(): array
{
    $userId = 'arabian_test_user';
    $db = new ArabianMockSqlRepository([
        'casinogames' => [[
            'id' => 'arabian_game', 'slug' => 'arabian', 'name' => 'Arabian Game',
            'status' => 'active', 'minBet' => 0.3, 'maxBet' => 30,
        ]],
        'users' => [[
            'id' => $userId, 'username' => 'mock_arabian_player', 'role' => 'user',
            'status' => 'active', 'balance' => 100.00, 'pendingBalance' => 0,
        ]],
        'transactions' => [], 'casino_bets' => [], 'casino_round_audit' => [],
        'casino_seed_chains' => [[
            'id' => hash('sha256', 'seedchain|' . $userId . '|arabian'),
            'userId' => $userId, 'game' => 'arabian',
            'serverSeed' => str_repeat('ab', 32),
            'serverSeedHash' => hash('sha256', str_repeat('ab', 32)),
            'clientSeed' => '', 'nonce' => 0,
        ]],
    ]);
    $controller = new CasinoController($db, 'arabian-test-secret');
    $actor = ['id' => $userId, 'username' => 'mock_arabian_player', 'role' => 'user', 'status' => 'active'];
    return [$controller, $db, $actor];
}

function arabFairSpin(CasinoController $c, array $actor, string $requestId): array
{
    Response::reset();
    $body = ['bets' => ['lines' => 20, 'coinBet' => 0.05, 'totalBet' => 1.0], 'payload' => []];
    arabFairCall($c, 'placeArabianBet', $actor, $body, $requestId, microtime(true));
    return Response::$last;
}
function arabChain(ArabianMockSqlRepository $db): array
{
    return $db->findOne('casino_seed_chains', ['id' => hash('sha256', 'seedchain|arabian_test_user|arabian')]) ?? [];
}

// ── Commit-before-spin + chain linkage across 3 spins ────────────────────────
TestRunner::run('arabian P3 chain — commit-before-spin + linkage across 3 spins', function (): void {
    [$c, $db, $actor] = arabFairHarness();

    // Commitment before any spin == SHA256(the unrevealed seed).
    $chain0 = arabChain($db);
    TestRunner::assertEquals(hash('sha256', (string) $chain0['serverSeed']), (string) $chain0['serverSeedHash'], 'commitment == SHA256(current unrevealed seed)');

    $prevHashNext = null;
    $revealedSeeds = [];
    for ($i = 1; $i <= 3; $i++) {
        $res = arabFairSpin($c, $actor, 'arab_p3_spin_' . $i);
        TestRunner::assertEquals(200, $res['status'], "spin {$i} settles (200)");
        $round = $db->findMany('casino_bets', [])[$i - 1];
        $revealed = (string) $round['serverSeed'];
        $revealedSeeds[] = $revealed;
        // The revealed seed is exactly the one whose hash was committed before it.
        TestRunner::assertEquals(hash('sha256', $revealed), (string) $round['serverSeedHash'], "spin {$i}: revealed seed hashes to the pre-committed hash");
        TestRunner::assertEquals($i - 1, (int) $round['nonce'], "spin {$i} used nonce " . ($i - 1));
        if ($prevHashNext !== null) {
            TestRunner::assertEquals($prevHashNext, hash('sha256', $revealed), "spin {$i}'s seed hashes to spin " . ($i - 1) . "'s serverSeedHashNext (chain links)");
        }
        $prevHashNext = (string) $round['serverSeedHashNext'];
    }

    // Exactly one unrevealed seed at rest, and its hash is the last spin's next-commitment.
    $chainEnd = arabChain($db);
    TestRunner::assertEquals(3, (int) $chainEnd['nonce'], 'chain nonce advanced to 3 after 3 spins');
    TestRunner::assertEquals($prevHashNext, hash('sha256', (string) $chainEnd['serverSeed']), 'the one seed at rest is the committed next seed');
    TestRunner::assertEquals(3, count(array_unique($revealedSeeds)), 'three distinct revealed seeds (chain rotated each spin)');
});

// ── Replay does NOT advance the chain ────────────────────────────────────────
TestRunner::run('arabian P3 replay — cached round, chain does not advance', function (): void {
    [$c, $db, $actor] = arabFairHarness();
    $first = arabFairSpin($c, $actor, 'arab_p3_replay');
    TestRunner::assertEquals(200, $first['status'], 'first spin settles');
    $nonceAfter = (int) arabChain($db)['nonce'];
    $seedAfter = (string) arabChain($db)['serverSeed'];
    $betCount = count($db->findMany('casino_bets', []));

    $replay = arabFairSpin($c, $actor, 'arab_p3_replay'); // same requestId
    TestRunner::assertEquals(200, $replay['status'], 'replay returns 200');
    TestRunner::assertTrue((bool) ($replay['data']['idempotent'] ?? false), 'replay flagged idempotent');
    TestRunner::assertEquals($nonceAfter, (int) arabChain($db)['nonce'], 'replay does NOT advance the chain nonce');
    TestRunner::assertEquals($seedAfter, (string) arabChain($db)['serverSeed'], 'replay does NOT rotate the seed');
    TestRunner::assertEquals($betCount, count($db->findMany('casino_bets', [])), 'replay books no new round');
});

// ── Loud-fail 409 when the chain is missing (never unseeded) ──────────────────
TestRunner::run('arabian P3 missing chain — loud-fail 409, books nothing', function (): void {
    [$c, $db, $actor] = arabFairHarness();
    $db->collections['casino_seed_chains'] = []; // simulate missing chain
    $res = arabFairSpin($c, $actor, 'arab_p3_nochain');
    TestRunner::assertEquals(409, $res['status'], 'missing chain fails 409, never falls back to unseeded RNG');
    TestRunner::assertEquals(0, count($db->findMany('casino_bets', [])), 'no round booked on 409');
    TestRunner::assertEqualsFloat(100.00, (float) $db->findOne('users', ['id' => 'arabian_test_user'])['balance'], 'balance untouched on 409');
});
