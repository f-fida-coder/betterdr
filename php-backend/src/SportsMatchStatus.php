<?php

declare(strict_types=1);

final class SportsMatchStatus
{
    private const BETTABLE = ['scheduled', 'live'];
    private const HIDDEN_PUBLIC = ['expired', 'suspended', 'canceled'];
    private const DEFAULT_SCHEDULED_EXPIRY_GRACE_SECONDS = 12 * 3600;

    public static function normalize(?string $statusRaw, ?string $eventStatusRaw = null): string
    {
        $status = strtoupper(trim((string) ($eventStatusRaw ?? '')));
        if ($status === '') {
            $status = strtoupper(trim((string) ($statusRaw ?? '')));
        }

        if ($status === '') {
            return 'scheduled';
        }

        if (
            str_contains($status, 'CANCEL')
            || str_contains($status, 'ABANDON')
            || str_contains($status, 'VOID')
            || str_contains($status, 'NO_ACTION')
        ) {
            return 'canceled';
        }

        if (
            str_contains($status, 'SUSPEND')
            || str_contains($status, 'POSTPON')
            || str_contains($status, 'DELAY')
            || str_contains($status, 'INTERRUPT')
        ) {
            return 'suspended';
        }

        if (
            str_contains($status, 'FINAL')
            || str_contains($status, 'COMPLETE')
            || str_contains($status, 'CLOSED')
            || $status === 'FINISHED'
        ) {
            return 'finished';
        }

        if (
            str_contains($status, 'IN_PROGRESS')
            || str_contains($status, 'LIVE')
            || str_contains($status, 'STATUS_IN_PROGRESS')
        ) {
            return 'live';
        }

        if (
            str_contains($status, 'SCHEDULED')
            || str_contains($status, 'PRE_GAME')
            || str_contains($status, 'PREGAME')
            || str_contains($status, 'UPCOMING')
        ) {
            return 'scheduled';
        }

        $normalized = strtolower(trim((string) ($statusRaw ?? '')));
        return match ($normalized) {
            'scheduled', 'pre-game', 'pregame', 'upcoming', 'pending' => 'scheduled',
            'live', 'active', 'in_play', 'in-play' => 'live',
            'finished', 'final', 'closed', 'settled' => 'finished',
            'suspended', 'paused', 'delayed', 'postponed' => 'suspended',
            'cancelled', 'canceled', 'abandoned', 'void' => 'canceled',
            'expired' => 'expired',
            default => 'scheduled',
        };
    }

    /**
     * @param array<string, mixed> $match
     */
    public static function effectiveStatus(array $match, ?int $nowTs = null): string
    {
        $now = $nowTs ?? time();
        $source = self::normalize(
            (string) ($match['status'] ?? ''),
            (string) (($match['score']['event_status'] ?? '') ?: '')
        );

        if (in_array($source, ['finished', 'suspended', 'canceled', 'expired'], true)) {
            return $source;
        }

        $startTs = self::parseTime($match['startTime'] ?? null);
        $lastUpdatedTs = self::parseTime(($match['lastUpdated'] ?? null) ?: ($match['updatedAt'] ?? null));

        // MMA/UFC: every fight on a card shares (roughly) the card start time
        // and TheRundown reports card-level progress, so the start-time
        // auto-promotion below would flip EVERY still-scheduled fight to
        // 'live' the moment the broadcast begins (e.g. while a fight shows
        // "Fighters Walking"). For combat sports we therefore trust ONLY the
        // per-fight mapped status: STATUS_SCHEDULED → scheduled,
        // STATUS_IN_PROGRESS → live, STATUS_FINAL → finished. A real in-play
        // fight still reports source === 'live' and shows the LIVE badge; an
        // upcoming fight correctly renders as scheduled.
        $isMma = RundownSportMap::canonicalSportKey((string) ($match['sportKey'] ?? '')) === 'mma_mixed_martial_arts';

        if ($source === 'scheduled') {
            if (!$isMma && $startTs !== null && $startTs <= $now) {
                $expiryGrace = self::envInt('MATCH_SCHEDULED_EXPIRY_GRACE_SECONDS', self::DEFAULT_SCHEDULED_EXPIRY_GRACE_SECONDS);
                if (($startTs + $expiryGrace) < $now) {
                    return 'expired';
                }
                // The upstream feed hasn't flipped event_status to IN_PROGRESS
                // yet, but the match's start time has passed. If odds are
                // still being actively synced (i.e. the match is real and
                // in-play), auto-promote to 'live' so users can bet live
                // lines instead of getting the "betting is closed" gate.
                // We require a fresh sync signal so we don't falsely
                // promote postponed/abandoned games the feed has stopped
                // updating — those fall through to the expiry grace path.
                $staleAfter = self::envInt('MATCH_LIVE_STALE_AFTER_SECONDS', 45 * 60);
                if (
                    $lastUpdatedTs !== null
                    && ($lastUpdatedTs + $staleAfter) >= $now
                    && self::hasInProgressSignal($match)
                ) {
                    return 'live';
                }
            }
            return 'scheduled';
        }

        if ($source === 'live') {
            $maxLiveDuration = self::envInt('MATCH_LIVE_MAX_DURATION_SECONDS', 8 * 3600);
            $staleAfter = self::envInt('MATCH_LIVE_STALE_AFTER_SECONDS', 45 * 60);
            if ($startTs !== null && ($startTs + $maxLiveDuration) < $now) {
                return 'expired';
            }
            if ($lastUpdatedTs !== null && ($lastUpdatedTs + $staleAfter) < $now) {
                return 'expired';
            }
            return 'live';
        }

        return $source;
    }

    /**
     * @param array<string, mixed> $match
     * @return array<string, mixed>
     */
    public static function annotate(array $match, ?int $nowTs = null): array
    {
        $effective = self::effectiveStatus($match, $nowTs);
        $annotated = $match;
        $annotated['sourceStatus'] = (string) ($match['status'] ?? '');
        $annotated['status'] = $effective;
        $annotated['isBettable'] = self::isBettable($match, $nowTs);
        $annotated['isPublicVisible'] = !in_array($effective, self::HIDDEN_PUBLIC, true);
        $annotated['isStale'] = $effective === 'expired';
        return $annotated;
    }

    /**
     * @param array<string, mixed> $match
     */
    public static function isBettable(array $match, ?int $nowTs = null): bool
    {
        $effective = self::effectiveStatus($match, $nowTs);
        if (!in_array($effective, self::BETTABLE, true)) {
            return false;
        }

        if ($effective === 'scheduled' && self::hasStarted($match, $nowTs)) {
            return false;
        }

        // Phantom-live guard (money-safety). A row can read 'live' purely on the
        // feed's event_status=IN_PROGRESS flag while the game is actually over —
        // fast/obscure markets (Bet365 table-tennis et al.) sit flagged
        // in-progress at 0-0 with frozen, garbage odds long after they finish,
        // because the terminal-status flip is settlement-paced. Such a row is
        // bettable here, the wager is taken, then the next settlement sweep sees
        // the terminal event_status and voids+refunds it within seconds — money
        // out, money back, no bet. We refuse the bet UP FRONT (clear "closed"
        // reason) instead of taking-then-voiding by requiring a real in-play
        // movement signal (moving score / running clock / started period), not
        // merely the live flag. A genuine in-play game carries at least one of
        // these; only the first seconds of a true 0-0 kickoff are briefly
        // gated, which is the safe trade. Mirrors the frontend hasInPlaySignal.
        if ($effective === 'live' && !self::hasLiveMovementSignal($match)) {
            return false;
        }

        return true;
    }

    /**
     * @param array<string, mixed> $match
     */
    public static function isPublicVisible(array $match, ?int $nowTs = null): bool
    {
        return !in_array(self::effectiveStatus($match, $nowTs), self::HIDDEN_PUBLIC, true);
    }

    /**
     * @param array<string, mixed> $match
     */
    public static function placementBlockReason(array $match, ?int $nowTs = null): ?string
    {
        $effective = self::effectiveStatus($match, $nowTs);
        if ($effective === 'scheduled' && self::hasStarted($match, $nowTs)) {
            $label = trim((string) (($match['homeTeam'] ?? 'Match') . ' vs ' . ($match['awayTeam'] ?? '')));
            return 'Betting is closed for ' . $label;
        }

        // Phantom-live: flagged live but no real in-play movement (see the
        // matching guard in isBettable). Refuse with a clear reason rather than
        // taking the bet and auto-voiding it seconds later.
        if ($effective === 'live' && !self::hasLiveMovementSignal($match)) {
            $label = trim((string) (($match['homeTeam'] ?? 'Match') . ' vs ' . ($match['awayTeam'] ?? '')));
            return 'Live betting is not available for ' . $label . ' right now';
        }

        if ($effective === 'scheduled' || $effective === 'live') {
            return null;
        }

        $label = trim((string) (($match['homeTeam'] ?? 'Match') . ' vs ' . ($match['awayTeam'] ?? '')));
        return match ($effective) {
            'finished' => $label . ' is already finished',
            'suspended' => $label . ' is suspended',
            'canceled' => $label . ' is canceled',
            'expired' => 'Betting is closed for ' . $label,
            default => $label . ' is not open for betting',
        };
    }

    private static function parseTime(mixed $value): ?int
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        $parsed = strtotime($value);
        return $parsed === false ? null : $parsed;
    }

    private static function envInt(string $key, int $default): int
    {
        $raw = Env::get($key, (string) $default);
        return is_numeric($raw) ? max(1, (int) $raw) : $default;
    }

    /**
     * @param array<string, mixed> $match
     */
    private static function hasStarted(array $match, ?int $nowTs = null): bool
    {
        $startTs = self::parseTime($match['startTime'] ?? null);
        if ($startTs === null) {
            return false;
        }

        return $startTs <= ($nowTs ?? time());
    }

    /**
     * @param array<string, mixed> $match
     */
    private static function hasInProgressSignal(array $match): bool
    {
        $eventStatus = strtoupper(trim((string) ($match['score']['event_status'] ?? '')));
        if (
            str_contains($eventStatus, 'IN_PROGRESS')
            || str_contains($eventStatus, 'LIVE')
            || str_contains($eventStatus, 'STATUS_IN_PROGRESS')
        ) {
            return true;
        }

        $score = is_array($match['score'] ?? null) ? $match['score'] : [];
        $period = $score['period'] ?? ($score['game_period'] ?? null);
        if (is_numeric($period) && (float) $period > 0) {
            return true;
        }

        $clock = trim((string) (($score['clock'] ?? '') ?: ($score['display_clock'] ?? '')));
        if ($clock !== '') {
            return true;
        }

        return false;
    }

    /**
     * Real, concrete proof the game is actually being played right now — a
     * non-zero score, a running clock, a started period, a human period label,
     * or per-period score data. Deliberately does NOT count the bare
     * event_status=IN_PROGRESS flag (unlike hasInProgressSignal, which is used
     * for the looser "promote a started scheduled row to live" decision): a
     * finished-but-feed-lagging row keeps that flag while frozen at 0-0, and we
     * must not let those be bettable. Mirrors the frontend hasInPlaySignal so
     * the board and the placement gate agree on what "live" means.
     *
     * @param array<string, mixed> $match
     */
    private static function hasLiveMovementSignal(array $match): bool
    {
        $score = is_array($match['score'] ?? null) ? $match['score'] : [];

        if ((float) ($score['score_home'] ?? 0) > 0 || (float) ($score['score_away'] ?? 0) > 0) {
            return true;
        }

        $clock = trim((string) (($score['display_clock'] ?? '') ?: ($score['clock'] ?? '')));
        if ($clock !== '') {
            return true;
        }

        $period = $score['game_period'] ?? ($score['period'] ?? null);
        if (is_numeric($period) && (float) $period > 0) {
            return true;
        }

        if (trim((string) ($match['eventStatusDetail'] ?? '')) !== '') {
            return true;
        }

        $byHome = is_array($score['score_home_by_period'] ?? null) ? $score['score_home_by_period'] : [];
        $byAway = is_array($score['score_away_by_period'] ?? null) ? $score['score_away_by_period'] : [];
        if (count($byHome) > 0 || count($byAway) > 0) {
            return true;
        }

        return false;
    }
}
