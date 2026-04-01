<?php
/**
 * Migration: Move all agents/entities from FIDA admin to HOUSE admin.
 * FIDA remains as an admin but with no tree (no agents under it).
 * HOUSE becomes the sole operational admin with the full hierarchy.
 *
 * Run on server: php migrate-fida-to-house.php
 * Safe to run multiple times — skips already-migrated records.
 */

require_once __DIR__ . '/src/SqlRepository.php';

use App\SqlRepository;

$db = new SqlRepository();
$now = SqlRepository::nowUtc();

// 1. Find FIDA and HOUSE admin records
$admins = $db->findMany('admins', []);
$fida = null;
$house = null;

foreach ($admins as $admin) {
    $username = strtolower(trim((string) ($admin['username'] ?? '')));
    if ($username === 'fida') {
        $fida = $admin;
    } elseif ($username === 'house') {
        $house = $admin;
    }
}

if ($fida === null) {
    echo "ERROR: FIDA admin not found.\n";
    exit(1);
}
if ($house === null) {
    echo "ERROR: HOUSE admin not found. Run create-house-admin.php first.\n";
    exit(1);
}

$fidaId = (string) ($fida['id'] ?? '');
$houseId = (string) ($house['id'] ?? '');

echo "FIDA admin ID: $fidaId (username: " . ($fida['username'] ?? '') . ")\n";
echo "HOUSE admin ID: $houseId (username: " . ($house['username'] ?? '') . ")\n\n";

// 2. Find all agents created by FIDA
$allAgents = $db->findMany('agents', []);
$fidaAgents = [];
foreach ($allAgents as $agent) {
    $createdBy = (string) ($agent['createdBy'] ?? '');
    $createdByModel = (string) ($agent['createdByModel'] ?? '');
    if ($createdBy === $fidaId && $createdByModel === 'Admin') {
        $fidaAgents[] = $agent;
    }
}

echo "Found " . count($fidaAgents) . " agents under FIDA to migrate to HOUSE.\n\n";

if (count($fidaAgents) === 0) {
    echo "Nothing to migrate — no agents under FIDA.\n";
} else {
    foreach ($fidaAgents as $agent) {
        $agentId = (string) ($agent['id'] ?? '');
        $agentUsername = $agent['username'] ?? '?';

        $db->updateOne('agents', ['id' => SqlRepository::id($agentId)], [
            'createdBy' => SqlRepository::id($houseId),
            'updatedAt' => $now,
        ]);

        echo "MIGRATED: $agentUsername ($agentId) — createdBy: FIDA → HOUSE\n";
    }
    echo "\nAll agents migrated from FIDA to HOUSE.\n";
}

// 3. Update HOUSE admin with proper fields if not already set
$houseUpdates = [];
if (($house['adminType'] ?? '') !== 'house') {
    $houseUpdates['adminType'] = 'house';
}
if (!isset($house['agentPercent']) || (float) ($house['agentPercent'] ?? 0) !== 5.0) {
    $houseUpdates['agentPercent'] = 5;
}
if (!isset($house['isSuperAdmin'])) {
    $houseUpdates['isSuperAdmin'] = true;
}
if (!isset($house['balance'])) {
    $houseUpdates['balance'] = 0;
    $houseUpdates['totalCommissionEarned'] = 0;
    $houseUpdates['totalDeposits'] = 0;
    $houseUpdates['totalWithdrawals'] = 0;
}

if (count($houseUpdates) > 0) {
    $houseUpdates['updatedAt'] = $now;
    $db->updateOne('admins', ['id' => SqlRepository::id($houseId)], $houseUpdates);
    echo "\nHOUSE admin updated: " . implode(', ', array_keys($houseUpdates)) . "\n";
}

// 4. Mark FIDA as non-operational (keeps login but no tree)
$fidaUpdates = [];
if (($fida['adminType'] ?? '') !== 'readonly') {
    $fidaUpdates['adminType'] = 'readonly';
}
if (count($fidaUpdates) > 0) {
    $fidaUpdates['updatedAt'] = $now;
    $db->updateOne('admins', ['id' => SqlRepository::id($fidaId)], $fidaUpdates);
    echo "FIDA admin marked as readonly (adminType: 'readonly')\n";
}

echo "\nDone. FIDA can still log in and view everything, but has no tree.\n";
echo "HOUSE is the operational admin with the full agent hierarchy.\n";
