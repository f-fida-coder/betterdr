<?php
/**
 * backup-store.php — pre-deploy snapshot of the JSON document store (MySQL).
 *
 * WHY: the "document store" is MySQL tables holding a JSON `doc` column (users,
 * transactions, bets, casino_bets, matches, …). There is currently no
 * scripted, verifiable backup taken before a deploy. On a money platform a bad
 * migration or a fat-fingered upload with no restore point is catastrophic.
 * This makes a clean, hashed, restorable snapshot one command before you ship.
 *
 * SAFETY:
 *   - READ-ONLY on the database. It issues only SHOW / SELECT. It never writes,
 *     alters, or deletes a single row. Running it cannot affect live bets,
 *     balances, or settlement.
 *   - Pure PDO — does NOT shell out to `mysqldump` (often absent on shared
 *     hosting), so it runs anywhere the app's own DB connection works,
 *     including via a cPanel terminal/one-off job on the production host.
 *   - Output is a gzipped SQL file written with 0600 perms (it contains PII +
 *     money rows) into a gitignored backups/ dir — never committed.
 *   - Streams rows unbuffered in batches, so even large tables stay light on
 *     memory.
 *
 * USAGE (run from php-backend/):
 *   php scripts/backup-store.php                 # snapshot the core money tables
 *   php scripts/backup-store.php --all           # snapshot every table in the DB
 *   php scripts/backup-store.php --tables=users,transactions
 *   php scripts/backup-store.php --dry-run       # list what would be dumped, no file
 *   php scripts/backup-store.php --keep=14       # retain 14 newest snapshots (default 7)
 *   php scripts/backup-store.php --out=/path/dir # override output directory
 *
 * RESTORE (destructive — only into a recovery/staging DB unless you mean it):
 *   gunzip -c backups/<file>.sql.gz | mysql -h HOST -P PORT -u USER -p DBNAME
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';

$projectRoot   = dirname(__DIR__, 1);
$phpBackendDir = __DIR__ . '/..';
Env::load($projectRoot, $phpBackendDir);

$opts = getopt('', ['all', 'tables:', 'dry-run', 'keep:', 'out:', 'help']);

if (isset($opts['help'])) {
    fwrite(STDOUT, file_get_contents(__FILE__, false, null, 0, 2200));
    exit(0);
}

$dryRun = isset($opts['dry-run']);
$keep   = isset($opts['keep']) ? max(1, (int) $opts['keep']) : 7;

// Core money/document tables. A bad deploy is most dangerous here. --all widens
// to every table; --tables=a,b,c overrides entirely.
$CORE = [
    'users', 'transactions', 'bets', 'casino_bets', 'matches',
    'wallets', 'withdrawals', 'deposits', 'platformsettings',
    'agents', 'agent_settlements', 'freeplay', 'outrights',
];

$host = getenv('MYSQL_HOST') ?: '127.0.0.1';
$port = getenv('MYSQL_PORT') ?: '3306';
$db   = getenv('MYSQL_DB')   ?: '';
$user = getenv('MYSQL_USER') ?: 'root';
$pass = getenv('MYSQL_PASSWORD');
$pass = ($pass === false) ? '' : $pass;
$prefix = getenv('MYSQL_TABLE_PREFIX') ?: '';

if ($db === '') {
    fwrite(STDERR, "FATAL: MYSQL_DB is not set (check your .env).\n");
    exit(1);
}

try {
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_NUM,
        ]
    );
} catch (Throwable $e) {
    fwrite(STDERR, "FATAL: cannot connect to MySQL {$host}:{$port}/{$db} as {$user} — " . $e->getMessage() . "\n");
    exit(1);
}

// Buffered-query toggle constant: renamed Pdo\Mysql::ATTR_USE_BUFFERED_QUERY in
// PHP 8.5 (old PDO::MYSQL_* name deprecated). Resolve whichever exists so this
// stays silent on 8.2 through 8.5+. Same underlying int either way.
$BUFFERED_ATTR = defined('Pdo\\Mysql::ATTR_USE_BUFFERED_QUERY')
    ? \Pdo\Mysql::ATTR_USE_BUFFERED_QUERY
    : PDO::MYSQL_ATTR_USE_BUFFERED_QUERY;

// Resolve the table set.
$existing = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
$existingSet = array_flip($existing);

if (isset($opts['tables'])) {
    $want = array_values(array_filter(array_map('trim', explode(',', (string) $opts['tables']))));
} elseif (isset($opts['all'])) {
    $want = $existing;
} else {
    $want = array_map(static fn($t) => $prefix . $t, $CORE);
}

$tables = [];
$skipped = [];
foreach ($want as $t) {
    if (isset($existingSet[$t])) {
        $tables[] = $t;
    } else {
        $skipped[] = $t;
    }
}

if (!$tables) {
    fwrite(STDERR, "FATAL: none of the requested tables exist in {$db}.\n");
    if ($skipped) {
        fwrite(STDERR, "       missing: " . implode(', ', $skipped) . "\n");
    }
    exit(1);
}

fwrite(STDOUT, "backup-store: DB={$db}  tables=" . count($tables) . (count($skipped) ? "  (skipped " . count($skipped) . " absent)" : "") . "\n");
foreach ($tables as $t) {
    fwrite(STDOUT, "  + {$t}\n");
}
foreach ($skipped as $t) {
    fwrite(STDOUT, "  - {$t}  (absent, skipped)\n");
}

if ($dryRun) {
    fwrite(STDOUT, "DRY RUN — no file written.\n");
    exit(0);
}

// Output dir (gitignored) + restrictive perms — file holds PII + money rows.
$outDir = isset($opts['out']) ? (string) $opts['out'] : ($projectRoot . '/backups');
if (!is_dir($outDir) && !mkdir($outDir, 0700, true) && !is_dir($outDir)) {
    fwrite(STDERR, "FATAL: cannot create output dir {$outDir}\n");
    exit(1);
}

$stamp   = gmdate('Ymd\THis\Z');
$base    = "{$db}__{$stamp}";
$sqlPath = "{$outDir}/{$base}.sql.gz";

$gz = gzopen($sqlPath, 'wb9');
if ($gz === false) {
    fwrite(STDERR, "FATAL: cannot open {$sqlPath} for writing.\n");
    exit(1);
}
@chmod($sqlPath, 0600);

$qid = static fn(string $name): string => '`' . str_replace('`', '``', $name) . '`';

gzwrite($gz, "-- backup-store snapshot\n");
gzwrite($gz, "-- database: {$db}\n");
gzwrite($gz, "-- taken_utc: " . gmdate('Y-m-d\TH:i:s\Z') . "\n");
gzwrite($gz, "-- tables: " . implode(', ', $tables) . "\n");
gzwrite($gz, "-- NOTE: restore is DESTRUCTIVE (DROP/CREATE). Restore into a recovery DB unless you mean it.\n\n");
gzwrite($gz, "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n");

$counts = [];
$BATCH = 200;

foreach ($tables as $t) {
    // Schema.
    $create = $pdo->query('SHOW CREATE TABLE ' . $qid($t))->fetch(PDO::FETCH_NUM);
    $createSql = $create[1] ?? null;
    if (!$createSql) {
        fwrite(STDERR, "WARN: could not read schema for {$t} — skipping.\n");
        continue;
    }
    gzwrite($gz, "\n-- ---------- table: {$t} ----------\n");
    gzwrite($gz, 'DROP TABLE IF EXISTS ' . $qid($t) . ";\n");
    gzwrite($gz, $createSql . ";\n\n");

    // Real (insertable) columns only. GENERATED/virtual columns (e.g. the j_*
    // JSON-extract columns) must NOT appear in INSERTs — MySQL rejects writing
    // a value into a generated column (ERROR 3105). Select + insert an explicit
    // non-generated column list so the dump restores cleanly.
    $colStmt = $pdo->prepare(
        'SELECT COLUMN_NAME FROM information_schema.COLUMNS '
        . 'WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? '
        . "AND (EXTRA IS NULL OR EXTRA NOT LIKE '%GENERATED%') "
        . 'ORDER BY ORDINAL_POSITION'
    );
    $colStmt->execute([$db, $t]);
    $cols = $colStmt->fetchAll(PDO::FETCH_COLUMN);
    if (!$cols) {
        fwrite(STDERR, "WARN: no insertable columns for {$t} — skipping rows.\n");
        $counts[$t] = 0;
        continue;
    }
    $colList = implode(',', array_map($qid, $cols));

    // Rows, streamed unbuffered to keep memory flat on big tables.
    $pdo->setAttribute($BUFFERED_ATTR, false);
    $stmt = $pdo->query('SELECT ' . $colList . ' FROM ' . $qid($t));
    $n = 0;
    $buf = [];
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        $vals = [];
        foreach ($row as $v) {
            if ($v === null) {
                $vals[] = 'NULL';
            } elseif (is_int($v) || is_float($v)) {
                $vals[] = (string) $v;
            } else {
                $vals[] = $pdo->quote((string) $v);
            }
        }
        $buf[] = '(' . implode(',', $vals) . ')';
        $n++;
        if (count($buf) >= $BATCH) {
            gzwrite($gz, 'INSERT INTO ' . $qid($t) . ' (' . $colList . ') VALUES' . "\n" . implode(",\n", $buf) . ";\n");
            $buf = [];
        }
    }
    if ($buf) {
        gzwrite($gz, 'INSERT INTO ' . $qid($t) . ' (' . $colList . ') VALUES' . "\n" . implode(",\n", $buf) . ";\n");
    }
    $stmt->closeCursor();
    $pdo->setAttribute($BUFFERED_ATTR, true);

    $counts[$t] = $n;
    fwrite(STDOUT, sprintf("  dumped %-28s %8d rows\n", $t, $n));
}

gzwrite($gz, "\nSET FOREIGN_KEY_CHECKS=1;\n");
gzclose($gz);

// Manifest: row counts + sha256, so a restore can be verified and tampering spotted.
$sha = hash_file('sha256', $sqlPath);
$size = filesize($sqlPath);
$manifestPath = "{$outDir}/{$base}.MANIFEST.txt";
$lines = [];
$lines[] = "snapshot      {$base}.sql.gz";
$lines[] = "database      {$db}";
$lines[] = "taken_utc     " . gmdate('Y-m-d\TH:i:s\Z');
$lines[] = "size_bytes    {$size}";
$lines[] = "sha256        {$sha}";
$lines[] = "total_rows    " . array_sum($counts);
$lines[] = "tables        " . count($counts);
$lines[] = "";
foreach ($counts as $t => $n) {
    $lines[] = sprintf("  %-30s %10d", $t, $n);
}
file_put_contents($manifestPath, implode("\n", $lines) . "\n");
@chmod($manifestPath, 0600);

// Prune to newest $keep snapshots (pair = .sql.gz + .MANIFEST.txt).
$snaps = glob("{$outDir}/{$db}__*.sql.gz") ?: [];
rsort($snaps); // newest first (timestamp sorts lexically)
$i = 0;
foreach ($snaps as $f) {
    $i++;
    if ($i <= $keep) {
        continue;
    }
    @unlink($f);
    $m = preg_replace('/\.sql\.gz$/', '.MANIFEST.txt', $f);
    if ($m && is_file($m)) {
        @unlink($m);
    }
    fwrite(STDOUT, "  pruned old snapshot: " . basename($f) . "\n");
}

$human = $size >= 1048576 ? round($size / 1048576, 1) . 'M' : round($size / 1024, 1) . 'K';
fwrite(STDOUT, "\nOK snapshot: {$sqlPath}  ({$human}, " . array_sum($counts) . " rows, sha256 " . substr($sha, 0, 12) . "…)\n");
fwrite(STDOUT, "   manifest: {$manifestPath}\n");
fwrite(STDOUT, "   restore : gunzip -c " . basename($sqlPath) . " | mysql -h HOST -P PORT -u USER -p DBNAME   (DESTRUCTIVE)\n");
exit(0);
