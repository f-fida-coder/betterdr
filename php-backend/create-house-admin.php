<?php
/**
 * One-time script to create HOUSE admin account.
 * Run on server: php create-house-admin.php
 * Delete this file after running.
 */

require_once __DIR__ . '/src/MongoRepository.php';

use App\MongoRepository;

$password = 'House123!';
$legacyHash = password_hash($password, PASSWORD_BCRYPT);
$caseInsensitiveHash = password_hash(strtolower($password), PASSWORD_BCRYPT);
$now = MongoRepository::nowUtc();

$db = new MongoRepository();

// Check if HOUSE already exists
$existing = null;
$admins = $db->findMany('admins', []);
foreach ($admins as $admin) {
    if (strtolower(trim((string) ($admin['username'] ?? ''))) === 'house') {
        $existing = $admin;
        break;
    }
}

if ($existing !== null) {
    echo "HOUSE admin already exists (ID: " . ($existing['_id'] ?? 'unknown') . ")\n";
    exit(0);
}

$id = $db->insertOne('admins', [
    'username' => 'HOUSE',
    'password' => is_string($legacyHash) ? $legacyHash : '',
    'passwordCaseInsensitiveHash' => is_string($caseInsensitiveHash) ? $caseInsensitiveHash : '',
    'role' => 'admin',
    'status' => 'active',
    'createdAt' => $now,
    'updatedAt' => $now,
]);

echo "HOUSE admin created successfully!\n";
echo "ID: $id\n";
echo "Username: HOUSE\n";
echo "Password: $password\n";
echo "\n*** Change the password after first login! ***\n";
echo "*** Delete this script after running! ***\n";
