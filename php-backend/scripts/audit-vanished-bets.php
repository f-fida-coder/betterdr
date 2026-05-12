<?php
// Diagnostic: find bets exhibiting the "vanished bet" pattern the user
// reported — a bet that's invisible to BOTH the pending tab AND the
// weekly-figures view, while the user's pendingBalance hasn't been
// reconciled to match.
//
// Two cross-checks per user:
//   A) For every bet whose status is NOT in (pending, won, lost, void,
//      push), report it — those are statuses that no view exposes.
//   B) For every user, sum the cash portion of status='pending' bets
//      and compare to users.pendingBalance. Drift = settlement wrote
//      somewhere but pendingBalance is stale (or vice-versa).
//
// Run: php php-backend/scripts/audit-vanished-bets.php
//
// Output is read-only — no writes. Safe to run on prod via SSH.
declare(strict_types=1);

require_once __DIR__ . '/../src/Autoloader.php';
Autoloader::register();
require_once __DIR__ . '/../src/Env.php';
$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);
require_once __DIR__ . '/../src/SqlRepository.php';

$db = new SqlRepository('mysql-native', (string) Env::get('MYSQL_DB', 'betterdr_local'));

// ── Check A: bets with non-standard status ─────────────────────────────────
echo "\n=== Check A: bets with non-standard status ===\n";
echo "Statuses considered valid: pending, won, lost, void, push.\n";
echo "Any other status hides the bet from BOTH the pending tab AND weekly figures.\n\n";

$allBets = $db->findMany('bets', [], [
    'projection' => ['id' => 1, 'userId' => 1, 'status' => 1, 'selection' => 1, 'createdAt' => 1, 'settledAt' => 1, 'riskAmount' => 1, 'amount' => 1, 'matchId' => 1],
    'limit' => 5000,
]);

$validStatuses = ['pending', 'won', 'lost', 'void', 'push'];
$bad = [];
foreach ($allBets as $b) {
    $s = strtolower((string) ($b['status'] ?? ''));
    if (!in_array($s, $validStatuses, true)) {
        $bad[] = $b;
    }
}
if (count($bad) === 0) {
    echo "  OK — every bet has a valid status.\n";
} else {
    echo "  FOUND " . count($bad) . " bets with non-standard status:\n";
    foreach (array_slice($bad, 0, 20) as $b) {
        printf("    id=%s userId=%s status='%s' selection='%s' created=%s settled=%s\n",
            substr((string) $b['id'], 0, 8),
            substr((string) ($b['userId'] ?? ''), 0, 8),
            (string) ($b['status'] ?? ''),
            (string) ($b['selection'] ?? ''),
            (string) ($b['createdAt'] ?? ''),
            (string) ($b['settledAt'] ?? 'null')
        );
    }
}

// ── Check B: pendingBalance vs sum-of-pending-bets per user ────────────────
echo "\n=== Check B: pendingBalance vs sum-of-pending-bets per user ===\n";
echo "Drift means settlement updated bet.status but never decremented pendingBalance,\n";
echo "OR pendingBalance is double-counted.\n\n";

$users = $db->findMany('users', [], [
    'projection' => ['id' => 1, 'username' => 1, 'pendingBalance' => 1, 'balance' => 1],
    'limit' => 5000,
]);

$drifts = [];
foreach ($users as $u) {
    $uid = (string) ($u['id'] ?? '');
    if ($uid === '') continue;
    $pendingBets = $db->findMany('bets', [
        'userId' => SqlRepository::id($uid),
        'status' => 'pending',
    ], ['projection' => ['riskAmount' => 1, 'amount' => 1, 'freeplayAmountUsed' => 1, 'isFreeplay' => 1]]);

    $expected = 0.0;
    foreach ($pendingBets as $b) {
        $risk = (float) ($b['riskAmount'] ?? $b['amount'] ?? 0);
        $fpUsed = (float) ($b['freeplayAmountUsed'] ?? (!empty($b['isFreeplay']) ? $risk : 0));
        $real = max(0.0, $risk - $fpUsed);
        $expected += $real;
    }
    $expected = round($expected, 2);
    $stored = round((float) ($u['pendingBalance'] ?? 0), 2);
    $delta = $stored - $expected;
    if (abs($delta) >= 1.0) {
        $drifts[] = [
            'username' => (string) ($u['username'] ?? '?'),
            'pendingBalance' => $stored,
            'expectedFromPending' => $expected,
            'delta' => round($delta, 2),
            'pendingBetCount' => count($pendingBets),
        ];
    }
}

if (count($drifts) === 0) {
    echo "  OK — every user's pendingBalance matches their pending bets.\n";
} else {
    echo "  FOUND " . count($drifts) . " users with pendingBalance drift:\n";
    foreach (array_slice($drifts, 0, 20) as $d) {
        printf("    %-20s  stored=%-10s  expected=%-10s  delta=%-10s  pendingBetCount=%d\n",
            $d['username'],
            '$' . number_format($d['pendingBalance'], 2),
            '$' . number_format($d['expectedFromPending'], 2),
            ($d['delta'] >= 0 ? '+' : '') . '$' . number_format($d['delta'], 2),
            $d['pendingBetCount']
        );
    }
    echo "\n  POSITIVE delta = pendingBalance LOCKED money that isn't matched by any pending bet.\n";
    echo "  NEGATIVE delta = a pending bet exists but pendingBalance wasn't credited for it.\n";
}

// ── Check C: settled bets in last 24h that have NO matching transaction ────
echo "\n=== Check C: settled bets in last 24h missing a transaction ledger entry ===\n";
echo "A bet flipped to won/lost/void MUST have a matching transactions row.\n";
echo "Missing one means the user balance wasn't moved when status flipped.\n\n";

$yesterday = (new DateTimeImmutable('-1 day', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');
$recentSettled = $db->findMany('bets', [
    'status' => ['$in' => ['won', 'lost', 'void']],
    'settledAt' => ['$gte' => $yesterday],
], ['projection' => ['id' => 1, 'userId' => 1, 'status' => 1, 'settledAt' => 1, 'selection' => 1, 'riskAmount' => 1], 'limit' => 200]);

$orphans = [];
foreach ($recentSettled as $bet) {
    $betId = (string) ($bet['id'] ?? '');
    if ($betId === '') continue;
    // Look for any transaction tied to this bet via referenceId
    $txs = $db->findMany('transactions', [
        'referenceId' => SqlRepository::id($betId),
        'referenceType' => 'Bet',
    ], ['projection' => ['type' => 1, 'createdAt' => 1], 'limit' => 5]);
    // Settled bets should have at least one settlement transaction.
    // Look for one matching the bet's status.
    $expectedTypes = match (strtolower((string) ($bet['status'] ?? ''))) {
        'won' => ['bet_won', 'fp_bet_won'],
        'lost' => ['bet_lost', 'fp_bet_lost'],
        'void' => ['bet_void', 'fp_bet_void', 'bet_void_admin', 'fp_bet_void_admin'],
        default => [],
    };
    $hasMatchingTx = false;
    foreach ($txs as $tx) {
        if (in_array((string) ($tx['type'] ?? ''), $expectedTypes, true)) {
            $hasMatchingTx = true;
            break;
        }
    }
    if (!$hasMatchingTx) {
        $orphans[] = $bet;
    }
}

if (count($orphans) === 0) {
    echo "  OK — every recently-settled bet has a matching ledger entry.\n";
} else {
    echo "  FOUND " . count($orphans) . " orphan settled bets in last 24h:\n";
    foreach (array_slice($orphans, 0, 20) as $b) {
        printf("    id=%s userId=%s status=%-5s selection='%s' settled=%s risk=%s\n",
            substr((string) $b['id'], 0, 8),
            substr((string) ($b['userId'] ?? ''), 0, 8),
            (string) ($b['status'] ?? ''),
            (string) ($b['selection'] ?? ''),
            (string) ($b['settledAt'] ?? ''),
            '$' . number_format((float) ($b['riskAmount'] ?? 0), 2)
        );
    }
    echo "\n  Each of these flipped status without a corresponding wallet move.\n";
    echo "  This IS the 'vanished bet' pattern: invisible to pending tab AND weekly figures\n";
    echo "  while money stays locked (since pendingBalance was set at placement and never\n";
    echo "  decremented at the fake-settlement).\n";
}

echo "\n=== summary ===\n";
echo "Check A (invalid statuses):       " . (count($bad) === 0 ? 'CLEAN' : count($bad) . ' rows') . "\n";
echo "Check B (pendingBalance drift):   " . (count($drifts) === 0 ? 'CLEAN' : count($drifts) . ' users') . "\n";
echo "Check C (orphan settled bets):    " . (count($orphans) === 0 ? 'CLEAN' : count($orphans) . ' bets') . "\n";
echo "\n";
