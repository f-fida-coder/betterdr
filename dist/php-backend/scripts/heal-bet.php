<?php

declare(strict_types=1);

/**
 * One-shot diagnostic + force-settle for a stuck pending bet.
 *
 * Use when the automatic settlement sweep can't grade a match — usually
 * because the upstream score feed never recorded a final score for the
 * event, so `looksProvablyFinished` returns false and the sweep
 * intentionally leaves the ticket pending for operator confirmation.
 *
 * Diagnose first (dry-run):
 *   php scripts/heal-bet.php --username=NJG101
 *   php scripts/heal-bet.php --bet-id=<24-hex>
 *
 * Then settle with the actual winner:
 *   php scripts/heal-bet.php --username=NJG101 --winner=home --apply
 *   php scripts/heal-bet.php --username=NJG101 --winner=away --apply
 *   php scripts/heal-bet.php --username=NJG101 --winner=auto --apply   # use stored score
 *
 * Money flows through BetSettlementService::settleMatch (transactional,
 * idempotent, writes the ledger row + decrements pendingBalance). Same
 * path the admin UI Settle button uses, just driven from CLI when the
 * admin needs to grade many tickets at once or doesn't have UI access.
 */

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/Logger.php';
require_once __DIR__ . '/../src/Http.php';
require_once __DIR__ . '/../src/ApiException.php';
require_once __DIR__ . '/../src/Response.php';
require_once __DIR__ . '/../src/CircuitBreaker.php';
require_once __DIR__ . '/../src/ConnectionPool.php';
require_once __DIR__ . '/../src/QueryCache.php';
require_once __DIR__ . '/../src/RequestDeduplicator.php';
require_once __DIR__ . '/../src/SharedFileCache.php';
require_once __DIR__ . '/../src/SportsbookCache.php';
require_once __DIR__ . '/../src/SqlRepository.php';
require_once __DIR__ . '/../src/BetModeRules.php';
require_once __DIR__ . '/../src/AgentSettlementRules.php';
require_once __DIR__ . '/../src/SportsMatchStatus.php';
require_once __DIR__ . '/../src/SportsbookHealth.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/BetSettlementService.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

$opts = getopt('', ['username::', 'bet-id::', 'winner::', 'apply']);
$username = trim((string) ($opts['username'] ?? ''));
$betId = trim((string) ($opts['bet-id'] ?? ''));
$winner = strtolower(trim((string) ($opts['winner'] ?? 'auto')));
$apply = array_key_exists('apply', $opts);

if ($username === '' && $betId === '') {
    fwrite(STDERR, "Usage: php scripts/heal-bet.php --username=<u> | --bet-id=<id> [--winner=home|away|auto] [--apply]\n");
    exit(2);
}
if (!in_array($winner, ['home', 'away', 'auto'], true)) {
    fwrite(STDERR, "--winner must be one of: home, away, auto\n");
    exit(2);
}

$db = new SqlRepository('mysql-native', (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting')));

$bets = [];
if ($betId !== '') {
    if (preg_match('/^[a-f0-9]{24}$/i', $betId) !== 1) {
        fwrite(STDERR, "--bet-id must be a 24-hex id\n");
        exit(2);
    }
    $row = $db->findOne('bets', ['id' => SqlRepository::id($betId)]);
    if ($row === null) {
        fwrite(STDERR, "bet not found: $betId\n");
        exit(2);
    }
    $bets = [$row];
} else {
    $user = $db->findOne('users', ['username' => $username], ['projection' => ['id' => 1, 'username' => 1]]);
    if ($user === null) {
        fwrite(STDERR, "user not found: $username\n");
        exit(2);
    }
    $userId = (string) ($user['id'] ?? '');
    $bets = $db->findMany('bets', ['userId' => SqlRepository::id($userId), 'status' => 'pending'], [
        'limit' => 50,
    ]);
    if ($bets === []) {
        fwrite(STDOUT, "No pending bets for $username.\n");
        exit(0);
    }
}

$matchIds = [];
foreach ($bets as $bet) {
    if (is_array($bet['selections'] ?? null)) {
        foreach ($bet['selections'] as $sel) {
            if (!is_array($sel)) continue;
            $mid = (string) ($sel['matchId'] ?? '');
            if ($mid !== '' && preg_match('/^[a-f0-9]{24}$/i', $mid) === 1) {
                $matchIds[$mid] = true;
            }
        }
    }
    $top = (string) ($bet['matchId'] ?? '');
    if ($top !== '' && preg_match('/^[a-f0-9]{24}$/i', $top) === 1) {
        $matchIds[$top] = true;
    }
}

if ($matchIds === []) {
    fwrite(STDOUT, "Found " . count($bets) . " pending bet(s) but no resolvable matchIds.\n");
    exit(0);
}

fwrite(STDOUT, sprintf("Pending matches: %d\n\n", count($matchIds)));

$now = time();
$plan = [];
foreach (array_keys($matchIds) as $mid) {
    $match = $db->findOne('matches', ['id' => SqlRepository::id($mid)]);
    if ($match === null) {
        fwrite(STDOUT, "matchId=$mid  (NOT FOUND)\n\n");
        continue;
    }
    $eff = SportsMatchStatus::effectiveStatus($match, $now);
    $startRaw = (string) ($match['startTime'] ?? '');
    $startTs = $startRaw !== '' ? (strtotime($startRaw) ?: 0) : 0;
    $ageH = $startTs > 0 ? round(($now - $startTs) / 3600, 1) : null;
    $score = is_array($match['score'] ?? null) ? $match['score'] : [];
    $sh = is_numeric($score['score_home'] ?? null) ? (float) $score['score_home'] : null;
    $sa = is_numeric($score['score_away'] ?? null) ? (float) $score['score_away'] : null;
    $home = (string) ($match['homeTeam'] ?? '?');
    $away = (string) ($match['awayTeam'] ?? '?');
    $lastUpdated = (string) (($match['lastUpdated'] ?? '') ?: ($match['updatedAt'] ?? ''));
    $lastScoreChanged = (string) ($match['lastScoreChangedAt'] ?? '');
    $probablyFinished = BetSettlementService::looksProvablyFinished($match, $now);

    fwrite(STDOUT, "matchId          = $mid\n");
    fwrite(STDOUT, "matchup          = $home  vs  $away\n");
    fwrite(STDOUT, sprintf("startTime        = %s  (%s h ago)\n", $startRaw, $ageH ?? '?'));
    fwrite(STDOUT, sprintf("raw status       = %s\n", (string) ($match['status'] ?? '')));
    fwrite(STDOUT, sprintf("effective status = %s\n", $eff));
    fwrite(STDOUT, sprintf("score            = %s : %s\n", $sh === null ? 'null' : (string) $sh, $sa === null ? 'null' : (string) $sa));
    fwrite(STDOUT, sprintf("lastUpdated      = %s\n", $lastUpdated));
    fwrite(STDOUT, sprintf("lastScoreChange  = %s\n", $lastScoreChanged ?: '(never)'));
    fwrite(STDOUT, sprintf("looksProvably    = %s\n", $probablyFinished ? 'true' : 'false'));
    fwrite(STDOUT, "\n");

    $plan[$mid] = compact('match', 'home', 'away');
}

if (!$apply) {
    fwrite(STDOUT, "DRY RUN. Re-run with --apply --winner=home|away|auto to settle.\n");
    exit(0);
}

fwrite(STDOUT, "Applying force-settle (winner=$winner)...\n\n");

foreach ($plan as $mid => $ctx) {
    $match = $ctx['match'];
    $manualWinner = null;
    if ($winner === 'home') {
        $manualWinner = $ctx['home'];
    } elseif ($winner === 'away') {
        $manualWinner = $ctx['away'];
    }

    if ((string) ($match['status'] ?? '') !== 'finished') {
        $db->updateOne('matches', ['id' => SqlRepository::id($mid)], [
            'status' => 'finished',
            'updatedAt' => SqlRepository::nowUtc(),
            'autoFinishedReason' => 'cli-heal-bet',
        ]);
    }

    try {
        $result = BetSettlementService::settleMatch($db, $mid, $manualWinner, 'cli-heal');
        fwrite(STDOUT, sprintf(
            "matchId=%s  manualWinner=%s  settled=%d  bets=%s\n",
            $mid,
            $manualWinner ?? '(auto)',
            (int) ($result['total'] ?? 0),
            json_encode(array_values((array) ($result['settledBetIds'] ?? [])))
        ));
    } catch (Throwable $e) {
        fwrite(STDERR, sprintf("matchId=%s  FAILED: %s\n", $mid, $e->getMessage()));
    }
}

fwrite(STDOUT, "\nDone.\n");
