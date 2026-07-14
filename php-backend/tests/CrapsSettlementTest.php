<?php

declare(strict_types=1);

/**
 * Money-safety matrix for the craps rules-engine fixes C1–C6.
 *
 * Pure-logic suite: drives the REAL CasinoController settlement/grading/lock
 * methods via reflection (no DB). Isolated process so its lightweight class
 * doubles win resolution (see ISOLATED_SUITES in run.php).
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
        public static function enforce(mixed $db, string $key, int $limit, int $window): bool { return false; }
    }
}

if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, mixed $default = null): mixed { return $default; }
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

function crapsController(): CasinoController
{
    $ref = new ReflectionClass(CasinoController::class);
    return $ref->newInstanceWithoutConstructor();
}

function crapsCall(object $target, string $method, mixed ...$args): mixed
{
    $ref = new ReflectionMethod($target, $method);
    return $ref->invoke($target, ...$args);
}

/**
 * normalizeCrapsBets invoked with a real by-reference $quarantined out-param
 * (reflection ...$args spread cannot bind by-ref params).
 */
function crapsNormalize(CasinoController $c, array $raw, string $context, array &$quar): array
{
    $ref = new ReflectionMethod($c, 'normalizeCrapsBets');
    $args = [$raw, $context];
    $args[2] = &$quar;
    return $ref->invokeArgs($c, $args);
}

/**
 * settleCrapsRoll wrapper. Returns the settlement array.
 */
function crapsRoll(CasinoController $c, array $bets, string $phase, ?int $point, int $d1, int $d2): array
{
    return crapsCall($c, 'settleCrapsRoll', $bets, $phase, $point, $d1, $d2);
}

/**
 * Find a resolved bet row by key. Returns ['outcome','profit','return','moveTo'] or null.
 */
function resolvedBet(array $settlement, string $bet): ?array
{
    foreach ($settlement['resolvedBets'] as $row) {
        if (($row['bet'] ?? '') === $bet) {
            return $row;
        }
    }
    return null;
}

// ── C2: don't-pass bar-12 push on come-out ─────────────────────────────────
TestRunner::run('craps C2 — dont-pass come-out grading', function () {
    $c = crapsController();

    $push = crapsRoll($c, ['dont_pass1' => 10], 'come_out', null, 6, 6); // sum 12
    $r = resolvedBet($push, 'dont_pass1');
    TestRunner::assertEquals('push', $r['outcome'] ?? '', 'come-out 12 pushes don\'t-pass (bar-12)');
    TestRunner::assertEqualsFloat(0.0, (float) $r['profit'], 'push pays no profit');
    TestRunner::assertEqualsFloat(10.0, (float) $r['return'], 'push returns the stake');

    $win = crapsRoll($c, ['dont_pass1' => 10], 'come_out', null, 1, 1); // sum 2
    TestRunner::assertEquals('win', resolvedBet($win, 'dont_pass1')['outcome'], 'come-out 2 wins don\'t-pass');
    TestRunner::assertEqualsFloat(20.0, (float) resolvedBet($win, 'dont_pass1')['return'], '2 wins pay 1:1 (return 20)');

    $lose = crapsRoll($c, ['dont_pass1' => 10], 'come_out', null, 3, 4); // sum 7
    TestRunner::assertEquals('lose', resolvedBet($lose, 'dont_pass1')['outcome'], 'come-out 7 loses don\'t-pass');
});

// ── C3a: don't-come grading (loses 7? no — WINS 7; wins 2/3; push 12; travels) ─
TestRunner::run('craps C3a — dont-come grading never bricks', function () {
    $c = crapsController();

    TestRunner::assertEquals('win', resolvedBet(crapsRoll($c, ['dont_come' => 10], 'come_point', 6, 3, 4), 'dont_come')['outcome'], 'don\'t-come wins on 7');
    TestRunner::assertEqualsFloat(20.0, (float) resolvedBet(crapsRoll($c, ['dont_come' => 10], 'come_point', 6, 3, 4), 'dont_come')['return'], '7 pays 1:1');
    TestRunner::assertEquals('win', resolvedBet(crapsRoll($c, ['dont_come' => 10], 'come_point', 6, 1, 1), 'dont_come')['outcome'], 'don\'t-come wins on 2');
    TestRunner::assertEquals('win', resolvedBet(crapsRoll($c, ['dont_come' => 10], 'come_point', 6, 1, 2), 'dont_come')['outcome'], 'don\'t-come wins on 3');
    TestRunner::assertEquals('push', resolvedBet(crapsRoll($c, ['dont_come' => 10], 'come_point', 6, 6, 6), 'dont_come')['outcome'], 'don\'t-come pushes on 12 (bar)');
    TestRunner::assertEquals('lose', resolvedBet(crapsRoll($c, ['dont_come' => 10], 'come_point', 6, 5, 6), 'dont_come')['outcome'], 'don\'t-come loses on 11');

    // Travels to a KNOWN internal key — never lay_bet3 / lay_bet12 (the brick vector).
    $travel = crapsRoll($c, ['dont_come' => 10], 'come_point', 6, 1, 3); // sum 4
    TestRunner::assertEquals('dont_come_point4', resolvedBet($travel, 'dont_come')['moveTo'], 'don\'t-come travels to dont_come_point4');
    TestRunner::assertEqualsFloat(10.0, (float) ($travel['activeBetsAfter']['dont_come_point4'] ?? 0), 'travel carries stake to contract key');
    $keys = array_keys($travel['activeBetsAfter']);
    TestRunner::assertFalse(in_array('lay_bet3', $keys, true) || in_array('lay_bet12', $keys, true), 'never produces the lay_bet3/12 brick keys');
});

// ── C3 dont_come_point contract: even money, wins on 7, loses on number, else carry ─
TestRunner::run('craps C3 — dont-come-point contract settlement', function () {
    $c = crapsController();
    $win = crapsRoll($c, ['dont_come_point4' => 10], 'come_point', 4, 3, 4); // sum 7
    TestRunner::assertEquals('win', resolvedBet($win, 'dont_come_point4')['outcome'], 'dont-come-point wins on 7');
    TestRunner::assertEqualsFloat(20.0, (float) resolvedBet($win, 'dont_come_point4')['return'], 'even money (return 20)');
    $lose = crapsRoll($c, ['dont_come_point4' => 10], 'come_point', 4, 1, 3); // sum 4
    TestRunner::assertEquals('lose', resolvedBet($lose, 'dont_come_point4')['outcome'], 'dont-come-point loses on its number');
    $carry = crapsRoll($c, ['dont_come_point4' => 10], 'come_point', 4, 2, 3); // sum 5
    TestRunner::assertNull(resolvedBet($carry, 'dont_come_point4'), 'no resolution on an unrelated roll');
    TestRunner::assertEqualsFloat(10.0, (float) ($carry['activeBetsAfter']['dont_come_point4'] ?? 0), 'contract carries across the roll');
});

// ── C1: come travels to come_point (not number), even-money contract, locked ───
TestRunner::run('craps C1 — come travel + come-point contract', function () {
    $c = crapsController();

    // Win/lose/travel on the come-out-style resolution.
    TestRunner::assertEquals('win', resolvedBet(crapsRoll($c, ['come' => 10], 'come_point', 6, 3, 4), 'come')['outcome'], 'come wins on 7');
    TestRunner::assertEquals('lose', resolvedBet(crapsRoll($c, ['come' => 10], 'come_point', 6, 1, 1), 'come')['outcome'], 'come loses on 2');
    $travel = crapsRoll($c, ['come' => 10], 'come_point', 6, 2, 4); // sum 6
    TestRunner::assertEquals('come_point6', resolvedBet($travel, 'come')['moveTo'], 'come travels to come_point6 (not number6)');
    TestRunner::assertEqualsFloat(10.0, (float) ($travel['activeBetsAfter']['come_point6'] ?? 0), 'travel carries stake to contract key');

    // Contract settlement — even money on repeat, lose on 7, else carry.
    $hit = crapsRoll($c, ['come_point6' => 10], 'come_point', 6, 2, 4); // sum 6
    TestRunner::assertEqualsFloat(20.0, (float) resolvedBet($hit, 'come_point6')['return'], 'come-point pays even money on repeat');
    TestRunner::assertEquals('lose', resolvedBet(crapsRoll($c, ['come_point6' => 10], 'come_point', 6, 3, 4), 'come_point6')['outcome'], 'come-point loses on 7');
    $carry = crapsRoll($c, ['come_point6' => 10], 'come_point', 6, 2, 3); // sum 5
    TestRunner::assertEqualsFloat(10.0, (float) ($carry['activeBetsAfter']['come_point6'] ?? 0), 'come-point carries on unrelated roll');
});

// ── C1 lock: a traveled contract cannot be removed; open bets still can ────────
TestRunner::run('craps C1 — contract lock, open bets still removable', function () {
    $c = crapsController();

    // Client can never inject or echo-modify a contract key.
    $q = [];
    $parsed = crapsNormalize($c, ['come_point6' => 999, 'win_bet6' => 10], 'client', $q);
    TestRunner::assertFalse(array_key_exists('come_point6', $parsed), 'client-supplied contract key is dropped');
    TestRunner::assertTrue(array_key_exists('win_bet6', $parsed), 'client open bet is kept');

    // Split separates contract from open.
    [$contract, $open] = crapsCall($c, 'splitCrapsContractBets', ['come_point6' => 25, 'win_bet6' => 10, 'pass_line' => 25]);
    TestRunner::assertEqualsFloat(25.0, (float) ($contract['come_point6'] ?? 0), 'come_point6 classified as contract');
    TestRunner::assertFalse(array_key_exists('come_point6', $open), 'contract excluded from open');
    TestRunner::assertTrue(array_key_exists('win_bet6', $open) && array_key_exists('pass_line', $open), 'place/pass are open');

    // Simulate the handler merge: client tries to clear the table ({}).
    $contractBefore = $contract;
    $clientNext = crapsNormalize($c, [], 'client', $q); // {}
    // released is computed over OPEN before only:
    $released = 0.0;
    foreach ($open as $k => $v) {
        $released += max(0, $v - ($clientNext[$k] ?? 0));
    }
    // Contract is re-injected, never released:
    $effective = $clientNext;
    foreach ($contractBefore as $k => $v) { $effective[$k] = $v; }
    TestRunner::assertEqualsFloat(35.0, (float) round($released), 'omitting open bets refunds ONLY the open stake ($10+$25)');
    TestRunner::assertEqualsFloat(25.0, (float) ($effective['come_point6'] ?? 0), 'traveled contract survives a full client clear (no take-down refund)');

    // The lock assertion also rejects an explicit contract reduction.
    TestRunner::assertThrows(function () use ($c) {
        crapsCall($c, 'assertCrapsComePointLockedBets', ['come_point6' => 25, 'pass_line' => 25], ['pass_line' => 25]);
    }, 'InvalidArgumentException', 'assert rejects reducing a traveled contract');
});

// ── C4: buy bets pay true odds minus 5% commission on the wager ────────────────
TestRunner::run('craps C4 — buy bet payouts', function () {
    $c = crapsController();
    // number4: true 2:1, minus 5% of $100 = $200-$5 = $195 profit, $295 back.
    $b4 = resolvedBet(crapsRoll($c, ['number4' => 100], 'come_point', 4, 1, 3), 'number4');
    TestRunner::assertEqualsFloat(195.0, (float) $b4['profit'], 'buy-4 pays true odds minus commission (profit 195)');
    TestRunner::assertEqualsFloat(295.0, (float) $b4['return'], 'buy-4 returns 295');
    // number5: true 3:2 → 150-5 = 145.
    TestRunner::assertEqualsFloat(145.0, (float) resolvedBet(crapsRoll($c, ['number5' => 100], 'come_point', 5, 2, 3), 'number5')['profit'], 'buy-5 profit 145');
    // number6: true 6:5 → 120-5 = 115.
    TestRunner::assertEqualsFloat(115.0, (float) resolvedBet(crapsRoll($c, ['number6' => 100], 'come_point', 6, 2, 4), 'number6')['profit'], 'buy-6 profit 115');
    // It is NOT the old bug (5% of stake = $5).
    TestRunner::assertFalse((float) $b4['profit'] === 5.0, 'buy-4 no longer pays only 5% of stake');
    // loses on 7.
    TestRunner::assertEquals('lose', resolvedBet(crapsRoll($c, ['number4' => 100], 'come_point', 4, 3, 4), 'number4')['outcome'], 'buy-4 loses on 7');
});

// ── C5: lay bets pay true lay odds minus commission ───────────────────────────
TestRunner::run('craps C5 — lay bet payouts', function () {
    $c = crapsController();
    // lay_bet4: true 1:2 (0.5) minus 5% of win → 100*0.5*0.95 = 47.5 → 48.
    $l4 = resolvedBet(crapsRoll($c, ['lay_bet4' => 100], 'come_point', null, 3, 4), 'lay_bet4');
    TestRunner::assertEqualsFloat(48.0, (float) $l4['profit'], 'lay-4 pays lay odds minus commission (profit 48)');
    TestRunner::assertEqualsFloat(148.0, (float) $l4['return'], 'lay-4 returns 148');
    // NOT the old bug (0.5*0.05 fraction).
    TestRunner::assertFalse((float) $l4['profit'] < 10.0, 'lay-4 no longer pays a 2.5% fraction');
    // lose_bet4 variant is unchanged (commission-baked 0.45).
    TestRunner::assertEqualsFloat(45.0, (float) resolvedBet(crapsRoll($c, ['lose_bet4' => 100], 'come_point', null, 3, 4), 'lose_bet4')['profit'], 'lose_bet4 unchanged (profit 45)');
    // lay loses on its number.
    TestRunner::assertEquals('lose', resolvedBet(crapsRoll($c, ['lay_bet4' => 100], 'come_point', null, 1, 3), 'lay_bet4')['outcome'], 'lay-4 loses on 4');
});

// ── C6: hardways CARRY across rolls; lose only on 7 or the easy way ────────────
TestRunner::run('craps C6 — hardway carry', function () {
    $c = crapsController();
    // Win on the hard pair.
    $win = resolvedBet(crapsRoll($c, ['hardway6' => 10], 'come_point', 6, 3, 3), 'hardway6');
    TestRunner::assertEquals('win', $win['outcome'], 'hard-6 wins on 3-3');
    TestRunner::assertEqualsFloat(90.0, (float) $win['profit'], 'hard-6 pays 9:1 (profit 90)');
    // Lose on 7.
    TestRunner::assertEquals('lose', resolvedBet(crapsRoll($c, ['hardway6' => 10], 'come_point', 6, 3, 4), 'hardway6')['outcome'], 'hard-6 loses on 7');
    // Lose on the easy way (2-4 = soft 6).
    TestRunner::assertEquals('lose', resolvedBet(crapsRoll($c, ['hardway6' => 10], 'come_point', 6, 2, 4), 'hardway6')['outcome'], 'hard-6 loses on easy 6');
    // Carry on an unrelated roll (was a wrongful single-roll LOSE before the fix).
    $carry1 = crapsRoll($c, ['hardway6' => 10], 'come_point', 6, 2, 3); // sum 5
    TestRunner::assertNull(resolvedBet($carry1, 'hardway6'), 'hard-6 does NOT resolve on sum 5');
    TestRunner::assertEqualsFloat(10.0, (float) ($carry1['activeBetsAfter']['hardway6'] ?? 0), 'hard-6 carries to next roll');
    // Chain: carry → carry → win.
    $carry2 = crapsRoll($c, $carry1['activeBetsAfter'], 'come_point', 6, 4, 5); // sum 9
    TestRunner::assertEqualsFloat(10.0, (float) ($carry2['activeBetsAfter']['hardway6'] ?? 0), 'hard-6 still riding after 2 rolls');
    $carry3 = crapsRoll($c, $carry2['activeBetsAfter'], 'come_point', 6, 3, 3); // sum 6 hard
    TestRunner::assertEquals('win', resolvedBet($carry3, 'hardway6')['outcome'], 'hard-6 finally wins on 3-3 after carrying');
});

// ── C3b: defensive guard — a bad stored key is quarantined, never thrown ───────
TestRunner::run('craps C3b — quarantine guard un-bricks state', function () {
    $c = crapsController();

    // A legacy brick key + a bogus key + a good bet: state parse survives.
    $q = [];
    $bets = crapsNormalize($c, ['lay_bet3' => 25, 'garbage_bet' => 5, 'pass_line' => 10], 'state', $q);
    TestRunner::assertEqualsFloat(10.0, (float) ($bets['pass_line'] ?? 0), 'good bet survives');
    TestRunner::assertFalse(array_key_exists('lay_bet3', $bets), 'brick key dropped from active bets');
    TestRunner::assertEqualsFloat(25.0, (float) ($q['lay_bet3'] ?? 0), 'brick key quarantined with its stake');
    TestRunner::assertEqualsFloat(5.0, (float) ($q['garbage_bet'] ?? 0), 'bogus key quarantined');
    TestRunner::assertEqualsFloat(30.0, (float) round(array_sum($q)), 'quarantined stake totals for refund');

    // getUserCrapsState never throws on a bricked doc and surfaces the quarantine.
    $state = crapsCall($c, 'getUserCrapsState', [
        'casinoCrapsState' => ['phase' => 'come_point', 'pointNumber' => 5, 'activeBets' => ['lay_bet12' => 40, 'number6' => 25]],
    ]);
    TestRunner::assertEqualsFloat(25.0, (float) ($state['activeBets']['number6'] ?? 0), 'valid stored bet retained');
    TestRunner::assertEqualsFloat(40.0, (float) ($state['quarantinedBets']['lay_bet12'] ?? 0), 'bad stored key quarantined for refund, not thrown');

    // Client mode still rejects an unknown key loudly.
    TestRunner::assertThrows(function () use ($c) {
        $x = [];
        crapsNormalize($c, ['garbage_bet' => 5], 'client', $x);
    }, 'InvalidArgumentException', 'client input rejects unknown keys');
});

// ── Regression: pass line and come-out rejection of come/don't-come ────────────
TestRunner::run('craps — pass-line unaffected; come requires a point', function () {
    $c = crapsController();
    TestRunner::assertEqualsFloat(20.0, (float) resolvedBet(crapsRoll($c, ['pass_line' => 10], 'come_out', null, 3, 4), 'pass_line')['return'], 'pass line wins 1:1 on come-out 7');
    TestRunner::assertEquals('lose', resolvedBet(crapsRoll($c, ['pass_line' => 10], 'come_out', null, 1, 1), 'pass_line')['outcome'], 'pass line loses on come-out 2');
    // point establishes and pass carries.
    $pt = crapsRoll($c, ['pass_line' => 10], 'come_out', null, 3, 2); // sum 5
    TestRunner::assertEquals('come_point', $pt['stateAfter'], 'point established on come-out 5');
    TestRunner::assertEqualsFloat(10.0, (float) ($pt['activeBetsAfter']['pass_line'] ?? 0), 'pass line rides to the point');
});
