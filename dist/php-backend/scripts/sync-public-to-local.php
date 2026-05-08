<?php

declare(strict_types=1);

/**
 * Sync public/production MySQL DB → local MySQL DB.
 *
 * Usage:  php scripts/sync-public-to-local.php
 *
 * Reads from remote DB (148.222.53.30) and writes into local DB (betterdr_local).
 * Drops and recreates each local table, so local data is fully replaced.
 * Handles generated/virtual columns by excluding them from INSERT.
 */

require_once __DIR__ . '/../src/Env.php';

Env::load(dirname(__DIR__, 2), dirname(__DIR__));

// ── Remote (public) DB credentials ──────────────────────────
$remoteHost = '148.222.53.30';
$remotePort = 3306;
$remoteDb   = 'u487877829_bettor_bets_24';
$remoteUser = 'u487877829_bettor_bets';
$remotePass = 'Bettor.ok12';

// ── Local DB credentials (from .env) ────────────────────────
$localHost = Env::get('MYSQL_HOST', 'localhost');
$localPort = (int) Env::get('MYSQL_PORT', '3306');
$localDb   = Env::get('MYSQL_DB', 'betterdr_local');
$localUser = Env::get('MYSQL_USER', 'root');
$localPass = Env::get('MYSQL_PASSWORD', '');

$pdoOptions = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    1002 => "SET NAMES utf8mb4", // MYSQL_ATTR_INIT_COMMAND
];

// ── Connect to remote ───────────────────────────────────────
echo "Connecting to remote DB ({$remoteHost})...\n";
try {
    $remote = new PDO(
        "mysql:host={$remoteHost};port={$remotePort};dbname={$remoteDb};charset=utf8mb4",
        $remoteUser,
        $remotePass,
        $pdoOptions + [PDO::ATTR_TIMEOUT => 10]
    );
} catch (PDOException $e) {
    fwrite(STDERR, "Failed to connect to remote DB: {$e->getMessage()}\n");
    exit(1);
}
echo "  Connected to remote.\n";

// ── Connect to local ────────────────────────────────────────
echo "Connecting to local DB ({$localHost}/{$localDb})...\n";
try {
    $local = new PDO(
        "mysql:host={$localHost};port={$localPort};dbname={$localDb};charset=utf8mb4",
        $localUser,
        $localPass,
        $pdoOptions
    );
} catch (PDOException $e) {
    fwrite(STDERR, "Failed to connect to local DB: {$e->getMessage()}\n");
    exit(1);
}
echo "  Connected to local.\n\n";

// ── Helper: get non-generated column names for a table ──────
function getInsertableColumns(PDO $pdo, string $db, string $table): array
{
    $stmt = $pdo->prepare(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl
           AND (GENERATION_EXPRESSION IS NULL OR GENERATION_EXPRESSION = '')
         ORDER BY ORDINAL_POSITION"
    );
    $stmt->execute([':db' => $db, ':tbl' => $table]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

// ── Get all tables from remote ──────────────────────────────
$tables = $remote->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo "Found " . count($tables) . " tables in remote DB.\n\n";

if (count($tables) === 0) {
    echo "No tables found. Nothing to do.\n";
    exit(0);
}

$totalRows = 0;
$local->exec("SET FOREIGN_KEY_CHECKS = 0");

foreach ($tables as $table) {
    echo "── {$table} ";

    // Get CREATE TABLE statement from remote
    $createStmt = $remote->query("SHOW CREATE TABLE `{$table}`")->fetch();
    $createSql = $createStmt['Create Table'] ?? null;

    // Skip views
    if ($createSql === null) {
        $viewSql = $createStmt['Create View'] ?? null;
        if ($viewSql !== null) {
            echo "SKIP (view)\n";
        } else {
            echo "SKIP (no create statement)\n";
        }
        continue;
    }

    // Drop and recreate table locally
    $local->exec("DROP TABLE IF EXISTS `{$table}`");
    $local->exec($createSql);

    // Count rows in remote
    $rowCount = (int) $remote->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
    echo "({$rowCount} rows) ";

    if ($rowCount === 0) {
        echo "OK (empty)\n";
        continue;
    }

    // Get only insertable (non-generated) columns
    $insertCols = getInsertableColumns($remote, $remoteDb, $table);
    if (count($insertCols) === 0) {
        echo "SKIP (no insertable columns)\n";
        continue;
    }

    $selectList = implode(', ', array_map(fn($c) => "`{$c}`", $insertCols));
    $colList = $selectList;
    $placeholders = implode(', ', array_fill(0, count($insertCols), '?'));

    $insertSql = "INSERT INTO `{$table}` ({$colList}) VALUES ({$placeholders})";
    $insertStmt = $local->prepare($insertSql);

    // Fetch and insert in batches
    $batchSize = 500;
    $offset = 0;
    $inserted = 0;

    while ($offset < $rowCount) {
        $rows = $remote->query("SELECT {$selectList} FROM `{$table}` LIMIT {$batchSize} OFFSET {$offset}")->fetchAll();
        if (count($rows) === 0) break;

        $local->beginTransaction();
        foreach ($rows as $row) {
            $insertStmt->execute(array_values($row));
            $inserted++;
        }
        $local->commit();

        $offset += $batchSize;
    }

    $totalRows += $inserted;
    echo "OK ({$inserted} inserted)\n";
}

$local->exec("SET FOREIGN_KEY_CHECKS = 1");

echo "\n════════════════════════════════════════\n";
echo "Done! Synced " . count($tables) . " tables, {$totalRows} total rows.\n";
echo "Local DB '{$localDb}' now mirrors the public DB.\n";
