<?php
/**
 * Migration: Rename `mongo_id` column to `id` across all tables.
 *
 * This script renames the legacy MongoDB primary key column (`mongo_id`)
 * to the standard `id` column in every application table.
 *
 * Usage:  php migrate-mongo-id-to-id.php
 *
 * Safe to run multiple times — skips tables already migrated.
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';

Env::load(__DIR__ . '/../..', __DIR__ . '/..');

$host = (string) Env::get('MYSQL_HOST', Env::get('DB_HOST', '127.0.0.1'));
$port = (int)   Env::get('MYSQL_PORT', Env::get('DB_PORT', '3306'));
$name = (string) Env::get('MYSQL_DB',   Env::get('DB_NAME', 'sports_betting'));
$user = (string) Env::get('MYSQL_USER', Env::get('DB_USER', 'root'));
$pass = (string) Env::get('MYSQL_PASSWORD', Env::get('DB_PASSWORD', ''));

$dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

echo "Connected to {$name}@{$host}:{$port}\n\n";

// Get all tables in the database
$tables = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()")->fetchAll();

$migrated = 0;
$skipped  = 0;
$errors   = 0;

foreach ($tables as $row) {
    $table = $row['table_name'] ?? $row['TABLE_NAME'];

    // Check if this table has a `mongo_id` column
    $stmt = $pdo->prepare("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = :table AND column_name = 'mongo_id' LIMIT 1");
    $stmt->execute([':table' => $table]);
    $hasMongoId = (bool) $stmt->fetchColumn();

    if (!$hasMongoId) {
        // Check if already has `id` as PK (already migrated)
        $stmt = $pdo->prepare("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = :table AND column_name = 'id' LIMIT 1");
        $stmt->execute([':table' => $table]);
        $hasId = (bool) $stmt->fetchColumn();

        if ($hasId) {
            echo "  SKIP  {$table} — already has `id` column\n";
        } else {
            echo "  SKIP  {$table} — no `mongo_id` column found\n";
        }
        $skipped++;
        continue;
    }

    try {
        // Rename mongo_id → id
        $pdo->exec("ALTER TABLE `{$table}` CHANGE COLUMN `mongo_id` `id` VARCHAR(64) NOT NULL");
        echo "  OK    {$table} — renamed `mongo_id` → `id`\n";
        $migrated++;
    } catch (PDOException $e) {
        echo "  ERROR {$table} — {$e->getMessage()}\n";
        $errors++;
    }
}

echo "\nDone. Migrated: {$migrated}, Skipped: {$skipped}, Errors: {$errors}\n";
