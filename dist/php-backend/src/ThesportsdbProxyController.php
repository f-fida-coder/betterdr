<?php

declare(strict_types=1);

/**
 * Server-side proxy for thesportsdb.com team/player image lookups.
 *
 * Direct browser calls to thesportsdb fail with CORS and hit a shared 429
 * rate limit. This proxy fetches server-side, caches aggressively, and
 * returns minimal JSON to the frontend logo fallback chain.
 */
final class ThesportsdbProxyController
{
    private const NAMESPACE = 'thesportsdb_proxy';
    private const POSITIVE_TTL_SECONDS = 604800; // 7 days — badges rarely change
    private const NEGATIVE_TTL_SECONDS = 86400;  // 1 day — retry unknown names daily
    private const UPSTREAM_TIMEOUT_SECONDS = 4;
    private const TEAM_ENDPOINT = 'https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=';
    private const PLAYER_ENDPOINT = 'https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=';

    private SqlRepository $db;

    public function __construct(SqlRepository $db, string $jwtSecret)
    {
        $this->db = $db;
    }

    public function handle(string $method, string $path): bool
    {
        if ($method !== 'GET') {
            return false;
        }
        if ($path === '/api/proxy/thesportsdb/team') {
            $this->lookupTeam();
            return true;
        }
        if ($path === '/api/proxy/thesportsdb/player') {
            $this->lookupPlayer();
            return true;
        }
        return false;
    }

    private function lookupTeam(): void
    {
        $name = isset($_GET['name']) ? trim((string) $_GET['name']) : '';
        if ($name === '' || strlen($name) > 120) {
            Response::json(['found' => false, 'reason' => 'invalid-name'], 400);
            return;
        }
        if (RateLimiter::enforce($this->db, 'thesportsdb_proxy', 60, 60)) {
            return;
        }
        $payload = SharedFileCache::remember(
            self::NAMESPACE,
            'team:' . strtolower($name),
            self::POSITIVE_TTL_SECONDS,
            fn(): array => $this->fetchTeam($name)
        );
        $ttl = (bool) ($payload['found'] ?? false) ? self::POSITIVE_TTL_SECONDS : self::NEGATIVE_TTL_SECONDS;
        Response::json($payload, 200, "public, max-age={$ttl}");
    }

    private function lookupPlayer(): void
    {
        $name = isset($_GET['name']) ? trim((string) $_GET['name']) : '';
        if ($name === '' || strlen($name) > 120) {
            Response::json(['found' => false, 'reason' => 'invalid-name'], 400);
            return;
        }
        if (RateLimiter::enforce($this->db, 'thesportsdb_proxy', 60, 60)) {
            return;
        }
        $payload = SharedFileCache::remember(
            self::NAMESPACE,
            'player:' . strtolower($name),
            self::POSITIVE_TTL_SECONDS,
            fn(): array => $this->fetchPlayer($name)
        );
        $ttl = (bool) ($payload['found'] ?? false) ? self::POSITIVE_TTL_SECONDS : self::NEGATIVE_TTL_SECONDS;
        Response::json($payload, 200, "public, max-age={$ttl}");
    }

    /**
     * @return array{found: bool, logoUrl?: string, teamId?: string, source?: string}
     */
    private function fetchTeam(string $name): array
    {
        $data = $this->fetchJson(self::TEAM_ENDPOINT . rawurlencode($name));
        if (!is_array($data)) {
            return ['found' => false];
        }
        $teams = is_array($data['teams'] ?? null) ? $data['teams'] : [];
        if ($teams === []) {
            return ['found' => false];
        }
        $normalizedQuery = self::normalize($name);
        $chosen = null;
        foreach ($teams as $team) {
            if (!is_array($team)) {
                continue;
            }
            if (self::normalize((string) ($team['strTeam'] ?? '')) === $normalizedQuery) {
                $chosen = $team;
                break;
            }
        }
        if ($chosen === null) {
            $first = $teams[0];
            $chosen = is_array($first) ? $first : null;
        }
        if ($chosen === null) {
            return ['found' => false];
        }
        $badge = (string) ($chosen['strBadge'] ?? $chosen['strTeamBadge'] ?? $chosen['strLogo'] ?? '');
        if ($badge === '') {
            return ['found' => false];
        }
        return [
            'found' => true,
            'logoUrl' => $badge,
            'teamId' => (string) ($chosen['idTeam'] ?? ''),
            'source' => 'thesportsdb',
        ];
    }

    /**
     * @return array{found: bool, logoUrl?: string, playerId?: string, source?: string}
     */
    private function fetchPlayer(string $name): array
    {
        $data = $this->fetchJson(self::PLAYER_ENDPOINT . rawurlencode($name));
        if (!is_array($data)) {
            return ['found' => false];
        }
        $players = is_array($data['player'] ?? null) ? $data['player'] : [];
        if ($players === []) {
            return ['found' => false];
        }
        $normalizedQuery = self::normalize($name);
        $chosen = null;
        foreach ($players as $player) {
            if (!is_array($player)) {
                continue;
            }
            if (self::normalize((string) ($player['strPlayer'] ?? '')) === $normalizedQuery) {
                $chosen = $player;
                break;
            }
        }
        if ($chosen === null) {
            $first = $players[0];
            $chosen = is_array($first) ? $first : null;
        }
        if ($chosen === null) {
            return ['found' => false];
        }
        $thumb = (string) (
            $chosen['strCutout']
            ?? $chosen['strThumb']
            ?? $chosen['strRender']
            ?? ''
        );
        if ($thumb === '') {
            return ['found' => false];
        }
        return [
            'found' => true,
            'logoUrl' => $thumb,
            'playerId' => (string) ($chosen['idPlayer'] ?? ''),
            'source' => 'thesportsdb',
        ];
    }

    private function fetchJson(string $url): ?array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            return null;
        }
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => self::UPSTREAM_TIMEOUT_SECONDS,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
            CURLOPT_USERAGENT => 'betterdr-thesportsdb-proxy/1.0',
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        // curl_close() is a no-op on PHP 8.0+ and deprecated on 8.5.
        if (!is_string($body) || $status < 200 || $status >= 300) {
            return null;
        }
        $decoded = json_decode($body, true);
        return is_array($decoded) ? $decoded : null;
    }

    private static function normalize(string $value): string
    {
        $lower = strtolower($value);
        $stripped = preg_replace('/[^a-z0-9]+/', '', $lower) ?? '';
        return $stripped;
    }
}
