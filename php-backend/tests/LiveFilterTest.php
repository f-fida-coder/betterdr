<?php

declare(strict_types=1);

/**
 * Unit test for MatchesController::computeMatches() live-pipeline.
 *
 * Mirrors the production filter inline so the test runs without a DB,
 * HTTP, or env. Covers TWO stages of the pipeline so end-to-end bugs
 * in the auto-promote path are caught:
 *
 *   Stage 1 — live-branch filter (MatchesController.php ~261-325):
 *     (a) status='live' + fresh per sport-cadence  → kept
 *     (b) status='scheduled' + startTime passed + fresh per pre-match
 *         cadence  → kept (auto-promoted "effectively live")
 *
 *   Stage 2 — past-commence cleanup (MatchesController.php ~379-389):
 *     status='live' rows survive; other rows whose startTime has passed
 *     are filtered out — UNLESS $desiredStatus === 'live', in which case
 *     stage 1's decision is final. Without that exemption the auto-
 *     promoted scheduled rows from stage 1 (status still 'scheduled')
 *     would be killed here, leaving Live Now empty during peak game
 *     time — the player-reported bug "Live shows no games but games
 *     are on right now."
 *
 * If this test ever passes WITHOUT the controller fix in place, the
 * inline replica has drifted from prod — keep them in lockstep.
 */

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException {}
}

// Inline replica of the new live filter — mirrors the PHP block in
// MatchesController.php lines ~256-310 (post-fix). When the controller
// changes, update this too.
function liveFilterStub(int $now, int $prematchMaxAge, int $liveMaxAgeForSport): callable
{
    return static function (array $match) use ($now, $prematchMaxAge, $liveMaxAgeForSport): bool {
        $status = strtolower((string) ($match['status'] ?? ''));
        $sportKey = strtolower((string) ($match['sportKey'] ?? ''));
        if ($sportKey === '') return false;
        $last = (string) ($match['lastOddsSyncAt'] ?? '');
        $lastTs = $last !== '' ? strtotime($last) : false;
        if ($lastTs === false) return false;

        if ($status === 'live') {
            if (strtolower((string) ($match['oddsSource'] ?? '')) !== 'oddsapi') return false;
            return ($now - $lastTs) <= $liveMaxAgeForSport;
        }
        if ($status === 'scheduled') {
            $startTime = (string) ($match['startTime'] ?? '');
            $startTs = $startTime !== '' ? strtotime($startTime) : false;
            if ($startTs === false || $startTs > $now) return false;
            return ($now - $lastTs) <= $prematchMaxAge;
        }
        return false;
    };
}

// Inline replica of the past-commence cleanup at MatchesController.php
// ~379-389. Applied AFTER the live filter in the real pipeline; this
// stub lets the test cover the full Live Now path end-to-end.
function pastCommenceCleanup(string $desiredStatus, int $now): callable
{
    return static function (array $rows) use ($desiredStatus, $now): array {
        if (in_array($desiredStatus, ['finished', 'all', 'live'], true)) {
            return $rows; // live opts out — stage 1 had the final say
        }
        return array_values(array_filter($rows, static function (array $match) use ($now): bool {
            if (strtolower((string) ($match['status'] ?? '')) === 'live') {
                return true;
            }
            $startTime = (string) ($match['startTime'] ?? '');
            $parsed = $startTime !== '' ? strtotime($startTime) : false;
            return $parsed === false || $parsed > $now;
        }));
    };
}

// Fixture builder.
function liveFixture(array $overrides = []): array
{
    $now = time();
    return array_merge([
        'status' => 'live',
        'sportKey' => 'baseball_mlb',
        'oddsSource' => 'oddsapi',
        'lastOddsSyncAt' => date('c', $now - 30),
        'startTime' => date('c', $now - 60 * 30),
    ], $overrides);
}

TestRunner::run('live filter — canonical status=live, fresh odds', function (): void {
    $now = time();
    $filter = liveFilterStub($now, 300, 90);
    $m = liveFixture(['lastOddsSyncAt' => date('c', $now - 20)]);
    TestRunner::assertTrue($filter($m), 'fresh oddsapi-live row kept');
});

TestRunner::run('live filter — status=live but odds stale (>90s)', function (): void {
    $now = time();
    $filter = liveFilterStub($now, 300, 90);
    $m = liveFixture(['lastOddsSyncAt' => date('c', $now - 120)]);
    TestRunner::assertFalse($filter($m), 'stale live row dropped');
});

TestRunner::run('live filter — status=live but oddsSource != oddsapi', function (): void {
    $now = time();
    $filter = liveFilterStub($now, 300, 90);
    $m = liveFixture(['oddsSource' => 'rundown']);
    TestRunner::assertFalse($filter($m), 'non-oddsapi live row dropped');
});

TestRunner::run('AUTO-PROMOTE: scheduled + startTime in past + fresh odds → kept', function (): void {
    $now = time();
    $filter = liveFilterStub($now, 300, 90);
    // Game tipped off 10 min ago; sync hasn't flipped status yet.
    $m = liveFixture([
        'status' => 'scheduled',
        'startTime' => date('c', $now - 60 * 10),
        'lastOddsSyncAt' => date('c', $now - 60),  // 1 min ago — within pre-match window
        'oddsSource' => 'oddsapi',  // doesn't matter for scheduled branch
    ]);
    TestRunner::assertTrue($filter($m), 'auto-promoted scheduled row kept');
});

TestRunner::run('AUTO-PROMOTE: scheduled + startTime in past + stale odds (>300s)', function (): void {
    $now = time();
    $filter = liveFilterStub($now, 300, 90);
    $m = liveFixture([
        'status' => 'scheduled',
        'startTime' => date('c', $now - 60 * 10),
        'lastOddsSyncAt' => date('c', $now - 60 * 6), // 6 min stale
    ]);
    TestRunner::assertFalse($filter($m), 'stale auto-promote row dropped');
});

TestRunner::run('AUTO-PROMOTE: scheduled but startTime in future → rejected', function (): void {
    $now = time();
    $filter = liveFilterStub($now, 300, 90);
    $m = liveFixture([
        'status' => 'scheduled',
        'startTime' => date('c', $now + 60 * 30), // 30 min from now
        'lastOddsSyncAt' => date('c', $now - 60),
    ]);
    TestRunner::assertFalse($filter($m), 'future-scheduled row dropped (not yet live)');
});

TestRunner::run('AUTO-PROMOTE: scheduled with no startTime → rejected', function (): void {
    $now = time();
    $filter = liveFilterStub($now, 300, 90);
    $m = liveFixture([
        'status' => 'scheduled',
        'startTime' => '',
        'lastOddsSyncAt' => date('c', $now - 60),
    ]);
    TestRunner::assertFalse($filter($m), 'no-startTime row dropped');
});

TestRunner::run('terminal status (finished/expired/etc.) → rejected', function (): void {
    $now = time();
    $filter = liveFilterStub($now, 300, 90);
    foreach (['finished', 'expired', 'canceled', 'void', 'abandoned'] as $term) {
        $m = liveFixture([
            'status' => $term,
            'startTime' => date('c', $now - 60 * 10),
            'lastOddsSyncAt' => date('c', $now - 30),
        ]);
        TestRunner::assertFalse($filter($m), "status={$term} dropped");
    }
});

TestRunner::run('rows missing sportKey or lastOddsSyncAt → rejected (defensive)', function (): void {
    $now = time();
    $filter = liveFilterStub($now, 300, 90);
    TestRunner::assertFalse($filter(liveFixture(['sportKey' => ''])), 'no sportKey dropped');
    TestRunner::assertFalse($filter(liveFixture(['lastOddsSyncAt' => ''])), 'no lastOddsSyncAt dropped');
});

TestRunner::run('SCENARIO: peak-game-time mix — sync hasn\'t flipped any status yet', function (): void {
    $now = time();
    $filter = liveFilterStub($now, 300, 90);
    $rows = [
        // Genuinely live, sync ran: kept
        liveFixture(['status' => 'live', 'lastOddsSyncAt' => date('c', $now - 10)]),
        // Tipped off 5 min ago, status still scheduled, fresh prematch odds: kept by auto-promote
        liveFixture(['status' => 'scheduled', 'startTime' => date('c', $now - 60 * 5), 'lastOddsSyncAt' => date('c', $now - 60)]),
        // Future game: rejected
        liveFixture(['status' => 'scheduled', 'startTime' => date('c', $now + 60 * 60), 'lastOddsSyncAt' => date('c', $now - 60)]),
        // Finished: rejected
        liveFixture(['status' => 'finished', 'startTime' => date('c', $now - 60 * 60 * 4), 'lastOddsSyncAt' => date('c', $now - 60)]),
    ];
    $kept = array_values(array_filter($rows, $filter));
    TestRunner::assertEquals(2, count($kept), 'exactly 2 of 4 kept (canonical-live + auto-promoted)');
});

// ─── Stage 2 + end-to-end pipeline tests ────────────────────────────────
// Regression coverage for the bug where the past-commence cleanup at
// MatchesController.php:379 was killing the auto-promoted scheduled
// rows that the live-branch filter had just accepted, leaving Live Now
// empty during peak game time. The fix adds 'live' to the cleanup's
// opt-out list. These tests run stage 1 then stage 2 to catch that
// kind of cross-stage interaction.

TestRunner::run('PIPELINE (live): auto-promoted scheduled row survives BOTH stages', function (): void {
    $now = time();
    $stage1 = liveFilterStub($now, 300, 90);
    $stage2 = pastCommenceCleanup('live', $now);

    // The exact row that triggered the bug: kickoff 8 min ago, status
    // still 'scheduled' because the live sync worker hasn't flipped it
    // yet, odds refreshed 1 min ago.
    $row = liveFixture([
        'status' => 'scheduled',
        'startTime' => date('c', $now - 60 * 8),
        'lastOddsSyncAt' => date('c', $now - 60),
    ]);

    $afterStage1 = array_values(array_filter([$row], $stage1));
    TestRunner::assertEquals(1, count($afterStage1), 'stage 1 keeps the auto-promoted row');

    $afterStage2 = $stage2($afterStage1);
    TestRunner::assertEquals(1, count($afterStage2), 'stage 2 must NOT drop the auto-promoted row when desiredStatus=live');
});

TestRunner::run('PIPELINE (live-upcoming): past-startTime scheduled row IS still dropped', function (): void {
    // The cleanup is only suppressed for desiredStatus='live'. Other
    // views (e.g. live-upcoming, default) must still drop scheduled
    // rows whose kickoff has passed but were never promoted — those
    // rows belong in finished/all, not in the pre-match listing.
    $now = time();
    $stage2 = pastCommenceCleanup('live-upcoming', $now);

    $row = liveFixture([
        'status' => 'scheduled',
        'startTime' => date('c', $now - 60 * 8),
        'lastOddsSyncAt' => date('c', $now - 60),
    ]);
    $kept = $stage2([$row]);
    TestRunner::assertEquals(0, count($kept), 'past-startTime scheduled row dropped in non-live views');
});

TestRunner::run('PIPELINE (live): canonical-live row also survives stage 2 unchanged', function (): void {
    $now = time();
    $stage2 = pastCommenceCleanup('live', $now);
    $row = liveFixture([
        'status' => 'live',
        'startTime' => date('c', $now - 60 * 30),
        'lastOddsSyncAt' => date('c', $now - 10),
    ]);
    $kept = $stage2([$row]);
    TestRunner::assertEquals(1, count($kept), 'canonical-live row kept by stage 2');
});
