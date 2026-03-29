<?php
/**
 * One-time script to sync agentPercent between linked MA ↔ agent pairs.
 * E.g., AVL365MA and AVL365 are the same person — their commission should match.
 * The MA version's agentPercent is treated as the source of truth.
 *
 * Run on server: php sync-linked-agents.php
 * Safe to run multiple times — only updates if values differ.
 */

require_once __DIR__ . '/src/MongoRepository.php';

use App\MongoRepository;

$db = new MongoRepository();

$allAgents = $db->findMany('agents', []);
$agentsByUsername = [];
foreach ($allAgents as $agent) {
    $username = strtoupper(trim((string) ($agent['username'] ?? '')));
    if ($username !== '') {
        $agentsByUsername[$username] = $agent;
    }
}

$synced = 0;
$skipped = 0;

foreach ($agentsByUsername as $username => $agent) {
    $role = strtolower(trim((string) ($agent['role'] ?? '')));

    // Only process master agents — they are the source of truth
    if ($role !== 'master_agent' && $role !== 'super_agent') {
        continue;
    }
    if (!str_ends_with($username, 'MA')) {
        continue;
    }

    $baseUsername = substr($username, 0, -2);
    if (!isset($agentsByUsername[$baseUsername])) {
        echo "SKIP $username — no linked agent '$baseUsername' found\n";
        $skipped++;
        continue;
    }

    $linked = $agentsByUsername[$baseUsername];
    $maPercent = $agent['agentPercent'] ?? null;
    $maRate = $agent['playerRate'] ?? null;
    $linkedPercent = $linked['agentPercent'] ?? null;
    $linkedRate = $linked['playerRate'] ?? null;

    $needsSync = false;
    $updates = ['updatedAt' => MongoRepository::nowUtc()];

    if ($maPercent !== null && (float) $maPercent !== (float) ($linkedPercent ?? -1)) {
        $updates['agentPercent'] = (float) $maPercent;
        $needsSync = true;
    }
    if ($maRate !== null && (float) $maRate !== (float) ($linkedRate ?? -1)) {
        $updates['playerRate'] = (float) $maRate;
        $needsSync = true;
    }

    if (!$needsSync) {
        echo "OK   $username ↔ $baseUsername — already in sync (agentPercent={$maPercent}%, playerRate=\${$maRate})\n";
        continue;
    }

    $linkedId = (string) ($linked['id'] ?? '');
    if ($linkedId === '') {
        echo "SKIP $username — linked agent '$baseUsername' has no ID\n";
        $skipped++;
        continue;
    }

    $db->updateOne('agents', ['id' => MongoRepository::id($linkedId)], $updates);
    $synced++;

    $newPct = $updates['agentPercent'] ?? $linkedPercent;
    $newRate = $updates['playerRate'] ?? $linkedRate;
    echo "SYNC $username ({$maPercent}%) → $baseUsername (was {$linkedPercent}%, now {$newPct}%)\n";
}

echo "\nDone. Synced: $synced, Skipped: $skipped, Total MA agents checked: " . count(array_filter($agentsByUsername, fn($a) => str_ends_with(strtoupper(trim((string) ($a['username'] ?? ''))), 'MA'))) . "\n";
