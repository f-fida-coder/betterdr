/**
 * Period (half/quarter/inning/period) catalog + matchers.
 *
 * Shared by MobileContentView (mobile chip strip) and SportContentView
 * (desktop chip strip). Suffixes match the upstream market key conventions:
 * `h2h_h1`, `spreads_q1`, `totals_1st_5_innings`, `h2h_p2`, etc.
 *
 * Public API:
 *   FULL_PERIOD                                  // { id, label, suffix:'' }
 *   getPeriodsForSport(sportId)                  // sidebar id → preset array
 *   getPeriodsForSportKey(sportKey)              // sportKey → preset array
 *   getPeriodsForSports(realSelected, fallback)  // union across selections
 *   scanMarketsForSuffixes(markets, set)         // populate set with detected suffixes
 *
 * Render rule (kept identical between mobile + desktop): show a chip
 * for every period in the preset whose suffix appears in
 * availableSuffixes — plus FULL_PERIOD, which always renders so the
 * user never loses the Full Game tab.
 */

export const FULL_PERIOD = { id: 'full', label: 'Game', suffix: '' };

export const BASKETBALL_PERIODS = [
    FULL_PERIOD,
    { id: '1h', label: '1H', suffix: '_h1' },
    { id: '2h', label: '2H', suffix: '_h2' },
    { id: '1q', label: '1Q', suffix: '_q1' },
    { id: '2q', label: '2Q', suffix: '_q2' },
    { id: '3q', label: '3Q', suffix: '_q3' },
    { id: '4q', label: '4Q', suffix: '_q4' },
];
export const FOOTBALL_PERIODS = [
    FULL_PERIOD,
    { id: '1h', label: '1H', suffix: '_h1' },
    { id: '2h', label: '2H', suffix: '_h2' },
    { id: '1q', label: '1Q', suffix: '_q1' },
    { id: '2q', label: '2Q', suffix: '_q2' },
    { id: '3q', label: '3Q', suffix: '_q3' },
    { id: '4q', label: '4Q', suffix: '_q4' },
];
export const BASEBALL_PERIODS = [
    FULL_PERIOD,
    { id: 'f1', label: 'F1', suffix: '_1st_1_innings' },
    { id: 'f3', label: 'F3', suffix: '_1st_3_innings' },
    { id: 'f5', label: 'F5', suffix: '_1st_5_innings' },
    { id: 'f7', label: 'F7', suffix: '_1st_7_innings' },
];
export const HOCKEY_PERIODS = [
    FULL_PERIOD,
    { id: 'p1', label: 'P1', suffix: '_p1' },
    { id: 'p2', label: 'P2', suffix: '_p2' },
    { id: 'p3', label: 'P3', suffix: '_p3' },
];
export const SOCCER_PERIODS = [
    FULL_PERIOD,
    { id: '1h', label: '1H', suffix: '_h1' },
    { id: '2h', label: '2H', suffix: '_h2' },
];
export const TENNIS_PERIODS = [
    FULL_PERIOD,
    { id: 'set-1', label: 'Set 1', suffix: '_set_1' },
    { id: 'set-2', label: 'Set 2', suffix: '_set_2' },
    { id: 'set-3', label: 'Set 3', suffix: '_set_3' },
];

const PERIOD_CONFIG = {
    nba: BASKETBALL_PERIODS,
    wnba: BASKETBALL_PERIODS,
    'ncaa-basketball': BASKETBALL_PERIODS,
    nfl: FOOTBALL_PERIODS,
    'ncaa-football': FOOTBALL_PERIODS,
    cfl: FOOTBALL_PERIODS,
    mlb: BASEBALL_PERIODS,
    nhl: HOCKEY_PERIODS,
    soccer: SOCCER_PERIODS,
    tennis: TENNIS_PERIODS,
    atp: TENNIS_PERIODS,
    wta: TENNIS_PERIODS,
};

const PERIOD_CONFIG_BY_SLUG_PREFIX = {
    basketball: BASKETBALL_PERIODS,
    americanfootball: FOOTBALL_PERIODS,
    canadianfootball: FOOTBALL_PERIODS,
    baseball: BASEBALL_PERIODS,
    icehockey: HOCKEY_PERIODS,
    soccer: SOCCER_PERIODS,
    tennis: TENNIS_PERIODS,
};

export const getPeriodsForSport = (sportId) => {
    if (PERIOD_CONFIG[sportId]) return PERIOD_CONFIG[sportId];
    const normalized = String(sportId || '').toLowerCase();
    if (normalized.startsWith('api-')) {
        const category = normalized.slice(4).split('-')[0];
        if (PERIOD_CONFIG_BY_SLUG_PREFIX[category]) return PERIOD_CONFIG_BY_SLUG_PREFIX[category];
    }
    return [FULL_PERIOD];
};

export const getPeriodsForSportKey = (sportKey) => {
    const k = String(sportKey || '').toLowerCase();
    if (!k) return [FULL_PERIOD];
    if (k === 'basketball_nba' || k === 'basketball_wnba' || k === 'basketball_ncaab') return BASKETBALL_PERIODS;
    if (k === 'americanfootball_nfl' || k === 'americanfootball_ncaaf' || k === 'americanfootball_cfl') return FOOTBALL_PERIODS;
    if (k === 'baseball_mlb') return BASEBALL_PERIODS;
    if (k === 'icehockey_nhl') return HOCKEY_PERIODS;
    if (k === 'tennis_atp' || k === 'tennis_wta' || k.startsWith('tennis_')) return TENNIS_PERIODS;
    const prefix = k.split('_')[0];
    if (PERIOD_CONFIG_BY_SLUG_PREFIX[prefix]) return PERIOD_CONFIG_BY_SLUG_PREFIX[prefix];
    return [FULL_PERIOD];
};

// Canonical chip ordering across ALL sports — used when unioning
// presets for a multi-sport selection so e.g. NBA + NHL renders
// Q1..Q4 + P1..P3 in a predictable order.
const CHIP_ORDER = ['full', '1h', '2h', '1q', '2q', '3q', '4q', 'f1', 'f3', 'f5', 'f7', 'p1', 'p2', 'p3', 'set-1', 'set-2', 'set-3'];

export const getPeriodsForSports = (realSelected, fallbackSportId) => {
    if (!Array.isArray(realSelected) || realSelected.length === 0) {
        return getPeriodsForSport(fallbackSportId);
    }
    const seen = new Map();
    seen.set('full', FULL_PERIOD);
    realSelected.forEach((sportId) => {
        getPeriodsForSport(sportId).forEach((p) => {
            if (!seen.has(p.id)) seen.set(p.id, p);
        });
    });
    return [...seen.values()].sort((a, b) => {
        const ai = CHIP_ORDER.indexOf(a.id);
        const bi = CHIP_ORDER.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });
};

const PERIOD_MARKET_RE = /^(?:h2h|spreads|totals)(_[a-z0-9_]+)$/;
export const scanMarketsForSuffixes = (markets, out) => {
    if (!Array.isArray(markets)) return;
    for (const m of markets) {
        const matched = String(m?.key || '').match(PERIOD_MARKET_RE);
        if (matched) out.add(matched[1]);
    }
};

const periodFromSuffix = (suffix) => {
    const raw = String(suffix || '').toLowerCase();
    if (!raw || raw === '') return null;

    const q = raw.match(/^_q(\d+)$/);
    if (q) {
        const n = Number(q[1]);
        return Number.isFinite(n) && n > 0 ? { id: `${n}q`, label: `${n}Q`, suffix: raw } : null;
    }

    const h = raw.match(/^_h(\d+)$/);
    if (h) {
        const n = Number(h[1]);
        return Number.isFinite(n) && n > 0 ? { id: `${n}h`, label: `${n}H`, suffix: raw } : null;
    }

    const p = raw.match(/^_p(\d+)$/);
    if (p) {
        const n = Number(p[1]);
        return Number.isFinite(n) && n > 0 ? { id: `p${n}`, label: `P${n}`, suffix: raw } : null;
    }

    const innings = raw.match(/^_1st_(\d+)_innings$/);
    if (innings) {
        const n = Number(innings[1]);
        return Number.isFinite(n) && n > 0 ? { id: `f${n}`, label: `F${n}`, suffix: raw } : null;
    }

    const set = raw.match(/^_set_(\d+)$/);
    if (set) {
        const n = Number(set[1]);
        return Number.isFinite(n) && n > 0 ? { id: `set-${n}`, label: `Set ${n}`, suffix: raw } : null;
    }

    return {
        id: raw.replace(/^_+/, ''),
        label: raw.replace(/^_+/, '').replace(/_/g, ' ').toUpperCase(),
        suffix: raw,
    };
};

export const buildVisiblePeriods = (preset, availableSuffixes) => {
    const base = Array.isArray(preset) ? preset : [FULL_PERIOD];
    const suffixes = availableSuffixes instanceof Set ? availableSuffixes : new Set(['']);
    const visible = base.filter((p) => p.id === 'full' || suffixes.has(p.suffix));
    const knownSuffixes = new Set(base.filter((p) => p.id !== 'full' && p.suffix).map((p) => p.suffix));
    const extras = [];

    for (const suffix of suffixes) {
        if (!suffix || suffix === '' || knownSuffixes.has(suffix)) continue;
        const p = periodFromSuffix(suffix);
        if (!p) continue;
        if (!visible.some((v) => v.id === p.id || v.suffix === p.suffix)) extras.push(p);
    }

    return visible.concat(extras).sort((a, b) => {
        const ai = CHIP_ORDER.indexOf(a.id);
        const bi = CHIP_ORDER.indexOf(b.id);
        if (ai === -1 && bi === -1) return String(a.label).localeCompare(String(b.label));
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });
};
