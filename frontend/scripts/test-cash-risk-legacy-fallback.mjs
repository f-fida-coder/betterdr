// Mockup test for the legacy-fallback in cashRiskOfBet (MyBetsView).
// Old bets placed before the freeplayAmountUsed field shipped don't
// carry an explicit cash/FP split — only the `isFreeplay` boolean.
// Without a fallback, those bets would display as if the entire
// stake was cash. The mirror here proves the fallback treats them
// as pure-freeplay, matching the backend's same default.
//
// Run: node frontend/scripts/test-cash-risk-legacy-fallback.mjs
// Exit 0 = pass, 1 = any failure.

let passes = 0;
const failures = [];

function expect(label, expected, actual) {
    const ok = JSON.stringify(expected) === JSON.stringify(actual);
    if (ok) { passes++; console.log(`  ✓ ${label}`); return; }
    failures.push(label);
    console.log(`  ✗ ${label}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
}

// Mirror of cashRiskOfBet with the new legacy fallback.
const cashRiskOfBet = (bet) => {
    const totalRisk = Number(bet?.riskAmount ?? bet?.amount ?? 0);
    const fpRaw = Number(bet?.freeplayAmountUsed ?? 0);
    let fpUsed = Number.isFinite(fpRaw) && fpRaw > 0 ? Math.min(fpRaw, totalRisk) : 0;
    if (fpUsed === 0 && bet?.isFreeplay === true && totalRisk > 0) {
        fpUsed = totalRisk;
    }
    return {
        cashRisk: Math.max(0, totalRisk - fpUsed),
        fpUsed,
        totalRisk,
    };
};

console.log('Modern bet — freeplayAmountUsed stored explicitly');
{
    const bet = { riskAmount: 1000, freeplayAmountUsed: 700, isFreeplay: true };
    expect('explicit split: cashRisk = 300', 300, cashRiskOfBet(bet).cashRisk);
    expect('explicit split: fpUsed = 700', 700, cashRiskOfBet(bet).fpUsed);
}

console.log('Legacy bet — isFreeplay=true, no freeplayAmountUsed');
{
    const bet = { riskAmount: 1000, isFreeplay: true };
    expect('legacy FP: fpUsed defaults to totalRisk', 1000, cashRiskOfBet(bet).fpUsed);
    expect('legacy FP: cashRisk = 0 (no own-money on the line)', 0, cashRiskOfBet(bet).cashRisk);
}

console.log('Modern cash bet — isFreeplay=false, no FP field');
{
    const bet = { riskAmount: 500, isFreeplay: false };
    expect('plain cash: fpUsed = 0', 0, cashRiskOfBet(bet).fpUsed);
    expect('plain cash: cashRisk = 500', 500, cashRiskOfBet(bet).cashRisk);
}

console.log('isFreeplay missing entirely (older legacy) — treated as cash');
{
    const bet = { riskAmount: 500 };
    expect('no isFreeplay flag: cashRisk = totalRisk', 500, cashRiskOfBet(bet).cashRisk);
    expect('no isFreeplay flag: fpUsed = 0', 0, cashRiskOfBet(bet).fpUsed);
}

console.log('Fallback respects edge cases (0 risk, falsy flag)');
{
    expect('zero risk + isFreeplay → no FP applied', 0, cashRiskOfBet({ riskAmount: 0, isFreeplay: true }).fpUsed);
    expect('isFreeplay falsy string → not treated as flag', 0, cashRiskOfBet({ riskAmount: 100, isFreeplay: 'true' }).fpUsed);
    expect('isFreeplay = 1 (truthy non-bool) → not treated as flag', 0, cashRiskOfBet({ riskAmount: 100, isFreeplay: 1 }).fpUsed);
}

console.log('Explicit value beats legacy fallback (modern bets keep working)');
{
    // If both isFreeplay=true AND freeplayAmountUsed=500 are present,
    // honor the explicit split, not the legacy "assume pure FP" rule.
    const bet = { riskAmount: 1000, freeplayAmountUsed: 500, isFreeplay: true };
    expect('explicit fpUsed beats inference', 500, cashRiskOfBet(bet).fpUsed);
    expect('explicit cashRisk = 500', 500, cashRiskOfBet(bet).cashRisk);
}

console.log('');
if (failures.length > 0) {
    console.log(`FAIL: ${failures.length} assertion(s) failed (${passes} passed)`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
}
console.log(`PASS: ${passes} assertions, 0 failures`);
process.exit(0);
