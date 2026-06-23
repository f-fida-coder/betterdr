<?php

declare(strict_types=1);

/**
 * Unit tests for the Open Parlay ("open play") feature — DECLARED-LEG-COUNT
 * model. No database, no HTTP — pure helpers only.
 *
 * Coverage map:
 *   - M1  past-posting:   assertLegStartsInFuture rejects started / unparseable legs.
 *   - M3/M4 payout:       recomputePayout combines legs and re-applies the
 *                         3xmaxBet payout cap.
 *   - declared count:     MAX_LEGS is 8, MIN_TARGET_LEGS is 2.
 *   - settle gating:      shouldSettleNow — loss settles now; an incomplete or
 *                         still-pending ticket stays open; a full+resolved
 *                         ticket settles; a push neither loses nor blocks.
 *   - grader admission:   isGradableOpenTicket — only a new-model open parlay
 *                         (open + isOpenParlay + valid targetLegs) is gradable;
 *                         a legacy open ticket without targetLegs is skipped.
 *   - parlay roll-up:     evaluateTicket — one lost leg loses the ticket; a
 *                         void (push) leg drops from the odds math; an
 *                         all-push ticket refunds; payout is the product of the
 *                         WON legs only. (This is the math open-parlay payout
 *                         reuses, so it's covered here directly.)
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

/** Evaluate a plain parlay from per-leg (status, decimal-odds) pairs. */
function evalParlay_(array $legs, float $risk = 100.0): array
{
    $rows = [];
    foreach ($legs as $i => [$status, $odds]) {
        $rows[] = [
            'status'   => $status,
            'odds'     => $odds,
            'matchId'  => 'm' . $i,
            'legIndex' => $i,
        ];
    }
    return SportsbookBetSupport::evaluateTicket(
        ['type' => 'parlay', 'riskAmount' => $risk, 'amount' => $risk, 'potentialPayout' => 0.0],
        $rows
    );
}

// ── M1 — anti-past-posting gate ────────────────────────────────────────────────

TestRunner::run('assertLegStartsInFuture — hard time gate', function (): void {
    $now = time();

    OpenParlayService::assertLegStartsInFuture(['startTime' => iso(3600)], $now);
    TestRunner::assertTrue(true, 'future leg passes the gate');

    TestRunner::assertThrows(
        fn () => OpenParlayService::assertLegStartsInFuture(['startTime' => iso(-60)], $now),
        ApiException::class,
        'leg that already kicked off is rejected'
    );

    TestRunner::assertThrows(
        fn () => OpenParlayService::assertLegStartsInFuture(['startTime' => gmdate(DATE_ATOM, $now)], $now),
        ApiException::class,
        'leg starting exactly now is rejected'
    );

    TestRunner::assertThrows(
        fn () => OpenParlayService::assertLegStartsInFuture(['startTime' => ''], $now),
        ApiException::class,
        'leg with no start time is rejected'
    );
});

// ── declared count constants ────────────────────────────────────────────────────

TestRunner::run('declared-count bounds — MAX_LEGS=8, MIN_TARGET_LEGS=2', function (): void {
    TestRunner::assertEquals(8, OpenParlayService::MAX_LEGS, 'open parlay caps at 8 legs');
    TestRunner::assertEquals(2, OpenParlayService::MIN_TARGET_LEGS, 'open parlay needs at least 2 declared legs');
});

// ── M3/M4 — payout recompute + cap ─────────────────────────────────────────────

TestRunner::run('recomputePayout — combines legs and caps at 3x maxBet', function (): void {
    $legs = [
        leg_(100, iso(3600), 'm1'),
        leg_(100, iso(7200), 'm2'),
    ];

    $r = OpenParlayService::recomputePayout(100.0, $legs, [], 10000.0);
    TestRunner::assertEqualsFloat(400.0, $r['potentialPayout'], 'payout = stake * combined decimal');
    TestRunner::assertEqualsFloat(300.0, $r['winAmount'], 'winAmount = payout - stake');
    TestRunner::assertFalse($r['capped'], 'not capped when maxBet is large');
    TestRunner::assertEqualsFloat(4.0, $r['combinedOdds'], 'combinedOdds = payout / risk');

    $capped = OpenParlayService::recomputePayout(100.0, $legs, [], 50.0);
    TestRunner::assertEqualsFloat(250.0, $capped['potentialPayout'], 'payout clamped to stake + 3*maxBet');
    TestRunner::assertEqualsFloat(150.0, $capped['winAmount'], 'winAmount clamped to 3*maxBet');
    TestRunner::assertTrue($capped['capped'], 'capped flag set when cap applied');
});

// ── settle gating — shouldSettleNow ─────────────────────────────────────────────

TestRunner::run('shouldSettleNow — a losing leg settles immediately, even incomplete', function (): void {
    // 1 of 5 slots filled, that leg lost → settle now (loss).
    TestRunner::assertTrue(
        OpenParlayService::shouldSettleNow(['lost'], 5, 1),
        'any lost leg loses the whole parlay right away'
    );
    // Loss wins over a still-pending sibling too.
    TestRunner::assertTrue(
        OpenParlayService::shouldSettleNow(['lost', 'pending'], 3, 2),
        'loss settles even with other legs pending'
    );
});

TestRunner::run('shouldSettleNow — incomplete or unresolved ticket stays open', function (): void {
    // Banked win but only 1 of 3 slots filled → stay open.
    TestRunner::assertFalse(
        OpenParlayService::shouldSettleNow(['won'], 3, 1),
        'a winning leg banks; ticket waits for the remaining slots'
    );
    // All slots filled but one game still pending → wait.
    TestRunner::assertFalse(
        OpenParlayService::shouldSettleNow(['won', 'pending'], 2, 2),
        'full ticket with a pending leg does not settle yet'
    );
    // A push on an incomplete ticket does not settle it.
    TestRunner::assertFalse(
        OpenParlayService::shouldSettleNow(['void'], 3, 1),
        'a push on an incomplete ticket keeps it open'
    );
});

TestRunner::run('shouldSettleNow — full + resolved settles; push fills its slot', function (): void {
    TestRunner::assertTrue(
        OpenParlayService::shouldSettleNow(['won', 'won'], 2, 2),
        'all slots filled and won → settle (pay)'
    );
    // A pushed leg still counts as a filled slot — no replacement.
    TestRunner::assertTrue(
        OpenParlayService::shouldSettleNow(['won', 'void'], 2, 2),
        'a push occupies its slot; full+resolved ticket settles'
    );
    // Defensive: filled >= target also settles.
    TestRunner::assertTrue(
        OpenParlayService::shouldSettleNow(['won', 'won', 'won'], 2, 3),
        'filledLegs >= targetLegs still settles'
    );
});

TestRunner::run('shouldSettleNow — legacy ticket (no targetLegs) never auto-pays', function (): void {
    // targetLegs < 2 → never reaches the "all filled" pay path …
    TestRunner::assertFalse(
        OpenParlayService::shouldSettleNow(['won', 'won'], 0, 2),
        'no declared target → never auto-pays'
    );
    // … but a loss still settles (safe — the player lost a bet they made).
    TestRunner::assertTrue(
        OpenParlayService::shouldSettleNow(['lost'], 0, 1),
        'a loss still settles even without a declared target'
    );
});

// ── grader admission — isGradableOpenTicket ─────────────────────────────────────

TestRunner::run('isGradableOpenTicket — only new-model open parlays are gradable', function (): void {
    TestRunner::assertTrue(
        OpenParlayService::isGradableOpenTicket(['status' => 'open', 'isOpenParlay' => true, 'targetLegs' => 3]),
        'open + isOpenParlay + valid targetLegs → gradable'
    );
    TestRunner::assertFalse(
        OpenParlayService::isGradableOpenTicket(['status' => 'open', 'isOpenParlay' => true]),
        'legacy open ticket without targetLegs → skipped'
    );
    TestRunner::assertFalse(
        OpenParlayService::isGradableOpenTicket(['status' => 'open', 'isOpenParlay' => true, 'targetLegs' => 1]),
        'targetLegs below the minimum → skipped'
    );
    TestRunner::assertFalse(
        OpenParlayService::isGradableOpenTicket(['status' => 'pending', 'isOpenParlay' => true, 'targetLegs' => 3]),
        'non-open status is graded by the normal path, not this gate'
    );
    TestRunner::assertFalse(
        OpenParlayService::isGradableOpenTicket(['status' => 'open', 'isOpenParlay' => false, 'targetLegs' => 3]),
        'a plain (non-open-parlay) ticket is never gradable while open'
    );
});

// ── parlay roll-up — evaluateTicket (the math open-parlay payout reuses) ─────────

TestRunner::run('evaluateTicket parlay — one lost leg loses the whole ticket', function (): void {
    $r = evalParlay_([['won', 2.0], ['lost', 2.0]]);
    TestRunner::assertEquals('lost', $r['status'], 'any lost leg → ticket lost');
    TestRunner::assertEqualsFloat(0.0, (float) $r['payout'], 'lost ticket pays nothing');
});

TestRunner::run('evaluateTicket parlay — all won pays the product of won legs', function (): void {
    $r = evalParlay_([['won', 2.0], ['won', 2.0]], 100.0);
    TestRunner::assertEquals('won', $r['status'], 'all legs won → won');
    TestRunner::assertEqualsFloat(400.0, (float) $r['payout'], 'payout = risk * product of won odds');
});

TestRunner::run('evaluateTicket parlay — a void (push) leg drops from the odds math', function (): void {
    // One won @2.0 and one pushed leg @3.0 → re-prices on the won leg only.
    $r = evalParlay_([['won', 2.0], ['void', 3.0]], 100.0);
    TestRunner::assertEquals('won', $r['status'], 'a push does not lose the ticket');
    TestRunner::assertEqualsFloat(200.0, (float) $r['payout'], 'pushed leg drops; payout = risk * won-leg odds only');
});

TestRunner::run('evaluateTicket parlay — an all-push ticket refunds the stake', function (): void {
    $r = evalParlay_([['void', 2.0], ['void', 3.0]], 100.0);
    TestRunner::assertEquals('void', $r['status'], 'every leg pushed → ticket voids');
    TestRunner::assertEqualsFloat(100.0, (float) $r['payout'], 'all-push refunds the stake');
});

TestRunner::run('evaluateTicket parlay — a pending leg keeps the ticket pending', function (): void {
    $r = evalParlay_([['won', 2.0], ['pending', 2.0]]);
    TestRunner::assertEquals('pending', $r['status'], 'an unresolved leg keeps the ticket pending');
});
