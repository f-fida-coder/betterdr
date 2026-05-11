// Mockup test for the bet status badge resolver. Drives the W / L /
// PUSH / VOID chip shown next to every leg and straight ticket in
// MyBetsView. The reported user bug: WNBA moneylines that auto-voided
// (Sun, Mystics) showed "P" — readable as "Push" — even though
// moneylines can't push. After the fix, push_tie still says "PUSH" but
// match_canceled / generic void say "VOID" with a tooltip explaining
// why.
//
// Run: node frontend/scripts/test-bet-status-badge.mjs
// Exit 0 = pass, 1 = any failure.

// Pure-JS mirror of resolveStatusBadge from MyBetsView.jsx. Mirrored
// instead of imported because the production helper lives in a .jsx
// file that Node can't parse without a JSX loader. The two must stay
// in lockstep — change one, update the other.
const resolveStatusBadge = (input) => {
    const { status, gradeReason } = (input && typeof input === 'object') ? input : {};
    const norm = String(status || '').toLowerCase();
    if (norm === 'won') return { label: 'W', title: 'Won', theme: 'won' };
    if (norm === 'lost') return { label: 'L', title: 'Lost', theme: 'lost' };
    if (norm === 'void') {
        const reason = String(gradeReason || '').toLowerCase();
        if (reason === 'push_tie') {
            return { label: 'PUSH', title: 'Push — exact tie on the line; stake refunded', theme: 'void' };
        }
        if (reason === 'match_canceled') {
            return { label: 'VOID', title: 'Match canceled or no result; stake refunded', theme: 'void' };
        }
        return { label: 'VOID', title: 'No result; stake refunded', theme: 'void' };
    }
    return null;
};

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

console.log('terminal grades — W / L / VOID');
expect('won → W', { label: 'W', title: 'Won', theme: 'won' }, resolveStatusBadge({ status: 'won' }));
expect('lost → L', { label: 'L', title: 'Lost', theme: 'lost' }, resolveStatusBadge({ status: 'lost' }));

console.log('push_tie → PUSH (legit spread/total tie)');
expect(
    'void + push_tie → PUSH chip',
    { label: 'PUSH', title: 'Push — exact tie on the line; stake refunded', theme: 'void' },
    resolveStatusBadge({ status: 'void', gradeReason: 'push_tie' }),
);

console.log('match_canceled → VOID (the reported regression)');
expect(
    'void + match_canceled → VOID with canceled tooltip',
    { label: 'VOID', title: 'Match canceled or no result; stake refunded', theme: 'void' },
    resolveStatusBadge({ status: 'void', gradeReason: 'match_canceled' }),
);
expect(
    'void with no gradeReason → VOID (generic tooltip)',
    { label: 'VOID', title: 'No result; stake refunded', theme: 'void' },
    resolveStatusBadge({ status: 'void', gradeReason: null }),
);
expect(
    'void with empty gradeReason → VOID',
    { label: 'VOID', title: 'No result; stake refunded', theme: 'void' },
    resolveStatusBadge({ status: 'void', gradeReason: '' }),
);
expect(
    'void with unknown gradeReason → VOID (defensive default)',
    { label: 'VOID', title: 'No result; stake refunded', theme: 'void' },
    resolveStatusBadge({ status: 'void', gradeReason: 'someday_new_reason' }),
);

console.log('non-terminal / no input → no badge');
expect('pending → no badge', null, resolveStatusBadge({ status: 'pending' }));
expect('empty status → no badge', null, resolveStatusBadge({ status: '' }));
expect('missing input → no badge', null, resolveStatusBadge());
expect('null input → no badge', null, resolveStatusBadge(null));

console.log('case insensitivity (backend can ship "WON" / "Push_Tie")');
expect(
    'uppercase status normalizes',
    { label: 'W', title: 'Won', theme: 'won' },
    resolveStatusBadge({ status: 'WON' }),
);
expect(
    'mixed-case gradeReason normalizes',
    { label: 'PUSH', title: 'Push — exact tie on the line; stake refunded', theme: 'void' },
    resolveStatusBadge({ status: 'VOID', gradeReason: 'Push_Tie' }),
);

console.log('end-to-end replay of the user-reported scenario');
{
    // "Sun +650 P → Refund $77.00" — a WNBA moneyline that voided
    // because the match was canceled / never reported a result. The
    // settlement service tagged the leg with gradeReason='match_canceled'.
    // After the fix the badge reads "VOID" and the title attribute
    // explains why on hover.
    const badge = resolveStatusBadge({ status: 'void', gradeReason: 'match_canceled' });
    expect('chip label is no longer the misleading "P"', 'VOID', badge.label);
    expect('tooltip explains the void', true, /canceled|no result/i.test(badge.title));
    expect('theme is void so styling matches existing CSS', 'void', badge.theme);
}

console.log('');
if (failures.length > 0) {
    console.log(`FAIL: ${failures.length} assertion(s) failed (${passes} passed)`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
}
console.log(`PASS: ${passes} assertions, 0 failures`);
process.exit(0);
