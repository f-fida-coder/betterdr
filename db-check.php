<?php
// TEMPORARY DIAGNOSTIC — DELETE AFTER FIXING THE DB CONNECTION.
// Shows exactly why the production DB connection is failing.
// Hits this URL: https://bettorplays247.com/db-check.php

header('Content-Type: text/plain; charset=utf-8');

echo "=== BETTERDR DB DIAGNOSTIC ===\n\n";
echo "Server time: " . date('Y-m-d H:i:s') . "\n";
echo "PHP version: " . PHP_VERSION . "\n";
echo "Document root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'unknown') . "\n";
echo "Script path: " . __FILE__ . "\n\n";

// --- 1. What env file does the app think it should load? ---
$host = strtolower(trim((string) ($_SERVER['HTTP_HOST'] ?? '')));
$appEnvAuto = ($host === 'localhost' || $host === '127.0.0.1' || str_ends_with($host, '.local')) ? 'development' : 'production';
echo "Detected HTTP_HOST: $host\n";
echo "Resolved APP_ENV: $appEnvAuto\n";
$envFile = $appEnvAuto === 'production' ? '.env.production' : '.env';
echo "Will load env file: $envFile\n\n";

// --- 2. Check both env files exist & their content ---
$rootDir = __DIR__;
$backendDir = __DIR__ . '/php-backend';

$candidates = [
    "$rootDir/$envFile",
    "$backendDir/$envFile",
    "$rootDir/.env",
    "$backendDir/.env",
];

echo "--- ENV FILES ON DISK ---\n";
foreach ($candidates as $path) {
    if (file_exists($path)) {
        echo "✅ EXISTS: $path  (modified: " . date('Y-m-d H:i:s', filemtime($path)) . ")\n";
    } else {
        echo "❌ MISSING: $path\n";
    }
}
echo "\n";

// --- 3. Parse the active env file & show MYSQL keys (password masked) ---
$envPath = "$rootDir/$envFile";
$env = [];
if (file_exists($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (preg_match('/^([A-Z_][A-Z0-9_]*)=(.*)$/', $line, $m)) {
            $val = $m[2];
            if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
                $val = substr($val, 1, -1);
            }
            $env[$m[1]] = $val;
        }
    }
}

echo "--- VALUES IN $envFile ---\n";
echo "MYSQL_HOST     = " . ($env['MYSQL_HOST']     ?? '(unset)') . "\n";
echo "MYSQL_PORT     = " . ($env['MYSQL_PORT']     ?? '(unset)') . "\n";
echo "MYSQL_DB       = " . ($env['MYSQL_DB']       ?? '(unset)') . "\n";
echo "MYSQL_USER     = " . ($env['MYSQL_USER']     ?? '(unset)') . "\n";
echo "MYSQL_PASSWORD = " . (isset($env['MYSQL_PASSWORD']) ? '[set, length=' . strlen($env['MYSQL_PASSWORD']) . ']' : '(unset)') . "\n";
echo "MYSQL_PASSWORD first char = " . (isset($env['MYSQL_PASSWORD']) ? substr($env['MYSQL_PASSWORD'], 0, 1) : 'N/A') . "\n";
echo "MYSQL_PASSWORD last char  = " . (isset($env['MYSQL_PASSWORD']) ? substr($env['MYSQL_PASSWORD'], -1) : 'N/A') . "\n\n";

// --- 4. Try to connect with values from .env.production ---
echo "--- ATTEMPT 1: Connect using values from $envFile ---\n";
if (isset($env['MYSQL_HOST'], $env['MYSQL_DB'], $env['MYSQL_USER'], $env['MYSQL_PASSWORD'])) {
    try {
        $dsn = "mysql:host={$env['MYSQL_HOST']};port=" . ($env['MYSQL_PORT'] ?? 3306) . ";dbname={$env['MYSQL_DB']};charset=utf8mb4";
        $pdo = new PDO($dsn, $env['MYSQL_USER'], $env['MYSQL_PASSWORD'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5,
        ]);
        echo "✅ CONNECTED via $envFile\n";
        $cnt = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        echo "Users table count: $cnt\n";
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        echo "Tables found (" . count($tables) . "): " . implode(', ', array_slice($tables, 0, 8)) . (count($tables) > 8 ? '…' : '') . "\n";
    } catch (PDOException $e) {
        echo "❌ FAILED: " . $e->getMessage() . "\n";
        echo "   SQLSTATE: " . $e->getCode() . "\n";
    }
} else {
    echo "❌ Skipped — required MYSQL_ keys missing\n";
}
echo "\n";

// --- 5. Try hardcoded credentials (sanity check — bypass env loading) ---
echo "--- ATTEMPT 2: Hardcoded fallback (u487877829_better_dr) ---\n";
try {
    $pdo2 = new PDO(
        "mysql:host=localhost;port=3306;dbname=u487877829_better_dr;charset=utf8mb4",
        'u487877829_bettordr',
        'Bettor.ok12',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
    );
    echo "✅ CONNECTED with hardcoded creds\n";
} catch (PDOException $e) {
    echo "❌ FAILED: " . $e->getMessage() . "\n";
    echo "   SQLSTATE: " . $e->getCode() . "\n";
}
echo "\n";

echo "=== END DIAGNOSTIC — DELETE THIS FILE AFTER USE ===\n";
