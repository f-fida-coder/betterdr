<?php

/**
 * Read-only sanity test for the updated teaser config. Loads
 * BetModeRules::getDefault('teaser') and asserts every reference value
 * the user supplied from bettorjuice365.com screenshots. No DB writes,
 * no network — pure unit-level check against the PHP source of truth.
 *
 * Usage:
 *   php php-backend/scripts/test-teaser-config.php
 *
 * Exits 0 on full pass, 1 on any failure.
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/BetModeRules.php';

$failures = [];
$passes = 0;

/**
 * @param mixed $expected
 * @param mixed $actual
 */
function expect(string $label, $expected, $actual): void
{
    global $failures, $passes;
    $ok = is_float($expected) || is_float($actual)
        ? (abs(((float) $expected) - ((float) $actual)) < 0.00001)
        : $expected === $actual;
    if ($ok) {
        $passes++;
        echo "  ✓ {$label}\n";
        return;
    }
    $failures[] = $label;
    $expStr = is_array($expected) ? json_encode($expected) : var_export($expected, true);
    $actStr = is_array($actual) ? json_encode($actual) : var_export($actual, true);
    echo "  ✗ {$label}\n";
    echo "      expected: {$expStr}\n";
    echo "      actual:   {$actStr}\n";
}

// American → decimal multiplier helper (matches comment math in
// BetModeRules and the conversions in the user's screenshots).
function american_to_mult(int $american): float
{
    return $american < 0
        ? 1.0 + 100.0 / abs($american)
        : 1.0 + $american / 100.0;
}

$rule = BetModeRules::getDefault('teaser');
if ($rule === null) {
    fwrite(STDERR, "ERROR: BetModeRules::getDefault('teaser') returned null\n");
    exit(1);
}

$typesById = [];
foreach (($rule['teaserTypes'] ?? []) as $t) {
    if (isset($t['id'])) {
        $typesById[$t['id']] = $t;
    }
}

// ---------- standard_6_4 (6 / 4) ----------
echo "standard_6_4 — 6 PT FB / 4 PT BK · Ties Push\n";
$t = $typesById['standard_6_4'] ?? null;
expect('exists', true, is_array($t));
expect('football points = 6', 6.0, (float) ($t['pointsBySport']['football'] ?? 0));
expect('basketball points = 4', 4.0, (float) ($t['pointsBySport']['basketball'] ?? 0));
expect('tiesRule = push', 'push', $t['tiesRule'] ?? null);
$m = $t['payoutProfile']['multipliers'] ?? [];
expect('2-team = -130', american_to_mult(-130), (float) ($m['2'] ?? 0));
expect('3-team = +130', american_to_mult(+130), (float) ($m['3'] ?? 0));
expect('4-team = +230', american_to_mult(+230), (float) ($m['4'] ?? 0));
expect('5-team = +340', american_to_mult(+340), (float) ($m['5'] ?? 0));
expect('6-team = +500', american_to_mult(+500), (float) ($m['6'] ?? 0));

// ---------- standard_65_45 (6.5 / 4.5) ----------
echo "standard_65_45 — 6.5 PT FB / 4.5 PT BK · Ties Push\n";
$t = $typesById['standard_65_45'] ?? null;
expect('exists', true, is_array($t));
expect('football points = 6.5', 6.5, (float) ($t['pointsBySport']['football'] ?? 0));
expect('basketball points = 4.5', 4.5, (float) ($t['pointsBySport']['basketball'] ?? 0));
$m = $t['payoutProfile']['multipliers'] ?? [];
expect('2-team = -140', american_to_mult(-140), (float) ($m['2'] ?? 0));
expect('3-team = +120', american_to_mult(+120), (float) ($m['3'] ?? 0));
expect('4-team = +190', american_to_mult(+190), (float) ($m['4'] ?? 0));
expect('5-team = +300', american_to_mult(+300), (float) ($m['5'] ?? 0));
expect('6-team = +400', american_to_mult(+400), (float) ($m['6'] ?? 0));

// ---------- standard_7_5 (7 / 5) ----------
echo "standard_7_5 — 7 PT FB / 5 PT BK · Ties Push\n";
$t = $typesById['standard_7_5'] ?? null;
expect('exists', true, is_array($t));
expect('football points = 7', 7.0, (float) ($t['pointsBySport']['football'] ?? 0));
expect('basketball points = 5', 5.0, (float) ($t['pointsBySport']['basketball'] ?? 0));
$m = $t['payoutProfile']['multipliers'] ?? [];
expect('2-team = -150', american_to_mult(-150), (float) ($m['2'] ?? 0));
expect('3-team = +110', american_to_mult(+110), (float) ($m['3'] ?? 0));
expect('4-team = +170', american_to_mult(+170), (float) ($m['4'] ?? 0));
expect('5-team = +250', american_to_mult(+250), (float) ($m['5'] ?? 0));
expect('6-team = +350', american_to_mult(+350), (float) ($m['6'] ?? 0));

// ---------- super_10_team (10 FB / 8 BK) — the user-flagged fix ----------
echo "super_10_team — 3 Team Super Teaser (10 FB / 8 BK) · Ties Lose\n";
$t = $typesById['super_10_team'] ?? null;
expect('exists', true, is_array($t));
expect('football points = 10', 10.0, (float) ($t['pointsBySport']['football'] ?? 0));
expect('basketball points = 8 (NEW)', 8.0, (float) ($t['pointsBySport']['basketball'] ?? 0));
expect('tiesRule = lose', 'lose', $t['tiesRule'] ?? null);
expect('minLegs = 3', 3, $t['minLegs'] ?? null);
expect('maxLegs = 3 (3-team only)', 3, $t['maxLegs'] ?? null);
$m = $t['payoutProfile']['multipliers'] ?? [];
expect('3-team = -140', american_to_mult(-140), (float) ($m['3'] ?? 0));
expect('no 2-team entry', false, isset($m['2']));
expect('no 4-team entry (3-team only)', false, isset($m['4']));

// ---------- derived option lists (frontend reads these) ----------
echo "derived point-option lists\n";
$opts = BetModeRules::teaserPointOptionsBySport();
expect('football options = [6, 6.5, 7, 10]', [6.0, 6.5, 7.0, 10.0], $opts['football'] ?? []);
expect('basketball options = [4, 4.5, 5, 8] (8 NEW)', [4.0, 4.5, 5.0, 8.0], $opts['basketball'] ?? []);

// ---------- end-to-end payout sim: original screenshot scenario ----------
echo "end-to-end: 3 NBA spreads + Super Teaser + \$1500 risk\n";
$super = $typesById['super_10_team'];
$multiplier3 = (float) $super['payoutProfile']['multipliers']['3'];
$risk = 1500.0;
$payout = $risk * $multiplier3;
$winProfit = $payout - $risk;
expect('multiplier == 1.71429', 1.71429, round($multiplier3, 5));
// True -140 yields $1071.4286; stored multiplier is rounded to 5 dp
// so the dollar figure lands within a cent. Tolerance reflects that.
expect('$1500 risk → ~$1071.43 win (matches -140, ±$0.02)', true, abs($winProfit - 1071.43) <= 0.02);
// Confirms basketball is now covered → UI auto-sync sets teaserPoints=8
// → validation passes → spread shifts by 8 points → no stuck state.
$bkPts = (float) ($super['pointsBySport']['basketball'] ?? 0);
expect('basketball coverage unblocks UI auto-sync', true, $bkPts > 0);

// ---------- legacy fallback (no teaserTypeId clients) ----------
echo "legacy rule-level fallback (no teaserTypeId)\n";
$fbm = $rule['payoutProfile']['multipliers'] ?? [];
expect('fallback 2-team = -130', american_to_mult(-130), (float) ($fbm['2'] ?? 0));
expect('fallback 3-team = +130', american_to_mult(+130), (float) ($fbm['3'] ?? 0));
expect('fallback 6-team = +500', american_to_mult(+500), (float) ($fbm['6'] ?? 0));

echo "\n";
if (count($failures) > 0) {
    echo "FAIL: " . count($failures) . " assertion(s) failed ({$passes} passed)\n";
    foreach ($failures as $f) {
        echo "  - {$f}\n";
    }
    exit(1);
}
echo "PASS: {$passes} assertions, 0 failures\n";
exit(0);
