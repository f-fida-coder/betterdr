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

TestRunner::run('halfStepsFromBoughtPoints — happy path (signed: + buys, - sells)', function (): void {
    TestRunner::assertEquals(0, BuyPointsPricing::halfStepsFromBoughtPoints(0.0), '0 → 0 steps');
    TestRunner::assertEquals(1, BuyPointsPricing::halfStepsFromBoughtPoints(0.5), '0.5 → 1 step');
    TestRunner::assertEquals(2, BuyPointsPricing::halfStepsFromBoughtPoints(1.0), '1.0 → 2 steps');
    TestRunner::assertEquals(6, BuyPointsPricing::halfStepsFromBoughtPoints(3.0), '3.0 → 6 steps');
    // Sells: negative is now a valid direction.
    TestRunner::assertEquals(-1, BuyPointsPricing::halfStepsFromBoughtPoints(-0.5), '-0.5 → -1 step (sell)');
    TestRunner::assertEquals(-6, BuyPointsPricing::halfStepsFromBoughtPoints(-3.0), '-3.0 → -6 steps (sell)');
});

TestRunner::run('halfStepsFromBoughtPoints — rejects out-of-range / off-grid (either sign)', function (): void {
    TestRunner::assertThrows(
        fn() => BuyPointsPricing::halfStepsFromBoughtPoints(3.5),
        ApiException::class,
        'over max (buy) rejected'
    );
    TestRunner::assertThrows(
        fn() => BuyPointsPricing::halfStepsFromBoughtPoints(-3.5),
        ApiException::class,
        'over max (sell) rejected'
    );
    TestRunner::assertThrows(
        fn() => BuyPointsPricing::halfStepsFromBoughtPoints(0.3),
        ApiException::class,
        'off-grid rejected'
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
    TestRunner::assertEqualsFloat(3.0, BuyPointsPricing::maxBoughtPoints(), 'max = 3.0', 0.001);
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
// tennis_atp is the feed-anchored VEHICLE for the generic feed-mechanic tests
// (gap-omit, dedup, ML floor, matches-feed, no-synth): it is 2-way, tie-possible,
// not a run/puck line and not flat-cents — i.e. the pure feed path — now that
// football and basketball SPREADS are priced by the flat-cents model. Selection
// names in those tests are arbitrary; only same-name matching matters.
$prevEnabled = $_ENV['BUY_POINTS_ENABLED_SPORTS'] ?? null;
$_ENV['BUY_POINTS_ENABLED_SPORTS'] = 'americanfootball_nfl,americanfootball_ncaaf,baseball_mlb,basketball_nba,icehockey_nhl,soccer_epl,tennis_atp';

TestRunner::run('ladderFromFeed — feed sport favorite priced from feed; gap omits one rung, keeps higher', function () use ($mkPool, $amer): void {
    // tennis (feed vehicle) -3.5 favorite. Feed prices -3.0/-2.5/-2.0 and -1.0,
    // but NOT -1.5. All rungs stay below pick'em (line < 0) so the ML floor never
    // binds. (Football spreads are now flat-cents, so this exercises the feed path
    // on a still-feed-anchored sport.)
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
    $ladder = BuyPointsPricing::ladderFromFeed('tennis_atp', 'spreads', 'Chiefs', -3.5, $pool);

    TestRunner::assertEquals(4, count($ladder), '4 priced rungs (-1.5 gap omitted)');
    TestRunner::assertEqualsFloat(0.5, $ladder[0]['points'], 'rung1 points', 1e-9);
    TestRunner::assertEqualsFloat(-3.0, $ladder[0]['line'], 'rung1 line', 1e-9);
    TestRunner::assertEquals($amer(1.83), $ladder[0]['american'], 'rung1 american from feed');
    TestRunner::assertEqualsFloat(2.5, $ladder[3]['points'], 'last rung is the 2.5-pt buy');
    TestRunner::assertEqualsFloat(-1.0, $ladder[3]['line'], 'last rung line -1.0 (gap did not truncate)', 1e-9);
    TestRunner::assertEquals($amer(1.55), $ladder[3]['american'], 'last rung american from feed');
});

TestRunner::run('ladderFromFeed — MLB run line OMITS the entire ±0.5/0 win zone (no moneyline alias rung)', function () use ($mkPool, $amer): void {
    // Yankees -1.5, ML -160 (1.625). Feed prices -1.0 (+120) and +1.0 (-210),
    // plus the whole no-tie win zone (-0.5/0/+0.5). On a run line ±0.5 IS the
    // moneyline — books don't list it as a buyable run line — so NO win-the-game
    // half-point rung is synthesized. Only the real run lines survive: -1.0
    // (harder, feed price > ML) and +1.0 (push-adjusted, feed price < ML).
    $pool = $mkPool([
        'spreads'           => [['name' => 'Yankees', 'point' => -1.5, 'price' => 1.95]],
        'h2h'               => [['name' => 'Yankees', 'price' => 1.625]], // -160
        'alternate_spreads' => [
            ['name' => 'Yankees', 'point' => -1.5, 'price' => 2.50],
            ['name' => 'Yankees', 'point' => -1.0, 'price' => 2.20], // +120
            ['name' => 'Yankees', 'point' => -0.5, 'price' => 1.65], // omitted — ±0.5 = moneyline
            ['name' => 'Yankees', 'point' =>  0.0, 'price' => 1.60],
            ['name' => 'Yankees', 'point' =>  0.5, 'price' => 1.55],
            ['name' => 'Yankees', 'point' =>  1.0, 'price' => 1.476], // -210
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('baseball_mlb', 'spreads', 'Yankees', -1.5, $pool);
    $byLine = [];
    foreach ($ladder as $r) { $byLine[number_format($r['line'], 1)] = $r; }

    $lines = array_map(static fn ($r) => $r['line'], $ladder);
    TestRunner::assertEquals([-1.0, 1.0], $lines, 'rungs: -1.0, +1.0 (no ±0.5/0 win-zone rung)');
    TestRunner::assertEquals($amer(2.20), $byLine['-1.0']['american'], '-1.0 from feed (harder, > ML)');
    TestRunner::assertEquals($amer(1.476), $byLine['1.0']['american'], '+1.0 from feed (easier, < ML)');
    TestRunner::assertFalse(in_array(-0.5, $lines, true), '-0.5 not surfaced (= moneyline on a run line)');
    TestRunner::assertFalse(in_array(0.0, $lines, true), '0 not surfaced');
    TestRunner::assertFalse(in_array(0.5, $lines, true), '+0.5 not surfaced');
    // Monotonic: payout never rises as the line gets easier.
    TestRunner::assertTrue(
        $byLine['-1.0']['decimal'] >= $byLine['1.0']['decimal'] - 1e-9,
        'decimals non-increasing -1.0 → +1.0'
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
    // No win-the-game rung on a run line: ±0.5 = moneyline, not offered.
    TestRunner::assertFalse(isset($byLine['-0.5']), 'no ±0.5 win-the-game rung on a run line');
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

TestRunner::run('ladderFromFeed — NHL puck line OMITS the ±0.5 win zone (no moneyline alias rung)', function () use ($mkPool, $amer): void {
    // Bruins -1.5, ML -222 (1.45). Feed has -1.0 (1.55) and the win-zone
    // -0.5/+0.5, but no +1.0 / +1.5 anchor. On a puck line ±0.5 = moneyline, so
    // it's never synthesized; only the real -1.0 puck line survives.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Bruins', 'point' => -1.5, 'price' => 1.95]],
        'h2h'               => [['name' => 'Bruins', 'price' => 1.45]], // -222
        'alternate_spreads' => [
            ['name' => 'Bruins', 'point' => -1.5, 'price' => 2.00],
            ['name' => 'Bruins', 'point' => -1.0, 'price' => 1.55],
            ['name' => 'Bruins', 'point' => -0.5, 'price' => 1.35], // omitted — ±0.5 = moneyline
            ['name' => 'Bruins', 'point' =>  0.5, 'price' => 1.22],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('icehockey_nhl', 'spreads', 'Bruins', -1.5, $pool);
    $lines = array_map(static fn ($r) => $r['line'], $ladder);
    TestRunner::assertEquals([-1.0], $lines, 'only the feed -1.0 puck line; no ±0.5 win-zone rung, no +1 (no anchor)');
    TestRunner::assertEquals($amer(1.55), $ladder[0]['american'], '-1.0 from feed');
});

TestRunner::run('ladderFromFeed — NCAAF (flat, no-tie) small spread: flat rungs + win-the-game = ML', function () use ($mkPool, $amer): void {
    // Celtics -1.5, ML -130 (1.7692). NCAAF spreads are flat-cents (key-number
    // aware) AND no-tie, so: the -1.0 rung is flat-priced off the base (-105 →
    // +10c = -115), and the win-the-game half-point (-0.5) still collapses to the
    // ML via fillNoTieWinZone. Capped at 2.0 points, so +1.0 (2.5 pts away) is
    // never reached. Feed alts are overridden by the flat model.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Celtics', 'point' => -1.5, 'price' => 1.95]], // -105
        'h2h'               => [['name' => 'Celtics', 'price' => 1.7692]], // -130
        'alternate_spreads' => [
            ['name' => 'Celtics', 'point' => -1.5, 'price' => 2.40], // ignored (flat)
            ['name' => 'Celtics', 'point' => -1.0, 'price' => 2.05], // ignored (flat)
            ['name' => 'Celtics', 'point' => -0.5, 'price' => 1.80], // ignored — win zone = ML
            ['name' => 'Celtics', 'point' =>  1.0, 'price' => 1.55],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_ncaaf', 'spreads', 'Celtics', -1.5, $pool);
    $byLine = [];
    foreach ($ladder as $r) { $byLine[number_format($r['line'], 1)] = $r; }
    $lines = array_map(static fn ($r) => $r['line'], $ladder);
    TestRunner::assertEquals([-1.0, -0.5], $lines, 'flat -1.0 + win-the-game(-0.5); +1.0 beyond the 2-pt cap');
    TestRunner::assertEquals(-115, $byLine['-1.0']['american'], '-1.0 flat off base (-105 +10c), not feed 2.05');
    TestRunner::assertEquals($amer(1.7692), $byLine['-0.5']['american'], 'win-the-game at the ML (no-tie)');
    TestRunner::assertTrue(
        $byLine['-1.0']['decimal'] >= $byLine['-0.5']['decimal'] - 1e-9,
        'monotonic -1.0 → -0.5'
    );
});

TestRunner::run('ladderFromFeed — run/puck-line sports drop ±0.5; continuous-spread sports keep it', function () use ($mkPool, $amer): void {
    // SAME near-pickem pool through four no-tie sports. Baseball & hockey are
    // run/puck-line sports: ±0.5 = moneyline, so the win-the-game half-point is
    // never offered. Basketball & college football have continuous spreads that
    // genuinely sit at ±0.5, so the win-the-game rung (priced at the ML) stays.
    $build = static function (string $sportKey) use ($mkPool): array {
        $ladder = BuyPointsPricing::ladderFromFeed($sportKey, 'spreads', 'Home', -1.5, $mkPool([
            'spreads'           => [['name' => 'Home', 'point' => -1.5, 'price' => 1.95]],
            'h2h'               => [['name' => 'Home', 'price' => 1.625]], // -160
            'alternate_spreads' => [
                ['name' => 'Home', 'point' => -1.5, 'price' => 2.40],
                ['name' => 'Home', 'point' => -1.0, 'price' => 2.05],
                ['name' => 'Home', 'point' => -0.5, 'price' => 1.80],
            ],
        ]));
        return array_map(static fn ($r) => $r['line'], $ladder);
    };
    TestRunner::assertEquals([-1.0], $build('baseball_mlb'), 'MLB run line: no ±0.5');
    TestRunner::assertEquals([-1.0], $build('icehockey_nhl'), 'NHL puck line: no ±0.5');
    TestRunner::assertEquals([-1.0, -0.5], $build('basketball_nba'), 'NBA keeps ±0.5 (win-the-game = ML)');
    TestRunner::assertEquals([-1.0, -0.5], $build('americanfootball_ncaaf'), 'NCAAF keeps ±0.5 (win-the-game = ML)');
});

TestRunner::run('ladderFromFeed — NFL (flat, tie-possible) keeps distinct win-zone lines, no ML collapse', function () use ($mkPool, $amer): void {
    // Pro football CAN tie, so -0.5/0/+0.5 are distinct lose/push/win bets and
    // must NOT collapse to one ML rung. NFL spreads are flat-cents: each rung is
    // priced off the base (-105) at +10c/half (no key number in this window), and
    // bettor-favorable lines (>= 0) are ML-floored but still surfaced here.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Patriots', 'point' => -1.5, 'price' => 1.95]], // -105
        'h2h'               => [['name' => 'Patriots', 'price' => 1.7692]], // -130
        'alternate_spreads' => [
            ['name' => 'Patriots', 'point' => -1.0, 'price' => 1.85], // ignored (flat)
            ['name' => 'Patriots', 'point' => -0.5, 'price' => 1.74], // ignored (flat)
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Patriots', -1.5, $pool);
    $byLine = [];
    foreach ($ladder as $r) { $byLine[number_format($r['line'], 1)] = $r; }
    $lines = array_map(static fn ($r) => $r['line'], $ladder);
    TestRunner::assertEquals([-1.0, -0.5, 0.0, 0.5], $lines, 'NFL keeps distinct win-zone lines (no collapse)');
    TestRunner::assertEquals(-115, $byLine['-1.0']['american'], '-1.0 flat off base (-105 +10c)');
    TestRunner::assertEquals(-125, $byLine['-0.5']['american'], '-0.5 flat off base (-105 +20c), not the ML');
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
    // College: -0.5 collapses to the ML (no-tie). Pro NFL: -0.5 is flat-priced
    // off the base (-105 +20c = -125) — distinct from the ML, no collapse.
    TestRunner::assertEquals($amer(1.7692), $ncaafByLine['-0.5']['american'], 'NCAAF win-the-game = ML');
    TestRunner::assertEquals(-125, $nflByLine['-0.5']['american'], 'NFL -0.5 flat off base (no ML collapse)');
});

TestRunner::run('ladderFromFeed — feed sport spread matches feed exactly (no ML floor below pick\'em)', function () use ($mkPool, $amer): void {
    // tennis (feed vehicle): every below-pick'em rung comes straight from the feed.
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
    $ladder = BuyPointsPricing::ladderFromFeed('tennis_atp', 'spreads', 'Celtics', -5.5, $pool);
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
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'totals', 'Over', 220.5, $pool);
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
    $ladder = BuyPointsPricing::ladderFromFeed('tennis_atp', 'spreads', 'Jets', 2.5, $pool);
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
    $ladder = BuyPointsPricing::ladderFromFeed('tennis_atp', 'spreads', 'Jets', 2.5, $pool);
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
    $ladder = BuyPointsPricing::ladderFromFeed('tennis_atp', 'spreads', 'Chiefs', -3.5, $pool);
    TestRunner::assertEquals(1, count($ladder), 'one rung');
    TestRunner::assertEquals($amer(1.83), $ladder[0]['american'], 'kept the lower-payout 1.83, not 1.95');
});

TestRunner::run('ladderFromFeed — feed sport: no alt market → empty (no synthesis)', function () use ($mkPool): void {
    // A pure feed-anchored sport (tennis) with no alt ladder → nothing. (Football
    // spreads are flat-cents and DO build from the base price — see the NFL flat
    // tests — so this "never guess" rule is now exercised on tennis.)
    $pool = $mkPool([
        'spreads' => [['name' => 'Chiefs', 'point' => -3.5, 'price' => 1.91]],
        'h2h'     => [['name' => 'Chiefs', 'price' => 1.50]],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('tennis_atp', 'spreads', 'Chiefs', -3.5, $pool);
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
    // cricket is not in the enabled list.
    $ladder = BuyPointsPricing::ladderFromFeed('cricket_test', 'spreads', 'Team', -3.5, $pool);
    TestRunner::assertEquals(0, count($ladder), 'sport not enabled → []');
});

// ── synthetic ladder (no-feed-alt-lines fallback, basketball only) ───────────

TestRunner::run('ladderFromFeed — basketball spread with NO feed alts synthesizes a house-safe ladder', function () use ($mkPool): void {
    // NBA Celtics -5.5 at -110 (1.909), and the feed ships NO alternate_spreads.
    // Basketball must synthesize a ladder from the base line price; every rung
    // must pay strictly LESS than the base line and move in the buy direction.
    $pool = $mkPool([
        'spreads' => [['name' => 'Celtics', 'point' => -5.5, 'price' => 1.909]],
        'h2h'     => [['name' => 'Celtics', 'price' => 1.45]],
        // no alternate_spreads
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('basketball_nba', 'spreads', 'Celtics', -5.5, $pool);
    TestRunner::assertTrue(count($ladder) > 0, 'synthesized a non-empty ladder');
    TestRunner::assertTrue(count($ladder) <= 6, 'no more than MAX_HALF_STEPS rungs');

    $base = SportsbookBetSupport::americanToDecimalExact(-110);
    $prev = $base;
    foreach ($ladder as $i => $rung) {
        // Buy direction: spreads always move toward 0 (+points).
        TestRunner::assertEqualsFloat(($i + 1) * 0.5, $rung['points'], "rung $i points", 1e-9);
        TestRunner::assertEqualsFloat(-5.5 + ($i + 1) * 0.5, $rung['line'], "rung $i line moves +", 1e-9);
        // House-safe: strictly worsening payout, never above the base line.
        TestRunner::assertTrue($rung['decimal'] < $base - 1e-9, "rung $i pays less than base line");
        TestRunner::assertTrue($rung['decimal'] < $prev - 1e-9, "rung $i pays less than previous rung");
        $prev = $rung['decimal'];
    }
});

TestRunner::run('ladderFromFeed — basketball total Over with NO feed alts synthesizes; line shrinks, payout worsens', function () use ($mkPool): void {
    $pool = $mkPool([
        'totals' => [['name' => 'Over', 'point' => 220.5, 'price' => 1.909]],
        // no alternate_totals
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('basketball_nba', 'totals', 'Over', 220.5, $pool);
    TestRunner::assertTrue(count($ladder) > 0, 'synthesized total rungs');
    $base = SportsbookBetSupport::americanToDecimalExact(-110);
    $prev = $base;
    foreach ($ladder as $i => $rung) {
        // Over buys DOWN: line shrinks by points.
        TestRunner::assertEqualsFloat(220.5 - ($i + 1) * 0.5, $rung['line'], "over rung $i line shrinks", 1e-9);
        TestRunner::assertTrue($rung['decimal'] < $prev - 1e-9, "over rung $i worsens");
        $prev = $rung['decimal'];
    }
});

TestRunner::run('ladderFromFeed — basketball flat-cents OVERRIDES feed alts (ignores feed price)', function () use ($mkPool): void {
    // Basketball is flat-cents: even when the feed ships an alt ladder, the
    // dropdown uses clean +10c/half steps off the BASE price, not the feed's
    // alt prices. Celtics -5.5 at -110 → -5 -120, -4.5 -130, -4 -140, -3.5 -150.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Celtics', 'point' => -5.5, 'price' => 1.9090909]], // -110
        'h2h'               => [['name' => 'Celtics', 'price' => 1.40]],
        'alternate_spreads' => [['name' => 'Celtics', 'point' => -5.0, 'price' => 1.83]],        // ignored
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('basketball_nba', 'spreads', 'Celtics', -5.5, $pool);
    TestRunner::assertEquals(4, count($ladder), '4 flat rungs (cap 2.0 pts), feed alt ignored');
    TestRunner::assertEqualsFloat(-5.0, $ladder[0]['line'], '0.5 -> -5.0 line', 1e-9);
    TestRunner::assertEquals(-120, $ladder[0]['american'], '-5.0 priced flat -120, not feed 1.83');
    TestRunner::assertEquals(-150, $ladder[3]['american'], '2.0 -> -150');
});

TestRunner::run('ladderFromFeed — feed-only sports with NO feed alts stay empty (no synthesis)', function () use ($mkPool): void {
    // The "never guess a price" rule still holds for every feed-anchored, non-flat
    // sport. (Basketball synthesizes; football spreads build flat off the base —
    // both covered elsewhere — so neither belongs in this list.)
    $pool = $mkPool([
        'spreads' => [['name' => 'Chiefs', 'point' => -3.5, 'price' => 1.909]],
        'h2h'     => [['name' => 'Chiefs', 'price' => 1.50]],
    ]);
    foreach (['baseball_mlb', 'icehockey_nhl', 'tennis_atp'] as $sport) {
        $ladder = BuyPointsPricing::ladderFromFeed($sport, 'spreads', 'Chiefs', -3.5, $pool);
        TestRunner::assertEquals(0, count($ladder), "$sport: no feed alts → no synthesis");
    }
});

TestRunner::run('ladderFromFeed — synth respects the per-sport enable gate (WNBA off → empty)', function () use ($mkPool): void {
    // basketball_wnba is NOT in the enabled env for this block, so even though
    // it is synth-eligible, the gate blocks it (display == placed == locked).
    $pool = $mkPool([
        'spreads' => [['name' => 'Aces', 'point' => -5.5, 'price' => 1.909]],
        'h2h'     => [['name' => 'Aces', 'price' => 1.45]],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('basketball_wnba', 'spreads', 'Aces', -5.5, $pool);
    TestRunner::assertEquals(0, count($ladder), 'WNBA not enabled → no ladder even with synthesis');
});

TestRunner::run('ladderFromFeed — synth needs the base line price (missing → empty, fail safe)', function () use ($mkPool): void {
    // No main spreads outcome for the selection → no anchor → no guessed ladder.
    $pool = $mkPool([
        'spreads' => [['name' => 'Lakers', 'point' => 5.5, 'price' => 1.909]], // different team
        'h2h'     => [['name' => 'Celtics', 'price' => 1.45]],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('basketball_nba', 'spreads', 'Celtics', -5.5, $pool);
    TestRunner::assertEquals(0, count($ladder), 'no base line price → no synthetic ladder');
});

TestRunner::run('priceBoughtPointFromFeed — placement returns the SAME synthetic rung as display', function () use ($mkPool): void {
    // The single-source guarantee: placement reprices off ladderFromFeed, so a
    // synthesized rung shown on the board is exactly what places + settles.
    $pool = $mkPool([
        'spreads' => [['name' => 'Celtics', 'point' => -5.5, 'price' => 1.909]],
        'h2h'     => [['name' => 'Celtics', 'price' => 1.45]],
    ]);
    $display = BuyPointsPricing::ladderFromFeed('basketball_nba', 'spreads', 'Celtics', -5.5, $pool);
    TestRunner::assertTrue(count($display) > 0, 'display ladder present');
    $first = $display[0];
    $placed = BuyPointsPricing::priceBoughtPointFromFeed('basketball_nba', 'spreads', 'Celtics', -5.5, $first['points'], $pool);
    TestRunner::assertTrue($placed !== null, 'placement found the synthetic rung');
    TestRunner::assertEquals($first['american'], $placed['american'], 'placement price == display price');
    TestRunner::assertEqualsFloat($first['line'], $placed['line'], 'placement line == display line', 1e-9);
});

// ── bidirectional ladder: buys (+) AND sells (-) ─────────────────────────────

TestRunner::run('sellLadderFromFeed — MLB run line surfaces harder feed rungs with NEGATIVE points', function () use ($mkPool, $amer): void {
    // Yankees -1.5; the feed prices the harder lines -2.0 and -2.5 (laying more
    // for a better payout). sellLadderFromFeed returns them with negative
    // points (the sell direction), feed-priced, no win-zone, no ML floor below 0.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Yankees', 'point' => -1.5, 'price' => 1.95]],
        'h2h'               => [['name' => 'Yankees', 'price' => 1.625]], // -160
        'alternate_spreads' => [
            ['name' => 'Yankees', 'point' => -2.5, 'price' => 2.37], // +137
            ['name' => 'Yankees', 'point' => -2.0, 'price' => 2.18], // +118
            ['name' => 'Yankees', 'point' => -1.0, 'price' => 2.20],
            ['name' => 'Yankees', 'point' =>  1.0, 'price' => 1.3125],
            ['name' => 'Yankees', 'point' =>  1.5, 'price' => 1.244],
        ],
    ]);
    $sell = BuyPointsPricing::sellLadderFromFeed('baseball_mlb', 'spreads', 'Yankees', -1.5, $pool);
    $byLine = [];
    foreach ($sell as $r) { $byLine[number_format($r['line'], 1)] = $r; }
    $lines = array_map(static fn ($r) => $r['line'], $sell);
    TestRunner::assertEquals([-2.0, -2.5], $lines, 'sell rungs at the harder feed lines');
    TestRunner::assertEqualsFloat(-0.5, $byLine['-2.0']['points'], '-2.0 is a 0.5-pt SELL (negative)', 1e-9);
    TestRunner::assertEqualsFloat(-1.0, $byLine['-2.5']['points'], '-2.5 is a 1.0-pt SELL (negative)', 1e-9);
    TestRunner::assertEquals($amer(2.18), $byLine['-2.0']['american'], '-2.0 priced from feed');
});

TestRunner::run('flat-cents ladder — basketball spread: +10c/half, cap 2 pts, overrides feed (competitor parity)', function () use ($mkPool): void {
    // Mystics -4 at -110. Buy DOWN: -3.5 -120, -3 -130, -2.5 -140, -2 -150.
    // A feed alt ladder is present but flat-cents OVERRIDES it (clean steps).
    $pool = $mkPool([
        'spreads'           => [['name' => 'Mystics', 'point' => -4.0, 'price' => 1.9090909]], // -110
        'h2h'               => [['name' => 'Mystics', 'price' => 1.5]],
        'alternate_spreads' => [
            ['name' => 'Mystics', 'point' => -3.5, 'price' => 2.05],   // ignored
            ['name' => 'Mystics', 'point' => -3.0, 'price' => 2.20],   // ignored
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('basketball_nba', 'spreads', 'Mystics', -4.0, $pool);
    TestRunner::assertEquals(4, count($ladder), '4 rungs (capped at 2.0 points)');
    $byPoints = [];
    foreach ($ladder as $r) { $byPoints[(string) $r['points']] = $r; }
    TestRunner::assertEqualsFloat(-3.5, $byPoints['0.5']['line'], '0.5 -> -3.5 line', 1e-9);
    TestRunner::assertEquals(-120, $byPoints['0.5']['american'], '0.5 -> -120 (feed -129 ignored)');
    TestRunner::assertEquals(-130, $byPoints['1']['american'],   '1.0 -> -130');
    TestRunner::assertEquals(-140, $byPoints['1.5']['american'], '1.5 -> -140');
    TestRunner::assertEqualsFloat(-2.0, $byPoints['2']['line'], '2.0 -> -2.0 line', 1e-9);
    TestRunner::assertEquals(-150, $byPoints['2']['american'],   '2.0 -> -150');
    // Placement prices the SAME rung as display; beyond the 2-pt cap is rejected.
    $place = BuyPointsPricing::priceBoughtPointFromFeed('basketball_nba', 'spreads', 'Mystics', -4.0, 1.0, $pool);
    TestRunner::assertEquals(-130, $place['american'] ?? 0, 'placement 1.0 -> -130 == display');
    $beyond = BuyPointsPricing::priceBoughtPointFromFeed('basketball_nba', 'spreads', 'Mystics', -4.0, 2.5, $pool);
    TestRunner::assertTrue($beyond === null, '2.5 points beyond the 2.0 cap -> rejected');
});

// ── football flat-cents (KEY-NUMBER aware): 25c on the 3/7, 10c elsewhere ─────

TestRunner::run('flat-cents ladder — NFL spread key-number aware: 15c on the 3, 10c elsewhere (Nicky table)', function () use ($mkPool): void {
    // Rams -3.5 at -110 (the reported screenshot). Buying DOWN crosses the key
    // number 3 (steps onto -3 and off it), each +15c (default); the rest +10c,
    // cumulative off the base: -3 -125, -2.5 -140, -2 -150, -1.5 -160. The feed's
    // irregular alts (which leaked -3.5 and -2.5 both at -110) are OVERRIDDEN.
    $pool = $mkPool([
        'spreads'           => [['name' => 'Rams', 'point' => -3.5, 'price' => 1.9090909]], // -110
        'h2h'               => [['name' => 'Rams', 'price' => 1.5]],
        'alternate_spreads' => [
            ['name' => 'Rams', 'point' => -3.0, 'price' => 1.87],  // ignored (feed leak)
            ['name' => 'Rams', 'point' => -2.5, 'price' => 1.91],  // ignored (feed leak: same -110)
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Rams', -3.5, $pool);
    TestRunner::assertEquals(4, count($ladder), '4 rungs (cap 2.0 points)');
    $byPoints = [];
    foreach ($ladder as $r) { $byPoints[(string) $r['points']] = $r; }
    TestRunner::assertEqualsFloat(-3.0, $byPoints['0.5']['line'], '0.5 -> -3.0 line', 1e-9);
    TestRunner::assertEquals(-125, $byPoints['0.5']['american'], '-3.0 -125 (+15c onto the key 3)');
    TestRunner::assertEquals(-140, $byPoints['1']['american'],   '-2.5 -140 (+15c off the key 3)');
    TestRunner::assertEquals(-150, $byPoints['1.5']['american'], '-2.0 -150 (+10c, clear of key)');
    TestRunner::assertEquals(-160, $byPoints['2']['american'],   '-1.5 -160 (+10c, clear of key)');
    // Display == placement; beyond the 2-pt cap is rejected.
    $place = BuyPointsPricing::priceBoughtPointFromFeed('americanfootball_nfl', 'spreads', 'Rams', -3.5, 1.0, $pool);
    TestRunner::assertEquals(-140, $place['american'] ?? 0, 'placement 1.0 -> -140 == display');
    $beyond = BuyPointsPricing::priceBoughtPointFromFeed('americanfootball_nfl', 'spreads', 'Rams', -3.5, 2.5, $pool);
    TestRunner::assertTrue($beyond === null, '2.5 pts beyond the 2.0 cap -> rejected');
});

TestRunner::run('flat-cents ladder — NFL spread prices off the base with NO feed alts', function () use ($mkPool): void {
    // The key value-add: clean key-number juice even when the feed ships no alts.
    $pool = $mkPool([
        'spreads' => [['name' => 'Rams', 'point' => -3.5, 'price' => 1.9090909]], // -110
        'h2h'     => [['name' => 'Rams', 'price' => 1.5]],
        // no alternate_spreads
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Rams', -3.5, $pool);
    TestRunner::assertEquals(4, count($ladder), 'flat ladder built from base price alone');
    TestRunner::assertEquals(-125, $ladder[0]['american'], 'first rung -3.0 -125');
    TestRunner::assertEquals(-160, $ladder[3]['american'], 'last rung -1.5 -160');
});

TestRunner::run('flat-cents ladder — NFL spread: 7 then 6 are BOTH key numbers (15c each)', function () use ($mkPool): void {
    // Nicky's -7 example, anchored one ½-pt higher (-7½). 7 and 6 are both key, so
    // the steps onto/off each cost +15c; only -5½→-5 (clear) drops to +10c.
    $pool = $mkPool([
        'spreads' => [['name' => 'Rams', 'point' => -7.5, 'price' => 1.9090909]], // -110
        'h2h'     => [['name' => 'Rams', 'price' => 1.3]],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Rams', -7.5, $pool);
    $byPoints = [];
    foreach ($ladder as $r) { $byPoints[(string) $r['points']] = $r; }
    TestRunner::assertEquals(-125, $byPoints['0.5']['american'], '-7.0 -125 (+15c onto the 7)');
    TestRunner::assertEquals(-140, $byPoints['1']['american'],   '-6.5 -140 (+15c off the 7)');
    TestRunner::assertEquals(-155, $byPoints['1.5']['american'], '-6.0 -155 (+15c onto the 6)');
    TestRunner::assertEquals(-170, $byPoints['2']['american'],   '-5.5 -170 (+15c off the 6)');
});

TestRunner::run('flat-cents ladder — NFL Nicky/Mitchell table: -4, -10, -7, -5 examples match exactly', function () use ($mkPool): void {
    // The four worked examples from the Nicky/Mitchell chat — key set {3,4,6,7,10,14}
    // at +15c, everything else +10c, cumulative off -110.
    $mk = static function (float $base) use ($mkPool): array {
        $pool = $mkPool([
            'spreads' => [['name' => 'Team', 'point' => $base, 'price' => 1.9090909]], // -110
            'h2h'     => [['name' => 'Team', 'price' => 1.3]],
        ]);
        return array_map(
            static fn ($r) => $r['american'],
            BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Team', $base, $pool)
        );
    };
    // -4 → -3.5 -125, -3 -140, -2.5 -155, -2 -165  (4, then 3 both key)
    TestRunner::assertEquals([-125, -140, -155, -165], $mk(-4.0), '-4 ladder');
    // -10 → -9.5 -125 (the 10), then clear: -9 -135, -8.5 -145, -8 -155
    TestRunner::assertEquals([-125, -135, -145, -155], $mk(-10.0), '-10 ladder');
    // -7 → -6.5 -125 (the 7), -6 -140 (the 6), -5.5 -155 (off 6), -5 -165 (clear)
    TestRunner::assertEquals([-125, -140, -155, -165], $mk(-7.0), '-7 ladder');
    // -5 → -4.5 -120 (5 not key), then -4 -135, -3.5 -150, -3 -165 (4 and 3 key)
    TestRunner::assertEquals([-120, -135, -150, -165], $mk(-5.0), '-5 ladder');
});

TestRunner::run('flat-cents ladder — NFL spread clear of key numbers is a flat 10c/half', function () use ($mkPool): void {
    // -12.5 down to -10.5 never lands on 3/4/6/7/10/14, so every step is base 10c.
    $pool = $mkPool([
        'spreads' => [['name' => 'Rams', 'point' => -12.5, 'price' => 1.9090909]], // -110
        'h2h'     => [['name' => 'Rams', 'price' => 1.2]],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Rams', -12.5, $pool);
    $am = array_map(static fn ($r) => $r['american'], $ladder);
    TestRunner::assertEquals([-120, -130, -140, -150], $am, 'flat 10c/half, no key-number premium');
});

TestRunner::run('flat-cents ladder — NFL spread: consecutive key numbers 4 and 3 stack (15c each)', function () use ($mkPool): void {
    // -4.5 sits right above the 4, so every ½-step down through 4 then 3 is a key
    // step: -4 -125, -3.5 -140, -3 -155, -2.5 -170. Cumulative off the base.
    $pool = $mkPool([
        'spreads' => [['name' => 'Rams', 'point' => -4.5, 'price' => 1.9090909]], // -110
        'h2h'     => [['name' => 'Rams', 'price' => 1.45]],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Rams', -4.5, $pool);
    $am = array_map(static fn ($r) => $r['american'], $ladder);
    TestRunner::assertEquals([-125, -140, -155, -170], $am, '15c onto the 4, off the 4/onto the 3, off the 3');
});

TestRunner::run('flat-cents ladder — NFL key-number premium is env-tunable (BUY_POINTS_KEY_NUMBER_CENTS)', function () use ($mkPool): void {
    $prev = $_ENV['BUY_POINTS_KEY_NUMBER_CENTS'] ?? null;
    $pool = $mkPool([
        'spreads' => [['name' => 'Rams', 'point' => -3.5, 'price' => 1.9090909]], // -110
        'h2h'     => [['name' => 'Rams', 'price' => 1.5]],
    ]);

    // Override to 25c (Nicky's original): Rams -3.5 → -3 -135, -2.5 -160.
    $_ENV['BUY_POINTS_KEY_NUMBER_CENTS'] = '25';
    $byPoints = [];
    foreach (BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Rams', -3.5, $pool) as $r) {
        $byPoints[(string) $r['points']] = $r;
    }
    TestRunner::assertEquals(-135, $byPoints['0.5']['american'], '25c override -> -3.0 -135');
    TestRunner::assertEquals(-160, $byPoints['1']['american'],   '25c override -> -2.5 -160');

    // Below the 10c base clamps UP to 10 (a key step is never cheaper than a normal one).
    $_ENV['BUY_POINTS_KEY_NUMBER_CENTS'] = '5';
    $byPoints = [];
    foreach (BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'spreads', 'Rams', -3.5, $pool) as $r) {
        $byPoints[(string) $r['points']] = $r;
    }
    TestRunner::assertEquals(-120, $byPoints['0.5']['american'], 'clamped to 10c -> -3.0 -120');

    if ($prev === null) {
        unset($_ENV['BUY_POINTS_KEY_NUMBER_CENTS']);
    } else {
        $_ENV['BUY_POINTS_KEY_NUMBER_CENTS'] = $prev;
    }
});

TestRunner::run('flat-cents — NFL TOTALS stay feed-anchored (not flat key-number)', function () use ($mkPool, $amer): void {
    // The key-number model is SPREADS-only. Football totals still come straight
    // from the feed's alternate_totals (key numbers 3/7 are margin numbers and
    // don't apply to totals).
    $pool = $mkPool([
        'totals'           => [['name' => 'Over', 'point' => 47.5, 'price' => 1.91]],
        'alternate_totals' => [
            ['name' => 'Over', 'point' => 47.0, 'price' => 1.83],
            ['name' => 'Over', 'point' => 46.5, 'price' => 1.77],
        ],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('americanfootball_nfl', 'totals', 'Over', 47.5, $pool);
    TestRunner::assertEquals(2, count($ladder), 'totals priced from the feed (only the 2 alts)');
    TestRunner::assertEquals($amer(1.83), $ladder[0]['american'], 'over 47.0 from feed, not a flat step');
});

TestRunner::run('worsenAmericanByCents continuity — +120 worsened crosses even to -110 (no flat-cents for MLB)', function () use ($mkPool): void {
    // Underdog +120 base, flat-cents football: +120 -> +110 -> EVEN -> -110 -> -120.
    $pool = $mkPool([
        'spreads' => [['name' => 'Jets', 'point' => 3.0, 'price' => 2.20]], // +120
        'h2h'     => [['name' => 'Jets', 'price' => 2.40]],
    ]);
    $ladder = BuyPointsPricing::ladderFromFeed('basketball_nba', 'spreads', 'Jets', 3.0, $pool);
    $byPoints = [];
    foreach ($ladder as $r) { $byPoints[(string) $r['points']] = $r; }
    TestRunner::assertEquals(110,  $byPoints['0.5']['american'], '0.5 -> +110');
    TestRunner::assertEquals(-110, $byPoints['1.5']['american'], '1.5 -> -110 (crossed even)');
    TestRunner::assertEquals(-120, $byPoints['2']['american'],   '2.0 -> -120');
});

TestRunner::run('fullLadderFromFeed — MLB -1.5 shows BOTH the -2.5 sell and the +1.5 buy (Nicky)', function () use ($mkPool): void {
    $pool = $mkPool([
        'spreads'           => [['name' => 'Tigers', 'point' => -1.5, 'price' => 1.95]],
        'h2h'               => [['name' => 'Tigers', 'price' => 1.625]], // -160
        'alternate_spreads' => [
            ['name' => 'Tigers', 'point' => -2.5, 'price' => 2.37],
            ['name' => 'Tigers', 'point' => -2.0, 'price' => 2.18],
            ['name' => 'Tigers', 'point' => -1.0, 'price' => 2.20],
            ['name' => 'Tigers', 'point' =>  1.0, 'price' => 1.3125],
            ['name' => 'Tigers', 'point' =>  1.5, 'price' => 1.244],
        ],
    ]);
    $full = BuyPointsPricing::fullLadderFromFeed('baseball_mlb', 'spreads', 'Tigers', -1.5, $pool);
    $lines = array_map(static fn ($r) => $r['line'], $full);
    // Sorted ascending by signed points: sells first (most negative), then buys.
    TestRunner::assertEquals([-2.5, -2.0, -1.0, 1.0, 1.5], $lines, 'full ladder spans -2.5 .. +1.5');
    TestRunner::assertTrue(in_array(-2.5, $lines, true), 'includes the -2.5 sell (Nicky)');
    TestRunner::assertTrue(in_array(1.5, $lines, true), 'includes the +1.5 buy (Nicky)');
    TestRunner::assertFalse(in_array(-0.5, $lines, true), 'still no ±0.5 win-zone rung on a run line');
});

TestRunner::run('priceBoughtPointFromFeed — BUY-ONLY: rejects a sell, still prices a buy', function () use ($mkPool): void {
    $pool = $mkPool([
        'spreads'           => [['name' => 'Tigers', 'point' => -1.5, 'price' => 1.95]],
        'h2h'               => [['name' => 'Tigers', 'price' => 1.625]],
        'alternate_spreads' => [
            ['name' => 'Tigers', 'point' => -2.5, 'price' => 2.37],
            ['name' => 'Tigers', 'point' =>  1.5, 'price' => 1.244],
        ],
    ]);
    // Buy-only policy (Nicky): selling points (negative boughtPoints → a harder
    // line for a better payout) is no longer offered. priceBoughtPointFromFeed
    // reads the buy-only ladder, so -1.0 matches no rung → null → the caller
    // rejects placement (BUY_POINTS_NO_FEED_PRICE). A sell can never be placed.
    $sell = BuyPointsPricing::priceBoughtPointFromFeed('baseball_mlb', 'spreads', 'Tigers', -1.5, -1.0, $pool);
    TestRunner::assertTrue($sell === null, 'sell rung rejected under buy-only policy');
    // Buying points DOWN still prices: +3.0 moves -1.5 → +1.5 (an easier line).
    $buy = BuyPointsPricing::priceBoughtPointFromFeed('baseball_mlb', 'spreads', 'Tigers', -1.5, 3.0, $pool);
    TestRunner::assertTrue($buy !== null, 'buy rung priced for boughtPoints = +3.0');
    TestRunner::assertEqualsFloat(1.5, $buy['line'], 'buy line +1.5', 1e-9);
});

TestRunner::run('fullLadderFromFeed — run-line reference cap drops deep alts (|line| > 2.5)', function () use ($mkPool): void {
    // White Sox +2 (-265) dog. The feed prices deep alts +3/+3.5/+4 plus the
    // reference lines. The dropdown should show only the near-pick'em reference
    // band (|line| <= 2.5): -1, +1, +2.5 (and the base +2 the frontend adds).
    $pool = $mkPool([
        'spreads'           => [['name' => 'White Sox', 'point' => 2.0, 'price' => 1.377]], // -265
        'h2h'               => [['name' => 'White Sox', 'price' => 2.80]],                   // +180 dog ML
        'alternate_spreads' => [
            ['name' => 'White Sox', 'point' => 2.5, 'price' => 1.31],
            ['name' => 'White Sox', 'point' => 3.0, 'price' => 1.23],
            ['name' => 'White Sox', 'point' => 3.5, 'price' => 1.19],
            ['name' => 'White Sox', 'point' => 4.0, 'price' => 1.14],
            ['name' => 'White Sox', 'point' => 1.0, 'price' => 1.714],
            ['name' => 'White Sox', 'point' => -1.0, 'price' => 2.37],
        ],
    ]);
    $full = BuyPointsPricing::fullLadderFromFeed('baseball_mlb', 'spreads', 'White Sox', 2.0, $pool);
    $lines = array_map(static fn ($r) => $r['line'], $full);
    TestRunner::assertEquals([-1.0, 1.0, 2.5], $lines, 'only reference lines (|line| <= 2.5)');
    TestRunner::assertFalse(in_array(3.0, $lines, true), '+3.0 deep alt dropped');
    TestRunner::assertFalse(in_array(4.0, $lines, true), '+4.0 deep alt dropped');
});

// ── placement: priceBoughtPointFromFeed (single rung or null) ────────────────

TestRunner::run('priceBoughtPointFromFeed — returns the feed rung for a priced buy', function () use ($mkPool, $amer): void {
    $pool = $mkPool([
        'spreads'           => [['name' => 'Chiefs', 'point' => -3.5, 'price' => 1.91]],
        'h2h'               => [['name' => 'Chiefs', 'price' => 1.50]],
        'alternate_spreads' => [['name' => 'Chiefs', 'point' => -3.0, 'price' => 1.83]],
    ]);
    $rung = BuyPointsPricing::priceBoughtPointFromFeed('tennis_atp', 'spreads', 'Chiefs', -3.5, 0.5, $pool);
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
    $rung = BuyPointsPricing::priceBoughtPointFromFeed('tennis_atp', 'spreads', 'Chiefs', -3.5, 2.0, $pool);
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
    $kept = BuyPointsPricing::priceBoughtPointFromFeed('tennis_atp', 'spreads', 'Jets', 2.5, 0.5, $pool);
    $omitted = BuyPointsPricing::priceBoughtPointFromFeed('tennis_atp', 'spreads', 'Jets', 2.5, 1.0, $pool);
    TestRunner::assertTrue($kept !== null, '+3.0 (≤ ML) priced');
    TestRunner::assertTrue($omitted === null, '+3.5 (> ML) rejected at placement');
});

// Restore the prior env so later suites in the shared process are unaffected.
if ($prevEnabled === null) {
    unset($_ENV['BUY_POINTS_ENABLED_SPORTS']);
} else {
    $_ENV['BUY_POINTS_ENABLED_SPORTS'] = $prevEnabled;
}
