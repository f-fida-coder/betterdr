<?php

declare(strict_types=1);

/**
 * Minimal self-contained test runner — no PHPUnit required.
 *
 * Usage:
 *   php tests/run.php
 *
 * Each test file calls TestRunner::run(string $suite, Closure $fn).
 * Inside $fn, use TestRunner::assert*() methods.
 * Exit code 0 = all pass, 1 = at least one failure.
 */
final class TestRunner
{
    private static int $passed  = 0;
    private static int $failed  = 0;
    private static int $skipped = 0;
    /** @var string[] */
    private static array $failures = [];
    private static string $currentSuite = '';

    // ── Suite registration ────────────────────────────────────────────────────

    public static function run(string $suite, Closure $fn): void
    {
        self::$currentSuite = $suite;
        echo "\n  \033[1;34m» {$suite}\033[0m\n";
        try {
            $fn();
        } catch (Throwable $e) {
            self::fail('Uncaught exception in suite: ' . $e->getMessage());
        }
        self::$currentSuite = '';
    }

    // ── Assertions ────────────────────────────────────────────────────────────

    public static function assertEquals(mixed $expected, mixed $actual, string $label = ''): void
    {
        if ($expected === $actual) {
            self::pass($label ?: "assertEquals({$expected})");
            return;
        }
        self::fail(($label ?: 'assertEquals') . " → expected " . self::repr($expected) . ", got " . self::repr($actual));
    }

    public static function assertEqualsFloat(float $expected, float $actual, string $label = '', float $delta = 0.01): void
    {
        if (abs($expected - $actual) <= $delta) {
            self::pass($label ?: "assertEqualsFloat({$expected})");
            return;
        }
        self::fail(($label ?: 'assertEqualsFloat') . " → expected {$expected}, got {$actual} (delta {$delta})");
    }

    public static function assertTrue(mixed $value, string $label = ''): void
    {
        if ($value === true) {
            self::pass($label ?: 'assertTrue');
            return;
        }
        self::fail(($label ?: 'assertTrue') . ' → got ' . self::repr($value));
    }

    public static function assertFalse(mixed $value, string $label = ''): void
    {
        if ($value === false) {
            self::pass($label ?: 'assertFalse');
            return;
        }
        self::fail(($label ?: 'assertFalse') . ' → got ' . self::repr($value));
    }

    public static function assertNull(mixed $value, string $label = ''): void
    {
        if ($value === null) {
            self::pass($label ?: 'assertNull');
            return;
        }
        self::fail(($label ?: 'assertNull') . ' → got ' . self::repr($value));
    }

    public static function assertNotNull(mixed $value, string $label = ''): void
    {
        if ($value !== null) {
            self::pass($label ?: 'assertNotNull');
            return;
        }
        self::fail(($label ?: 'assertNotNull') . ' → got null');
    }

    public static function assertContains(mixed $needle, array $haystack, string $label = ''): void
    {
        if (in_array($needle, $haystack, true)) {
            self::pass($label ?: "assertContains({$needle})");
            return;
        }
        self::fail(($label ?: 'assertContains') . " → {$needle} not in [" . implode(', ', array_map([self::class, 'repr'], $haystack)) . ']');
    }

    public static function skip(string $reason): void
    {
        self::$skipped++;
        echo "    \033[33m⊘ SKIP\033[0m  {$reason}\n";
    }

    // ── Summary ───────────────────────────────────────────────────────────────

    public static function summary(): void
    {
        $total = self::$passed + self::$failed;
        echo "\n";
        echo "  ────────────────────────────────────────\n";
        if (self::$failed === 0) {
            echo "  \033[1;32m✓ All {$total} assertions passed\033[0m";
        } else {
            echo "  \033[1;31m✗ " . self::$failed . " failed / {$total} total\033[0m";
        }
        if (self::$skipped > 0) {
            echo "  (" . self::$skipped . " skipped)";
        }
        echo "\n\n";

        if (self::$failures !== []) {
            echo "  \033[1;31mFailures:\033[0m\n";
            foreach (self::$failures as $f) {
                echo "    • {$f}\n";
            }
            echo "\n";
        }
    }

    public static function exitCode(): int
    {
        return self::$failed > 0 ? 1 : 0;
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private static function pass(string $label): void
    {
        self::$passed++;
        echo "    \033[32m✓\033[0m  {$label}\n";
    }

    private static function fail(string $message): void
    {
        self::$failed++;
        $full = (self::$currentSuite !== '' ? '[' . self::$currentSuite . '] ' : '') . $message;
        self::$failures[] = $full;
        echo "    \033[31m✗\033[0m  {$message}\n";
    }

    private static function repr(mixed $v): string
    {
        if (is_string($v)) return '"' . $v . '"';
        if (is_bool($v))   return $v ? 'true' : 'false';
        if (is_null($v))   return 'null';
        if (is_array($v))  return 'array(' . count($v) . ')';
        return (string) $v;
    }
}
