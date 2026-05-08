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

        if ($source === 'scheduled') {
            if ($startTs !== null && $startTs <= $now) {
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
                if ($lastUpdatedTs !== null && ($lastUpdatedTs + $staleAfter) >= $now) {
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
}
