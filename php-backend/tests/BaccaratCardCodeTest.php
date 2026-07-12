<?php

declare(strict_types=1);

/**
 * Verifies the baccarat-classic client card-code adapter.
 *
 * The BAC HTML5 client renders whichever numeric code 1-52 the server sends
 * by loading images/Cards/<code>.png, so a wrong mapping makes the animated
 * cards disagree with the settled result — which looks like cheating. The
 * artwork fixes the layout: suit blocks D(1-13) H(14-26) S(27-39) C(40-52),
 * ranks A,2..10,J,Q,K ascending within each block.
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

TestRunner::run('Card code round-trip covers all 52 codes exactly once', function (): void {
    $seenCards = [];
    for ($code = 1; $code <= 52; $code++) {
        $card = CasinoController::baccaratCardFromClientCode($code);
        TestRunner::assertEquals(
            $code,
            CasinoController::baccaratClientCardCode($card),
            "code {$code} -> {$card} -> code {$code}"
        );
        $seenCards[$card] = true;
    }
    TestRunner::assertEquals(52, count($seenCards), 'all 52 decoded cards are distinct');
});

TestRunner::run('Card string round-trip covers the full engine deck both directions', function (): void {
    $seenCodes = [];
    foreach (['D', 'H', 'S', 'C'] as $suit) {
        foreach (['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as $rank) {
            $card = $rank . $suit;
            $code = CasinoController::baccaratClientCardCode($card);
            TestRunner::assertEquals(
                $card,
                CasinoController::baccaratCardFromClientCode($code),
                "{$card} -> code {$code} -> {$card}"
            );
            TestRunner::assertEquals(true, $code >= 1 && $code <= 52, "{$card} code {$code} within 1-52");
            $seenCodes[$code] = true;
        }
    }
    TestRunner::assertEquals(52, count($seenCodes), 'all 52 encoded codes are distinct');
});

TestRunner::run('Anchor cards match the bundled artwork (visually verified)', function (): void {
    // Verified against images/Cards/<code>.png: 1=AD, 11=JD, 13=KD, 14=AH, 27=AS, 40=AC.
    $anchors = ['AD' => 1, 'JD' => 11, 'KD' => 13, 'AH' => 14, 'AS' => 27, 'AC' => 40, 'KC' => 52, '10H' => 23];
    foreach ($anchors as $card => $code) {
        TestRunner::assertEquals($code, CasinoController::baccaratClientCardCode($card), "{$card} = code {$code}");
    }
});

TestRunner::run('8-deck shoe: duplicate cards across decks map to the same 1-52 code', function (): void {
    // Real 8-deck baccarat deals identical cards from different decks; the
    // client renders one PNG per code, so duplicates MUST share a code.
    $ref = new ReflectionClass(CasinoController::class);
    $controller = $ref->newInstanceWithoutConstructor();
    $build = new ReflectionMethod($controller, 'buildCanonicalShoe');
    $codesFor = new ReflectionMethod($controller, 'baccaratClientCardCodes');

    $shoe = $build->invoke($controller, 8);
    TestRunner::assertEquals(416, count($shoe), '8 decks = 416 cards');

    $cardStrings = array_map(static fn(array $c): string => (string) $c['code'], $shoe);
    $codes = $codesFor->invoke(null, $cardStrings);
    TestRunner::assertEquals(416, count($codes), 'every shoe card maps to a code');

    // Exactly 8 of each of the 52 codes, all within 1-52.
    $counts = array_count_values($codes);
    TestRunner::assertEquals(52, count($counts), '52 distinct codes across the 8-deck shoe');
    $allEight = true;
    $inRange = true;
    foreach ($counts as $code => $n) {
        if ($n !== 8) { $allEight = false; }
        if ($code < 1 || $code > 52) { $inRange = false; }
    }
    TestRunner::assertEquals(true, $allEight, 'each code appears exactly 8 times');
    TestRunner::assertEquals(true, $inRange, 'all codes within 1-52');
});

TestRunner::run('Invalid inputs are rejected', function (): void {
    $threw = 0;
    foreach (['AX', 'ZZ', '', '1H', 'AS2'] as $bad) {
        try {
            CasinoController::baccaratClientCardCode($bad);
        } catch (InvalidArgumentException $e) {
            $threw++;
        }
    }
    TestRunner::assertEquals(5, $threw, 'malformed card strings throw');

    $threwCode = 0;
    foreach ([0, 53, -1] as $badCode) {
        try {
            CasinoController::baccaratCardFromClientCode($badCode);
        } catch (InvalidArgumentException $e) {
            $threwCode++;
        }
    }
    TestRunner::assertEquals(3, $threwCode, 'out-of-range codes throw');
});
