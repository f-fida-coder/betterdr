<?php

declare(strict_types=1);

/**
 * HTTP client for TheRundown v2 sports betting API.
 *
 * Auth: X-TheRundown-Key header. Key from RUNDOWN_API_KEY env.
 * Base: https://therundown.io/api/v2 (override via RUNDOWN_BASE_URL).
 *
 * Failure modes:
 *   - Key missing/blank → returns null (caller treats as "skip").
 *   - Network / curl error → throws RuntimeException.
 *   - 401 unauthorized → throws RuntimeException.
 *   - 429 rate limited → throws RuntimeException with Retry-After detail.
 *   - 400 on /markets/delta → cursor stale; caller re-bootstraps from events endpoint.
 *
 * Quota: every response carries X-Datapoints-* + X-Tier headers; the latest
 * values are cached in SharedFileCache so /api/debug/live-status can surface
 * "data points used / remaining this period".
 */
final class RundownClient
{
    public const DEFAULT_BASE = 'https://therundown.io/api/v2';
    private const DEFAULT_TIMEOUT_SECONDS = 10;
    private const QUOTA_CACHE_NS = 'rundown-quota';
    private const QUOTA_CACHE_KEY = 'latest';

    private static ?string $apiKey = null;
    private static ?string $baseUrl = null;

    public static function isConfigured(): bool
    {
        return self::resolveKey() !== '';
    }

    /** GET /sports */
    public static function getSports(): ?array
    {
        return self::get('/sports');
    }

    /** GET /sportsbooks?include=regions */
    public static function getSportsbooks(): ?array
    {
        return self::get('/sportsbooks', ['include' => 'regions']);
    }

    /** GET /markets — canonical market catalog (id, name, period_id, live_variant_id). */
    public static function getMarkets(): ?array
    {
        return self::get('/markets');
    }

    /**
     * GET /sports/{sportID}/events/{date}
     *
     * Returns full events with nested markets/participants/lines/prices.
     * Response's `meta.delta_last_id` is the cursor to feed /markets/delta.
     *
     * @param int $sportId    Rundown sport_id (4 = NBA, …)
     * @param string $date    YYYY-MM-DD (UTC unless `offset` shifts the boundary)
     * @param array<string,mixed> $params  market_ids, affiliate_ids, main_line, offset, hide_no_markets, exclude_status, participant_ids, participant_type
     */
    public static function getEventsForSport(int $sportId, string $date, array $params = []): ?array
    {
        return self::get('/sports/' . $sportId . '/events/' . $date, self::normalizeQuery($params));
    }

    /** GET /events/{eventID} */
    public static function getEvent(string $eventId, array $params = []): ?array
    {
        return self::get('/events/' . rawurlencode($eventId), self::normalizeQuery($params));
    }

    /**
     * GET /markets/delta?last_id=…
     *
     * Cursors older than 30 minutes return HTTP 400 — caller must rebootstrap
     * by calling getEventsForSport() and reading the fresh `meta.delta_last_id`.
     */
    public static function getDelta(int $lastId, array $params = []): ?array
    {
        $query = array_merge(['last_id' => $lastId], self::normalizeQuery($params));
        return self::get('/markets/delta', $query);
    }

    /**
     * GET /api/v2/delta?last_id=…
     *
     * Event-level delta — returns full event objects (score + status +
     * markets) that changed since the cursor. Each `deltas[].data` is a
     * serialized JSON string of an event; caller must json_decode it.
     *
     * Use this for live-score refresh; pairs with /markets/delta for
     * price-change refresh per the docs' efficient-polling guide.
     *
     * Cursor is a 36-char UUID. Use the all-zero UUID for the initial
     * bootstrap fetch.
     */
    public static function getEventDelta(string $lastId, array $params = []): ?array
    {
        $query = array_merge(['last_id' => $lastId], self::normalizeQuery($params));
        return self::get('/delta', $query);
    }

    /** GET /events/{eventID}/markets/history */
    public static function getEventMarketHistory(string $eventId, array $params = []): ?array
    {
        return self::get('/events/' . rawurlencode($eventId) . '/markets/history', self::normalizeQuery($params));
    }

    /** GET /events/{eventID}/lines — best-line aggregator across affiliates. */
    public static function getEventBestLines(string $eventId, array $params = []): ?array
    {
        return self::get('/events/' . rawurlencode($eventId) . '/lines', self::normalizeQuery($params));
    }

    /** GET /sports/{sportID}/teams */
    public static function getTeamsForSport(int $sportId): ?array
    {
        return self::get('/sports/' . $sportId . '/teams');
    }

    /** GET /sports/{sportID}/divisions */
    public static function getDivisionsForSport(int $sportId): ?array
    {
        return self::get('/sports/' . $sportId . '/divisions');
    }

    /** GET /sports/dates?sport_ids=… */
    public static function getDatesForSports(array $sportIds, array $params = []): ?array
    {
        $query = array_merge(
            ['sport_ids' => implode(',', array_map('intval', $sportIds))],
            self::normalizeQuery($params)
        );
        return self::get('/sports/dates', $query);
    }

    /** GET /season_types — list season types per sport. */
    public static function getSeasonTypes(): ?array
    {
        return self::get('/season_types');
    }

    /**
     * GET /events/{eventID}/openers — opening lines for an event.
     * V2-only endpoint (see V1→V2 migration guide).
     */
    public static function getEventOpeners(string $eventId): ?array
    {
        return self::get('/events/' . rawurlencode($eventId) . '/openers');
    }

    /**
     * GET /events/{eventID}/markets — markets sub-collection for one event.
     * Equivalent to walking event.markets[] from getEvent() but lets the
     * caller request only markets without the score/teams envelope.
     */
    public static function getEventMarkets(string $eventId, array $params = []): ?array
    {
        return self::get('/events/' . rawurlencode($eventId) . '/markets', self::normalizeQuery($params));
    }

    /**
     * Latest quota snapshot reported by the most recent successful call.
     * Used by /api/debug/live-status and the admin circuit-breaker view.
     *
     * @return array<string,mixed>
     */
    public static function latestQuotaSnapshot(): array
    {
        $snap = SharedFileCache::peek(self::QUOTA_CACHE_NS, self::QUOTA_CACHE_KEY);
        return is_array($snap) ? $snap : [];
    }

    // ── internals ─────────────────────────────────────────────────────

    /** @param array<string,string|int> $query @return array<string,mixed>|null */
    private static function get(string $path, array $query = []): ?array
    {
        $key = self::resolveKey();
        if ($key === '') {
            // Caller treats null as "feature disabled" — never throws so
            // the site stays up until ops pastes the API key.
            return null;
        }

        $url = self::resolveBase() . $path;
        if ($query !== []) {
            $url .= '?' . http_build_query($query);
        }

        $timeout = max(2, (int) Env::get('RUNDOWN_TIMEOUT_SECONDS', (string) self::DEFAULT_TIMEOUT_SECONDS));

        return CircuitBreaker::getInstance()->execute('rundown:http', static function () use ($url, $key, $timeout): ?array {
            return self::httpGet($url, $key, $timeout);
        }, $timeout * 1000);
    }

    /** @return array<string,mixed>|null */
    private static function httpGet(string $url, string $key, int $timeoutSec): ?array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Rundown: curl init failed');
        }

        $responseHeaders = [];
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_TIMEOUT        => $timeoutSec,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HTTPHEADER     => [
                'X-TheRundown-Key: ' . $key,
                'Accept: application/json',
                'User-Agent: betterdr-rundown/1.0',
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
        // curl_close() is deprecated since PHP 8.0 (no-op since 8.0;
        // hard-deprecation warning landed in 8.5). Letting the resource
        // fall out of scope releases the handle.
        unset($ch);

        if ($errno !== 0) {
            throw new RuntimeException('Rundown: HTTP transport error: ' . $err);
        }

        self::recordQuotaHeaders($responseHeaders);

        if ($status === 401) {
            throw new RuntimeException('Rundown: 401 unauthorized — check RUNDOWN_API_KEY');
        }
        if ($status === 429) {
            $retryAfter = (int) ($responseHeaders['retry-after'] ?? 1);
            throw new RuntimeException('Rundown: 429 rate limited — retry after ' . $retryAfter . 's');
        }
        if ($status === 400) {
            $msg = is_string($body) ? trim(substr($body, 0, 200)) : '';
            throw new RuntimeException('Rundown: 400 bad request' . ($msg !== '' ? ' — ' . $msg : ''));
        }
        if ($status === 404) {
            throw new RuntimeException('Rundown: 404 not found');
        }
        if ($status >= 500) {
            throw new RuntimeException('Rundown: ' . $status . ' server error');
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('Rundown: unexpected HTTP ' . $status);
        }

        if (!is_string($body) || $body === '') {
            return [];
        }
        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Rundown: response is not JSON');
        }
        return $decoded;
    }

    /**
     * Persist the latest quota snapshot from response headers. Updates
     * whenever ANY X-Datapoints-* / X-Tier / X-Rate-Limit header is
     * present so even endpoints that don't return the full set (e.g.,
     * delta endpoints with no body) still bump the cumulative tracker.
     *
     * @param array<string,string> $headers
     */
    private static function recordQuotaHeaders(array $headers): void
    {
        $hasAnyQuota = false;
        foreach (['x-datapoints', 'x-datapoints-used', 'x-datapoints-remaining', 'x-datapoints-limit', 'x-tier', 'x-rate-limit', 'x-websocket-access'] as $h) {
            if (isset($headers[$h])) { $hasAnyQuota = true; break; }
        }
        if (!$hasAnyQuota) return;

        // Merge with the previously-cached snapshot so fields not present
        // on this response don't get reset to zero.
        $prev = SharedFileCache::peek(self::QUOTA_CACHE_NS, self::QUOTA_CACHE_KEY);
        $prev = is_array($prev) ? $prev : [];

        $snap = [
            'tier'               => (string) ($headers['x-tier'] ?? $prev['tier'] ?? ''),
            'rateLimit'          => isset($headers['x-rate-limit']) ? (int) $headers['x-rate-limit'] : (int) ($prev['rateLimit'] ?? 0),
            'datapoints'         => isset($headers['x-datapoints']) ? (int) $headers['x-datapoints'] : (int) ($prev['datapoints'] ?? 0),
            'datapointsUsed'     => isset($headers['x-datapoints-used']) ? (int) $headers['x-datapoints-used'] : (int) ($prev['datapointsUsed'] ?? 0),
            'datapointsRemain'   => isset($headers['x-datapoints-remaining']) ? (int) $headers['x-datapoints-remaining'] : (int) ($prev['datapointsRemain'] ?? 0),
            'datapointsLimit'    => isset($headers['x-datapoints-limit']) ? (int) $headers['x-datapoints-limit'] : (int) ($prev['datapointsLimit'] ?? 0),
            'datapointsPeriod'   => (string) ($headers['x-datapoints-period'] ?? $prev['datapointsPeriod'] ?? ''),
            'datapointsReset'    => (string) ($headers['x-datapoints-reset'] ?? $prev['datapointsReset'] ?? ''),
            'websocketAccess'    => isset($headers['x-websocket-access'])
                ? (strtolower((string) $headers['x-websocket-access']) === 'true')
                : (bool) ($prev['websocketAccess'] ?? false),
            'recordedAt'         => gmdate(DATE_ATOM),
        ];
        SharedFileCache::forget(self::QUOTA_CACHE_NS, self::QUOTA_CACHE_KEY);
        SharedFileCache::remember(self::QUOTA_CACHE_NS, self::QUOTA_CACHE_KEY, 3600, static fn (): array => $snap);
    }

    private static function resolveKey(): string
    {
        if (self::$apiKey === null) {
            self::$apiKey = trim((string) Env::get('RUNDOWN_API_KEY', ''));
        }
        return self::$apiKey;
    }

    private static function resolveBase(): string
    {
        if (self::$baseUrl === null) {
            $base = trim((string) Env::get('RUNDOWN_BASE_URL', self::DEFAULT_BASE));
            self::$baseUrl = rtrim($base !== '' ? $base : self::DEFAULT_BASE, '/');
        }
        return self::$baseUrl;
    }

    /**
     * Flatten booleans and lists into query-string friendly values.
     *
     * @param array<string,mixed> $params
     * @return array<string,string>
     */
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
