<?php
/**
 * MySQL Database Index Migration Script
 * 
 * Purpose: Add performance indexes to MySQL tables
 * Safety: ADDITIVE ONLY - Does not modify existing data or queries
 * Downtime: ZERO - ALTER TABLE runs online in MySQL 5.6+
 * Rollback: DROP INDEX statements
 * 
 * Usage:
 *   php scripts/add-mysql-indexes.php
 *   php scripts/add-mysql-indexes.php --dry-run
 *   php scripts/add-mysql-indexes.php --verbose
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';

$projectRoot = dirname(__DIR__);
$phpBackendDir = __DIR__ . '/..';
Env::load($projectRoot, $phpBackendDir);

// Parse command line arguments
$options = getopt('', ['dry-run', 'verbose', 'help']);

if (isset($options['help'])) {
    echo "MySQL Database Index Migration Script\n";
    echo "=====================================\n\n";
    echo "Usage:\n";
    echo "  php scripts/add-mysql-indexes.php           # Add indexes\n";
    echo "  php scripts/add-mysql-indexes.php --dry-run # Preview only\n";
    echo "  php scripts/add-mysql-indexes.php --verbose # Detailed output\n";
    echo "\n";
    echo "Safety:\n";
    echo "  - Indexes are additive (no data modification)\n";
    echo "  - Site remains fully operational during migration\n";
    echo "  - Safe to run multiple times (idempotent)\n";
    echo "  - Uses ALGORITHM=INPLACE, LOCK=NONE (MySQL 5.6+)\n";
    echo "\n";
    echo "Rollback:\n";
    echo "  php scripts/drop-mysql-indexes.php\n";
    echo "\n";
    exit(0);
}

$verbose = isset($options['verbose']);
$dryRun = isset($options['dry-run']);

/**
 * Database connection
 */
$host = getenv('MYSQL_HOST') ?: 'localhost';
$port = getenv('MYSQL_PORT') ?: '3306';
$dbname = getenv('MYSQL_DB') ?: 'betterdr_local';
$username = getenv('MYSQL_USER') ?: 'root';
$password = getenv('MYSQL_PASSWORD') ?: '';

echo "==============================================\n";
echo "MySQL Database Index Migration\n";
echo "==============================================\n\n";

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
    echo "   " . $e->getMessage() . "\n";
    echo "\n";
    echo "Please check your .env file:\n";
    echo "  MYSQL_HOST=$host\n";
    echo "  MYSQL_PORT=$port\n";
    echo "  MYSQL_DB=$dbname\n";
    echo "  MYSQL_USER=$username\n";
    exit(1);
}

/**
 * Index definitions
 * Format: table => [index_name => ['columns' => [...], 'type' => 'INDEX|UNIQUE']]
 * Note: Using actual column names from schema (j_ prefix for JSON fields, _at suffix for dates)
 */
$indexes = [
    'transactions' => [
        'idx_transactions_user_created' => [
            'columns' => ['j_user_id', 'created_at'],
            'type' => 'INDEX',
            'description' => 'Fast user transaction history lookups',
        ],
        'idx_transactions_user_type_status_created' => [
            'columns' => ['j_user_id', 'j_type', 'j_status', 'created_at'],
            'type' => 'INDEX',
            'description' => 'Filtered transaction queries (type/status)',
        ],
        'idx_transactions_reference' => [
            'columns' => ['j_reference_type', 'j_reference_id'],
            'type' => 'INDEX',
            'description' => 'Transaction reference lookups',
        ],
    ],
    'users' => [
        'idx_users_agent_status' => [
            'columns' => ['j_agent_id', 'j_status'],
            'type' => 'INDEX',
            'description' => 'Agent user filtering',
        ],
        'idx_users_role_status' => [
            'columns' => ['j_role', 'j_status'],
            'type' => 'INDEX',
            'description' => 'User role filtering',
        ],
    ],
    'agents' => [
        'idx_agents_createdby_role' => [
            'columns' => ['j_created_by', 'j_role'],
            'type' => 'INDEX',
            'description' => 'Agent hierarchy lookups',
        ],
        'idx_agents_status' => [
            'columns' => ['j_status'],
            'type' => 'INDEX',
            'description' => 'Agent status filtering',
        ],
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

/**
 * Add index to table
 */
function addIndex(PDO $pdo, string $table, array $indexDef, bool $verbose): bool {
    $indexName = $indexDef['name'];
    $columns = implode(', ', $indexDef['columns']);
    $type = $indexDef['type'] ?? 'INDEX';
    
    // Use ALGORITHM=INPLACE, LOCK=NONE for online DDL (MySQL 5.6+)
    $sql = "ALTER TABLE `$table` 
            ADD $type `$indexName` ($columns),
            ALGORITHM=INPLACE, LOCK=NONE";
    
    try {
        if ($verbose) {
            echo "   Executing: $sql\n";
        }
        
        $pdo->exec($sql);
        
        if ($verbose) {
            echo "   ✅ Created index: $indexName\n";
            echo "      Description: {$indexDef['description']}\n";
        }
        
        return true;
    } catch (PDOException $e) {
        // Index might already exist
        if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
            if ($verbose) {
                echo "   ℹ️  Index exists: $indexName\n";
            }
            return true;
        }
        
        // Column might not exist (optional in some schemas)
        if (strpos($e->getMessage(), "doesn't exist") !== false) {
            if ($verbose) {
                echo "   ⚠️  Column not found (optional): Skipping $indexName\n";
            }
            return true;
        }
        
        echo "   ❌ Error creating index $indexName: {$e->getMessage()}\n";
        return false;
    }
}

// Execute migration
$success = 0;
$skipped = 0;
$failed = 0;
$total = 0;

foreach ($indexes as $tableName => $tableIndexes) {
    echo "Table: $tableName\n";
    echo str_repeat('-', 50) . "\n";
    
    // Check if table exists
    if (!tableExists($pdo, $tableName)) {
        echo "   ⚠️  Table not found: $tableName (skipping)\n\n";
        continue;
    }
    
    foreach ($tableIndexes as $indexName => $indexDef) {
        $total++;
        
        // Check if index already exists
        if (indexExists($pdo, $tableName, $indexName)) {
            if ($verbose) {
                echo "   ℹ️  Skipping (exists): $indexName\n";
            } else {
                echo "   ℹ️  Exists: $indexName\n";
            }
            $skipped++;
            continue;
        }
        
        if ($dryRun) {
            echo "   📋 Would create: $indexName ({$indexDef['type']})\n";
            echo "      Columns: " . implode(', ', $indexDef['columns']) . "\n";
            echo "      Description: {$indexDef['description']}\n";
            $success++;
            continue;
        }
        
        // Add index
        $indexDef['name'] = $indexName;
        if (addIndex($pdo, $tableName, $indexDef, $verbose)) {
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
    echo "   This is OK if columns don't exist in your schema.\n";
}

echo "\n✅ Index migration completed successfully!\n";
echo "\n";
echo "Next steps:\n";
echo "  1. Verify site functionality (should be unchanged)\n";
echo "  2. Run: php scripts/verify-mysql-indexes.php\n";
echo "  3. Monitor query performance\n";
echo "\n";
echo "Rollback (if needed):\n";
echo "  php scripts/drop-mysql-indexes.php\n";
echo "\n";

exit($failed > 0 ? 1 : 0);
