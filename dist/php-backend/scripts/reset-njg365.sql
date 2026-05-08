-- Reset NJG365 + NJG365MA to a clean slate for balance testing.
--
-- Scope:
--   - Zeros agents.balance, settlementBalanceOwed, settlementMakeup on both
--     NJG365 and its linked master-agent counterpart NJG365MA.
--   - Deletes AgentFunding (deposit/withdrawal/adjustment) transactions
--     whose agentId matches NJG365 or NJG365MA.
--   - Deletes settlement_snapshots rows for the same agents.
--
-- What it does NOT touch:
--   - Any player (users table).
--   - Any bet, casino bet, or player transaction.
--   - Any other agent.
--
-- HOW TO RUN:
--   1. Take a backup first:
--        mysqldump -h srv2052.hstgr.io -u u487877829_bettor_bets -p \
--          u487877829_bettor_bets_24 > backup_$(date +%F_%H%M).sql
--      Confirm the file is non-empty and starts with `-- MySQL dump`.
--
--   2. Dry run (shows BEFORE/AFTER counts, applies nothing):
--        mysql -h srv2052.hstgr.io -u u487877829_bettor_bets -p \
--          u487877829_bettor_bets_24 < reset-njg365.sql
--
--   3. Review the output. If the AFTER state looks right, edit the last
--      line of this file: change `ROLLBACK;` to `COMMIT;` and re-run.
--
--   4. After committing, delete the server's header-summary cache so the
--      dashboard re-computes fresh:
--        rm -f php-backend/cache/header-summary-*.json

START TRANSACTION;

-- ─────────────────────────────────────────────────────────────────────────
-- BEFORE state
-- ─────────────────────────────────────────────────────────────────────────
SELECT 'BEFORE agents' AS label,
       id,
       JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))             AS username,
       JSON_UNQUOTE(JSON_EXTRACT(doc, '$.role'))                 AS role,
       JSON_EXTRACT(doc, '$.balance')                            AS balance,
       JSON_EXTRACT(doc, '$.settlementBalanceOwed')              AS settlementBalanceOwed,
       JSON_EXTRACT(doc, '$.settlementMakeup')                   AS settlementMakeup
FROM   agents
WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username')) IN ('NJG365', 'NJG365MA');

SELECT 'BEFORE AgentFunding tx count' AS label,
       COUNT(*)                        AS cnt
FROM   transactions
WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.referenceType')) = 'AgentFunding'
  AND  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentId')) IN (
         SELECT id
         FROM   agents
         WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username')) IN ('NJG365', 'NJG365MA')
       );

SELECT 'BEFORE settlement_snapshots count' AS label,
       COUNT(*)                             AS cnt
FROM   settlement_snapshots
WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentId')) IN (
         SELECT id
         FROM   agents
         WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username')) IN ('NJG365', 'NJG365MA')
       );

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Delete AgentFunding transactions for NJG365 / NJG365MA
-- ─────────────────────────────────────────────────────────────────────────
DELETE FROM transactions
WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.referenceType')) = 'AgentFunding'
  AND  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentId')) IN (
         SELECT id
         FROM   agents
         WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username')) IN ('NJG365', 'NJG365MA')
       );

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Delete settlement_snapshots rows for NJG365 / NJG365MA
-- ─────────────────────────────────────────────────────────────────────────
DELETE FROM settlement_snapshots
WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentId')) IN (
         SELECT id
         FROM   agents
         WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username')) IN ('NJG365', 'NJG365MA')
       );

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Zero balance / settlement fields on both agents
-- ─────────────────────────────────────────────────────────────────────────
UPDATE agents
SET    doc = JSON_SET(
               doc,
               '$.balance',                0,
               '$.settlementBalanceOwed',  0,
               '$.settlementMakeup',       0,
               '$.settlementFinalizedAt',  NULL,
               '$.updatedAt',              DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%sZ')
             ),
       updated_at  = UTC_TIMESTAMP(),
       migrated_at = CURRENT_TIMESTAMP
WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username')) IN ('NJG365', 'NJG365MA');

-- ─────────────────────────────────────────────────────────────────────────
-- AFTER state
-- ─────────────────────────────────────────────────────────────────────────
SELECT 'AFTER agents' AS label,
       id,
       JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))             AS username,
       JSON_UNQUOTE(JSON_EXTRACT(doc, '$.role'))                 AS role,
       JSON_EXTRACT(doc, '$.balance')                            AS balance,
       JSON_EXTRACT(doc, '$.settlementBalanceOwed')              AS settlementBalanceOwed,
       JSON_EXTRACT(doc, '$.settlementMakeup')                   AS settlementMakeup
FROM   agents
WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username')) IN ('NJG365', 'NJG365MA');

SELECT 'AFTER AgentFunding tx count' AS label,
       COUNT(*)                       AS cnt
FROM   transactions
WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.referenceType')) = 'AgentFunding'
  AND  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentId')) IN (
         SELECT id
         FROM   agents
         WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username')) IN ('NJG365', 'NJG365MA')
       );

SELECT 'AFTER settlement_snapshots count' AS label,
       COUNT(*)                            AS cnt
FROM   settlement_snapshots
WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentId')) IN (
         SELECT id
         FROM   agents
         WHERE  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username')) IN ('NJG365', 'NJG365MA')
       );

-- ─────────────────────────────────────────────────────────────────────────
-- Default to DRY RUN. Change ROLLBACK to COMMIT when you are ready to apply.
-- ─────────────────────────────────────────────────────────────────────────
ROLLBACK;
-- COMMIT;
