<?php

declare(strict_types=1);

/**
 * Unit tests for BuyPointsPricing — server-authoritative, FEED-ANCHORED
 * buy-points pricing. No database, no HTTP. Every rung is priced from the
 * feed's alternate-line ladder; there is no synthetic fallback. Tests cover
 * direction math, the per-sport gate, D1 (omit no-feed rungs), D2 (omit
 * no-tie win-zone rungs), D3 (no soccer), the spread ML floor, and the
 * placement lookup (priceBoughtPointFromFeed).
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

// ── input validation / direction math (engine-independent) ──────────────────

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

TestRunner::run('signedPointDelta — spreads always add (bettor wins more cushion)', function (): void {
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

TestRunner::run('maxBoughtPoints constant', function (): void {
    TestRunner::assertEqualsFloat(2.5, BuyPointsPricing::maxBoughtPoints(), 'max = 2.5', 0.001);
});

// ── per-sport enable gate (BUY_POINTS_ENABLED_SPORTS env) ───────────────────

TestRunner::run('isSportEnabled — env-driven allowlist; soccer always off (D3)', function (): void {
    $prev = $_ENV['BUY_POINTS_ENABLED_SPORTS'] ?? null;

    unset($_ENV['BUY_POINTS_ENABLED_SPORTS']);
    TestRunner::assertFalse(BuyPointsPricing::isSportEnabled('americanfootball_nfl'), 'empty env → all locked');

    $_ENV['BUY_POINTS_ENABLED_SPORTS'] = 'americanfootball_nfl, soccer_epl';
    TestRunner::assertTrue(BuyPointsPricing::isSportEnabled('americanfootball_nfl'), 'nfl enabled');
    TestRunner::assertTrue(BuyPointsPricing::isSportEnabled('AMERICANFOOTBALL_NFL'), 'case-insensitive');
    TestRunner::assertFalse(BuyPointsPricing::isSportEnabled('basketball_nba'), 'nba not in list');
    TestRunner::assertFalse(BuyPointsPricing::isSportEnabled('soccer_epl'), 'soccer never enabled (D3) even if listed');

    if ($prev === null) {
        unset($_ENV['BUY_POINTS_ENABLED_SPORTS']);
    } else {
        $_ENV['BUY_POINTS_ENABLED_SPORTS'] = $prev;
    }
});

// ── feed-anchored ladder helpers ─────────────────────────────────────────────

/** Build a market pool from named sub-markets. */
$mkPool = static function (array $parts): array {
    $pool = [];
    foreach ($parts as $key => $outcomes) {
        $pool[] = ['key' => $key, 'outcomes' => $outcomes];
    }
    return $pool;
};

/** Expected American int for a feed decimal, via the SAME conversion the engine uses. */
$amer = static function (float $decimal): int {
    return SportsbookBetSupport::decimalToAmericanInt(SportsbookBetSupport::snapDecimalOdds($decimal));
};

// Enable the sports under test for the feed-anchored block. Restored at the end.
$prevEnabled = $_ENV['BUY_POINTS_ENABLED_SPORTS'] ?? null;
$_ENV['BUY_POINTS_ENABLED_SPORTS'] = 'americanfootball_nfl,americanfootball_ncaaf,baseball_mlb,basketball_nba,icehockey_nhl,soccer_epl';

TestRunner::run('ladderFromFeed — NFL favorite priced from feed; gap omits one rung, keeps higher', function () use ($mkPool, $amer): void {
    // Chiefs -3.5 favorite. Feed prices -3.0/-2.5/-2.0 and -1.0, but NOT -1.5.
    // All rungs stay below pick'em (line < 0) so the ML floor never binds.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Chiefs', 'point' => -3.5, 'price' => 1.91]],
        'h2h'               => [['name' => 'Chiefs', 'price' => 1.50]],
        'alternate_spreads' => [
            ['name' => 'Chiefs', 'point' => -3.0, 'price' => 1.83, 'book' => 'pinnacle'],
            ['name' => 'Chiefs', 'point' => -2.5, 'price' => 1.74, 'book' => 'pinnacle'],
            ['name' => 'Chiefs', 'point' => -2.0, 'price' => 1.66, 'book' => 'pinnacle'],
            // -1.5 deliberately absent → D1 omit (must NOT truncate -1.0).
            ['name' => 'Chiefs', 'point' => -1.0, 'price' => 1.55, 'book' => 'pinnacle'],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Chiefs', -3.5, $pool);

    TestRunner::assertEquals(4, count($ladder), '4 priced rungs (-1.5 gap omitted)');
    TestRunner::assertEqualsFloat(0.5, $ladder[0]['points'], 'rung1 points', 1e-9);
    TestRunner::assertEqualsFloat(-3.0, $ladder[0]['line'], 'rung1 line', 1e-9);
    TestRunner::assertEquals($amer(1.83), $ladder[0]['american'], 'rung1 american from feed');
    TestRunner::assertEqualsFloat(2.5, $ladder[3]['points'], 'last rung is the 2.5-pt buy');
    TestRunner::assertEqualsFloat(-1.0, $ladder[3]['line'], 'last rung line -1.0 (gap did not truncate)', 1e-9);
    TestRunner::assertEquals($amer(1.55), $ladder[3]['american'], 'last rung american from feed');
});

TestRunner::run('ladderFromFeed — MLB run line collapses the ±0.5/0 win zone to ONE moneyline rung', function () use ($mkPool, $amer): void {
    // Yankees -1.5, ML -160 (1.625). Feed prices -1.0 (+120) and +1.0 (-210),
    // plus the whole no-tie win zone (-0.5/0/+0.5). The three win-zone lines
    // all equal "just win the game" → collapse to ONE half-point rung at the
    // ML; -1.0 (harder) keeps its feed price > ML; +1.0 (push-adjusted) keeps
    // its feed price < ML. Strictly monotonic.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Yankees', 'point' => -1.5, 'price' => 1.95]],
        'h2h'               => [['name' => 'Yankees', 'price' => 1.625]], // -160
        'alternate_spreads' => [
            ['name' => 'Yankees', 'point' => -1.5, 'price' => 2.50],
            ['name' => 'Yankees', 'point' => -1.0, 'price' => 2.20], // +120
            ['name' => 'Yankees', 'point' => -0.5, 'price' => 1.65], // ignored — win zone uses ML
            ['name' => 'Yankees', 'point' =>  0.0, 'price' => 1.60],
            ['name' => 'Yankees', 'point' =>  0.5, 'price' => 1.55],
            ['name' => 'Yankees', 'point' =>  1.0, 'price' => 1.476], // -210
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('baseball_mlb', 'spreads', 'Yankees', -1.5, $pool);
    $byLine = [];
    foreach ($ladder as $r) { $byLine[number_format($r['line'], 1)] = $r; }

    $lines = array_map(static fn ($r) => $r['line'], $ladder);
    TestRunner::assertEquals([-1.0, -0.5, 1.0], $lines, 'rungs: -1.0, win-the-game(-0.5), +1.0');
    TestRunner::assertEquals($amer(2.20), $byLine['-1.0']['american'], '-1.0 from feed (harder, > ML)');
    TestRunner::assertEquals($amer(1.625), $byLine['-0.5']['american'], 'win-the-game priced at the ML, not the feed -0.5');
    TestRunner::assertEquals($amer(1.476), $byLine['1.0']['american'], '+1.0 from feed (easier, < ML)');
    TestRunner::assertFalse(in_array(0.0, $lines, true), '0 not surfaced (collapsed)');
    TestRunner::assertFalse(in_array(0.5, $lines, true), '+0.5 not surfaced (collapsed)');
    // Monotonic: payout never rises as the line gets easier.
    TestRunner::assertTrue(
        $byLine['-1.0']['decimal'] >= $byLine['-0.5']['decimal'] - 1e-9
            && $byLine['-0.5']['decimal'] >= $byLine['1.0']['decimal'] - 1e-9,
        'decimals strictly non-increasing -1.0 → -0.5 → +1.0'
    );
});

TestRunner::run('ladderFromFeed — MLB synthesizes a missing ±1 between the ML and ±1.5 (above ML, below ±1.5)', function () use ($mkPool, $amer): void {
    // Same favorite, but the feed LACKS +1.0. It must be synthesized at the
    // implied-prob midpoint of the ML (-160) and the +1.5 feed rung (-210):
    // priced ABOVE the ML (easier than just winning) and BELOW +1.5.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Yankees', 'point' => -1.5, 'price' => 1.95]],
        'h2h'               => [['name' => 'Yankees', 'price' => 1.625]], // -160 → 1.625
        'alternate_spreads' => [
            ['name' => 'Yankees', 'point' => -1.5, 'price' => 2.50],
            ['name' => 'Yankees', 'point' => -1.0, 'price' => 2.20],
            // +1.0 ABSENT → synthesized.
            ['name' => 'Yankees', 'point' =>  1.5, 'price' => 1.476], // -210
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('baseball_mlb', 'spreads', 'Yankees', -1.5, $pool);
    $byLine = [];
    foreach ($ladder as $r) { $byLine[number_format($r['line'], 1)] = $r; }

    TestRunner::assertTrue(isset($byLine['1.0']), '+1.0 synthesized despite no feed price');
    $mlDec = SportsbookBetSupport::americanToDecimalExact(-160);
    $anchorDec = SportsbookBetSupport::americanToDecimalExact(-210);
    TestRunner::assertTrue($byLine['1.0']['decimal'] < $mlDec - 1e-9, '+1 pays LESS than the ML (it is easier)');
    TestRunner::assertTrue($byLine['1.0']['decimal'] > $anchorDec + 1e-9, '+1 pays MORE than +1.5 (it is harder)');
    // win-the-game rung still present at the ML.
    TestRunner::assertEquals($amer(1.625), $byLine['-0.5']['american'], 'win-the-game at the ML');
});

TestRunner::run('ladderFromFeed — missing ML omits the whole no-tie win-zone fill (fail safe)', function () use ($mkPool): void {
    // No h2h → no anchor. The win-the-game rung and any ±1 synthesis are
    // omitted; only feed-priced |line| >= 1 rungs that don't need the floor
    // survive (here -1.0, which is below pick'em so the floor never binds).
    $pool = $mkPool([
        'spreads'           => [['name' => 'Yankees', 'point' => -1.5, 'price' => 1.95]],
        'alternate_spreads' => [
            ['name' => 'Yankees', 'point' => -1.0, 'price' => 2.20],
            ['name' => 'Yankees', 'point' => -0.5, 'price' => 1.65],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('baseball_mlb', 'spreads', 'Yankees', -1.5, $pool);
    $lines = array_map(static fn ($r) => $r['line'], $ladder);
    TestRunner::assertEquals([-1.0], $lines, 'no ML → win-the-game omitted; only feed -1.0 survives');
});

TestRunner::run('ladderFromFeed — NHL puck line surfaces ONE win-the-game rung at the ML', function () use ($mkPool, $amer): void {
    // Bruins -1.5, ML -222 (1.45). Feed has -1.0 (1.55) and the win-zone
    // -0.5/+0.5, but no +1.0 / +1.5 anchor, so +1 can't synthesize.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Bruins', 'point' => -1.5, 'price' => 1.95]],
        'h2h'               => [['name' => 'Bruins', 'price' => 1.45]], // -222
        'alternate_spreads' => [
            ['name' => 'Bruins', 'point' => -1.5, 'price' => 2.00],
            ['name' => 'Bruins', 'point' => -1.0, 'price' => 1.55],
            ['name' => 'Bruins', 'point' => -0.5, 'price' => 1.35], // ignored — win zone uses ML
            ['name' => 'Bruins', 'point' =>  0.5, 'price' => 1.22],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('icehockey_nhl', 'spreads', 'Bruins', -1.5, $pool);
    $lines = array_map(static fn ($r) => $r['line'], $ladder);
    TestRunner::assertEquals([-1.0, -0.5], $lines, '-1.0 (feed) + one win-the-game (-0.5); +0.5 collapsed, no +1');
    $win = $ladder[1];
    TestRunner::assertEquals($amer(1.45), $win['american'], 'win-the-game at the ML, not the feed -0.5 (1.35)');
});

TestRunner::run('ladderFromFeed — NBA small spread reaches the win zone (no-tie: win-the-game = ML)', function () use ($mkPool, $amer): void {
    // A near-even NBA game: Celtics -1.5, ML -130 (1.7692). Basketball never
    // ties (OT decides), so the same win-zone-as-ML collapse applies. Buying
    // points reaches -1.0 (feed), the win-the-game half-point (ML), and +1.0.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Celtics', 'point' => -1.5, 'price' => 1.95]],
        'h2h'               => [['name' => 'Celtics', 'price' => 1.7692]], // -130
        'alternate_spreads' => [
            ['name' => 'Celtics', 'point' => -1.5, 'price' => 2.40],
            ['name' => 'Celtics', 'point' => -1.0, 'price' => 2.05],
            ['name' => 'Celtics', 'point' => -0.5, 'price' => 1.80], // ignored — win zone uses ML
            ['name' => 'Celtics', 'point' =>  1.0, 'price' => 1.55],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('basketball_nba', 'spreads', 'Celtics', -1.5, $pool);
    $byLine = [];
    foreach ($ladder as $r) { $byLine[number_format($r['line'], 1)] = $r; }
    $lines = array_map(static fn ($r) => $r['line'], $ladder);
    TestRunner::assertEquals([-1.0, -0.5, 1.0], $lines, 'NBA: -1.0, win-the-game(-0.5), +1.0');
    TestRunner::assertEquals($amer(1.7692), $byLine['-0.5']['american'], 'win-the-game at the ML (no-tie applies to NBA)');
    TestRunner::assertTrue(
        $byLine['-1.0']['decimal'] >= $byLine['-0.5']['decimal'] - 1e-9
            && $byLine['-0.5']['decimal'] >= $byLine['1.0']['decimal'] - 1e-9,
        'monotonic -1.0 → -0.5 → +1.0'
    );
});

TestRunner::run('ladderFromFeed — NFL keeps real win-zone lines (tie-possible: NO ML collapse)', function () use ($mkPool, $amer): void {
    // Pro football CAN tie, so -0.5/0/+0.5 are distinct lose/push/win bets and
    // must NOT collapse to one ML rung. Patriots -1.5; the feed win-zone rungs
    // survive at their OWN feed prices (subject only to the ML floor), and no
    // synthetic win-the-game/ML rung is injected.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Patriots', 'point' => -1.5, 'price' => 1.95]],
        'h2h'               => [['name' => 'Patriots', 'price' => 1.7692]], // -130
        'alternate_spreads' => [
            ['name' => 'Patriots', 'point' => -1.0, 'price' => 1.85],
            ['name' => 'Patriots', 'point' => -0.5, 'price' => 1.74],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Patriots', -1.5, $pool);
    $byLine = [];
    foreach ($ladder as $r) { $byLine[number_format($r['line'], 1)] = $r; }
    $lines = array_map(static fn ($r) => $r['line'], $ladder);
    TestRunner::assertEquals([-1.0, -0.5], $lines, 'NFL keeps feed -1.0 and the real -0.5 line');
    TestRunner::assertEquals($amer(1.85), $byLine['-1.0']['american'], '-1.0 from feed');
    TestRunner::assertEquals($amer(1.74), $byLine['-0.5']['american'], '-0.5 from FEED, not the ML (no win-zone collapse for NFL)');
});

TestRunner::run('ladderFromFeed — NCAAF is no-tie (win-the-game = ML) but NFL is not', function () use ($mkPool, $amer): void {
    $build = static function (string $sportKey) use ($mkPool): array {
        return BuyPointsPricing::ladderFromFeed($sportKey, 'spreads', 'Tigers', -1.5, $mkPool([
            'spreads'           => [['name' => 'Tigers', 'point' => -1.5, 'price' => 1.95]],
            'h2h'               => [['name' => 'Tigers', 'price' => 1.7692]], // -130
            'alternate_spreads' => [
                ['name' => 'Tigers', 'point' => -1.5, 'price' => 2.40],
                ['name' => 'Tigers', 'point' => -1.0, 'price' => 2.05],
                ['name' => 'Tigers', 'point' => -0.5, 'price' => 1.80],
            ],
        ]));
    };
    $ncaaf = $build('americanfootball_ncaaf');
    $nfl   = $build('americanfootball_nfl');
    $ncaafByLine = [];
    foreach ($ncaaf as $r) { $ncaafByLine[number_format($r['line'], 1)] = $r; }
    $nflByLine = [];
    foreach ($nfl as $r) { $nflByLine[number_format($r['line'], 1)] = $r; }
    // College: -0.5 collapses to the ML. Pro: -0.5 stays the feed price.
    TestRunner::assertEquals($amer(1.7692), $ncaafByLine['-0.5']['american'], 'NCAAF win-the-game = ML');
    TestRunner::assertEquals($amer(1.80), $nflByLine['-0.5']['american'], 'NFL -0.5 stays the FEED price');
});

TestRunner::run('ladderFromFeed — NBA spread matches feed exactly (no ML floor below pick\'em)', function () use ($mkPool, $amer): void {
    $pool = $mkPool([
        'spreads'           => [['name' => 'Celtics', 'point' => -5.5, 'price' => 1.91]],
        'h2h'               => [['name' => 'Celtics', 'price' => 1.40]],
        'alternate_spreads' => [
            ['name' => 'Celtics', 'point' => -5.0, 'price' => 1.83],
            ['name' => 'Celtics', 'point' => -4.5, 'price' => 1.76],
            ['name' => 'Celtics', 'point' => -4.0, 'price' => 1.69],
            ['name' => 'Celtics', 'point' => -3.5, 'price' => 1.62],
            ['name' => 'Celtics', 'point' => -3.0, 'price' => 1.55],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('basketball_nba', 'spreads', 'Celtics', -5.5, $pool);
    TestRunner::assertEquals(5, count($ladder), '5 rungs, all feed-priced');
    TestRunner::assertEquals($amer(1.83), $ladder[0]['american'], 'rung1 from feed');
    TestRunner::assertEquals($amer(1.55), $ladder[4]['american'], 'rung5 from feed');
    TestRunner::assertEqualsFloat(-3.0, $ladder[4]['line'], 'rung5 line -3.0', 1e-9);
});

TestRunner::run('ladderFromFeed — totals Over priced from feed; line shrinks', function () use ($mkPool, $amer): void {
    $pool = $mkPool([
        'totals'           => [['name' => 'Over', 'point' => 220.5, 'price' => 1.91]],
        'alternate_totals' => [
            ['name' => 'Over', 'point' => 220.0, 'price' => 1.85],
            ['name' => 'Over', 'point' => 219.5, 'price' => 1.78],
            ['name' => 'Over', 'point' => 219.0, 'price' => 1.71],
            ['name' => 'Over', 'point' => 218.5, 'price' => 1.64],
            ['name' => 'Over', 'point' => 218.0, 'price' => 1.57],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('basketball_nba', 'totals', 'Over', 220.5, $pool);
    TestRunner::assertEquals(5, count($ladder), '5 total rungs');
    TestRunner::assertEqualsFloat(220.0, $ladder[0]['line'], 'over rung1 shrinks to 220.0', 1e-9);
    TestRunner::assertEqualsFloat(218.0, $ladder[4]['line'], 'over rung5 shrinks to 218.0', 1e-9);
    TestRunner::assertEquals($amer(1.85), $ladder[0]['american'], 'over rung1 from feed');
});

TestRunner::run('ladderFromFeed — totals Under priced from feed; line grows', function () use ($mkPool): void {
    $pool = $mkPool([
        'totals'           => [['name' => 'Under', 'point' => 47.5, 'price' => 1.91]],
        'alternate_totals' => [
            ['name' => 'Under', 'point' => 48.0, 'price' => 1.85],
            ['name' => 'Under', 'point' => 48.5, 'price' => 1.78],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'totals', 'Under', 47.5, $pool);
    TestRunner::assertEquals(2, count($ladder), '2 under rungs priced by feed');
    TestRunner::assertEqualsFloat(48.0, $ladder[0]['line'], 'under rung1 grows to 48.0', 1e-9);
    TestRunner::assertEqualsFloat(48.5, $ladder[1]['line'], 'under rung2 grows to 48.5', 1e-9);
});

TestRunner::run('ladderFromFeed — ML floor omits a bettor-favorable rung priced better than the moneyline', function () use ($mkPool): void {
    // Jets +2.5 underdog (ML +150 = 2.5 decimal). Buying points only adds
    // cushion (line >= 0), so each rung must not pay MORE than the ML.
    //   +3.0 @ 2.20 (≤ 2.5)  → kept
    //   +3.5 @ 2.60 (> 2.5)  → OMITTED (better than ML)
    //   +4.0 @ 2.10 (≤ 2.5)  → kept
    $pool = $mkPool([
        'spreads'           => [['name' => 'Jets', 'point' => 2.5, 'price' => 1.91]],
        'h2h'               => [['name' => 'Jets', 'price' => 2.50]],
        'alternate_spreads' => [
            ['name' => 'Jets', 'point' => 3.0, 'price' => 2.20],
            ['name' => 'Jets', 'point' => 3.5, 'price' => 2.60],
            ['name' => 'Jets', 'point' => 4.0, 'price' => 2.10],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Jets', 2.5, $pool);
    $lines = array_map(static fn ($r) => $r['line'], $ladder);
    TestRunner::assertEquals([3.0, 4.0], $lines, '+3.5 omitted (> ML); +3.0 and +4.0 kept');
});

TestRunner::run('ladderFromFeed — missing moneyline fails safe for bettor-favorable rungs', function () use ($mkPool): void {
    // No h2h in the pool → the ML floor cannot be verified, so line >= 0
    // rungs are omitted rather than risk paying better than the ML.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Jets', 'point' => 2.5, 'price' => 1.91]],
        'alternate_spreads' => [
            ['name' => 'Jets', 'point' => 3.0, 'price' => 2.20],
            ['name' => 'Jets', 'point' => 4.0, 'price' => 2.10],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Jets', 2.5, $pool);
    TestRunner::assertEquals(0, count($ladder), 'no ML → all line>=0 rungs omitted (fail safe)');
});

TestRunner::run('ladderFromFeed — duplicate feed rows keep the LOWEST payout (house-safe)', function () use ($mkPool, $amer): void {
    // A pre-dedupe doc has the same (side, point) twice at different prices.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Chiefs', 'point' => -3.5, 'price' => 1.91]],
        'h2h'               => [['name' => 'Chiefs', 'price' => 1.50]],
        'alternate_spreads' => [
            ['name' => 'Chiefs', 'point' => -3.0, 'price' => 1.95, 'book' => 'generousbook'],
            ['name' => 'Chiefs', 'point' => -3.0, 'price' => 1.83, 'book' => 'pinnacle'],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Chiefs', -3.5, $pool);
    TestRunner::assertEquals(1, count($ladder), 'one rung');
    TestRunner::assertEquals($amer(1.83), $ladder[0]['american'], 'kept the lower-payout 1.83, not 1.95');
});

TestRunner::run('ladderFromFeed — no alt market → empty (no synthesis)', function () use ($mkPool): void {
    $pool = $mkPool([
        'spreads' => [['name' => 'Chiefs', 'point' => -3.5, 'price' => 1.91]],
        'h2h'     => [['name' => 'Chiefs', 'price' => 1.50]],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Chiefs', -3.5, $pool);
    TestRunner::assertEquals(0, count($ladder), 'no alternate_spreads → []');
});

TestRunner::run('ladderFromFeed — soccer is gated off entirely (D3)', function () use ($mkPool): void {
    // soccer_epl is in the enabled env for this block, but three-way sports
    // are NEVER eligible — handicaps stay in Alt Lines, not buy-points.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Arsenal', 'point' => -0.5, 'price' => 2.10]],
        'h2h'               => [['name' => 'Arsenal', 'price' => 2.41]],
        'alternate_spreads' => [
            ['name' => 'Arsenal', 'point' => 0.5, 'price' => 1.40],
            ['name' => 'Arsenal', 'point' => 1.5, 'price' => 1.12],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('soccer_epl', 'spreads', 'Arsenal', -0.5, $pool);
    TestRunner::assertEquals(0, count($ladder), 'soccer → no buy-points ladder (D3)');
});

TestRunner::run('ladderFromFeed — disabled sport (not in env) → empty', function () use ($mkPool): void {
    $pool = $mkPool([
        'spreads'           => [['name' => 'Team', 'point' => -3.5, 'price' => 1.91]],
        'h2h'               => [['name' => 'Team', 'price' => 1.50]],
        'alternate_spreads' => [['name' => 'Team', 'point' => -3.0, 'price' => 1.83]],
    ]);
    // tennis is not in the enabled list.
    $ladder = BuyPointsPricing::ladderFromFeed('tennis_atp', 'spreads', 'Team', -3.5, $pool);
    TestRunner::assertEquals(0, count($ladder), 'sport not enabled → []');
});

// ── placement: priceBoughtPointFromFeed (single rung or null) ────────────────

TestRunner::run('priceBoughtPointFromFeed — returns the feed rung for a priced buy', function () use ($mkPool, $amer): void {
    $pool = $mkPool([
        'spreads'           => [['name' => 'Chiefs', 'point' => -3.5, 'price' => 1.91]],
        'h2h'               => [['name' => 'Chiefs', 'price' => 1.50]],
        'alternate_spreads' => [['name' => 'Chiefs', 'point' => -3.0, 'price' => 1.83]],
    ]);
    $rung = BuyPointsPricing::priceBoughtPointFromFeed('americanfootball_nfl', 'spreads', 'Chiefs', -3.5, 0.5, $pool);
    TestRunner::assertTrue($rung !== null, 'rung found for 0.5-pt buy');
    TestRunner::assertEqualsFloat(-3.0, $rung['line'], 'rung line -3.0', 1e-9);
    TestRunner::assertEquals($amer(1.83), $rung['american'], 'rung american from feed');
});

TestRunner::run('priceBoughtPointFromFeed — null when the feed never priced the rung (→ BUY_POINTS_NO_FEED_PRICE)', function () use ($mkPool): void {
    // Feed has -3.0 but not -1.5 (the 2.0-pt buy target).
    $pool = $mkPool([
        'spreads'           => [['name' => 'Chiefs', 'point' => -3.5, 'price' => 1.91]],
        'h2h'               => [['name' => 'Chiefs', 'price' => 1.50]],
        'alternate_spreads' => [['name' => 'Chiefs', 'point' => -3.0, 'price' => 1.83]],
    ]);
    $rung = BuyPointsPricing::priceBoughtPointFromFeed('americanfootball_nfl', 'spreads', 'Chiefs', -3.5, 2.0, $pool);
    TestRunner::assertTrue($rung === null, 'no feed price → null (placement rejects)');
});

TestRunner::run('priceBoughtPointFromFeed — null for an ML-floor-omitted (over-good) rung', function () use ($mkPool): void {
    // +3.5 @ 2.60 is better than the +150 ML → omitted → placement rejects.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Jets', 'point' => 2.5, 'price' => 1.91]],
        'h2h'               => [['name' => 'Jets', 'price' => 2.50]],
        'alternate_spreads' => [
            ['name' => 'Jets', 'point' => 3.0, 'price' => 2.20],
            ['name' => 'Jets', 'point' => 3.5, 'price' => 2.60],
        ],
    ]);
    $kept = BuyPointsPricing::priceBoughtPointFromFeed('americanfootball_nfl', 'spreads', 'Jets', 2.5, 0.5, $pool);
    $omitted = BuyPointsPricing::priceBoughtPointFromFeed('americanfootball_nfl', 'spreads', 'Jets', 2.5, 1.0, $pool);
    TestRunner::assertTrue($kept !== null, '+3.0 (≤ ML) priced');
    TestRunner::assertTrue($omitted === null, '+3.5 (> ML) rejected at placement');
});

// Restore the prior env so later suites in the shared process are unaffected.
if ($prevEnabled === null) {
    unset($_ENV['BUY_POINTS_ENABLED_SPORTS']);
} else {
    $_ENV['BUY_POINTS_ENABLED_SPORTS'] = $prevEnabled;
}
