export const DEFAULT_ODDS_FORMAT = 'decimal';
const ODDS_FORMAT_STORAGE_KEY = 'sportsbook.oddsFormat';

export const normalizeOddsFormat = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'american' ? 'american' : DEFAULT_ODDS_FORMAT;
};

const buildStorageKey = (userId = '') =>
    userId ? `${ODDS_FORMAT_STORAGE_KEY}.${String(userId).trim()}` : ODDS_FORMAT_STORAGE_KEY;

export const readStoredOddsFormat = (userId = '') => {
    if (typeof window === 'undefined') return DEFAULT_ODDS_FORMAT;
    const key = buildStorageKey(userId);
    const stored = window.localStorage.getItem(key);
    if (stored) {
        return normalizeOddsFormat(stored);
    }
    if (userId) {
        return DEFAULT_ODDS_FORMAT;
    }
    return normalizeOddsFormat(window.localStorage.getItem(ODDS_FORMAT_STORAGE_KEY));
};

export const writeStoredOddsFormat = (value, userId = '') => {
    if (typeof window === 'undefined') return;
    const normalized = normalizeOddsFormat(value);
    window.localStorage.setItem(ODDS_FORMAT_STORAGE_KEY, normalized);
    if (userId) {
        window.localStorage.setItem(buildStorageKey(userId), normalized);
    }
};

export const parseOddsNumber = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
};

export const decimalToAmerican = (value) => {
    const decimalOdds = parseOddsNumber(value);
    if (decimalOdds === null || decimalOdds <= 1) {
        return null;
    }
    if (decimalOdds >= 2) {
        return Math.round((decimalOdds - 1) * 100);
    }
    return Math.round(-100 / (decimalOdds - 1));
};

export const americanToDecimal = (value) => {
    const americanOdds = Number(value);
    if (!Number.isFinite(americanOdds) || americanOdds === 0) {
        return null;
    }
    if (americanOdds > 0) {
        return 1 + (americanOdds / 100);
    }
    return 1 + (100 / Math.abs(americanOdds));
};

export const formatOdds = (value, oddsFormat = DEFAULT_ODDS_FORMAT, fallback = '-') => {
    const decimalOdds = parseOddsNumber(value);
    if (decimalOdds === null) {
        return fallback;
    }

    if (normalizeOddsFormat(oddsFormat) === 'american') {
        const americanOdds = decimalToAmerican(decimalOdds);
        if (americanOdds === null) {
            return fallback;
        }
        return americanOdds > 0 ? `+${americanOdds}` : `${americanOdds}`;
    }

    return decimalOdds.toFixed(2);
};

export const formatLineValue = (value, { signed = false, fallback = '-' } = {}) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    const normalized = Object.is(parsed, -0) ? 0 : parsed;
    const rendered = Number(normalized.toFixed(2)).toString();
    const prefix = signed && normalized > 0 ? '+' : '';
    return `${prefix}${rendered}`;
};

export const formatSpreadDisplay = (point, price, oddsFormat) => {
    const priceLabel = formatOdds(price, oddsFormat);
    const pointLabel = formatLineValue(point, { signed: true });
    if (priceLabel === '-' || pointLabel === '-') {
        return '-';
    }
    return `${pointLabel} (${priceLabel})`;
};

export const formatTotalDisplay = (sideLabel, point, price, oddsFormat) => {
    const priceLabel = formatOdds(price, oddsFormat);
    const pointLabel = formatLineValue(point);
    if (priceLabel === '-' || pointLabel === '-') {
        return '-';
    }
    return `${sideLabel} ${pointLabel} (${priceLabel})`;
};

export const getMatchMarkets = (match) =>
    (Array.isArray(match?.odds?.markets) ? match.odds.markets : []);

export const getMatchMarket = (match, key) =>
    getMatchMarkets(match).find((market) => String(market?.key || '').toLowerCase() === String(key || '').toLowerCase()) || null;

export const getMarketOutcomeByName = (market, name) => {
    if (!market || !Array.isArray(market.outcomes)) return null;
    const normalizedName = String(name || '').trim().toLowerCase();
    if (!normalizedName) return null;

    const exact = market.outcomes.find((outcome) => String(outcome?.name || '').trim().toLowerCase() === normalizedName);
    if (exact) {
        return exact;
    }

    return market.outcomes.find((outcome) => String(outcome?.name || '').trim().toLowerCase().includes(normalizedName)) || null;
};

export const getMarketOutcomeByKeyword = (market, keyword) => {
    if (!market || !Array.isArray(market.outcomes)) return null;
    const normalizedKeyword = String(keyword || '').trim().toLowerCase();
    if (!normalizedKeyword) return null;

    return market.outcomes.find((outcome) => String(outcome?.name || '').trim().toLowerCase().includes(normalizedKeyword)) || null;
};
