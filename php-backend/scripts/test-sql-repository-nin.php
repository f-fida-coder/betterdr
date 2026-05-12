<?php

/**
 * Regression test for SqlRepository's $nin operator.
 *
 * The reported bug: header PENDING tile read $0 even when a player had
 * an active mixed-funding bet ($1640 risk, $1000 freeplay, $640 cash).
 * Root cause: AuthController::pendingRiskForUser issued
 *
 *     'status' => ['$nin' => ['won', 'lost', 'void']]
 *
 * but SqlRepository::matchesCondition had no `$nin` branch — the
 * operator silently fell through to `return false`, so EVERY pending
 * bet was filtered out and the cash-portion sum stayed at $0. The
 * fix adds proper $nin handling that mirrors MongoDB semantics:
 *
 *   - field value IS in the expected list  → bet EXCLUDED
 *   - field value NOT in the expected list → bet INCLUDED
 *   - field absent                         → bet INCLUDED
 *
 * The test exercises matchesFilter directly via reflection (the method
 * is private) so we cover the contract without spinning up a MySQL
 * connection. Pure-PHP, no DB.
 *
 * Usage:
 *   php php-backend/scripts/test-sql-repository-nin.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/SqlRepository.php';

$passes = 0;
$failures = [];

function expect(string $label, bool $expected, bool $actual): void
{
    global $passes, $failures;
    if ($expected === $actual) {
        $passes++;
        echo "  ✓ {$label}\n";
        return;
    }
    $failures[] = $label;
    echo "  ✗ {$label}\n";
    echo "      expected: " . ($expected ? 'true' : 'false') . "\n";
    echo "      actual:   " . ($actual ? 'true' : 'false') . "\n";
}

// Build a SqlRepository instance without invoking its constructor —
// matchesFilter doesn't touch any instance state so a bare clone works
// fine. Avoids needing a real PDO / config to test the filter logic.
$reflection = new ReflectionClass('SqlRepository');
$repo = $reflection->newInstanceWithoutConstructor();
$matchesFilter = $reflection->getMethod('matchesFilter');
// setAccessible(true) is a no-op on PHP 8.1+ but is required for older
// runtimes still in CI rotation. Suppress the 8.5 deprecation notice
// (which has no actual effect) without changing behavior.
@$matchesFilter->setAccessible(true);

$check = fn (array $doc, array $filter): bool =>
    (bool) $matchesFilter->invoke($repo, $doc, $filter);

echo "Basic \$nin semantics:\n";
expect(
    "status='pending' passes \$nin ['won','lost','void']",
    true,
    $check(['status' => 'pending'], ['status' => ['$nin' => ['won', 'lost', 'void']]])
);
expect(
    "status='won' fails \$nin ['won','lost','void']",
    false,
    $check(['status' => 'won'], ['status' => ['$nin' => ['won', 'lost', 'void']]])
);
expect(
    "status='lost' fails \$nin ['won','lost','void']",
    false,
    $check(['status' => 'lost'], ['status' => ['$nin' => ['won', 'lost', 'void']]])
);
expect(
    "status='void' fails \$nin ['won','lost','void']",
    false,
    $check(['status' => 'void'], ['status' => ['$nin' => ['won', 'lost', 'void']]])
);

echo "\nEdge cases:\n";
expect(
    "missing field passes \$nin (MongoDB semantics: absent = matches)",
    true,
    $check([], ['status' => ['$nin' => ['won', 'lost', 'void']]])
);
expect(
    "empty \$nin array passes (no exclusion possible)",
    true,
    $check(['status' => 'pending'], ['status' => ['$nin' => []]])
);
expect(
    "non-array \$nin condition fails (mirrors \$in's defensive guard)",
    false,
    $check(['status' => 'pending'], ['status' => ['$nin' => 'pending']])
);

echo "\nThe original reported scenario (pendingRiskForUser query):\n";
$pendingMixed = ['status' => 'pending', 'riskAmount' => 1640, 'freeplayAmountUsed' => 1000];
$wonMixed     = ['status' => 'won',     'riskAmount' => 1640, 'freeplayAmountUsed' => 1000];
$lostCash     = ['status' => 'lost',    'riskAmount' => 500,  'freeplayAmountUsed' => 0];
expect(
    "pending mixed-FP bet is included in pendingRiskForUser filter",
    true,
    $check($pendingMixed, ['status' => ['$nin' => ['won', 'lost', 'void']]])
);
expect(
    "won bet is excluded",
    false,
    $check($wonMixed, ['status' => ['$nin' => ['won', 'lost', 'void']]])
);
expect(
    "lost bet is excluded",
    false,
    $check($lostCash, ['status' => ['$nin' => ['won', 'lost', 'void']]])
);

echo "\nDoes NOT regress sibling operators (\$in / \$ne unchanged):\n";
expect(
    "\$in still works",
    true,
    $check(['status' => 'pending'], ['status' => ['$in' => ['pending', 'graded']]])
);
expect(
    "\$ne still works",
    true,
    $check(['status' => 'pending'], ['status' => ['$ne' => 'won']])
);
expect(
    "\$ne excludes match",
    false,
    $check(['status' => 'won'], ['status' => ['$ne' => 'won']])
);

echo "\n" . count(array_filter([$passes])) . " — {$passes} passed";
if ($failures !== []) {
    echo ", " . count($failures) . " FAILED";
    echo "\nFAILED:\n";
    foreach ($failures as $f) {
        echo "  - {$f}\n";
    }
    echo "\n";
    exit(1);
}
echo ".\n";
exit(0);
