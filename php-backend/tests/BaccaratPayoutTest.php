<?php

declare(strict_types=1);

/**
 * Verifies CasinoController::calculateBaccaratPayout money math.
 *
 * Regression guard for the banker commission bug: round(1.95 * bet) paid
 * full even money on every banker bet $1-$10 (fraction .50-.95 always
 * rounded up), handing players a ~+1.24% edge. Banker returns must use
 * floor() so whole-dollar rounding can never favor the player.
 *
 * Runs isolated (see ISOLATED_SUITES in run.php) because it stubs the
 * CasinoController dependency graph before the real classes load.
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
        public static function json(array $data, int $status = 200): void
        {
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

require_once __DIR__ . '/../src/CasinoController.php';

function baccaratPayout(float $playerBet, float $bankerBet, float $tieBet, string $result, ?array $payoutConfig = null): array
{
    $ref = new ReflectionClass(CasinoController::class);
    /** @var CasinoController $controller */
    $controller = $ref->newInstanceWithoutConstructor();
    $method = new ReflectionMethod($controller, 'calculateBaccaratPayout');

    return $method->invoke($controller, $playerBet, $bankerBet, $tieBet, $result, $payoutConfig);
}

function baccaratResolveConfig(?array $gameRow): array
{
    $ref = new ReflectionClass(CasinoController::class);
    $controller = $ref->newInstanceWithoutConstructor();
    $method = new ReflectionMethod($controller, 'resolveGamePayoutConfig');

    return $method->invoke($controller, 'baccarat-classic', $gameRow);
}

function baccaratPayoutConfigUpdateError(array $actor, array $existing, mixed $incomingMetadata): ?array
{
    $ref = new ReflectionClass(CasinoController::class);
    $controller = $ref->newInstanceWithoutConstructor();
    $method = new ReflectionMethod($controller, 'payoutConfigUpdateError');

    return $method->invoke($controller, $actor, $existing, $incomingMetadata);
}

TestRunner::run('Baccarat banker returns are floored — commission never erased', function (): void {
    $expectedReturns = [1 => 1, 2 => 3, 3 => 5, 4 => 7, 5 => 9, 6 => 11, 7 => 13, 8 => 15, 9 => 17, 10 => 19];
    foreach ($expectedReturns as $bet => $expected) {
        $payout = baccaratPayout(0.0, (float) $bet, 0.0, 'Banker');
        TestRunner::assertEqualsFloat((float) $expected, (float) $payout['totalReturn'], "banker \${$bet} totalReturn = \${$expected}", 0.0);
        TestRunner::assertEqualsFloat((float) ($expected - $bet), (float) $payout['profit'], "banker \${$bet} profit = \$" . ($expected - $bet), 0.0);
        TestRunner::assertEqualsFloat((float) ($expected - $bet), (float) $payout['netResult'], "banker \${$bet} netResult = \$" . ($expected - $bet), 0.0);
    }
});

TestRunner::run('Baccarat banker return never exceeds exact 1.95x (house-safe $1-$100)', function (): void {
    $violations = [];
    for ($bet = 1; $bet <= 100; $bet++) {
        $payout = baccaratPayout(0.0, (float) $bet, 0.0, 'Banker');
        if ((float) $payout['totalReturn'] > 1.95 * $bet) {
            $violations[] = $bet;
        }
    }
    TestRunner::assertEquals([], $violations, 'no banker bet $1-$100 returns more than exact 1.95x');
});

TestRunner::run('Baccarat player pays exactly 1:1 (unchanged)', function (): void {
    foreach ([1, 7, 50, 100] as $bet) {
        $payout = baccaratPayout((float) $bet, 0.0, 0.0, 'Player');
        TestRunner::assertEqualsFloat((float) ($bet * 2), (float) $payout['totalReturn'], "player \${$bet} totalReturn", 0.0);
        TestRunner::assertEqualsFloat((float) $bet, (float) $payout['profit'], "player \${$bet} profit", 0.0);
    }
});

TestRunner::run('Baccarat tie pays 8:1 and refunds player/banker stakes (unchanged)', function (): void {
    $payout = baccaratPayout(0.0, 0.0, 5.0, 'Tie');
    TestRunner::assertEqualsFloat(45.0, (float) $payout['totalReturn'], 'tie $5 totalReturn (9x)', 0.0);
    TestRunner::assertEqualsFloat(40.0, (float) $payout['profit'], 'tie $5 profit (8x)', 0.0);

    $mixed = baccaratPayout(10.0, 20.0, 5.0, 'Tie');
    TestRunner::assertEqualsFloat(75.0, (float) $mixed['totalReturn'], 'tie refunds P/B stakes: 45 + 10 + 20', 0.0);
    TestRunner::assertEqualsFloat(40.0, (float) $mixed['netResult'], 'tie mixed netResult: 75 - 35', 0.0);
});

TestRunner::run('Baccarat losing bets return zero', function (): void {
    $payout = baccaratPayout(10.0, 0.0, 5.0, 'Banker');
    TestRunner::assertEqualsFloat(0.0, (float) $payout['totalReturn'], 'player+tie lose on Banker result', 0.0);
    TestRunner::assertEqualsFloat(-15.0, (float) $payout['netResult'], 'net is minus total wager', 0.0);
});

// ── Phase 2: admin-configurable payout config ─────────────────────────

TestRunner::run('Default config reproduces the no-config payout bit for bit', function (): void {
    $defaults = ['bankerCommissionPct' => 5.0, 'tiePayout' => 8.0];
    foreach (['Player', 'Banker', 'Tie'] as $result) {
        foreach ([[5.0, 0.0, 0.0], [0.0, 7.0, 0.0], [0.0, 0.0, 3.0], [10.0, 20.0, 5.0], [1.11, 2.22, 3.33]] as [$p, $b, $t]) {
            $legacy = baccaratPayout($p, $b, $t, $result, null);
            $configured = baccaratPayout($p, $b, $t, $result, $defaults);
            $empty = baccaratPayout($p, $b, $t, $result, []);
            TestRunner::assertEquals($legacy, $configured, "explicit defaults == null config ({$result} {$p}/{$b}/{$t})");
            TestRunner::assertEquals($legacy, $empty, "empty config == null config ({$result} {$p}/{$b}/{$t})");
        }
    }
});

TestRunner::run('Configured banker commission drives floor(bet x (2 - pct/100))', function (): void {
    $at = fn(float $pct): array => baccaratPayout(0.0, 100.0, 0.0, 'Banker', ['bankerCommissionPct' => $pct, 'tiePayout' => 8.0]);
    TestRunner::assertEqualsFloat(195.0, (float) $at(5.0)['totalReturn'], '5% on $100 = 195 (unchanged)', 0.0);
    TestRunner::assertEqualsFloat(193.0, (float) $at(7.0)['totalReturn'], '7% on $100 = floor(193) = 193', 0.0);
    TestRunner::assertEqualsFloat(190.0, (float) $at(10.0)['totalReturn'], '10% on $100 = 190 (max clamp boundary)', 0.0);
    TestRunner::assertEqualsFloat(197.0, (float) $at(2.5)['totalReturn'], '2.5% on $100 = floor(197.5) = 197 (min boundary, floored)', 0.0);

    $small = baccaratPayout(0.0, 7.0, 0.0, 'Banker', ['bankerCommissionPct' => 7.0, 'tiePayout' => 8.0]);
    TestRunner::assertEqualsFloat(13.0, (float) $small['totalReturn'], '7% on $7 = floor(13.51) = 13', 0.0);
});

TestRunner::run('Configured tie payout drives return; fractional multipliers floor the win', function (): void {
    $at = fn(float $mult): array => baccaratPayout(0.0, 0.0, 5.0, 'Tie', ['bankerCommissionPct' => 5.0, 'tiePayout' => $mult]);
    TestRunner::assertEqualsFloat(45.0, (float) $at(8.0)['totalReturn'], '8x on $5 = 45 (unchanged)', 0.0);
    TestRunner::assertEqualsFloat(40.0, (float) $at(7.0)['totalReturn'], '7x on $5 = 40', 0.0);
    TestRunner::assertEqualsFloat(50.0, (float) $at(9.0)['totalReturn'], '9x on $5 = 50', 0.0);
    TestRunner::assertEqualsFloat(42.0, (float) $at(7.5)['totalReturn'], '7.5x on $5 = floor(37.5) + 5 = 42 (win floored)', 0.0);
    TestRunner::assertEqualsFloat(37.0, (float) $at(7.5)['profit'], '7.5x on $5 profit = 37', 0.0);
});

TestRunner::run('Calc re-clamps raw config values (read-side defense)', function (): void {
    $banker = fn(array $cfg): float => (float) baccaratPayout(0.0, 100.0, 0.0, 'Banker', $cfg)['totalReturn'];
    $tie = fn(array $cfg): float => (float) baccaratPayout(0.0, 0.0, 5.0, 'Tie', $cfg)['totalReturn'];
    TestRunner::assertEqualsFloat(190.0, $banker(['bankerCommissionPct' => 50]), 'commission 50 clamps to 10% => 190', 0.0);
    TestRunner::assertEqualsFloat(197.0, $banker(['bankerCommissionPct' => 0.1]), 'commission 0.1 clamps to 2.5% => 197', 0.0);
    TestRunner::assertEqualsFloat(195.0, $banker(['bankerCommissionPct' => 'junk']), 'non-numeric commission falls back to default 5%', 0.0);
    TestRunner::assertEqualsFloat(50.0, $tie(['tiePayout' => 20]), 'tie 20 clamps to 9x => 50', 0.0);
    TestRunner::assertEqualsFloat(40.0, $tie(['tiePayout' => 1]), 'tie 1 clamps to 7x => 40', 0.0);
});

TestRunner::run('resolveGamePayoutConfig clamps stored values and defaults missing ones', function (): void {
    $noRow = baccaratResolveConfig(null);
    TestRunner::assertEquals(['bankerCommissionPct' => 5.0, 'tiePayout' => 8.0], $noRow, 'missing row => shipped defaults');

    $inRange = baccaratResolveConfig(['metadata' => ['payoutConfig' => ['bankerCommissionPct' => 7.0, 'tiePayout' => 7.0]]]);
    TestRunner::assertEquals(['bankerCommissionPct' => 7.0, 'tiePayout' => 7.0], $inRange, 'in-range stored values pass through');

    $wild = baccaratResolveConfig(['metadata' => ['payoutConfig' => ['bankerCommissionPct' => 50, 'tiePayout' => 0]]]);
    TestRunner::assertEquals(['bankerCommissionPct' => 10.0, 'tiePayout' => 7.0], $wild, 'out-of-range stored values are clamped, never applied raw');
});

TestRunner::run('payoutConfig write gate: role guard + range rejection', function (): void {
    $game = ['slug' => 'baccarat-classic', 'metadata' => []];
    $changed = ['payoutConfig' => ['bankerCommissionPct' => 7.0, 'tiePayout' => 8.0]];

    foreach (['agent', 'master_agent', 'super_agent'] as $role) {
        $err = baccaratPayoutConfigUpdateError(['role' => $role], $game, $changed);
        TestRunner::assertEquals(403, $err['status'] ?? 0, $role . ' changing payoutConfig is rejected 403');
    }
    TestRunner::assertEquals(null, baccaratPayoutConfigUpdateError(['role' => 'admin'], $game, $changed), 'admin changing payoutConfig passes');

    $outOfRange = baccaratPayoutConfigUpdateError(['role' => 'admin'], $game, ['payoutConfig' => ['bankerCommissionPct' => 11, 'tiePayout' => 8]]);
    TestRunner::assertEquals(400, $outOfRange['status'] ?? 0, 'out-of-range commission rejected 400 even for admin');
    TestRunner::assertEquals(true, str_contains((string) ($outOfRange['message'] ?? ''), '2.5') && str_contains((string) ($outOfRange['message'] ?? ''), '10'), 'rejection names the allowed range');

    $badTie = baccaratPayoutConfigUpdateError(['role' => 'admin'], $game, ['payoutConfig' => ['tiePayout' => 6.5]]);
    TestRunner::assertEquals(400, $badTie['status'] ?? 0, 'tiePayout below 7 rejected 400');

    $unknownKey = baccaratPayoutConfigUpdateError(['role' => 'admin'], $game, ['payoutConfig' => ['bonusJackpotPct' => 1]]);
    TestRunner::assertEquals(400, $unknownKey['status'] ?? 0, 'unknown payoutConfig key rejected 400');

    $notObject = baccaratPayoutConfigUpdateError(['role' => 'admin'], $game, ['payoutConfig' => 'high']);
    TestRunner::assertEquals(400, $notObject['status'] ?? 0, 'non-object payoutConfig rejected 400');

    $wrongGame = baccaratPayoutConfigUpdateError(['role' => 'admin'], ['slug' => 'craps', 'metadata' => []], $changed);
    TestRunner::assertEquals(400, $wrongGame['status'] ?? 0, 'payoutConfig on a game without a spec rejected 400');
});

TestRunner::run('payoutConfig write gate: echoing the current config is not an edit', function (): void {
    // GET returns the effective config; a caller PUTting other fields echoes it
    // back verbatim — that must not trip the admin-only guard.
    $game = ['slug' => 'baccarat-classic', 'metadata' => ['payoutConfig' => ['bankerCommissionPct' => 7.0, 'tiePayout' => 7.0]]];
    $echo = ['payoutConfig' => ['bankerCommissionPct' => 7.0, 'tiePayout' => 7.0]];
    TestRunner::assertEquals(null, baccaratPayoutConfigUpdateError(['role' => 'agent'], $game, $echo), 'agent echoing unchanged config passes');

    $defaultEcho = ['payoutConfig' => ['bankerCommissionPct' => 5.0, 'tiePayout' => 8.0]];
    $bare = ['slug' => 'baccarat-classic', 'metadata' => []];
    TestRunner::assertEquals(null, baccaratPayoutConfigUpdateError(['role' => 'agent'], $bare, $defaultEcho), 'agent echoing effective defaults over empty stored config passes');

    TestRunner::assertEquals(null, baccaratPayoutConfigUpdateError(['role' => 'agent'], $bare, ['name' => 'Baccarat']), 'metadata without payoutConfig is untouched by the gate');
});
