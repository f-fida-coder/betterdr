import React from 'react';
import useMatches from '../hooks/useMatches';
import useSportOddsRefresh from '../hooks/useSportOddsRefresh';
import { syncLiveMatches, syncPrematchSport, getStoredAuthToken, getMyBets } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { getSportKeywords, findSportItemById, sportLabelForKey, matchesSportKeyword } from '../data/sportsData';
import {
    formatLineValue,
    formatOdds,
    getMatchMarket,
    getMarketOutcomeByKeyword,
    getMarketOutcomeByName,
    parseOddsNumber,
} from '../utils/odds';
import { logoUrlForTeam, fetchTeamBadgeUrl, prewarmTeamBadges } from '../utils/teamLogos';
import { resolveBroadcast } from '../utils/broadcast';
import { isLiveLikeMatch } from '../utils/liveStatus';
import { getSiteTimezone, getSiteTimezoneLabel } from '../utils/timezone';
import { adjustSpread, teaserSportGroup, teaserPointsForSport } from '../utils/teaserAdjustment';
import {
    FULL_PERIOD,
    getPeriodsForSportKey,
    getPeriodsForSports,
    scanMarketsForSuffixes,
    buildVisiblePeriods,
} from '../utils/periods';
import TeaserTypePicker from './TeaserTypePicker';
import PropBuilderModal from './PropBuilderModal';
import MatchDetailView from './MatchDetailView';
import OddsAge from './OddsAge';

// Module-level toast dedup — mirrors SportContentView.
const MOB_SYNC_TOAST_DEDUPE_MS = 30000;
const mobLastSyncToastAt = new Map();
// NOTE: previously a `mobLastSyncCompletedAt` map skipped sync POSTs within
// 60 s of the last success. Removed because live betting cannot serve
// stale odds — every sport-tab click now hits the upstream sync. See
// SportContentView.jsx for the matching desktop change.
const notifyMobSyncFailure = (sportKey, showToast) => {
    if (!sportKey || typeof showToast !== 'function') return;
    const now = Date.now();
    const last = mobLastSyncToastAt.get(sportKey) || 0;
    if (now - last < MOB_SYNC_TOAST_DEDUPE_MS) return;
    mobLastSyncToastAt.set(sportKey, now);
    showToast(`Couldn't fetch latest odds for ${sportKey}`, { type: 'warning' });
};

const WEEKDAYS_LONG = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Categorize a sportKey to a sport-group + Font Awesome icon for the
// Live Now sport-tab strip. The strip uses icons only (per spec); the
// label is kept for accessibility (title/aria-label) since "fa-basketball"
// alone reads badly to a screen reader.
//
// Keys are matched against the sportKey prefix so all NFL/NCAAF
// rows collapse under one "football" tab, all NBA/WNBA/NCAAB under
// "basketball", etc. — matches what players intuit from the icons.
// Emoji icons render as full-color glyphs natively on every modern OS —
// matches the colorful "real sport ball" treatment players expect on a
// pro book rail without bundling a paid icon set. `icon` (FontAwesome)
// stays around as a fallback in case a host font has no emoji support.
const LIVE_SPORT_CATEGORIES = [
    { id: 'football',       prefixes: ['americanfootball'],                      emoji: '🏈', icon: 'fa-solid fa-football',                 label: 'Football' },
    { id: 'basketball',     prefixes: ['basketball'],                            emoji: '🏀', icon: 'fa-solid fa-basketball',               label: 'Basketball' },
    { id: 'baseball',       prefixes: ['baseball'],                              emoji: '⚾', icon: 'fa-solid fa-baseball-bat-ball',        label: 'Baseball' },
    { id: 'hockey',         prefixes: ['icehockey'],                             emoji: '🏒', icon: 'fa-solid fa-hockey-puck',              label: 'Hockey' },
    { id: 'soccer',         prefixes: ['soccer'],                                emoji: '⚽', icon: 'fa-solid fa-futbol',                   label: 'Soccer' },
    { id: 'tennis',         prefixes: ['tennis'],                                emoji: '🎾', icon: 'fa-solid fa-table-tennis-paddle-ball', label: 'Tennis' },
    { id: 'mma',            prefixes: ['mma', 'boxing'],                         emoji: '🥊', icon: 'fa-solid fa-hand-fist',                label: 'MMA' },
    { id: 'golf',           prefixes: ['golf'],                                  emoji: '⛳', icon: 'fa-solid fa-golf-ball-tee',            label: 'Golf' },
    { id: 'cricket',        prefixes: ['cricket'],                               emoji: '🏏', icon: 'fa-solid fa-baseball',                 label: 'Cricket' },
    { id: 'rugby',          prefixes: ['rugbyleague', 'rugbyunion', 'rugby'],    emoji: '🏉', icon: 'fa-solid fa-football',                 label: 'Rugby' },
    { id: 'aussierules',    prefixes: ['aussierules'],                           emoji: '🏉', icon: 'fa-solid fa-football',                 label: 'AFL' },
    { id: 'motorsport',     prefixes: ['motorsport', 'formula'],                 emoji: '🏎️', icon: 'fa-solid fa-flag-checkered',           label: 'Motorsport' },
    { id: 'esports',        prefixes: ['esports', 'csgo', 'lol', 'dota'],        emoji: '🎮', icon: 'fa-solid fa-gamepad',                  label: 'eSports' },
];

// English ordinal suffix for a positive integer ("ST"/"ND"/"RD"/"TH").
// Powers the live-period label (e.g. "9TH INN", "3RD QTR"). Capitalized
// because the surrounding label is uppercase in pro sportsbook style.
// 11/12/13 are special-cased ("TH" not "ST"/"ND"/"RD") per English rules.
const ordinalSuffix = (n) => {
    const v = Math.abs(Math.trunc(n));
    const lastTwo = v % 100;
    if (lastTwo >= 11 && lastTwo <= 13) return 'TH';
    switch (v % 10) {
        case 1: return 'ST';
        case 2: return 'ND';
        case 3: return 'RD';
        default: return 'TH';
    }
};

const categorizeLiveSport = (sportKey) => {
    const key = String(sportKey || '').toLowerCase();
    if (key === '') return null;
    for (const cat of LIVE_SPORT_CATEGORIES) {
        if (cat.prefixes.some((p) => key.startsWith(p))) return cat;
    }
    return null;
};

// Total regulation periods per sport family. Used by the Live Now
// stage-filter to bucketize "where in the game are we" without having
// to know specific rule sets per league.
const TOTAL_REGULATION_PERIODS = {
    baseball: 9,
    icehockey: 3,
    soccer: 2,
    americanfootball: 4,
    basketball: 4,
    rugbyleague: 2,
    rugbyunion: 2,
    aussierules: 4,
};

const totalPeriodsFor = (sportKey) => {
    const key = String(sportKey || '').toLowerCase();
    if (!key) return 4;
    for (const prefix of Object.keys(TOTAL_REGULATION_PERIODS)) {
        if (key.startsWith(prefix)) return TOTAL_REGULATION_PERIODS[prefix];
    }
    return 4;
};

// Classify a live match into early / mid / late thirds based on which
// regulation period it's in. Pre-game (no period yet) → 'early'.
// Anything past regulation → 'late'. Used only when the player
// effectively has one sport+league live, to give them a useful
// pace-of-game filter instead of an empty pill row.
const classifyGameStage = (match) => {
    const period = Number(match?.score?.period || 0);
    if (!period) return 'early';
    const total = totalPeriodsFor(match?.sportKey || match?.sport);
    const ratio = period / total;
    if (ratio <= 0.34) return 'early';
    if (ratio <= 0.67) return 'mid';
    return 'late';
};

const collectPendingRiskMatchIds = (bets) => {
    const out = new Set();
    if (!Array.isArray(bets)) return out;
    for (const bet of bets) {
        if (String(bet?.status || '').toLowerCase() !== 'pending') continue;
        const legs = Array.isArray(bet?.selections) ? bet.selections : [];
        for (const leg of legs) {
            const mid = leg?.matchId || leg?.matchSnapshot?.id || leg?.matchSnapshot?._id;
            if (mid) out.add(String(mid));
        }
        if (bet?.matchId) out.add(String(bet.matchId));
    }
    return out;
};

const NBA_TEAM_COLORS = {
    'atlanta hawks': '#e03a3e',
    'boston celtics': '#007a33',
    'brooklyn nets': '#000000',
    'charlotte hornets': '#1d1160',
    'chicago bulls': '#ce1141',
    'cleveland cavaliers': '#860038',
    'dallas mavericks': '#00538c',
    'denver nuggets': '#0e2240',
    'detroit pistons': '#c8102e',
    'golden state warriors': '#1d428a',
    'houston rockets': '#ce1141',
    'indiana pacers': '#002d62',
    'la clippers': '#c8102e',
    'los angeles clippers': '#c8102e',
    'los angeles lakers': '#552583',
    'memphis grizzlies': '#5d76a9',
    'miami heat': '#98002e',
    'milwaukee bucks': '#00471b',
    'minnesota timberwolves': '#0c2340',
    'new orleans pelicans': '#0c2340',
    'new york knicks': '#006bb6',
    'oklahoma city thunder': '#007ac1',
    'orlando magic': '#0077c0',
    'philadelphia 76ers': '#006bb6',
    'phoenix suns': '#1d1160',
    'portland trail blazers': '#e03a3e',
    'sacramento kings': '#5a2d81',
    'san antonio spurs': '#1e293b',
    'toronto raptors': '#ce1141',
    'utah jazz': '#002b5c',
    'washington wizards': '#002b5c',
};

const DEFAULT_SPORT_AVATAR = '#1e293b';

const colorForTeam = (name = '') => {
    const key = name.trim().toLowerCase();
    return NBA_TEAM_COLORS[key] || DEFAULT_SPORT_AVATAR;
};

const initialsForName = (name = '') => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Day-bucket keys/labels resolve in the site timezone (default ET, but
// each player can override in Account → Preferences). Without this a
// late-night game would land on the wrong day-divider for users in
// non-US zones, splitting a single sports slate across two rows.
const etPartsOf = (date) => {
    if (!date) return null;
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: getSiteTimezone(),
        year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'long',
    }).formatToParts(date);
    const get = (t) => parts.find(p => p.type === t)?.value;
    return {
        y: Number(get('year')),
        m: Number(get('month')),
        d: Number(get('day')),
        weekday: String(get('weekday') || '').toUpperCase(),
    };
};
const dayKeyOf = (d) => {
    const p = etPartsOf(d);
    return p ? `${p.y}-${p.m - 1}-${p.d}` : '';
};
const dayLabelOf = (d) => {
    const p = etPartsOf(d);
    return p ? `${p.weekday}, ${MONTHS_SHORT[p.m - 1]} ${p.d}` : '';
};

// Site-timezone formatter for the broadcast row — matches the
// reference book's "09:30 PM ET" prefix, with the label tracking the
// player's selected timezone.
const formatBroadcastTimeET = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const tz = getSiteTimezone();
    return `${date.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true })} ${getSiteTimezoneLabel(tz)}`;
};

const WEEKDAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
// "Today 4/23 6:10pm" / "Tomorrow 4/24 6:10pm" / "Fri 4/25 6:10pm" /
// "4/28 6:10pm" — keeps every row self-describing so a user scrolling
// past a day divider never has to guess which date they're betting on.
const formatMatchDateTime = (startDate) => {
    if (!startDate || Number.isNaN(startDate.getTime?.())) return '';
    // Pin all date math to the site timezone (player override or ET).
    // Otherwise "Today" would flip on the user's local midnight instead
    // of the operator's sports-schedule midnight, and the day-divider
    // rows would disagree with the per-row timestamp.
    const tz = getSiteTimezone();
    const partsOf = (date) => {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric', month: 'numeric', day: 'numeric',
        }).formatToParts(date);
        const get = (t) => Number(parts.find(p => p.type === t)?.value);
        return { y: get('year'), m: get('month'), d: get('day') };
    };
    const today = partsOf(new Date());
    const sd = partsOf(startDate);
    const todayMidnight = Date.UTC(today.y, today.m - 1, today.d);
    const sdMidnight = Date.UTC(sd.y, sd.m - 1, sd.d);
    const daysDiff = Math.round((sdMidnight - todayMidnight) / 86400000);

    const mdy = `${sd.m}/${sd.d}`;
    // Compact lowercased "6:10pm ET" with the label tracking the
    // player's selected timezone.
    const formatted = startDate.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
    const timeOnly = formatted.toLowerCase().replace(/\s+/g, '');
    const time = `${timeOnly} ${getSiteTimezoneLabel(tz)}`;

    const dayOfWeek = new Date(Date.UTC(sd.y, sd.m - 1, sd.d)).getUTCDay();

    let prefix = '';
    if (daysDiff === 0) prefix = 'Today';
    else if (daysDiff === 1) prefix = 'Tomorrow';
    else if (daysDiff === -1) prefix = 'Yesterday';
    else if (daysDiff > 1 && daysDiff < 7) prefix = WEEKDAYS_SHORT[dayOfWeek].charAt(0)
        + WEEKDAYS_SHORT[dayOfWeek].slice(1).toLowerCase();
    return prefix ? `${prefix} ${mdy} ${time}` : `${mdy} ${time}`;
};

const STALE_MS = 5 * 60 * 1000;
const TICK_MS = 30 * 1000;

const FULL_PERIOD = { id: 'full', label: 'Game', suffix: '' };

// Periods available per sport. Suffixes match the upstream market key conventions
// (e.g. `h2h_h1`, `spreads_q1`, `totals_1st_5_innings`). Entries whose
// suffix doesn't appear in returned markets are filtered out before render.
const BASKETBALL_PERIODS = [
    FULL_PERIOD,
    { id: '1h', label: '1H', suffix: '_h1' },
    { id: '2h', label: '2H', suffix: '_h2' },
    { id: '1q', label: '1Q', suffix: '_q1' },
    { id: '2q', label: '2Q', suffix: '_q2' },
    { id: '3q', label: '3Q', suffix: '_q3' },
    { id: '4q', label: '4Q', suffix: '_q4' },
];
const FOOTBALL_PERIODS = [
    FULL_PERIOD,
    { id: '1h', label: '1H', suffix: '_h1' },
    { id: '2h', label: '2H', suffix: '_h2' },
    { id: '1q', label: '1Q', suffix: '_q1' },
    { id: '2q', label: '2Q', suffix: '_q2' },
    { id: '3q', label: '3Q', suffix: '_q3' },
    { id: '4q', label: '4Q', suffix: '_q4' },
];
const BASEBALL_PERIODS = [
    FULL_PERIOD,
    { id: 'f1', label: 'F1', suffix: '_1st_1_innings' },
    { id: 'f3', label: 'F3', suffix: '_1st_3_innings' },
    { id: 'f5', label: 'F5', suffix: '_1st_5_innings' },
    { id: 'f7', label: 'F7', suffix: '_1st_7_innings' },
];
const HOCKEY_PERIODS = [
    FULL_PERIOD,
    { id: 'p1', label: 'P1', suffix: '_p1' },
    { id: 'p2', label: 'P2', suffix: '_p2' },
    { id: 'p3', label: 'P3', suffix: '_p3' },
];
const SOCCER_PERIODS = [
    FULL_PERIOD,
    { id: '1h', label: '1H', suffix: '_h1' },
];

const PERIOD_CONFIG = {
    nba: BASKETBALL_PERIODS,
    'ncaa-basketball': BASKETBALL_PERIODS,
    nfl: FOOTBALL_PERIODS,
    'ncaa-football': FOOTBALL_PERIODS,
    mlb: BASEBALL_PERIODS,
    nhl: HOCKEY_PERIODS,
    soccer: SOCCER_PERIODS,
};

// Map sport slugs (from dynamic `api-*` sidebar items) to the
// period preset. Without this, selecting "BASEBALL KBO" etc. from the
// auto-injected sidebar entries would only show the "Game" tab even
// when F1/F5 markets exist in the data.
const PERIOD_CONFIG_BY_SLUG_PREFIX = {
    basketball: BASKETBALL_PERIODS,
    americanfootball: FOOTBALL_PERIODS,
    baseball: BASEBALL_PERIODS,
    icehockey: HOCKEY_PERIODS,
    soccer: SOCCER_PERIODS,
};

const getPeriodsForSport = (sportId) => {
    if (PERIOD_CONFIG[sportId]) return PERIOD_CONFIG[sportId];
    const normalized = String(sportId || '').toLowerCase();
    if (normalized.startsWith('api-')) {
        const category = normalized.slice(4).split('-')[0];
        if (PERIOD_CONFIG_BY_SLUG_PREFIX[category]) return PERIOD_CONFIG_BY_SLUG_PREFIX[category];
    }
    return [FULL_PERIOD];
};

// Canonical chip order across ALL sports. Used by getPeriodsForSports
// (multi-sport mode) so the chip strip looks the same no matter what
// order the user happened to tick the leagues — "NBA + NHL" gives the
// same chip layout as "NHL + NBA". Keep this list in sync whenever a
// new period entry is added to one of the *_PERIODS arrays above.
const PERIOD_CANONICAL_ORDER = [
    'full',
    '1h', '2h',
    '1q', '2q', '3q', '4q',
    'p1', 'p2', 'p3',
    'f1', 'f3', 'f5', 'f7',
];

// Period preset keyed by a match's `sportKey` (e.g. `basketball_nba`,
// `baseball_mlb`). The single-sport path above keys off sidebar item
// ids (`nba`, `mlb`, `api-baseball-kbo`); the per-section multi-sport
// chip strips work off the raw match.sportKey instead, so they need
// their own resolver. Same conventions as the api-* path: exact
// match on common headline leagues, prefix match (`basketball_*`,
// `baseball_*`, etc.) for everything else, [FULL_PERIOD] otherwise.
const getPeriodsForSportKey = (sportKey) => {
    const k = String(sportKey || '').toLowerCase();
    if (!k) return [FULL_PERIOD];
    if (k === 'basketball_nba' || k === 'basketball_ncaab') return BASKETBALL_PERIODS;
    if (k === 'americanfootball_nfl' || k === 'americanfootball_ncaaf') return FOOTBALL_PERIODS;
    if (k === 'baseball_mlb') return BASEBALL_PERIODS;
    if (k === 'icehockey_nhl') return HOCKEY_PERIODS;
    const prefix = k.split('_')[0];
    if (PERIOD_CONFIG_BY_SLUG_PREFIX[prefix]) return PERIOD_CONFIG_BY_SLUG_PREFIX[prefix];
    return [FULL_PERIOD];
};

// Scan an odds.markets / odds.extendedMarkets array, adding every
// period suffix encountered (e.g. `_q1`, `_h1`, `_1st_5_innings`) to
// `out`. Module-level so the global and per-sport availableSuffixes
// useMemos share the same parsing rules — drift between them would
// quietly desync chip visibility from market availability.
const PERIOD_MARKET_RE = /^(?:h2h|spreads|totals)(_[a-z0-9_]+)$/;
const scanMarketsForSuffixes = (markets, out) => {
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

const buildVisiblePeriods = (preset, availableSuffixes) => {
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
        const ia = PERIOD_CANONICAL_ORDER.indexOf(a.id);
        const ib = PERIOD_CANONICAL_ORDER.indexOf(b.id);
        if (ia === -1 && ib === -1) return String(a.label).localeCompare(String(b.label));
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
};

// Union the per-sport period presets across every selected league.
// Before: the period chip strip read only `selectedSports[0]`, so
// picking NBA + NHL with NHL first would silently drop Q1–Q4 (NHL
// has no quarters); picking NBA + Tennis would hide the whole strip
// (tennis preset is `[FULL_PERIOD]`, so `periods.length === 1`).
// Now we union across all selections so any chip relevant to ANY
// selected sport is present — the downstream availableSuffixes
// filter still hides chips whose markets aren't actually in the
// data, so spurious "Q1" chips never appear when no game has Q1
// lines. Falls back to the single-sport preset path when nothing
// real is selected (Live Now / Up Next virtual buckets).
const getPeriodsForSports = (realSelected, fallbackSportId) => {
    if (!Array.isArray(realSelected) || realSelected.length === 0) {
        return getPeriodsForSport(fallbackSportId);
    }
    const seen = new Map(); // id → period entry, dedup'd
    seen.set('full', FULL_PERIOD);
    realSelected.forEach((sportId) => {
        getPeriodsForSport(sportId).forEach((p) => {
            if (!seen.has(p.id)) seen.set(p.id, p);
        });
    });
    return [...seen.values()].sort((a, b) => {
        // Unknown ids (a future period type someone forgot to add to
        // PERIOD_CANONICAL_ORDER) sort to the end rather than the front
        // so the strip degrades gracefully.
        const ia = PERIOD_CANONICAL_ORDER.indexOf(a.id);
        const ib = PERIOD_CANONICAL_ORDER.indexOf(b.id);
        return (ia === -1 ? Number.POSITIVE_INFINITY : ia)
             - (ib === -1 ? Number.POSITIVE_INFINITY : ib);
    });
};

// Thresholds for when a period tab is "genuinely over" for a live match.
// Closes when the match's current period number exceeds the threshold.
// Quarters: 1q closed at period > 1, ..., 4q closed at period > 4 (game).
// Halves (basketball / football, NOT soccer — see SOCCER_HALF_THRESHOLDS):
// 1h closed at halftime (period > 2 in a 4-quarter sport), 2h at game-end.
// Hockey periods (p1-p3). Baseball innings buckets (f1/f3/f5/f7) close
// when the current inning exceeds the bucket's last inning.
const PERIOD_CLOSE_THRESHOLDS = {
    '1q': 1, '2q': 2, '3q': 3, '4q': 4,
    '1h': 2, '2h': 4,
    p1: 1, p2: 2, p3: 3,
    f1: 1, f3: 3, f5: 5, f7: 7,
};
const SOCCER_HALF_THRESHOLDS = { '1h': 1, '2h': 2 };

// isLiveLikeMatch (+ the terminal-status set) now live in utils/liveStatus so
// every surface gates LIVE on a real in-play signal, not just the feed flag.

const isPeriodClosedForMatch = (periodId, match) => {
    if (!periodId || periodId === 'full') return false;
    const isLive = isLiveLikeMatch(match);
    if (!isLive) return false;
    const periodNum = Number(match?.score?.period || 0);
    if (!Number.isFinite(periodNum) || periodNum <= 0) return false;
    const sportKey = String(match?.sportKey || '').toLowerCase();
    const table = sportKey.startsWith('soccer') ? SOCCER_HALF_THRESHOLDS : PERIOD_CLOSE_THRESHOLDS;
    const threshold = table[periodId];
    if (threshold === undefined) return false;
    return periodNum > threshold;
};

const normalizeMode = (mode) => String(mode || 'straight').toLowerCase().replace(/-/g, '_');

const getVisibleMarketsForMode = (mode) => {
    const normalizedMode = normalizeMode(mode);
    return {
        showSpread: true,
        showMoneyline: normalizedMode !== 'teaser',
        showTotals: true,
    };
};

const BET_MODE_LABELS = {
    straight: 'Straight',
    parlay: 'Parlay',
    teaser: 'Teaser',
    if_bet: 'If Bet',
    reverse: 'Reverse',
    round_robin: 'Round Robin',
};

const selectionKey = (matchId, marketType, selection) => `${matchId}|${marketType}|${selection}`;

// Rotation number ranges by sport — mirrors standard sportsbook ranges so the
// numbering feels native rather than invented. Each event gets a deterministic
// even/odd pair (away=even, home=even+1... actually home=odd below away). Keyed
// off the match id + sport so numbers stay stable across renders.
const ROTATION_BASE_BY_SPORT = {
    basketball_nba: 501,
    basketball_ncaab: 551,
    basketball_wncaab: 571,
    americanfootball_nfl: 251,
    americanfootball_ncaaf: 301,
    baseball_mlb: 901,
    icehockey_nhl: 601,
    soccer_epl: 7101,
    soccer_usa_mls: 7201,
    tennis_atp: 8001,
    tennis_wta: 8101,
};
const rotationForMatch = (match, index) => {
    const sportKey = String(match?.sportKey || match?.sport || '').toLowerCase();
    const base = ROTATION_BASE_BY_SPORT[sportKey] ?? 101;
    // 2 numbers per matchup (away / home). Index is the ordered position of
    // the match within the current list, so numbering matches list order.
    const away = base + index * 2;
    return { away, home: away + 1 };
};

const FAVORITES_STORAGE_KEY = 'betterdr:favoriteMatches:v1';
const readFavoriteIds = () => {
    try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
        return new Set();
    }
};
const writeFavoriteIds = (set) => {
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch { /* quota / privacy — ignore */ }
};

const MobileContentView = ({
    selectedSports = [],
    activeBetMode = 'straight',
    slipSelections = [],
    teaserTypeId = null,
    teaserRule = null,
    onTeaserTypeChange,
}) => {
    const { oddsFormat } = useOddsFormat();
    const normalizedBetMode = normalizeMode(activeBetMode);
    const activeModeLabel = BET_MODE_LABELS[normalizedBetMode] || BET_MODE_LABELS.straight;

    const primarySport = selectedSports?.[0] ?? null;
    // Real-league selections (excludes virtual buckets). Drives the
    // multi-sport keyword filter and intended-sync set: any league the
    // user checked contributes its keywords / sport keys here so the
    // mobile content view renders the union of all checked leagues.
    const realSelected = React.useMemo(
        () => (selectedSports || []).filter((id) => id && id !== 'commercial-live' && id !== 'up-next'),
        [selectedSports],
    );

    // LIVE NOW: strict `'live'` status — freshness-gated server-side.
    // The previous `'live-upcoming'` envelope was leaking
    // scheduled games into the LIVE NOW list (e.g. "Tomorrow 4/28 12am"
    // appearing under Live Now), which is wrong: the user tapped LIVE
    // NOW expecting in-play action only.
    // UP NEXT keeps `'upcoming'`; default uses the wider envelope.
    const statusFilter = primarySport === 'up-next'
        ? 'upcoming'
        : primarySport === 'commercial-live'
            ? 'live'
            : 'live-upcoming';
    const scopeKey = selectedSports.join('|');
    const rawMatches = useMatches({ status: statusFilter, scopeKey });

    // Resolve every checked league to its sport key(s) so the
    // freshness sync fires for ALL selections, not just the first one.
    // Static-tree items use their declared sportKeys; auto-injected
    // `api-<slug>` ids decode the key from the slug.
    const intendedSportKeys = React.useMemo(() => {
        const keys = new Set();
        realSelected.forEach((id) => {
            const item = findSportItemById(id);
            if (item && Array.isArray(item.sportKeys)) {
                item.sportKeys.forEach((k) => keys.add(String(k).toLowerCase()));
                return;
            }
            if (typeof id === 'string' && id.startsWith('api-')) {
                keys.add(id.slice(4).replace(/-/g, '_').toLowerCase());
            }
        });
        return [...keys];
    }, [realSelected]);
    const rawMatchesRef = React.useRef(rawMatches);
    React.useEffect(() => { rawMatchesRef.current = rawMatches; }, [rawMatches]);

    const sportName = React.useMemo(() => {
        if (realSelected.length === 0) {
            return primarySport === 'up-next' ? 'Up Next'
                : primarySport === 'commercial-live' ? 'Live Now'
                    : 'Sports';
        }
        if (realSelected.length === 1) {
            const item = findSportItemById(realSelected[0]);
            return item ? item.label : realSelected[0].replace(/-/g, ' ').toUpperCase();
        }
        return `${realSelected.length} sports selected`;
    }, [realSelected, primarySport]);

    // Derive the set of period market-suffixes actually present in the fetched
    // matches (e.g. '_h1' if any match carries `h2h_h1`/`spreads_h1`/`totals_h1`).
    // Full-game ('') is always present. Used to detect "this period has zero
    // playable lines right now" so we can show a stable empty-state banner
    // instead of the tab silently disappearing on every extended-sync hiccup.
    const availableSuffixes = React.useMemo(() => {
        const set = new Set(['']);
        (rawMatches || []).forEach(match => {
            scanMarketsForSuffixes(match?.odds?.markets, set);
            scanMarketsForSuffixes(match?.odds?.extendedMarkets, set);
            scanMarketsForSuffixes(match?.extendedMarkets, set);
        });
        return set;
    }, [rawMatches]);

    // Per-sport metadata for the multi-sport view's inline chip strips.
    // The map is keyed by raw match.sportKey so each league section can
    // render only its own period chips, filtered by the markets that
    // actually appear in THAT league's matches (not the unioned set
    // across the whole view).
    //
    // CRITICAL: must filter rawMatches by the user's sport selection
    // BEFORE bucketing. Otherwise, when the user is viewing only NBA,
    // the backend's /api/matches response (which contains NBA + MLB +
    // NHL + EPL etc.) makes perSportMeta.size > 1 → isMultiSportView
    // is wrongly true → the top-level chip strip is suppressed AND
    // per-league strips don't render either (single league = no
    // league header). The user ends up with no chip strip at all on
    // a single-sport filter.
    const perSportMeta = React.useMemo(() => {
        const map = new Map();
        const isVirtualBucket = primarySport === 'commercial-live' || primarySport === 'up-next';
        const keywords = isVirtualBucket || realSelected.length === 0
            ? null
            : [...new Set(realSelected.flatMap((id) => getSportKeywords(id)).map((k) => String(k).toLowerCase()))];
        (rawMatches || []).forEach((match) => {
            const sportKey = String(match?.sportKey || '').toLowerCase();
            if (!sportKey) return;
            // Apply the SAME token-boundary sport filter the matches
            // useMemo applies. Without this, perSportMeta sees every
            // league the API returned, not just the user's selection.
            if (keywords) {
                const sport = String(match?.sport || '').toLowerCase();
                const haystack = `${sport}|${sportKey}`;
                if (!keywords.some((k) => matchesSportKeyword(haystack, k))) return;
            }
            if (!map.has(sportKey)) {
                map.set(sportKey, {
                    matches: [],
                    availableSuffixes: new Set(['']),
                });
            }
            const bucket = map.get(sportKey);
            bucket.matches.push(match);
            scanMarketsForSuffixes(match?.odds?.markets, bucket.availableSuffixes);
            scanMarketsForSuffixes(match?.odds?.extendedMarkets, bucket.availableSuffixes);
            scanMarketsForSuffixes(match?.extendedMarkets, bucket.availableSuffixes);
        });
        // Resolve each bucket's filtered period preset once so the
        // renderer doesn't recompute on every chip click.
        map.forEach((bucket, sportKey) => {
            const preset = getPeriodsForSportKey(sportKey);
            bucket.periods = buildVisiblePeriods(preset, bucket.availableSuffixes);
        });
        return map;
    }, [rawMatches, realSelected, primarySport]);

    // Multi-sport when 2+ distinct sportKeys have matches on screen.
    // Single-sport (or empty) takes the legacy top-of-view chip-strip
    // path so single-league behavior stays byte-identical to before.
    const isMultiSportView = perSportMeta.size > 1;

    // Per sport, show only periods whose markets actually exist in the
    // current sync cycle (FULL_PERIOD always renders so the user always
    // has a Full Game tab). The 60s grace window in useMatches keeps
    // rawMatches stable across sync hiccups, so tabs don't flicker when
    // an extended-sync call misses a cycle — they only disappear when
    // upstream truly stopped returning that period's market.
    //
    // Multi-sport: use the UNION of period presets across every checked
    // league so picking NBA + NHL shows quarters (NBA) AND periods (NHL),
    // not just whichever was clicked first. Without the union the chip
    // strip would silently drop Q1–Q4 if the first selected sport was
    // hockey/baseball/soccer, or vanish entirely if the first selected
    // sport had no preset at all (e.g. tennis). availableSuffixes still
    // hides chips whose markets aren't actually in the returned data, so
    // a NBA + Tennis selection won't render a spurious "P1" chip — only
    // periods whose suffix really shows up in `rawMatches` survive.
    const periods = React.useMemo(() => {
        const preset = getPeriodsForSports(realSelected, primarySport);
        return buildVisiblePeriods(preset, availableSuffixes);
    }, [realSelected, primarySport, availableSuffixes]);

    const [selectedPeriodId, setSelectedPeriodId] = React.useState('full');

    // Per-sport selected period (multi-sport mode only). Keyed by raw
    // match.sportKey so NBA staying on 'full' while MLB sits on 'f5'
    // is just two entries in this map. Missing key → 'full'. Stale
    // entries (sport no longer selected) are harmless — they just sit
    // unread.
    const [periodBySport, setPeriodBySport] = React.useState({});
    const resolveActivePeriodForSportKey = React.useCallback((sportKey) => {
        const meta = perSportMeta.get(String(sportKey || '').toLowerCase());
        if (!meta) return FULL_PERIOD;
        const requested = periodBySport[String(sportKey || '').toLowerCase()] || 'full';
        const p = meta.periods.find((pp) => pp.id === requested);
        return p || FULL_PERIOD;
    }, [perSportMeta, periodBySport]);
    const suffixForMatch = React.useCallback((match) => {
        // Single-sport mode keeps using the global selectedPeriodId path
        // below; this helper is only consulted in multi-sport view so
        // single-league behavior is unchanged.
        if (!isMultiSportView) return null;
        return resolveActivePeriodForSportKey(match?.sportKey).suffix;
    }, [isMultiSportView, resolveActivePeriodForSportKey]);

    // Live Now sport-tab strip: 'all' shows every live sport; otherwise
    // a category id (football/basketball/baseball/etc.) filters the list.
    // Reset to 'all' whenever the user leaves the Live Now bucket so
    // re-entering doesn't surprise them with a stale filter.
    const [liveSportTab, setLiveSportTab] = React.useState('all');
    // League sub-filter: 'all' or a specific sportKey (e.g. 'baseball_mlb',
    // 'basketball_nba'). Layered under the sport pill — picking
    // Basketball + WNBA narrows the feed twice. Independent state keeps
    // it stable when the player just toggles the sport filter.
    const [liveLeagueTab, setLiveLeagueTab] = React.useState('all');
    // Game-stage sub-filter for one-league situations: 'all' | 'early' |
    // 'mid' | 'late'. Adds real filtering value when sport+league strips
    // are both reduced to one option (e.g. the user has only MLB live).
    const [liveStageTab, setLiveStageTab] = React.useState('all');
    const [pendingRiskMatchIds, setPendingRiskMatchIds] = React.useState(() => new Set());

    // Pending tickets → match ids so Live Now can offer a "My action"
    // strip (DK/FD-style) listing games the player still has risk on.
    React.useEffect(() => {
        if (primarySport !== 'commercial-live') {
            setPendingRiskMatchIds(new Set());
            return undefined;
        }
        const token = getStoredAuthToken();
        if (!token) {
            setPendingRiskMatchIds(new Set());
            return undefined;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const data = await getMyBets(token);
                const bets = Array.isArray(data) ? data : [];
                if (!cancelled) setPendingRiskMatchIds(collectPendingRiskMatchIds(bets));
            } catch {
                if (!cancelled) setPendingRiskMatchIds(new Set());
            }
        };
        void load();
        const id = window.setInterval(() => { void load(); }, 60000);
        const onVis = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') void load();
        };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            cancelled = true;
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [primarySport]);

    // Reset to Full Game whenever the sport changes.
    React.useEffect(() => {
        setSelectedPeriodId('full');
    }, [primarySport]);

    React.useEffect(() => {
        if (primarySport !== 'commercial-live') {
            setLiveSportTab('all');
            setLiveLeagueTab('all');
            setLiveStageTab('all');
        }
    }, [primarySport]);

    // Reset league sub-filter whenever the parent sport filter changes —
    // different sports expose different leagues so an old selection no
    // longer makes sense.
    React.useEffect(() => {
        setLiveLeagueTab('all');
    }, [liveSportTab]);

    // If the currently-selected period is no longer available (e.g. data just
    // reloaded without period markets), fall back to Full Game.
    React.useEffect(() => {
        if (!periods.some(p => p.id === selectedPeriodId)) {
            setSelectedPeriodId('full');
        }
    }, [periods, selectedPeriodId]);

    const activePeriod = periods.find(p => p.id === selectedPeriodId) || FULL_PERIOD;

    // True when the current sync cycle returned at least one match with
    // markets for the active period suffix. Used to render an inline
    // banner when the user lands on (or selects) a period that's
    // momentarily empty — the tab strip stays put either way.
    const activePeriodHasLines = activePeriod.id === 'full'
        || availableSuffixes.has(activePeriod.suffix);

    // Set of period ids whose clock has passed for every visible match.
    // Used to render those tabs in a dimmed "closed" style and to swap
    // the empty-period banner from a "still syncing" hint to an
    // honest "this period is over" message. The tabs are NOT removed
    // (Phase 1 promise: stable tab strip) — only their visual treatment
    // changes when the period is genuinely closed everywhere.
    const closedPeriodIds = React.useMemo(() => {
        const closed = new Set();
        const matches = Array.isArray(rawMatches) ? rawMatches : [];
        if (matches.length === 0) return closed;
        periods.forEach((p) => {
            if (p.id === 'full') return;
            // A period is "closed for all" only if at least one match is
            // live AND every live match has passed it AND no pre-game
            // match remains (pre-game keeps the period actionable).
            let anyLiveMatched = false;
            let anyOpen = false;
            for (const m of matches) {
                const isLive = isLiveLikeMatch(m);
                if (!isLive) {
                    anyOpen = true;
                    break;
                }
                anyLiveMatched = true;
                if (!isPeriodClosedForMatch(p.id, m)) {
                    anyOpen = true;
                    break;
                }
            }
            if (anyLiveMatched && !anyOpen) closed.add(p.id);
        });
        return closed;
    }, [periods, rawMatches]);

    const extractOdds = React.useCallback((match, homeName, awayName, suffix) => {
        const h2h = getMatchMarket(match, `h2h${suffix}`);
        const spreads = getMatchMarket(match, `spreads${suffix}`);
        const totals = getMatchMarket(match, `totals${suffix}`);

        return {
            spreadHomePoint: getMarketOutcomeByName(spreads, homeName)?.point ?? null,
            spreadAwayPoint: getMarketOutcomeByName(spreads, awayName)?.point ?? null,
            spreadHomePrice: parseOddsNumber(getMarketOutcomeByName(spreads, homeName)?.price),
            spreadAwayPrice: parseOddsNumber(getMarketOutcomeByName(spreads, awayName)?.price),
            moneylineHome: parseOddsNumber(getMarketOutcomeByName(h2h, homeName)?.price),
            moneylineAway: parseOddsNumber(getMarketOutcomeByName(h2h, awayName)?.price),
            totalPoint: getMarketOutcomeByKeyword(totals, 'over')?.point ?? getMarketOutcomeByKeyword(totals, 'under')?.point ?? null,
            totalOverPrice: parseOddsNumber(getMarketOutcomeByKeyword(totals, 'over')?.price),
            totalUnderPrice: parseOddsNumber(getMarketOutcomeByKeyword(totals, 'under')?.price),
        };
    }, []);

    const matches = React.useMemo(() => {
        // commercial-live / up-next are virtual buckets (status-based, not
        // sport-based) — skip the sport-keyword filter for them or every
        // real match gets dropped.
        const isVirtualBucket = primarySport === 'commercial-live' || primarySport === 'up-next';
        // Multi-select on mobile: union of every checked league's keywords
        // so a match qualifies if it matches ANY selection. With zero real
        // sports selected the filter is null (all matches pass).
        const sportKeywords = isVirtualBucket || realSelected.length === 0
            ? null
            : [...new Set(realSelected.flatMap((id) => getSportKeywords(id)).map((k) => String(k).toLowerCase()))];
        // Filter raw matches BEFORE the expensive map (extractOdds / date
        // formatting). Drops:
        //   1. Non-bettable matches — book pulled lines, game past start
        //      with no live markets, etc. Pro books (DK/FanDuel/MGM) hide
        //      these rather than showing empty rows with a red banner.
        //   2. Matches outside the selected sport.
        // Teaser is football/basketball only — every other sport drops
        // out of the board entirely when the user is on the Teaser tab.
        // Without this, a player who had MLB checked in the sidebar
        // saw MLB cards under the Teaser tab, tapped one, and got an
        // unhelpful error from the slip; now the board only shows
        // games the product actually supports.
        const isTeaserMode = normalizedBetMode === 'teaser';
        const filteredRaw = (rawMatches || []).filter((match) => {
            // Match must have at least one usable market to render. A row
            // with no markets has nothing for the player to bet on, so we
            // drop it from cards AND from the sport/league/period tab
            // counters — otherwise the strip advertises a sport that
            // would resolve to a card full of dashes. The 60s grace
            // window in useMatches keeps rawMatches stable across worker
            // hiccups, so true "no markets" now means upstream really
            // pulled the lines, not a transient sync gap.
            const markets = match?.odds?.markets;
            const ext = Array.isArray(match?.odds?.extendedMarkets) ? match.odds.extendedMarkets : match?.extendedMarkets;
            const books = match?.odds?.bookmakers;
            const bookHasMarkets = Array.isArray(books) && books.some((b) => Array.isArray(b?.markets) && b.markets.length > 0);
            const hasMarkets = (Array.isArray(markets) && markets.length > 0)
                || (Array.isArray(ext) && ext.length > 0)
                || bookHasMarkets;
            if (!hasMarkets) return false;
            if (isTeaserMode) {
                // teaserSportGroup returns 'football' / 'basketball' /
                // null. Null = not eligible for a teaser, drop the row.
                const group = teaserSportGroup(match?.sportKey || match?.sport);
                if (!group) return false;
                // Teasers price off pregame spreads — real books reject
                // live legs. Drop in-play cards on normal boards so users
                // don't tap a dead-end. LIVE NOW (`commercial-live`) is the
                // exception: hiding every live row while Teaser is selected
                // made "Live" look broken (sidebar counts / other surfaces
                // still showed action). Cards still show; App.jsx refuses
                // live adds to teasers with a clear toast.
                if (primarySport !== 'commercial-live') {
                    if (isLiveLikeMatch(match)) return false;
                }
            }
            if (sportKeywords) {
                const sport = String(match?.sport || '').toLowerCase();
                const sportKey = String(match?.sportKey || '').toLowerCase();
                const haystack = `${sport}|${sportKey}`;
                // Token-boundary match (see sportsData.matchesSportKeyword)
                // so the 'nba' keyword doesn't leak WNBA rows into the
                // NBA filter via raw substring match.
                if (!haystack.trim() || !sportKeywords.some((k) => matchesSportKeyword(haystack, k))) return false;
            }
            return true;
        });

        const formatted = filteredRaw.map(match => {
            const homeName = match.homeTeam || match.home_team || '';
            const awayName = match.awayTeam || match.away_team || '';
            const eventStatus = (match.score?.event_status || '').toString().toUpperCase();
            const isLive = isLiveLikeMatch(match);
            const startDate = match.startTime ? new Date(match.startTime) : null;
            // Build a sportsbook-style label ("9TH INN", "3RD QTR 12:34",
            // "2ND PRD 8:42", "1ST H") from the score fields populated by
            // the live odds writers (clock + period for in-progress games).
            // Format mirrors the reference book bettorjuice365 — ordinal
            // period + sport suffix, with the time clock appended for
            // sports that have one. Baseball deliberately omits the
            // clock since MLB's game clock is always 0:00; the half-
            // inning indicator (Top/Bot/Mid/End) goes after the suffix
            // for the few seconds it's relevant.
            const periodNum = Number(match.score?.period || 0);
            const clockText = String(match.score?.clock || '').trim();
            const sportKeyLower = String(match.sportKey || '').toLowerCase();
            const periodSuffix = sportKeyLower.startsWith('icehockey') ? 'PRD'
                : sportKeyLower.startsWith('soccer') ? 'H'
                    : sportKeyLower.startsWith('baseball') ? 'INN'
                        : 'QTR';
            const isBaseball = sportKeyLower.startsWith('baseball');
            let liveStatusLabel = '';
            if (isLive) {
                if (periodNum > 0) {
                    const ord = ordinalSuffix(periodNum);
                    const periodPart = `${periodNum}${ord} ${periodSuffix}`;
                    if (isBaseball) {
                        // Baseball: append half-inning ("Top"/"Bot"/etc)
                        // only when ESPN actually shipped it — otherwise
                        // bare "9TH INN" is the cleaner readout.
                        liveStatusLabel = clockText
                            ? `${periodPart} ${clockText.toUpperCase()}`
                            : periodPart;
                    } else {
                        // Time-based sports: append the clock when present
                        // ("3RD QTR 12:34"). Between-period transitions
                        // drop the clock server-side so we never lie.
                        liveStatusLabel = clockText
                            ? `${periodPart} ${clockText}`
                            : periodPart;
                    }
                } else if (clockText) {
                    liveStatusLabel = clockText;
                } else {
                    liveStatusLabel = eventStatus
                        .replace(/^STATUS_/, '')
                        .replace(/_/g, ' ')
                        .toLowerCase()
                        .replace(/\b\w/g, (c) => c.toUpperCase());
                }
            }

            // Baseball live situation: half-inning arrow + outs + base
            // runners. Only populated for live MLB rows that have shipped
            // a situation block from ESPN (mid-half-inning state). The
            // render branch hides itself between innings ("Mid"/"End")
            // because outs/bases reset and the indicator becomes noise.
            // Bases is the 3-char "FST" string from the backend; we keep
            // the raw form here and let the renderer paint the diamond.
            let baseballSituation = null;
            if (isLive && isBaseball && periodNum > 0) {
                const rawOuts = match.score?.outs;
                const rawBases = match.score?.bases;
                const halfLower = clockText.toLowerCase();
                const isPlayingHalf = halfLower === 'top' || halfLower === 'bot';
                const outs = (rawOuts !== null && rawOuts !== undefined && rawOuts !== ''
                    && Number.isFinite(Number(rawOuts)))
                    ? Math.max(0, Math.min(3, Number(rawOuts)))
                    : null;
                const bases = (typeof rawBases === 'string' && /^[01]{3}$/.test(rawBases))
                    ? rawBases : null;
                if (isPlayingHalf && (outs !== null || bases !== null)) {
                    baseballSituation = {
                        half: halfLower === 'top' ? 'top' : 'bot',
                        inning: periodNum,
                        inningLabel: `${periodNum}${ordinalSuffix(periodNum)}`,
                        outs,
                        bases,
                    };
                }
            }

            // Live scores per team. Surfaced only when the match is
            // currently live — pregame rows have nothing to show and a
            // finished match's "final score" lives in a separate
            // settlement-time render. Coerced through Number(...) so a
            // missing field (null/undefined/'') becomes NaN and the
            // render path can early-return without printing "0" on a
            // game that hasn't tipped off yet. Reads the canonical
            // score_home / score_away pair the settlement service
            // grades against, so the board number always matches the
            // grader's view.
            const rawHome = match?.score?.score_home;
            const rawAway = match?.score?.score_away;
            const homeScore = (rawHome !== null && rawHome !== '' && Number.isFinite(Number(rawHome)))
                ? Number(rawHome) : null;
            const awayScore = (rawAway !== null && rawAway !== '' && Number.isFinite(Number(rawAway)))
                ? Number(rawAway) : null;

            return {
                id: match.id || match.externalId,
                sport: match.sport || '',
                sportKey: match.sportKey || '',
                team1: awayName,
                team2: homeName,
                // Short names + records come pre-computed from the backend
                // (TeamNormalizer joins short names from the odds feed; records
                // come from the ESPN scoreboard side-channel). Falling
                // back to the full name preserves the old behavior when a
                // row predates the normalization layer.
                team1Short: match.awayTeamShort || awayName,
                team2Short: match.homeTeamShort || homeName,
                // Canonical full "City Mascot" names for DISPLAY. team1/team2
                // (the short city) stay the placement selection + dedupe key;
                // these are render-only. Fall back to the short name pre-sync.
                team1Full: match.awayTeamFull || awayName,
                team2Full: match.homeTeamFull || homeName,
                team1Record: match.awayTeamRecord || '',
                team2Record: match.homeTeamRecord || '',
                broadcast: resolveBroadcast(match.broadcast),
                eventName: typeof match.eventName === 'string' ? match.eventName.trim() : '',
                broadcastTime: formatBroadcastTimeET(match.startTime),
                // Multi-sport: each league's matches see its OWN selected
                // period's suffix (so NBA-Q1 + MLB-Full can coexist on
                // screen). Single-sport: keep the global activePeriod
                // suffix exactly as before.
                odds: extractOdds(
                    match,
                    homeName,
                    awayName,
                    isMultiSportView
                        ? (resolveActivePeriodForSportKey(match.sportKey).suffix)
                        : activePeriod.suffix,
                ),
                isLive,
                // True when the row LOOKS live but the backend has flagged
                // odds as stale / suspended. MatchCard reads this to swap
                // the red "Live" pill for a gray "Suspended" one so the
                // user isn't staring at a red LIVE indicator next to an
                // "Updated 39m ago" label. Computed once here so the slip
                // and other consumers can read a single flag.
                isLiveStale: isLive && match.isBettable === false,
                liveStatusLabel,
                // Baseball-only: structured live situation (half/inning/
                // outs/bases). Null for every other sport, and null for
                // baseball games where ESPN hasn't shipped a situation
                // block (pre-game, between innings, final). MatchCard
                // renders this in place of `liveStatusLabel` when present.
                baseballSituation,
                // team1 = away, team2 = home (matches the rest of the
                // card's away-then-home convention).
                team1Score: awayScore,
                team2Score: homeScore,
                // Preserve backend flag: MatchCard reads this to disable
                // bet buttons when the book has stale or suspended lines.
                isBettable: match.isBettable !== false,
                bettingBlockedReason: match.bettingBlockedReason || '',
                startDate,
                time: startDate ? (() => {
                    const tz = getSiteTimezone();
                    return `${startDate.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true })} ${getSiteTimezoneLabel(tz)}`;
                })() : '',
                // Self-describing "Today 4/23 6:10pm" variant for each row
                // so scrolling past the day divider doesn't hide context.
                timeDisplay: formatMatchDateTime(startDate),
                dayKey: dayKeyOf(startDate),
                dayLabel: dayLabelOf(startDate),
                // Carried through so the MatchCard can render "Updated N min ago"
                // without having to reach into rawMatch. ONLY lastOddsSyncAt
                // — never falling back to lastUpdated, because the live
                // score-only writer bumps lastUpdated but NOT lastOddsSyncAt.
                // A fallback there
                // would lie about odds freshness on a row whose score was
                // just refreshed but whose odds are minutes old.
                lastOddsSyncAt: match.lastOddsSyncAt || null,
            };
        });

        // Sort key: sport first (using the user's sidebar selection
        // order so MLB-then-NBA selection puts every MLB row above every
        // NBA row), then chronological inside each sport block. Without
        // the sport-primary key, an early NBA tip-off slipped between
        // two MLB games whose first pitches straddled it, leaving the
        // odds board hopping back-and-forth between leagues. Sports not
        // in realSelected (e.g. virtual buckets like LIVE NOW) fall to
        // the end so they never break a real selection's grouping.
        const sportPriority = new Map();
        realSelected.forEach((id, idx) => {
            const item = findSportItemById(id);
            const keys = Array.isArray(item?.sportKeys) ? item.sportKeys : [];
            keys.forEach((k) => {
                const norm = String(k || '').toLowerCase();
                if (norm && !sportPriority.has(norm)) sportPriority.set(norm, idx);
            });
        });
        const priorityFor = (m) => {
            const key = String(m.sportKey || '').toLowerCase();
            if (sportPriority.has(key)) return sportPriority.get(key);
            return Number.POSITIVE_INFINITY;
        };
        // For virtual buckets (LIVE NOW / UP NEXT) the sidebar didn't
        // tell us a preferred sport order, so fall back to grouping
        // by sportKey alphabetically. Without this fallback the sort
        // collapses to "purely by start time", which interleaves
        // leagues and causes the league header above to re-emit
        // every few rows — exactly the unstructured mix the user
        // flagged on the screenshot.
        const isVirtualBucketSort = primarySport === 'commercial-live' || primarySport === 'up-next';
        formatted.sort((a, b) => {
            const pa = priorityFor(a);
            const pb = priorityFor(b);
            if (pa !== pb) return pa - pb;
            if (isVirtualBucketSort) {
                const ka = String(a.sportKey || '').toLowerCase();
                const kb = String(b.sportKey || '').toLowerCase();
                if (ka !== kb) return ka < kb ? -1 : 1;
            }
            const aTs = a.startDate ? a.startDate.getTime() : Number.POSITIVE_INFINITY;
            const bTs = b.startDate ? b.startDate.getTime() : Number.POSITIVE_INFINITY;
            return aTs - bTs;
        });
        return formatted;
    }, [rawMatches, primarySport, realSelected, extractOdds, activePeriod.suffix, statusFilter, normalizedBetMode, isMultiSportView, resolveActivePeriodForSportKey]);

    const degradedSummary = React.useMemo(() => {
        const all = Array.isArray(rawMatches) ? rawMatches : [];
        const blocked = all.filter((m) => m?.isBettable === false);
        const staleBlocked = blocked.filter((m) => {
            const reason = String(m?.bettingBlockedReason || '').toLowerCase();
            return m?.oddsFeedStale === true || reason.includes('stale') || reason.includes('suspend');
        });
        return {
            staleBlockedCount: staleBlocked.length,
        };
    }, [rawMatches]);

    const visibleMarkets = React.useMemo(() => getVisibleMarketsForMode(activeBetMode), [activeBetMode]);
    const marketCount = [visibleMarkets.showSpread, visibleMarkets.showMoneyline, visibleMarkets.showTotals].filter(Boolean).length;
    const selectedKeys = React.useMemo(() => {
        return new Set((slipSelections || []).map(sel => selectionKey(sel.matchId, sel.marketType, sel.selection)));
    }, [slipSelections]);

    // Live teaser-line preview. Resolved once at the panel level; each
    // MatchCard receives a `teaserPoints` number (the points to apply
    // for THIS match's sport) and renders adjusted spreads/totals
    // alongside the base lines. Backend re-applies the same math at
    // placement (SportsbookBetSupport::applyTeaserAdjustment), so the
    // slip values + grades stay consistent — this is display only.
    const resolvedTeaserType = React.useMemo(() => {
        if (normalizedBetMode !== 'teaser' || !teaserTypeId) return null;
        const types = Array.isArray(teaserRule?.teaserTypes) ? teaserRule.teaserTypes : [];
        return types.find((t) => t && t.id === teaserTypeId) || null;
    }, [normalizedBetMode, teaserTypeId, teaserRule]);
    // Distinct sport groups already on the slip — passed to the
    // board-level picker so types that can't price every group in
    // play (e.g. Super Teaser with a basketball leg) render disabled
    // instead of letting the user pick a dead-end product.
    const boardSlipSportGroups = React.useMemo(() => {
        const groups = new Set();
        for (const sel of (slipSelections || [])) {
            const g = teaserSportGroup(sel?.sportKey || sel?.sport);
            if (g) groups.add(g);
        }
        return Array.from(groups);
    }, [slipSelections]);
    const teaserPointsForMatch = React.useCallback((match) => {
        if (!resolvedTeaserType) return 0;
        const group = teaserSportGroup(match?.sportKey || match?.sport);
        if (!group) return 0;
        return teaserPointsForSport(resolvedTeaserType, group);
    }, [resolvedTeaserType]);

    const [favoriteIds, setFavoriteIds] = React.useState(() => readFavoriteIds());
    const toggleFavorite = React.useCallback((matchId) => {
        setFavoriteIds((prev) => {
            const next = new Set(prev);
            if (next.has(matchId)) next.delete(matchId);
            else next.add(matchId);
            writeFavoriteIds(next);
            return next;
        });
    }, []);

    // Preserve the chronological order established in `matches` and just
    // annotate each event with its rotation number. (Favorites-first sort
    // was removed with the star icon — reintroducing it would break the
    // day-divider grouping the user relies on to spot today's games.)
    const orderedMatches = React.useMemo(() => {
        return matches.map((m, idx) => ({
            ...m,
            rotation: rotationForMatch(m, idx),
            isFavorite: favoriteIds.has(m.id),
        }));
    }, [matches, favoriteIds]);

    const myLiveOnBoardCount = React.useMemo(() => {
        if (!pendingRiskMatchIds || pendingRiskMatchIds.size === 0) return 0;
        return orderedMatches.filter((m) => pendingRiskMatchIds.has(String(m.id))).length;
    }, [orderedMatches, pendingRiskMatchIds]);

    // Auto-jump to MY BETS when the player first lands on LIVE NOW with
    // live action of their own on the board — that's almost always what
    // they came to see. Snapshot at entry-time only: we don't react to
    // later myLiveOnBoardCount changes here, so a bet that goes live
    // mid-browse won't yank the player out of whatever they were
    // viewing. They can still tap ALL afterwards and the choice sticks.
    const liveAutoJumpRef = React.useRef(false);
    React.useEffect(() => {
        if (primarySport !== 'commercial-live') {
            liveAutoJumpRef.current = false;
            return;
        }
        if (liveAutoJumpRef.current) return;
        // Wait until myLiveOnBoardCount is computed off a populated
        // orderedMatches + pendingRiskMatchIds snapshot. If it's >0,
        // jump; if it's 0 AND we have any matches in hand, we know the
        // player has no live bets and we can lock in ALL.
        if (myLiveOnBoardCount > 0) {
            setLiveSportTab('my-live');
            liveAutoJumpRef.current = true;
        } else if (orderedMatches.length > 0) {
            liveAutoJumpRef.current = true;
        }
    }, [primarySport, myLiveOnBoardCount, orderedMatches.length]);

    // Pre-warm team/athlete badge cache so the first paint of any card
    // shows the real logo instead of an initials placeholder that
    // swaps in ~300ms later. Concurrency-limited inside prewarmTeamBadges.
    React.useEffect(() => {
        const items = [];
        matches.forEach((m) => {
            if (m.team1) items.push({ name: m.team1, sportKey: m.sportKey, sport: m.sport, abbr: m.team1Short });
            if (m.team2) items.push({ name: m.team2, sportKey: m.sportKey, sport: m.sport, abbr: m.team2Short });
        });
        prewarmTeamBadges(items);
    }, [matches]);

    const [lastFetchTime, setLastFetchTime] = React.useState(() => Date.now());
    const [isRefreshing, setIsRefreshing] = React.useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
    const [nowTick, setNowTick] = React.useState(() => Date.now());

    React.useEffect(() => {
        setLastFetchTime(Date.now());
        setIsRefreshing(true);
        setHasLoadedOnce(false);
    }, [scopeKey, statusFilter]);

    React.useEffect(() => {
        const id = setInterval(() => {
            if (!document.hidden) setNowTick(Date.now());
        }, TICK_MS);
        return () => clearInterval(id);
    }, []);

    React.useEffect(() => {
        const onCompleted = () => {
            setIsRefreshing(false);
            setHasLoadedOnce(true);
            setLastFetchTime(Date.now());
            setNowTick(Date.now());
        };
        const onProgress = (event) => {
            const phase = event?.detail?.phase;
            if (phase === 'started') setIsRefreshing(true);
        };
        window.addEventListener('matches:refresh-completed', onCompleted);
        window.addEventListener('matches:refresh-progress', onProgress);
        return () => {
            window.removeEventListener('matches:refresh-completed', onCompleted);
            window.removeEventListener('matches:refresh-progress', onProgress);
        };
    }, []);

    // Collect every distinct sportKey present in the visible
    // matches. Mobile content views can mix leagues under one heading
    // (NBA + WNBA, multiple soccer leagues, etc.); refreshing only the
    // first match's sportKey leaves the others stale, so the button
    // needs the full set. Empty array if no matches.
    const visibleSportKeys = React.useMemo(() => {
        const keys = new Set();
        for (const m of (orderedMatches || [])) {
            const k = m?.rawMatch?.sportKey || m?.sportKey;
            if (typeof k === 'string' && k.trim() !== '') keys.add(k.trim().toLowerCase());
        }
        return [...keys];
    }, [orderedMatches]);
    const { showToast } = useToast();
    const { trigger: triggerSportRefresh, isRefreshing: isSportRefreshing, cooldownRemainingSec } = useSportOddsRefresh(visibleSportKeys, { showToast });

    // LIVE NOW open (mobile): mirror SportContentView and fire a
    // synchronous live odds sync so the first paint shows the freshest
    // odds possible. Backend's 15s per-IP throttle on /api/sync/live silently
    // collapses redundant calls, so re-mounting LIVE NOW or rapid back/forth
    // navigation never hammers the upstream.
    //
    // The sync ALSO runs on a 60s interval while Live Now is open. The
    // backend's 90s live-freshness gate hides rows whose lastOddsSyncAt
    // is older than 90s — if the worker stalls between ticks, /api/matches?status=live
    // starts returning [] and the board would flash empty. Re-poking
    // /api/sync/live every 60s keeps the lastOddsSyncAt fresh so rows
    // never age out from under the player. Pauses while tab is hidden.
    React.useEffect(() => {
        if (statusFilter !== 'live') return undefined;
        if (!getStoredAuthToken()) return undefined;
        let cancelled = false;
        let activeController = null;
        const runSync = (reason) => {
            if (cancelled) return;
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            if (activeController) activeController.abort();
            const ctrl = new AbortController();
            activeController = ctrl;
            syncLiveMatches({ signal: ctrl.signal })
                .then(() => {
                    if (cancelled) return;
                    window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                        detail: { reason },
                    }));
                })
                .catch(() => { /* throttled / aborted — auto-poll will catch up */ });
        };
        const initialTimer = window.setTimeout(() => runSync('live-mount-sync'), 200);
        const intervalId = window.setInterval(() => runSync('live-periodic-sync'), 60000);
        return () => {
            cancelled = true;
            window.clearTimeout(initialTimer);
            window.clearInterval(intervalId);
            if (activeController) activeController.abort();
        };
    }, [statusFilter]);

    // Freshness sync on sport selection — mirrors SportContentView (desktop).
    // 300ms debounce absorbs rapid sport switches into one POST per final
    // selection. No client-side dedup beyond the debounce — every committed
    // selection fires a fresh upstream sync.
    React.useEffect(() => {
        if (statusFilter === 'live') return undefined;
        if (intendedSportKeys.length === 0) return undefined;
        if (!getStoredAuthToken()) return undefined;
        const ctrl = new AbortController();
        let cancelled = false;
        const timer = window.setTimeout(() => {
            if (cancelled) return;
            Promise.all(intendedSportKeys.map(async (sportKey) => {
                try {
                    await syncPrematchSport(sportKey, { signal: ctrl.signal });
                } catch (err) {
                    if (err?.name === 'AbortError') return;
                    if (cancelled) return;
                    const haveCachedRows = Array.isArray(rawMatchesRef.current) && rawMatchesRef.current.length > 0;
                    if (haveCachedRows) return;
                    notifyMobSyncFailure(sportKey, showToast);
                }
            })).then(() => {
                if (cancelled) return;
                window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                    detail: { reason: 'sport-tab-sync', sportKeys: intendedSportKeys },
                }));
            });
        }, 300);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            ctrl.abort();
        };
    }, [intendedSportKeys, statusFilter, showToast]);

    const handleManualRefresh = React.useCallback(() => {
        if (isRefreshing || isSportRefreshing || cooldownRemainingSec > 0) return;
        setIsRefreshing(true);
        if (visibleSportKeys.length > 0) {
            // Per-sport upstream fetch lands fresh data in the DB and
            // invalidates the public cache. After success, just re-read
            // — matches:force-refetch skips the backend's refresh=true
            // code path that would otherwise return the pre-sync snapshot
            // with a deferred-sync header and delay the UI update by ~5s.
            triggerSportRefresh({
                onSuccess: () => {
                    window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                        detail: { reason: 'user-odds-refresh', sportKeys: visibleSportKeys },
                    }));
                },
            });
        } else {
            // No sport known — fall back to the generic backend-sync path.
            window.dispatchEvent(new CustomEvent('matches:refresh', {
                detail: { reason: 'user', requestId: `mobile-${Date.now()}` },
            }));
        }
    }, [isRefreshing, isSportRefreshing, cooldownRemainingSec, visibleSportKeys, triggerSportRefresh]);

    const ageMs = nowTick - lastFetchTime;
    const isStale = ageMs >= STALE_MS;
    const minutesAgo = Math.max(0, Math.floor(ageMs / 60000));
    const ageLabel = ageMs < 60000 ? 'Just updated' : `Updated ${minutesAgo}m ago`;

    const handleAddToSlip = React.useCallback((matchId, selection, marketType, odds, matchName, marketLabel = marketType, line = null, meta = {}) => {
        const parsedOdds = parseOddsNumber(odds);
        if (!matchId || !selection || parsedOdds === null) return;
        const parsedLine = Number(line);
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId,
                selection,
                marketType,
                odds: parsedOdds,
                matchName,
                marketLabel,
                line: Number.isFinite(parsedLine) ? parsedLine : null,
                // isLive flag captured at add-time so the slip can label
                // the leg as LIVE BET. Sourced from the same match doc
                // the card derived its `match.isLive` from (status==='live'
                // OR upstream event_status contains IN_PROGRESS / LIVE),
                // so it tracks whatever the upstream odds source reports.
                isLive: !!meta?.isLive,
                // sportKey passed straight through so per-mode sport gates
                // in the slip (teaser → football+basketball only) work
                // without re-resolving the match.
                sportKey: String(meta?.sportKey || '').toLowerCase(),
                // Full DISPLAY label for the leg (short `selection` above stays
                // the match key). Falls back to the short selection.
                selectionFull: meta?.selectionFull || selection,
            },
        }));
    }, []);

    // When the user has 2+ real sports selected via the sidebar checkboxes,
    // group matches by league inside the match list and emit a section
    // header (e.g. "MLB", "NBA 1H") so the cards visually self-describe.
    // Single-sport view stays as-is — the sport title at the top of the
    // panel already provides that context, so an extra header would be
    // redundant noise.
    //
    // Hierarchy (with sport-primary sort): league header anchors a
    // contiguous block of matches for ONE sport, then day dividers split
    // that block by date. So a multi-day MLB schedule reads
    //     [MLB]
    //       [Today]   ...mlb today rows
    //       [Tomorrow] ...mlb tomorrow rows
    //     [NBA]
    //       [Today]   ...nba today rows
    // — the user gets all of one sport in a single column, with day
    // context preserved within each sport. Day key resets every league
    // boundary so the first day inside the next sport always re-emits.
    // Group rows by league when the visible set spans more than one
    // sport. Two triggers:
    //   1. The user has 2+ real leagues checked in the sidebar.
    //   2. The active bucket is a virtual one (LIVE NOW / UP NEXT)
    //      that pulls matches across every sport — without this the
    //      Live Now feed reads as an unstructured mix (WNBA next to
    //      NBA next to soccer next to MLB), which is exactly what the
    //      user flagged.
    const isVirtualBucket = primarySport === 'commercial-live' || primarySport === 'up-next';
    const showLeagueHeaders = realSelected.length >= 2 || isVirtualBucket;
    // Suffix the league name with the active period chip ("1H", "2H",
    // "1Q", etc.) only when one is selected — otherwise just show
    // "NBA" / "MLB" on its own. Full-game period uses label "Game" for
    // the period tab UI only; it must not be concatenated onto league
    // headers (that produced "NBA GAME" in all-caps).
    const periodSuffixLabel = (activePeriod && activePeriod.id !== 'full' && activePeriod.label)
        ? activePeriod.label
        : '';

    // Live Now sport-tab strip data: the strip is the persistent sport
    // rail every pro book has — football, basketball, baseball, hockey,
    // soccer, tennis pills always appear (count 0 stays in the rail but
    // dimmed). Active sports float to the front of the rail so the
    // player sees what's playing right now without scrolling — e.g. if
    // only soccer is live, soccer is the first icon after the All pill.
    // Within each group (active / empty) the canonical category order
    // is preserved so positions are still predictable across sessions.
    // Niche sports (MMA, cricket, rugby, etc.) only appear when there's
    // at least one live game so the rail doesn't overflow with empty pills.
    const LIVE_RAIL_CORE_SPORTS = ['football', 'basketball', 'baseball', 'hockey', 'soccer', 'tennis'];
    const liveSportTabs = React.useMemo(() => {
        if (primarySport !== 'commercial-live') return [];
        const counts = new Map();
        for (const m of orderedMatches) {
            const cat = categorizeLiveSport(m.sportKey || m.sport);
            if (!cat) continue;
            counts.set(cat.id, (counts.get(cat.id) || 0) + 1);
        }
        const visible = LIVE_SPORT_CATEGORIES
            .filter((c) => LIVE_RAIL_CORE_SPORTS.includes(c.id) || counts.has(c.id))
            .map((c) => ({ ...c, count: counts.get(c.id) || 0 }));
        const active = visible.filter((c) => c.count > 0);
        const empty = visible.filter((c) => c.count === 0);
        return [...active, ...empty];
    }, [primarySport, orderedMatches]);

    // Matches surviving the sport-category filter only — feeds the
    // league sub-strip so its pills reflect what's actually browsable
    // within the active sport (e.g. picking Basketball collapses the
    // league pills to NBA / WNBA / NCAAB instead of every league live).
    const matchesAfterSportFilter = React.useMemo(() => {
        if (primarySport !== 'commercial-live') return orderedMatches;
        if (liveSportTab === 'my-live') {
            return orderedMatches.filter((m) => pendingRiskMatchIds.has(String(m.id)));
        }
        if (liveSportTab === 'all') return orderedMatches;
        return orderedMatches.filter((m) => {
            const cat = categorizeLiveSport(m.sportKey || m.sport);
            return cat && cat.id === liveSportTab;
        });
    }, [primarySport, liveSportTab, orderedMatches, pendingRiskMatchIds]);

    // League sub-strip data: distinct sportKeys present in the
    // post-sport-filter slice, with counts. Rendered ONLY when there
    // are 2+ leagues to choose from — a single-league strip is
    // visual noise.
    const liveLeagueTabs = React.useMemo(() => {
        if (primarySport !== 'commercial-live') return [];
        const counts = new Map();
        for (const m of matchesAfterSportFilter) {
            const key = String(m.sportKey || '').toLowerCase();
            if (!key) continue;
            counts.set(key, (counts.get(key) || 0) + 1);
        }
        if (counts.size <= 1) return [];
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
            .map(([key, count]) => ({
                id: key,
                label: sportLabelForKey(key) || key.toUpperCase(),
                count,
            }));
    }, [primarySport, matchesAfterSportFilter]);

    const matchesAfterLeagueFilter = React.useMemo(() => {
        if (primarySport !== 'commercial-live') return matchesAfterSportFilter;
        if (liveLeagueTab === 'all') return matchesAfterSportFilter;
        return matchesAfterSportFilter.filter((m) =>
            String(m.sportKey || '').toLowerCase() === liveLeagueTab);
    }, [primarySport, liveLeagueTab, matchesAfterSportFilter]);

    // Game-stage filter — only meaningful when the player has nothing
    // narrower to pick from (≤1 sport AND ≤1 league live). Surfaces
    // early / mid / late buckets so the user can quickly find e.g.
    // bottom-of-the-9th MLB games.
    const liveStageTabs = React.useMemo(() => {
        if (primarySport !== 'commercial-live') return [];
        if (liveSportTabs.length > 1) return [];
        if (liveLeagueTabs.length > 1) return [];
        const counts = { early: 0, mid: 0, late: 0 };
        for (const m of matchesAfterLeagueFilter) {
            const isLive = isLiveLikeMatch(m);
            if (!isLive) continue;
            const stage = classifyGameStage(m);
            counts[stage] = (counts[stage] || 0) + 1;
        }
        const total = counts.early + counts.mid + counts.late;
        if (total < 2) return [];
        const present = Object.entries(counts).filter(([, c]) => c > 0);
        if (present.length <= 1) return [];
        const STAGE_DEFS = {
            early: { id: 'early', icon: 'fa-solid fa-hourglass-start', label: 'Early' },
            mid: { id: 'mid', icon: 'fa-solid fa-hourglass-half', label: 'Mid-game' },
            late: { id: 'late', icon: 'fa-solid fa-hourglass-end', label: 'Late' },
        };
        return present.map(([id, count]) => ({ ...STAGE_DEFS[id], count }));
    }, [primarySport, liveSportTabs.length, liveLeagueTabs.length, matchesAfterLeagueFilter]);

    const showLiveSportStrip = primarySport === 'commercial-live'
        && (liveSportTabs.length >= 1 || myLiveOnBoardCount > 0);
    const showLiveLeagueStrip = primarySport === 'commercial-live'
        && liveLeagueTabs.length >= 2;
    const showLiveStageStrip = primarySport === 'commercial-live'
        && liveStageTabs.length >= 2;

    const liveStripTabs = React.useMemo(() => {
        const tabs = [];
        if (myLiveOnBoardCount > 0) {
            tabs.push({
                id: 'my-live',
                emoji: '🎟️',
                icon: 'fa-solid fa-ticket',
                label: 'My live action',
                count: myLiveOnBoardCount,
            });
        }
        tabs.push({
            id: 'all',
            emoji: '⚡',
            icon: 'fa-solid fa-bolt',
            label: 'All live',
            count: orderedMatches.length,
        });
        for (const t of liveSportTabs) {
            tabs.push({ id: t.id, emoji: t.emoji, icon: t.icon, label: t.label, count: t.count });
        }
        return tabs;
    }, [liveSportTabs, orderedMatches.length, myLiveOnBoardCount]);

    // If the active tab no longer has any matches (sync cycle dropped
    // that sport from the live feed), snap back to All so the user
    // doesn't stare at an empty list.
    React.useEffect(() => {
        if (liveSportTab === 'all') return;
        if (liveSportTab === 'my-live') {
            if (myLiveOnBoardCount === 0) setLiveSportTab('all');
            return;
        }
        if (!liveSportTabs.some((t) => t.id === liveSportTab)) {
            setLiveSportTab('all');
        }
    }, [liveSportTab, liveSportTabs, myLiveOnBoardCount]);

    // Same snap-back guard for league and stage sub-filters: if the
    // active pill disappears from the live feed mid-session, fall back
    // to 'all' so the list isn't silently empty.
    React.useEffect(() => {
        if (liveLeagueTab === 'all') return;
        if (!liveLeagueTabs.some((t) => t.id === liveLeagueTab)) {
            setLiveLeagueTab('all');
        }
    }, [liveLeagueTab, liveLeagueTabs]);

    React.useEffect(() => {
        if (liveStageTab === 'all') return;
        if (!liveStageTabs.some((t) => t.id === liveStageTab)) {
            setLiveStageTab('all');
        }
    }, [liveStageTab, liveStageTabs]);

    // Apply all three live filters (sport → league → stage) BEFORE
    // grouping so league headers / day dividers re-compute against
    // the filtered slice.
    const matchesForGrouping = React.useMemo(() => {
        if (primarySport !== 'commercial-live') return orderedMatches;
        if (liveStageTab === 'all') return matchesAfterLeagueFilter;
        return matchesAfterLeagueFilter.filter((m) => classifyGameStage(m) === liveStageTab);
    }, [primarySport, liveStageTab, matchesAfterLeagueFilter, orderedMatches]);

    // Day dividers ("WEDNESDAY, MAY 13") add zero info on a live-only
    // view — every live game is, by definition, happening right now, so
    // they all share today's date. Suppressing them tightens the live
    // board (more games on screen, no redundant date strip between the
    // league header and the first game row).
    const suppressDayDividers = statusFilter === 'live';
    const groupedEntries = React.useMemo(() => {
        const entries = [];
        let currentLeagueKey = null;
        let currentDayKey = null;
        matchesForGrouping.forEach(match => {
            const leagueKey = String(match.sportKey || match.sport || '').toLowerCase();
            if (showLeagueHeaders && leagueKey && leagueKey !== currentLeagueKey) {
                currentLeagueKey = leagueKey;
                currentDayKey = null;
                const leagueLabel = sportLabelForKey(leagueKey) || (match.sport || leagueKey);
                // Per-league period chips ride inline on the SAME red row
                // as the league label (multi-sport only). Each section's
                // own periods (Q1–Q4 for NBA, F1/F3/F5/F7 for MLB, etc.)
                // sit on the right of that section's red header bar, so
                // the band reads as a single sportsbook-style strip
                // instead of stacking two separate red rows.
                const periods = isMultiSportView
                    ? (perSportMeta.get(leagueKey)?.periods ?? [])
                    : [];
                entries.push({
                    type: 'league',
                    id: `league-${leagueKey}`,
                    sportKey: leagueKey,
                    label: periodSuffixLabel
                        ? `${leagueLabel} ${periodSuffixLabel}`.trim()
                        : leagueLabel,
                    periods: periods.length > 1 ? periods : null,
                });
            }
            if (!suppressDayDividers && match.dayKey && match.dayKey !== currentDayKey) {
                currentDayKey = match.dayKey;
                entries.push({
                    type: 'day',
                    id: `day-${leagueKey || 'all'}-${currentDayKey}`,
                    label: match.dayLabel,
                });
            }
            entries.push({ type: 'match', id: `match-${match.id}`, match });
        });
        return entries;
    }, [matchesForGrouping, showLeagueHeaders, periodSuffixLabel, suppressDayDividers, isMultiSportView, perSportMeta]);

    return (
        <div style={containerStyle}>
            <div style={sportHeaderStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={sportTitleStyle}>{sportName}</div>
                    <div style={sportSubtitleStyle}>
                        {activeModeLabel} · {statusFilter === 'live' ? 'Live' : statusFilter === 'upcoming' ? 'Upcoming Matches' : 'Live & Upcoming'}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing || isSportRefreshing || cooldownRemainingSec > 0}
                    style={isStale ? refreshButtonStaleStyle : refreshButtonStyle}
                    aria-label="Refresh odds"
                >
                    <i className={`fa-solid fa-arrows-rotate ${(isRefreshing || isSportRefreshing) ? 'fa-spin' : ''}`} style={{ marginRight: 6 }} />
                    {(isRefreshing || isSportRefreshing) ? 'Updating…' : cooldownRemainingSec > 0 ? `Wait ${cooldownRemainingSec}s` : isStale ? 'Refresh for latest odds' : ageLabel}
                </button>
            </div>

            {/* Board-level teaser type picker. Visible immediately on the
                Teaser tab so the user picks 6/6.5/7 BEFORE seeing teased
                lines — putting it inside the slip drawer (the prior
                location) hid it from anyone who tapped the tab without
                opening the slip first. Self-gates on mode + types
                length, so renders nothing on non-teaser tabs or when
                the rule lacks a structured catalog. */}
            <TeaserTypePicker
                normalizedBetMode={normalizedBetMode}
                teaserTypes={Array.isArray(teaserRule?.teaserTypes) ? teaserRule.teaserTypes : []}
                selectedTeaserType={resolvedTeaserType}
                onTeaserTypeChange={onTeaserTypeChange}
                slipSportGroups={boardSlipSportGroups}
            />

            {!isMultiSportView && periods.length > 1 && (
                <div style={periodTabBarStyle}>
                    {periods.map(p => {
                        const isClosed = closedPeriodIds.has(p.id);
                        const isActive = p.id === selectedPeriodId;
                        const baseStyle = isActive ? periodTabActiveStyle : periodTabStyle;
                        // Closed periods remain selectable so the user can
                        // still drill in / inspect — they're just visually
                        // de-emphasized to signal "this period is over for
                        // every game on screen right now".
                        const style = isClosed
                            ? { ...baseStyle, opacity: 0.45, textDecoration: 'line-through' }
                            : baseStyle;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedPeriodId(p.id)}
                                style={style}
                                title={isClosed ? `${p.label} has ended for every live game` : undefined}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Live Now filter stack — up to three rows, each adds value
                only when there's something to filter on:
                  (1) sport pills (icon + count) — "what sport am I in?"
                  (2) league pills (label + count) — narrows within sport
                  (3) game-stage pills — shown ONLY when sport+league
                      strips have ≤1 option each, so a player with just
                      MLB live still gets a useful filter (Early / Mid /
                      Late inning).
                Segmented styling matches the Straight/Parlay/Teaser
                tabs; first pill (when present) jumps to games the
                player has pending risk on. */}
            {showLiveSportStrip && (
                <div style={liveFilterStripStyle}>
                    {liveStripTabs.map((tab) => {
                        const active = liveSportTab === tab.id;
                        const isEmpty = tab.count === 0 && tab.id !== 'all' && tab.id !== 'my-live';
                        const showEmoji = !!tab.emoji;
                        const shortLabel = tab.id === 'my-live' ? 'My Bets'
                            : tab.id === 'all' ? 'All'
                            : tab.label;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setLiveSportTab(tab.id)}
                                title={`${tab.label} (${tab.count})`}
                                aria-label={`${tab.label} — ${tab.count} live`}
                                style={{
                                    ...liveFilterPillStyle,
                                    opacity: !active && isEmpty ? 0.45 : 1,
                                    borderBottom: active ? '3px solid #fbbf24' : '3px solid transparent',
                                }}
                            >
                                <span style={liveFilterIconWrapStyle}>
                                    {showEmoji ? (
                                        <span
                                            style={{
                                                fontSize: 26,
                                                lineHeight: 1,
                                                filter: !active && isEmpty ? 'grayscale(70%)' : 'none',
                                            }}
                                            aria-hidden
                                        >
                                            {tab.emoji}
                                        </span>
                                    ) : (
                                        <i
                                            className={tab.icon}
                                            style={{ fontSize: 22, lineHeight: 1, color: active ? '#fbbf24' : '#fff' }}
                                            aria-hidden
                                        />
                                    )}
                                    {tab.count > 0 && (
                                        <span style={liveFilterCountBadgeStyle(active)}>
                                            {tab.count}
                                        </span>
                                    )}
                                </span>
                                <span style={liveFilterPillLabelStyle(active)}>
                                    {shortLabel}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {showLiveLeagueStrip && (
                <div style={liveLeagueStripStyle}>
                    <button
                        type="button"
                        onClick={() => setLiveLeagueTab('all')}
                        style={liveLeaguePillStyle(liveLeagueTab === 'all')}
                        aria-label="All leagues"
                    >
                        All
                        <span style={liveLeaguePillCountStyle}>
                            {matchesAfterSportFilter.length}
                        </span>
                    </button>
                    {liveLeagueTabs.map((tab) => {
                        const active = liveLeagueTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setLiveLeagueTab(tab.id)}
                                style={liveLeaguePillStyle(active)}
                                aria-label={`${tab.label} — ${tab.count} live`}
                            >
                                {tab.label}
                                <span style={liveLeaguePillCountStyle}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {showLiveStageStrip && (
                <div style={liveLeagueStripStyle}>
                    <button
                        type="button"
                        onClick={() => setLiveStageTab('all')}
                        style={liveLeaguePillStyle(liveStageTab === 'all')}
                        aria-label="All game stages"
                    >
                        <i className="fa-solid fa-bolt" style={{ marginRight: 6, fontSize: 11 }} aria-hidden />
                        All
                        <span style={liveLeaguePillCountStyle}>
                            {matchesAfterLeagueFilter.length}
                        </span>
                    </button>
                    {liveStageTabs.map((tab) => {
                        const active = liveStageTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setLiveStageTab(tab.id)}
                                style={liveLeaguePillStyle(active)}
                                aria-label={`${tab.label} — ${tab.count} live`}
                            >
                                <i className={tab.icon} style={{ marginRight: 6, fontSize: 11 }} aria-hidden />
                                {tab.label}
                                <span style={liveLeaguePillCountStyle}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div style={{ flex: 1 }}>
                {isRefreshing && hasLoadedOnce && (
                    <div style={updatingBannerStyle}>
                        <i className="fa-solid fa-arrows-rotate fa-spin" style={{ marginRight: 6 }} />
                        Updating odds…
                    </div>
                )}

                {groupedEntries.length === 0 && !hasLoadedOnce && (
                    <SkeletonList />
                )}

                {groupedEntries.length === 0 && hasLoadedOnce && (() => {
                    // When the Live Now rail filter has narrowed to a sport
                    // that's currently empty (e.g. user tapped Basketball
                    // when nothing is in-play), say so directly. Otherwise
                    // fall back to the generic "no matches" copy used for
                    // the all-sports board.
                    const activeSportLabel = (statusFilter === 'live'
                        && primarySport === 'commercial-live'
                        && liveSportTab !== 'all'
                        && liveSportTab !== 'my-live')
                        ? (liveStripTabs.find(t => t.id === liveSportTab)?.label || '')
                        : '';
                    return (
                        <div style={emptyStateStyle}>
                            <i
                                className={`fa-solid ${statusFilter === 'live' ? 'fa-tv' : 'fa-calendar-xmark'}`}
                                style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5, display: 'block' }}
                            ></i>
                            <p style={{ fontSize: '13px', margin: '0 0 4px 0', color: '#999', fontWeight: '600' }}>
                                {activeSportLabel
                                    ? `No live ${activeSportLabel.toLowerCase()} games right now`
                                    : (statusFilter === 'live' ? 'No matches with live odds right now' : 'No matches with fresh odds right now')}
                            </p>
                            <p style={{ fontSize: '11px', margin: 0, color: '#bbb' }}>
                                {activeSportLabel
                                    ? 'Tap another sport or come back when a game is in-play.'
                                    : (statusFilter === 'live'
                                        ? 'In-play games appear here once their odds refresh.'
                                        : 'Refreshing — check back in a moment.')}
                            </p>
                        </div>
                    );
                })()}

                {/* Empty-period banner. Two flavors:
                      • Closed for all visible matches → honest "period is
                        over" message (no point waiting for a sync).
                      • Just no lines this cycle → reassuring "refresh
                        every 90 s" hint. */}
                {!isMultiSportView && groupedEntries.length > 0 && !activePeriodHasLines && (
                    <div style={{
                        padding: '14px 16px',
                        margin: '0 0 8px 0',
                        borderRadius: 8,
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        color: '#9a3412',
                        fontSize: 12,
                        lineHeight: 1.4,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontWeight: 800, marginBottom: 2 }}>
                            {closedPeriodIds.has(activePeriod.id)
                                ? `${activePeriod.label} has ended`
                                : `No ${activePeriod.label} lines available right now`}
                        </div>
                        <div style={{ fontSize: 11, color: '#c2410c' }}>
                            {closedPeriodIds.has(activePeriod.id)
                                ? 'Pick another period or switch back to Game.'
                                : 'Try Game or pick another period — lines refresh every 90 s.'}
                        </div>
                    </div>
                )}

                {groupedEntries.map(entry => {
                    if (entry.type === 'day') {
                        // Day header only — per-match column labels now
                        // render inside each MatchCard so every row
                        // self-describes its SPREAD / ML / TOTAL columns.
                        return <div key={entry.id} style={dayHeaderStyle}>{entry.label}</div>;
                    }
                    if (entry.type === 'league') {
                        // Single red row: league label on the left,
                        // per-sport period chips on the right. Reads
                        // its selected period from `periodBySport`
                        // keyed by sportKey so NBA-Q1 and MLB-F1 coexist
                        // without clobbering. Falls back to label-only
                        // when the sport has no useful period split.
                        const activeIdForSport = periodBySport[entry.sportKey] || 'full';
                        return (
                            <div key={entry.id} style={leagueHeaderStyle}>
                                <span style={leagueHeaderLabelStyle}>{entry.label}</span>
                                {entry.periods && (
                                    <div style={leagueHeaderPeriodsStyle}>
                                        {entry.periods.map((p) => {
                                            const isActive = p.id === activeIdForSport;
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setPeriodBySport((prev) => ({
                                                        ...prev,
                                                        [entry.sportKey]: p.id,
                                                    }))}
                                                    style={isActive ? periodTabActiveStyle : periodTabStyle}
                                                >
                                                    {p.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    return (
                        <MatchCard
                            key={entry.id}
                            match={entry.match}
                            oddsFormat={oddsFormat}
                            onAddToSlip={handleAddToSlip}
                            selectedKeys={selectedKeys}
                            visibleMarkets={visibleMarkets}
                            marketCount={marketCount}
                            onToggleFavorite={toggleFavorite}
                            teaserPoints={teaserPointsForMatch(entry.match)}
                            isTeaserMode={normalizedBetMode === 'teaser'}
                        />
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Compact live-MLB situation indicator: half-inning arrow + ordinal +
 * outs + base runners diamond. Renders to the right of the LIVE pill in
 * place of the generic `liveStatusLabel` text when ESPN ships a
 * situation block.
 *
 * Layout matches the de-facto sportsbook convention:
 *   ▲ 6TH  2 OUT  ◆◆◇
 * where the arrow points up when the away team is batting (top of
 * inning) and down for the home team. The diamond is a 3-cell square
 * (2B top, 1B right, 3B left, batter implicit at home plate). Filled
 * cells (◆) = runner on base, empty (◇) = empty.
 */
const BaseballSituationBadge = React.memo(({ situation }) => {
    if (!situation) return null;
    const { half, inningLabel, outs, bases } = situation;
    const arrow = half === 'top' ? '▲' : '▼'; // ▲ / ▼
    const arrowTitle = half === 'top' ? 'Top of inning (away batting)' : 'Bottom of inning (home batting)';
    const basesStr = typeof bases === 'string' && /^[01]{3}$/.test(bases) ? bases : null;
    const onFirst = basesStr ? basesStr[0] === '1' : false;
    const onSecond = basesStr ? basesStr[1] === '1' : false;
    const onThird = basesStr ? basesStr[2] === '1' : false;
    const outsText = outs !== null && outs !== undefined
        ? `${outs} ${outs === 1 ? 'OUT' : 'OUTS'}`
        : '';

    const cell = (filled) => ({
        width: 6,
        height: 6,
        background: filled ? '#f59e0b' : 'transparent',
        border: '1px solid #f59e0b',
        transform: 'rotate(45deg)',
        display: 'inline-block',
    });

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                color: '#ef4444',
                letterSpacing: 0.2,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
            }}
            aria-label={`${arrowTitle}, ${inningLabel} inning, ${outsText || 'no outs'}`}
        >
            <span title={arrowTitle} style={{ fontSize: 10, lineHeight: 1 }}>{arrow}</span>
            <span>{inningLabel} INN</span>
            {outsText && <span>{outsText}</span>}
            {basesStr && (
                <span
                    title="Base runners"
                    style={{
                        position: 'relative',
                        width: 18,
                        height: 14,
                        display: 'inline-block',
                    }}
                >
                    {/* 2B — top */}
                    <span style={{ ...cell(onSecond), position: 'absolute', top: 0, left: 6 }} />
                    {/* 1B — right */}
                    <span style={{ ...cell(onFirst), position: 'absolute', top: 5, left: 11 }} />
                    {/* 3B — left */}
                    <span style={{ ...cell(onThird), position: 'absolute', top: 5, left: 1 }} />
                </span>
            )}
        </span>
    );
});
BaseballSituationBadge.displayName = 'BaseballSituationBadge';

const matchCardSignature = (match) => {
    const odds = match?.odds || {};
    const broadcast = match?.broadcast || {};
    return [
        match?.id,
        match?.externalId,
        match?.team1,
        match?.team2,
        match?.team1Short,
        match?.team2Short,
        match?.team1Record,
        match?.team2Record,
        match?.timeDisplay,
        match?.time,
        match?.status,
        match?.isLive,
        match?.liveStatusLabel,
        // Baseball live situation: the diamond / outs / arrow must
        // repaint when the half flips, an out is recorded, or a runner
        // advances. Without these, a pitch-by-pitch ESPN tick wouldn't
        // bust the memo and the card would freeze on a stale situation.
        match?.baseballSituation?.half,
        match?.baseballSituation?.inning,
        match?.baseballSituation?.outs,
        match?.baseballSituation?.bases,
        // Score signature — without these, a tick from 84→85 doesn't
        // re-render the card because React.memo only ever sees the
        // same `match` prop identity but different inner values.
        match?.team1Score,
        match?.team2Score,
        match?.lastOddsSyncAt,
        match?.isBettable,
        match?.bettingBlockedReason,
        match?.eventName,
        match?.broadcastTime,
        broadcast?.name,
        broadcast?.raw,
        broadcast?.bg,
        broadcast?.fg,
        odds?.spreadAwayPoint,
        odds?.spreadAwayPrice,
        odds?.moneylineAway,
        odds?.totalPoint,
        odds?.totalOverPrice,
        odds?.spreadHomePoint,
        odds?.spreadHomePrice,
        odds?.moneylineHome,
        odds?.totalUnderPrice,
        match?.rotation?.away,
        match?.rotation?.home,
    ].join('|');
};

const matchCardSelectionSnapshot = (match, selectedKeys) => {
    if (!match?.id || !selectedKeys) return '';
    const key = (marketType, selection) => `${match.id}|${marketType}|${selection}`;
    return [
        selectedKeys.has(key('spreads', match.team1)),
        selectedKeys.has(key('spreads', match.team2)),
        selectedKeys.has(key('h2h', match.team1)),
        selectedKeys.has(key('h2h', match.team2)),
        selectedKeys.has(key('totals', 'Over')),
        selectedKeys.has(key('totals', 'Under')),
    ].join('|');
};

const areMatchCardPropsEqual = (prevProps, nextProps) => {
    if (prevProps.oddsFormat !== nextProps.oddsFormat) return false;
    if (prevProps.marketCount !== nextProps.marketCount) return false;
    // Teaser-points re-render trigger. When the user picks 6→6.5 or
    // changes type, the resolved points number changes per match and
    // every spread/total label needs to recompute.
    if ((prevProps.teaserPoints || 0) !== (nextProps.teaserPoints || 0)) return false;
    if (Boolean(prevProps.isTeaserMode) !== Boolean(nextProps.isTeaserMode)) return false;
    if (
        prevProps.visibleMarkets?.showSpread !== nextProps.visibleMarkets?.showSpread ||
        prevProps.visibleMarkets?.showMoneyline !== nextProps.visibleMarkets?.showMoneyline ||
        prevProps.visibleMarkets?.showTotals !== nextProps.visibleMarkets?.showTotals
    ) return false;

    const sameSelection = matchCardSelectionSnapshot(prevProps.match, prevProps.selectedKeys) ===
        matchCardSelectionSnapshot(nextProps.match, nextProps.selectedKeys);
    if (!sameSelection) return false;

    if (prevProps.match === nextProps.match) return true;
    return matchCardSignature(prevProps.match) === matchCardSignature(nextProps.match);
};

const MatchCard = React.memo(({ match, oddsFormat, onAddToSlip, selectedKeys, visibleMarkets, marketCount, onToggleFavorite, teaserPoints = 0, isTeaserMode = false }) => {
    // Per-match teaser preview helper. Returns the line number to
    // display — adjusted when teaserPoints > 0 and the market is
    // teaser-eligible, otherwise the original. Memoized through the
    // closure (parent supplies a stable teaserPoints number per match)
    // so we don't allocate a new helper on every render.
    const teaserPreview = React.useMemo(() => {
        const points = Number(teaserPoints) || 0;
        if (points <= 0) {
            return {
                spread: (raw) => raw,
                total: (raw) => raw,
            };
        }
        return {
            spread: (raw) => {
                const adj = adjustSpread({ marketType: 'spreads', point: raw }, points);
                return adj ? adj.adjustedPoint : raw;
            },
            total: (raw, side) => {
                const adj = adjustSpread({ marketType: 'totals', selection: side, point: raw }, points);
                return adj ? adj.adjustedPoint : raw;
            },
        };
    }, [teaserPoints]);
    // Display matchup uses full names; not a key (dedupe keys on matchId +
    // marketType + the short selection, never matchName).
    const matchName = `${match.team1Full || match.team1} vs ${match.team2Full || match.team2}`;
    const blocked = match.isBettable === false;
    const rotationAway = match.rotation?.away;
    const rotationHome = match.rotation?.home;
    const blockedReason = blocked
        ? (match.bettingBlockedReason || 'Betting is temporarily unavailable for this event.')
        : null;
    const isSelected = (marketType, selection) => selectedKeys.has(`${match.id}|${marketType}|${selection}`);
    // 1st-inning totals at 0.5 IS the NRFI/YRFI market — relabel chips so bettors
    // recognise it. Selection name stays "Over"/"Under" for settlement (totals
    // resolution in SportsbookBetSupport::selectionResult matches on substring
    // "over"; "YRFI"/"NRFI" would both fall through to the Under branch).
    const isNrfiContext = Number(match?.odds?.totalPoint) === 0.5
        && String(match?.sportKey || match?.sport || '').toLowerCase().startsWith('baseball');
    const totalsMarketLabel = isNrfiContext ? 'NRFI/YRFI' : 'Total';
    const totalsOverDisplay = isNrfiContext
        ? 'YRFI'
        : (match.odds.totalPoint === null ? '—' : `O ${formatLineValue(teaserPreview.total(match.odds.totalPoint, 'Over'))}`);
    const totalsUnderDisplay = isNrfiContext
        ? 'NRFI'
        : (match.odds.totalPoint === null ? '—' : `U ${formatLineValue(teaserPreview.total(match.odds.totalPoint, 'Under'))}`);
    const addIfAllowed = (...args) => {
        if (blocked) return;
        // Resolve the leg's full DISPLAY name from the short selection (args[1])
        // — team markets map to the full "City Mascot"; Over/Under pass through.
        // The short selection itself is unchanged, so the placement match key
        // is untouched.
        const selArg = args[1];
        const selectionFull = selArg === match.team1
            ? (match.team1Full || selArg)
            : (selArg === match.team2 ? (match.team2Full || selArg) : selArg);
        // Inject isLive + sportKey once per card so every odds-button
        // click on this match carries them through to the slip without
        // changing each onClick's signature. sportKey lets the betslip
        // enforce per-mode sport rules (e.g. teaser only allows football
        // and basketball) without round-tripping the matchId.
        onAddToSlip(...args, {
            isLive: !!match.isLive,
            sportKey: String(match?.sportKey || match?.sport || '').toLowerCase(),
            selectionFull,
        });
    };
    const [propsOpen, setPropsOpen] = React.useState(false);
    const [detailOpen, setDetailOpen] = React.useState(false);
    const modalMatch = React.useMemo(() => ({
        id: match.id,
        externalId: match.externalId,
        homeTeam: match.team2,
        awayTeam: match.team1,
        homeTeamFull: match.team2Full,
        awayTeamFull: match.team1Full,
        odds: match.odds,
    }), [match.id, match.externalId, match.team1, match.team2, match.team1Full, match.team2Full, match.odds]);
    return (
        <div style={matchCardStyle}>
            {/* Broadcast row sits at the very top so the player sees
                "[TIME] EST - [GAME CONTEXT] - [NETWORK]" before scanning
                team rows. Rendered whenever ESPN returned an event
                name OR a recognized network chip — the EST broadcast
                time alone wouldn't gate it (every game has a startTime,
                so that would render the strip for every row), but once
                a real piece of broadcast metadata is present we surface
                the time alongside it. The chip is still gated on the
                resolved brand so unknown RSN strings never render as a
                styled placeholder; in that case the row degrades to
                just "[TIME] EST - [EVENT NAME]". */}
            {(match.broadcast || match.eventName) ? (
                <div style={broadcastRowStyle}>
                    <span style={broadcastTextStyle}>
                        {match.broadcastTime}
                        {match.eventName ? (
                            <>
                                {match.broadcastTime ? <span style={broadcastSepStyle}> - </span> : null}
                                <span style={broadcastContextStyle}>{match.eventName.toUpperCase()}</span>
                            </>
                        ) : null}
                    </span>
                    {match.broadcast ? (
                        <span
                            style={{
                                ...broadcastChipStyle,
                                background: match.broadcast.bg,
                                color: match.broadcast.fg,
                            }}
                            title={match.broadcast.raw}
                        >
                            {match.broadcast.name}
                        </span>
                    ) : null}
                </div>
            ) : null}

            {/* Combined header row: live dot + date on the left,
                SPREAD / ML / TOTAL labels aligned with the odds
                columns below. Trailing empty slot matches the
                compact action column on the right (dropped in
                teaser mode since +/P+ are hidden there). */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `minmax(0, 1fr) ${Array.from({ length: marketCount }, () => '54px').join(' ')}${isTeaserMode ? '' : ' 30px'}`,
                columnGap: 4,
                padding: '0 0 4px',
                alignItems: 'center',
            }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                    {match.isLive ? (
                        // Stale-live: swap the red Live pill for a gray
                        // Suspended pill, and drop the period/clock label
                        // (which is computed from the same potentially
                        // stale feed). The score numbers stay visible —
                        // the player wants to see the score even when
                        // betting is suspended.
                        match.isLiveStale ? (
                            <span
                                aria-label="Betting suspended"
                                title={match.bettingBlockedReason || 'Odds are stale — betting suspended'}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: '#5a5a5a',
                                    color: '#fff',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    letterSpacing: 0.5,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    textTransform: 'uppercase',
                                    lineHeight: 1,
                                }}
                            >
                                Suspended
                            </span>
                        ) : (
                            <>
                                <span
                                    aria-label="Live"
                                    title="Live"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        background: '#ef4444',
                                        color: '#fff',
                                        fontSize: 9,
                                        fontWeight: 800,
                                        letterSpacing: 0.5,
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        textTransform: 'uppercase',
                                        lineHeight: 1,
                                    }}
                                >
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: 6,
                                            height: 6,
                                            borderRadius: 999,
                                            background: '#fff',
                                        }}
                                    />
                                    Live
                                </span>
                                {match.baseballSituation ? (
                                    <BaseballSituationBadge situation={match.baseballSituation} />
                                ) : (
                                    match.liveStatusLabel && (
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#ef4444',
                                            letterSpacing: 0.2,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}>
                                            {match.liveStatusLabel}
                                        </span>
                                    )
                                )}
                            </>
                        )
                    ) : (
                        <span style={matchTimeStyle}>{match.timeDisplay || match.time}</span>
                    )}
                    <OddsAge timestamp={match.lastOddsSyncAt} live={(match.status || '').toString().toLowerCase() === 'live'} />
                </span>
                {visibleMarkets.showSpread && <span style={columnLabelStyle}>Spread</span>}
                {visibleMarkets.showMoneyline && <span style={columnLabelStyle}>ML</span>}
                {visibleMarkets.showTotals && <span style={columnLabelStyle}>Total</span>}
                {!isTeaserMode && <span />}
            </div>
            {propsOpen && (
                <PropBuilderModal match={modalMatch} onClose={() => setPropsOpen(false)} />
            )}
            {detailOpen && (
                <MatchDetailView
                    match={modalMatch}
                    onClose={() => setDetailOpen(false)}
                />
            )}

            {/* Body: team info | odds | [+ / P+] compact action
                column. Action column is narrow (30px) so the three odds
                columns never get squeezed. Dropped in teaser mode. */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `minmax(0, 1fr) ${Array.from({ length: marketCount }, () => '54px').join(' ')}${isTeaserMode ? '' : ' 30px'}`,
                gridTemplateRows: 'auto auto',
                columnGap: 4,
                rowGap: 4,
                alignItems: 'center',
                padding: '2px 0 8px',
            }}>
                <div style={{ ...teamCellStyle, gridColumn: 1, gridRow: 1 }}>
                    <TeamAvatar team={match.team1} sportKey={match.sportKey} sport={match.sport} abbr={match.team1Short} />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        {rotationAway != null && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#9aa' }}>{rotationAway}</span>
                        )}
                        <span style={{ ...teamNameStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {match.team1Full || match.team1Short || match.team1}
                                {match.team1Record && (
                                    <span style={teamRecordStyle}> ({match.team1Record})</span>
                                )}
                            </span>
                            {match.isLive && match.team1Score !== null && match.team1Score !== undefined && (
                                <span style={liveScoreStyle} aria-label={`${match.team1Short || match.team1} score`}>
                                    {match.team1Score}
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                {visibleMarkets.showSpread && (
                    <OddsCell
                        disabled={blocked || match.odds.spreadAwayPrice === null}
                        selected={isSelected('spreads', match.team1) && !blocked}
                        main={formatLineValue(teaserPreview.spread(match.odds.spreadAwayPoint), { signed: true })}
                        juice={formatOdds(match.odds.spreadAwayPrice, oddsFormat)}
                        title={teaserPoints > 0 && Number.isFinite(Number(match.odds.spreadAwayPoint))
                            ? `Was ${formatLineValue(match.odds.spreadAwayPoint, { signed: true })} (teaser +${teaserPoints})`
                            : undefined}
                        onClick={() => addIfAllowed(match.id, match.team1, 'spreads', match.odds.spreadAwayPrice, matchName, 'Spread', match.odds.spreadAwayPoint)}
                    />
                )}
                {visibleMarkets.showMoneyline && (
                    <OddsCell
                        disabled={blocked || match.odds.moneylineAway === null}
                        selected={isSelected('h2h', match.team1) && !blocked}
                        main={formatOdds(match.odds.moneylineAway, oddsFormat)}
                        juice=""
                        onClick={() => addIfAllowed(match.id, match.team1, 'h2h', match.odds.moneylineAway, matchName, 'Moneyline', null)}
                    />
                )}
                {visibleMarkets.showTotals && (
                    <OddsCell
                        disabled={blocked || match.odds.totalOverPrice === null}
                        selected={isSelected('totals', 'Over') && !blocked}
                        main={totalsOverDisplay}
                        juice={formatOdds(match.odds.totalOverPrice, oddsFormat)}
                        title={teaserPoints > 0 && match.odds.totalPoint !== null
                            ? `Was O ${formatLineValue(match.odds.totalPoint)} (teaser −${teaserPoints})`
                            : undefined}
                        onClick={() => addIfAllowed(match.id, 'Over', 'totals', match.odds.totalOverPrice, matchName, totalsMarketLabel, match.odds.totalPoint)}
                    />
                )}

                {/* Right-column action stack — spans both team rows so
                    both buttons sit vertically centered against the
                    odds grid: `+` (all markets), `P+` (player props).
                    Grid auto-placement fills the cell left over after
                    team1's odds, so we anchor with grid-row 1 / span 2
                    to reserve the full column. Hidden in teaser mode:
                    teasers can only combine spread/total legs, so the
                    all-markets and player-props pickers are dead ends. */}
                {!isTeaserMode && (
                <div style={{
                    // Column 1 = team info, cols 2..(2+marketCount-1) = odds,
                    // col (marketCount + 2) = action stack. Using an
                    // explicit number (not `-1`) so auto-placement of the
                    // odds cells doesn't leak into the action slot.
                    gridColumn: marketCount + 2,
                    gridRow: '1 / span 2',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 3,
                }}>
                    <button
                        type="button"
                        onClick={() => setDetailOpen(true)}
                        disabled={blocked}
                        aria-label="Open all markets"
                        title="All game markets"
                        style={{
                            background: blocked ? '#444' : '#d0451b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            width: 28,
                            height: 18,
                            fontSize: 11,
                            fontWeight: 700,
                            lineHeight: 1,
                            cursor: blocked ? 'not-allowed' : 'pointer',
                            opacity: blocked ? 0.5 : 1,
                            padding: 0,
                        }}
                    >+</button>
                    <button
                        type="button"
                        onClick={() => setPropsOpen(true)}
                        disabled={blocked}
                        aria-label="Open prop builder"
                        title="Player props"
                        style={{
                            background: blocked ? '#444' : 'linear-gradient(135deg, #a020f0, #d946ef)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            width: 28,
                            height: 18,
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: 0.2,
                            lineHeight: 1,
                            cursor: blocked ? 'not-allowed' : 'pointer',
                            opacity: blocked ? 0.5 : 1,
                            padding: 0,
                        }}
                    >P+</button>
                </div>
                )}

                <div style={{ ...teamCellStyle, gridColumn: 1, gridRow: 2 }}>
                    <TeamAvatar team={match.team2} sportKey={match.sportKey} sport={match.sport} abbr={match.team2Short} />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        {rotationHome != null && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#9aa' }}>{rotationHome}</span>
                        )}
                        <span style={{ ...teamNameStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {match.team2Full || match.team2Short || match.team2}
                                {match.team2Record && (
                                    <span style={teamRecordStyle}> ({match.team2Record})</span>
                                )}
                            </span>
                            {match.isLive && match.team2Score !== null && match.team2Score !== undefined && (
                                <span style={liveScoreStyle} aria-label={`${match.team2Short || match.team2} score`}>
                                    {match.team2Score}
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                {visibleMarkets.showSpread && (
                    <OddsCell
                        disabled={blocked || match.odds.spreadHomePrice === null}
                        selected={isSelected('spreads', match.team2) && !blocked}
                        main={formatLineValue(teaserPreview.spread(match.odds.spreadHomePoint), { signed: true })}
                        juice={formatOdds(match.odds.spreadHomePrice, oddsFormat)}
                        title={teaserPoints > 0 && Number.isFinite(Number(match.odds.spreadHomePoint))
                            ? `Was ${formatLineValue(match.odds.spreadHomePoint, { signed: true })} (teaser +${teaserPoints})`
                            : undefined}
                        onClick={() => addIfAllowed(match.id, match.team2, 'spreads', match.odds.spreadHomePrice, matchName, 'Spread', match.odds.spreadHomePoint)}
                    />
                )}
                {visibleMarkets.showMoneyline && (
                    <OddsCell
                        disabled={blocked || match.odds.moneylineHome === null}
                        selected={isSelected('h2h', match.team2) && !blocked}
                        main={formatOdds(match.odds.moneylineHome, oddsFormat)}
                        juice=""
                        onClick={() => addIfAllowed(match.id, match.team2, 'h2h', match.odds.moneylineHome, matchName, 'Moneyline', null)}
                    />
                )}
                {visibleMarkets.showTotals && (
                    <OddsCell
                        disabled={blocked || match.odds.totalUnderPrice === null}
                        selected={isSelected('totals', 'Under') && !blocked}
                        main={totalsUnderDisplay}
                        juice={formatOdds(match.odds.totalUnderPrice, oddsFormat)}
                        title={teaserPoints > 0 && match.odds.totalPoint !== null
                            ? `Was U ${formatLineValue(match.odds.totalPoint)} (teaser +${teaserPoints})`
                            : undefined}
                        onClick={() => addIfAllowed(match.id, 'Under', 'totals', match.odds.totalUnderPrice, matchName, totalsMarketLabel, match.odds.totalPoint)}
                    />
                )}
            </div>

            {blocked && (
                <div style={blockedBannerStyle}>
                    <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6, color: '#c2410c' }} />
                    {blockedReason}
                </div>
            )}
        </div>
    );
}, areMatchCardPropsEqual);

const TeamAvatar = ({ team, sportKey, sport, abbr }) => {
    // Start with whatever the synchronous map / warm cache knows about this
    // team. If it comes back null, kick off the async TheSportsDB lookup —
    // which covers virtually every pro team/athlete worldwide — and swap
    // the img src in once it resolves. Result is cached for 24h in
    // localStorage, so subsequent renders for the same team are instant.
    //
    // ctx carries sport + abbreviation so live "city-only" rows (e.g.
    // "Boston"/"BOS") resolve to the right league's ESPN badge instead of
    // the wrong sport via the name-only search.
    const ctx = { sportKey, sport, abbr };
    const [logoUrl, setLogoUrl] = React.useState(() => logoUrlForTeam(team, ctx));
    const [imgFailed, setImgFailed] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        setImgFailed(false);
        const sync = logoUrlForTeam(team, { sportKey, sport, abbr });
        if (sync) {
            setLogoUrl(sync);
            return undefined;
        }
        setLogoUrl(null);
        fetchTeamBadgeUrl(team, { sportKey, sport, abbr }).then((url) => {
            if (cancelled) return;
            // TheSportsDB misses fall back to the initials data-URI;
            // leave the colored circle for those to keep load times snappy.
            if (url && !url.startsWith('data:')) setLogoUrl(url);
        }).catch(() => { /* swallow — already falls back below */ });
        return () => { cancelled = true; };
    }, [team, sportKey, sport, abbr]);

    const showImage = logoUrl && !imgFailed;
    if (showImage) {
        return (
            <img
                src={logoUrl}
                alt=""
                width="32"
                height="32"
                loading="lazy"
                decoding="async"
                onError={() => setImgFailed(true)}
                style={avatarImageStyle}
            />
        );
    }
    return (
        <div style={{ ...avatarStyle, background: colorForTeam(team) }}>
            {initialsForName(team)}
        </div>
    );
};

const TeamRow = ({ team, rotation, spreadLine, spreadPrice, moneyline, totalLabel, totalLine, totalPrice, oddsFormat, forceDisabled, spreadSelected, mlSelected, totalSelected, visibleMarkets, marketCount, onSpreadClick, onMoneylineClick, onTotalClick }) => (
    <div style={teamRowStyleFor(marketCount)}>
        <div style={teamCellStyle}>
            <TeamAvatar team={team} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {rotation != null && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9aa' }}>{rotation}</span>
                )}
                <span style={teamNameStyle}>{team}</span>
            </div>
        </div>
        {visibleMarkets.showSpread && (
            <OddsCell
                disabled={forceDisabled || spreadPrice === null}
                selected={spreadSelected && !forceDisabled}
                main={formatLineValue(spreadLine, { signed: true })}
                juice={formatOdds(spreadPrice, oddsFormat)}
                onClick={onSpreadClick}
            />
        )}
        {visibleMarkets.showMoneyline && (
            <OddsCell
                disabled={forceDisabled || moneyline === null}
                selected={mlSelected && !forceDisabled}
                main={formatOdds(moneyline, oddsFormat)}
                juice=""
                onClick={onMoneylineClick}
            />
        )}
        {visibleMarkets.showTotals && (
            <OddsCell
                disabled={forceDisabled || totalPrice === null}
                selected={totalSelected && !forceDisabled}
                main={totalLine === null ? '—' : `${totalLabel} ${formatLineValue(totalLine)}`}
                juice={formatOdds(totalPrice, oddsFormat)}
                onClick={onTotalClick}
            />
        )}
    </div>
);

const SkeletonList = () => (
    <div aria-busy="true" aria-label="Loading odds">
        {[0, 1, 2].map(i => (
            <div key={i} style={skeletonCardStyle}>
                <div style={{ ...skeletonBarStyle, width: '40%', height: 12 }} />
                <div style={skeletonRowStyle}>
                    <div style={{ ...skeletonBarStyle, width: 28, height: 28 }} />
                    <div style={{ ...skeletonBarStyle, flex: 1, height: 12 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                </div>
                <div style={skeletonRowStyle}>
                    <div style={{ ...skeletonBarStyle, width: 28, height: 28 }} />
                    <div style={{ ...skeletonBarStyle, flex: 1, height: 12 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                </div>
            </div>
        ))}
    </div>
);

const OddsCell = ({ disabled, selected, main, juice, onClick }) => (
    <button
        style={disabled ? oddsCellDisabledStyle : (selected ? oddsCellSelectedStyle : oddsCellStyle)}
        onClick={onClick}
        disabled={disabled}
    >
        <span style={selected && !disabled ? oddsCellMainSelectedStyle : oddsCellMainStyle}>{disabled ? '—' : main}</span>
        {!disabled && juice ? <span style={selected ? oddsCellJuiceSelectedStyle : oddsCellJuiceStyle}>{juice}</span> : null}
    </button>
);

// ── Styles ────────────────────────────────────────────────

const containerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f4f5f7',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
};

const sportHeaderStyle = {
    padding: '12px 14px',
    backgroundColor: '#ff5051',
    borderBottom: '1px solid #ff5051',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
};

const sportTitleStyle = { fontSize: '15px', fontWeight: 700, color: '#fff', lineHeight: 1.3 };
const sportSubtitleStyle = { fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginTop: '2px', letterSpacing: '0.2px' };
const emptyStateStyle = { textAlign: 'center', padding: '60px 20px', color: '#bbb' };

const refreshButtonStyle = {
    border: 'none',
    background: '#fff',
    color: '#ff5051',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
    fontSize: '11px',
    fontWeight: 700,
    padding: '6px 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
};
const refreshButtonStaleStyle = {
    ...refreshButtonStyle,
    background: '#fff7ed',
    borderColor: '#f97316',
    color: '#c2410c',
};

// Sticky offset for the period/league headers. These live INSIDE
// MobileContentView's own scroll container (containerStyle: overflowY:auto),
// which is a flex child of .dashboard-content-area sitting directly BELOW the
// header chrome (balance bar + STRAIGHT/PARLAY tabs). position:sticky `top` is
// measured from that scroll container's top edge — already under the chrome —
// so the correct offset is 0. (A previous 124px value assumed page-level scroll
// under a fixed header; with the current nested-scroll flex layout that pushed
// the headers ~124px down into the middle of the list.) 0 also auto-adapts to
// any chrome-height change since the content-area always renders below it.
const MOBILE_STICKY_TOP = 0;

const periodTabBarStyle = {
    display: 'flex',
    gap: 8,
    padding: '10px 14px 12px',
    margin: '6px 0',
    // Red background matches the sport header band (#ff5051) above so the
    // chip strip reads as one continuous header rather than a separate
    // white strip beneath it. Slight rounding softens the bar into a
    // contained block instead of a flat full-bleed strip.
    background: '#ff5051',
    borderRadius: 8,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    // Sticky so the period chips (Game / F1-F7 / Q1-Q4) stay reachable and
    // bettable while the user scrolls the live list. Pinned at
    // MOBILE_STICKY_TOP = the fixed .mobile-header-container height. A prior
    // attempt used top:0 and clipped the chips BEHIND that fixed header;
    // offsetting by the header height fixes it. zIndex keeps match cards
    // scrolling underneath.
    position: 'sticky',
    top: MOBILE_STICKY_TOP,
    zIndex: 20,
    flexShrink: 0,
};

// Live Now sport rail — dark sportsbook-style strip with vivid color
// emoji over a short text label, plus a tiny corner count badge on the
// icon so the player can scan "what's live + how much of it" at once.
// Active tab marked by an amber underline + amber label; empty tabs
// grayscale the icon and dim opacity to read as "we have basketball
// but nothing's live right now" at a glance.
const liveFilterStripStyle = {
    display: 'flex',
    width: '100%',
    height: 72,
    flexShrink: 0,
    overflowX: 'auto',
    background: 'linear-gradient(180deg, #262626 0%, #1a1a1a 100%)',
    borderTop: '1px solid #2d2d2d',
    borderBottom: '1px solid #2d2d2d',
    boxSizing: 'border-box',
    WebkitOverflowScrolling: 'touch',
};
const liveFilterPillStyle = {
    flex: '0 0 auto',
    minWidth: 72,
    padding: '6px 10px 4px',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: '#fff',
    transition: 'opacity 100ms ease, border-color 120ms ease',
    gap: 4,
};
const liveFilterIconWrapStyle = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
};
const liveFilterCountBadgeStyle = (active) => ({
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    padding: '0 4px',
    borderRadius: 8,
    background: active ? '#fbbf24' : 'rgba(255,255,255,0.18)',
    color: active ? '#1a1a1a' : '#fff',
    fontSize: 9,
    fontWeight: 800,
    lineHeight: '16px',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
    boxSizing: 'border-box',
    letterSpacing: 0.2,
});
const liveFilterPillLabelStyle = (active) => ({
    fontSize: 10.5,
    fontWeight: 700,
    color: active ? '#fbbf24' : 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    lineHeight: 1,
});
const liveLeagueStripStyle = {
    display: 'flex',
    gap: 6,
    flexShrink: 0,
    overflowX: 'auto',
    background: '#fff',
    padding: '8px 10px',
    borderBottom: '1px solid #e5e7eb',
    WebkitOverflowScrolling: 'touch',
};
const liveLeaguePillStyle = (active) => ({
    flex: '0 0 auto',
    padding: '6px 12px',
    border: active ? '1px solid #ff5051' : '1px solid #d1d5db',
    background: active ? '#ff5051' : '#f9fafb',
    color: active ? '#fff' : '#374151',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    letterSpacing: 0.2,
    transition: 'background 100ms ease, color 100ms ease, border-color 100ms ease',
});
const liveLeaguePillCountStyle = {
    display: 'inline-block',
    minWidth: 18,
    padding: '0 5px',
    background: 'rgba(0,0,0,0.18)',
    color: 'inherit',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    lineHeight: '16px',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
};
const periodTabStyle = {
    padding: '7px 18px',
    border: 'none',
    // Sit on the red bar — inactive chips are a translucent dark pill so
    // they read as muted-but-tappable against the surrounding red, and
    // the active chip (white background, red text) pops clearly.
    background: 'rgba(0, 0, 0, 0.18)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    borderRadius: 0,
    letterSpacing: 0.3,
    transition: 'background-color 120ms ease, color 120ms ease, transform 120ms ease',
};
const periodTabActiveStyle = {
    ...periodTabStyle,
    background: '#fff',
    color: '#ff5051',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
};

const dayHeaderStyle = {
    padding: '10px 16px',
    background: '#595959',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
};

const leagueHeaderStyle = {
    display: 'flex',
    alignItems: 'stretch',
    gap: 10,
    padding: '6px 10px 6px 14px',
    background: '#ff5051',
    color: '#fff',
    // Sticky section header: each sport's row (label pill + its period chips)
    // pins below the fixed mobile header while you scroll that sport's games;
    // the next sport's header scrolls up and pushes it out of view, taking
    // over (iOS-style section headers). Pinned at MOBILE_STICKY_TOP so it
    // clears the fixed chrome (a prior top:0 attempt clipped it behind it).
    position: 'sticky',
    top: MOBILE_STICKY_TOP,
    zIndex: 20,
    flexShrink: 0,
    minHeight: 40,
};
const leagueHeaderLabelStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flexShrink: 0,
    padding: '7px 18px',
    background: '#fff',
    color: '#ff5051',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
};
const leagueHeaderPeriodsStyle = {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
};

const matchCardStyle = {
    background: '#fff',
    padding: '8px 12px 10px',
    borderBottom: '1px solid #e5e7eb',
};

const matchHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
};

const matchTimeStyle = { fontSize: '11px', color: '#6b7280', fontWeight: 600, letterSpacing: '0.2px' };

const baseBadgeStyle = {
    color: '#fff',
    padding: '2px 8px',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.5px',
};
const upcomingBadgeStyle = { ...baseBadgeStyle, background: '#78909c' };
const liveBadgeStyle = { ...baseBadgeStyle, background: '#2e7d32' };

const gridTemplateForMarketCount = (marketCount) => {
    const count = Math.max(1, Number(marketCount) || 1);
    return `minmax(0, 1fr) ${Array.from({ length: count }, () => '54px').join(' ')}`;
};

const columnHeaderBaseStyle = {
    display: 'grid',
    gap: '4px',
    padding: '8px 12px 6px',
    alignItems: 'center',
    background: '#fff',
    borderBottom: '1px solid #f1f5f9',
};
const columnHeaderStyleFor = (marketCount) => ({
    ...columnHeaderBaseStyle,
    gridTemplateColumns: gridTemplateForMarketCount(marketCount),
});
const columnLabelStyle = {
    fontSize: '11px',
    fontWeight: 600,
    color: '#999',
    textAlign: 'center',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
};

const teamRowBaseStyle = {
    display: 'grid',
    gap: '4px',
    alignItems: 'center',
    padding: '4px 0',
};
const teamRowStyleFor = (marketCount) => ({
    ...teamRowBaseStyle,
    gridTemplateColumns: gridTemplateForMarketCount(marketCount),
});

const teamCellStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
};

const avatarStyle = {
    width: '28px',
    height: '28px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.3px',
};

const avatarImageStyle = {
    width: '28px',
    height: '28px',
    flexShrink: 0,
    objectFit: 'contain',
    display: 'block',
};

const teamNameStyle = {
    flex: 1,
    minWidth: 0,
    fontSize: '11px',
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.2,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
    wordBreak: 'break-word',
};

const teamRecordStyle = {
    color: '#9ca3af',
    fontWeight: 500,
    fontSize: '10px',
    marginLeft: 2,
};

// Live score chip rendered to the right of each team name on the
// match card. Uses tabular-nums so a two-digit → three-digit score
// transition doesn't shift the team name horizontally (the column
// keeps its layout while scores tick). Color matches the LIVE chip's
// red so the eye reads the badge + score as one unit.
const liveScoreStyle = {
    fontSize: 14,
    fontWeight: 800,
    color: '#ef4444',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
    lineHeight: 1.1,
};

// Broadcast row styles for the mobile match card. Light background +
// green time text mirrors the reference book; the chip on the right
// uses brand colors picked by resolveBroadcast().
const broadcastRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    padding: '6px 4px 4px',
    fontSize: 11,
    lineHeight: 1.2,
    borderBottom: '1px solid #f1f5f9',
    marginBottom: 4,
    minWidth: 0,
};
const broadcastTextStyle = {
    color: '#166534',
    fontWeight: 700,
    flex: '1 1 auto',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};
const broadcastSepStyle = { color: '#64748b', fontWeight: 600 };
const broadcastContextStyle = { color: '#0f172a', fontWeight: 700 };
const broadcastChipStyle = {
    flex: '0 0 auto',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 7px',
    borderRadius: 4,
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: 0.04,
    textTransform: 'uppercase',
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
};

const oddsCellStyle = {
    height: '40px',
    padding: '4px 6px',
    background: '#f5f5f5',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
    transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
    minWidth: 0,
};
const oddsCellDisabledStyle = {
    ...oddsCellStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
    background: '#f9fafb',
};
const oddsCellSelectedStyle = {
    ...oddsCellStyle,
    background: '#ff5051',
    borderColor: '#ff5051',
};
const oddsCellMainStyle = { fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' };
const oddsCellJuiceStyle = { fontSize: '11px', fontWeight: 500, color: '#666', whiteSpace: 'nowrap' };
const oddsCellMainSelectedStyle = { ...oddsCellMainStyle, color: '#fff' };
const oddsCellJuiceSelectedStyle = { ...oddsCellJuiceStyle, color: '#ffe4e1' };

const blockedBannerStyle = {
    marginTop: 8,
    padding: '8px 10px',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#9a3412',
    fontSize: 11,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1.3,
};

const updatingBannerStyle = {
    padding: '6px 12px',
    background: '#eff6ff',
    borderBottom: '1px solid #dbeafe',
    color: '#1d4ed8',
    fontSize: '11px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
};

const degradedBannerStyle = {
    padding: '6px 12px',
    background: '#fffbeb',
    borderBottom: '1px solid #fbbf24',
    color: '#92400e',
    fontSize: '11px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
};

const skeletonCardStyle = {
    background: '#fff',
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
};
const skeletonRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
};
const skeletonBarStyle = {
    background: '#e5e7eb',
    animation: 'mcvShimmer 1.2s linear infinite',
};

if (typeof document !== 'undefined' && !document.getElementById('mcv-skeleton-keyframes')) {
    const el = document.createElement('style');
    el.id = 'mcv-skeleton-keyframes';
    el.textContent = '@keyframes mcvShimmer { 0% { opacity: 0.6 } 50% { opacity: 1 } 100% { opacity: 0.6 } }';
    document.head.appendChild(el);
}

export default MobileContentView;
