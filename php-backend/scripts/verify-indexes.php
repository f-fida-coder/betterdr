<?php
/**
 * Index Verification Script
 * 
 * Purpose: Verify all required indexes exist
 * Safety: READ-ONLY - Does not modify anything
 * 
 * Usage:
 *   php scripts/verify-indexes.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/MongoRepository.php';

$projectRoot = dirname(__DIR__);
$phpBackendDir = __DIR__ . '/..';
Env::load($projectRoot, $phpBackendDir);

echo "==============================================\n";
echo "Database Index Verification\n";
echo "==============================================\n\n";

try {
    $db = new MongoRepository('mysql-native', (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'betterdr')));
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
 * Required indexes
 */
$requiredIndexes = [
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

$allExist = true;
$missingIndexes = [];

foreach ($requiredIndexes as $collectionName => $indexNames) {
    echo "Collection: $collectionName\n";
    echo str_repeat('-', 50) . "\n";
    
    try {
        $collection = getCollection($db, $collectionName);
        $existingIndexes = [];
        
        $indexes = $collection->listIndexes();
        foreach ($indexes as $index) {
            $existingIndexes[] = $index->getName();
        }
        
        foreach ($indexNames as $indexName) {
            if (in_array($indexName, $existingIndexes)) {
                echo "   ✅ $indexName\n";
            } else {
                echo "   ❌ $indexName (MISSING)\n";
                $allExist = false;
                $missingIndexes[] = "$collectionName.$indexName";
            }
        }
        
    } catch (Exception $e) {
        echo "   ⚠️  Could not access collection: $collectionName\n";
        $allExist = false;
    }
    
    echo "\n";
}

echo "==============================================\n";
echo "Summary\n";
echo "==============================================\n";

if ($allExist) {
    echo "✅ All required indexes exist!\n";
    echo "\n";
    echo "Performance should be improved for:\n";
    echo "  - Transaction history queries\n";
    echo "  - User filtering by agent/role\n";
    echo "  - Agent hierarchy lookups\n";
    echo "  - Header summary calculations\n";
    echo "\n";
    exit(0);
} else {
    echo "❌ Missing indexes detected:\n\n";
    foreach ($missingIndexes as $index) {
        echo "   - $index\n";
    }
    echo "\n";
    echo "To add missing indexes, run:\n";
    echo "  php scripts/add-indexes.php\n";
    echo "\n";
    exit(1);
}
