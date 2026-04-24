<?php declare(strict_types=1);

/**
 * File-backed, APCu-accelerated rate limiter.
 *
 * Each (ip, endpoint, window-slot) maps to a small JSON counter file
 * in cache/rate-limits/. APCu is used as a per-process L1 hot path to
 * avoid disk I/O on the common (non-blocked) path. File locks (flock)
 * provide cross-process atomicity where APCu is unavailable.
 *
 * Limits are configurable via environment:
 *   RATE_LIMIT_<ENDPOINT_UPPER>_MAX    — max requests
 *   RATE_LIMIT_<ENDPOINT_UPPER>_WINDOW — window in seconds
 *
 * Legacy $db parameter is accepted but no longer used; the limiter no
 * longer reads or writes the rate_limits table.
 */
class RateLimiter
{
    /**
     * Per-endpoint defaults: [maxAttempts, windowSeconds].
     * Values can be overridden per-environment via env vars.
     */
    private const DEFAULTS = [
        'login'              => [5,  60],
        'admin_login'        => [5,  60],
        'agent_login'        => [5,  60],
        'register'           => [3,  60],
        'place_bet'          => [20, 60],
        'deposit_request'    => [5,  60],
        'withdrawal_request' => [5,  60],
        'support_ticket'     => [5, 300],
        'password_reset'     => [3, 300],
    ];

    /**
     * Enforce rate limit from env-configured thresholds.
     * Returns true and sends 429 if the request should be blocked.
     */
    public static function fromEnv(SqlRepository $db, string $endpoint): bool
    {
        [$max, $window] = self::limits($endpoint);
        return self::enforce($db, $endpoint, $max, $window);
    }

    /**
     * Enforce rate limit with explicit thresholds.
     * Returns true and sends 429 if the request should be blocked.
     *
     * @param SqlRepository $db Unused; kept for backward-compatible call sites.
     */
    public static function enforce(
        SqlRepository $db,
        string $endpoint,
        int $maxAttempts,
        int $windowSeconds
    ): bool {
        $ip = self::resolveClientKey($endpoint);

        $allowed = true;
        $retryAfter = 0;

        if (self::apcuAvailable()) {
            [$allowed, $retryAfter] = self::checkApcu($ip, $endpoint, $maxAttempts, $windowSeconds);
        } else {
            [$allowed, $retryAfter] = self::checkFile($ip, $endpoint, $maxAttempts, $windowSeconds);
        }

        if (!$allowed) {
            header('Retry-After: ' . max(1, $retryAfter));
            Response::json(['message' => 'Too many requests. Please try again later.'], 429);
            return true;
        }

        return false;
    }

    // -------------------------------------------------------------------------
    // Helpers kept for any external callers that used checkLimit / getRemainingSeconds
    // -------------------------------------------------------------------------

    public static function checkLimit(
        SqlRepository $db,
        string $ip,
        string $endpoint,
        int $maxAttempts,
        int $windowSeconds
    ): bool {
        [$allowed] = self::checkFile($ip, $endpoint, $maxAttempts, $windowSeconds);
        return $allowed;
    }

    public static function getRemainingSeconds(
        SqlRepository $db,
        string $ip,
        string $endpoint,
        int $windowSeconds
    ): int {
        $filePath = self::filePath($ip, $endpoint);
        $state = self::readFile($filePath);
        if ($state === null) {
            return 0;
        }
        $windowEnd = (int) $state['windowStart'] + $windowSeconds;
        return max(0, $windowEnd - time());
    }

    // -------------------------------------------------------------------------
    // Internal: env limits
    // -------------------------------------------------------------------------

    /**
     * @return array{0: int, 1: int}  [maxAttempts, windowSeconds]
     */
    private static function limits(string $endpoint): array
    {
        [$defMax, $defWin] = self::DEFAULTS[$endpoint] ?? [30, 60];
        $prefix = 'RATE_LIMIT_' . strtoupper(str_replace('-', '_', $endpoint));
        $max    = (int) Env::get($prefix . '_MAX',    (string) $defMax);
        $window = (int) Env::get($prefix . '_WINDOW', (string) $defWin);
        return [max(1, $max), max(1, $window)];
    }

    // -------------------------------------------------------------------------
    // Internal: APCu fast path
    // -------------------------------------------------------------------------

    private static function apcuAvailable(): bool
    {
        return function_exists('apcu_inc') && (bool) ini_get('apc.enabled');
    }

    /**
     * @return array{0: bool, 1: int}  [allowed, retryAfterSeconds]
     */
    private static function checkApcu(
        string $ip,
        string $endpoint,
        int $maxAttempts,
        int $windowSeconds
    ): array {
        $slot     = (int) floor(time() / $windowSeconds);
        $key      = 'rl:' . $endpoint . ':' . hash('sha256', $ip) . ':' . $slot;
        $ttl      = $windowSeconds * 2;

        $success  = false;
        $newCount = apcu_inc($key, 1, $success, $ttl);

        if (!$success) {
            // Key did not exist yet — create it
            apcu_store($key, 1, $ttl);
            $newCount = 1;
        }

        $allowed = (int) $newCount <= $maxAttempts;
        // Remaining seconds until the window slot rolls over
        $retryAfter = $windowSeconds - (time() % $windowSeconds);
        return [$allowed, $retryAfter];
    }

    // -------------------------------------------------------------------------
    // Internal: file-backed path (cross-process safe via flock)
    // -------------------------------------------------------------------------

    /**
     * @return array{0: bool, 1: int}  [allowed, retryAfterSeconds]
     */
    private static function checkFile(
        string $ip,
        string $endpoint,
        int $maxAttempts,
        int $windowSeconds
    ): array {
        $filePath = self::filePath($ip, $endpoint);
        $dir      = dirname($filePath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0750, true);
        }

        $fh = @fopen($filePath, 'c+');
        if ($fh === false) {
            // If we cannot open the file, fail open rather than blocking every user.
            return [true, 0];
        }

        flock($fh, LOCK_EX);

        $raw   = stream_get_contents($fh);
        $state = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
        $now   = time();

        if (
            is_array($state)
            && isset($state['windowStart'], $state['count'])
            && ($now - (int) $state['windowStart']) < $windowSeconds
        ) {
            $count = (int) $state['count'] + 1;
        } else {
            $state = ['windowStart' => $now, 'count' => 0];
            $count = 1;
        }

        $allowed = $count <= $maxAttempts;

        if ($allowed) {
            $state['count'] = $count;
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($state));
        }

        flock($fh, LOCK_UN);
        fclose($fh);

        $windowEnd  = (int) $state['windowStart'] + $windowSeconds;
        $retryAfter = max(0, $windowEnd - $now);
        return [$allowed, $retryAfter];
    }

    /**
     * @return array<string,mixed>|null
     */
    private static function readFile(string $filePath): ?array
    {
        if (!is_file($filePath)) {
            return null;
        }
        $raw = @file_get_contents($filePath);
        if (!is_string($raw) || $raw === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    private static function filePath(string $ip, string $endpoint): string
    {
        $key    = hash('sha256', $ip . ':' . $endpoint);
        $shard  = substr($key, 0, 2);
        $dir    = __DIR__ . '/../cache/rate-limits/' . $shard;
        return $dir . '/' . $key . '.json';
    }

    // -------------------------------------------------------------------------
    // Internal: client key resolution
    // -------------------------------------------------------------------------

    private static function resolveClientKey(string $endpoint): string
    {
        $ip = IpUtils::clientIp();
        if ($ip !== 'unknown') {
            return $ip;
        }

        $remoteAddr = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
        if ($remoteAddr !== '' && filter_var($remoteAddr, FILTER_VALIDATE_IP) !== false) {
            return $remoteAddr;
        }

        $userAgent       = substr(trim(Http::header('user-agent')), 0, 160);
        $acceptLanguage  = substr(trim(Http::header('accept-language')), 0, 64);
        $requestUri      = trim((string) ($_SERVER['REQUEST_URI'] ?? ''));
        $fingerprint     = $endpoint . '|' . $requestUri . '|' . $userAgent . '|' . $acceptLanguage;

        return 'unknown:' . substr(hash('sha256', $fingerprint), 0, 24);
    }
}
