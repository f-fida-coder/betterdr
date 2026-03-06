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

        self::loadFile($projectRoot . '/env.runtime');
        self::loadFile($phpBackendDir . '/env.runtime');

        $appEnv = self::resolveAppEnv();
        $primaryEnvFile = $appEnv === 'production' ? '.env.production' : '.env';

        // Project root files are authoritative.
        // Backend-local files are fallback only to avoid accidental overrides from template/example files.
        self::loadFile($projectRoot . '/' . $primaryEnvFile, true);
        self::loadFile($phpBackendDir . '/' . $primaryEnvFile);

        // Last-chance fallbacks.
        self::loadFile($projectRoot . '/.env.copy');
        self::loadFile($phpBackendDir . '/.env.copy');

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

    private static function resolveAppEnv(): string
    {
        $explicit = strtolower(trim((string) ($_ENV['APP_ENV'] ?? $_SERVER['APP_ENV'] ?? getenv('APP_ENV') ?: '')));
        if ($explicit !== '') {
            return $explicit;
        }

        $host = strtolower(trim((string) ($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '')));
        if ($host !== '') {
            $normalizedHost = preg_replace('/:\d+$/', '', $host) ?? $host;
            if ($normalizedHost === 'localhost' || $normalizedHost === '127.0.0.1' || str_ends_with($normalizedHost, '.local')) {
                return 'development';
            }
            return 'production';
        }

        return 'development';
    }
}
