<?php
/**
 * Database Index Migration Script
 * 
 * Purpose: Add performance indexes to MongoDB collections
 * Safety: ADDITIVE ONLY - Does not modify existing data or queries
 * Downtime: ZERO - Indexes built in background
 * Rollback: Drop indexes (script included)
 * 
 * Usage:
 *   php scripts/add-indexes.php
 *   php scripts/add-indexes.php --dry-run
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/SqlRepository.php';

$projectRoot = dirname(__DIR__);
$phpBackendDir = __DIR__ . '/..';
Env::load($projectRoot, $phpBackendDir);

// Parse command line arguments
$options = getopt('', ['dry-run', 'verbose', 'help']);

if (isset($options['help'])) {
    echo "Database Index Migration Script\n";
    echo "================================\n\n";
    echo "Usage:\n";
    echo "  php scripts/add-indexes.php           # Add indexes\n";
    echo "  php scripts/add-indexes.php --dry-run # Preview only\n";
    echo "  php scripts/add-indexes.php --verbose # Detailed output\n";
    echo "\n";
    echo "Safety:\n";
    echo "  - Indexes are built in background (no locking)\n";
    echo "  - Site remains fully operational during migration\n";
    echo "  - Safe to run multiple times (idempotent)\n";
    echo "  - No data modification\n";
    echo "\n";
    echo "Rollback:\n";
    echo "  php scripts/drop-indexes.php\n";
    echo "\n";
    exit(0);
}

$verbose = isset($options['verbose']);
$dryRun = isset($options['dry-run']);

/**
 * Index definitions
 */
$indexes = [
    'transactions' => [
        [
            'key' => ['userId' => 1, 'createdAt' => -1],
            'name' => 'userId_1_createdAt_-1',
            'background' => true,
            'description' => 'Fast user transaction history lookups',
        ],
        [
            'key' => ['userId' => 1, 'type' => 1, 'status' => 1, 'createdAt' => -1],
            'name' => 'userId_1_type_1_status_1_createdAt_-1',
            'background' => true,
            'description' => 'Filtered transaction queries (type/status)',
        ],
        [
            'key' => ['agentId' => 1, 'createdAt' => -1],
            'name' => 'agentId_1_createdAt_-1',
            'background' => true,
            'description' => 'Agent transaction lookups',
        ],
    ],
    'users' => [
        [
            'key' => ['agentId' => 1, 'status' => 1],
            'name' => 'agentId_1_status_1',
            'background' => true,
            'description' => 'Agent user filtering',
        ],
        [
            'key' => ['role' => 1, 'status' => 1],
            'name' => 'role_1_status_1',
            'background' => true,
            'description' => 'User role filtering',
        ],
    ],
    'agents' => [
        [
            'key' => ['createdBy' => 1, 'role' => 1],
            'name' => 'createdBy_1_role_1',
            'background' => true,
            'description' => 'Agent hierarchy lookups',
        ],
    ],
];

/**
 * Connect to database
 */
echo "==============================================\n";
echo "Database Index Migration\n";
echo "==============================================\n\n";

try {
    $db = new SqlRepository('mysql-native', (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'betterdr')));
    echo "✅ Connected to database\n\n";
} catch (Exception $e) {
    echo "❌ Error: Could not connect to database\n";
    echo "   " . $e->getMessage() . "\n";
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
 * Add index to collection
 */
function addIndex($collection, array $indexDef, bool $verbose): bool {
    try {
        $collection->createIndex(
            $indexDef['key'],
            [
                'background' => $indexDef['background'] ?? true,
                'name' => $indexDef['name'],
            ]
        );
        
        if ($verbose) {
            echo "   ✅ Created index: {$indexDef['name']}\n";
            echo "      Description: {$indexDef['description']}\n";
        }
        
        return true;
    } catch (Exception $e) {
        // Index might already exist - that's OK
        if (strpos($e->getMessage(), 'already exists') !== false) {
            if ($verbose) {
                echo "   ℹ️  Index exists: {$indexDef['name']}\n";
            }
            return true;
        }
        
        echo "   ❌ Error creating index {$indexDef['name']}: {$e->getMessage()}\n";
        return false;
    }
}

/**
 * Check if index exists
 */
function indexExists($collection, string $indexName): bool {
    try {
        $indexes = $collection->listIndexes();
        foreach ($indexes as $index) {
            if ($index->getName() === $indexName) {
                return true;
            }
        }
        return false;
    } catch (Exception $e) {
        return false;
    }
}

// Execute migration
$success = 0;
$skipped = 0;
$failed = 0;
$total = 0;

foreach ($indexes as $collectionName => $collectionIndexes) {
    echo "Collection: $collectionName\n";
    echo str_repeat('-', 50) . "\n";
    
    try {
        $collection = getCollection($db, $collectionName);
    } catch (Exception $e) {
        echo "   ⚠️  Collection not found: $collectionName\n\n";
        continue;
    }
    
    foreach ($collectionIndexes as $indexDef) {
        $total++;
        $indexName = $indexDef['name'];
        
        // Check if index already exists
        if (indexExists($collection, $indexName)) {
            if ($verbose) {
                echo "   ℹ️  Skipping (exists): $indexName\n";
            }
            $skipped++;
            continue;
        }
        
        if ($dryRun) {
            echo "   📋 Would create: $indexName\n";
            echo "      Description: {$indexDef['description']}\n";
            $success++;
            continue;
        }
        
        // Add index
        if (addIndex($collection, $indexDef, $verbose)) {
            $success++;
        } else {
            $failed++;
        }
    }
    
    echo "\n";
}

// Summary
echo "==============================================\n";
echo "Summary\n";
echo "==============================================\n";
echo "Total indexes:     $total\n";
echo "Created:           $success\n";
echo "Skipped (exists):  $skipped\n";
echo "Failed:            $failed\n";

if ($dryRun) {
    echo "\nℹ️  This was a dry run. No indexes were created.\n";
    echo "   Run without --dry-run to apply changes.\n";
}

if ($failed > 0) {
    echo "\n⚠️  Some indexes failed to create. Check errors above.\n";
    exit(1);
}

echo "\n✅ Index migration completed successfully!\n";
echo "\n";
echo "Next steps:\n";
echo "  1. Monitor database performance\n";
echo "  2. Verify site functionality\n";
echo "  3. Run: php scripts/verify-indexes.php\n";
echo "\n";
echo "Rollback (if needed):\n";
echo "  php scripts/drop-indexes.php\n";
echo "\n";

exit(0);
