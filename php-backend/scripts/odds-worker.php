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

    unset($repo);

    if ($runOnce) {
        break;
    }

    // Sleep until the next main-cycle tick, but interleave a ~10s
    // TheRundown live-only sync so in-progress matches refresh much
    // faster than the main worker's per-tier cadence (2-5 min). The
    // live tick is cheap when nothing is in-progress (mostly cache
    // hits + early exits) and bounded by RUNDOWN_LIVE_MAX_SPORTS_PER_TICK.
    // Pre-match / scheduled odds remain owned by OddsSyncService above.
    $elapsed = (int) max(0, round(microtime(true) - $started));
    $remaining = max(1, $intervalSeconds - $elapsed);
    $liveTickSeconds = max(5, (int) Env::get('RUNDOWN_LIVE_TICK_SECONDS', '10'));
    $liveEnabled = RundownService::isEnabled();
    $deadline = microtime(true) + $remaining;
    while (microtime(true) < $deadline) {
        $chunkStart = microtime(true);
        if ($liveEnabled) {
            try {
                $repoLive = new SqlRepository($dbUri, $dbName);
                $r = RundownLiveSync::tick($repoLive);
                if (($r['updated'] ?? 0) > 0 || ($r['errors'] ?? 0) > 0) {
                    $logWorker('info', sprintf(
                        "rundown live tick sports=%d events=%d matched=%d updated=%d errors=%d",
                        (int) ($r['sportsTried'] ?? 0),
                        (int) ($r['eventsSeen'] ?? 0),
                        (int) ($r['matched'] ?? 0),
                        (int) ($r['updated'] ?? 0),
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
