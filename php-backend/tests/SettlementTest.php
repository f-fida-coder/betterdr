<?php

declare(strict_types=1);

/**
 * Unit tests for SportsbookBetSupport settlement logic:
 *   - selectionResult()  : H2H / spreads / totals outcome resolution
 *   - evaluateTicket()   : straight / parlay / teaser / if_bet / reverse ticket evaluation
 */

// ── Stubs (same as BetCalculationTest) ───────────────────────────────────────

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
        public function __construct(string $message, int $code = 0, private array $extra = [])
        {
            parent::__construct($message, $code);
        }
    }
}

if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return date('c'); }
        public static function id(string $id): string { return $id; }
    }
}

if (!class_exists('SportsMatchStatus')) {
    class SportsMatchStatus
    {
        public static function effectiveStatus(array $match): string
        {
            return (string) ($match['effectiveStatus'] ?? $match['status'] ?? 'pending');
        }
    }
}

require_once __DIR__ . '/../src/SportsbookBetSupport.php';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a finished match with score. */
function match_(string $home, string $away, float $scoreHome, float $scoreAway, string $status = 'finished'): array
{
    return [
        'homeTeam'        => $home,
        'awayTeam'        => $away,
        'status'          => $status,
        'score'           => ['score_home' => $scoreHome, 'score_away' => $scoreAway],
    ];
}

/** Build a selection. */
function selection_(string $marketType, string $sel, ?float $point = null): array
{
    $s = ['marketType' => $marketType, 'selection' => $sel, 'status' => 'pending'];
    if ($point !== null) {
        $s['point'] = $point;
    }
    return $s;
}

/** Build a selection row for evaluateTicket (has odds + status). */
function row_(float $odds, string $status, int $order = 0): array
{
    return ['odds' => $odds, 'status' => $status, 'selectionOrder' => $order];
}

/** Build a minimal bet array. */
function bet_(string $type, float $amount, float $potentialPayout = 0.0): array
{
    return ['type' => $type, 'amount' => $amount, 'potentialPayout' => $potentialPayout];
}

// ── selectionResult — H2H ─────────────────────────────────────────────────────

TestRunner::run('selectionResult — H2H / moneyline', function (): void {
    $m = match_('Chiefs', 'Eagles', 24, 17);

    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('h2h', 'Chiefs')), 'home winner wins');
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('h2h', 'Eagles')), 'home winner, away loses');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('moneyline', 'Chiefs')), 'moneyline alias');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('ml', 'Chiefs')), 'ml alias');

    // Away wins
    $m2 = match_('Lakers', 'Celtics', 101, 110);
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m2, selection_('h2h', 'Lakers')), 'away winner, home loses');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m2, selection_('h2h', 'Celtics')), 'away winner wins');

    // Draw
    $draw = match_('Man City', 'Arsenal', 1, 1);
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($draw, selection_('h2h', 'Draw')), 'draw selection wins on draw');
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($draw, selection_('h2h', 'Man City')), 'team selection void on draw');
});

TestRunner::run('selectionResult — H2H status guards', function (): void {
    $canceled = match_('A', 'B', 0, 0, 'canceled');
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($canceled, selection_('h2h', 'A')), 'canceled → void');

    // 'expired' is the "feed went quiet past grace window" catch-all.
    // Policy: do NOT auto-void — keep pending so an operator can confirm
    // the actual outcome before money moves. Locked in lockstep with
    // SportsbookBetSupport::selectionResult and BetSettlementService's
    // settle loop (which both explicitly exclude 'expired'). If you
    // want to change this back to void, change BOTH source sites first;
    // a silent refund of un-graded bets caused real money-safety bugs.
    $expired = match_('A', 'B', 0, 0, 'expired');
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($expired, selection_('h2h', 'A')), 'expired → pending (operator-review policy)');

    $live = match_('A', 'B', 1, 0, 'live');
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($live, selection_('h2h', 'A')), 'non-finished → pending');

    // manual winner override
    $m = match_('Chiefs', 'Eagles', 24, 17, 'finished');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('h2h', 'Eagles'), 'Eagles'), 'manual override wins');
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('h2h', 'Chiefs'), 'Eagles'), 'manual override loses');
});

// ── selectionResult — Spreads ─────────────────────────────────────────────────

TestRunner::run('selectionResult — spreads', function (): void {
    // Chiefs -3.5 vs Eagles — Chiefs win 27-20, cover −3.5 (27−3.5=23.5 > 20)
    $m = match_('Chiefs', 'Eagles', 27, 20);
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('spreads', 'Chiefs', -3.5)), 'home -3.5 covered');
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('spreads', 'Eagles', 3.5)),  'away +3.5 not covered');

    // Chiefs -10 vs Eagles — Chiefs win 27-20, do NOT cover −10 (27−10=17 < 20)
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('spreads', 'Chiefs', -10.0)), 'home -10 not covered');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('spreads', 'Eagles', 10.0)),  'away +10 covered');

    // Push: Chiefs -7 — 27−7 = 20 exactly
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($m, selection_('spreads', 'Chiefs', -7.0)), 'exact push → void');
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($m, selection_('spreads', 'Eagles', 7.0)),  'push away → void');
});

// ── selectionResult — Totals ──────────────────────────────────────────────────

TestRunner::run('selectionResult — totals', function (): void {
    // 27+20 = 47 total
    $m = match_('Chiefs', 'Eagles', 27, 20);

    // Over 44.5 → 47 > 44.5 → won
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('totals', 'Over Chiefs Eagles', 44.5)), 'over hits');
    // Under 44.5 → 47 > 44.5 → lost
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('totals', 'Under Chiefs Eagles', 44.5)), 'under misses');

    // Over 49.5 → 47 < 49.5 → lost
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('totals', 'Over Chiefs Eagles', 49.5)), 'over misses');
    // Under 49.5 → 47 < 49.5 → won
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('totals', 'Under Chiefs Eagles', 49.5)), 'under hits');

    // Push: total = 47 exactly
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($m, selection_('totals', 'Over Chiefs Eagles', 47.0)),  'over push → void');
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($m, selection_('totals', 'Under Chiefs Eagles', 47.0)), 'under push → void');
});

// ── selectionResult — Tennis (games vs sets) ──────────────────────────────────

/** Tennis match: score_home/away are SETS; by_period are games per set. */
function tennis_(string $home, string $away, array $homeGamesBySet, array $awayGamesBySet, int $setsHome, int $setsAway, string $status = 'finished'): array
{
    return [
        'homeTeam'        => $home,
        'awayTeam'        => $away,
        'sportKey'        => 'tennis_atp',
        'status'          => $status,
        'score'           => [
            'score_home'           => $setsHome,
            'score_away'           => $setsAway,
            'score_home_by_period' => $homeGamesBySet,
            'score_away_by_period' => $awayGamesBySet,
        ],
    ];
}

TestRunner::run('selectionResult — tennis grades spread/total by GAMES not sets', function (): void {
    // Huesler beats Onclin 2-0 in sets; games 6-3, 6-4 → 12 games vs 7 games.
    $m = tennis_('Huesler', 'Onclin', [6, 6], [3, 4], 2, 0);

    // Spread is GAMES. Huesler -3.5: 12 - 3.5 = 8.5 > 7 → won. If this graded
    // against SETS (2 - 3.5 = -1.5 > 0?) it would wrongly be 'lost'.
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('spreads', 'Huesler', -3.5)), 'home games spread covered');
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('spreads', 'Onclin', 3.5)),  'away games spread not covered');

    // Total is GAMES = 12 + 7 = 19. Over 22.5 → lost; Under 22.5 → won.
    // Against sets (2) both would be wrong.
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('totals', 'Over Huesler Onclin', 22.5)),  'games total over misses');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('totals', 'Under Huesler Onclin', 22.5)), 'games total under hits');

    // Moneyline still uses sets (2-0) → home wins.
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('h2h', 'Huesler')), 'tennis ML by sets');
});

TestRunner::run('selectionResult — tennis tolerates short/full player names', function (): void {
    // homeTeam carries the full form; the bet stored the short surname.
    $m = tennis_('M. Huesler', 'G. Onclin', [6, 6], [3, 4], 2, 0);
    TestRunner::assertEquals('won', SportsbookBetSupport::selectionResult($m, selection_('spreads', 'Huesler', -3.5)), 'short surname resolves to home side');
    TestRunner::assertEquals('won', SportsbookBetSupport::selectionResult($m, selection_('h2h', 'Huesler')), 'short surname ML resolves');
});

TestRunner::run('selectionResult — tennis with no per-set games stays pending', function (): void {
    // Finished but feed shipped no by_period games → cannot compute total
    // games → leave pending rather than grade against sets. Money-safe.
    $m = tennis_('Huesler', 'Onclin', [], [], 2, 0);
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($m, selection_('spreads', 'Huesler', -3.5)), 'no games data → pending');
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($m, selection_('totals', 'Over Huesler Onclin', 22.5)), 'no games data → pending');
});

TestRunner::run('selectionResult — non-tennis spread/total unchanged', function (): void {
    // Regression guard: NFL still grades against score_home/score_away.
    $m = match_('Chiefs', 'Eagles', 27, 20); // no sportKey → default path
    TestRunner::assertEquals('won', SportsbookBetSupport::selectionResult($m, selection_('spreads', 'Chiefs', -3.5)), 'NFL spread still uses raw score');
    TestRunner::assertEquals('won', SportsbookBetSupport::selectionResult($m, selection_('totals', 'Over Chiefs Eagles', 44.5)), 'NFL total still uses raw score');
});

// ── selectionResult — alternate full-game lines ───────────────────────────────

TestRunner::run('selectionResult — alternate_spreads / alternate_totals grade like base', function (): void {
    // Alt lines carry their own point; they must grade identically to the
    // base spread/total. Previously fell through to 'pending' forever.
    $m = match_('Chiefs', 'Eagles', 27, 20); // total 47
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('alternate_spreads', 'Chiefs', -3.5)), 'alt spread covered');
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('alternate_spreads', 'Chiefs', -10.0)), 'alt spread not covered');
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($m, selection_('alternate_spreads', 'Chiefs', -7.0)), 'alt spread exact push');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('alternate_totals', 'Over Chiefs Eagles', 44.5)), 'alt total over hits');
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('alternate_totals', 'Under Chiefs Eagles', 44.5)), 'alt total under misses');
});

// ── selectionResult — period / half / quarter / inning markets ────────────────

/** Build a finished match carrying per-period scores. */
function periodMatch_(string $sportKey, string $home, string $away, array $homeBy, array $awayBy): array
{
    return [
        'homeTeam'        => $home,
        'awayTeam'        => $away,
        'sportKey'        => $sportKey,
        'status'          => 'finished',
        'score'           => [
            'score_home'           => array_sum($homeBy),
            'score_away'           => array_sum($awayBy),
            'score_home_by_period' => $homeBy,
            'score_away_by_period' => $awayBy,
        ],
    ];
}

TestRunner::run('selectionResult — NBA quarters', function (): void {
    // Quarters: home [28,25,30,22]=105, away [24,30,26,25]=105.
    $m = periodMatch_('basketball_nba', 'Lakers', 'Celtics', [28, 25, 30, 22], [24, 30, 26, 25]);
    // Q1: 28 vs 24 → home wins ML, covers -2.5
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('h2h_q1', 'Lakers')), 'Q1 ML home wins');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('spreads_q1', 'Lakers', -2.5)), 'Q1 spread covered');
    // Q2: 25 vs 30 → away wins; total 55
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('h2h_q2', 'Lakers')), 'Q2 ML home loses');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('totals_q2', 'Over', 54.5)), 'Q2 total over hits');
    // Q3 tie 30 vs 26? no — 30 vs 26 home wins. Use Q1 tie scenario separately.
    // H1 = Q1+Q2 = 53 vs 54 → away wins by 1
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('h2h_h1', 'Lakers')), 'H1 ML home loses (53 vs 54)');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('h2h_h1', 'Celtics')), 'H1 ML away wins');
    // H2 = Q3+Q4 = 52 vs 51 → home wins
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('h2h_h2', 'Lakers')), 'H2 ML home wins (52 vs 51)');
    // Alt period line collapses to base + period
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('alternate_spreads_q1', 'Lakers', -2.5)), 'alt Q1 spread covered');
});

TestRunner::run('selectionResult — NBA quarter tie pushes spread / void ML', function (): void {
    $m = periodMatch_('basketball_nba', 'Lakers', 'Celtics', [25, 25, 30, 25], [25, 30, 26, 24]);
    // Q1 tie 25-25 → ML void, spread -0 ... use pick'em spread 0 → push
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($m, selection_('h2h_q1', 'Lakers')), 'Q1 tie ML → void');
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($m, selection_('spreads_q1', 'Lakers', 0.0)), 'Q1 tie pick-em → push');
});

TestRunner::run('selectionResult — NHL periods', function (): void {
    // Periods: home [1,2,0]=3, away [0,1,2]=3
    $m = periodMatch_('icehockey_nhl', 'Rangers', 'Bruins', [1, 2, 0], [0, 1, 2]);
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('h2h_p1', 'Rangers')), 'P1 home wins 1-0');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('h2h_p2', 'Rangers')), 'P2 home wins 2-1');
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('h2h_p3', 'Rangers')), 'P3 home loses 0-2');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('totals_p3', 'Over', 1.5)), 'P3 total 2 over 1.5');
});

TestRunner::run('selectionResult — MLB inning splits', function (): void {
    // 9 innings; home runs by inning, away by inning.
    $home = [0, 1, 0, 0, 2, 0, 1, 0, 0]; // F5 = 0+1+0+0+2 = 3
    $away = [1, 0, 0, 1, 0, 0, 0, 1, 0]; // F5 = 1+0+0+1+0 = 2
    $m = periodMatch_('baseball_mlb', 'Dodgers', 'Tigers', $home, $away);
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('h2h_1st_5_innings', 'Dodgers')), 'F5 home leads 3-2');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($m, selection_('totals_1st_5_innings', 'Over', 4.5)), 'F5 total 5 over 4.5');
    // F3 = home 0+1+0=1, away 1+0+0=1 → tie
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($m, selection_('h2h_1st_3_innings', 'Dodgers')), 'F3 tie → void');
    // F1 = home 0, away 1 → away wins
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($m, selection_('h2h_1st_1_innings', 'Dodgers')), 'F1 home loses');
});

TestRunner::run('selectionResult — soccer & NCAAB halves use single period index', function (): void {
    // Soccer by_period is two halves: home [1,2]=3, away [0,1]=1.
    $soc = periodMatch_('soccer_epl', 'Arsenal', 'Chelsea', [1, 2], [0, 1]);
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($soc, selection_('h2h_h1', 'Arsenal')), 'soccer H1 home 1-0');
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($soc, selection_('totals_h2', 'Over', 2.5)), 'soccer H2 total 3 over 2.5');
    // NCAAB genuinely two halves.
    $ncaab = periodMatch_('basketball_ncaab', 'Duke', 'UNC', [40, 38], [35, 40]);
    TestRunner::assertEquals('won',  SportsbookBetSupport::selectionResult($ncaab, selection_('h2h_h1', 'Duke')), 'NCAAB H1 home 40-35');
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($ncaab, selection_('h2h_h2', 'Duke')), 'NCAAB H2 home 38-40 loses');
});

TestRunner::run('selectionResult — MONEY-SAFE guards leave bets pending, never mis-grade', function (): void {
    // A halves-only (2-element) array must NEVER be graded as quarters —
    // summing [0,1] would be the whole game. The minPeriods=4 guard forces
    // pending instead. This is the catastrophic mis-pay this guard prevents.
    $shortNba = periodMatch_('basketball_nba', 'Lakers', 'Celtics', [55, 50], [52, 53]);
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($shortNba, selection_('h2h_h1', 'Lakers')), '2-element array → not graded as quarters');
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($shortNba, selection_('h2h_q4', 'Lakers')), 'Q4 needs 4 periods → pending');

    // Empty by_period → pending.
    $empty = periodMatch_('basketball_nba', 'Lakers', 'Celtics', [], []);
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($empty, selection_('h2h_q1', 'Lakers')), 'no period data → pending');

    // Unknown sport's halves → pending (we don't know its period layout).
    $unknown = periodMatch_('handball_xyz', 'A', 'B', [10, 12], [11, 9]);
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($unknown, selection_('h2h_h1', 'A')), 'unknown sport halves → pending');

    // MLB F7 with only 6 innings recorded → pending (can't grade first 7).
    $sixInn = periodMatch_('baseball_mlb', 'A', 'B', [0, 1, 0, 0, 1, 0], [0, 0, 1, 0, 0, 0]);
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($sixInn, selection_('h2h_1st_7_innings', 'A')), 'F7 needs 7 innings → pending');
});

TestRunner::run('selectionResult — unsupported market families stay pending (manual)', function (): void {
    // These need a dimension the score doc doesn't carry, or have house-rule
    // nuance we won't guess. They must stay pending for an operator.
    $m = periodMatch_('basketball_nba', 'Lakers', 'Celtics', [28, 25, 30, 22], [24, 30, 26, 25]);
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($m, selection_('h2h_3_way', 'Lakers')), '3-way ML → pending');
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($m, selection_('h2h_3_way_q1', 'Lakers')), '3-way period → pending');
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($m, selection_('team_totals', 'Over', 100.0)), 'team totals → pending');
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($m, selection_('team_totals_q1', 'Over', 25.0)), 'team totals period → pending');
    $soc = periodMatch_('soccer_epl', 'Arsenal', 'Chelsea', [1, 2], [0, 1]);
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($soc, selection_('btts', 'Yes')), 'BTTS → pending');
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($soc, selection_('draw_no_bet', 'Arsenal')), 'draw-no-bet → pending');
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($soc, selection_('double_chance', 'Arsenal/Draw')), 'double-chance → pending');
    TestRunner::assertEquals('pending', SportsbookBetSupport::selectionResult($m, selection_('player_points', 'LeBron Over', 27.5)), 'player prop → pending');
});

// ── selectionResult — Buy Points (graded off the ADJUSTED bought line) ────────

TestRunner::run('selectionResult — buy points spread grades off bought line', function (): void {
    // Eagles were +1.5 underdogs; bettor bought +0.5 → stored point is +2.0
    // (selectionForInsert persists the adjusted `point`; settlement reads it).
    // Three Chiefs-by-N scenarios prove win / push / loss flip around +2.
    // Eagles are the AWAY side here.
    $lostBy1 = match_('Chiefs', 'Eagles', 24, 23); // away +2 → 25 > 24 → won
    TestRunner::assertEquals('won', SportsbookBetSupport::selectionResult($lostBy1, selection_('spreads', 'Eagles', 2.0)), 'bought +2, lose by 1 → won');

    $lostBy2 = match_('Chiefs', 'Eagles', 24, 22); // away +2 → 24 == 24 → push
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($lostBy2, selection_('spreads', 'Eagles', 2.0)), 'bought +2, lose by 2 → push/void');

    $lostBy3 = match_('Chiefs', 'Eagles', 24, 21); // away +2 → 23 < 24 → lost
    TestRunner::assertEquals('lost', SportsbookBetSupport::selectionResult($lostBy3, selection_('spreads', 'Eagles', 2.0)), 'bought +2, lose by 3 → lost');
});

TestRunner::run('selectionResult — buy points total grades off bought line', function (): void {
    // Over 47.5, bought 1.0 → stored point 46.5 (Over shrinks the number).
    // Game lands on 46 → win; 47 → win; 46.5 can't occur (half-point), but a
    // bought-to-whole push case: buy 1.5 → 46.0, total exactly 46 → push.
    $total46 = match_('Chiefs', 'Eagles', 23, 23); // total 46
    TestRunner::assertEquals('won', SportsbookBetSupport::selectionResult($total46, selection_('totals', 'Over Chiefs Eagles', 45.5)), 'bought Over to 45.5, total 46 → won');
    // Bought Over down to exactly 46 (e.g. 47.5 - 1.5) → push on a 46 total.
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($total46, selection_('totals', 'Over Chiefs Eagles', 46.0)), 'bought Over to 46.0, total 46 → push/void');
    // Under bought UP to 46.5: total 46 < 46.5 → won.
    TestRunner::assertEquals('won', SportsbookBetSupport::selectionResult($total46, selection_('totals', 'Under Chiefs Eagles', 46.5)), 'bought Under to 46.5, total 46 → won');
});

// ── evaluateTicket — straight ────────────────────────────────────────────────

TestRunner::run('evaluateTicket — straight', function (): void {
    $bet = bet_('straight', 100.0, 200.0);

    TestRunner::assertEquals('won',     (SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won')]))['status'],  'straight won status');
    TestRunner::assertEqualsFloat(200.0, (SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won')]))['payout'],  'straight won payout');

    TestRunner::assertEquals('lost',    (SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'lost')]))['status'], 'straight lost status');
    TestRunner::assertEqualsFloat(0.0,   (SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'lost')]))['payout'], 'straight lost payout');

    TestRunner::assertEquals('void',    (SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'void')]))['status'], 'straight void status');
    TestRunner::assertEqualsFloat(100.0, (SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'void')]))['payout'], 'straight void returns stake');

    TestRunner::assertEquals('pending', (SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'pending')]))['status'], 'straight pending');
});

// ── evaluateTicket — parlay ──────────────────────────────────────────────────

TestRunner::run('evaluateTicket — parlay', function (): void {
    $bet = bet_('parlay', 100.0, 400.0);

    // all won: 100 × 2.0 × 2.0 = 400
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won', 0), row_(2.0, 'won', 1)]);
    TestRunner::assertEquals('won', $result['status'], 'parlay all won');
    TestRunner::assertEqualsFloat(400.0, $result['payout'], 'parlay payout = stake × product');

    // any lost → lost
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won', 0), row_(2.0, 'lost', 1)]);
    TestRunner::assertEquals('lost', $result['status'], 'parlay one lost → lost');
    TestRunner::assertEqualsFloat(0.0, $result['payout'], 'parlay lost payout = 0');

    // any pending → pending
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won', 0), row_(2.0, 'pending', 1)]);
    TestRunner::assertEquals('pending', $result['status'], 'parlay pending leg → pending');

    // all void → void (returns stake)
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'void', 0), row_(2.0, 'void', 1)]);
    TestRunner::assertEquals('void', $result['status'], 'parlay all void → void');
    TestRunner::assertEqualsFloat(100.0, $result['payout'], 'parlay void returns stake');
});

// ── evaluateTicket — teaser ──────────────────────────────────────────────────

TestRunner::run('evaluateTicket — teaser', function (): void {
    $teaserRule = ['payoutProfile' => ['type' => 'table_multiplier', 'multipliers' => ['2' => 1.8, '3' => 2.6]]];
    $bet = bet_('teaser', 100.0, 180.0);

    // all won: 100 × 1.8 (2-leg)
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won', 0), row_(2.0, 'won', 1)], $teaserRule);
    TestRunner::assertEquals('won', $result['status'], 'teaser all won');
    TestRunner::assertEqualsFloat(180.0, $result['payout'], 'teaser payout = stake × multiplier[2]');

    // one lost → lost
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won', 0), row_(2.0, 'lost', 1)], $teaserRule);
    TestRunner::assertEquals('lost', $result['status'], 'teaser one lost → lost');

    // pending leg → pending
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won', 0), row_(2.0, 'pending', 1)], $teaserRule);
    TestRunner::assertEquals('pending', $result['status'], 'teaser pending → pending');

    // all void → void (returns stake)
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'void', 0), row_(2.0, 'void', 1)], $teaserRule);
    TestRunner::assertEquals('void', $result['status'], 'teaser all void → void');
    TestRunner::assertEqualsFloat(100.0, $result['payout'], 'teaser void returns stake');
});

// ── evaluateTicket — if_bet ──────────────────────────────────────────────────

TestRunner::run('evaluateTicket — if_bet', function (): void {
    // amount=100, unitStake=100 (straight); payout = 100 × 2.0 × 2.0 = 400 if both win
    $bet = bet_('if_bet', 100.0, 400.0);

    // both won: stake × odds1 × odds2
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won', 0), row_(2.0, 'won', 1)]);
    TestRunner::assertEquals('won', $result['status'], 'if_bet both won');
    TestRunner::assertEqualsFloat(400.0, $result['payout'], 'if_bet payout = stake × product');

    // first lost → lost immediately (second not evaluated)
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'lost', 0), row_(2.0, 'won', 1)]);
    TestRunner::assertEquals('lost', $result['status'], 'if_bet first lost → lost');
    TestRunner::assertEqualsFloat(0.0, $result['payout'], 'if_bet first lost payout 0');

    // first pending → pending
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'pending', 0), row_(2.0, 'won', 1)]);
    TestRunner::assertEquals('pending', $result['status'], 'if_bet first pending → pending');

    // first void → fall through to second (second won: stake × odds2)
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'void', 0), row_(2.0, 'won', 1)]);
    TestRunner::assertEquals('won', $result['status'], 'if_bet first void, second won → won');
    TestRunner::assertEqualsFloat(200.0, $result['payout'], 'if_bet first void payout = stake × odds2');

    // first won, second lost → lost
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won', 0), row_(2.0, 'lost', 1)]);
    TestRunner::assertEquals('lost', $result['status'], 'if_bet first won, second lost → lost');

    // first won, second void → win on first leg only
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won', 0), row_(2.0, 'void', 1)]);
    TestRunner::assertEquals('won', $result['status'], 'if_bet second void → won on first leg');
    TestRunner::assertEqualsFloat(200.0, $result['payout'], 'if_bet second void payout = stake × odds1');
});

// ── evaluateTicket — reverse ─────────────────────────────────────────────────

TestRunner::run('evaluateTicket — reverse', function (): void {
    // amount=100 → unitStake=50 (halved); riskAmount=100
    $bet = bet_('reverse', 100.0, 400.0);

    // both won: (50×2×2) + (50×2×2) = 200 + 200 = 400
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'won', 0), row_(2.0, 'won', 1)]);
    TestRunner::assertEquals('won', $result['status'], 'reverse both won');
    TestRunner::assertEqualsFloat(400.0, $result['payout'], 'reverse payout = both legs combined');

    // first leg lost: A→B lost (0), B→A also first leg=B(lost)=0; total=0 → lost
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'lost', 0), row_(2.0, 'won', 1)]);
    TestRunner::assertEquals('lost', $result['status'], 'reverse first lost second won → lost');

    // both lost → lost
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'lost', 0), row_(2.0, 'lost', 1)]);
    TestRunner::assertEquals('lost', $result['status'], 'reverse both lost → lost');

    // pending → pending
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'pending', 0), row_(2.0, 'won', 1)]);
    TestRunner::assertEquals('pending', $result['status'], 'reverse pending → pending');

    // both void → void with stake returned
    $result = SportsbookBetSupport::evaluateTicket($bet, [row_(2.0, 'void', 0), row_(2.0, 'void', 1)]);
    TestRunner::assertEquals('void', $result['status'], 'reverse both void → void');
    TestRunner::assertEqualsFloat(100.0, $result['payout'], 'reverse void returns risk amount');
});

// ── evaluateTicket — empty selections ────────────────────────────────────────

TestRunner::run('evaluateTicket — no selections', function (): void {
    $bet = bet_('straight', 100.0, 200.0);
    $result = SportsbookBetSupport::evaluateTicket($bet, []);
    TestRunner::assertEquals('pending', $result['status'], 'empty rows → pending');
    TestRunner::assertEqualsFloat(200.0, $result['payout'], 'empty rows keeps potentialPayout');
});
