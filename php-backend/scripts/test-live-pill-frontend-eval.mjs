// Companion to test-live-pill-e2e.php.
//
// Reads enriched bet JSON from stdin (the same JSON the /api/bets endpoint
// would serialize), runs the VERBATIM LIVE-pill predicate copied from
// frontend/src/components/MyBetsView.jsx, and reports each row's pill
// decision with the reason. This proves the predicate produces the
// expected result against real stored data — closing the loop from
// "mock fixtures" to "actual DB rows".
//
// Usage:
//   php scripts/test-live-pill-e2e.php | node scripts/test-live-pill-frontend-eval.mjs

// ── Verbatim from MyBetsView.jsx (lines 35, 256-278, 343-352) ───────────────
const normalizeStatus = (value) => String(value || 'pending').trim().toLowerCase();

const TERMINAL_MATCH_STATUSES = new Set(['finished', 'canceled', 'cancelled', 'expired', 'void', 'abandoned', 'closed', 'settled']);

const isLiveSnapshot = (snapshot, parentStatus) => {
  if (!snapshot) return false;
  const status = String(snapshot.status || '').toLowerCase();
  if (status === 'live') return true;
  const eventStatus = String(snapshot?.score?.event_status || '').toUpperCase();
  if (eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE')) return true;
  if (TERMINAL_MATCH_STATUSES.has(status)) return false;
  const startMs = snapshot.startTime ? new Date(snapshot.startTime).getTime() : NaN;
  if (Number.isFinite(startMs) && startMs <= Date.now() && normalizeStatus(parentStatus) === 'pending') {
    return true;
  }
  return false;
};

const wasPlacedInPlay = (parentBet, snapshot) => {
  const placedMs = parentBet?.createdAt ? new Date(parentBet.createdAt).getTime() : NaN;
  const startMs = snapshot?.startTime ? new Date(snapshot.startTime).getTime() : NaN;
  return Number.isFinite(placedMs) && Number.isFinite(startMs) && placedMs > startMs;
};

const isStraightBetLive = (bet) => {
  const firstLeg = Array.isArray(bet?.selections) ? bet.selections[0] : null;
  if (wasPlacedInPlay(bet, bet?.match)) return { live: true, reason: 'placed in-play (vs bet.match.startTime)' };
  if (wasPlacedInPlay(bet, bet?.matchSnapshot)) return { live: true, reason: 'placed in-play (vs bet.matchSnapshot.startTime)' };
  if (wasPlacedInPlay(bet, firstLeg?.matchSnapshot)) return { live: true, reason: 'placed in-play (vs firstLeg.matchSnapshot.startTime)' };
  if (normalizeStatus(bet?.status) !== 'pending') return { live: false, reason: 'bet not pending' };
  const currentMatchStatus = String(bet?.match?.status || '').toLowerCase();
  if (currentMatchStatus && TERMINAL_MATCH_STATUSES.has(currentMatchStatus)) {
    return { live: false, reason: `bet.match.status=${currentMatchStatus} (terminal — stuck-pending, not live)` };
  }
  if (isLiveSnapshot(bet?.match, bet?.status)) return { live: true, reason: 'bet.match shows live (current state)' };
  if (isLiveSnapshot(bet?.matchSnapshot, bet?.status)) return { live: true, reason: 'bet.matchSnapshot shows live (frozen snapshot)' };
  if (isLiveSnapshot(firstLeg?.matchSnapshot, bet?.status)) return { live: true, reason: 'firstLeg.matchSnapshot shows live' };
  return { live: false, reason: 'no source reports live' };
};

// ── Drive ───────────────────────────────────────────────────────────────────
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { buf += chunk; });
process.stdin.on('end', () => {
  let rows;
  try {
    rows = JSON.parse(buf);
  } catch (e) {
    console.error('Invalid JSON from PHP enrichment:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('No pending bets to evaluate.');
    return;
  }
  console.log('NOW =', new Date().toISOString());
  console.log('');
  for (const bet of rows) {
    const decision = isStraightBetLive(bet);
    const sel = bet.selections?.[0]?.selection || '(multi-leg)';
    const created = bet.createdAt || '(no createdAt)';
    const matchStart = bet.matchSnapshot?.startTime || bet.match?.startTime || '(no startTime)';
    const matchStatus = bet.match?.status || bet.matchSnapshot?.status || '(no status)';
    console.log(`Bet ${bet.id}`);
    console.log(`  Selection:        ${sel}`);
    console.log(`  Placed at:        ${created}`);
    console.log(`  Match status now: ${matchStatus}`);
    console.log(`  Game start time:  ${matchStart}`);
    console.log(`  LIVE PILL:        ${decision.live ? 'YES — ' + decision.reason : 'no — ' + decision.reason}`);
    console.log('');
  }
});
