<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';

main();

function main(): void
{
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

    $plans = [
        'users' => [
            ['j_username', "VARCHAR(191) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) STORED"],
            ['j_phone', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.phoneNumber'))) STORED"],
            ['j_agent_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentId'))) STORED"],
            ['j_role', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.role'))) STORED"],
            ['j_status', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
            ['idx_users_j_username', ['j_username']],
            ['idx_users_j_phone', ['j_phone']],
            ['idx_users_j_agent_id', ['j_agent_id']],
            ['idx_users_j_role_status', ['j_role', 'j_status']],
        ],
        'agents' => [
            ['j_username', "VARCHAR(191) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) STORED"],
            ['j_phone', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.phoneNumber'))) STORED"],
            ['j_created_by', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdBy'))) STORED"],
            ['j_role', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.role'))) STORED"],
            ['j_status', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
            ['idx_agents_j_username', ['j_username']],
            ['idx_agents_j_phone', ['j_phone']],
            ['idx_agents_j_created_by', ['j_created_by']],
            ['idx_agents_j_role_status', ['j_role', 'j_status']],
        ],
        'bets' => [
            ['j_user_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId'))) STORED"],
            ['j_match_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.matchId'))) STORED"],
            ['j_status', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
            ['j_type', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.type'))) STORED"],
            ['idx_bets_j_user_id', ['j_user_id']],
            ['idx_bets_j_match_id', ['j_match_id']],
            ['idx_bets_j_status', ['j_status']],
            ['idx_bets_j_type', ['j_type']],
            ['idx_bets_j_user_status', ['j_user_id', 'j_status']],
        ],
        'transactions' => [
            ['j_user_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId'))) STORED"],
            ['j_type', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.type'))) STORED"],
            ['j_status', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
            ['j_reference_type', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.referenceType'))) STORED"],
            ['j_reference_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.referenceId'))) STORED"],
            ['idx_tx_j_user_id', ['j_user_id']],
            ['idx_tx_j_type', ['j_type']],
            ['idx_tx_j_status', ['j_status']],
            ['idx_tx_j_ref', ['j_reference_type', 'j_reference_id']],
        ],
        'matches' => [
            ['j_external_id', "VARCHAR(128) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.externalId'))) STORED"],
            ['j_status', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
            ['j_sport', "VARCHAR(128) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.sport'))) STORED"],
            ['j_start_time_dt', "DATETIME GENERATED ALWAYS AS (STR_TO_DATE(REPLACE(SUBSTRING(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.startTime')), ''), 'null'), 1, 19), 'T', ' '), '%Y-%m-%d %H:%i:%s')) STORED"],
            ['j_last_updated_dt', "DATETIME GENERATED ALWAYS AS (STR_TO_DATE(REPLACE(SUBSTRING(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.lastUpdated')), ''), 'null'), 1, 19), 'T', ' '), '%Y-%m-%d %H:%i:%s')) STORED"],
            ['j_score_home', "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.score.score_home')), ''), 'null'), '0') AS DECIMAL(10,2))) STORED"],
            ['j_score_away', "DECIMAL(10,2) GENERATED ALWAYS AS (CAST(COALESCE(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.score.score_away')), ''), 'null'), '0') AS DECIMAL(10,2))) STORED"],
            ['idx_matches_j_external_id', ['j_external_id']],
            ['idx_matches_j_status', ['j_status']],
            ['idx_matches_j_sport', ['j_sport']],
            ['idx_matches_j_start_time', ['j_start_time_dt']],
            ['idx_matches_j_last_updated', ['j_last_updated_dt']],
            ['idx_matches_j_status_start', ['j_status', 'j_start_time_dt']],
        ],
        'messages' => [
            ['j_from_user_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.fromUserId'))) STORED"],
            ['j_status', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
            ['idx_messages_j_from_user_id', ['j_from_user_id']],
            ['idx_messages_j_status', ['j_status']],
        ],
        'iplogs' => [
            ['j_ip', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.ip'))) STORED"],
            ['j_user_id', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId'))) STORED"],
            ['j_status', "VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status'))) STORED"],
            ['j_last_active_dt', "DATETIME GENERATED ALWAYS AS (STR_TO_DATE(REPLACE(SUBSTRING(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.lastActive')), ''), 'null'), 1, 19), 'T', ' '), '%Y-%m-%d %H:%i:%s')) STORED"],
            ['idx_iplogs_j_ip', ['j_ip']],
            ['idx_iplogs_j_user_last_active', ['j_user_id', 'j_last_active_dt']],
            ['idx_iplogs_j_status_last_active', ['j_status', 'j_last_active_dt']],
            ['idx_iplogs_j_last_active', ['j_last_active_dt']],
        ],
    ];

    foreach ($plans as $rawTable => $ops) {
        $table = $prefix . $rawTable;
        if (!tableExists($pdo, $db, $table)) {
            continue;
        }
        fwrite(STDOUT, "Optimizing {$table}\n");
        foreach ($ops as $op) {
            if (is_array($op[1])) {
                [$indexName, $columns] = $op;
                ensureIndex($pdo, $db, $table, (string) $indexName, $columns);
            } else {
                [$columnName, $definition] = $op;
                ensureColumn($pdo, $db, $table, (string) $columnName, (string) $definition);
            }
        }
    }
}

function tableExists(PDO $pdo, string $db, string $table): bool
{
    $sql = "SELECT 1 FROM information_schema.tables WHERE table_schema = :db AND table_name = :tbl LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':db' => $db, ':tbl' => $table]);
    return (bool) $stmt->fetchColumn();
}

function columnExists(PDO $pdo, string $db, string $table, string $column): bool
{
    $sql = "SELECT 1 FROM information_schema.columns WHERE table_schema = :db AND table_name = :tbl AND column_name = :col LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':db' => $db, ':tbl' => $table, ':col' => $column]);
    return (bool) $stmt->fetchColumn();
}

function indexExists(PDO $pdo, string $db, string $table, string $index): bool
{
    $sql = "SELECT 1 FROM information_schema.statistics WHERE table_schema = :db AND table_name = :tbl AND index_name = :idx LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':db' => $db, ':tbl' => $table, ':idx' => $index]);
    return (bool) $stmt->fetchColumn();
}

function ensureColumn(PDO $pdo, string $db, string $table, string $column, string $definition): void
{
    if (columnExists($pdo, $db, $table, $column)) {
        return;
    }
    $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
}

function ensureIndex(PDO $pdo, string $db, string $table, string $index, array $columns): void
{
    if (indexExists($pdo, $db, $table, $index)) {
        return;
    }
    $quoted = array_map(static fn (string $c): string => "`{$c}`", $columns);
    $pdo->exec("ALTER TABLE `{$table}` ADD INDEX `{$index}` (" . implode(', ', $quoted) . ")");
}
