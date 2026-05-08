<?php

declare(strict_types=1);

/**
 * Test entry point — runs all test suites.
 * Usage: php tests/run.php
 */

require_once __DIR__ . '/TestRunner.php';

$testFiles = glob(__DIR__ . '/*Test.php') ?: [];
sort($testFiles);

foreach ($testFiles as $file) {
    require_once $file;
}

TestRunner::summary();
exit(TestRunner::exitCode());
