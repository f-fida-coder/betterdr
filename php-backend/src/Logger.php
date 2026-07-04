<?php

declare(strict_types=1);

/**
 * Structured JSON logger.
 *
 * Each line written is a valid JSON object (NDJSON), making logs trivially
 * parseable by log aggregators (Datadog, Loki, CloudWatch, etc.).
 *
 * Channels map to files under php-backend/logs/:
 *   api     → api-access.log   (every request)
 *   error   → api-errors.log   (exceptions + 4xx/5xx detail)
 *   sportsbook → sportsbook-ops.log
 *   casino  → casino-audit.log
 *
 * Usage:
 *   Logger::info('User logged in', ['userId' => $id]);
 *   Logger::error('Bet placement failed', ['betId' => $id, 'exception' => $e]);
 *   Logger::request('POST', '/api/bets', 200, 0.043, ['userId' => $id]);
 */
final class Logger
{
    private const CHANNEL_FILES = [
        'api'        => 'api-access.log',
        'error'      => 'api-errors.log',
        'sportsbook' => 'sportsbook-ops.log',
        'casino'     => 'casino-audit.log',
        // The Odds API supplemental feed (oddsapi-worker + sync services) —
        // separate file so its ops noise never mixes into the Rundown
        // sportsbook channel (failure-isolation requirement).
        'oddsapi'    => 'oddsapi.log',
    ];

    private const DEFAULT_FILE = 'api-access.log';
    private const MAX_CONTEXT_DEPTH = 6;

    /** @var string|null */
    private static ?string $logDir = null;

    /** @var string Unique ID for this request lifecycle */
    private static string $requestId = '';

    // Per-process write buffer. Each request typically emits 1-3 log lines
    // (request summary + a handful of info/warning calls); buffering them
    // in memory and flushing once at shutdown collapses N synchronous
    // fopen/fwrite/fclose cycles into one. At 88 MB of access logs in
    // ~3 weeks and 5-10 fwrites per request, this drops a meaningful
    // amount of lock contention and syscall overhead off the hot path.
    // Long-running scripts (workers, CLI) should call Logger::flush()
    // between iterations to bound memory and surface logs promptly.
    /** @var array<string, string> channel => concatenated lines */
    private static array $buffer = [];
    private static bool $shutdownRegistered = false;
    private const BUFFER_FLUSH_THRESHOLD_BYTES = 65536;

    // ── Public API ────────────────────────────────────────────────────────────

    public static function info(string $message, array $context = [], string $channel = 'api'): void
    {
        self::write('INFO', $message, $context, $channel);
    }

    public static function warning(string $message, array $context = [], string $channel = 'api'): void
    {
        self::write('WARNING', $message, $context, $channel);
    }

    public static function error(string $message, array $context = [], string $channel = 'error'): void
    {
        self::write('ERROR', $message, $context, $channel);
    }

    /**
     * Log a completed HTTP request. Call at the end of index.php (via register_shutdown_function).
     *
     * @param array<string, mixed> $context
     */
    public static function request(
        string $method,
        string $path,
        int $status,
        float $durationSec,
        array $context = []
    ): void {
        $level = $status >= 500 ? 'ERROR' : ($status >= 400 ? 'WARNING' : 'INFO');
        self::write($level, 'HTTP ' . $method . ' ' . $path . ' ' . $status, array_merge([
            'method'   => $method,
            'path'     => $path,
            'status'   => $status,
            'duration' => round($durationSec * 1000, 2), // ms
            'ip'       => self::clientIp(),
            'ua'       => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200),
        ], $context), 'api');
    }

    /**
     * Log a Throwable with full context. Writes to both the named channel and
     * the error channel (unless they are the same).
     *
     * @param array<string, mixed> $context
     */
    public static function exception(
        Throwable $e,
        string $message = '',
        array $context = [],
        string $channel = 'error'
    ): void {
        $payload = array_merge($context, [
            'exception' => get_class($e),
            'exMessage' => $e->getMessage(),
            'file'      => $e->getFile() . ':' . $e->getLine(),
            'trace'     => self::compactTrace($e),
        ]);
        self::write('ERROR', $message !== '' ? $message : $e->getMessage(), $payload, $channel);
    }

    /**
     * Initialise the log directory. Call once from index.php after Env::load().
     * If not called, Logger auto-detects a sensible default.
     */
    public static function init(string $logDir): void
    {
        self::$logDir   = rtrim($logDir, '/\\');
        self::$requestId = self::generateRequestId();
    }

    public static function getRequestId(): string
    {
        if (self::$requestId === '') {
            self::$requestId = self::generateRequestId();
        }
        return self::$requestId;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** @param array<string, mixed> $context */
    private static function write(string $level, string $message, array $context, string $channel): void
    {
        try {
            $entry = [
                'time'      => gmdate('Y-m-d\TH:i:s\Z'),
                'level'     => $level,
                'channel'   => $channel,
                'requestId' => self::getRequestId(),
                'message'   => $message,
            ];
            if ($context !== []) {
                $entry['context'] = self::sanitize($context, self::MAX_CONTEXT_DEPTH);
            }

            $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (!is_string($line) || $line === '') {
                return;
            }
            $line .= "\n";

            if (!isset(self::$buffer[$channel])) {
                self::$buffer[$channel] = '';
            }
            self::$buffer[$channel] .= $line;

            // Register one shutdown flush per process so request lifecycles
            // (and CLI scripts that don't manually flush) emit on exit.
            if (!self::$shutdownRegistered) {
                self::$shutdownRegistered = true;
                register_shutdown_function([self::class, 'flush']);
            }

            // Safety net for long-running processes (workers, smoke scripts)
            // that emit many log lines without ever returning to a shutdown
            // boundary. 64 KB ≈ 200-500 log lines depending on context size.
            if (strlen(self::$buffer[$channel]) >= self::BUFFER_FLUSH_THRESHOLD_BYTES) {
                self::flush();
            }
        } catch (Throwable $ignored) {
            // Logging must never crash the application.
        }
    }

    /**
     * Flush buffered log lines to disk. Called automatically at shutdown,
     * but long-running scripts should call this between iterations to bound
     * memory and surface logs promptly.
     */
    public static function flush(): void
    {
        if (self::$buffer === []) {
            return;
        }
        try {
            $logDir = self::resolveLogDir();
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0775, true);
            }

            foreach (self::$buffer as $channel => $combined) {
                if ($combined === '') {
                    continue;
                }
                $file = self::CHANNEL_FILES[$channel] ?? self::DEFAULT_FILE;
                $path = $logDir . '/' . $file;

                // Single fwrite per channel per flush — way cheaper than
                // one fwrite per log call. FILE_APPEND-style atomicity for
                // small writes still holds on Linux/ext4 for combined
                // buffers up to ~PIPE_BUF (4 KB); larger combined writes
                // may interleave with another process's writes, which is
                // acceptable since each line is still a complete JSON
                // object delimited by \n.
                $handle = @fopen($path, 'a');
                if ($handle === false) {
                    continue;
                }
                if (@flock($handle, LOCK_EX | LOCK_NB)) {
                    @fwrite($handle, $combined);
                    @flock($handle, LOCK_UN);
                } else {
                    // Lock contention — fall back to lockless write rather
                    // than block the request. One log line per worker may
                    // interleave; cheaper than stalling.
                    @fwrite($handle, $combined);
                }
                @fclose($handle);
            }
        } catch (Throwable $ignored) {
            // Flush failure must never crash the application.
        } finally {
            self::$buffer = [];
        }
    }

    private static function resolveLogDir(): string
    {
        if (self::$logDir !== null) {
            return self::$logDir;
        }
        // Auto-detect: walk up from this file to find php-backend/logs
        return dirname(__DIR__) . '/logs';
    }

    private static function generateRequestId(): string
    {
        try {
            return substr(bin2hex(random_bytes(8)), 0, 16);
        } catch (Throwable $ignored) {
            return substr(md5(uniqid('', true)), 0, 16);
        }
    }

    private static function clientIp(): string
    {
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
            $val = (string) ($_SERVER[$key] ?? '');
            if ($val !== '') {
                // X-Forwarded-For may be a comma-separated list — take the first
                return trim(explode(',', $val)[0]);
            }
        }
        return '';
    }

    /**
     * Recursively sanitize context for JSON serialisation.
     * Truncates strings > 1000 chars, redacts common sensitive keys,
     * and limits nesting depth to avoid megabyte log lines.
     *
     * @param mixed $value
     * @return mixed
     */
    private static function sanitize(mixed $value, int $depth): mixed
    {
        if ($depth <= 0) {
            return '[truncated]';
        }
        if ($value instanceof Throwable) {
            return ['exception' => get_class($value), 'message' => $value->getMessage()];
        }
        if (is_object($value)) {
            if ($value instanceof stdClass) {
                return self::sanitize(get_object_vars($value), $depth);
            }
            if ($value instanceof JsonSerializable) {
                return self::sanitize($value->jsonSerialize(), $depth);
            }
            if (method_exists($value, '__toString')) {
                return (string) $value;
            }
            return '[object ' . get_class($value) . ']';
        }
        if (is_array($value)) {
            $out = [];
            foreach ($value as $k => $v) {
                $key = (string) $k;
                if (self::isSensitiveKey($key)) {
                    $out[$key] = '[redacted]';
                } else {
                    $out[$key] = self::sanitize($v, $depth - 1);
                }
            }
            return $out;
        }
        if (is_string($value) && strlen($value) > 1000) {
            return substr($value, 0, 1000) . '…[truncated]';
        }
        return $value;
    }

    private static function isSensitiveKey(string $key): bool
    {
        $lower = strtolower($key);
        foreach (['password', 'secret', 'token', 'jwt', 'apikey', 'api_key', 'authorization', 'cookie', 'cvv', 'card', 'ssn', 'pin'] as $needle) {
            if (str_contains($lower, $needle)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Return the top 8 frames of a stack trace as a compact string.
     */
    private static function compactTrace(Throwable $e): string
    {
        $frames = array_slice($e->getTrace(), 0, 8);
        $lines  = [];
        foreach ($frames as $i => $frame) {
            $loc  = ($frame['file'] ?? '?') . ':' . ($frame['line'] ?? '?');
            $fn   = ($frame['class'] ?? '') . ($frame['type'] ?? '') . ($frame['function'] ?? '');
            $lines[] = "#{$i} {$loc} {$fn}()";
        }
        return implode(' | ', $lines);
    }
}
