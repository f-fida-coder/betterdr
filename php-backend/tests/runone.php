<?php

declare(strict_types=1);

/**
 * Run a SINGLE test file in an isolated process.
 *
 * Used by run.php for suites that install a fully-mocked dependency graph
 * (mock SqlRepository / Response / Env / …) and therefore must execute in a
 * FRESH process, before the real classes are autoloaded — otherwise their
 * `if (!class_exists(...))` test doubles are skipped and the suite fatals.
 * See the ISOLATED_SUITES list in run.php.
 *
 * Usage: php tests/runone.php <path/to/SomeTest.php>
 */

require_once __DIR__ . '/TestRunner.php';

$file = $argv[1] ?? '';
if ($file === '' || !is_file($file)) {
    fwrite(STDERR, "runone.php: test file not found: {$file}\n");
    exit(2);
}

require $file;

TestRunner::summary();
exit(TestRunner::exitCode());
