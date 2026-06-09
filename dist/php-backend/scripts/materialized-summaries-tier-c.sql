-- =============================================================================
-- Tier C — Materialized summary tables for slow aggregation reports
-- =============================================================================
-- Goal: turn 200-2000ms aggregation queries into <10ms point reads, by
-- refreshing pre-computed summaries on a cron instead of on the request path.
--
-- WHAT THIS COVERS:
--   - Agent Performance (daily and weekly P&L per agent)
--   - User daily P&L (the per-day rollup behind the My Bets "Figures" tab)
--   - Top wagers / risk-by-day (admin reporting)
--
-- WHAT THIS DOES NOT TOUCH:
--   - The source tables (bets, casino_bets, transactions, users) are
--     untouched. No schema changes, no triggers, no FK changes.
--   - Existing query paths still work — controllers can opt in to read
--     the materialized table when it exists, fall back to the live
--     aggregation when it doesn't.
--
-- SAFETY:
--   - Adding these tables is fully additive. They start empty and stay
--     empty until you run the refresh script.
--   - Dropping them later is a one-line operation per table; the
--     reporting code falls back to live aggregation automatically.
--   - No reads or writes from the existing app touch these tables until
--     a controller is explicitly updated to use them.
--
-- =============================================================================
-- HOW TO USE
-- =============================================================================
-- 1) Run this file once to create the tables (idempotent — uses IF NOT EXISTS):
--      mysql -u <user> -p <database> < materialized-summaries-tier-c.sql
--
-- 2) Run scripts/refresh-summaries.php from cron every 5-15 minutes:
--      */10 * * * * cd /var/www/betterdr/php-backend && php scripts/refresh-summaries.php >/dev/null 2>&1
--
-- 3) After the first refresh, point the slowest reporting endpoint at
--    the new table. Suggested first migration: AgentController's weekly
--    cuts query (currently aggregates on the request path) — read from
--    summary_agent_daily_pl WHERE agentId=? AND day BETWEEN ? AND ?.
--
-- 4) ROLLBACK: leave the controller pointed at the live aggregation;
--    drop the tables; remove the cron line. Site keeps working.
-- =============================================================================


-- =============================================================================
-- 1. summary_user_daily_pl
--    Per-user, per-UTC-day P&L roll-up. Powers the My Bets "Figures" tab.
-- =============================================================================
-- Source query (live equivalent):
--   SELECT userId, DATE(settledAt) AS day,
--          SUM(CASE WHEN status='won' THEN payout - amount
--                   WHEN status='lost' THEN -amount
--                   ELSE 0 END) AS pl,
--          COUNT(*) AS bet_count
--   FROM bets WHERE settledAt IS NOT NULL
--   GROUP BY userId, DATE(settledAt);
-- Today this scans the bets table. Materialized, it's a 4-byte PK lookup.

CREATE TABLE IF NOT EXISTS summary_user_daily_pl (
    userId       VARCHAR(64)    NOT NULL,
    day          DATE           NOT NULL,
    pl           DECIMAL(18, 2) NOT NULL DEFAULT 0,
    bet_count    INT UNSIGNED   NOT NULL DEFAULT 0,
    won_count    INT UNSIGNED   NOT NULL DEFAULT 0,
    lost_count   INT UNSIGNED   NOT NULL DEFAULT 0,
    void_count   INT UNSIGNED   NOT NULL DEFAULT 0,
    risk_total   DECIMAL(18, 2) NOT NULL DEFAULT 0,
    payout_total DECIMAL(18, 2) NOT NULL DEFAULT 0,
    refreshed_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, day),
    INDEX idx_summary_user_day (day, userId)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=COMPRESSED;


-- =============================================================================
-- 2. summary_agent_daily_pl
--    Per-agent, per-UTC-day P&L roll-up across all of the agent's users.
--    Powers the Agent Performance dashboard and weekly cuts.
-- =============================================================================
-- Source query (live equivalent):
--   SELECT u.agentId, DATE(b.settledAt) AS day,
--          SUM(CASE WHEN b.status='won' THEN b.payout - b.amount
--                   WHEN b.status='lost' THEN -b.amount
--                   ELSE 0 END) AS pl,
--          COUNT(DISTINCT u.id) AS active_users,
--          COUNT(*) AS bet_count
--   FROM bets b JOIN users u ON u.id = b.userId
--   WHERE b.settledAt IS NOT NULL
--   GROUP BY u.agentId, DATE(b.settledAt);

CREATE TABLE IF NOT EXISTS summary_agent_daily_pl (
    agentId       VARCHAR(64)    NOT NULL,
    day           DATE           NOT NULL,
    pl            DECIMAL(18, 2) NOT NULL DEFAULT 0,
    active_users  INT UNSIGNED   NOT NULL DEFAULT 0,
    bet_count     INT UNSIGNED   NOT NULL DEFAULT 0,
    risk_total    DECIMAL(18, 2) NOT NULL DEFAULT 0,
    payout_total  DECIMAL(18, 2) NOT NULL DEFAULT 0,
    deposit_total DECIMAL(18, 2) NOT NULL DEFAULT 0,
    cashout_total DECIMAL(18, 2) NOT NULL DEFAULT 0,
    refreshed_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (agentId, day),
    INDEX idx_summary_agent_day (day, agentId)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=COMPRESSED;


-- =============================================================================
-- 3. summary_daily_house
--    Single-row-per-day platform totals. Powers admin "Today / Yesterday /
--    This Week" tiles. Smallest table, fastest read.
-- =============================================================================

CREATE TABLE IF NOT EXISTS summary_daily_house (
    day               DATE           NOT NULL PRIMARY KEY,
    handle            DECIMAL(18, 2) NOT NULL DEFAULT 0,  -- total wagered
    pl                DECIMAL(18, 2) NOT NULL DEFAULT 0,  -- house P&L (signed)
    bet_count         INT UNSIGNED   NOT NULL DEFAULT 0,
    sportsbook_handle DECIMAL(18, 2) NOT NULL DEFAULT 0,
    sportsbook_pl     DECIMAL(18, 2) NOT NULL DEFAULT 0,
    casino_handle     DECIMAL(18, 2) NOT NULL DEFAULT 0,
    casino_pl         DECIMAL(18, 2) NOT NULL DEFAULT 0,
    active_users      INT UNSIGNED   NOT NULL DEFAULT 0,
    new_signups       INT UNSIGNED   NOT NULL DEFAULT 0,
    refreshed_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 4. summary_user_lifetime
--    Per-user lifetime aggregates. Powers customer detail "lifetime stats"
--    block. Refreshed at most once per hour because lifetime numbers
--    rarely need to be sub-hour fresh.
-- =============================================================================

CREATE TABLE IF NOT EXISTS summary_user_lifetime (
    userId         VARCHAR(64)    NOT NULL PRIMARY KEY,
    first_bet_at   DATETIME       NULL,
    last_bet_at    DATETIME       NULL,
    total_handle   DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_pl       DECIMAL(18, 2) NOT NULL DEFAULT 0,
    bet_count      INT UNSIGNED   NOT NULL DEFAULT 0,
    deposit_total  DECIMAL(18, 2) NOT NULL DEFAULT 0,
    cashout_total  DECIMAL(18, 2) NOT NULL DEFAULT 0,
    refreshed_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- After creating the tables, confirm they're empty + indexed correctly:
--   SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES
--    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'summary_%';
--
--   SHOW INDEX FROM summary_user_daily_pl;
--   SHOW INDEX FROM summary_agent_daily_pl;
--
-- Then run the refresh script (scripts/refresh-summaries.php) and
-- re-check TABLE_ROWS — should be non-zero after first run.


-- =============================================================================
-- DROP STATEMENTS (rollback)
-- =============================================================================
-- Uncomment to remove all summary tables. Safe at any time — none of the
-- existing app code reads them.
--
-- DROP TABLE IF EXISTS summary_user_lifetime;
-- DROP TABLE IF EXISTS summary_daily_house;
-- DROP TABLE IF EXISTS summary_agent_daily_pl;
-- DROP TABLE IF EXISTS summary_user_daily_pl;
