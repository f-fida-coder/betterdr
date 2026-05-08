<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/SqlRepository.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

try {
    $repo = new SqlRepository(
        'mysql-native',
        (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'))
    );

    $slug = 'stud-poker';
    $existing = $repo->findOne('casinogames', ['slug' => $slug]);

    if ($existing !== null) {
        echo "Stud Poker game already exists in the database.\n";
    } else {
        $now = SqlRepository::nowUtc();
        $result = $repo->insertOne('casinogames', [
            'provider' => 'internal',
            'externalGameId' => null,
            'name' => 'Stud Poker',
            'slug' => $slug,
            'category' => 'table_games',
            'icon' => 'fa-solid fa-cards',
            'themeColor' => '#0f5db3',
            'imageUrl' => '/games/stud_poker/assets/poster.jpg',
            'launchUrl' => '',
            'minBet' => 1,
            'maxBet' => 100,
            'rtp' => null,
            'volatility' => null,
            'tags' => ['table games', 'poker', 'in-house', 'live casino'],
            'isFeatured' => true,
            'status' => 'active',
            'supportsDemo' => true,
            'sortOrder' => 3,
            'metadata' => new stdClass(),
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);
        echo "Inserted Stud Poker game with ID: " . $result . "\n";
    }
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
