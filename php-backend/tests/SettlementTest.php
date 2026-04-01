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
        'effectiveStatus' => $status,
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

    $expired = match_('A', 'B', 0, 0, 'expired');
    TestRunner::assertEquals('void', SportsbookBetSupport::selectionResult($expired, selection_('h2h', 'A')), 'expired → void');

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
