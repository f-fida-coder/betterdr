<?php

declare(strict_types=1);

/**
 * Unit test for WalletController::getFigures() day-bucketing rule.
 *
 * The figures view used to bucket every transaction by its createdAt.
 * That meant a Tue 9:11 PM CT MLB game settled Wed 10:03 AM CT showed
 * its loss under Wed's row, even though the game itself was Tuesday —
 * surprising for the player. The fix:
 *
 *   For SETTLEMENT bet transactions (bet_won / bet_lost / bet_void /
 *   bet_void_admin / bet_refund), bucket by the linked bet's effective
 *   game time WHEN that game falls inside the displayed week. For
 *   multi-leg tickets the LATEST game's startTime is used (that's the
 *   game whose grading triggered the final settlement).
 *
 *   Cross-week shifts are forbidden — they'd break the invariant
 *   carryForward + weekTotal + transactionsTotal === endBalance, since
 *   the running balance still physically moves on the settlement date.
 *
 *   Non-settlement rows (deposits, casino, placements) keep their old
 *   createdAt bucket.
 *
 * This stub mirrors the production picker so the test runs without a
 * DB. If the controller changes, update this in lockstep.
 */

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException {}
}

// Mirror of WalletController::getFigures() bucket-picker. Inputs are
// pre-resolved unix timestamps so the test stays TZ-independent.
function figuresBucketTs(
    string $txType,
    int $txCreatedTs,
    ?int $betGameStartTs,
    int $weekStartTs,
    int $weekEndTs
): int {
    $SETTLEMENT_BET_TYPES = ['bet_won', 'bet_lost', 'bet_void', 'bet_void_admin', 'bet_refund'];
    $bucketTs = $txCreatedTs;
    if (in_array(strtolower($txType), $SETTLEMENT_BET_TYPES, true)
        && $betGameStartTs !== null
        && $betGameStartTs >= $weekStartTs
        && $betGameStartTs < $weekEndTs
    ) {
        $bucketTs = $betGameStartTs;
    }
    return $bucketTs;
}

// Multi-leg helper: max of the legs' start times, mirroring the
// controller's per-bet game-time computation.
function effectiveGameStartTs(array $legStartTimestamps): ?int
{
    $valid = array_values(array_filter($legStartTimestamps, static fn($t) => is_int($t) && $t > 0));
    if (count($valid) === 0) return null;
    return max($valid);
}

// Tue-anchored week containing the screenshot scenario. CT is UTC-5,
// so the timestamps below are deliberate to keep the math explicit.
// Tue 5/12 00:00 CT == Tue 5/12 05:00 UTC.
$tueStart = strtotime('2026-05-12T05:00:00Z'); // Tue 00:00 CT
$nextTueStart = strtotime('2026-05-19T05:00:00Z'); // following Tue
$tueGameTs = strtotime('2026-05-13T02:11:00Z'); // Tue 9:11 PM CT = Wed 02:11 UTC, but the local TZ bucket is Tue
$wedSettleTs = strtotime('2026-05-13T15:03:00Z'); // Wed 10:03 AM CT = Wed 15:03 UTC

TestRunner::run('figures: settlement bucket SHIFTS to game-time within same week', function () use ($tueStart, $nextTueStart, $tueGameTs, $wedSettleTs): void {
    // The Dodgers scenario from the screenshot.
    $bucket = figuresBucketTs('bet_lost', $wedSettleTs, $tueGameTs, $tueStart, $nextTueStart);
    TestRunner::assertEquals($tueGameTs, $bucket, 'bet_lost bucketed by Tue game-time, not Wed settle-time');

    foreach (['bet_won', 'bet_lost', 'bet_void', 'bet_void_admin', 'bet_refund'] as $t) {
        $b = figuresBucketTs($t, $wedSettleTs, $tueGameTs, $tueStart, $nextTueStart);
        TestRunner::assertEquals($tueGameTs, $b, "{$t} shifts to game-time");
    }
});

TestRunner::run('figures: cross-week settlement keeps the createdAt bucket', function () use ($tueStart, $nextTueStart, $wedSettleTs): void {
    // Operator manually grades on Wed a ticket whose game was 9 days ago
    // (previous accounting week). The settlement transaction still
    // physically moved the balance THIS Wed, so we must not retroactively
    // shift it into the closed week — that would break the invariant
    // carryForward + weekTotal + transactionsTotal == endBalance.
    $oldGameTs = strtotime('2026-05-03T02:00:00Z'); // 9 days before week start
    $bucket = figuresBucketTs('bet_lost', $wedSettleTs, $oldGameTs, $tueStart, $nextTueStart);
    TestRunner::assertEquals($wedSettleTs, $bucket, 'cross-week game falls back to settle-time');

    // Same on the forward boundary — a game from the NEXT week (rare but
    // possible if a partial-leg ticket grades early) stays in the
    // settlement week.
    $futureGameTs = strtotime('2026-05-20T02:00:00Z'); // after week end
    $bucket2 = figuresBucketTs('bet_lost', $wedSettleTs, $futureGameTs, $tueStart, $nextTueStart);
    TestRunner::assertEquals($wedSettleTs, $bucket2, 'future-week game falls back to settle-time');
});

TestRunner::run('figures: settlement with NO known game-time falls back', function () use ($tueStart, $nextTueStart, $wedSettleTs): void {
    // Legacy bet whose matches were deleted / projection missed startTime.
    // We must not crash; we must not put it under day 0 — keep it on
    // its createdAt.
    $bucket = figuresBucketTs('bet_lost', $wedSettleTs, null, $tueStart, $nextTueStart);
    TestRunner::assertEquals($wedSettleTs, $bucket, 'null game-time falls back to settle-time');
});

TestRunner::run('figures: non-settlement rows never shift', function () use ($tueStart, $nextTueStart, $tueGameTs, $wedSettleTs): void {
    // Deposits, withdrawals, placements, casino bets — none of these
    // should be reinterpreted by game-time. Even if a known game-time is
    // somehow passed in, the type guard must reject the shift.
    foreach (['deposit', 'withdrawal', 'bet_placed', 'bet_placed_admin', 'casino_bet_debit', 'casino_bet_credit', 'adjustment'] as $t) {
        $b = figuresBucketTs($t, $wedSettleTs, $tueGameTs, $tueStart, $nextTueStart);
        TestRunner::assertEquals($wedSettleTs, $b, "{$t} stays on createdAt regardless of game-time");
    }
});

TestRunner::run('figures: multi-leg parlay uses the LATEST leg\'s game-time', function (): void {
    // Tue game + Thu game in the same week. The Thu game gates grading,
    // so the parlay should appear under Thu's row, not Tue's.
    $tueLeg = strtotime('2026-05-13T02:11:00Z');   // Tue 9:11 PM CT
    $thuLeg = strtotime('2026-05-15T01:11:00Z');   // Thu 8:11 PM CT
    $latest = effectiveGameStartTs([$tueLeg, $thuLeg]);
    TestRunner::assertEquals($thuLeg, $latest, 'latest leg wins for parlays');

    // Empty legs map to null, not 0 (avoids epoch poisoning).
    TestRunner::assertEquals(null, effectiveGameStartTs([]), 'no legs → null');
    TestRunner::assertEquals(null, effectiveGameStartTs([0, 0]), 'zero/invalid legs → null');
});

TestRunner::run('figures: SCREENSHOT regression (Dodgers Tue game, Wed settle)', function (): void {
    // Re-run the exact scenario from the bug report end-to-end so a
    // future refactor that subtly reorders the guards still trips.
    //   Week: Tue 5/12 → Mon 5/18 (CT-anchored, stored as UTC)
    //   Game: Tue 5/12 09:11 PM CT
    //   Settled: Wed 5/13 10:03 AM CT
    //   Expected bucket: same instant as game start (i.e., Tue locally)
    $weekStart = strtotime('2026-05-12T05:00:00Z'); // Tue 00:00 CT
    $weekEnd = strtotime('2026-05-19T05:00:00Z');
    $gameStart = strtotime('2026-05-13T02:11:00Z'); // Tue 9:11 PM CT
    $settled = strtotime('2026-05-13T15:03:00Z');   // Wed 10:03 AM CT

    $bucket = figuresBucketTs('bet_lost', $settled, $gameStart, $weekStart, $weekEnd);
    TestRunner::assertEquals($gameStart, $bucket, 'Dodgers ticket buckets under the game day, not the settle day');
    // And: the bucket lies on Tuesday in CT, not Wednesday.
    $bucketTueCT = (new DateTimeImmutable('@' . $bucket))->setTimezone(new DateTimeZone('America/Chicago'))->format('D');
    TestRunner::assertEquals('Tue', $bucketTueCT, 'bucket timestamp falls on Tuesday CT');
});
