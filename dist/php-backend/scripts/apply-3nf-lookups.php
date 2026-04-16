<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';

main();

function main(): void
{
    global $argv;
    $opts = parseArgs(is_array($argv ?? null) ? $argv : []);
    $dryRun = array_key_exists('dry-run', $opts);

    $projectRoot = dirname(__DIR__, 2);
    $phpBackendDir = dirname(__DIR__);
    Env::load($projectRoot, $phpBackendDir);

    $host = (string) Env::get('MYSQL_HOST', '127.0.0.1');
    $port = (int) Env::get('MYSQL_PORT', '3306');
    $db = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
    $user = (string) Env::get('MYSQL_USER', 'root');
    $pass = (string) Env::get('MYSQL_PASSWORD', '');

    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $tables = parentTables($pdo, $db);
    if ($tables === []) {
        fwrite(STDOUT, "No generated parent tables found.\n");
        return;
    }

    foreach ($tables as $table) {
        $rows = (int) $pdo->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
        if ($rows === 0) {
            continue;
        }

        $columns = tableColumns($pdo, $db, $table);
        foreach ($columns as $column) {
            if (!isLookupCandidateColumn($column)) {
                continue;
            }

            $distinct = distinctCount($pdo, $table, $column);
            if ($distinct < 2 || $distinct > 20) {
                continue;
            }

            $lookupTable = lookupTableName($table, $column);
            $fkColumn = $column . '_id';

            if ($dryRun) {
                fwrite(STDOUT, "[dry-run] {$table}.{$column} -> {$lookupTable} ({$distinct} distinct)\n");
                continue;
            }

            createLookupTable($pdo, $lookupTable);
            upsertLookupValues($pdo, $lookupTable, $table, $column);
            ensureFkColumn($pdo, $db, $table, $fkColumn);
            backfillFkColumn($pdo, $table, $column, $lookupTable, $fkColumn);
            ensureIndex($pdo, $db, $table, "idx_{$table}_{$fkColumn}", [$fkColumn]);

            fwrite(STDOUT, "{$table}.{$column} normalized via {$lookupTable} ({$distinct} distinct)\n");
        }
    }
}

function parseArgs(array $argv): array
{
    $out = [];
    foreach ($argv as $idx => $arg) {
        if ($idx === 0 || !is_string($arg) || !str_starts_with($arg, '--')) {
            continue;
        }
        $k = substr($arg, 2);
        if ($k !== '') {
            $out[$k] = true;
        }
    }
    return $out;
}

function parentTables(PDO $pdo, string $db): array
{
    $sql = "SELECT table_name
FROM information_schema.tables
WHERE table_schema = :db
  AND table_type = 'BASE TABLE'
  AND RIGHT(table_name, 6) = '_table'
  AND table_name NOT REGEXP '__.*_table$'
ORDER BY table_name";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':db' => $db]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function tableColumns(PDO $pdo, string $db, string $table): array
{
    $sql = "SELECT column_name
FROM information_schema.columns
WHERE table_schema = :db
  AND table_name = :table
ORDER BY ordinal_position";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':db' => $db, ':table' => $table]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function isLookupCandidateColumn(string $column): bool
{
    if (in_array($column, ['row_id', 'created_at', 'updated_at', 'migrated_at'], true)) {
        return false;
    }
    return preg_match('/(status|role|type|sport|provider)$/i', $column) === 1;
}

function distinctCount(PDO $pdo, string $table, string $column): int
{
    $sql = "SELECT COUNT(DISTINCT `{$column}`) FROM `{$table}` WHERE `{$column}` IS NOT NULL AND `{$column}` <> ''";
    return (int) $pdo->query($sql)->fetchColumn();
}

function lookupTableName(string $table, string $column): string
{
    return $table . '__' . $column . '_lkp';
}

function createLookupTable(PDO $pdo, string $lookupTable): void
{
    $sql = "CREATE TABLE IF NOT EXISTS `{$lookupTable}` (
`id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
`value` VARCHAR(191) NOT NULL,
PRIMARY KEY (`id`),
UNIQUE KEY `uniq_value` (`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $pdo->exec($sql);
}

function upsertLookupValues(PDO $pdo, string $lookupTable, string $sourceTable, string $sourceColumn): void
{
    $values = $pdo->query("SELECT DISTINCT `{$sourceColumn}` AS v FROM `{$sourceTable}` WHERE `{$sourceColumn}` IS NOT NULL AND `{$sourceColumn}` <> ''")->fetchAll();
    $stmt = $pdo->prepare("INSERT INTO `{$lookupTable}` (`value`) VALUES (:v) ON DUPLICATE KEY UPDATE `value`=`value`");
    foreach ($values as $row) {
        $v = (string) ($row['v'] ?? '');
        if ($v === '') {
            continue;
        }
        $stmt->execute([':v' => $v]);
    }
}

function ensureFkColumn(PDO $pdo, string $db, string $table, string $column): void
{
    $sql = "SELECT 1 FROM information_schema.columns WHERE table_schema = :db AND table_name = :table AND column_name = :column LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':db' => $db, ':table' => $table, ':column' => $column]);
    $exists = (bool) $stmt->fetchColumn();
    if ($exists) {
        return;
    }
    $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` INT UNSIGNED NULL");
}

function backfillFkColumn(PDO $pdo, string $table, string $valueColumn, string $lookupTable, string $fkColumn): void
{
    $sql = "UPDATE `{$table}` t
LEFT JOIN `{$lookupTable}` l ON l.`value` = t.`{$valueColumn}`
SET t.`{$fkColumn}` = l.`id`";
    $pdo->exec($sql);
}

function ensureIndex(PDO $pdo, string $db, string $table, string $index, array $columns): void
{
    $sql = "SELECT 1 FROM information_schema.statistics WHERE table_schema = :db AND table_name = :table AND index_name = :index LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':db' => $db, ':table' => $table, ':index' => $index]);
    $exists = (bool) $stmt->fetchColumn();
    if ($exists) {
        return;
    }

    $quotedCols = array_map(static fn (string $c): string => "`{$c}`", $columns);
    $pdo->exec("ALTER TABLE `{$table}` ADD INDEX `{$index}` (" . implode(', ', $quotedCols) . ")");
}
