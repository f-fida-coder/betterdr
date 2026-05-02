<?php

declare(strict_types=1);

/**
 * refresh-summaries.php — Tier C cron-driven materialized table refresh.
 *
 * Run from cron (recommended every 5-15 minutes). Example crontab line
 * (note: written without the asterisk-slash sequence so this docblock
 * parses cleanly):
 *
 *     [every 10 min] cd /var/www/betterdr/php-backend && php scripts/refresh-summaries.php
 *
 * As a real crontab entry: minute field "[slash]10", other fields "*".
 *
 * Each refresh is a single REPLACE INTO ... SELECT ... statement per
 * table. We deliberately use REPLACE (not DELETE + INSERT) so a partial
 * failure leaves the table in a consistent state instead of empty.
 *
 * The refresh window is bounded:
 *   - User/agent daily tables: only re-aggregate the last N days
 *     (default 7) plus today. Older days are stable — they don't change
 *     once settled bets stop landing into them.
 *   - House daily: same 7-day rolling window.
 *   - User lifetime: full re-aggregate, but only once per hour
 *     (gated by the most recent refreshed_at).
 *
 * SAFETY:
 *   - This script does NOT modify any source table.
 *   - If a refresh query errors, the matching summary table keeps its
 *     previous data (REPLACE is row-level atomic per row).
 *   - The script exits 0 even when individual steps fail; it logs
 *     failures and the next cron tick retries. Pages that read from
 *     these tables should always handle a stale row.
 */

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);

require_once $phpBackendDir . '/src/Autoloader.php';
Autoloader::register();
require_once $phpBackendDir . '/src/Env.php';
require_once $phpBackendDir . '/src/Logger.php';
require_once $phpBackendDir . '/src/SqlRepository.php';

Env::load($projectRoot, $phpBackendDir);
Logger::init($phpBackendDir . '/logs');

$opts = getopt('', ['window-days::', 'force-lifetime']) ?: [];
$windowDays = isset($opts['window-days']) ? max(1, (int) $opts['window-days']) : 7;
$forceLifetime = array_key_exists('force-lifetime', $opts);

$startedAt = microtime(true);
fwrite(STDERR, sprintf("[refresh] starting window-days=%d force-lifetime=%s\n",
    $windowDays, $forceLifetime ? 'yes' : 'no'));

try {
    $dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
    if ($dbName === '') {
        $dbName = 'sports_betting';
    }
    $db = new SqlRepository('mysql-native', $dbName);
} catch (\Throwable $e) {
    fwrite(STDERR, "[refresh] SqlRepository init failed: " . $e->getMessage() . "\n");
    exit(0); // exit 0 so cron doesn't spam us
}

$pdo = $db->getRawPdoForOps();
$results = [];

// ─── 1. summary_user_daily_pl ────────────────────────────────────────────────
$results['user_daily'] = runStep($pdo, 'user_daily', sprintf(
    "REPLACE INTO summary_user_daily_pl
        (userId, day, pl, bet_count, won_count, lost_count, void_count,
         risk_total, payout_total)
     SELECT
         userId,
         DATE(COALESCE(settledAt, updatedAt, createdAt)) AS day,
         SUM(CASE WHEN status = 'won'  THEN COALESCE(payout,0) - COALESCE(amount,0)
                  WHEN status = 'lost' THEN -COALESCE(amount,0)
                  ELSE 0 END) AS pl,
         COUNT(*) AS bet_count,
         SUM(CASE WHEN status = 'won'  THEN 1 ELSE 0 END) AS won_count,
         SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) AS lost_count,
         SUM(CASE WHEN status = 'void' THEN 1 ELSE 0 END) AS void_count,
         SUM(COALESCE(amount,0)) AS risk_total,
         SUM(COALESCE(payout,0)) AS payout_total
     FROM bets
     WHERE COALESCE(settledAt, updatedAt, createdAt) >= DATE_SUB(UTC_DATE(), INTERVAL %d DAY)
       AND status IN ('won','lost','void')
     GROUP BY userId, DATE(COALESCE(settledAt, updatedAt, createdAt))",
    $windowDays
));

// ─── 2. summary_agent_daily_pl ───────────────────────────────────────────────
$results['agent_daily'] = runStep($pdo, 'agent_daily', sprintf(
    "REPLACE INTO summary_agent_daily_pl
        (agentId, day, pl, active_users, bet_count, risk_total, payout_total)
     SELECT
         u.agentId,
         DATE(COALESCE(b.settledAt, b.updatedAt, b.createdAt)) AS day,
         SUM(CASE WHEN b.status = 'won'  THEN COALESCE(b.payout,0) - COALESCE(b.amount,0)
                  WHEN b.status = 'lost' THEN -COALESCE(b.amount,0)
                  ELSE 0 END) AS pl,
         COUNT(DISTINCT u.id) AS active_users,
         COUNT(*) AS bet_count,
         SUM(COALESCE(b.amount,0)) AS risk_total,
         SUM(COALESCE(b.payout,0)) AS payout_total
     FROM bets b
     JOIN users u ON u.id = b.userId
     WHERE COALESCE(b.settledAt, b.updatedAt, b.createdAt) >= DATE_SUB(UTC_DATE(), INTERVAL %d DAY)
       AND b.status IN ('won','lost','void')
       AND u.agentId IS NOT NULL AND u.agentId <> ''
     GROUP BY u.agentId, DATE(COALESCE(b.settledAt, b.updatedAt, b.createdAt))",
    $windowDays
));

// ─── 3. summary_daily_house ──────────────────────────────────────────────────
$results['house_daily'] = runStep($pdo, 'house_daily', sprintf(
    "REPLACE INTO summary_daily_house
        (day, handle, pl, bet_count, sportsbook_handle, sportsbook_pl,
         casino_handle, casino_pl, active_users)
     SELECT
         d.day,
         COALESCE(sb.handle,0) + COALESCE(c.handle,0) AS handle,
         -1 * (COALESCE(sb.user_pl,0) + COALESCE(c.user_pl,0)) AS pl,
         COALESCE(sb.bet_count,0) + COALESCE(c.bet_count,0) AS bet_count,
         COALESCE(sb.handle,0) AS sportsbook_handle,
         -1 * COALESCE(sb.user_pl,0) AS sportsbook_pl,
         COALESCE(c.handle,0) AS casino_handle,
         -1 * COALESCE(c.user_pl,0) AS casino_pl,
         COALESCE(sb.active_users,0) + COALESCE(c.active_users,0) AS active_users
     FROM (
         SELECT DATE(d) AS day FROM (
             SELECT UTC_DATE() - INTERVAL n DAY AS d
             FROM (SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
                   UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) days
         ) x
     ) d
     LEFT JOIN (
         SELECT DATE(COALESCE(settledAt, updatedAt, createdAt)) AS day,
                SUM(COALESCE(amount,0)) AS handle,
                SUM(CASE WHEN status='won' THEN COALESCE(payout,0) - COALESCE(amount,0)
                         WHEN status='lost' THEN -COALESCE(amount,0)
                         ELSE 0 END) AS user_pl,
                COUNT(*) AS bet_count,
                COUNT(DISTINCT userId) AS active_users
         FROM bets
         WHERE COALESCE(settledAt, updatedAt, createdAt) >= DATE_SUB(UTC_DATE(), INTERVAL %d DAY)
           AND status IN ('won','lost','void')
         GROUP BY DATE(COALESCE(settledAt, updatedAt, createdAt))
     ) sb ON sb.day = d.day
     LEFT JOIN (
         SELECT DATE(COALESCE(settledAt, updatedAt, createdAt)) AS day,
                SUM(COALESCE(amount,0)) AS handle,
                SUM(CASE WHEN status='won' THEN COALESCE(payout,0) - COALESCE(amount,0)
                         WHEN status='lost' THEN -COALESCE(amount,0)
                         ELSE 0 END) AS user_pl,
                COUNT(*) AS bet_count,
                COUNT(DISTINCT userId) AS active_users
         FROM casino_bets
         WHERE COALESCE(settledAt, updatedAt, createdAt) >= DATE_SUB(UTC_DATE(), INTERVAL %d DAY)
           AND status IN ('won','lost','void')
         GROUP BY DATE(COALESCE(settledAt, updatedAt, createdAt))
     ) c ON c.day = d.day",
    $windowDays,
    $windowDays
));

// ─── 4. summary_user_lifetime (rate-limited to once/hour) ────────────────────
$shouldDoLifetime = $forceLifetime;
if (!$shouldDoLifetime) {
    try {
        $stmt = $pdo->query("SELECT MAX(refreshed_at) FROM summary_user_lifetime");
        $last = $stmt ? $stmt->fetchColumn() : null;
        if ($last === null || strtotime((string) $last) < (time() - 3600)) {
            $shouldDoLifetime = true;
        }
    } catch (\Throwable $e) {
        // table might not exist yet — leave $shouldDoLifetime as-is
        $shouldDoLifetime = true;
    }
}
if ($shouldDoLifetime) {
    $results['user_lifetime'] = runStep($pdo, 'user_lifetime',
        "REPLACE INTO summary_user_lifetime
            (userId, first_bet_at, last_bet_at, total_handle, total_pl, bet_count)
         SELECT
             userId,
             MIN(createdAt) AS first_bet_at,
             MAX(COALESCE(settledAt, updatedAt, createdAt)) AS last_bet_at,
             SUM(COALESCE(amount,0)) AS total_handle,
             SUM(CASE WHEN status='won' THEN COALESCE(payout,0) - COALESCE(amount,0)
                      WHEN status='lost' THEN -COALESCE(amount,0)
                      ELSE 0 END) AS total_pl,
             COUNT(*) AS bet_count
         FROM bets
         WHERE status IN ('won','lost','void','pending')
         GROUP BY userId"
    );
} else {
    $results['user_lifetime'] = ['skipped' => true, 'reason' => 'rate-limited (hourly)'];
}

$elapsed = microtime(true) - $startedAt;
fwrite(STDERR, sprintf("[refresh] done in %.2fs results=%s\n",
    $elapsed, json_encode($results)));

try {
    Logger::info('summary_refresh', [
        'durationMs' => (int) round($elapsed * 1000),
        'results' => $results,
    ]);
} catch (\Throwable $_) {
    // logger optional
}

exit(0);

/**
 * @return array<string,mixed>
 */
function runStep(\PDO $pdo, string $name, string $sql): array
{
    $t0 = microtime(true);
    try {
        $affected = $pdo->exec($sql);
        $elapsed = microtime(true) - $t0;
        return [
            'ok' => true,
            'rows' => is_int($affected) ? $affected : null,
            'durationMs' => (int) round($elapsed * 1000),
        ];
    } catch (\Throwable $e) {
        $elapsed = microtime(true) - $t0;
        fwrite(STDERR, sprintf("[refresh] step=%s FAILED in %.2fs: %s\n",
            $name, $elapsed, $e->getMessage()));
        try {
            Logger::warning('summary_refresh_step_failed', [
                'step' => $name,
                'error' => $e->getMessage(),
                'durationMs' => (int) round($elapsed * 1000),
            ]);
        } catch (\Throwable $_) {
            // logger optional
        }
        return [
            'ok' => false,
            'error' => $e->getMessage(),
            'durationMs' => (int) round($elapsed * 1000),
        ];
    }
}
