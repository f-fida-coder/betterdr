// Tests the categorization of a settled-but-mixed Round Robin GROUP status
// ('partial') in My Bets (PO 2026-07-19). A partial group has all children
// terminal (some won, some lost), nothing pending — so it belongs in HISTORY
// (gradedBets), never Pending. Before the fix it was in NEITHER filter list and
// vanished from both tabs once its last child settled (prod group 540f05ce).
//
// Mirrors the two filters in MyBetsView.jsx (gradedBets ~1873, pendingBets
// ~1854). Run: node frontend/scripts/test-rr-partial-visibility.mjs

const GRADED = ['won', 'lost', 'void', 'push', 'partial'];   // MyBetsView gradedBets
const PENDING = ['pending', 'open', 'pending_approval'];      // MyBetsView pendingBets
const normalizeStatus = (v) => String(v || 'pending').trim().toLowerCase();
const isGraded = (bet) => GRADED.includes(normalizeStatus(bet?.status));
const isPending = (bet) => PENDING.includes(normalizeStatus(bet?.status));

let passes = 0;
const failures = [];
function expect(label, expected, actual) {
    const ok = JSON.stringify(expected) === JSON.stringify(actual);
    if (ok) { passes++; console.log(`  ✓ ${label}`); return; }
    failures.push(label);
    console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
}

console.log('partial RR group → history, not pending');
expect('partial IS graded (shows in Weekly Figures)', true, isGraded({ status: 'partial', type: 'round_robin' }));
expect('partial is NOT pending', false, isPending({ status: 'partial', type: 'round_robin' }));
expect('PARTIAL (uppercase) normalizes and still graded', true, isGraded({ status: 'PARTIAL' }));

console.log('\nno regression: existing settled statuses still graded, not pending');
for (const s of ['won', 'lost', 'void', 'push']) {
    expect(`${s} still graded`, true, isGraded({ status: s }));
    expect(`${s} not pending`, false, isPending({ status: s }));
}

console.log('\nno regression: pending statuses stay in pending, out of graded');
for (const s of ['pending', 'open', 'pending_approval']) {
    expect(`${s} is pending`, true, isPending({ status: s }));
    expect(`${s} not graded`, false, isGraded({ status: s }));
}

console.log('\nmutual exclusion: no status lands in both tabs');
for (const s of ['won', 'lost', 'void', 'push', 'partial', 'pending', 'open', 'pending_approval']) {
    expect(`${s} not in both`, false, isGraded({ status: s }) && isPending({ status: s }));
}

console.log(`\n${failures.length === 0 ? 'PASS' : 'FAIL'} — ${passes} passed, ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);
