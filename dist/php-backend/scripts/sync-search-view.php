<?php

// Phase 3B: Materialized View Sync Script
//
// Synchronizes materialized search view with primary matches table.
// Runs every 5 minutes via cron.
//
// Usage:
//   */5 * * * * php /path/to/sync-search-view.php >> /var/log/betterdr-search-sync.log 2>&1
//
// This script:
// 1. Upserts recently updated matches
// 2. Tracks sync performance
// 3. Reports status to observability system

require_once __DIR__ . '/../config/bootstrap.php';

use BetterDR\Search\SearchRepository;
use BetterDR\Env;

// Setup database connection
$pdo = new PDO(
    'mysql:host=' . Env::get('DB_HOST') . ';dbname=' . Env::get('DB_NAME'),
    Env::get('DB_USER'),
    Env::get('DB_PASSWORD'),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$searchRepo = new SearchRepository($pdo);

$timestamp = date('Y-m-d H:i:s');

echo "[{$timestamp}] Starting materialized view sync...\n";

// Get status before sync
$statusBefore = $searchRepo->getMaterializedViewStatus();
echo "[{$timestamp}] Status before sync:\n";
echo "  Rows in view: " . number_format($statusBefore['status']['total_rows']) . "\n";
echo "  Sports: " . $statusBefore['status']['unique_sports'] . "\n";
echo "  Statuses: " . $statusBefore['status']['unique_statuses'] . "\n";

// Perform sync
$syncResult = $searchRepo->syncMaterializedView();

if ($syncResult['success']) {
    echo "[{$timestamp}] ✅ Sync successful!\n";
    echo "  Rows synced: " . number_format($syncResult['rows_synced']) . "\n";
    echo "  Duration: " . $syncResult['duration_ms'] . "ms\n";
    echo "  Throughput: " . number_format($syncResult['rows_synced'] / ($syncResult['duration_ms'] / 1000), 0) . " rows/sec\n";
    
    // Report to observability
    reportSyncMetrics([
        'action' => 'search_view_sync',
        'rows_synced' => $syncResult['rows_synced'],
        'duration_ms' => $syncResult['duration_ms'],
        'status' => 'success',
        'timestamp' => $timestamp
    ]);
} else {
    echo "[{$timestamp}] ❌ Sync failed!\n";
    echo "  Error: " . $syncResult['error'] . "\n";
    
    reportSyncMetrics([
        'action' => 'search_view_sync',
        'status' => 'failed',
        'error' => $syncResult['error'],
        'timestamp' => $timestamp
    ]);
}

// Verify health after sync
$statusAfter = $searchRepo->getMaterializedViewStatus();
echo "[{$timestamp}] Status after sync:\n";
echo "  Rows in view: " . number_format($statusAfter['status']['total_rows']) . "\n";
echo "  Last updated: " . $statusAfter['status']['last_updated'] . "\n";

echo "[{$timestamp}] Sync completed\n\n";

/**
 * Report sync metrics to observability backend.
 */
function reportSyncMetrics(array $metrics): void
{
    try {
        $metricsJson = json_encode($metrics);
        
        // Log to observability backend if available
        $logFile = getenv('BETTERDR_LOGS_DIR') ?: '/var/log/betterdr';
        if (!is_dir($logFile)) {
            mkdir($logFile, 0755, true);
        }
        
        file_put_contents(
            $logFile . '/search-sync-metrics.log',
            $metricsJson . "\n",
            FILE_APPEND
        );
    } catch (Throwable $e) {
        // Silently fail - don't break the sync job
    }
}
