<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';

use MongoDB\BSON\Decimal128;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Driver\Command;
use MongoDB\Driver\Manager;
use MongoDB\Driver\Query;

if (!extension_loaded('mongodb')) {
    fwrite(STDERR, "The mongodb PHP extension is required.\n");
    exit(1);
}

if (!extension_loaded('pdo_mysql')) {
    fwrite(STDERR, "The pdo_mysql extension is required.\n");
    exit(1);
}

main($argv);

function main(array $argv): void
{
    $opts = parseArgs($argv);

    $mongoUri = (string) ($opts['mongo-uri'] ?? Env::get('MONGODB_URI', Env::get('MONGO_URI', 'mongodb://localhost:27017/sports_betting')));
    $dbName = (string) ($opts['mongo-db'] ?? Env::get('DB_NAME', ''));
    if ($dbName === '') {
        $dbName = parseDbNameFromUri($mongoUri);
    }
    if ($dbName === '') {
        $dbName = 'sports_betting';
    }

    $mysqlHost = (string) ($opts['mysql-host'] ?? Env::get('MYSQL_HOST', '127.0.0.1'));
    $mysqlPort = (int) ($opts['mysql-port'] ?? Env::get('MYSQL_PORT', '3306'));
    $mysqlDb = (string) ($opts['mysql-db'] ?? Env::get('MYSQL_DB', 'sports_betting'));
    $mysqlUser = (string) ($opts['mysql-user'] ?? Env::get('MYSQL_USER', 'root'));
    $mysqlPass = (string) ($opts['mysql-pass'] ?? Env::get('MYSQL_PASSWORD', ''));
    $tablePrefix = (string) ($opts['table-prefix'] ?? '');
    $dropExisting = array_key_exists('drop-existing', $opts);
    $batchSize = max(1, (int) ($opts['batch-size'] ?? 500));
    $collectionsFilter = isset($opts['collections']) ? csvToList((string) $opts['collections']) : null;

    fwrite(STDOUT, "MongoDB DB: {$dbName}\n");
    fwrite(STDOUT, "MySQL DB: {$mysqlDb} @ {$mysqlHost}:{$mysqlPort}\n");

    $mongo = new Manager($mongoUri);
    $pdo = new PDO(
        "mysql:host={$mysqlHost};port={$mysqlPort};dbname={$mysqlDb};charset=utf8mb4",
        $mysqlUser,
        $mysqlPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8mb4',
        ]
    );

    $collections = listCollections($mongo, $dbName);
    if ($collectionsFilter !== null) {
        $collections = array_values(array_filter(
            $collections,
            static fn (string $name): bool => in_array($name, $collectionsFilter, true)
        ));
    }

    if ($collections === []) {
        fwrite(STDOUT, "No collections to migrate.\n");
        return;
    }

    $summary = [];
    foreach ($collections as $collection) {
        $table = toTableName($collection, $tablePrefix);
        fwrite(STDOUT, "\nMigrating {$collection} -> {$table}\n");

        if ($dropExisting) {
            $pdo->exec("DROP TABLE IF EXISTS `{$table}`");
        }
        createCollectionTable($pdo, $table);

        $count = migrateCollection($mongo, $pdo, $dbName, $collection, $table, $batchSize);
        $summary[] = ['collection' => $collection, 'table' => $table, 'rows' => $count];
        fwrite(STDOUT, "Done {$collection}: {$count} rows\n");
    }

    fwrite(STDOUT, "\nMigration summary\n");
    foreach ($summary as $item) {
        fwrite(STDOUT, "- {$item['collection']} -> {$item['table']}: {$item['rows']} rows\n");
    }
}

function parseArgs(array $argv): array
{
    $out = [];
    foreach ($argv as $idx => $arg) {
        if ($idx === 0) {
            continue;
        }
        if (!str_starts_with($arg, '--')) {
            continue;
        }
        $trimmed = substr($arg, 2);
        $eqPos = strpos($trimmed, '=');
        if ($eqPos === false) {
            $out[$trimmed] = true;
            continue;
        }
        $k = substr($trimmed, 0, $eqPos);
        $v = substr($trimmed, $eqPos + 1);
        $out[$k] = $v;
    }
    return $out;
}

function parseDbNameFromUri(string $uri): string
{
    $path = (string) parse_url($uri, PHP_URL_PATH);
    $db = trim($path, '/');
    if ($db === '') {
        return '';
    }
    $slashPos = strpos($db, '/');
    if ($slashPos !== false) {
        $db = substr($db, 0, $slashPos);
    }
    return $db;
}

function csvToList(string $value): array
{
    $items = array_map('trim', explode(',', $value));
    return array_values(array_filter($items, static fn (string $v): bool => $v !== ''));
}

function listCollections(Manager $mongo, string $dbName): array
{
    $cmd = new Command(['listCollections' => 1, 'nameOnly' => true]);
    $cursor = $mongo->executeCommand($dbName, $cmd);
    $names = [];
    foreach ($cursor as $item) {
        $name = (string) ($item->name ?? '');
        if ($name !== '') {
            $names[] = $name;
        }
    }
    sort($names);
    return $names;
}

function toTableName(string $collection, string $prefix = ''): string
{
    $table = strtolower($collection);
    $table = preg_replace('/[^a-z0-9_]+/i', '_', $table) ?? $table;
    $table = trim($table, '_');
    if ($table === '') {
        $table = 'collection_data';
    }
    if (preg_match('/^[0-9]/', $table) === 1) {
        $table = 'c_' . $table;
    }
    return $prefix . $table;
}

function createCollectionTable(PDO $pdo, string $table): void
{
    $sql = "CREATE TABLE IF NOT EXISTS `{$table}` (
`mongo_id` VARCHAR(64) NOT NULL,
`doc` JSON NOT NULL,
`created_at` DATETIME NULL,
`updated_at` DATETIME NULL,
`migrated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (`mongo_id`),
KEY `idx_created_at` (`created_at`),
KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $pdo->exec($sql);
}

function migrateCollection(
    Manager $mongo,
    PDO $pdo,
    string $dbName,
    string $collection,
    string $table,
    int $batchSize
): int {
    $query = new Query([]);
    $cursor = $mongo->executeQuery("{$dbName}.{$collection}", $query);

    $insertSql = "INSERT INTO `{$table}` (`mongo_id`, `doc`, `created_at`, `updated_at`)
VALUES (:mongo_id, :doc, :created_at, :updated_at)
ON DUPLICATE KEY UPDATE
`doc` = VALUES(`doc`),
`created_at` = VALUES(`created_at`),
`updated_at` = VALUES(`updated_at`),
`migrated_at` = CURRENT_TIMESTAMP";
    $stmt = $pdo->prepare($insertSql);

    $pdo->beginTransaction();
    $count = 0;
    foreach ($cursor as $rawDoc) {
        $doc = normalizeValue($rawDoc);
        if (!is_array($doc)) {
            $doc = ['value' => $doc];
        }

        $mongoId = extractMongoId($doc, $count);
        $createdAt = toMysqlDateTime($doc['createdAt'] ?? null);
        $updatedAt = toMysqlDateTime($doc['updatedAt'] ?? null);
        $json = json_encode($doc, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if ($json === false) {
            $json = json_encode(['_raw' => 'Failed to encode original document'], JSON_UNESCAPED_SLASHES);
        }

        $stmt->execute([
            ':mongo_id' => $mongoId,
            ':doc' => $json,
            ':created_at' => $createdAt,
            ':updated_at' => $updatedAt,
        ]);

        $count++;
        if ($count % $batchSize === 0) {
            $pdo->commit();
            $pdo->beginTransaction();
            fwrite(STDOUT, "  migrated {$count}...\n");
        }
    }
    $pdo->commit();

    return $count;
}

function extractMongoId(array $doc, int $fallbackCount): string
{
    $id = $doc['_id'] ?? null;
    if (is_string($id) && $id !== '') {
        return $id;
    }
    if (is_int($id) || is_float($id)) {
        return (string) $id;
    }
    return 'row_' . ($fallbackCount + 1);
}

function toMysqlDateTime(mixed $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    if ($value instanceof DateTimeInterface) {
        return $value->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    }
    if (is_numeric($value)) {
        $ts = (int) $value;
        if ($ts > 9999999999) {
            $ts = (int) floor($ts / 1000);
        }
        return gmdate('Y-m-d H:i:s', $ts);
    }
    if (!is_string($value)) {
        return null;
    }
    try {
        $dt = new DateTimeImmutable($value);
        return $dt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    } catch (Throwable $_e) {
        return null;
    }
}

function normalizeValue(mixed $value): mixed
{
    if ($value instanceof ObjectId) {
        return (string) $value;
    }
    if ($value instanceof UTCDateTime) {
        return $value->toDateTime()->format(DATE_ATOM);
    }
    if ($value instanceof Decimal128) {
        return (string) $value;
    }
    if ($value instanceof DateTimeInterface) {
        return $value->format(DATE_ATOM);
    }
    if (is_scalar($value) || $value === null) {
        return $value;
    }
    if (is_array($value)) {
        $out = [];
        foreach ($value as $k => $v) {
            $out[(string) $k] = normalizeValue($v);
        }
        return $out;
    }
    if (is_object($value)) {
        $vars = (array) $value;
        $out = [];
        foreach ($vars as $k => $v) {
            $cleanKey = trim((string) $k, "\0*\0");
            $out[$cleanKey] = normalizeValue($v);
        }
        return $out;
    }
    return (string) $value;
}
