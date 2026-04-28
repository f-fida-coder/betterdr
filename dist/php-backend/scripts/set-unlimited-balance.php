#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Set unlimitedBalance=true on specified agent/admin accounts.
 * Default: NJG365, NJG365MA, and the house admin.
 *
 * Dry-run by default. Use --apply to persist.
 */

$opts = getopt('', [
    'host::',
    'port::',
    'db::',
    'user::',
    'pass::',
    'usernames::',
    'apply',
    'help',
]);

if (isset($opts['help'])) {
    echo <<<TXT
Usage:
  php php-backend/scripts/set-unlimited-balance.php [options]

Options:
  --host=HOST          MySQL host (default: MYSQL_HOST env or 127.0.0.1)
  --port=PORT          MySQL port (default: MYSQL_PORT env or 3306)
  --db=NAME            MySQL database name (default: MYSQL_DB env)
  --user=USER          MySQL username (default: MYSQL_USER env)
  --pass=PASS          MySQL password (default: MYSQL_PASSWORD env)
  --usernames=LIST     Comma-separated agent usernames (default: NJG365,NJG365MA)
  --apply              Persist changes (without this flag, dry-run only)
  --help               Show this help

TXT;
    exit(0);
}

$host = trim((string) ($opts['host'] ?? getenv('MYSQL_HOST') ?: '127.0.0.1'));
$port = (int) ($opts['port'] ?? getenv('MYSQL_PORT') ?: 3306);
$db = trim((string) ($opts['db'] ?? getenv('MYSQL_DB') ?: getenv('DB_NAME') ?: ''));
$user = trim((string) ($opts['user'] ?? getenv('MYSQL_USER') ?: ''));
$pass = (string) ($opts['pass'] ?? getenv('MYSQL_PASSWORD') ?: '');
$apply = isset($opts['apply']);

$usernames = array_filter(array_map(
    fn($u) => strtoupper(trim($u)),
    explode(',', (string) ($opts['usernames'] ?? 'NJG365,NJG365MA'))
));

if ($db === '' || $user === '') {
    fwrite(STDERR, "Missing DB credentials. Provide --db/--user (or MYSQL_DB/MYSQL_USER env vars).\n");
    exit(2);
}

$dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

echo ($apply ? "[APPLY MODE]" : "[DRY-RUN]") . "\n\n";

// 1. Set unlimitedBalance on agents
foreach ($usernames as $username) {
    $sql = "SELECT id, doc FROM agents
            WHERE UPPER(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) = :username
            LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':username' => $username]);
    $row = $stmt->fetch();

    if (!$row) {
        echo "  Agent '{$username}' not found — skipping.\n";
        continue;
    }

    $doc = json_decode((string) $row['doc'], true);
    $current = $doc['unlimitedBalance'] ?? false;
    echo "  Agent '{$username}' (id={$row['id']}): unlimitedBalance = " . ($current ? 'true' : 'false') . "\n";

    if ($current) {
        echo "    -> Already unlimited, no change needed.\n";
        continue;
    }

    if ($apply) {
        $doc['unlimitedBalance'] = true;
        $newDoc = json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $update = $pdo->prepare("UPDATE agents SET doc = :doc WHERE id = :id");
        $update->execute([':doc' => $newDoc, ':id' => $row['id']]);
        echo "    -> SET unlimitedBalance = true ✓\n";
    } else {
        echo "    -> Would set unlimitedBalance = true (use --apply)\n";
    }
}

// 2. Set unlimitedBalance on house admin
$sql = "SELECT id, doc FROM admins
        WHERE JSON_UNQUOTE(JSON_EXTRACT(doc, '$.adminType')) = 'house'
           OR UPPER(JSON_UNQUOTE(JSON_EXTRACT(doc, '$.username'))) = 'HOUSE'
        LIMIT 1";
$stmt = $pdo->query($sql);
$row = $stmt->fetch();

if ($row) {
    $doc = json_decode((string) $row['doc'], true);
    $adminUsername = $doc['username'] ?? '?';
    $current = $doc['unlimitedBalance'] ?? false;
    echo "  Admin '{$adminUsername}' (house, id={$row['id']}): unlimitedBalance = " . ($current ? 'true' : 'false') . "\n";

    if (!$current) {
        if ($apply) {
            $doc['unlimitedBalance'] = true;
            $newDoc = json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $update = $pdo->prepare("UPDATE admins SET doc = :doc WHERE id = :id");
            $update->execute([':doc' => $newDoc, ':id' => $row['id']]);
            echo "    -> SET unlimitedBalance = true ✓\n";
        } else {
            echo "    -> Would set unlimitedBalance = true (use --apply)\n";
        }
    } else {
        echo "    -> Already unlimited, no change needed.\n";
    }
} else {
    echo "  House admin not found.\n";
}

echo "\nDone.\n";
