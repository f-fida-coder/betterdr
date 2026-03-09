<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/MongoRepository.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

try {
    $repo = new MongoRepository(
        (string) Env::get('MONGO_URI', ''),
        (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'))
    );

    $slug = 'roulette';
    $existing = $repo->findOne('casinogames', ['slug' => $slug]);

    if ($existing !== null) {
        echo "Roulette game already exists in the database.\n";
    } else {
        $now = MongoRepository::nowUtc();
        $result = $repo->insertOne('casinogames', [
            'provider' => 'internal',
            'externalGameId' => null,
            'name' => 'Roulette',
            'slug' => $slug,
            'category' => 'table_games',
            'icon' => 'fa-solid fa-circle-notch',
            'themeColor' => '#b91c1c',
            'imageUrl' => '/games/roulette/assets/poster.jpg',
            'launchUrl' => '',
            'minBet' => 1,
            'maxBet' => 100,
            'rtp' => null,
            'volatility' => null,
            'tags' => ['table games', 'roulette', 'in-house', 'live casino'],
            'isFeatured' => true,
            'status' => 'active',
            'supportsDemo' => true,
            'sortOrder' => 4,
            'metadata' => new stdClass(),
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);
        echo "Inserted Roulette game with ID: " . $result . "\n";
    }
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
