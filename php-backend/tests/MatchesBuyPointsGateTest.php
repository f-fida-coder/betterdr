<?php

declare(strict_types=1);

/**
 * Tests for the totals Buy Points DISPLAY gate + on-demand ladder helper
 * (2026-07-17: totals ladders default-hidden on the board; a player reveals
 * one leg's ladder via GET /api/matches/{id}/buy-points).
 *
 * Covers, per the approved plan:
 *  - totals ladder ABSENT from the board attachment by default;
 *  - BUY_POINTS_TOTALS_ON_BOARD=true restores the old behavior;
 *  - spreads attachment unaffected either way;
 *  - the endpoint helper (buyPointsLadderForSelection) serves the totals
 *    ladder while the board gate is on — same rungs placement prices;
 *  - fail-closed empties: manual-override base, base missing at the point.
 *
 * No database, no HTTP: attachBuyPointsLadders takes plain arrays (invoked via
 * reflection — it's private static) and buyPointsLadderForSelection takes a
 * match doc array whose odds carry no bookmakers, so canonicalizeOddsMarkets
 * passes it through untouched.
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

// Same guarded Env stub as BuyPointsPricingTest (must mirror the real
// Env::get: $_ENV first, then getenv, then default) so this suite behaves
// identically whether the stub or the real class won the class_exists race.
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
require_once __DIR__ . '/../src/ManualOddsOverlay.php';
require_once __DIR__ . '/../src/MatchesController.php';

// ── fixtures ────────────────────────────────────────────────────────────────

// MLB doc: feed-anchored spreads AND totals, both with clean alt ladders, so
// with no gate BOTH markets would carry alternateLines.
$mkMarkets = static function (): array {
    return [
        [
            'key' => 'h2h',
            'outcomes' => [
                ['name' => 'Yankees', 'price' => 1.625], // -160
                ['name' => 'Red Sox', 'price' => 2.35],
            ],
        ],
        [
            'key' => 'spreads',
            'outcomes' => [
                ['name' => 'Yankees', 'point' => -1.5, 'price' => 1.95],
            ],
        ],
        [
            'key' => 'totals',
            'outcomes' => [
                ['name' => 'Over', 'point' => 9.5, 'price' => 1.91],
                ['name' => 'Under', 'point' => 9.5, 'price' => 1.91],
            ],
        ],
    ];
};

$mkExtended = static function (): array {
    return [
        [
            'key' => 'alternate_spreads',
            'outcomes' => [
                ['name' => 'Yankees', 'point' => -1.0, 'price' => 2.20],
                ['name' => 'Yankees', 'point' => 1.0, 'price' => 1.476],
            ],
        ],
        [
            'key' => 'alternate_totals',
            'outcomes' => [
                ['name' => 'Over', 'point' => 9.0, 'price' => 1.74],
                ['name' => 'Over', 'point' => 8.5, 'price' => 1.62],
                ['name' => 'Under', 'point' => 10.0, 'price' => 1.74],
            ],
        ],
    ];
};

$attach = static function (array $markets, string $sportKey, array $extended): array {
    $rm = new ReflectionMethod(MatchesController::class, 'attachBuyPointsLadders');
    /** @var array $out */
    $out = $rm->invoke(null, $markets, $sportKey, $extended);
    return $out;
};

/** alternateLines of the first outcome of the market with $key, or null. */
$altsOf = static function (array $markets, string $key, int $outcomeIdx = 0): ?array {
    foreach ($markets as $m) {
        if (strtolower((string) ($m['key'] ?? '')) !== $key) {
            continue;
        }
        $o = $m['outcomes'][$outcomeIdx] ?? null;
        return is_array($o['alternateLines'] ?? null) ? $o['alternateLines'] : null;
    }
    return null;
};

// Enable MLB for the whole suite; restore at the end.
$prevEnabled = $_ENV['BUY_POINTS_ENABLED_SPORTS'] ?? null;
$prevOnBoard = $_ENV['BUY_POINTS_TOTALS_ON_BOARD'] ?? null;
$_ENV['BUY_POINTS_ENABLED_SPORTS'] = 'baseball_mlb';
unset($_ENV['BUY_POINTS_TOTALS_ON_BOARD']);

// ── env flag parsing ─────────────────────────────────────────────────────────

TestRunner::run('buyPointsTotalsOnBoard — default FALSE (hidden); truthy values enable', function (): void {
    unset($_ENV['BUY_POINTS_TOTALS_ON_BOARD']);
    TestRunner::assertFalse(MatchesController::buyPointsTotalsOnBoard(), 'unset → hidden (default)');
    $_ENV['BUY_POINTS_TOTALS_ON_BOARD'] = 'false';
    TestRunner::assertFalse(MatchesController::buyPointsTotalsOnBoard(), 'false → hidden');
    $_ENV['BUY_POINTS_TOTALS_ON_BOARD'] = 'true';
    TestRunner::assertTrue(MatchesController::buyPointsTotalsOnBoard(), 'true → on board');
    $_ENV['BUY_POINTS_TOTALS_ON_BOARD'] = '1';
    TestRunner::assertTrue(MatchesController::buyPointsTotalsOnBoard(), '1 → on board');
    $_ENV['BUY_POINTS_TOTALS_ON_BOARD'] = 'garbage';
    TestRunner::assertFalse(MatchesController::buyPointsTotalsOnBoard(), 'unrecognized → hidden (fail to default)');
    unset($_ENV['BUY_POINTS_TOTALS_ON_BOARD']);
});

// ── board attachment gate ────────────────────────────────────────────────────

/** Outcome at ($key, $idx), or null. */
$outcomeOf = static function (array $markets, string $key, int $outcomeIdx = 0): ?array {
    foreach ($markets as $m) {
        if (strtolower((string) ($m['key'] ?? '')) !== $key) {
            continue;
        }
        $o = $m['outcomes'][$outcomeIdx] ?? null;
        return is_array($o) ? $o : null;
    }
    return null;
};

TestRunner::run('attachBuyPointsLadders — DEFAULT: totals ladder absent, buyPointsAvailable hint stamped, spreads still attached', function () use ($mkMarkets, $mkExtended, $attach, $altsOf, $outcomeOf): void {
    unset($_ENV['BUY_POINTS_TOTALS_ON_BOARD']);
    $out = $attach($mkMarkets(), 'baseball_mlb', $mkExtended());

    TestRunner::assertTrue($altsOf($out, 'totals', 0) === null, 'Over outcome carries NO alternateLines by default');
    TestRunner::assertTrue($altsOf($out, 'totals', 1) === null, 'Under outcome carries NO alternateLines by default');
    TestRunner::assertTrue(($outcomeOf($out, 'totals', 0)['buyPointsAvailable'] ?? null) === true, 'Over stamped buyPointsAvailable=true (enabled sport)');
    TestRunner::assertTrue(($outcomeOf($out, 'totals', 1)['buyPointsAvailable'] ?? null) === true, 'Under stamped buyPointsAvailable=true');

    $spreadAlts = $altsOf($out, 'spreads', 0);
    TestRunner::assertTrue(is_array($spreadAlts) && count($spreadAlts) > 0, 'spreads ladder still attached (unaffected)');
    TestRunner::assertFalse(array_key_exists('buyPointsAvailable', $outcomeOf($out, 'spreads', 0) ?? []), 'spreads outcome NOT stamped (hint is totals-only)');
});

TestRunner::run('attachBuyPointsLadders — buyPointsAvailable NOT stamped for disabled sports / manual outcomes', function () use ($mkMarkets, $mkExtended, $attach, $outcomeOf): void {
    unset($_ENV['BUY_POINTS_TOTALS_ON_BOARD']);

    // Disabled sport: the isSportEnabled early-return leaves markets untouched
    // → no hint anywhere → the FE renders no pill at all.
    $out = $attach($mkMarkets(), 'cricket_test', $mkExtended());
    TestRunner::assertFalse(array_key_exists('buyPointsAvailable', $outcomeOf($out, 'totals', 0) ?? []), 'disabled sport → no hint on totals');

    // Manually-overridden totals outcome: no ladder would ever be served
    // (BUY_POINTS_OVERRIDDEN_LINE at placement), so no hint either.
    $markets = $mkMarkets();
    foreach ($markets as &$m) {
        if (($m['key'] ?? '') === 'totals') {
            $m['outcomes'][0]['source'] = ManualOddsOverlay::SOURCE_TAG;
        }
    }
    unset($m);
    $out = $attach($markets, 'baseball_mlb', $mkExtended());
    TestRunner::assertFalse(array_key_exists('buyPointsAvailable', $outcomeOf($out, 'totals', 0) ?? []), 'manual Over → no hint');
    TestRunner::assertTrue(($outcomeOf($out, 'totals', 1)['buyPointsAvailable'] ?? null) === true, 'untouched Under still hinted');
});

TestRunner::run('attachBuyPointsLadders — BUY_POINTS_TOTALS_ON_BOARD=true restores totals attachment', function () use ($mkMarkets, $mkExtended, $attach, $altsOf): void {
    $_ENV['BUY_POINTS_TOTALS_ON_BOARD'] = 'true';
    $out = $attach($mkMarkets(), 'baseball_mlb', $mkExtended());
    unset($_ENV['BUY_POINTS_TOTALS_ON_BOARD']);

    $overAlts = $altsOf($out, 'totals', 0);
    TestRunner::assertTrue(is_array($overAlts) && count($overAlts) === 2, 'Over ladder attached with flag on (9.0 + 8.5)');
    TestRunner::assertEqualsFloat(9.0, (float) $overAlts[0]['line'], 'first Over rung 9.0', 1e-9);
});

// ── on-demand helper (the endpoint's core) ───────────────────────────────────

TestRunner::run('buyPointsLadderForSelection — serves the totals ladder while the board gate is ON', function () use ($mkMarkets, $mkExtended): void {
    unset($_ENV['BUY_POINTS_TOTALS_ON_BOARD']); // gate on (default-hidden)
    $match = [
        'sportKey' => 'baseball_mlb',
        'odds' => ['markets' => $mkMarkets(), 'extendedMarkets' => $mkExtended()],
    ];
    $ladder = MatchesController::buyPointsLadderForSelection($match, 'totals', 'Over', 9.5);
    TestRunner::assertEquals(2, count($ladder), 'on-demand Over ladder has both feed rungs');
    TestRunner::assertEqualsFloat(9.0, (float) $ladder[0]['line'], 'rung1 line 9.0', 1e-9);
    TestRunner::assertEqualsFloat(0.5, (float) $ladder[0]['points'], 'rung1 = 0.5-pt buy', 1e-9);
    TestRunner::assertTrue(isset($ladder[0]['odds'], $ladder[0]['americanOdds']), 'alternateLines shape (odds + americanOdds)');

    // Same single source as placement: the endpoint rung IS the placement rung.
    $pool = array_merge($mkMarkets(), $mkExtended());
    $placed = BuyPointsPricing::priceBoughtPointFromFeed('baseball_mlb', 'totals', 'Over', 9.5, 0.5, $pool);
    TestRunner::assertTrue($placed !== null, 'placement prices the same 0.5 buy');
    TestRunner::assertEquals($placed['american'], $ladder[0]['americanOdds'], 'endpoint american == placement american');

    // Under side resolves its own rung (direction-aware).
    $under = MatchesController::buyPointsLadderForSelection($match, 'totals', 'Under', 9.5);
    TestRunner::assertEquals(1, count($under), 'Under ladder has its one feed rung');
    TestRunner::assertEqualsFloat(10.0, (float) $under[0]['line'], 'Under rung grows to 10.0', 1e-9);
});

TestRunner::run('buyPointsLadderForSelection — fail-closed empties: manual base, missing base point, disabled sport', function () use ($mkMarkets, $mkExtended): void {
    // Manually-overridden base outcome → no ladder (placement rejects
    // BUY_POINTS_OVERRIDDEN_LINE; display must agree).
    $manualMarkets = $mkMarkets();
    foreach ($manualMarkets as &$m) {
        if (($m['key'] ?? '') === 'totals') {
            $m['outcomes'][0]['source'] = ManualOddsOverlay::SOURCE_TAG;
        }
    }
    unset($m);
    $manualMatch = [
        'sportKey' => 'baseball_mlb',
        'odds' => ['markets' => $manualMarkets, 'extendedMarkets' => $mkExtended()],
    ];
    TestRunner::assertEquals(0, count(MatchesController::buyPointsLadderForSelection($manualMatch, 'totals', 'Over', 9.5)), 'manual base → []');

    // Requested point not on the served base market (stale client) → [].
    $match = [
        'sportKey' => 'baseball_mlb',
        'odds' => ['markets' => $mkMarkets(), 'extendedMarkets' => $mkExtended()],
    ];
    TestRunner::assertEquals(0, count(MatchesController::buyPointsLadderForSelection($match, 'totals', 'Over', 10.5)), 'point mismatch → []');

    // Sport not enabled → [] (BuyPointsPricing gate holds on this path too).
    $disabled = ['sportKey' => 'cricket_test', 'odds' => $match['odds']];
    TestRunner::assertEquals(0, count(MatchesController::buyPointsLadderForSelection($disabled, 'totals', 'Over', 9.5)), 'disabled sport → []');

    // Non-buy-points market → [].
    TestRunner::assertEquals(0, count(MatchesController::buyPointsLadderForSelection($match, 'h2h', 'Yankees', 0.0)), 'h2h → []');
});

// ── env restore ──────────────────────────────────────────────────────────────

if ($prevEnabled === null) {
    unset($_ENV['BUY_POINTS_ENABLED_SPORTS']);
} else {
    $_ENV['BUY_POINTS_ENABLED_SPORTS'] = $prevEnabled;
}
if ($prevOnBoard === null) {
    unset($_ENV['BUY_POINTS_TOTALS_ON_BOARD']);
} else {
    $_ENV['BUY_POINTS_TOTALS_ON_BOARD'] = $prevOnBoard;
}
