<?php

declare(strict_types=1);

/**
 * Verifies the baccarat-classic provably-fair (commit-reveal) shoe.
 *
 * Seed storage is Option A (stored rotating chain): the serverSeed is fresh
 * random_bytes per rotation, NOT derived from any secret. The deal is a pure
 * deterministic function of (serverSeed, clientSeed, nonce, shoeSize). This suite
 * proves: determinism, that an INDEPENDENT reimplementation of the published
 * algorithm reproduces the exact shoe (trustless verify), the deterministic
 * chain-id (one row per user+game), input sensitivity, and third-card handling.
 * (Chain read/rotate/loud-fail lifecycle is DB-bound and covered by the live
 * money-safety run, not this sans-DB unit suite.)
 *
 * Runs isolated (ISOLATED_SUITES in run.php) — it stubs the CasinoController
 * dependency graph.
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
        public static function json(array $data, int $status = 200): void {}
        public static function serverError(string $m = 'Server error', ?Throwable $e = null, int $s = 500): void {}
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
        public static function get(string $key, mixed $default = null): mixed
        {
            return $default;
        }
    }
}

if (!class_exists('SportsbookBetSupport')) {
    class SportsbookBetSupport {}
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

function bacController(): CasinoController
{
    return (new ReflectionClass(CasinoController::class))->newInstanceWithoutConstructor();
}

function bacCall(string $method, array $args): mixed
{
    $m = new ReflectionMethod(CasinoController::class, $method);
    return $m->invoke(bacController(), ...$args);
}

/** Independent reimplementation of the published seeded-shuffle algorithm. */
function independentShoeCodes(string $serverSeed, string $clientSeed, int $nonce, int $decks): array
{
    $suits = ['H', 'D', 'C', 'S'];
    $ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    $shoe = [];
    for ($d = 0; $d < $decks; $d++) {
        foreach ($suits as $s) {
            foreach ($ranks as $r) {
                $shoe[] = $r . $s;
            }
        }
    }
    $message = $clientSeed . ':' . $nonce . ':';
    $buffer = '';
    $pos = 0;
    $counter = 0;
    $next = static function () use (&$buffer, &$pos, &$counter, $serverSeed, $message): int {
        if ($pos + 4 > strlen($buffer)) {
            $buffer = hash_hmac('sha256', $message . $counter, $serverSeed, true);
            $counter++;
            $pos = 0;
        }
        $u = unpack('N', substr($buffer, $pos, 4));
        $pos += 4;
        return $u[1];
    };
    for ($i = count($shoe) - 1; $i > 0; $i--) {
        $range = $i + 1;
        $limit = intdiv(0x100000000, $range) * $range;
        do {
            $v = $next();
        } while ($v >= $limit);
        $j = $v % $range;
        [$shoe[$i], $shoe[$j]] = [$shoe[$j], $shoe[$i]];
    }
    return $shoe;
}

TestRunner::run('Seeded deal is deterministic — same tuple, same cards', function (): void {
    $args = ['a1b2c3', 'player-seed-xyz', 4, 8];
    $r1 = bacCall('recomputeBaccaratRound', $args);
    $r2 = bacCall('recomputeBaccaratRound', $args);
    TestRunner::assertEquals($r1['playerCards'], $r2['playerCards'], 'player cards identical');
    TestRunner::assertEquals($r1['bankerCards'], $r2['bankerCards'], 'banker cards identical');
    TestRunner::assertEquals($r1['deckHash'], $r2['deckHash'], 'deck hash identical');
    TestRunner::assertEquals($r1['result'], $r2['result'], 'result identical');
});

TestRunner::run('Independent reimplementation reproduces the exact shoe (trustless verify)', function (): void {
    $ref = new ReflectionClass(CasinoController::class);
    $controller = $ref->newInstanceWithoutConstructor();
    $buildShoe = new ReflectionMethod($controller, 'buildCanonicalShoe');
    $shuffle = new ReflectionMethod($controller, 'seededShuffleShoe');

    foreach ([[ 'seedone', 'clientA', 0, 1 ], [ 'deadbeef', 'client:B', 7, 8 ], [ 'ff00', 'c', 123, 8 ]] as [$ss, $cs, $nonce, $decks]) {
        $canonical = $buildShoe->invoke($controller, $decks);
        $shuffled = $shuffle->invoke($controller, $canonical, $ss, $cs, $nonce);
        $controllerCodes = array_map(static fn(array $c): string => (string) $c['code'], $shuffled);
        $independentCodes = independentShoeCodes($ss, $cs, $nonce, $decks);
        TestRunner::assertEquals($independentCodes, $controllerCodes, "independent shoe matches for ({$ss},{$cs},{$nonce},{$decks}d)");
    }
});

TestRunner::run('Commitment property — SHA256(serverSeed) is a stable 64-hex commitment', function (): void {
    // Option A: serverSeed is random (not derived). The commitment is simply
    // its SHA256, and a stored past round verifies from that STORED seed — no
    // secret, so rotation-safety is inherent (nothing to rotate).
    foreach (['00', 'deadbeef', str_repeat('a1', 32)] as $seed) {
        $h = hash('sha256', $seed);
        TestRunner::assertEquals(64, strlen($h), 'commitment is 64 hex chars');
        // recompute from the same stored seed is byte-identical every time
        $r1 = bacCall('recomputeBaccaratRound', [$seed, 'c', 0, 8]);
        $r2 = bacCall('recomputeBaccaratRound', [$seed, 'c', 0, 8]);
        TestRunner::assertEquals($r1['deckHash'], $r2['deckHash'], 'stored seed reproduces identically (rotation-safe)');
    }
});

TestRunner::run('Chain id is deterministic and unique per (user, game)', function (): void {
    $id1 = bacCall('baccaratSeedChainId', ['userA', 'baccarat-classic']);
    $id1b = bacCall('baccaratSeedChainId', ['userA', 'baccarat-classic']);
    $id2 = bacCall('baccaratSeedChainId', ['userB', 'baccarat-classic']);
    $id3 = bacCall('baccaratSeedChainId', ['userA', 'other-game']);
    TestRunner::assertEquals($id1, $id1b, 'same (user,game) => same chain id (one row per pair)');
    TestRunner::assertEquals(64, strlen($id1), 'chain id fits VARCHAR(64)');
    TestRunner::assertEquals(true, $id1 !== $id2, 'different user => different chain id');
    TestRunner::assertEquals(true, $id1 !== $id3, 'different game => different chain id');
});

TestRunner::run('Input sensitivity — clientSeed and nonce each change the shoe', function (): void {
    $base = bacCall('recomputeBaccaratRound', ['seedZ', 'client-1', 0, 8]);
    $diffClient = bacCall('recomputeBaccaratRound', ['seedZ', 'client-2', 0, 8]);
    $diffNonce = bacCall('recomputeBaccaratRound', ['seedZ', 'client-1', 1, 8]);
    $diffSeed = bacCall('recomputeBaccaratRound', ['seedY', 'client-1', 0, 8]);
    TestRunner::assertEquals(true, $base['deckHash'] !== $diffClient['deckHash'], 'different clientSeed => different shoe');
    TestRunner::assertEquals(true, $base['deckHash'] !== $diffNonce['deckHash'], 'different nonce => different shoe');
    TestRunner::assertEquals(true, $base['deckHash'] !== $diffSeed['deckHash'], 'different serverSeed => different shoe');
});

TestRunner::run('Third-card draws occur and cards come from the canonical rank set', function (): void {
    $sawThreeCard = false;
    $validRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    for ($nonce = 0; $nonce < 40; $nonce++) {
        $r = bacCall('recomputeBaccaratRound', ['seedTC', 'client-tc', $nonce, 8]);
        if (count($r['playerCards']) === 3 || count($r['bankerCards']) === 3) {
            $sawThreeCard = true;
        }
        foreach (array_merge($r['playerCards'], $r['bankerCards']) as $card) {
            $rank = substr($card, 0, -1);
            TestRunner::assertEquals(true, in_array($rank, $validRanks, true), "card {$card} has a valid rank");
        }
        TestRunner::assertEquals(true, in_array($r['result'], ['Player', 'Banker', 'Tie'], true), 'result is a valid outcome');
    }
    TestRunner::assertEquals(true, $sawThreeCard, 'at least one third-card-draw round in 40 samples');
});
