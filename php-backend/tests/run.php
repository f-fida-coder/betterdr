<?php

declare(strict_types=1);

/**
 * Test entry point — runs all test suites.
 * Usage: php tests/run.php
 *
 * Most suites are pure-function tests that run together in this process
 * against the REAL classes. A few stand up a fully-mocked dependency graph to
 * drive a real controller without a database; those must run in a fresh
 * process (see ISOLATED_SUITES + runone.php) so their test doubles win class
 * resolution. Exit code 0 = all pass, 1 = at least one failure.
 */

require_once __DIR__ . '/TestRunner.php';

// Suites that REQUIRE their own process (mock SqlRepository/Response/Env/…).
// Running them in the shared process would skip their mocks — the real classes
// are already autoloaded — and fatal (e.g. Response::reset() not found).
const ISOLATED_SUITES = [
    'BaccaratCardCodeTest.php',     // mocks CasinoController deps to test the baccarat-classic card-code adapter sans DB
    'BaccaratFairnessTest.php',     // mocks CasinoController deps (mutable Env secret) to test the commit-reveal seeded shoe sans DB
    'BaccaratPayoutTest.php',       // mocks CasinoController deps to test calculateBaccaratPayout sans DB
    'JurassicRunMathTest.php',      // mocks Response/SqlRepository to test CasinoController::spin sans DB
    'ManualBetGradingTest.php',     // needs an INSTANCE-method SqlRepository double for the grading money block
    'ManualBetPlacementTest.php',   // needs an INSTANCE-method SqlRepository double for the placement money block
    'OddsApiCardMarketsTest.php',   // needs an INSTANCE-method SqlRepository double (shared-process stub is static-only)
    'SqlRepositoryMergeTest.php',   // loads the REAL SqlRepository (would fatal-redeclare against shared-process stubs)
];

$testFiles = glob(__DIR__ . '/*Test.php') ?: [];
sort($testFiles);

foreach ($testFiles as $file) {
    if (in_array(basename($file), ISOLATED_SUITES, true)) {
        continue;
    }
    require_once $file;
}

TestRunner::summary();
$inProcessExit = TestRunner::exitCode();

// Fold in each isolated suite, run in its own process.
$isolatedFailed = 0;
foreach (ISOLATED_SUITES as $name) {
    $path = __DIR__ . '/' . $name;
    if (!is_file($path)) {
        continue;
    }
    echo "\n  \033[1;35m▶ isolated process: {$name}\033[0m\n";
    $cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/runone.php') . ' ' . escapeshellarg($path);
    passthru($cmd, $code);
    if ($code !== 0) {
        $isolatedFailed++;
    }
}

exit(($inProcessExit !== 0 || $isolatedFailed > 0) ? 1 : 0);
