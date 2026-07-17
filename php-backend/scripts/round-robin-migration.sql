-- ============================================================================
-- ROUND ROBIN BET TYPE — SCHEMA ADDITIONS
-- Date: 2026-05-05
-- ============================================================================
--
-- Adds support for Round Robin bet groups. A Round Robin generates N child
-- parlay tickets from one user request (combinations of size 2..n-1 over
-- the picked selections). Each child ticket settles independently via the
-- existing parlay path; the new `round_robin_groups` row carries display
-- metadata only (selected sizes, totals, aggregate status). Financial truth
-- always lives in the child rows in `bets`.
--
-- Touches:
--   1. New table `round_robin_groups` (document-store shape, matches the
--      rest of the schema: id VARCHAR(24), doc JSON, generated columns +
--      indexes for fast lookup).
--   2. New nullable column `bets.parentGroupId` inside the doc, exposed
--      via a generated column `j_parent_group_id` with an index so
--      `getMyBets` can cheaply filter children OR fetch siblings of a
--      group.
--
-- All existing rows in `bets` get NULL for the new column (no backfill
-- needed — round robins are forward-only). Existing bet types ignore
-- the column entirely.
-- ============================================================================

-- --------------------------------------------------------
-- 1) round_robin_groups
-- --------------------------------------------------------
-- NOTE (2026-07-17): `migrated_at` added — SqlRepository::insertOne writes it
-- on every doc table (the generic ensureTable DDL has always included it);
-- this file predated that and its absence broke the first prod RR placement
-- with "Unknown column 'migrated_at'". Kept in the CREATE for fresh installs
-- and added via a guarded ALTER below for tables created from the old file.
CREATE TABLE IF NOT EXISTS `round_robin_groups` (
  `id`           VARCHAR(24) NOT NULL,
  `doc`          JSON NOT NULL,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `migrated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Generated columns mirror the doc shape:
  --   { id, userId, ticketId, sizes:[...], selectionCount, parlayCount,
  --     stakePerParlay, totalRisk, totalPayout, status,
  --     createdAt, updatedAt, settledAt }
  `j_user_id`         VARCHAR(24)
                       GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, '$.userId'))) STORED,
  `j_ticket_id`       VARCHAR(64)
                       GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, '$.ticketId'))) STORED,
  `j_status`          VARCHAR(20)
                       GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, '$.status'))) STORED,
  `j_total_risk`      DECIMAL(14,2)
                       GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`doc`, '$.totalRisk')), 'null'), '0') AS DECIMAL(14,2))) STORED,
  `j_total_payout`    DECIMAL(14,2)
                       GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`doc`, '$.totalPayout')), 'null'), '0') AS DECIMAL(14,2))) STORED,
  `j_parlay_count`    INT
                       GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`doc`, '$.parlayCount')), 'null'), '0') AS UNSIGNED)) STORED,

  PRIMARY KEY (`id`),
  KEY `idx_rrg_user_status` (`j_user_id`, `j_status`),
  KEY `idx_rrg_ticket`      (`j_ticket_id`),
  KEY `idx_rrg_status`      (`j_status`),
  KEY `idx_rrg_created`     (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2) bets.parentGroupId — generated column + composite index
--
-- NULL for every existing bet (every existing bet is standalone — not a
-- round-robin child). Forward-only: round robins placed after this
-- migration write the child bets with `parentGroupId` set in the doc.
--
-- Composite index `(j_user_id, j_parent_group_id)` serves the two real
-- query shapes:
--   - getMyBets top-level list:
--       WHERE j_user_id = ? AND j_parent_group_id IS NULL
--     → leading user filter + trailing IS NULL pruning, one seek.
--   - getRoundRobinChildren / fetch-children-of-group:
--       WHERE j_parent_group_id = ?
--     → InnoDB allows index range scans on the trailing column when
--       the leading column is unrestricted (index-skip scan in 8.0+,
--       still better than no index for the typical 50-row read), and
--       the userId we already know lets us add it cheaply.
-- A single-column index on parent_group_id alone wouldn't help the
-- predominant top-level filter; composite is strictly better here.
-- --------------------------------------------------------
-- Guarded (idempotent, 2026-07-17): MySQL 8 has no IF NOT EXISTS for ADD
-- COLUMN/KEY, and this file must be safely RE-RUNNABLE — the prod install ran
-- the pre-`migrated_at` version of this file, so the fixed file gets executed
-- again on the same database. Each ALTER is applied only when its target is
-- absent (INFORMATION_SCHEMA check + prepared statement).
SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bets' AND COLUMN_NAME = 'j_parent_group_id');
SET @ddl := IF(@has_col = 0,
  'ALTER TABLE `bets` ADD COLUMN `j_parent_group_id` VARCHAR(24) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, ''$.parentGroupId''))) STORED',
  'SELECT ''bets.j_parent_group_id already present'' AS skipped');
PREPARE mig_stmt FROM @ddl; EXECUTE mig_stmt; DEALLOCATE PREPARE mig_stmt;

SET @has_idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bets' AND INDEX_NAME = 'idx_bets_user_parent_group');
SET @ddl := IF(@has_idx = 0,
  'ALTER TABLE `bets` ADD KEY `idx_bets_user_parent_group` (`j_user_id`, `j_parent_group_id`)',
  'SELECT ''idx_bets_user_parent_group already present'' AS skipped');
PREPARE mig_stmt FROM @ddl; EXECUTE mig_stmt; DEALLOCATE PREPARE mig_stmt;

-- --------------------------------------------------------
-- 3) round_robin_groups.migrated_at — repair for tables created from the
--    pre-2026-07-17 version of this file (SqlRepository::insertOne writes
--    this column on every doc table; without it RR placement fails with
--    "Unknown column 'migrated_at'").
-- --------------------------------------------------------
SET @has_mig := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'round_robin_groups' AND COLUMN_NAME = 'migrated_at');
SET @ddl := IF(@has_mig = 0,
  'ALTER TABLE `round_robin_groups` ADD COLUMN `migrated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT ''round_robin_groups.migrated_at already present'' AS skipped');
PREPARE mig_stmt FROM @ddl; EXECUTE mig_stmt; DEALLOCATE PREPARE mig_stmt;

-- --------------------------------------------------------
-- Verify
-- --------------------------------------------------------
SHOW CREATE TABLE `round_robin_groups`;
SHOW INDEX FROM `bets` WHERE Key_name = 'idx_bets_user_parent_group';
