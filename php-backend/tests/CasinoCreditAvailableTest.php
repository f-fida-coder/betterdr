<?php

declare(strict_types=1);

/**
 * Real-code test for the casino "available credit" betting model.
 *
 * Exercises the ACTUAL shipped CasinoController::availableCredit() (via
 * reflection, no DB) plus the gate decision (wager > available => reject)
 * across every account shape, and asserts parity with the canonical
 * WalletController / AuthController credit-available formula.
 *
 * NOTE: integrated into TestRunner so `php tests/run.php` runs every suite.
 * Previously this file maintained its own counters and called exit(), which
 * short-circuited the runner before later suites (incl. SettlementTest) ran.
 */

spl_autoload_register(static function (string $class): void {
    $file = dirname(__DIR__) . '/src/' . $class . '.php';
    if (is_file($file)) {
        require_once $file;
    }
});

TestRunner::run('Casino available-credit (real CasinoController::availableCredit)', static function (): void {
    $controller = (new ReflectionClass('CasinoController'))->newInstanceWithoutConstructor();
    $ref = new ReflectionMethod('CasinoController', 'availableCredit');

    /** Real method under test. */
    $available = static function (float $balance, float $pending, array $user) use ($controller, $ref): float {
        return (float) $ref->invoke($controller, $balance, $pending, $user);
    };

    /** Canonical formula used by WalletController + AuthController for cross-check. */
    $canonical = static function (float $balance, float $pending, array $user): float {
        $role = strtolower(trim((string) ($user['role'] ?? 'user')));
        $creditLimit = (float) ($user['creditLimit'] ?? 0);
        $base = ($role === 'user' && $creditLimit > 0) ? ($creditLimit + $balance) : $balance;
        return round(max(0.0, $base - $pending));
    };

    /** Preserve original (name, got, want) call sites; delegate to TestRunner. */
    $assert = static function (string $name, $got, $want): void {
        TestRunner::assertEqualsFloat((float) $want, (float) $got, $name, 0.0001);
    };

    $cash    = ['role' => 'user', 'creditLimit' => 0];
    $credit  = ['role' => 'user', 'creditLimit' => 100];
    $agent   = ['role' => 'agent', 'creditLimit' => 100];
    $noRole  = ['creditLimit' => 50];

    // 1) Available-credit math (real CasinoController::availableCredit)
    $assert('cash: 5 bal, 0 pend -> 5',            $available(5, 0, $cash), 5);
    $assert('cash: 5 bal, 3 pend -> 2',            $available(5, 3, $cash), 2);
    $assert('cash: 5 bal, 9 pend -> clamp 0',      $available(5, 9, $cash), 0);
    $assert('credit: 5 bal,100 lim,0 pend -> 105', $available(5, 0, $credit), 105);
    $assert('credit: 5 bal,100 lim,3 pend -> 102', $available(5, 3, $credit), 102);
    $assert('credit: -45 bal,100 lim -> 55',       $available(-45, 0, $credit), 55);
    $assert('credit: -120 bal,100 lim -> clamp 0', $available(-120, 0, $credit), 0);
    $assert('agent w/limit treated as cash -> 5',  $available(5, 0, $agent), 5);
    $assert('missing role defaults user -> 55',    $available(5, 0, $noRole), 55);

    // 2) Gate decision: wager > available => REJECT (real available)
    $gateAllows = static function (float $wager, float $balance, float $pending, array $user) use ($available): bool {
        return $wager <= $available($balance, $pending, $user);
    };
    $assert('cash $5: bet $5 allowed',             $gateAllows(5, 5, 0, $cash) ? 1 : 0, 1);
    $assert('cash $5: bet $6 REJECTED',            $gateAllows(6, 5, 0, $cash) ? 1 : 0, 0);
    $assert('credit $5/lim100: bet $50 allowed',   $gateAllows(50, 5, 0, $credit) ? 1 : 0, 1);
    $assert('credit $5/lim100: bet $105 allowed',  $gateAllows(105, 5, 0, $credit) ? 1 : 0, 1);
    $assert('credit $5/lim100: bet $106 REJECTED', $gateAllows(106, 5, 0, $credit) ? 1 : 0, 0);
    $assert('maxed credit -120/lim100: bet $1 REJECTED', $gateAllows(1, -120, 0, $credit) ? 1 : 0, 0);

    // 3) Stacking (craps): incremental stake gated against post-debit available
    // Credit player lim 100, bal 5 (avail 105). Bet 60 -> bal -55 (avail 45).
    // Next incremental 50 must be REJECTED (45 < 50); 40 allowed.
    $afterFirst = 5 - 60; // -55
    $assert('after $60 bet, available = 45',        $available($afterFirst, 0, $credit), 45);
    $assert('stack +$50 REJECTED (only 45 left)',   $gateAllows(50, $afterFirst, 0, $credit) ? 1 : 0, 0);
    $assert('stack +$40 allowed',                   $gateAllows(40, $afterFirst, 0, $credit) ? 1 : 0, 1);

    // 4) Parity: CasinoController == WalletController/AuthController formula
    $cases = [[5,0,$cash],[5,3,$cash],[5,9,$cash],[5,0,$credit],[-45,0,$credit],[-120,0,$credit],[5,0,$agent]];
    foreach ($cases as $i => [$b,$p,$u]) {
        $assert("parity case #$i", $available($b,$p,$u), $canonical($b,$p,$u));
    }
});
