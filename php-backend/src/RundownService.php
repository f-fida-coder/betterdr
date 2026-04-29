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
     * Events with markets for a sport on a date. Returns events partitioned
     * into `live` (in-progress), `finished` (recently-final), and
     * `upcoming` (scheduled-but-not-yet-started) so RundownLiveSync can
     * act on each: live refreshes odds, finished flips rows to
     * status='finished', upcoming carries broadcast/event_name metadata
     * for prematch cards (no odds/status disturbance — OddsAPI owns
     * those for prematch).
     *
     * @return array{ok:bool, live:list<array<string,mixed>>, finished:list<array<string,mixed>>, upcoming:list<array<string,mixed>>, http?:int, error?:string}
     */
    public static function liveEventsForSport(int $sportId, ?string $date = null): array
    {
        $date = $date ?? gmdate('Y-m-d');
        // market_ids 1,2,3 = moneyline, spread, total. main_line=true skips
        // alts to keep the payload tight. No affiliate_ids filter — we want
        // every sportsbook so the merge layer can pick best line.
        // NOTE: hide_no_markets=true must NOT be set — Rundown drops live
        // events when even one of the requested market_ids is unavailable
        // (very common during in-play, e.g. when totals are temporarily
        // suspended). We'd rather get the event with whatever markets remain.
        $url = self::BASE_URL . '/sports/' . $sportId . '/events/' . rawurlencode($date)
            . '?market_ids=1,2,3&main_line=true';
        $resp = self::httpGet($url);
        if (!$resp['ok']) {
            return ['ok' => false, 'live' => [], 'finished' => [], 'upcoming' => [], 'http' => $resp['status'], 'error' => $resp['error'] ?? 'http_error'];
        }
        $events = is_array($resp['body']['events'] ?? null) ? $resp['body']['events'] : [];
        $live = [];
        $finished = [];
        $upcoming = [];
        foreach ($events as $ev) {
            if (!is_array($ev)) continue;
            $status = strtoupper((string) ($ev['score']['event_status'] ?? ''));
            if (self::isLiveStatus($status)) {
                $live[] = $ev;
            } elseif (self::isFinalStatus($status)) {
                $finished[] = $ev;
            } else {
                // STATUS_SCHEDULED / STATUS_UNCONFIRMED / blank — events
                // not yet started. Useful so we can attach broadcast +
                // event_name to prematch rows without stepping on odds.
                $upcoming[] = $ev;
            }
        }
        return ['ok' => true, 'live' => $live, 'finished' => $finished, 'upcoming' => $upcoming, 'http' => $resp['status']];
    }

    /**
     * Whether a Rundown event_status represents a *concluded* game — the
     * complement of isLiveStatus for the small set of "game over" codes.
     * Used to flip our DB rows out of status='live' once Rundown reports
     * STATUS_FULL_TIME / STATUS_FINAL / STATUS_AFTER_PENALTIES, etc.
     */
    public static function isFinalStatus(string $status): bool
    {
        static $finalSet = [
            'STATUS_FINAL'         => true,
            'STATUS_FINAL_OT'      => true,
            'STATUS_FINAL_PEN'     => true,
            'STATUS_FULL_TIME'     => true,
            'STATUS_AFTER_PENALTIES' => true,
            'STATUS_CANCELED'      => true,
            'STATUS_CANCELLED'     => true,
            'STATUS_POSTPONED'     => true,
            'STATUS_FORFEIT'       => true,
            'STATUS_ABANDONED'     => true,
            'STATUS_RETIRED'       => true,
        ];
        return isset($finalSet[strtoupper($status)]);
    }

    /**
     * Whether a Rundown event_status represents an in-progress game.
     *
     * Rundown uses sport-specific status codes (STATUS_FIRST_HALF for soccer,
     * STATUS_*_PERIOD for hockey, STATUS_*_QUARTER for football/basketball,
     * STATUS_OVERTIME, STATUS_HALFTIME, STATUS_RAIN_DELAY mid-game, etc.) so
     * a strict STATUS_IN_PROGRESS check would silently drop almost every
     * non-US-league live game. We instead exclude the small, stable set of
     * non-live statuses and treat everything else with the STATUS_ prefix as
     * live — when Rundown adds a new in-play status we'll pick it up too.
     */
    private static function isLiveStatus(string $status): bool
    {
        if ($status === '') return false;
        static $notLive = [
            'STATUS_SCHEDULED'   => true,
            'STATUS_UNCONFIRMED' => true,
            'STATUS_FINAL'       => true,
            'STATUS_FINAL_OT'    => true,
            'STATUS_FINAL_PEN'   => true,
            'STATUS_FULL_TIME'   => true,
            'STATUS_CANCELED'    => true,
            'STATUS_CANCELLED'   => true,
            'STATUS_POSTPONED'   => true,
            'STATUS_FORFEIT'     => true,
            'STATUS_ABANDONED'   => true,
            'STATUS_RETIRED'     => true,
        ];
        if (isset($notLive[$status])) return false;
        return strncmp($status, 'STATUS_', 7) === 0;
    }

    /**
     * @return array{ok:bool, status:int, body:array<string,mixed>, error?:string}
     */
    private static function httpGet(string $url): array
    {
        $key = self::apiKey();
        if ($key === '') {
            Logger::info('Rundown API key missing', [], 'rundown');
            return ['ok' => false, 'status' => 0, 'body' => [], 'error' => 'missing_api_key'];
        }
        // Hard cap on Rundown calls per minute. Protects spend during
        // burst load (cron + spam-clicked Refresh + sport-tab on-demand).
        $cap = (int) Env::get('RUNDOWN_MAX_CALLS_PER_MINUTE', '30');
        if (!ApiQuotaGuard::reserve('rundown', $cap)) {
            Logger::warn('Rundown API quota capped', ['cap' => $cap], 'rundown');
            return ['ok' => false, 'status' => 0, 'body' => [], 'error' => 'quota_capped'];
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['X-TheRundown-Key: ' . $key, 'Accept: application/json'],
            CURLOPT_TIMEOUT => 8,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $start = microtime(true);
        $body = curl_exec($ch);
        $elapsed = (int) round((microtime(true) - $start) * 1000);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        // curl_close() is a deprecated no-op since PHP 8.0; the handle is
        // cleaned up automatically when $ch goes out of scope.

        if (!is_string($body) || $body === '') {
            Logger::warn('Rundown API empty response', ['status' => $status, 'error' => $err, 'elapsedMs' => $elapsed], 'rundown');
            return ['ok' => false, 'status' => $status, 'body' => [], 'error' => $err ?: 'empty_body'];
        }
        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            Logger::warn('Rundown API invalid JSON', ['status' => $status, 'elapsedMs' => $elapsed], 'rundown');
            return ['ok' => false, 'status' => $status, 'body' => [], 'error' => 'invalid_json'];
        }
        if ($status < 200 || $status >= 300) {
            Logger::warn('Rundown API HTTP error', ['status' => $status, 'elapsedMs' => $elapsed, 'response' => $decoded], 'rundown');
            return ['ok' => false, 'status' => $status, 'body' => $decoded, 'error' => 'http_' . $status];
        }
        Logger::debug('Rundown API call success', ['status' => $status, 'elapsedMs' => $elapsed, 'url' => $url], 'rundown');
        return ['ok' => true, 'status' => $status, 'body' => $decoded];
    }

    private static function cachePath(string $name): string
    {
        $dir = dirname(__DIR__) . '/cache';
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        return $dir . '/' . $name;
    }
}
