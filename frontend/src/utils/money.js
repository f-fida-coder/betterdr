const normalizeFallback = (fallback) => {
  const num = Number(fallback);
  return Number.isFinite(num) ? num : 0;
};

export const toMoneyNumber = (value, fallback = 0) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : normalizeFallback(fallback);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return normalizeFallback(fallback);

    const negativeByParens = /^\(.*\)$/.test(trimmed);
    const sanitized = trimmed
      .replace(/^\((.*)\)$/, '$1')
      .replace(/[^\d.+-]/g, '');

    if (!sanitized || ['+', '-', '.', '+.', '-.'].includes(sanitized)) {
      return normalizeFallback(fallback);
    }

    const num = Number(sanitized);
    if (!Number.isFinite(num)) {
      return normalizeFallback(fallback);
    }

    return negativeByParens && num > 0 ? -num : num;
  }

  if (value === null || value === undefined || typeof value === 'boolean') {
    return normalizeFallback(fallback);
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : normalizeFallback(fallback);
};

export const getMoneyToneClass = (value) => {
  const num = toMoneyNumber(value, 0);
  if (Math.abs(num) < 0.005) return 'neutral';
  return num < 0 ? 'neg' : 'pos';
};

// Format money preserving decimals as stored in DB. Always shows 2dp.
export const formatMoneyDecimal = (value) => {
  const num = toMoneyNumber(value, 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Whole-dollar To-Win DISPLAY for PENDING/PROJECTED payouts: cents truncated
// toward zero (144.21 and 144.99 both → "144"), never rounded up, so a
// projected payout is never overstated (PO 2026-07-09). Bare number string
// like formatMoneyDecimal — callers add their own '$'/sign. DISPLAY ONLY:
// stored payouts, settlement, ledger and every figure that feeds money
// credited to accounts stay exact; never feed this value back into money math.
// Use for pending/open-parlay projections ONLY — for REALIZED (settled)
// amounts use formatMoneyWholeRounded so display matches the ledger credit.
export const formatMoneyWholeFloored = (value) => {
  return Math.trunc(toMoneyNumber(value, 0)).toLocaleString('en-US');
};

// Whole-dollar DISPLAY for REALIZED (settled won/lost/void) amounts: round
// half-up, MIRRORING how the backend credits payouts at grade today (round(),
// per the PPH whole-dollar policy). This keeps a settled row's headline equal
// to what actually moved in the balance — a floored settled win would read
// $1 under the ledger for payouts with cents ≥ .50 (won 999.86 → floor 999
// vs credited 1000). DISPLAY ONLY; never feeds money math.
// ⚠ FLIP TO Math.trunc (floor) HERE when the backend payout-credit switches
// round()→floor() (approved payout-floor deploy, ~July 20+); the settlement
// record does not expose the actual-credited amount, so display mirrors the
// backend policy by convention, not by reading it.
export const formatMoneyWholeRounded = (value) => {
  return Math.round(toMoneyNumber(value, 0)).toLocaleString('en-US');
};

// Compute three evenly-distributed "round" stakes at the 25%, 50%, and 75%
// positions of the [min, max] range. Used to auto-fill the middle Quick Stake
// chips so an agent only has to set Min/Max once on a player and the chip
// row populates itself. Step (`roundTo`) scales with span so the picked
// values land on natural sportsbook denominations:
//   [25, 2000]  → [500, 1000, 1500]   (roundTo 50)
//   [10, 100]   → [35, 55, 80]        (roundTo 5)
//   [50, 500]   → [150, 275, 400]     (roundTo 25)
// The strictly-increasing fixup at the end guarantees lo < m1 < m2 < m3 < hi
// even when min/max are close enough that the rounding would collapse two
// values into the same number.
export const computeMidQuickStakes = (min, max) => {
  const lo = Number(min);
  const hi = Number(max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [lo, lo, hi];
  const span = hi - lo;
  const roundTo = span >= 1500 ? 50 : span >= 300 ? 25 : span >= 60 ? 5 : 1;
  const round = (n) => Math.round(n / roundTo) * roundTo;
  let m1 = round(lo + span * 0.25);
  let m2 = round(lo + span * 0.50);
  let m3 = round(lo + span * 0.75);
  if (m1 <= lo) m1 = lo + roundTo;
  if (m2 <= m1) m2 = m1 + roundTo;
  if (m3 <= m2) m3 = m2 + roundTo;
  if (m3 >= hi) m3 = hi - roundTo;
  if (m2 >= m3) m2 = Math.max(lo + roundTo, m3 - roundTo);
  if (m1 >= m2) m1 = Math.max(lo + roundTo, m2 - roundTo);
  return [m1, m2, m3];
};
