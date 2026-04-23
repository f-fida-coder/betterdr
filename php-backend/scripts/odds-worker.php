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

    $elapsed = (int) max(0, round(microtime(true) - $started));
    $sleep = max(1, $intervalSeconds - $elapsed);
    sleep($sleep);
}
