<?php

declare(strict_types=1);

/**
 * One-shot: re-sync MLB so match docs pick up the new homePitcher/awayPitcher
 * fields from RundownEventMapper. Run after deploying the listed-pitcher
 * feature (or locally to verify). Safe/idempotent — just a full MLB sweep.
 *
 *   php scripts/resync-mlb-pitchers.php
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
    fwrite(STDERR, "pdo_mysql extension is required\n");
    exit(1);
}
if (!RundownClient::isConfigured()) {
    fwrite(STDERR, "RundownClient not configured (missing API key in env)\n");
    exit(1);
}

$repo = new SqlRepository('', (string) Env::get('MYSQL_DB', 'sports_betting'));

$sportKey = 'baseball_mlb';
$sportId  = RundownSportMap::sportKeyToSportId($sportKey);
fwrite(STDOUT, "Re-syncing {$sportKey} (id {$sportId})...\n");

$res = RundownSyncService::syncSportFull($repo, $sportKey, $sportId);
fwrite(STDOUT, 'syncSportFull: ' . json_encode($res) . "\n");

// Report how many MLB docs now carry a listed pitcher.
$rows = $repo->findMany('matches', ['sportKey' => $sportKey], ['projection' => ['homePitcher' => 1, 'awayPitcher' => 1], 'limit' => 500]);
$withPitcher = 0;
foreach ($rows as $r) {
    if (!empty($r['homePitcher']) || !empty($r['awayPitcher'])) {
        $withPitcher++;
    }
}
fwrite(STDOUT, "MLB matches with a listed pitcher: {$withPitcher} / " . count($rows) . "\n");
