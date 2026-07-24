<?php

declare(strict_types=1);

/**
 * Unit tests for the far-game Pinnacle sharp-move watch (tiered-prematch
 * safeguard, 2026-07-24). Two pure pieces:
 *   RundownEventMapper::pinnacleMainline  — pull Pinnacle's main line out of
 *                                           the multi-book odds.bookmakers
 *   RundownSyncService::pinnacleMoveExceeds — threshold test that decides
 *                                           whether to trigger a full refresh
 *
 * Locks: only Pinnacle is read; a first pass (no baseline) never triggers;
 * spread/total moves ≥ threshold trigger; ML compares in American cents off
 * DECIMAL prices; missing dimensions are skipped, not treated as a move.
 */

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/RundownEventMapper.php';
require_once __DIR__ . '/../src/RundownSyncService.php';

// Build an odds.bookmakers array with a Pinnacle book carrying the given
// home spread, total, and home/away DECIMAL moneylines (+ a decoy book that
// must be ignored).
$books = static function (float $homeSpread, float $total, float $mlHome, float $mlAway): array {
    return [
        ['key' => 'draftkings', 'markets' => [ // decoy — must be ignored
            'spreads' => ['prematch' => [['name' => 'Lakers', 'point' => -9.0, 'price' => 1.9]]],
        ]],
        ['key' => 'pinnacle', 'markets' => [
            'spreads' => ['prematch' => [
                ['name' => 'Lakers', 'point' => $homeSpread, 'price' => 1.91],
                ['name' => 'Celtics', 'point' => -$homeSpread, 'price' => 1.91],
            ]],
            'totals' => ['prematch' => [
                ['name' => 'Lakers Over', 'point' => $total, 'price' => 1.95],
                ['name' => 'Lakers Under', 'point' => $total, 'price' => 1.87],
            ]],
            'h2h' => ['prematch' => [
                ['name' => 'Lakers', 'price' => $mlHome],
                ['name' => 'Celtics', 'price' => $mlAway],
            ]],
        ]],
    ];
};

TestRunner::run('pinnacleMainline — extracts Pinnacle only, resolves home/away', function () use ($books): void {
    $m = RundownEventMapper::pinnacleMainline($books(-3.5, 220.5, 1.83, 2.05), 'Lakers', 'Celtics');
    TestRunner::assertEquals(-3.5, $m['spread'], 'home spread from Pinnacle (not the -9 decoy)');
    TestRunner::assertEquals(220.5, $m['total'], 'game total');
    TestRunner::assertEquals(1.83, $m['mlHome'], 'home moneyline (decimal)');
    TestRunner::assertEquals(2.05, $m['mlAway'], 'away moneyline (decimal)');
});

TestRunner::run('pinnacleMainline — no Pinnacle book → all null', function (): void {
    $only = [['key' => 'fanduel', 'markets' => ['spreads' => ['prematch' => [['name' => 'Lakers', 'point' => -3.0]]]]]];
    $m = RundownEventMapper::pinnacleMainline($only, 'Lakers', 'Celtics');
    TestRunner::assertEquals(null, $m['spread'], 'no pinnacle → null spread');
    TestRunner::assertEquals(null, $m['mlHome'], 'no pinnacle → null ml');
});

TestRunner::run('pinnacleMoveExceeds — first pass (no baseline) never triggers', function () use ($books): void {
    $curr = RundownEventMapper::pinnacleMainline($books(-3.5, 220.5, 1.83, 2.05), 'Lakers', 'Celtics');
    TestRunner::assertTrue(!RundownSyncService::pinnacleMoveExceeds([], $curr), 'empty baseline → no trigger');
});

TestRunner::run('pinnacleMoveExceeds — spread / total moves', function () use ($books): void {
    $prev = RundownEventMapper::pinnacleMainline($books(-3.5, 220.5, 1.83, 2.05), 'Lakers', 'Celtics');
    // Spread -3.5 → -4.5 (1.0 move) at default threshold 1.0 → trigger.
    $spMove = RundownEventMapper::pinnacleMainline($books(-4.5, 220.5, 1.83, 2.05), 'Lakers', 'Celtics');
    TestRunner::assertTrue(RundownSyncService::pinnacleMoveExceeds($prev, $spMove), '1.0 spread move → trigger');
    // Spread -3.5 → -4.0 (0.5) → no trigger.
    $spSmall = RundownEventMapper::pinnacleMainline($books(-4.0, 220.5, 1.83, 2.05), 'Lakers', 'Celtics');
    TestRunner::assertTrue(!RundownSyncService::pinnacleMoveExceeds($prev, $spSmall), '0.5 spread move → no trigger');
    // Total 220.5 → 221.5 (1.0) → trigger.
    $toMove = RundownEventMapper::pinnacleMainline($books(-3.5, 221.5, 1.83, 2.05), 'Lakers', 'Celtics');
    TestRunner::assertTrue(RundownSyncService::pinnacleMoveExceeds($prev, $toMove), '1.0 total move → trigger');
    // Total 220.5 → 221.0 (0.5) → no trigger.
    $toSmall = RundownEventMapper::pinnacleMainline($books(-3.5, 221.0, 1.83, 2.05), 'Lakers', 'Celtics');
    TestRunner::assertTrue(!RundownSyncService::pinnacleMoveExceeds($prev, $toSmall), '0.5 total move → no trigger');
});

TestRunner::run('pinnacleMoveExceeds — moneyline cents move (decimal→American)', function () use ($books): void {
    // -120 (dec 1.833) → -140 (dec 1.714): 20-cent move ≥ 15 → trigger.
    $prev = RundownEventMapper::pinnacleMainline($books(-3.5, 220.5, 1.833, 2.05), 'Lakers', 'Celtics');
    $mlBig = RundownEventMapper::pinnacleMainline($books(-3.5, 220.5, 1.714, 2.05), 'Lakers', 'Celtics');
    TestRunner::assertTrue(RundownSyncService::pinnacleMoveExceeds($prev, $mlBig), '~20-cent ML move → trigger');
    // -120 (1.833) → -125 (1.80): ~5-cent move < 15 → no trigger.
    $mlSmall = RundownEventMapper::pinnacleMainline($books(-3.5, 220.5, 1.80, 2.05), 'Lakers', 'Celtics');
    TestRunner::assertTrue(!RundownSyncService::pinnacleMoveExceeds($prev, $mlSmall), '~5-cent ML move → no trigger');
});

TestRunner::run('pinnacleMoveExceeds — missing dimension is skipped, not a move', function (): void {
    // Baseline has spread; current lost its Pinnacle spread quote → skip that
    // dimension (no false trigger), and nothing else moved.
    $prev = ['spread' => -3.5, 'total' => 220.5, 'mlHome' => 1.83, 'mlAway' => 2.05];
    $curr = ['spread' => null, 'total' => 220.5, 'mlHome' => 1.83, 'mlAway' => 2.05];
    TestRunner::assertTrue(!RundownSyncService::pinnacleMoveExceeds($prev, $curr), 'dropped spread quote → no trigger');
});
