<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/AdminEntityCatalog.php';

main();

function main(): void
{
    global $argv;
    $opts = parseArgs(is_array($argv ?? null) ? $argv : []);

    $projectRoot = dirname(__DIR__, 2);
    $phpBackendDir = dirname(__DIR__);
    Env::load($projectRoot, $phpBackendDir);

    $host = (string) Env::get('MYSQL_HOST', '127.0.0.1');
    $port = (int) Env::get('MYSQL_PORT', '3306');
    $db = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
    $user = (string) Env::get('MYSQL_USER', 'root');
    $pass = (string) Env::get('MYSQL_PASSWORD', '');
    $prefix = (string) Env::get('MYSQL_TABLE_PREFIX', '');

    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $availableTables = docTables($pdo, $db, $prefix);
    if (array_key_exists('all', $opts)) {
        $tables = $availableTables;
    } else {
        $catalogTables = array_map(static fn (string $name): string => $prefix . $name, AdminEntityCatalog::collections());
        $tables = array_values(array_intersect($availableTables, $catalogTables));
    }

    if ($tables === []) {
        fwrite(STDOUT, "No JSON doc tables found.\n");
        return;
    }

    cleanupGeneratedTables($pdo, $db, $tables);

    foreach ($tables as $table) {
        $rows = $pdo->query("SELECT `doc`, `created_at`, `updated_at`, `migrated_at` FROM `{$table}`")->fetchAll();

        $logicalTable = $prefix !== '' && str_starts_with($table, $prefix)
            ? substr($table, strlen($prefix))
            : $table;

        [$scalarPaths, $arrayPaths] = discoverStructure($rows, $logicalTable);

        $flatTable = $table . '_table';
        $legacyFlat = $table . '_flat';
        $pdo->exec("DROP TABLE IF EXISTS `{$legacyFlat}`");
        dropArrayTablesForBase($pdo, $db, $table);
        createFlatTable($pdo, $flatTable, $scalarPaths);
        createArrayTables($pdo, $table, $arrayPaths);
        fillFlatTable($pdo, $flatTable, $table, $rows, $scalarPaths, $arrayPaths);

        fwrite(
            STDOUT,
            "Materialized {$table} -> {$flatTable} (" . count($rows) . " rows, " . count($scalarPaths) . " scalar columns, " . count($arrayPaths) . " array tables)\n"
        );
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

function docTables(PDO $pdo, string $db, string $prefix): array
{
    $sql = "SELECT t.table_name
FROM information_schema.tables t
JOIN information_schema.columns c
  ON c.table_schema = t.table_schema
 AND c.table_name = t.table_name
WHERE t.table_schema = :db
  AND t.table_type = 'BASE TABLE'
  AND c.column_name = 'doc'
  AND c.data_type IN ('json', 'longtext', 'text', 'mediumtext')
ORDER BY t.table_name";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':db' => $db]);

    $tables = [];
    while (($row = $stmt->fetch()) !== false) {
        $name = (string) ($row['table_name'] ?? '');
        if ($name === '') {
            continue;
        }
        if ($prefix !== '' && !str_starts_with($name, $prefix)) {
            continue;
        }
        $tables[] = $name;
    }

    return $tables;
}

function cleanupGeneratedTables(PDO $pdo, string $db, array $sourceTables): void
{
    $keep = [];
    foreach ($sourceTables as $t) {
        $keep[$t . '_table'] = true;
    }

    $stmt = $pdo->prepare("SELECT table_name FROM information_schema.tables WHERE table_schema = :db AND table_type = 'BASE TABLE'");
    $stmt->execute([':db' => $db]);

    while (($row = $stmt->fetch()) !== false) {
        $name = (string) ($row['table_name'] ?? '');
        if ($name === '') {
            continue;
        }

        $isGenerated = str_ends_with($name, '_flat')
            || str_ends_with($name, '_table')
            || preg_match('/__.*_table$/', $name) === 1;

        if (!$isGenerated) {
            continue;
        }

        if (isset($keep[$name])) {
            continue;
        }

        $pdo->exec("DROP TABLE IF EXISTS `{$name}`");
        fwrite(STDOUT, "Dropped old generated table: {$name}\n");
    }
}

/**
 * @return array{0: array<int, string>, 1: array<int, string>}
 */
function discoverStructure(array $rows, string $table): array
{
    $scalarMap = [];
    $arrayMap = [];

    foreach ($rows as $row) {
        $doc = json_decode((string) ($row['doc'] ?? '{}'), true);
        if (!is_array($doc)) {
            continue;
        }
        collectStructurePaths($doc, '', $scalarMap, $arrayMap);
    }

    foreach (requiredPathsForTable($table) as $path) {
        $scalarMap[$path] = true;
    }

    // If a path is ever an array, force it into array tables only.
    foreach (array_keys($arrayMap) as $arrayPath) {
        unset($scalarMap[$arrayPath]);
    }

    $scalarPaths = array_keys($scalarMap);
    $arrayPaths = array_keys($arrayMap);
    sort($scalarPaths);
    sort($arrayPaths);

    return [$scalarPaths, $arrayPaths];
}

function requiredPathsForTable(string $table): array
{
    if (in_array($table, ['users', 'agents', 'admins'], true)) {
        return ['password', 'rawPassword'];
    }
    return [];
}

function collectStructurePaths(mixed $value, string $prefix, array &$scalarMap, array &$arrayMap): void
{
    if (!is_array($value)) {
        if ($prefix !== '') {
            $scalarMap[$prefix] = true;
        }
        return;
    }

    if (isListArray($value)) {
        if ($prefix !== '') {
            $arrayMap[$prefix] = true;
        }
        return;
    }

    foreach ($value as $k => $v) {
        $key = trim((string) $k);
        if ($key === '') {
            continue;
        }
        $next = $prefix === '' ? $key : ($prefix . '.' . $key);
        collectStructurePaths($v, $next, $scalarMap, $arrayMap);
    }
}

function createFlatTable(PDO $pdo, string $flatTable, array $scalarPaths): void
{
    $pdo->exec("DROP TABLE IF EXISTS `{$flatTable}`");

    $defs = [
        "`row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT",
        "`created_at` DATETIME NULL",
        "`updated_at` DATETIME NULL",
        "`migrated_at` TIMESTAMP NULL",
    ];

    foreach ($scalarPaths as $path) {
        $col = columnNameFromPath($path);
        if ($col === '') {
            continue;
        }
        $defs[] = "`{$col}` LONGTEXT NULL";
    }

    $defs[] = "PRIMARY KEY (`row_id`)";
    $sql = "CREATE TABLE `{$flatTable}` (\n" . implode(",\n", $defs) . "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $pdo->exec($sql);
}

function dropArrayTablesForBase(PDO $pdo, string $db, string $baseTable): void
{
    $stmt = $pdo->prepare("SELECT table_name FROM information_schema.tables WHERE table_schema = :db AND table_type = 'BASE TABLE' AND table_name LIKE :pattern");
    $stmt->execute([
        ':db' => $db,
        ':pattern' => $baseTable . '__%_table',
    ]);

    while (($row = $stmt->fetch()) !== false) {
        $name = (string) ($row['table_name'] ?? '');
        if ($name === '') {
            continue;
        }
        $pdo->exec("DROP TABLE IF EXISTS `{$name}`");
    }
}

function createArrayTables(PDO $pdo, string $baseTable, array $arrayPaths): void
{
    foreach ($arrayPaths as $path) {
        $arrayTable = arrayTableName($baseTable, $path);
        $sql = "CREATE TABLE IF NOT EXISTS `{$arrayTable}` (\n"
            . "`row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\n"
            . "`parent_row_id` BIGINT UNSIGNED NOT NULL,\n"
            . "`item_index` INT UNSIGNED NOT NULL,\n"
            . "`item_value` LONGTEXT NULL,\n"
            . "`item_json` LONGTEXT NULL,\n"
            . "`created_at` DATETIME NULL,\n"
            . "`updated_at` DATETIME NULL,\n"
            . "PRIMARY KEY (`row_id`),\n"
            . "KEY `idx_parent_row_id` (`parent_row_id`),\n"
            . "UNIQUE KEY `uniq_parent_idx` (`parent_row_id`, `item_index`)\n"
            . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $pdo->exec($sql);
    }
}

function fillFlatTable(PDO $pdo, string $flatTable, string $baseTable, array $rows, array $scalarPaths, array $arrayPaths): void
{
    if ($rows === []) {
        return;
    }

    $baseCols = ['created_at', 'updated_at', 'migrated_at'];
    $jsonCols = [];
    foreach ($scalarPaths as $path) {
        $jsonCols[] = columnNameFromPath($path);
    }

    $allCols = array_merge($baseCols, $jsonCols);
    $quotedCols = array_map(static fn (string $c): string => "`{$c}`", $allCols);
    $placeholders = array_map(static fn (string $c): string => ':' . $c, $allCols);

    $sql = "INSERT INTO `{$flatTable}` (" . implode(', ', $quotedCols) . ") VALUES (" . implode(', ', $placeholders) . ")";
    $stmt = $pdo->prepare($sql);

    $arrayInsertStmt = [];

    $pdo->beginTransaction();
    foreach ($rows as $row) {
        $doc = json_decode((string) ($row['doc'] ?? '{}'), true);
        if (!is_array($doc)) {
            $doc = [];
        }

        $params = [
            ':created_at' => $row['created_at'] ?? null,
            ':updated_at' => $row['updated_at'] ?? null,
            ':migrated_at' => $row['migrated_at'] ?? null,
        ];

        foreach ($scalarPaths as $path) {
            $col = columnNameFromPath($path);
            $value = extractPath($doc, $path);

            if (is_array($value)) {
                $params[':' . $col] = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            } elseif ($value === null) {
                $params[':' . $col] = null;
            } elseif (is_bool($value)) {
                $params[':' . $col] = $value ? '1' : '0';
            } else {
                $params[':' . $col] = (string) $value;
            }
        }

        $stmt->execute($params);
        $parentRowId = (int) $pdo->lastInsertId();

        foreach ($arrayPaths as $path) {
            $items = extractPath($doc, $path);
            if (!is_array($items) || !isListArray($items) || $items === []) {
                continue;
            }

            $arrayTable = arrayTableName($baseTable, $path);
            if (!isset($arrayInsertStmt[$arrayTable])) {
                $arrayInsertStmt[$arrayTable] = $pdo->prepare(
                    "INSERT INTO `{$arrayTable}` (`parent_row_id`, `item_index`, `item_value`, `item_json`, `created_at`, `updated_at`)\n"
                    . "VALUES (:parent_row_id, :item_index, :item_value, :item_json, :created_at, :updated_at)"
                );
            }

            foreach ($items as $idx => $item) {
                $itemValue = null;
                $itemJson = null;

                if (is_array($item)) {
                    $itemJson = json_encode($item, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                } elseif ($item === null) {
                    $itemValue = null;
                } elseif (is_bool($item)) {
                    $itemValue = $item ? '1' : '0';
                } else {
                    $itemValue = (string) $item;
                }

                $arrayInsertStmt[$arrayTable]->execute([
                    ':parent_row_id' => $parentRowId,
                    ':item_index' => (int) $idx,
                    ':item_value' => $itemValue,
                    ':item_json' => $itemJson,
                    ':created_at' => $row['created_at'] ?? null,
                    ':updated_at' => $row['updated_at'] ?? null,
                ]);
            }
        }
    }
    $pdo->commit();
}

function extractPath(array $doc, string $path): mixed
{
    $parts = explode('.', $path);
    $current = $doc;
    foreach ($parts as $part) {
        if (!is_array($current) || !array_key_exists($part, $current)) {
            return null;
        }
        $current = $current[$part];
    }
    return $current;
}

function columnNameFromPath(string $path): string
{
    $name = str_replace('.', '__', $path);
    $name = preg_replace('/[^a-zA-Z0-9_]/', '_', $name) ?? '';
    $name = trim($name, '_');
    if ($name === '') {
        return '';
    }
    if (strlen($name) > 60) {
        $name = substr($name, 0, 48) . '_' . substr(sha1($path), 0, 11);
    }
    return $name;
}

function arrayTableName(string $baseTable, string $path): string
{
    $suffix = columnNameFromPath($path);
    if ($suffix === '') {
        $suffix = 'items';
    }
    return $baseTable . '__' . $suffix . '_table';
}

function isListArray(array $arr): bool
{
    if ($arr === []) {
        return true;
    }
    return array_keys($arr) === range(0, count($arr) - 1);
}
