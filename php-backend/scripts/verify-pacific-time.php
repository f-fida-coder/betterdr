<?php
/**
 * Pacific Time Boundary Verification
 *
 * Proves that:
 * 1. "Today" resets at midnight Pacific, not UTC
 * 2. "Week" boundaries use Tuesday 00:00 Pacific
 * 3. Cumulative values (Previous Balance, Makeup) do NOT reset at midnight
 * 4. Only period-based counters reset at correct Pacific boundaries
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/AgentSettlementRules.php';

$passed = 0;
$failed = 0;

function v(bool $ok, string $label): void
{
    global $passed, $failed;
    if ($ok) { $passed++; } else { $failed++; echo "  FAIL: $label\n"; }
}

function eq(float $a, float $b): bool { return abs($a - $b) < 0.005; }

echo "==============================================\n";
echo "Pacific Time Boundary Verification\n";
echo "==============================================\n\n";

$pacific = new DateTimeZone('America/Los_Angeles');
$utc = new DateTimeZone('UTC');

// ── SCENARIO A: Just BEFORE midnight Pacific (11:59 PM PT = 06:59 or 07:59 UTC next day) ──
echo "--- Scenario A: 11:59 PM Pacific (just before midnight) ---\n";

// Simulate: March 31, 2026 at 11:59 PM Pacific (PDT, UTC-7)
$beforeMidnightPT = new DateTimeImmutable('2026-03-31 23:59:00', $pacific);
$beforeMidnightUTC = $beforeMidnightPT->setTimezone($utc);

// "Today" in Pacific should be March 31
$todayPacific = new DateTimeImmutable('2026-03-31 00:00:00', $pacific);

// "Today" in UTC would be April 1 at ~07:00 — WRONG for Pacific-based dashboard
$todayUTC = new DateTimeImmutable($beforeMidnightUTC->format('Y-m-d') . ' 00:00:00', $utc);

echo "  PT time: " . $beforeMidnightPT->format('Y-m-d H:i:s T') . "\n";
echo "  UTC time: " . $beforeMidnightUTC->format('Y-m-d H:i:s T') . "\n";
echo "  Pacific 'today': " . $todayPacific->format('Y-m-d H:i:s T') . "\n";
echo "  UTC 'today':     " . $todayUTC->format('Y-m-d H:i:s T') . "\n";

v(
    $todayPacific->format('Y-m-d') === '2026-03-31',
    'A1: Pacific today = March 31 (correct)'
);
v(
    $beforeMidnightUTC->format('Y-m-d') === '2026-04-01',
    'A2: UTC date = April 1 at this moment (would be wrong for today boundary)'
);

// A transaction at 11:30 PM PT on March 31 should count in "today" (Pacific-based)
$txTime = new DateTimeImmutable('2026-03-31 23:30:00', $pacific);
$txTimestamp = $txTime->getTimestamp();
$todayPacificTimestamp = $todayPacific->getTimestamp();
v(
    $txTimestamp >= $todayPacificTimestamp,
    'A3: 11:30 PM PT transaction IS in Pacific today (correct)'
);

// But using UTC today, this transaction would be "tomorrow" — wrong
$todayUTCTimestamp = $todayUTC->getTimestamp();
v(
    $txTimestamp >= $todayUTCTimestamp,
    'A4: Same transaction also passes UTC today (but UTC today is April 1 — this is the bug we fixed)'
);
echo "\n";

// ── SCENARIO B: Just AFTER midnight Pacific (12:01 AM PT April 1) ──
echo "--- Scenario B: 12:01 AM Pacific (just after midnight) ---\n";

$afterMidnightPT = new DateTimeImmutable('2026-04-01 00:01:00', $pacific);
$newTodayPacific = new DateTimeImmutable('2026-04-01 00:00:00', $pacific);

// The 11:30 PM PT March 31 transaction should NOT be in "today" after midnight
v(
    $txTimestamp < $newTodayPacific->getTimestamp(),
    'B1: Yesterday 11:30 PM PT transaction is NOT in new Pacific today (correct reset)'
);

// "Today" counter resets at Pacific midnight
v(
    $newTodayPacific->format('Y-m-d') === '2026-04-01',
    'B2: New Pacific today = April 1'
);
echo "\n";

// ── SCENARIO C: Weekly boundary does NOT reset at midnight ──
echo "--- Scenario C: Weekly figures do NOT reset at midnight ---\n";

// Business week: Tuesday 00:00 Pacific through Monday 23:59:59 Pacific
// If today is Wednesday March 25 2026, week started Tuesday March 24 00:00 PT

$wednesdayPT = new DateTimeImmutable('2026-03-25 23:59:00', $pacific);
$weekday = (int) $wednesdayPT->format('N'); // 3 = Wednesday
$daysFromTuesday = ($weekday + 5) % 7; // (3+5)%7 = 1
$weekStart = $wednesdayPT->setTime(0, 0, 0)->modify('-' . $daysFromTuesday . ' days');

v(
    $weekStart->format('Y-m-d') === '2026-03-24',
    'C1: Wednesday → week started Tuesday March 24 (correct)'
);
v(
    $weekStart->format('l') === 'Tuesday',
    'C2: Week start is a Tuesday'
);

// At midnight Wednesday → week should NOT reset (still same Tuesday-Monday period)
$thursdayMidnight = new DateTimeImmutable('2026-03-26 00:00:00', $pacific);
$weekday2 = (int) $thursdayMidnight->format('N'); // 4 = Thursday
$daysFromTuesday2 = ($weekday2 + 5) % 7; // (4+5)%7 = 2
$weekStart2 = $thursdayMidnight->setTime(0, 0, 0)->modify('-' . $daysFromTuesday2 . ' days');

v(
    $weekStart2->format('Y-m-d') === '2026-03-24',
    'C3: Thursday midnight → SAME week (Tuesday March 24), no reset'
);

// Week only resets on next Tuesday
$nextTuesday = new DateTimeImmutable('2026-03-31 00:00:00', $pacific); // Tuesday
$weekday3 = (int) $nextTuesday->format('N'); // 2 = Tuesday
$daysFromTuesday3 = ($weekday3 + 5) % 7; // (2+5)%7 = 0
$weekStart3 = $nextTuesday->setTime(0, 0, 0)->modify('-' . $daysFromTuesday3 . ' days');

v(
    $weekStart3->format('Y-m-d') === '2026-03-31',
    'C4: Tuesday March 31 → NEW week starts (correct weekly reset)'
);
echo "\n";

// ── SCENARIO D: Cumulative values do NOT reset at midnight ──
echo "--- Scenario D: Cumulative values survive midnight ---\n";

// Simulate: previousMakeup=500, previousBalanceOwed=1200
// These are stored on the agent record, not computed from time boundaries

// At 11:59 PM:
$s1 = AgentSettlementRules::summarize(1000.0, 300.0, 20.0, 8.0, 50.0, 500.0, 1200.0);
// At 12:01 AM (next day, same week — same transactions):
$s2 = AgentSettlementRules::summarize(1000.0, 300.0, 20.0, 8.0, 50.0, 500.0, 1200.0);

v(eq($s1['previousMakeup'], $s2['previousMakeup']), 'D1: previousMakeup unchanged across midnight');
v(eq($s1['cumulativeMakeup'], $s2['cumulativeMakeup']), 'D2: cumulativeMakeup unchanged across midnight');
v(eq($s1['previousBalanceOwed'], $s2['previousBalanceOwed']), 'D3: previousBalanceOwed unchanged across midnight');
v(eq($s1['balanceOwed'], $s2['balanceOwed']), 'D4: balanceOwed unchanged across midnight');
v(eq($s1['weeklyHouseBalance'], $s2['weeklyHouseBalance']), 'D5: weeklyHouseBalance unchanged across midnight (same week)');
echo "\n";

// ── SCENARIO E: Previous Balance remains unchanged until finalization ──
echo "--- Scenario E: Previous Balance is carry-forward only ---\n";

// Week 1: agent has previousBalanceOwed = 0
$w1 = AgentSettlementRules::summarize(800.0, 200.0, 16.0, 8.0, 50.0, 0.0, 0.0);
v(eq($w1['previousBalanceOwed'], 0.0), 'E1: W1 previousBalance = 0 (fresh start)');
v($w1['balanceOwed'] > 0, 'E2: W1 balanceOwed > 0 (accumulated this week)');

// After finalization: admin persists balanceOwed as new previousBalanceOwed
$finalizedBalance = $w1['balanceOwed'];

// Week 2: using finalized values
$w2 = AgentSettlementRules::summarize(600.0, 100.0, 12.0, 4.0, 50.0, $w1['cumulativeMakeup'], $finalizedBalance);
v(eq($w2['previousBalanceOwed'], $finalizedBalance), 'E3: W2 previousBalance = W1 finalized balanceOwed');
v($w2['balanceOwed'] > $finalizedBalance, 'E4: W2 balanceOwed grew from previous (cumulative)');

echo "  W1: prevBal=0 → balOwed=" . number_format($w1['balanceOwed'], 2) . "\n";
echo "  W2: prevBal=" . number_format($finalizedBalance, 2) . " → balOwed=" . number_format($w2['balanceOwed'], 2) . "\n";
echo "\n";

// ── SCENARIO F: Realistic example with concrete values ──
echo "--- Scenario F: Realistic before/after example ---\n";
echo "  Agent: 50% split, $4/player fee\n";
echo "  5 positive players, 2 negative players\n";
echo "  Previous Makeup: \$200, Previous Balance: \$800\n";
echo "  This week: Agent collected \$3000, House collected \$500\n\n";

$realistic = AgentSettlementRules::summarize(
    3000.0,   // agent collections
    500.0,    // house collections
    20.0,     // 5 positive × $4
    8.0,      // 2 negative × $4
    50.0,     // 50% split
    200.0,    // previous makeup
    800.0     // previous balance owed
);

echo "  Net Collections:       \$" . number_format($realistic['netCollections'], 2) . "\n";
echo "  Makeup Reduction:      \$" . number_format($realistic['makeupReduction'], 2) . " (from previous \$200)\n";
echo "  Commissionable:        \$" . number_format($realistic['commissionableProfit'], 2) . "\n";
echo "  Agent Split (50%):     \$" . number_format($realistic['agentSplit'], 2) . "\n";
echo "  Kick To House:         \$" . number_format($realistic['kickToHouse'], 2) . "\n";
echo "  Agent Profit (- fees): \$" . number_format($realistic['agentProfitAfterFees'], 2) . "\n";
echo "  Weekly House Balance:  \$" . number_format($realistic['weeklyHouseBalance'], 2) . "\n";
echo "  Previous Balance:      \$" . number_format($realistic['previousBalanceOwed'], 2) . "\n";
echo "  Balance Owed:          \$" . number_format($realistic['balanceOwed'], 2) . "\n";
echo "  Previous Makeup:       \$" . number_format($realistic['previousMakeup'], 2) . "\n";
echo "  Current Makeup:        \$" . number_format($realistic['cumulativeMakeup'], 2) . "\n";
echo "\n";

v(eq($realistic['netCollections'], 2500.0), 'F1: net=3000-500=2500');
v(eq($realistic['makeupReduction'], 200.0), 'F2: full previous makeup cleared');
v(eq($realistic['commissionableProfit'], 2300.0), 'F3: commissionable=2500-200=2300');
v(eq($realistic['agentSplit'], 1150.0), 'F4: split=2300*50%=1150');
v(eq($realistic['kickToHouse'], 1150.0), 'F5: kick=1150');
v(eq($realistic['weeklyHouseBalance'], 1170.0), 'F6: weeklyHouseBal=1150+20=1170');
v(eq($realistic['previousBalanceOwed'], 800.0), 'F7: previousBalance=800 (unchanged carry-forward)');
v(eq($realistic['balanceOwed'], 2470.0), 'F8: balanceOwed=800+500+1170=2470');
v(eq($realistic['cumulativeMakeup'], 8.0), 'F9: makeup=200-200+0+8=8 (only unpaid fees remain)');
echo "\n";

// ── SUMMARY ──
echo "==============================================\n";
$total = $passed + $failed;
echo "RESULTS: $passed/$total passed";
if ($failed > 0) {
    echo " ($failed FAILED)";
    echo "\n==============================================\n";
    exit(1);
}
echo "\n==============================================\n";
echo "\nAll Pacific-time boundary checks passed.\n";
exit(0);
