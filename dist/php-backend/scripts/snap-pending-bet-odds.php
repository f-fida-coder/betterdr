<?php

declare(strict_types=1);

/**
 * One-time backfill: snap stored decimal odds on every PENDING sportsbook
 * bet to the same clean American line that the new write-time helper
 * produces, then re-derive Risk from the player's *original* desired Win
 * (= old potentialPayout − old amount) so the ticket reads exactly what
 * fresh placement math would produce today.
 *
 * Money flow per bet:
 *  - desiredWin      = oldPayout − oldRisk  (the upside the player asked for)
 *  - newCombined     = product of snapped leg odds
 *  - newRisk         = round( desiredWin / (newCombined − 1) )
 *  - newPayout       = round( newRisk × newCombined )    (× 2 for reverse)
 *  - refundDelta     = oldRisk − newRisk
 *
 * Refund-only safety rule: if newRisk > oldRisk we'd have to *charge* the
 * player retroactively (worse UX than the original drift), so the script
 * skips those bets and prints a SKIP_INCREASE warning. Pre-snap odds
 * already favoured the house in this case; leaving them is a no-op.
 *
 * For each bet that needs a refund we, in one transaction:
 *  1. snap each leg's `odds` row
 *  2. update bet: amount / unitStake / riskAmount / potentialPayout / combinedOdds
 *  3. lock the user, decrement `pendingBalance` by the refund delta
 *     (no `balance` change — we never deducted the extra in real terms;
 *     it was sitting in pendingBalance as a reservation)
 *  4. insert a `BET_RISK_SNAP_REFUND` adjustment transaction so audits
 *     can see the move
 *
 * Skipped:
 *  - any bet whose status is not `pending`  (settlement already happened)
 *  - teaser bets  (payout is a multiplier table, odds-independent)
 *  - bets where snap doesn't change odds AND payout already matches
 *  - bets whose snapped Risk would *increase* (refund-only rule above)
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

/**
 * Backfill-only snap: aggressively pull each leg's stored decimal to the
 * clean decimal of its *displayed* American integer (PHP's round() with
 * half-up matches the JS Math.round() the betslip used at placement
 * time). Existing pending bets were placed when the UI rounded American
 * odds to integers for display, so the player accepted "-120" or "+150"
 * on screen — honoring that integer is the correct retroactive fix even
 * if the upstream stored value was technically a half-point. The
 * write-time helper SportsbookBetSupport::snapDecimalOdds is stricter
 * (0.001 tolerance) and stays intact so future placements still preserve
 * genuine half-points.
 */
$snapToDisplayedAmerican = static function (float $decimal): float {
    if (!is_finite($decimal) || $decimal <= 1.0) {
        return $decimal;
    }
    $american = $decimal >= 2.0
        ? ($decimal - 1.0) * 100.0
        : -100.0 / ($decimal - 1.0);
    if (!is_finite($american) || $american === 0.0) {
        return $decimal;
    }
    $rounded = (float) round($american);
    if ($rounded === 0.0) {
        return $decimal;
    }
    return $rounded > 0
        ? 1.0 + ($rounded / 100.0)
        : 1.0 + (100.0 / abs($rounded));
};

$filter = ['status' => 'pending'];
if ($betIdFilter !== '') {
    $filter['id'] = SqlRepository::id($betIdFilter);
}

$bets = $db->findMany('bets', $filter, ['limit' => $limit, 'sort' => ['createdAt' => 1]]);

$summary = [
    'scanned' => 0,
    'changed' => 0,
    'refunded_total' => 0.0,
    'skipped_no_change' => 0,
    'skipped_teaser' => 0,
    'skipped_no_legs' => 0,
    'skipped_increase' => 0,
    'errors' => 0,
];

$money = static fn(float $v): string => '$' . number_format($v, 2, '.', '');
$now = static fn(): string => SqlRepository::nowUtc();

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

    $oldRisk = (float) ($bet['amount'] ?? 0);
    $oldPayout = (float) ($bet['potentialPayout'] ?? 0);
    $oldCombined = (float) ($bet['combinedOdds'] ?? 0);
    $userId = (string) ($bet['userId'] ?? '');

    if ($oldRisk <= 0 || $userId === '') {
        $summary['skipped_no_legs']++;
        continue;
    }

    // Snap each leg to the clean decimal of its *displayed* American
    // integer. Aggressive on purpose for the backfill — see the comment
    // on $snapToDisplayedAmerican above.
    $changedLegs = [];
    $snappedOdds = [];
    foreach ($selections as $leg) {
        $rawOdds = (float) ($leg['odds'] ?? 0);
        $snapped = $snapToDisplayedAmerican($rawOdds);
        $snappedOdds[] = $snapped;
        if (abs($snapped - $rawOdds) > 0.0000001) {
            $changedLegs[] = ['legId' => (string) ($leg['id'] ?? ''), 'before' => $rawOdds, 'after' => $snapped];
        }
    }

    // Snapped combined decimal — for a straight bet this is just the
    // single leg, for parlay/if_bet it's the product. Reverse uses the
    // same product but doubles the payout side.
    $combinedDecimal = 1.0;
    foreach ($snappedOdds as $o) {
        $combinedDecimal *= $o;
    }
    $reverseMultiplier = $type === 'reverse' ? 2.0 : 1.0;

    // Original desired Win = the *upside* the player saw at placement.
    // For straight/parlay/if_bet: oldPayout − oldRisk.
    // For reverse: oldPayout / 2 − oldRisk (since reverse pays 2× the
    // single-side return). Falls back to a recompute from oldCombined
    // if the stored payout looks bogus (e.g. legacy rows missing it).
    $desiredWin = $type === 'reverse'
        ? max(0.0, ($oldPayout / 2.0) - ($oldRisk / 2.0))
        : max(0.0, $oldPayout - $oldRisk);

    if ($desiredWin <= 0 || ($combinedDecimal - 1.0) <= 0) {
        $summary['skipped_no_change']++;
        continue;
    }

    // Re-derive Risk so Win matches what the player asked for at the new
    // (clean) odds. round() to whole dollars matches the post-decimals
    // policy from earlier commits.
    $newRisk = $type === 'reverse'
        ? round(($desiredWin / ($combinedDecimal - 1.0)) * 2.0)  // reverse stakes both sides
        : round($desiredWin / ($combinedDecimal - 1.0));
    $newPayout = round($newRisk * $combinedDecimal * $reverseMultiplier);
    $newCombinedImplied = $newRisk > 0 ? round($newPayout / $newRisk, 4) : $oldCombined;

    $refundDelta = $oldRisk - $newRisk;

    if ($refundDelta < -0.005) {
        // Snapping would *increase* risk. Refund-only safety: skip
        // rather than retroactively charge the player.
        $summary['skipped_increase']++;
        fwrite(STDOUT, sprintf(
            "SKIP_INCREASE bet %s [%s] would charge extra %s — left untouched\n",
            $betId,
            $type,
            $money(abs($refundDelta))
        ));
        continue;
    }

    if (abs($refundDelta) < 0.005 && $changedLegs === [] && abs($newPayout - $oldPayout) < 0.005) {
        $summary['skipped_no_change']++;
        continue;
    }

    $summary['changed']++;
    $summary['refunded_total'] += max(0.0, $refundDelta);
    fwrite(STDOUT, sprintf(
        "bet %s [%s] risk %s → %s  payout %s → %s  refund %s\n",
        $betId,
        $type,
        $money($oldRisk),
        $money($newRisk),
        $money($oldPayout),
        $money($newPayout),
        $money(max(0.0, $refundDelta))
    ));
    foreach ($changedLegs as $c) {
        fwrite(STDOUT, sprintf("    leg %s odds %.6f → %.6f\n", $c['legId'], $c['before'], $c['after']));
    }

    if ($dryRun) {
        continue;
    }

    try {
        $db->beginTransaction();

        // Snap odds on each changed leg row.
        foreach ($changedLegs as $c) {
            if ($c['legId'] === '') {
                continue;
            }
            $db->updateOne('betselections', ['id' => SqlRepository::id($c['legId'])], [
                'odds' => $c['after'],
                'updatedAt' => $now(),
            ]);
        }

        // Update the bet's monetary fields. unitStake on a reverse bet
        // is half of total risk (matches SportsbookBetSupport::unitStake).
        $newUnitStake = $type === 'reverse' ? round($newRisk / 2.0) : $newRisk;
        $db->updateOne('bets', ['id' => SqlRepository::id($betId)], [
            'amount' => $newRisk,
            'riskAmount' => $newRisk,
            'unitStake' => $newUnitStake,
            'potentialPayout' => $newPayout,
            'combinedOdds' => $newCombinedImplied,
            'odds' => count($snappedOdds) === 1 ? $snappedOdds[0] : $newCombinedImplied,
            'updatedAt' => $now(),
        ]);

        // Refund the delta back to the player by lowering their
        // pendingBalance reservation. Real `balance` doesn't move —
        // the original BET_PLACED transaction already reserved $oldRisk
        // there; we're returning the over-reserved cents.
        if ($refundDelta > 0.005) {
            $userDoc = $db->findOneForUpdate('users', ['id' => SqlRepository::id($userId)]);
            if (!is_array($userDoc)) {
                throw new RuntimeException('user not found for bet ' . $betId);
            }
            $oldPending = is_numeric($userDoc['pendingBalance'] ?? null) ? (float) $userDoc['pendingBalance'] : 0.0;
            $newPending = max(0.0, round($oldPending - $refundDelta));

            $db->updateOne('users', ['id' => SqlRepository::id($userId)], [
                'pendingBalance' => $newPending,
                'updatedAt' => $now(),
            ]);

            $balance = is_numeric($userDoc['balance'] ?? null) ? (float) $userDoc['balance'] : 0.0;
            $db->insertOne('transactions', [
                'userId' => SqlRepository::id($userId),
                'amount' => $refundDelta,
                'type' => 'adjustment',
                'status' => 'completed',
                'balanceBefore' => $balance,
                'balanceAfter' => $balance,
                'referenceType' => 'Bet',
                'referenceId' => SqlRepository::id($betId),
                'reason' => 'BET_RISK_SNAP_REFUND',
                'description' => sprintf(
                    'Risk corrected from %s to %s after odds snap',
                    $money($oldRisk),
                    $money($newRisk)
                ),
                'metadata' => [
                    'oldRisk' => $oldRisk,
                    'newRisk' => $newRisk,
                    'oldPayout' => $oldPayout,
                    'newPayout' => $newPayout,
                    'refundDelta' => $refundDelta,
                    'pendingBalanceBefore' => $oldPending,
                    'pendingBalanceAfter' => $newPending,
                ],
                'createdAt' => $now(),
                'updatedAt' => $now(),
            ]);
        }

        $db->commit();
    } catch (Throwable $e) {
        $db->rollback();
        $summary['errors']++;
        fwrite(STDERR, sprintf("ERROR bet %s: %s\n", $betId, $e->getMessage()));
    }
}

fwrite(STDOUT, "\n");
fwrite(STDOUT, sprintf(
    "scanned=%d changed=%d refunded_total=%s skipped_no_change=%d skipped_increase=%d skipped_teaser=%d skipped_no_legs=%d errors=%d%s\n",
    $summary['scanned'],
    $summary['changed'],
    $money($summary['refunded_total']),
    $summary['skipped_no_change'],
    $summary['skipped_increase'],
    $summary['skipped_teaser'],
    $summary['skipped_no_legs'],
    $summary['errors'],
    $dryRun ? '  (DRY RUN — no writes)' : ''
));
