<?php

declare(strict_types=1);

/**
 * Live-status reaper — keeps the live board honest.
 *
 * THE PROBLEM IT SOLVES
 * When a match (tennis/table-tennis especially) finishes, Rundown stops
 * returning it in the odds-bearing live pull that syncSportLive() uses, so
 * the worker never receives the terminal event_status. The row freezes at
 * status='live' / event_status='STATUS_IN_PROGRESS' forever and keeps
 * showing on the board as a bettable LIVE game with stale, garbage odds —
 * which is exactly how a player ends up betting a game that already ended
 * and getting the wager auto-voided. A single cleanup found 608 such stuck
 * tennis rows vs 88 genuinely-live ones.
 *
 * WHAT IT DOES
 * For every match stored as status='live', it asks Rundown (the UNFILTERED
 * events endpoint, which DOES include finals/cancels) what the event's
 * current status is, and demotes the dead ones:
 *   - Rundown says FINAL / CANCELED  → expire (hide + make non-bettable)
 *   - absent from Rundown's feed AND started > grace hours ago → expire
 *   - still in-progress / scheduled / suspended → leave LIVE
 * Expiring = set status='expired' and clear score.event_status so
 * SportsMatchStatus::effectiveStatus() resolves to 'expired'
 * (HIDDEN_PUBLIC + not bettable). It does NOT write a final score or grade
 * anything.
 *
 * MONEY SAFETY
 * It NEVER touches a match that has a pending bet (betselections.status =
 * 'pending'). Those are left exactly as-is so the existing settlement
 * pipeline (BetSettlementService, row-locked, ledgered, authoritative
 * per-event refetch) owns every won/lost/void transition. On bet-less rows
 * it only flips a display status — no balance, no transactions, no
 * settlement. So it cannot strand, double-pay, or mis-grade a wager.
 *
 * Cron (every 5 min), run as the site user so cache/logs ownership is right:
 *   *\/5 * * * * cd /home/bettorplays247/htdocs/www.bettorplays247.com/betterdr && /usr/bin/php8.2 php-backend/scripts/live-status-reaper.php >> php-backend/logs/live-status-reaper.log 2>&1
 *
 * Tunable via env: LIVE_REAPER_ABSENT_GRACE_HOURS (default 3).
 */

require_once __DIR__ . '/../src/Autoloader.php';
Autoloader::register();
require_once __DIR__ . '/../src/Env.php';

Env::load(dirname(__DIR__, 2), dirname(__DIR__));

if (!SqlRepository::isAvailable()) {
    fwrite(STDERR, "[live-status-reaper] pdo_mysql extension is required\n");
    exit(1);
}

$ts = gmdate(DATE_ATOM);

if (!RundownClient::isConfigured()) {
    fwrite(STDERR, "[$ts] live-status-reaper skipped: Rundown not configured\n");
    exit(0);
}

$now = time();
$graceHours = (int) Env::get('LIVE_REAPER_ABSENT_GRACE_HOURS', '3');
$graceHours = $graceHours > 0 ? $graceHours : 3;

try {
    $dbName = (string) (Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting')) ?: 'sports_betting');
    $db = new SqlRepository('mysql-native', $dbName);

    // Matches carrying pending bet exposure — settlement owns these, hands off.
    $pending = [];
    foreach ($db->findMany('betselections', ['status' => 'pending']) as $sel) {
        $mid = (string) ($sel['matchId'] ?? '');
        if ($mid !== '') {
            $pending[$mid] = true;
        }
    }

    // Stored-live matches, grouped by Rundown sportId so we pull each sport once.
    $bySport = [];
    foreach ($db->findMany('matches', ['status' => 'live']) as $m) {
        $sid = RundownSportMap::sportKeyToSportId((string) ($m['sportKey'] ?? ''));
        if ($sid === null) {
            continue; // unmapped sport: leave to time-based expiry in effectiveStatus()
        }
        $bySport[$sid][] = $m;
    }

    $expired = $leftLive = $protected = $errors = 0;

    foreach ($bySport as $sid => $matches) {
        // Rundown's CURRENT status per event for this sport. The unfiltered
        // events endpoint returns finals/cancels too (unlike the odds pull),
        // which is the whole point — that's the status the live sync misses.
        $rd = [];
        foreach ([gmdate('Y-m-d', $now), gmdate('Y-m-d', $now - 86400)] as $date) {
            try {
                $resp = RundownClient::getEventsForSport((int) $sid, $date, []);
            } catch (Throwable $e) {
                $errors++;
                continue;
            }
            foreach ((is_array($resp['events'] ?? null) ? $resp['events'] : []) as $ev) {
                $eid = (string) ($ev['event_id'] ?? '');
                if ($eid === '') {
                    continue;
                }
                $rd[RundownEventMapper::deterministicMatchId($eid)] =
                    SportsMatchStatus::normalize('', (string) ($ev['score']['event_status'] ?? ''));
            }
        }

        foreach ($matches as $m) {
            $mid = (string) ($m['id'] ?? '');
            if ($mid === '' || isset($pending[$mid])) {
                $protected++;
                continue; // money-safe: never touch a match with pending bets
            }

            $startTs = ($st = (string) ($m['startTime'] ?? '')) !== '' ? strtotime($st) : false;
            $hrs = $startTs !== false ? ($now - $startTs) / 3600 : 999;
            $rdStatus = $rd[$mid] ?? null; // null = absent from Rundown's feed

            $terminal = in_array($rdStatus, ['finished', 'canceled'], true);
            $absentOld = ($rdStatus === null && $hrs > $graceHours);

            if ($terminal || $absentOld) {
                $score = is_array($m['score'] ?? null) ? $m['score'] : [];
                $score['event_status'] = ''; // so effectiveStatus() honours status='expired'
                try {
                    $db->updateOne('matches', ['id' => SqlRepository::id($mid)], [
                        'status'      => 'expired',
                        'score'       => $score,
                        'lastUpdated' => SqlRepository::nowUtc(),
                    ]);
                    $expired++;
                } catch (Throwable $e) {
                    $errors++;
                }
            } else {
                $leftLive++;
            }
        }
    }

    fwrite(STDOUT, sprintf(
        "[%s] live-status-reaper ok expired=%d leftLive=%d protected=%d errors=%d\n",
        $ts, $expired, $leftLive, $protected, $errors
    ));
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, sprintf("[%s] live-status-reaper failed: %s\n", $ts, $e->getMessage()));
    exit(1);
}
