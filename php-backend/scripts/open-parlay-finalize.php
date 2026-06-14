<?php

declare(strict_types=1);

/**
 * Open Parlay finalizer — flips due open parlays into the settlement
 * pipeline (or voids+refunds the ones that never reached 2 legs).
 *
 * For every ticket in status='open' whose `closesAt` (the earliest leg's
 * start time) has passed, OpenParlayService::finalizeDueTickets:
 *   - VOIDS + REFUNDS the whole ticket if it has fewer than 2 legs, or
 *   - flips it open->pending so BetSettlementService grades it normally.
 *
 * This is the SECOND of the triple-layer anti-past-posting guard (the
 * grader itself refuses to touch an 'open' ticket regardless). It is
 * row-locked and re-checks status under FOR UPDATE, so running it from both
 * the odds-worker and this cron safety-net never double-finalizes.
 *
 * Cron line (every minute — closesAt precision is the leg's kickoff, so we
 * want to finalize promptly so legs don't sit gradeable-but-open):
 *   * * * * * /usr/bin/php /home/USER/path/to/php-backend/scripts/open-parlay-finalize.php >> /home/USER/path/to/php-backend/logs/open-parlay-finalize.log 2>&1
 *
 * Adjust the absolute path to match your server. No flags required.
 */

require_once __DIR__ . '/../src/Autoloader.php';
Autoloader::register();

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
require_once __DIR__ . '/../src/SportsMatchStatus.php';
require_once __DIR__ . '/../src/SportsbookHealth.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/OpenParlayService.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[open-parlay-finalize] pdo_mysql extension is required\n");
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
    $result = OpenParlayService::finalizeDueTickets($db, 250, 'cron-finalize');
    $elapsedMs = (int) round((microtime(true) - $startedAt) * 1000);
    fwrite(STDOUT, sprintf(
        "[%s] open-parlay-finalize ok checked=%d flipped=%d voided=%d errors=%d elapsedMs=%d\n",
        $ts,
        (int) ($result['checked'] ?? 0),
        (int) ($result['flipped'] ?? 0),
        (int) ($result['voided'] ?? 0),
        (int) ($result['errors'] ?? 0),
        $elapsedMs
    ));
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, sprintf("[%s] open-parlay-finalize failed: %s\n", $ts, $e->getMessage()));
    exit(1);
}
