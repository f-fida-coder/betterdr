<?php

declare(strict_types=1);

/**
 * One-time backfill: snap stored decimal odds on every PENDING sportsbook
 * bet to the same clean American line that the new write-time helper
 * produces, and recompute combinedOdds + potentialPayout from the snapped
 * values. Risk (`amount` / `unitStake` / `riskAmount`) is NEVER touched
 * — that figure is already reserved in the player's pendingBalance and
 * touching it would require ledger writes. Only the upside (Win) shifts,
 * by a few dollars per ticket at most.
 *
 * Skipped:
 *  - any bet whose status is not `pending`
 *  - teaser bets (payout = unitStake × multiplier, independent of odds)
 *  - bets with no measurable change after snapping (avoids needless writes)
 *
 * Usage:
 *   php php-backend/scripts/snap-pending-bet-odds.php --dry-run
 *   php php-backend/scripts/snap-pending-bet-odds.php           # apply
 *   php php-backend/scripts/snap-pending-bet-odds.php --bet-id=<id>
 */

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/Logger.php';
require_once __DIR__ . '/../src/SharedFileCache.php';
require_once __DIR__ . '/../src/ApiException.php';
require_once __DIR__ . '/../src/QueryCache.php';
require_once __DIR__ . '/../src/RequestDeduplicator.php';
require_once __DIR__ . '/../src/ConnectionPool.php';
require_once __DIR__ . '/../src/CircuitBreaker.php';
require_once __DIR__ . '/../src/SqlRepository.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

$opts = getopt('', ['dry-run', 'bet-id::', 'limit::']);
$dryRun = array_key_exists('dry-run', $opts);
$betIdFilter = trim((string) ($opts['bet-id'] ?? ''));
$limit = max(1, (int) ($opts['limit'] ?? 5000));
$limit = min($limit, 100000);

$dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'betterdr'));
$dbHost = (string) Env::get('MYSQL_HOST', Env::get('DB_HOST', 'localhost'));
fwrite(STDOUT, sprintf("Target: %s @ %s%s\n\n", $dbName, $dbHost, $dryRun ? '  (DRY RUN)' : '  (LIVE WRITES)'));
$db = new SqlRepository('mysql-native', $dbName);

$filter = ['status' => 'pending'];
if ($betIdFilter !== '') {
    $filter['id'] = SqlRepository::id($betIdFilter);
}

$bets = $db->findMany('bets', $filter, ['limit' => $limit, 'sort' => ['createdAt' => 1]]);

$summary = [
    'scanned' => 0,
    'changed' => 0,
    'skipped_no_change' => 0,
    'skipped_teaser' => 0,
    'skipped_no_legs' => 0,
    'errors' => 0,
];

$money = static fn(float $v): string => number_format($v, 2, '.', '');

foreach ($bets as $bet) {
    $summary['scanned']++;
    $betId = (string) ($bet['id'] ?? '');
    $type = strtolower((string) ($bet['type'] ?? 'straight'));
    $status = strtolower((string) ($bet['status'] ?? ''));

    if ($status !== 'pending') {
        continue;
    }
    if ($type === 'teaser') {
        $summary['skipped_teaser']++;
        continue;
    }

    $selections = $db->findMany('betselections', ['betId' => SqlRepository::id($betId)], ['sort' => ['selectionOrder' => 1]]);
    if ($selections === []) {
        $summary['skipped_no_legs']++;
        continue;
    }

    $unitStake = (float) ($bet['unitStake'] ?? 0);
    if ($unitStake <= 0) {
        $amount = (float) ($bet['amount'] ?? 0);
        $unitStake = $type === 'reverse' && $amount > 0 ? round($amount / 2.0) : $amount;
    }

    // Snap each leg; track which rows actually changed.
    $changedLegs = [];
    $snappedOdds = [];
    foreach ($selections as $leg) {
        $rawOdds = (float) ($leg['odds'] ?? 0);
        $snapped = SportsbookBetSupport::snapDecimalOdds($rawOdds);
        $snappedOdds[] = $snapped;
        if (abs($snapped - $rawOdds) > 0.0000001) {
            $changedLegs[] = ['legId' => (string) ($leg['id'] ?? ''), 'before' => $rawOdds, 'after' => $snapped];
        }
    }

    // Combined odds + potential payout from the snapped values. Mirrors
    // SportsbookBetSupport::calculatePotentialPayout exactly so the new
    // ticket totals match what a fresh placement would compute today.
    $newCombined = 1.0;
    foreach ($snappedOdds as $o) {
        $newCombined *= $o;
    }
    $oldPayout = (float) ($bet['potentialPayout'] ?? 0);
    $oldCombined = (float) ($bet['combinedOdds'] ?? 0);

    $newPayout = match ($type) {
        'straight' => round($unitStake * ($snappedOdds[0] ?? 0)),
        'parlay', 'if_bet' => round($unitStake * $newCombined),
        'reverse' => round($unitStake * $newCombined * 2.0),
        default => $oldPayout,
    };

    // combinedOdds is tracked as the *implied* odds = potentialPayout /
    // riskAmount, matching SportsbookBetSupport::combinedOdds(). We
    // recompute it the same way so display stays consistent.
    $riskAmount = (float) ($bet['amount'] ?? 0);
    $newCombinedImplied = $riskAmount > 0 ? round($newPayout / $riskAmount, 4) : $oldCombined;

    $payoutChanged = abs($newPayout - $oldPayout) > 0.005;
    $combinedChanged = abs($newCombinedImplied - $oldCombined) > 0.0005;
    if ($changedLegs === [] && !$payoutChanged && !$combinedChanged) {
        $summary['skipped_no_change']++;
        continue;
    }

    $summary['changed']++;
    fwrite(STDOUT, sprintf(
        "bet %s [%s] legs_changed=%d payout=%s→%s odds=%s→%s\n",
        $betId,
        $type,
        count($changedLegs),
        $money($oldPayout),
        $money($newPayout),
        $money($oldCombined),
        $money($newCombinedImplied)
    ));
    foreach ($changedLegs as $c) {
        fwrite(STDOUT, sprintf("    leg %s odds %.6f → %.6f\n", $c['legId'], $c['before'], $c['after']));
    }

    if ($dryRun) {
        continue;
    }

    try {
        $db->beginTransaction();
        foreach ($changedLegs as $c) {
            if ($c['legId'] === '') {
                continue;
            }
            $db->updateOne('betselections', ['id' => SqlRepository::id($c['legId'])], [
                'odds' => $c['after'],
                'updatedAt' => SqlRepository::nowUtc(),
            ]);
        }
        $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
            'potentialPayout' => $newPayout,
            'combinedOdds' => $newCombinedImplied,
            'odds' => count($snappedOdds) === 1 ? $snappedOdds[0] : $newCombinedImplied,
            'updatedAt' => SqlRepository::nowUtc(),
        ]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollback();
        $summary['errors']++;
        fwrite(STDERR, sprintf("ERROR bet %s: %s\n", $betId, $e->getMessage()));
    }
}

fwrite(STDOUT, "\n");
fwrite(STDOUT, sprintf("scanned=%d changed=%d skipped_no_change=%d skipped_teaser=%d skipped_no_legs=%d errors=%d%s\n",
    $summary['scanned'],
    $summary['changed'],
    $summary['skipped_no_change'],
    $summary['skipped_teaser'],
    $summary['skipped_no_legs'],
    $summary['errors'],
    $dryRun ? '  (DRY RUN — no writes)' : ''
));
