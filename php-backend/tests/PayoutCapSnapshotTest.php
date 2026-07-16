<?php

declare(strict_types=1);

/**
 * T7 — settlement payout-cap snapshot (payoutCapAmount).
 *
 * Locks the fix for the settlement clamp gap (audited 2026-07-16): placement's
 * combined-mode 3×maxBet / SGP-multiplier clamp silently reduces the booked
 * payout, but evaluateTicket recomputes from raw leg odds and knew nothing of
 * per-player limits — a clamped ticket settled at the UNCAPPED recompute
 * (the ±$2 acceptedPayout pin is skipped because the diff far exceeds the
 * tolerance). Fix: placement snapshots the cap onto the bet doc
 * ('payoutCapAmount', win-amount dollars, ONLY when the clamp fired) and
 * BetSettlementService applies SportsbookBetSupport::applyPayoutCapSnapshot
 * as a CEILING before the pin.
 *
 * Coverage map:
 *   - T7-1 golden:    maxBet $1,000 → cap $3,000 win; $500 stake on the 4-leg
 *                     two-pair SGP slip (−135/−120/+100/−130, 20% haircut) →
 *                     uncapped recompute $4,615 → capped $3,500 → pin
 *                     reconciles naturally (capped == acceptedPayout).
 *   - T7-2 void leg:  same ticket, one leg voids → recompute $2,655 falls
 *                     BELOW the cap → passes through untouched (ceiling, not
 *                     a pin).
 *   - T7-3 unclamped: no snapshot field → byte-identical behavior (regression
 *                     guard).
 *   - T7-4 legacy:    null / 0 / negative / garbage snapshot values and lost
 *                     tickets → no-op; riskAmount falls back to `amount`.
 *   - T7-5 $5k guard: MAX_PARLAY_PAYOUT still REJECTS at placement exactly as
 *                     today (win == cap passes, win > cap throws).
 *   - T7-6 OP create: recomputePayout caps at create → capAmount returned →
 *                     snapshot persisted → settlement pays the capped amount.
 *   - T7-7 OP refresh: a recompute that is no longer capped returns
 *                     capAmount null → snapshot nulled → settlement pays the
 *                     uncapped recompute. (Defensive contract: legs only
 *                     multiply the payout upward, so capped→uncapped is
 *                     unreachable through the real add-leg flow.)
 *   - T7-8 OP add-leg: unclamped ticket pushed OVER the cap by a new leg →
 *                     capAmount written → settlement capped.
 *
 * The manual-grader half of T7 lives in ManualBetGradingTest.php ("clamped
 * ticket surfaces" suite): the manual surface pays STORED values and its
 * fence refuses parlay-type bets outright.
 */

// ── Stubs (same guards as SettlementTest / MaxWinCapTest) ────────────────────

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
        /** @param array<string, mixed> $extra */
        public function __construct(string $message, int $code = 0, private array $extra = [])
        {
            parent::__construct($message, $code);
        }

        /** @return array<string, mixed> */
        public function extra(): array { return $this->extra; }
    }
}

if (!class_exists('SqlRepository')) {
    class SqlRepository
    {
        public static function nowUtc(): string { return date('c'); }
        public static function id(string $id): string { return $id; }
    }
}

if (!class_exists('Env')) {
    class Env
    {
        public static function get(string $key, ?string $default = null): ?string
        {
            if (array_key_exists($key, $_ENV)) {
                return $_ENV[$key];
            }
            $v = getenv($key);
            return $v === false ? $default : $v;
        }
    }
}

require_once __DIR__ . '/../src/OddsMarketCatalog.php';
require_once __DIR__ . '/../src/SportsbookBetSupport.php';
require_once __DIR__ . '/../src/OpenParlayService.php';

// ── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * The audited 4-leg, two-same-game-pair parlay: Phillies ML −135 + game total
 * O9.5 −120 (game m1), White Sox ML +100 + game total O8.5 −130 (game m2).
 * Decimals are the exact American-int conversions placement snaps to.
 */
function pcsRows(string $leg4Status = 'won'): array
{
    return [
        ['odds' => 1 + 100 / 135, 'status' => 'won',      'matchId' => 'm1', 'marketType' => 'h2h',    'selectionOrder' => 0],
        ['odds' => 1 + 100 / 120, 'status' => 'won',      'matchId' => 'm1', 'marketType' => 'totals', 'selectionOrder' => 1],
        ['odds' => 2.0,           'status' => 'won',      'matchId' => 'm2', 'marketType' => 'h2h',    'selectionOrder' => 2],
        ['odds' => 1 + 100 / 130, 'status' => $leg4Status, 'matchId' => 'm2', 'marketType' => 'totals', 'selectionOrder' => 3],
    ];
}

/** Clamped bet doc as placement now writes it (maxBet $1,000 → cap $3,000 win). */
function pcsBet(array $overrides = []): array
{
    return array_replace([
        'type' => 'parlay',
        'riskAmount' => 500.0,
        'amount' => 500.0,
        'unitStake' => 500.0,
        // Clamped booking: potentialPayout = risk + cap, mirrored into
        // acceptedPayout by the sweep on first settle.
        'potentialPayout' => 3500.0,
        'acceptedPayout' => 3500.0,
        'sgpHaircutPct' => 0.2,
        'sgpPropHaircutPct' => 0.35,
        'payoutCapAmount' => 3000.0,
    ], $overrides);
}

/**
 * Replicates BetSettlementService's exact post-evaluate ordering (round →
 * cap ceiling → ±$2 pin) so the suite locks the SEQUENCE, not just the
 * helper in isolation.
 */
function pcsSweepPayout(array $bet, array $rows): float
{
    $evaluation = SportsbookBetSupport::evaluateTicket(
        array_merge($bet, ['selections' => $rows]),
        $rows
    );
    $ticketPayout = (float) round((float) ($evaluation['payout'] ?? 0));
    $ticketPayout = SportsbookBetSupport::applyPayoutCapSnapshot($bet, $ticketPayout);
    if ((string) ($evaluation['status'] ?? '') === 'won') {
        $pinnedPayout = (float) round((float) ($bet['acceptedPayout'] ?? $bet['potentialPayout'] ?? 0));
        if ($pinnedPayout > 0 && abs($pinnedPayout - $ticketPayout) <= 2.0) {
            $ticketPayout = $pinnedPayout;
        }
    }
    return $ticketPayout;
}

// ── T7-1: golden clamped ticket ──────────────────────────────────────────────

TestRunner::run('T7-1 payout cap — clamped SGP parlay settles at the capped payout', function (): void {
    $bet = pcsBet();
    $rows = pcsRows();

    // Uncapped recompute first — locks the very number the bug used to pay.
    $evaluation = SportsbookBetSupport::evaluateTicket(array_merge($bet, ['selections' => $rows]), $rows);
    TestRunner::assertEquals('won', (string) $evaluation['status'], 'all legs won → ticket won');
    TestRunner::assertEqualsFloat(4615.0, (float) round((float) $evaluation['payout']), 'uncapped recompute is $4,615 (raw 11.2925 → 20% haircut → +823 lock → ×$500)');

    // The pin alone could never reconcile a clamped ticket — document why.
    TestRunner::assertTrue(abs(3500.0 - 4615.0) > 2.0, 'pre-fix: ±$2 pin is skipped on the clamped diff (the bug)');

    // Ceiling applied at the sweep's single point, BEFORE the pin.
    TestRunner::assertEqualsFloat(3500.0, SportsbookBetSupport::applyPayoutCapSnapshot($bet, 4615.0), 'ceiling caps to risk + payoutCapAmount = $3,500');

    // Full sweep ordering: cap first makes capped recompute == acceptedPayout,
    // so the pin reconciles naturally and the player gets exactly $3,500.
    TestRunner::assertEqualsFloat(3500.0, pcsSweepPayout($bet, $rows), 'settlement pays $3,500, not $4,615');
});

// ── T7-2: void-reduced recompute below the cap passes through ────────────────

TestRunner::run('T7-2 payout cap — void leg drops recompute below cap, smaller value kept', function (): void {
    $bet = pcsBet();
    $rows = pcsRows('void');

    // 3 surviving legs (still one same-game pair → haircut stays): product
    // 6.38272 → haircut 5.30617 → +431 lock 5.31 → ×$500 = $2,655.
    $evaluation = SportsbookBetSupport::evaluateTicket(array_merge($bet, ['selections' => $rows]), $rows);
    TestRunner::assertEquals('won', (string) $evaluation['status'], 'void leg drops out, ticket still won');
    TestRunner::assertEqualsFloat(2655.0, (float) round((float) $evaluation['payout']), 'void-reduced recompute is $2,655');

    // Ceiling, not a pin: $2,655 < $3,500 cap → untouched.
    TestRunner::assertEqualsFloat(2655.0, SportsbookBetSupport::applyPayoutCapSnapshot($bet, 2655.0), 'below-cap recompute passes through the ceiling untouched');
    TestRunner::assertEqualsFloat(2655.0, pcsSweepPayout($bet, $rows), 'full ordering: pin skipped (diff > $2), pays the reduced $2,655');
});

// ── T7-3: unclamped ticket — behavior byte-identical to today ────────────────

TestRunner::run('T7-3 payout cap — unclamped ticket (no snapshot) settles exactly as before', function (): void {
    $bet = pcsBet(['payoutCapAmount' => null, 'potentialPayout' => 4615.0, 'acceptedPayout' => 4615.0]);
    $rows = pcsRows();

    TestRunner::assertEqualsFloat(4615.0, SportsbookBetSupport::applyPayoutCapSnapshot($bet, 4615.0), 'null snapshot → helper is a strict no-op');
    TestRunner::assertEqualsFloat(4615.0, pcsSweepPayout($bet, $rows), 'unclamped ticket pays the full recompute, unchanged');

    $noField = pcsBet(['potentialPayout' => 4615.0, 'acceptedPayout' => 4615.0]);
    unset($noField['payoutCapAmount']);
    TestRunner::assertEqualsFloat(4615.0, SportsbookBetSupport::applyPayoutCapSnapshot($noField, 4615.0), 'absent field (every legacy doc) → no-op');
    TestRunner::assertEqualsFloat(4615.0, pcsSweepPayout($noField, $rows), 'legacy doc settles byte-identical');
});

// ── T7-4: legacy / garbage snapshots and edge inputs ─────────────────────────

TestRunner::run('T7-4 payout cap — legacy docs, garbage values, lost tickets, risk fallback', function (): void {
    TestRunner::assertEqualsFloat(4615.0, SportsbookBetSupport::applyPayoutCapSnapshot(pcsBet(['payoutCapAmount' => 0.0]), 4615.0), 'zero cap → no-op');
    TestRunner::assertEqualsFloat(4615.0, SportsbookBetSupport::applyPayoutCapSnapshot(pcsBet(['payoutCapAmount' => -3000.0]), 4615.0), 'negative cap → no-op');
    TestRunner::assertEqualsFloat(4615.0, SportsbookBetSupport::applyPayoutCapSnapshot(pcsBet(['payoutCapAmount' => 'garbage']), 4615.0), 'non-numeric cap → no-op');
    TestRunner::assertEqualsFloat(0.0, SportsbookBetSupport::applyPayoutCapSnapshot(pcsBet(), 0.0), 'lost ticket ($0) untouched even with a cap present');

    // riskAmount fallback: doc with only `amount` still anchors the ceiling.
    $legacyRisk = pcsBet();
    unset($legacyRisk['riskAmount']);
    TestRunner::assertEqualsFloat(3500.0, SportsbookBetSupport::applyPayoutCapSnapshot($legacyRisk, 4615.0), 'riskAmount falls back to amount (ceiling still $3,500)');

    // A cap that is not binding never RAISES a payout (min, never max).
    TestRunner::assertEqualsFloat(100.0, SportsbookBetSupport::applyPayoutCapSnapshot(pcsBet(), 100.0), 'ceiling never raises a small payout');
});

// ── T7-5: $5,000 MAX_PARLAY_PAYOUT placement guard unchanged ─────────────────

TestRunner::run('T7-5 payout cap — house $5k win guard still rejects at placement', function (): void {
    // Win exactly at the cap passes (no exception).
    SportsbookBetSupport::assertWinWithinCap(5000.0, 11.2925, 'parlay');
    TestRunner::assertTrue(true, 'win == $5,000 cap passes');

    // One dollar over still rejects with the stake suggestion off UNCLAMPED odds.
    TestRunner::assertThrows(
        static fn () => SportsbookBetSupport::assertWinWithinCap(5001.0, 11.2925, 'parlay'),
        ApiException::class,
        'win > $5,000 cap still throws MAX_WIN_EXCEEDED at placement'
    );
});

// ── Open Parlay fixtures ──────────────────────────────────────────────────────

/** N distinct-game +100 legs (2.0 decimal) in selectionForInsert / row shape. */
function pcsOpLegs(int $n, string $status = 'won'): array
{
    $legs = [];
    for ($i = 0; $i < $n; $i++) {
        $legs[] = [
            'odds' => 2.0,
            'oddsAmerican' => 100,
            'status' => $status,
            'matchId' => 'op-m' . $i,
            'marketType' => 'h2h',
            'selectionOrder' => $i,
        ];
    }
    return $legs;
}

/**
 * OP bet doc exactly as create/add-leg now writes it: potentialPayout and
 * payoutCapAmount taken from recomputePayout's OWN return (never derived
 * outside), no acceptedPayout yet (first settle falls back to
 * potentialPayout), no SGP fields (same-game is blocked on OP).
 */
function pcsOpBet(array $payoutCalc, float $unitStake): array
{
    return [
        'type' => 'parlay',
        'isOpenParlay' => true,
        'riskAmount' => $unitStake,
        'amount' => $unitStake,
        'unitStake' => $unitStake,
        'potentialPayout' => $payoutCalc['potentialPayout'],
        'combinedOdds' => $payoutCalc['combinedOdds'],
        'payoutCapAmount' => $payoutCalc['capAmount'],
    ];
}

// ── T7-6: OP capped at create → snapshot → settlement capped ─────────────────

TestRunner::run('T7-6 payout cap — open parlay capped at create settles at the capped payout', function (): void {
    // $500 unit stake, maxBet $1,000 → cap $3,000 win. Three +100 legs:
    // product 8.0 → payout $4,000, win $3,500 > cap → clamped to $3,500.
    $calc = OpenParlayService::recomputePayout(500.0, pcsOpLegs(3), [], 1000.0);
    TestRunner::assertTrue((bool) $calc['capped'], 'create recompute capped');
    TestRunner::assertEqualsFloat(3000.0, (float) $calc['capAmount'], 'capAmount returned from the clamp itself (maxBet × 3)');
    TestRunner::assertEqualsFloat(3500.0, (float) $calc['potentialPayout'], 'booked payout = risk + cap');

    // Settlement: all 3 legs win → uncapped recompute $4,000 → snapshot caps
    // to $3,500 → pin (vs stored potentialPayout) reconciles at $3,500.
    $bet = pcsOpBet($calc, 500.0);
    $rows = pcsOpLegs(3);
    $evaluation = SportsbookBetSupport::evaluateTicket(array_merge($bet, ['selections' => $rows]), $rows);
    TestRunner::assertEqualsFloat(4000.0, (float) round((float) $evaluation['payout']), 'uncapped OP recompute is $4,000 (the number the hole used to pay)');
    TestRunner::assertEqualsFloat(3500.0, pcsSweepPayout($bet, $rows), 'settlement pays the capped $3,500, not $4,000');
});

// ── T7-7: recompute no longer capped → snapshot nulled → uncapped payout ─────

TestRunner::run('T7-7 payout cap — OP snapshot refresh: uncapped recompute nulls the snapshot', function (): void {
    // Defensive contract (unreachable via real add-leg — legs only multiply
    // the payout upward): the stored snapshot must always mirror the LAST
    // recompute. Two +100 legs: payout $2,000, win $1,500 < $3,000 cap.
    $calc = OpenParlayService::recomputePayout(500.0, pcsOpLegs(2), [], 1000.0);
    TestRunner::assertFalse((bool) $calc['capped'], 'recompute under the cap is not capped');
    TestRunner::assertNull($calc['capAmount'], 'capAmount is null → the add-leg refresh nulls payoutCapAmount');

    // A doc refreshed to null settles at the full uncapped recompute.
    $bet = pcsOpBet($calc, 500.0);
    $rows = pcsOpLegs(2);
    TestRunner::assertEqualsFloat(2000.0, pcsSweepPayout($bet, $rows), 'nulled snapshot → settlement pays the uncapped $2,000');
});

// ── T7-8: add-leg pushes an unclamped ticket over the cap ────────────────────

TestRunner::run('T7-8 payout cap — OP add-leg pushes over the cap, snapshot written, settlement capped', function (): void {
    // Created unclamped with 2 legs (win $1,500 < $3,000)…
    $createCalc = OpenParlayService::recomputePayout(500.0, pcsOpLegs(2), [], 1000.0);
    TestRunner::assertNull($createCalc['capAmount'], 'created unclamped: no snapshot');

    // …then a third +100 leg is added: win $3,500 > $3,000 → THIS recompute
    // caps, and the add-leg doc refresh persists its capAmount.
    $addCalc = OpenParlayService::recomputePayout(500.0, pcsOpLegs(3), [], 1000.0);
    TestRunner::assertTrue((bool) $addCalc['capped'], 'add-leg recompute capped');
    TestRunner::assertEqualsFloat(3000.0, (float) $addCalc['capAmount'], 'snapshot written on the add-leg refresh');
    TestRunner::assertEqualsFloat(3500.0, (float) $addCalc['potentialPayout'], 'stored payout re-clamped');

    // Settlement honors the refreshed snapshot: $3,500, not $4,000.
    $bet = pcsOpBet($addCalc, 500.0);
    $rows = pcsOpLegs(3);
    TestRunner::assertEqualsFloat(3500.0, pcsSweepPayout($bet, $rows), 'settlement pays the capped $3,500 after the add-leg clamp');
});
