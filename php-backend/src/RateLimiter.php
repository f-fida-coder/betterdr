<?php declare(strict_types=1);

class RateLimiter
{
    /**
     * Check if a request is allowed based on rate limiting rules
     *
     * @param MongoRepository $db Database repository instance
     * @param string $ip IP address of the requester
     * @param string $endpoint Endpoint being accessed
     * @param int $maxAttempts Maximum number of attempts allowed in the window
     * @param int $windowSeconds Time window in seconds
     * @return bool True if request is allowed, false if rate limited
     */
    public static function checkLimit(
        MongoRepository $db,
        string $ip,
        string $endpoint,
        int $maxAttempts,
        int $windowSeconds
    ): bool {
        $collection = 'rate_limits';
        
        $entries = $db->findMany($collection, [
            'ip' => $ip,
            'endpoint' => $endpoint,
        ], ['limit' => 1]);

        $now = MongoRepository::nowUtc();
        $nowTimestamp = strtotime($now);

        if (!empty($entries)) {
            $entry = $entries[0];
            $windowStartTimestamp = strtotime($entry['windowStart']);
            $windowEndTimestamp = $windowStartTimestamp + $windowSeconds;

            if ($nowTimestamp < $windowEndTimestamp) {
                $currentCount = (int) $entry['count'];
                if ($currentCount >= $maxAttempts) {
                    return false;
                }
                $db->updateOne($collection, ['id' => $entry['id']], [
                    'count' => $currentCount + 1,
                ]);
                return true;
            }

            $db->updateOne($collection, ['id' => $entry['id']], [
                'count' => 1,
                'windowStart' => $now,
            ]);
            return true;
        }

        $db->insertOne($collection, [
            'ip' => $ip,
            'endpoint' => $endpoint,
            'count' => 1,
            'windowStart' => $now,
        ]);
        return true;
    }
    
    /**
     * Get the number of seconds remaining in the current rate limit window
     *
     * @param MongoRepository $db Database repository instance
     * @param string $ip IP address of the requester
     * @param string $endpoint Endpoint being accessed
     * @param int $windowSeconds Time window in seconds
     * @return int Seconds remaining in the current window (0 if no active window)
     */
    public static function getRemainingSeconds(
        MongoRepository $db,
        string $ip,
        string $endpoint,
        int $windowSeconds
    ): int {
        $collection = 'rate_limits';
        
        $entries = $db->findMany($collection, [
            'ip' => $ip,
            'endpoint' => $endpoint,
        ], ['limit' => 1]);
        
        if (empty($entries)) {
            return 0;
        }
        
        $entry = $entries[0];
        $now = MongoRepository::nowUtc();
        $nowTimestamp = strtotime($now);
        $windowStartTimestamp = strtotime($entry['windowStart']);
        $windowEndTimestamp = $windowStartTimestamp + $windowSeconds;
        
        // Calculate remaining seconds in the window
        $remainingSeconds = $windowEndTimestamp - $nowTimestamp;
        
        return max(0, $remainingSeconds);
    }

    /**
     * Check rate limit and send 429 response if exceeded.
     * Returns true if the request is blocked (caller should return early).
     */
    public static function enforce(
        MongoRepository $db,
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
