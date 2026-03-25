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

final class JurassicMockMongoRepository extends MongoRepository
{
    /** @var array<string, array<int, array<string, mixed>>> */
    private array $collections;
    private int $nextId = 1;

    /**
     * @param array<string, array<int, array<string, mixed>>> $seed
     */
    public function __construct(array $seed = [])
    {
        $this->collections = $seed;
    }

    public function beginTransaction(): void
    {
    }

    public function commit(): void
    {
    }

    public function rollback(): void
    {
    }

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

    /**
     * @param array<string, mixed> $query
     * @param array<string, mixed> $options
     * @return array<int, array<string, mixed>>
     */
    public function findMany(string $collection, array $query = [], array $options = []): array
    {
        $rows = [];
        foreach ($this->collections[$collection] ?? [] as $doc) {
            if ($this->matches($doc, $query)) {
                $rows[] = $doc;
            }
        }

        if (is_array($options['sort'] ?? null)) {
            $sort = $options['sort'];
            usort($rows, static function (array $a, array $b) use ($sort): int {
                foreach ($sort as $field => $direction) {
                    $dir = ((int) $direction) < 0 ? -1 : 1;
                    $cmp = strcmp((string) ($a[$field] ?? ''), (string) ($b[$field] ?? ''));
                    if ($cmp !== 0) {
                        return $cmp * $dir;
                    }
                }

                return 0;
            });
        }

        $limit = isset($options['limit']) && is_numeric($options['limit']) ? (int) $options['limit'] : null;
        if ($limit !== null && $limit >= 0) {
            $rows = array_slice($rows, 0, $limit);
        }

        return array_values($rows);
    }

    public function insertOne(string $collection, array $document): string
    {
        if (!isset($document['_id']) || trim((string) $document['_id']) === '') {
            $document['_id'] = 'mock_' . $this->nextId++;
        }
        $this->collections[$collection] ??= [];
        $this->collections[$collection][] = $document;
        return (string) $document['_id'];
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

    /**
     * @param array<string, mixed> $doc
     * @param array<string, mixed> $query
     */
    private function matches(array $doc, array $query): bool
    {
        foreach ($query as $field => $expected) {
            $actual = $doc[$field] ?? null;
            if (is_array($expected)) {
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

/**
 * @return array{0: CasinoController, 1: JurassicMockMongoRepository, 2: array<string, mixed>}
 */
function jurassicBuildSpinHarness(float $accountMinBet = 25.0, float $balance = 20000.0): array
{
    $userId = 'jurassic_test_user';
    $db = new JurassicMockMongoRepository([
        'casinogames' => [[
            '_id' => 'jurassic_game',
            'slug' => 'jurassic-run',
            'name' => 'Jurassic Run',
            'status' => 'active',
            'minBet' => 1,
            'maxBet' => 5000,
        ]],
        'users' => [[
            '_id' => $userId,
            'username' => 'mock_jurassic_player',
            'role' => 'user',
            'status' => 'active',
            'balance' => $balance,
            'pendingBalance' => 0,
            'minBet' => $accountMinBet,
            'maxBet' => 100000,
        ]],
        'transactions' => [],
        'casino_bets' => [],
        'casino_round_audit' => [],
        'casino_game_state' => [],
    ]);

    $controller = new CasinoController($db, 'jurassic-test-secret');
    $actor = [
        '_id' => $userId,
        'username' => 'mock_jurassic_player',
        'role' => 'user',
        'status' => 'active',
    ];

    return [$controller, $db, $actor];
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

    $betLimits = jurassicCall($controller, 'buildJurassicRunBetLimits', [], 1.0, 5000.0);
    TestRunner::assertEquals(10, (int) ($betLimits['paylines'] ?? 0), 'bet limits expose fixed paylines');
    TestRunner::assertContains(0, $betLimits['allowedBetIds'] ?? [], 'default minimum bet id is allowed');
    TestRunner::assertContains(8, $betLimits['allowedBetIds'] ?? [], 'maximum bet id is allowed');
});

TestRunner::run('Jurassic Run ignores sportsbook account min/max for chip ladder', function (): void {
    $controller = jurassicController();
    $betLimits = jurassicCall($controller, 'buildJurassicRunBetLimits', ['minBet' => 25, 'maxBet' => 200], 1.0, 5000.0);

    TestRunner::assertNull($betLimits['accountMinBet'] ?? null, 'Jurassic account min bet remains unset');
    TestRunner::assertNull($betLimits['accountMaxBet'] ?? null, 'Jurassic account max bet remains unset');
    TestRunner::assertEqualsFloat(1.0, (float) ($betLimits['effectiveMinBet'] ?? 0), 'Jurassic effective minimum stays at game minimum');
    TestRunner::assertEqualsFloat(5000.0, (float) ($betLimits['effectiveMaxBet'] ?? 0), 'Jurassic effective maximum stays at game maximum');
    TestRunner::assertContains(0, $betLimits['allowedBetIds'] ?? [], '$1 chip remains allowed');
    TestRunner::assertContains(1, $betLimits['allowedBetIds'] ?? [], '$5 chip remains allowed');
    TestRunner::assertContains(2, $betLimits['allowedBetIds'] ?? [], '$10 chip remains allowed');
    TestRunner::assertContains(10, $betLimits['allowedBetIds'] ?? [], '$5000 chip remains allowed');
});

TestRunner::run('Jurassic Run spin flow accepts every chip even when account minBet is 25', function (): void {
    $chipMap = [
        0 => 1.0,
        1 => 5.0,
        2 => 10.0,
        3 => 50.0,
        4 => 100.0,
        5 => 200.0,
        6 => 400.0,
        7 => 500.0,
        8 => 1000.0,
        9 => 2000.0,
        10 => 5000.0,
    ];

    foreach ($chipMap as $betId => $expectedBet) {
        [$controller, $_db, $actor] = jurassicBuildSpinHarness(25.0, 20000.0);
        Response::reset();

        jurassicCall(
            $controller,
            'placeJurassicRunBet',
            $actor,
            [
                'game' => 'jurassic-run',
                'bets' => [
                    'betId' => $betId,
                    'bet' => $expectedBet,
                ],
            ],
            'jurassic_mock_' . $betId,
            microtime(true)
        );

        $status = Response::$last['status'] ?? 0;
        $payload = Response::$last['data'] ?? [];

        TestRunner::assertEquals(200, $status, 'chip $' . $expectedBet . ' returns success');
        TestRunner::assertEquals('jurassic-run', (string) ($payload['game'] ?? ''), 'chip $' . $expectedBet . ' stays on Jurassic Run');
        TestRunner::assertEquals($betId, (int) ($payload['bets']['betId'] ?? -1), 'chip $' . $expectedBet . ' preserves bet id');
        TestRunner::assertEqualsFloat($expectedBet, (float) ($payload['bets']['bet'] ?? 0), 'chip $' . $expectedBet . ' preserves total bet');
        TestRunner::assertEqualsFloat($expectedBet, (float) ($payload['totalWager'] ?? 0), 'chip $' . $expectedBet . ' is wagered on paid spin');
        TestRunner::assertEquals(10, (int) ($payload['roundData']['activePaylines'] ?? 0), 'chip $' . $expectedBet . ' keeps fixed 10 paylines');
    }
});
