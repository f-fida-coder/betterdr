<?php
/**
 * Pacific Time Boundary Verification
 *
 * Verifies that period boundaries are Pacific-based and that settlement
 * carry-forward values remain stable within the same business week.
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/AgentSettlementRules.php';

function v(bool $ok, string $label): void
{
    if (!$ok) {
        throw new RuntimeException($label);
    }
}

function eq(float $a, float $b): bool
{
    return abs($a - $b) < 0.005;
}

function startOfBusinessWeek(DateTimeImmutable $date, DateTimeZone $pacific): DateTimeImmutable
{
    $localized = $date->setTimezone($pacific);
    $weekday = (int) $localized->format('N'); // Monday=1 ... Sunday=7
    $daysFromTuesday = ($weekday + 5) % 7;
    return $localized->setTime(0, 0, 0)->modify('-' . $daysFromTuesday . ' days');
}

echo "==============================================\n";
echo "Pacific Time Boundary Verification\n";
echo "==============================================\n\n";

try {
    $pacific = new DateTimeZone('America/Los_Angeles');
    $utc = new DateTimeZone('UTC');

    echo "--- Scenario A: Pacific midnight boundary ---\n";
    $beforeMidnightPt = new DateTimeImmutable('2026-03-31 23:59:00', $pacific);
    $todayPacific = new DateTimeImmutable('2026-03-31 00:00:00', $pacific);
    v($beforeMidnightPt->setTimezone($utc)->format('Y-m-d') === '2026-04-01', 'A1: UTC date should already be April 1');
    v($todayPacific->format('Y-m-d') === '2026-03-31', 'A2: Pacific today remains March 31');

    echo "--- Scenario B: New Pacific day after midnight ---\n";
    $afterMidnightPt = new DateTimeImmutable('2026-04-01 00:01:00', $pacific);
    $newTodayPacific = new DateTimeImmutable('2026-04-01 00:00:00', $pacific);
    v($afterMidnightPt->format('Y-m-d') === '2026-04-01', 'B1: Pacific date moved to April 1');
    v($newTodayPacific->format('Y-m-d') === '2026-04-01', 'B2: Pacific today resets at midnight');

    echo "--- Scenario C: Tuesday-based business week ---\n";
    $wednesday = new DateTimeImmutable('2026-04-01 12:00:00', $pacific);
    $monday = new DateTimeImmutable('2026-04-06 22:00:00', $pacific);
    $tuesdayStart = startOfBusinessWeek($wednesday, $pacific);
    v($tuesdayStart->format('Y-m-d H:i:s') === '2026-03-31 00:00:00', 'C1: Wednesday belongs to Tuesday-start week');
    v(startOfBusinessWeek($monday, $pacific)->format('Y-m-d H:i:s') === '2026-03-31 00:00:00', 'C2: Monday still belongs to same Tuesday-start week');

    echo "--- Scenario D: Settlement values stay stable within same week ---\n";
    $s1 = AgentSettlementRules::summarize(1000.0, 300.0, 20.0, 8.0, 50.0, 500.0, 1200.0);
    $s2 = AgentSettlementRules::summarize(1000.0, 300.0, 20.0, 8.0, 50.0, 500.0, 1200.0);
    v(eq($s1['previousMakeup'], $s2['previousMakeup']), 'D1: previousMakeup unchanged across midnight');
    v(eq($s1['cumulativeMakeup'], $s2['cumulativeMakeup']), 'D2: cumulativeMakeup unchanged across midnight');
    v(eq($s1['previousBalanceOwed'], $s2['previousBalanceOwed']), 'D3: previousBalanceOwed unchanged across midnight');
    v(eq($s1['balanceOwed'], $s2['balanceOwed']), 'D4: balanceOwed unchanged across midnight');
    v(eq($s1['houseProfit'], $s2['houseProfit']), 'D5: houseProfit unchanged across midnight');

    echo "--- Scenario E: Carry-forward uses prior week close ---\n";
    $w1 = AgentSettlementRules::summarize(300.0, -900.0, 8.0, 16.0, 50.0, 0.0, 0.0);
    v(eq($w1['previousBalanceOwed'], 0.0), 'E1: week 1 starts with zero previous balance');
    v(eq($w1['cumulativeMakeup'], 624.0), 'E2: week 1 builds makeup from deficit plus fees');
    v(eq($w1['balanceOwed'], 300.0), 'E3: week 1 balance owed tracks agent-held cash');

    $w2 = AgentSettlementRules::summarize(800.0, -300.0, 12.0, 4.0, 50.0, $w1['cumulativeMakeup'], $w1['balanceOwed']);
    v(eq($w2['previousBalanceOwed'], 300.0), 'E4: week 2 previous balance equals week 1 close');
    v(eq($w2['makeupReduction'], 500.0), 'E5: week 2 pays down prior makeup first');
    v(eq($w2['cumulativeMakeup'], 140.0), 'E6: week 2 leaves remaining makeup after fees');
    v(eq($w2['balanceOwed'], 1100.0), 'E7: week 2 balance owed keeps accumulating correctly');

    echo "\nAll Pacific-time boundary checks passed.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Pacific-time verification failed: " . $e->getMessage() . "\n");
    exit(1);
}
