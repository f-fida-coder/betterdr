<?php

declare(strict_types=1);

/**
 * Resolves which side of a matchup a player-prop's player belongs to, so a
 * pending prop bet can show a SINGLE team crest (the player's own team) instead
 * of both matchup crests.
 *
 * Why this exists: a Rundown player-prop participant carries only the player id
 * (participant.id, stored on the leg as `selectionPid`) — it has NO team_id. The
 * player's team is fetched from GET /players/{id}, whose `team_id` matches
 * event.teams[].team_id. We resolve that once at bet placement and stamp the
 * side on the leg; the frontend then renders just that side's logo.
 *
 * Cost control: player→team_id is stable for a season, so the lookup is cached
 * (SharedFileCache, 1-day TTL). Only players actually bet on are ever fetched,
 * and each at most once per day — negligible data-point spend.
 *
 * Failure mode: ALWAYS best-effort. Any miss (feed off, unknown player, team
 * not in this matchup) returns null and the caller leaves the leg without a
 * side, so the UI safely falls back to showing both crests. A logo lookup must
 * never block or fail bet placement.
 */
final class PlayerPropTeam
{
    private const CACHE_NS = 'player-team';
    private const CACHE_TTL_SECONDS = 86400; // 1 day — team rarely changes mid-season

    /**
     * Side ('home'|'away') the prop player is on, or null when unresolvable.
     *
     * @param string|null         $playerId  Rundown player id (leg `selectionPid`)
     * @param array<string,mixed> $snapshot  the leg's matchSnapshot (carries homeTeamId/awayTeamId)
     */
    public static function side(?string $playerId, array $snapshot): ?string
    {
        // Kill-switch (default ON). When off, skip the upstream /players lookup
        // entirely so placement makes zero extra calls — the UI then falls back
        // to both matchup crests, exactly as before this feature.
        $flag = strtolower(trim((string) (Env::get('SPORTSBOOK_PROP_TEAM_LOGO_ENABLED', 'true') ?? 'true')));
        if ($flag === '0' || $flag === 'false' || $flag === 'off') {
            return null;
        }

        $playerId = $playerId !== null ? trim($playerId) : '';
        if ($playerId === '') {
            return null;
        }

        $homeId = trim((string) ($snapshot['homeTeamId'] ?? ''));
        $awayId = trim((string) ($snapshot['awayTeamId'] ?? ''));
        if ($homeId === '' && $awayId === '') {
            return null; // snapshot predates team-id stamping — can't map
        }

        $teamId = self::teamIdForPlayer($playerId);
        if ($teamId === null || $teamId === '') {
            return null;
        }

        if ($teamId === $homeId) {
            return 'home';
        }
        if ($teamId === $awayId) {
            return 'away';
        }
        return null; // player isn't on either listed team (data hiccup) — fall back
    }

    /**
     * Cached player_id → team_id via GET /players/{id}. Returns '' for a player
     * the feed has but with no team, null when the lookup itself was unavailable
     * (so it isn't cached and will retry).
     */
    private static function teamIdForPlayer(string $playerId): ?string
    {
        try {
            $cached = SharedFileCache::remember(
                self::CACHE_NS,
                $playerId,
                self::CACHE_TTL_SECONDS,
                static function () use ($playerId): array {
                    $resp = RundownClient::getPlayer($playerId);
                    if (!is_array($resp)) {
                        // Feed off / not configured / transient — DON'T cache an
                        // empty result as if it were authoritative.
                        throw new RuntimeException('player lookup unavailable');
                    }
                    $player = is_array($resp['players'][0] ?? null) ? $resp['players'][0] : null;
                    $teamId = $player['team_id'] ?? null;
                    return ['teamId' => ($teamId !== null && $teamId !== '') ? (string) $teamId : ''];
                }
            );
        } catch (Throwable $e) {
            return null;
        }

        $teamId = (string) ($cached['teamId'] ?? '');
        return $teamId !== '' ? $teamId : '';
    }
}
