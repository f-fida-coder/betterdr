<?php

declare(strict_types=1);

/**
 * Same-Game Parlay (SGP) correlation rules + haircut.
 *
 * Money-critical invariant under test: the same-game DETECTION and the
 * profit-only HAIRCUT are byte-identical in pricing (calculatePotentialPayout)
 * and settlement (evaluateTicket) — placement payout == fully-won settlement
 * payout. Also: TIER-1 hard blocks, cross-game untouched, fail-safe when
 * sgpEnabled=false, and void re-detection on the surviving won legs.
 */

if (!class_exists('ApiException')) {
    class ApiException extends RuntimeException
    {
        /** @param array<string,mixed> $extra */
        public function __construct(string $message, int $code = 0, public array $extra = [])
        {
            parent::__construct($message, $code);
        }
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

/** Build one leg with the fields detection + grading read. */
$leg = static function (string $mid, string $mt, string $sel, ?int $pid, int $american, ?string $side = null, ?float $point = null, ?string $teamSide = null): array {
    return [
        'matchId' => $mid,
        'marketType' => $mt,
        'selection' => $sel,
        'selectionPid' => $pid,
        'oddsAmerican' => $american,
        'odds' => SportsbookBetSupport::americanToDecimalExact($american),
        'side' => $side,
        'point' => $point,
        'teamSide' => $teamSide,
        'status' => 'won',
    ];
};

$cfg = SportsbookBetSupport::sgpConfig([
    'sgpEnabled' => true, 'sgpHaircutPct' => 0.20, 'sgpPlayerPropHaircutPct' => 0.35,
    'sgpMaxLegs' => 6, 'sgpMaxPayoutMultiplier' => 3.0,
]);

// ── config reader ───────────────────────────────────────────────────────────

TestRunner::run('sgpConfig — defaults + clamps; disabled when absent', function (): void {
    $d = SportsbookBetSupport::sgpConfig(null);
    TestRunner::assertFalse($d['enabled'], 'absent doc → disabled (fail safe)');
    TestRunner::assertEqualsFloat(0.20, $d['haircutPct'], 'default base haircut', 1e-9);
    TestRunner::assertEqualsFloat(0.35, $d['propHaircutPct'], 'default prop haircut', 1e-9);
    $clamped = SportsbookBetSupport::sgpConfig(['sgpEnabled' => true, 'sgpHaircutPct' => 5, 'sgpMaxLegs' => 99]);
    TestRunner::assertEqualsFloat(0.95, $clamped['haircutPct'], 'haircut clamped to 0.95', 1e-9);
    TestRunner::assertEquals(12, $clamped['maxLegs'], 'maxLegs clamped to 12');
});

// ── TIER-1 hard blocks (same-game, sgp ON) ───────────────────────────────────

TestRunner::run('TIER-1 — Over + Under same total line is blocked (mutually exclusive)', function () use ($leg, $cfg): void {
    $legs = [$leg('M1', 'totals', 'Over 9.5', null, -110, 'over', 9.5), $leg('M1', 'totals', 'Under 9.5', null, -110, 'under', 9.5)];
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg), ApiException::class, 'O/U same line blocked');
    TestRunner::assertEquals('MUTUALLY_EXCLUSIVE_TOTAL', SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]), 'conflict code');
});

TestRunner::run('TIER-1 — both moneylines same game blocked', function () use ($leg, $cfg): void {
    $legs = [$leg('M1', 'h2h', 'Boston', 10, -150), $leg('M1', 'h2h', 'Toronto', 20, 130)];
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg), ApiException::class, 'both MLs blocked');
    TestRunner::assertEquals('BOTH_MONEYLINES', SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]), 'conflict code');
});

TestRunner::run('TIER-1 — both spread sides blocked (different pid OR complementary points)', function () use ($leg, $cfg): void {
    $diffPid = [$leg('M1', 'spreads', 'Boston', 10, -110, null, -1.5), $leg('M1', 'spreads', 'Toronto', 20, -110, null, 1.5)];
    TestRunner::assertEquals('BOTH_SPREAD_SIDES', SportsbookBetSupport::sameGameConflict($diffPid[0], $diffPid[1]), 'diff pid + complementary');
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('parlay', $diffPid, $cfg), ApiException::class, 'blocked');
});

TestRunner::run('TIER-1 — redundant ML + same-team spread blocked', function () use ($leg, $cfg): void {
    $legs = [$leg('M1', 'h2h', 'Boston', 10, -150), $leg('M1', 'spreads', 'Boston', 10, 120, null, -1.5)];
    TestRunner::assertEquals('REDUNDANT_ML_SPREAD', SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]), 'same pid ML+spread');
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg), ApiException::class, 'blocked');
});

TestRunner::run('TIER-1 — game total + team total SAME direction blocked (deterministic)', function () use ($leg, $cfg): void {
    $legs = [$leg('M1', 'totals', 'Over 9.5', null, -110, 'over', 9.5), $leg('M1', 'team_totals', 'Boston Over 4.5', null, -105, 'over', 4.5, 'home')];
    TestRunner::assertEquals('DETERMINISTIC_TOTAL_TT', SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]), 'both Over');
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg), ApiException::class, 'blocked');
});

TestRunner::run('TIER-1 NESTED — same total, same side, different point is blocked (Over 8.5 + Over 9.5)', function () use ($leg, $cfg): void {
    $legs = [$leg('M1', 'totals', 'Over 8.5', null, -110, 'over', 8.5), $leg('M1', 'totals', 'Over 9.5', null, 120, 'over', 9.5)];
    TestRunner::assertEquals('NESTED_SAME_MARKET', SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]), 'nested totals');
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg), ApiException::class, 'blocked');
    // alternate_totals normalizes to totals → also nested vs a mainline total.
    $alt = [$leg('M1', 'totals', 'Over 8.5', null, -110, 'over', 8.5), $leg('M1', 'alternate_totals', 'Over 10.5', null, 160, 'over', 10.5)];
    TestRunner::assertEquals('NESTED_SAME_MARKET', SportsbookBetSupport::sameGameConflict($alt[0], $alt[1]), 'mainline+alt nested');
});

TestRunner::run('TIER-1 NESTED — same team spread, different point is blocked (Boston -1.5 + Boston -2.5)', function () use ($leg, $cfg): void {
    $legs = [$leg('M1', 'spreads', 'Boston', 10, -110, null, -1.5), $leg('M1', 'spreads', 'Boston', 10, 150, null, -2.5)];
    TestRunner::assertEquals('NESTED_SAME_MARKET', SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]), 'nested spread same team');
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg), ApiException::class, 'blocked');
});

TestRunner::run('TIER-1 NESTED — same team total, same side, different point is blocked', function () use ($leg, $cfg): void {
    $legs = [$leg('M1', 'team_totals', 'Boston Over 4.5', null, -105, 'over', 4.5, 'home'), $leg('M1', 'team_totals', 'Boston Over 5.5', null, 140, 'over', 5.5, 'home')];
    TestRunner::assertEquals('NESTED_SAME_MARKET', SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]), 'nested team total same team');
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg), ApiException::class, 'blocked');
});

TestRunner::run('NESTED — does NOT block a legitimate MIDDLE (Over 8.5 + Under 9.5)', function () use ($leg, $cfg): void {
    $legs = [$leg('M1', 'totals', 'Over 8.5', null, -110, 'over', 8.5), $leg('M1', 'totals', 'Under 9.5', null, -110, 'under', 9.5)];
    TestRunner::assertTrue(SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]) === null, 'middle is allowed');
    SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg); // must not throw
    TestRunner::assertTrue(true, 'middle allowed (house-favorable)');
});

TestRunner::run('NESTED — different period keys do NOT collide (game total vs 1st-5 total)', function () use ($leg): void {
    $legs = [$leg('M1', 'totals', 'Over 8.5', null, -110, 'over', 8.5), $leg('M1', 'totals_1st_5_innings', 'Over 4.5', null, -110, 'over', 4.5)];
    TestRunner::assertTrue(SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]) === null, 'F5 total is a different market, not nested');
});

TestRunner::run('NESTED — different teams\' team totals same side are NOT nested', function () use ($leg): void {
    $legs = [$leg('M1', 'team_totals', 'Boston Over 4.5', null, -105, 'over', 4.5, 'home'), $leg('M1', 'team_totals', 'Toronto Over 4.5', null, -105, 'over', 4.5, 'away')];
    TestRunner::assertTrue(SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]) === null, 'different teams → independent');
});

TestRunner::run('Player-prop cap — >1 same-game player prop is blocked (nested-prop mitigation)', function () use ($leg, $cfg): void {
    // Two props on the SAME game (could be nested same-player) → blocked by the cap.
    $legs = [$leg('M1', 'batter_hits', 'Gimenez Over 0.5', null, 120, 'over', 0.5), $leg('M1', 'batter_hits', 'Gimenez Over 1.5', null, 260, 'over', 1.5)];
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg), ApiException::class, 'two same-game props blocked at default cap 1');
    // One prop + non-prop legs is fine (Case 1 shape).
    $ok = [$leg('M1', 'h2h', 'Boston', 10, -150), $leg('M1', 'batter_hits', 'Gimenez Over 0.5', null, 120, 'over', 0.5)];
    SportsbookBetSupport::validateTicketComposition('parlay', $ok, $cfg);
    TestRunner::assertTrue(true, 'one prop allowed');
    // Different-game props are NOT capped (cap is per same-game cluster).
    $crossGame = [$leg('M1', 'batter_hits', 'A Over 0.5', null, 120, 'over', 0.5), $leg('M2', 'batter_hits', 'B Over 0.5', null, 120, 'over', 0.5)];
    SportsbookBetSupport::validateTicketComposition('parlay', $crossGame, $cfg);
    TestRunner::assertTrue(true, 'cross-game props allowed');
});

TestRunner::run('TIER-1 — opposite-direction game total + team total is ALLOWED', function () use ($leg, $cfg): void {
    // Game Over + team UNDER is not deterministically correlated → allowed.
    $legs = [$leg('M1', 'totals', 'Over 9.5', null, -110, 'over', 9.5), $leg('M1', 'team_totals', 'Boston Under 4.5', null, -105, 'under', 4.5, 'home')];
    TestRunner::assertTrue(SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]) === null, 'no conflict');
    SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg); // must not throw
    TestRunner::assertTrue(true, 'allowed');
});

// ── ALLOW + haircut, and the placement==settlement money invariant ───────────

TestRunner::run('SGP allowed — player-prop haircut; placement payout == settlement payout', function () use ($leg, $cfg): void {
    $legs = [
        $leg('M1', 'h2h', 'Boston', 10, -150),
        $leg('M1', 'totals', 'Over 9.5', null, -110, 'over', 9.5),
        $leg('M1', 'batter_hits', 'Gimenez Over 0.5', null, 120, 'over', 0.5),
    ];
    SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg); // allowed

    $frac = SportsbookBetSupport::sameGameHaircutFraction($legs, $cfg['haircutPct'], $cfg['propHaircutPct']);
    TestRunner::assertEqualsFloat(0.35, $frac, 'player-prop rate used (a leg is a prop)', 1e-9);

    // Placement
    $placement = SportsbookBetSupport::calculatePotentialPayout('parlay', 100.0, $legs, [], $cfg['haircutPct'], $cfg['propHaircutPct']);
    // raw product 1.6667*1.9091*2.2 = 7.0 → profit-only haircut → 1+(7-1)*0.65 = 4.9 → $490
    TestRunner::assertEquals(490, (int) $placement, 'placement payout $490 (was $700 uncut)');

    // Settlement (all legs won) — bet carries the SNAPSHOT rates
    $bet = ['type' => 'parlay', 'riskAmount' => 100, 'amount' => 100, 'unitStake' => 100,
            'potentialPayout' => $placement, 'sgpHaircutPct' => $cfg['haircutPct'], 'sgpPropHaircutPct' => $cfg['propHaircutPct']];
    $ev = SportsbookBetSupport::evaluateTicket($bet, $legs);
    TestRunner::assertEquals('won', $ev['status'], 'ticket won');
    TestRunner::assertEquals(490, (int) round($ev['payout']), 'settlement payout IDENTICAL to placement');
});

TestRunner::run('Haircut is profit-only — stake never reduced', function (): void {
    $cut = SportsbookBetSupport::applyProfitHaircut(7.0, 0.35);
    TestRunner::assertEqualsFloat(4.9, $cut, '1+(7-1)*0.65', 1e-9);
    TestRunner::assertTrue($cut > 1.0, 'combined stays > 1 (player never loses stake to the haircut)');
    TestRunner::assertEqualsFloat(7.0, SportsbookBetSupport::applyProfitHaircut(7.0, 0.0), 'fraction 0 → unchanged', 1e-9);
});

// ── cross-game untouched ─────────────────────────────────────────────────────

TestRunner::run('Cross-game parlay — no haircut, payout unchanged', function () use ($leg, $cfg): void {
    $legs = [$leg('M1', 'h2h', 'Boston', 10, -150), $leg('M2', 'totals', 'Over 8.5', null, -110, 'over', 8.5)];
    SportsbookBetSupport::validateTicketComposition('parlay', $legs, $cfg); // allowed, different games
    TestRunner::assertEqualsFloat(0.0, SportsbookBetSupport::sameGameHaircutFraction($legs, 0.20, 0.35), 'fraction 0 cross-game', 1e-9);
    $withCfg = SportsbookBetSupport::calculatePotentialPayout('parlay', 100.0, $legs, [], 0.20, 0.35);
    $noCfg = SportsbookBetSupport::calculatePotentialPayout('parlay', 100.0, $legs, []);
    TestRunner::assertEquals((int) $noCfg, (int) $withCfg, 'cross-game payout identical with/without SGP config');
});

// ── fail-safe gate ───────────────────────────────────────────────────────────

TestRunner::run('sgpEnabled=false — every same-game combo hard-blocked (current behavior)', function () use ($leg): void {
    // Boston ML + Over is NOT a TIER-1 rule conflict (allowed when SGP is on)…
    $legs = [$leg('M1', 'h2h', 'Boston', 10, -150), $leg('M1', 'totals', 'Over 9.5', null, -110, 'over', 9.5)];
    TestRunner::assertTrue(SportsbookBetSupport::sameGameConflict($legs[0], $legs[1]) === null, 'no TIER-1 conflict for ML+total');
    $on = SportsbookBetSupport::sgpConfig(['sgpEnabled' => true]);
    SportsbookBetSupport::validateTicketComposition('parlay', $legs, $on); // allowed with SGP on
    TestRunner::assertTrue(true, 'allowed when SGP on');

    // …but with SGP off (or no config arg) it falls back to the full hard block.
    $off = SportsbookBetSupport::sgpConfig(['sgpEnabled' => false]);
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('parlay', $legs, $off), ApiException::class, 'SGP off → blocked');
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('parlay', $legs), ApiException::class, 'default arg → blocked');
});

TestRunner::run('Non-parlay combined types keep the full block even with SGP on', function () use ($leg, $cfg): void {
    $legs = [$leg('M1', 'spreads', 'Boston', 10, -110, null, -1.5), $leg('M1', 'totals', 'Over 9.5', null, -110, 'over', 9.5)];
    // teaser shares an event → still blocked (SGP relaxes parlay only)
    TestRunner::assertThrows(fn () => SportsbookBetSupport::validateTicketComposition('teaser', $legs, $cfg), ApiException::class, 'teaser same-game blocked');
});

// ── void re-detection at settlement ──────────────────────────────────────────

TestRunner::run('Void re-detection — prop voids; survivors still same-game use BASE rate', function () use ($leg): void {
    $cfg = ['haircutPct' => 0.20, 'propHaircutPct' => 0.35];
    $legs = [
        $leg('M1', 'h2h', 'Boston', 10, -150),
        $leg('M1', 'totals', 'Over 9.5', null, -110, 'over', 9.5),
        $leg('M1', 'batter_hits', 'Gimenez Over 0.5', null, 120, 'over', 0.5),
    ];
    $legs[2]['status'] = 'void'; // prop voided
    $bet = ['type' => 'parlay', 'riskAmount' => 100, 'amount' => 100, 'unitStake' => 100,
            'sgpHaircutPct' => 0.20, 'sgpPropHaircutPct' => 0.35];
    $ev = SportsbookBetSupport::evaluateTicket($bet, $legs);
    // survivors ML(-150)*Total(-110) = 3.18182 raw; still same game, no prop now → BASE 20%:
    // 1+(3.18182-1)*0.8 = 2.74545 → $274.55 → round $275
    TestRunner::assertEquals('won', $ev['status'], 'won on survivors');
    TestRunner::assertEquals(275, (int) round($ev['payout']), 'base-rate haircut applied after prop void');
});

TestRunner::run('Void re-detection — drops to one event; no longer same-game → NO haircut', function () use ($leg): void {
    // 3 legs: two on M1, one on M2. One M1 leg voids → survivors are M1+M2 (different games).
    $legs = [
        $leg('M1', 'h2h', 'Boston', 10, -150),
        $leg('M1', 'totals', 'Over 9.5', null, -110, 'over', 9.5),
        $leg('M2', 'h2h', 'NYY', 30, -120),
    ];
    $legs[1]['status'] = 'void'; // one M1 leg voids → M1(ML) + M2(ML) remain = cross-game
    $bet = ['type' => 'parlay', 'riskAmount' => 100, 'amount' => 100, 'unitStake' => 100,
            'sgpHaircutPct' => 0.20, 'sgpPropHaircutPct' => 0.35];
    $ev = SportsbookBetSupport::evaluateTicket($bet, $legs);
    // survivors 1.66667 * 1.83333 = 3.05556 raw, NO haircut (no shared event) → $305.56 → $306
    TestRunner::assertEquals(306, (int) round($ev['payout']), 'no haircut once survivors are cross-game');
});
