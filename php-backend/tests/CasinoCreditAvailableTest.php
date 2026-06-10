<?php

declare(strict_types=1);

/**
 * Real-code test for the casino "available credit" betting model.
 *
 * Exercises the ACTUAL shipped CasinoController::availableCredit() (via
 * reflection, no DB) plus the gate decision (wager > available => reject)
 * across every account shape, and asserts parity with the canonical
 * WalletController / AuthController credit-available formula.
 */

spl_autoload_register(static function (string $class): void {
    $file = dirname(__DIR__) . '/src/' . $class . '.php';
    if (is_file($file)) {
        require_once $file;
    }
});

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

$failures = [];
$passes = 0;
$assert = static function (string $name, $got, $want) use (&$failures, &$passes): void {
    if (abs((float) $got - (float) $want) < 0.0001) {
        $passes++;
        echo "  PASS  $name (= $got)\n";
    } else {
        $failures[] = "$name: got $got, want $want";
        echo "  FAIL  $name: got $got, want $want\n";
    }
};

$cash    = ['role' => 'user', 'creditLimit' => 0];
$credit  = ['role' => 'user', 'creditLimit' => 100];
$agent   = ['role' => 'agent', 'creditLimit' => 100];
$noRole  = ['creditLimit' => 50];

echo "1) Available-credit math (real CasinoController::availableCredit)\n";
$assert('cash: 5 bal, 0 pend -> 5',            $available(5, 0, $cash), 5);
$assert('cash: 5 bal, 3 pend -> 2',            $available(5, 3, $cash), 2);
$assert('cash: 5 bal, 9 pend -> clamp 0',      $available(5, 9, $cash), 0);
$assert('credit: 5 bal,100 lim,0 pend -> 105', $available(5, 0, $credit), 105);
$assert('credit: 5 bal,100 lim,3 pend -> 102', $available(5, 3, $credit), 102);
$assert('credit: -45 bal,100 lim -> 55',       $available(-45, 0, $credit), 55);
$assert('credit: -120 bal,100 lim -> clamp 0', $available(-120, 0, $credit), 0);
$assert('agent w/limit treated as cash -> 5',  $available(5, 0, $agent), 5);
$assert('missing role defaults user -> 55',    $available(5, 0, $noRole), 55);

echo "\n2) Gate decision: wager > available => REJECT (real available)\n";
$gateAllows = static function (float $wager, float $balance, float $pending, array $user) use ($available): bool {
    return $wager <= $available($balance, $pending, $user);
};
$assert('cash $5: bet $5 allowed',             $gateAllows(5, 5, 0, $cash) ? 1 : 0, 1);
$assert('cash $5: bet $6 REJECTED',            $gateAllows(6, 5, 0, $cash) ? 1 : 0, 0);
$assert('credit $5/lim100: bet $50 allowed',   $gateAllows(50, 5, 0, $credit) ? 1 : 0, 1);
$assert('credit $5/lim100: bet $105 allowed',  $gateAllows(105, 5, 0, $credit) ? 1 : 0, 1);
$assert('credit $5/lim100: bet $106 REJECTED', $gateAllows(106, 5, 0, $credit) ? 1 : 0, 0);
$assert('maxed credit -120/lim100: bet $1 REJECTED', $gateAllows(1, -120, 0, $credit) ? 1 : 0, 0);

echo "\n3) Stacking (craps): incremental stake gated against post-debit available\n";
// Credit player lim 100, bal 5 (avail 105). Bet 60 -> bal -55 (avail 45).
// Next incremental 50 must be REJECTED (45 < 50); 40 allowed.
$afterFirst = 5 - 60; // -55
$assert('after $60 bet, available = 45',        $available($afterFirst, 0, $credit), 45);
$assert('stack +$50 REJECTED (only 45 left)',   $gateAllows(50, $afterFirst, 0, $credit) ? 1 : 0, 0);
$assert('stack +$40 allowed',                   $gateAllows(40, $afterFirst, 0, $credit) ? 1 : 0, 1);

echo "\n4) Parity: CasinoController == WalletController/AuthController formula\n";
$cases = [[5,0,$cash],[5,3,$cash],[5,9,$cash],[5,0,$credit],[-45,0,$credit],[-120,0,$credit],[5,0,$agent]];
foreach ($cases as $i => [$b,$p,$u]) {
    $assert("parity case #$i", $available($b,$p,$u), $canonical($b,$p,$u));
}

echo "\n";
if ($failures === []) {
    echo "ALL $passes ASSERTIONS PASSED\n";
    exit(0);
}
echo count($failures) . " FAILURE(S):\n - " . implode("\n - ", $failures) . "\n";
exit(1);
