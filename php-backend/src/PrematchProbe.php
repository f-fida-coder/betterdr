<?php

declare(strict_types=1);

/**
 * Pure helpers for the prematch active-sports discovery probe (2026-07-24).
 *
 * When the active-sports rotation is short, the worker probes the dates-only
 * endpoint (~0 odds datapoints) for configured sports that aren't already
 * active and promotes only those with a game inside the lookahead window —
 * replacing the old "full-catalog prematch blast" fallback that burned
 * datapoints during quiet periods. The network + caching live in the worker;
 * the response parsing and window test live here so they can be unit-tested
 * and stay identical across the prematch-worker and odds-worker copies.
 */
final class PrematchProbe
{
    /**
     * Extract YYYY-MM-DD date strings from a /sports/dates response, tolerant
     * of the two shapes the endpoint returns: a top-level {dates:[...]} and
     * the sport-id-keyed {"2":{"dates":[...]}} form. Any ISO datetime is
     * truncated to its date. PURE.
     *
     * @return list<string>
     */
    public static function datesFromResponse(mixed $resp, int $sportId): array
    {
        if (!is_array($resp)) {
            return [];
        }
        $buckets = [];
        if (is_array($resp['dates'] ?? null)) {
            $buckets[] = $resp['dates'];
        }
        if (is_array($resp[(string) $sportId]['dates'] ?? null)) {
            $buckets[] = $resp[(string) $sportId]['dates'];
        }
        foreach ($resp as $v) {
            if (is_array($v) && is_array($v['dates'] ?? null)) {
                $buckets[] = $v['dates'];
            }
        }
        $out = [];
        foreach ($buckets as $list) {
            if (!is_array($list)) {
                continue;
            }
            foreach ($list as $c) {
                if (is_string($c) && $c !== '') {
                    $out[] = substr($c, 0, 10);
                }
            }
        }
        // The sport-id-keyed bucket and the generic nested-{dates} scan can
        // both match the same list, so dedupe (first-seen order preserved).
        return array_values(array_unique($out));
    }

    /**
     * True when any date falls within [$today, $cutoff] inclusive — i.e. the
     * sport has an upcoming game inside the lookahead window. Lexical compare
     * is correct for zero-padded YYYY-MM-DD. PURE.
     *
     * @param list<string> $dates
     */
    public static function hasUpcomingWithin(array $dates, string $today, string $cutoff): bool
    {
        foreach ($dates as $d) {
            $day = substr((string) $d, 0, 10);
            if ($day >= $today && $day <= $cutoff) {
                return true;
            }
        }
        return false;
    }
}
