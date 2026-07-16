<?php

declare(strict_types=1);

/**
 * Unit tests for manual/write-in bet GRADING (ManualBetGradingService) —
 * the CardBetGradingService sibling. Mocked SqlRepository, no HTTP, no real
 * DB — ISOLATED suite (see ISOLATED_SUITES in run.php).
 *
 * Coverage map:
 *   - fence matrix:   gradeableManualBetError — not found / not pending /
 *                     wrong type / leg count / non-manual leg (a CARD leg is
 *                     explicitly refused: the two manual-grade surfaces must
 *                     never cross).
 *   - money — won:    cash credits stake+profit; credit account credits
 *                     PROFIT ONLY; totalWinnings tracks profit; pending
 *                     released exactly once.
 *   - money — lost:   cash releases pending with NO balance change (stake
 *                     left at placement); credit account debits balance by
 *                     the stake NOW (it was never debited at placement).
 *   - money — void:   cash refunds stake to balance; credit account refunds
 *                     nothing to balance (nothing was taken); pending
 *                     released either way.
 *   - pinning:        acceptedPayout honored within ±$2 on wins.
 *   - idempotency:    second grade on a terminal bet is a refused no-op —
 *                     balances byte-identical after the replay.
 *   - audit:          settledBy/settledAt on the bet, gradeReason on the leg,
 *                     ledger row reason/type per decision.
 */

// ── Stubs (mirror the other no-DB suites) ────────────────────────────────────

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
        /** @param array<string, mixed> $extra */
        public function __construct(string $message, int $code = 0, private array $extra = [])
        {
            parent::__construct($message, $code);
        }

        /** @return array<string, mixed> */
        public function payload(): array
        {
            return $this->extra;
        }
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
        /** @var array<string, string> */
        public static array $store = [];

        public static function get(string $key, ?string $default = null): ?string
        {
            return self::$store[$key] ?? $default;
        }
    }
}

if (!class_exists('Logger')) {
    class Logger
    {
        public static function exception(Throwable $e, string $context = ''): void {}
    }
}

final class ManualGradeMockSqlRepository extends SqlRepository
{
    /** @var array<string, array<int, array<string, mixed>>> */
    public array $collections;
    public int $rollbacks = 0;
    public int $commits = 0;
    private int $nextId = 1;

    /** @param array<string, array<int, array<string, mixed>>> $seed */
    public function __construct(array $seed = [])
    {
        $this->collections = $seed;
    }

    public function beginTransaction(): void {}
    public function commit(): void { $this->commits++; }
    public function rollback(): void { $this->rollbacks++; }

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

    /** @return array<int, array<string, mixed>> */
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

    public function insertOneIfAbsent(string $collection, array $doc): bool
    {
        $id = (string) ($doc['id'] ?? '');
        if ($id !== '' && $this->findOne($collection, ['id' => $id]) !== null) {
            return false;
        }
        $this->insertOne($collection, $doc);
        return true;
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

    /** @return array<int, array<string, mixed>> */
    public function rows(string $collection): array
    {
        return $this->collections[$collection] ?? [];
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
                if (array_key_exists('$gte', $expected) && strcmp((string) $actual, (string) $expected['$gte']) < 0) {
                    return false;
                }
                if (array_key_exists('$in', $expected) && !in_array($actual, $expected['$in'], true)) {
                    return false;
                }
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

require_once __DIR__ . '/../src/ManualBetService.php';
require_once __DIR__ . '/../src/ManualBetGradingService.php';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const MG_BET_ID = 'c1b2c3d4e5f6a7b8c9d0e1f2';
const MG_USER_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2';
const MG_ADMIN = 'adminadminadminadminadmi';

/** @return array<string, mixed> */
function mgBet(array $overrides = []): array
{
    // $100 write-in @ +150 → payout $250 (whole-dollar pinned at placement).
    return array_replace([
        'id' => MG_BET_ID,
        'userId' => MG_USER_ID,
        'type' => 'manual',
        'marketType' => 'manual',
        'matchId' => null,
        'status' => 'pending',
        'riskAmount' => 100.0,
        'amount' => 100.0,
        'potentialPayout' => 250.0,
        'acceptedPayout' => 250.0,
        'oddsAmerican' => 150,
        'odds' => 2.5,
        'isFreeplay' => false,
        'freeplayAmountUsed' => 0.0,
        'description' => 'Tiger Woods to win the Masters outright',
    ], $overrides);
}

/** @return array<string, mixed> */
function mgLeg(array $overrides = []): array
{
    return array_replace([
        'id' => 'd1b2c3d4e5f6a7b8c9d0e1f2',
        'betId' => MG_BET_ID,
        'userId' => MG_USER_ID,
        'marketType' => 'manual',
        'status' => 'pending',
    ], $overrides);
}

/** @return array<string, mixed> */
function mgUser(array $overrides = []): array
{
    // Post-placement cash state: $1000 start − $100 stake, $100 pending hold.
    return array_replace([
        'id' => MG_USER_ID,
        'role' => 'user',
        'username' => 'player1',
        'balance' => 900.0,
        'pendingBalance' => 100.0,
        'freeplayBalance' => 0.0,
        'creditLimit' => 0.0,
        'totalWinnings' => 0.0,
    ], $overrides);
}

function mgDb(array $bet = [], array $leg = [], array $user = []): ManualGradeMockSqlRepository
{
    return new ManualGradeMockSqlRepository([
        'bets' => [mgBet($bet)],
        'betselections' => [mgLeg($leg)],
        'users' => [mgUser($user)],
    ]);
}

// ── Suites ───────────────────────────────────────────────────────────────────

TestRunner::run('ManualBet grading fence (gradeableManualBetError)', function (): void {
    $fence = static fn (?array $bet, array $legs): ?string => ManualBetGradingService::gradeableManualBetError($bet, $legs);

    TestRunner::assertNull($fence(mgBet(), [mgLeg()]), 'gradable write-in passes the fence');
    TestRunner::assertEquals('bet_not_found', $fence(null, [mgLeg()]), 'missing bet refused');
    TestRunner::assertEquals('bet_not_pending', $fence(mgBet(['status' => 'won']), [mgLeg()]), 'terminal bet refused');
    TestRunner::assertEquals('bet_not_manual', $fence(mgBet(['type' => 'straight']), [mgLeg()]), 'non-manual type refused (cards/straights have their own surfaces)');
    TestRunner::assertEquals('bet_leg_count', $fence(mgBet(), []), 'zero pending legs refused');
    TestRunner::assertEquals('bet_leg_count', $fence(mgBet(), [mgLeg(), mgLeg(['id' => 'e1b2c3d4e5f6a7b8c9d0e1f2'])]), 'two pending legs refused (drift)');
    TestRunner::assertEquals('not_a_manual_bet', $fence(mgBet(), [mgLeg(['marketType' => 'alternate_totals_cards'])]), 'a CARD leg is refused here — surfaces must not cross');
    TestRunner::assertEquals('not_a_manual_bet', $fence(mgBet(), [mgLeg(['marketType' => 'h2h'])]), 'a feed-market leg is refused');
});

TestRunner::run('ManualBet grading — WON money flows', function (): void {
    // Cash account: full payout (stake was debited at placement).
    $db = mgDb();
    $result = ManualBetGradingService::gradeBet($db, MG_BET_ID, 'won', MG_ADMIN);
    TestRunner::assertTrue((bool) ($result['ok'] ?? false), 'cash win grades');
    $user = $db->findOne('users', ['id' => MG_USER_ID]);
    TestRunner::assertEqualsFloat(1150.0, (float) $user['balance'], 'cash win credits full $250 payout (900 → 1150)');
    TestRunner::assertEqualsFloat(0.0, (float) $user['pendingBalance'], 'pending hold released');
    TestRunner::assertEqualsFloat(150.0, (float) $user['totalWinnings'], 'totalWinnings tracks the $150 profit');
    $bet = $db->findOne('bets', ['id' => MG_BET_ID]);
    TestRunner::assertEquals('won', (string) $bet['status'], 'bet terminal: won');
    TestRunner::assertEquals(MG_ADMIN, (string) $bet['settledBy'], 'settledBy audit');
    TestRunner::assertTrue((string) ($bet['settledAt'] ?? '') !== '', 'settledAt stamped');
    $leg = $db->rows('betselections')[0];
    TestRunner::assertEquals('won', (string) $leg['status'], 'leg terminal: won');
    TestRunner::assertEquals('manual_bet_grade', (string) $leg['gradeReason'], 'leg gradeReason');
    $tx = $db->rows('transactions')[0];
    TestRunner::assertEquals('bet_won', (string) $tx['type'], 'ledger type bet_won');
    TestRunner::assertEquals('BET_WON', (string) $tx['reason'], 'ledger reason BET_WON');
    TestRunner::assertEqualsFloat(250.0, (float) $tx['amount'], 'cash ledger amount = full payout');
    TestRunner::assertEqualsFloat(900.0, (float) $tx['balanceBefore'], 'balanceBefore snapshot');
    TestRunner::assertEqualsFloat(1150.0, (float) $tx['balanceAfter'], 'balanceAfter snapshot');

    // Credit account: PROFIT ONLY (stake was never debited at placement).
    $db = mgDb([], [], ['balance' => 0.0, 'pendingBalance' => 100.0, 'creditLimit' => 500.0]);
    ManualBetGradingService::gradeBet($db, MG_BET_ID, 'won', MG_ADMIN);
    $user = $db->findOne('users', ['id' => MG_USER_ID]);
    TestRunner::assertEqualsFloat(150.0, (float) $user['balance'], 'credit win credits PROFIT ONLY ($150, not $250)');
    TestRunner::assertEqualsFloat(0.0, (float) $user['pendingBalance'], 'pending hold released');
    $tx = $db->rows('transactions')[0];
    TestRunner::assertEqualsFloat(150.0, (float) $tx['amount'], 'credit ledger amount = profit');

    // Whole-dollar pinning: acceptedPayout 249 vs recomputed 250 → honor 249.
    $db = mgDb(['acceptedPayout' => 249.0]);
    ManualBetGradingService::gradeBet($db, MG_BET_ID, 'won', MG_ADMIN);
    $user = $db->findOne('users', ['id' => MG_USER_ID]);
    TestRunner::assertEqualsFloat(1149.0, (float) $user['balance'], 'placement-pinned payout honored within ±$2');
});

TestRunner::run('ManualBet grading — LOST money flows', function (): void {
    // Cash account: stake already left at placement — pending release only.
    $db = mgDb();
    ManualBetGradingService::gradeBet($db, MG_BET_ID, 'lost', MG_ADMIN);
    $user = $db->findOne('users', ['id' => MG_USER_ID]);
    TestRunner::assertEqualsFloat(900.0, (float) $user['balance'], 'cash loss: balance unchanged (stake taken at placement)');
    TestRunner::assertEqualsFloat(0.0, (float) $user['pendingBalance'], 'pending hold released');
    $tx = $db->rows('transactions')[0];
    TestRunner::assertEquals('bet_lost', (string) $tx['type'], 'ledger type bet_lost');
    TestRunner::assertEqualsFloat(100.0, (float) $tx['amount'], 'ledger amount = full risk');

    // Credit account: balance debited NOW (placement never touched it).
    $db = mgDb([], [], ['balance' => 0.0, 'pendingBalance' => 100.0, 'creditLimit' => 500.0]);
    ManualBetGradingService::gradeBet($db, MG_BET_ID, 'lost', MG_ADMIN);
    $user = $db->findOne('users', ['id' => MG_USER_ID]);
    TestRunner::assertEqualsFloat(-100.0, (float) $user['balance'], 'credit loss: balance debited by full risk');
    TestRunner::assertEqualsFloat(0.0, (float) $user['pendingBalance'], 'pending hold released');
});

TestRunner::run('ManualBet grading — VOID money flows', function (): void {
    // Cash account: stake refunded to balance.
    $db = mgDb();
    ManualBetGradingService::gradeBet($db, MG_BET_ID, 'void', MG_ADMIN);
    $user = $db->findOne('users', ['id' => MG_USER_ID]);
    TestRunner::assertEqualsFloat(1000.0, (float) $user['balance'], 'void refunds the $100 stake (900 → 1000)');
    TestRunner::assertEqualsFloat(0.0, (float) $user['pendingBalance'], 'pending hold released');
    $tx = $db->rows('transactions')[0];
    TestRunner::assertEquals('bet_void', (string) $tx['type'], 'ledger type bet_void');
    TestRunner::assertEquals('BET_VOID', (string) $tx['reason'], 'ledger reason BET_VOID');
    $bet = $db->findOne('bets', ['id' => MG_BET_ID]);
    TestRunner::assertEquals('void', (string) $bet['status'], 'bet terminal: void');

    // Credit account: nothing to refund (balance was never debited).
    $db = mgDb([], [], ['balance' => 0.0, 'pendingBalance' => 100.0, 'creditLimit' => 500.0]);
    ManualBetGradingService::gradeBet($db, MG_BET_ID, 'void', MG_ADMIN);
    $user = $db->findOne('users', ['id' => MG_USER_ID]);
    TestRunner::assertEqualsFloat(0.0, (float) $user['balance'], 'credit void: balance untouched');
    TestRunner::assertEqualsFloat(0.0, (float) $user['pendingBalance'], 'pending hold released');
});

TestRunner::run('ManualBet grading — idempotency (double grade)', function (): void {
    $db = mgDb();
    $first = ManualBetGradingService::gradeBet($db, MG_BET_ID, 'won', MG_ADMIN);
    $userAfterFirst = $db->findOne('users', ['id' => MG_USER_ID]);

    // Double-fire the SAME decision, then try to FLIP the decision — both
    // must be refused no-ops (one terminal state, ever).
    $replay = ManualBetGradingService::gradeBet($db, MG_BET_ID, 'won', MG_ADMIN);
    $flip = ManualBetGradingService::gradeBet($db, MG_BET_ID, 'void', MG_ADMIN);

    TestRunner::assertTrue((bool) ($first['ok'] ?? false), 'first grade lands');
    TestRunner::assertFalse((bool) ($replay['ok'] ?? true), 'replay refused');
    TestRunner::assertEquals('bet_not_pending', (string) ($replay['error'] ?? ''), 'replay reason: bet_not_pending');
    TestRunner::assertFalse((bool) ($flip['ok'] ?? true), 'decision flip refused');

    $userAfterReplay = $db->findOne('users', ['id' => MG_USER_ID]);
    TestRunner::assertEqualsFloat((float) $userAfterFirst['balance'], (float) $userAfterReplay['balance'], 'balance unchanged by replay');
    TestRunner::assertEqualsFloat((float) $userAfterFirst['pendingBalance'], (float) $userAfterReplay['pendingBalance'], 'pending unchanged by replay');
    TestRunner::assertEquals(1, count($db->rows('transactions')), 'exactly ONE ledger row after replays');
    TestRunner::assertTrue($db->rollbacks >= 2, 'replays rolled back');
});

TestRunner::run('ManualBet grading — input validation + listing', function (): void {
    $db = mgDb();
    TestRunner::assertThrows(
        static fn () => ManualBetGradingService::gradeBet($db, MG_BET_ID, 'push', MG_ADMIN),
        'RuntimeException',
        'invalid decision refused'
    );
    TestRunner::assertThrows(
        static fn () => ManualBetGradingService::gradeBet($db, 'not-a-hex-id', 'won', MG_ADMIN),
        'RuntimeException',
        'malformed bet id refused'
    );

    // Listing: pending manual bets only, oldest first, card/straight rows ignored.
    $db = new ManualGradeMockSqlRepository([
        'bets' => [
            mgBet(['id' => 'c1b2c3d4e5f6a7b8c9d0e1f2', 'createdAt' => '2026-07-06T12:00:00+00:00']),
            mgBet(['id' => 'c2b2c3d4e5f6a7b8c9d0e1f2', 'createdAt' => '2026-07-06T10:00:00+00:00']),
            mgBet(['id' => 'c3b2c3d4e5f6a7b8c9d0e1f2', 'status' => 'won']),
            mgBet(['id' => 'c4b2c3d4e5f6a7b8c9d0e1f2', 'type' => 'straight']),
        ],
        'users' => [mgUser()],
    ]);
    $list = ManualBetGradingService::listPendingManualBets($db);
    TestRunner::assertEquals(2, (int) $list['betCount'], 'only pending manual bets listed');
    TestRunner::assertEquals('c2b2c3d4e5f6a7b8c9d0e1f2', (string) $list['bets'][0]['betId'], 'oldest first (FIFO inbox)');
    TestRunner::assertEquals('player1', (string) $list['bets'][0]['username'], 'player resolved');
    TestRunner::assertEquals('Tiger Woods to win the Masters outright', (string) $list['bets'][0]['description'], 'free-text description surfaced');
});

TestRunner::run('ManualBet grading — clamped-ticket surfaces (T7 companion)', function (): void {
    // The manual grader pays STORED values (potentialPayout pinned to
    // acceptedPayout) and never recomputes from leg odds — so it needs NO
    // payoutCapAmount enforcement. Lock that: a doc carrying the snapshot
    // field grades to exactly its stored acceptedPayout, snapshot ignored.
    $db = mgDb(['payoutCapAmount' => 100.0]); // stored payout 250 >> cap field
    ManualBetGradingService::gradeBet($db, MG_BET_ID, 'won', MG_ADMIN);
    $user = $db->findOne('users', ['id' => MG_USER_ID]);
    TestRunner::assertEqualsFloat(1150.0, (float) $user['balance'], 'manual grader pays stored acceptedPayout ($250); payoutCapAmount on the doc is ignored by design');

    // And a clamped PARLAY can never reach this surface at all — the fence
    // refuses non-manual types, so the settlement sweep (which DOES enforce
    // the snapshot ceiling) is the only grader for clamped tickets.
    TestRunner::assertEquals(
        'bet_not_manual',
        ManualBetGradingService::gradeableManualBetError(
            mgBet(['type' => 'parlay', 'payoutCapAmount' => 3000.0]),
            [mgLeg()]
        ),
        'clamped parlay refused by the manual surface (sweep is its only grader)'
    );
});
