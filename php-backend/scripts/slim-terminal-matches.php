<?php

declare(strict_types=1);

/**
 * Slim terminal match docs — drop the dead odds payload once a match is over.
 *
 * A finished/expired/canceled match keeps its LAST full board inside the
 * doc (odds + extendedMarkets + playerProps — up to 1.25MB on prop-heavy
 * games, ~95% of the doc) even though nothing ever reads it again:
 *   - settlement grades off score / score_*_by_period / event_status /
 *     homeTeam / awayTeam / startTime / sportKey (all KEPT),
 *   - My Bets enrichment reads teams / startTime / sport / league /
 *     status / score (all KEPT),
 *   - the board only serves non-terminal matches.
 * That dead weight held the matches table at ~188MB for ~11k rows.
 *
 * WHAT IT DOES
 * One atomic UPDATE per batch: JSON_REMOVE(doc, '$.odds',
 * '$.extendedMarkets', '$.playerProps') on rows that are ALL of:
 *   - j_status IN ('finished','expired','canceled')  (terminal only)
 *   - updated_at older than 48h   (nothing is actively writing the row;
 *     also keeps just-finished games intact through the settlement window)
 *   - NOT referenced by any betselections row with status pending/closed
 *     (settlement's final-refetch can re-sync those matches — hands off,
 *     same money-guard the live-status reaper uses)
 *   - still carrying at least one of the three fat keys (idempotency)
 *
 * MONEY SAFETY
 * The single-statement JSON_REMOVE never rewrites the whole doc from PHP,
 * so a concurrent worker write can't be lost (no read-modify-write).
 * score/status/teams are untouched, so a settled bet's history renders
 * exactly as before, and re-grading a terminal match (manual winner,
 * disputes) still has everything grading reads. Generated j_* columns
 * recompute from paths this never touches.
 *
 * Usage:
 *   php php-backend/scripts/slim-terminal-matches.php          # dry-run
 *   php php-backend/scripts/slim-terminal-matches.php --yes    # apply
 *
 * Cron (daily, as the site user — keeps steady-state flat after backfill):
 *   27 9 * * * cd /home/bettorplays247/htdocs/www.bettorplays247.com/betterdr && /usr/bin/php php-backend/scripts/slim-terminal-matches.php --yes >> php-backend/logs/slim-terminal-matches.log 2>&1
 *
 * Tunable via env: MATCH_SLIM_MIN_AGE_HOURS (default 48),
 * MATCH_SLIM_BATCH_ROWS (default 500).
 */

require_once __DIR__ . '/../src/Autoloader.php';
Autoloader::register();
require_once __DIR__ . '/../src/Env.php';

Env::load(dirname(__DIR__, 2), dirname(__DIR__));

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[slim-terminal-matches] pdo_mysql extension is required\n");
    exit(1);
}

$apply = in_array('--yes', $argv, true);
$ts = gmdate(DATE_ATOM);

$envInt = static function (string $key, int $default): int {
    $raw = Env::get($key, (string) $default);
    return is_numeric($raw) && (int) $raw > 0 ? (int) $raw : $default;
};
$minAgeHours = $envInt('MATCH_SLIM_MIN_AGE_HOURS', 48);
$batchRows = $envInt('MATCH_SLIM_BATCH_ROWS', 500);

try {
    $dbName = (string) (Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting')) ?: 'sports_betting');
    $db = new SqlRepository('mysql-native', $dbName);
    $pdo = $db->getRawPdoForOps();
    $matches = $db->rawTableName('matches');
    $selections = $db->rawTableName('betselections');

    // IS NOT NULL inside the subquery matters: one NULL in a NOT IN list
    // makes the predicate match nothing and the sweep silently no-ops.
    $eligibleWhere = "
        `j_status` IN ('finished','expired','canceled')
        AND `updated_at` < NOW() - INTERVAL {$minAgeHours} HOUR
        AND JSON_CONTAINS_PATH(`doc`, 'one', '$.odds', '$.extendedMarkets', '$.playerProps')
        AND `id` NOT IN (
            SELECT DISTINCT `j_match_id` FROM `{$selections}`
            WHERE `j_status` IN ('pending','closed') AND `j_match_id` IS NOT NULL
        )";

    $stat = $pdo->query(
        "SELECT COUNT(*) AS cnt, ROUND(IFNULL(SUM(LENGTH(`doc`)),0)/1048576, 1) AS mb FROM `{$matches}` WHERE {$eligibleWhere}"
    )->fetch(PDO::FETCH_ASSOC) ?: ['cnt' => 0, 'mb' => 0];

    if (!$apply) {
        fwrite(STDOUT, sprintf(
            "[%s] slim-terminal-matches DRY-RUN eligible=%d docMB=%.1f (minAgeHours=%d)\nDry-run only. Re-run with --yes to apply.\n",
            $ts,
            (int) $stat['cnt'],
            (float) $stat['mb'],
            $minAgeHours
        ));
        exit(0);
    }

    $slimmed = 0;
    while (true) {
        $stmt = $pdo->prepare(
            "UPDATE `{$matches}`
             SET `doc` = JSON_REMOVE(`doc`, '$.odds', '$.extendedMarkets', '$.playerProps')
             WHERE {$eligibleWhere}
             LIMIT {$batchRows}"
        );
        $stmt->execute();
        $affected = (int) $stmt->rowCount();
        $slimmed += $affected;
        if ($affected < $batchRows) {
            break;
        }
    }

    fwrite(STDOUT, sprintf(
        "[%s] slim-terminal-matches ok slimmed=%d freedDocMB~%.1f\n",
        $ts,
        $slimmed,
        (float) $stat['mb']
    ));
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, sprintf("[%s] slim-terminal-matches failed: %s\n", $ts, $e->getMessage()));
    exit(1);
}
