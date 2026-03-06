<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/MongoRepository.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

function connectPdo(): PDO
{
    $host = (string) Env::get('MYSQL_HOST', Env::get('DB_HOST', '127.0.0.1'));
    $port = (int) Env::get('MYSQL_PORT', Env::get('DB_PORT', '3306'));
    $db = (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'));
    $user = (string) Env::get('MYSQL_USER', Env::get('DB_USER', 'root'));
    $pass = (string) Env::get('MYSQL_PASSWORD', Env::get('DB_PASSWORD', ''));

    $hosts = [];
    $rawHosts = trim((string) Env::get('MYSQL_HOSTS', ''));
    if ($rawHosts !== '') {
        foreach (explode(',', $rawHosts) as $candidate) {
            $candidate = trim($candidate);
            if ($candidate !== '') {
                $hosts[] = $candidate;
            }
        }
    }
    $hosts[] = $host;
    $hosts = array_values(array_unique($hosts));

    $last = null;
    foreach ($hosts as $candidateHost) {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $candidateHost, $port, $db);
        try {
            return new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 5,
            ]);
        } catch (PDOException $e) {
            $last = $e;
        }
    }

    if ($last instanceof PDOException) {
        throw $last;
    }
    throw new RuntimeException('Unable to connect to MySQL');
}

function columnExists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = :table AND column_name = :column LIMIT 1'
    );
    $stmt->execute([':table' => $table, ':column' => $column]);
    return (bool) $stmt->fetchColumn();
}

function indexExists(PDO $pdo, string $table, string $index): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = :table AND index_name = :index LIMIT 1'
    );
    $stmt->execute([':table' => $table, ':index' => $index]);
    return (bool) $stmt->fetchColumn();
}

function ensureGeneratedColumn(PDO $pdo, string $table, string $column, string $expression): void
{
    if (columnExists($pdo, $table, $column)) {
        echo "Column {$table}.{$column} already exists\n";
        return;
    }

    $sql = sprintf(
        'ALTER TABLE `%s` ADD COLUMN `%s` VARCHAR(64) GENERATED ALWAYS AS (%s) STORED',
        $table,
        $column,
        $expression
    );
    $pdo->exec($sql);
    echo "Added generated column {$table}.{$column}\n";
}

function ensureIndex(PDO $pdo, string $table, string $index, string $columns, bool $unique = false): void
{
    if (indexExists($pdo, $table, $index)) {
        echo "Index {$table}.{$index} already exists\n";
        return;
    }
    $sql = sprintf(
        'ALTER TABLE `%s` ADD %s INDEX `%s` (%s)',
        $table,
        $unique ? 'UNIQUE' : '',
        $index,
        $columns
    );
    $pdo->exec($sql);
    echo "Added index {$table}.{$index}\n";
}

function hasDuplicateRoundIds(PDO $pdo, string $casinoBetsTable): bool
{
    $sql = sprintf(
        "SELECT JSON_UNQUOTE(JSON_EXTRACT(doc, '$.roundId')) AS rid, COUNT(*) AS c
         FROM `%s`
         GROUP BY rid
         HAVING rid IS NOT NULL AND rid <> '' AND c > 1
         LIMIT 1",
        $casinoBetsTable
    );
    $row = $pdo->query($sql)->fetch();
    return is_array($row);
}

function hasDuplicateUserRequestIds(PDO $pdo, string $casinoBetsTable): bool
{
    $sql = sprintf(
        "SELECT
            JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId')) AS uid,
            NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.requestId')), '') AS req,
            COUNT(*) AS c
         FROM `%s`
         GROUP BY uid, req
         HAVING uid IS NOT NULL AND uid <> '' AND req IS NOT NULL AND req <> '' AND c > 1
         LIMIT 1",
        $casinoBetsTable
    );
    $row = $pdo->query($sql)->fetch();
    return is_array($row);
}

try {
    $repo = new MongoRepository(
        (string) Env::get('MONGO_URI', ''),
        (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'))
    );

    // Ensure underlying JSON tables exist.
    $repo->countDocuments('casino_bets', []);
    $repo->countDocuments('transactions', []);

    $casinoBetsTable = $repo->tableNameForCollection('casino_bets');
    $transactionsTable = $repo->tableNameForCollection('transactions');
    $pdo = connectPdo();

    ensureGeneratedColumn($pdo, $casinoBetsTable, 'user_id_idx', "JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId'))");
    ensureGeneratedColumn($pdo, $casinoBetsTable, 'round_id_idx', "JSON_UNQUOTE(JSON_EXTRACT(doc, '$.roundId'))");
    ensureGeneratedColumn($pdo, $casinoBetsTable, 'request_id_idx', "NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.requestId')), '')");
    ensureIndex($pdo, $casinoBetsTable, 'idx_casino_bets_user_created', '`user_id_idx`, `created_at`');

    if (hasDuplicateRoundIds($pdo, $casinoBetsTable)) {
        echo "Skipping unique index on {$casinoBetsTable}.round_id_idx because duplicate roundId values exist\n";
        ensureIndex($pdo, $casinoBetsTable, 'idx_casino_bets_round_id', '`round_id_idx`');
    } else {
        ensureIndex($pdo, $casinoBetsTable, 'uq_casino_bets_round_id', '`round_id_idx`', true);
    }

    if (hasDuplicateUserRequestIds($pdo, $casinoBetsTable)) {
        echo "Skipping unique index on {$casinoBetsTable}(user_id_idx, request_id_idx) because duplicate requestId values exist\n";
        ensureIndex($pdo, $casinoBetsTable, 'idx_casino_bets_user_request', '`user_id_idx`, `request_id_idx`');
    } else {
        ensureIndex($pdo, $casinoBetsTable, 'uq_casino_bets_user_request', '`user_id_idx`, `request_id_idx`', true);
    }

    ensureGeneratedColumn($pdo, $transactionsTable, 'user_id_idx', "JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId'))");
    ensureGeneratedColumn($pdo, $transactionsTable, 'entry_group_id_idx', "JSON_UNQUOTE(JSON_EXTRACT(doc, '$.entryGroupId'))");
    ensureIndex($pdo, $transactionsTable, 'idx_transactions_user_created', '`user_id_idx`, `created_at`');
    ensureIndex($pdo, $transactionsTable, 'idx_transactions_entry_group', '`entry_group_id_idx`');

    echo "Casino index setup complete.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Casino index setup failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
