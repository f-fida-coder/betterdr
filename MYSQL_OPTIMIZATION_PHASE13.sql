/**
 * Phase 13: MySQL Database Optimization
 * Configuration recommendations for production database
 * 
 * Apply these optimizations to improve query caching and connection pooling
 * to handle high concurrency (10k+ concurrent clients)
 */

-- =============================================================================
-- 1. QUERY CACHE OPTIMIZATION
-- =============================================================================
-- Enable query caching for SELECT statements (cache up to 64MB)
SET GLOBAL query_cache_type = 1;                    -- 1=ON, 0=OFF
SET GLOBAL query_cache_size = 67108864;             -- 64MB cache
SET GLOBAL query_cache_limit = 2097152;             -- 2MB max per query

-- Verify settings
SHOW VARIABLES LIKE 'query_cache%';

-- =============================================================================
-- 2. CONNECTION POOL OPTIMIZATION
-- =============================================================================
-- Increase max connections to handle connection pool scaling
SET GLOBAL max_connections = 500;                   -- Increased from 151 default

-- Connection timeout settings
SET GLOBAL interactive_timeout = 600;               -- 10 minutes
SET GLOBAL wait_timeout = 600;                      -- 10 minutes
SET GLOBAL connect_timeout = 10;                    -- 10 seconds

-- Verify settings
SHOW VARIABLES LIKE '%timeout%';
SHOW VARIABLES LIKE 'max_connections';

-- =============================================================================
-- 3. SLOW QUERY LOG FOR MONITORING
-- =============================================================================
-- Enable slow query log (queries >0.5 seconds logged)
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.5;                   -- 500ms threshold
SET GLOBAL log_slow_admin_statements = 'ON';
SET GLOBAL log_slow_slave_statements = 'ON';

-- Check current settings
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';

-- =============================================================================
-- 4. TABLE OPTIMIZATION - BETS TABLE
-- =============================================================================
-- Optimize matches table for READ-heavy queries
ALTER TABLE sports_betting.bets 
  ENGINE=InnoDB
  COMPRESSION='zstd'                                -- Reduce disk I/O
  ROW_FORMAT=COMPRESSED;

-- Add composite index for common filter queries
CREATE INDEX idx_user_status_date ON sports_betting.bets (user_id, status, created_at DESC);

-- Analyze table statistics for query optimizer
ANALYZE TABLE sports_betting.bets;

-- =============================================================================
-- 5. TABLE OPTIMIZATION - MATCHES TABLE
-- =============================================================================
-- Optimize matches table for frequent queries
ALTER TABLE sports_betting.matches
  ENGINE=InnoDB
  COMPRESSION='zstd';

-- Add status index for database-level filtering (Phase 5 optimization)
CREATE INDEX idx_status_refresh ON sports_betting.matches (status, last_refresh_at DESC);
CREATE INDEX idx_sport_status_date ON sports_betting.matches (sport_id, status, start_time ASC);

-- Analyze table statistics
ANALYZE TABLE sports_betting.matches;

-- =============================================================================
-- 6. INNODB BUFFER POOL TUNING
-- =============================================================================
-- Increase InnoDB buffer pool (50-80% of available RAM)
-- For 32GB server, recommend 16-25GB
SET GLOBAL innodb_buffer_pool_size = 26843545600;   -- 25GB (requires restart)

-- InnoDB flush settings for performance
SET GLOBAL innodb_flush_log_at_trx_commit = 2;      -- Balance: performance vs durability
SET GLOBAL innodb_flush_method = 'O_DIRECT';        -- Direct I/O, avoid caching
SET GLOBAL innodb_io_capacity = 20000;              -- Set to SSD capacity
SET GLOBAL innodb_io_capacity_max = 40000;

-- Verify settings
SHOW VARIABLES LIKE 'innodb_buffer_pool%';
SHOW VARIABLES LIKE 'innodb_flush%';

-- =============================================================================
-- 7. PREPARED STATEMENT OPTIMIZATION
-- =============================================================================
-- Enable query plan caching for prepared statements
SET GLOBAL query_cache_wlock_invalidate = OFF;      -- Keep cache for writes to same table
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- =============================================================================
-- 8. MONITORING QUERY PERFORMANCE
-- =============================================================================
-- Check current query cache stats (cache hits vs misses)
SHOW STATUS LIKE 'Qcache%';

-- Expected output:
-- Qcache_hits: Number of cache hits (should be growing)
-- Qcache_inserts: New queries added to cache
-- Qcache_queries_in_cache: Currently cached queries
-- Qcache_free_memory: Available cache space

-- Monitor connection usage
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Threads_running';

-- Monitor slow queries (check /var/log/mysql/slow-query.log on Unix)
-- SELECT * FROM mysql.slow_log;

-- =============================================================================
-- 9. CLEANUP: REMOVE OLD QUERY CACHE DATA
-- =============================================================================
-- Clear query cache (if needed for maintenance)
-- FLUSH QUERY CACHE;                               -- Clears all cached queries
-- RESET QUERY CACHE;                               -- Resets cache statistics

-- =============================================================================
-- 10. VERIFICATION CHECKLIST
-- =============================================================================
-- After applying optimizations, verify:
-- ✓ Query cache enabled and populated
-- ✓ Max connections set to 500 (handles 10k concurrent with PHP pooling)
-- ✓ Slow query log monitoring for >500ms queries
-- ✓ Table compression enabled on bets/matches
-- ✓ Proper indexes created for frequent filters
-- ✓ InnoDB buffer pool configured for available RAM
-- ✓ Prepared statements using connection pool from PHP

-- Run this query to check optimization status:
SELECT 
  'Query Cache' as metric, CONCAT(ROUND((@@query_cache_size)/1024/1024, 2), 'MB') as value
UNION ALL SELECT 
  'Max Connections', @@max_connections
UNION ALL SELECT 
  'Buffer Pool Size', CONCAT(ROUND((@@innodb_buffer_pool_size)/1024/1024/1024, 2), 'GB')
UNION ALL SELECT 
  'Slow Query Log', IF(@@slow_query_log='ON', 'ENABLED', 'DISABLED')
UNION ALL SELECT 
  'Long Query Time', CONCAT(@@long_query_time, 's');
