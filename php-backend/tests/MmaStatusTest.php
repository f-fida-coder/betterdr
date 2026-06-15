<?php

declare(strict_types=1);

/**
 * MMA/UFC live-status mapping (SportsMatchStatus::effectiveStatus).
 *
 * Bug: every fight on a UFC card shares (roughly) the card start time and
 * TheRundown reports CARD-level progress, so the start-time auto-promotion
 * flipped every still-scheduled fight to 'live' the moment the broadcast
 * began (showing a red LIVE badge on fights that read "Scheduled" /
 * "Fighters Walking"). For combat sports we now trust ONLY the per-fight
 * mapped status: STATUS_SCHEDULED → scheduled, STATUS_IN_PROGRESS → live,
 * STATUS_FINAL → finished — no time-based promotion.
 */

// getenv-backed Env stub (shared run.php process may not have a real Env).
if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, ?string $default = null): ?string
        {
            $v = getenv($key);
            return $v === false ? $default : $v;
        }
    }
}

require_once dirname(__DIR__) . '/src/RundownSportMap.php';
require_once dirname(__DIR__) . '/src/SportsMatchStatus.php';

TestRunner::run('MMA live-status mapping', function () {
    $now     = 1_700_000_000;
    $fresh   = date('c', $now - 60);   // odds synced 60s ago → fresh
    $started = date('c', $now - 600);   // start time 10 min ago

    // A scheduled fight on a card that has gone live: its OWN status is
    // scheduled, but the card-level score leaks an in-play clock that the
    // start-time promotion would otherwise treat as "this fight is live".
    $mmaScheduled = [
        'sportKey'          => 'mma_mixed_martial_arts',
        'status'            => 'scheduled',
        'startTime'         => $started,
        'lastUpdated'       => $fresh,
        'score'             => ['event_status' => 'STATUS_SCHEDULED', 'clock' => '5:00'],
        'eventStatusDetail' => 'Fighters Walking',
    ];
    TestRunner::assertEquals(
        'scheduled',
        SportsMatchStatus::effectiveStatus($mmaScheduled, $now),
        'scheduled MMA fight on a live card stays upcoming (not promoted to live)'
    );

    // Control: the SAME conditions on a team sport still auto-promote to live
    // (the promotion heuristic is intact for sports where it is correct).
    $nbaScheduled = $mmaScheduled;
    $nbaScheduled['sportKey'] = 'basketball_nba';
    TestRunner::assertEquals(
        'live',
        SportsMatchStatus::effectiveStatus($nbaScheduled, $now),
        'NBA game still auto-promotes to live once started + in-play signal'
    );

    // A genuinely in-progress fight (feed maps STATUS_IN_PROGRESS → live)
    // still shows live for MMA.
    $mmaLive = $mmaScheduled;
    $mmaLive['status'] = 'live';
    $mmaLive['score']  = ['event_status' => 'STATUS_IN_PROGRESS', 'clock' => '2:30'];
    TestRunner::assertEquals(
        'live',
        SportsMatchStatus::effectiveStatus($mmaLive, $now),
        'in-progress MMA fight shows live'
    );

    // A finished fight (STATUS_FINAL) is finished.
    $mmaFinal = $mmaScheduled;
    $mmaFinal['status'] = 'finished';
    $mmaFinal['score']  = ['event_status' => 'STATUS_FINAL'];
    TestRunner::assertEquals(
        'finished',
        SportsMatchStatus::effectiveStatus($mmaFinal, $now),
        'final MMA fight is finished'
    );
});
