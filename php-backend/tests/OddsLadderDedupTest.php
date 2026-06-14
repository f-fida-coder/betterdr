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
