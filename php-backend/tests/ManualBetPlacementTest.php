<?php

declare(strict_types=1);

/**
 * Unit tests for manual/write-in bet PLACEMENT (ManualBetService) — the
 * admin "phone bet" path. Mocked SqlRepository, no HTTP, no real DB —
 * ISOLATED suite (see ISOLATED_SUITES in run.php).
 *
 * Coverage map:
 *   - input rails:     inputError — description required/length, American
 *                      odds integer + ±100…±50000 bounds, stake $1…max.
 *   - player rails:    userError — missing/non-player/suspended user, per-user
 *                      maxBet cap (and the deliberate minBet skip).
 *   - payout math:     payoutFor — whole-dollar payouts from American odds.
 *   - money block:     cash account debits balance + holds pending; credit
 *                      account holds pending WITHOUT touching balance and
 *                      available = creditLimit + balance − pending.
 *   - refusals:        insufficient available, loss limit, disabled flag —
 *                      each leaves ZERO bet/ledger rows behind.
 *   - double-fire:     same requestId twice books EXACTLY ONE bet, one ledger
 *                      row, one pending hold; replay returns the same betId.
 *                      Same requestId + different payload → refused.
 *   - composition:     validateTicketComposition rejects a 'manual' leg on
 *                      any player ticket type (MANUAL_ADMIN_ONLY).
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

final class ManualBetMockSqlRepository extends SqlRepository
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
require_once __DIR__ . '/../src/SportsbookBetSupport.php';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const MB_USER_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2';
const MB_ACTOR = ['id' => 'adminadminadminadminadmi', 'role' => 'admin', 'username' => 'house'];

/** @return array<string, mixed> */
function mbUser(array $overrides = []): array
{
    return array_replace([
        'id' => MB_USER_ID,
        'role' => 'user',
        'status' => 'active',
        'username' => 'player1',
        'balance' => 1000.0,
        'pendingBalance' => 0.0,
        'creditLimit' => 0.0,
        'betCount' => 0,
        'totalWagered' => 0.0,
    ], $overrides);
}

/** @return array<string, mixed> */
function mbBody(array $overrides = []): array
{
    return array_replace([
        'userId' => MB_USER_ID,
        'description' => 'Tiger Woods to win the Masters outright',
        'oddsAmerican' => 150,
        'stake' => 100,
        'requestId' => 'manual_req_0001',
    ], $overrides);
}

function mbEnableFeature(): void
{
    Env::$store = ['MANUAL_BETS_ENABLED' => 'true'];
}

// ── Suites ───────────────────────────────────────────────────────────────────

TestRunner::run('ManualBet input rails (inputError)', function (): void {
    $ok = static fn (array $o = []) => ManualBetService::inputError(
        (string) ($o['description'] ?? 'A valid write-in bet'),
        $o['odds'] ?? -110,
        $o['stake'] ?? 50,
        500.0
    );

    TestRunner::assertNull($ok(), 'valid input passes');
    TestRunner::assertEquals('DESCRIPTION_REQUIRED', $ok(['description' => '   '])['code'] ?? null, 'blank description refused');
    TestRunner::assertEquals('DESCRIPTION_TOO_LONG', $ok(['description' => str_repeat('x', 501)])['code'] ?? null, '501-char description refused');
    TestRunner::assertNull($ok(['description' => str_repeat('x', 500)]), '500-char description allowed');

    TestRunner::assertEquals('INVALID_ODDS', $ok(['odds' => 'abc'])['code'] ?? null, 'non-numeric odds refused');
    TestRunner::assertEquals('INVALID_ODDS', $ok(['odds' => 110.5])['code'] ?? null, 'fractional odds refused');
    TestRunner::assertEquals('INVALID_ODDS', $ok(['odds' => 0])['code'] ?? null, 'zero odds refused');
    TestRunner::assertEquals('INVALID_ODDS', $ok(['odds' => 99])['code'] ?? null, '+99 refused (not a valid American price)');
    TestRunner::assertEquals('INVALID_ODDS', $ok(['odds' => -99])['code'] ?? null, '-99 refused');
    TestRunner::assertEquals('INVALID_ODDS', $ok(['odds' => 50001])['code'] ?? null, '+50001 refused (absurd)');
    TestRunner::assertNull($ok(['odds' => 100]), '+100 (even) allowed');
    TestRunner::assertNull($ok(['odds' => -100]), '-100 allowed');
    TestRunner::assertNull($ok(['odds' => 50000]), '+50000 boundary allowed');

    TestRunner::assertEquals('INVALID_STAKE', $ok(['stake' => 'abc'])['code'] ?? null, 'non-numeric stake refused');
    TestRunner::assertEquals('BELOW_MIN_STAKE', $ok(['stake' => 0.99])['code'] ?? null, '$0.99 refused ($1 floor)');
    TestRunner::assertEquals('ABOVE_MAX_STAKE', $ok(['stake' => 500.01])['code'] ?? null, 'stake above MANUAL_BET_MAX_STAKE refused');
    TestRunner::assertNull($ok(['stake' => 1]), '$1 floor allowed');
    TestRunner::assertNull($ok(['stake' => 500]), 'max-stake boundary allowed');
});

TestRunner::run('ManualBet player rails (userError)', function (): void {
    TestRunner::assertEquals('USER_NOT_FOUND', ManualBetService::userError(null, 50)['code'] ?? null, 'missing user refused');
    TestRunner::assertEquals('USER_NOT_FOUND', ManualBetService::userError(mbUser(['role' => 'agent']), 50)['code'] ?? null, 'non-player role refused');
    TestRunner::assertEquals('USER_SUSPENDED', ManualBetService::userError(mbUser(['status' => 'suspended']), 50)['code'] ?? null, 'suspended player refused');
    TestRunner::assertEquals('ABOVE_MAX_BET', ManualBetService::userError(mbUser(['maxBet' => 200]), 300)['code'] ?? null, 'per-user maxBet still caps admin write-ins');
    TestRunner::assertNull(ManualBetService::userError(mbUser(['maxBet' => 200]), 200), 'stake at maxBet allowed');
    // Deliberate: minBet does NOT apply to write-ins ($1 floor governs).
    TestRunner::assertNull(ManualBetService::userError(mbUser(['minBet' => 25]), 5), 'per-user minBet deliberately skipped');
});

TestRunner::run('ManualBet payout math (payoutFor)', function (): void {
    TestRunner::assertEqualsFloat(250.0, ManualBetService::payoutFor(100.0, 150), '$100 @ +150 pays $250');
    TestRunner::assertEqualsFloat(183.0, ManualBetService::payoutFor(100.0, -120), '$100 @ -120 pays $183 (whole-dollar)');
    TestRunner::assertEqualsFloat(100.0, ManualBetService::payoutFor(50.0, 100), '$50 @ +100 pays $100');
    TestRunner::assertEqualsFloat(0.0, ManualBetService::payoutFor(100.0, 0), 'zero odds pay nothing');
});

TestRunner::run('ManualBet money block — cash account', function (): void {
    mbEnableFeature();
    $db = new ManualBetMockSqlRepository(['users' => [mbUser()]]);

    $result = ManualBetService::placeBet($db, MB_ACTOR, mbBody());

    TestRunner::assertTrue((bool) ($result['ok'] ?? false), 'placement succeeds');
    TestRunner::assertEquals(201, (int) ($result['status'] ?? 0), 'created status');
    TestRunner::assertEqualsFloat(250.0, (float) ($result['potentialPayout'] ?? 0), 'payout echoed');
    TestRunner::assertEqualsFloat(150.0, (float) ($result['toWin'] ?? 0), 'to-win echoed');

    $user = $db->findOne('users', ['id' => MB_USER_ID]);
    TestRunner::assertEqualsFloat(900.0, (float) $user['balance'], 'cash balance debited by stake');
    TestRunner::assertEqualsFloat(100.0, (float) $user['pendingBalance'], 'pending holds the stake');
    TestRunner::assertEquals(1, (int) $user['betCount'], 'betCount incremented');

    $bets = $db->rows('bets');
    TestRunner::assertEquals(1, count($bets), 'exactly one bet row');
    $bet = $bets[0];
    TestRunner::assertEquals('manual', (string) $bet['type'], 'type=manual');
    TestRunner::assertEquals('manual', (string) $bet['marketType'], 'marketType=manual');
    TestRunner::assertNull($bet['matchId'], 'matchId is null (match-less)');
    TestRunner::assertEquals('pending', (string) $bet['status'], 'starts pending');
    TestRunner::assertEqualsFloat(250.0, (float) $bet['acceptedPayout'], 'whole-dollar payout pinned for grading');
    TestRunner::assertEquals(150, (int) $bet['oddsAmerican'], 'American odds stored as entered');
    TestRunner::assertEqualsFloat(2.5, (float) $bet['odds'], 'decimal odds derived (invariant: price is DECIMAL)');
    TestRunner::assertEquals(MB_ACTOR['id'], (string) $bet['enteredBy'], 'enteredBy audit');
    TestRunner::assertEquals('house', (string) $bet['enteredByUsername'], 'enteredByUsername audit');

    $legs = $db->rows('betselections');
    TestRunner::assertEquals(1, count($legs), 'exactly one leg row');
    TestRunner::assertEquals('manual', (string) $legs[0]['marketType'], 'leg marketType=manual (grading fence key)');
    TestRunner::assertEquals('pending', (string) $legs[0]['status'], 'leg pending');
    TestRunner::assertEquals('manual', (string) $legs[0]['betType'], 'leg betType=manual');

    $txs = $db->rows('transactions');
    TestRunner::assertEquals(1, count($txs), 'exactly one ledger row');
    $tx = $txs[0];
    TestRunner::assertEquals('bet_placed_admin', (string) $tx['type'], 'whitelisted tx type (weekly figures)');
    TestRunner::assertEquals('MANUAL_BET_PLACED', (string) $tx['reason'], 'distinguishable reason');
    TestRunner::assertEqualsFloat(1000.0, (float) $tx['balanceBefore'], 'balanceBefore snapshot');
    TestRunner::assertEqualsFloat(900.0, (float) $tx['balanceAfter'], 'balanceAfter snapshot');
    TestRunner::assertEquals((string) $bet['id'], (string) $tx['referenceId'], 'ledger references the bet');
    TestRunner::assertEquals(MB_ACTOR['id'], (string) $tx['createdBy'], 'ledger createdBy audit');
});

TestRunner::run('ManualBet money block — credit account', function (): void {
    mbEnableFeature();
    $db = new ManualBetMockSqlRepository(['users' => [mbUser(['balance' => 0.0, 'creditLimit' => 500.0])]]);

    $result = ManualBetService::placeBet($db, MB_ACTOR, mbBody(['stake' => 200]));
    TestRunner::assertTrue((bool) ($result['ok'] ?? false), 'credit placement succeeds');

    $user = $db->findOne('users', ['id' => MB_USER_ID]);
    TestRunner::assertEqualsFloat(0.0, (float) $user['balance'], 'credit account balance UNTOUCHED at placement');
    TestRunner::assertEqualsFloat(200.0, (float) $user['pendingBalance'], 'pending holds the stake');

    // available = creditLimit + balance − pending = 500 + 0 − 200 = 300 → $350 refused.
    $second = ManualBetService::placeBet($db, MB_ACTOR, mbBody(['stake' => 350, 'requestId' => 'manual_req_0002']));
    TestRunner::assertEquals('INSUFFICIENT_BALANCE', (string) ($second['code'] ?? ''), 'credit-limit formula enforced');
    TestRunner::assertEquals(1, count($db->rows('bets')), 'refused bet leaves no row');
});

TestRunner::run('ManualBet refusals leave no money behind', function (): void {
    mbEnableFeature();

    // Insufficient cash
    $db = new ManualBetMockSqlRepository(['users' => [mbUser(['balance' => 50.0])]]);
    $result = ManualBetService::placeBet($db, MB_ACTOR, mbBody());
    TestRunner::assertEquals('INSUFFICIENT_BALANCE', (string) ($result['code'] ?? ''), 'insufficient cash refused');
    TestRunner::assertEquals(0, count($db->rows('bets')), 'no bet row');
    TestRunner::assertEquals(0, count($db->rows('transactions')), 'no ledger row');
    TestRunner::assertEqualsFloat(0.0, (float) $db->findOne('users', ['id' => MB_USER_ID])['pendingBalance'], 'no pending hold');
    TestRunner::assertTrue($db->rollbacks >= 1, 'transaction rolled back');
    TestRunner::assertEquals('failed', (string) ($db->rows('betrequests')[0]['status'] ?? ''), 'request marked failed (retryable)');

    // Loss limit: daily 100, already wagered 80 → +$50 refused.
    $db = new ManualBetMockSqlRepository([
        'users' => [mbUser(['gamblingLimits' => ['lossDaily' => 100]])],
        'bets' => [['userId' => MB_USER_ID, 'amount' => 80.0, 'status' => 'pending', 'createdAt' => gmdate(DATE_ATOM)]],
    ]);
    $result = ManualBetService::placeBet($db, MB_ACTOR, mbBody(['stake' => 50]));
    TestRunner::assertEquals('LOSS_LIMIT', (string) ($result['code'] ?? ''), 'loss limits apply to write-ins');
    TestRunner::assertEquals(1, count($db->rows('bets')), 'no new bet row (only the seed)');

    // Kill switch
    Env::$store = ['MANUAL_BETS_ENABLED' => 'false'];
    $db = new ManualBetMockSqlRepository(['users' => [mbUser()]]);
    $result = ManualBetService::placeBet($db, MB_ACTOR, mbBody());
    TestRunner::assertEquals('MANUAL_BETS_DISABLED', (string) ($result['code'] ?? ''), 'placement gated by MANUAL_BETS_ENABLED');
    TestRunner::assertEquals(0, count($db->rows('betrequests')), 'disabled flag refuses before any write');
});

TestRunner::run('ManualBet double-fire idempotency (requestId)', function (): void {
    mbEnableFeature();
    $db = new ManualBetMockSqlRepository(['users' => [mbUser()]]);

    $first = ManualBetService::placeBet($db, MB_ACTOR, mbBody());
    $second = ManualBetService::placeBet($db, MB_ACTOR, mbBody()); // admin double-click: identical payload + requestId

    TestRunner::assertTrue((bool) ($first['ok'] ?? false), 'first fire books');
    TestRunner::assertTrue((bool) ($second['ok'] ?? false), 'second fire is a friendly replay, not an error');
    TestRunner::assertTrue((bool) ($second['idempotentReplay'] ?? false), 'second fire flagged as replay');
    TestRunner::assertEquals((string) $first['betId'], (string) $second['betId'], 'replay returns the SAME betId');

    TestRunner::assertEquals(1, count($db->rows('bets')), 'exactly ONE bet booked');
    TestRunner::assertEquals(1, count($db->rows('transactions')), 'exactly ONE ledger row');
    $user = $db->findOne('users', ['id' => MB_USER_ID]);
    TestRunner::assertEqualsFloat(100.0, (float) $user['pendingBalance'], 'stake held ONCE, not twice');
    TestRunner::assertEqualsFloat(900.0, (float) $user['balance'], 'balance debited ONCE');

    // Same requestId, different payload → hard refusal (not a silent re-book).
    $reused = ManualBetService::placeBet($db, MB_ACTOR, mbBody(['stake' => 200]));
    TestRunner::assertEquals('REQUEST_ID_REUSED', (string) ($reused['code'] ?? ''), 'requestId reuse with new payload refused');

    // Missing requestId → refused outright (server-side double-click guard).
    $missing = ManualBetService::placeBet($db, MB_ACTOR, mbBody(['requestId' => '']));
    TestRunner::assertEquals('REQUEST_ID_REQUIRED', (string) ($missing['code'] ?? ''), 'requestId is mandatory');
});

TestRunner::run('ManualBet composition fence (straight-only, admin-only)', function (): void {
    $manualLeg = ['matchId' => '', 'selection' => 'Write-in', 'marketType' => 'manual', 'odds' => 2.5];
    $normalLeg = ['matchId' => 'b1b2c3d4e5f6a7b8c9d0e1f2', 'selection' => 'Home', 'marketType' => 'h2h', 'odds' => 1.9];

    foreach (['straight', 'parlay', 'teaser', 'round_robin'] as $type) {
        TestRunner::assertThrows(
            static fn () => SportsbookBetSupport::validateTicketComposition($type, [$manualLeg, $normalLeg]),
            'ApiException',
            "manual leg refused on player {$type} ticket"
        );
    }
    try {
        SportsbookBetSupport::validateTicketComposition('parlay', [$manualLeg]);
        TestRunner::assertTrue(false, 'manual leg must throw');
    } catch (ApiException $e) {
        TestRunner::assertEquals('MANUAL_ADMIN_ONLY', (string) ($e->payload()['code'] ?? ''), 'refusal carries MANUAL_ADMIN_ONLY code');
    }
});
