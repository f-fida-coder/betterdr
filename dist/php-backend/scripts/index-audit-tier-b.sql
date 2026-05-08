-- =============================================================================
-- Tier B — Index audit: candidate indexes derived from controller query shapes
-- =============================================================================
-- This file is READ-ONLY documentation + verification queries until you
-- explicitly uncomment a CREATE INDEX line.
--
-- WORKFLOW:
--   1. Run the EXPLAIN queries in section "VERIFY" below against a real
--      production-shape dataset.
--   2. For each candidate index, decide based on:
--        - EXPLAIN shows "type=ALL" or "rows examined" >> rows returned, AND
--        - the slow-query log (Tier A) shows the matching pattern often
--   3. Apply ONE CREATE INDEX at a time during off-peak. Each is a metadata
--      operation in MySQL 8 (instant DDL on InnoDB) but watch the binlog if
--      you replicate.
--   4. Re-run EXPLAIN to confirm "Using index" or "ref" lookup.
--   5. ROLLBACK any index that didn't help with: DROP INDEX <name> ON <table>;
--
-- Phase 13 already created:
--   - bets (user_id, status, created_at DESC)   AS idx_user_status_date
--   - matches (status, last_refresh_at DESC)    AS idx_status_refresh
--   - matches (sport_id, status, start_time)    AS idx_sport_status_date
--
-- Candidates below are NEW and not yet present (verify with SHOW INDEX first).
-- =============================================================================


-- =============================================================================
-- 0. PRE-FLIGHT — confirm what's already indexed
-- =============================================================================
-- Run these first; skip any candidate whose index already exists under a
-- different name.

SHOW INDEX FROM transactions;
SHOW INDEX FROM bets;
SHOW INDEX FROM casino_bets;
SHOW INDEX FROM users;
SHOW INDEX FROM iplogs;
SHOW INDEX FROM betselections;
SHOW INDEX FROM matches;


-- =============================================================================
-- 1. transactions — userId+createdAt is the dominant filter
-- =============================================================================
-- Hot callers:
--   - WalletController::getUserTransactions  (transactions WHERE userId=? sort createdAt DESC)
--   - WalletController::getFigures           (transactions WHERE userId=? AND type IN (...) AND createdAt >= ?)
--   - AgentController::1195                  (transactions WHERE userId IN (...) AND createdAt >= ?)
--   - AgentCutsController::751               (transactions WHERE userId=? AND ... ORDER BY createdAt DESC)
--   - AgentSettlementSnapshotService::436    (transactions WHERE userId IN (...) AND createdAt range)
--
-- Recommended composite index:
--   (userId, createdAt DESC)
--
-- This serves both the simple "my last N transactions" query and the
-- range-by-date queries from agent/snapshot code paths. The DESC matters:
-- without it, MySQL falls back to a filesort for the most common shape.
--
-- VERIFY before applying:
--   EXPLAIN SELECT * FROM transactions
--      WHERE userId = 1 ORDER BY createdAt DESC LIMIT 50;
--   -> Look for: type=ref, key=idx_tx_user_created (after creation),
--      Extra DOES NOT contain "Using filesort" or "Using temporary".
--
-- Once verified, apply:
-- CREATE INDEX idx_tx_user_created ON transactions (userId, createdAt DESC);

-- If queries also frequently filter by `type`, prefer this fatter index
-- INSTEAD of the one above (it covers both filtered and unfiltered cases):
-- CREATE INDEX idx_tx_user_type_created ON transactions (userId, type, createdAt DESC);


-- =============================================================================
-- 2. casino_bets — userId+createdAt for history + reporting
-- =============================================================================
-- Hot callers:
--   - CasinoController::5808                  (player history list)
--   - CasinoController::5931, 5940, 6045      (admin history exports + filters)
--   - CasinoController::6585                  (cross-product P&L pull)
--   - WalletController::743                   (figures aggregation)
--
-- Recommended:
--   (userId, createdAt DESC)
--
-- VERIFY:
--   EXPLAIN SELECT * FROM casino_bets
--      WHERE userId = 1 ORDER BY createdAt DESC LIMIT 50;
--
-- Apply:
-- CREATE INDEX idx_casino_bets_user_created ON casino_bets (userId, createdAt DESC);

-- If the admin export filters by status often:
-- CREATE INDEX idx_casino_bets_status_created ON casino_bets (status, createdAt DESC);


-- =============================================================================
-- 3. users — agentId lookups (agent hierarchy resolution)
-- =============================================================================
-- Hot callers:
--   - AgentController::403  (users WHERE agentId = ?)
--   - AgentController::848  (users WHERE agentId IN (...) for cuts)
--   - AgentController::1162 (same)
--   - AgentCutsController::202 (users WHERE agentId IN (...))
--
-- These run on every agent dashboard load. Without an index, each call
-- full-scans `users`.
--
-- VERIFY:
--   EXPLAIN SELECT id, username FROM users WHERE agentId = 'AGENT_ID_HERE';
--
-- Apply:
-- CREATE INDEX idx_users_agent ON users (agentId);

-- If you also frequently filter by agentId + active status / role:
-- CREATE INDEX idx_users_agent_status ON users (agentId, status);


-- =============================================================================
-- 4. iplogs — IP lookups during login/withdrawal compliance check
-- =============================================================================
-- Hot caller:
--   - WalletController::531   (iplogs WHERE ip = ? AND status = 'whitelisted')
--   - WalletController::534   (iplogs WHERE userId = ? AND ip = ?, projection-only)
--
-- This runs on every withdrawal request — must be fast.
--
-- VERIFY:
--   EXPLAIN SELECT * FROM iplogs WHERE ip = '1.2.3.4' AND status = 'whitelisted';
--
-- Apply:
-- CREATE UNIQUE INDEX idx_iplogs_ip_status ON iplogs (ip, status);
-- Note: UNIQUE is only safe if (ip,status) is logically unique. If duplicate
-- ip+status rows exist (e.g. multiple users sharing one whitelisted IP),
-- drop UNIQUE and use a plain INDEX. SHOW INDEX FROM iplogs first.


-- =============================================================================
-- 5. betselections — pending settlement scan
-- =============================================================================
-- Hot caller:
--   - BetSettlementService::27, 77, 345  (betselections WHERE status='pending' ...)
--   - BetSettlementService::411          (bets WHERE status='pending' ...)
--
-- The settlement worker scans these tables every tick. A status-only index
-- is small and sharp.
--
-- VERIFY:
--   EXPLAIN SELECT * FROM betselections WHERE status = 'pending';
--
-- Apply (skip if Phase 13 idx_user_status_date already covers most queries):
-- CREATE INDEX idx_betselections_status ON betselections (status, matchId);
-- The trailing matchId helps the join the settlement service does on
-- match outcomes; drop it if your settlement code paths don't join.


-- =============================================================================
-- 6. matches — updatedAt scan (live polling watermark)
-- =============================================================================
-- Hot caller:
--   - MatchesController::1321  (matches WHERE updatedAt >= ? ORDER BY updatedAt ASC)
--   - SportsbookHealth::549    (matches ORDER BY <field> DESC, updatedAt DESC LIMIT 1)
--
-- Phase 13 added (status, last_refresh_at). If `updatedAt` is a separate
-- column from `last_refresh_at`, the polling watermark query has no index.
--
-- VERIFY:
--   SHOW COLUMNS FROM matches LIKE 'updatedAt';
--   EXPLAIN SELECT * FROM matches WHERE updatedAt >= NOW() - INTERVAL 5 MINUTE
--      ORDER BY updatedAt ASC LIMIT 200;
--
-- If updatedAt is a real column AND not covered:
-- CREATE INDEX idx_matches_updated ON matches (updatedAt);


-- =============================================================================
-- 7. messages — inbox queries (verify if needed)
-- =============================================================================
-- Add only after the slow-log shows messages-related queries are slow.
-- Common pattern from MessagesController is (userId, createdAt DESC).
--
-- CREATE INDEX idx_messages_user_created ON messages (userId, createdAt DESC);


-- =============================================================================
-- VERIFY — post-apply checks
-- =============================================================================
-- 1) Confirm the index is being used (Extra column should NOT have "Using filesort"):
--    EXPLAIN <the query>;
--
-- 2) Confirm cardinality is reasonable. A composite index with cardinality
--    of 1 means the leading column has only one value (useless index):
--    SELECT TABLE_NAME, INDEX_NAME, CARDINALITY
--      FROM information_schema.STATISTICS
--      WHERE TABLE_SCHEMA = DATABASE()
--        AND INDEX_NAME LIKE 'idx_%'
--      ORDER BY TABLE_NAME, INDEX_NAME;
--
-- 3) Watch index size. Indexes you don't use cost write throughput:
--    SELECT TABLE_NAME, INDEX_NAME,
--           ROUND(stat_value * @@innodb_page_size / 1024 / 1024, 2) AS size_mb
--      FROM mysql.innodb_index_stats
--      WHERE database_name = DATABASE()
--        AND stat_name = 'size'
--      ORDER BY size_mb DESC;
--
-- 4) Drop any candidate that didn't help:
--    DROP INDEX <name> ON <table>;


-- =============================================================================
-- ESTIMATED IMPACT
-- =============================================================================
-- Each missing composite index on a frequently-hit query typically costs
-- 5-100ms per call due to filesort or full scan. With 5-10 hot endpoints
-- benefiting from these indexes, expect:
--   - p50 API latency: -10 to -30ms
--   - p95 API latency: -30 to -150ms
--   - DB CPU: -10 to -25% under load
-- The exact numbers depend on row counts and cache state, but the
-- direction is consistent. Verify against actual measurements after
-- applying each index.
