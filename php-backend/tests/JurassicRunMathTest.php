<?php

declare(strict_types=1);

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
    }
}

if (!class_exists('MongoRepository')) {
    class MongoRepository
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

function jurassicController(): CasinoController
{
    $ref = new ReflectionClass(CasinoController::class);
    /** @var CasinoController $controller */
    $controller = $ref->newInstanceWithoutConstructor();
    return $controller;
}

function jurassicCall(object $target, string $method, mixed ...$args): mixed
{
    $ref = new ReflectionMethod($target, $method);
    return $ref->invoke($target, ...$args);
}

TestRunner::run('Jurassic Run payout helpers', function (): void {
    $controller = jurassicController();

    TestRunner::assertEqualsFloat(
        47.0,
        (float) jurassicCall($controller, 'jurassicRunScaledPayoutMultiplier', '8', 5),
        '5-of-a-kind top symbol uses scaled multiplier'
    );
    TestRunner::assertEqualsFloat(
        0.47,
        (float) jurassicCall($controller, 'jurassicRunScaledPayoutMultiplier', '1', 3),
        '3-of-a-kind low symbol uses scaled multiplier'
    );

    $fiveOfKindGrid = [
        ['8', '1', '2'],
        ['8', '2', '3'],
        ['8', '3', '4'],
        ['8', '4', '5'],
        ['8', '5', '6'],
    ];
    $winningData = jurassicCall($controller, 'calculateJurassicRunWinningData', $fiveOfKindGrid, 10.0);
    TestRunner::assertEqualsFloat(470.0, (float) ($winningData['winnings'] ?? 0), '5-of-a-kind payout rounds correctly');
    TestRunner::assertEquals(0, (int) ($winningData['freeSpinsWon'] ?? 0), 'regular payout does not award free spins');
    TestRunner::assertEquals(0, (int) ($winningData['jackpotWon'] ?? 0), 'regular payout does not award jackpot');

    $freeSpinGrid = [
        ['FreeSpin', '1', '2'],
        ['FreeSpin', '2', '3'],
        ['FreeSpin', '3', '4'],
        ['7', '4', '5'],
        ['8', '5', '6'],
    ];
    $freeSpinData = jurassicCall($controller, 'calculateJurassicRunWinningData', $freeSpinGrid, 10.0);
    TestRunner::assertEquals(2, (int) ($freeSpinData['freeSpinsWon'] ?? 0), '3 FreeSpin symbols award 2 free spins');
    TestRunner::assertEqualsFloat(0.0, (float) ($freeSpinData['winnings'] ?? 0), 'free spin trigger does not also add cash payout');
});

TestRunner::run('Jurassic Run user state counters', function (): void {
    $controller = jurassicController();
    $stateAfter = jurassicCall(
        $controller,
        'buildJurassicRunUserStateAfter',
        [
            'totalRounds' => 4,
            'paidRounds' => 3,
            'freeSpinRounds' => 1,
            'totalWagered' => 120,
            'totalPaidOut' => 95,
            'totalFreeSpinsAwarded' => 2,
            'jackpotsWon' => 0,
        ],
        [
            'freeSpinsRemaining' => 3,
            'lockedBetId' => 2,
        ],
        2,
        50.0,
        50.0,
        140.0,
        'spin_win',
        false,
        2
    );

    TestRunner::assertEquals(5, (int) ($stateAfter['totalRounds'] ?? 0), 'total rounds increments');
    TestRunner::assertEquals(4, (int) ($stateAfter['paidRounds'] ?? 0), 'paid rounds increments');
    TestRunner::assertEquals(1, (int) ($stateAfter['freeSpinRounds'] ?? 0), 'free spin rounds stay unchanged on paid spin');
    TestRunner::assertEqualsFloat(170.0, (float) ($stateAfter['totalWagered'] ?? 0), 'total wagered accumulates');
    TestRunner::assertEqualsFloat(235.0, (float) ($stateAfter['totalPaidOut'] ?? 0), 'total paid out accumulates');
    TestRunner::assertEquals(4, (int) ($stateAfter['totalFreeSpinsAwarded'] ?? 0), 'free spin awards accumulate');
    TestRunner::assertEquals(10, (int) ($stateAfter['activePaylines'] ?? 0), 'fixed payline count is stored');
    TestRunner::assertEqualsFloat(5.0, (float) ($stateAfter['lastLineBet'] ?? 0), 'line bet is derived from total bet');
    TestRunner::assertTrue((bool) ($stateAfter['bonusRoundActive'] ?? false), 'free spins remaining marks bonus round active');
});

TestRunner::run('Jurassic Run progressive defaults and bet limits', function (): void {
    $controller = jurassicController();

    $progressiveState = jurassicCall($controller, 'normalizeJurassicRunProgressiveState', null);
    TestRunner::assertEqualsFloat(10000.0, (float) ($progressiveState['jackpotPool'] ?? 0), 'progressive seed defaults to 10000');
    TestRunner::assertEquals(0, (int) ($progressiveState['totalRounds'] ?? 0), 'progressive rounds default to zero');

    $betLimits = jurassicCall($controller, 'buildJurassicRunBetLimits', [], 10.0, 5000.0);
    TestRunner::assertEquals(10, (int) ($betLimits['paylines'] ?? 0), 'bet limits expose fixed paylines');
    TestRunner::assertContains(0, $betLimits['allowedBetIds'] ?? [], 'default minimum bet id is allowed');
    TestRunner::assertContains(8, $betLimits['allowedBetIds'] ?? [], 'maximum bet id is allowed');
});
