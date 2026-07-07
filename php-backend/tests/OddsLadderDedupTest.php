<?php

declare(strict_types=1);

/**
 * Unit tests for RundownEventMapper::dedupeExtendedMarkets() — collapsing
 * alt-spread / alt-total / period LADDERS to ONE house-safe rung per
 * (side, point). Rundown sends one outcome per sportsbook per rung; without
 * this, "Germany -4.5" shows once per book at different juice and a player
 * could cherry-pick the most generous one.
 */

// getenv-backed Env stub so the test can drive SPORTSBOOK_PREFERRED_BOOKS.
if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, ?string $default = null): ?string
        {
            $v = getenv($key);
            return $v === false ? $default : $v;
        }
    }
}

require_once dirname(__DIR__) . '/src/RundownEventMapper.php';

/** Build an alt-spread outcome. */
function lad(string $name, float $point, float $price, string $book): array
{
    return ['name' => $name, 'point' => $point, 'price' => $price, 'book' => $book];
}

/** Find the single outcome for a (name, point) rung in a deduped market. */
function rung(array $market, string $name, float $point): ?array
{
    foreach ($market['outcomes'] as $o) {
        if ($o['name'] === $name && (float) $o['point'] === $point) return $o;
    }
    return null;
}

// Drive the preferred-book order for this suite. Real Env::get() reads $_ENV
// before getenv(), and these tests share run.php's process with other suites,
// so set BOTH and restore them at the end of the file to avoid leaking the
// value into RundownEventMapperTest (which runs later in the same process).
$__origGetenvPB = getenv('SPORTSBOOK_PREFERRED_BOOKS');
$__origEnvPB = $_ENV['SPORTSBOOK_PREFERRED_BOOKS'] ?? null;
putenv('SPORTSBOOK_PREFERRED_BOOKS=pinnacle,draftkings,betmgm');
$_ENV['SPORTSBOOK_PREFERRED_BOOKS'] = 'pinnacle,draftkings,betmgm';

// ── One rung per handicap, priced by the top preferred book ─────────────────────
TestRunner::run('dedupeExtendedMarkets — collapses books to the preferred line', function (): void {
    $flat = [[
        'key' => 'alternate_spreads',
        'outcomes' => [
            lad('Germany', -4.5, 3.00, 'caesars'),    // +200, not preferred
            lad('Germany', -4.5, 2.95, 'draftkings'), // +195, rank 1
            lad('Germany', -4.5, 2.65, 'pinnacle'),   // +165, rank 0  ← should win
            lad('Germany', -4.5, 2.85, 'betmgm'),     // rank 2
        ],
    ]];
    $out = RundownEventMapper::dedupeExtendedMarkets($flat);
    TestRunner::assertEquals(1, count($out[0]['outcomes']), 'six books → one rung');
    $g = rung($out[0], 'Germany', -4.5);
    TestRunner::assertEqualsFloat(2.65, (float) $g['price'], 'picks pinnacle (top preferred), NOT the +200 best-for-player');
});

// ── Distinct handicaps stay separate; only true duplicates collapse ─────────────
TestRunner::run('dedupeExtendedMarkets — keeps each distinct point', function (): void {
    $flat = [[
        'key' => 'alternate_spreads',
        'outcomes' => [
            lad('Germany', -4.0, 2.46, 'pinnacle'),
            lad('Germany', -4.0, 2.17, 'draftkings'),
            lad('Germany', -4.25, 2.71, 'pinnacle'),
            lad('Germany', -4.5, 2.95, 'pinnacle'),
            lad('Germany', -4.5, 3.00, 'draftkings'),
        ],
    ]];
    $out = RundownEventMapper::dedupeExtendedMarkets($flat);
    TestRunner::assertEquals(3, count($out[0]['outcomes']), '-4.0 / -4.25 / -4.5 → three rungs');
    TestRunner::assertEqualsFloat(2.46, (float) rung($out[0], 'Germany', -4.0)['price'], '-4.0 pinnacle');
    TestRunner::assertEqualsFloat(2.71, (float) rung($out[0], 'Germany', -4.25)['price'], '-4.25 pinnacle');
});

// ── Over/Under (totals) collapse per (side, point) independently ─────────────────
TestRunner::run('dedupeExtendedMarkets — totals over/under per rung', function (): void {
    $flat = [[
        'key' => 'alternate_totals',
        'outcomes' => [
            lad('Over', 2.5, 1.90, 'pinnacle'),
            lad('Over', 2.5, 1.95, 'draftkings'),
            lad('Under', 2.5, 1.92, 'draftkings'),
            lad('Under', 2.5, 1.88, 'pinnacle'),
        ],
    ]];
    $out = RundownEventMapper::dedupeExtendedMarkets($flat);
    TestRunner::assertEquals(2, count($out[0]['outcomes']), 'Over 2.5 + Under 2.5 → two rungs');
    TestRunner::assertEqualsFloat(1.90, (float) rung($out[0], 'Over', 2.5)['price'], 'Over → pinnacle');
    TestRunner::assertEqualsFloat(1.88, (float) rung($out[0], 'Under', 2.5)['price'], 'Under → pinnacle');
});

// ── Different market families / periods never merge ──────────────────────────────
TestRunner::run('dedupeExtendedMarkets — periods stay separate', function (): void {
    $flat = [
        ['key' => 'alternate_spreads', 'outcomes' => [lad('Germany', -1.5, 2.10, 'pinnacle')]],
        ['key' => 'alternate_spreads_h1', 'outcomes' => [lad('Germany', -1.5, 2.40, 'pinnacle')]],
    ];
    $out = RundownEventMapper::dedupeExtendedMarkets($flat);
    TestRunner::assertEquals(2, count($out), 'full-game and h1 ladders not merged');
    TestRunner::assertEqualsFloat(2.10, (float) $out[0]['outcomes'][0]['price'], 'full game line');
    TestRunner::assertEqualsFloat(2.40, (float) $out[1]['outcomes'][0]['price'], 'h1 line distinct');
});

// ── No preferred book → median (house-safe), even count → lower-payout middle ────
TestRunner::run('dedupeExtendedMarkets — median fallback is house-safe', function (): void {
    // Three non-preferred books → true median.
    $odd = RundownEventMapper::dedupeExtendedMarkets([[
        'key' => 'alternate_spreads',
        'outcomes' => [
            lad('Germany', -6.5, 2.00, 'caesars'),
            lad('Germany', -6.5, 3.00, 'fanduel'),
            lad('Germany', -6.5, 2.50, 'pointsbet'),
        ],
    ]]);
    TestRunner::assertEqualsFloat(2.50, (float) $odd[0]['outcomes'][0]['price'], 'odd count → median 2.50');

    // Four non-preferred books → lower of the two middles (house-safe).
    $even = RundownEventMapper::dedupeExtendedMarkets([[
        'key' => 'alternate_spreads',
        'outcomes' => [
            lad('Germany', -7.5, 2.00, 'caesars'),
            lad('Germany', -7.5, 2.50, 'fanduel'),
            lad('Germany', -7.5, 3.00, 'pointsbet'),
            lad('Germany', -7.5, 3.50, 'wynn'),
        ],
    ]]);
    TestRunner::assertEqualsFloat(2.50, (float) $even[0]['outcomes'][0]['price'], 'even count → lower-payout middle, not the 3.50/3.00');
});

// ── Rungs with no usable price are dropped ───────────────────────────────────────
TestRunner::run('dedupeExtendedMarkets — drops priceless rungs', function (): void {
    $out = RundownEventMapper::dedupeExtendedMarkets([[
        'key' => 'alternate_spreads',
        'outcomes' => [
            ['name' => 'Germany', 'point' => -9.5, 'book' => 'pinnacle'], // no price
            lad('Germany', -10.5, 4.50, 'pinnacle'),
        ],
    ]]);
    TestRunner::assertEquals(1, count($out[0]['outcomes']), 'priceless -9.5 dropped, -10.5 kept');
    TestRunner::assertEqualsFloat(4.50, (float) $out[0]['outcomes'][0]['price'], 'kept rung price');
});

// ── Baseball PK suppression + balanced-pair ordering (sportKey-aware) ──────────
// dedupeExtendedMarkets doubles as the READ-path cleaner (MatchesController
// re-applies it to stored docs), so the baseball PK rule and the main-line
// ordering must hold here too — that's what fixes docs written BEFORE the
// ingestion gate shipped, without waiting for a resync.

TestRunner::run('dedupeExtendedMarkets — baseball: point=0 spread rungs dropped on the read path', function (): void {
    $flat = [[
        'key' => 'spreads_1st_5_innings',
        'outcomes' => [
            lad('Washington', 0.0, 1.84, 'pinnacle'),   // the PK rung that showed on the F5 board
            lad('Washington', -0.5, 2.12, 'fanduel'),
            lad('Houston', 0.0, 2.02, 'pinnacle'),
            lad('Houston', 0.5, 1.6849, 'fanduel'),
        ],
    ]];
    $out = RundownEventMapper::dedupeExtendedMarkets($flat, 'baseball_mlb');
    TestRunner::assertEquals(2, count($out[0]['outcomes']), 'both PK rungs dropped, both real rungs kept');
    TestRunner::assertNotNull(rung($out[0], 'Washington', -0.5), 'Washington -0.5 survives');
    TestRunner::assertNotNull(rung($out[0], 'Houston', 0.5), 'Houston +0.5 survives');
});

TestRunner::run('dedupeExtendedMarkets — PK rule is baseball-only: soccer/no-sportKey keep 0 rungs', function (): void {
    $flat = [[
        'key' => 'spreads',
        'outcomes' => [
            lad('Chelsea', 0.0, 1.91, 'pinnacle'),
            lad('Arsenal', 0.0, 1.91, 'pinnacle'),
        ],
    ]];
    // DELIBERATE EXCLUSION (product ruling 2026-07-07): soccer/hockey level
    // handicaps are a real product (draw refunds stake) — never gated.
    $soccer = RundownEventMapper::dedupeExtendedMarkets($flat, 'soccer_epl');
    TestRunner::assertEquals(2, count($soccer[0]['outcomes']), 'soccer PK handicap untouched');
    // No sportKey (legacy callers, e.g. card markets) → no suppression.
    $legacy = RundownEventMapper::dedupeExtendedMarkets($flat);
    TestRunner::assertEquals(2, count($legacy[0]['outcomes']), 'null sportKey → no suppression');
});

TestRunner::run('dedupeExtendedMarkets — baseball: balanced complementary pair ordered first', function (): void {
    // Real prod shape (Houston at Washington F5, 2026-07-07): mixed books and
    // points; the board renders the FIRST outcome per team name, so the
    // balanced ±0.5 pair must land in front — both sides of the SAME line.
    $flat = [[
        'key' => 'spreads_1st_5_innings',
        'outcomes' => [
            lad('Washington', 0.0, 1.8403, 'pinnacle'),  // PK — dropped
            lad('Washington', 0.5, 1.6289, 'pinnacle'),
            lad('Washington', 1.0, 1.4292, 'pinnacle'),
            lad('Washington', -1.0, 2.51, 'pinnacle'),
            lad('Washington', -0.5, 2.12, 'fanduel'),
            lad('Houston', 0.5, 1.6849, 'fanduel'),
            lad('Houston', 0.0, 2.02, 'pinnacle'),       // PK — dropped
            lad('Houston', 1.0, 1.5319, 'pinnacle'),
            lad('Houston', -0.5, 2.32, 'pinnacle'),
            lad('Houston', -1.0, 2.83, 'pinnacle'),
        ],
    ]];
    $out = RundownEventMapper::dedupeExtendedMarkets($flat, 'baseball_mlb');
    $first = $out[0]['outcomes'][0];
    $second = $out[0]['outcomes'][1];
    // Most balanced complementary pair: W -0.5 (2.12) / H +0.5 (1.6849),
    // price gap 0.435 — smaller than every other ±p pair in the ladder.
    TestRunner::assertEquals('Washington', (string) $first['name'], 'front pair side 1');
    TestRunner::assertEqualsFloat(-0.5, (float) $first['point'], 'front pair is the -0.5 line');
    TestRunner::assertEquals('Houston', (string) $second['name'], 'front pair side 2');
    TestRunner::assertEqualsFloat(0.5, (float) $second['point'], 'front pair is the +0.5 line');
    // First-match-per-name render now shows a coherent two-sided line.
    TestRunner::assertEquals(8, count($out[0]['outcomes']), 'PK rungs gone, everything else kept');
});

TestRunner::run('dedupeExtendedMarkets — ordering never fires for non-spread or non-baseball markets', function (): void {
    $totals = [[
        'key' => 'totals_1st_5_innings',
        'outcomes' => [
            lad('Over', 4.5, 1.87, 'pinnacle'),
            lad('Under', 4.5, 1.95, 'pinnacle'),
        ],
    ]];
    $out = RundownEventMapper::dedupeExtendedMarkets($totals, 'baseball_mlb');
    TestRunner::assertEquals('Over', (string) $out[0]['outcomes'][0]['name'], 'totals order untouched');
});

// Restore the preferred-book env so later suites in this process see the
// original value (no cross-suite leakage).
if ($__origGetenvPB === false) {
    putenv('SPORTSBOOK_PREFERRED_BOOKS');
} else {
    putenv('SPORTSBOOK_PREFERRED_BOOKS=' . $__origGetenvPB);
}
if ($__origEnvPB === null) {
    unset($_ENV['SPORTSBOOK_PREFERRED_BOOKS']);
} else {
    $_ENV['SPORTSBOOK_PREFERRED_BOOKS'] = $__origEnvPB;
}
