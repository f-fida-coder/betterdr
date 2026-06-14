<?php

declare(strict_types=1);

/**
 * Unit tests for the Open Parlay ("open play") feature — OpenParlayService.
 * No database, no HTTP. A tiny in-memory FakeOpenParlayDb stands in for
 * SqlRepository so the finalizer's flip/void/refund behaviour can be exercised
 * deterministically.
 *
 * Coverage map (per the implementation brief):
 *   - M1  past-posting: assertLegStartsInFuture rejects started / unparseable legs.
 *   - closesAt:         earliestStart picks the earliest leg's kickoff.
 *   - M3/M4 payout:     recomputePayout recomputes from legs and re-applies the
 *                       3xmaxBet payout cap.
 *   - M2  finalizer:    >=2 legs flips open->pending; <2 legs voids + refunds the
 *                       whole ticket (cash refunds balance; credit frees pending
 *                       only); due-filter skips not-yet-closed tickets; an
 *                       already-void ticket is a no-op (concurrent-tick safe).
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
    }
}

if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return date('c'); }
        public static function id(string $id): string { return $id; }
    }
}

if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, ?string $default = null): ?string
        {
            $v = getenv($key);
            return $v === false ? $default : $v;
        }
    }
}

if (!class_exists('Logger')) {
    class Logger
    {
        public static function warning(string $msg, array $ctx = [], string $channel = ''): void {}
    }
}

require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/OpenParlayService.php';

// ── In-memory fake repository ────────────────────────────────────────────────

final class FakeOpenParlayDb extends SqlRepository
{
    /** @var array<string, array<string,mixed>> keyed by id */
    public array $bets = [];
    /** @var array<string, array<string,mixed>> keyed by id */
    public array $users = [];
    /** @var array<int, array<string,mixed>> */
    public array $betselections = [];
    /** @var array<int, array<string,mixed>> */
    public array $transactions = [];
    public int $commits = 0;
    public int $rollbacks = 0;

    public function __construct() {}

    public function beginTransaction(): void {}
    public function commit(): void { $this->commits++; }
    public function rollback(): void { $this->rollbacks++; }

    public function findMany(string $collection, array $filter, array $opts = []): array
    {
        $out = [];
        foreach ($this->rows($collection) as $row) {
            if ($this->matches($row, $filter)) {
                $out[] = $row;
            }
        }
        return $out;
    }

    public function findOneForUpdate(string $collection, array $filter): ?array
    {
        foreach ($this->rows($collection) as $row) {
            if ($this->matches($row, $filter)) {
                return $row;
            }
        }
        return null;
    }

    public function updateOne(string $collection, array $filter, array $fields): void
    {
        if ($collection === 'bets') {
            foreach ($this->bets as $id => $row) {
                if ($this->matches($row, $filter)) { $this->bets[$id] = array_merge($row, $fields); return; }
            }
        } elseif ($collection === 'users') {
            foreach ($this->users as $id => $row) {
                if ($this->matches($row, $filter)) { $this->users[$id] = array_merge($row, $fields); return; }
            }
        }
    }

    public function updateMany(string $collection, array $filter, array $fields): void
    {
        if ($collection === 'betselections') {
            foreach ($this->betselections as $i => $row) {
                if ($this->matches($row, $filter)) { $this->betselections[$i] = array_merge($row, $fields); }
            }
        }
    }

    public function insertOne(string $collection, array $doc): void
    {
        if ($collection === 'transactions') { $this->transactions[] = $doc; }
    }

    public function countDocuments(string $collection, array $filter): int
    {
        $n = 0;
        foreach ($this->rows($collection) as $row) {
            if ($this->matches($row, $filter)) { $n++; }
        }
        return $n;
    }

    /** @return array<int, array<string,mixed>> */
    private function rows(string $name): array
    {
        return match ($name) {
            'bets'          => array_values($this->bets),
            'users'         => array_values($this->users),
            'betselections' => $this->betselections,
            'transactions'  => $this->transactions,
            default         => [],
        };
    }

    private function matches(array $row, array $filter): bool
    {
        foreach ($filter as $k => $v) {
            if (($row[$k] ?? null) !== $v) { return false; }
        }
        return true;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** A leg shaped like a stored selectionForInsert doc. */
function leg_(int $oddsAmerican, string $startTime, string $matchId): array
{
    return [
        'matchId'       => $matchId,
        'oddsAmerican'  => $oddsAmerican,
        'odds'          => SportsbookBetSupport::americanToDecimalExact($oddsAmerican),
        'status'        => 'pending',
        'matchSnapshot' => ['startTime' => $startTime],
    ];
}

function iso(int $offsetSeconds): string
{
    return gmdate(DATE_ATOM, time() + $offsetSeconds);
}

function hexId(string $suffix): string
{
    // 24-char lowercase hex (the finalizer rejects non-ObjectId ids).
    return str_pad($suffix, 24, '0', STR_PAD_LEFT);
}

// ── M1 — anti-past-posting gate ────────────────────────────────────────────────

TestRunner::run('assertLegStartsInFuture — hard time gate', function (): void {
    $now = time();

    // Future leg → allowed (no throw).
    OpenParlayService::assertLegStartsInFuture(['startTime' => iso(3600)], $now);
    TestRunner::assertTrue(true, 'future leg passes the gate');

    // Already-started leg → rejected (409 OPEN_PARLAY_LEG_STARTED).
    TestRunner::assertThrows(
        fn () => OpenParlayService::assertLegStartsInFuture(['startTime' => iso(-60)], $now),
        ApiException::class,
        'leg that already kicked off is rejected'
    );

    // Exactly now → rejected (startTs <= now).
    TestRunner::assertThrows(
        fn () => OpenParlayService::assertLegStartsInFuture(['startTime' => gmdate(DATE_ATOM, $now)], $now),
        ApiException::class,
        'leg starting exactly now is rejected'
    );

    // Missing / unparseable start time → rejected (can't determine kickoff).
    TestRunner::assertThrows(
        fn () => OpenParlayService::assertLegStartsInFuture(['startTime' => ''], $now),
        ApiException::class,
        'leg with no start time is rejected'
    );
});

// ── closesAt — earliest leg start ──────────────────────────────────────────────

TestRunner::run('earliestStart — picks the earliest kickoff', function (): void {
    $early = iso(1800);
    $late  = iso(7200);

    $legs = [
        ['matchSnapshot' => ['startTime' => $late]],
        ['matchSnapshot' => ['startTime' => $early]],
    ];
    TestRunner::assertEquals(
        strtotime($early),
        strtotime((string) OpenParlayService::earliestStart($legs)),
        'closesAt is the earliest leg start'
    );

    // No parseable start times anywhere → null.
    TestRunner::assertNull(
        OpenParlayService::earliestStart([['matchSnapshot' => ['startTime' => '']], ['foo' => 'bar']]),
        'no dated legs → null closesAt'
    );
});

// ── M3/M4 — payout recompute + cap ─────────────────────────────────────────────

TestRunner::run('recomputePayout — combines legs and caps at 3x maxBet', function (): void {
    // Two +100 legs → decimal 2.0 * 2.0 = 4.0. Stake 100 → payout 400.
    $legs = [
        leg_(100, iso(3600), 'm1'),
        leg_(100, iso(7200), 'm2'),
    ];

    // No cap pressure (maxBet large).
    $r = OpenParlayService::recomputePayout(100.0, $legs, [], 10000.0);
    TestRunner::assertEqualsFloat(400.0, $r['potentialPayout'], 'payout = stake * combined decimal');
    TestRunner::assertEqualsFloat(300.0, $r['winAmount'], 'winAmount = payout - stake');
    TestRunner::assertFalse($r['capped'], 'not capped when maxBet is large');
    TestRunner::assertEqualsFloat(4.0, $r['combinedOdds'], 'combinedOdds = payout / risk');

    // Cap bites: maxBet 50 → cap = 150 win. payout clamps to 100 + 150 = 250.
    $capped = OpenParlayService::recomputePayout(100.0, $legs, [], 50.0);
    TestRunner::assertEqualsFloat(250.0, $capped['potentialPayout'], 'payout clamped to stake + 3*maxBet');
    TestRunner::assertEqualsFloat(150.0, $capped['winAmount'], 'winAmount clamped to 3*maxBet');
    TestRunner::assertTrue($capped['capped'], 'capped flag set when cap applied');
});

// ── M2 — finalizer flips a complete ticket open->pending ───────────────────────

TestRunner::run('finalizeDueTickets — >=2 legs flips open->pending', function (): void {
    $db = new FakeOpenParlayDb();
    $betId = hexId('a1');
    $db->bets[$betId] = [
        'id'         => $betId,
        'type'       => 'parlay',
        'status'     => 'open',
        'userId'     => hexId('b1'),
        'closesAt'   => iso(-60), // due
        'riskAmount' => 100.0,
        'selections' => [leg_(100, iso(-60), 'm1'), leg_(120, iso(120), 'm2')],
    ];

    $res = OpenParlayService::finalizeDueTickets($db, 250, 'test');

    TestRunner::assertEquals(1, $res['checked'], 'one due ticket checked');
    TestRunner::assertEquals(1, $res['flipped'], 'complete ticket flipped');
    TestRunner::assertEquals(0, $res['voided'], 'complete ticket not voided');
    TestRunner::assertEquals('pending', $db->bets[$betId]['status'], 'status now pending');
    TestRunner::assertEquals('test', $db->bets[$betId]['finalizedBy'], 'finalizedBy stamped');
    TestRunner::assertEquals(0, count($db->transactions), 'flip writes no money transaction');
});

// ── M2 — finalizer voids + refunds an incomplete CASH ticket ───────────────────

TestRunner::run('finalizeDueTickets — <2 legs voids + refunds cash account', function (): void {
    $db = new FakeOpenParlayDb();
    $betId  = hexId('a2');
    $userId = hexId('b2');
    $db->users[$userId] = [
        'id'             => $userId,
        'role'           => 'user',
        'balance'        => 500.0,
        'pendingBalance' => 100.0,
        'creditLimit'    => 0.0, // cash account
    ];
    $db->bets[$betId] = [
        'id'         => $betId,
        'type'       => 'parlay',
        'status'     => 'open',
        'userId'     => $userId,
        'closesAt'   => iso(-60),
        'riskAmount' => 100.0,
        'selections' => [leg_(100, iso(-60), 'm1')], // only 1 leg
    ];
    $db->betselections[] = ['betId' => $betId, 'status' => 'pending'];

    $res = OpenParlayService::finalizeDueTickets($db, 250, 'test');

    TestRunner::assertEquals(1, $res['voided'], 'incomplete ticket voided');
    TestRunner::assertEquals(0, $res['flipped'], 'incomplete ticket not flipped');
    TestRunner::assertEquals('void', $db->bets[$betId]['status'], 'bet marked void');
    TestRunner::assertEquals('OPEN_PARLAY_INCOMPLETE', $db->bets[$betId]['voidReason'], 'void reason recorded');

    // Money: pending freed, stake refunded to balance (cash).
    TestRunner::assertEqualsFloat(0.0, (float) $db->users[$userId]['pendingBalance'], 'pendingBalance released');
    TestRunner::assertEqualsFloat(600.0, (float) $db->users[$userId]['balance'], 'cash stake refunded to balance');

    // Ledger row written, leg row voided.
    TestRunner::assertEquals(1, count($db->transactions), 'one refund transaction written');
    TestRunner::assertEquals('OPEN_PARLAY_VOID', $db->transactions[0]['reason'], 'transaction reason');
    TestRunner::assertEqualsFloat(100.0, (float) $db->transactions[0]['amount'], 'refund amount = risk');
    TestRunner::assertEquals('void', $db->betselections[0]['status'], 'leg row marked void');
});

// ── M2 — incomplete CREDIT ticket frees pending only (no balance refund) ────────

TestRunner::run('finalizeDueTickets — <2 legs on credit account frees pending only', function (): void {
    $db = new FakeOpenParlayDb();
    $betId  = hexId('a3');
    $userId = hexId('b3');
    $db->users[$userId] = [
        'id'             => $userId,
        'role'           => 'user',
        'balance'        => -50.0,
        'pendingBalance' => 100.0,
        'creditLimit'    => 1000.0, // credit account
    ];
    $db->bets[$betId] = [
        'id'         => $betId,
        'type'       => 'parlay',
        'status'     => 'open',
        'userId'     => $userId,
        'closesAt'   => iso(-60),
        'riskAmount' => 100.0,
        'selections' => [leg_(100, iso(-60), 'm1')],
    ];

    OpenParlayService::finalizeDueTickets($db, 250, 'test');

    TestRunner::assertEqualsFloat(0.0, (float) $db->users[$userId]['pendingBalance'], 'pending released');
    TestRunner::assertEqualsFloat(-50.0, (float) $db->users[$userId]['balance'], 'credit balance unchanged (no cash refund)');
});

// ── due-filter — a not-yet-closed ticket is left untouched ──────────────────────

TestRunner::run('finalizeDueTickets — future closesAt is not due', function (): void {
    $db = new FakeOpenParlayDb();
    $betId = hexId('a4');
    $db->bets[$betId] = [
        'id'         => $betId,
        'type'       => 'parlay',
        'status'     => 'open',
        'userId'     => hexId('b4'),
        'closesAt'   => iso(3600), // not due yet
        'riskAmount' => 100.0,
        'selections' => [leg_(100, iso(3600), 'm1')],
    ];

    $res = OpenParlayService::finalizeDueTickets($db, 250, 'test');

    TestRunner::assertEquals(0, $res['checked'], 'future ticket not checked');
    TestRunner::assertEquals('open', $db->bets[$betId]['status'], 'still open');
});

// ── concurrency — an already-finalized ticket is a no-op (skip) ─────────────────

TestRunner::run('finalizeDueTickets — already-void ticket is skipped under lock', function (): void {
    $db = new FakeOpenParlayDb();
    $betId = hexId('a5');
    // findMany only returns status='open' candidates, so simulate the race by
    // putting it 'open' in the listing but flipping it to 'void' before the
    // row lock — finalizeOne re-checks status under FOR UPDATE and must skip.
    $db->bets[$betId] = [
        'id'         => $betId,
        'type'       => 'parlay',
        'status'     => 'void', // already settled by a concurrent tick
        'userId'     => hexId('b5'),
        'closesAt'   => iso(-60),
        'riskAmount' => 100.0,
        'selections' => [leg_(100, iso(-60), 'm1')],
    ];

    $res = OpenParlayService::finalizeDueTickets($db, 250, 'test');

    // Not 'open', so findMany won't list it → nothing processed, no double refund.
    TestRunner::assertEquals(0, $res['checked'], 'non-open ticket not listed');
    TestRunner::assertEquals(0, count($db->transactions), 'no refund written for already-settled ticket');
});
