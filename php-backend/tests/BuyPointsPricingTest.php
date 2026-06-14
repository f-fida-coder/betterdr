<?php

declare(strict_types=1);

/**
 * Unit tests for BuyPointsPricing — server-authoritative buy-points pricing.
 * No database, no HTTP. Pricing math + direction math + invalid-input rejection.
 */

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
        /** @param array<string, mixed> $extra */
        public function __construct(string $message, int $code = 0, private array $extra = [])
        {
            parent::__construct($message, $code);
        }
    }
}

// SportsbookBetSupport supplies the odds-acceptance gate + decimal/American
// conversions the placement path uses. oddsAcceptable/resolveOddsAcceptance
// read Env, so a stub keeps this file DB- and config-free. This file sorts
// first among the Env-defining suites in the shared run.php process, so the
// stub MUST mirror the real Env::get (read $_ENV, then getenv, then default)
// — other suites (OddsLadderDedup, ListedPitcherVoid) drive config via
// putenv/$_ENV and would break against a default-only stub that won the
// class_exists race.
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

require_once __DIR__ . '/../src/BuyPointsPricing.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';

TestRunner::run('isAllowedMarket — spreads & totals only', function (): void {
    TestRunner::assertTrue(BuyPointsPricing::isAllowedMarket('spreads'), 'spreads allowed');
    TestRunner::assertTrue(BuyPointsPricing::isAllowedMarket('totals'), 'totals allowed');
    TestRunner::assertTrue(BuyPointsPricing::isAllowedMarket('SPREADS'), 'case-insensitive');
    TestRunner::assertFalse(BuyPointsPricing::isAllowedMarket('h2h'), 'moneyline rejected');
    TestRunner::assertFalse(BuyPointsPricing::isAllowedMarket('player_total_passing_yards'), 'props rejected');
});

TestRunner::run('halfStepsFromBoughtPoints — happy path', function (): void {
    TestRunner::assertEquals(0, BuyPointsPricing::halfStepsFromBoughtPoints(0.0), '0 → 0 steps');
    TestRunner::assertEquals(1, BuyPointsPricing::halfStepsFromBoughtPoints(0.5), '0.5 → 1 step');
    TestRunner::assertEquals(2, BuyPointsPricing::halfStepsFromBoughtPoints(1.0), '1.0 → 2 steps');
    TestRunner::assertEquals(5, BuyPointsPricing::halfStepsFromBoughtPoints(2.5), '2.5 → 5 steps');
});

TestRunner::run('halfStepsFromBoughtPoints — rejects out-of-range', function (): void {
    TestRunner::assertThrows(
        fn() => BuyPointsPricing::halfStepsFromBoughtPoints(-0.5),
        ApiException::class,
        'negative rejected'
    );
    TestRunner::assertThrows(
        fn() => BuyPointsPricing::halfStepsFromBoughtPoints(3.0),
        ApiException::class,
        'over max rejected'
    );
});

TestRunner::run('halfStepsFromBoughtPoints — rejects non-half-point increments', function (): void {
    TestRunner::assertThrows(
        fn() => BuyPointsPricing::halfStepsFromBoughtPoints(0.3),
        ApiException::class,
        '0.3 not on grid'
    );
    TestRunner::assertThrows(
        fn() => BuyPointsPricing::halfStepsFromBoughtPoints(1.25),
        ApiException::class,
        '1.25 not on grid'
    );
});

TestRunner::run('halfStepsFromBoughtPoints — floating drift tolerated', function (): void {
    // PHP floats: 0.1 + 0.2 + 0.2 = 0.5000000000000001
    $drift = 0.1 + 0.2 + 0.2;
    TestRunner::assertEquals(1, BuyPointsPricing::halfStepsFromBoughtPoints($drift), '0.5 + drift → 1 step');
});

TestRunner::run('expectedAmericanOdds — flat -10c ladder', function (): void {
    // -110 → -120 → -130 → -140 → -150 → -160 for 1..5 half-point steps
    TestRunner::assertEquals(-110, BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', -110, 0), 'no buy = no change');
    TestRunner::assertEquals(-120, BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', -110, 1), '1 half-pt = -120');
    TestRunner::assertEquals(-130, BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', -110, 2), '2 half-pts = -130');
    TestRunner::assertEquals(-160, BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', -110, 5), '5 half-pts = -160');
});

TestRunner::run('expectedAmericanOdds — totals math identical to spreads', function (): void {
    // Direction is applied to the LINE, not the price. So a -110 total
    // bought by 1 half-point lands at -120 regardless of over/under.
    TestRunner::assertEquals(-120, BuyPointsPricing::expectedAmericanOdds('basketball_nba', 'totals', -110, 1), 'totals -110 → -120');
});

TestRunner::run('expectedAmericanOdds — crosses -110/+110 interior, snaps to -110', function (): void {
    // Base +105, buy 1 half-pt → +95 lands in the no-go zone, snap to -110.
    TestRunner::assertEquals(-110, BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', 105, 1), '+105 → -110 (interior snap)');
    // Base +120 → +110: NOT in interior, returned as-is.
    TestRunner::assertEquals(110, BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', 120, 1), '+120 → +110');
});

TestRunner::run('expectedAmericanOdds — rejects invalid base odds', function (): void {
    TestRunner::assertThrows(
        fn() => BuyPointsPricing::expectedAmericanOdds('nfl', 'spreads', 0, 1),
        ApiException::class,
        'zero base american rejected'
    );
});

TestRunner::run('expectedAmericanOdds — rejects non-allowed markets', function (): void {
    TestRunner::assertThrows(
        fn() => BuyPointsPricing::expectedAmericanOdds('nfl', 'h2h', -110, 1),
        ApiException::class,
        'h2h rejected'
    );
});

TestRunner::run('signedPointDelta — spreads always add (bettor wins more cushion)', function (): void {
    // Spread -3.5 + 0.5 = -3 (better for favorite bettor)
    // Spread +3.5 + 0.5 = +4 (better for underdog bettor)
    TestRunner::assertEquals(0.5, BuyPointsPricing::signedPointDelta('spreads', 'Chiefs', 0.5), 'spreads: +delta');
    TestRunner::assertEquals(1.5, BuyPointsPricing::signedPointDelta('spreads', 'Eagles', 1.5), 'spreads: +delta');
});

TestRunner::run('signedPointDelta — totals direction depends on side', function (): void {
    TestRunner::assertEquals(-0.5, BuyPointsPricing::signedPointDelta('totals', 'Over 47.5', 0.5), 'over: -delta (smaller total easier)');
    TestRunner::assertEquals(-1.0, BuyPointsPricing::signedPointDelta('totals', 'Over', 1.0), 'over: -delta');
    TestRunner::assertEquals(0.5, BuyPointsPricing::signedPointDelta('totals', 'Under 47.5', 0.5), 'under: +delta (larger total easier)');
    TestRunner::assertEquals(1.0, BuyPointsPricing::signedPointDelta('totals', 'Under', 1.0), 'under: +delta');
});

TestRunner::run('signedPointDelta — rejects non-allowed markets', function (): void {
    TestRunner::assertThrows(
        fn() => BuyPointsPricing::signedPointDelta('h2h', 'Chiefs', 0.5),
        ApiException::class,
        'h2h rejected'
    );
});

TestRunner::run('end-to-end pricing: NFL -3.5 @ -110 buy half-pt → -3 @ -120', function (): void {
    $baseAmerican = -110;
    $boughtPoints = 0.5;
    $halfSteps = BuyPointsPricing::halfStepsFromBoughtPoints($boughtPoints);
    $expected = BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', $baseAmerican, $halfSteps);
    $delta = BuyPointsPricing::signedPointDelta('spreads', 'Chiefs', $boughtPoints);
    $adjustedLine = -3.5 + $delta;
    TestRunner::assertEquals(-120, $expected, 'price → -120');
    TestRunner::assertEqualsFloat(-3.0, $adjustedLine, 'line → -3', 0.001);
});

TestRunner::run('end-to-end pricing: NBA total 47.5 Over @ -110, buy 1 pt → 46.5 @ -130', function (): void {
    $baseAmerican = -110;
    $boughtPoints = 1.0;
    $halfSteps = BuyPointsPricing::halfStepsFromBoughtPoints($boughtPoints);
    $expected = BuyPointsPricing::expectedAmericanOdds('basketball_nba', 'totals', $baseAmerican, $halfSteps);
    $delta = BuyPointsPricing::signedPointDelta('totals', 'Over', $boughtPoints);
    $adjustedLine = 47.5 + $delta;
    TestRunner::assertEquals(-130, $expected, 'price → -130');
    TestRunner::assertEqualsFloat(46.5, $adjustedLine, 'over: line → 46.5', 0.001);
});

TestRunner::run('end-to-end pricing: NBA total 47.5 Under @ -110, buy 1 pt → 48.5 @ -130', function (): void {
    $delta = BuyPointsPricing::signedPointDelta('totals', 'Under', 1.0);
    TestRunner::assertEqualsFloat(48.5, 47.5 + $delta, 'under: line → 48.5', 0.001);
});

TestRunner::run('maxBoughtPoints constant', function (): void {
    TestRunner::assertEqualsFloat(2.5, BuyPointsPricing::maxBoughtPoints(), 'max = 2.5', 0.001);
});

// ── buildLadder — display ladder for one selection ───────────────────────────

TestRunner::run('buildLadder — NFL spread -3.5 @ -110 (favorite)', function (): void {
    // 5 rungs, +0.5 line per step, -10c price per step.
    $ladder = BuyPointsPricing::buildLadder('americanfootball_nfl', 'spreads', 'Chiefs', -110, -3.5);
    TestRunner::assertEquals(5, count($ladder), '5 rungs');
    // Rung 1: 0.5 pt → line -3.0 @ -120
    TestRunner::assertEqualsFloat(0.5, $ladder[0]['points'], 'rung1 points', 0.001);
    TestRunner::assertEqualsFloat(-3.0, $ladder[0]['line'], 'rung1 line', 0.001);
    TestRunner::assertEquals(-120, $ladder[0]['american'], 'rung1 american');
    // Rung 5: 2.5 pt → line -1.0 @ -160
    TestRunner::assertEqualsFloat(2.5, $ladder[4]['points'], 'rung5 points', 0.001);
    TestRunner::assertEqualsFloat(-1.0, $ladder[4]['line'], 'rung5 line', 0.001);
    TestRunner::assertEquals(-160, $ladder[4]['american'], 'rung5 american');
});

TestRunner::run('buildLadder — NBA total Over 47.5 @ -110 (line shrinks)', function (): void {
    // Over wants a SMALLER total — line moves down by the bought points.
    $ladder = BuyPointsPricing::buildLadder('basketball_nba', 'totals', 'Over', -110, 47.5);
    TestRunner::assertEquals(5, count($ladder), '5 rungs');
    TestRunner::assertEqualsFloat(47.0, $ladder[0]['line'], 'over rung1 line shrinks', 0.001);
    TestRunner::assertEqualsFloat(45.0, $ladder[4]['line'], 'over rung5 line shrinks', 0.001);
    TestRunner::assertEquals(-160, $ladder[4]['american'], 'over rung5 american');
});

TestRunner::run('buildLadder — Under grows the total', function (): void {
    $ladder = BuyPointsPricing::buildLadder('basketball_nba', 'totals', 'Under', -110, 47.5);
    TestRunner::assertEqualsFloat(48.0, $ladder[0]['line'], 'under rung1 line grows', 0.001);
    TestRunner::assertEqualsFloat(50.0, $ladder[4]['line'], 'under rung5 line grows', 0.001);
});

TestRunner::run('buildLadder — ineligible market / unusable base → empty', function (): void {
    TestRunner::assertEquals(0, count(BuyPointsPricing::buildLadder('nfl', 'h2h', 'Chiefs', -110, 0.0)), 'h2h → []');
    TestRunner::assertEquals(0, count(BuyPointsPricing::buildLadder('nfl', 'spreads', 'Chiefs', 0, -3.5)), 'base american 0 → []');
});

// ── Placement: server recompute is authoritative; tampered odds rejected ─────
// These compose the exact pieces the placement path runs in
// BetsController::validateSelection: reprice via BuyPointsPricing, then gate
// the client's submitted American odds through SportsbookBetSupport::
// oddsAcceptable against the SERVER's repriced value (not the base price).

TestRunner::run('placement — server reprices off CURRENT base, ignores client odds', function (): void {
    // NFL spread -3.5 @ -110, buy 0.5 pt. Server-authoritative price is -120.
    $halfSteps = BuyPointsPricing::halfStepsFromBoughtPoints(0.5);
    $repriced = BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', -110, $halfSteps);
    TestRunner::assertEquals(-120, $repriced, 'server repriced value = -120');

    // Honest client submits the matching -120 → auto-places (no prompt).
    TestRunner::assertTrue(
        SportsbookBetSupport::oddsAcceptable(-120, $repriced, 'band', 10),
        'honest -120 vs repriced -120 → place'
    );
});

TestRunner::run('placement — tampered client odds (-100 on a -120 buy) are rejected', function (): void {
    // Attacker tries to bank a -100 price on a bought line the server prices
    // at -120. The gate compares client(-100) vs official(-120): a 20c adverse
    // move → NOT acceptable → ODDS_CHANGED. The user can never place at -100.
    $repriced = BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', -110, 1);
    TestRunner::assertEquals(-120, $repriced, 'repriced -120');
    TestRunner::assertFalse(
        SportsbookBetSupport::oddsAcceptable(-100, $repriced, 'band', 10),
        'tampered -100 vs -120 → reject (prompt with server price)'
    );
});

TestRunner::run('placement — base line move triggers ODDS_CHANGED then settles in ONE retry (no loop)', function (): void {
    // First placement: client carries the old repriced -120 (base was -110).
    $oldRepriced = BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', -110, 1);
    TestRunner::assertEquals(-120, $oldRepriced, 'old repriced -120');

    // Base drifted -110 → -130 before the bet landed. Server reprices off the
    // NEW base: -130 → -140 for the same half-point buy.
    $newRepriced = BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', -130, 1);
    TestRunner::assertEquals(-140, $newRepriced, 'new repriced off moved base = -140');

    // Client's stale -120 vs the new official -140 = 20c adverse → prompt.
    TestRunner::assertFalse(
        SportsbookBetSupport::oddsAcceptable($oldRepriced, $newRepriced, 'band', 10),
        'stale -120 vs new -140 → ODDS_CHANGED'
    );

    // Client patches its leg to -140 and taps PLACE again. Base is now stable
    // at -130, so the server reprices to -140 once more and the patched odds
    // match → auto-place. Second tap settles; the confirm loop cannot recur.
    $retryRepriced = BuyPointsPricing::expectedAmericanOdds('americanfootball_nfl', 'spreads', -130, 1);
    TestRunner::assertEquals($newRepriced, $retryRepriced, 'retry reprice is stable at -140');
    TestRunner::assertTrue(
        SportsbookBetSupport::oddsAcceptable($newRepriced, $retryRepriced, 'band', 10),
        'patched -140 vs stable -140 → place (no loop)'
    );
});
