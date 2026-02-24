<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/MongoRepository.php';
require_once __DIR__ . '/../src/BetModeRules.php';
require_once __DIR__ . '/../src/BetSettlementService.php';
require_once __DIR__ . '/../src/OddsSyncService.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
$manualRawOverride = getenv('MANUAL_FETCH_MODE');
Env::load($projectRoot, $phpBackendDir);

$manualRaw = $manualRawOverride;
if ($manualRaw === false || $manualRaw === null || $manualRaw === '') {
    $manualRaw = (string) Env::get('MANUAL_FETCH_MODE', 'false');
}
$manualMode = strtolower((string) $manualRaw) === 'true';
if ($manualMode) {
    fwrite(STDOUT, "MANUAL_FETCH_MODE=true, odds worker is disabled.\n");
    exit(0);
}

if (!MongoRepository::isAvailable()) {
    fwrite(STDERR, "pdo_mysql extension is required for odds worker.\n");
    exit(1);
}

$mongoUri = 'mysql-native';
$dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
if ($dbName === '') {
    $dbName = 'sports_betting';
}

$minutes = max(1, (int) Env::get('ODDS_CRON_MINUTES', '10'));
$intervalSeconds = $minutes * 60;

fwrite(STDOUT, "PHP odds worker started. interval={$minutes}m db={$dbName}\n");

$repo = null;
try {
    $repo = new MongoRepository($mongoUri, $dbName);
} catch (Throwable $e) {
    fwrite(STDERR, "Failed to initialize MySQL repository for odds worker: {$e->getMessage()}\n");
    exit(1);
}
while (true) {
    $started = microtime(true);
    $ts = gmdate(DATE_ATOM);
    try {
        $result = OddsSyncService::updateMatches($repo);
        fwrite(STDOUT, sprintf(
            "[%s] update ok created=%d updated=%d settled=%d calls=%d blocked=%s\n",
            $ts,
            (int) ($result['created'] ?? 0),
            (int) ($result['updated'] ?? 0),
            (int) ($result['settled'] ?? 0),
            (int) ($result['apiCalls'] ?? 0),
            (($result['blocked'] ?? false) ? 'true' : 'false')
        ));
    } catch (Throwable $e) {
        fwrite(STDERR, sprintf("[%s] update failed: %s\n", $ts, $e->getMessage()));
    }

    $elapsed = (int) max(0, round(microtime(true) - $started));
    $sleep = max(1, $intervalSeconds - $elapsed);
    sleep($sleep);
}
