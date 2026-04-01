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
