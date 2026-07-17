// Round Robin preview math — the single source of truth for the betslip's
// "Parlays / Total Risk / Max Win" readout in RR mode.
//
// This lives in its own zero-dependency module (not inline in ModeBetPanel)
// on purpose: the previous inline `roundRobinCombinationCount` carried a stale
// `k >= selectionCount` bound that silently dropped the "By N's" size (k = N,
// the single full parlay), zeroing the whole preview while the backend still
// booked a real stake. That bug shipped because the helper was untested. It is
// now importable by both Vite (the component) AND Node (tools/qa/round-robin-
// preview.mjs), so the bound is locked by an executable test in CI.
//
// BOUND CONTRACT — k is valid iff `2 <= k <= selectionCount`. This mirrors,
// exactly, the four other sites that must agree or the preview lies about the
// booked bet:
//   - php-backend RoundRobinService::combinationCount ($size > $selectionCount)
//   - php-backend BetsController placement validator ($intSize > $selectionCount)
//   - FE size-button availability (k <= legCount)
//   - FE max-win iteration (k > legCount)
// `.mjs` (not `.js`) so Node imports it as ESM without frontend/package.json
// needing "type":"module"; Vite resolves the extensionless import to it.

// n-choose-k. Returns 0 for out-of-range k (k < 0 or k > n), 1 for the edges
// (k = 0 or k = n). Integer arithmetic with the Math.floor step keeps it exact
// for the N <= 8 range the slip allows. Mirrors RoundRobinService::nCr.
export const nCr = (n, k) => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let result = 1;
    for (let i = 0; i < k; i++) {
        result = Math.floor((result * (n - i)) / (i + 1));
    }
    return result;
};

// Total parlay (child) count for the chosen "By X's" sizes — sum of C(n, k)
// for each in-range k. This IS the number of child parlays the backend books,
// so `count * stakePerParlay` is exactly the total risk it debits. Mirrors
// php-backend RoundRobinService::combinationCount.
export const roundRobinCombinationCount = (selectionCount, sizes) => {
    let total = 0;
    for (const size of (sizes || [])) {
        const k = Number(size);
        // Inclusive upper bound: k === selectionCount is the single full parlay
        // (C(N, N) = 1). Was `k >= selectionCount` — the bug that zeroed By N's.
        if (!Number.isFinite(k) || k < 2 || k > selectionCount) continue;
        total += nCr(selectionCount, k);
    }
    return total;
};

// Sum of every child parlay's max payout (stake × product of that child's leg
// odds), across all chosen sizes. Pure: it takes the already-snapped decimal
// odds per leg and a callback for the same-game (SGP) profit haircut so the
// SGP rules stay in the component (they need the raw selection shape). The
// combinatorial iteration + the k-bound live here, tested.
//
//   legDecimals       — decimal odds per leg (index-aligned), each > 1
//   sizes             — chosen "By X's" set
//   stakePerParlay    — per-child stake
//   haircutForCombo   — (indexes) => fraction in [0,1); profit is shrunk to
//                       1 + (combined - 1) * (1 - fraction). Default: no haircut.
export const roundRobinMaxWin = (legDecimals, sizes, stakePerParlay, haircutForCombo = () => 0) => {
    const n = Array.isArray(legDecimals) ? legDecimals.length : 0;
    const stake = Number(stakePerParlay);
    if (n === 0 || !Number.isFinite(stake) || stake <= 0) return 0;

    let total = 0;
    for (const size of (sizes || [])) {
        const k = Number(size);
        if (!Number.isFinite(k) || k < 2 || k > n) continue;
        const visit = (start, acc) => {
            if (acc.length === k) {
                let combined = 1;
                for (const idx of acc) {
                    const d = Number(legDecimals[idx]);
                    combined *= (Number.isFinite(d) && d > 1) ? d : 1;
                }
                const hc = Number(haircutForCombo(acc)) || 0;
                if (hc > 0 && combined > 1) combined = 1 + (combined - 1) * (1 - hc);
                total += stake * combined;
                return;
            }
            for (let i = start; i < n; i++) {
                acc.push(i);
                visit(i + 1, acc);
                acc.pop();
            }
        };
        visit(0, []);
    }
    return total;
};

// The full RR preview triple the slip renders. One entry point so a test can
// assert count / total risk / max win together and catch any drift between the
// count (what the backend books) and the money the player is shown.
//
//   { parlayCount, totalRisk, maxWin }
// where totalRisk === parlayCount * stakePerParlay === the backend's debit.
export const roundRobinPreview = (legDecimals, sizes, stakePerParlay, haircutForCombo = () => 0) => {
    const n = Array.isArray(legDecimals) ? legDecimals.length : 0;
    const stake = Number.isFinite(Number(stakePerParlay)) && Number(stakePerParlay) > 0 ? Number(stakePerParlay) : 0;
    const parlayCount = roundRobinCombinationCount(n, sizes);
    return {
        parlayCount,
        totalRisk: stake * parlayCount,
        maxWin: roundRobinMaxWin(legDecimals, sizes, stake, haircutForCombo),
    };
};
