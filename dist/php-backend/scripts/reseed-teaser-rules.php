<?php

/**
 * One-shot migration: overwrite the betmoderules row for `mode = teaser`
 * with the current BetModeRules::DEFAULT_TEASER_TYPES + DEFAULT_RULES
 * fallback values.
 *
 * Why this script exists: BetsController::ensureBetModeRulesSeeded only
 * inserts a teaser row when none exists. Once seeded, edits to the PHP
 * defaults never propagate to production. This script forces the row to
 * match the current seed (idempotent — safe to run multiple times).
 *
 * Usage:
 *   php php-backend/scripts/reseed-teaser-rules.php
 *
 * Output: prints before/after counts of teaserTypes + the resulting
 * multiplier tables so the operator can confirm the change took effect.
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/SqlRepository.php';
require_once __DIR__ . '/../src/BetModeRules.php';

$projectRoot = dirname(__DIR__, 2);
$phpBackendDir = dirname(__DIR__);
Env::load($projectRoot, $phpBackendDir);

try {
    $repo = new SqlRepository(
        'mysql-native',
        (string) Env::get('MYSQL_DB', Env::get('DB_NAME', 'sports_betting'))
    );

    $existing = $repo->findOne('betmoderules', ['mode' => 'teaser']);
    $existingTypes = is_array($existing['teaserTypes'] ?? null) ? $existing['teaserTypes'] : [];
    echo "Before: betmoderules.teaser has " . count($existingTypes) . " teaserTypes.\n";
    if ($existing !== null) {
        $oldFallback = $existing['payoutProfile']['multipliers'] ?? [];
        echo "  Legacy fallback multipliers: " . json_encode($oldFallback) . "\n";
    }

    $fresh = BetModeRules::getDefault('teaser');
    if ($fresh === null) {
        fwrite(STDERR, "ERROR: BetModeRules::getDefault('teaser') returned null.\n");
        exit(1);
    }

    $now = SqlRepository::nowUtc();
    $payload = array_merge($fresh, [
        'updatedAt' => $now,
    ]);
    if ($existing === null) {
        $payload['createdAt'] = $now;
    }

    $repo->updateOneUpsert(
        'betmoderules',
        ['mode' => 'teaser'],
        $payload,
        $payload
    );

    $after = $repo->findOne('betmoderules', ['mode' => 'teaser']);
    $afterTypes = is_array($after['teaserTypes'] ?? null) ? $after['teaserTypes'] : [];
    echo "After:  betmoderules.teaser has " . count($afterTypes) . " teaserTypes.\n";
    foreach ($afterTypes as $type) {
        $id = $type['id'] ?? '?';
        $label = $type['label'] ?? '?';
        $mults = $type['payoutProfile']['multipliers'] ?? [];
        echo "  - {$id} ({$label}): " . json_encode($mults) . "\n";
    }
    $newFallback = $after['payoutProfile']['multipliers'] ?? [];
    echo "  Legacy fallback multipliers: " . json_encode($newFallback) . "\n";
    echo "Done.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "ERROR: " . $e->getMessage() . "\n");
    exit(1);
}
