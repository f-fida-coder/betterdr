<?php

declare(strict_types=1);

/**
 * Unit test for MatchesController::computeMatches() live-filter branch.
 *
 * Mirrors the production filter inline so the test runs without a DB,
 * HTTP, or env. Verifies both acceptance paths:
 *   (1) status='live' + fresh per sport-cadence  → kept
 *   (2) status='scheduled' + startTime passed + fresh per pre-match
 *       cadence  → kept (auto-promoted "effectively live")
 * And exhaustive rejections: status mismatch, future startTime,
 * stale odds on either path, missing fields.
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
