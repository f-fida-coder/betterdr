/**
 * Sportsbook navigation data — single source of truth for desktop and mobile.
 *
 * DATA INTEGRITY:
 *   Only children whose sportKeys include a key from CONFIGURED_SPORT_KEYS
 *   will be shown in the sidebar. Children referencing unconfigured keys are
 *   kept in the tree (for future activation) but hidden by filterActiveChildren().
 *
 *   Items marked type: 'futures' or type: 'props-plus' are PLACEHOLDERS:
 *   the Odds API markets config (h2h, spreads, totals) does NOT include
 *   futures/props markets. These are shown for navigation structure but
 *   will display the parent sport's standard matches until those markets
 *   are separately configured.
 *
 * Currently configured sport keys (ODDS_ALLOWED_SPORTS default):
 *   basketball_nba, americanfootball_nfl, soccer_epl, baseball_mlb, icehockey_nhl
 *
 * Currently configured markets (ODDS_API_MARKETS default):
 *   h2h, spreads, totals
 */

export const CONFIGURED_SPORT_KEYS = new Set([
    'basketball_nba',
    'americanfootball_nfl',
    'soccer_epl',
    'baseball_mlb',
    'icehockey_nhl',
]);

/** Check whether at least one of a child's sportKeys is configured. */
export const isChildActive = (child) => {
    if (!child.sportKeys) return true;
    return child.sportKeys.some(k => CONFIGURED_SPORT_KEYS.has(k));
};

export const sportsData = [
    {
        id: 'up-next',
        label: 'UP NEXT',
        icon: 'fa-solid fa-clock',
        type: 'main-link',
        selectable: true,
    },
    {
        id: 'commercial-live',
        label: 'LIVE NOW',
        icon: 'fa-solid fa-tv',
        selectable: true,
    },
    // ── BASKETBALL ────────────────────────────────────────────
    {
        id: 'basketball',
        label: 'BASKETBALL',
        icon: 'fa-solid fa-basketball',
        selectable: false,
        children: [
            { id: 'nba', label: 'NBA', selectable: true, sportKeys: ['basketball_nba'] },
            { id: 'ncaa-basketball', label: 'NCAA Basketball', selectable: true, sportKeys: ['basketball_ncaab'] },
            { id: 'wncaa-basketball', label: 'WNCAA Basketball', selectable: true, sportKeys: ['basketball_wncaab'] },
            { id: 'euroleague', label: 'Euroleague/ Chams League/ Euro Cup', selectable: true, sportKeys: ['basketball_euroleague'] },
            { id: 'wnba-futures', label: 'WNBA FUTURES', selectable: true, sportKeys: ['basketball_wnba'], type: 'futures' },
        ],
    },
    // ── BASEBALL ──────────────────────────────────────────────
    {
        id: 'baseball',
        label: 'BASEBALL',
        icon: 'fa-solid fa-baseball-bat-ball',
        selectable: false,
        children: [
            { id: 'mlb', label: 'MLB', selectable: true, sportKeys: ['baseball_mlb'] },
        ],
    },
    // ── HOCKEY ────────────────────────────────────────────────
    {
        id: 'hockey',
        label: 'HOCKEY',
        icon: 'fa-solid fa-hockey-puck',
        selectable: false,
        children: [
            { id: 'nhl', label: 'NHL', selectable: true, sportKeys: ['icehockey_nhl'] },
        ],
    },
    // ── FOOTBALL ──────────────────────────────────────────────
    {
        id: 'football',
        label: 'FOOTBALL',
        icon: 'fa-solid fa-football',
        selectable: false,
        children: [
            { id: 'nfl', label: 'NFL', selectable: true, sportKeys: ['americanfootball_nfl'] },
            { id: 'ncaa-football', label: 'NCAA Football', selectable: true, sportKeys: ['americanfootball_ncaaf'] },
        ],
    },
    // ── SOCCER ────────────────────────────────────────────────
    {
        id: 'soccer',
        label: 'SOCCER',
        icon: 'fa-solid fa-futbol',
        selectable: false,
        children: [
            { id: 'epl', label: 'Premier League', selectable: true, sportKeys: ['soccer_epl'] },
            { id: 'mls', label: 'MLS', selectable: true, sportKeys: ['soccer_usa_mls'] },
            { id: 'la-liga', label: 'La Liga', selectable: true, sportKeys: ['soccer_spain_la_liga'] },
            { id: 'serie-a', label: 'Serie A', selectable: true, sportKeys: ['soccer_italy_serie_a'] },
            { id: 'bundesliga', label: 'Bundesliga', selectable: true, sportKeys: ['soccer_germany_bundesliga'] },
            { id: 'ligue-1', label: 'Ligue 1', selectable: true, sportKeys: ['soccer_france_ligue_one'] },
            { id: 'champions-league', label: 'Champions League', selectable: true, sportKeys: ['soccer_uefa_champs_league'] },
            { id: 'europa-league', label: 'Europa League', selectable: true, sportKeys: ['soccer_uefa_europa_league'] },
        ],
    },
    // ── GOLF ──────────────────────────────────────────────────
    {
        id: 'golf',
        label: 'GOLF',
        icon: 'fa-solid fa-golf-ball-tee',
        selectable: false,
        children: [
            { id: 'pga', label: 'PGA Tour', selectable: true, sportKeys: ['golf_pga_championship'] },
            { id: 'masters', label: 'Masters / Majors', selectable: true, sportKeys: ['golf_masters_tournament_winner'] },
        ],
    },
    // ── TENNIS ────────────────────────────────────────────────
    {
        id: 'tennis',
        label: 'TENNIS',
        icon: 'fa-solid fa-table-tennis-paddle-ball',
        selectable: false,
        children: [
            { id: 'atp', label: 'ATP', selectable: true, sportKeys: ['tennis_atp_french_open', 'tennis_atp_us_open'] },
            { id: 'wta', label: 'WTA', selectable: true, sportKeys: ['tennis_wta_french_open', 'tennis_wta_us_open'] },
        ],
    },
    // ── MARTIAL ARTS ─────────────────────────────────────────
    {
        id: 'martial-arts',
        label: 'MARTIAL ARTS',
        icon: 'fa-solid fa-hand-fist',
        selectable: false,
        children: [
            { id: 'mma', label: 'UFC / MMA', selectable: true, sportKeys: ['mma_mixed_martial_arts'] },
        ],
    },
    // ── BOXING ────────────────────────────────────────────────
    {
        id: 'boxing',
        label: 'BOXING',
        icon: 'fa-solid fa-mitten',
        selectable: false,
        children: [
            { id: 'boxing-matches', label: 'Boxing Matches', selectable: true, sportKeys: ['boxing_boxing'] },
        ],
    },
    // ── AUTO RACING ───────────────────────────────────────────
    {
        id: 'auto-racing',
        label: 'AUTO RACING',
        icon: 'fa-solid fa-flag-checkered',
        selectable: false,
        children: [
            { id: 'nascar', label: 'NASCAR', selectable: true, sportKeys: ['motorsport_nascar'] },
            { id: 'formula-1', label: 'Formula 1', selectable: true, sportKeys: ['motorsport_formula_one'] },
        ],
    },
];

/**
 * For a given sport item id, return all sport_title keywords the API might use.
 * Falls back to the ID itself if no mapping exists.
 */
export const getSportKeywords = (id) => {
    if (!id) return [];
    const normalized = id.toString().toLowerCase();

    // Dynamic sidebar entries auto-injected from /api/matches/sports are
    // keyed `api-<slug-with-dashes>`. Convert back to the Odds API slug
    // so match.sportKey comparisons in consumers can succeed.
    if (normalized.startsWith('api-')) {
        const slug = normalized.slice(4).replace(/-/g, '_');
        return [slug, slug.replace(/_/g, ' ')];
    }

    const keywordMap = {
        nfl: ['nfl', 'americanfootball_nfl'],
        'ncaa-football': ['ncaaf', 'ncaa football', 'college football', 'americanfootball_ncaaf'],
        nba: ['nba', 'basketball_nba'],
        'ncaa-basketball': ['ncaab', 'ncaa basketball', 'college basketball', 'basketball_ncaab'],
        'wncaa-basketball': ['wncaa', 'women.*basketball'],
        euroleague: ['euroleague', 'euro league'],
        'wnba-futures': ['wnba'],
        mlb: ['mlb', 'baseball_mlb'],
        nhl: ['nhl', 'icehockey_nhl'],
        epl: ['epl', 'premier league', 'english premier'],
        mls: ['mls', 'major league soccer'],
        'la-liga': ['la liga', 'laliga'],
        'serie-a': ['serie a'],
        bundesliga: ['bundesliga'],
        'ligue-1': ['ligue 1'],
        'champions-league': ['champions league', 'ucl'],
        'europa-league': ['europa league'],
        pga: ['pga', 'golf'],
        masters: ['masters'],
        atp: ['atp', 'tennis'],
        wta: ['wta'],
        mma: ['mma', 'ufc', 'mixed martial'],
        'boxing-matches': ['boxing'],
        nascar: ['nascar'],
        'formula-1': ['formula 1', 'f1', 'formula one'],
        // Parent-level catch-all keywords
        football: ['nfl', 'ncaaf', 'american football', 'americanfootball'],
        basketball: ['basketball', 'nba', 'ncaab', 'euroleague'],
        baseball: ['baseball', 'mlb'],
        hockey: ['hockey', 'nhl', 'icehockey'],
        soccer: ['soccer', 'football', 'premier league', 'la liga', 'serie a', 'bundesliga', 'ligue 1', 'mls', 'champions league', 'epl'],
        golf: ['golf', 'pga'],
        tennis: ['tennis', 'atp', 'wta'],
        'martial-arts': ['mma', 'ufc', 'martial'],
        boxing: ['boxing'],
        'auto-racing': ['racing', 'motorsport', 'nascar', 'formula'],
    };

    return keywordMap[normalized] || [normalized];
};

/**
 * Map of canonical OddsAPI sportKey → human-readable league label, derived
 * from the leaf nodes in `sportsData`. Used by the multi-sport list view to
 * print "MLB Game" / "NBA Game" section headers above each league's matches.
 *
 * Lazily memoised so the first lookup builds the map once; subsequent calls
 * are O(1). Falls back to the sportKey itself (uppercased segments) when the
 * key isn't in our static tree (e.g. tennis_atp_madrid_open which is
 * auto-discovered from /v4/sports rather than hardcoded).
 */
let _sportKeyToLabel = null;
const buildSportKeyToLabel = () => {
    const map = {};
    const walk = (items) => {
        for (const item of items) {
            if (Array.isArray(item.sportKeys) && item.label) {
                for (const k of item.sportKeys) {
                    if (typeof k === 'string' && k && !map[k]) {
                        map[k.toLowerCase()] = item.label;
                    }
                }
            }
            if (item.children) walk(item.children);
        }
    };
    walk(sportsData);
    return map;
};

export const sportLabelForKey = (sportKey) => {
    const key = String(sportKey || '').toLowerCase();
    if (!key) return '';
    if (_sportKeyToLabel === null) _sportKeyToLabel = buildSportKeyToLabel();
    if (_sportKeyToLabel[key]) return _sportKeyToLabel[key];
    // Fallback for auto-discovered sports not in the static tree: title-case
    // the suffix after the family prefix. E.g. tennis_atp_madrid_open →
    // "ATP Madrid Open"; soccer_korea_kleague1 → "Korea Kleague1".
    const parts = key.split('_');
    if (parts.length <= 1) return key.toUpperCase();
    const family = parts[0];
    const rest = parts.slice(1).map(p => {
        if (p === 'atp' || p === 'wta' || p === 'nba' || p === 'nfl' || p === 'mlb' || p === 'nhl' || p === 'mls' || p === 'epl' || p === 'kbo' || p === 'cfl') {
            return p.toUpperCase();
        }
        return p.charAt(0).toUpperCase() + p.slice(1);
    }).join(' ');
    return rest || family.toUpperCase();
};

/**
 * Find an item anywhere in the sportsData tree by its id.
 */
export const findSportItemById = (id) => {
    const search = (items) => {
        for (const item of items) {
            if (item.id === id) return item;
            if (item.children) {
                const found = search(item.children);
                if (found) return found;
            }
        }
        return null;
    };
    return search(sportsData);
};

/**
 * Map an Odds API sport-key prefix (the part before the first `_`,
 * e.g. `soccer` in `soccer_argentina_primera_division`) to the parent
 * sport id used in the static sportsData tree. Used to nest leagues
 * the backend reports — but the static tree doesn't enumerate — under
 * the correct parent in the sidebar instead of promoting them to
 * flat top-level rows.
 */
const PREFIX_TO_PARENT_ID = {
    basketball: 'basketball',
    baseball: 'baseball',
    icehockey: 'hockey',
    americanfootball: 'football',
    aussierules: 'football',
    canadianfootball: 'football',
    soccer: 'soccer',
    tennis: 'tennis',
    golf: 'golf',
    mma: 'martial-arts',
    boxing: 'boxing',
    motorsport: 'auto-racing',
    cricket: 'cricket',
    rugbyleague: 'rugby',
    rugbyunion: 'rugby',
    lacrosse: 'lacrosse',
    handball: 'handball',
    volleyball: 'volleyball',
    politics: 'politics',
};

/**
 * Sport parents that aren't in the static sportsData but may be
 * reported by the backend. Spawned on demand when a backend key with
 * one of these prefixes appears in liveSet.
 */
const FALLBACK_PARENTS = {
    cricket: { id: 'cricket', label: 'CRICKET', icon: 'fa-solid fa-baseball', selectable: false },
    rugby: { id: 'rugby', label: 'RUGBY', icon: 'fa-solid fa-football', selectable: false },
    lacrosse: { id: 'lacrosse', label: 'LACROSSE', icon: 'fa-solid fa-shield', selectable: false },
    handball: { id: 'handball', label: 'HANDBALL', icon: 'fa-solid fa-volleyball', selectable: false },
    volleyball: { id: 'volleyball', label: 'VOLLEYBALL', icon: 'fa-solid fa-volleyball', selectable: false },
    politics: { id: 'politics', label: 'POLITICS', icon: 'fa-solid fa-landmark', selectable: false },
};

const ODDS_API_SPORT_KEY_RE = /^[a-z]+_[a-z0-9_]+$/;

const prettifyLeagueSuffix = (suffix) => String(suffix || '')
    .split('_')
    .filter(Boolean)
    .map((part) => (part === part.toUpperCase() ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');

/**
 * Build a sidebar tree that merges the static sportsData with leagues
 * the backend exposes via /api/matches/sports. Backend keys that the
 * static tree already covers (via child.sportKeys) are dropped — they
 * already appear under the correct parent. Anything else is routed to
 * its parent by prefix and added as a synthetic child. Static parents
 * with no children get any matching backend keys appended; fallback
 * parents (cricket, rugby, lacrosse, etc.) are spawned on demand.
 *
 * Pure: never mutates the passed-in sportsData. Returns a new array.
 */
export const buildMergedSportsTree = (liveSet) => {
    const baseTree = sportsData.map((sport) => ({
        ...sport,
        children: Array.isArray(sport.children) ? [...sport.children] : sport.children,
    }));

    if (!liveSet || liveSet.size === 0) return baseTree;

    const covered = new Set();
    const collect = (items) => {
        items.forEach((item) => {
            if (Array.isArray(item.sportKeys)) {
                item.sportKeys.forEach((k) => covered.add(String(k).toLowerCase()));
            }
            if (Array.isArray(item.children)) collect(item.children);
        });
    };
    collect(baseTree);

    const parentById = new Map();
    baseTree.forEach((parent) => {
        if (parent.id) parentById.set(parent.id, parent);
    });

    const ensureParent = (parentId) => {
        if (parentById.has(parentId)) return parentById.get(parentId);
        const fallback = FALLBACK_PARENTS[parentId];
        if (!fallback) return null;
        const node = { ...fallback, children: [] };
        parentById.set(parentId, node);
        baseTree.push(node);
        return node;
    };

    Array.from(liveSet).forEach((value) => {
        const key = String(value || '').toLowerCase();
        if (!ODDS_API_SPORT_KEY_RE.test(key)) return;
        if (covered.has(key)) return;

        const prefix = key.split('_')[0];
        const parentId = PREFIX_TO_PARENT_ID[prefix];
        if (!parentId) return;

        const parent = ensureParent(parentId);
        if (!parent) return;

        if (!Array.isArray(parent.children)) parent.children = [];

        const suffix = key.slice(prefix.length + 1);
        const childId = `api-${key.replace(/_/g, '-')}`;
        if (parent.children.some((c) => c.id === childId)) return;

        parent.children.push({
            id: childId,
            label: prettifyLeagueSuffix(suffix),
            selectable: true,
            sportKeys: [key],
        });
        covered.add(key);
    });

    parentById.forEach((parent) => {
        if (Array.isArray(parent.children) && parent.children.length > 1) {
            parent.children.sort((a, b) => {
                const aIsApi = String(a.id || '').startsWith('api-');
                const bIsApi = String(b.id || '').startsWith('api-');
                if (aIsApi !== bIsApi) return aIsApi ? 1 : -1;
                return String(a.label || '').localeCompare(String(b.label || ''));
            });
        }
    });

    return baseTree;
};
