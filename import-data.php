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

$sqlGzFile = __DIR__ . '/u487877829_better_dr_ready.sql.gz';
$user = 'u487877829_bettordr';
$pass = 'Bettor.ok12';
$db   = 'u487877829_better_dr';
$host = 'localhost';

echo "=== BETTERDR DATA IMPORTER ===\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

if (!file_exists($sqlGzFile)) {
    echo "❌ ERROR: $sqlGzFile not found.\n";
    echo "Upload u487877829_better_dr_ready.sql.gz to public_html/ via File Manager first.\n";
    exit(1);
}

echo "File: $sqlGzFile\n";
echo "Size: " . round(filesize($sqlGzFile) / 1024 / 1024, 1) . " MB\n\n";

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
echo "Disabling foreign key + uniqueness checks for faster import...\n";
$pdo->exec("SET FOREIGN_KEY_CHECKS=0");
$pdo->exec("SET UNIQUE_CHECKS=0");
$pdo->exec("SET autocommit=0");
$pdo->beginTransaction();

$fp = gzopen($sqlGzFile, 'rb');
if (!$fp) {
    echo "❌ Cannot open $sqlGzFile\n";
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

while (!gzeof($fp)) {
    $line = gzgets($fp, 1024 * 1024);
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
gzclose($fp);

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
