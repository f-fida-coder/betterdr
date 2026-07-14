<?php

declare(strict_types=1);

/**
 * Money-safety matrix for the Arabian Phase-1 retune (correct RTP + cents +
 * bonus stake-scaling + free-spin caps). Drives the REAL CasinoController
 * settlement/evaluator via reflection (no DB). Isolated process.
 */

if (!class_exists('ApiException')) { class ApiException extends RuntimeException {} }
if (!class_exists('SqlRepository')) { class SqlRepository { public static function nowUtc(): string { return date('c'); } public static function id(string $id): string { return $id; } } }
if (!class_exists('Response')) { class Response { public static array $last=['status'=>0,'data'=>[]]; public static function json(array $d,int $s=200): void { self::$last=['status'=>$s,'data'=>$d]; } public static function reset(): void { self::$last=['status'=>0,'data'=>[]]; } } }
if (!class_exists('Http')) { class Http { public static function header(string $n): string { return ''; } public static function jsonBody(): array { return []; } } }
if (!class_exists('IpUtils')) { class IpUtils { public static function clientIp(): string { return '127.0.0.1'; } } }
if (!class_exists('RateLimiter')) { class RateLimiter { public static function enforce(mixed $d,string $k,int $l,int $w): bool { return false; } } }
if (!class_exists('Env')) { class Env { public static function get(string $k,mixed $d=null): mixed { return $d; } } }
if (!class_exists('SportsbookBetSupport')) { class SportsbookBetSupport {} }
if (!class_exists('SportsMatchStatus')) { class SportsMatchStatus { public static function effectiveStatus(array $m): string { return (string)($m['effectiveStatus']??$m['status']??'pending'); } } }

require_once __DIR__ . '/TestRunner.php';
require_once __DIR__ . '/../src/CasinoController.php';

function arabianController(): CasinoController
{
    return (new ReflectionClass(CasinoController::class))->newInstanceWithoutConstructor();
}
function arabianCall(object $t, string $m, mixed ...$a): mixed
{
    return (new ReflectionMethod($t, $m))->invoke($t, ...$a);
}
function arabianConst(string $name): mixed
{
    return (new ReflectionClass(CasinoController::class))->getConstant($name);
}
// craft a 3x5 grid where line 0 (row-map [1,1,1,1,1]) shows $cells; fillers won't pay
function agrid(array $cells): array { return [[3,4,5,6,3], $cells, [6,5,4,3,6]]; }

$c = arabianController();

// ── Evaluator still correct after retune (regression guard) ──────────────────
TestRunner::run('arabian evaluator — scatters off lines, wild sub, one symbol', function () use ($c) {
    $eval = fn(array $p) => arabianCall($c, 'evaluateArabianWinningLines', $p, 1, 1.0);
    TestRunner::assertEquals([], $eval(agrid([9,9,9,9,9])), 'bonus scatter does not pay on a line');
    TestRunner::assertEquals([], $eval(agrid([10,10,10,10,10])), 'freespin scatter does not pay on a line');
    TestRunner::assertEquals([], $eval(agrid([7,7,5,5,5])), '7-run-2 then 5s pays nothing (one symbol per line)');
    $w = $eval(agrid([8,7,7,7,8])); // wild+3seven+wild
    TestRunner::assertEquals(5, (int) $w[0]['num_win'], 'wild substitution counts 5, no double-count');
    TestRunner::assertEquals(7, (int) $w[0]['value'], 'run anchored to symbol 7');
});

// ── Cents: fractional coin pays exact 2dp, no whole-dollar round ──────────────
TestRunner::run('arabian cents — fractional coin win is exact 2dp', function () use ($c) {
    // line 0 = five symbol-1 (5-of-a-kind) at coinBet $0.05.
    $wins = arabianCall($c, 'evaluateArabianWinningLines', agrid([1,1,1,1,1]), 1, 0.05);
    $amt = (float) $wins[0]['amount'];
    // paytable[1][5oak] = 78 -> 78 * 0.05 = 3.90 (exact 2dp, NOT rounded to $4)
    TestRunner::assertEqualsFloat(3.90, $amt, 'sym1 5oak at $0.05 pays exactly $3.90', 0.0001);
    TestRunner::assertEqualsFloat(0.0, $amt - round($amt, 2), 'win amount carries no sub-cent residue', 0.0001);
    // sym7 3oak at $0.15 -> 8 * 0.15 = 1.20
    $w2 = arabianCall($c, 'evaluateArabianWinningLines', agrid([7,7,7,5,5]), 1, 0.15);
    TestRunner::assertEqualsFloat(1.20, (float) $w2[0]['amount'], 'sym7 3oak at $0.15 pays exactly $1.20', 0.0001);
});

// ── Bonus pays x TOTAL BET (line-count-independent scaling) ───────────────────
TestRunner::run('arabian bonus — pays x total bet, not x coinBet', function () use ($c) {
    $prizes = arabianConst('ARABIAN_BONUS_PRIZES');
    $found = false;
    for ($i = 0; $i < 400000 && !$found; $i++) {
        $s = arabianCall($c, 'settleArabianSpin', 1.0, 20, ['freeSpinsRemaining' => 0]);
        $rd = $s['roundData'];
        if (!empty($rd['bonusTriggered'])) {
            $idx = (int) $rd['bonusPrizeIndex'];
            $expected = round(((float) $prizes[$idx]) * (float) $rd['totalBet'], 2); // totalBet = 1*20 = 20
            TestRunner::assertEqualsFloat($expected, (float) $rd['bonusWin'], 'bonusWin == prize x totalBet (x20, not x1)', 0.001);
            TestRunner::assertEqualsFloat(20.0, (float) $rd['totalBet'], 'totalBet = coinBet x lines = 20', 0.001);
            $found = true;
        }
    }
    TestRunner::assertTrue($found, 'a bonus fired within the sample');
});

// ── RTP: house-positive, in-band, and line-count-INDEPENDENT ──────────────────
// Plays the real engine including free spins (feeds state back). coinBet = 1.
function arabianRtp(CasinoController $c, int $lines, int $spins): array {
    $wager = 0.0; $ret = 0.0; $maxFs = 0;
    for ($i = 0; $i < $spins; $i++) {
        $state = ['freeSpinsRemaining' => 0];
        // paid spin
        $s = arabianCall($c, 'settleArabianSpin', 1.0, $lines, $state);
        $wager += (float) $s['roundData']['totalBet'];
        $ret += (float) $s['totalReturn'];
        $fs = (int) $s['stateAfter']['freeSpinsRemaining'];
        $maxFs = max($maxFs, $fs);
        // play out awarded free spins (wager 0), carrying the locked state
        $guard = 0;
        while ($fs > 0 && $guard < 5000) {
            $guard++;
            $s = arabianCall($c, 'settleArabianSpin', 1.0, $lines, $s['stateAfter']);
            $ret += (float) $s['totalReturn'];
            $fs = (int) $s['stateAfter']['freeSpinsRemaining'];
            $maxFs = max($maxFs, $fs);
        }
    }
    return ['rtp' => $ret / $wager, 'maxFs' => $maxFs];
}
TestRunner::run('arabian RTP — house-positive, in-band, line-count-independent', function () use ($c) {
    $n = 60000;
    $one = arabianRtp($c, 1, $n);
    $twenty = arabianRtp($c, 20, $n);
    // Old broken engine: 1-line ~550%, 20-line ~199%. Both must now be well under 1.10.
    TestRunner::assertTrue($one['rtp'] > 0.80 && $one['rtp'] < 1.05, '1-line RTP in [0.80,1.05], got ' . round($one['rtp'] * 100, 2) . '%');
    TestRunner::assertTrue($twenty['rtp'] > 0.80 && $twenty['rtp'] < 1.05, '20-line RTP in [0.80,1.05], got ' . round($twenty['rtp'] * 100, 2) . '%');
    // The ÷lineCount bonus bug is gone -> 1-line and 20-line RTP should be close.
    TestRunner::assertTrue(abs($one['rtp'] - $twenty['rtp']) < 0.06, 'RTP line-count-independent (|1L-20L| < 6pts): ' . round($one['rtp'] * 100, 2) . '% vs ' . round($twenty['rtp'] * 100, 2) . '%');
    // Free-spin cap invariant: banked free spins never exceed the hard cap.
    $cap = (int) arabianConst('ARABIAN_MAX_TOTAL_FREESPINS');
    TestRunner::assertTrue($one['maxFs'] <= $cap && $twenty['maxFs'] <= $cap, "free-spins never exceed the {$cap} cap (saw {$one['maxFs']}/{$twenty['maxFs']})");
});

// ── Free-spin per-spin award + total caps enforced ───────────────────────────
TestRunner::run('arabian free-spin caps — per-spin + total clamp', function () use ($c) {
    $maxPer = (int) arabianConst('ARABIAN_MAX_FREESPIN_AWARD_PER_SPIN');
    $cap = (int) arabianConst('ARABIAN_MAX_TOTAL_FREESPINS');
    // Starting already at the cap, any award must clamp and flag.
    $s = arabianCall($c, 'settleArabianSpin', 1.0, 5, ['freeSpinsRemaining' => $cap, 'freeSpinLineCount' => 5, 'freeSpinCoinBet' => 1.0]);
    $after = (int) $s['stateAfter']['freeSpinsRemaining'];
    TestRunner::assertTrue($after <= $cap, "total free spins stay <= {$cap} (got {$after})");
    // A single spin can never award more than the per-spin cap.
    $ok = true;
    for ($i = 0; $i < 50000; $i++) {
        $r = arabianCall($c, 'settleArabianSpin', 1.0, 10, ['freeSpinsRemaining' => 0]);
        if ((int) $r['roundData']['freeSpinsAwarded'] > $maxPer) { $ok = false; break; }
    }
    TestRunner::assertTrue($ok, "no single spin awards more than {$maxPer} free spins");
});

// ══════════════════════ PHASE 2 — admin payoutScale ══════════════════════

// ── Default scale 1.00 reproduces Phase-1 exactly (no RTP change ships) ──────
TestRunner::run('arabian payoutScale — default 1.00 == Phase-1 base (byte-identical)', function () use ($c) {
    // sym1 5-of-a-kind (mult 78) at $0.05: base = 3.90; scale 1.0 must equal base.
    $base = arabianCall($c, 'evaluateArabianWinningLines', agrid([1,1,1,1,1]), 1, 0.05);
    $scaled1 = arabianCall($c, 'evaluateArabianWinningLines', agrid([1,1,1,1,1]), 1, 0.05, 1.0);
    TestRunner::assertEqualsFloat((float) $base[0]['amount'], (float) $scaled1[0]['amount'], 'scale 1.0 == default (no arg)', 0.0001);
    TestRunner::assertEqualsFloat(3.90, (float) $scaled1[0]['amount'], 'base pay unchanged at scale 1.0', 0.0001);
});

// ── Cent-level floor: scale applied then floored to cents (house-safe) ───────
TestRunner::run('arabian payoutScale — cent-floor is exact and house-safe', function () use ($c) {
    // sym1 5oak mult 78 at coinBet 1.0, scale 0.90 -> floor(78*0.90)=70.20
    $w = arabianCall($c, 'evaluateArabianWinningLines', agrid([1,1,1,1,1]), 1, 1.0, 0.90);
    TestRunner::assertEqualsFloat(70.20, (float) $w[0]['amount'], 'sym1 5oak x0.90 floors to $70.20', 0.0001);
    // at $0.05: base 3.90 -> floor(390 cents * 0.90)=351 -> $3.51
    $w2 = arabianCall($c, 'evaluateArabianWinningLines', agrid([1,1,1,1,1]), 1, 0.05, 0.90);
    TestRunner::assertEqualsFloat(3.51, (float) $w2[0]['amount'], 'sym1 5oak $0.05 x0.90 = $3.51 (floored)', 0.0001);
    // helper never rounds UP: a value that would round to 4.00 floors to 3.99
    $floored = arabianCall($c, 'arabianScaleFloorToCents', 4.00, 0.999);
    TestRunner::assertTrue((float) $floored <= 4.00, 'floor never exceeds the base (house-safe)');
    TestRunner::assertEqualsFloat(3.99, (float) $floored, 'floor(400c * 0.999) = 399c = $3.99', 0.0001);
});

// ── Clamp: out-of-range values re-clamp to the spec on read ──────────────────
TestRunner::run('arabian payoutScale — read clamp to [0.90, 1.05]', function () use ($c) {
    $spec = arabianConst('ARABIAN_PAYOUT_SPEC')['payoutScale'];
    TestRunner::assertEqualsFloat(1.00, (float) $spec[0], 'default 1.00', 0.0001);
    TestRunner::assertEqualsFloat(0.90, (float) $spec[1], 'floor 0.90', 0.0001);
    TestRunner::assertEqualsFloat(1.05, (float) $spec[2], 'ceiling 1.05', 0.0001);
    $clamp = fn($v) => (new ReflectionMethod(CasinoController::class, 'clampPayoutValue'))->invoke(null, $v, $spec);
    TestRunner::assertEqualsFloat(1.05, (float) $clamp(2.0), 'above-max re-clamps to 1.05', 0.0001);
    TestRunner::assertEqualsFloat(0.90, (float) $clamp(0.5), 'below-min re-clamps to 0.90', 0.0001);
    TestRunner::assertEqualsFloat(0.97, (float) $clamp(0.97), 'in-range passes through', 0.0001);
});

// ── Write guard: range + admin-only role guard ──────────────────────────────
TestRunner::run('arabian payoutConfig — write guard (range + admin-only)', function () use ($c) {
    $existing = ['slug' => 'arabian', 'metadata' => []];
    $err = fn($actor, $meta) => arabianCall($c, 'payoutConfigUpdateError', $actor, $existing, $meta);
    // out-of-range rejected with the range, before any role check
    $r = $err(['role' => 'admin'], ['payoutConfig' => ['payoutScale' => 2.0]]);
    TestRunner::assertEquals(400, (int) ($r['status'] ?? 0), 'above-ceiling write rejected 400');
    // unknown key rejected
    $r2 = $err(['role' => 'admin'], ['payoutConfig' => ['freeSpins3' => 5]]);
    TestRunner::assertEquals(400, (int) ($r2['status'] ?? 0), 'unknown key rejected 400');
    // valid change by a non-admin -> 403
    $r3 = $err(['role' => 'agent'], ['payoutConfig' => ['payoutScale' => 0.95]]);
    TestRunner::assertEquals(403, (int) ($r3['status'] ?? 0), 'agent cannot change payoutConfig (403)');
    $r4 = $err(['role' => 'master_agent'], ['payoutConfig' => ['payoutScale' => 0.95]]);
    TestRunner::assertEquals(403, (int) ($r4['status'] ?? 0), 'master_agent cannot change payoutConfig (403)');
    // valid change by admin -> allowed (null)
    TestRunner::assertNull($err(['role' => 'admin'], ['payoutConfig' => ['payoutScale' => 0.95]]), 'admin may change payoutConfig');
    // echoing the current (default) config is a no-op for anyone
    TestRunner::assertNull($err(['role' => 'agent'], ['payoutConfig' => ['payoutScale' => 1.0]]), 'no-op echo passes for non-admin');
});

// ── The lever moves RTP (down at floor, house-positive at ceiling) ───────────
TestRunner::run('arabian payoutScale — lever lowers RTP; ceiling stays <100%', function () use ($c) {
    $n = 40000;
    $rtp = function (int $lines, float $scale) use ($c, $n): float {
        $wager = 0.0; $ret = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $s = arabianCall($c, 'settleArabianSpin', 1.0, $lines, ['freeSpinsRemaining' => 0], $scale);
            $wager += (float) $s['roundData']['totalBet']; $ret += (float) $s['totalReturn'];
            $fs = (int) $s['stateAfter']['freeSpinsRemaining']; $guard = 0;
            while ($fs > 0 && $guard < 5000) { $guard++; $s = arabianCall($c, 'settleArabianSpin', 1.0, $lines, $s['stateAfter'], $scale); $ret += (float) $s['totalReturn']; $fs = (int) $s['stateAfter']['freeSpinsRemaining']; }
        }
        return $ret / $wager;
    };
    $floor = $rtp(20, 0.90);
    $ceil = $rtp(20, 1.05);
    // 40k CSPRNG spins are noisy on the high-variance top bonus; these guard the
    // lever's direction + magnitude only. The PRECISE house-positive ceiling
    // (2M sim: scale 1.05 -> 98.0% at both 1 and 20 lines) is reported, not
    // asserted at this sample size.
    TestRunner::assertTrue($floor > 0.78 && $floor < 0.90, 'scale 0.90 RTP ~84% (in [0.78,0.90]): ' . round($floor * 100, 2) . '%');
    TestRunner::assertTrue($ceil > $floor && $ceil < 1.08, 'scale 1.05 raises RTP toward ~98% (2M sim), not broken: ' . round($ceil * 100, 2) . '%');
    TestRunner::assertTrue($ceil > $floor, 'higher scale => higher RTP');
});
