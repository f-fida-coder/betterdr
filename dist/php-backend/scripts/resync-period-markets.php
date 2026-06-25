<?php

declare(strict_types=1);

/**
 * One-shot FULL-COVERAGE resync for active sports.
 *
 * Triggered manually to seed period markets (Q1-Q4, H1/H2, _1st_N_innings,
 * _pN) and player props into existing matches rows immediately, instead of
 * waiting for the worker's slow full-coverage rotation to come around.
 *
 * Uses syncSportFull (baseQueryParamsFull → core + props + periods), NOT
 * syncSportPrematch (which is core-only and would seed nothing). Requires
 * RUNDOWN_MARKET_IDS_BATCH=true so the ~75 market_ids split into ≤12-ID
 * batches; without batching Rundown 400s the request.
 *
 * Usage:
 *   php php-backend/scripts/resync-period-markets.php
 *   php php-backend/scripts/resync-period-markets.php basketball_nba baseball_mlb
 *
 * No arguments → resyncs every sport that has at least one matches row
 * within +/- 14 days. Explicit sport keys → resyncs only those.
 *
 * Safe to delete after the rollout (worker auto-rotation catches the
 * rest within ~30 minutes anyway).
 */

$phpBackendDir = dirname(__DIR__);
$projectRoot   = dirname($phpBackendDir);

require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
require_once $phpBackendDir . '/src/Logger.php';
require_once $phpBackendDir . '/src/SharedFileCache.php';
require_once $phpBackendDir . '/src/CircuitBreaker.php';
require_once $phpBackendDir . '/src/ConnectionPool.php';
require_once $phpBackendDir . '/src/SqlRepository.php';
require_once $phpBackendDir . '/src/SportsbookHealth.php';
require_once $phpBackendDir . '/src/RundownClient.php';
require_once $phpBackendDir . '/src/RundownSportMap.php';
require_once $phpBackendDir . '/src/RundownAffiliateMap.php';
require_once $phpBackendDir . '/src/RundownMarketMap.php';
require_once $phpBackendDir . '/src/RundownEventMapper.php';
require_once $phpBackendDir . '/src/RundownDeltaCursor.php';
require_once $phpBackendDir . '/src/RundownSyncService.php';

Env::load($projectRoot, $phpBackendDir);
Logger::init($phpBackendDir . '/logs');

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[resync] pdo_mysql extension required\n");
    exit(1);
}
if (!RundownClient::isConfigured()) {
    fwrite(STDERR, "[resync] RUNDOWN_API_KEY missing — nothing to resync\n");
    exit(1);
}

$dbName = (string) Env::get('MYSQL_DB', 'sports_betting');
$repo   = new SqlRepository('', $dbName);

// Resolve sport keys.
$argSports = array_slice($argv, 1);
if ($argSports !== []) {
    $sportKeys = array_map('strtolower', $argSports);
} else {
    $past   = gmdate(DATE_ATOM, time() - (14 * 86400));
    $future = gmdate(DATE_ATOM, time() + (14 * 86400));
    $rows = $repo->findMany('matches', [
        'startTime' => ['$gte' => $past, '$lte' => $future],
    ], ['projection' => ['sportKey' => 1], 'limit' => 5000]);
    $keys = [];
    foreach (is_array($rows) ? $rows : [] as $row) {
        $k = strtolower((string) ($row['sportKey'] ?? ''));
        if ($k !== '') $keys[$k] = true;
    }
    $sportKeys = array_keys($keys);
    sort($sportKeys);
}

if ($sportKeys === []) {
    echo "[resync] no active sports in DB; nothing to do\n";
    exit(0);
}

echo "[resync] resyncing " . count($sportKeys) . " sport(s): " . implode(', ', $sportKeys) . "\n";
$totalCreated = 0;
$totalUpdated = 0;
$totalErrors  = 0;
foreach ($sportKeys as $sportKey) {
    $sportId = RundownSportMap::sportKeyToSportId($sportKey);
    if ($sportId === null) {
        echo "  - {$sportKey}: skipped (no sport_id mapping)\n";
        continue;
    }
    $t0 = microtime(true);
    try {
        $r = RundownSyncService::syncSportFull($repo, $sportKey, $sportId);
    } catch (Throwable $e) {
        $totalErrors++;
        echo sprintf("  - %-32s ERROR  %s\n", $sportKey, $e->getMessage());
        continue;
    }
    $created = (int) ($r['created'] ?? 0);
    $updated = (int) ($r['updated'] ?? 0);
    $events  = (int) ($r['eventsSeen'] ?? 0);
    $errors  = (int) ($r['errors'] ?? 0);
    $totalCreated += $created;
    $totalUpdated += $updated;
    $totalErrors  += $errors;
    $ms = (int) ((microtime(true) - $t0) * 1000);
    echo sprintf("  - %-32s events=%-3d created=%-3d updated=%-3d errors=%d (%dms)\n",
        $sportKey, $events, $created, $updated, $errors, $ms);
}

echo "[resync] done: created={$totalCreated} updated={$totalUpdated} errors={$totalErrors}\n";
exit($totalErrors > 0 ? 1 : 0);
