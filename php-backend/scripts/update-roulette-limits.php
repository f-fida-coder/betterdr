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

    $now = MongoRepository::nowUtc();
    $result = $repo->updateOne('casinogames', ['slug' => 'roulette'], [
        'minBet'    => 1.0,
        'maxBet'    => 5000.0,
        'rtp'       => null,
        'updatedAt' => $now,
    ]);

    echo "Roulette game limits updated: minBet=\$1, maxBet=\$5000\n";
    echo "Matched/Modified: " . json_encode($result) . "\n";
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
