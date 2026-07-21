<?php

declare(strict_types=1);

/**
 * One-off backfill: slim the matchSnapshot blobs on SETTLED bets.
 *
 * Every bet leg stored the ENTIRE match doc as matchSnapshot — up to 233KB
 * per leg (playerProps + odds + extendedMarkets), and TWICE per leg
 * (bets.selections[].matchSnapshot and the betselections row). New
 * placements are slimmed at source since SportsbookBetSupport::
 * slimMatchSnapshot shipped; this script retrofits the existing rows.
 *
 * SCOPE — terminal rows ONLY, by design:
 *   bets:          status IN (won, lost, void, rejected)
 *   betselections: status IN (won, lost, void, rejected)
 * 'pending' / 'open' bets and 'pending' / 'closed' selection rows are
 * SKIPPED: SqlRepository::updateOne is a read-modify-write of the whole
 * doc, so touching a row that settlement might write concurrently could
 * lose that write. Terminal rows have no writers (one-terminal-state
 * rule), so the rewrite is race-free. Re-run the script after the last
 * legacy pending bets settle to catch the stragglers — it is idempotent
 * (already-slim snapshots are detected and skipped).
 *
 * MONEY SAFETY: only the matchSnapshot key is modified. Stake, odds,
 * status, payout, selections' grading fields, balances, transactions —
 * untouched. slimMatchSnapshot keeps every field any reader uses
 * (verified 2026-07-21; see the helper's doc block), including the
 * listedPitcherVoid fields on the off chance a terminal row is ever
 * re-inspected.
 *
 * Usage:
 *   php php-backend/scripts/slim-bet-snapshots.php            # dry-run report
 *   php php-backend/scripts/slim-bet-snapshots.php --yes      # apply
 */

require_once __DIR__ . '/../src/Autoloader.php';
Autoloader::register();
require_once __DIR__ . '/../src/Env.php';

Env::load(dirname(__DIR__, 2), dirname(__DIR__));

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[slim-bet-snapshots] pdo_mysql extension is required\n");
    exit(1);
}

$apply = in_array('--yes', $argv, true);
$ts = gmdate(DATE_ATOM);
$terminal = ['won', 'lost', 'void', 'rejected'];

/**
 * @param array<string, mixed> $snapshot
 */
function isFatSnapshot(array $snapshot): bool
{
    return isset($snapshot['odds']) || isset($snapshot['extendedMarkets']) || isset($snapshot['playerProps']);
}

try {
    $dbName = (string) (Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting')) ?: 'sports_betting');
    $db = new SqlRepository('mysql-native', $dbName);

    $betsSeen = $betsSlimmed = $selSeen = $selSlimmed = 0;
    $bytesBefore = $bytesAfter = 0;

    foreach ($terminal as $status) {
        foreach ($db->findMany('bets', ['status' => $status]) as $bet) {
            $betsSeen++;
            $id = (string) ($bet['id'] ?? '');
            if ($id === '') {
                continue;
            }

            $dirty = false;
            $set = [];

            $topSnap = is_array($bet['matchSnapshot'] ?? null) ? $bet['matchSnapshot'] : [];
            if (isFatSnapshot($topSnap)) {
                $set['matchSnapshot'] = SportsbookBetSupport::slimMatchSnapshot($topSnap);
                $dirty = true;
            }

            $selections = is_array($bet['selections'] ?? null) ? $bet['selections'] : [];
            $legsChanged = false;
            foreach ($selections as $i => $leg) {
                if (!is_array($leg)) {
                    continue;
                }
                $legSnap = is_array($leg['matchSnapshot'] ?? null) ? $leg['matchSnapshot'] : [];
                if (isFatSnapshot($legSnap)) {
                    $selections[$i]['matchSnapshot'] = SportsbookBetSupport::slimMatchSnapshot($legSnap);
                    $legsChanged = true;
                }
            }
            if ($legsChanged) {
                $set['selections'] = $selections;
                $dirty = true;
            }

            if (!$dirty) {
                continue;
            }

            $before = strlen(json_encode($bet) ?: '');
            $after = strlen(json_encode(SqlRepository::mergeDocumentKeys($bet, $set)) ?: '');
            $bytesBefore += $before;
            $bytesAfter += $after;
            $betsSlimmed++;

            if ($apply) {
                $db->updateOne('bets', ['id' => SqlRepository::id($id)], $set);
            }
        }

        foreach ($db->findMany('betselections', ['status' => $status]) as $row) {
            $selSeen++;
            $id = (string) ($row['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $snap = is_array($row['matchSnapshot'] ?? null) ? $row['matchSnapshot'] : [];
            if (!isFatSnapshot($snap)) {
                continue;
            }
            $slim = SportsbookBetSupport::slimMatchSnapshot($snap);

            $bytesBefore += strlen(json_encode($snap) ?: '');
            $bytesAfter += strlen(json_encode($slim) ?: '');
            $selSlimmed++;

            if ($apply) {
                $db->updateOne('betselections', ['id' => SqlRepository::id($id)], ['matchSnapshot' => $slim]);
            }
        }
    }

    fwrite(STDOUT, sprintf(
        "[%s] slim-bet-snapshots %s bets=%d/%d selections=%d/%d savedMB=%.1f (%.1f -> %.1f)\n",
        $ts,
        $apply ? 'APPLIED' : 'DRY-RUN',
        $betsSlimmed,
        $betsSeen,
        $selSlimmed,
        $selSeen,
        ($bytesBefore - $bytesAfter) / 1048576,
        $bytesBefore / 1048576,
        $bytesAfter / 1048576
    ));
    if (!$apply) {
        fwrite(STDOUT, "Dry-run only. Re-run with --yes to apply.\n");
    }
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, sprintf("[%s] slim-bet-snapshots failed: %s\n", $ts, $e->getMessage()));
    exit(1);
}
