<?php
/**
 * MySQL Index Verification Script
 * 
 * Purpose: Verify all required indexes exist
 * Safety: READ-ONLY - Does not modify anything
 * 
 * Usage:
 *   php scripts/verify-mysql-indexes.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';

$projectRoot = dirname(__DIR__);
$phpBackendDir = __DIR__ . '/..';
Env::load($projectRoot, $phpBackendDir);

echo "==============================================\n";
echo "MySQL Index Verification\n";
echo "==============================================\n\n";

/**
 * Database connection
 */
$host = getenv('MYSQL_HOST') ?: 'localhost';
$port = getenv('MYSQL_PORT') ?: '3306';
$dbname = getenv('MYSQL_DB') ?: 'betterdr_local';
$username = getenv('MYSQL_USER') ?: 'root';
$password = getenv('MYSQL_PASSWORD') ?: '';

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    echo "✅ Connected to MySQL database: $dbname\n\n";
} catch (PDOException $e) {
    echo "❌ Error: Could not connect to MySQL database\n";
    exit(1);
}

/**
 * Required indexes
 */
$requiredIndexes = [
    'transactions' => [
        'idx_transactions_user_created',
        'idx_transactions_user_type_status_created',
        'idx_transactions_reference',
    ],
    'users' => [
        'idx_users_agent_status',
        'idx_users_role_status',
    ],
    'agents' => [
        'idx_agents_createdby_role',
        'idx_agents_status',
    ],
];

/**
 * Check if index exists
 */
function indexExists(PDO $pdo, string $table, string $indexName): bool {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM information_schema.STATISTICS 
            WHERE table_schema = DATABASE() 
            AND table_name = ? 
            AND index_name = ?
        ");
        $stmt->execute([$table, $indexName]);
        $result = $stmt->fetch();
        return $result['count'] > 0;
    } catch (PDOException $e) {
        return false;
    }
}

/**
 * Check if table exists
 */
function tableExists(PDO $pdo, string $table): bool {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM information_schema.TABLES 
            WHERE table_schema = DATABASE() 
            AND table_name = ?
        ");
        $stmt->execute([$table]);
        $result = $stmt->fetch();
        return $result['count'] > 0;
    } catch (PDOException $e) {
        return false;
    }
}

$allExist = true;
$missingIndexes = [];
$totalTables = 0;
$totalIndexes = 0;

foreach ($requiredIndexes as $tableName => $indexNames) {
    echo "Table: $tableName\n";
    echo str_repeat('-', 50) . "\n";
    
    // Check if table exists
    if (!tableExists($pdo, $tableName)) {
        echo "   ⚠️  Table not found (OK if not using this feature)\n\n";
        continue;
    }
    
    $totalTables++;
    
    foreach ($indexNames as $indexName) {
        $totalIndexes++;
        
        if (indexExists($pdo, $tableName, $indexName)) {
            echo "   ✅ $indexName\n";
        } else {
            echo "   ❌ $indexName (MISSING)\n";
            $allExist = false;
            $missingIndexes[] = "$tableName.$indexName";
        }
    }
    
    echo "\n";
}

echo "==============================================\n";
echo "Summary\n";
echo "==============================================\n";
echo "Tables checked:    $totalTables\n";
echo "Total indexes:     $totalIndexes\n";

if ($allExist) {
    echo "Missing indexes:   0\n";
    echo "\n";
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
    echo "Missing indexes:   " . count($missingIndexes) . "\n";
    echo "\n";
    echo "❌ Missing indexes detected:\n\n";
    foreach ($missingIndexes as $index) {
        echo "   - $index\n";
    }
    echo "\n";
    echo "To add missing indexes, run:\n";
    echo "  php scripts/add-mysql-indexes.php\n";
    echo "\n";
    exit(1);
}
