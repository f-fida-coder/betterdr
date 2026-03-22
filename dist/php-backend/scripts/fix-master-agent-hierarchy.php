#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * One-off data migration:
 * - Create a proper master-agent account (e.g. NJG365MA)
 * - Convert an incorrectly-marked master account (e.g. NJG365) to role=agent
 * - Re-link the converted agent under the new master agent
 *
 * Default run is dry-run. Use --apply to persist.
 */

function usage(): void
{
    echo <<<TXT
Usage:
  php php-backend/scripts/fix-master-agent-hierarchy.php [options]

Options:
  --host=HOST            MySQL host (default: MYSQL_HOST env or 127.0.0.1)
  --port=PORT            MySQL port (default: MYSQL_PORT env or 3306)
  --db=NAME              MySQL database name (default: MYSQL_DB/DB_NAME env)
  --user=USER            MySQL username (default: MYSQL_USER env)
  --pass=PASS            MySQL password (default: MYSQL_PASSWORD env)
  --base-agent=USERNAME  Existing agent username to convert to role=agent (default: NJG365)
  --master-agent=NAME    New master-agent username to create (default: NJG365MA)
  --apply                Persist changes (without this flag, dry-run only)
  --help                 Show this help

Examples:
  php php-backend/scripts/fix-master-agent-hierarchy.php
  php php-backend/scripts/fix-master-agent-hierarchy.php --apply --host=148.222.53.30 --db=mydb --user=myuser --pass=mypass
TXT;
    echo PHP_EOL;
}

/**
 * @return array{mongo_id: string, doc: array<string, mixed>}|null
 */
function fetchDocByUsername(PDO $pdo, string $table, string $username): ?array
{
    $sql = "SELECT mongo_id, doc
            FROM {$table}
            WHERE UPPER(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) = UPPER(:username)
            LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':username' => $username]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!is_array($row)) {
        return null;
    }

    $doc = json_decode((string) ($row['doc'] ?? '{}'), true);
    if (!is_array($doc)) {
        throw new RuntimeException("Failed to decode {$table}.doc for mongo_id={$row['mongo_id']}");
    }

    return [
        'mongo_id' => (string) ($row['mongo_id'] ?? ''),
        'doc' => $doc,
    ];
}

/**
 * @return array{mongo_id: string, doc: array<string, mixed>}|null
 */
function fetchDocById(PDO $pdo, string $table, string $mongoId): ?array
{
    $sql = "SELECT mongo_id, doc FROM {$table} WHERE mongo_id = :id LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $mongoId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!is_array($row)) {
        return null;
    }

    $doc = json_decode((string) ($row['doc'] ?? '{}'), true);
    if (!is_array($doc)) {
        throw new RuntimeException("Failed to decode {$table}.doc for mongo_id={$row['mongo_id']}");
    }

    return [
        'mongo_id' => (string) ($row['mongo_id'] ?? ''),
        'doc' => $doc,
    ];
}

function isoNow(): string
{
    return gmdate(DATE_ATOM);
}

function toMysqlDate(?string $iso): ?string
{
    if ($iso === null || trim($iso) === '') {
        return null;
    }
    $ts = strtotime($iso);
    if ($ts === false) {
        return null;
    }
    return gmdate('Y-m-d H:i:s', $ts);
}

function objectId(): string
{
    return bin2hex(random_bytes(12));
}

function normalizedRole(array $doc): string
{
    return strtolower(trim((string) ($doc['role'] ?? '')));
}

function normalizeUsername(string $value): string
{
    return strtoupper(trim($value));
}

function toFloat(mixed $value, float $fallback = 0.0): float
{
    if (is_numeric($value)) {
        return (float) $value;
    }
    return $fallback;
}

$opts = getopt('', [
    'host::',
    'port::',
    'db::',
    'user::',
    'pass::',
    'base-agent::',
    'master-agent::',
    'apply',
    'help',
]);

if (isset($opts['help'])) {
    usage();
    exit(0);
}

$host = trim((string) ($opts['host'] ?? getenv('MYSQL_HOST') ?: '127.0.0.1'));
$port = (int) ($opts['port'] ?? getenv('MYSQL_PORT') ?: 3306);
$db = trim((string) ($opts['db'] ?? getenv('MYSQL_DB') ?: getenv('DB_NAME') ?: ''));
$user = trim((string) ($opts['user'] ?? getenv('MYSQL_USER') ?: ''));
$pass = (string) ($opts['pass'] ?? getenv('MYSQL_PASSWORD') ?: '');
$baseAgentUsername = normalizeUsername((string) ($opts['base-agent'] ?? 'NJG365'));
$masterAgentUsername = normalizeUsername((string) ($opts['master-agent'] ?? 'NJG365MA'));
$apply = isset($opts['apply']);

if ($db === '' || $user === '') {
    fwrite(STDERR, "Missing DB credentials. Provide --db/--user (or MYSQL_DB/MYSQL_USER env vars)." . PHP_EOL);
    exit(2);
}

if ($baseAgentUsername === '' || $masterAgentUsername === '') {
    fwrite(STDERR, "--base-agent and --master-agent are required." . PHP_EOL);
    exit(2);
}

if ($baseAgentUsername === $masterAgentUsername) {
    fwrite(STDERR, "--base-agent and --master-agent must be different usernames." . PHP_EOL);
    exit(2);
}

$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $db);

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (Throwable $e) {
    fwrite(STDERR, 'DB connection failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

echo "Connected to {$host}:{$port}/{$db}" . PHP_EOL;
echo 'Mode: ' . ($apply ? 'APPLY' : 'DRY-RUN') . PHP_EOL;
echo "Base agent username: {$baseAgentUsername}" . PHP_EOL;
echo "Master agent username: {$masterAgentUsername}" . PHP_EOL;

try {
    $base = fetchDocByUsername($pdo, 'agents', $baseAgentUsername);
    if ($base === null) {
        throw new RuntimeException("Base agent '{$baseAgentUsername}' not found in agents table.");
    }

    $baseId = $base['mongo_id'];
    $baseDoc = $base['doc'];
    $baseRole = normalizedRole($baseDoc);

    $existingMaster = fetchDocByUsername($pdo, 'agents', $masterAgentUsername);
    if ($existingMaster !== null) {
        $existingMasterRole = normalizedRole($existingMaster['doc']);
        $alreadyLinked = $baseRole === 'agent'
            && (string) ($baseDoc['createdBy'] ?? '') === $existingMaster['mongo_id']
            && strtolower((string) ($baseDoc['createdByModel'] ?? '')) === 'agent'
            && in_array($existingMasterRole, ['master_agent', 'super_agent'], true);

        if ($alreadyLinked) {
            echo "No change needed. '{$baseAgentUsername}' is already linked under '{$masterAgentUsername}'." . PHP_EOL;
            exit(0);
        }

        throw new RuntimeException("Master username '{$masterAgentUsername}' already exists in agents with incompatible state.");
    }

    if (!in_array($baseRole, ['master_agent', 'super_agent'], true)) {
        throw new RuntimeException("Base agent '{$baseAgentUsername}' is role '{$baseRole}', expected master_agent/super_agent.");
    }

    $adminMaster = fetchDocByUsername($pdo, 'admins', $masterAgentUsername);
    $adminDoc = $adminMaster['doc'] ?? null;

    $nowIso = isoNow();

    $newMasterId = objectId();
    while (fetchDocById($pdo, 'agents', $newMasterId) !== null) {
        $newMasterId = objectId();
    }

    $newMasterDoc = $baseDoc;
    $newMasterDoc['username'] = $masterAgentUsername;
    $newMasterDoc['fullName'] = strtoupper(trim((string) ($adminDoc['fullName'] ?? $masterAgentUsername)));
    $newMasterDoc['role'] = 'master_agent';
    $newMasterDoc['displayPassword'] = null;
    $newMasterDoc['updatedAt'] = $nowIso;
    if (!isset($newMasterDoc['createdAt']) || trim((string) $newMasterDoc['createdAt']) === '') {
        $newMasterDoc['createdAt'] = $nowIso;
    }
    if (is_array($adminDoc)) {
        if (isset($adminDoc['phoneNumber']) && trim((string) $adminDoc['phoneNumber']) !== '') {
            $newMasterDoc['phoneNumber'] = (string) $adminDoc['phoneNumber'];
        }
        if (isset($adminDoc['password']) && trim((string) $adminDoc['password']) !== '') {
            $newMasterDoc['password'] = (string) $adminDoc['password'];
        }
        if (array_key_exists('passwordCaseInsensitiveHash', $adminDoc)) {
            $newMasterDoc['passwordCaseInsensitiveHash'] = $adminDoc['passwordCaseInsensitiveHash'];
        }
    }

    $updatedBaseDoc = $baseDoc;
    $updatedBaseDoc['username'] = $baseAgentUsername;
    $updatedBaseDoc['role'] = 'agent';
    $updatedBaseDoc['createdBy'] = $newMasterId;
    $updatedBaseDoc['createdByModel'] = 'Agent';
    $updatedBaseDoc['updatedAt'] = $nowIso;

    $newMasterLinkDoc = [
        'createdAt' => $newMasterDoc['createdAt'] ?? $nowIso,
        'updatedAt' => $nowIso,
        'agentId' => $newMasterId,
        'username' => $masterAgentUsername,
        'fullName' => (string) ($newMasterDoc['fullName'] ?? $masterAgentUsername),
        'phoneNumber' => (string) ($newMasterDoc['phoneNumber'] ?? ''),
        'status' => (string) ($newMasterDoc['status'] ?? 'active'),
        'balance' => toFloat($newMasterDoc['balance'] ?? 0),
        'balanceOwed' => toFloat($newMasterDoc['balanceOwed'] ?? 0),
        'defaultMinBet' => toFloat($newMasterDoc['defaultMinBet'] ?? 0),
        'defaultMaxBet' => toFloat($newMasterDoc['defaultMaxBet'] ?? 0),
        'defaultCreditLimit' => toFloat($newMasterDoc['defaultCreditLimit'] ?? 0),
        'defaultSettleLimit' => toFloat($newMasterDoc['defaultSettleLimit'] ?? 0),
        'createdBy' => $newMasterDoc['createdBy'] ?? null,
        'createdByModel' => $newMasterDoc['createdByModel'] ?? null,
        'referredByUserId' => $newMasterDoc['referredByUserId'] ?? null,
        'syncedAt' => $nowIso,
    ];

    $summary = [
        'baseAgentId' => $baseId,
        'baseAgentRoleBefore' => $baseRole,
        'newMasterAgentId' => $newMasterId,
        'newMasterUsername' => $masterAgentUsername,
        'baseAgentUsername' => $baseAgentUsername,
        'baseAgentRoleAfter' => 'agent',
        'baseAgentCreatedByAfter' => $newMasterId,
    ];

    echo "Planned migration:" . PHP_EOL;
    echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;

    if (!$apply) {
        echo "Dry-run complete. Re-run with --apply to persist." . PHP_EOL;
        exit(0);
    }

    $pdo->beginTransaction();

    $insertAgent = $pdo->prepare('
        INSERT INTO agents (mongo_id, doc, created_at, updated_at)
        VALUES (:mongo_id, :doc, :created_at, :updated_at)
    ');
    $insertAgent->execute([
        ':mongo_id' => $newMasterId,
        ':doc' => json_encode($newMasterDoc, JSON_UNESCAPED_SLASHES),
        ':created_at' => toMysqlDate((string) ($newMasterDoc['createdAt'] ?? null)),
        ':updated_at' => toMysqlDate((string) ($newMasterDoc['updatedAt'] ?? null)),
    ]);

    $updateBase = $pdo->prepare('
        UPDATE agents
        SET doc = :doc, updated_at = :updated_at
        WHERE mongo_id = :mongo_id
    ');
    $updateBase->execute([
        ':doc' => json_encode($updatedBaseDoc, JSON_UNESCAPED_SLASHES),
        ':updated_at' => toMysqlDate((string) ($updatedBaseDoc['updatedAt'] ?? null)),
        ':mongo_id' => $baseId,
    ]);

    $deleteOldMasterLinks = $pdo->prepare("
        DELETE FROM master_agents
        WHERE JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentId')) = :old_agent_id
           OR UPPER(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) = UPPER(:base_username)
    ");
    $deleteOldMasterLinks->execute([
        ':old_agent_id' => $baseId,
        ':base_username' => $baseAgentUsername,
    ]);

    $existingMasterLinkStmt = $pdo->prepare("
        SELECT mongo_id
        FROM master_agents
        WHERE JSON_UNQUOTE(JSON_EXTRACT(doc, '$.agentId')) = :agent_id
           OR UPPER(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) = UPPER(:username)
        LIMIT 1
    ");
    $existingMasterLinkStmt->execute([
        ':agent_id' => $newMasterId,
        ':username' => $masterAgentUsername,
    ]);
    $existingMasterLinkId = (string) ($existingMasterLinkStmt->fetchColumn() ?: '');

    if ($existingMasterLinkId !== '') {
        $updateMasterLink = $pdo->prepare('
            UPDATE master_agents
            SET doc = :doc, updated_at = :updated_at
            WHERE mongo_id = :mongo_id
        ');
        $updateMasterLink->execute([
            ':doc' => json_encode($newMasterLinkDoc, JSON_UNESCAPED_SLASHES),
            ':updated_at' => toMysqlDate((string) ($newMasterLinkDoc['updatedAt'] ?? null)),
            ':mongo_id' => $existingMasterLinkId,
        ]);
    } else {
        $newMasterLinkId = objectId();
        while (fetchDocById($pdo, 'master_agents', $newMasterLinkId) !== null) {
            $newMasterLinkId = objectId();
        }

        $insertMasterLink = $pdo->prepare('
            INSERT INTO master_agents (mongo_id, doc, created_at, updated_at)
            VALUES (:mongo_id, :doc, :created_at, :updated_at)
        ');
        $insertMasterLink->execute([
            ':mongo_id' => $newMasterLinkId,
            ':doc' => json_encode($newMasterLinkDoc, JSON_UNESCAPED_SLASHES),
            ':created_at' => toMysqlDate((string) ($newMasterLinkDoc['createdAt'] ?? null)),
            ':updated_at' => toMysqlDate((string) ($newMasterLinkDoc['updatedAt'] ?? null)),
        ]);
    }

    $pdo->commit();

    echo "Migration applied successfully." . PHP_EOL;

    $postCheck = $pdo->query("
        SELECT
            mongo_id,
            JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username')) AS username,
            JSON_UNQUOTE(JSON_EXTRACT(doc, '$.role')) AS role,
            JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdBy')) AS createdBy,
            JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdByModel')) AS createdByModel
        FROM agents
        WHERE UPPER(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) IN ('{$baseAgentUsername}', '{$masterAgentUsername}')
        ORDER BY username
    ")->fetchAll(PDO::FETCH_ASSOC);

    echo "Post-check (agents):" . PHP_EOL;
    echo json_encode($postCheck, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, 'Migration failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
