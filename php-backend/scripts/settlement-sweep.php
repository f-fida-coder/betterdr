<?php

declare(strict_types=1);

/**
 * Standalone settlement sweep — referenced as Job 3 in
 * HOSTINGER_DEPLOYMENT_GUIDE.md as a safety net in case the long-running
 * odds-worker.php daemon isn't running (Hostinger shared hosting limits
 * persistent processes; if pgrep / nohup / setsid behave unexpectedly,
 * the watchdog may never restart the worker and grading silently stops).
 *
 * Runs BetSettlementService::settlePendingMatches in the same mode the
 * worker uses ('settledBy' tag distinguishes the source in the audit
 * trail). Idempotent — settleMatch is row-locked and guards every UPDATE
 * with `WHERE status='pending'`, so a concurrent worker tick won't
 * double-settle.
 *
 * Cron line (every 5 min):
 *   *\/5 * * * * /usr/bin/php /home/USER/path/to/php-backend/scripts/settlement-sweep.php >> /home/USER/path/to/php-backend/logs/settlement-sweep.log 2>&1
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
require_once __DIR__ . '/../src/BetModeRules.php';
require_once __DIR__ . '/../src/AgentSettlementRules.php';
require_once __DIR__ . '/../src/SportsMatchStatus.php';
require_once __DIR__ . '/../src/SportsbookHealth.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/BetSettlementService.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[settlement-sweep] pdo_mysql extension is required\n");
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
    $result = BetSettlementService::settlePendingMatches($db, 250, 'cron-sweep');
    $elapsedMs = (int) round((microtime(true) - $startedAt) * 1000);
    fwrite(STDOUT, sprintf(
        "[%s] settlement-sweep ok checked=%d settled=%d bets=%d errors=%d elapsedMs=%d\n",
        $ts,
        (int) ($result['matchesChecked'] ?? 0),
        (int) ($result['matchesSettled'] ?? 0),
        (int) ($result['betsSettled'] ?? 0),
        (int) ($result['errors'] ?? 0),
        $elapsedMs
    ));
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, sprintf("[%s] settlement-sweep failed: %s\n", $ts, $e->getMessage()));
    exit(1);
}
