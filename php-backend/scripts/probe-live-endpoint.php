<?php
declare(strict_types=1);

// One-shot verification: applies the same filter MatchesController uses for
// status=live and prints which rows would be returned by GET /api/matches?status=live.

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
require_once __DIR__ . '/../src/RealtimeEventBus.php';
require_once __DIR__ . '/../src/ApiQuotaGuard.php';
require_once __DIR__ . '/../src/TeamNormalizer.php';
require_once __DIR__ . '/../src/RundownService.php';
require_once __DIR__ . '/../src/RundownLiveSync.php';

Env::load(dirname(__DIR__, 2), dirname(__DIR__));

$db = new SqlRepository('mysql-native', (string) Env::get('MYSQL_DB', 'betterdr_local'));
$now = time();
$covered = RundownLiveSync::coveredSportKeysSet();

$rows = $db->findMany('matches', ['status' => 'live'], [
    'projection' => ['id' => 1, 'sportKey' => 1, 'homeTeam' => 1, 'awayTeam' => 1, 'oddsSource' => 1, 'lastOddsSyncAt' => 1, 'status' => 1, 'score' => 1],
    'limit' => 200,
]);

echo "All status='live' rows in DB: " . count($rows) . "\n";
echo "Rundown coverage keys: " . count($covered) . "\n";
echo "Now (UTC): " . gmdate('Y-m-d H:i:s') . "\n\n";

$pass = 0; $fail = 0;
foreach ($rows as $r) {
    $sk = strtolower((string)($r['sportKey'] ?? ''));
    $src = strtolower((string)($r['oddsSource'] ?? ''));
    $last = (string)($r['lastOddsSyncAt'] ?? '');
    $lastTs = $last !== '' ? strtotime($last) : false;
    $age = $lastTs !== false ? ($now - $lastTs) : null;
    $maxAge = (int) Env::get('LIVE_FRESHNESS_SECONDS_DEFAULT', (string) Env::get('RUNDOWN_LIVE_FRESHNESS_SECONDS', '90'));
    $coveredOk = $sk !== '' && isset($covered[$sk]);
    $sourceOk = $src === 'rundown';
    $freshOk = $lastTs !== false && ($age <= $maxAge);
    $accept = $coveredOk && $sourceOk && $freshOk;
    if ($accept) $pass++; else $fail++;
    printf("  %s  %s vs %s  [sport=%s src=%s age=%ss]  coverage=%s source=%s fresh=%s\n",
        $accept ? 'PASS' : 'fail',
        (string)($r['homeTeam'] ?? '?'),
        (string)($r['awayTeam'] ?? '?'),
        $sk ?: '?',
        $src ?: '?',
        $age !== null ? (string)$age : '?',
        $coveredOk ? 'Y' : 'N',
        $sourceOk ? 'Y' : 'N',
        $freshOk ? 'Y' : 'N'
    );
}

echo "\nWould be visible in Live Now: $pass\nWould be filtered out: $fail\n";
