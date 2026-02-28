<?php declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/Http.php';
require_once __DIR__ . '/../src/IpUtils.php';
require_once __DIR__ . '/../src/MongoRepository.php';

// Load environment variables
$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

// Connect to database
$dbName = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
$repo = new MongoRepository('mysql-native', $dbName);

echo "Starting password migration...\n\n";

// Define collections to migrate
$collections = ['users', 'agents', 'admins'];
$totalMigrated = 0;

foreach ($collections as $collection) {
    echo "Processing collection: {$collection}\n";
    
    $records = $repo->find($collection, []);
    $migratedCount = 0;
    
    foreach ($records as $record) {
        if (!isset($record['password']) || empty($record['password'])) {
            continue;
        }
        
        $password = $record['password'];
        
        // Check if password is already hashed (bcrypt starts with $2)
        if (strpos($password, '$2') === 0) {
            // Already hashed, skip
            continue;
        }
        
        // Hash the plaintext password
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        
        // Update the record
        $repo->update($collection, $record['_id'], [
            'password' => $hashedPassword
        ]);
        
        $migratedCount++;
    }
    
    echo "  Migrated {$migratedCount} records\n";
    $totalMigrated += $migratedCount;
}

echo "\nMigration complete!\n";
echo "Total records migrated: {$totalMigrated}\n";
