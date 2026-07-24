<?php

declare(strict_types=1);

/**
 * Unit tests for PrematchProbe — the pure parsing/window logic behind the
 * active-sports discovery probe (2026-07-24). The probe replaces the old
 * "short active list → full-catalog prematch blast" fallback: it reads the
 * cheap dates-only endpoint and promotes a missing configured sport only once
 * it has a game inside the lookahead window.
 *
 * Locks: both /sports/dates response shapes parse; ISO datetimes truncate to
 * the date; the window test is inclusive on both ends and correct for
 * zero-padded dates.
 */

require_once __DIR__ . '/../src/PrematchProbe.php';

TestRunner::run('datesFromResponse — top-level {dates:[...]} shape', function (): void {
    $resp = ['dates' => ['2026-07-25', '2026-07-28']];
    TestRunner::assertEquals(['2026-07-25', '2026-07-28'], PrematchProbe::datesFromResponse($resp, 2), 'flat dates list');
});

TestRunner::run('datesFromResponse — sport-id-keyed {"2":{dates:[...]}} shape', function (): void {
    $resp = ['2' => ['dates' => ['2026-07-26T00:00:00Z', '2026-07-27']]];
    TestRunner::assertEquals(['2026-07-26', '2026-07-27'], PrematchProbe::datesFromResponse($resp, 2), 'keyed dates, ISO truncated to date');
});

TestRunner::run('datesFromResponse — junk / empty → empty list', function (): void {
    TestRunner::assertEquals([], PrematchProbe::datesFromResponse(null, 2), 'null → []');
    TestRunner::assertEquals([], PrematchProbe::datesFromResponse(['nope' => 1], 2), 'no dates bucket → []');
    TestRunner::assertEquals([], PrematchProbe::datesFromResponse(['dates' => ['', 3, null]], 2), 'non-string entries dropped');
});

TestRunner::run('hasUpcomingWithin — inclusive window', function (): void {
    $today = '2026-07-24';
    $cutoff = '2026-07-28'; // 4-day lookahead
    TestRunner::assertTrue(PrematchProbe::hasUpcomingWithin(['2026-07-26'], $today, $cutoff), 'inside window → true');
    TestRunner::assertTrue(PrematchProbe::hasUpcomingWithin(['2026-07-24'], $today, $cutoff), 'today (lower bound) → true');
    TestRunner::assertTrue(PrematchProbe::hasUpcomingWithin(['2026-07-28'], $today, $cutoff), 'cutoff (upper bound) → true');
    TestRunner::assertTrue(!PrematchProbe::hasUpcomingWithin(['2026-07-29'], $today, $cutoff), 'past cutoff → false');
    TestRunner::assertTrue(!PrematchProbe::hasUpcomingWithin(['2026-07-23'], $today, $cutoff), 'yesterday → false');
    TestRunner::assertTrue(!PrematchProbe::hasUpcomingWithin([], $today, $cutoff), 'no dates → false');
    // Mixed: one out-of-window and one in-window → promoted.
    TestRunner::assertTrue(PrematchProbe::hasUpcomingWithin(['2026-09-01', '2026-07-25'], $today, $cutoff), 'any in-window date → true');
});
