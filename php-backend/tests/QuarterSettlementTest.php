<?php

declare(strict_types=1);

/**
 * End-to-end SETTLEMENT tests for soccer Asian quarter (.25/.75 split-stake)
 * lines wired through the live payout path:
 *   - selectionResultDetailed()  : (status, settleFraction) disposition
 *   - evaluateTicket()           : straight / parlay / if_bet DOLLAR payout
 *   - OpenParlayService          : settle-timing gate with a quarter leg
 *
 * The binary (half/whole-line) behaviour is locked by SettlementTest's 1200+
 * assertions; THIS file proves the quarter additions pay the correct partial
 * AND that a 0 < payout < stake ticket classifies 'lost' (approved net rule).
 */

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

require_once __DIR__ . '/../src/OddsMarketCatalog.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/OpenParlayService.php';

// ── Helpers (unique names — SettlementTest declares match_/row_/bet_) ────────

/** Finished soccer match with a final score. */
function qmatch_(string $home, string $away, float $sh, float $sa): array
{
    return [
        'homeTeam' => $home,
        'awayTeam' => $away,
        'status'   => 'finished',
        'score'    => ['score_home' => $sh, 'score_away' => $sa],
    ];
}

/** Selection row for evaluateTicket — odds + binary status + settleFraction. */
function qrow_(float $odds, string $status, float $settleFraction = 1.0, int $order = 0): array
{
    return ['odds' => $odds, 'status' => $status, 'settleFraction' => $settleFraction, 'selectionOrder' => $order];
}

function qbet_(string $type, float $amount, float $potentialPayout = 0.0): array
{
    return ['type' => $type, 'amount' => $amount, 'potentialPayout' => $potentialPayout];
}

// ── selectionResultDetailed — quarter disposition + settleFraction ───────────

TestRunner::run('quarter disposition — spreads -0.25 / +0.25 on a draw', function (): void {
    // Switzerland 1 — Canada 1 (a draw). Asian quarter on the spread.
    $draw = qmatch_('Switzerland', 'Canada', 1, 1);

    // Switzerland -0.25 on a draw: lower line PK (push) + upper line -0.5
    // (loss) → HALF LOSS → status 'lost', settleFraction 0.5.
    $homeQuarter = SportsbookBetSupport::selectionResultDetailed($draw, ['marketType' => 'spreads', 'selection' => 'Switzerland', 'point' => -0.25, 'status' => 'pending']);
    TestRunner::assertEquals('lost', $homeQuarter['status'], 'home -0.25 on draw → half loss → lost');
    TestRunner::assertEqualsFloat(0.5, $homeQuarter['settleFraction'], 'home -0.25 on draw → settleFraction 0.5');

    // Canada +0.25 on a draw: lower line PK (push) + upper line +0.5 (win)
    // → HALF WIN → status 'won', settleFraction 0.5. Symmetric to the above.
    $awayQuarter = SportsbookBetSupport::selectionResultDetailed($draw, ['marketType' => 'spreads', 'selection' => 'Canada', 'point' => 0.25, 'status' => 'pending']);
    TestRunner::assertEquals('won', $awayQuarter['status'], 'away +0.25 on draw → half win → won');
    TestRunner::assertEqualsFloat(0.5, $awayQuarter['settleFraction'], 'away +0.25 on draw → settleFraction 0.5');
});

TestRunner::run('quarter disposition — full win / full loss (no split)', function (): void {
    // Switzerland 2 — Canada 0 (decisive home win by 2).
    $win = qmatch_('Switzerland', 'Canada', 2, 0);

    // Home -0.25: PK win + -0.5 win → FULL win, fraction 1.0.
    $homeFull = SportsbookBetSupport::selectionResultDetailed($win, ['marketType' => 'spreads', 'selection' => 'Switzerland', 'point' => -0.25, 'status' => 'pending']);
    TestRunner::assertEquals('won', $homeFull['status'], 'home -0.25, win by 2 → full win');
    TestRunner::assertEqualsFloat(1.0, $homeFull['settleFraction'], 'full win → fraction 1.0');

    // Away +0.25: PK loss + +0.5 loss → FULL loss, fraction 1.0.
    $awayFull = SportsbookBetSupport::selectionResultDetailed($win, ['marketType' => 'spreads', 'selection' => 'Canada', 'point' => 0.25, 'status' => 'pending']);
    TestRunner::assertEquals('lost', $awayFull['status'], 'away +0.25, lose by 2 → full loss');
    TestRunner::assertEqualsFloat(1.0, $awayFull['settleFraction'], 'full loss → fraction 1.0');
});

TestRunner::run('quarter disposition — totals 2.25 half-win / half-loss', function (): void {
    // Total goals = 2 (1—1). Over 2.25 = Over 2.0 (push) + Over 2.5 (loss) →
    // half loss; Under 2.25 = Under 2.0 (push) + Under 2.5 (win) → half win.
    $two = qmatch_('A', 'B', 1, 1);
    $over = SportsbookBetSupport::selectionResultDetailed($two, ['marketType' => 'totals', 'selection' => 'Over', 'point' => 2.25, 'status' => 'pending']);
    TestRunner::assertEquals('lost', $over['status'], 'Over 2.25 on total 2 → half loss');
    TestRunner::assertEqualsFloat(0.5, $over['settleFraction'], 'Over 2.25 → fraction 0.5');

    $under = SportsbookBetSupport::selectionResultDetailed($two, ['marketType' => 'totals', 'selection' => 'Under', 'point' => 2.25, 'status' => 'pending']);
    TestRunner::assertEquals('won', $under['status'], 'Under 2.25 on total 2 → half win');
    TestRunner::assertEqualsFloat(0.5, $under['settleFraction'], 'Under 2.25 → fraction 0.5');
});

TestRunner::run('non-quarter leg always reports settleFraction 1.0', function (): void {
    $m = qmatch_('A', 'B', 2, 0);
    $half = SportsbookBetSupport::selectionResultDetailed($m, ['marketType' => 'spreads', 'selection' => 'A', 'point' => -1.5, 'status' => 'pending']);
    TestRunner::assertEquals('won', $half['status'], 'normal -1.5 covered');
    TestRunner::assertEqualsFloat(1.0, $half['settleFraction'], 'normal line → fraction 1.0');
    // And the back-compat string API agrees.
    TestRunner::assertEquals('won', SportsbookBetSupport::selectionResult($m, ['marketType' => 'spreads', 'selection' => 'A', 'point' => -1.5, 'status' => 'pending']), 'selectionResult() string unchanged');
});

// ── evaluateTicket — STRAIGHT with a quarter leg ─────────────────────────────

TestRunner::run('straight quarter — half win pays partial profit', function (): void {
    $bet = qbet_('straight', 100.0);
    // odds 1.90, half win → 100 × (0.5·1.90 + 0.5) = 100 × 1.45 = 145.
    $r = SportsbookBetSupport::evaluateTicket($bet, [qrow_(1.90, 'won', 0.5)]);
    TestRunner::assertEquals('won', $r['status'], 'half-win straight → won (net positive)');
    TestRunner::assertEqualsFloat(145.0, $r['payout'], 'half-win straight pays 145 on 100');
});

TestRunner::run('straight quarter — half loss returns half stake, classified lost', function (): void {
    $bet = qbet_('straight', 100.0);
    // odds 1.90, half loss → 100 × (1 − 0.5) = 50. 0 < 50 < 100 → LOST (approved net rule).
    $r = SportsbookBetSupport::evaluateTicket($bet, [qrow_(1.90, 'lost', 0.5)]);
    TestRunner::assertEquals('lost', $r['status'], '0 < payout < stake → lost');
    TestRunner::assertEqualsFloat(50.0, $r['payout'], 'half-loss straight returns 50 (half stake)');
});

TestRunner::run('straight quarter — full win/loss/push reduce to binary', function (): void {
    $bet = qbet_('straight', 100.0);
    $win  = SportsbookBetSupport::evaluateTicket($bet, [qrow_(2.0, 'won', 1.0)]);
    TestRunner::assertEquals('won', $win['status'], 'full win → won');
    TestRunner::assertEqualsFloat(200.0, $win['payout'], 'full win pays stake×odds');
    $loss = SportsbookBetSupport::evaluateTicket($bet, [qrow_(2.0, 'lost', 1.0)]);
    TestRunner::assertEquals('lost', $loss['status'], 'full loss → lost');
    TestRunner::assertEqualsFloat(0.0, $loss['payout'], 'full loss pays 0');
    $push = SportsbookBetSupport::evaluateTicket($bet, [qrow_(2.0, 'void', 1.0)]);
    TestRunner::assertEquals('void', $push['status'], 'push → void');
    TestRunner::assertEqualsFloat(100.0, $push['payout'], 'push refunds stake');
});

// ── evaluateTicket — PARLAY with a quarter leg (Step 1b worked examples) ──────

TestRunner::run('parlay quarter — Variant A: half-win shaves 8.0 → 6.0', function (): void {
    $bet = qbet_('parlay', 100.0);
    // 2 full-win legs @2.0 + 1 half-win @2.0 → 2 × 2 × (0.5·2+0.5=1.5) = 6.0.
    $r = SportsbookBetSupport::evaluateTicket($bet, [
        qrow_(2.0, 'won', 1.0, 0),
        qrow_(2.0, 'won', 1.0, 1),
        qrow_(2.0, 'won', 0.5, 2),
    ]);
    TestRunner::assertEquals('won', $r['status'], 'half-win parlay → won');
    TestRunner::assertEqualsFloat(600.0, $r['payout'], 'half-win leg → 6.0× → 600 (not 800)');
});

TestRunner::run('parlay quarter — Variant B: half-loss reduces but does not zero', function (): void {
    $bet = qbet_('parlay', 100.0);
    // 2 full-win legs @2.0 + 1 half-loss @2.0 → 2 × 2 × (1−0.5=0.5) = 2.0.
    $r = SportsbookBetSupport::evaluateTicket($bet, [
        qrow_(2.0, 'won', 1.0, 0),
        qrow_(2.0, 'won', 1.0, 1),
        qrow_(2.0, 'lost', 0.5, 2),
    ]);
    TestRunner::assertEquals('won', $r['status'], 'half-loss leg does NOT zero the parlay');
    TestRunner::assertEqualsFloat(200.0, $r['payout'], 'half-loss leg → 2.0× → 200');
});

TestRunner::run('parlay quarter — half-loss can drag payout below stake → lost', function (): void {
    $bet = qbet_('parlay', 100.0);
    // 2 pushes (×1) + 1 half-loss @2.0 (×0.5) → product 0.5 → 50 on 100 → lost.
    $r = SportsbookBetSupport::evaluateTicket($bet, [
        qrow_(2.0, 'void', 1.0, 0),
        qrow_(2.0, 'void', 1.0, 1),
        qrow_(2.0, 'lost', 0.5, 2),
    ]);
    TestRunner::assertEquals('lost', $r['status'], '0 < payout < stake parlay → lost');
    TestRunner::assertEqualsFloat(50.0, $r['payout'], 'returns 50 (reduced, non-zero)');
});

TestRunner::run('parlay quarter — a FULL loss still zeroes the whole parlay', function (): void {
    $bet = qbet_('parlay', 100.0);
    // half-win + full win + FULL loss → ×0 → lost / 0 (risk #4 boundary intact).
    $r = SportsbookBetSupport::evaluateTicket($bet, [
        qrow_(2.0, 'won', 0.5, 0),
        qrow_(2.0, 'won', 1.0, 1),
        qrow_(2.0, 'lost', 1.0, 2),
    ]);
    TestRunner::assertEquals('lost', $r['status'], 'one full loss → parlay lost');
    TestRunner::assertEqualsFloat(0.0, $r['payout'], 'full loss zeroes payout');
});

TestRunner::run('parlay quarter — binary legs unchanged (regression in-file)', function (): void {
    $bet = qbet_('parlay', 100.0, 400.0);
    $allWon = SportsbookBetSupport::evaluateTicket($bet, [qrow_(2.0, 'won', 1.0, 0), qrow_(2.0, 'won', 1.0, 1)]);
    TestRunner::assertEquals('won', $allWon['status'], 'binary all-won → won');
    TestRunner::assertEqualsFloat(400.0, $allWon['payout'], 'binary all-won → 400');
    $oneLost = SportsbookBetSupport::evaluateTicket($bet, [qrow_(2.0, 'won', 1.0, 0), qrow_(2.0, 'lost', 1.0, 1)]);
    TestRunner::assertEquals('lost', $oneLost['status'], 'binary one-lost → lost');
    TestRunner::assertEqualsFloat(0.0, $oneLost['payout'], 'binary one-lost → 0');
    $allVoid = SportsbookBetSupport::evaluateTicket($bet, [qrow_(2.0, 'void', 1.0, 0), qrow_(2.0, 'void', 1.0, 1)]);
    TestRunner::assertEquals('void', $allVoid['status'], 'binary all-void → void');
    TestRunner::assertEqualsFloat(100.0, $allVoid['payout'], 'binary all-void → stake');
});

// ── evaluateTicket — IF-BET with a quarter leg ───────────────────────────────

TestRunner::run('if_bet quarter — half-win first leg carries its partial forward', function (): void {
    $bet = qbet_('if_bet', 100.0);
    // first half-win @2.0 (×1.5), second win @2.0 (×2.0) → 100 × 1.5 × 2.0 = 300.
    $r = SportsbookBetSupport::evaluateTicket($bet, [qrow_(2.0, 'won', 0.5, 0), qrow_(2.0, 'won', 1.0, 1)]);
    TestRunner::assertEquals('won', $r['status'], 'half-win-first if-bet → won');
    TestRunner::assertEqualsFloat(300.0, $r['payout'], 'half-win first → 1.5 × 2.0 → 300');
});

TestRunner::run('if_bet quarter — half-win second leg pays partial', function (): void {
    $bet = qbet_('if_bet', 100.0);
    // first win @2.0 (×2.0), second half-win @2.0 (×1.5) → 100 × 2.0 × 1.5 = 300.
    $r = SportsbookBetSupport::evaluateTicket($bet, [qrow_(2.0, 'won', 1.0, 0), qrow_(2.0, 'won', 0.5, 1)]);
    TestRunner::assertEquals('won', $r['status'], 'half-win-second if-bet → won');
    TestRunner::assertEqualsFloat(300.0, $r['payout'], 'half-win second → 2.0 × 1.5 → 300');
});

TestRunner::run('if_bet quarter — void first rolls stake to a half-win second', function (): void {
    $bet = qbet_('if_bet', 100.0);
    // first push → full stake rolls to second; second half-win @1.90 → 100 × 1.45 = 145.
    $r = SportsbookBetSupport::evaluateTicket($bet, [qrow_(1.90, 'void', 1.0, 0), qrow_(1.90, 'won', 0.5, 1)]);
    TestRunner::assertEquals('won', $r['status'], 'void-first then half-win → won');
    TestRunner::assertEqualsFloat(145.0, $r['payout'], 'rolled stake half-win → 145');
});

TestRunner::run('if_bet — binary legs unchanged (regression in-file)', function (): void {
    $bet = qbet_('if_bet', 100.0);
    $bothWin = SportsbookBetSupport::evaluateTicket($bet, [qrow_(2.0, 'won', 1.0, 0), qrow_(2.0, 'won', 1.0, 1)]);
    TestRunner::assertEquals('won', $bothWin['status'], 'binary if-bet both win → won');
    TestRunner::assertEqualsFloat(400.0, $bothWin['payout'], 'binary if-bet both win → 400');
    $firstLost = SportsbookBetSupport::evaluateTicket($bet, [qrow_(2.0, 'lost', 1.0, 0), qrow_(2.0, 'won', 1.0, 1)]);
    TestRunner::assertEquals('lost', $firstLost['status'], 'binary if-bet first lost → lost');
    TestRunner::assertEqualsFloat(0.0, $firstLost['payout'], 'binary if-bet first lost → 0');
    $secondLost = SportsbookBetSupport::evaluateTicket($bet, [qrow_(2.0, 'won', 1.0, 0), qrow_(2.0, 'lost', 1.0, 1)]);
    TestRunner::assertEquals('lost', $secondLost['status'], 'binary if-bet second lost → lost');
    TestRunner::assertEqualsFloat(0.0, $secondLost['payout'], 'binary if-bet second lost → 0');
});

// ── Open parlay — settle-timing gate with a quarter leg ──────────────────────
// shouldSettleNow reads the BINARY leg status. A quarter half-WIN reports
// status 'won', so on an INCOMPLETE open parlay it banks the slot and the
// ticket stays open — clearly correct. The completed (all-slots-filled) ticket
// then settles and pays the reduced-correct amount via evaluateTicket.
//
// NOT asserted here (flagged for review): a quarter HALF-LOSS reports status
// 'lost', which shouldSettleNow treats as a full loss and would settle an
// incomplete open parlay early. That timing semantic needs a decision before
// quarter legs are allowed in OPEN parlays — see the note to Fida.

TestRunner::run('open parlay — half-win leg banks a slot and stays open', function (): void {
    // target 3 legs, 2 filled: one full win + one quarter half-win (status 'won').
    // No leg lost, not all slots filled → stay open.
    $open = OpenParlayService::shouldSettleNow(['won', 'won'], 3, 2);
    TestRunner::assertFalse($open, 'incomplete open parlay with a half-win leg stays open');
});

TestRunner::run('open parlay — completed ticket with a half-win leg settles + pays reduced', function (): void {
    // All 3 declared slots filled, none lost → settle.
    $settle = OpenParlayService::shouldSettleNow(['won', 'won', 'won'], 3, 3);
    TestRunner::assertTrue($settle, 'all slots filled, none lost → settle');
    // Payout when the third is a quarter half-win @2.0: 2 × 2 × 1.5 = 6.0 → 600.
    $bet = qbet_('parlay', 100.0);
    $r = SportsbookBetSupport::evaluateTicket($bet, [
        qrow_(2.0, 'won', 1.0, 0),
        qrow_(2.0, 'won', 1.0, 1),
        qrow_(2.0, 'won', 0.5, 2),
    ]);
    TestRunner::assertEquals('won', $r['status'], 'completed open parlay with half-win → won');
    TestRunner::assertEqualsFloat(600.0, $r['payout'], 'completed open parlay half-win → 600');
});
