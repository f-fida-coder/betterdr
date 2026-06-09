<?php

/**
 * Read-only sanity test for the TheSportsDB proxy match-acceptance
 * logic. Exercises a private match-picker against scripted upstream
 * payloads, no network. The picker mirrors the production behaviour
 * after the "reject unrelated first-match" hardening:
 *   1. Exact normalized match wins.
 *   2. Otherwise the first candidate whose normalized strTeam contains
 *      the normalized query wins.
 *   3. Otherwise no match (found: false).
 *
 * Why a separate matcher copy instead of using ThesportsdbProxyController
 * directly: the controller's match logic is private + interleaved with
 * curl/cache code. Copying the rule into a test helper keeps the test
 * hermetic. The two must stay in lockstep — change one, update both.
 *
 * Usage:
 *   php php-backend/scripts/test-thesportsdb-proxy-matcher.php
 */

declare(strict_types=1);

function tsdb_normalize(string $value): string
{
    $lower = strtolower($value);
    return preg_replace('/[^a-z0-9]+/', '', $lower) ?? '';
}

/**
 * @param array<int, array<string, mixed>> $teams
 * @return array<string, mixed>|null
 */
function tsdb_pick_team(string $query, array $teams): ?array
{
    $q = tsdb_normalize($query);
    foreach ($teams as $t) {
        if (tsdb_normalize((string) ($t['strTeam'] ?? '')) === $q) return $t;
    }
    if ($q !== '') {
        foreach ($teams as $t) {
            $cand = tsdb_normalize((string) ($t['strTeam'] ?? ''));
            if ($cand !== '' && str_contains($cand, $q)) return $t;
        }
    }
    return null;
}

$passes = 0;
$failures = [];
function expect(string $label, $expected, $actual): void
{
    global $passes, $failures;
    $ok = $expected === $actual;
    if ($ok) { $passes++; echo "  ✓ {$label}\n"; return; }
    $failures[] = $label;
    echo "  ✗ {$label}\n";
    echo "      expected: " . var_export($expected, true) . "\n";
    echo "      actual:   " . var_export($actual, true) . "\n";
}

// ---- The reported regression: "Athletics" used to return Arsenal ----
echo "Athletics query — must NOT pick Arsenal\n";
$resp = [
    ['strTeam' => 'Arsenal',           'strBadge' => 'https://x/arsenal.png'],
    ['strTeam' => 'Athletic Bilbao',   'strBadge' => 'https://x/bilbao.png'],
    ['strTeam' => 'Oakland Athletics', 'strBadge' => 'https://x/oak.png'],
];
$picked = tsdb_pick_team('Athletics', $resp);
expect('picks Oakland Athletics (substring match)', 'Oakland Athletics', $picked['strTeam'] ?? null);

// ---- Exact match wins over substring ----
echo "Exact normalized match preferred over substring match\n";
$resp = [
    ['strTeam' => 'Oakland Athletics', 'strBadge' => 'https://x/oak.png'],
    ['strTeam' => 'Athletics',         'strBadge' => 'https://x/exact.png'],
];
$picked = tsdb_pick_team('Athletics', $resp);
expect('picks the exact "Athletics" row', 'Athletics', $picked['strTeam'] ?? null);

// ---- Pure false-positive: nothing contains the query, must reject ----
echo "Pure false positive — nothing contains the query, reject all\n";
$resp = [
    ['strTeam' => 'Arsenal',  'strBadge' => 'https://x/arsenal.png'],
    ['strTeam' => 'Liverpool', 'strBadge' => 'https://x/lfc.png'],
];
$picked = tsdb_pick_team('Athletics', $resp);
expect('returns null instead of Arsenal', null, $picked);

// ---- Empty upstream ----
echo "Empty upstream returns null\n";
expect('empty array → null', null, tsdb_pick_team('Anyone', []));

// ---- Normalization edges ----
echo "Normalization handles punctuation and case\n";
$resp = [
    ['strTeam' => 'St. Louis Cardinals', 'strBadge' => 'https://x/stl.png'],
];
$picked = tsdb_pick_team('St Louis Cardinals', $resp);
expect('"St Louis Cardinals" matches "St. Louis Cardinals"', 'St. Louis Cardinals', $picked['strTeam'] ?? null);

$resp = [
    ['strTeam' => 'OAKLAND ATHLETICS', 'strBadge' => 'https://x/oak.png'],
];
$picked = tsdb_pick_team('Oakland Athletics', $resp);
expect('case-insensitive exact match', 'OAKLAND ATHLETICS', $picked['strTeam'] ?? null);

// ---- Adversarial: substring shouldn't drift across teams ----
echo "Substring requirement holds even with longer team names\n";
$resp = [
    // "Real Sociedad" doesn't contain "real madrid" normalized,
    // so the matcher should NOT pick it for a Real Madrid query.
    ['strTeam' => 'Real Sociedad', 'strBadge' => 'https://x/soc.png'],
    ['strTeam' => 'Real Madrid',   'strBadge' => 'https://x/madrid.png'],
];
$picked = tsdb_pick_team('Real Madrid', $resp);
expect('exact match wins over earlier "Real" prefix', 'Real Madrid', $picked['strTeam'] ?? null);

$resp = [
    ['strTeam' => 'Real Sociedad', 'strBadge' => 'https://x/soc.png'],
];
$picked = tsdb_pick_team('Real Madrid', $resp);
expect('"Real Madrid" doesn\'t accept "Real Sociedad"', null, $picked);

// ---- Players API uses the same rule (port doesn't need extra coverage,
//      but spot-check the matcher generalizes by re-purposing the helper).
echo "Player-name matching uses the same rule\n";
$players = [
    ['strTeam' => 'Tom Brady'],   // shape-borrowed; field name doesn't matter to the helper
    ['strTeam' => 'Brady Bunch'],
];
$picked = tsdb_pick_team('Brady', $players);
expect('substring "Brady" picks first containing row', 'Tom Brady', $picked['strTeam'] ?? null);

echo "\n";
if (count($failures) > 0) {
    echo "FAIL: " . count($failures) . " assertion(s) failed ({$passes} passed)\n";
    foreach ($failures as $f) echo "  - {$f}\n";
    exit(1);
}
echo "PASS: {$passes} assertions, 0 failures\n";
exit(0);
