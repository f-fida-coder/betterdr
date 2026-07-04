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

function baccaratPayout(float $playerBet, float $bankerBet, float $tieBet, string $result): array
{
    $ref = new ReflectionClass(CasinoController::class);
    /** @var CasinoController $controller */
    $controller = $ref->newInstanceWithoutConstructor();
    $method = new ReflectionMethod($controller, 'calculateBaccaratPayout');

    return $method->invoke($controller, $playerBet, $bankerBet, $tieBet, $result);
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
