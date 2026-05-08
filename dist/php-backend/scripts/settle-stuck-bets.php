<?php

declare(strict_types=1);

/**
 * Backfill grader for tickets stuck on matches the upstream feed never
 * finalized. Pairs with the BetSettlementService::settlePendingMatches fix
 * that lets the sweep void matches whose effectiveStatus is 'expired'.
 *
 * Default mode is dry-run: prints the matches the sweep would touch, the
 * effective status, the bet count, and an estimated refund total. No writes.
 *
 * Pass --apply to invoke the real sweep. Each voided ticket flows through
 * BetSettlementService::settleMatch (transactional, balance-correct, ledger
 * entry written), same path the live worker uses.
 *
 * Usage:
 *   php scripts/settle-stuck-bets.php                # dry-run preview
 *   php scripts/settle-stuck-bets.php --apply        # actually settle
 *   php scripts/settle-stuck-bets.php --apply --limit=50
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

$opts = getopt('', ['apply', 'limit::']);
$apply = array_key_exists('apply', $opts);
$limit = max(1, (int) ($opts['limit'] ?? 250));

$db = new SqlRepository('mysql-native', (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting')));

$pendingSelections = $db->findMany('betselections', ['status' => 'pending'], [
    'projection' => ['matchId' => 1, 'betId' => 1],
    'limit' => $limit * 10,
]);

$matchIds = [];
$selectionsByMatch = [];
foreach ($pendingSelections as $sel) {
    $mid = (string) ($sel['matchId'] ?? '');
    if ($mid === '' || preg_match('/^[a-f0-9]{24}$/i', $mid) !== 1) {
        continue;
    }
    $matchIds[$mid] = true;
    $selectionsByMatch[$mid][] = (string) ($sel['betId'] ?? '');
    if (count($matchIds) >= $limit) break;
}

if ($matchIds === []) {
    fwrite(STDOUT, "No pending betselections found. Nothing to do.\n");
    exit(0);
}

fwrite(STDOUT, sprintf("Found %d match(es) with pending bets.\n\n", count($matchIds)));
fwrite(STDOUT, str_pad('matchId', 26) . str_pad('effective', 12) . str_pad('bets', 6) . str_pad('refund$', 11) . "matchup\n");
fwrite(STDOUT, str_repeat('-', 100) . "\n");

$plan = ['settle' => 0, 'void' => 0, 'skip' => 0];
$refundTotal = 0.0;

foreach (array_keys($matchIds) as $mid) {
    $match = $db->findOne('matches', ['id' => SqlRepository::id($mid)]);
    if ($match === null) {
        $plan['skip']++;
        fwrite(STDOUT, sprintf("%-26s%-12s%-6s%-11s%s\n", $mid, 'NO ROW', count($selectionsByMatch[$mid] ?? []), '-', '(match deleted)'));
        continue;
    }
    $annotated = SportsMatchStatus::annotate($match);
    $eff = (string) ($annotated['status'] ?? '');
    $bets = array_unique($selectionsByMatch[$mid] ?? []);
    $refund = 0.0;
    foreach ($bets as $bid) {
        $b = $db->findOne('bets', ['id' => SqlRepository::id($bid)], ['projection' => ['riskAmount' => 1, 'amount' => 1]]);
        if ($b !== null) {
            $r = $b['riskAmount'] ?? $b['amount'] ?? 0;
            $refund += (float) $r;
        }
    }
    $home = (string) ($match['homeTeam'] ?? '?');
    $away = (string) ($match['awayTeam'] ?? '?');
    $matchup = $home . ' vs ' . $away;

    if (in_array($eff, ['finished', 'canceled'], true)) {
        $plan['settle']++;
        $refundTotal += 0;
    } elseif ($eff === 'expired') {
        $plan['void']++;
        $refundTotal += $refund;
    } else {
        $plan['skip']++;
    }
    fwrite(STDOUT, sprintf("%-26s%-12s%-6d$%-10.2f%s\n", $mid, $eff, count($bets), $refund, $matchup));
}

fwrite(STDOUT, "\n");
fwrite(STDOUT, sprintf("Plan: %d will settle (graded), %d will void (refund), %d skip.\n", $plan['settle'], $plan['void'], $plan['skip']));
fwrite(STDOUT, sprintf("Estimated refund (void path): \$%.2f\n\n", $refundTotal));

if (!$apply) {
    fwrite(STDOUT, "DRY RUN. Re-run with --apply to execute.\n");
    exit(0);
}

fwrite(STDOUT, "Applying...\n");
$summary = BetSettlementService::settlePendingMatches($db, $limit, 'backfill-script');
fwrite(STDOUT, "Sweep result:\n");
fwrite(STDOUT, json_encode($summary, JSON_PRETTY_PRINT) . "\n");
