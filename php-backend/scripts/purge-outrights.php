<?php

declare(strict_types=1);

/**
 * One-off purge of legacy Odds API futures from the `outrights` table.
 *
 * Context: futures were originally seeded by the now-removed The Odds API
 * integration (commit 4359f039 deleted OddsSyncService + outrights-sync.php).
 * The platform is Rundown-only going forward, and Rundown serves NO futures, so
 * every row currently in `outrights` is stale Odds API data to be deleted.
 *
 * Safety:
 *   - DRY RUN by default — prints what it would delete and changes nothing.
 *     Pass --yes to actually delete.
 *   - Per-row guard: a row that has ANY bet selection pointing at it
 *     (betselections.outrightId, via the j_outright_id index) is SKIPPED, never
 *     deleted, so a settled/pending ticket's audit trail is preserved. (Futures
 *     placement was 409-blocked until just now, so this should be zero — the
 *     guard is belt-and-suspenders.)
 *   - Touches only the `outrights` table; no money columns.
 *
 * Usage:
 *   php php-backend/scripts/purge-outrights.php          # dry run
 *   php php-backend/scripts/purge-outrights.php --yes     # delete
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

Env::load($projectRoot, $phpBackendDir);
Logger::init($phpBackendDir . '/logs');

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[purge-outrights] pdo_mysql extension required\n");
    exit(1);
}

$apply = in_array('--yes', $argv, true);
$db = new SqlRepository('', (string) Env::get('MYSQL_DB', 'sports_betting'));

$rows = $db->findMany('outrights', [], [
    'projection' => ['id' => 1, 'sportKey' => 1, 'status' => 1, 'eventName' => 1],
    'limit' => 5000,
]);

echo "outrights rows found: " . count($rows) . "\n";
$byStatus = [];
foreach ($rows as $r) {
    $s = (string) ($r['status'] ?? '?');
    $byStatus[$s] = ($byStatus[$s] ?? 0) + 1;
}
foreach ($byStatus as $s => $n) {
    echo "  status={$s}: {$n}\n";
}

if ($rows === []) {
    echo "Nothing to purge — table already empty.\n";
    exit(0);
}

if (!$apply) {
    echo "\nDRY RUN — no rows deleted.\n";
    echo "Re-run with --yes to delete these " . count($rows) . " row(s) (rows with bets attached are auto-skipped).\n";
    exit(0);
}

$deleted = 0;
$skipped = 0;
foreach ($rows as $r) {
    $id = (string) ($r['id'] ?? '');
    if ($id === '') {
        continue;
    }
    // Indexed lookup (idx_betselections_outright_status) — refuse to delete an
    // outright that a bet ticket references.
    $ref = $db->findOne('betselections', ['outrightId' => $id], ['projection' => ['id' => 1]]);
    if ($ref !== null) {
        echo "  SKIP (bet attached): {$id}  " . (string) ($r['eventName'] ?? '') . "\n";
        $skipped++;
        continue;
    }
    $deleted += $db->deleteOne('outrights', ['id' => $id]);
}

echo "\nDeleted {$deleted} row(s)";
echo $skipped > 0 ? ", skipped {$skipped} with bets attached.\n" : ".\n";
echo "Done. /api/outrights will return [] once its short cache expires (~60s).\n";
