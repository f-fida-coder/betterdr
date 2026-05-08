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
CREATE TABLE IF NOT EXISTS `round_robin_groups` (
  `id`           VARCHAR(24) NOT NULL,
  `doc`          JSON NOT NULL,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

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
ALTER TABLE `bets`
  ADD COLUMN `j_parent_group_id` VARCHAR(24)
    GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(`doc`, '$.parentGroupId'))) STORED;

ALTER TABLE `bets`
  ADD KEY `idx_bets_user_parent_group` (`j_user_id`, `j_parent_group_id`);

-- --------------------------------------------------------
-- Verify
-- --------------------------------------------------------
SHOW CREATE TABLE `round_robin_groups`;
SHOW INDEX FROM `bets` WHERE Key_name = 'idx_bets_user_parent_group';
