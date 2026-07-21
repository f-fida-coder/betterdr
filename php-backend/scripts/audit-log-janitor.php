<?php

declare(strict_types=1);

/**
 * Audit-log janitor — bounded retention for internal log tables.
 *
 * THE PROBLEM IT SOLVES
 * sportsbookauditlogs grew to ~650MB / 532k rows because its only cleanup
 * lived inside AdminCoreController::maybeCleanupStaleData(): a 1-in-100
 * chance per admin API request, capped at 500 rows per table per firing.
 * The worker writes thousands of info rows per day, so the probabilistic
 * cleanup could never catch up — rows from March were still on disk in
 * July. This script replaces that mechanism with a deterministic cron.
 *
 * WHAT IT DELETES (and nothing else — table names are hard-coded)
 *   sportsbookauditlogs  info > AUDIT_JANITOR_INFO_DAYS (30)
 *                        warning/error > AUDIT_JANITOR_ERROR_DAYS (90)
 *                        critical: NEVER deleted
 *   iplogs               status='active' > 30 days (whitelisted/blocked kept)
 *   admin_audit_log      everything > 90 days
 *   rate_limits          legacy rows > 10 minutes (table no longer written)
 *   cache/rate-limits/*  files older than 10 minutes
 *
 * It never reads or writes users, bets, betselections, transactions,
 * casino_bets, matches, or any other table. Deleting log rows moves no
 * money and changes nothing a player or admin can see.
 *
 * HOW IT DELETES
 * sportsbookauditlogs is purged with raw batched `DELETE ... LIMIT n`
 * loops on the indexed (j_severity, created_at) columns instead of
 * SqlRepository::deleteMany(), because deleteMany() first loads every
 * matching id into memory — a 290k-row backlog would balloon the process.
 * Batches keep each statement's lock window short so the worker's own
 * inserts never queue behind the janitor. The small tables use the
 * wrapper with a per-run cap.
 *
 * NOTE: InnoDB does not return disk space to the OS on DELETE. After the
 * first big backlog purge, run once during a quiet window:
 *   OPTIMIZE TABLE sportsbookauditlogs;
 * Steady-state runs delete a few hundred rows/day and need no OPTIMIZE.
 *
 * Cron (daily, as the site user):
 *   17 9 * * * cd /home/bettorplays247/htdocs/www.bettorplays247.com/betterdr && /usr/bin/php php-backend/scripts/audit-log-janitor.php >> php-backend/logs/audit-log-janitor.log 2>&1
 *
 * Tunable via env:
 *   AUDIT_JANITOR_INFO_DAYS   (default 30)
 *   AUDIT_JANITOR_ERROR_DAYS  (default 90)
 *   AUDIT_JANITOR_BATCH_ROWS  (default 5000)   rows per DELETE statement
 *   AUDIT_JANITOR_MAX_ROWS    (default 100000) audit-row cap per run
 */

require_once __DIR__ . '/../src/Autoloader.php';
Autoloader::register();
require_once __DIR__ . '/../src/Env.php';

Env::load(dirname(__DIR__, 2), dirname(__DIR__));

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[audit-log-janitor] pdo_mysql extension is required\n");
    exit(1);
}

$ts = gmdate(DATE_ATOM);

$envInt = static function (string $key, int $default): int {
    $raw = Env::get($key, (string) $default);
    return is_numeric($raw) && (int) $raw > 0 ? (int) $raw : $default;
};

$infoDays = $envInt('AUDIT_JANITOR_INFO_DAYS', 30);
$errorDays = $envInt('AUDIT_JANITOR_ERROR_DAYS', 90);
$batchRows = $envInt('AUDIT_JANITOR_BATCH_ROWS', 5000);
$maxRows = $envInt('AUDIT_JANITOR_MAX_ROWS', 100000);

try {
    $dbName = (string) (Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting')) ?: 'sports_betting');
    $db = new SqlRepository('mysql-native', $dbName);
    $pdo = $db->getRawPdoForOps();
    $auditTable = $db->rawTableName('sportsbookauditlogs');

    // created_at is a real DATETIME column (UTC), j_severity a stored
    // generated column — both indexed, so each batch is a range delete,
    // not a scan. critical is simply never in this policy list.
    $policies = [
        ['severity' => 'info', 'cutoff' => gmdate('Y-m-d H:i:s', time() - $infoDays * 86400)],
        ['severity' => 'warning', 'cutoff' => gmdate('Y-m-d H:i:s', time() - $errorDays * 86400)],
        ['severity' => 'error', 'cutoff' => gmdate('Y-m-d H:i:s', time() - $errorDays * 86400)],
    ];

    $auditDeleted = 0;
    foreach ($policies as $policy) {
        while ($auditDeleted < $maxRows) {
            $limit = min($batchRows, $maxRows - $auditDeleted);
            $stmt = $pdo->prepare(
                "DELETE FROM `{$auditTable}` WHERE `j_severity` = :sev AND `created_at` < :cutoff LIMIT {$limit}"
            );
            $stmt->execute([':sev' => $policy['severity'], ':cutoff' => $policy['cutoff']]);
            $deleted = (int) $stmt->rowCount();
            $auditDeleted += $deleted;
            if ($deleted < $limit) {
                break; // this severity's backlog is drained
            }
        }
    }

    // Small tables (a few MB) — the wrapper's load-ids-then-delete shape is
    // fine here, with a per-run cap as a belt-and-braces bound.
    $ipThreshold = SqlRepository::utcFromMillis((time() - 30 * 86400) * 1000);
    $ipDeleted = $db->deleteMany('iplogs', [
        'status' => 'active',
        'createdAt' => ['$lte' => $ipThreshold],
    ], 2000);

    $adminAuditThreshold = SqlRepository::utcFromMillis((time() - 90 * 86400) * 1000);
    $adminDeleted = $db->deleteMany('admin_audit_log', [
        'createdAt' => ['$lte' => $adminAuditThreshold],
    ], 2000);

    $rateDeleted = 0;
    $rateLimitThreshold = SqlRepository::utcFromMillis((time() - 600) * 1000);
    try {
        $rateDeleted = $db->deleteMany('rate_limits', [
            'windowStart' => ['$lte' => $rateLimitThreshold],
        ], 2000);
    } catch (Throwable) {
        // Table may not exist on fresh installs — ignore
    }

    // Stale file-backed rate-limit counters (older than 2× the longest window).
    $filesDeleted = 0;
    $rlDir = __DIR__ . '/../cache/rate-limits';
    if (is_dir($rlDir)) {
        $cutoff = time() - 600;
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($rlDir, FilesystemIterator::SKIP_DOTS)) as $file) {
            if ($file->isFile() && $file->getMTime() < $cutoff) {
                if (@unlink($file->getPathname())) {
                    $filesDeleted++;
                }
            }
        }
    }

    fwrite(STDOUT, sprintf(
        "[%s] audit-log-janitor ok audit=%d iplogs=%d adminAudit=%d rateLimits=%d rlFiles=%d capped=%s\n",
        $ts,
        $auditDeleted,
        $ipDeleted,
        $adminDeleted,
        $rateDeleted,
        $filesDeleted,
        $auditDeleted >= $maxRows ? 'yes' : 'no'
    ));
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, sprintf("[%s] audit-log-janitor failed: %s\n", $ts, $e->getMessage()));
    exit(1);
}
