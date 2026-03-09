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

    $results = $repo->findMany('casinogames', ['name' => ['$regex' => '(?i)stud poker']]);
    foreach ($results as $res) {
        echo "Found game: " . $res['name'] . " with slug: " . $res['slug'] . "\n";
    }

} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
