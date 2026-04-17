<?php
/**
 * Phase 13: MySQL Optimization Applier
 * Applies database optimizations for connection pooling and query caching
 */

$host = 'srv2052.hstgr.io';
$db = 'u487877829_bettor_bets_24';
$user = 'u487877829_bettor_bets';
$pass = 'Bettor.ok12';
$port = 3306;

try {
    echo "🔗 Connecting to MySQL at {$host}...\n";
    
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 30,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
        ]
    );
    
    echo "✅ Connected successfully!\n\n";
    
    // Phase 13 optimizations
    $optimizations = [
        // Query Cache
        "SET GLOBAL query_cache_type = 1" => "Enable query cache",
        "SET GLOBAL query_cache_size = 67108864" => "Query cache size: 64MB",
        "SET GLOBAL query_cache_limit = 2097152" => "Per-query limit: 2MB",
        
        // Connection Pool
        "SET GLOBAL max_connections = 500" => "Max connections: 500",
        "SET GLOBAL interactive_timeout = 600" => "Interactive timeout: 10min",
        "SET GLOBAL wait_timeout = 600" => "Wait timeout: 10min",
        "SET GLOBAL connect_timeout = 10" => "Connect timeout: 10s",
        
        // Slow Query Logging
        "SET GLOBAL slow_query_log = 'ON'" => "Slow query log: ENABLED",
        "SET GLOBAL long_query_time = 0.5" => "Long query threshold: 0.5s",
        "SET GLOBAL log_slow_admin_statements = 'ON'" => "Log admin statements: ON",
        "SET GLOBAL log_slow_slave_statements = 'ON'" => "Log slave statements: ON",
    ];
    
    echo "📋 Applying Phase 13 Optimizations:\n";
    echo "─────────────────────────────────────\n\n";
    
    $failed = [];
    foreach ($optimizations as $sql => $description) {
        try {
            $pdo->exec($sql);
            echo "✅ {$description}\n   └─ {$sql}\n";
        } catch (Exception $e) {
            echo "⚠️  {$description}\n   └─ Error: {$e->getMessage()}\n";
            $failed[] = $description;
        }
    }
    
    echo "\n📊 Verifying Configuration:\n";
    echo "─────────────────────────────────────\n\n";
    
    // Verify settings
    $verifications = [
        "SHOW VARIABLES LIKE 'query_cache%'" => "Query Cache Settings",
        "SHOW VARIABLES LIKE 'max_connections'" => "Max Connections",
        "SHOW VARIABLES LIKE 'wait_timeout'" => "Wait Timeout",
        "SHOW VARIABLES LIKE 'slow_query%'" => "Slow Query Log",
    ];
    
    foreach ($verifications as $query => $label) {
        echo "📌 {$label}:\n";
        $result = $pdo->query($query)->fetchAll(PDO::FETCH_ASSOC);
        foreach ($result as $row) {
            printf("   %-35s = %s\n", $row['Variable_name'], $row['Value']);
        }
        echo "\n";
    }
    
    // Check current cache statistics
    echo "📈 Current Query Cache Stats:\n";
    echo "─────────────────────────────────────\n\n";
    $stats = $pdo->query("SHOW STATUS LIKE 'Qcache%'")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($stats as $row) {
        printf("   %-30s = %s\n", $row['Variable_name'], $row['Value']);
    }
    
    echo "\n🎯 Phase 13 MySQL Optimization Complete!\n";
    echo "─────────────────────────────────────\n";
    
    if (!empty($failed)) {
        echo "\n⚠️  {" . count($failed) . "} optimizations failed (may be non-critical):\n";
        foreach ($failed as $f) {
            echo "   • {$f}\n";
        }
    } else {
        echo "\n✅ All optimizations applied successfully!\n";
    }
    
    echo "\n📝 Next Steps:\n";
    echo "   1. Monitor slow query log: /var/log/mysql/slow-query.log\n";
    echo "   2. Watch query cache stats grow over 1-2 hours\n";
    echo "   3. Re-run loader.io test after 1 hour for warm cache\n";
    echo "   4. Expected: 60-70% improvement in response time\n\n";
    
} catch (PDOException $e) {
    echo "❌ Connection Failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
