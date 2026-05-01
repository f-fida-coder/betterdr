/**
 * Phase 13: MySQL Database Optimization
 * Configuration recommendations for production database
 * 
 * Apply these optimizations to improve query caching and connection pooling
 * to handle high concurrency (10k+ concurrent clients)
 */

-- =============================================================================
-- 1. InnoDB BUFFER POOL (replaces removed query_cache)
-- =============================================================================
-- NOTE: MySQL 8.0 REMOVED the query cache entirely (query_cache_type,
-- query_cache_size, query_cache_limit). Applying those settings on MySQL 8
-- causes an error and must NOT be run. Use InnoDB buffer pool tuning instead —
-- it achieves the same effect (hot data served from memory) more reliably.

-- Set buffer pool to 70-80% of total RAM (adjust to your server).
-- For 4 GB server → 3G. For 8 GB server → 6G. For 16 GB server → 12G.
-- This is the single most impactful MySQL tuning parameter.
SET GLOBAL innodb_buffer_pool_size = 3221225472;    -- 3 GB example (adjust to your RAM)

-- Verify current buffer pool size
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
SHOW STATUS  LIKE 'Innodb_buffer_pool_read_requests';
SHOW STATUS  LIKE 'Innodb_buffer_pool_reads'; -- should be <5% of read_requests

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
-- NOTE: query_cache_wlock_invalidate was also removed in MySQL 8.0 — do not apply.
-- Prepared statement plan caching is automatic in MySQL 8.0 via the optimizer.
-- Enforce strict mode (prevents silent data truncation / bad inserts).
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- =============================================================================
-- 8. MONITORING QUERY PERFORMANCE (MySQL 8.0 compatible)
-- =============================================================================
-- Buffer pool efficiency (cache-hit ratio should be >99%)
SHOW STATUS LIKE 'Innodb_buffer_pool_read_requests';
SHOW STATUS LIKE 'Innodb_buffer_pool_reads';

-- Connection usage
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Threads_running';
SHOW STATUS LIKE 'Connection_errors_max_connections';

-- Top slow queries from performance_schema (MySQL 8.0 replacement for slow_log)
SELECT schema_name, digest_text, count_star, avg_timer_wait/1e12 AS avg_sec
FROM performance_schema.events_statements_summary_by_digest
ORDER BY avg_timer_wait DESC
LIMIT 20;

-- Monitor InnoDB row lock waits (indicates lock contention)
SHOW STATUS LIKE 'Innodb_row_lock_waits';
SHOW STATUS LIKE 'Innodb_row_lock_time_avg';

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
