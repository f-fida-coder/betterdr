<?php

declare(strict_types=1);

/**
 * Unit tests for AltLineCap — the house risk cap that trims alternate
 * spread/total ladders to the N rungs nearest the main line, per side. Same
 * logic drives the display filter (MatchesController) and the placement guard
 * (BetsController), so these assertions cover BOTH surfaces.
 */

// Env stub (AltLineCap::perSideLimit reads SPORTSBOOK_ALT_LINES_PER_SIDE).
// This suite loads first alphabetically, so the stub MUST mirror the real
// Env::get (read $_ENV, then getenv, then default) — a default-only stub would
// win the class_exists race and break $_ENV-driven suites (BuyPointsPricing).
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

require_once dirname(__DIR__) . '/src/AltLineCap.php';

/** alt rung */
function alt(string $name, float $point): array
{
    return ['name' => $name, 'point' => $point, 'price' => 1.9, 'book' => 'pinnacle'];
}

/** core (main-line) outcome */
function core(string $name, float $point): array
{
    return ['name' => $name, 'point' => $point];
}

/** the set of points kept for a given name */
function keptPoints(array $outcomes, string $name): array
{
    $pts = [];
    foreach ($outcomes as $o) {
        if (strcasecmp((string) $o['name'], $name) === 0) {
            $pts[] = (float) $o['point'];
        }
    }
    sort($pts);
    return $pts;
}

// ── RUN-LINE spread: reverse + buy-up, main echo excluded ───────────────────
// Toronto @ Boston (main Boston -1.5 / Toronto +1.5). Expected surfaced rungs:
//   Boston +1.5 (reverse), Boston -2.5 (buy-up); Toronto -1.5 (reverse),
//   Toronto +2.5 (buy-up). NEVER the main echo (Boston -1.5 / Toronto +1.5).
TestRunner::run('AltLineCap — run line surfaces reverse + buy-up only', function (): void {
    $alt = [
        alt('Boston', -1.5), alt('Boston', 1.5), alt('Boston', -2.5), alt('Boston', -3.5),
        alt('Toronto', 1.5), alt('Toronto', -1.5), alt('Toronto', 2.5), alt('Toronto', 3.5),
    ];
    $coreM = [core('Boston', -1.5), core('Toronto', 1.5)];
    $out = AltLineCap::capOutcomes($alt, $coreM, 1, 'baseball_mlb', 'spreads');
    TestRunner::assertEquals([-2.5, 1.5], keptPoints($out, 'Boston'), 'Boston reverse +1.5 & buy-up -2.5; no -1.5 echo');
    TestRunner::assertEquals([-1.5, 2.5], keptPoints($out, 'Toronto'), 'Toronto reverse -1.5 & buy-up +2.5; no +1.5 echo');
    TestRunner::assertEquals(4, count($out), 'exactly two rungs per side');
});

// ── RUN-LINE: a target the feed never priced is omitted (no synthesis) ───────
TestRunner::run('AltLineCap — run line omits an unpriced target', function (): void {
    // Feed has Boston +1.5 (reverse) but NOT Boston -2.5 (buy-up) → only +1.5.
    $alt = [alt('Boston', -1.5), alt('Boston', 1.5)];
    $out = AltLineCap::capOutcomes($alt, [core('Boston', -1.5)], 1, 'baseball_mlb', 'spreads');
    TestRunner::assertEquals([1.5], keptPoints($out, 'Boston'), 'only the priced reverse survives');
});

// ── VARIABLE spread (NFL): nearest genuine rung above & below, main excluded ─
TestRunner::run('AltLineCap — variable spread keeps one above + one below', function (): void {
    // main Dallas -3; alt -3 echo, -2.5, -1.5, -3.5, -4.5.
    $alt = [alt('Dallas', -3.0), alt('Dallas', -2.5), alt('Dallas', -1.5), alt('Dallas', -3.5), alt('Dallas', -4.5)];
    $out = AltLineCap::capOutcomes($alt, [core('Dallas', -3.0)], 1, 'americanfootball_nfl', 'spreads');
    TestRunner::assertEquals([-3.5, -2.5], keptPoints($out, 'Dallas'), 'nearest below -3.5 & above -2.5; no -3 echo');
});

// ── TOTALS (all sports): one rung above & below main, main excluded ──────────
TestRunner::run('AltLineCap — totals keep one above + one below, no main echo', function (): void {
    $alt = [
        alt('Over', 9.0), alt('Over', 8.5), alt('Over', 9.5), alt('Over', 7.5), alt('Over', 10.5),
        alt('Under', 9.0), alt('Under', 8.5), alt('Under', 9.5), alt('Under', 10.5), alt('Under', 7.5),
    ];
    $coreM = [core('Over', 9.0), core('Under', 9.0)];
    $out = AltLineCap::capOutcomes($alt, $coreM, 1, 'baseball_mlb', 'totals');
    TestRunner::assertEquals([8.5, 9.5], keptPoints($out, 'Over'), 'Over → 8.5 & 9.5, no 9.0');
    TestRunner::assertEquals([8.5, 9.5], keptPoints($out, 'Under'), 'Under → 8.5 & 9.5, no 9.0');
});

// ── perSide=2 (variable) keeps two nearest per direction ─────────────────────
TestRunner::run('AltLineCap — perSide=2 keeps two per direction', function (): void {
    $alt = [alt('Dallas', -1.5), alt('Dallas', -2.5), alt('Dallas', -3.5), alt('Dallas', -4.5)];
    // main -3; below: -3.5,-4.5 ; above: -2.5,-1.5 → all four with perSide=2.
    $out = AltLineCap::capOutcomes($alt, [core('Dallas', -3.0)], 2, 'americanfootball_nfl', 'spreads');
    TestRunner::assertEquals([-4.5, -3.5, -2.5, -1.5], keptPoints($out, 'Dallas'), 'two below + two above');
});

// ── no core main → median fallback still excludes the median rung ────────────
TestRunner::run('AltLineCap — median fallback when no core main', function (): void {
    $alt = [alt('Over', 5.5), alt('Over', 6.5), alt('Over', 7.5), alt('Over', 8.5), alt('Over', 9.5)];
    $out = AltLineCap::capOutcomes($alt, [], 1, 'baseball_mlb', 'totals');  // median = 7.5 (excluded)
    TestRunner::assertEquals([6.5, 8.5], keptPoints($out, 'Over'), 'nearest below 6.5 & above 8.5 around median 7.5');
});

// ── perSide=0 → none; UNLIMITED → unchanged ──────────────────────────────────
TestRunner::run('AltLineCap — 0 drops all, UNLIMITED keeps all', function (): void {
    $alt = [alt('St. Louis', 1.0), alt('St. Louis', 2.5), alt('St. Louis', 3.5)];
    TestRunner::assertEquals(0, count(AltLineCap::capOutcomes($alt, [], 0, 'baseball_mlb', 'spreads')), 'perSide=0 → empty');
    TestRunner::assertEquals(3, count(AltLineCap::capOutcomes($alt, [], AltLineCap::UNLIMITED, 'baseball_mlb', 'spreads')), 'UNLIMITED → all');
});

// ── isPointAllowed mirrors the run-line selection exactly ────────────────────
TestRunner::run('AltLineCap — isPointAllowed matches the kept set', function (): void {
    $alt = [alt('Boston', -1.5), alt('Boston', 1.5), alt('Boston', -2.5), alt('Boston', -3.5)];
    $coreM = [core('Boston', -1.5)];
    TestRunner::assertTrue(AltLineCap::isPointAllowed('Boston', 1.5, $alt, $coreM, 1, 'baseball_mlb', 'spreads'), 'reverse allowed');
    TestRunner::assertTrue(AltLineCap::isPointAllowed('Boston', -2.5, $alt, $coreM, 1, 'baseball_mlb', 'spreads'), 'buy-up allowed');
    TestRunner::assertFalse(AltLineCap::isPointAllowed('Boston', -1.5, $alt, $coreM, 1, 'baseball_mlb', 'spreads'), 'main echo rejected');
    TestRunner::assertFalse(AltLineCap::isPointAllowed('Boston', -3.5, $alt, $coreM, 1, 'baseball_mlb', 'spreads'), 'far rung rejected');
    TestRunner::assertTrue(AltLineCap::isPointAllowed('Boston', -3.5, $alt, $coreM, AltLineCap::UNLIMITED, 'baseball_mlb', 'spreads'), 'unlimited allows any offered rung');
    TestRunner::assertFalse(AltLineCap::isPointAllowed('Boston', -1.5, $alt, $coreM, 0, 'baseball_mlb', 'spreads'), 'perSide=0 allows none');
    TestRunner::assertFalse(AltLineCap::isPointAllowed('Boston', 9.5, $alt, $coreM, 1, 'baseball_mlb', 'spreads'), 'point not on the ladder at all → rejected');
});

// ── perSideLimit: settings > env > default; negative → UNLIMITED ─────────────
TestRunner::run('AltLineCap — perSideLimit resolution order', function (): void {
    $origGetenv = getenv('SPORTSBOOK_ALT_LINES_PER_SIDE');
    $origEnv = $_ENV['SPORTSBOOK_ALT_LINES_PER_SIDE'] ?? null;

    putenv('SPORTSBOOK_ALT_LINES_PER_SIDE');
    unset($_ENV['SPORTSBOOK_ALT_LINES_PER_SIDE']);
    TestRunner::assertEquals(AltLineCap::DEFAULT_PER_SIDE, AltLineCap::perSideLimit(null), 'no setting/env → default 1');
    TestRunner::assertEquals(3, AltLineCap::perSideLimit(['alternateLinesPerSide' => 3]), 'settings wins');
    TestRunner::assertEquals(AltLineCap::UNLIMITED, AltLineCap::perSideLimit(['alternateLinesPerSide' => -1]), 'negative → UNLIMITED');

    putenv('SPORTSBOOK_ALT_LINES_PER_SIDE=2');
    $_ENV['SPORTSBOOK_ALT_LINES_PER_SIDE'] = '2';
    TestRunner::assertEquals(2, AltLineCap::perSideLimit(null), 'env fallback when no setting');
    TestRunner::assertEquals(5, AltLineCap::perSideLimit(['alternateLinesPerSide' => 5]), 'settings still overrides env');

    // restore
    if ($origGetenv === false) { putenv('SPORTSBOOK_ALT_LINES_PER_SIDE'); }
    else { putenv('SPORTSBOOK_ALT_LINES_PER_SIDE=' . $origGetenv); }
    if ($origEnv === null) { unset($_ENV['SPORTSBOOK_ALT_LINES_PER_SIDE']); }
    else { $_ENV['SPORTSBOOK_ALT_LINES_PER_SIDE'] = $origEnv; }
});

// ── key helpers ──────────────────────────────────────────────────────────────
TestRunner::run('AltLineCap — key helpers', function (): void {
    TestRunner::assertTrue(AltLineCap::isAltKey('alternate_spreads'), 'alternate_ is alt');
    TestRunner::assertFalse(AltLineCap::isAltKey('spreads'), 'core is not alt');
    TestRunner::assertEquals('spreads', AltLineCap::coreKeyFor('alternate_spreads'), 'core key strip');
    TestRunner::assertEquals('totals_1st_5_innings', AltLineCap::coreKeyFor('alternate_totals_1st_5_innings'), 'period core key strip');
});

// ── totals get a wider per-side cap than spreads ─────────────────────────────
TestRunner::run('AltLineCap — totals cap wider than spreads; key-aware resolver', function (): void {
    $origGetTotals = getenv('SPORTSBOOK_ALT_TOTALS_PER_SIDE');
    $origEnvTotals = $_ENV['SPORTSBOOK_ALT_TOTALS_PER_SIDE'] ?? null;
    $origGetSpread = getenv('SPORTSBOOK_ALT_LINES_PER_SIDE');
    $origEnvSpread = $_ENV['SPORTSBOOK_ALT_LINES_PER_SIDE'] ?? null;
    putenv('SPORTSBOOK_ALT_TOTALS_PER_SIDE'); unset($_ENV['SPORTSBOOK_ALT_TOTALS_PER_SIDE']);
    putenv('SPORTSBOOK_ALT_LINES_PER_SIDE'); unset($_ENV['SPORTSBOOK_ALT_LINES_PER_SIDE']);

    // Defaults: totals (4) > spreads (1).
    TestRunner::assertEquals(AltLineCap::DEFAULT_TOTALS_PER_SIDE, AltLineCap::totalsPerSideLimit(null), 'totals default 4');
    TestRunner::assertTrue(AltLineCap::DEFAULT_TOTALS_PER_SIDE > AltLineCap::DEFAULT_PER_SIDE, 'totals wider than spreads');

    // Key-aware resolver: game totals → totals cap; spreads/team_totals → spread cap.
    TestRunner::assertEquals(AltLineCap::DEFAULT_TOTALS_PER_SIDE, AltLineCap::perSideLimitForKey(null, 'alternate_totals'), 'alternate_totals → totals cap');
    TestRunner::assertEquals(AltLineCap::DEFAULT_TOTALS_PER_SIDE, AltLineCap::perSideLimitForKey(null, 'alternate_totals_1st_5_innings'), 'period total → totals cap');
    TestRunner::assertEquals(AltLineCap::DEFAULT_PER_SIDE, AltLineCap::perSideLimitForKey(null, 'alternate_spreads'), 'alternate_spreads → spread cap');
    TestRunner::assertEquals(AltLineCap::DEFAULT_PER_SIDE, AltLineCap::perSideLimitForKey(null, 'alternate_team_totals'), 'team_totals → spread cap (not game totals)');

    // settings > env > default for totals.
    TestRunner::assertEquals(6, AltLineCap::totalsPerSideLimit(['alternateTotalsPerSide' => 6]), 'totals settings wins');
    putenv('SPORTSBOOK_ALT_TOTALS_PER_SIDE=5'); $_ENV['SPORTSBOOK_ALT_TOTALS_PER_SIDE'] = '5';
    TestRunner::assertEquals(5, AltLineCap::totalsPerSideLimit(null), 'totals env fallback');

    if ($origGetTotals === false) { putenv('SPORTSBOOK_ALT_TOTALS_PER_SIDE'); } else { putenv('SPORTSBOOK_ALT_TOTALS_PER_SIDE=' . $origGetTotals); }
    if ($origEnvTotals === null) { unset($_ENV['SPORTSBOOK_ALT_TOTALS_PER_SIDE']); } else { $_ENV['SPORTSBOOK_ALT_TOTALS_PER_SIDE'] = $origEnvTotals; }
    if ($origGetSpread === false) { putenv('SPORTSBOOK_ALT_LINES_PER_SIDE'); } else { putenv('SPORTSBOOK_ALT_LINES_PER_SIDE=' . $origGetSpread); }
    if ($origEnvSpread === null) { unset($_ENV['SPORTSBOOK_ALT_LINES_PER_SIDE']); } else { $_ENV['SPORTSBOOK_ALT_LINES_PER_SIDE'] = $origEnvSpread; }
});
