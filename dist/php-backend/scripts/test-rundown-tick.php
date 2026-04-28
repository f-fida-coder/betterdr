<?php
declare(strict_types=1);

// One-shot Rundown live tick — runs RundownLiveSync::tick() once and prints
// the result + a snapshot of the matches table for live games. Used to verify
// the fix locally without restarting the long-running odds-worker daemon.

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
require_once __DIR__ . '/../src/RealtimeEventBus.php';
require_once __DIR__ . '/../src/RundownService.php';
require_once __DIR__ . '/../src/RundownLiveSync.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

$dbUri = 'mysql-native';
$dbName = (string) Env::get('MYSQL_DB', 'betterdr_local');

echo "=== Rundown live-tick smoke test ===\n";
echo "db        = $dbName\n";
echo "enabled   = " . (RundownService::isEnabled() ? 'YES' : 'NO') . "\n";
echo "now (UTC) = " . gmdate('Y-m-d H:i:s') . "\n\n";

if (!RundownService::isEnabled()) {
    echo "RUNDOWN_LIVE_ENABLED=false or RUNDOWN_API_KEY missing — aborting.\n";
    exit(1);
}

$repo = new SqlRepository($dbUri, $dbName);

// Snapshot before
$liveBefore = $repo->findMany('matches', ['status' => 'live'], [
    'projection' => ['id' => 1, 'sportKey' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'oddsSource' => 1, 'lastOddsSyncAt' => 1],
    'limit' => 50,
]);
echo "matches with status='live' BEFORE tick: " . count($liveBefore) . "\n";
foreach ($liveBefore as $r) {
    echo sprintf("  - %s | %s vs %s (source=%s)\n",
        (string)($r['sportKey'] ?? '?'),
        (string)($r['homeTeam'] ?? '?'),
        (string)($r['awayTeam'] ?? '?'),
        (string)($r['oddsSource'] ?? '?'));
}
echo "\n";

$start = microtime(true);
$result = RundownLiveSync::tick($repo);
$elapsed = number_format(microtime(true) - $start, 2);

echo "tick finished in {$elapsed}s\n";
echo "result: " . json_encode($result, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n\n";

// Snapshot after
$liveAfter = $repo->findMany('matches', ['status' => 'live'], [
    'projection' => ['id' => 1, 'sportKey' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'oddsSource' => 1, 'lastOddsSyncAt' => 1, 'score' => 1],
    'limit' => 50,
]);
echo "matches with status='live' AFTER tick: " . count($liveAfter) . "\n";
foreach ($liveAfter as $r) {
    $score = $r['score'] ?? null;
    $scoreStr = '';
    if (is_array($score) && (isset($score['home']) || isset($score['away']))) {
        $scoreStr = sprintf(' [%s-%s]', (string)($score['home'] ?? '?'), (string)($score['away'] ?? '?'));
    }
    echo sprintf("  - %s | %s vs %s%s (source=%s, last=%s)\n",
        (string)($r['sportKey'] ?? '?'),
        (string)($r['homeTeam'] ?? '?'),
        (string)($r['awayTeam'] ?? '?'),
        $scoreStr,
        (string)($r['oddsSource'] ?? '?'),
        (string)($r['lastOddsSyncAt'] ?? '?'));
}
echo "\nDone.\n";
