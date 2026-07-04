<?php

declare(strict_types=1);

/**
 * HTTP client for The Odds API v4 — the SUPPLEMENTAL odds source.
 *
 * TheRundown remains the sole, authoritative source for everything it
 * provides; every sport-scoped fetch here is gated by OddsApiAllowlist
 * (which also refuses startup on any Rundown overlap). See that class for
 * the approved scope.
 *
 * Auth: apiKey QUERY PARAM (The Odds API convention) from ODDS_API_KEY env.
 * The key must never appear in logs or exception messages — messages never
 * include the URL, and any body-derived text is passed through redact().
 *
 * Odds format: american, NOT the API's decimal default — ingestion then
 * reuses the exact conversion paths Rundown data takes (priceToDecimal for
 * board markets, raw-American passthrough for the outrights contract).
 *
 * Failure isolation from the Rundown pipeline: own circuit-breaker channel
 * ('theoddsapi:http'), own rate-limit file, own quota cache namespace.
 * Nothing here can gate or degrade the Rundown feed.
 *
 * Credit budget guard (plan: 5M credits/month): every response's
 * x-requests-remaining/used headers are persisted; below the SLOWDOWN
 * threshold pollIntervalMultiplier() doubles every worker interval; below
 * CRITICAL, outrightsOnly() flips true and an admin-visible alert flag is
 * raised. A bug can therefore never silently burn the month's quota.
 */
final class OddsApiClient
{
    public const DEFAULT_BASE = 'https://api.the-odds-api.com/v4';
    private const DEFAULT_TIMEOUT_SECONDS = 10;
    private const REGIONS = 'us';
    private const ODDS_FORMAT = 'american';
    private const QUOTA_CACHE_NS = 'theoddsapi-quota';
    private const QUOTA_CACHE_KEY = 'latest';
    // Set on a quota/credits 401 block, cleared when a paid call succeeds
    // again — mirrors RundownClient::LIMIT_CACHE_KEY semantics.
    private const LIMIT_CACHE_KEY = 'limit_hit';
    private const LIMIT_REACHED_WINDOW_SECONDS = 900;
    // Admin-visible "below critical budget" flag (surfaced in a later chunk).
    private const ALERT_CACHE_KEY = 'budget_alert';
    private const DEFAULT_BUDGET_SLOWDOWN_REMAINING = 500000;
    private const DEFAULT_BUDGET_CRITICAL_REMAINING = 100000;

    private static ?string $apiKey = null;
    private static ?string $baseUrl = null;

    public static function isConfigured(): bool
    {
        return self::resolveKey() !== '';
    }

    /**
     * GET /sports — the full key catalog (costs 0 credits). Diagnostic only;
     * NOT allowlist-gated because it fetches metadata, never odds.
     */
    public static function getSports(bool $all = true): ?array
    {
        return self::get('/sports', $all ? ['all' => 'true'] : []);
    }

    /**
     * GET /sports/{key}/odds — main lines for an allowlisted soccer league,
     * or outright prices for an allowlisted futures key. Markets and region
     * are hard-set from the category; callers cannot widen them.
     *
     * @param array<string,mixed> $params e.g. commenceTimeFrom/To
     */
    public static function getOdds(string $sportKey, string $category, array $params = []): ?array
    {
        OddsApiAllowlist::assertAllowed($sportKey, $category);
        unset($params['markets'], $params['regions'], $params['oddsFormat']);
        $query = array_merge(self::normalizeQuery($params), [
            'regions'    => self::REGIONS,
            'markets'    => OddsApiAllowlist::marketsFor($category),
            'oddsFormat' => self::ODDS_FORMAT,
            'dateFormat' => 'iso',
        ]);
        return self::get('/sports/' . rawurlencode($sportKey) . '/odds', $query);
    }

    /**
     * GET /sports/{key}/events — event ids/times WITHOUT odds (costs 0
     * credits). Used to find events inside the card-market kickoff window
     * before spending per-event credits.
     */
    public static function getEvents(string $sportKey, string $category, array $params = []): ?array
    {
        OddsApiAllowlist::assertAllowed($sportKey, $category);
        $query = array_merge(self::normalizeQuery($params), ['dateFormat' => 'iso']);
        return self::get('/sports/' . rawurlencode($sportKey) . '/events', $query);
    }

    /**
     * GET /sports/{key}/events/{eventId}/odds — per-event endpoint, used
     * ONLY for card markets (CATEGORY_CARDS keys). Markets are hard-set to
     * the approved game-level card markets; costs credits per event, so the
     * worker must pre-filter events to the kickoff window via getEvents().
     */
    public static function getEventOdds(string $sportKey, string $eventId, array $params = []): ?array
    {
        OddsApiAllowlist::assertAllowed($sportKey, OddsApiAllowlist::CATEGORY_CARDS);
        if ($eventId === '') {
            return null;
        }
        unset($params['markets'], $params['regions'], $params['oddsFormat']);
        $query = array_merge(self::normalizeQuery($params), [
            'regions'    => self::REGIONS,
            'markets'    => OddsApiAllowlist::marketsFor(OddsApiAllowlist::CATEGORY_CARDS),
            'oddsFormat' => self::ODDS_FORMAT,
            'dateFormat' => 'iso',
        ]);
        return self::get(
            '/sports/' . rawurlencode($sportKey) . '/events/' . rawurlencode($eventId) . '/odds',
            $query
        );
    }

    /**
     * GET /sports/{key}/scores — final/live scores for an allowlisted soccer
     * league (settlement support, later chunk). daysFrom pulls completed
     * games up to 3 days back.
     */
    public static function getScores(string $sportKey, int $daysFrom = 1): ?array
    {
        OddsApiAllowlist::assertAllowed($sportKey, OddsApiAllowlist::CATEGORY_SOCCER);
        return self::get('/sports/' . rawurlencode($sportKey) . '/scores', [
            'daysFrom'   => (string) max(1, min(3, $daysFrom)),
            'dateFormat' => 'iso',
        ]);
    }

    // ── credit budget guard ───────────────────────────────────────────

    /**
     * Latest x-requests-* snapshot from the most recent response.
     *
     * @return array<string,mixed>
     */
    public static function latestQuotaSnapshot(): array
    {
        $snap = SharedFileCache::peek(self::QUOTA_CACHE_NS, self::QUOTA_CACHE_KEY);
        return is_array($snap) ? $snap : [];
    }

    /** null = no snapshot yet (never punish a healthy feed on a guess). */
    public static function creditsRemaining(): ?int
    {
        $snap = self::latestQuotaSnapshot();
        return isset($snap['requestsRemaining']) ? (int) $snap['requestsRemaining'] : null;
    }

    /** 1 = normal cadence; 2 = halve every polling frequency (below SLOWDOWN). */
    public static function pollIntervalMultiplier(): int
    {
        $remaining = self::creditsRemaining();
        return ($remaining !== null && $remaining < self::budgetSlowdownRemaining()) ? 2 : 1;
    }

    /** True → worker drops to outrights-only polling (below CRITICAL). */
    public static function outrightsOnly(): bool
    {
        $remaining = self::creditsRemaining();
        return $remaining !== null && $remaining < self::budgetCriticalRemaining();
    }

    public static function quotaExhausted(): bool
    {
        $remaining = self::creditsRemaining();
        return $remaining !== null && $remaining <= 0;
    }

    /** Authoritative "this feed cannot return fresh odds right now" signal. */
    public static function feedLimitReached(): bool
    {
        $hit = SharedFileCache::peek(self::QUOTA_CACHE_NS, self::LIMIT_CACHE_KEY);
        if (is_array($hit)) {
            $at = (int) ($hit['at'] ?? 0);
            if ($at > 0 && (time() - $at) <= self::LIMIT_REACHED_WINDOW_SECONDS) {
                return true;
            }
        }
        return self::quotaExhausted();
    }

    /**
     * The raised below-critical alert, or null. Surfaced by admin/debug views.
     *
     * @return array<string,mixed>|null
     */
    public static function budgetAlert(): ?array
    {
        $flag = SharedFileCache::peek(self::QUOTA_CACHE_NS, self::ALERT_CACHE_KEY);
        return (is_array($flag) && (bool) ($flag['active'] ?? false)) ? $flag : null;
    }

    /**
     * Credits spent so far today (UTC) — the worker logs this once daily.
     *
     * @return array{date:string, used:int}
     */
    public static function dailyUsage(): array
    {
        $rec = SharedFileCache::peek(self::QUOTA_CACHE_NS, 'day-' . gmdate('Ymd'));
        if (!is_array($rec)) {
            return ['date' => gmdate('Y-m-d'), 'used' => 0];
        }
        // max() guards the monthly counter reset (lastUsed < firstUsed).
        return [
            'date' => (string) ($rec['date'] ?? gmdate('Y-m-d')),
            'used' => max(0, (int) ($rec['lastUsed'] ?? 0) - (int) ($rec['firstUsed'] ?? 0)),
        ];
    }

    // ── internals ─────────────────────────────────────────────────────

    /** @param array<string,string> $query @return array<string,mixed>|null */
    private static function get(string $path, array $query = []): ?array
    {
        OddsApiAllowlist::assertNoRundownOverlap();

        $key = self::resolveKey();
        if ($key === '') {
            // Caller treats null as "feature disabled" — never throws, so
            // nothing breaks until ops pastes the API key.
            return null;
        }

        $query['apiKey'] = $key;
        $url = self::resolveBase() . $path . '?' . http_build_query($query);

        $timeout = max(2, (int) Env::get('ODDS_API_TIMEOUT_SECONDS', (string) self::DEFAULT_TIMEOUT_SECONDS));

        self::enforceRateLimit();

        return CircuitBreaker::getInstance()->execute('theoddsapi:http', static function () use ($url, $path, $timeout): ?array {
            $result = self::httpGet($url, $timeout);
            // A successful PAID call proves credits are flowing again — clear
            // any limit flag. Scoped to paid paths so the free /sports and
            // /events endpoints can't falsely clear it while odds are blocked.
            if (is_array($result) && (str_contains($path, '/odds') || str_contains($path, '/scores'))) {
                SharedFileCache::forget(self::QUOTA_CACHE_NS, self::LIMIT_CACHE_KEY);
            }
            return $result;
        }, $timeout * 1000);
    }

    /**
     * Cross-process sliding-window rate limiter — same never-sleep-while-
     * holding-the-lock pattern as RundownClient::enforceRateLimit() (see the
     * prod-incident note there), duplicated deliberately so the two feeds
     * share zero throttle state. ODDS_API_MAX_CALLS_PER_MINUTE=0 disables.
     */
    private static function enforceRateLimit(): void
    {
        $cap = (int) Env::get('ODDS_API_MAX_CALLS_PER_MINUTE', '0');
        if ($cap <= 0) return;

        $file = sys_get_temp_dir() . '/betterdr-theoddsapi-ratelimit.json';
        for ($attempt = 0; $attempt < 30; $attempt++) {
            $fp = @fopen($file, 'c+');
            if ($fp === false) return;
            $sleepUs = 0;
            try {
                if (!flock($fp, LOCK_EX)) return;
                $raw = stream_get_contents($fp) ?: '';
                $stamps = json_decode($raw, true);
                $stamps = is_array($stamps) ? array_values(array_filter($stamps, 'is_numeric')) : [];

                $now = microtime(true);
                $cutoff = $now - 60.0;
                $stamps = array_values(array_filter($stamps, static fn ($t) => (float) $t > $cutoff));

                if (count($stamps) < $cap) {
                    $stamps[] = $now;
                    ftruncate($fp, 0);
                    rewind($fp);
                    fwrite($fp, json_encode($stamps) ?: '[]');
                    fflush($fp);
                    return; // slot acquired
                }

                $oldest = (float) $stamps[0];
                $sleepUs = (int) min(5_000_000, max(100_000, (60.0 - ($now - $oldest)) * 1_000_000));
            } finally {
                @flock($fp, LOCK_UN);
                @fclose($fp);
            }
            usleep($sleepUs);
        }
        // ~30 retries exhausted — proceed rather than block forever; the
        // upstream 429 path handles true overrun.
    }

    /** @return array<string,mixed>|null */
    private static function httpGet(string $url, int $timeoutSec): ?array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('OddsApi: curl init failed');
        }

        $responseHeaders = [];
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_TIMEOUT        => $timeoutSec,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HTTPHEADER     => [
                'Accept: application/json',
                'User-Agent: betterdr-theoddsapi/1.0',
            ],
            CURLOPT_HEADERFUNCTION => static function ($_ch, string $line) use (&$responseHeaders): int {
                $colon = strpos($line, ':');
                if ($colon !== false) {
                    $name = strtolower(trim(substr($line, 0, $colon)));
                    $value = trim(substr($line, $colon + 1));
                    if ($name !== '') {
                        $responseHeaders[$name] = $value;
                    }
                }
                return strlen($line);
            },
        ]);

        $body = curl_exec($ch);
        $errno = curl_errno($ch);
        $err   = $errno !== 0 ? curl_error($ch) : '';
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        // curl_close() is deprecated since PHP 8.0 — scope release frees the handle.
        unset($ch);

        if ($errno !== 0) {
            throw new RuntimeException('OddsApi: HTTP transport error: ' . self::redact($err));
        }

        self::recordQuotaHeaders($responseHeaders);

        $bodyText = is_string($body) ? trim(substr($body, 0, 200)) : '';

        if ($status === 401) {
            // 401 covers BOTH bad key and exhausted usage credits — split on
            // the body so the budget guard only trips on the credits case.
            if (stripos($bodyText, 'usage') !== false || stripos($bodyText, 'credit') !== false || stripos($bodyText, 'quota') !== false) {
                self::recordLimitHit();
                throw new RuntimeException('OddsApi: 401 usage credits exhausted — ' . self::redact($bodyText));
            }
            throw new RuntimeException('OddsApi: 401 unauthorized — check ODDS_API_KEY');
        }
        if ($status === 429) {
            $retryAfter = (int) ($responseHeaders['retry-after'] ?? 1);
            throw new RuntimeException('OddsApi: 429 rate limited — retry after ' . $retryAfter . 's');
        }
        if ($status === 404) {
            // Seasonal outright keys 404 while inactive — caller decides
            // whether that's "not in season" (skip) or a real error.
            throw new RuntimeException('OddsApi: 404 not found (key inactive or out of season)');
        }
        if ($status === 422) {
            throw new RuntimeException('OddsApi: 422 invalid request' . ($bodyText !== '' ? ' — ' . self::redact($bodyText) : ''));
        }
        if ($status >= 500) {
            throw new RuntimeException('OddsApi: ' . $status . ' server error');
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('OddsApi: unexpected HTTP ' . $status);
        }

        if (!is_string($body) || $body === '') {
            return [];
        }
        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('OddsApi: response is not JSON');
        }
        return $decoded;
    }

    /**
     * Persist the latest credit snapshot from x-requests-* headers, roll the
     * per-day usage record, and raise/clear the below-critical admin alert.
     *
     * @param array<string,string> $headers
     */
    private static function recordQuotaHeaders(array $headers): void
    {
        if (!isset($headers['x-requests-remaining']) && !isset($headers['x-requests-used'])) {
            return;
        }

        $prev = SharedFileCache::peek(self::QUOTA_CACHE_NS, self::QUOTA_CACHE_KEY);
        $prev = is_array($prev) ? $prev : [];

        $snap = [
            'requestsUsed'      => isset($headers['x-requests-used']) ? (int) $headers['x-requests-used'] : (int) ($prev['requestsUsed'] ?? 0),
            'requestsRemaining' => isset($headers['x-requests-remaining']) ? (int) $headers['x-requests-remaining'] : (int) ($prev['requestsRemaining'] ?? 0),
            'requestsLast'      => isset($headers['x-requests-last']) ? (int) $headers['x-requests-last'] : (int) ($prev['requestsLast'] ?? 0),
            'recordedAt'        => gmdate(DATE_ATOM),
        ];
        SharedFileCache::forget(self::QUOTA_CACHE_NS, self::QUOTA_CACHE_KEY);
        SharedFileCache::remember(self::QUOTA_CACHE_NS, self::QUOTA_CACHE_KEY, 3600, static fn (): array => $snap);

        // Per-day usage record (UTC): first-seen and latest used counters.
        $dayKey = 'day-' . gmdate('Ymd');
        $day = SharedFileCache::peek(self::QUOTA_CACHE_NS, $dayKey);
        SharedFileCache::put(self::QUOTA_CACHE_NS, $dayKey, [
            'date'      => gmdate('Y-m-d'),
            'firstUsed' => is_array($day) && isset($day['firstUsed']) ? (int) $day['firstUsed'] : $snap['requestsUsed'],
            'lastUsed'  => $snap['requestsUsed'],
        ]);

        // Raise the admin alert once on the way down; clear it on recovery
        // (new month) so a stale alert never masks the next real one.
        $critical = self::budgetCriticalRemaining();
        $alertActive = self::budgetAlert() !== null;
        if ($snap['requestsRemaining'] < $critical && !$alertActive) {
            SharedFileCache::put(self::QUOTA_CACHE_NS, self::ALERT_CACHE_KEY, [
                'active'    => true,
                'remaining' => $snap['requestsRemaining'],
                'at'        => gmdate(DATE_ATOM),
            ]);
            error_log('[theoddsapi] BUDGET CRITICAL: ' . $snap['requestsRemaining'] . ' credits remaining (< ' . $critical . ') — polling drops to outrights-only');
        } elseif ($snap['requestsRemaining'] >= $critical && $alertActive) {
            SharedFileCache::forget(self::QUOTA_CACHE_NS, self::ALERT_CACHE_KEY);
            error_log('[theoddsapi] budget recovered: ' . $snap['requestsRemaining'] . ' credits remaining — normal polling resumes');
        }
    }

    private static function recordLimitHit(): void
    {
        SharedFileCache::forget(self::QUOTA_CACHE_NS, self::LIMIT_CACHE_KEY);
        SharedFileCache::remember(
            self::QUOTA_CACHE_NS,
            self::LIMIT_CACHE_KEY,
            86400,
            static fn (): array => ['at' => time()]
        );
    }

    private static function budgetSlowdownRemaining(): int
    {
        return max(0, (int) Env::get('ODDS_API_BUDGET_SLOWDOWN_REMAINING', (string) self::DEFAULT_BUDGET_SLOWDOWN_REMAINING));
    }

    private static function budgetCriticalRemaining(): int
    {
        return max(0, (int) Env::get('ODDS_API_BUDGET_CRITICAL_REMAINING', (string) self::DEFAULT_BUDGET_CRITICAL_REMAINING));
    }

    /** Belt-and-braces: strip any apiKey=… that could leak into a message. */
    private static function redact(string $text): string
    {
        return preg_replace('/apiKey=[^&\s"\']+/i', 'apiKey=***', $text) ?? '';
    }

    private static function resolveKey(): string
    {
        if (self::$apiKey === null) {
            self::$apiKey = trim((string) Env::get('ODDS_API_KEY', ''));
        }
        return self::$apiKey;
    }

    private static function resolveBase(): string
    {
        if (self::$baseUrl === null) {
            $base = trim((string) Env::get('ODDS_API_BASE_URL', self::DEFAULT_BASE));
            self::$baseUrl = rtrim($base !== '' ? $base : self::DEFAULT_BASE, '/');
        }
        return self::$baseUrl;
    }

    /** @param array<string,mixed> $params @return array<string,string> */
    private static function normalizeQuery(array $params): array
    {
        $out = [];
        foreach ($params as $k => $v) {
            if ($v === null || $v === '') continue;
            if (is_bool($v)) {
                $out[(string) $k] = $v ? 'true' : 'false';
                continue;
            }
            if (is_array($v)) {
                $out[(string) $k] = implode(',', array_map('strval', $v));
                continue;
            }
            $out[(string) $k] = (string) $v;
        }
        return $out;
    }
}
