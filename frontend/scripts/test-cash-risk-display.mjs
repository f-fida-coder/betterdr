// Mockup test for the Cash-vs-Freeplay risk split shown on bet
// tickets in My Bets. The reported bug: a $1,000 Tigers ticket
// funded with $700 freeplay still showed Risk = $1,000 in the
// pending list. The player only had $300 of their own money on
// the line, so the Risk column should headline $300 and surface
// the FP slice as a small annotation.
//
// Run: node frontend/scripts/test-cash-risk-display.mjs
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

// Pure-JS mirror of cashRiskOfBet from MyBetsView.jsx.
const cashRiskOfBet = (bet) => {
    const totalRisk = Number(bet?.riskAmount ?? bet?.amount ?? 0);
    const fpRaw = Number(bet?.freeplayAmountUsed ?? 0);
    const fpUsed = Number.isFinite(fpRaw) && fpRaw > 0 ? Math.min(fpRaw, totalRisk) : 0;
    return {
        cashRisk: Math.max(0, totalRisk - fpUsed),
        fpUsed,
        totalRisk,
    };
};

// Faithful pure-JS mirror of ticketAmount (won / lost incl. partial-return /
// void / pending). Returns { text, returned? } like the component.
const ticketAmount = (bet) => {
    const status = String(bet?.status || '').toLowerCase();
    const risk = Number(bet?.riskAmount || bet?.amount || 0);
    const potential = Number(bet?.potentialPayout || 0);
    const profit = Math.max(0, potential - risk);
    const { cashRisk, fpUsed } = cashRiskOfBet(bet);
    if (status === 'won') return { text: `+${profit.toFixed(2)}` };
    if (status === 'lost') {
        // Partial-refund loss (genuine Asian-handicap half-loss): potentialPayout
        // is the stake that came back → show net loss + a "returned" annotation.
        const returned = potential;
        if (returned > 0 && fpUsed <= 0) {
            const netLoss = Math.max(0, cashRisk - returned);
            return { text: `-${netLoss.toFixed(2)}`, returned };
        }
        return { text: `-${cashRisk.toFixed(2)}` };
    }
    // Push / void → net-zero P/L, just "$0" (PO 2026-07-19; was "Refund $X").
    if (status === 'void') return { text: '$0' };
    return { text: profit.toFixed(2) };
};
const ticketAmountText = (bet) => ticketAmount(bet).text;

console.log('Reported scenario — $1000 Tigers ticket with $700 freeplay');
{
    const bet = {
        riskAmount: 1000,
        potentialPayout: 1980, // $980 win at -102
        freeplayAmountUsed: 700,
        isFreeplay: true,
        status: 'pending',
    };
    const split = cashRiskOfBet(bet);
    expect('cashRisk = 300 (was showing 1000)', 300, split.cashRisk);
    expect('fpUsed = 700', 700, split.fpUsed);
    expect('totalRisk preserved for any caller that wants it', 1000, split.totalRisk);
}

console.log('Pure freeplay bet — entire stake is house pool');
{
    const bet = { riskAmount: 500, freeplayAmountUsed: 500, isFreeplay: true, status: 'pending' };
    const split = cashRiskOfBet(bet);
    expect('cashRisk = 0', 0, split.cashRisk);
    expect('fpUsed = 500', 500, split.fpUsed);
}

console.log('Plain cash bet — no FP, no annotation needed');
{
    const bet = { riskAmount: 250, freeplayAmountUsed: 0, isFreeplay: false, status: 'pending' };
    const split = cashRiskOfBet(bet);
    expect('cashRisk = totalRisk when no FP applied', 250, split.cashRisk);
    expect('fpUsed = 0 → component skips annotation', 0, split.fpUsed);
}

console.log('Defensive: missing / non-numeric freeplay fields');
{
    expect('missing freeplayAmountUsed → fpUsed=0', 0, cashRiskOfBet({ riskAmount: 100 }).fpUsed);
    expect('null freeplayAmountUsed → fpUsed=0', 0, cashRiskOfBet({ riskAmount: 100, freeplayAmountUsed: null }).fpUsed);
    expect('NaN freeplayAmountUsed → fpUsed=0', 0, cashRiskOfBet({ riskAmount: 100, freeplayAmountUsed: NaN }).fpUsed);
    expect('negative freeplayAmountUsed → fpUsed=0', 0, cashRiskOfBet({ riskAmount: 100, freeplayAmountUsed: -50 }).fpUsed);
    expect('fpUsed clamped to totalRisk if backend ships more', 100, cashRiskOfBet({ riskAmount: 100, freeplayAmountUsed: 250 }).fpUsed);
    expect('clamped: cashRisk = 0 not negative', 0, cashRiskOfBet({ riskAmount: 100, freeplayAmountUsed: 250 }).cashRisk);
}

console.log('Graded labels — lost / void / won use cashRisk where applicable');
{
    const lost = { riskAmount: 1000, freeplayAmountUsed: 700, status: 'lost', potentialPayout: 1980 };
    expect('LOST freeplay ticket shows -$300, not -$1000', '-300.00', ticketAmountText(lost));
    const void_ = { riskAmount: 1000, freeplayAmountUsed: 700, status: 'void', potentialPayout: 1980 };
    expect('VOID/PUSH ticket shows $0 (no Refund wording)', '$0', ticketAmountText(void_));
    const won = { riskAmount: 1000, freeplayAmountUsed: 700, status: 'won', potentialPayout: 1980 };
    // WON profit is still profit regardless of how the stake was
    // funded — $980 win at -102 odds is $980 either way.
    expect('WON ticket profit unchanged by FP split', '+980.00', ticketAmountText(won));
    // Realistic full-loss ticket: settlement zeroes potentialPayout, so no
    // partial-return branch → shows -risk.
    const lostPlain = { riskAmount: 1000, freeplayAmountUsed: 0, status: 'lost', potentialPayout: 0 };
    expect('LOST plain cash ticket shows -$1000 (no regression)', '-1000.00', ticketAmountText(lostPlain));
}

console.log('Settled RR group + push display (PO 2026-07-19)');
{
    // THE $839 BUG: a lost RR group used to send totalPotentialPayout (839) as
    // potentialPayout, so the partial-return branch fired: netLoss = max(0,
    // 100 − 839) = 0 → "-0.00 / returned 839". The backend fix sends totalPayout
    // (0) for a settled group, so the group now reads a clean -$100.
    const buggyShape = { riskAmount: 100, freeplayAmountUsed: 0, status: 'lost', potentialPayout: 839 };
    expect('OLD buggy shape (totalPotentialPayout leaked) → -0.00', '-0.00', ticketAmountText(buggyShape));
    expect('OLD buggy shape annotates a phantom return', 839, ticketAmount(buggyShape).returned);
    const fixedGroup = { riskAmount: 100, freeplayAmountUsed: 0, status: 'lost', potentialPayout: 0 };
    expect('FIXED: settled lost group (totalPayout 0) → -100.00', '-100.00', ticketAmountText(fixedGroup));
    expect('FIXED: no phantom "returned" annotation', undefined, ticketAmount(fixedGroup).returned);

    // Genuine push/void on a straight leg → "$0", no refund text (any stake).
    const push = { riskAmount: 1200, freeplayAmountUsed: 0, status: 'void', potentialPayout: 1200 };
    expect('PUSH straight leg → $0 (was "Refund $1,200")', '$0', ticketAmountText(push));

    // Genuine partial-LOSS (Asian half-loss) is a DIFFERENT case and is
    // preserved: stake $200, half came back ($100) → net -$100 + returned $100.
    const halfLoss = { riskAmount: 200, freeplayAmountUsed: 0, status: 'lost', potentialPayout: 100 };
    expect('partial-loss net shown', '-100.00', ticketAmountText(halfLoss));
    expect('partial-loss keeps "returned" annotation', 100, ticketAmount(halfLoss).returned);
}

console.log('Round Robin child — each child carries its own freeplayAmountUsed');
{
    const child = { riskAmount: 25, freeplayAmountUsed: 17.5, isFreeplay: true, status: 'pending' };
    const split = cashRiskOfBet(child);
    expect('child cashRisk respects pro-rata FP slice', 7.5, split.cashRisk);
    expect('child fpUsed = 17.5', 17.5, split.fpUsed);
}

console.log('End-to-end replay of the Tigers screenshot');
{
    const bet = {
        riskAmount: 1000,
        potentialPayout: 1980,
        freeplayAmountUsed: 700,
        isFreeplay: true,
        status: 'pending',
    };
    const { cashRisk, fpUsed } = cashRiskOfBet(bet);
    // What the column now displays for the user-reported ticket.
    const headline = cashRisk.toFixed(2);
    const annotation = fpUsed > 0 ? `+$${fpUsed.toFixed(2)} FP` : '';
    expect('Risk column headline = $300.00', '300.00', headline);
    expect('FP annotation = +$700.00 FP', '+$700.00 FP', annotation);
}

console.log('');
if (failures.length > 0) {
    console.log(`FAIL: ${failures.length} assertion(s) failed (${passes} passed)`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
}
console.log(`PASS: ${passes} assertions, 0 failures`);
process.exit(0);
