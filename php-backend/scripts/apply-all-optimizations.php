<?php

declare(strict_types=1);

/**
 * apply-all-optimizations.php — One-shot idempotent database optimization.
 *
 * Combines ALL optimization tiers into a single safe script:
 *   1. Generated columns (extracted from JSON doc → proper MySQL types)
 *   2. Performance indexes (composite indexes for hot query paths)
 *   3. Materialized summary tables (Tier C)
 *   4. Admin-friendly views
 *
 * SAFE TO RUN MULTIPLE TIMES — every operation checks IF NOT EXISTS or
 * queries information_schema before acting.
 *
 * Usage:
 *   LOCAL:      cd php-backend && php scripts/apply-all-optimizations.php
 *   PRODUCTION: cd php-backend && php scripts/apply-all-optimizations.php
 *
 * The script reads MYSQL_* from .env automatically.
 */

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);

require_once $phpBackendDir . '/src/Env.php';
Env::load($projectRoot, $phpBackendDir);

$host   = (string) Env::get('MYSQL_HOST', '127.0.0.1');
$port   = (int)    Env::get('MYSQL_PORT', '3306');
$db     = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
$user   = (string) Env::get('MYSQL_USER', 'root');
$pass   = (string) Env::get('MYSQL_PASSWORD', '');
$prefix = (string) Env::get('MYSQL_TABLE_PREFIX', '');

out("=== BettorPlays247 Database Optimization ===");
out("Host: {$host}:{$port}  DB: {$db}  User: {$user}");
out("Table prefix: " . ($prefix ?: '(none)'));
out("");

try {
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE             => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE  => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT             => 300,
            // ANALYZE TABLE returns a result set; without buffering the next
            // prepared query (tableExists) throws SQLSTATE[HY000] 2014.
            PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
        ]
    );
} catch (PDOException $e) {
    out("FATAL: Cannot connect to MySQL: " . $e->getMessage());
    exit(1);
}

$stats = ['columns_added' => 0, 'indexes_added' => 0, 'tables_created' => 0, 'views_created' => 0, 'skipped' => 0, 'errors' => 0];

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: Generated columns (core tables — from optimize-mysql-schema.php)
// ─────────────────────────────────────────────────────────────────────────────
out("\n── PHASE 1: Generated Columns (Core) ──");

$coreColumns = [
    'users' => [
        ['j_username',         "VARCHAR(191) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) STORED"],
        ['j_phone',            "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.phoneNumber'))) STORED"],
        ['j_agent_id',         "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentId'))) STORED"],
        ['j_role',             "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.role'))) STORED"],
        ['j_status',           "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_first_name',       "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.firstName'))) STORED"],
        ['j_last_name',        "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.lastName'))) STORED"],
        ['j_full_name',        "VARCHAR(200) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.fullName'))) STORED"],
        ['j_balance',          "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.balance')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_credit_limit',     "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.creditLimit')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_balance_owed',     "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.balanceOwed')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_freeplay_balance', "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.freeplayBalance')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_pending_balance',  "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.pendingBalance')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_lifetime',         "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.lifetime')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_min_bet',          "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.minBet')), 'null'), '0') AS DECIMAL(10,2))) STORED"],
        ['j_max_bet',          "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.maxBet')), 'null'), '0') AS DECIMAL(10,2))) STORED"],
        ['j_created_by',       "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdBy'))) STORED"],
        ['j_created_by_model', "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdByModel'))) STORED"],
    ],
    'agents' => [
        ['j_username',              "VARCHAR(191) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) STORED"],
        ['j_phone',                 "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.phoneNumber'))) STORED"],
        ['j_created_by',            "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdBy'))) STORED"],
        ['j_role',                  "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.role'))) STORED"],
        ['j_status',                "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_full_name',             "VARCHAR(200) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.fullName'))) STORED"],
        ['j_balance',               "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.balance')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_billing_rate',          "DECIMAL(6,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentBillingRate')), 'null'), '0') AS DECIMAL(6,2))) STORED"],
        ['j_billing_status',        "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentBillingStatus'))) STORED"],
        ['j_default_min_bet',       "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.defaultMinBet')), 'null'), '0') AS DECIMAL(10,2))) STORED"],
        ['j_default_max_bet',       "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.defaultMaxBet')), 'null'), '0') AS DECIMAL(10,2))) STORED"],
        ['j_default_credit_limit',  "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.defaultCreditLimit')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_created_by_model',      "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdByModel'))) STORED"],
    ],
    'admins' => [
        ['j_username',       "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) STORED"],
        ['j_email',          "VARCHAR(255) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.email'))) STORED"],
        ['j_role',           "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.role'))) STORED"],
        ['j_is_super_admin', "TINYINT(1) GENERATED ALWAYS AS (CASE WHEN LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.isSuperAdmin')), 'false')) IN ('1', 'true') THEN 1 ELSE 0 END) STORED"],
        ['j_status',         "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_full_name',      "VARCHAR(200) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.fullName'))) STORED"],
        ['j_phone',          "VARCHAR(30) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.phoneNumber'))) STORED"],
    ],
    'master_agents' => [
        ['j_agent_id',             "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentId'))) STORED"],
        ['j_username',             "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) STORED"],
        ['j_full_name',            "VARCHAR(200) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.fullName'))) STORED"],
        ['j_phone',                "VARCHAR(30) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.phoneNumber'))) STORED"],
        ['j_status',               "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_balance',              "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.balance')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_default_min_bet',      "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.defaultMinBet')), 'null'), '0') AS DECIMAL(10,2))) STORED"],
        ['j_default_max_bet',      "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.defaultMaxBet')), 'null'), '0') AS DECIMAL(10,2))) STORED"],
        ['j_default_credit_limit', "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.defaultCreditLimit')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_created_by',           "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdBy'))) STORED"],
        ['j_created_by_model',     "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdByModel'))) STORED"],
    ],
    'bets' => [
        ['j_user_id',          "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId'))) STORED"],
        ['j_match_id',         "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.matchId'))) STORED"],
        ['j_status',           "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_type',             "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.type'))) STORED"],
        ['j_ticket_id',        "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.ticketId'))) STORED"],
        ['j_request_id',       "VARCHAR(128) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.requestId'))) STORED"],
        ['j_amount',           "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.amount')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_risk_amount',      "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.riskAmount')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_potential_payout', "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.potentialPayout')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_combined_odds',    "DECIMAL(12,4) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.combinedOdds')), 'null'), '0') AS DECIMAL(12,4))) STORED"],
        ['j_ip_address',       "VARCHAR(45) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.ipAddress'))) STORED"],
    ],
    'betselections' => [
        ['j_selection', "VARCHAR(200) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.selection'))) STORED"],
        ['j_odds',      "DECIMAL(12,4) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.odds')), 'null'), '0') AS DECIMAL(12,4))) STORED"],
        ['j_point',     "DECIMAL(8,2) GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.point')), 'null') AS DECIMAL(8,2))) STORED"],
    ],
    'transactions' => [
        ['j_user_id',        "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId'))) STORED"],
        ['j_type',           "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.type'))) STORED"],
        ['j_status',         "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_reference_type', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.referenceType'))) STORED"],
        ['j_reference_id',   "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.referenceId'))) STORED"],
        ['j_entry_group_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.entryGroupId'))) STORED"],
        ['j_amount',         "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.amount')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_entry_side',     "VARCHAR(10) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.entrySide'))) STORED"],
        ['j_source_type',    "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.sourceType'))) STORED"],
        ['j_balance_before', "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.balanceBefore')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_balance_after',  "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.balanceAfter')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_reason',         "VARCHAR(255) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.reason'))) STORED"],
        ['j_description',    "VARCHAR(500) GENERATED ALWAYS AS (LEFT(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.description')), 500)) STORED"],
    ],
    'matches' => [
        ['j_external_id',     "VARCHAR(128) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.externalId'))) STORED"],
        ['j_status',          "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_sport',           "VARCHAR(128) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.sport'))) STORED"],
        ['j_start_time_dt',   "DATETIME GENERATED ALWAYS AS (STR_TO_DATE(REPLACE(SUBSTRING(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.startTime')), ''), 'null'), 1, 19), 'T', ' '), '%Y-%m-%d %H:%i:%s')) STORED"],
        ['j_last_updated_dt', "DATETIME GENERATED ALWAYS AS (STR_TO_DATE(REPLACE(SUBSTRING(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.lastUpdated')), ''), 'null'), 1, 19), 'T', ' '), '%Y-%m-%d %H:%i:%s')) STORED"],
        ['j_score_home',      "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.score.score_home')), ''), 'null'), '0') AS DECIMAL(10,2))) STORED"],
        ['j_score_away',      "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.score.score_away')), ''), 'null'), '0') AS DECIMAL(10,2))) STORED"],
        ['j_home_team',       "VARCHAR(200) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.homeTeam'))) STORED"],
        ['j_away_team',       "VARCHAR(200) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.awayTeam'))) STORED"],
        ['j_bookmaker',       "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.odds.bookmaker'))) STORED"],
    ],
    'casino_bets' => [
        ['j_user_id',        "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId'))) STORED"],
        ['j_username',       "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) STORED"],
        ['j_round_id',       "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.roundId'))) STORED"],
        ['j_request_id',     "VARCHAR(128) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.requestId'))) STORED"],
        ['j_game',           "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.game'))) STORED"],
        ['j_total_wager',    "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.totalWager')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_total_return',   "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.totalReturn')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_net_result',     "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.netResult')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_round_status',   "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.roundStatus'))) STORED"],
        ['j_result',         "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.result'))) STORED"],
        ['j_balance_before', "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.balanceBefore')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
        ['j_balance_after',  "DECIMAL(14,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.balanceAfter')), 'null'), '0') AS DECIMAL(14,2))) STORED"],
    ],
    'casino_round_audit' => [
        ['j_round_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.roundId'))) STORED"],
        ['j_user_id',  "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId'))) STORED"],
        ['j_game',     "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.game'))) STORED"],
        ['j_action',   "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.action'))) STORED"],
    ],
    'casinogames' => [
        ['j_slug',        "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.slug'))) STORED"],
        ['j_name',        "VARCHAR(200) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.name'))) STORED"],
        ['j_provider',    "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.provider'))) STORED"],
        ['j_category',    "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.category'))) STORED"],
        ['j_status',      "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_is_featured', "TINYINT(1) GENERATED ALWAYS AS (CASE WHEN LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.isFeatured')), 'false')) IN ('1', 'true') THEN 1 ELSE 0 END) STORED"],
        ['j_sort_order',  "INT GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.sortOrder')), 'null'), '0') AS SIGNED)) STORED"],
        ['j_min_bet',     "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.minBet')), 'null'), '0') AS DECIMAL(10,2))) STORED"],
        ['j_max_bet',     "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.maxBet')), 'null'), '0') AS DECIMAL(10,2))) STORED"],
    ],
    'iplogs' => [
        ['j_ip',              "VARCHAR(45) GENERATED ALWAYS AS (LEFT(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.ip')), 45)) STORED"],
        ['j_user_id',         "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId'))) STORED"],
        ['j_status',          "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_country',         "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.country'))) STORED"],
        ['j_city',            "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.city'))) STORED"],
        ['j_user_model',      "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userModel'))) STORED"],
        ['j_last_active',     "VARCHAR(30) GENERATED ALWAYS AS (LEFT(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.lastActive')), 30)) STORED"],
        ['j_last_active_dt',  "DATETIME GENERATED ALWAYS AS (STR_TO_DATE(REPLACE(SUBSTRING(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.lastActive')), ''), 'null'), 1, 19), 'T', ' '), '%Y-%m-%d %H:%i:%s')) STORED"],
    ],
    'messages' => [
        ['j_from_user_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.fromUserId'))) STORED"],
        ['j_status',       "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_subject',      "VARCHAR(255) GENERATED ALWAYS AS (LEFT(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.subject')), 255)) STORED"],
        ['j_read',         "TINYINT(1) GENERATED ALWAYS AS (CASE WHEN LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.read')), 'false')) IN ('1', 'true') THEN 1 ELSE 0 END) STORED"],
        ['j_from_name',    "VARCHAR(200) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.fromName'))) STORED"],
    ],
    'admin_audit_log' => [
        ['j_action',          "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.action'))) STORED"],
        ['j_actor_id',        "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.actorId'))) STORED"],
        ['j_actor_username',  "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.actorUsername'))) STORED"],
        ['j_actor_role',      "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.actorRole'))) STORED"],
        ['j_target_id',       "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.targetId'))) STORED"],
        ['j_target_username', "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.targetUsername'))) STORED"],
        ['j_ip',              "VARCHAR(45) GENERATED ALWAYS AS (LEFT(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.ip')), 45)) STORED"],
    ],
    'sportsbookauditlogs' => [
        ['j_event',    "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.event'))) STORED"],
        ['j_severity', "VARCHAR(20) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.severity'))) STORED"],
    ],
    'betmoderules' => [
        ['j_mode',      "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.mode'))) STORED"],
        ['j_is_active', "TINYINT(1) GENERATED ALWAYS AS (CASE WHEN LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.isActive')), 'false')) IN ('1', 'true') THEN 1 ELSE 0 END) STORED"],
        ['j_min_legs',  "INT GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.minLegs')), 'null'), '0') AS SIGNED)) STORED"],
        ['j_max_legs',  "INT GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.maxLegs')), 'null'), '0') AS SIGNED)) STORED"],
    ],
    'rate_limits' => [
        ['j_ip',           "VARCHAR(45) GENERATED ALWAYS AS (LEFT(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.ip')), 45)) STORED"],
        ['j_endpoint',     "VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.endpoint'))) STORED"],
        ['j_count',        "INT GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.count')), 'null'), '0') AS SIGNED)) STORED"],
        ['j_window_start', "VARCHAR(30) GENERATED ALWAYS AS (LEFT(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.windowStart')), 30)) STORED"],
    ],
    'casino_game_state' => [
        ['j_round_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.roundId'))) STORED"],
    ],
    'sportsbookhealth' => [
        ['j_service', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.service'))) STORED"],
        ['j_status',  "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
    ],
    'feedbacks' => [
        ['j_user_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId'))) STORED"],
        ['j_subject', "VARCHAR(255) GENERATED ALWAYS AS (LEFT(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.subject')), 255)) STORED"],
        ['j_status',  "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
    ],
    'faqs' => [
        ['j_title',  "VARCHAR(255) GENERATED ALWAYS AS (LEFT(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.title')), 255)) STORED"],
        ['j_status', "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_order',  "INT GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.order')), 'null'), '0') AS SIGNED)) STORED"],
    ],
    'manualsections' => [
        ['j_title',  "VARCHAR(255) GENERATED ALWAYS AS (LEFT(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.title')), 255)) STORED"],
        ['j_status', "VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
        ['j_order',  "INT GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.order')), 'null'), '0') AS SIGNED)) STORED"],
    ],
];

foreach ($coreColumns as $rawTable => $columns) {
    $table = $prefix . $rawTable;
    if (!tableExists($pdo, $db, $table)) {
        out("  SKIP {$table} (table not found)");
        $stats['skipped']++;
        continue;
    }
    foreach ($columns as [$col, $def]) {
        if (columnExists($pdo, $db, $table, $col)) {
            $stats['skipped']++;
            continue;
        }
        try {
            $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$col}` {$def}");
            $stats['columns_added']++;
            out("  + {$table}.{$col}");
        } catch (Throwable $e) {
            $stats['errors']++;
            out("  ERROR {$table}.{$col}: " . $e->getMessage());
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2: All indexes (core + performance)
// ─────────────────────────────────────────────────────────────────────────────
out("\n── PHASE 2: Indexes ──");

$indexes = [
    // Core generated column indexes
    'users' => [
        ['idx_users_j_username',      ['j_username']],
        ['idx_users_j_phone',         ['j_phone']],
        ['idx_users_j_agent_id',      ['j_agent_id']],
        ['idx_users_j_role_status',   ['j_role', 'j_status']],
        ['idx_users_balance',         ['j_balance']],
        ['idx_users_status_agent',    ['j_status', 'j_agent_id']],
        ['idx_users_created_by',      ['j_created_by']],
        ['idx_users_full_name',       ['j_full_name']],
        // Performance: agent hierarchy lookups
        ['idx_users_agent',           ['j_agent_id']],
    ],
    'agents' => [
        ['idx_agents_j_username',     ['j_username']],
        ['idx_agents_j_phone',        ['j_phone']],
        ['idx_agents_j_created_by',   ['j_created_by']],
        ['idx_agents_j_role_status',  ['j_role', 'j_status']],
        ['idx_agents_status',         ['j_status']],
        ['idx_agents_created_by',     ['j_created_by']],
    ],
    'admins' => [
        ['idx_admins_username', ['j_username']],
        ['idx_admins_email',    ['j_email']],
        ['idx_admins_status',   ['j_status']],
    ],
    'master_agents' => [
        ['idx_ma_agent_id',   ['j_agent_id']],
        ['idx_ma_username',   ['j_username']],
        ['idx_ma_status',     ['j_status']],
        ['idx_ma_created_by', ['j_created_by']],
    ],
    'bets' => [
        ['idx_bets_j_user_id',      ['j_user_id']],
        ['idx_bets_j_match_id',     ['j_match_id']],
        ['idx_bets_j_status',       ['j_status']],
        ['idx_bets_j_type',         ['j_type']],
        ['idx_bets_j_user_status',  ['j_user_id', 'j_status']],
        ['idx_bets_ticket',         ['j_ticket_id']],
        ['idx_bets_type_status',    ['j_type', 'j_status']],
        ['idx_bets_amount',         ['j_amount']],
    ],
    'betselections' => [
        ['idx_betselections_status', ['j_status']],
    ],
    'transactions' => [
        ['idx_tx_j_user_id',       ['j_user_id']],
        ['idx_tx_j_type',          ['j_type']],
        ['idx_tx_j_status',        ['j_status']],
        ['idx_tx_j_ref',           ['j_reference_type', 'j_reference_id']],
        ['idx_txn_entry_group',    ['j_entry_group_id']],
        ['idx_txn_type_status',    ['j_type', 'j_status']],
        ['idx_txn_entry_side',     ['j_entry_side']],
        ['idx_txn_source_type',    ['j_source_type']],
        ['idx_txn_amount',         ['j_amount']],
        // Performance: userId + createdAt for transaction history
        ['idx_tx_user_created',    ['j_user_id', 'created_at']],
    ],
    'matches' => [
        // The j_-prefixed twins of ensureTable's matches indexes were exact
        // duplicates — dropped 2026-07-21, do not re-add. ensureTable owns
        // external_id/status/sport/start_time/status_start/updated.
        ['idx_matches_sport_status',   ['j_sport', 'j_status']],
        ['idx_matches_home_team',      ['j_home_team']],
        ['idx_matches_away_team',      ['j_away_team']],
    ],
    'casino_bets' => [
        ['idx_cb_user_id',       ['j_user_id']],
        ['idx_cb_round_id',      ['j_round_id']],
        ['idx_cb_game',          ['j_game']],
        ['idx_cb_round_status',  ['j_round_status']],
        ['idx_cb_user_game',     ['j_user_id', 'j_game']],
        ['idx_cb_net_result',    ['j_net_result']],
        // Performance: userId + createdAt for casino bet history
        ['idx_casino_user_created', ['j_user_id', 'created_at']],
    ],
    'casino_round_audit' => [
        ['idx_cra_round_id', ['j_round_id']],
        ['idx_cra_user_id',  ['j_user_id']],
        ['idx_cra_game',     ['j_game']],
    ],
    'casinogames' => [
        ['idx_cg_slug',          ['j_slug']],
        ['idx_cg_status',        ['j_status']],
        ['idx_cg_provider',      ['j_provider']],
        ['idx_cg_category',      ['j_category']],
        ['idx_cg_featured_sort', ['j_is_featured', 'j_sort_order']],
    ],
    'iplogs' => [
        ['idx_ip_ip',                ['j_ip']],
        ['idx_ip_user_id',           ['j_user_id']],
        ['idx_ip_status',            ['j_status']],
        ['idx_ip_last_active',       ['j_last_active']],
        ['idx_ip_user_model',        ['j_user_model']],
        ['idx_iplogs_j_user_last_active',   ['j_user_id', 'j_last_active_dt']],
        ['idx_iplogs_j_status_last_active', ['j_status', 'j_last_active_dt']],
        ['idx_iplogs_j_last_active',        ['j_last_active_dt']],
        // Performance: ip + status for withdrawal checks
        ['idx_iplogs_ip_status',     ['j_ip', 'j_status']],
    ],
    'messages' => [
        ['idx_messages_j_from_user_id', ['j_from_user_id']],
        ['idx_messages_j_status',       ['j_status']],
        ['idx_msg_status_read',         ['j_status', 'j_read']],
    ],
    'admin_audit_log' => [
        ['idx_aal_action',    ['j_action']],
        ['idx_aal_actor_id',  ['j_actor_id']],
        ['idx_aal_target_id', ['j_target_id']],
    ],
    'sportsbookauditlogs' => [
        ['idx_sal_event',          ['j_event']],
        ['idx_sal_severity',       ['j_severity']],
        ['idx_sal_event_created',  ['j_event', 'created_at']],
    ],
    'betmoderules' => [
        ['idx_bmr_mode',   ['j_mode']],
        ['idx_bmr_active', ['j_is_active']],
    ],
    'rate_limits' => [
        ['idx_rl_ip_endpoint', ['j_ip', 'j_endpoint']],
        ['idx_rl_window',      ['j_window_start']],
    ],
    'casino_game_state' => [
        ['idx_cgs_round_id', ['j_round_id']],
    ],
    'feedbacks' => [
        ['idx_fb_user_id', ['j_user_id']],
        ['idx_fb_status',  ['j_status']],
    ],
    'faqs' => [
        ['idx_faqs_status_order', ['j_status', 'j_order']],
    ],
    'manualsections' => [
        ['idx_ms_status_order', ['j_status', 'j_order']],
    ],
];

foreach ($indexes as $rawTable => $tableIndexes) {
    $table = $prefix . $rawTable;
    if (!tableExists($pdo, $db, $table)) {
        $stats['skipped']++;
        continue;
    }
    foreach ($tableIndexes as [$indexName, $columns]) {
        // Check all columns exist before creating index
        $allColsExist = true;
        foreach ($columns as $col) {
            if (!columnExists($pdo, $db, $table, $col)) {
                $allColsExist = false;
                break;
            }
        }
        if (!$allColsExist) {
            $stats['skipped']++;
            continue;
        }
        if (indexExists($pdo, $db, $table, $indexName)) {
            $stats['skipped']++;
            continue;
        }
        try {
            $quoted = array_map(fn(string $c) => "`{$c}`", $columns);
            $pdo->exec("ALTER TABLE `{$table}` ADD INDEX `{$indexName}` (" . implode(', ', $quoted) . ")");
            $stats['indexes_added']++;
            out("  + {$table} INDEX {$indexName} (" . implode(', ', $columns) . ")");
        } catch (Throwable $e) {
            $stats['errors']++;
            out("  ERROR {$table} INDEX {$indexName}: " . $e->getMessage());
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: Materialized summary tables
// ─────────────────────────────────────────────────────────────────────────────
out("\n── PHASE 3: Summary Tables ──");

$summaryTables = [
    "CREATE TABLE IF NOT EXISTS `{$prefix}summary_user_daily_pl` (
        userId       VARCHAR(64)    NOT NULL,
        day          DATE           NOT NULL,
        pl           DECIMAL(18, 2) NOT NULL DEFAULT 0,
        bet_count    INT UNSIGNED   NOT NULL DEFAULT 0,
        won_count    INT UNSIGNED   NOT NULL DEFAULT 0,
        lost_count   INT UNSIGNED   NOT NULL DEFAULT 0,
        void_count   INT UNSIGNED   NOT NULL DEFAULT 0,
        risk_total   DECIMAL(18, 2) NOT NULL DEFAULT 0,
        payout_total DECIMAL(18, 2) NOT NULL DEFAULT 0,
        refreshed_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (userId, day),
        INDEX idx_summary_user_day (day, userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=COMPRESSED",

    "CREATE TABLE IF NOT EXISTS `{$prefix}summary_agent_daily_pl` (
        agentId       VARCHAR(64)    NOT NULL,
        day           DATE           NOT NULL,
        pl            DECIMAL(18, 2) NOT NULL DEFAULT 0,
        active_users  INT UNSIGNED   NOT NULL DEFAULT 0,
        bet_count     INT UNSIGNED   NOT NULL DEFAULT 0,
        risk_total    DECIMAL(18, 2) NOT NULL DEFAULT 0,
        payout_total  DECIMAL(18, 2) NOT NULL DEFAULT 0,
        deposit_total DECIMAL(18, 2) NOT NULL DEFAULT 0,
        cashout_total DECIMAL(18, 2) NOT NULL DEFAULT 0,
        refreshed_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (agentId, day),
        INDEX idx_summary_agent_day (day, agentId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=COMPRESSED",

    "CREATE TABLE IF NOT EXISTS `{$prefix}summary_daily_house` (
        day               DATE           NOT NULL PRIMARY KEY,
        handle            DECIMAL(18, 2) NOT NULL DEFAULT 0,
        pl                DECIMAL(18, 2) NOT NULL DEFAULT 0,
        bet_count         INT UNSIGNED   NOT NULL DEFAULT 0,
        sportsbook_handle DECIMAL(18, 2) NOT NULL DEFAULT 0,
        sportsbook_pl     DECIMAL(18, 2) NOT NULL DEFAULT 0,
        casino_handle     DECIMAL(18, 2) NOT NULL DEFAULT 0,
        casino_pl         DECIMAL(18, 2) NOT NULL DEFAULT 0,
        active_users      INT UNSIGNED   NOT NULL DEFAULT 0,
        new_signups       INT UNSIGNED   NOT NULL DEFAULT 0,
        refreshed_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS `{$prefix}summary_user_lifetime` (
        userId         VARCHAR(64)    NOT NULL PRIMARY KEY,
        first_bet_at   DATETIME       NULL,
        last_bet_at    DATETIME       NULL,
        total_handle   DECIMAL(18, 2) NOT NULL DEFAULT 0,
        total_pl       DECIMAL(18, 2) NOT NULL DEFAULT 0,
        bet_count      INT UNSIGNED   NOT NULL DEFAULT 0,
        deposit_total  DECIMAL(18, 2) NOT NULL DEFAULT 0,
        cashout_total  DECIMAL(18, 2) NOT NULL DEFAULT 0,
        refreshed_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

foreach ($summaryTables as $sql) {
    try {
        $pdo->exec($sql);
        // Extract table name for logging
        preg_match('/`([^`]+)`/', $sql, $m);
        $tName = $m[1] ?? '?';
        $stats['tables_created']++;
        out("  + TABLE {$tName} (IF NOT EXISTS)");
    } catch (Throwable $e) {
        $stats['errors']++;
        out("  ERROR creating summary table: " . $e->getMessage());
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4: Admin-friendly views
// ─────────────────────────────────────────────────────────────────────────────
out("\n── PHASE 4: Admin Views ──");

$views = [
    'vw_users' => "CREATE OR REPLACE VIEW `{$prefix}vw_users` AS
        SELECT id, j_username AS username, j_full_name AS full_name, j_phone AS phone,
               j_role AS role, j_status AS status, j_balance AS balance,
               j_credit_limit AS credit_limit, j_balance_owed AS balance_owed,
               j_freeplay_balance AS freeplay_balance, j_pending_balance AS pending_balance,
               j_lifetime AS lifetime, j_min_bet AS min_bet, j_max_bet AS max_bet,
               j_agent_id AS agent_id, j_created_by AS created_by, created_at, updated_at
        FROM `{$prefix}users` ORDER BY created_at DESC",

    'vw_admins' => "CREATE OR REPLACE VIEW `{$prefix}vw_admins` AS
        SELECT id, j_username AS username, j_full_name AS full_name, j_email AS email,
               j_phone AS phone, j_role AS role, j_is_super_admin AS is_super_admin,
               j_status AS status, created_at, updated_at
        FROM `{$prefix}admins`",

    'vw_agents' => "CREATE OR REPLACE VIEW `{$prefix}vw_agents` AS
        SELECT id, j_username AS username, j_full_name AS full_name, j_phone AS phone,
               j_role AS role, j_status AS status, j_balance AS balance,
               j_billing_rate AS billing_rate, j_billing_status AS billing_status,
               j_default_min_bet AS default_min_bet, j_default_max_bet AS default_max_bet,
               j_default_credit_limit AS default_credit_limit,
               j_created_by AS created_by, created_at, updated_at
        FROM `{$prefix}agents`",

    'vw_bets' => "CREATE OR REPLACE VIEW `{$prefix}vw_bets` AS
        SELECT b.id, b.j_ticket_id AS ticket_id, b.j_user_id AS user_id,
               b.j_type AS type, b.j_status AS status,
               b.j_amount AS amount, b.j_risk_amount AS risk_amount,
               b.j_potential_payout AS potential_payout, b.j_combined_odds AS combined_odds,
               b.created_at, b.updated_at
        FROM `{$prefix}bets` b ORDER BY b.created_at DESC",

    'vw_transactions' => "CREATE OR REPLACE VIEW `{$prefix}vw_transactions` AS
        SELECT t.id, t.j_user_id AS user_id, t.j_amount AS amount,
               t.j_type AS type, t.j_entry_side AS entry_side,
               t.j_source_type AS source_type, t.j_status AS status,
               t.j_balance_before AS balance_before, t.j_balance_after AS balance_after,
               t.j_reason AS reason, t.j_description AS description,
               t.j_reference_type AS reference_type, t.j_reference_id AS reference_id,
               t.created_at, t.updated_at
        FROM `{$prefix}transactions` t ORDER BY t.created_at DESC",

    'vw_matches' => "CREATE OR REPLACE VIEW `{$prefix}vw_matches` AS
        SELECT id, j_external_id AS external_id, j_home_team AS home_team,
               j_away_team AS away_team, j_sport AS sport, j_status AS status,
               j_start_time_dt AS start_time, j_score_home AS score_home,
               j_score_away AS score_away, j_bookmaker AS bookmaker,
               j_last_updated_dt AS last_updated, created_at
        FROM `{$prefix}matches` ORDER BY j_start_time_dt DESC",

    'vw_casino_bets' => "CREATE OR REPLACE VIEW `{$prefix}vw_casino_bets` AS
        SELECT id, j_user_id AS user_id, j_username AS username, j_round_id AS round_id,
               j_game AS game, j_total_wager AS total_wager, j_total_return AS total_return,
               j_net_result AS net_result, j_result AS result, j_round_status AS round_status,
               j_balance_before AS balance_before, j_balance_after AS balance_after, created_at
        FROM `{$prefix}casino_bets` ORDER BY created_at DESC",

    'vw_casino_games' => "CREATE OR REPLACE VIEW `{$prefix}vw_casino_games` AS
        SELECT id, j_slug AS slug, j_name AS name, j_provider AS provider,
               j_category AS category, j_status AS status, j_is_featured AS is_featured,
               j_sort_order AS sort_order, j_min_bet AS min_bet, j_max_bet AS max_bet, created_at
        FROM `{$prefix}casinogames` ORDER BY j_sort_order",

    'vw_ip_logs' => "CREATE OR REPLACE VIEW `{$prefix}vw_ip_logs` AS
        SELECT id, j_ip AS ip, j_user_id AS user_id, j_status AS status,
               j_country AS country, j_city AS city, j_user_model AS user_model,
               j_last_active AS last_active, created_at
        FROM `{$prefix}iplogs` ORDER BY created_at DESC",

    'vw_platform_summary' => "CREATE OR REPLACE VIEW `{$prefix}vw_platform_summary` AS
        SELECT
          (SELECT COUNT(*) FROM `{$prefix}users`) AS total_users,
          (SELECT COUNT(*) FROM `{$prefix}users` WHERE j_status = 'active') AS active_users,
          (SELECT COUNT(*) FROM `{$prefix}agents`) AS total_agents,
          (SELECT COUNT(*) FROM `{$prefix}bets`) AS total_bets,
          (SELECT COUNT(*) FROM `{$prefix}casino_bets`) AS total_casino_bets,
          (SELECT COUNT(*) FROM `{$prefix}transactions`) AS total_transactions,
          (SELECT COUNT(*) FROM `{$prefix}matches` WHERE j_status = 'scheduled') AS upcoming_matches",
];

foreach ($views as $name => $sql) {
    $table = $prefix . $name;
    try {
        // Check if the source table for this view exists
        $pdo->exec($sql);
        $stats['views_created']++;
        out("  + VIEW {$table}");
    } catch (Throwable $e) {
        $stats['errors']++;
        out("  ERROR VIEW {$table}: " . $e->getMessage());
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5: ANALYZE all optimized tables
// ─────────────────────────────────────────────────────────────────────────────
out("\n── PHASE 5: ANALYZE tables ──");
$analyzeTables = ['users', 'agents', 'bets', 'betselections', 'transactions', 'matches',
                  'casino_bets', 'casino_round_audit', 'casinogames', 'iplogs', 'messages'];
foreach ($analyzeTables as $rawTable) {
    $table = $prefix . $rawTable;
    if (tableExists($pdo, $db, $table)) {
        try {
            // ANALYZE TABLE returns a result set — consume + close it so the
            // next prepared query doesn't hit "unbuffered queries are active".
            $stmt = $pdo->query("ANALYZE TABLE `{$table}`");
            if ($stmt !== false) {
                $stmt->fetchAll();
                $stmt->closeCursor();
            }
            out("  ANALYZE {$table}");
        } catch (Throwable $e) {
            // non-critical
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────────────────────────────────────
out("\n=== OPTIMIZATION COMPLETE ===");
out("  Columns added:  {$stats['columns_added']}");
out("  Indexes added:  {$stats['indexes_added']}");
out("  Tables created: {$stats['tables_created']}");
out("  Views created:  {$stats['views_created']}");
out("  Skipped (exist):{$stats['skipped']}");
out("  Errors:         {$stats['errors']}");

if ($stats['errors'] > 0) {
    out("\nSome operations failed — review errors above.");
    exit(1);
}
out("\nAll optimizations applied successfully.");
exit(0);


// ─── Helpers ─────────────────────────────────────────────────────────────────

function out(string $msg): void {
    fwrite(STDOUT, $msg . "\n");
}

function tableExists(PDO $pdo, string $db, string $table): bool {
    $stmt = $pdo->prepare("SELECT 1 FROM information_schema.tables WHERE table_schema = :db AND table_name = :tbl LIMIT 1");
    $stmt->execute([':db' => $db, ':tbl' => $table]);
    return (bool) $stmt->fetchColumn();
}

function columnExists(PDO $pdo, string $db, string $table, string $column): bool {
    // Use the current database context
    $stmt = $pdo->prepare("SELECT 1 FROM information_schema.columns WHERE table_schema = :db AND table_name = :tbl AND column_name = :col LIMIT 1");
    $stmt->execute([':db' => $db, ':tbl' => $table, ':col' => $column]);
    return (bool) $stmt->fetchColumn();
}

function indexExists(PDO $pdo, string $db, string $table, string $index): bool {
    $stmt = $pdo->prepare("SELECT 1 FROM information_schema.statistics WHERE table_schema = :db AND table_name = :tbl AND index_name = :idx LIMIT 1");
    $stmt->execute([':db' => $db, ':tbl' => $table, ':idx' => $index]);
    return (bool) $stmt->fetchColumn();
}
