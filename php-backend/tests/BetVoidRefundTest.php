<?php

declare(strict_types=1);

/**
 * Regression suite for the admin "cancel pending bet" refund path.
 *
 * Covers the 7-row matrix from the cancel-bet bug fix:
 *   1. Cash account, single straight     — balance + pending refund
 *   2. Credit account (creditLimit > 0)  — pending-only refund
 *   3. Freeplay bet                      — freeplay-only refund
 *   4. Multi-leg parlay                  — same math (stake = bet.amount)
 *   5. Re-cancel idempotency             — DB-level (covered in controller, not here)
 *   6. Frontend tile refresh             — JS-level (out of scope for PHP suite)
 *   7. Wallet history label rendering    — exercised via WalletController::transactionLabel
 *
 * The pure-math rows live in BetVoidRefund::compute(); the label row exercises
 * WalletController. Rows that require DB state (5) or browser state (6) are
 * called out in the suite output as SKIP so the gap is explicit on every run.
 */

// Stubs guarded so this suite can run standalone or alongside the others.
if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return date('c'); }
        public static function id(string $id): string { return $id; }
    }
}
if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
        public function __construct(string $message, int $code = 0, private array $extra = [])
        {
            parent::__construct($message, $code);
        }
    }
}

require_once __DIR__ . '/../src/BetVoidRefund.php';
require_once __DIR__ . '/../src/WalletController.php';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a user record with sensible defaults so each test only declares the
 * fields that matter to that scenario.
 */
function user_(array $overrides = []): array
{
    return $overrides + [
        'role'            => 'user',
        'balance'         => 0.0,
        'pendingBalance'  => 0.0,
        'freeplayBalance' => 0.0,
        'creditLimit'     => 0.0,
    ];
}

function bet_void_(float $amount, bool $isFreeplay = false): array
{
    return ['amount' => $amount, 'isFreeplay' => $isFreeplay];
}

// ── Row 1: Cash account, single straight ─────────────────────────────────────

TestRunner::run('cancel — cash account, $100 straight', function (): void {
    // Placement effect on a cash account: balance −100, pending +100.
    // So when the admin cancels, the pre-cancel state is balance=400, pending=100,
    // and the cancel must restore to balance=500, pending=0.
    $user = user_(['balance' => 400.0, 'pendingBalance' => 100.0, 'creditLimit' => 0.0]);
    $bet  = bet_void_(100.0);
    $r = BetVoidRefund::compute($bet, $user);

    TestRunner::assertFalse($r['isFreeplay'], 'isFreeplay flag');
    TestRunner::assertFalse($r['isCreditAccount'], 'isCreditAccount flag');
    TestRunner::assertEqualsFloat(500.0, $r['balanceAfter'],  'balance refunded');
    TestRunner::assertEqualsFloat(0.0,   $r['pendingAfter'],  'pending released');
    TestRunner::assertEqualsFloat(0.0,   $r['freeplayAfter'], 'freeplay untouched');
    TestRunner::assertEqualsFloat(500.0, $r['availableAfter'], 'available = balance − pending');
    TestRunner::assertEquals('bet_void_admin', $r['transactionType'], 'cash uses bet_void_admin');
    TestRunner::assertTrue(isset($r['userUpdate']['balance']),        'cash userUpdate writes balance');
    TestRunner::assertTrue(isset($r['userUpdate']['pendingBalance']), 'cash userUpdate writes pendingBalance');
    TestRunner::assertFalse(isset($r['userUpdate']['freeplayBalance']), 'cash userUpdate does NOT touch freeplayBalance');
});

// ── Row 2: Credit account (creditLimit > 0) ──────────────────────────────────

TestRunner::run('cancel — credit account, $100 stake', function (): void {
    // Placement effect on a credit account: pending +100, balance UNCHANGED
    // (stake reserved against credit, not debited from real balance).
    // The cancel must release pending-only and leave balance alone — the
    // pre-fix bug was that this path also credited balance, gifting credit.
    $user = user_(['balance' => 0.0, 'pendingBalance' => 100.0, 'creditLimit' => 1000.0]);
    $bet  = bet_void_(100.0);
    $r = BetVoidRefund::compute($bet, $user);

    TestRunner::assertTrue($r['isCreditAccount'], 'isCreditAccount flag');
    TestRunner::assertEqualsFloat(0.0,    $r['balanceAfter'],  'balance NOT credited (was never debited)');
    TestRunner::assertEqualsFloat(0.0,    $r['pendingAfter'],  'pending released');
    TestRunner::assertEqualsFloat(1000.0, $r['availableAfter'], 'available = creditLimit + balance − pending');
    TestRunner::assertEquals('bet_void_admin', $r['transactionType'], 'credit uses bet_void_admin');
    TestRunner::assertFalse(isset($r['userUpdate']['balance']), 'credit userUpdate does NOT touch balance');
    TestRunner::assertTrue(isset($r['userUpdate']['pendingBalance']), 'credit userUpdate writes pendingBalance');
});

TestRunner::run('cancel — credit account stays in credit-account branch even with positive balance', function (): void {
    // A credit user can still hold a positive cash balance (e.g. they made a
    // deposit on top of credit). Refund must still be pending-only.
    $user = user_(['balance' => 250.0, 'pendingBalance' => 100.0, 'creditLimit' => 1000.0]);
    $r = BetVoidRefund::compute(bet_void_(100.0), $user);
    TestRunner::assertTrue($r['isCreditAccount'], 'still credit-account');
    TestRunner::assertEqualsFloat(250.0, $r['balanceAfter'], 'balance unchanged');
    TestRunner::assertEqualsFloat(0.0,   $r['pendingAfter'], 'pending released');
});

// ── Row 3: Freeplay bet ──────────────────────────────────────────────────────

TestRunner::run('cancel — freeplay bet, $100', function (): void {
    // Placement effect on a freeplay bet: freeplayBalance −100, real balance
    // and pending UNCHANGED. The pre-fix bug refunded $100 to real balance,
    // gifting cash. The cancel must put the $100 back into freeplay only.
    $user = user_([
        'balance' => 500.0, 'pendingBalance' => 0.0,
        'freeplayBalance' => 100.0, 'creditLimit' => 0.0,
    ]);
    $bet = bet_void_(100.0, true);
    $r = BetVoidRefund::compute($bet, $user);

    TestRunner::assertTrue($r['isFreeplay'], 'isFreeplay flag');
    TestRunner::assertFalse($r['isCreditAccount'], 'freeplay forces isCreditAccount=false');
    TestRunner::assertEqualsFloat(500.0, $r['balanceAfter'],  'real balance untouched');
    TestRunner::assertEqualsFloat(0.0,   $r['pendingAfter'],  'pending untouched');
    TestRunner::assertEqualsFloat(200.0, $r['freeplayAfter'], 'freeplay refunded');
    TestRunner::assertEquals('fp_bet_void_admin', $r['transactionType'], 'freeplay uses fp_bet_void_admin');
    TestRunner::assertEquals('FP_BET_VOID_ADMIN', $r['transactionReason'], 'freeplay reason code');
    TestRunner::assertTrue(isset($r['userUpdate']['freeplayBalance']), 'freeplay userUpdate writes freeplayBalance');
    TestRunner::assertFalse(isset($r['userUpdate']['balance']), 'freeplay userUpdate does NOT touch balance');
    TestRunner::assertFalse(isset($r['userUpdate']['pendingBalance']), 'freeplay userUpdate does NOT touch pendingBalance');
});

TestRunner::run('cancel — freeplay bet on credit-eligible user still freeplay-only', function (): void {
    // Edge case: user has creditLimit > 0 but the bet was a freeplay. The
    // freeplay branch must take precedence over the credit branch — placement
    // never touched balance OR pending for this bet.
    $user = user_([
        'balance' => 0.0, 'pendingBalance' => 50.0,   // 50 is from a *different* pending bet
        'freeplayBalance' => 100.0, 'creditLimit' => 1000.0,
    ]);
    $r = BetVoidRefund::compute(bet_void_(100.0, true), $user);
    TestRunner::assertTrue($r['isFreeplay'], 'freeplay');
    TestRunner::assertFalse($r['isCreditAccount'], 'freeplay forces isCreditAccount=false');
    TestRunner::assertEqualsFloat(50.0, $r['pendingAfter'], 'unrelated pending preserved (not touched)');
    TestRunner::assertEqualsFloat(200.0, $r['freeplayAfter'], 'freeplay refunded');
});

// ── Row 4: Multi-leg parlay ──────────────────────────────────────────────────

TestRunner::run('cancel — multi-leg parlay (stake math identical to single)', function (): void {
    // Parlay/teaser/if_bet/reverse all store totalRisk in `bet.amount`. The
    // refund math is therefore identical to a straight — the per-leg
    // betselections rows are deleted by the controller, not by this helper.
    // This test guards against a future refactor that special-cases parlays.
    $user = user_(['balance' => 200.0, 'pendingBalance' => 50.0]);
    $r = BetVoidRefund::compute(['amount' => 50.0, 'type' => 'parlay'], $user);
    TestRunner::assertEqualsFloat(250.0, $r['balanceAfter'], 'parlay refund credits balance');
    TestRunner::assertEqualsFloat(0.0,   $r['pendingAfter'], 'parlay refund releases pending');

    $teaser = BetVoidRefund::compute(['amount' => 50.0, 'type' => 'teaser'], $user);
    TestRunner::assertEqualsFloat(250.0, $teaser['balanceAfter'], 'teaser same math');
});

// ── Row 5: Idempotency (DB-level) ────────────────────────────────────────────

TestRunner::run('cancel — idempotency on re-cancel (DB-level)', function (): void {
    // The pure helper is idempotent in the trivial sense (calling compute
    // twice on the same input returns the same output). Real idempotency
    // for "second click after first commits" lives in deleteAdminBet's
    // existingDeleted check (AdminCoreController.php) and requires DB state.
    $user = user_(['balance' => 400.0, 'pendingBalance' => 100.0]);
    $a = BetVoidRefund::compute(bet_void_(100.0), $user);
    $b = BetVoidRefund::compute(bet_void_(100.0), $user);
    TestRunner::assertEquals($a, $b, 'compute is deterministic');
    TestRunner::skip('409-on-replay path lives in AdminCoreController + deletedwagers; needs DB integration test');
});

// ── Row 6: Frontend tile refresh (JS-level) ──────────────────────────────────

TestRunner::run('cancel — frontend tile refresh (JS-level)', function (): void {
    // Exposed in the JSON response: the `user` field holds balance,
    // pendingBalance, freeplayBalance, available — verify the contract here
    // so a future refactor that drops one of these fails the suite.
    $r = BetVoidRefund::compute(bet_void_(100.0), user_(['balance' => 400.0, 'pendingBalance' => 100.0]));
    TestRunner::assertNotNull($r['balanceAfter'],   'response field: balanceAfter');
    TestRunner::assertNotNull($r['pendingAfter'],   'response field: pendingAfter');
    TestRunner::assertNotNull($r['freeplayAfter'],  'response field: freeplayAfter');
    TestRunner::assertNotNull($r['availableAfter'], 'response field: availableAfter');
    TestRunner::skip('JSX render of the tile refresh needs a frontend Jest test (CustomerDetailsView.jsx)');
});

// ── Row 7: Wallet history label rendering ────────────────────────────────────

TestRunner::run('cancel — wallet labels for new transaction types', function (): void {
    // WalletController::transactionLabel is private — exercise via reflection
    // since it's a pure switch and worth pinning. PHP 8.1+ allows invoking
    // non-public static methods via Reflection without setAccessible().
    $m = (new ReflectionClass('WalletController'))->getMethod('transactionLabel');

    TestRunner::assertEquals('Bet Refund',      $m->invoke(null, 'bet_void_admin'),    'cash void label');
    TestRunner::assertEquals('Freeplay Refund', $m->invoke(null, 'fp_bet_void_admin'), 'freeplay void label');
    TestRunner::assertEquals('Bet Refund',      $m->invoke(null, 'bet_void'),          'settlement-void cash label preserved');
    TestRunner::assertEquals('Freeplay Refund', $m->invoke(null, 'fp_bet_void'),       'settlement-void freeplay label preserved');
});

// ── Edge cases that aren't on the matrix but matter for production ───────────

TestRunner::run('cancel — pendingBalance never goes negative', function (): void {
    // Defensive: if a write race left pendingBalance lower than the stake
    // (e.g. concurrent settle + admin cancel), the refund should clamp to 0
    // rather than emit a negative balance.
    $user = user_(['balance' => 500.0, 'pendingBalance' => 30.0]);
    $r = BetVoidRefund::compute(bet_void_(100.0), $user);
    TestRunner::assertEqualsFloat(0.0, $r['pendingAfter'], 'clamped to 0, not negative');
    TestRunner::assertEqualsFloat(600.0, $r['balanceAfter'], 'balance still gets full refund');
});

TestRunner::run('cancel — agent role does NOT enter credit-account branch', function (): void {
    // isCreditAccount is gated to role=user. Agents/admins betting (rare but
    // possible) take the cash path even with a creditLimit set.
    $user = user_(['role' => 'agent', 'balance' => 400.0, 'pendingBalance' => 100.0, 'creditLimit' => 5000.0]);
    $r = BetVoidRefund::compute(bet_void_(100.0), $user);
    TestRunner::assertFalse($r['isCreditAccount'], 'agent never credit-account');
    TestRunner::assertEqualsFloat(500.0, $r['balanceAfter'], 'agent gets cash refund');
});

TestRunner::run('cancel — missing isFreeplay defaults to false (cash path)', function (): void {
    // Legacy bets predating the isFreeplay column should not silently take
    // the freeplay branch.
    $user = user_(['balance' => 400.0, 'pendingBalance' => 100.0]);
    $r = BetVoidRefund::compute(['amount' => 100.0], $user);
    TestRunner::assertFalse($r['isFreeplay'], 'missing flag = false');
    TestRunner::assertEqualsFloat(500.0, $r['balanceAfter'], 'takes cash path');
});

TestRunner::run('cancel — string-numeric inputs (PDO often returns strings)', function (): void {
    // PDO returns numerics as strings by default. The helper must coerce.
    $user = user_(['balance' => '400.50', 'pendingBalance' => '100.25']);
    $r = BetVoidRefund::compute(['amount' => '100.25'], $user);
    TestRunner::assertEqualsFloat(500.75, $r['balanceAfter'], 'string balance + string stake');
    TestRunner::assertEqualsFloat(0.0,    $r['pendingAfter'], 'string pending released');
});
