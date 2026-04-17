<?php declare(strict_types=1);

// In-memory rate limiter backed by APCu. Previously stored counters in MySQL,
// which forced two DB round-trips (SELECT + UPDATE/INSERT) on every enforced
// endpoint — a serious bottleneck on shared hosting where the MySQL pool is
// the scarcest resource. APCu lives in PHP shared memory, so each check is
// a single in-process memory op with no I/O.
class RateLimiter
{
    /**
     * Check if a request is allowed.
     *
     * @param SqlRepository|null $db   Legacy parameter, unused. Kept so
     *                                 existing call-sites don't have to change.
     * @param string $ip
     * @param string $endpoint
     * @param int $maxAttempts
     * @param int $windowSeconds
     * @return bool True if allowed, false if rate-limited.
     */
    public static function checkLimit(
        ?SqlRepository $db,
        string $ip,
        string $endpoint,
        int $maxAttempts,
        int $windowSeconds
    ): bool {
        // Fail-open when APCu isn't available — losing rate limiting on this
        // endpoint is safer than blocking legitimate traffic from a crashed
        // cache. Warn once per process.
        if (!self::apcuAvailable()) {
            static $warned = false;
            if (!$warned) {
                Logger::warning('APCu not available — rate limiting disabled', [
                    'endpoint' => $endpoint,
                ], 'error');
                $warned = true;
            }
            return true;
        }

        $key = self::keyFor($ip, $endpoint);
        $success = false;

        // apcu_inc with a TTL atomically creates the counter at 1 (TTL applied
        // on creation) or increments an existing counter (TTL preserved). The
        // natural expiry gives us a rolling window with zero cleanup.
        $count = apcu_inc($key, 1, $success, $windowSeconds);

        if ($count === false || !$success) {
            // Race with another process that just deleted the key — retry once.
            apcu_store($key, 1, $windowSeconds);
            return true;
        }

        return $count <= $maxAttempts;
    }

    /**
     * Seconds remaining in the current window, or 0 if no window is active.
     * APCu doesn't expose per-key TTL cheaply, so we return $windowSeconds as
     * a safe upper bound — clients won't retry sooner than the window allows.
     */
    public static function getRemainingSeconds(
        ?SqlRepository $db,
        string $ip,
        string $endpoint,
        int $windowSeconds
    ): int {
        if (!self::apcuAvailable()) {
            return 0;
        }
        return apcu_exists(self::keyFor($ip, $endpoint)) ? $windowSeconds : 0;
    }

    /**
     * Check rate limit and send 429 response if exceeded.
     * Returns true if the request is blocked (caller should return early).
     */
    public static function enforce(
        ?SqlRepository $db,
        string $endpoint,
        int $maxAttempts,
        int $windowSeconds
    ): bool {
        $ip = self::resolveClientKey($endpoint);

        if (!self::checkLimit($db, $ip, $endpoint, $maxAttempts, $windowSeconds)) {
            $retryAfter = self::getRemainingSeconds($db, $ip, $endpoint, $windowSeconds);
            header('Retry-After: ' . max(1, $retryAfter));
            Response::json(['message' => 'Too many requests. Please try again later.'], 429);
            return true;
        }

        return false;
    }

    private static function apcuAvailable(): bool
    {
        static $available = null;
        if ($available === null) {
            $available = function_exists('apcu_enabled') && apcu_enabled();
        }
        return $available;
    }

    private static function keyFor(string $ip, string $endpoint): string
    {
        // Compact deterministic key — the raw IP + endpoint could be long and
        // APCu keeps the key in memory for every counter.
        return 'rl:' . substr(hash('sha256', $endpoint . '|' . $ip), 0, 20);
    }

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

        $userAgent = substr(trim(Http::header('user-agent')), 0, 160);
        $acceptLanguage = substr(trim(Http::header('accept-language')), 0, 64);
        $requestUri = trim((string) ($_SERVER['REQUEST_URI'] ?? ''));
        $fingerprint = $endpoint . '|' . $requestUri . '|' . $userAgent . '|' . $acceptLanguage;

        return 'unknown:' . substr(hash('sha256', $fingerprint), 0, 24);
    }
}
