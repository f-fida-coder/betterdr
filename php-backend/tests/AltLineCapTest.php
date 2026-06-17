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

// ── perSide=1 keeps the single rung nearest each side's main line ────────────
TestRunner::run('AltLineCap — keeps 1 rung nearest main per side', function (): void {
    $alt = [
        alt('St. Louis', 1.0), alt('St. Louis', 2.5), alt('St. Louis', 3.5), alt('St. Louis', -0.5),
        alt('San Diego', -1.0), alt('San Diego', -2.5), alt('San Diego', -3.5), alt('San Diego', 0.5),
    ];
    $coreM = [core('St. Louis', 1.5), core('San Diego', -1.5)];
    $out = AltLineCap::capOutcomes($alt, $coreM, 1);
    TestRunner::assertEquals(2, count($out), 'one rung per team');
    TestRunner::assertEquals([1.0], keptPoints($out, 'St. Louis'), 'St. Louis nearest +1.5 is +1.0');
    TestRunner::assertEquals([-1.0], keptPoints($out, 'San Diego'), 'San Diego nearest -1.5 is -1.0');
});

// ── perSide=2 keeps the two nearest per side ─────────────────────────────────
TestRunner::run('AltLineCap — perSide=2 keeps two nearest', function (): void {
    $alt = [alt('St. Louis', 1.0), alt('St. Louis', 2.5), alt('St. Louis', 3.5), alt('St. Louis', -0.5)];
    $coreM = [core('St. Louis', 1.5)];
    $out = AltLineCap::capOutcomes($alt, $coreM, 2);
    TestRunner::assertEquals([1.0, 2.5], keptPoints($out, 'St. Louis'), 'two nearest +1.5 → +1.0, +2.5');
});

// ── tie nearest-distance breaks toward pick'em (smaller |point|) ─────────────
TestRunner::run('AltLineCap — distance tie breaks toward pick\'em', function (): void {
    // main +1.5; +0.5 and +2.5 are both 1.0 away → keep +0.5 (smaller |point|)
    $alt = [alt('St. Louis', 0.5), alt('St. Louis', 2.5)];
    $out = AltLineCap::capOutcomes($alt, [core('St. Louis', 1.5)], 1);
    TestRunner::assertEquals([0.5], keptPoints($out, 'St. Louis'), 'tie → +0.5');
});

// ── totals cap per Over/Under side ───────────────────────────────────────────
TestRunner::run('AltLineCap — totals keep nearest per O/U side', function (): void {
    $alt = [
        alt('Over', 8.5), alt('Over', 7.5), alt('Over', 10.5),
        alt('Under', 9.5), alt('Under', 10.5), alt('Under', 7.5),
    ];
    $coreM = [core('Over', 9.0), core('Under', 9.0)];
    $out = AltLineCap::capOutcomes($alt, $coreM, 1);
    TestRunner::assertEquals([8.5], keptPoints($out, 'Over'), 'Over nearest 9.0 is 8.5');
    TestRunner::assertEquals([9.5], keptPoints($out, 'Under'), 'Under nearest 9.0 is 9.5');
});

// ── no core main → median fallback still caps the count ──────────────────────
TestRunner::run('AltLineCap — median fallback when no core main', function (): void {
    $alt = [alt('Over', 5.5), alt('Over', 6.5), alt('Over', 7.5), alt('Over', 8.5), alt('Over', 9.5)];
    $out = AltLineCap::capOutcomes($alt, [], 1);  // median = 7.5
    TestRunner::assertEquals([7.5], keptPoints($out, 'Over'), 'median 7.5 kept');
});

// ── perSide=0 → none; UNLIMITED → unchanged ──────────────────────────────────
TestRunner::run('AltLineCap — 0 drops all, UNLIMITED keeps all', function (): void {
    $alt = [alt('St. Louis', 1.0), alt('St. Louis', 2.5), alt('St. Louis', 3.5)];
    TestRunner::assertEquals(0, count(AltLineCap::capOutcomes($alt, [], 0)), 'perSide=0 → empty');
    TestRunner::assertEquals(3, count(AltLineCap::capOutcomes($alt, [], AltLineCap::UNLIMITED)), 'UNLIMITED → all');
});

// ── isPointAllowed mirrors the display cap exactly ───────────────────────────
TestRunner::run('AltLineCap — isPointAllowed matches the kept set', function (): void {
    $alt = [alt('St. Louis', 1.0), alt('St. Louis', 2.5), alt('St. Louis', 3.5)];
    $coreM = [core('St. Louis', 1.5)];
    TestRunner::assertTrue(AltLineCap::isPointAllowed('St. Louis', 1.0, $alt, $coreM, 1), 'kept rung allowed');
    TestRunner::assertFalse(AltLineCap::isPointAllowed('St. Louis', 3.5, $alt, $coreM, 1), 'capped rung rejected');
    TestRunner::assertTrue(AltLineCap::isPointAllowed('St. Louis', 3.5, $alt, $coreM, AltLineCap::UNLIMITED), 'unlimited allows any offered rung');
    TestRunner::assertFalse(AltLineCap::isPointAllowed('St. Louis', 1.0, $alt, $coreM, 0), 'perSide=0 allows none');
    TestRunner::assertFalse(AltLineCap::isPointAllowed('St. Louis', 9.5, $alt, $coreM, 1), 'point not on the ladder at all → rejected');
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
