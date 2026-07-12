<?php

declare(strict_types=1);

/**
 * Bogeyman (SL5R-bm) slot — engine math + money-path suite.
 *
 * ISOLATED SUITE: installs mock Response/SqlRepository/Http/… doubles before
 * the real CasinoController is loaded, exactly like JurassicRunMathTest.
 *
 * Covers: captured-evaluator mirroring (wilds, two-of-a-kind, scatter-led
 * lines, lb-awareness), cent-precise debit/credit + ledger pairing, the $0.01
 * floor spin (no account-min block), account-max ceiling, game-max rejection,
 * insufficient balance, idempotent replay, free-spin zero-debit with the
 * locked-bet tamper guard, and scatter trigger → bonus lock → retire.
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

function bogeymanController(): CasinoController
{
    $ref = new ReflectionClass(CasinoController::class);
    /** @var CasinoController $controller */
    $controller = $ref->newInstanceWithoutConstructor();
    return $controller;
}

function bogeymanCall(object $target, string $method, mixed ...$args): mixed
{
    $ref = new ReflectionMethod($target, $method);
    return $ref->invoke($target, ...$args);
}

final class BogeymanMockSqlRepository extends SqlRepository
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
 * @return array{0: CasinoController, 1: BogeymanMockSqlRepository, 2: array<string, mixed>}
 */
function bogeymanBuildSpinHarness(array $userOverrides = [], array $gameOverrides = []): array
{
    $userId = 'bogeyman_test_user';
    $db = new BogeymanMockSqlRepository([
        'casinogames' => [array_replace([
            'id' => 'bogeyman_game',
            'slug' => 'bogeyman',
            'name' => 'Bogeyman',
            'status' => 'active',
            'minBet' => 0.01,
            'maxBet' => 50,
        ], $gameOverrides)],
        'users' => [array_replace([
            'id' => $userId,
            'username' => 'mock_bogeyman_player',
            'role' => 'user',
            'status' => 'active',
            'balance' => 100.00,
            'pendingBalance' => 0,
            // Deliberately hostile account minBet: the casino exemption must
            // let a $0.01 spin through anyway.
            'minBet' => 25,
            'maxBet' => 100000,
        ], $userOverrides)],
        'transactions' => [],
        'casino_bets' => [],
        'casino_round_audit' => [],
        // Phase 3: every spin reads the commit-reveal chain (loud-fail 409
        // without it). Seed a chain exactly as fairness/state would create it.
        'casino_seed_chains' => [[
            'id' => hash('sha256', 'seedchain|' . $userId . '|bogeyman'),
            'userId' => $userId,
            'game' => 'bogeyman',
            'serverSeed' => str_repeat('ab', 32),
            'serverSeedHash' => hash('sha256', str_repeat('ab', 32)),
            'clientSeed' => '',
            'nonce' => 0,
        ]],
    ]);

    $controller = new CasinoController($db, 'bogeyman-test-secret');
    $actor = [
        'id' => $userId,
        'username' => 'mock_bogeyman_player',
        'role' => 'user',
        'status' => 'active',
    ];

    return [$controller, $db, $actor];
}

/**
 * @return array<string, mixed>
 */
function bogeymanUser(BogeymanMockSqlRepository $db): array
{
    $user = $db->findOne('users', ['id' => 'bogeyman_test_user']);
    if ($user === null) {
        throw new RuntimeException('test user missing');
    }
    return $user;
}

/**
 * @return array{status: int, data: array<string, mixed>}
 */
function bogeymanSpin(CasinoController $controller, array $actor, array $bets, string $requestId, array $payload = []): array
{
    Response::reset();
    bogeymanCall($controller, 'placeBogeymanBet', $actor, ['bets' => $bets, 'payload' => $payload], $requestId, microtime(true));
    return Response::$last;
}

TestRunner::run('Bogeyman evaluator mirrors the captured SL5R math', function (): void {
    $controller = bogeymanController();
    $eval = fn (array $windows, int $lb): array => bogeymanCall($controller, 'evaluateBogeymanWindows', $windows, $lb);

    // 5A on line 1 (middle row); rows 1/3 are all-E so every all-top/bottom
    // path adds 5E=100, and the two 2-run paths off the A row add 2A=10.
    // Captured evaluator (verified): total 1620 over 25 lines.
    $r = $eval(['EAE', 'EAE', 'EAE', 'EAE', 'EAE'], 25);
    TestRunner::assertEquals(1620, (int) $r['coins'], 'full-grid A/E construct totals match the captured evaluator');
    TestRunner::assertTrue(in_array('22222.5A.1000', $r['tokens'], true), '5A hit token matches vendor format');
    TestRunner::assertTrue(in_array('11111.5E.100', $r['tokens'], true), 'top-row 5E token present');

    // Two-of-a-kind A (only symbol with a 2-run pay).
    $r = $eval(['EAE', 'EAE', 'EGB', 'CHF', 'EGD'], 25);
    TestRunner::assertTrue(in_array('222.2A.10', $r['tokens'], true), '2A pays 10 with a 3-char path prefix token');

    // Wild-led runs: W A A -> 3A; W W A -> 3A.
    $r = $eval(['EWE', 'EAE', 'EAE', 'EGB', 'CHF'], 25);
    TestRunner::assertTrue(in_array('2222.3A.35', $r['tokens'], true), 'wild substitutes into an A run');
    $r = $eval(['EWE', 'EWE', 'EAE', 'EGB', 'CHF'], 25);
    TestRunner::assertTrue(in_array('2222.3A.35', $r['tokens'], true), 'double wild lead still bases on first non-wild');

    // All-wild line pays as wilds (5W = 3000).
    $r = $eval(['EWE', 'EWE', 'EWE', 'EWE', 'EWE'], 25);
    TestRunner::assertTrue(in_array('22222.5W.3000', $r['tokens'], true), 'all-wild line pays 5W');

    // Wilds then scatter: base is X -> line pays nothing (captured behavior).
    $r = $eval(['EWE', 'EWE', 'EXE', 'EGB', 'CHF'], 1);
    TestRunner::assertEquals(0, (int) $r['coins'], 'W W X line is scatter-based and pays no line win');

    // Scatter-led line skipped.
    $r = $eval(['EXE', 'EAE', 'EAE', 'EAE', 'EAE'], 1);
    TestRunner::assertEquals(0, (int) $r['coins'], 'X-led line pays nothing');

    // lb-awareness: A across the TOP row is line 2 (11111) — inactive at
    // lb=1, where only the middle row (all E -> 5E=100) pays.
    $top = ['AEG', 'AEG', 'AEG', 'AEG', 'AEG'];
    $lb1 = $eval($top, 1);
    TestRunner::assertEquals(100, (int) $lb1['coins'], 'lb=1 pays only the middle-row 5E');
    TestRunner::assertTrue(!in_array('11111.5A.1000', $lb1['tokens'], true), 'top-row 5A NOT paid at lb=1');
    TestRunner::assertTrue(in_array('11111.5A.1000', $eval($top, 2)['tokens'], true), 'line 2 activates at lb=2');
});

TestRunner::run('Bogeyman $0.01 floor spin places with cent-precise ledger (account-min exempt)', function (): void {
    [$controller, $db, $actor] = bogeymanBuildSpinHarness();

    $res = bogeymanSpin($controller, $actor, ['lines' => 1, 'coinValue' => 0.01, 'totalBet' => 0.01], 'bgm_test_floor_0001');
    TestRunner::assertEquals(200, $res['status'], 'penny spin places despite account minBet=25 (casino exemption)');
    TestRunner::assertEqualsFloat(0.01, (float) $res['data']['totalWager'], 'wager is exactly one cent');

    $totalReturn = (float) $res['data']['totalReturn'];
    $user = bogeymanUser($db);
    $expected = round(100.00 - 0.01 + $totalReturn, 2);
    TestRunner::assertEqualsFloat($expected, round((float) $user['balance'], 2), 'balance = before - wager + return, at cent precision');

    $txns = $db->findMany('transactions', ['userId' => 'bogeyman_test_user']);
    $debits = array_values(array_filter($txns, fn ($t) => $t['type'] === 'casino_bet_debit'));
    TestRunner::assertEquals(1, count($debits), 'exactly one debit row');
    TestRunner::assertEqualsFloat(0.01, (float) $debits[0]['amount'], 'debit amount is the cent wager (not rounded to $0)');
    TestRunner::assertEqualsFloat(100.00, (float) $debits[0]['balanceBefore'], 'debit balanceBefore snapshot');
    TestRunner::assertEqualsFloat(99.99, (float) $debits[0]['balanceAfter'], 'debit balanceAfter keeps the cents');
    TestRunner::assertEquals('casino_bogeyman', (string) $debits[0]['sourceType'], 'ledger sourceType');

    $credits = array_values(array_filter($txns, fn ($t) => $t['type'] === 'casino_bet_credit'));
    if ($totalReturn > 0) {
        TestRunner::assertEquals(1, count($credits), 'winning spin books one credit row');
        TestRunner::assertEqualsFloat(round($totalReturn, 2), (float) $credits[0]['amount'], 'credit amount = totalReturn');
        TestRunner::assertEquals((string) $debits[0]['entryGroupId'], (string) $credits[0]['entryGroupId'], 'debit+credit share the roundId group');
    } else {
        TestRunner::assertEquals(0, count($credits), 'losing spin books no credit row');
    }

    $rounds = $db->findMany('casino_bets', ['userId' => 'bogeyman_test_user']);
    TestRunner::assertEquals(1, count($rounds), 'one casino_bets round row');
    TestRunner::assertEquals('bogeyman', (string) $rounds[0]['game'], 'round is labeled bogeyman');
    TestRunner::assertEquals('settled', (string) $rounds[0]['roundStatus'], 'round settles atomically');
    TestRunner::assertEquals('commit-reveal-hmac-slot-v1', (string) $rounds[0]['rngVersion'], 'rng version stamped (seeded commit-reveal)');
});

TestRunner::run('Bogeyman idempotent replay returns the cached round, no double charge', function (): void {
    [$controller, $db, $actor] = bogeymanBuildSpinHarness();

    $first = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.05, 'totalBet' => 1.25], 'bgm_test_replay_01');
    TestRunner::assertEquals(200, $first['status'], 'first spin settles');
    $balanceAfterFirst = (float) bogeymanUser($db)['balance'];
    $txnCount = count($db->findMany('transactions', []));

    $replay = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.05, 'totalBet' => 1.25], 'bgm_test_replay_01');
    TestRunner::assertEquals(200, $replay['status'], 'replay succeeds');
    TestRunner::assertTrue((bool) $replay['data']['idempotent'], 'replay flagged idempotent');
    TestRunner::assertEquals((string) $first['data']['roundId'], (string) $replay['data']['roundId'], 'same round returned');
    TestRunner::assertEqualsFloat($balanceAfterFirst, (float) bogeymanUser($db)['balance'], 'balance unchanged by replay');
    TestRunner::assertEquals($txnCount, count($db->findMany('transactions', [])), 'no new ledger rows on replay');
    TestRunner::assertEquals(1, count($db->findMany('casino_bets', [])), 'still exactly one round row');
});

TestRunner::run('Bogeyman limits: game max, lowered game max, and account max all bind', function (): void {
    // Full-size bet at the game max is allowed.
    [$controller, $db, $actor] = bogeymanBuildSpinHarness();
    $res = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 2.00, 'totalBet' => 50.00], 'bgm_test_max_ok_01');
    TestRunner::assertEquals(200, $res['status'], '25 lines x $2 = $50 game max is allowed');
    TestRunner::assertEqualsFloat(50.0, (float) $res['data']['totalWager'], 'max wager booked in full');

    // Catalog-lowered game max rejects above it.
    [$controller, $db, $actor] = bogeymanBuildSpinHarness([], ['maxBet' => 1.00]);
    $res = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.05, 'totalBet' => 1.25], 'bgm_test_max_low_1');
    TestRunner::assertEquals(400, $res['status'], 'bet above the catalog game max rejects');
    TestRunner::assertEquals(0, count($db->findMany('transactions', [])), 'rejected bet books no ledger rows');

    // Account MAX (exposure ceiling) still applies to casino wagers.
    [$controller, $db, $actor] = bogeymanBuildSpinHarness(['maxBet' => 10]);
    $res = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 2.00, 'totalBet' => 50.00], 'bgm_test_acct_max_1');
    TestRunner::assertEquals(400, $res['status'], 'account max ceiling rejects the $50 bet');
    TestRunner::assertEquals(0, count($db->findMany('transactions', [])), 'account-max reject books nothing');

    // Invalid chip value is rejected outright.
    [$controller, $db, $actor] = bogeymanBuildSpinHarness();
    $res = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.03, 'totalBet' => 0.75], 'bgm_test_badchip_1');
    TestRunner::assertEquals(400, $res['status'], 'off-ladder coin value rejects');
});

TestRunner::run('Bogeyman insufficient balance rejects cleanly', function (): void {
    [$controller, $db, $actor] = bogeymanBuildSpinHarness(['balance' => 0.20]);
    $res = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.01, 'totalBet' => 0.25], 'bgm_test_broke_001');
    TestRunner::assertEquals(400, $res['status'], 'bet above available balance rejects');
    TestRunner::assertEqualsFloat(0.20, (float) bogeymanUser($db)['balance'], 'balance untouched');
    TestRunner::assertEquals(0, count($db->findMany('transactions', [])), 'no ledger rows');
    TestRunner::assertEquals(0, count($db->findMany('casino_bets', [])), 'no round row');
});

TestRunner::run('Bogeyman free spins: zero debit, locked trigger bet, tamper guard', function (): void {
    [$controller, $db, $actor] = bogeymanBuildSpinHarness([
        'casinoBogeymanState' => [
            'freeSpinsRemaining' => 3,
            'freeSpinLineCount' => 25,
            'freeSpinCoinValue' => 0.05,
        ],
    ]);

    // Client tries to sneak a different (bigger) bet mid-bonus.
    $res = bogeymanSpin($controller, $actor, ['lines' => 1, 'coinValue' => 2.00, 'totalBet' => 2.00], 'bgm_test_fs_tamper1');
    TestRunner::assertEquals(200, $res['status'], 'free spin settles');
    TestRunner::assertEqualsFloat(0.0, (float) $res['data']['totalWager'], 'free spin debits $0');
    TestRunner::assertEquals(25, (int) $res['data']['bets']['lines'], 'locked trigger lines override the client bet');
    TestRunner::assertEqualsFloat(0.05, (float) $res['data']['bets']['coinValue'], 'locked trigger coin value overrides the client bet');
    TestRunner::assertTrue((bool) $res['data']['bets']['isFreeSpinRound'], 'round flagged as free spin');

    $debits = $db->findMany('transactions', ['type' => 'casino_bet_debit']);
    TestRunner::assertEquals(0, count($debits), 'no debit ledger row for a free spin');

    $roundData = $res['data']['roundData'];
    $awarded = (int) ($roundData['freeSpinsAwarded'] ?? 0);
    $stateAfter = bogeymanUser($db)['casinoBogeymanState'];
    TestRunner::assertEquals(2 + $awarded, (int) $stateAfter['freeSpinsRemaining'], 'free spins decrement by exactly one (plus any retrigger)');
    if ((int) $stateAfter['freeSpinsRemaining'] > 0) {
        TestRunner::assertEquals(25, (int) $stateAfter['freeSpinLineCount'], 'lock persists through the bonus');
        TestRunner::assertEqualsFloat(0.05, (float) $stateAfter['freeSpinCoinValue'], 'locked coin value persists');
    }

    // Winning free spins credit at the LOCKED bet.
    $totalReturn = (float) $res['data']['totalReturn'];
    $expectedBalance = round(100.00 + $totalReturn, 2);
    TestRunner::assertEqualsFloat($expectedBalance, round((float) bogeymanUser($db)['balance'], 2), 'free-spin winnings credit without any wager debit');
});

TestRunner::run('Bogeyman scatter trigger locks the bonus to the trigger bet', function (): void {
    [$controller, $db, $actor] = bogeymanBuildSpinHarness(['balance' => 100000.00]);

    $triggered = null;
    for ($i = 0; $i < 3000; $i++) {
        $res = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.10, 'totalBet' => 2.50], 'bgm_test_scatter_' . str_pad((string) $i, 4, '0', STR_PAD_LEFT));
        if ($res['status'] !== 200) {
            throw new RuntimeException('spin failed during scatter hunt: ' . json_encode($res));
        }
        $awarded = (int) ($res['data']['roundData']['freeSpinsAwarded'] ?? 0);
        if ($awarded > 0) {
            $triggered = ['awarded' => $awarded, 'scatterCount' => (int) $res['data']['roundData']['scatterCount']];
            break;
        }
        if (((int) ($res['data']['roundData']['freeSpinsAfter'] ?? 0)) > 0) {
            throw new RuntimeException('free spins active without an award — state leak');
        }
    }
    if ($triggered === null) {
        throw new RuntimeException('no scatter trigger in 3000 spins (expected ~1-in-49) — engine suspect');
    }

    $awardBySpec = [3 => 5, 4 => 10, 5 => 20][min(5, $triggered['scatterCount'])];
    TestRunner::assertEquals($awardBySpec, $triggered['awarded'], 'scatter count maps to the captured 5/10/20 award');

    $state = bogeymanUser($db)['casinoBogeymanState'];
    TestRunner::assertEquals($triggered['awarded'], (int) $state['freeSpinsRemaining'], 'awarded spins are banked server-side');
    TestRunner::assertEquals(25, (int) $state['freeSpinLineCount'], 'bonus locks the trigger line count');
    TestRunner::assertEqualsFloat(0.10, (float) $state['freeSpinCoinValue'], 'bonus locks the trigger coin value');

    // The next spin must be a free one regardless of what the client asks for.
    $balanceBefore = (float) bogeymanUser($db)['balance'];
    $res = bogeymanSpin($controller, $actor, ['lines' => 5, 'coinValue' => 2.00, 'totalBet' => 10.00], 'bgm_test_scatter_fs1');
    TestRunner::assertEquals(200, $res['status'], 'post-trigger spin settles');
    TestRunner::assertEqualsFloat(0.0, (float) $res['data']['totalWager'], 'post-trigger spin is free');
    TestRunner::assertEqualsFloat(
        round($balanceBefore + (float) $res['data']['totalReturn'], 2),
        round((float) bogeymanUser($db)['balance'], 2),
        'free-spin balance moves only by winnings'
    );
});

TestRunner::run('Bogeyman ledger chain reconciles: every balance move has a matching entry', function (): void {
    [$controller, $db, $actor] = bogeymanBuildSpinHarness(['balance' => 500.00]);

    for ($i = 0; $i < 40; $i++) {
        $res = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.05, 'totalBet' => 1.25], 'bgm_test_chain_' . str_pad((string) $i, 3, '0', STR_PAD_LEFT));
        if ($res['status'] !== 200) {
            throw new RuntimeException('chain spin failed: ' . json_encode($res));
        }
    }

    // Replay the ledger: starting balance + every entry must land exactly on
    // the stored user balance, and each entry's before/after must be exact.
    $txns = $db->findMany('transactions', ['userId' => 'bogeyman_test_user']);
    $running = 500.00;
    foreach ($txns as $t) {
        TestRunner::assertEqualsFloat($running, (float) $t['balanceBefore'], 'entry balanceBefore continues the chain');
        $delta = ($t['entrySide'] === 'DEBIT' ? -1 : 1) * (float) $t['amount'];
        $running = round($running + $delta, 2);
        TestRunner::assertEqualsFloat($running, (float) $t['balanceAfter'], 'entry balanceAfter is exact');
    }
    TestRunner::assertEqualsFloat($running, round((float) bogeymanUser($db)['balance'], 2), 'ledger replay lands on the stored balance (zero drift)');

    // Wager/return sums in casino_bets match the ledger sums exactly.
    $rounds = $db->findMany('casino_bets', ['userId' => 'bogeyman_test_user']);
    $wagerSum = 0.0;
    $returnSum = 0.0;
    foreach ($rounds as $r) {
        $wagerSum = round($wagerSum + (float) $r['totalWager'], 2);
        $returnSum = round($returnSum + (float) $r['totalReturn'], 2);
    }
    $debitSum = 0.0;
    $creditSum = 0.0;
    foreach ($txns as $t) {
        if ($t['entrySide'] === 'DEBIT') { $debitSum = round($debitSum + (float) $t['amount'], 2); }
        else { $creditSum = round($creditSum + (float) $t['amount'], 2); }
    }
    TestRunner::assertEqualsFloat($wagerSum, $debitSum, 'sum(totalWager) == sum(ledger debits)');
    TestRunner::assertEqualsFloat($returnSum, $creditSum, 'sum(totalReturn) == sum(ledger credits)');
});

/* ═══════════════ Phase 2 — admin payout config (scale + free-spin awards) ═══════════════ */

TestRunner::run('Bogeyman payoutScale floors per-hit coins; scale 1.0 is byte-identical to Phase 1', function (): void {
    $controller = bogeymanController();
    $eval = fn (array $w, int $lb, float $s): array => bogeymanCall($controller, 'evaluateBogeymanWindows', $w, $lb, $s);

    // Default scale must reproduce the exact Phase-1 tokens.
    $grid = ['EAE', 'EAE', 'EAE', 'EAE', 'EAE'];
    $base = $eval($grid, 25, 1.0);
    TestRunner::assertEquals(1620, (int) $base['coins'], 'scale 1.0 total identical to Phase 1');
    TestRunner::assertTrue(in_array('22222.5A.1000', $base['tokens'], true), 'scale 1.0 token identical to Phase 1');

    // Scaled: every hit floors independently. 1000*0.85=850, 100*0.85=85, 10*0.85=8(.5 floored).
    $scaled = $eval($grid, 25, 0.85);
    TestRunner::assertTrue(in_array('22222.5A.850', $scaled['tokens'], true), '5A floors to 850 at 0.85');
    TestRunner::assertTrue(in_array('11111.5E.85', $scaled['tokens'], true), '5E floors to 85 at 0.85');
    TestRunner::assertTrue(in_array('221.2A.8', $scaled['tokens'], true), '2A floors 8.5 -> 8 (house-safe)');
    // 850 + 6x85 + 2x8 = 1376
    TestRunner::assertEquals(1376, (int) $scaled['coins'], 'per-hit floored total at 0.85');

    // Clamp floor: 3000*0.80=2400 exact; 10*0.80=8.
    $floor = $eval(['EWE', 'EWE', 'EWE', 'EWE', 'EWE'], 1, 0.80);
    TestRunner::assertTrue(in_array('22222.5W.2400', $floor['tokens'], true), '5W scales to 2400 at clamp floor');
});

TestRunner::run('Bogeyman payout config resolution clamps stored values on read', function (): void {
    $controller = bogeymanController();
    $resolve = fn (?array $row): array => bogeymanCall($controller, 'resolveBogeymanPayoutConfig', $row);

    // Missing config -> exact defaults.
    $cfg = $resolve(['slug' => 'bogeyman', 'metadata' => []]);
    TestRunner::assertEqualsFloat(1.00, $cfg['payoutScale'], 'default scale 1.00');
    TestRunner::assertEquals(5, $cfg['freeSpins3'], 'default 3-scatter award 5');
    TestRunner::assertEquals(10, $cfg['freeSpins4'], 'default 4-scatter award 10');
    TestRunner::assertEquals(20, $cfg['freeSpins5'], 'default 5-scatter award 20');

    // Planted out-of-range values are re-clamped on read — never trusted raw.
    $cfg = $resolve(['slug' => 'bogeyman', 'metadata' => ['payoutConfig' => [
        'payoutScale' => 1.50, 'freeSpins3' => 99, 'freeSpins4' => 1, 'freeSpins5' => 400,
    ]]]);
    TestRunner::assertEqualsFloat(1.00, $cfg['payoutScale'], 'scale 1.50 clamps down to 1.00');
    TestRunner::assertEquals(6, $cfg['freeSpins3'], 'freeSpins3 99 clamps to max 6');
    TestRunner::assertEquals(5, $cfg['freeSpins4'], 'freeSpins4 1 clamps up to min 5');
    TestRunner::assertEquals(40, $cfg['freeSpins5'], 'freeSpins5 400 clamps to max 40');

    $cfg = $resolve(['slug' => 'bogeyman', 'metadata' => ['payoutConfig' => ['payoutScale' => 0.10]]]);
    TestRunner::assertEqualsFloat(0.80, $cfg['payoutScale'], 'scale 0.10 clamps up to floor 0.80');
});

TestRunner::run('Bogeyman payout config write guard: range + admin-only role, scoped to payoutConfig', function (): void {
    $controller = bogeymanController();
    $existing = ['slug' => 'bogeyman', 'metadata' => []];
    $check = fn (array $actor, mixed $meta): ?array => bogeymanCall($controller, 'payoutConfigUpdateError', $actor, $existing, $meta);
    $admin = ['role' => 'admin'];

    // Out-of-range rejects with the allowed range, for every key.
    foreach ([
        ['payoutScale' => 0.79], ['payoutScale' => 1.01],
        ['freeSpins3' => 2], ['freeSpins3' => 7],
        ['freeSpins4' => 4], ['freeSpins4' => 21],
        ['freeSpins5' => 9], ['freeSpins5' => 41],
    ] as $bad) {
        $err = $check($admin, ['payoutConfig' => $bad]);
        TestRunner::assertEquals(400, (int) ($err['status'] ?? 0), 'out-of-range ' . json_encode($bad) . ' rejects 400');
        TestRunner::assertTrue(str_contains((string) ($err['message'] ?? ''), 'between'), 'rejection message names the allowed range');
    }

    // Unknown key rejects.
    $err = $check($admin, ['payoutConfig' => ['symbolWeights' => [1, 2, 3]]]);
    TestRunner::assertEquals(400, (int) ($err['status'] ?? 0), 'unknown payoutConfig key rejects (no symbol-weight backdoor)');

    // Non-admin roles are rejected for an EFFECTIVE change...
    foreach (['agent', 'master_agent', 'super_agent'] as $role) {
        $err = $check(['role' => $role], ['payoutConfig' => ['payoutScale' => 0.90]]);
        TestRunner::assertEquals(403, (int) ($err['status'] ?? 0), $role . ' cannot change payoutConfig');
    }
    // ...but echoing the current (default) config is not an edit.
    $err = $check(['role' => 'agent'], ['payoutConfig' => ['payoutScale' => 1.00, 'freeSpins3' => 5, 'freeSpins4' => 10, 'freeSpins5' => 20]]);
    TestRunner::assertTrue($err === null, 'agent echoing current config is a no-op, not a 403');

    // Admin with an in-range change passes the guard.
    $err = $check($admin, ['payoutConfig' => ['payoutScale' => 0.85, 'freeSpins3' => 6, 'freeSpins4' => 12, 'freeSpins5' => 25]]);
    TestRunner::assertTrue($err === null, 'admin in-range change is allowed');
});

TestRunner::run('Bogeyman spins settle and stamp with a NON-default config', function (): void {
    [$controller, $db, $actor] = bogeymanBuildSpinHarness(['balance' => 100000.00], ['metadata' => ['payoutConfig' => [
        'payoutScale' => 0.85, 'freeSpins3' => 6, 'freeSpins4' => 12, 'freeSpins5' => 25,
    ]]]);

    // Scaled paytable the engine should pay from (floor per hit).
    $scaledPays = [];
    foreach ([
        '2A' => 10, '3A' => 35, '4A' => 250, '5A' => 1000, '3B' => 30, '4B' => 150, '5B' => 750,
        '3C' => 25, '4C' => 120, '5C' => 500, '3D' => 20, '4D' => 90, '5D' => 300,
        '3E' => 10, '4E' => 30, '5E' => 100, '3F' => 10, '4F' => 30, '5F' => 100,
        '3G' => 10, '4G' => 30, '5G' => 100, '3H' => 10, '4H' => 30, '5H' => 100,
        '2W' => 15, '3W' => 75, '4W' => 500, '5W' => 3000,
    ] as $key => $coins) {
        $scaledPays[$key] = (int) floor($coins * 0.85);
    }

    $sawWin = false;
    $sawScatter = null;
    for ($i = 0; $i < 3000; $i++) {
        $res = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.05, 'totalBet' => 1.25], 'bgm_p2_cfg_' . str_pad((string) $i, 4, '0', STR_PAD_LEFT));
        if ($res['status'] !== 200) {
            throw new RuntimeException('config spin failed: ' . json_encode($res));
        }
        $data = $res['data'];

        // Stamp check on every round.
        $stamp = $data['payoutApplied'] ?? null;
        if (!is_array($stamp) || abs((float) $stamp['payoutScale'] - 0.85) > 1e-9 || (int) $stamp['freeSpins3'] !== 6) {
            throw new RuntimeException('payoutApplied stamp wrong: ' . json_encode($stamp));
        }

        $rd = $data['roundData'] ?? [];
        foreach (($rd['winningLines'] ?? []) as $line) {
            $key = $line['count'] . $line['symbol'];
            if ((int) $line['coins'] !== ($scaledPays[$key] ?? -1)) {
                throw new RuntimeException('line paid ' . $line['coins'] . ' coins for ' . $key . ', expected ' . ($scaledPays[$key] ?? -1));
            }
            $sawWin = true;
        }
        // Winning money must equal scaled coins x coin value exactly (cents).
        if (($rd['coinsWon'] ?? 0) > 0) {
            $expected = round(((int) $rd['coinsWon']) * 0.05, 2);
            if (abs((float) $data['totalReturn'] - $expected) > 1e-9) {
                throw new RuntimeException('totalReturn ' . $data['totalReturn'] . ' != scaled coins x cv ' . $expected);
            }
        }
        if (($rd['freeSpinsAwarded'] ?? 0) > 0 && $sawScatter === null) {
            $sawScatter = ['count' => (int) $rd['scatterCount'], 'awarded' => (int) $rd['freeSpinsAwarded']];
        }
        if ($sawWin && $sawScatter !== null) {
            break;
        }
    }
    TestRunner::assertTrue($sawWin, 'observed winning lines paying the floor-scaled coin amounts');
    TestRunner::assertTrue($sawScatter !== null, 'observed a scatter trigger');
    $expectedAward = [3 => 6, 4 => 12, 5 => 25][min(5, $sawScatter['count'])];
    TestRunner::assertEquals($expectedAward, $sawScatter['awarded'], 'scatter award uses the CONFIGURED counts (6/12/25)');
});

/* ═══════════════ Phase 3 — commit-reveal seeded stops (provably fair) ═══════════════ */

TestRunner::run('Bogeyman seeded stop derivation is deterministic and in range', function (): void {
    $controller = bogeymanController();
    $derive = fn (string $ss, string $cs, int $n): array => bogeymanCall($controller, 'bogeymanSeededStops', $ss, $cs, $n);

    $seed = hash('sha256', 'test-vector-seed');
    [$stops1, $windows1] = $derive($seed, 'client-abc', 7);
    [$stops2, $windows2] = $derive($seed, 'client-abc', 7);
    TestRunner::assertEquals(json_encode($stops1), json_encode($stops2), 'same tuple => identical stops');
    TestRunner::assertEquals(json_encode($windows1), json_encode($windows2), 'same tuple => identical windows');

    // Any component change changes the outcome (overwhelmingly).
    [$stopsB] = $derive($seed, 'client-abc', 8);
    TestRunner::assertTrue(json_encode($stops1) !== json_encode($stopsB), 'nonce change changes stops');
    [$stopsC] = $derive($seed, 'client-xyz', 7);
    TestRunner::assertTrue(json_encode($stops1) !== json_encode($stopsC), 'clientSeed change changes stops');

    // Stops are 1-based and within each strip's length; windows read from the strips.
    $lengths = [100, 99, 99, 97, 96];
    foreach ($stops1 as $r => $stop) {
        TestRunner::assertTrue($stop >= 1 && $stop <= $lengths[$r], 'stop reel ' . $r . ' in [1,' . $lengths[$r] . ']');
    }
    TestRunner::assertEquals(5, count($windows1), 'five 3-symbol windows');
    foreach ($windows1 as $w) {
        TestRunner::assertEquals(3, strlen((string) $w), 'window is 3 symbols');
    }
});

TestRunner::run('Bogeyman spin without a seed chain fails LOUD (409), books nothing', function (): void {
    [$controller, $db, $actor] = bogeymanBuildSpinHarness();
    $db->collections['casino_seed_chains'] = []; // simulate missing chain

    $res = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.05, 'totalBet' => 1.25], 'bgm_p3_nochain_01');
    TestRunner::assertEquals(409, $res['status'], 'missing chain fails 409, never unseeded');
    TestRunner::assertEquals(0, count($db->findMany('transactions', [])), 'no ledger rows');
    TestRunner::assertEquals(0, count($db->findMany('casino_bets', [])), 'no round row');
    TestRunner::assertEqualsFloat(100.00, (float) bogeymanUser($db)['balance'], 'balance untouched');
});

TestRunner::run('Bogeyman commit-reveal chain: reveal matches commitment, links across spins, replay does not advance', function (): void {
    [$controller, $db, $actor] = bogeymanBuildSpinHarness(['balance' => 10000.00]);
    $chainQuery = ['game' => 'bogeyman'];

    $rounds = [];
    for ($i = 0; $i < 3; $i++) {
        $chainBefore = $db->findMany('casino_seed_chains', $chainQuery)[0];
        $res = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.05, 'totalBet' => 1.25], 'bgm_p3_chain_' . $i, ['clientSeed' => 'walk-seed-' . $i]);
        TestRunner::assertEquals(200, $res['status'], 'spin ' . $i . ' settles');
        $f = $res['data']['fairness'];

        // Commit-before-spin: the seed revealed NOW is the one whose hash sat
        // in the chain BEFORE the spin.
        TestRunner::assertEquals((string) $chainBefore['serverSeed'], (string) $f['serverSeed'], 'revealed seed is the pre-committed one');
        TestRunner::assertEquals((string) $chainBefore['serverSeedHash'], (string) $f['serverSeedHash'], 'commitment shown before == stored commitment');
        TestRunner::assertEquals(hash('sha256', (string) $f['serverSeed']), (string) $f['serverSeedHash'], 'SHA256(revealed) == commitment');
        TestRunner::assertEquals((int) $chainBefore['nonce'], (int) $f['nonce'], 'nonce consumed in order');
        TestRunner::assertEquals('walk-seed-' . $i, (string) $f['clientSeed'], 'player clientSeed honored');

        // Deterministic recompute of the stops from the revealed tuple.
        [$stops] = bogeymanCall($controller, 'bogeymanSeededStops', (string) $f['serverSeed'], (string) $f['clientSeed'], (int) $f['nonce']);
        TestRunner::assertEquals(json_encode($res['data']['roundData']['stops']), json_encode($stops), 'stops reproduce from the revealed tuple');

        $rounds[] = $f;
    }

    // Chain linkage: each spin's serverSeedHashNext == next spin's commitment.
    for ($i = 0; $i < 2; $i++) {
        TestRunner::assertEquals((string) $rounds[$i]['serverSeedHashNext'], (string) $rounds[$i + 1]['serverSeedHash'], 'spin ' . $i . ' hashNext == spin ' . ($i + 1) . ' commitment');
    }

    // Exactly one unrevealed seed at rest; it matches the last hashNext.
    $chains = $db->findMany('casino_seed_chains', $chainQuery);
    TestRunner::assertEquals(1, count($chains), 'one chain row per (user, game)');
    TestRunner::assertEquals((string) $rounds[2]['serverSeedHashNext'], (string) $chains[0]['serverSeedHash'], 'chain holds the next unrevealed commitment');
    TestRunner::assertEquals(3, (int) $chains[0]['nonce'], 'nonce advanced once per spin');

    // Replay: identical reveal, NO chain advance, no re-deal.
    $chainAtRest = $chains[0];
    $replay = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.05, 'totalBet' => 1.25], 'bgm_p3_chain_2', ['clientSeed' => 'walk-seed-2']);
    TestRunner::assertTrue((bool) $replay['data']['idempotent'], 'replay is idempotent');
    TestRunner::assertEquals((string) $rounds[2]['serverSeed'], (string) $replay['data']['fairness']['serverSeed'], 'replay returns the same revealed seed');
    TestRunner::assertEquals(json_encode($chainAtRest), json_encode($db->findMany('casino_seed_chains', $chainQuery)[0]), 'replay does not touch the chain');
});

TestRunner::run('Bogeyman free spins each consume their own nonce; free-spin replay does not advance', function (): void {
    [$controller, $db, $actor] = bogeymanBuildSpinHarness([
        'balance' => 10000.00,
        'casinoBogeymanState' => ['freeSpinsRemaining' => 2, 'freeSpinLineCount' => 25, 'freeSpinCoinValue' => 0.05],
    ]);

    $r1 = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.05, 'totalBet' => 1.25], 'bgm_p3_fs_a');
    $r2 = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.05, 'totalBet' => 1.25], 'bgm_p3_fs_b');
    TestRunner::assertEqualsFloat(0.0, (float) $r1['data']['totalWager'], 'free spin 1 debits $0');
    TestRunner::assertEqualsFloat(0.0, (float) $r2['data']['totalWager'], 'free spin 2 debits $0');
    TestRunner::assertEquals(0, (int) $r1['data']['fairness']['nonce'], 'free spin 1 uses nonce 0');
    TestRunner::assertEquals(1, (int) $r2['data']['fairness']['nonce'], 'free spin 2 uses nonce 1');
    TestRunner::assertEquals(
        (string) $r1['data']['fairness']['serverSeedHashNext'],
        (string) $r2['data']['fairness']['serverSeedHash'],
        'bonus spins link on the same chain'
    );

    $chainBefore = $db->findMany('casino_seed_chains', ['game' => 'bogeyman'])[0];
    $replay = bogeymanSpin($controller, $actor, ['lines' => 25, 'coinValue' => 0.05, 'totalBet' => 1.25], 'bgm_p3_fs_a');
    TestRunner::assertTrue((bool) $replay['data']['idempotent'], 'free-spin replay idempotent');
    TestRunner::assertEquals(
        json_encode($r1['data']['roundData']['stops']),
        json_encode($replay['data']['roundData']['stops']),
        'free-spin replay returns identical stops'
    );
    TestRunner::assertEquals(json_encode($chainBefore), json_encode($db->findMany('casino_seed_chains', ['game' => 'bogeyman'])[0]), 'free-spin replay does not advance the chain');
});

TestRunner::run('Bogeyman stripsHash is stamped and stable', function (): void {
    [$controller, $db, $actor] = bogeymanBuildSpinHarness();
    $res = bogeymanSpin($controller, $actor, ['lines' => 1, 'coinValue' => 0.01, 'totalBet' => 0.01], 'bgm_p3_strips_1');
    $stamped = (string) ($db->findMany('casino_bets', [])[0]['stripsHash'] ?? '');
    TestRunner::assertEquals(64, strlen($stamped), 'stripsHash stamped on the round');
    TestRunner::assertEquals($stamped, (string) $res['data']['fairness']['stripsHash'], 'stripsHash revealed in the response');
});
