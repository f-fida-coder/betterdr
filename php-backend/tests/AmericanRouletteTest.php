<?php

declare(strict_types=1);

/**
 * American Roulette (double-zero wheel) — engine math + money-path suite.
 *
 * ISOLATED SUITE: installs mock Response/SqlRepository/Http/… doubles before
 * the real CasinoController is loaded, exactly like BogeymanSlotTest.
 *
 * Covers: the full bet-type payout matrix against forced pockets (including
 * 0 and 00 killing every outside bet, and 00 never collapsing into 0), the
 * layout-adjacency exploit gate (invalid splits/streets/corners/six-lines
 * REJECTED, client-supplied multipliers ignored), per-position stake caps
 * (including the split-the-stake dodge), whole-dollar enforcement, the
 * atomic N-bets -> one-debit/one-credit money path, idempotent replay,
 * insufficient balance, table min/max and account-max ceilings, and the
 * purge-script disjointness proof for the new slug.
 */

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
    }
}

if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return date('c'); }
        public static function id(string $id): string { return $id; }
    }
}

if (!class_exists('Response')) {
    class Response
    {
        /** @var array{status:int,data:array<string,mixed>} */
        public static array $last = ['status' => 0, 'data' => []];

        public static function json(array $data, int $status = 200): void
        {
            self::$last = ['status' => $status, 'data' => $data];
        }

        public static function reset(): void
        {
            self::$last = ['status' => 0, 'data' => []];
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

if (!class_exists('IpUtils')) {
    class IpUtils
    {
        public static function clientIp(): string { return '127.0.0.1'; }
    }
}

if (!class_exists('RateLimiter')) {
    class RateLimiter
    {
        public static function enforce(mixed $db, string $key, int $limit, int $window): bool
        {
            return false;
        }
    }
}

if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, mixed $default = null): mixed
        {
            return $default;
        }
    }
}

if (!class_exists('SportsbookBetSupport')) {
    class SportsbookBetSupport
    {
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

require_once __DIR__ . '/TestRunner.php';
require_once __DIR__ . '/../src/CasinoController.php';

function arlController(): CasinoController
{
    $ref = new ReflectionClass(CasinoController::class);
    /** @var CasinoController $controller */
    $controller = $ref->newInstanceWithoutConstructor();
    return $controller;
}

function arlCall(object $target, string $method, mixed ...$args): mixed
{
    $ref = new ReflectionMethod($target, $method);
    return $ref->invoke($target, ...$args);
}

final class ArlMockSqlRepository extends SqlRepository
{
    /** @var array<string, array<int, array<string, mixed>>> */
    public array $collections;
    private int $nextId = 1;

    /**
     * @param array<string, array<int, array<string, mixed>>> $seed
     */
    public function __construct(array $seed = [])
    {
        $this->collections = $seed;
    }

    public function beginTransaction(): void
    {
    }

    public function commit(): void
    {
    }

    public function rollback(): void
    {
    }

    public function findOne(string $collection, array $query): ?array
    {
        foreach ($this->collections[$collection] ?? [] as $doc) {
            if ($this->matches($doc, $query)) {
                return $doc;
            }
        }

        return null;
    }

    public function findOneForUpdate(string $collection, array $query): ?array
    {
        return $this->findOne($collection, $query);
    }

    /**
     * @param array<string, mixed> $query
     * @param array<string, mixed> $options
     * @return array<int, array<string, mixed>>
     */
    public function findMany(string $collection, array $query = [], array $options = []): array
    {
        $rows = [];
        foreach ($this->collections[$collection] ?? [] as $doc) {
            if ($this->matches($doc, $query)) {
                $rows[] = $doc;
            }
        }

        return array_values($rows);
    }

    public function insertOne(string $collection, array $document): string
    {
        if (!isset($document['id']) || trim((string) $document['id']) === '') {
            $document['id'] = 'mock_' . $this->nextId++;
        }
        $this->collections[$collection] ??= [];
        $this->collections[$collection][] = $document;
        return (string) $document['id'];
    }

    public function insertOneIfAbsent(string $collection, array $document): void
    {
        $id = (string) ($document['id'] ?? '');
        if ($id !== '' && $this->findOne($collection, ['id' => $id]) !== null) {
            return;
        }
        $this->insertOne($collection, $document);
    }

    public function updateOne(string $collection, array $query, array $updates): void
    {
        $this->collections[$collection] ??= [];
        foreach ($this->collections[$collection] as $idx => $doc) {
            if ($this->matches($doc, $query)) {
                $this->collections[$collection][$idx] = array_replace($doc, $updates);
                return;
            }
        }
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
                if (array_key_exists('$ne', $expected) && $actual === $expected['$ne']) {
                    return false;
                }
                continue;
            }
            if ($actual !== $expected) {
                return false;
            }
        }

        return true;
    }
}

/**
 * @param array<string, mixed> $userOverrides
 * @param array<string, mixed> $gameOverrides
 * @return array{0: CasinoController, 1: ArlMockSqlRepository, 2: array<string, mixed>}
 */
function arlBuildHarness(array $userOverrides = [], array $gameOverrides = []): array
{
    $userId = 'arl_test_user';
    $db = new ArlMockSqlRepository([
        'casinogames' => [array_replace([
            'id' => 'arl_game',
            'slug' => 'american-roulette',
            'name' => 'American Roulette',
            'status' => 'active',
            'minBet' => 1,
            'maxBet' => 5000,
        ], $gameOverrides)],
        'users' => [array_replace([
            'id' => $userId,
            'username' => 'mock_arl_player',
            'role' => 'user',
            'status' => 'active',
            'balance' => 1000.00,
            'pendingBalance' => 0,
            'minBet' => 25,   // hostile account min: casino exemption must ignore it
            'maxBet' => 100000,
        ], $userOverrides)],
        'transactions' => [],
        'casino_bets' => [],
        'casino_round_audit' => [],
        // Phase 3: every spin reads the commit-reveal chain (loud-fail 409
        // without it). Seed a chain exactly as fairness/state would create it.
        'casino_seed_chains' => [[
            'id' => hash('sha256', 'seedchain|' . $userId . '|american-roulette'),
            'userId' => $userId,
            'game' => 'american-roulette',
            'serverSeed' => str_repeat('ab', 32),
            'serverSeedHash' => hash('sha256', str_repeat('ab', 32)),
            'clientSeed' => '',
            'nonce' => 0,
        ]],
    ]);

    $controller = new CasinoController($db, 'arl-test-secret');
    $actor = [
        'id' => $userId,
        'username' => 'mock_arl_player',
        'role' => 'user',
        'status' => 'active',
    ];

    return [$controller, $db, $actor];
}

/**
 * @return array<string, mixed>
 */
function arlUser(ArlMockSqlRepository $db): array
{
    $user = $db->findOne('users', ['id' => 'arl_test_user']);
    if ($user === null) {
        throw new RuntimeException('test user missing');
    }
    return $user;
}

/**
 * @return array{status: int, data: array<string, mixed>}
 */
function arlSpin(CasinoController $controller, array $actor, array $bets, string $requestId, array $payload = []): array
{
    Response::reset();
    arlCall($controller, 'placeAmericanRouletteBet', $actor, ['bets' => $bets, 'payload' => $payload], $requestId, microtime(true));
    return Response::$last;
}

/** Plant a known (serverSeed, nonce) on the test user's chain. */
function arlSetChain(ArlMockSqlRepository $db, string $serverSeed, int $nonce): void
{
    $db->updateOne('casino_seed_chains', ['game' => 'american-roulette'], [
        'serverSeed' => $serverSeed,
        'serverSeedHash' => hash('sha256', $serverSeed),
        'nonce' => $nonce,
    ]);
}

/** @return array<string, mixed> the current chain row */
function arlChain(ArlMockSqlRepository $db): array
{
    $row = $db->findOne('casino_seed_chains', ['game' => 'american-roulette']);
    if ($row === null) {
        throw new RuntimeException('chain row missing');
    }
    return $row;
}

/** Seeded pocket via the engine (reflection). */
function arlPocket(CasinoController $c, string $serverSeed, string $clientSeed, int $nonce): string
{
    return arlCall($c, 'americanRouletteSeededPocket', $serverSeed, $clientSeed, $nonce);
}

/** Parsed entries for one bet spec (throws on invalid). */
function arlEntries(CasinoController $controller, array $bets): array
{
    return arlCall($controller, 'parseAmericanRouletteBets', $bets)['entries'];
}

/** Total return for the given bets against a FORCED pocket token. */
function arlReturn(CasinoController $controller, array $bets, string $token): array
{
    return arlCall($controller, 'calculateAmericanRouletteOutcomeReturn', arlEntries($controller, $bets), $token);
}

function arlExpectReject(CasinoController $controller, array $bet, string $label): void
{
    try {
        arlEntries($controller, [$bet]);
        TestRunner::assertTrue(false, $label . ' must be rejected');
    } catch (InvalidArgumentException $e) {
        TestRunner::assertTrue(true, $label . ' rejected: ' . $e->getMessage());
    }
}

/* ═══════════════════════ bet-type payout matrix ═══════════════════════ */

TestRunner::run('Straight bets pay 35:1 on their pocket only — 00 and 0 are distinct', function (): void {
    $c = arlController();

    $r = arlReturn($c, [['type' => 'straight', 'value' => '17', 'amount' => 10]], '17');
    TestRunner::assertEquals(360.0, $r['totalReturn'], 'straight 17 pays 36x return on 17');
    TestRunner::assertEquals(['straight:17'], $r['winningBetKeys'], 'winning key recorded');

    $r = arlReturn($c, [['type' => 'straight', 'value' => '17', 'amount' => 10]], '18');
    TestRunner::assertEquals(0.0, $r['totalReturn'], 'straight 17 loses on 18');

    $r = arlReturn($c, [['type' => 'straight', 'value' => '00', 'amount' => 10]], '00');
    TestRunner::assertEquals(360.0, $r['totalReturn'], 'straight 00 pays on the 00 pocket');

    $r = arlReturn($c, [['type' => 'straight', 'value' => '00', 'amount' => 10]], '0');
    TestRunner::assertEquals(0.0, $r['totalReturn'], 'straight 00 LOSES on 0 — pockets are distinct');

    $r = arlReturn($c, [['type' => 'straight', 'value' => '0', 'amount' => 10]], '00');
    TestRunner::assertEquals(0.0, $r['totalReturn'], 'straight 0 LOSES on 00 — pockets are distinct');

    $r = arlReturn($c, [['type' => 'straight', 'value' => '0', 'amount' => 10]], '0');
    TestRunner::assertEquals(360.0, $r['totalReturn'], 'straight 0 pays on the 0 pocket');
});

TestRunner::run('Split bets pay 17:1 on either covered pocket', function (): void {
    $c = arlController();
    $bet = [['type' => 'split', 'value' => '17_18', 'amount' => 10]];

    TestRunner::assertEquals(180.0, arlReturn($c, $bet, '17')['totalReturn'], 'split 17/18 pays 18x on 17');
    TestRunner::assertEquals(180.0, arlReturn($c, $bet, '18')['totalReturn'], 'split 17/18 pays 18x on 18');
    TestRunner::assertEquals(0.0, arlReturn($c, $bet, '16')['totalReturn'], 'split 17/18 loses on 16');

    $zeroSplit = [['type' => 'split', 'value' => '0_00', 'amount' => 10]];
    TestRunner::assertEquals(180.0, arlReturn($c, $zeroSplit, '0')['totalReturn'], 'split 0/00 pays on 0');
    TestRunner::assertEquals(180.0, arlReturn($c, $zeroSplit, '00')['totalReturn'], 'split 0/00 pays on 00');
    TestRunner::assertEquals(0.0, arlReturn($c, $zeroSplit, '1')['totalReturn'], 'split 0/00 loses on 1');

    // Value order is canonicalized: 18_17 == 17_18 (same key).
    $entries = arlEntries($c, [['type' => 'split', 'value' => '18_17', 'amount' => 10]]);
    TestRunner::assertEquals('split:17_18', $entries[0]['key'], 'split value canonicalizes to layout order');
});

TestRunner::run('Street, corner, six line, basket and five bet pay their layout groups', function (): void {
    $c = arlController();

    // street 5 covers 13,14,15 at 11:1 (12x return)
    $street = [['type' => 'street', 'value' => '5', 'amount' => 10]];
    TestRunner::assertEquals(120.0, arlReturn($c, $street, '13')['totalReturn'], 'street 5 pays on 13');
    TestRunner::assertEquals(120.0, arlReturn($c, $street, '15')['totalReturn'], 'street 5 pays on 15');
    TestRunner::assertEquals(0.0, arlReturn($c, $street, '16')['totalReturn'], 'street 5 loses on 16');

    // corner 17 covers 17,18,20,21 at 8:1 (9x return)
    $corner = [['type' => 'corner', 'value' => '17', 'amount' => 10]];
    foreach (['17', '18', '20', '21'] as $tok) {
        TestRunner::assertEquals(90.0, arlReturn($c, $corner, $tok)['totalReturn'], 'corner 17 pays on ' . $tok);
    }
    TestRunner::assertEquals(0.0, arlReturn($c, $corner, '19')['totalReturn'], 'corner 17 loses on 19');

    // six line 4 covers 10..15 at 5:1 (6x return)
    $six = [['type' => 'sixline', 'value' => '4', 'amount' => 10]];
    TestRunner::assertEquals(60.0, arlReturn($c, $six, '10')['totalReturn'], 'six line 4 pays on 10');
    TestRunner::assertEquals(60.0, arlReturn($c, $six, '15')['totalReturn'], 'six line 4 pays on 15');
    TestRunner::assertEquals(0.0, arlReturn($c, $six, '16')['totalReturn'], 'six line 4 loses on 16');

    // basket covers 0,00,2 at 11:1 (12x return)
    $basket = [['type' => 'basket', 'value' => '', 'amount' => 10]];
    foreach (['0', '00', '2'] as $tok) {
        TestRunner::assertEquals(120.0, arlReturn($c, $basket, $tok)['totalReturn'], 'basket pays on ' . $tok);
    }
    TestRunner::assertEquals(0.0, arlReturn($c, $basket, '1')['totalReturn'], 'basket loses on 1');

    // five bet covers 0,00,1,2,3 at 6:1 (7x return)
    $five = [['type' => 'fivebet', 'value' => '', 'amount' => 10]];
    foreach (['0', '00', '1', '2', '3'] as $tok) {
        TestRunner::assertEquals(70.0, arlReturn($c, $five, $tok)['totalReturn'], 'five bet pays on ' . $tok);
    }
    TestRunner::assertEquals(0.0, arlReturn($c, $five, '4')['totalReturn'], 'five bet loses on 4');
});

TestRunner::run('Outside bets pay their groups and 0 AND 00 kill every outside bet', function (): void {
    $c = arlController();

    $outside = [
        [['type' => 'dozen', 'value' => 'first', 'amount' => 10], '5', '13'],
        [['type' => 'dozen', 'value' => 'second', 'amount' => 10], '24', '25'],
        [['type' => 'dozen', 'value' => 'third', 'amount' => 10], '25', '24'],
        [['type' => 'column', 'value' => 'first', 'amount' => 10], '34', '35'],
        [['type' => 'column', 'value' => 'second', 'amount' => 10], '35', '36'],
        [['type' => 'column', 'value' => 'third', 'amount' => 10], '36', '34'],
    ];
    foreach ($outside as [$bet, $winTok, $loseTok]) {
        TestRunner::assertEquals(30.0, arlReturn($c, [$bet], $winTok)['totalReturn'], $bet['type'] . ':' . $bet['value'] . ' pays 3x on ' . $winTok);
        TestRunner::assertEquals(0.0, arlReturn($c, [$bet], $loseTok)['totalReturn'], $bet['type'] . ':' . $bet['value'] . ' loses on ' . $loseTok);
    }

    $evenMoney = [
        [['type' => 'color', 'value' => 'red', 'amount' => 10], '32', '33'],
        [['type' => 'color', 'value' => 'black', 'amount' => 10], '33', '32'],
        [['type' => 'parity', 'value' => 'even', 'amount' => 10], '18', '19'],
        [['type' => 'parity', 'value' => 'odd', 'amount' => 10], '19', '18'],
        [['type' => 'range', 'value' => 'low', 'amount' => 10], '18', '19'],
        [['type' => 'range', 'value' => 'high', 'amount' => 10], '19', '18'],
    ];
    foreach ($evenMoney as [$bet, $winTok, $loseTok]) {
        TestRunner::assertEquals(20.0, arlReturn($c, [$bet], $winTok)['totalReturn'], $bet['type'] . ':' . $bet['value'] . ' pays 2x on ' . $winTok);
        TestRunner::assertEquals(0.0, arlReturn($c, [$bet], $loseTok)['totalReturn'], $bet['type'] . ':' . $bet['value'] . ' loses on ' . $loseTok);
    }

    // Every outside bet loses on BOTH zeros (no la partage).
    $allOutside = array_merge(
        array_map(static fn(array $case): array => $case[0], $outside),
        array_map(static fn(array $case): array => $case[0], $evenMoney)
    );
    foreach (['0', '00'] as $zero) {
        $r = arlReturn($c, $allOutside, $zero);
        TestRunner::assertEquals(0.0, $r['totalReturn'], 'all 12 outside bets lose on ' . $zero);
        TestRunner::assertEquals([], $r['winningBetKeys'], 'no winning keys on ' . $zero);
    }

    // 0/00 outcome details carry null group fields and green color.
    foreach (['0', '00'] as $zero) {
        $details = arlCall($c, 'americanRouletteOutcomeDetails', $zero);
        TestRunner::assertEquals($zero, $details['number'], 'outcome number keeps the ' . $zero . ' token');
        TestRunner::assertEquals('green', $details['color'], $zero . ' is green');
        TestRunner::assertTrue(
            $details['parity'] === null && $details['range'] === null && $details['dozen'] === null && $details['column'] === null,
            $zero . ' has no parity/range/dozen/column'
        );
    }
});

TestRunner::run('Multi-bet spins settle every bet independently against one pocket', function (): void {
    $c = arlController();
    $bets = [
        ['type' => 'straight', 'value' => '17', 'amount' => 5],
        ['type' => 'split', 'value' => '17_18', 'amount' => 10],
        ['type' => 'corner', 'value' => '17', 'amount' => 10],
        ['type' => 'color', 'value' => 'black', 'amount' => 20],
        ['type' => 'dozen', 'value' => 'first', 'amount' => 15],
    ];
    // Pocket 17 (black, second dozen): straight 5*36 + split 10*18 + corner
    // 10*9 + black 20*2 = 180+180+90+40 = 490; dozen first loses.
    $r = arlReturn($c, $bets, '17');
    TestRunner::assertEquals(490.0, $r['totalReturn'], 'winning subset sums correctly');
    TestRunner::assertEquals(
        ['straight:17', 'split:17_18', 'corner:17', 'color:black'],
        $r['winningBetKeys'],
        'exactly the winning keys are recorded'
    );
});

/* ═══════════════════ adjacency validation (exploit gate) ═══════════════ */

TestRunner::run('Non-adjacent and malformed inside bets are REJECTED', function (): void {
    $c = arlController();

    // The mock-server exploit: any two numbers as a "split".
    arlExpectReject($c, ['type' => 'split', 'value' => '1_36', 'amount' => 10], 'split 1/36 (opposite ends)');
    arlExpectReject($c, ['type' => 'split', 'value' => '3_4', 'amount' => 10], 'split 3/4 (3 is a street top — not vertically adjacent to 4)');
    arlExpectReject($c, ['type' => 'split', 'value' => '1_5', 'amount' => 10], 'split 1/5 (diagonal)');
    arlExpectReject($c, ['type' => 'split', 'value' => '34_37', 'amount' => 10], 'split 34/37 (37 off the wheel)');
    arlExpectReject($c, ['type' => 'split', 'value' => '17_17', 'amount' => 10], 'split 17/17 (same pocket twice)');
    arlExpectReject($c, ['type' => 'split', 'value' => '0_3', 'amount' => 10], 'split 0/3 (0 does not adjoin 3 on the double-zero layout)');
    arlExpectReject($c, ['type' => 'split', 'value' => '00_1', 'amount' => 10], 'split 00/1 (00 does not adjoin 1)');
    arlExpectReject($c, ['type' => 'split', 'value' => '17', 'amount' => 10], 'split with one number');
    arlExpectReject($c, ['type' => 'split', 'value' => '17_18_19', 'amount' => 10], 'split with three numbers');

    arlExpectReject($c, ['type' => 'street', 'value' => '0', 'amount' => 10], 'street 0');
    arlExpectReject($c, ['type' => 'street', 'value' => '13', 'amount' => 10], 'street 13 (only 12 rows)');

    arlExpectReject($c, ['type' => 'corner', 'value' => '3', 'amount' => 10], 'corner 3 (street top — square leaves the grid)');
    arlExpectReject($c, ['type' => 'corner', 'value' => '12', 'amount' => 10], 'corner 12 (street top)');
    arlExpectReject($c, ['type' => 'corner', 'value' => '33', 'amount' => 10], 'corner 33 (no column to the right)');
    arlExpectReject($c, ['type' => 'corner', 'value' => '0', 'amount' => 10], 'corner 0');

    arlExpectReject($c, ['type' => 'sixline', 'value' => '12', 'amount' => 10], 'six line 12 (needs rows 12+13)');
    arlExpectReject($c, ['type' => 'sixline', 'value' => '0', 'amount' => 10], 'six line 0');

    arlExpectReject($c, ['type' => 'basket', 'value' => '1_2_3', 'amount' => 10], 'basket on a non 0-00-2 group');
    arlExpectReject($c, ['type' => 'fivebet', 'value' => '1_2_3_4_5', 'amount' => 10], 'five bet on a non top-line group');

    arlExpectReject($c, ['type' => 'straight', 'value' => '37', 'amount' => 10], 'straight 37');
    arlExpectReject($c, ['type' => 'straight', 'value' => '-1', 'amount' => 10], 'straight -1');
    arlExpectReject($c, ['type' => 'straight', 'value' => '000', 'amount' => 10], 'straight 000 (leading-zero alias)');
    arlExpectReject($c, ['type' => 'straight', 'value' => '07', 'amount' => 10], 'straight 07 (leading-zero alias)');
    arlExpectReject($c, ['type' => 'straight', 'value' => 'red', 'amount' => 10], 'straight red');

    arlExpectReject($c, ['type' => 'megabet', 'value' => '17', 'amount' => 10], 'unknown bet type');
    arlExpectReject($c, ['type' => 'dozen', 'value' => 'fourth', 'amount' => 10], 'dozen fourth');
    arlExpectReject($c, ['type' => 'color', 'value' => 'green', 'amount' => 10], 'color green (house pocket is not bettable as a color)');
});

TestRunner::run('Every VALID split/corner boundary parses (spot checks along the grid)', function (): void {
    $c = arlController();

    // vertical splits n/n+1 exist iff n is not a street top (n % 3 != 0)
    foreach ([1, 2, 4, 17, 34, 35] as $n) {
        $entries = arlEntries($c, [['type' => 'split', 'value' => $n . '_' . ($n + 1), 'amount' => 1]]);
        TestRunner::assertEquals('split:' . $n . '_' . ($n + 1), $entries[0]['key'], 'vertical split ' . $n . '/' . ($n + 1) . ' valid');
    }
    // horizontal splits n/n+3 for n <= 33
    foreach ([1, 3, 18, 33] as $n) {
        $entries = arlEntries($c, [['type' => 'split', 'value' => $n . '_' . ($n + 3), 'amount' => 1]]);
        TestRunner::assertEquals('split:' . $n . '_' . ($n + 3), $entries[0]['key'], 'horizontal split ' . $n . '/' . ($n + 3) . ' valid');
    }
    // all five zero splits the layout defines
    foreach (['0_00', '0_1', '0_2', '00_2', '00_3'] as $v) {
        $entries = arlEntries($c, [['type' => 'split', 'value' => $v, 'amount' => 1]]);
        TestRunner::assertEquals('split:' . $v, $entries[0]['key'], 'zero split ' . $v . ' valid');
    }
    // corners anchor on any non-street-top n <= 32
    foreach ([1, 2, 17, 31, 32] as $n) {
        $entries = arlEntries($c, [['type' => 'corner', 'value' => (string) $n, 'amount' => 1]]);
        TestRunner::assertEquals('corner:' . $n, $entries[0]['key'], 'corner ' . $n . ' valid');
    }
});

TestRunner::run('Client-supplied multipliers and covers are IGNORED — payouts are server-owned', function (): void {
    $c = arlController();
    $poisoned = [[
        'type' => 'color',
        'value' => 'red',
        'amount' => 10,
        'returnMultiplier' => 999.0,
        'multiplier' => 999.0,
        'covers' => ['0', '00', '17'],   // tries to make red "cover" the zeros
        'payout' => 99999,
    ]];
    $r = arlReturn($c, $poisoned, '32');
    TestRunner::assertEquals(20.0, $r['totalReturn'], 'red still pays exactly 2x return');
    TestRunner::assertEquals(0.0, arlReturn($c, $poisoned, '0')['totalReturn'], 'red still loses on 0 despite poisoned covers');
});

/* ═══════════════════ per-position caps + money parsing ═════════════════ */

TestRunner::run('Per-position stake caps hold, including the split-stake dodge', function (): void {
    $c = arlController();

    // straight cap $25
    $entries = arlEntries($c, [['type' => 'straight', 'value' => '17', 'amount' => 25]]);
    TestRunner::assertEquals(25.0, $entries[0]['amount'], 'straight at exactly $25 accepted');
    arlExpectReject($c, ['type' => 'straight', 'value' => '17', 'amount' => 26], 'straight over $25');

    // duplicate-key entries merge BEFORE the cap check
    try {
        arlEntries($c, [
            ['type' => 'straight', 'value' => '17', 'amount' => 15],
            ['type' => 'straight', 'value' => '17', 'amount' => 15],
        ]);
        TestRunner::assertTrue(false, 'two $15 stakes on one straight must merge to $30 and be rejected');
    } catch (InvalidArgumentException $e) {
        TestRunner::assertTrue(true, 'split-the-stake dodge rejected: ' . $e->getMessage());
    }

    // same for reversed split values (they share one canonical key)
    try {
        arlEntries($c, [
            ['type' => 'split', 'value' => '17_18', 'amount' => 30],
            ['type' => 'split', 'value' => '18_17', 'amount' => 30],
        ]);
        TestRunner::assertTrue(false, 'reversed split values must merge and breach the $50 cap');
    } catch (InvalidArgumentException $e) {
        TestRunner::assertTrue(true, 'reversed-value dodge rejected');
    }

    arlExpectReject($c, ['type' => 'split', 'value' => '17_18', 'amount' => 51], 'split over $50');
    arlExpectReject($c, ['type' => 'street', 'value' => '5', 'amount' => 76], 'street over $75');
    arlExpectReject($c, ['type' => 'basket', 'value' => '', 'amount' => 76], 'basket over $75');
    arlExpectReject($c, ['type' => 'corner', 'value' => '17', 'amount' => 101], 'corner over $100');
    arlExpectReject($c, ['type' => 'fivebet', 'value' => '', 'amount' => 126], 'five bet over $125');
    arlExpectReject($c, ['type' => 'sixline', 'value' => '4', 'amount' => 151], 'six line over $150');
    arlExpectReject($c, ['type' => 'color', 'value' => 'red', 'amount' => 101], 'even-money over $100');
    arlExpectReject($c, ['type' => 'dozen', 'value' => 'first', 'amount' => 101], 'dozen over $100');
});

TestRunner::run('Whole-dollar money parsing: fractional stakes are rejected', function (): void {
    $c = arlController();
    arlExpectReject($c, ['type' => 'color', 'value' => 'red', 'amount' => 10.5], 'fractional $10.50 stake');
    arlExpectReject($c, ['type' => 'color', 'value' => 'red', 'amount' => 'ten'], 'non-numeric stake');
    arlExpectReject($c, ['type' => 'color', 'value' => 'red', 'amount' => -5], 'negative stake');
});

/* ═══════════════════ atomic money path (full handler) ══════════════════ */

TestRunner::run('N bets settle as ONE debit + ONE credit with exact balance math', function (): void {
    [$controller, $db, $actor] = arlBuildHarness();
    $bets = [
        ['type' => 'straight', 'value' => '17', 'amount' => 10],
        ['type' => 'split', 'value' => '0_00', 'amount' => 5],
        ['type' => 'corner', 'value' => '22', 'amount' => 10],
        ['type' => 'color', 'value' => 'red', 'amount' => 20],
        ['type' => 'range', 'value' => 'high', 'amount' => 15],
    ];

    $res = arlSpin($controller, $actor, $bets, 'arl_money_path_0001');
    TestRunner::assertEquals(200, $res['status'], 'spin settles: ' . json_encode($res['data']['message'] ?? ''));
    $data = $res['data'];

    TestRunner::assertEquals(60.0, $data['totalWager'], 'total debit is the sum of all 5 stakes');
    TestRunner::assertEquals('american-roulette', $data['game'], 'round is booked under the new slug');

    // Exactly one debit + one credit, regardless of bet count.
    $txs = $db->collections['transactions'];
    TestRunner::assertEquals(2, count($txs), 'exactly two ledger rows for a 5-bet spin');
    TestRunner::assertEquals('DEBIT', (string) $txs[0]['entrySide'], 'first row is the debit');
    TestRunner::assertEquals('CREDIT', (string) $txs[1]['entrySide'], 'second row is the credit');
    TestRunner::assertEquals(60.0, (float) $txs[0]['amount'], 'debit = sum of stakes');
    TestRunner::assertEquals('casino_american_roulette', (string) $txs[0]['sourceType'], 'debit carries the new sourceType');
    TestRunner::assertEquals('CASINO_AMERICAN_ROULETTE_WAGER', (string) $txs[0]['reason'], 'debit reason');
    TestRunner::assertEquals('CASINO_AMERICAN_ROULETTE_PAYOUT', (string) $txs[1]['reason'], 'credit reason');

    // The credit must equal the recomputed return for the drawn pocket.
    $token = (string) $data['rouletteOutcome']['number'];
    $recomputed = arlReturn($controller, $bets, $token);
    TestRunner::assertEquals($recomputed['totalReturn'], (float) $txs[1]['amount'], 'credit = independently recomputed return for pocket ' . $token);
    TestRunner::assertEquals($recomputed['winningBetKeys'], $data['winningBetKeys'], 'stored winningBetKeys match recomputation');

    // Balance: before - wager + return, exactly.
    $user = arlUser($db);
    TestRunner::assertEquals(1000.0 - 60.0 + $recomputed['totalReturn'], (float) $user['balance'], 'user balance is exact');
    TestRunner::assertEquals((float) $user['balance'], (float) $data['balanceAfter'], 'response balanceAfter matches stored balance');

    // Round + audit rows exist and agree.
    TestRunner::assertEquals(1, count($db->collections['casino_bets']), 'one casino_bets round');
    TestRunner::assertEquals(1, count($db->collections['casino_round_audit']), 'one audit round');
    $round = $db->collections['casino_bets'][0];
    TestRunner::assertEquals($token, (string) $round['result'], 'result stores the pocket token string');
    TestRunner::assertEquals(5, count($round['bets']), 'all 5 normalized bets stored');
    // Ledger rows tie back to the round (debit + credit share its group id).
    TestRunner::assertEquals((string) $round['roundId'], (string) $txs[0]['entryGroupId'], 'debit tied to the round');
    TestRunner::assertEquals((string) $round['roundId'], (string) $txs[1]['entryGroupId'], 'credit tied to the round');
});

TestRunner::run('Outcome pocket is always one of the 38 American pockets (sampled)', function (): void {
    [$controller, $db, $actor] = arlBuildHarness(['balance' => 100000.0]);
    $valid = ['0' => true, '00' => true];
    for ($n = 1; $n <= 36; $n++) {
        $valid[(string) $n] = true;
    }
    for ($i = 0; $i < 40; $i++) {
        $res = arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 1]], 'arl_pocket_sample_' . str_pad((string) $i, 4, '0', STR_PAD_LEFT));
        TestRunner::assertEquals(200, $res['status'], 'sample spin ' . $i . ' settles');
        $token = (string) $res['data']['rouletteOutcome']['number'];
        TestRunner::assertTrue(isset($valid[$token]), 'pocket ' . $token . ' is on the wheel');
        // red pays exactly 0 or 2x — no other outcome exists for a single red bet
        $ret = (float) $res['data']['totalReturn'];
        TestRunner::assertTrue($ret === 0.0 || $ret === 2.0, 'single red $1 returns $0 or $2, got ' . $ret);
    }
});

TestRunner::run('Idempotent replay returns the cached round and never double-charges', function (): void {
    [$controller, $db, $actor] = arlBuildHarness();
    $bets = [['type' => 'straight', 'value' => '7', 'amount' => 10]];

    $first = arlSpin($controller, $actor, $bets, 'arl_idempotent_0001');
    TestRunner::assertEquals(200, $first['status'], 'first spin settles');
    $balanceAfterFirst = (float) arlUser($db)['balance'];
    $txCountAfterFirst = count($db->collections['transactions']);

    $replay = arlSpin($controller, $actor, $bets, 'arl_idempotent_0001');
    TestRunner::assertEquals(200, $replay['status'], 'replay answers 200');
    TestRunner::assertTrue((bool) $replay['data']['idempotent'], 'replay flagged idempotent');
    TestRunner::assertEquals((string) $first['data']['roundId'], (string) $replay['data']['roundId'], 'same round returned');
    TestRunner::assertEquals($balanceAfterFirst, (float) arlUser($db)['balance'], 'balance unchanged by replay');
    TestRunner::assertEquals($txCountAfterFirst, count($db->collections['transactions']), 'no new ledger rows on replay');
    TestRunner::assertEquals(1, count($db->collections['casino_bets']), 'still one round');
});

TestRunner::run('Insufficient balance, table limits and account max reject WITHOUT booking', function (): void {
    // Insufficient balance
    [$controller, $db, $actor] = arlBuildHarness(['balance' => 5.0]);
    $res = arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 10]], 'arl_reject_bal_001');
    TestRunner::assertEquals(400, $res['status'], 'insufficient balance rejected');
    TestRunner::assertEquals(0, count($db->collections['transactions']), 'no ledger rows booked');
    TestRunner::assertEquals(0, count($db->collections['casino_bets']), 'no round booked');
    TestRunner::assertEquals(5.0, (float) arlUser($db)['balance'], 'balance untouched');

    // Below table min ($1): zero-total via no valid bets
    [$controller2, $db2, $actor2] = arlBuildHarness();
    $res = arlSpin($controller2, $actor2, [], 'arl_reject_empty_01');
    TestRunner::assertEquals(400, $res['status'], 'empty bet set rejected');

    // Over table max using position-legal stakes. Phase 2: the table limits
    // are enforced from payoutConfig (the minBet/maxBet COLUMNS are pinned by
    // ensureCasinoSeeded and deliberately do not gate).
    $bigBets = [];
    foreach (['first', 'second', 'third'] as $d) {
        $bigBets[] = ['type' => 'dozen', 'value' => $d, 'amount' => 100];
        $bigBets[] = ['type' => 'column', 'value' => $d, 'amount' => 100];
    }
    // 6 x 100 = 600 passes position caps but we shrink the CONFIG table max:
    [$controller3, $db3, $actor3] = arlBuildHarness([], ['metadata' => ['payoutConfig' => ['tableMax' => 500]]]);
    $res = arlSpin($controller3, $actor3, $bigBets, 'arl_reject_max_001');
    TestRunner::assertEquals(400, $res['status'], 'over-config-table-max rejected');
    TestRunner::assertEquals(0, count($db3->collections['transactions']), 'no ledger rows booked');

    // Account max ceiling
    [$controller4, $db4, $actor4] = arlBuildHarness(['maxBet' => 50]);
    $res = arlSpin($controller4, $actor4, [['type' => 'color', 'value' => 'red', 'amount' => 60]], 'arl_reject_acct_01');
    TestRunner::assertEquals(400, $res['status'], 'account max rejected');
    TestRunner::assertEquals(0, count($db4->collections['transactions']), 'no ledger rows booked');

    // Invalid inside bet through the FULL handler books nothing
    [$controller5, $db5, $actor5] = arlBuildHarness();
    $res = arlSpin($controller5, $actor5, [
        ['type' => 'color', 'value' => 'red', 'amount' => 10],
        ['type' => 'split', 'value' => '1_36', 'amount' => 10],
    ], 'arl_reject_adj_001');
    TestRunner::assertEquals(400, $res['status'], 'spin containing an invalid split rejected');
    TestRunner::assertEquals(0, count($db5->collections['transactions']), 'no partial booking of the valid bet');
    TestRunner::assertEquals(1000.0, (float) arlUser($db5)['balance'], 'balance untouched');
});

TestRunner::run('Casino min-bet exemption: $1 spin passes a hostile $25 account minBet', function (): void {
    [$controller, $db, $actor] = arlBuildHarness();   // user minBet = 25
    $res = arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 1]], 'arl_min_exempt_01');
    TestRunner::assertEquals(200, $res['status'], '$1 roulette spin settles despite account minBet 25');
});

TestRunner::run('Map-shaped bets payloads ("type:value" => amount) parse identically', function (): void {
    $c = arlController();
    $entries = arlCall($c, 'parseAmericanRouletteBets', [
        'straight:17' => 10,
        'split:0_00' => 5,
        'color:red' => 20,
        'basket' => 15,
    ]);
    TestRunner::assertEquals(4, count($entries['entries']), 'all four map entries parsed');
    TestRunner::assertEquals(50.0, $entries['totalWager'], 'map total wager sums');
});

/* ═══════════════════ Phase 2: operational config machinery ═════════════ */

TestRunner::run('Defaults reproduce Phase 1 exactly (config machinery live, nothing stored)', function (): void {
    $c = arlController();
    // No stored config -> resolved effective config equals the spec defaults.
    $effective = arlCall($c, 'resolveGamePayoutConfig', 'american-roulette', ['metadata' => []]);
    $expected = [
        'maxStraight' => 25.0, 'maxSplit' => 50.0, 'maxStreet' => 75.0,
        'maxBasket' => 75.0, 'maxCorner' => 100.0, 'maxFiveBet' => 125.0,
        'maxSixLine' => 150.0, 'maxOutside' => 100.0,
        'tableMin' => 1.0, 'tableMax' => 5000.0, 'fiveBetEnabled' => 1.0,
    ];
    TestRunner::assertEquals($expected, $effective, 'effective defaults match the Phase-1 constants');

    // The derived position-cap map equals the Phase-1 constant table.
    $fromDefaults = arlCall($c, 'americanRoulettePositionMax', $effective);
    $phase1 = [
        'straight' => 25.0, 'split' => 50.0, 'street' => 75.0, 'basket' => 75.0,
        'corner' => 100.0, 'fivebet' => 125.0, 'sixline' => 150.0,
        'dozen' => 100.0, 'column' => 100.0, 'color' => 100.0, 'parity' => 100.0, 'range' => 100.0,
    ];
    TestRunner::assertEquals($phase1, $fromDefaults, 'derived caps == Phase-1 AMERICAN_ROULETTE_POSITION_MAX');
    TestRunner::assertTrue(arlCall($c, 'americanRouletteFiveBetEnabled', $effective), 'five bet defaults ON');

    // A full default-config spin settles and stamps the default config.
    [$controller, $db, $actor] = arlBuildHarness();
    $res = arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 10]], 'arl_p2_default_stamp');
    TestRunner::assertEquals(200, $res['status'], 'default-config spin settles');
    TestRunner::assertEquals($expected, $res['data']['payoutApplied'], 'payoutApplied stamps the effective defaults');
    TestRunner::assertEquals($expected, $db->collections['casino_bets'][0]['payoutApplied'], 'round row carries the stamp');
    TestRunner::assertEquals($expected, $db->collections['casino_round_audit'][0]['payoutApplied'], 'audit row carries the stamp');
});

TestRunner::run('Config-driven caps: lowering rejects above, allows at; raising within clamp works', function (): void {
    // Lower the straight cap to $10.
    [$controller, $db, $actor] = arlBuildHarness([], ['metadata' => ['payoutConfig' => ['maxStraight' => 10]]]);
    $res = arlSpin($controller, $actor, [['type' => 'straight', 'value' => '17', 'amount' => 11]], 'arl_p2_cap_low_rej');
    TestRunner::assertEquals(400, $res['status'], '$11 straight rejected under a $10 config cap');
    TestRunner::assertTrue(str_contains((string) $res['data']['message'], '10'), 'rejection names the configured cap');
    TestRunner::assertEquals(0, count($db->collections['transactions']), 'nothing booked');

    $res = arlSpin($controller, $actor, [['type' => 'straight', 'value' => '17', 'amount' => 10]], 'arl_p2_cap_low_ok');
    TestRunner::assertEquals(200, $res['status'], '$10 straight settles at the new cap');
    TestRunner::assertEquals(10.0, (float) $res['data']['payoutApplied']['maxStraight'], 'stamp shows the non-default cap');

    // Raise the straight cap to $200 (inside the [5, 500] clamp).
    [$controller2, $db2, $actor2] = arlBuildHarness([], ['metadata' => ['payoutConfig' => ['maxStraight' => 200]]]);
    $res = arlSpin($controller2, $actor2, [['type' => 'straight', 'value' => '17', 'amount' => 150]], 'arl_p2_cap_raise_ok');
    TestRunner::assertEquals(200, $res['status'], '$150 straight settles under a $200 config cap');
    // Money path stays exact under the raised cap (reconcile invariant).
    $txs = $db2->collections['transactions'];
    TestRunner::assertEquals(150.0, (float) $txs[0]['amount'], 'debit = stake');
    $token = (string) $res['data']['rouletteOutcome']['number'];
    $expectedReturn = $token === '17' ? 5400.0 : 0.0;
    TestRunner::assertEquals($expectedReturn, (float) $txs[1]['amount'], 'credit = exact 36x return (payout multiplier NOT affected by config)');
});

TestRunner::run('Config-driven table limits gate the spin (columns do not)', function (): void {
    // tableMin 5: a $2 spin rejects, a $5 spin settles.
    [$controller, $db, $actor] = arlBuildHarness([], ['metadata' => ['payoutConfig' => ['tableMin' => 5]]]);
    $res = arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 2]], 'arl_p2_tmin_rej');
    TestRunner::assertEquals(400, $res['status'], '$2 spin rejected under config tableMin 5');
    $res = arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 5]], 'arl_p2_tmin_ok');
    TestRunner::assertEquals(200, $res['status'], '$5 spin settles');

    // Columns deliberately do NOT gate: a hostile column pair (min 50 / max 60)
    // with default config still allows a $10 spin (config default 1/5000 wins).
    [$controller2, $db2, $actor2] = arlBuildHarness([], ['minBet' => 50, 'maxBet' => 60]);
    $res = arlSpin($controller2, $actor2, [['type' => 'color', 'value' => 'red', 'amount' => 10]], 'arl_p2_cols_ignored');
    TestRunner::assertEquals(200, $res['status'], 'pinned columns are ignored — payoutConfig is the only table-limit lever');
});

TestRunner::run('fiveBetEnabled=0: a five bet books NOTHING; =1 pays 6:1; other bets unaffected', function (): void {
    [$controller, $db, $actor] = arlBuildHarness([], ['metadata' => ['payoutConfig' => ['fiveBetEnabled' => 0]]]);

    $res = arlSpin($controller, $actor, [['type' => 'fivebet', 'value' => '', 'amount' => 10]], 'arl_p2_ff_off_rej');
    TestRunner::assertEquals(400, $res['status'], 'five bet rejected when toggled off');
    TestRunner::assertTrue(str_contains(strtolower((string) $res['data']['message']), 'five bet'), 'rejection names the five bet');
    TestRunner::assertEquals(0, count($db->collections['transactions']), 'nothing booked');
    TestRunner::assertEquals(1000.0, (float) arlUser($db)['balance'], 'balance untouched');

    // A mixed spin containing a five bet books nothing either (atomic reject).
    $res = arlSpin($controller, $actor, [
        ['type' => 'color', 'value' => 'red', 'amount' => 10],
        ['type' => 'fivebet', 'value' => '', 'amount' => 5],
    ], 'arl_p2_ff_off_mixed');
    TestRunner::assertEquals(400, $res['status'], 'mixed spin with a disabled five bet rejected whole');
    TestRunner::assertEquals(0, count($db->collections['casino_bets']), 'no round booked');

    // Every other bet type still settles with the toggle off.
    $res = arlSpin($controller, $actor, [
        ['type' => 'straight', 'value' => '00', 'amount' => 5],
        ['type' => 'basket', 'value' => '', 'amount' => 5],
        ['type' => 'color', 'value' => 'red', 'amount' => 5],
    ], 'arl_p2_ff_off_others');
    TestRunner::assertEquals(200, $res['status'], 'non-five-bet wagers unaffected by the toggle');

    // Toggle ON (explicit 1): five bet accepted and pays 7x return (6:1).
    [$controller2, $db2, $actor2] = arlBuildHarness([], ['metadata' => ['payoutConfig' => ['fiveBetEnabled' => 1]]]);
    $res = arlSpin($controller2, $actor2, [['type' => 'fivebet', 'value' => '', 'amount' => 10]], 'arl_p2_ff_on_ok');
    TestRunner::assertEquals(200, $res['status'], 'five bet settles when enabled');
    $token = (string) $res['data']['rouletteOutcome']['number'];
    $expected = in_array($token, ['0', '00', '1', '2', '3'], true) ? 70.0 : 0.0;
    TestRunner::assertEquals($expected, (float) $res['data']['totalReturn'], 'five bet returns exactly 7x or 0');
});

TestRunner::run('Write gate: per-key range rejection, unknown keys (payouts NOT tunable), role guard', function (): void {
    $c = arlController();
    $existing = ['slug' => 'american-roulette', 'metadata' => []];
    $admin = ['role' => 'admin'];
    $agent = ['role' => 'agent'];

    // Out-of-range PUT rejected per key with the allowed range in the message.
    $ranges = [
        'maxStraight' => [4, 501, '5', '500'],
        'maxSplit' => [4, 1001, '5', '1000'],
        'maxStreet' => [4, 1501, '5', '1500'],
        'maxBasket' => [4, 1501, '5', '1500'],
        'maxCorner' => [4, 2001, '5', '2000'],
        'maxFiveBet' => [4, 2501, '5', '2500'],
        'maxSixLine' => [4, 3001, '5', '3000'],
        'maxOutside' => [4, 5001, '5', '5000'],
        'tableMin' => [0, 101, '1', '100'],
        'tableMax' => [99, 20001, '100', '20000'],
        'fiveBetEnabled' => [-1, 2, '0', '1'],
    ];
    foreach ($ranges as $key => [$below, $above, $minTxt, $maxTxt]) {
        foreach ([$below, $above] as $bad) {
            $err = arlCall($c, 'payoutConfigUpdateError', $admin, $existing, ['payoutConfig' => [$key => $bad]]);
            TestRunner::assertEquals(400, $err['status'] ?? 0, $key . '=' . $bad . ' rejected on write');
            TestRunner::assertTrue(
                str_contains((string) ($err['message'] ?? ''), $minTxt) && str_contains((string) ($err['message'] ?? ''), $maxTxt),
                $key . ' rejection names the allowed range'
            );
        }
    }

    // Unknown keys rejected — this is what keeps payout multipliers LOCKED.
    foreach (['straightPayout', 'payoutScale', 'tiePayout', 'europeanWheel'] as $bogus) {
        $err = arlCall($c, 'payoutConfigUpdateError', $admin, $existing, ['payoutConfig' => [$bogus => 1]]);
        TestRunner::assertEquals(400, $err['status'] ?? 0, 'unknown key ' . $bogus . ' rejected — payouts stay locked');
    }

    // Changed config: agent/master_agent/super_agent -> 403; admin -> allowed.
    $change = ['payoutConfig' => ['maxStraight' => 10]];
    foreach (['agent', 'master_agent', 'super_agent'] as $role) {
        $err = arlCall($c, 'payoutConfigUpdateError', ['role' => $role], $existing, $change);
        TestRunner::assertEquals(403, $err['status'] ?? 0, $role . ' cannot change roulette payoutConfig');
    }
    TestRunner::assertNull(arlCall($c, 'payoutConfigUpdateError', $admin, $existing, $change), 'admin change allowed');

    // Re-echoing the current effective config is a no-op for any caller.
    $echo = ['payoutConfig' => [
        'maxStraight' => 25, 'maxSplit' => 50, 'maxStreet' => 75, 'maxBasket' => 75,
        'maxCorner' => 100, 'maxFiveBet' => 125, 'maxSixLine' => 150, 'maxOutside' => 100,
        'tableMin' => 1, 'tableMax' => 5000, 'fiveBetEnabled' => 1,
    ]];
    TestRunner::assertNull(arlCall($c, 'payoutConfigUpdateError', $agent, $existing, $echo), 'unchanged echo passes for an agent');
});

TestRunner::run('Read re-clamp: planted out-of-range values are clamped at settlement + logged', function (): void {
    $logFile = __DIR__ . '/../logs/casino-audit.log';
    $offset = is_file($logFile) ? filesize($logFile) : 0;

    // Plant hostile stored values (as if written around the API).
    [$controller, $db, $actor] = arlBuildHarness([], ['metadata' => ['payoutConfig' => [
        'maxStraight' => 99999,   // above clamp 500 -> 500
        'tableMax' => 50,         // below clamp 100 -> 100
    ]]]);

    // $150 total is over the re-clamped tableMax 100 -> rejected.
    $res = arlSpin($controller, $actor, [
        ['type' => 'color', 'value' => 'red', 'amount' => 100],
        ['type' => 'color', 'value' => 'black', 'amount' => 50],
    ], 'arl_p2_reclamp_rej');
    TestRunner::assertEquals(400, $res['status'], 'planted tableMax 50 re-clamps to 100 — $150 rejected');

    // A $501 straight is over the re-clamped straight cap 500 -> rejected;
    // per-position caps bind before the table max here.
    $res = arlSpin($controller, $actor, [['type' => 'straight', 'value' => '7', 'amount' => 501]], 'arl_p2_reclamp_cap');
    TestRunner::assertEquals(400, $res['status'], 'planted maxStraight 99999 re-clamps to 500 — $501 rejected');

    // A $100 spin settles, and the STAMP carries the clamped values.
    $res = arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 100]], 'arl_p2_reclamp_ok');
    TestRunner::assertEquals(200, $res['status'], 'spin at the re-clamped tableMax settles');
    TestRunner::assertEquals(500.0, (float) $res['data']['payoutApplied']['maxStraight'], 'stamp holds the CLAMPED cap, not the planted value');
    TestRunner::assertEquals(100.0, (float) $res['data']['payoutApplied']['tableMax'], 'stamp holds the CLAMPED table max');

    // The clamp was logged.
    $appended = '';
    if (is_file($logFile)) {
        $fh = fopen($logFile, 'r');
        fseek($fh, $offset);
        $appended = (string) stream_get_contents($fh);
        fclose($fh);
    }
    TestRunner::assertTrue(str_contains($appended, 'payout_config_clamped'), 'read re-clamp is audit-logged');
    TestRunner::assertTrue(str_contains($appended, 'maxStraight'), 'log names the clamped key');
});

TestRunner::run('ensureCasinoSeeded re-pins the COLUMNS but never touches payoutConfig (limits survive)', function (): void {
    [$controller, $db, $actor] = arlBuildHarness([], [
        // Non-default admin config + columns knocked off their defaults.
        'metadata' => ['payoutConfig' => ['tableMax' => 300, 'maxStraight' => 10]],
        'minBet' => 7,
        'maxBet' => 777,
    ]);

    arlCall($controller, 'ensureCasinoSeeded');

    $row = $db->findOne('casinogames', ['slug' => 'american-roulette']);
    TestRunner::assertEquals(1.0, (float) $row['minBet'], 'seed pass re-pins the minBet column to its default');
    TestRunner::assertEquals(5000.0, (float) $row['maxBet'], 'seed pass re-pins the maxBet column to its default');
    TestRunner::assertEquals(300, (int) $row['metadata']['payoutConfig']['tableMax'], 'payoutConfig SURVIVES the seed pass');
    TestRunner::assertEquals(10, (int) $row['metadata']['payoutConfig']['maxStraight'], 'every config key survives');

    // And the effective limits still come from the surviving config: the
    // column-pin problem is fully bypassed.
    $res = arlSpin($controller, $actor, [
        ['type' => 'color', 'value' => 'red', 'amount' => 100],
        ['type' => 'color', 'value' => 'black', 'amount' => 100],
        ['type' => 'parity', 'value' => 'even', 'amount' => 100],
        ['type' => 'parity', 'value' => 'odd', 'amount' => 100],
    ], 'arl_p2_seed_still_config');
    TestRunner::assertEquals(400, $res['status'], 'post-seed spin over config tableMax 300 still rejected');
    $res = arlSpin($controller, $actor, [['type' => 'straight', 'value' => '17', 'amount' => 11]], 'arl_p2_seed_cap');
    TestRunner::assertEquals(400, $res['status'], 'post-seed straight over config cap 10 still rejected');
    $res = arlSpin($controller, $actor, [['type' => 'straight', 'value' => '17', 'amount' => 10]], 'arl_p2_seed_ok');
    TestRunner::assertEquals(200, $res['status'], 'post-seed spin inside config limits settles');
});

TestRunner::run('toPublicGame single-source echo: displayed limits == enforced limits', function (): void {
    $c = arlController();

    // Non-default config: the public payload's minBet/maxBet come from the
    // ENFORCED config, not the pinned columns.
    $game = [
        'slug' => 'american-roulette',
        'minBet' => 1, 'maxBet' => 5000,   // pinned columns
        'metadata' => ['payoutConfig' => ['tableMin' => 5, 'tableMax' => 500, 'maxStraight' => 10]],
    ];
    $pub = arlCall($c, 'toPublicGame', $game);
    TestRunner::assertEquals(5.0, (float) $pub['minBet'], 'public minBet echoes config tableMin');
    TestRunner::assertEquals(500.0, (float) $pub['maxBet'], 'public maxBet echoes config tableMax');
    TestRunner::assertEquals(10.0, (float) $pub['metadata']['payoutConfig']['maxStraight'], 'public payoutConfig carries the straight cap the client displays');
    TestRunner::assertEquals(500.0, (float) $pub['metadata']['payoutConfig']['tableMax'], 'public payoutConfig is the clamped effective config');

    // ...and the SAME values are what the server rejects with:
    [$controller, $db, $actor] = arlBuildHarness([], ['metadata' => ['payoutConfig' => ['tableMin' => 5, 'tableMax' => 500, 'maxStraight' => 10]]]);
    $res = arlSpin($controller, $actor, [['type' => 'straight', 'value' => '17', 'amount' => 11]], 'arl_p2_ss_cap');
    TestRunner::assertEquals(400, $res['status'], 'server rejects above the SAME displayed straight cap');
    $sixHundred = [];
    foreach (['first', 'second', 'third'] as $d) {
        $sixHundred[] = ['type' => 'dozen', 'value' => $d, 'amount' => 100];
        $sixHundred[] = ['type' => 'column', 'value' => $d, 'amount' => 100];
    }
    $res = arlSpin($controller, $actor, $sixHundred, 'arl_p2_ss_tmax');
    TestRunner::assertEquals(400, $res['status'], 'server rejects above the SAME displayed table max');

    // Default config: echo equals the pinned columns (display regression-safe).
    $pub = arlCall($c, 'toPublicGame', ['slug' => 'american-roulette', 'minBet' => 1, 'maxBet' => 5000, 'metadata' => []]);
    TestRunner::assertEquals(1.0, (float) $pub['minBet'], 'default echo minBet unchanged');
    TestRunner::assertEquals(5000.0, (float) $pub['maxBet'], 'default echo maxBet unchanged');
});

TestRunner::run('Payout multipliers are LOCKED: no config can change what a bet pays', function (): void {
    $c = arlController();

    // The spec exposes ONLY operational keys — no payout key exists to tune.
    $effective = arlCall($c, 'resolveGamePayoutConfig', 'american-roulette', ['metadata' => []]);
    $operationalKeys = ['maxStraight', 'maxSplit', 'maxStreet', 'maxBasket', 'maxCorner',
        'maxFiveBet', 'maxSixLine', 'maxOutside', 'tableMin', 'tableMax', 'fiveBetEnabled'];
    TestRunner::assertEquals($operationalKeys, array_keys($effective), 'spec carries operational keys only');

    // With an aggressive (all-minimum) config active, winning returns are
    // still exactly the standard multipliers.
    $minCfg = arlCall($c, 'resolveGamePayoutConfig', 'american-roulette', ['metadata' => ['payoutConfig' => [
        'maxStraight' => 5, 'maxSplit' => 5, 'maxStreet' => 5, 'maxBasket' => 5,
        'maxCorner' => 5, 'maxFiveBet' => 5, 'maxSixLine' => 5, 'maxOutside' => 5,
        'tableMin' => 1, 'tableMax' => 100, 'fiveBetEnabled' => 1,
    ]]]);
    $entries = arlCall($c, 'parseAmericanRouletteBets', [
        ['type' => 'straight', 'value' => '17', 'amount' => 5],
        ['type' => 'split', 'value' => '17_18', 'amount' => 5],
        ['type' => 'fivebet', 'value' => '', 'amount' => 5],
        ['type' => 'color', 'value' => 'black', 'amount' => 5],
    ], $minCfg)['entries'];
    $r = arlCall($c, 'calculateAmericanRouletteOutcomeReturn', $entries, '17');
    // 5*36 + 5*18 + 0 + 5*2 = 180 + 90 + 10 = 280
    TestRunner::assertEquals(280.0, $r['totalReturn'], 'standard multipliers hold under any config');
});

/* ═══════════════════ Phase 3: commit-reveal seeded wheel ════════════════ */

TestRunner::run('Seeded derivation matches an INDEPENDENT reimplementation (keystream spec lock)', function (): void {
    $c = arlController();

    // Straight-line reimplementation of the signed-off recipe, written from
    // the spec (not the engine): HMAC-SHA256(key=serverSeed,
    // msg=clientSeed:nonce:counter) blocks, big-endian uint32s, reject
    // v >= intdiv(2^32,38)*38, pocketIndex = v % 38, map 0/1/k -> 0/00/k-1.
    $reference = static function (string $seed, string $cs, int $nonce): string {
        $limit = intdiv(0x100000000, 38) * 38;
        $counter = 0;
        $buf = '';
        $pos = 0;
        while (true) {
            if ($pos + 4 > strlen($buf)) {
                $buf = hash_hmac('sha256', $cs . ':' . $nonce . ':' . $counter, $seed, true);
                $counter++;
                $pos = 0;
            }
            $v = unpack('N', substr($buf, $pos, 4))[1];
            $pos += 4;
            if ($v >= $limit) {
                continue;
            }
            $i = $v % 38;
            return $i === 0 ? '0' : ($i === 1 ? '00' : (string) ($i - 1));
        }
    };

    TestRunner::assertEquals(4294967290, intdiv(0x100000000, 38) * 38, 'rejection limit is exactly intdiv(2^32,38)*38');

    $seeds = [str_repeat('ab', 32), hash('sha256', 'seed-two'), hash('sha256', 'seed-three')];
    $checked = 0;
    foreach ($seeds as $seed) {
        foreach (['alpha', 'client:seed_1', 'x'] as $cs) {
            for ($nonce = 0; $nonce < 25; $nonce++) {
                $got = arlPocket($c, $seed, $cs, $nonce);
                if ($got !== $reference($seed, $cs, $nonce)) {
                    TestRunner::assertEquals($reference($seed, $cs, $nonce), $got, "tuple ($cs, $nonce) diverged");
                }
                $checked++;
            }
        }
    }
    TestRunner::assertEquals(225, $checked, '225 tuples all match the independent reimplementation');
});

TestRunner::run('BIAS GATE: 76k seeded draws — all 38 pockets uniform, even-money RTP ~94.74%', function (): void {
    $c = arlController();
    $seed = hash('sha256', 'bias-gate-seed');
    $red = ['1' => 1, '3' => 1, '5' => 1, '7' => 1, '9' => 1, '12' => 1, '14' => 1, '16' => 1, '18' => 1,
            '19' => 1, '21' => 1, '23' => 1, '25' => 1, '27' => 1, '30' => 1, '32' => 1, '34' => 1, '36' => 1];

    $n = 76000;               // 2000 expected per pocket
    $counts = [];
    $redReturn = 0;
    for ($i = 0; $i < $n; $i++) {
        $tok = arlPocket($c, $seed, 'bias-gate', $i);
        $counts[$tok] = ($counts[$tok] ?? 0) + 1;
        if (isset($red[$tok])) {
            $redReturn += 2;  // $1 red bet returns $2 on a red pocket
        }
    }

    TestRunner::assertEquals(38, count($counts), 'every one of the 38 pockets was drawn');
    $expected = $n / 38;      // 2000; sd ~44, +/-250 is ~5.7 sd
    foreach (['0', '00', '1', '17', '36'] as $probe) {
        TestRunner::assertTrue(isset($counts[$probe]), "pocket $probe present");
    }
    $min = min($counts);
    $max = max($counts);
    TestRunner::assertTrue(
        $min > $expected - 250 && $max < $expected + 250,
        "pocket counts uniform: min=$min max=$max expected=$expected (skew here = derivation bias, STOP)"
    );

    $rtp = $redReturn / $n;   // expected 2 * 18/38 = 0.947368
    TestRunner::assertTrue(
        abs($rtp - 18 / 19) < 0.02,
        'even-money RTP ' . round($rtp * 100, 2) . '% ~ 94.74% (edge 5.26% preserved by the seeded draw)'
    );
});

TestRunner::run('Determinism on REAL spins: recompute reproduces the pocket — incl. a 0, a 00, and a multi-bet spin', function (): void {
    $c = arlController();
    $seed = str_repeat('cd', 32);
    $cs = 'determinism-check';

    // Deterministically locate nonces that land the two zero pockets.
    $zeroNonce = null;
    $doubleZeroNonce = null;
    $plainNonce = null;
    for ($n = 0; $n < 2000 && ($zeroNonce === null || $doubleZeroNonce === null || $plainNonce === null); $n++) {
        $tok = arlPocket($c, $seed, $cs, $n);
        if ($tok === '0' && $zeroNonce === null) {
            $zeroNonce = $n;
        } elseif ($tok === '00' && $doubleZeroNonce === null) {
            $doubleZeroNonce = $n;
        } elseif ($tok === '17' && $plainNonce === null) {
            $plainNonce = $n;
        }
    }
    TestRunner::assertTrue($zeroNonce !== null && $doubleZeroNonce !== null && $plainNonce !== null, 'found nonces for 0, 00 and 17');

    // A 0 spin and a 00 spin through the FULL handler: outside bets die, the
    // stored round reveals the tuple, and the recompute reproduces the pocket.
    foreach ([[$zeroNonce, '0'], [$doubleZeroNonce, '00']] as [$nonce, $want]) {
        [$controller, $db, $actor] = arlBuildHarness();
        arlSetChain($db, $seed, $nonce);
        $res = arlSpin($controller, $actor, [
            ['type' => 'color', 'value' => 'red', 'amount' => 10],
            ['type' => 'range', 'value' => 'low', 'amount' => 10],
        ], 'arl_p3_zero_' . $want, ['clientSeed' => $cs]);
        TestRunner::assertEquals(200, $res['status'], "spin at planted nonce settles");
        TestRunner::assertEquals($want, (string) $res['data']['rouletteOutcome']['number'], "pocket is exactly $want");
        TestRunner::assertEquals(0.0, (float) $res['data']['totalReturn'], "outside bets die on $want");
        $f = $res['data']['fairness'];
        TestRunner::assertEquals($seed, (string) $f['serverSeed'], 'round reveals the planted seed');
        TestRunner::assertEquals($want, arlPocket($c, (string) $f['serverSeed'], (string) $f['clientSeed'], (int) $f['nonce']), 'recompute from the REVEALED tuple reproduces the pocket');
    }

    // Multi-bet spin on a plain pocket: recompute reproduces the pocket, and
    // each bet's win/loss follows from the public evaluation over it.
    [$controller, $db, $actor] = arlBuildHarness();
    arlSetChain($db, $seed, $plainNonce);
    $bets = [
        ['type' => 'straight', 'value' => '17', 'amount' => 5],
        ['type' => 'split', 'value' => '17_18', 'amount' => 10],
        ['type' => 'color', 'value' => 'black', 'amount' => 20],
        ['type' => 'dozen', 'value' => 'first', 'amount' => 15],
    ];
    $res = arlSpin($controller, $actor, $bets, 'arl_p3_multibet', ['clientSeed' => $cs]);
    TestRunner::assertEquals(200, $res['status'], 'multi-bet spin settles');
    TestRunner::assertEquals('17', (string) $res['data']['rouletteOutcome']['number'], 'pocket is the predicted 17');
    $f = $res['data']['fairness'];
    $recomputedToken = arlPocket($c, (string) $f['serverSeed'], (string) $f['clientSeed'], (int) $f['nonce']);
    TestRunner::assertEquals('17', $recomputedToken, 'recompute reproduces the pocket');
    // Public evaluation over the recomputed pocket == settled money.
    $recomputed = arlReturn($controller, $bets, $recomputedToken);
    TestRunner::assertEquals($recomputed['totalReturn'], (float) $res['data']['totalReturn'], 'per-bet win/loss follows from the public evaluation');
    TestRunner::assertEquals($recomputed['winningBetKeys'], $res['data']['winningBetKeys'], 'winning keys reproduce');
    // 5*36 + 10*18 + 20*2 = 400; dozen first loses on 17.
    TestRunner::assertEquals(400.0, (float) $res['data']['totalReturn'], 'exact standard payouts under the seeded draw');
});

TestRunner::run('Commit-before-spin: the pre-spin hash equals SHA256 of the revealed seed', function (): void {
    [$controller, $db, $actor] = arlBuildHarness();

    // What the player sees BEFORE the spin: the chain's committed hash.
    $preSpinCommitment = (string) arlChain($db)['serverSeedHash'];

    $res = arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 10]], 'arl_p3_commit_1');
    TestRunner::assertEquals(200, $res['status'], 'spin settles');
    $f = $res['data']['fairness'];
    TestRunner::assertEquals($preSpinCommitment, (string) $f['serverSeedHash'], 'revealed round carries the PRE-SPIN commitment');
    TestRunner::assertEquals($preSpinCommitment, hash('sha256', (string) $f['serverSeed']), 'SHA256(revealed serverSeed) == the hash committed before the spin');
});

TestRunner::run('Chain across 3 spins: reveals link hash-to-hash; exactly one unrevealed seed at rest', function (): void {
    [$controller, $db, $actor] = arlBuildHarness();

    $results = [];
    for ($i = 1; $i <= 3; $i++) {
        $res = arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 5]], 'arl_p3_chain_' . $i);
        TestRunner::assertEquals(200, $res['status'], "spin $i settles");
        $results[] = $res['data']['fairness'];
    }

    // Each revealed seed hashes to the PRIOR spin's serverSeedHashNext.
    for ($i = 1; $i < 3; $i++) {
        TestRunner::assertEquals(
            (string) $results[$i - 1]['serverSeedHashNext'],
            hash('sha256', (string) $results[$i]['serverSeed']),
            'spin ' . ($i + 1) . "'s revealed seed hashes to spin $i's serverSeedHashNext"
        );
        TestRunner::assertEquals($i, (int) $results[$i]['nonce'], 'nonce increments by exactly 1 per spin');
    }

    // At rest: ONE chain row for (user, game), holding ONE unrevealed seed
    // whose hash is the last spin's forward commitment.
    $chains = $db->findMany('casino_seed_chains', ['game' => 'american-roulette']);
    TestRunner::assertEquals(1, count($chains), 'exactly one chain row per (user, game)');
    $chain = $chains[0];
    TestRunner::assertEquals((string) $results[2]['serverSeedHashNext'], (string) $chain['serverSeedHash'], "the unrevealed seed's hash == last spin's serverSeedHashNext");
    TestRunner::assertEquals(3, (int) $chain['nonce'], 'chain nonce advanced once per spin');
    // The unrevealed seed has never appeared in any response or round row.
    foreach ($db->collections['casino_bets'] as $row) {
        TestRunner::assertTrue((string) $row['serverSeed'] !== (string) $chain['serverSeed'], 'the at-rest seed is unrevealed');
    }
});

TestRunner::run('Replay: identical pocket + tuple, no re-deal, NO chain advance', function (): void {
    [$controller, $db, $actor] = arlBuildHarness();

    $first = arlSpin($controller, $actor, [['type' => 'straight', 'value' => '7', 'amount' => 10]], 'arl_p3_replay_1');
    TestRunner::assertEquals(200, $first['status'], 'first spin settles');
    $chainAfterFirst = arlChain($db);

    $replay = arlSpin($controller, $actor, [['type' => 'straight', 'value' => '7', 'amount' => 10]], 'arl_p3_replay_1');
    TestRunner::assertTrue((bool) $replay['data']['idempotent'], 'replay flagged idempotent');
    TestRunner::assertEquals((string) $first['data']['rouletteOutcome']['number'], (string) $replay['data']['rouletteOutcome']['number'], 'identical pocket');
    foreach (['serverSeed', 'serverSeedHash', 'serverSeedHashNext', 'clientSeed'] as $k) {
        TestRunner::assertEquals((string) $first['data']['fairness'][$k], (string) $replay['data']['fairness'][$k], "identical $k");
    }
    TestRunner::assertEquals((int) $first['data']['fairness']['nonce'], (int) $replay['data']['fairness']['nonce'], 'identical nonce');

    $chainAfterReplay = arlChain($db);
    TestRunner::assertEquals($chainAfterFirst['serverSeed'], $chainAfterReplay['serverSeed'], 'chain seed did NOT advance on replay');
    TestRunner::assertEquals((int) $chainAfterFirst['nonce'], (int) $chainAfterReplay['nonce'], 'chain nonce did NOT advance on replay');
    TestRunner::assertEquals(1, count($db->collections['casino_bets']), 'no re-deal — still one round');
});

TestRunner::run('Missing chain fails LOUD (409), books nothing — never unseeded fallback', function (): void {
    [$controller, $db, $actor] = arlBuildHarness();
    $db->collections['casino_seed_chains'] = [];

    $res = arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 10]], 'arl_p3_nochain_1');
    TestRunner::assertEquals(409, $res['status'], 'missing chain -> 409, never a silent unseeded draw');
    TestRunner::assertEquals(0, count($db->collections['transactions']), 'no ledger rows booked');
    TestRunner::assertEquals(0, count($db->collections['casino_bets']), 'no round booked');
    TestRunner::assertEquals(1000.0, (float) arlUser($db)['balance'], 'balance untouched');
});

TestRunner::run('Fairness state + verify endpoints serve the american-roulette slug', function (): void {
    [$controller, $db, $actor] = arlBuildHarness();

    // State BEFORE any spin: the commitment exists (endpoint is the chain
    // creator), no lastRound yet.
    Response::reset();
    arlCall($controller, 'getAmericanRouletteFairnessState', $actor);
    $state = Response::$last['data'];
    TestRunner::assertEquals('american-roulette', (string) $state['game'], 'state is game-scoped');
    TestRunner::assertEquals((string) arlChain($db)['serverSeedHash'], (string) $state['serverSeedHash'], 'commitment == chain hash');
    TestRunner::assertEquals(0, (int) $state['nextNonce'], 'nextNonce starts at 0');
    TestRunner::assertEquals(38, (int) $state['pockets'], 'wheel size published');
    TestRunner::assertNull($state['lastRound'], 'no lastRound before any spin');

    // Spin, then state carries the wheel-shaped revealed round.
    $res = arlSpin($controller, $actor, [['type' => 'straight', 'value' => '00', 'amount' => 5]], 'arl_p3_state_1');
    Response::reset();
    arlCall($controller, 'getAmericanRouletteFairnessState', $actor);
    $state = Response::$last['data'];
    $lastRound = $state['lastRound'];
    TestRunner::assertEquals((string) $res['data']['rouletteOutcome']['number'], (string) $lastRound['number'], 'lastRound.number is the settled pocket token');
    TestRunner::assertEquals((string) $res['data']['fairness']['serverSeed'], (string) $lastRound['serverSeed'], 'lastRound reveals the seed');
    TestRunner::assertEquals($res['data']['winningBetKeys'], $lastRound['winningBetKeys'], 'lastRound carries winningBetKeys');
    TestRunner::assertTrue(is_array($lastRound['payoutApplied']), 'lastRound carries the applied config');
    TestRunner::assertEquals((string) $res['data']['fairness']['serverSeedHashNext'], (string) $state['serverSeedHash'], 'state commitment rolled forward to the next spin');

    // Verify endpoint: pure recompute, including a 00 tuple.
    $c = arlController();
    $seed = str_repeat('cd', 32);
    $cs = 'determinism-check';
    $doubleZeroNonce = null;
    for ($n = 0; $n < 2000; $n++) {
        if (arlPocket($c, $seed, $cs, $n) === '00') {
            $doubleZeroNonce = $n;
            break;
        }
    }
    TestRunner::assertNotNull($doubleZeroNonce, 'found a 00 tuple');
    $_GET = ['game' => 'american-roulette', 'serverSeed' => $seed, 'clientSeed' => $cs, 'nonce' => (string) $doubleZeroNonce];
    Response::reset();
    arlCall($controller, 'verifyAmericanRouletteFairness');
    $verify = Response::$last['data'];
    $_GET = [];
    TestRunner::assertEquals('00', (string) $verify['number'], 'verify recomputes the 00 pocket');
    TestRunner::assertEquals('green', (string) $verify['rouletteOutcome']['color'], '00 is green in the recompute');
    TestRunner::assertEquals(hash('sha256', $seed), (string) $verify['inputs']['serverSeedHash'], 'verify echoes the commitment hash of the supplied seed');
});

TestRunner::run('No global fairness secret: chain seeds are fresh entropy, not derived', function (): void {
    // Two consecutive rotations produce unrelated seeds (fresh random_bytes),
    // and nothing in the round ties to any secret: the reveal verifies from
    // the stored tuple alone.
    [$controller, $db, $actor] = arlBuildHarness();
    arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 5]], 'arl_p3_nosecret_1');
    $seedA = (string) arlChain($db)['serverSeed'];
    arlSpin($controller, $actor, [['type' => 'color', 'value' => 'red', 'amount' => 5]], 'arl_p3_nosecret_2');
    $seedB = (string) arlChain($db)['serverSeed'];
    TestRunner::assertTrue($seedA !== $seedB, 'rotation produced a fresh seed');
    TestRunner::assertEquals(64, strlen($seedA), 'seed is 32 bytes hex');
    // Verification needs ONLY the revealed tuple (proven by the recompute
    // tests above) — there is no secret input anywhere in the derivation.
    $round = $db->collections['casino_bets'][0];
    $c = arlController();
    $tok = arlPocket($c, (string) $round['serverSeed'], (string) $round['clientSeed'], (int) $round['nonce']);
    TestRunner::assertEquals((string) $round['result'], $tok, 'stored tuple alone reproduces the round');
});

/* ═══════════════════ purge-script disjointness proof ═══════════════════ */

TestRunner::run('Purge filters can never match the new game (regression lock)', function (): void {
    // Exact-match lists in purge-removed-casino-games.php:
    $removedGames = ['roulette', 'stud-poker'];
    $removedSourceTypes = ['casino_roulette', 'casino_stud_poker'];
    TestRunner::assertTrue(!in_array('american-roulette', $removedGames, true), 'slug not in removed games');
    TestRunner::assertTrue(!in_array('casino_american_roulette', $removedSourceTypes, true), 'sourceType not in removed sourceTypes');

    // The anchored reason regex must not match the new ledger reasons.
    foreach (['CASINO_AMERICAN_ROULETTE_WAGER', 'CASINO_AMERICAN_ROULETTE_PAYOUT'] as $reason) {
        TestRunner::assertEquals(0, preg_match('#^CASINO_(ROULETTE|STUD_POKER)_#i', $reason), $reason . ' does not match the purge regex');
    }
    // …while the dead game's reasons still do (the purge keeps working).
    TestRunner::assertEquals(1, preg_match('#^CASINO_(ROULETTE|STUD_POKER)_#i', 'CASINO_ROULETTE_WAGER'), 'legacy reason still matches');
});
