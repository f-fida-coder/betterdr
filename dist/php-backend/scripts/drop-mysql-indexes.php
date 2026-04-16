<?php
/**
 * MySQL Index Rollback Script
 * 
 * Purpose: Drop indexes added by add-mysql-indexes.php
 * Safety: Reversible - Can re-add with add-mysql-indexes.php
 * Downtime: ZERO - DROP INDEX is instant
 * 
 * Usage:
 *   php scripts/drop-mysql-indexes.php
 *   php scripts/drop-mysql-indexes.php --dry-run
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';

$projectRoot = dirname(__DIR__);
$phpBackendDir = __DIR__ . '/..';
Env::load($projectRoot, $phpBackendDir);

$options = getopt('', ['dry-run', 'verbose', 'help']);

if (isset($options['help'])) {
    echo "MySQL Index Rollback Script\n";
    echo "===========================\n\n";
    echo "Usage:\n";
    echo "  php scripts/drop-mysql-indexes.php           # Drop indexes\n";
    echo "  php scripts/drop-mysql-indexes.php --dry-run # Preview only\n";
    echo "\n";
    echo "Warning:\n";
    echo "  - This will remove performance indexes\n";
    echo "  - Queries may become slower\n";
    echo "  - Safe to re-add with add-mysql-indexes.php\n";
    echo "\n";
    exit(0);
}

$verbose = isset($options['verbose']);
$dryRun = isset($options['dry-run']);

echo "==============================================\n";
echo "MySQL Index Rollback\n";
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
 * Indexes to drop (must match add-mysql-indexes.php)
 */
$indexesToDrop = [
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

$success = 0;
$skipped = 0;
$failed = 0;
$total = 0;

foreach ($indexesToDrop as $tableName => $indexNames) {
    echo "Table: $tableName\n";
    echo str_repeat('-', 50) . "\n";
    
    // Check if table exists
    if (!tableExists($pdo, $tableName)) {
        echo "   ⚠️  Table not found: $tableName\n\n";
        continue;
    }
    
    foreach ($indexNames as $indexName) {
        $total++;
        
        // Check if index exists
        if (!indexExists($pdo, $tableName, $indexName)) {
            if ($verbose) {
                echo "   ℹ️  Not found: $indexName\n";
            }
            $skipped++;
            continue;
        }
        
        if ($dryRun) {
            echo "   📋 Would drop: $indexName\n";
            $success++;
            continue;
        }
        
        // Drop index
        try {
            $pdo->exec("ALTER TABLE `$tableName` DROP INDEX `$indexName`, ALGORITHM=INPLACE, LOCK=NONE");
            if ($verbose) {
                echo "   ✅ Dropped: $indexName\n";
            }
            $success++;
        } catch (PDOException $e) {
            echo "   ❌ Error dropping $indexName: {$e->getMessage()}\n";
            $failed++;
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
echo "  php scripts/add-mysql-indexes.php\n";
echo "\n";

exit($failed > 0 ? 1 : 0);
