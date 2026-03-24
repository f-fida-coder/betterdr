<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/MongoRepository.php';

/**
 * Purge removed in-house casino game data.
 *
 * Default mode is dry-run. Use --execute to actually delete records.
 *
 * Usage:
 *   php php-backend/scripts/purge-removed-casino-games.php
 *   php php-backend/scripts/purge-removed-casino-games.php --execute
 */

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

$execute = in_array('--execute', $argv, true);

/** @return int */
function deleteManyByFilter(MongoRepository $repo, string $collection, array $filter, int $batchSize = 500): int
{
    $deleted = 0;

    while (true) {
        $rows = $repo->findMany($collection, $filter, [
            'limit' => $batchSize,
            'projection' => ['_id' => 1],
        ]);

        if (!is_array($rows) || count($rows) === 0) {
            break;
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $id = (string) ($row['_id'] ?? '');
            if ($id === '') {
                continue;
            }
            $deleted += $repo->deleteOne($collection, ['_id' => MongoRepository::id($id)]);
        }

        if (count($rows) < $batchSize) {
            break;
        }
    }

    return $deleted;
}

try {
    $repo = new MongoRepository(
        'mysql-native',
        (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'))
    );

    $removedGames = ['roulette', 'stud-poker'];
    $removedSourceTypes = ['casino_roulette', 'casino_stud_poker'];

    $betsFilter = ['game' => ['$in' => $removedGames]];
    $auditFilter = ['game' => ['$in' => $removedGames]];
    $gameCatalogFilter = ['slug' => ['$in' => $removedGames]];
    $transactionsFilter = [
        '$or' => [
            ['sourceType' => ['$in' => $removedSourceTypes]],
            ['reason' => ['$regex' => '^CASINO_(ROULETTE|STUD_POKER)_', '$options' => 'i']],
        ],
    ];

    $before = [
        'casino_bets' => $repo->countDocuments('casino_bets', $betsFilter),
        'casino_round_audit' => $repo->countDocuments('casino_round_audit', $auditFilter),
        'transactions' => $repo->countDocuments('transactions', $transactionsFilter),
        'casinogames' => $repo->countDocuments('casinogames', $gameCatalogFilter),
    ];

    $deleted = [
        'casino_bets' => 0,
        'casino_round_audit' => 0,
        'transactions' => 0,
        'casinogames' => 0,
    ];

    if ($execute) {
        $deleted['casino_bets'] = deleteManyByFilter($repo, 'casino_bets', $betsFilter);
        $deleted['casino_round_audit'] = deleteManyByFilter($repo, 'casino_round_audit', $auditFilter);
        $deleted['transactions'] = deleteManyByFilter($repo, 'transactions', $transactionsFilter);
        $deleted['casinogames'] = deleteManyByFilter($repo, 'casinogames', $gameCatalogFilter);
    }

    $after = [
        'casino_bets' => $repo->countDocuments('casino_bets', $betsFilter),
        'casino_round_audit' => $repo->countDocuments('casino_round_audit', $auditFilter),
        'transactions' => $repo->countDocuments('transactions', $transactionsFilter),
        'casinogames' => $repo->countDocuments('casinogames', $gameCatalogFilter),
    ];

    $result = [
        'mode' => $execute ? 'execute' : 'dry-run',
        'filters' => [
            'games' => $removedGames,
            'transactionSourceTypes' => $removedSourceTypes,
        ],
        'before' => $before,
        'deleted' => $deleted,
        'after' => $after,
    ];

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, 'Purge failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

