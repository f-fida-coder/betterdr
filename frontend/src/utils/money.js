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
  if (Math.abs(num) < 0.5) return 'neutral';
  return num < 0 ? 'neg' : 'pos';
};
