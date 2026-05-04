<?php

declare(strict_types=1);

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
require_once __DIR__ . '/../src/OddsMarketCatalog.php';
// RundownService::httpGet calls ApiQuotaGuard::reserve to cap upstream
// calls per minute. The web bootstrap (public/index.php) requires this
// already, but the worker was missing it — every Rundown live tick was
// throwing "Class ApiQuotaGuard not found", which is exactly why live
// rows go stale and the freshness filter was dropping them. Loading it
// here brings the live overlay back online.
require_once __DIR__ . '/../src/ApiQuotaGuard.php';
require_once __DIR__ . '/../src/TeamNormalizer.php';
require_once __DIR__ . '/../src/OddsSyncService.php';
require_once __DIR__ . '/../src/RealtimeEventBus.php';
require_once __DIR__ . '/../src/RundownService.php';
require_once __DIR__ . '/../src/RundownLiveSync.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
$runOnce = in_array('--once', $argv ?? [], true);

$logWorker = static function (string $level, string $message) use ($phpBackendDir): void {
    $line = sprintf("[%s] [%s] %s\n", gmdate(DATE_ATOM), strtoupper($level), $message);
    $stream = $level === 'error' ? STDERR : STDOUT;
    fwrite($stream, $line);
    $logDir = $phpBackendDir . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0775, true);
    }
    @file_put_contents($logDir . '/odds-worker.log', $line, FILE_APPEND);
};

$manualRawOverride = getenv('MANUAL_FETCH_MODE');
Env::load($projectRoot, $phpBackendDir);

$manualRaw = $manualRawOverride;
if ($manualRaw === false || $manualRaw === null || $manualRaw === '') {
    $manualRaw = (string) Env::get('MANUAL_FETCH_MODE', 'false');
}
$manualMode = strtolower((string) $manualRaw) === 'true';
if ($manualMode) {
    $logWorker('info', 'MANUAL_FETCH_MODE=true, odds worker is disabled.');
    exit(0);
}

if (!SqlRepository::isAvailable()) {
    $logWorker('error', 'pdo_mysql extension is required for odds worker.');
    exit(1);
}

$dbUri = 'mysql-native';
$dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
if ($dbName === '') {
    $dbName = 'sports_betting';
}

$minutes = max(1, (int) Env::get('ODDS_CRON_MINUTES', '10'));
$intervalSeconds = $minutes * 60;

$logWorker('info', "PHP odds worker started. interval={$minutes}m db={$dbName} once=" . ($runOnce ? 'true' : 'false'));

while (true) {
    $started = microtime(true);
    $ts = gmdate(DATE_ATOM);
    try {
        $repo = new SqlRepository($dbUri, $dbName);
        $result = OddsSyncService::updateMatches($repo, 'worker');
        $logWorker('info', sprintf(
            "[%s] update ok created=%d updated=%d scoreOnly=%d settled=%d calls=%d failed=%d blocked=%s",
            $ts,
            (int) ($result['created'] ?? 0),
            (int) ($result['updated'] ?? 0),
            (int) ($result['scoreOnlyUpdates'] ?? 0),
            (int) ($result['settled'] ?? 0),
            (int) ($result['apiCalls'] ?? 0),
            (int) ($result['failedCalls'] ?? 0),
            (($result['blocked'] ?? false) ? 'true' : 'false')
        ));
    } catch (Throwable $e) {
        $logWorker('error', sprintf("[%s] update failed: %s", $ts, $e->getMessage()));
    }

    // Worker health alert: if no successful odds tick in WORKER_HEALTH_ALERT_SECONDS
    // (default 600s = 10 min), log a critical row. Threshold + audit row are
    // owned by SportsbookHealth so admins can also surface this in dashboards.
    try {
        $repoHealth = new SqlRepository($dbUri, $dbName);
        if (SportsbookHealth::checkWorkerHealth($repoHealth)) {
            $logWorker('error', sprintf(
                "[%s] worker health alert: no successful odds sync in > %ds — upstream sync stalled",
                $ts,
                max(60, (int) Env::get('WORKER_HEALTH_ALERT_SECONDS', '600'))
            ));
        }
        unset($repoHealth);
    } catch (Throwable $e) {
        $logWorker('error', 'worker health check failed: ' . $e->getMessage());
    }

    unset($repo);

    if ($runOnce) {
        break;
    }

    // Sleep until the next main-cycle tick, but interleave a live OddsAPI
    // sweep so in-progress matches refresh much faster than the main
    // worker's per-tier cadence. Pre-match / scheduled odds remain owned
    // by the normal OddsSyncService update cycle above.
    $elapsed = (int) max(0, round(microtime(true) - $started));
    $remaining = max(1, $intervalSeconds - $elapsed);
    $liveTickSeconds = max(5, (int) Env::get('RUNDOWN_LIVE_TICK_SECONDS', '10'));
    // Live-odds provider toggles. Default keeps existing behavior (OddsAPI
    // on, Rundown off). Flip in .env without touching code:
    //   LIVE_ODDS_ODDSAPI=true|false
    //   LIVE_ODDS_RUNDOWN=true|false
    // Both can be true (parallel, OddsAPI then Rundown each chunk).
    $oddsApiLiveOn = strtolower((string) Env::get('LIVE_ODDS_ODDSAPI', 'true')) === 'true'
        && strtolower((string) Env::get('SPORTS_API_ENABLED', 'true')) === 'true'
        && (string) Env::get('ODDS_API_KEY', '') !== '';
    $rundownLiveOn = strtolower((string) Env::get('LIVE_ODDS_RUNDOWN', 'false')) === 'true'
        && (string) Env::get('RUNDOWN_API_KEY', '') !== '';
    $deadline = microtime(true) + $remaining;
    while (microtime(true) < $deadline) {
        $chunkStart = microtime(true);
        if ($oddsApiLiveOn) {
            try {
                $repoLive = new SqlRepository($dbUri, $dbName);
                $r = OddsSyncService::syncLiveOdds($repoLive);
                if (($r['updated'] ?? 0) > 0 || ($r['created'] ?? 0) > 0 || ($r['errors'] ?? 0) > 0 || ($r['liveScoreEvents'] ?? 0) > 0) {
                    $logWorker('info', sprintf(
                        "oddsapi live tick sports=%d live=%d withOdds=%d changed=%d errors=%d",
                        (int) ($r['sportsChecked'] ?? 0),
                        (int) ($r['liveScoreEvents'] ?? 0),
                        count((array) ($r['matches'] ?? [])),
                        (int) ($r['updated'] ?? 0) + (int) ($r['created'] ?? 0),
                        (int) ($r['errors'] ?? 0)
                    ));
                }
                unset($repoLive);
            } catch (Throwable $e) {
                $logWorker('error', 'oddsapi live tick failed: ' . $e->getMessage());
            }
        }
        if ($rundownLiveOn) {
            try {
                $repoLive = new SqlRepository($dbUri, $dbName);
                $r = RundownLiveSync::tick($repoLive);
                if (($r['updated'] ?? 0) > 0 || ($r['matched'] ?? 0) > 0 || ($r['errors'] ?? 0) > 0 || ($r['finished'] ?? 0) > 0) {
                    $logWorker('info', sprintf(
                        "rundown live tick sports=%d events=%d matched=%d updated=%d finished=%d errors=%d",
                        (int) ($r['sportsTried'] ?? 0),
                        (int) ($r['eventsSeen'] ?? 0),
                        (int) ($r['matched'] ?? 0),
                        (int) ($r['updated'] ?? 0),
                        (int) ($r['finished'] ?? 0),
                        (int) ($r['errors'] ?? 0)
                    ));
                }
                unset($repoLive);
            } catch (Throwable $e) {
                $logWorker('error', 'rundown live tick failed: ' . $e->getMessage());
            }
        }
        $chunkElapsed = microtime(true) - $chunkStart;
        $sleepFor = max(1, $liveTickSeconds - (int) round($chunkElapsed));
        $remainingToDeadline = $deadline - microtime(true);
        if ($remainingToDeadline <= 0) break;
        sleep((int) min($sleepFor, $remainingToDeadline));
    }
}
