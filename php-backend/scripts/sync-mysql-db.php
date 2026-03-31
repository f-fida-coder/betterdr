<?php

declare(strict_types=1);

/**
 * Clone a source MySQL database into a target MySQL database.
 *
 * Default mode reads source credentials from `.env.copy` and target from `.env`.
 * You can override via CLI flags:
 *   --source-host --source-port --source-db --source-user --source-pass
 *   --target-host --target-port --target-db --target-user --target-pass
 *
 * Optional:
 *   --source-env=.env.copy
 *   --target-env=.env
 *   --include=table1,table2
 *   --exclude=table3,table4
 *   --batch-size=500
 */

function parseEnvFile(string $path): array
{
    if (!is_file($path) || !is_readable($path)) {
        return [];
    }

    $rows = file($path, FILE_IGNORE_NEW_LINES);
    if ($rows === false) {
        return [];
    }

    $out = [];
    foreach ($rows as $row) {
        $line = trim($row);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        [$k, $v] = array_pad(explode('=', $line, 2), 2, '');
        $key = trim($k);
        if ($key === '') {
            continue;
        }
        $value = trim($v);
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"'))
            || (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }
        $out[$key] = $value;
    }

    return $out;
}

function optionValue(array $opts, string $key, ?string $fallback = null): ?string
{
    if (!array_key_exists($key, $opts)) {
        return $fallback;
    }

    $value = $opts[$key];
    if ($value === false || $value === null || $value === '') {
        return $fallback;
    }
    return (string) $value;
}

function splitCsv(string $value): array
{
    if (trim($value) === '') {
        return [];
    }
    $items = array_map('trim', explode(',', $value));
    return array_values(array_filter($items, static fn (string $s): bool => $s !== ''));
}

function qi(string $identifier): string
{
    return '`' . str_replace('`', '``', $identifier) . '`';
}

function connectMysql(array $cfg): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $cfg['host'],
        (int) $cfg['port'],
        $cfg['db']
    );

    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 15,
    ]);
    $pdo->exec('SET NAMES utf8mb4');

    return $pdo;
}

function copyTableData(PDO $source, PDO $target, string $table, int $batchSize): int
{
    $totalInserted = 0;
    $columnsMeta = $source->query('SHOW FULL COLUMNS FROM ' . qi($table))->fetchAll(PDO::FETCH_ASSOC);
    if (!is_array($columnsMeta) || $columnsMeta === []) {
        return 0;
    }

    $insertableColumns = [];
    foreach ($columnsMeta as $meta) {
        $field = (string) ($meta['Field'] ?? '');
        $extra = strtolower((string) ($meta['Extra'] ?? ''));
        if ($field === '') {
            continue;
        }
        if (str_contains($extra, 'generated')) {
            continue;
        }
        $insertableColumns[] = $field;
    }

    if ($insertableColumns === []) {
        return 0;
    }

    $selectList = implode(', ', array_map('qi', $insertableColumns));
    $select = $source->query('SELECT ' . $selectList . ' FROM ' . qi($table));
    if (!$select instanceof PDOStatement) {
        return 0;
    }

    $first = $select->fetch(PDO::FETCH_ASSOC);
    if (!is_array($first)) {
        return 0;
    }

    $columns = array_keys($first);
    $columnList = implode(', ', array_map('qi', $columns));
    $rows = [$first];

    $insertBatch = static function (array $batchRows) use ($target, $table, $columns, $columnList): int {
        $valueSql = [];
        $params = [];
        $rowPlaceholders = '(' . implode(', ', array_fill(0, count($columns), '?')) . ')';

        foreach ($batchRows as $row) {
            $valueSql[] = $rowPlaceholders;
            foreach ($columns as $col) {
                $params[] = $row[$col] ?? null;
            }
        }

        $sql = 'INSERT INTO ' . qi($table) . ' (' . $columnList . ') VALUES ' . implode(', ', $valueSql);
        $stmt = $target->prepare($sql);
        $stmt->execute($params);
        return count($batchRows);
    };

    while (($row = $select->fetch(PDO::FETCH_ASSOC)) !== false) {
        if (is_array($row)) {
            $rows[] = $row;
        }

        if (count($rows) >= $batchSize) {
            $totalInserted += $insertBatch($rows);
            $rows = [];
        }
    }

    if ($rows !== []) {
        $totalInserted += $insertBatch($rows);
    }

    return $totalInserted;
}

$opts = getopt('', [
    'source-env::',
    'target-env::',
    'source-host::',
    'source-port::',
    'source-db::',
    'source-user::',
    'source-pass::',
    'target-host::',
    'target-port::',
    'target-db::',
    'target-user::',
    'target-pass::',
    'include::',
    'exclude::',
    'batch-size::',
]);

$projectRoot = dirname(__DIR__, 2);
$defaultSourceEnv = $projectRoot . '/.env.copy';
$defaultTargetEnv = $projectRoot . '/.env';

$sourceEnvPath = optionValue($opts, 'source-env', $defaultSourceEnv);
$targetEnvPath = optionValue($opts, 'target-env', $defaultTargetEnv);

$sourceEnv = parseEnvFile((string) $sourceEnvPath);
$targetEnv = parseEnvFile((string) $targetEnvPath);

$sourceCfg = [
    'host' => optionValue($opts, 'source-host', $sourceEnv['MYSQL_HOST'] ?? ''),
    'port' => optionValue($opts, 'source-port', $sourceEnv['MYSQL_PORT'] ?? '3306'),
    'db' => optionValue($opts, 'source-db', $sourceEnv['MYSQL_DB'] ?? ''),
    'user' => optionValue($opts, 'source-user', $sourceEnv['MYSQL_USER'] ?? ''),
    'pass' => optionValue($opts, 'source-pass', $sourceEnv['MYSQL_PASSWORD'] ?? ''),
];

$targetCfg = [
    'host' => optionValue($opts, 'target-host', $targetEnv['MYSQL_HOST'] ?? ''),
    'port' => optionValue($opts, 'target-port', $targetEnv['MYSQL_PORT'] ?? '3306'),
    'db' => optionValue($opts, 'target-db', $targetEnv['MYSQL_DB'] ?? ''),
    'user' => optionValue($opts, 'target-user', $targetEnv['MYSQL_USER'] ?? ''),
    'pass' => optionValue($opts, 'target-pass', $targetEnv['MYSQL_PASSWORD'] ?? ''),
];

foreach (['host', 'port', 'db', 'user'] as $field) {
    if ((string) $sourceCfg[$field] === '') {
        fwrite(STDERR, "Missing source config field: {$field}\n");
        exit(1);
    }
    if ((string) $targetCfg[$field] === '') {
        fwrite(STDERR, "Missing target config field: {$field}\n");
        exit(1);
    }
}

$batchSize = (int) optionValue($opts, 'batch-size', '500');
if ($batchSize < 1) {
    $batchSize = 500;
}

$include = splitCsv((string) optionValue($opts, 'include', ''));
$exclude = splitCsv((string) optionValue($opts, 'exclude', ''));
$excludeMap = array_fill_keys(array_map('strtolower', $exclude), true);

fwrite(STDOUT, "Connecting to source {$sourceCfg['host']}:{$sourceCfg['port']} / {$sourceCfg['db']}\n");
fwrite(STDOUT, "Connecting to target {$targetCfg['host']}:{$targetCfg['port']} / {$targetCfg['db']}\n");

$bootstrapSource = connectMysql($sourceCfg);
$tableRows = $bootstrapSource->query('SHOW FULL TABLES WHERE Table_type = \'BASE TABLE\'')->fetchAll(PDO::FETCH_NUM);
$sourceTables = [];
foreach ($tableRows as $row) {
    if (isset($row[0]) && is_string($row[0]) && $row[0] !== '') {
        $sourceTables[] = $row[0];
    }
}

if ($include !== []) {
    $includeMap = array_fill_keys(array_map('strtolower', $include), true);
    $sourceTables = array_values(array_filter(
        $sourceTables,
        static fn (string $t): bool => isset($includeMap[strtolower($t)])
    ));
}

$sourceTables = array_values(array_filter(
    $sourceTables,
    static fn (string $t): bool => !isset($excludeMap[strtolower($t)])
));

sort($sourceTables);

if ($sourceTables === []) {
    fwrite(STDOUT, "No source tables selected.\n");
    exit(0);
}

fwrite(STDOUT, "Tables to sync: " . count($sourceTables) . "\n");

$totalRows = 0;
foreach ($sourceTables as $index => $table) {
    $tableLabel = ($index + 1) . '/' . count($sourceTables);
    fwrite(STDOUT, "[{$tableLabel}] Syncing table: {$table}\n");
    $copied = 0;
    $maxAttempts = 3;

    for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
        $sourcePdo = connectMysql($sourceCfg);
        $targetPdo = connectMysql($targetCfg);
        $targetPdo->exec('SET FOREIGN_KEY_CHECKS=0');

        try {
            $createRow = $sourcePdo->query('SHOW CREATE TABLE ' . qi($table))->fetch(PDO::FETCH_ASSOC);
            if (!is_array($createRow)) {
                throw new RuntimeException("Failed to read schema for table {$table}");
            }

            $createSql = '';
            foreach (['Create Table', 'Create View'] as $k) {
                if (isset($createRow[$k]) && is_string($createRow[$k]) && $createRow[$k] !== '') {
                    $createSql = $createRow[$k];
                    break;
                }
            }
            if ($createSql === '') {
                throw new RuntimeException("Missing CREATE statement for table {$table}");
            }

            $targetPdo->exec('DROP TABLE IF EXISTS ' . qi($table));
            $targetPdo->exec($createSql);

            $targetPdo->beginTransaction();
            try {
                $copied = copyTableData($sourcePdo, $targetPdo, $table, $batchSize);
                $targetPdo->commit();
            } catch (Throwable $e) {
                if ($targetPdo->inTransaction()) {
                    $targetPdo->rollBack();
                }
                throw $e;
            }

            $targetPdo->exec('SET FOREIGN_KEY_CHECKS=1');
            break;
        } catch (Throwable $e) {
            $message = strtolower($e->getMessage());
            $isTransient = str_contains($message, 'server has gone away')
                || str_contains($message, 'lost connection')
                || str_contains($message, 'error: 2006')
                || str_contains($message, 'error: 2013');

            if ($attempt >= $maxAttempts || !$isTransient) {
                throw $e;
            }

            fwrite(STDOUT, "  Retry {$attempt}/{$maxAttempts} due to transient MySQL disconnect\n");
            usleep(500000);
        }
    }

    $totalRows += $copied;
    fwrite(STDOUT, "  Copied {$copied} rows\n");
}

fwrite(STDOUT, "Sync complete. Tables: " . count($sourceTables) . ", Rows: {$totalRows}\n");
