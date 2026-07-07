<?php

declare(strict_types=1);

/**
 * House absolute win ceiling (MAX_PARLAY_PAYOUT, PO ruling 2026-07-07):
 * parlays, Round Robin children (each individually), open parlays
 * (create + every add-leg), and outright legs are capped at $5,000 of WIN
 * (profit). The cap REJECTS with a computed "reduce your stake to $X"
 * where X = floor(cap / (decimal - 1)) — floor guarantees the suggestion
 * can never itself bust the cap. Straight non-outright tickets and
 * teaser/if-bet/reverse are outside the ruling; manual/admin bets never
 * pass through the capped placement paths.
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
        public static function nowUtc(): string { return '2026-07-07T12:00:00+00:00'; }
        public static function id(string $id): string { return $id; }
    }
}

require_once __DIR__ . '/../src/OddsMarketCatalog.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/RoundRobinService.php';

// American → decimal, exact (mirrors the placement convention).
function mwcDec(int $american): float
{
    return $american > 0 ? 1.0 + $american / 100.0 : 1.0 + 100.0 / abs($american);
}

function mwcWithCap(?string $value, callable $fn): void
{
    $origGetenv = getenv('MAX_PARLAY_PAYOUT');
    $origEnv = $_ENV['MAX_PARLAY_PAYOUT'] ?? null;
    if ($value === null) {
        putenv('MAX_PARLAY_PAYOUT');
        unset($_ENV['MAX_PARLAY_PAYOUT']);
    } else {
        putenv('MAX_PARLAY_PAYOUT=' . $value);
        $_ENV['MAX_PARLAY_PAYOUT'] = $value;
    }
    try {
        $fn();
    } finally {
        if ($origGetenv === false) { putenv('MAX_PARLAY_PAYOUT'); } else { putenv('MAX_PARLAY_PAYOUT=' . $origGetenv); }
        if ($origEnv === null) { unset($_ENV['MAX_PARLAY_PAYOUT']); } else { $_ENV['MAX_PARLAY_PAYOUT'] = $origEnv; }
    }
}

TestRunner::run('allowed stake = floor(cap / (decimal - 1)) — PO examples, arithmetic locked', function (): void {
    // +5000 → decimal 51 → 5000/50 = $100; $100 × 50 wins exactly $5,000.
    TestRunner::assertEqualsFloat(100.0, SportsbookBetSupport::allowedStakeForWinCap(5000.0, mwcDec(5000)), '+5000 → $100');
    // +10000 → decimal 101 (NOT 11) → 5000/100 = $50. ($500 at +10000
    // would win $50,000 — ten times the cap. Decimal 11 is +1000.)
    TestRunner::assertEqualsFloat(50.0, SportsbookBetSupport::allowedStakeForWinCap(5000.0, mwcDec(10000)), '+10000 → $50');
    // +1000 → decimal 11 → 5000/10 = $500.
    TestRunner::assertEqualsFloat(500.0, SportsbookBetSupport::allowedStakeForWinCap(5000.0, mwcDec(1000)), '+1000 → $500');
    // Non-round combined odds floor DOWN: +228 → decimal 3.28 →
    // 5000/2.28 = 2192.98… → $2,192 (never $2,193, which would win $5,000.04).
    TestRunner::assertEqualsFloat(2192.0, SportsbookBetSupport::allowedStakeForWinCap(5000.0, 3.28), '+228 → $2,192 (floored)');
});

TestRunner::run('floor tightness sweep — suggestion never busts the cap, and $1 more always would', function (): void {
    $cap = 5000.0;
    foreach ([1.05, 1.42, 1.9090909090909092, 2.0, 3.28, 6.96, 11.0, 51.0, 101.0, 246.5] as $dec) {
        $x = SportsbookBetSupport::allowedStakeForWinCap($cap, $dec);
        // The property that matters is STRICT: the suggestion never busts
        // the cap. Tightness is epsilon-tolerant — at exact float
        // boundaries (e.g. −110, where cap/(d−1) is a whole number) the
        // floor may land $1 conservative, which is the SAFE side.
        TestRunner::assertTrue($x * ($dec - 1.0) <= $cap + 1e-9, "X×(d−1) ≤ cap at decimal {$dec}");
        TestRunner::assertTrue(($x + 1.0) * ($dec - 1.0) > $cap - 1e-6, "(X+1)×(d−1) > cap−ε at decimal {$dec} (floor is tight)");
    }
});

TestRunner::run('assertWinWithinCap — exactly-at-cap passes, above rejects with stake suggestion', function (): void {
    mwcWithCap('5000', function (): void {
        SportsbookBetSupport::assertWinWithinCap(5000.0, 51.0, 'parlay'); // == cap → passes
        SportsbookBetSupport::assertWinWithinCap(0.0, 1.0, 'parlay');     // degenerate → passes
        $threw = false;
        try {
            SportsbookBetSupport::assertWinWithinCap(5000.01, 51.0, 'parlay');
        } catch (ApiException $e) {
            $threw = true;
            TestRunner::assertEquals(400, $e->getCode(), 'HTTP 400');
            TestRunner::assertTrue(str_contains($e->getMessage(), '$100'), 'message carries the computed stake ($100 at +5000)');
        }
        TestRunner::assertTrue($threw, 'win above cap rejects');
    });
});

TestRunner::run('cap is configurable and <=0 disables it entirely', function (): void {
    mwcWithCap('2000', function (): void {
        $threw = false;
        try {
            SportsbookBetSupport::assertWinWithinCap(2500.0, 3.5, 'parlay');
        } catch (ApiException $e) {
            $threw = true;
        }
        TestRunner::assertTrue($threw, 'lowered cap ($2,000) rejects a $2,500 win');
    });
    mwcWithCap('0', function (): void {
        SportsbookBetSupport::assertWinWithinCap(1000000.0, 101.0, 'parlay'); // no throw
        TestRunner::assertTrue(true, 'cap 0 = disabled, any win passes');
    });
});

// ── Round Robin: EACH child is individually capped ─────────────────────────
// Mirrors placeRoundRobin exactly: generateCombinations builds the children,
// each child's win is stake × (childDecimal − 1), and the WORST child is
// asserted against the cap — so a set of small parlays can never route a
// large combined exposure through the RR flow while each "looks" small.
TestRunner::run('round robin — worst child busts the cap even when other children fit', function (): void {
    mwcWithCap('5000', function (): void {
        // Four legs at +250 each (decimal 3.5). By-2s children win ≤ stake×11.25
        // — fine at $300. The single by-4 child wins stake×149.06 — NOT fine.
        $legs = [
            ['matchId' => 'm1', 'odds' => 3.5],
            ['matchId' => 'm2', 'odds' => 3.5],
            ['matchId' => 'm3', 'odds' => 3.5],
            ['matchId' => 'm4', 'odds' => 3.5],
        ];
        $stake = 300.0;
        $worstWin = 0.0;
        $worstDec = 1.0;
        foreach ([2, 4] as $size) {
            foreach (RoundRobinService::generateCombinations($legs, $size) as $combo) {
                $dec = 1.0;
                foreach ($combo as $sel) {
                    $dec *= (float) $sel['odds'];
                }
                $win = $stake * ($dec - 1.0);
                if ($win > $worstWin) {
                    $worstWin = $win;
                    $worstDec = $dec;
                }
            }
        }
        // Every by-2 child fits ($300 × 11.25 = $3,375 ≤ $5,000)…
        TestRunner::assertTrue($stake * (3.5 * 3.5 - 1.0) <= 5000.0, 'by-2 children individually fit');
        // …but the by-4 child (3.5^4 = 150.0625) wins $44,718.75 → rejected.
        $threw = false;
        $suggested = 0.0;
        try {
            SportsbookBetSupport::assertWinWithinCap($worstWin, $worstDec, 'round_robin_child');
        } catch (ApiException $e) {
            $threw = true;
            $suggested = SportsbookBetSupport::allowedStakeForWinCap(5000.0, $worstDec);
        }
        TestRunner::assertTrue($threw, 'worst RR child above cap rejects the ticket');
        // The suggestion is computed from the BINDING child, so one resubmit
        // at the suggested stake satisfies EVERY child.
        TestRunner::assertEqualsFloat(33.0, $suggested, 'binding child (3.5^4) → $33 per parlay');
        foreach ([2, 4] as $size) {
            foreach (RoundRobinService::generateCombinations($legs, $size) as $combo) {
                $dec = 1.0;
                foreach ($combo as $sel) {
                    $dec *= (float) $sel['odds'];
                }
                TestRunner::assertTrue($suggested * ($dec - 1.0) <= 5000.0, "suggested stake fits child at decimal {$dec}");
            }
        }
    });
});
