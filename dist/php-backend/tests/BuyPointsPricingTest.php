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

require_once __DIR__ . '/../src/BuyPointsPricing.php';

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
