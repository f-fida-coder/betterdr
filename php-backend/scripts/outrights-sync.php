<?php

declare(strict_types=1);

/**
 * Standalone outrights / futures sync — companion to settlement-sweep.php.
 * The long-running odds-worker.php daemon already calls
 * OddsSyncService::updateOutrights() every tick, but on Hostinger shared
 * hosting the daemon often isn't running (process limits / nohup quirks /
 * watchdog gaps). When that happens the `outrights` table stays empty and
 * the FUTURES tab shows "No futures available right now" even though the
 * odds-api endpoint is healthy.
 *
 * This script calls updateOutrights() once and exits. It self-throttles
 * via the same `cache/outrights-sync-state.json` state file the worker
 * uses, so calling it on a tight cron is safe — already-fresh sports are
 * skipped, only stale ones make a real API call.
 *
 * Hostinger cron line (every 30 min — outrights barely change):
 *   *\/30 * * * * /usr/bin/php /home/USER/path/to/php-backend/scripts/outrights-sync.php >> /home/USER/path/to/php-backend/logs/outrights-sync.log 2>&1
 *
 * Adjust the absolute path to match your server. No flags required.
 */

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/Logger.php';
require_once __DIR__ . '/../src/Http.php';
require_once __DIR__ . '/../src/ApiException.php';
require_once __DIR__ . '/../src/Response.php';
require_once __DIR__ . '/../src/CircuitBreaker.php';
require_once __DIR__ . '/../src/ConnectionPool.php';
require_once __DIR__ . '/../src/QueryCache.php';
require_once __DIR__ . '/../src/RequestDeduplicator.php';
require_once __DIR__ . '/../src/SharedFileCache.php';
require_once __DIR__ . '/../src/SportsbookCache.php';
require_once __DIR__ . '/../src/SqlRepository.php';
require_once __DIR__ . '/../src/SportsMatchStatus.php';
require_once __DIR__ . '/../src/SportsbookHealth.php';
require_once __DIR__ . '/../src/OddsMarketCatalog.php';
require_once __DIR__ . '/../src/ApiQuotaGuard.php';
require_once __DIR__ . '/../src/TeamNormalizer.php';
require_once __DIR__ . '/../src/OddsSyncService.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[outrights-sync] pdo_mysql extension is required\n");
    exit(1);
}

$dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
if ($dbName === '') {
    $dbName = 'sports_betting';
}

$startedAt = microtime(true);
$ts = gmdate(DATE_ATOM);

try {
    $db = new SqlRepository('mysql-native', $dbName);
    $result = OddsSyncService::updateOutrights($db);
    $elapsedMs = (int) round((microtime(true) - $startedAt) * 1000);
    fwrite(STDOUT, sprintf(
        "[%s] outrights-sync ok attempted=%d skipped=%d elapsedMs=%d\n",
        $ts,
        count($result['attempted'] ?? []),
        (int) ($result['skipped'] ?? 0),
        $elapsedMs
    ));
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, sprintf("[%s] outrights-sync failed: %s\n", $ts, $e->getMessage()));
    exit(1);
}
