<?php

declare(strict_types=1);

/**
 * Unit tests for SportsbookHealth::farLineStaleReason — the money-side
 * safeguard for the tiered prematch cadence (2026-07-24). A far-tier
 * (2+ days out) prematch game whose full line has aged past
 * PREMATCH_FAR_STALE_CEILING_SECONDS must be SUSPENDED for new bets; near
 * games, live/started games, and fresh far games must stay bettable.
 *
 * Pure decision logic (nowTs injected — no wall clock). Locks the contract:
 *  - only FUTURE, far-tier games can ever be blocked (true→false only);
 *  - the ceiling is a strict >, measured off the last FULL-line stamp
 *    (linesRefreshedAt, falling back to lastOddsSyncAt/lastUpdated);
 *  - env-configurable (PREMATCH_NEAR_DAYS / PREMATCH_FAR_STALE_CEILING_SECONDS).
 */

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/SportsbookHealth.php';

// Deterministic clock + helpers. Stamps are ISO-8601 like the real docs.
$NOW = 1_800_000_000;
$iso = static fn (int $ts): string => gmdate(DATE_ATOM, $ts);

// A far-tier prematch game (kicks off 3 days out) with a line stamped
// `$ageSeconds` ago via `linesRefreshedAt`.
$farGame = static function (int $ageSeconds, array $extra = []) use ($NOW, $iso): array {
    return array_merge([
        'startTime'        => $iso($NOW + 3 * 86400),
        'status'           => 'scheduled',
        'linesRefreshedAt' => $iso($NOW - $ageSeconds),
    ], $extra);
};

// Ensure defaults (no env override leaking in from a loaded .env into $_ENV).
unset($_ENV['PREMATCH_NEAR_DAYS'], $_ENV['PREMATCH_FAR_STALE_CEILING_SECONDS']);
putenv('PREMATCH_NEAR_DAYS');
putenv('PREMATCH_FAR_STALE_CEILING_SECONDS');

TestRunner::run('farLineStaleReason — far game past the ceiling is suspended', function () use ($farGame, $NOW): void {
    // Default ceiling = 600s.
    TestRunner::assertTrue(SportsbookHealth::farLineStaleReason($farGame(700), $NOW) !== null, '700s old far line → suspended');
    TestRunner::assertTrue(SportsbookHealth::farLineStaleReason($farGame(601), $NOW) !== null, 'just over ceiling → suspended');
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason($farGame(600), $NOW), 'exactly at ceiling → still ok (strict >)');
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason($farGame(120), $NOW), 'fresh far line → ok');
});

TestRunner::run('farLineStaleReason — near games are never far-stale', function () use ($iso, $NOW): void {
    // Kicks off in 1 day (< nearDays=2) with a very old line — near cadence
    // owns it, so this gate must not fire.
    $near = ['startTime' => $iso($NOW + 86400), 'status' => 'scheduled', 'linesRefreshedAt' => $iso($NOW - 99999)];
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason($near, $NOW), 'near game with old line → not this gate');
    // Exactly at the near boundary (2 days) is still near (<=), not far.
    $boundary = ['startTime' => $iso($NOW + 2 * 86400), 'status' => 'scheduled', 'linesRefreshedAt' => $iso($NOW - 99999)];
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason($boundary, $NOW), 'exactly nearDays out → still near');
});

TestRunner::run('farLineStaleReason — live/started/finished games are excluded', function () use ($farGame, $iso, $NOW): void {
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason($farGame(700, ['status' => 'live']), $NOW), 'live → live gate owns it');
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason($farGame(700, ['status' => 'finished']), $NOW), 'finished → excluded');
    // Kickoff already in the past → not a future far game.
    $started = ['startTime' => $iso($NOW - 3600), 'status' => 'scheduled', 'linesRefreshedAt' => $iso($NOW - 99999)];
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason($started, $NOW), 'started game → not future-far');
});

TestRunner::run('farLineStaleReason — timestamp source + fail-open', function () use ($iso, $NOW): void {
    // Prefers linesRefreshedAt: fresh full-line stamp even though lastUpdated
    // is ancient (e.g. bumped by a Pinnacle-watch narrow write) → ok.
    $watchOnly = [
        'startTime' => $iso($NOW + 3 * 86400), 'status' => 'scheduled',
        'linesRefreshedAt' => $iso($NOW - 120), 'lastUpdated' => $iso($NOW - 99999),
    ];
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason($watchOnly, $NOW), 'fresh linesRefreshedAt wins over old lastUpdated');
    // Falls back to lastOddsSyncAt when linesRefreshedAt absent (pre-deploy docs).
    $legacy = ['startTime' => $iso($NOW + 3 * 86400), 'status' => 'scheduled', 'lastOddsSyncAt' => $iso($NOW - 700)];
    TestRunner::assertTrue(SportsbookHealth::farLineStaleReason($legacy, $NOW) !== null, 'falls back to lastOddsSyncAt → suspended when old');
    // No schedule anchor / no stamp at all → fail open (never blocks).
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason(['status' => 'scheduled'], $NOW), 'no startTime → null');
    $noStamp = ['startTime' => $iso($NOW + 3 * 86400), 'status' => 'scheduled'];
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason($noStamp, $NOW), 'no line stamp → fail open');
});

TestRunner::run('farLineStaleReason — env-configurable thresholds', function () use ($farGame, $iso, $NOW): void {
    putenv('PREMATCH_FAR_STALE_CEILING_SECONDS=300');
    $_ENV['PREMATCH_FAR_STALE_CEILING_SECONDS'] = '300';
    TestRunner::assertTrue(SportsbookHealth::farLineStaleReason($farGame(400), $NOW) !== null, 'ceiling=300 → 400s old suspended');
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason($farGame(200), $NOW), 'ceiling=300 → 200s old ok');
    putenv('PREMATCH_FAR_STALE_CEILING_SECONDS');
    unset($_ENV['PREMATCH_FAR_STALE_CEILING_SECONDS']);

    // Widen near window to 4 days → a 3-day-out game becomes NEAR, not far.
    putenv('PREMATCH_NEAR_DAYS=4');
    $_ENV['PREMATCH_NEAR_DAYS'] = '4';
    TestRunner::assertEquals(null, SportsbookHealth::farLineStaleReason($farGame(9999), $NOW), 'nearDays=4 → 3-day game is near');
    putenv('PREMATCH_NEAR_DAYS');
    unset($_ENV['PREMATCH_NEAR_DAYS']);
});
