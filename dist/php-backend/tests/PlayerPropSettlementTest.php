<?php

declare(strict_types=1);

/**
 * Unit tests for PlayerPropSettlement — the PURE player-prop grader. No DB, no
 * HTTP. Verifies: over/under math, whole-number push, composite stats, the
 * money-safe "pending on ANY uncertainty" rule (missing player/stat, no player
 * id, unknown market, incomplete stats), and batting↔pitching disambiguation.
 */

require_once __DIR__ . '/../src/PlayerPropSettlement.php';

/** Build a stats response for one player. $rows = [[name, abbr, value, category], ...] */
$resp = static function (string $playerId, array $rows, bool $complete = true): array {
    return ['items' => [[
        'player' => ['id' => $playerId],
        'meta'   => ['complete' => $complete],
        'stats'  => array_map(static fn(array $r): array => [
            'player' => ['id' => $playerId],
            'stat'   => ['name' => $r[0], 'abbreviation' => $r[1] ?? '', 'display_name' => $r[0], 'category' => $r[3] ?? ''],
            'value'  => (string) $r[2],
        ], $rows),
    ]]];
};

$leg = static function (string $marketType, float $point, string $side, ?string $pid): array {
    return ['marketType' => $marketType, 'point' => $point, 'selection' => $side, 'selectionPid' => $pid];
};

TestRunner::run('isGradableProp — known props yes, yes/no + unknown no', function (): void {
    TestRunner::assertTrue(PlayerPropSettlement::isGradableProp('batter_doubles'), 'batter_doubles');
    TestRunner::assertTrue(PlayerPropSettlement::isGradableProp('player_points'), 'player_points');
    TestRunner::assertTrue(PlayerPropSettlement::isGradableProp('player_points_rebounds_assists'), 'PRA');
    TestRunner::assertFalse(PlayerPropSettlement::isGradableProp('player_double_double'), 'double_double is yes/no → not gradable');
    TestRunner::assertFalse(PlayerPropSettlement::isGradableProp('spreads'), 'core market not a prop');
});

TestRunner::run('grade — batter doubles Over/Under math', function () use ($resp, $leg): void {
    $stats = $resp('p1', [['Doubles', '2B', 1, 'batting']]);
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('batter_doubles', 0.5, 'Over', 'p1'), $stats), 'Over 0.5 with 1 → won');
    TestRunner::assertEquals('lost', PlayerPropSettlement::grade($leg('batter_doubles', 1.5, 'Over', 'p1'), $stats), 'Over 1.5 with 1 → lost');
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('batter_doubles', 1.5, 'Under', 'p1'), $stats), 'Under 1.5 with 1 → won');
    TestRunner::assertEquals('lost', PlayerPropSettlement::grade($leg('batter_doubles', 0.5, 'Under', 'p1'), $stats), 'Under 0.5 with 1 → lost');
});

TestRunner::run('grade — whole-number line pushes on exact', function () use ($resp, $leg): void {
    $stats = $resp('p1', [['Hits', 'H', 2, 'batting']]);
    TestRunner::assertEquals('push', PlayerPropSettlement::grade($leg('batter_hits', 2.0, 'Over', 'p1'), $stats), 'Over 2 with 2 → push');
    TestRunner::assertEquals('push', PlayerPropSettlement::grade($leg('batter_hits', 2.0, 'Under', 'p1'), $stats), 'Under 2 with 2 → push');
});

TestRunner::run('grade — composite PRA sums components', function () use ($resp, $leg): void {
    $stats = $resp('p1', [
        ['Points', 'PTS', 10, 'basketball'],
        ['Rebounds', 'REB', 5, 'basketball'],
        ['Assists', 'AST', 6, 'basketball'],
    ]);
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('player_points_rebounds_assists', 20.5, 'Over', 'p1'), $stats), '21 over 20.5 → won');
    TestRunner::assertEquals('lost', PlayerPropSettlement::grade($leg('player_points_rebounds_assists', 21.5, 'Over', 'p1'), $stats), '21 over 21.5 → lost');
});

TestRunner::run('grade — composite with a MISSING component stays pending (never guesses 0)', function () use ($resp, $leg): void {
    $stats = $resp('p1', [['Points', 'PTS', 10, 'basketball'], ['Rebounds', 'REB', 5, 'basketball']]); // no assists
    TestRunner::assertEquals('pending', PlayerPropSettlement::grade($leg('player_points_rebounds_assists', 12.5, 'Over', 'p1'), $stats), 'missing assists → pending');
});

TestRunner::run('grade — player not in box score → pending', function () use ($resp, $leg): void {
    $stats = $resp('p1', [['Doubles', '2B', 3, 'batting']]);
    TestRunner::assertEquals('pending', PlayerPropSettlement::grade($leg('batter_doubles', 0.5, 'Over', 'pX'), $stats), 'different player id → pending');
});

TestRunner::run('grade — no player id on leg → pending (pre-capture legs never mis-grade)', function () use ($resp, $leg): void {
    $stats = $resp('p1', [['Doubles', '2B', 3, 'batting']]);
    TestRunner::assertEquals('pending', PlayerPropSettlement::grade($leg('batter_doubles', 0.5, 'Over', null), $stats), 'null pid → pending');
    TestRunner::assertEquals('pending', PlayerPropSettlement::grade($leg('batter_doubles', 0.5, 'Over', ''), $stats), 'empty pid → pending');
});

TestRunner::run('grade — unknown / yes-no market → pending', function () use ($resp, $leg): void {
    $stats = $resp('p1', [['Double Double', 'DD', 1, 'basketball']]);
    TestRunner::assertEquals('pending', PlayerPropSettlement::grade($leg('player_double_double', 0.5, 'Over', 'p1'), $stats), 'double_double → pending');
});

TestRunner::run('grade — incomplete (non-final) stats → pending', function () use ($resp, $leg): void {
    $stats = $resp('p1', [['Doubles', '2B', 1, 'batting']], false); // meta.complete = false
    TestRunner::assertEquals('pending', PlayerPropSettlement::grade($leg('batter_doubles', 0.5, 'Over', 'p1'), $stats), 'incomplete → pending');
});

TestRunner::run('grade — batting vs pitching disambiguation (two-way player)', function () use ($resp, $leg): void {
    // Same player has BOTH a batting "Hits" (2) and a pitching "Hits Allowed" (5).
    $stats = $resp('ohtani', [
        ['Hits', 'H', 2, 'batting'],
        ['Hits Allowed', 'HA', 5, 'pitching'],
    ]);
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('batter_hits', 1.5, 'Over', 'ohtani'), $stats), 'batter_hits uses batting 2');
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('pitcher_hits_allowed', 4.5, 'Over', 'ohtani'), $stats), 'pitcher_hits_allowed uses pitching 5');
    TestRunner::assertEquals('lost', PlayerPropSettlement::grade($leg('batter_hits', 3.5, 'Over', 'ohtani'), $stats), 'batter_hits did NOT pick up the pitching 5');
});

TestRunner::run('grade — alias matching tolerates label variants', function () use ($resp, $leg): void {
    // Feed labels the stat only by abbreviation; grader still resolves it.
    $stats = $resp('p1', [['', 'HR', 2, 'batting']]);
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('batter_home_runs', 1.5, 'Over', 'p1'), $stats), 'HR abbr resolves home runs');
});

TestRunner::run('grade — empty/garbage stats response → pending', function () use ($leg): void {
    TestRunner::assertEquals('pending', PlayerPropSettlement::grade($leg('batter_doubles', 0.5, 'Over', 'p1'), []), 'empty response → pending');
    TestRunner::assertEquals('pending', PlayerPropSettlement::grade($leg('batter_doubles', 0.5, 'Over', 'p1'), ['items' => []]), 'no items → pending');
});

// ── Soccer ──────────────────────────────────────────────────────────────────
// Soccer props reach the grader as Over (N-0.5) legs (the "N or more" booking
// markets are synthesized that way at ingestion), graded off the Rundown box
// score whose display names are "Total Goals" / "Assists" / "Shots On Goal" /
// "Fouls Committed" / "Saves". First/last goal scorer have no box-score
// ordering data and must stay pending (manual settlement).
TestRunner::run('grade — soccer keys are gradable; scorer-order keys are not', function (): void {
    TestRunner::assertTrue(PlayerPropSettlement::isGradableProp('player_goals'), 'player_goals');
    TestRunner::assertTrue(PlayerPropSettlement::isGradableProp('player_shots_on_target'), 'player_shots_on_target');
    TestRunner::assertTrue(PlayerPropSettlement::isGradableProp('player_fouls'), 'player_fouls');
    TestRunner::assertTrue(PlayerPropSettlement::isGradableProp('player_saves'), 'player_saves');
    TestRunner::assertTrue(PlayerPropSettlement::isGradableProp('player_goals_assists'), 'player_goals_assists');
    TestRunner::assertFalse(PlayerPropSettlement::isGradableProp('player_first_goal_scorer'), 'first scorer → manual');
    TestRunner::assertFalse(PlayerPropSettlement::isGradableProp('player_last_goal_scorer'), 'last scorer → manual');
});

TestRunner::run('grade — soccer "N or more" thresholds off box-score stats', function () use ($resp, $leg): void {
    // Anytime scorer (Over 0.5 Total Goals).
    $scored = $resp('p1', [['Total Goals', 'G', 1, 'soccer_player']]);
    $blank  = $resp('p2', [['Total Goals', 'G', 0, 'soccer_player']]);
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('player_goals', 0.5, 'Over', 'p1'), $scored), '1 goal ≥1 → won');
    TestRunner::assertEquals('lost', PlayerPropSettlement::grade($leg('player_goals', 0.5, 'Over', 'p2'), $blank), '0 goals → lost');
    // To score 2+ (Over 1.5) with 1 goal → lost.
    TestRunner::assertEquals('lost', PlayerPropSettlement::grade($leg('player_goals', 1.5, 'Over', 'p1'), $scored), '1 goal, 2+ → lost');

    // 1+/2+ shots on target — box-score display name is "Shots On Goal".
    $sot = $resp('p3', [['Shots On Goal', 'SOG', 2, 'soccer_player']]);
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('player_shots_on_target', 0.5, 'Over', 'p3'), $sot), '2 SoT, 1+ → won');
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('player_shots_on_target', 1.5, 'Over', 'p3'), $sot), '2 SoT, 2+ → won');
    TestRunner::assertEquals('lost', PlayerPropSettlement::grade($leg('player_shots_on_target', 2.5, 'Over', 'p3'), $sot), '2 SoT, 3+ → lost');

    // Goalkeeper saves.
    $keeper = $resp('gk', [['Saves', 'SV', 3, 'soccer_player']]);
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('player_saves', 2.5, 'Over', 'gk'), $keeper), '3 saves, 3+ → won');
});

TestRunner::run('grade — soccer "to score or assist" sums goals + assists', function () use ($resp, $leg): void {
    $assistOnly = $resp('p1', [['Total Goals', 'G', 0, 'soccer_player'], ['Assists', 'A', 1, 'soccer_player']]);
    $neither    = $resp('p2', [['Total Goals', 'G', 0, 'soccer_player'], ['Assists', 'A', 0, 'soccer_player']]);
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('player_goals_assists', 0.5, 'Over', 'p1'), $assistOnly), '0G+1A ≥1 → won');
    TestRunner::assertEquals('lost', PlayerPropSettlement::grade($leg('player_goals_assists', 0.5, 'Over', 'p2'), $neither), '0G+0A → lost');
    // Missing the assists component → never guess a 0; stay pending.
    $goalsOnly = $resp('p3', [['Total Goals', 'G', 1, 'soccer_player']]);
    TestRunner::assertEquals('pending', PlayerPropSettlement::grade($leg('player_goals_assists', 0.5, 'Over', 'p3'), $goalsOnly), 'missing assists → pending');
});

TestRunner::run('grade — soccer anytime assist matches "Assists" display name', function () use ($resp, $leg): void {
    $stats = $resp('p1', [['Assists', 'A', 1, 'soccer_player']]);
    TestRunner::assertEquals('won', PlayerPropSettlement::grade($leg('player_assists', 0.5, 'Over', 'p1'), $stats), '1 assist, 1+ → won');
});
