<?php

declare(strict_types=1);

/**
 * Minimum-win floor (MIN_WIN_FLOOR, default $25).
 *
 * RULE (Nicky 2026-07-20): every ticket must be able to WIN at least $25 —
 * "the only way you can bet $25 is if it's +100 or higher". Any ticket whose
 * win prices under the floor (every sub-+100 price, standard -110 juice
 * included) has its stake AUTO-BUMPED UP to the smallest whole dollar whose
 * booked win clears the floor ($25 @ -130 books as $33). The stake moves UP,
 * never the win down — the exact mirror of the max-win cap (MaxWinCapTest),
 * which truncates the WIN and never touches the stake. A floor unreachable
 * inside the player's max bet REJECTS (MIN_WIN_UNREACHABLE, in
 * BetsController) rather than silently booking a sub-floor win.
 *
 * The back-solve deliberately does NOT use win/stake at the player's own
 * stake (whole-dollar payout rounding makes that ratio noisy enough to bump
 * $1 short): it derives the ticket's exact per-dollar win rate at
 * MIN_WIN_REFERENCE_STAKE through the same canonical pricer. The adversarial
 * regression below locks that in.
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
require_once __DIR__ . '/../src/RoundRobinService.php';

// American → decimal, exact (mirrors the placement convention).
function mwfDec(int $american): float
{
    return $american > 0 ? 1.0 + $american / 100.0 : 1.0 + 100.0 / abs($american);
}

/** @return array{odds: float, oddsAmerican: int} */
function mwfLeg(int $american): array
{
    return ['odds' => mwfDec($american), 'oddsAmerican' => $american];
}

function mwfWithEnv(string $key, ?string $value, callable $fn): void
{
    $origGetenv = getenv($key);
    $origEnv = $_ENV[$key] ?? null;
    if ($value === null) {
        putenv($key);
        unset($_ENV[$key]);
    } else {
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
    }
    try {
        $fn();
    } finally {
        if ($origGetenv === false) { putenv($key); } else { putenv($key . '=' . $origGetenv); }
        if ($origEnv === null) { unset($_ENV[$key]); } else { $_ENV[$key] = $origEnv; }
    }
}

// ── Floor configuration ─────────────────────────────────────────────────────

TestRunner::run('minTicketWinFloor — default $25, env override, 0 disables, never above the cap', function (): void {
    mwfWithEnv('MIN_WIN_FLOOR', null, function (): void {
        TestRunner::assertEqualsFloat(25.0, SportsbookBetSupport::minTicketWinFloor(), 'unset env → default $25');
    });
    mwfWithEnv('MIN_WIN_FLOOR', '40', function (): void {
        TestRunner::assertEqualsFloat(40.0, SportsbookBetSupport::minTicketWinFloor(), 'env 40 → $40');
    });
    mwfWithEnv('MIN_WIN_FLOOR', '0', function (): void {
        TestRunner::assertEqualsFloat(0.0, SportsbookBetSupport::minTicketWinFloor(), 'env 0 → disabled');
    });
    mwfWithEnv('MIN_WIN_FLOOR', '-5', function (): void {
        TestRunner::assertEqualsFloat(0.0, SportsbookBetSupport::minTicketWinFloor(), 'negative → disabled');
    });
    // A floor above the max-win cap would reject every ticket (the cap
    // truncates every win below the floor) — clamp to the cap instead.
    mwfWithEnv('MIN_WIN_FLOOR', '6000', function (): void {
        mwfWithEnv('MAX_PARLAY_PAYOUT', '5000', function (): void {
            TestRunner::assertEqualsFloat(5000.0, SportsbookBetSupport::minTicketWinFloor(), 'floor min\'d with cap');
        });
    });
});

// ── Per-dollar win rate (reference-stake derivation) ────────────────────────

TestRunner::run('winRatePerUnitStake — exact odds-implied rate per ticket type', function (): void {
    // Straight -130: rate = 100/130.
    $rate = SportsbookBetSupport::winRatePerUnitStake('straight', [mwfLeg(-130)], []);
    TestRunner::assertEqualsFloat(100.0 / 130.0, $rate, '-130 straight rate', 0.00001);
    // Straight +100: even money, rate exactly 1.
    TestRunner::assertEqualsFloat(1.0, SportsbookBetSupport::winRatePerUnitStake('straight', [mwfLeg(100)], []), '+100 rate 1.0', 0.00001);
    // Parlay two -110s: 1.90909^2 = 3.64463 → American-locked to +264 → 3.64.
    $parlayRate = SportsbookBetSupport::winRatePerUnitStake('parlay', [mwfLeg(-110), mwfLeg(-110)], []);
    TestRunner::assertEqualsFloat(2.64, $parlayRate, 'two -110 parlay rate (post American lock)', 0.001);
    // Teaser: table multiplier IS the decimal — 2-leg at 1.8 → rate 0.8.
    $teaserRule = ['payoutProfile' => ['multipliers' => ['2' => 1.8]]];
    $teaserRate = SportsbookBetSupport::winRatePerUnitStake('teaser', [mwfLeg(-110), mwfLeg(-110)], $teaserRule);
    TestRunner::assertEqualsFloat(0.8, $teaserRate, '2-leg teaser at 1.8 → 0.8 per unit', 0.00001);
    // Reverse two -110s: win = unit × (2×combined − 2) per UNIT stake.
    $revRate = SportsbookBetSupport::winRatePerUnitStake('reverse', [mwfLeg(-110), mwfLeg(-110)], []);
    TestRunner::assertEqualsFloat(2.0 * 3.6446280991735534 - 2.0, $revRate, 'reverse rate per unit', 0.001);
});

// ── The back-solve: smallest whole dollar that clears the floor ─────────────

TestRunner::run('bumpedUnitStakeForMinWin — screenshot cases and boundaries', function (): void {
    $floor = 25.0;
    // Mets ML -130 (the screenshot): 25/(100/130) = 32.5 exactly → $33.
    TestRunner::assertEqualsFloat(33.0, SportsbookBetSupport::bumpedUnitStakeForMinWin(100.0 / 130.0, $floor), '-130 → $33');
    // Standard -110 juice: 27.4999… → 27.5 after the 4dp dust round → $28.
    TestRunner::assertEqualsFloat(28.0, SportsbookBetSupport::bumpedUnitStakeForMinWin(100.0 / 110.0, $floor), '-110 → $28');
    // -200: exactly 50, integer boundary must NOT overshoot to 51.
    TestRunner::assertEqualsFloat(50.0, SportsbookBetSupport::bumpedUnitStakeForMinWin(0.5, $floor), '-200 → $50 exact');
    // -125: 31.25 → $32.
    TestRunner::assertEqualsFloat(32.0, SportsbookBetSupport::bumpedUnitStakeForMinWin(0.8, $floor), '-125 → $32');
    // +100: rate 1.0 → $25 (the rule's own boundary: +100 or better needs no bump).
    TestRunner::assertEqualsFloat(25.0, SportsbookBetSupport::bumpedUnitStakeForMinWin(1.0, $floor), '+100 → $25');
    // Degenerate rates refuse rather than divide by zero.
    TestRunner::assertEqualsFloat(0.0, SportsbookBetSupport::bumpedUnitStakeForMinWin(0.0, $floor), 'rate 0 → unpriceable');
    TestRunner::assertEqualsFloat(0.0, SportsbookBetSupport::bumpedUnitStakeForMinWin(-1.0, $floor), 'negative rate → unpriceable');
    TestRunner::assertEqualsFloat(0.0, SportsbookBetSupport::bumpedUnitStakeForMinWin(1.0, 0.0), 'floor disabled → 0');
});

TestRunner::run('booked win at the bumped stake clears the floor — whole-dollar round included', function (): void {
    $floor = 25.0;
    // Sweep of favorite prices, incl. the screenshot and the everyday juice.
    foreach ([-101, -105, -110, -115, -120, -125, -130, -150, -175, -200, -250, -300, -400, -500, -750, -1000, -2500, -5000, -10000] as $american) {
        $leg = mwfLeg($american);
        $rate = SportsbookBetSupport::winRatePerUnitStake('straight', [$leg], []);
        $stake = SportsbookBetSupport::bumpedUnitStakeForMinWin($rate, $floor);
        $payout = SportsbookBetSupport::calculatePotentialPayout('straight', $stake, [$leg], []);
        $win = $payout - $stake;
        TestRunner::assertTrue($win >= $floor, $american . ': $' . $stake . ' books win $' . $win . ' >= $25');
        // Sanity on magnitude: never more than $1 above the exact back-solve
        // (whole-dollar ceil is the only overshoot allowed).
        TestRunner::assertTrue($stake <= ($floor / $rate) + 1.0, $american . ': stake $' . $stake . ' is the ceil, not an overshoot');
    }
});

TestRunner::run('ADVERSARIAL regression — rate from the player-stake rounded win under-bumps; reference rate must not', function (): void {
    // Decimal 1.42 (≈ -238): $25 books payout round(35.5) = 36 → win $11, and
    // 25×25/11 back-solves to $57 — but round(57 × 0.42) = $24, UNDER the
    // floor. The reference-stake rate (exact 0.42) gives ceil(59.52) = $60 →
    // round(60 × 0.42) = $25.20 → books $25. This is exactly why
    // winRatePerUnitStake exists.
    $leg = ['odds' => 1.42];
    $rate = SportsbookBetSupport::winRatePerUnitStake('straight', [$leg], []);
    TestRunner::assertEqualsFloat(0.42, $rate, 'reference rate is the exact decimal', 0.000001);
    $stake = SportsbookBetSupport::bumpedUnitStakeForMinWin($rate, 25.0);
    TestRunner::assertEqualsFloat(60.0, $stake, 'bump lands on $60');
    $win = SportsbookBetSupport::calculatePotentialPayout('straight', $stake, [$leg], []) - $stake;
    TestRunner::assertTrue($win >= 25.0, 'booked win $' . $win . ' clears the floor');
});

// ── Combined modes ──────────────────────────────────────────────────────────

TestRunner::run('parlay of heavy favorites — combined decimal < 2.0 bumps like a straight', function (): void {
    // Two -250s: 1.4 × 1.4 = 1.96 → locked to -104 → 1.96154 → rate 0.96154.
    $legs = [mwfLeg(-250), mwfLeg(-250)];
    $rate = SportsbookBetSupport::winRatePerUnitStake('parlay', $legs, []);
    TestRunner::assertEqualsFloat(1.9615384615384617 - 1.0, $rate, 'locked combined rate', 0.0001);
    $stake = SportsbookBetSupport::bumpedUnitStakeForMinWin($rate, 25.0);
    TestRunner::assertEqualsFloat(26.0, $stake, 'two -250 parlay bumps $25 → $26');
    $win = SportsbookBetSupport::calculatePotentialPayout('parlay', $stake, $legs, []) - $stake;
    TestRunner::assertTrue($win >= 25.0, 'booked parlay win $' . $win . ' clears the floor');
});

TestRunner::run('teaser — 2-leg 1.8 multiplier at $25 wins $20, bumps to $32', function (): void {
    $rule = ['payoutProfile' => ['multipliers' => ['2' => 1.8]]];
    $legs = [mwfLeg(-110), mwfLeg(-110)];
    $rate = SportsbookBetSupport::winRatePerUnitStake('teaser', $legs, $rule);
    $stake = SportsbookBetSupport::bumpedUnitStakeForMinWin($rate, 25.0);
    TestRunner::assertEqualsFloat(32.0, $stake, '25/0.8 = 31.25 → $32');
    $win = SportsbookBetSupport::calculatePotentialPayout('teaser', $stake, $legs, $rule) - $stake;
    TestRunner::assertTrue($win >= 25.0, 'booked teaser win $' . $win . ' clears the floor');
});

TestRunner::run('reverse — floor applies to the ticket max win, unit stake bumps, risk is 2× the unit', function (): void {
    // Two -400s: combined 1.5625, reverse rate/unit = 2×1.5625 − 2 = 1.125 —
    // above 1, so $25 books a $28 max win: NO bump expected. Use two -900s:
    // combined 1.2346, rate = 0.4691 → 25 unit wins ~11.7 → bump to $54.
    $legs = [mwfLeg(-900), mwfLeg(-900)];
    $rate = SportsbookBetSupport::winRatePerUnitStake('reverse', $legs, []);
    $unit = SportsbookBetSupport::bumpedUnitStakeForMinWin($rate, 25.0);
    TestRunner::assertTrue($unit > 25.0, 'unit stake bumped above $25 (got $' . $unit . ')');
    $payout = SportsbookBetSupport::calculatePotentialPayout('reverse', $unit, $legs, []);
    $ticketRisk = SportsbookBetSupport::ticketRiskAmount('reverse', $unit);
    TestRunner::assertEqualsFloat(2.0 * $unit, $ticketRisk, 'reverse ticket risk is 2× the unit');
    TestRunner::assertTrue(($payout - $ticketRisk) >= 25.0, 'ticket max win $' . ($payout - $ticketRisk) . ' clears the floor');
});

TestRunner::run('if-bet — parlay-shaped pricing (no American lock), same bump discipline', function (): void {
    // Two -250s: raw product 1.96, NO lock for if_bet → rate 0.96 →
    // ceil(26.0416) = $27 (one dollar above the locked parlay's $26 — the
    // two types legitimately price apart).
    $legs = [mwfLeg(-250), mwfLeg(-250)];
    $rate = SportsbookBetSupport::winRatePerUnitStake('if_bet', $legs, []);
    TestRunner::assertEqualsFloat(0.96, $rate, 'if_bet rate is the raw product − 1', 0.0001);
    $stake = SportsbookBetSupport::bumpedUnitStakeForMinWin($rate, 25.0);
    TestRunner::assertEqualsFloat(27.0, $stake, 'two -250 if-bet bumps $25 → $27');
    $win = SportsbookBetSupport::calculatePotentialPayout('if_bet', $stake, $legs, []) - $stake;
    TestRunner::assertTrue($win >= 25.0, 'booked if-bet win $' . $win . ' clears the floor');
});

TestRunner::run('win-mode pin under the floor — pin dropped, bump prices at raw odds (controller rule)', function (): void {
    // Player types To-Win $20 on -130: placeBet nulls a sub-floor pin BEFORE
    // pricing, so the priced win is raw odds — under the floor — and the
    // bump takes over exactly like a typed Risk. Simulate the two pricings.
    $leg = mwfLeg(-130);
    $pinned = SportsbookBetSupport::pricedTicket('straight', 26.0, [$leg], [], 0.0, 0.0, 20.0);
    TestRunner::assertEqualsFloat(46.0, $pinned['potentialPayout'], 'without the rule, a $20 pin would book win $20 (payout $46)');
    $unpinned = SportsbookBetSupport::pricedTicket('straight', 26.0, [$leg], [], 0.0, 0.0, null);
    $rawWin = $unpinned['potentialPayout'] - $unpinned['totalRisk'];
    TestRunner::assertTrue($rawWin < 25.0, 'raw win at $26 is under the floor → bump path engages');
    $rate = SportsbookBetSupport::winRatePerUnitStake('straight', [$leg], []);
    $stake = SportsbookBetSupport::bumpedUnitStakeForMinWin($rate, 25.0);
    TestRunner::assertEqualsFloat(33.0, $stake, 'floor overrides the pin: books $33, win ≥ $25');
});

TestRunner::run('cap interaction sanity — a min-win bump can never trip the $5,000 max-win cap', function (): void {
    mwfWithEnv('MAX_PARLAY_PAYOUT', '5000', function (): void {
        // The bump targets a win of ~the floor ($25-26) — three orders of
        // magnitude under the cap. Verify on the screenshot case end-to-end.
        $leg = mwfLeg(-130);
        $rate = SportsbookBetSupport::winRatePerUnitStake('straight', [$leg], []);
        $stake = SportsbookBetSupport::bumpedUnitStakeForMinWin($rate, 25.0);
        $win = SportsbookBetSupport::calculatePotentialPayout('straight', $stake, [$leg], []) - $stake;
        $capped = SportsbookBetSupport::truncateWinToCap($win);
        TestRunner::assertFalse($capped['capped'], 'bumped win $' . $win . ' nowhere near the cap');
        TestRunner::assertEqualsFloat($win, $capped['win'], 'win passes through untouched');
    });
});

TestRunner::run('open parlay — floor enforced at create against REAL starting legs; monotonicity covers every add-leg', function (): void {
    // 1-leg start at -130 (conservative-by-agreement case): the parlay pricer
    // on a single leg is that leg's American-locked decimal → rate 100/130 →
    // create bumps $25 → $33, exactly like the straight.
    $startLeg = [mwfLeg(-130)];
    $rate = SportsbookBetSupport::winRatePerUnitStake('parlay', $startLeg, []);
    TestRunner::assertEqualsFloat(100.0 / 130.0, $rate, '1-leg OP rate = the leg rate', 0.0001);
    $stake = SportsbookBetSupport::bumpedUnitStakeForMinWin($rate, 25.0);
    TestRunner::assertEqualsFloat(33.0, $stake, 'OP create bumps $25 → $33');
    $createWin = SportsbookBetSupport::calculatePotentialPayout('parlay', $stake, $startLeg, []) - $stake;
    TestRunner::assertTrue($createWin >= 25.0, 'create-time win $' . $createWin . ' clears the floor');
    // MONOTONICITY (why addOpenParlayLeg never re-checks): every added leg
    // multiplies the combined by a decimal > 1 — even adding the WORST
    // offered juice (-110) only grows the win at the committed stake.
    $afterAdd = SportsbookBetSupport::calculatePotentialPayout('parlay', $stake, [mwfLeg(-130), mwfLeg(-110)], []) - $stake;
    TestRunner::assertTrue($afterAdd >= $createWin, 'add-leg win $' . $afterAdd . ' >= create win $' . $createWin);
    TestRunner::assertTrue($afterAdd >= 25.0, 'floor still cleared after the add');
});

TestRunner::run('round robin child — cross-game rate is rawDecimal − 1; bumped stake clears the floor per child', function (): void {
    // Worst child: two -300s → 1.3333^2 = 1.77778 (2dp product math, no lock
    // on cross-game children) → rate 0.77778 → bump $25 → $33.
    $comboA = [
        ['odds' => mwfDec(-300), 'oddsAmerican' => -300, 'matchId' => 'm1'],
        ['odds' => mwfDec(-300), 'oddsAmerican' => -300, 'matchId' => 'm2'],
    ];
    $pricedAt25 = SportsbookBetSupport::priceRoundRobinChild($comboA, 25.0, 0.0, []);
    TestRunner::assertTrue($pricedAt25['winAmount'] < 25.0, 'worst child at $25 wins under the floor');
    $rate = $pricedAt25['rawDecimal'] - 1.0;
    $stake = SportsbookBetSupport::bumpedUnitStakeForMinWin($rate, 25.0);
    TestRunner::assertEqualsFloat(33.0, $stake, '25/0.77778 = 32.14 → $33');
    $repriced = SportsbookBetSupport::priceRoundRobinChild($comboA, $stake, 0.0, []);
    TestRunner::assertTrue($repriced['winAmount'] >= 25.0, 'child win $' . $repriced['winAmount'] . ' clears the floor at $' . $stake);
});

TestRunner::summary();
