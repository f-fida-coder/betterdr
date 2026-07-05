/**
 * Sportsbook navigation data — single source of truth for desktop and mobile.
 *
 * Catalog is aligned 1:1 with what our upstreams actually serve:
 * Rundown (php-backend/src/RundownSportMap.php) plus the approved
 * The Odds API supplemental keys (php-backend/src/OddsApiAllowlist.php —
 * Boxing and NRL since 2026-07-05). Sports no upstream provides (Auto
 * Racing; Golf is futures-only) are intentionally absent — surfacing
 * them would create permanently-empty child rows that confuse players.
 *
 * CONFIGURED_SPORT_KEYS is derived FROM this tree (see below) so the
 * allowlist self-maintains when new sports are added.
 *
 * Items marked type:'futures' route to <OutrightsView> via
 * DashboardMain instead of the regular match list.
 */

// Futures / outrights surface visibility.
//
// Kept OFF because Rundown — our only odds feed — does not currently serve any
// futures: ON since 2026-07-05 — The Odds API is the sole futures source
// (OddsApiSyncService::syncOutrights, hourly). The outrights table carries
// live boards (Super Bowl / World Series / NCAAF champ / FIFA WC / golf
// majors), the admin winner UI grades them, and real-money placement is
// separately gated server-side by SPORTSBOOK_OUTRIGHTS_BETTING_ENABLED.
// Flip to false to hide the FUTURES tab + OutrightsView without a deploy
// of backend flags (display-only kill switch).
export const OUTRIGHTS_ENABLED = true;

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
    {
        id: 'all-futures',
        label: 'FUTURES',
        icon: 'fa-solid fa-trophy',
        selectable: true,
        type: 'futures',
    },
    // ── BASKETBALL ────────────────────────────────────────────
    {
        id: 'basketball',
        label: 'BASKETBALL',
        icon: 'fa-solid fa-basketball',
        selectable: false,
        children: [
            { id: 'nba',             label: 'NBA',             selectable: true, sportKeys: ['basketball_nba'] },
            { id: 'wnba',            label: 'WNBA',            selectable: true, sportKeys: ['basketball_wnba'] },
            { id: 'ncaa-basketball', label: 'NCAA Basketball', selectable: true, sportKeys: ['basketball_ncaab'] },
            // Per-league futures groups (2026-07-05, competitor-style): each
            // group nests the league's outright board(s). Leaf sportKeys must
            // match php-backend OddsApiAllowlist::OUTRIGHT_KEYS; leaves hide
            // when /api/outrights/sports has no open board for the key.
            {
                id: 'nba-futures', label: 'NBA Futures', selectable: false, type: 'futures-group',
                children: [
                    { id: 'nba-championship', label: 'To Win Championship', selectable: true, type: 'futures', family: 'basketball', sportKeys: ['basketball_nba_championship_winner'] },
                ],
            },
            {
                id: 'ncaab-futures', label: 'NCAAB Futures', selectable: false, type: 'futures-group',
                children: [
                    { id: 'ncaab-championship', label: 'To Win Championship', selectable: true, type: 'futures', family: 'basketball', sportKeys: ['basketball_ncaab_championship_winner'] },
                ],
            },
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
            {
                id: 'mlb-futures', label: 'MLB Futures', selectable: false, type: 'futures-group',
                children: [
                    { id: 'mlb-world-series', label: 'To Win World Series', selectable: true, type: 'futures', family: 'baseball', sportKeys: ['baseball_mlb_world_series_winner'] },
                ],
            },
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
            {
                id: 'nhl-futures', label: 'NHL Futures', selectable: false, type: 'futures-group',
                children: [
                    { id: 'nhl-stanley-cup', label: 'To Win Stanley Cup', selectable: true, type: 'futures', family: 'hockey', sportKeys: ['icehockey_nhl_championship_winner'] },
                ],
            },
        ],
    },
    // ── FOOTBALL ──────────────────────────────────────────────
    {
        id: 'football',
        label: 'FOOTBALL',
        icon: 'fa-solid fa-football',
        selectable: false,
        children: [
            { id: 'nfl',           label: 'NFL',           selectable: true, sportKeys: ['americanfootball_nfl'] },
            { id: 'ncaa-football', label: 'NCAA Football', selectable: true, sportKeys: ['americanfootball_ncaaf'] },
            { id: 'cfl',           label: 'CFL',           selectable: true, sportKeys: ['americanfootball_cfl'] },
            {
                id: 'nfl-futures', label: 'NFL Futures', selectable: false, type: 'futures-group',
                children: [
                    { id: 'nfl-super-bowl', label: 'To Win Super Bowl', selectable: true, type: 'futures', family: 'football', sportKeys: ['americanfootball_nfl_super_bowl_winner'] },
                ],
            },
            {
                id: 'ncaaf-futures', label: 'NCAAF Futures', selectable: false, type: 'futures-group',
                children: [
                    { id: 'ncaaf-championship', label: 'To Win Championship', selectable: true, type: 'futures', family: 'football', sportKeys: ['americanfootball_ncaaf_championship_winner'] },
                ],
            },
        ],
    },
    // ── SOCCER ────────────────────────────────────────────────
    {
        id: 'soccer',
        label: 'SOCCER',
        icon: 'fa-solid fa-futbol',
        selectable: false,
        children: [
            { id: 'epl',              label: 'Premier League',         selectable: true, sportKeys: ['soccer_epl'] },
            { id: 'mls',              label: 'MLS',                    selectable: true, sportKeys: ['soccer_usa_mls'] },
            { id: 'la-liga',          label: 'La Liga',                selectable: true, sportKeys: ['soccer_spain_la_liga'] },
            { id: 'serie-a',          label: 'Serie A',                selectable: true, sportKeys: ['soccer_italy_serie_a'] },
            { id: 'bundesliga',       label: 'Bundesliga',             selectable: true, sportKeys: ['soccer_germany_bundesliga'] },
            { id: 'ligue-1',          label: 'Ligue 1',                selectable: true, sportKeys: ['soccer_france_ligue_one'] },
            { id: 'champions-league', label: 'Champions League',       selectable: true, sportKeys: ['soccer_uefa_champs_league'] },
            { id: 'europa-league',    label: 'Europa League',          selectable: true, sportKeys: ['soccer_uefa_europa_league'] },
            { id: 'uefa-euro',        label: 'UEFA Euro',              selectable: true, sportKeys: ['soccer_uefa_euro'] },
            { id: 'fifa-world-cup',   label: 'FIFA World Cup',         selectable: true, sportKeys: ['soccer_fifa_world_cup'] },
            { id: 'j-league',         label: 'J-League',               selectable: true, sportKeys: ['soccer_japan_j_league'] },
            {
                id: 'soccer-futures', label: 'Soccer Futures', selectable: false, type: 'futures-group',
                children: [
                    { id: 'soccer-world-cup-winner', label: 'To Win World Cup', selectable: true, type: 'futures', family: 'soccer', sportKeys: ['soccer_fifa_world_cup_winner'] },
                ],
            },
        ],
    },
    // ── GOLF ──────────────────────────────────────────────────
    // Futures-only sport: neither feed carries golf MATCH rows — the only
    // golf product is tournament-winner boards (The Open, Masters, …), so
    // this parent exists purely to give golf a home in the sidebar. Marked
    // futuresOnly so buildMergedSportsTree drops the whole parent when
    // OUTRIGHTS_ENABLED is off (an empty GOLF entry would confuse players).
    {
        id: 'golf',
        label: 'GOLF',
        icon: 'fa-solid fa-golf-ball-tee',
        selectable: false,
        futuresOnly: true,
        children: [
            // Each major's winner board is its own leaf (no intermediate
            // group — GOLF itself is the futures-only parent). Seasonal:
            // a major with no open board hides via the outright-sports set.
            { id: 'golf-masters',  label: 'Masters Winner',          selectable: true, type: 'futures', family: 'golf', sportKeys: ['golf_masters_tournament_winner'] },
            { id: 'golf-pga-champ', label: 'PGA Championship Winner', selectable: true, type: 'futures', family: 'golf', sportKeys: ['golf_pga_championship_winner'] },
            { id: 'golf-the-open', label: 'The Open Winner',         selectable: true, type: 'futures', family: 'golf', sportKeys: ['golf_the_open_championship_winner'] },
            { id: 'golf-us-open',  label: 'US Open Winner',          selectable: true, type: 'futures', family: 'golf', sportKeys: ['golf_us_open_winner'] },
        ],
    },
    // ── CRICKET ───────────────────────────────────────────────
    {
        id: 'cricket',
        label: 'CRICKET',
        icon: 'fa-solid fa-baseball',
        selectable: false,
        children: [
            { id: 'ipl', label: 'IPL', selectable: true, sportKeys: ['cricket_ipl'] },
            { id: 't20', label: 'T20', selectable: true, sportKeys: ['cricket_t20'] },
        ],
    },
    // ── TENNIS ────────────────────────────────────────────────
    {
        id: 'tennis',
        label: 'TENNIS',
        icon: 'fa-solid fa-table-tennis-paddle-ball',
        selectable: false,
        children: [
            { id: 'atp', label: 'ATP', selectable: true, sportKeys: ['tennis_atp'] },
            { id: 'wta', label: 'WTA', selectable: true, sportKeys: ['tennis_wta'] },
        ],
    },
    // ── MARTIAL ARTS ─────────────────────────────────────────
    {
        id: 'martial-arts',
        label: 'MARTIAL ARTS',
        icon: 'fa-solid fa-hand-fist',
        selectable: false,
        children: [
            { id: 'mma',    label: 'UFC / MMA', selectable: true, sportKeys: ['mma_mixed_martial_arts'] },
            // The Odds API supplemental (2026-07-05) — labels must match
            // backend OddsApiEventMapper::SPORT_DISPLAY_NAMES.
            { id: 'boxing', label: 'Boxing',    selectable: true, sportKeys: ['boxing_boxing'] },
        ],
    },
    // ── RUGBY ─────────────────────────────────────────────────
    {
        id: 'rugby',
        label: 'RUGBY',
        icon: 'fa-solid fa-football',
        selectable: false,
        children: [
            { id: 'nrl', label: 'NRL', selectable: true, sportKeys: ['rugbyleague_nrl'] },
        ],
    },
];

/**
 * Self-maintaining allowlist of sport keys backed by upstream coverage.
 * Built by walking every leaf child's sportKeys. New sports added to
 * `sportsData` are picked up automatically — no parallel list to keep
 * in sync.
 */
const collectConfiguredKeys = () => {
    const out = new Set();
    const walk = (items) => {
        for (const item of items) {
            if (Array.isArray(item.sportKeys)) {
                item.sportKeys.forEach((k) => out.add(String(k).toLowerCase()));
            }
            if (item.children) walk(item.children);
        }
    };
    walk(sportsData);
    return out;
};
export const CONFIGURED_SPORT_KEYS = collectConfiguredKeys();

/** Check whether at least one of a child's sportKeys is configured. */
export const isChildActive = (child) => {
    if (!child.sportKeys) return true;
    return child.sportKeys.some(k => CONFIGURED_SPORT_KEYS.has(k));
};

/**
 * For a given sport item id, return all sport_title keywords the API might use.
 * Falls back to the ID itself if no mapping exists.
 */
export const getSportKeywords = (id) => {
    if (!id) return [];
    const normalized = id.toString().toLowerCase();

    // Dynamic sidebar entries auto-injected from /api/matches/sports are
    // keyed `api-<slug-with-dashes>`. Convert back to the canonical slug
    // so match.sportKey comparisons in consumers can succeed.
    if (normalized.startsWith('api-')) {
        const slug = normalized.slice(4).replace(/-/g, '_');
        return [slug, slug.replace(/_/g, ' ')];
    }

    const keywordMap = {
        nfl: ['nfl', 'americanfootball_nfl'],
        'ncaa-football': ['ncaaf', 'ncaa football', 'college football', 'americanfootball_ncaaf'],
        cfl: ['cfl', 'americanfootball_cfl'],
        nba: ['nba', 'basketball_nba'],
        wnba: ['wnba', 'basketball_wnba'],
        'ncaa-basketball': ['ncaab', 'ncaa basketball', 'college basketball', 'basketball_ncaab'],
        mlb: ['mlb', 'baseball_mlb'],
        nhl: ['nhl', 'icehockey_nhl'],
        epl: ['epl', 'premier league', 'english premier', 'soccer_epl'],
        mls: ['mls', 'major league soccer', 'soccer_usa_mls'],
        'la-liga': ['la liga', 'laliga', 'soccer_spain_la_liga'],
        'serie-a': ['serie a', 'soccer_italy_serie_a'],
        bundesliga: ['bundesliga', 'soccer_germany_bundesliga'],
        'ligue-1': ['ligue 1', 'soccer_france_ligue_one'],
        'champions-league': ['champions league', 'ucl', 'soccer_uefa_champs_league'],
        'europa-league': ['europa league', 'soccer_uefa_europa_league'],
        'uefa-euro': ['uefa euro', 'euro 2024', 'euro 2028', 'soccer_uefa_euro'],
        'fifa-world-cup': ['fifa', 'world cup', 'soccer_fifa_world_cup'],
        'j-league': ['j league', 'j-league', 'jleague', 'soccer_japan_j_league'],
        ipl: ['ipl', 'indian premier league', 'cricket_ipl'],
        t20: ['t20', 'cricket_t20'],
        atp: ['atp', 'tennis_atp'],
        wta: ['wta', 'tennis_wta'],
        mma: ['mma', 'ufc', 'mixed martial', 'mma_mixed_martial_arts'],
        boxing: ['boxing', 'boxing_boxing'],
        nrl: ['nrl', 'rugbyleague_nrl'],
        // Parent-level catch-all keywords
        football: ['nfl', 'ncaaf', 'cfl', 'american football', 'americanfootball'],
        basketball: ['basketball', 'nba', 'wnba', 'ncaab'],
        baseball: ['baseball', 'mlb'],
        hockey: ['hockey', 'nhl', 'icehockey'],
        soccer: ['soccer', 'premier league', 'la liga', 'serie a', 'bundesliga', 'ligue 1', 'mls', 'champions league', 'epl', 'uefa', 'fifa'],
        cricket: ['cricket', 'ipl', 't20'],
        tennis: ['tennis', 'atp', 'wta'],
        'martial-arts': ['mma', 'ufc', 'martial', 'boxing'],
        rugby: ['rugby', 'rugbyleague', 'nrl'],
    };

    return keywordMap[normalized] || [normalized];
};

/**
 * Token-boundary check used by the match-list filter. `haystack` is
 * `${sport}|${sportKey}` lowercased (e.g. `'wnba|basketball_wnba'`),
 * `keyword` is one of the entries getSportKeywords() returned (e.g.
 * `'nba'`). Naive `haystack.includes(keyword)` was wrong because
 * `'wnba'.includes('nba')` is true — selecting NBA leaked WNBA rows
 * into the list. This version requires the keyword to sit at a
 * non-alphanumeric boundary (start, end, `_`, `|`, space, etc.), so
 * `'nba'` matches `'basketball_nba'` (boundary `_`) but NOT
 * `'basketball_wnba'` (preceded by `w`, which IS alphanumeric).
 */
const KEYWORD_RE_CACHE = new Map();
export const matchesSportKeyword = (haystack, keyword) => {
    if (!haystack || !keyword) return false;
    const k = String(keyword).toLowerCase();
    let re = KEYWORD_RE_CACHE.get(k);
    if (!re) {
        const safe = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        re = new RegExp(`(^|[^a-z0-9])${safe}([^a-z0-9]|$)`);
        KEYWORD_RE_CACHE.set(k, re);
    }
    return re.test(String(haystack).toLowerCase());
};

/**
 * Map of canonical sportKey → human-readable league label, derived
 * from the leaf nodes in `sportsData`. Used by the multi-sport list view to
 * print short league labels (e.g. "MLB", "NBA") in section headers above each league's matches.
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
    if (SUPPLEMENTAL_LEAGUE_LABELS[key]) return SUPPLEMENTAL_LEAGUE_LABELS[key];
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

// Curated labels for backend-discovered leagues that are NOT in the static
// tree — The Odds API supplemental soccer set. Single source of truth for
// the sidebar, mobile league tabs, board headers, and search labels; keys
// and names MUST match php-backend OddsApiEventMapper::SPORT_DISPLAY_NAMES.
// Also consulted by buildMergedSportsTree's family-variant dedupe: a key in
// this map is a REAL league, never a tournament-flavour variant, so it must
// not be swallowed by the two-segment family match (soccer_spain_segunda_
// division vs soccer_spain_la_liga, soccer_italy_serie_b vs _serie_a, etc.).
export const SUPPLEMENTAL_LEAGUE_LABELS = {
    soccer_efl_champ: 'EFL Championship',
    soccer_england_league1: 'EFL League One',
    soccer_england_league2: 'EFL League Two',
    soccer_fa_cup: 'FA Cup',
    soccer_england_efl_cup: 'EFL Cup',
    soccer_spain_segunda_division: 'La Liga 2',
    soccer_italy_serie_b: 'Serie B',
    soccer_germany_bundesliga2: '2. Bundesliga',
    soccer_france_ligue_two: 'Ligue 2',
    soccer_netherlands_eredivisie: 'Eredivisie',
    soccer_portugal_primeira_liga: 'Primeira Liga',
    soccer_spl: 'Scottish Premiership',
    soccer_mexico_ligamx: 'Liga MX',
    soccer_brazil_campeonato: 'Brazil Serie A',
    soccer_brazil_serie_b: 'Brazil Serie B',
    soccer_argentina_primera_division: 'Argentina Primera',
    soccer_uefa_europa_conference_league: 'UEFA Conference League',
    soccer_conmebol_copa_libertadores: 'Copa Libertadores',
    soccer_conmebol_copa_sudamericana: 'Copa Sudamericana',
};

/**
 * Map a sport-key prefix (the part before the first `_`,
 * e.g. `soccer` in `soccer_argentina_primera_division`) to the parent
 * sport id used in the static sportsData tree. Used to nest leagues
 * the backend reports — but the static tree doesn't enumerate — under
 * the correct parent in the sidebar instead of promoting them to
 * flat top-level rows.
 */
// Sport-key prefix → static parent id. Used by buildMergedSportsTree to
// route auto-discovered backend sport keys (e.g. `soccer_korea_kleague1`)
// to the right parent category instead of creating top-level rows.
// Prefixes for sports we deliberately don't surface (golf match rows,
// motorsport) are absent — any matching backend rows will be silently
// dropped from the sidebar, which is preferred over creating empty
// entries the player can click into and get no data.
const PREFIX_TO_PARENT_ID = {
    basketball: 'basketball',
    baseball: 'baseball',
    icehockey: 'hockey',
    americanfootball: 'football',
    canadianfootball: 'football',
    soccer: 'soccer',
    tennis: 'tennis',
    mma: 'martial-arts',
    boxing: 'martial-arts',
    rugbyleague: 'rugby',
    cricket: 'cricket',
};

// No dynamic fallback parents — every Rundown sport family has an
// explicit static parent in `sportsData` above. Categories the
// upstream doesn't actually serve (rugby, lacrosse, handball,
// volleyball, politics) used to spawn on demand here; that produced
// empty rows the player could click into. Removed to keep the sidebar
// honest.
const FALLBACK_PARENTS = {};

const SPORT_KEY_RE = /^[a-z]+_[a-z0-9_]+$/;

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
    const baseTree = sportsData
        // OUTRIGHTS_ENABLED=false hides ALL futures surfaces: the top-level
        // FUTURES tab, per-sport futures children/groups, and futures-only
        // parents (GOLF, which has no match rows to fall back to).
        .filter((sport) => OUTRIGHTS_ENABLED || (sport.type !== 'futures' && !sport.futuresOnly))
        .map((sport) => ({
            ...sport,
            children: Array.isArray(sport.children)
                ? sport.children.filter((c) => OUTRIGHTS_ENABLED || (c.type !== 'futures' && c.type !== 'futures-group'))
                : sport.children,
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

    // Family-prefix dedupe: tennis_atp_madrid_open and tennis_atp_us_open
    // are tournament-flavour variants of the canonical Rundown key
    // tennis_atp that the static ATP child already covers. Same shape
    // for cricket_psl variants etc. Treat any backend key whose family
    // prefix (e.g. "tennis_atp" before further suffixes) matches an
    // existing static sportKey as already-covered so we don't pollute
    // the sidebar with tournament-by-tournament rows.
    const familyPrefixes = new Set();
    covered.forEach((k) => {
        // Two-segment family: "tennis_atp", "soccer_epl", "basketball_nba".
        const parts = k.split('_');
        if (parts.length >= 2) familyPrefixes.add(`${parts[0]}_${parts[1]}`);
    });

    Array.from(liveSet).forEach((value) => {
        const key = String(value || '').toLowerCase();
        if (!SPORT_KEY_RE.test(key)) return;
        if (covered.has(key)) return;
        // Tournament-variant of an already-covered family (tennis_atp_*,
        // soccer_epl_* etc.) — the static child already represents this.
        // Curated supplemental leagues are exempt: soccer_spain_segunda_
        // division shares the soccer_spain family with static La Liga but
        // is a distinct, real league — swallowing it left five leagues
        // with no sidebar entry at all.
        const parts = key.split('_');
        if (
            parts.length >= 2
            && !SUPPLEMENTAL_LEAGUE_LABELS[key]
            && familyPrefixes.has(`${parts[0]}_${parts[1]}`)
        ) return;

        const prefix = parts[0];
        const parentId = PREFIX_TO_PARENT_ID[prefix];
        if (!parentId) return;

        const parent = ensureParent(parentId);
        if (!parent) return;

        if (!Array.isArray(parent.children)) parent.children = [];

        const suffix = key.slice(prefix.length + 1);
        const childId = `api-${key.replace(/_/g, '-')}`;
        // Final dedupe pass: skip if any sibling (static or already-injected)
        // already declares this sportKey OR has the same auto-id.
        const sportKeyAlreadyCovered = parent.children.some((c) =>
            c.id === childId
            || (Array.isArray(c.sportKeys) && c.sportKeys.some((sk) => String(sk).toLowerCase() === key))
        );
        if (sportKeyAlreadyCovered) return;

        parent.children.push({
            id: childId,
            label: SUPPLEMENTAL_LEAGUE_LABELS[key] || prettifyLeagueSuffix(suffix),
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
