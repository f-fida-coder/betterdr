-- =============================================================================
-- PRODUCTION INDEXING PLAYBOOK — apply via phpMyAdmin → SQL tab
-- Database: u487877829_bettor_bets_24 (Hostinger shared MySQL)
-- =============================================================================
-- ⚠ Run sections in order. Each section is independently safe.
--   Section 1 = read-only audit. Run it first, paste output to Claude.
--   Section 2 = Tier 1 indexes (highest confidence). Apply after Section 1
--               confirms the corresponding tables are large + un-indexed.
--   Section 3 = Tier 2 indexes (apply only if Section 1 audit shows the
--               specific query shape is currently full-scanning).
--   Section 4 = Verification (read-only). Run after each apply.
--   Section 5 = Rollback (DROP INDEX). Keep handy in case any index
--               turns out to hurt write throughput more than it helps.
--
-- WHY THIS IS SAFE:
--   - CREATE INDEX in InnoDB on MySQL 5.7+ is an ONLINE operation.
--     Writes continue during index build. The ALTER may take 30s-5min
--     on large tables, but no app downtime.
--   - DROP INDEX is also online and instant.
--   - No row data is changed. Only auxiliary B-tree structures are
--     added. If a query was working before, it works after — just
--     faster.
--
-- BEFORE YOU START:
--   - phpMyAdmin → select database u487877829_bettor_bets_24
--   - Run a quick health check: SELECT 1; (should return "1")
--   - Take a backup snapshot via Hostinger panel (precaution; it's
--     extremely unlikely you'll need to restore from a CREATE INDEX).
-- =============================================================================



-- =============================================================================
-- SECTION 1 — READ-ONLY AUDIT (run this first, paste output back)
-- =============================================================================
-- Tells us:
--   1.1 Which tables are big enough to benefit from indexing.
--   1.2 Which indexes already exist (avoid creating duplicates).
--   1.3 Whether the hot queries are currently full-scanning.
-- Total runtime: < 5 seconds. Pure SELECT.
-- =============================================================================

-- 1.1 Table sizes (top 30 by bytes)
SELECT
    TABLE_NAME,
    TABLE_ROWS                                            AS approx_rows,
    ROUND(DATA_LENGTH  / 1024 / 1024, 2)                  AS data_mb,
    ROUND(INDEX_LENGTH / 1024 / 1024, 2)                  AS index_mb,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2)  AS total_mb,
    ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
LIMIT 30;

-- 1.2 Existing indexes on the hot tables
SELECT
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns,
    INDEX_TYPE,
    NON_UNIQUE,
    CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('users','bets','casino_bets','transactions','iplogs',
                     'matches','betselections','messages','wagers')
GROUP BY TABLE_NAME, INDEX_NAME, INDEX_TYPE, NON_UNIQUE, CARDINALITY
ORDER BY TABLE_NAME, INDEX_NAME;

-- 1.3 EXPLAIN of the queries we expect to need indexing.
-- Replace ANY_USER_ID with any real id from `SELECT id FROM users LIMIT 1`.
-- Replace ANY_AGENT_ID similarly. The literal value doesn't have to match
-- a real row — EXPLAIN only cares about the query SHAPE.

EXPLAIN SELECT * FROM transactions
 WHERE userId = 'ANY_USER_ID'
 ORDER BY createdAt DESC LIMIT 50;

EXPLAIN SELECT * FROM transactions
 WHERE userId = 'ANY_USER_ID' AND type = 'deposit'
   AND createdAt >= NOW() - INTERVAL 7 DAY
 ORDER BY createdAt DESC LIMIT 200;

EXPLAIN SELECT * FROM casino_bets
 WHERE userId = 'ANY_USER_ID'
 ORDER BY createdAt DESC LIMIT 50;

EXPLAIN SELECT id, username FROM users
 WHERE agentId = 'ANY_AGENT_ID';

EXPLAIN SELECT * FROM iplogs
 WHERE ip = '1.2.3.4' AND status = 'whitelisted';

EXPLAIN SELECT * FROM betselections WHERE status = 'pending';

-- 1.4 Server version (informational — affects which DDL syntax is fastest)
SELECT VERSION() AS mysql_version;



-- =============================================================================
-- SECTION 2 — TIER 1 INDEXES (HIGH CONFIDENCE — apply after Section 1 audit)
-- =============================================================================
-- These four indexes target query shapes I'm 95%+ confident exist based on
-- the actual controller code in php-backend/src/. Apply them ONE AT A TIME
-- (run the index, then run the matching VERIFY in Section 4, confirm
-- improvement, move on).
--
-- All four are simple composite indexes on already-existing columns. None
-- requires adding a column or changing a table definition.
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 2.1 transactions (userId, createdAt DESC)
--
-- WHY: WalletController::getUserTransactions, getFigures and AgentController
--      cuts queries all run "SELECT ... FROM transactions WHERE userId=?
--      ORDER BY createdAt DESC LIMIT N". Without this index, every call
--      filesorts the result.
-- IMPACT: typically 50-200ms → 1-3ms on this query. Visible on the
--         "My Bets → Transactions" page and any agent cuts page.
-- ROLLBACK: DROP INDEX idx_tx_user_created ON transactions;
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE transactions
  ADD INDEX idx_tx_user_created (userId, createdAt DESC),
  ALGORITHM=INPLACE, LOCK=NONE;

-- ────────────────────────────────────────────────────────────────────────────
-- 2.2 casino_bets (userId, createdAt DESC)
--
-- WHY: CasinoController bet history + admin reports filter on userId and
--      sort by createdAt DESC. Heavy table — likely the second-largest in
--      the DB after transactions.
-- IMPACT: 50-300ms → 2-5ms on history page loads.
-- ROLLBACK: DROP INDEX idx_casino_user_created ON casino_bets;
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE casino_bets
  ADD INDEX idx_casino_user_created (userId, createdAt DESC),
  ALGORITHM=INPLACE, LOCK=NONE;

-- ────────────────────────────────────────────────────────────────────────────
-- 2.3 users (agentId)
--
-- WHY: AgentController dashboard runs "SELECT ... FROM users WHERE agentId=?"
--      multiple times per page load to build the downline. No index = full
--      scan of the users table on every agent page hit.
-- IMPACT: scales with users table size. On a 10k user table, ~30-80ms →
--         <1ms. Felt instantly on every agent dashboard load.
-- ROLLBACK: DROP INDEX idx_users_agent ON users;
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD INDEX idx_users_agent (agentId),
  ALGORITHM=INPLACE, LOCK=NONE;

-- ────────────────────────────────────────────────────────────────────────────
-- 2.4 iplogs (ip, status)
--
-- WHY: WalletController::requestWithdrawal hits iplogs WHERE ip=? AND
--      status='whitelisted' on EVERY withdrawal request. Without an index,
--      every withdrawal does a full scan of the iplogs table.
-- IMPACT: 5-50ms → <1ms per withdrawal. Lower visible impact than the
--         others because withdrawals are infrequent, but the savings
--         compound on busy days.
-- ROLLBACK: DROP INDEX idx_iplogs_ip_status ON iplogs;
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE iplogs
  ADD INDEX idx_iplogs_ip_status (ip, status),
  ALGORITHM=INPLACE, LOCK=NONE;



-- =============================================================================
-- SECTION 3 — TIER 2 INDEXES (apply ONLY if Section 1 audit shows need)
-- =============================================================================
-- Conditional indexes. Run them only if Section 1's EXPLAIN output for the
-- corresponding query shows type=ALL (full scan) or rows >> result size.
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 3.1 transactions (userId, type, createdAt DESC)
--
-- APPLY ONLY IF: Section 1 EXPLAIN of the "userId + type + createdAt" query
--                shows it's not using idx_tx_user_created effectively
--                (Extra: "Using where; Using filesort").
-- WHY: WalletController::getFigures filters by userId AND type AND
--      createdAt range. The Tier 1 (userId, createdAt) index helps but
--      MySQL has to scan all type values. This 3-column index lets it
--      seek directly.
-- ROLLBACK: DROP INDEX idx_tx_user_type_created ON transactions;
-- ────────────────────────────────────────────────────────────────────────────
-- ALTER TABLE transactions
--   ADD INDEX idx_tx_user_type_created (userId, type, createdAt DESC),
--   ALGORITHM=INPLACE, LOCK=NONE;

-- ────────────────────────────────────────────────────────────────────────────
-- 3.2 betselections (status)
--
-- APPLY ONLY IF: Section 1 EXPLAIN of "WHERE status='pending'" shows
--                type=ALL on betselections.
-- WHY: BetSettlementService scans betselections every settlement tick.
-- ROLLBACK: DROP INDEX idx_betselections_status ON betselections;
-- ────────────────────────────────────────────────────────────────────────────
-- ALTER TABLE betselections
--   ADD INDEX idx_betselections_status (status),
--   ALGORITHM=INPLACE, LOCK=NONE;

-- ────────────────────────────────────────────────────────────────────────────
-- 3.3 matches (updatedAt)
--
-- APPLY ONLY IF: Section 1 EXPLAIN of "WHERE updatedAt >= ... ORDER BY
--                updatedAt ASC" shows full scan AND the matches table is
--                > 50MB total. (Phase 13 already added other matches
--                indexes; this one targets the live-watermark query.)
-- ROLLBACK: DROP INDEX idx_matches_updated ON matches;
-- ────────────────────────────────────────────────────────────────────────────
-- ALTER TABLE matches
--   ADD INDEX idx_matches_updated (updatedAt),
--   ALGORITHM=INPLACE, LOCK=NONE;



-- =============================================================================
-- SECTION 4 — VERIFICATION (run after each Section 2/3 ALTER)
-- =============================================================================
-- Confirms the new index is being used. Look for:
--   - type column = "ref" (or "range") — NOT "ALL"
--   - key column = the new index name
--   - Extra column does NOT include "Using filesort" or "Using temporary"
-- =============================================================================

-- After 2.1
EXPLAIN SELECT * FROM transactions
 WHERE userId = 'ANY_USER_ID'
 ORDER BY createdAt DESC LIMIT 50;

-- After 2.2
EXPLAIN SELECT * FROM casino_bets
 WHERE userId = 'ANY_USER_ID'
 ORDER BY createdAt DESC LIMIT 50;

-- After 2.3
EXPLAIN SELECT id, username FROM users
 WHERE agentId = 'ANY_AGENT_ID';

-- After 2.4
EXPLAIN SELECT * FROM iplogs
 WHERE ip = '1.2.3.4' AND status = 'whitelisted';

-- Index sizes after apply (should be a small fraction of the table)
SELECT
    TABLE_NAME,
    INDEX_NAME,
    ROUND(stat_value * @@innodb_page_size / 1024 / 1024, 2) AS size_mb
FROM mysql.innodb_index_stats
WHERE database_name = DATABASE()
  AND stat_name = 'size'
  AND INDEX_NAME LIKE 'idx_%'
ORDER BY size_mb DESC;



-- =============================================================================
-- SECTION 5 — ROLLBACK (only if a specific index hurt write throughput)
-- =============================================================================
-- Drop a single index instantly. Run only one of these as needed.
-- =============================================================================

-- DROP INDEX idx_tx_user_created       ON transactions;
-- DROP INDEX idx_casino_user_created   ON casino_bets;
-- DROP INDEX idx_users_agent           ON users;
-- DROP INDEX idx_iplogs_ip_status      ON iplogs;
-- DROP INDEX idx_tx_user_type_created  ON transactions;
-- DROP INDEX idx_betselections_status  ON betselections;
-- DROP INDEX idx_matches_updated       ON matches;



-- =============================================================================
-- HOW TO RUN — recommended order
-- =============================================================================
-- 1. Open phpMyAdmin (Hostinger panel → "Databases" → "phpMyAdmin").
-- 2. Pick database u487877829_bettor_bets_24 from the left sidebar.
-- 3. Click the "SQL" tab.
-- 4. Paste only SECTION 1. Click "Go". Save the output (screenshot or
--    copy-paste). Send it to Claude.
-- 5. Wait for Claude's confirmation that the Tier 1 indexes are sensible
--    given your actual data. (For example, if a table is < 500 rows or
--    if Section 1.2 shows the index already exists, that one will be
--    skipped.)
-- 6. Apply Section 2 ONE block at a time. Each ALTER will print
--    "Query OK, 0 rows affected" plus a duration. Expected time on a
--    medium-size table: 5-60 seconds.
-- 7. After each Section 2 apply, run the matching Section 4 EXPLAIN
--    and confirm "key" column shows the new index name.
-- 8. Re-load the relevant page in the live site (My Bets, Agent
--    Dashboard, etc.) and notice the speed.
-- 9. If anything regresses (writes slow down, disk fills): apply the
--    matching Section 5 DROP INDEX line. Returns table to prior state.
