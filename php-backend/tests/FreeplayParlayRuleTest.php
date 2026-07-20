<?php

declare(strict_types=1);

/**
 * Freeplay-on-parlay rule (Nicky 2026-07-20, mirrors the old platform):
 * per-player settings.allowFreeplayParlay (admin-set, ABSENT = OFF — same
 * semantics as settings.requiresBetApproval, so no migration shipped).
 * Enforced at placement for parlay AND round_robin (group-level) whenever
 * useFreeplay=true, regardless of the FP/real funding split:
 *   - toggle off → FREEPLAY_PARLAY_NOT_ALLOWED
 *   - toggle on  → max 3 legs AND >= 1 plus-money leg (decimal >= 2.0,
 *     i.e. +100 or longer — even money COUNTS), else FREEPLAY_PARLAY_RULE.
 * Straight / teaser / if_bet / reverse are outside the rule (the gate is
 * only invoked for parlay/round_robin in placeBet — locked here by calling
 * the helper directly, which is the single enforcement source).
 */

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
        /** @param array<string, mixed> $extra */
        public function __construct(string $message, int $code = 0, private array $extra = [])
        {
            parent::__construct($message, $code);
        }

        /** @return array<string, mixed> */
        public function extra(): array { return $this->extra; }
    }
}
if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, ?string $default = null): ?string
        {
            if (array_key_exists($key, $_ENV)) {
                return $_ENV[$key];
            }
            $v = getenv($key);
            return $v === false ? $default : $v;
        }
    }
}
if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return '2026-07-20T12:00:00+00:00'; }
        public static function id(string $id): string { return $id; }
    }
}

require_once __DIR__ . '/../src/OddsMarketCatalog.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';

// Selections builder: decimals in, validated-selection shape out.
function fprLegs(array $decimals): array
{
    $legs = [];
    foreach ($decimals as $i => $d) {
        $legs[] = ['matchId' => 'm' . $i, 'selection' => 'S' . $i, 'odds' => (float) $d, 'marketType' => 'h2h'];
    }
    return $legs;
}

function fprUser(?bool $allow): array
{
    if ($allow === null) {
        return ['id' => 'u1', 'settings' => []]; // field ABSENT
    }
    return ['id' => 'u1', 'settings' => ['allowFreeplayParlay' => $allow]];
}

// Returns a stable outcome label. HARNESS TRAP: in the full suite the loaded
// ApiException is whichever mock a PRIOR test file defined — its constructor
// may drop the extras array entirely — so classification keys off the MESSAGE
// (universally available), same convention as MaxWinCapTest.
function fprCode(callable $fn): ?string
{
    try {
        $fn();
        return null;
    } catch (ApiException $e) {
        $msg = $e->getMessage();
        if (str_contains($msg, 'not available on parlays for this account')) {
            return 'FREEPLAY_PARLAY_NOT_ALLOWED';
        }
        if (str_contains($msg, 'limited to 3 legs')) {
            return 'FREEPLAY_PARLAY_RULE';
        }
        return 'UNEXPECTED: ' . $msg;
    }
}

TestRunner::run('toggle off / absent — freeplay blocked on parlay regardless of slip shape', function (): void {
    // Absent field (the shipped default for every existing player) = OFF.
    TestRunner::assertEquals(
        'FREEPLAY_PARLAY_NOT_ALLOWED',
        fprCode(fn () => SportsbookBetSupport::assertFreeplayParlayAllowed(fprUser(null), fprLegs([2.5, 1.9]))),
        'absent toggle rejects even a valid 2-leg plus-money slip'
    );
    // Explicit false = OFF.
    TestRunner::assertEquals(
        'FREEPLAY_PARLAY_NOT_ALLOWED',
        fprCode(fn () => SportsbookBetSupport::assertFreeplayParlayAllowed(fprUser(false), fprLegs([3.0, 2.0, 2.2]))),
        'explicit false rejects'
    );
    // Missing settings object entirely (oldest docs) = OFF.
    TestRunner::assertEquals(
        'FREEPLAY_PARLAY_NOT_ALLOWED',
        fprCode(fn () => SportsbookBetSupport::assertFreeplayParlayAllowed(['id' => 'u2'], fprLegs([2.5, 2.5]))),
        'no settings object at all rejects'
    );
});

TestRunner::run('toggle on + valid — accepted, including exactly +100 as the plus-money leg', function (): void {
    // 2 legs, one clear underdog.
    TestRunner::assertEquals(null,
        fprCode(fn () => SportsbookBetSupport::assertFreeplayParlayAllowed(fprUser(true), fprLegs([2.5, 1.91]))),
        '2 legs with a +150 accepted');
    // Exactly 3 legs (inclusive bound).
    TestRunner::assertEquals(null,
        fprCode(fn () => SportsbookBetSupport::assertFreeplayParlayAllowed(fprUser(true), fprLegs([1.91, 1.87, 2.4]))),
        'exactly 3 legs accepted');
    // Even money +100 (decimal exactly 2.0) COUNTS as plus-money (approved).
    TestRunner::assertEquals(null,
        fprCode(fn () => SportsbookBetSupport::assertFreeplayParlayAllowed(fprUser(true), fprLegs([2.0, 1.91]))),
        'decimal exactly 2.0 (+100) counts as the plus-money leg');
});

TestRunner::run('toggle on + invalid — 4+ legs or all-minus-money rejected with the rule code', function (): void {
    // 4 legs, even with plus-money present.
    TestRunner::assertEquals('FREEPLAY_PARLAY_RULE',
        fprCode(fn () => SportsbookBetSupport::assertFreeplayParlayAllowed(fprUser(true), fprLegs([2.5, 1.9, 1.9, 1.9]))),
        '4 legs rejected');
    // 3 legs but all minus-money (every decimal < 2.0; 1.99 ≈ −101).
    TestRunner::assertEquals('FREEPLAY_PARLAY_RULE',
        fprCode(fn () => SportsbookBetSupport::assertFreeplayParlayAllowed(fprUser(true), fprLegs([1.91, 1.87, 1.99]))),
        'all-minus-money rejected (1.99 is NOT plus-money)');
    // Both violations at once.
    TestRunner::assertEquals('FREEPLAY_PARLAY_RULE',
        fprCode(fn () => SportsbookBetSupport::assertFreeplayParlayAllowed(fprUser(true), fprLegs([1.9, 1.9, 1.9, 1.9]))),
        '4 legs + no plus-money rejected');
});

TestRunner::run('rule message is the exact approved copy', function (): void {
    try {
        SportsbookBetSupport::assertFreeplayParlayAllowed(fprUser(true), fprLegs([1.9, 1.9, 1.9, 1.9]));
        TestRunner::assertTrue(false, 'should have thrown');
    } catch (ApiException $e) {
        TestRunner::assertEquals(
            'Freeplay parlays are limited to 3 legs with at least one plus-money leg.',
            $e->getMessage(),
            'exact approved message'
        );
        // Extras (code/maxLegs/legs/hasPlusMoney) are asserted only when the
        // REAL ApiException is loaded — prior-suite mocks may drop them.
        $extra = method_exists($e, 'payload') ? $e->payload() : (method_exists($e, 'extra') ? $e->extra() : []);
        if (($extra['code'] ?? null) !== null) {
            TestRunner::assertEquals('FREEPLAY_PARLAY_RULE', (string) $extra['code'], 'rule code');
            TestRunner::assertEquals(3, (int) ($extra['maxLegs'] ?? 0), 'maxLegs extra');
        } else {
            TestRunner::assertTrue(true, 'extras unavailable under prior-suite mock — message assert stands');
        }
    }
});
