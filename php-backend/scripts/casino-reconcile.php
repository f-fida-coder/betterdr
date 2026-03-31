<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/MongoRepository.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

$opts = getopt('', ['from::', 'to::', 'user-id::', 'username::', 'limit::', 'include-legacy']);
$fromRaw = trim((string) ($opts['from'] ?? ''));
$toRaw = trim((string) ($opts['to'] ?? ''));
$userIdFilter = trim((string) ($opts['user-id'] ?? ''));
$usernameFilter = trim((string) ($opts['username'] ?? ''));
$limit = max(1, (int) ($opts['limit'] ?? 5000));
$limit = min($limit, 50000);
$includeLegacy = array_key_exists('include-legacy', $opts);

$from = null;
$to = null;
if ($fromRaw !== '') {
    $parsed = date_create_immutable($fromRaw);
    if ($parsed === false) {
        fwrite(STDERR, "Invalid --from value\n");
        exit(2);
    }
    $from = $parsed->format(DATE_ATOM);
}
if ($toRaw !== '') {
    $parsed = date_create_immutable($toRaw);
    if ($parsed === false) {
        fwrite(STDERR, "Invalid --to value\n");
        exit(2);
    }
    $to = $parsed->format(DATE_ATOM);
}

$repo = new MongoRepository('mysql-native', (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting')));

$query = ['game' => 'baccarat'];
if ($userIdFilter !== '') {
    $query['userId'] = $userIdFilter;
}
if ($usernameFilter !== '') {
    $query['username'] = $usernameFilter;
}
if ($from !== null) {
    $query['createdAt']['$gte'] = $from;
}
if ($to !== null) {
    $query['createdAt']['$lte'] = $to;
}

$rows = $repo->findMany('casino_bets', $query, [
    'sort' => ['createdAt' => -1],
    'limit' => $limit,
]);

$summary = [
    'checkedRounds' => count($rows),
    'legacySkipped' => 0,
    'roundMismatches' => 0,
    'userMismatches' => 0,
];
$issues = [];
$byUserBetNet = [];
$byUserLedgerNet = [];

foreach ($rows as $row) {
    $roundId = (string) ($row['roundId'] ?? $row['id'] ?? '');
    $requestId = (string) ($row['requestId'] ?? '');
    if (!$includeLegacy && $requestId === '') {
        $summary['legacySkipped']++;
        continue;
    }
    if ($roundId === '') {
        $summary['roundMismatches']++;
        $issues[] = ['type' => 'round', 'roundId' => '', 'message' => 'Missing roundId'];
        continue;
    }

    $userId = (string) ($row['userId'] ?? '');
    $username = (string) ($row['username'] ?? '');
    $totalWager = (float) ($row['totalWager'] ?? 0);
    $totalReturn = (float) ($row['totalReturn'] ?? 0);
    $netResult = (float) ($row['netResult'] ?? 0);
    $balanceBefore = (float) ($row['balanceBefore'] ?? 0);
    $balanceAfter = (float) ($row['balanceAfter'] ?? 0);

    $entries = $repo->findMany('transactions', ['entryGroupId' => $roundId], ['sort' => ['createdAt' => 1], 'limit' => 10]);
    $debit = 0.0;
    $credit = 0.0;
    $debitBefore = null;
    $creditAfter = null;
    foreach ($entries as $entry) {
        $amt = (float) ($entry['amount'] ?? 0);
        $side = strtoupper((string) ($entry['entrySide'] ?? ''));
        if ($side === 'DEBIT') {
            $debit += $amt;
            if ($debitBefore === null) {
                $debitBefore = (float) ($entry['balanceBefore'] ?? 0);
            }
        } elseif ($side === 'CREDIT') {
            $credit += $amt;
            $creditAfter = (float) ($entry['balanceAfter'] ?? 0);
        }
    }
    $ledgerNet = round($credit - $debit, 2);

    $roundErrors = [];
    if (count($entries) < 2) {
        $roundErrors[] = 'Expected at least 2 ledger entries';
    }
    if (abs(round($debit, 2) - round($totalWager, 2)) > 0.001) {
        $roundErrors[] = 'Debit sum mismatch (ledger=' . round($debit, 2) . ', bet=' . round($totalWager, 2) . ')';
    }
    if (abs(round($credit, 2) - round($totalReturn, 2)) > 0.001) {
        $roundErrors[] = 'Credit sum mismatch (ledger=' . round($credit, 2) . ', bet=' . round($totalReturn, 2) . ')';
    }
    if (abs($ledgerNet - round($netResult, 2)) > 0.001) {
        $roundErrors[] = 'Net mismatch (ledger=' . $ledgerNet . ', bet=' . round($netResult, 2) . ')';
    }
    if ($debitBefore !== null && abs(round((float) $debitBefore, 2) - round($balanceBefore, 2)) > 0.001) {
        $roundErrors[] = 'balanceBefore mismatch (ledger=' . round((float) $debitBefore, 2) . ', bet=' . round($balanceBefore, 2) . ')';
    }
    if ($creditAfter !== null && abs(round((float) $creditAfter, 2) - round($balanceAfter, 2)) > 0.001) {
        $roundErrors[] = 'balanceAfter mismatch (ledger=' . round((float) $creditAfter, 2) . ', bet=' . round($balanceAfter, 2) . ')';
    }

    if ($roundErrors !== []) {
        $summary['roundMismatches']++;
        $issues[] = [
            'type' => 'round',
            'roundId' => $roundId,
            'userId' => $userId,
            'username' => $username,
            'errors' => $roundErrors,
        ];
    }

    $byUserBetNet[$userId] = ($byUserBetNet[$userId] ?? 0.0) + round($netResult, 2);
    $byUserLedgerNet[$userId] = ($byUserLedgerNet[$userId] ?? 0.0) + $ledgerNet;
}

$userDiffs = [];
foreach ($byUserBetNet as $userId => $betNet) {
    $ledgerNet = round($byUserLedgerNet[$userId] ?? 0.0, 2);
    $betNet = round($betNet, 2);
    if (abs($betNet - $ledgerNet) > 0.001) {
        $summary['userMismatches']++;
        $userDiffs[] = [
            'userId' => $userId,
            'betNet' => $betNet,
            'ledgerNet' => $ledgerNet,
            'difference' => round($betNet - $ledgerNet, 2),
        ];
    }
}

echo json_encode([
    'window' => ['from' => $from, 'to' => $to],
    'filters' => ['userId' => $userIdFilter !== '' ? $userIdFilter : null, 'username' => $usernameFilter !== '' ? $usernameFilter : null],
    'summary' => $summary,
    'userDiffs' => $userDiffs,
    'issues' => $issues,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;

exit(($summary['roundMismatches'] > 0 || $summary['userMismatches'] > 0) ? 1 : 0);
