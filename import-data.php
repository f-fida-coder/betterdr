<?php
// TEMPORARY IMPORTER — DELETE AFTER USE.
// Imports a gzipped SQL dump into the prod DB with no execution-time limit.
// Bypasses both SSH and phpMyAdmin's silent timeout.
//
// HOW TO USE:
//   1. Upload u487877829_better_dr_ready.sql.gz to public_html/ via Hostinger File Manager
//   2. Visit https://bettorplays247.com/import-data.php
//   3. Watch the progress (browser tab will show output as it runs)
//   4. When you see "=== IMPORT COMPLETE ===", delete this file AND the .sql.gz file

set_time_limit(0);
ignore_user_abort(true);
ini_set('memory_limit', '512M');
header('Content-Type: text/plain; charset=utf-8');

// Try whichever file is present. Order = preferred first.
$candidates = [
    __DIR__ . '/u487877829_better_dr_ready.sql.gz',
    __DIR__ . '/u487877829_better_dr_ready.sql',
    __DIR__ . '/u487877829_bettor_bets_24.sql.gz',
    __DIR__ . '/u487877829_bettor_bets_24.sql',
];
$sqlFile = null;
foreach ($candidates as $c) {
    if (file_exists($c)) { $sqlFile = $c; break; }
}

$user = 'u487877829_bettordr';
$pass = 'Bettor.ok12';
$db   = 'u487877829_better_dr';
$host = 'localhost';

echo "=== BETTERDR DATA IMPORTER ===\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

if ($sqlFile === null) {
    echo "❌ ERROR: no SQL backup file found in public_html/.\n";
    echo "Looked for any of:\n";
    foreach ($candidates as $c) echo "  - " . basename($c) . "\n";
    echo "Upload one of these to public_html/ via File Manager first.\n";
    exit(1);
}

$isGz = str_ends_with($sqlFile, '.gz');
echo "File: $sqlFile\n";
echo "Size: " . round(filesize($sqlFile) / 1024 / 1024, 1) . " MB\n";
echo "Type: " . ($isGz ? 'gzipped' : 'plain SQL') . "\n\n";

@ob_end_flush();
@ob_implicit_flush(true);
while (ob_get_level() > 0) ob_end_flush();

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    echo "❌ Cannot connect to DB: " . $e->getMessage() . "\n";
    exit(1);
}

echo "✅ Connected to DB\n\n";

// Drop all existing tables so the imported CREATE TABLE statements don't conflict.
// (The original backup file doesn't include DROP TABLE IF EXISTS.)
echo "Dropping existing tables in $db (so imported CREATE TABLE statements succeed)...\n";
$pdo->exec("SET FOREIGN_KEY_CHECKS=0");
$existing = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo "  Found " . count($existing) . " existing tables.\n";
foreach ($existing as $t) {
    try {
        $pdo->exec("DROP TABLE IF EXISTS `$t`");
    } catch (PDOException $e) {
        echo "  drop $t failed: " . $e->getMessage() . "\n";
    }
}
// Drop views too (some installs have views like vw_platform_summary)
$views = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'VIEW'")->fetchAll(PDO::FETCH_COLUMN);
foreach ($views as $v) {
    try { $pdo->exec("DROP VIEW IF EXISTS `$v`"); } catch (PDOException $e) {}
}
echo "  Cleared.\n\n";

echo "Disabling foreign key + uniqueness checks for faster import...\n";
$pdo->exec("SET UNIQUE_CHECKS=0");
$pdo->exec("SET autocommit=0");
$pdo->beginTransaction();

$fp = $isGz ? gzopen($sqlFile, 'rb') : fopen($sqlFile, 'rb');
if (!$fp) {
    echo "❌ Cannot open $sqlFile\n";
    exit(1);
}

$buffer = '';
$stmtCount = 0;
$errorCount = 0;
$insertRowsApprox = 0;
$firstErrors = [];
$start = microtime(true);
$lastTick = $start;
$inMultilineComment = false;

echo "Starting import...\n";
echo "(Progress prints every 100 statements. Total file has ~2988 INSERTs + 42 CREATE TABLEs.)\n\n";

$eof = fn() => $isGz ? gzeof($fp) : feof($fp);
$readLine = fn() => $isGz ? gzgets($fp, 1024 * 1024) : fgets($fp, 1024 * 1024);

while (!$eof()) {
    $line = $readLine();
    if ($line === false) break;

    $trimmed = trim($line);

    if ($inMultilineComment) {
        if (str_contains($line, '*/')) $inMultilineComment = false;
        continue;
    }
    if (str_starts_with($trimmed, '/*') && !str_contains($trimmed, '*/')) {
        $inMultilineComment = true;
        continue;
    }
    if ($trimmed === '' || str_starts_with($trimmed, '--') || str_starts_with($trimmed, '#')) {
        continue;
    }

    $buffer .= $line;

    // Statement ends with ; at end of line (common case for phpMyAdmin dumps)
    if (preg_match('/;\s*$/', rtrim($line))) {
        try {
            $affected = $pdo->exec($buffer);
            $stmtCount++;
            if (str_contains(strtoupper(substr(ltrim($buffer), 0, 20)), 'INSERT')) {
                $insertRowsApprox += max(1, (int) $affected);
            }
            if ($stmtCount % 100 === 0) {
                $elapsed = round(microtime(true) - $start, 1);
                echo "[" . date('H:i:s') . "] stmts=$stmtCount  errors=$errorCount  approx_rows=$insertRowsApprox  elapsed={$elapsed}s\n";
            }
        } catch (PDOException $e) {
            $errorCount++;
            if (count($firstErrors) < 5) {
                $firstErrors[] = "stmt #$stmtCount: " . substr($e->getMessage(), 0, 250);
            }
        }
        $buffer = '';
    }
}
$isGz ? gzclose($fp) : fclose($fp);

if (trim($buffer) !== '') {
    try {
        $pdo->exec($buffer);
        $stmtCount++;
    } catch (PDOException $e) {
        $errorCount++;
        $firstErrors[] = "final stmt: " . substr($e->getMessage(), 0, 250);
    }
}

$pdo->commit();
$pdo->exec("SET FOREIGN_KEY_CHECKS=1");
$pdo->exec("SET UNIQUE_CHECKS=1");
$pdo->exec("SET autocommit=1");

$elapsed = round(microtime(true) - $start, 1);
echo "\n=== IMPORT COMPLETE ===\n";
echo "Statements executed: $stmtCount\n";
echo "Errors: $errorCount\n";
echo "Approx rows inserted: $insertRowsApprox\n";
echo "Elapsed: {$elapsed}s\n\n";

if (!empty($firstErrors)) {
    echo "--- FIRST FEW ERRORS (for diagnosis) ---\n";
    foreach ($firstErrors as $err) echo "  $err\n";
    echo "\n";
}

echo "--- TABLE COUNTS AFTER IMPORT ---\n";
$counts = $pdo->query(
    "SELECT 'users' AS tbl, COUNT(*) AS n FROM users
     UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
     UNION ALL SELECT 'casino_bets', COUNT(*) FROM casino_bets
     UNION ALL SELECT 'bets', COUNT(*) FROM bets
     UNION ALL SELECT 'matches', COUNT(*) FROM matches
     UNION ALL SELECT 'agents', COUNT(*) FROM agents
     UNION ALL SELECT 'admins', COUNT(*) FROM admins"
)->fetchAll(PDO::FETCH_ASSOC);
foreach ($counts as $row) {
    echo str_pad($row['tbl'], 18) . $row['n'] . "\n";
}

echo "\n";
echo "=== NEXT STEPS ===\n";
echo "1. If row counts look right, your data is restored.\n";
echo "2. Visit https://bettorplays247.com and try logging in.\n";
echo "3. DELETE these two files from public_html/:\n";
echo "     - import-data.php\n";
echo "     - u487877829_better_dr_ready.sql.gz\n";
echo "     - db-check.php (still around from earlier)\n";
echo "   Otherwise anyone who guesses the URL can re-run the import.\n";
