<?php

declare(strict_types=1);

final class Env
{
    private static bool $loaded = false;
    /** @var array<string, bool> */
    private static array $fileManagedKeys = [];

    public static function load(string $projectRoot, string $phpBackendDir): void
    {
        if (self::$loaded) {
            return;
        }

        // Prefer explicit runtime env files first (non-dotfile variants survive hosts that skip hidden files).
        self::loadFile($projectRoot . '/env.runtime');
        self::loadFile($phpBackendDir . '/env.runtime');

        // Allow .env to override runtime defaults when present.
        self::loadFile($projectRoot . '/.env', true);
        self::loadFile($phpBackendDir . '/.env', true);

        // Last-chance fallbacks.
        self::loadFile($projectRoot . '/.env.copy', true);
        self::loadFile($phpBackendDir . '/.env.copy', true);

        self::$loaded = true;
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        if ($value === false || $value === null || $value === '') {
            return $default;
        }
        return (string) $value;
    }

    private static function loadFile(string $path, bool $overwriteFromFiles = false): void
    {
        if (!is_file($path) || !is_readable($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
            $key = trim($key);
            if ($key === '') {
                continue;
            }

            $existsInEnv = array_key_exists($key, $_ENV);
            $managedByFile = isset(self::$fileManagedKeys[$key]);
            if ($existsInEnv && !$managedByFile) {
                // Respect environment values injected by the server process.
                continue;
            }
            if ($existsInEnv && !$overwriteFromFiles) {
                continue;
            }

            $value = trim($value);
            if ((str_starts_with($value, '"') && str_ends_with($value, '"')) || (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }

            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
            putenv($key . '=' . $value);
            self::$fileManagedKeys[$key] = true;
        }
    }
}
