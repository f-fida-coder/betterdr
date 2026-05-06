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
