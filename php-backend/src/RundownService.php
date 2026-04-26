<?php

declare(strict_types=1);

/**
 * Thin HTTP client for TheRundown.io v2 API. Live-only data source —
 * pre-match / scheduled odds still come from The Odds API via OddsSyncService.
 *
 * All public methods return ['ok' => bool, ...] and never throw on transport
 * failure (network errors are logged and swallowed) so the live worker tick
 * stays resilient against TheRundown outages without bringing the main worker
 * loop down.
 */
final class RundownService
{
    private const BASE_URL = 'https://therundown.io/api/v2';
    private const SPORTS_LIST_CACHE_FILE = 'rundown-sports.json';
    private const SPORTS_LIST_CACHE_TTL_SECONDS = 3600;

    private static function apiKey(): string
    {
        return trim((string) Env::get('RUNDOWN_API_KEY', ''));
    }

    public static function isEnabled(): bool
    {
        if (strtolower((string) Env::get('RUNDOWN_LIVE_ENABLED', 'false')) !== 'true') {
            return false;
        }
        return self::apiKey() !== '';
    }

    /**
     * Discover all sport IDs TheRundown supports, cached to disk for 1h.
     * @return array<int, array{id:int, name:string}>
     */
    public static function listSports(): array
    {
        $cachePath = self::cachePath(self::SPORTS_LIST_CACHE_FILE);
        if (is_file($cachePath)) {
            $age = time() - (int) @filemtime($cachePath);
            if ($age < self::SPORTS_LIST_CACHE_TTL_SECONDS) {
                $raw = @file_get_contents($cachePath);
                if (is_string($raw) && $raw !== '') {
                    $decoded = json_decode($raw, true);
                    if (is_array($decoded)) return $decoded;
                }
            }
        }

        $resp = self::httpGet(self::BASE_URL . '/sports');
        if (!$resp['ok'] || !is_array($resp['body']['sports'] ?? null)) {
            // On failure, return whatever we have on disk even if stale —
            // better to keep using yesterday's sport list than to skip the
            // live tick entirely while TheRundown is having a bad minute.
            if (is_file($cachePath)) {
                $raw = @file_get_contents($cachePath);
                if (is_string($raw) && $raw !== '') {
                    $decoded = json_decode($raw, true);
                    if (is_array($decoded)) return $decoded;
                }
            }
            return [];
        }

        $sports = [];
        foreach ($resp['body']['sports'] as $sport) {
            if (!is_array($sport)) continue;
            $id = (int) ($sport['sport_id'] ?? 0);
            $name = (string) ($sport['sport_name'] ?? '');
            if ($id <= 0 || $name === '') continue;
            $sports[] = ['id' => $id, 'name' => $name];
        }

        @file_put_contents($cachePath, json_encode($sports, JSON_UNESCAPED_SLASHES) ?: '[]');
        return $sports;
    }

    /**
     * Events with markets for a sport on a date. Filters to in-progress
     * (live) events client-side because TheRundown's V2 endpoint doesn't
     * accept a status filter. Returns the raw events array (already filtered).
     *
     * @return array{ok:bool, events:list<array<string,mixed>>, http?:int, error?:string}
     */
    public static function liveEventsForSport(int $sportId, ?string $date = null): array
    {
        $date = $date ?? gmdate('Y-m-d');
        // market_ids 1,2,3 = moneyline, spread, total. main_line=true skips
        // alts to keep the payload tight. No affiliate_ids filter — we want
        // every sportsbook so the merge layer can pick best line.
        $url = self::BASE_URL . '/sports/' . $sportId . '/events/' . rawurlencode($date)
            . '?market_ids=1,2,3&main_line=true&hide_no_markets=true';
        $resp = self::httpGet($url);
        if (!$resp['ok']) {
            return ['ok' => false, 'events' => [], 'http' => $resp['status'], 'error' => $resp['error'] ?? 'http_error'];
        }
        $events = is_array($resp['body']['events'] ?? null) ? $resp['body']['events'] : [];
        $live = [];
        foreach ($events as $ev) {
            if (!is_array($ev)) continue;
            $status = strtoupper((string) ($ev['score']['event_status'] ?? ''));
            if ($status === 'STATUS_IN_PROGRESS') {
                $live[] = $ev;
            }
        }
        return ['ok' => true, 'events' => $live, 'http' => $resp['status']];
    }

    /**
     * @return array{ok:bool, status:int, body:array<string,mixed>, error?:string}
     */
    private static function httpGet(string $url): array
    {
        $key = self::apiKey();
        if ($key === '') {
            return ['ok' => false, 'status' => 0, 'body' => [], 'error' => 'missing_api_key'];
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['X-TheRundown-Key: ' . $key, 'Accept: application/json'],
            CURLOPT_TIMEOUT => 8,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        // curl_close() is a deprecated no-op since PHP 8.0; the handle is
        // cleaned up automatically when $ch goes out of scope.

        if (!is_string($body) || $body === '') {
            return ['ok' => false, 'status' => $status, 'body' => [], 'error' => $err ?: 'empty_body'];
        }
        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            return ['ok' => false, 'status' => $status, 'body' => [], 'error' => 'invalid_json'];
        }
        if ($status < 200 || $status >= 300) {
            return ['ok' => false, 'status' => $status, 'body' => $decoded, 'error' => 'http_' . $status];
        }
        return ['ok' => true, 'status' => $status, 'body' => $decoded];
    }

    private static function cachePath(string $name): string
    {
        $dir = dirname(__DIR__) . '/cache';
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        return $dir . '/' . $name;
    }
}
