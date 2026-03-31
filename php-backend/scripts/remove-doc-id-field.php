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

    $tables = docTables($pdo, $db);
    if ($tables === []) {
        fwrite(STDOUT, "No JSON doc tables found.\n");
        return;
    }

    foreach ($tables as $table) {
        $count = (int) $pdo->query("SELECT COUNT(*) FROM `{$table}` WHERE JSON_CONTAINS_PATH(`doc`, 'one', '$._id')")->fetchColumn();
        if ($count === 0) {
            fwrite(STDOUT, "No doc._id entries in {$table}\n");
            continue;
        }

        if ($dryRun) {
            fwrite(STDOUT, "[dry-run] {$table}: would remove doc._id from {$count} rows\n");
            continue;
        }

        $affected = $pdo->exec("UPDATE `{$table}` SET `doc` = JSON_REMOVE(`doc`, '$._id') WHERE JSON_CONTAINS_PATH(`doc`, 'one', '$._id')");
        fwrite(STDOUT, "{$table}: removed doc._id from " . (int) $affected . " rows\n");
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

function docTables(PDO $pdo, string $db): array
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
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

