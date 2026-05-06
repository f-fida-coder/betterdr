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

// Compute two evenly-distributed "round" stakes between the player's min and
// max bet, used as defaults for the middle two Quick Stake chips. Step scales
// with span so [25, 2000] → [700, 1350], [10, 100] → [40, 70], etc. The user
// can still override each via Account → Quick Stake Buttons.
export const computeMidQuickStakes = (min, max) => {
  const lo = Number(min);
  const hi = Number(max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [lo, hi];
  const span = hi - lo;
  const roundTo = span >= 1500 ? 50 : span >= 300 ? 25 : span >= 60 ? 5 : 1;
  const round = (n) => Math.round(n / roundTo) * roundTo;
  let m1 = round(lo + span / 3);
  let m2 = round(lo + (2 * span) / 3);
  // Guarantee strictly increasing values inside (lo, hi) so the four chips
  // never collapse to duplicates when min/max are close together.
  if (m1 <= lo) m1 = lo + roundTo;
  if (m2 <= m1) m2 = m1 + roundTo;
  if (m2 >= hi) m2 = hi - roundTo;
  if (m1 >= m2) m1 = Math.max(lo + roundTo, m2 - roundTo);
  return [m1, m2];
};
