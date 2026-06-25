<?php
/**
 * Index Rollback Script
 * 
 * Purpose: Drop indexes added by add-indexes.php
 * Safety: Reversible - Can re-add with add-indexes.php
 * Downtime: ZERO - Drops are instant
 * 
 * Usage:
 *   php scripts/drop-indexes.php
 *   php scripts/drop-indexes.php --dry-run
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/SqlRepository.php';

$projectRoot = dirname(__DIR__);
$phpBackendDir = __DIR__ . '/..';
Env::load($projectRoot, $phpBackendDir);

$options = getopt('', ['dry-run', 'verbose', 'help']);

if (isset($options['help'])) {
    echo "Database Index Rollback Script\n";
    echo "===============================\n\n";
    echo "Usage:\n";
    echo "  php scripts/drop-indexes.php           # Drop indexes\n";
    echo "  php scripts/drop-indexes.php --dry-run # Preview only\n";
    echo "\n";
    echo "Warning:\n";
    echo "  - This will remove performance indexes\n";
    echo "  - Queries may become slower\n";
    echo "  - Safe to re-add with add-indexes.php\n";
    echo "\n";
    exit(0);
}

$verbose = isset($options['verbose']);
$dryRun = isset($options['dry-run']);

echo "==============================================\n";
echo "Database Index Rollback\n";
echo "==============================================\n\n";

try {
    $db = new SqlRepository('mysql-native', (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'betterdr')));
    echo "✅ Connected to database\n\n";
} catch (Exception $e) {
    echo "❌ Error: Could not connect to database\n";
    exit(1);
}

/**
 * Get MongoDB collection object
 */
function getCollection($db, string $collectionName) {
    $reflection = new ReflectionClass($db);
    $property = $reflection->getProperty('client');
    $property->setAccessible(true);
    $client = $property->getValue($db);
    $databaseName = $reflection->getProperty('databaseName')->getValue($db);
    return $client->selectCollection($databaseName, $collectionName);
}

/**
 * Indexes to drop (must match add-indexes.php)
 */
$indexesToDrop = [
    'transactions' => [
        'userId_1_createdAt_-1',
        'userId_1_type_1_status_1_createdAt_-1',
        'agentId_1_createdAt_-1',
    ],
    'users' => [
        'agentId_1_status_1',
        'role_1_status_1',
    ],
    'agents' => [
        'createdBy_1_role_1',
    ],
];

$success = 0;
$skipped = 0;
$failed = 0;
$total = 0;

foreach ($indexesToDrop as $collectionName => $indexNames) {
    echo "Collection: $collectionName\n";
    echo str_repeat('-', 50) . "\n";
    
    try {
        $collection = getCollection($db, $collectionName);
    } catch (Exception $e) {
        echo "   ⚠️  Collection not found: $collectionName\n\n";
        continue;
    }
    
    foreach ($indexNames as $indexName) {
        $total++;
        
        if ($dryRun) {
            echo "   📋 Would drop: $indexName\n";
            $success++;
            continue;
        }
        
        try {
            $collection->dropIndex($indexName);
            if ($verbose) {
                echo "   ✅ Dropped: $indexName\n";
            }
            $success++;
        } catch (Exception $e) {
            if (strpos($e->getMessage(), 'not found') !== false) {
                if ($verbose) {
                    echo "   ℹ️  Not found: $indexName\n";
                }
                $skipped++;
            } else {
                echo "   ❌ Error dropping $indexName: {$e->getMessage()}\n";
                $failed++;
            }
        }
    }
    
    echo "\n";
}

echo "==============================================\n";
echo "Summary\n";
echo "==============================================\n";
echo "Total indexes:  $total\n";
echo "Dropped:        $success\n";
echo "Skipped:        $skipped\n";
echo "Failed:         $failed\n";

if ($dryRun) {
    echo "\nℹ️  This was a dry run. No indexes were dropped.\n";
    echo "   Run without --dry-run to apply changes.\n";
}

echo "\n";
if ($failed === 0) {
    echo "✅ Rollback completed successfully!\n";
} else {
    echo "⚠️  Rollback completed with errors.\n";
}

echo "\n";
echo "To re-add indexes:\n";
echo "  php scripts/add-indexes.php\n";
echo "\n";

exit($failed > 0 ? 1 : 0);
