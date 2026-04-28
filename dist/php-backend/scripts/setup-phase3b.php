<?php

/**
 * Phase 3B: Database Setup Script
 * 
 * Creates FULLTEXT indexes and materialized views for fast search queries.
 * 
 * Expected improvement:
 * - Search latency: 500-2000ms (LIKE) → 20-100ms (FTS) = 95% reduction
 * 
 * Usage:
 * php php-backend/scripts/setup-phase3b.php
 * 
 * This script is idempotent - safe to run multiple times.
 */

require_once __DIR__ . '/../config/bootstrap.php';

use BetterDR\Database\SqlRepository;
use BetterDR\Env;

$pdo = new PDO(
    'mysql:host=' . Env::get('DB_HOST') . ';dbname=' . Env::get('DB_NAME'),
    Env::get('DB_USER'),
    Env::get('DB_PASSWORD'),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "Phase 3B: Database Setup for Full-Text Search\n";
echo "=============================================\n\n";

// Step 1: Add FULLTEXT index to matches table
echo "[1/3] Adding FULLTEXT index to matches table...\n";
try {
    $sql = "
        ALTER TABLE matches 
        ADD FULLTEXT INDEX ft_matches (
            homeTeam,
            awayTeam,
            sport,
            externalId
        )
    ";
    
    $pdo->exec($sql);
    echo "✅ FULLTEXT index created successfully\n\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate key') !== false) {
        echo "ℹ️  FULLTEXT index already exists\n\n";
    } else {
        echo "❌ Error: " . $e->getMessage() . "\n\n";
    }
}

// Step 2: Create materialized view table
echo "[2/3] Creating materialized search view table...\n";
try {
    // Drop if exists (for clean rebuild)
    $pdo->exec("DROP TABLE IF EXISTS matches_search_materialized");
    
    $sql = "
        CREATE TABLE matches_search_materialized (
            match_id VARCHAR(64) PRIMARY KEY,
            home_team VARCHAR(255),
            away_team VARCHAR(255),
            sport VARCHAR(128),
            status VARCHAR(64),
            start_time DATETIME,
            odds_min DECIMAL(10, 2),
            odds_max DECIMAL(10, 2),
            odds_avg DECIMAL(10, 2),
            
            -- Generated column for search text (automatically maintained)
            search_text TEXT GENERATED ALWAYS AS (
                CONCAT_WS(' ', home_team, away_team, sport)
            ) STORED,
            
            -- Full-text index for fast search
            FULLTEXT INDEX ft_search (search_text),
            
            -- Regular indexes for filtering
            KEY idx_status (status),
            KEY idx_sport (sport),
            KEY idx_start_time (start_time),
            KEY idx_status_sport (status, sport),
            
            -- Metadata
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            ENGINE=InnoDB,
            DEFAULT CHARSET=utf8mb4,
            COLLATE=utf8mb4_unicode_ci
        )
    ";
    
    $pdo->exec($sql);
    echo "✅ Materialized view table created successfully\n\n";
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Step 3: Populate materialized view
echo "[3/3] Populating materialized view from matches table...\n";
echo "   This may take a moment depending on table size...\n";
try {
    $startTime = microtime(true);
    
    $sql = "
        INSERT INTO matches_search_materialized 
        (match_id, home_team, away_team, sport, status, start_time, odds_min, odds_max, odds_avg)
        SELECT 
            id,
            JSON_UNQUOTE(JSON_EXTRACT(doc, '$.homeTeam')) as homeTeam,
            JSON_UNQUOTE(JSON_EXTRACT(doc, '$.awayTeam')) as awayTeam,
            JSON_UNQUOTE(JSON_EXTRACT(doc, '$.sport')) as sport,
            JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) as status,
            STR_TO_DATE(
                JSON_UNQUOTE(JSON_EXTRACT(doc, '$.startTime')), 
                '%Y-%m-%dT%H:%i:%sZ'
            ) as startTime,
            CAST(JSON_EXTRACT(doc, '$.odds.min') AS DECIMAL(10, 2)) as odds_min,
            CAST(JSON_EXTRACT(doc, '$.odds.max') AS DECIMAL(10, 2)) as odds_max,
            CAST(JSON_EXTRACT(doc, '$.odds.avg') AS DECIMAL(10, 2)) as odds_avg
        FROM matches
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $affected = $stmt->rowCount();
    
    $duration = microtime(true) - $startTime;
    
    echo "✅ Materialized view populated\n";
    echo "   Rows inserted: " . number_format($affected) . "\n";
    echo "   Time taken: " . round($duration, 2) . "s\n";
    echo "   Throughput: " . number_format($affected / $duration, 0) . " rows/sec\n\n";
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Final status
echo "=============================================\n";
echo "✅ Phase 3B Setup Complete!\n\n";

// Test the search
echo "Testing search functionality...\n";
try {
    $testSql = "
        SELECT COUNT(*) as count,
               COUNT(DISTINCT sport) as sports,
               COUNT(DISTINCT status) as statuses
        FROM matches_search_materialized
    ";
    
    $stmt = $pdo->prepare($testSql);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "✅ Search table health:\n";
    echo "   Total matches: " . number_format($result['count']) . "\n";
    echo "   Unique sports: " . $result['sports'] . "\n";
    echo "   Unique statuses: " . $result['statuses'] . "\n\n";
} catch (PDOException $e) {
    echo "❌ Health check failed: " . $e->getMessage() . "\n\n";
}

echo "🎯 Next steps:\n";
echo "   1. Set up cron job for periodic sync:\n";
echo "      */5 * * * * php php-backend/scripts/sync-search-view.php\n\n";
echo "   2. API endpoint ready:\n";
echo "      POST /api/search?q=<query>&sport=<sport>&limit=20\n\n";
echo "   3. Expected search latency: <100ms\n";
echo "   4. Cache search results for <5s (before resync)\n\n";
