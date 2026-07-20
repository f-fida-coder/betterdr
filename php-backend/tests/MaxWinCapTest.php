<?php

declare(strict_types=1);

/**
 * House absolute win ceiling (MAX_PARLAY_PAYOUT).
 *
 * RULE (Nicky 2026-07-20 — REVERSES the 2026-07-07/09 reject-and-suggest
 * design): the cap TRUNCATES the ticket's WIN and NEVER touches the stake.
 * Min bet is a hard floor the cap cannot undercut — a player can always put
 * at least the minimum on any offered selection; at extreme odds the payout
 * simply tops out at the cap ($25 @ +100000 risks $25 and pays $5,000, not
 * $25,000). Every capped ticket carries payoutCapAmount so settlement's
 * recompute path re-applies the same ceiling (see PayoutCapSnapshotTest).
 * Manual/admin bets never pass through the capped placement paths.
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

// ── Legacy arithmetic retained ──────────────────────────────────────────────
// allowedStakeForWinCap is no longer used by any placement path (the cap no
// longer limits stakes) but the function and its floor arithmetic are kept —
// the whole-dollar floor contract is documented history and the JS mirror
// comment in the frontend referenced it for years. Lock the math so a future
// caller inherits the audited behavior.
TestRunner::run('allowed stake arithmetic (legacy, retained) — floor(cap / (decimal - 1))', function (): void {
    TestRunner::assertEqualsFloat(100.0, SportsbookBetSupport::allowedStakeForWinCap(5000.0, mwcDec(5000)), '+5000 → $100');
    TestRunner::assertEqualsFloat(50.0, SportsbookBetSupport::allowedStakeForWinCap(5000.0, mwcDec(10000)), '+10000 → $50');
    TestRunner::assertEqualsFloat(500.0, SportsbookBetSupport::allowedStakeForWinCap(5000.0, mwcDec(1000)), '+1000 → $500');
    TestRunner::assertEqualsFloat(2192.0, SportsbookBetSupport::allowedStakeForWinCap(5000.0, 3.28), '+228 → $2,192 (floored)');
});

// ── The new rule: win truncation, stake untouched ───────────────────────────

TestRunner::run('truncateWinToCap — Jon Rahm case: $25 @ +100000 pays $5,000, stake stays $25', function (): void {
    mwcWithCap('5000', function (): void {
        $stake = 25.0;                      // the account minimum — the floor the cap must never undercut
        $dec = mwcDec(100000);              // 1001.0
        $rawWin = $stake * ($dec - 1.0);    // $25,000 odds-implied
        TestRunner::assertEqualsFloat(25000.0, $rawWin, 'odds-implied win is $25,000');
        $res = SportsbookBetSupport::truncateWinToCap($rawWin);
        TestRunner::assertTrue($res['capped'], 'cap binds');
        TestRunner::assertEqualsFloat(5000.0, $res['win'], 'win truncated to exactly $5,000');
        // The stake is not an input to the truncation at all — structurally
        // impossible for the cap to alter it. potentialPayout = risk + cappedWin.
        TestRunner::assertEqualsFloat(5025.0, $stake + $res['win'], 'payout = $25 stake + $5,000 capped win');
    });
});

TestRunner::run('truncateWinToCap — above-min stake at extreme odds still caps at $5,000 (never $50,000)', function (): void {
    mwcWithCap('5000', function (): void {
        $res = SportsbookBetSupport::truncateWinToCap(50.0 * (mwcDec(100000) - 1.0));
        TestRunner::assertTrue($res['capped'], '$50 @ +100000 caps');
        TestRunner::assertEqualsFloat(5000.0, $res['win'], 'win is $5,000, not $50,000');
    });
});

TestRunner::run('truncateWinToCap — non-extreme odds pass through untouched (zero regression)', function (): void {
    mwcWithCap('5000', function (): void {
        // −110 favorite, $100 → $90.909… win: unchanged to the float.
        $win110 = 100.0 * (mwcDec(-110) - 1.0);
        $r1 = SportsbookBetSupport::truncateWinToCap($win110);
        TestRunner::assertTrue(!$r1['capped'], '−110 never capped at normal stakes');
        TestRunner::assertEqualsFloat($win110, $r1['win'], 'win byte-identical');
        // +150, $200 → $300 win: unchanged.
        $r2 = SportsbookBetSupport::truncateWinToCap(300.0);
        TestRunner::assertTrue(!$r2['capped'] && $r2['win'] === 300.0, '+150 $200 unchanged');
        // July-11 boundary case: $50 @ +10000 wins EXACTLY $5,000 — at-cap
        // passes untruncated (inclusive), exactly as the old rule booked it.
        $r3 = SportsbookBetSupport::truncateWinToCap(50.0 * (mwcDec(10000) - 1.0));
        TestRunner::assertTrue(!$r3['capped'], '$50 @ +10000 == cap → untruncated (boundary unchanged)');
        TestRunner::assertEqualsFloat(5000.0, $r3['win'], 'boundary win exactly $5,000');
        // Degenerate zero win.
        $r4 = SportsbookBetSupport::truncateWinToCap(0.0);
        TestRunner::assertTrue(!$r4['capped'] && $r4['win'] === 0.0, 'zero win untouched');
    });
});

TestRunner::run('cap is configurable and <=0 disables it entirely', function (): void {
    mwcWithCap('2000', function (): void {
        $r = SportsbookBetSupport::truncateWinToCap(2500.0);
        TestRunner::assertTrue($r['capped'], 'lowered cap ($2,000) truncates a $2,500 win');
        TestRunner::assertEqualsFloat(2000.0, $r['win'], 'truncated to the configured cap');
    });
    mwcWithCap('0', function (): void {
        $r = SportsbookBetSupport::truncateWinToCap(1000000.0);
        TestRunner::assertTrue(!$r['capped'], 'cap 0 = disabled');
        TestRunner::assertEqualsFloat(1000000.0, $r['win'], 'any win passes through');
    });
});

// ── Min-bet floor is now unconditional ──────────────────────────────────────
// The old cap-overrides-min carve-out (PO 2026-07-09: a $20 stake under a
// $25 min was ALLOWED when the cap forced it) is REVERSED: placement's
// min-bet check has no cap escape hatch anymore — BetsController rejects any
// below-min stake with BELOW_MIN_BET, and the cap never produces one because
// it never touches the stake. This test pins the reversal at the helper
// level: nothing in the cap path can yield a stake at all.
TestRunner::run('min-bet floor reversal — the cap exposes no stake to override the min with', function (): void {
    mwcWithCap('5000', function (): void {
        $res = SportsbookBetSupport::truncateWinToCap(25.0 * (mwcDec(25000) - 1.0));
        // Old rule: +25000 forced a $20 max stake under the $25 min.
        // New rule: the $25 min-bet stake stands; only the win is capped.
        TestRunner::assertTrue($res['capped'], '+25000 at the $25 min caps the win');
        TestRunner::assertEqualsFloat(5000.0, $res['win'], 'win capped at $5,000 (raw $6,250)');
        TestRunner::assertTrue(!array_key_exists('allowedStake', $res), 'no stake suggestion exists in the new contract');
    });
});

// ── Round Robin: EACH child individually truncated ──────────────────────────
// Mirrors placeRoundRobin exactly: priceRoundRobinChild is the single child
// pricing source — the by-4 longshot child tops out at the cap (win
// truncation + per-child payoutCapAmount snapshot) while the by-2 children
// price normally. No group-level reject, no stake reduction.
TestRunner::run('round robin — longshot child truncates per-child; small children untouched', function (): void {
    mwcWithCap('5000', function (): void {
        $legs = [
            ['matchId' => 'm1', 'odds' => 3.5],
            ['matchId' => 'm2', 'odds' => 3.5],
            ['matchId' => 'm3', 'odds' => 3.5],
            ['matchId' => 'm4', 'odds' => 3.5],
        ];
        $stake = 300.0;
        $sgpOff = ['enabled' => false, 'haircutPct' => 0.0, 'propHaircutPct' => 0.0, 'maxLegs' => 6, 'maxPayoutMultiplier' => 3.0];
        // maxBetLimit 0 disables the 3× clamp so the house cap is isolated.
        foreach (RoundRobinService::generateCombinations($legs, 2) as $combo) {
            $child = SportsbookBetSupport::priceRoundRobinChild($combo, $stake, 0.0, $sgpOff);
            // 3.5 × 3.5 = 12.25 → win $3,375 — under the cap, untouched.
            TestRunner::assertEqualsFloat(3375.0, $child['winAmount'], 'by-2 child win uncapped');
            TestRunner::assertTrue($child['payoutCapAmount'] === null, 'by-2 child carries no snapshot');
        }
        foreach (RoundRobinService::generateCombinations($legs, 4) as $combo) {
            $child = SportsbookBetSupport::priceRoundRobinChild($combo, $stake, 0.0, $sgpOff);
            // 3.5^4 = 150.0625 → raw win $44,718.75 → truncated to $5,000.
            TestRunner::assertEqualsFloat(5000.0, $child['winAmount'], 'by-4 child win truncated to the cap');
            TestRunner::assertEqualsFloat(5300.0, $child['potentialPayout'], 'payout = $300 stake + $5,000 capped win');
            TestRunner::assertEqualsFloat(5000.0, (float) $child['payoutCapAmount'], 'per-child settlement snapshot written');
        }
    });
});

// ── Cap composition: house cap min()s with the 3×maxBet clamp ───────────────
TestRunner::run('cap composition — tighter of 3×maxBet and house cap wins, snapshot = the binding one', function (): void {
    mwcWithCap('5000', function (): void {
        $legs = [
            ['matchId' => 'm1', 'odds' => 3.5],
            ['matchId' => 'm2', 'odds' => 3.5],
            ['matchId' => 'm3', 'odds' => 3.5],
            ['matchId' => 'm4', 'odds' => 3.5],
        ];
        $sgpOff = ['enabled' => false, 'haircutPct' => 0.0, 'propHaircutPct' => 0.0, 'maxLegs' => 6, 'maxPayoutMultiplier' => 3.0];
        // maxBet $1,000 → 3× clamp $3,000 binds BELOW the $5k house cap: the
        // child truncates to $3,000 and the snapshot stays the tighter value.
        foreach (RoundRobinService::generateCombinations($legs, 4) as $combo) {
            $child = SportsbookBetSupport::priceRoundRobinChild($combo, 300.0, 1000.0, $sgpOff);
            TestRunner::assertEqualsFloat(3000.0, $child['winAmount'], '3× clamp binds first');
            TestRunner::assertEqualsFloat(3000.0, (float) $child['payoutCapAmount'], 'snapshot = tighter ($3,000), not min-bumped up to $5,000');
        }
        // maxBet $50,000 → 3× clamp $150,000 is looser: the house cap binds.
        foreach (RoundRobinService::generateCombinations($legs, 4) as $combo) {
            $child = SportsbookBetSupport::priceRoundRobinChild($combo, 300.0, 50000.0, $sgpOff);
            TestRunner::assertEqualsFloat(5000.0, $child['winAmount'], 'house cap binds when 3× is looser');
            TestRunner::assertEqualsFloat(5000.0, (float) $child['payoutCapAmount'], 'snapshot = house cap');
        }
    });
});
