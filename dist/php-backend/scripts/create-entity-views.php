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

    $entityTables = array_key_exists('all', $opts)
        ? docTables($pdo, $db, $prefix)
        : AdminEntityCatalog::collections();

    foreach ($entityTables as $rawTable) {
        $table = $prefix . trim((string) $rawTable);
        if ($table === $prefix) {
            continue;
        }
        if (!tableExists($pdo, $db, $table)) {
            fwrite(STDOUT, "Skipping {$table} (missing table)\n");
            continue;
        }

        $columns = buildColumnsForTable($pdo, $table);
        $viewName = $table . '_entity_v';
        $selectParts = [];
        foreach ($columns as $alias => $expr) {
            $selectParts[] = "{$expr} AS `{$alias}`";
        }

        $sql = "CREATE OR REPLACE VIEW `{$viewName}` AS SELECT " . implode(",\n", $selectParts) . " FROM `{$table}`";
        $pdo->exec($sql);
        fwrite(STDOUT, "Created/updated view: {$viewName}\n");
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
        if ($k === '') {
            continue;
        }
        $out[$k] = true;
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
        $logicalName = $prefix !== '' && str_starts_with($name, $prefix)
            ? substr($name, strlen($prefix))
            : $name;
        if ($logicalName === '') {
            continue;
        }
        $tables[] = $logicalName;
    }
    return array_values(array_unique($tables));
}

function buildColumnsForTable(PDO $pdo, string $table): array
{
    $columns = [
        '_id' => '`mongo_id`',
        'created_at' => '`created_at`',
        'updated_at' => '`updated_at`',
    ];

    $paths = discoverDocPaths($pdo, $table);
    foreach ($paths as $path => $kind) {
        $alias = sanitizeAlias(str_replace('.', '__', $path));
        if ($alias === '' || isset($columns[$alias])) {
            continue;
        }
        $jsonPath = jsonPathForPath($path);
        $columns[$alias] = $kind === 'scalar'
            ? "JSON_UNQUOTE(JSON_EXTRACT(`doc`, '{$jsonPath}'))"
            : "JSON_EXTRACT(`doc`, '{$jsonPath}')";
    }

    return $columns;
}

function discoverDocPaths(PDO $pdo, string $table): array
{
    $stmt = $pdo->query("SELECT `doc` FROM `{$table}`");
    $seen = [];
    while (($row = $stmt->fetch()) !== false) {
        $doc = json_decode((string) ($row['doc'] ?? '{}'), true);
        if (!is_array($doc)) {
            continue;
        }
        collectPaths($doc, '', $seen);
    }
    ksort($seen);
    return $seen;
}

function collectPaths(mixed $value, string $prefix, array &$seen): void
{
    if (!is_array($value)) {
        if ($prefix !== '' && !isset($seen[$prefix])) {
            $seen[$prefix] = 'scalar';
        }
        return;
    }

    if (isListArray($value)) {
        if ($prefix !== '') {
            $seen[$prefix] = 'json';
        }
        return;
    }

    foreach ($value as $k => $v) {
        $key = trim((string) $k);
        if ($key === '') {
            continue;
        }
        $nextPrefix = $prefix === '' ? $key : ($prefix . '.' . $key);

        if (is_array($v)) {
            if (isListArray($v)) {
                $seen[$nextPrefix] = 'json';
                continue;
            }
            collectPaths($v, $nextPrefix, $seen);
            continue;
        }

        if (!isset($seen[$nextPrefix])) {
            $seen[$nextPrefix] = 'scalar';
        }
    }
}

function isListArray(array $arr): bool
{
    if ($arr === []) {
        return true;
    }
    return array_keys($arr) === range(0, count($arr) - 1);
}

function sanitizeAlias(string $key): string
{
    $alias = preg_replace('/[^a-zA-Z0-9_]/', '_', $key) ?? '';
    return trim($alias, '_');
}

function jsonPathForPath(string $path): string
{
    $parts = explode('.', $path);
    $jsonPath = '$';
    foreach ($parts as $part) {
        $escaped = str_replace(['\\', '"'], ['\\\\', '\\"'], $part);
        $jsonPath .= '."' . $escaped . '"';
    }
    return $jsonPath;
}

function tableExists(PDO $pdo, string $db, string $table): bool
{
    $sql = "SELECT 1 FROM information_schema.tables WHERE table_schema = :db AND table_name = :tbl LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':db' => $db, ':tbl' => $table]);
    return (bool) $stmt->fetchColumn();
}
