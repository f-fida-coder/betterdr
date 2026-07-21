import { API_URL } from '../api.js';

// ESPN's combiner resizes server-side: the raw /500/ asset is ~65KB per
// logo while the 80px render is ~3-5KB — a board full of crests went from
// ~4MB of images to ~300KB. 80px stays crisp at the ~24-28px render size
// on 3x retina screens. Falls back to nothing gracefully if ESPN ever
// drops the combiner (same origin, same underlying asset path).
const ESPN_LOGO = (league, abbr) => `https://a.espncdn.com/combiner/i?img=/i/teamlogos/${league}/500/${abbr}.png&h=80&w=80`;

// Path-style API base uses `?path=` so queries append with `&`; normal
// hosts use `/path?query`. Same logic as api.js#buildApiUrl, inlined
// here to avoid a circular import with TEAM_LOGO_MAP consumers.
const buildProxyUrl = (subpath, name) => {
    const base = `${API_URL}${subpath}`;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}name=${encodeURIComponent(name)}`;
};

// Shared logo source for desktop (SportContentView.jsx) and mobile
// (MobileContentView.jsx). Keys are normalized via normalizeTeamName:
// lowercased, stripped of "." / "'" / "-" and whitespace-collapsed.
export const TEAM_LOGO_MAP = {
    // NBA
    'atlanta hawks': ESPN_LOGO('nba', 'atl'),
    'boston celtics': ESPN_LOGO('nba', 'bos'),
    'brooklyn nets': ESPN_LOGO('nba', 'bkn'),
    'charlotte hornets': ESPN_LOGO('nba', 'cha'),
    'chicago bulls': ESPN_LOGO('nba', 'chi'),
    'cleveland cavaliers': ESPN_LOGO('nba', 'cle'),
    'dallas mavericks': ESPN_LOGO('nba', 'dal'),
    'denver nuggets': ESPN_LOGO('nba', 'den'),
    'detroit pistons': ESPN_LOGO('nba', 'det'),
    'golden state warriors': ESPN_LOGO('nba', 'gs'),
    'houston rockets': ESPN_LOGO('nba', 'hou'),
    'indiana pacers': ESPN_LOGO('nba', 'ind'),
    'la clippers': ESPN_LOGO('nba', 'lac'),
    'los angeles clippers': ESPN_LOGO('nba', 'lac'),
    'los angeles lakers': ESPN_LOGO('nba', 'lal'),
    'memphis grizzlies': ESPN_LOGO('nba', 'mem'),
    'miami heat': ESPN_LOGO('nba', 'mia'),
    'milwaukee bucks': ESPN_LOGO('nba', 'mil'),
    'minnesota timberwolves': ESPN_LOGO('nba', 'min'),
    'new orleans pelicans': ESPN_LOGO('nba', 'no'),
    'new york knicks': ESPN_LOGO('nba', 'ny'),
    'oklahoma city thunder': ESPN_LOGO('nba', 'okc'),
    'orlando magic': ESPN_LOGO('nba', 'orl'),
    'philadelphia 76ers': ESPN_LOGO('nba', 'phi'),
    'phoenix suns': ESPN_LOGO('nba', 'phx'),
    'portland trail blazers': ESPN_LOGO('nba', 'por'),
    'sacramento kings': ESPN_LOGO('nba', 'sac'),
    'san antonio spurs': ESPN_LOGO('nba', 'sa'),
    'toronto raptors': ESPN_LOGO('nba', 'tor'),
    'utah jazz': ESPN_LOGO('nba', 'utah'),
    'washington wizards': ESPN_LOGO('nba', 'wsh'),

    // MLB
    'arizona diamondbacks': ESPN_LOGO('mlb', 'ari'),
    'atlanta braves': ESPN_LOGO('mlb', 'atl'),
    'baltimore orioles': ESPN_LOGO('mlb', 'bal'),
    'boston red sox': ESPN_LOGO('mlb', 'bos'),
    'chicago cubs': ESPN_LOGO('mlb', 'chc'),
    'chicago white sox': ESPN_LOGO('mlb', 'chw'),
    'cincinnati reds': ESPN_LOGO('mlb', 'cin'),
    'cleveland guardians': ESPN_LOGO('mlb', 'cle'),
    'colorado rockies': ESPN_LOGO('mlb', 'col'),
    'detroit tigers': ESPN_LOGO('mlb', 'det'),
    'houston astros': ESPN_LOGO('mlb', 'hou'),
    'kansas city royals': ESPN_LOGO('mlb', 'kc'),
    'los angeles angels': ESPN_LOGO('mlb', 'laa'),
    'los angeles dodgers': ESPN_LOGO('mlb', 'lad'),
    'miami marlins': ESPN_LOGO('mlb', 'mia'),
    'milwaukee brewers': ESPN_LOGO('mlb', 'mil'),
    'minnesota twins': ESPN_LOGO('mlb', 'min'),
    'new york mets': ESPN_LOGO('mlb', 'nym'),
    'new york yankees': ESPN_LOGO('mlb', 'nyy'),
    'oakland athletics': ESPN_LOGO('mlb', 'oak'),
    // Post-2024 MLB rebrand — feeds now ship just "Athletics" (or the
    // interim "Sacramento Athletics" / "Las Vegas Athletics" labels
    // during the relocation). Without these aliases the team falls
    // through to TheSportsDB search, where "Athletics" used to come
    // back as Arsenal because the search is broad and the proxy used
    // to accept the first hit.
    'athletics': ESPN_LOGO('mlb', 'oak'),
    'sacramento athletics': ESPN_LOGO('mlb', 'oak'),
    'las vegas athletics': ESPN_LOGO('mlb', 'oak'),
    'philadelphia phillies': ESPN_LOGO('mlb', 'phi'),
    'pittsburgh pirates': ESPN_LOGO('mlb', 'pit'),
    'san diego padres': ESPN_LOGO('mlb', 'sd'),
    'san francisco giants': ESPN_LOGO('mlb', 'sf'),
    'seattle mariners': ESPN_LOGO('mlb', 'sea'),
    'st louis cardinals': ESPN_LOGO('mlb', 'stl'),
    'tampa bay rays': ESPN_LOGO('mlb', 'tb'),
    'texas rangers': ESPN_LOGO('mlb', 'tex'),
    'toronto blue jays': ESPN_LOGO('mlb', 'tor'),
    'washington nationals': ESPN_LOGO('mlb', 'wsh'),

    // NFL
    'arizona cardinals': ESPN_LOGO('nfl', 'ari'),
    'atlanta falcons': ESPN_LOGO('nfl', 'atl'),
    'baltimore ravens': ESPN_LOGO('nfl', 'bal'),
    'buffalo bills': ESPN_LOGO('nfl', 'buf'),
    'carolina panthers': ESPN_LOGO('nfl', 'car'),
    'chicago bears': ESPN_LOGO('nfl', 'chi'),
    'cincinnati bengals': ESPN_LOGO('nfl', 'cin'),
    'cleveland browns': ESPN_LOGO('nfl', 'cle'),
    'dallas cowboys': ESPN_LOGO('nfl', 'dal'),
    'denver broncos': ESPN_LOGO('nfl', 'den'),
    'detroit lions': ESPN_LOGO('nfl', 'det'),
    'green bay packers': ESPN_LOGO('nfl', 'gb'),
    'houston texans': ESPN_LOGO('nfl', 'hou'),
    'indianapolis colts': ESPN_LOGO('nfl', 'ind'),
    'jacksonville jaguars': ESPN_LOGO('nfl', 'jax'),
    'kansas city chiefs': ESPN_LOGO('nfl', 'kc'),
    'las vegas raiders': ESPN_LOGO('nfl', 'lv'),
    'los angeles chargers': ESPN_LOGO('nfl', 'lac'),
    'los angeles rams': ESPN_LOGO('nfl', 'lar'),
    'miami dolphins': ESPN_LOGO('nfl', 'mia'),
    'minnesota vikings': ESPN_LOGO('nfl', 'min'),
    'new england patriots': ESPN_LOGO('nfl', 'ne'),
    'new orleans saints': ESPN_LOGO('nfl', 'no'),
    'new york giants': ESPN_LOGO('nfl', 'nyg'),
    'new york jets': ESPN_LOGO('nfl', 'nyj'),
    'philadelphia eagles': ESPN_LOGO('nfl', 'phi'),
    'pittsburgh steelers': ESPN_LOGO('nfl', 'pit'),
    'san francisco 49ers': ESPN_LOGO('nfl', 'sf'),
    'seattle seahawks': ESPN_LOGO('nfl', 'sea'),
    'tampa bay buccaneers': ESPN_LOGO('nfl', 'tb'),
    'tennessee titans': ESPN_LOGO('nfl', 'ten'),
    'washington commanders': ESPN_LOGO('nfl', 'wsh'),

    // EPL (Wikipedia fallbacks — stable Commons SVGs)
    'arsenal': 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
    'aston villa': 'https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg',
    'afc bournemouth': 'https://upload.wikimedia.org/wikipedia/en/e/e5/AFC_Bournemouth_%282013%29.svg',
    'bournemouth': 'https://upload.wikimedia.org/wikipedia/en/e/e5/AFC_Bournemouth_%282013%29.svg',
    'brentford': 'https://upload.wikimedia.org/wikipedia/en/2/2a/Brentford_FC_crest.svg',
    'brighton and hove albion': 'https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg',
    'brighton': 'https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg',
    'chelsea': 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
    'crystal palace': 'https://upload.wikimedia.org/wikipedia/en/0/0c/Crystal_Palace_FC_logo_%282022%29.svg',
    'everton': 'https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg',
    'fulham': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Fulham_FC_%28shield%29.svg',
    'ipswich town': 'https://upload.wikimedia.org/wikipedia/en/4/43/Ipswich_Town.svg',
    'leeds united': 'https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg',
    'leicester city': 'https://upload.wikimedia.org/wikipedia/en/2/2d/Leicester_City_crest.svg',
    'liverpool': 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
    'manchester city': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
    'manchester united': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
    'newcastle united': 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg',
    'nottingham forest': 'https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg',
    'southampton': 'https://upload.wikimedia.org/wikipedia/en/c/c9/FC_Southampton.svg',
    'tottenham hotspur': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
    'tottenham': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
    'west ham united': 'https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg',
    'west ham': 'https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg',
    'wolverhampton wanderers': 'https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg',
    'wolves': 'https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg',

    // La Liga (Spain) — top sides
    'real madrid': 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
    'fc barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
    'barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
    'atletico madrid': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg',
    'atlético madrid': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg',
    'athletic bilbao': 'https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_Bilbao_logo.svg',
    'real sociedad': 'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg',
    'villarreal': 'https://upload.wikimedia.org/wikipedia/en/b/b9/Villarreal_CF_logo-en.svg',
    'real betis': 'https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg',
    'sevilla': 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg',
    'valencia': 'https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg',

    // Serie A (Italy)
    'juventus': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg',
    'ac milan': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
    'inter milan': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
    'internazionale': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
    'napoli': 'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg',
    'roma': 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg',
    'as roma': 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg',
    'lazio': 'https://upload.wikimedia.org/wikipedia/en/c/ce/S.S._Lazio_badge.svg',
    'atalanta': 'https://upload.wikimedia.org/wikipedia/en/6/66/AtalantaBC.svg',
    'fiorentina': 'https://upload.wikimedia.org/wikipedia/en/f/fe/Logo_of_ACF_Fiorentina.svg',
    'bologna': 'https://upload.wikimedia.org/wikipedia/en/5/54/Bologna_F.C._1909_logo.svg',

    // Bundesliga (Germany)
    'bayern munich': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
    'fc bayern munich': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
    'borussia dortmund': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
    'rb leipzig': 'https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg',
    'bayer leverkusen': 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg',
    'vfb stuttgart': 'https://upload.wikimedia.org/wikipedia/commons/e/eb/VfB_Stuttgart_1893_Logo.svg',
    'eintracht frankfurt': 'https://upload.wikimedia.org/wikipedia/commons/0/04/Eintracht_Frankfurt_Logo.svg',
    'vfl wolfsburg': 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Logo-VfL-Wolfsburg.svg',
    'wolfsburg': 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Logo-VfL-Wolfsburg.svg',
    'union berlin': 'https://upload.wikimedia.org/wikipedia/commons/4/44/1._FC_Union_Berlin_Logo.svg',
    'sc freiburg': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/SC_Freiburg_logo.svg',
    'freiburg': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/SC_Freiburg_logo.svg',
    'werder bremen': 'https://upload.wikimedia.org/wikipedia/commons/b/be/SV-Werder-Bremen-Logo.svg',
    'fc heidenheim': 'https://upload.wikimedia.org/wikipedia/commons/8/82/1._FC_Heidenheim_1846.svg',
    '1. fc heidenheim': 'https://upload.wikimedia.org/wikipedia/commons/8/82/1._FC_Heidenheim_1846.svg',

    // Ligue 1 (France)
    'paris saint-germain': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
    'psg': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
    'as monaco': 'https://upload.wikimedia.org/wikipedia/en/b/ba/AS_Monaco_FC.svg',
    'monaco': 'https://upload.wikimedia.org/wikipedia/en/b/ba/AS_Monaco_FC.svg',
    'olympique de marseille': 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg',
    'marseille': 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg',
    'olympique lyonnais': 'https://upload.wikimedia.org/wikipedia/en/c/c6/Olympique_Lyonnais.svg',
    'lyon': 'https://upload.wikimedia.org/wikipedia/en/c/c6/Olympique_Lyonnais.svg',
    'lille': 'https://upload.wikimedia.org/wikipedia/en/3/3f/LOSC_Lille_%28logo%29.svg',
    'stade rennais': 'https://upload.wikimedia.org/wikipedia/en/9/95/Stade_Rennais_FC.svg',
    'rennes': 'https://upload.wikimedia.org/wikipedia/en/9/95/Stade_Rennais_FC.svg',
    'ogc nice': 'https://upload.wikimedia.org/wikipedia/en/d/da/OGCNice.svg',
    'nice': 'https://upload.wikimedia.org/wikipedia/en/d/da/OGCNice.svg',
    'rc strasbourg': 'https://upload.wikimedia.org/wikipedia/en/f/f6/Racing_Club_de_Strasbourg_logo.svg',
    'strasbourg': 'https://upload.wikimedia.org/wikipedia/en/f/f6/Racing_Club_de_Strasbourg_logo.svg',
    'rc lens': 'https://upload.wikimedia.org/wikipedia/en/4/40/Racing_Club_de_Lens_logo.svg',
    'lens': 'https://upload.wikimedia.org/wikipedia/en/4/40/Racing_Club_de_Lens_logo.svg',
    'stade brestois': 'https://upload.wikimedia.org/wikipedia/en/d/d4/Stade_Brestois_29.svg',
    'brest': 'https://upload.wikimedia.org/wikipedia/en/d/d4/Stade_Brestois_29.svg',

    // NHL
    'anaheim ducks': ESPN_LOGO('nhl', 'ana'),
    'arizona coyotes': ESPN_LOGO('nhl', 'ari'),
    'boston bruins': ESPN_LOGO('nhl', 'bos'),
    'buffalo sabres': ESPN_LOGO('nhl', 'buf'),
    'calgary flames': ESPN_LOGO('nhl', 'cgy'),
    'carolina hurricanes': ESPN_LOGO('nhl', 'car'),
    'chicago blackhawks': ESPN_LOGO('nhl', 'chi'),
    'colorado avalanche': ESPN_LOGO('nhl', 'col'),
    'columbus blue jackets': ESPN_LOGO('nhl', 'cbj'),
    'dallas stars': ESPN_LOGO('nhl', 'dal'),
    'detroit red wings': ESPN_LOGO('nhl', 'det'),
    'edmonton oilers': ESPN_LOGO('nhl', 'edm'),
    'florida panthers': ESPN_LOGO('nhl', 'fla'),
    'los angeles kings': ESPN_LOGO('nhl', 'la'),
    'minnesota wild': ESPN_LOGO('nhl', 'min'),
    'montreal canadiens': ESPN_LOGO('nhl', 'mtl'),
    'montréal canadiens': ESPN_LOGO('nhl', 'mtl'),
    'nashville predators': ESPN_LOGO('nhl', 'nsh'),
    'new jersey devils': ESPN_LOGO('nhl', 'nj'),
    'new york islanders': ESPN_LOGO('nhl', 'nyi'),
    'new york rangers': ESPN_LOGO('nhl', 'nyr'),
    'ottawa senators': ESPN_LOGO('nhl', 'ott'),
    'philadelphia flyers': ESPN_LOGO('nhl', 'phi'),
    'pittsburgh penguins': ESPN_LOGO('nhl', 'pit'),
    'san jose sharks': ESPN_LOGO('nhl', 'sj'),
    'seattle kraken': ESPN_LOGO('nhl', 'sea'),
    'st louis blues': ESPN_LOGO('nhl', 'stl'),
    'tampa bay lightning': ESPN_LOGO('nhl', 'tb'),
    'toronto maple leafs': ESPN_LOGO('nhl', 'tor'),
    'utah hockey club': ESPN_LOGO('nhl', 'uta'),
    'vancouver canucks': ESPN_LOGO('nhl', 'van'),
    'vegas golden knights': ESPN_LOGO('nhl', 'vgk'),
    'washington capitals': ESPN_LOGO('nhl', 'wsh'),
    'winnipeg jets': ESPN_LOGO('nhl', 'wpg'),

    // WNBA
    'atlanta dream': ESPN_LOGO('wnba', 'atl'),
    'chicago sky': ESPN_LOGO('wnba', 'chi'),
    'connecticut sun': ESPN_LOGO('wnba', 'conn'),
    'dallas wings': ESPN_LOGO('wnba', 'dal'),
    'indiana fever': ESPN_LOGO('wnba', 'ind'),
    'las vegas aces': ESPN_LOGO('wnba', 'lv'),
    'los angeles sparks': ESPN_LOGO('wnba', 'la'),
    'minnesota lynx': ESPN_LOGO('wnba', 'min'),
    'new york liberty': ESPN_LOGO('wnba', 'ny'),
    'phoenix mercury': ESPN_LOGO('wnba', 'phx'),
    'seattle storm': ESPN_LOGO('wnba', 'sea'),
    'washington mystics': ESPN_LOGO('wnba', 'wsh'),

    // MLS
    'atlanta united fc': ESPN_LOGO('mls', 'atl'),
    'atlanta united': ESPN_LOGO('mls', 'atl'),
    'austin fc': ESPN_LOGO('mls', 'atx'),
    'cf montreal': ESPN_LOGO('mls', 'mtl'),
    'cf montréal': ESPN_LOGO('mls', 'mtl'),
    'charlotte fc': ESPN_LOGO('mls', 'clt'),
    'chicago fire fc': ESPN_LOGO('mls', 'chi'),
    'colorado rapids': ESPN_LOGO('mls', 'col'),
    'columbus crew': ESPN_LOGO('mls', 'clb'),
    'd.c. united': ESPN_LOGO('mls', 'dc'),
    'dc united': ESPN_LOGO('mls', 'dc'),
    'fc cincinnati': ESPN_LOGO('mls', 'cin'),
    'fc dallas': ESPN_LOGO('mls', 'dal'),
    'houston dynamo fc': ESPN_LOGO('mls', 'hou'),
    'inter miami cf': ESPN_LOGO('mls', 'mia'),
    'inter miami': ESPN_LOGO('mls', 'mia'),
    'la galaxy': ESPN_LOGO('mls', 'la'),
    'los angeles fc': ESPN_LOGO('mls', 'lafc'),
    'lafc': ESPN_LOGO('mls', 'lafc'),
    'minnesota united fc': ESPN_LOGO('mls', 'min'),
    'nashville sc': ESPN_LOGO('mls', 'nsh'),
    'new england revolution': ESPN_LOGO('mls', 'ne'),
    'new york city fc': ESPN_LOGO('mls', 'nyc'),
    'new york red bulls': ESPN_LOGO('mls', 'rbny'),
    'orlando city sc': ESPN_LOGO('mls', 'orl'),
    'philadelphia union': ESPN_LOGO('mls', 'phi'),
    'portland timbers': ESPN_LOGO('mls', 'por'),
    'real salt lake': ESPN_LOGO('mls', 'rsl'),
    'san diego fc': ESPN_LOGO('mls', 'sd'),
    'san jose earthquakes': ESPN_LOGO('mls', 'sj'),
    'seattle sounders fc': ESPN_LOGO('mls', 'sea'),
    'sporting kansas city': ESPN_LOGO('mls', 'kc'),
    'st louis city sc': ESPN_LOGO('mls', 'stl'),
    'toronto fc': ESPN_LOGO('mls', 'tor'),
    'vancouver whitecaps fc': ESPN_LOGO('mls', 'van'),

    // CFL (Canadian Football League)
    'bc lions': 'https://upload.wikimedia.org/wikipedia/en/1/10/BC_Lions_logo.svg',
    'calgary stampeders': 'https://upload.wikimedia.org/wikipedia/en/1/1f/Calgary_Stampeders_logo.svg',
    'edmonton elks': 'https://upload.wikimedia.org/wikipedia/en/1/1d/Edmonton_Elks_logo.svg',
    'hamilton tiger cats': 'https://upload.wikimedia.org/wikipedia/en/2/2f/Hamilton_Tiger-Cats_logo.svg',
    'hamilton tiger-cats': 'https://upload.wikimedia.org/wikipedia/en/2/2f/Hamilton_Tiger-Cats_logo.svg',
    'montreal alouettes': 'https://upload.wikimedia.org/wikipedia/en/1/1c/Montreal_Alouettes_logo.svg',
    'montréal alouettes': 'https://upload.wikimedia.org/wikipedia/en/1/1c/Montreal_Alouettes_logo.svg',
    'ottawa redblacks': 'https://upload.wikimedia.org/wikipedia/en/2/24/Ottawa_Redblacks_logo.svg',
    'saskatchewan roughriders': 'https://upload.wikimedia.org/wikipedia/en/6/6e/Saskatchewan_Roughriders_logo.svg',
    'toronto argonauts': 'https://upload.wikimedia.org/wikipedia/en/1/17/Toronto_Argonauts_logo.svg',
    'winnipeg blue bombers': 'https://upload.wikimedia.org/wikipedia/en/5/5f/Winnipeg_Blue_Bombers_logo.svg',
};

export const normalizeTeamName = (teamName = '') =>
    String(teamName || '')
        .toLowerCase()
        .replace(/[.'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

// Mascot-only team name for compact surfaces (bet-review modal, pending-bet
// legs) where the full "City Mascot" string truncates ("New York Yankees -1.5
// +1…"). The stored leg carries both the full display name ("New York Yankees")
// and the short match key / city ("New York"); stripping the city prefix leaves
// the mascot — "Yankees", "Red Sox", "Blue Jays" — without a hardcoded mascot
// map and correctly handles multi-word mascots. Falls back to the full name
// (then the short key) when the prefix doesn't match, so the label is never
// empty.
export const mascotName = (fullName = '', shortKey = '') => {
    const full = String(fullName || '').trim();
    const city = String(shortKey || '').trim();
    if (!full) return city;
    if (city && full.toLowerCase().startsWith(city.toLowerCase())) {
        const rest = full.slice(city.length).trim();
        if (rest) return rest;
    }
    return full;
};

// ── Sport-aware ESPN fallback ────────────────────────────────────────
// Rundown's live/in-play (V1-style delta) feed ships team rows with a
// CITY-only name ("Boston", "Baltimore") plus an uppercase abbreviation
// ("BOS", "BAL"). City-only names miss TEAM_LOGO_MAP and, with no sport
// context, resolve to the WRONG sport via the TheSportsDB search
// (Baltimore → NFL Ravens, Boston → a soccer crest). ESPN logos are keyed
// by league + abbreviation, so once we know the sport we can build the
// right URL directly. The abbreviation set + URL shape are derived from
// the curated TEAM_LOGO_MAP above, keeping a single source of truth.

// sportKey (and a few `sport` labels) → ESPN league slug in the CDN path.
const ESPN_LEAGUE_BY_SPORT_KEY = {
    baseball_mlb: 'mlb',
    basketball_nba: 'nba',
    basketball_wnba: 'wnba',
    americanfootball_nfl: 'nfl',
    icehockey_nhl: 'nhl',
    soccer_usa_mls: 'mls',
};
const ESPN_LEAGUE_BY_SPORT_LABEL = {
    mlb: 'mlb',
    baseball: 'mlb',
    nba: 'nba',
    basketball: 'nba',
    wnba: 'wnba',
    nfl: 'nfl',
    americanfootball: 'nfl',
    football: 'nfl',
    nhl: 'nhl',
    icehockey: 'nhl',
    hockey: 'nhl',
    mls: 'mls',
};

const leagueFromSport = (sportKey = '', sport = '') => {
    const key = String(sportKey || '').toLowerCase();
    if (ESPN_LEAGUE_BY_SPORT_KEY[key]) return ESPN_LEAGUE_BY_SPORT_KEY[key];
    // Season-specific keys (e.g. basketball_nba_preseason) match by prefix.
    for (const k of Object.keys(ESPN_LEAGUE_BY_SPORT_KEY)) {
        if (key.startsWith(k)) return ESPN_LEAGUE_BY_SPORT_KEY[k];
    }
    const sportLabel = String(sport || '').toLowerCase();
    if (ESPN_LEAGUE_BY_SPORT_LABEL[sportLabel]) return ESPN_LEAGUE_BY_SPORT_LABEL[sportLabel];
    const compact = sportLabel.replace(/[^a-z]/g, '');
    return ESPN_LEAGUE_BY_SPORT_LABEL[compact] || null;
};

// Reverse-index the curated map → { league: { espnAbbr: url } } so the
// abbreviation path serves the exact same URLs the full-name path does.
const ESPN_ABBR_TO_URL = (() => {
    const re = /teamlogos\/([a-z]+)\/\d+\/([a-z0-9]+)\.png/i;
    const index = {};
    for (const url of Object.values(TEAM_LOGO_MAP)) {
        const m = typeof url === 'string' ? re.exec(url) : null;
        if (!m) continue;
        const league = m[1].toLowerCase();
        const abbr = m[2].toLowerCase();
        (index[league] || (index[league] = {}))[abbr] = url;
    }
    return index;
})();

// Rundown abbreviation → ESPN abbreviation, only where the two disagree.
const RUNDOWN_TO_ESPN_ABBR = {
    mlb: { cws: 'chw' },
    nhl: { mon: 'mtl' },
    wnba: { nyl: 'ny' },
};

const espnLogoByAbbr = (league, abbr) => {
    if (!league || !abbr) return null;
    let a = String(abbr).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!a) return null;
    const alias = RUNDOWN_TO_ESPN_ABBR[league];
    if (alias && alias[a]) a = alias[a];
    const idx = ESPN_ABBR_TO_URL[league];
    if (idx && idx[a]) return idx[a];
    // New/expansion teams not yet in the curated map: build the URL. A
    // miss 404s and <img onError> falls back to the initials avatar, so
    // this can never render a *wrong* team's logo.
    return ESPN_LOGO(league, a);
};

// Sport-aware synchronous resolution shared by both lookups below.
// ctx = { sportKey, sport, abbr }. Returns a CDN URL or null.
const resolveByContext = (teamName, ctx) => {
    if (!ctx) return null;
    const league = leagueFromSport(ctx.sportKey, ctx.sport);
    if (!league) return null;
    const rawCtxAbbr = ctx.abbr == null ? '' : String(ctx.abbr).trim();
    const rawTeamName = teamName == null ? '' : String(teamName).trim();
    // Some feeds omit `team*Short` on live deltas and only ship short
    // team codes in `teamName` itself (e.g. BOS/SD). If ctx.abbr isn't a
    // code, fall back to teamName before touching TheSportsDB.
    let abbr = rawCtxAbbr;
    if (!/^[A-Za-z]{2,4}$/.test(abbr) && /^[A-Za-z]{2,4}$/.test(rawTeamName)) {
        abbr = rawTeamName;
    }
    // Only the 2–4 letter uppercase codes are real abbreviations. The same
    // column sometimes carries a mascot ("Padres", "Red Sox") on full-name
    // rows — those already resolve via the name path, so ignore them here.
    if (!/^[A-Za-z]{2,4}$/.test(abbr)) return null;
    return espnLogoByAbbr(league, abbr);
};

// ── National-team flags (international soccer) ────────────────────────
// National teams are never in TEAM_LOGO_MAP and have no ESPN league
// mapping (only soccer_usa_mls is mapped), so they fall through to the
// spotty TheSportsDB search and usually render the initials avatar.
// They are a finite, stable set, so map FIFA country names → flag CDN.
// Keys are accent-folded normalizeTeamName output. Gated to soccer so a
// country-named club in another sport can't pick up a flag by accident.
const FLAG = (code) => `https://flagcdn.com/w80/${code}.png`;
const foldAccents = (s = '') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const NATIONAL_TEAM_FLAG = {
    // UEFA
    'albania': FLAG('al'), 'andorra': FLAG('ad'), 'armenia': FLAG('am'), 'austria': FLAG('at'),
    'azerbaijan': FLAG('az'), 'belarus': FLAG('by'), 'belgium': FLAG('be'),
    'bosnia and herzegovina': FLAG('ba'), 'bosnia herzegovina': FLAG('ba'), 'bosnia': FLAG('ba'),
    'bulgaria': FLAG('bg'), 'croatia': FLAG('hr'), 'cyprus': FLAG('cy'),
    'czechia': FLAG('cz'), 'czech republic': FLAG('cz'), 'denmark': FLAG('dk'),
    'england': FLAG('gb-eng'), 'estonia': FLAG('ee'), 'faroe islands': FLAG('fo'),
    'finland': FLAG('fi'), 'france': FLAG('fr'), 'georgia': FLAG('ge'), 'germany': FLAG('de'),
    'gibraltar': FLAG('gi'), 'greece': FLAG('gr'), 'hungary': FLAG('hu'), 'iceland': FLAG('is'),
    'israel': FLAG('il'), 'italy': FLAG('it'), 'kazakhstan': FLAG('kz'), 'kosovo': FLAG('xk'),
    'latvia': FLAG('lv'), 'liechtenstein': FLAG('li'), 'lithuania': FLAG('lt'),
    'luxembourg': FLAG('lu'), 'malta': FLAG('mt'), 'moldova': FLAG('md'), 'montenegro': FLAG('me'),
    'netherlands': FLAG('nl'), 'north macedonia': FLAG('mk'), 'macedonia': FLAG('mk'),
    'northern ireland': FLAG('gb-nir'), 'norway': FLAG('no'), 'poland': FLAG('pl'),
    'portugal': FLAG('pt'), 'republic of ireland': FLAG('ie'), 'ireland': FLAG('ie'),
    'romania': FLAG('ro'), 'russia': FLAG('ru'), 'san marino': FLAG('sm'),
    'scotland': FLAG('gb-sct'), 'serbia': FLAG('rs'), 'slovakia': FLAG('sk'),
    'slovenia': FLAG('si'), 'spain': FLAG('es'), 'sweden': FLAG('se'), 'switzerland': FLAG('ch'),
    'turkey': FLAG('tr'), 'turkiye': FLAG('tr'), 'ukraine': FLAG('ua'), 'wales': FLAG('gb-wls'),
    // CONMEBOL
    'argentina': FLAG('ar'), 'bolivia': FLAG('bo'), 'brazil': FLAG('br'), 'chile': FLAG('cl'),
    'colombia': FLAG('co'), 'ecuador': FLAG('ec'), 'paraguay': FLAG('py'), 'peru': FLAG('pe'),
    'uruguay': FLAG('uy'), 'venezuela': FLAG('ve'),
    // CONCACAF
    'canada': FLAG('ca'), 'costa rica': FLAG('cr'), 'cuba': FLAG('cu'), 'curacao': FLAG('cw'),
    'dominican republic': FLAG('do'), 'el salvador': FLAG('sv'), 'guatemala': FLAG('gt'),
    'haiti': FLAG('ht'), 'honduras': FLAG('hn'), 'jamaica': FLAG('jm'), 'mexico': FLAG('mx'),
    'panama': FLAG('pa'), 'trinidad and tobago': FLAG('tt'), 'united states': FLAG('us'),
    'united states of america': FLAG('us'), 'usa': FLAG('us'), 'suriname': FLAG('sr'),
    'nicaragua': FLAG('ni'), 'belize': FLAG('bz'), 'guadeloupe': FLAG('gp'),
    'martinique': FLAG('mq'), 'grenada': FLAG('gd'), 'saint lucia': FLAG('lc'),
    'st lucia': FLAG('lc'), 'antigua and barbuda': FLAG('ag'),
    'saint kitts and nevis': FLAG('kn'), 'st kitts and nevis': FLAG('kn'),
    // AFC
    'australia': FLAG('au'), 'china': FLAG('cn'), 'china pr': FLAG('cn'), 'india': FLAG('in'),
    'indonesia': FLAG('id'), 'iran': FLAG('ir'), 'iraq': FLAG('iq'), 'japan': FLAG('jp'),
    'jordan': FLAG('jo'), 'kuwait': FLAG('kw'), 'kyrgyzstan': FLAG('kg'), 'lebanon': FLAG('lb'),
    'malaysia': FLAG('my'), 'oman': FLAG('om'), 'palestine': FLAG('ps'), 'philippines': FLAG('ph'),
    'qatar': FLAG('qa'), 'saudi arabia': FLAG('sa'), 'south korea': FLAG('kr'),
    'korea republic': FLAG('kr'), 'north korea': FLAG('kp'), 'korea dpr': FLAG('kp'),
    'syria': FLAG('sy'), 'tajikistan': FLAG('tj'), 'thailand': FLAG('th'),
    'turkmenistan': FLAG('tm'), 'united arab emirates': FLAG('ae'), 'uae': FLAG('ae'),
    'uzbekistan': FLAG('uz'), 'vietnam': FLAG('vn'), 'bahrain': FLAG('bh'),
    'bangladesh': FLAG('bd'), 'hong kong': FLAG('hk'), 'myanmar': FLAG('mm'), 'yemen': FLAG('ye'),
    'afghanistan': FLAG('af'), 'singapore': FLAG('sg'),
    // CAF
    'algeria': FLAG('dz'), 'angola': FLAG('ao'), 'benin': FLAG('bj'), 'botswana': FLAG('bw'),
    'burkina faso': FLAG('bf'), 'burundi': FLAG('bi'), 'cameroon': FLAG('cm'),
    'cape verde': FLAG('cv'), 'cabo verde': FLAG('cv'), 'central african republic': FLAG('cf'),
    'chad': FLAG('td'), 'comoros': FLAG('km'), 'congo': FLAG('cg'), 'dr congo': FLAG('cd'),
    'congo dr': FLAG('cd'), 'democratic republic of the congo': FLAG('cd'),
    'ivory coast': FLAG('ci'), 'cote d ivoire': FLAG('ci'), 'djibouti': FLAG('dj'),
    'egypt': FLAG('eg'), 'equatorial guinea': FLAG('gq'), 'eritrea': FLAG('er'),
    'eswatini': FLAG('sz'), 'ethiopia': FLAG('et'), 'gabon': FLAG('ga'), 'gambia': FLAG('gm'),
    'ghana': FLAG('gh'), 'guinea': FLAG('gn'), 'guinea bissau': FLAG('gw'), 'kenya': FLAG('ke'),
    'lesotho': FLAG('ls'), 'liberia': FLAG('lr'), 'libya': FLAG('ly'), 'madagascar': FLAG('mg'),
    'malawi': FLAG('mw'), 'mali': FLAG('ml'), 'mauritania': FLAG('mr'), 'mauritius': FLAG('mu'),
    'morocco': FLAG('ma'), 'mozambique': FLAG('mz'), 'namibia': FLAG('na'), 'niger': FLAG('ne'),
    'nigeria': FLAG('ng'), 'rwanda': FLAG('rw'), 'senegal': FLAG('sn'), 'sierra leone': FLAG('sl'),
    'somalia': FLAG('so'), 'south africa': FLAG('za'), 'south sudan': FLAG('ss'),
    'sudan': FLAG('sd'), 'tanzania': FLAG('tz'), 'togo': FLAG('tg'), 'tunisia': FLAG('tn'),
    'uganda': FLAG('ug'), 'zambia': FLAG('zm'), 'zimbabwe': FLAG('zw'),
    // OFC
    'new zealand': FLAG('nz'), 'fiji': FLAG('fj'), 'papua new guinea': FLAG('pg'),
    'solomon islands': FLAG('sb'), 'tahiti': FLAG('pf'), 'vanuatu': FLAG('vu'),
    'new caledonia': FLAG('nc'), 'samoa': FLAG('ws'), 'tonga': FLAG('to'), 'cook islands': FLAG('ck'),
};

const isSoccerContext = (ctx) => {
    if (!ctx) return false;
    if (String(ctx.sportKey || '').toLowerCase().startsWith('soccer')) return true;
    return String(ctx.sport || '').toLowerCase().includes('soccer');
};

// Returns a flag CDN URL for a national soccer team, else null. Tries the
// full display name first (feeds sometimes ship "Bosnia and Herzegovina"
// in fullName but a clipped short name on the row), then the row name.
const nationalTeamFlagUrl = (teamName = '', ctx = null) => {
    if (!isSoccerContext(ctx)) return null;
    const tryKey = (n) => {
        const k = foldAccents(normalizeTeamName(n));
        return k && NATIONAL_TEAM_FLAG[k] ? NATIONAL_TEAM_FLAG[k] : null;
    };
    return (ctx && ctx.fullName && tryKey(ctx.fullName)) || tryKey(teamName) || null;
};

const cacheKeyForTeam = (teamName = '', ctx = null) => {
    const normalized = normalizeTeamName(teamName);
    if (!normalized) return '';
    const league = ctx ? leagueFromSport(ctx.sportKey, ctx.sport) : null;
    const rawCtxAbbr = ctx?.abbr == null ? '' : String(ctx.abbr).trim();
    const rawTeamName = teamName == null ? '' : String(teamName).trim();
    let abbr = rawCtxAbbr;
    if (!/^[A-Za-z]{2,4}$/.test(abbr) && /^[A-Za-z]{2,4}$/.test(rawTeamName)) {
        abbr = rawTeamName;
    }
    const compactAbbr = /^[A-Za-z]{2,4}$/.test(abbr)
        ? String(abbr).toLowerCase().replace(/[^a-z0-9]/g, '')
        : '';
    if (!league) return normalized;
    return compactAbbr ? `${league}:${compactAbbr}:${normalized}` : `${league}:${normalized}`;
};

const getHash = (input) => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
};

const toInitials = (teamName = '') => {
    const words = String(teamName).trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

export const createFallbackTeamLogoDataUri = (teamName = '') => {
    const safeTeamName = String(teamName || 'Team');
    const hash = getHash(safeTeamName.toLowerCase());
    const hue = hash % 360;
    const secondaryHue = (hue + 36) % 360;
    const initials = toInitials(safeTeamName);
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 78%, 46%)" />
      <stop offset="100%" stop-color="hsl(${secondaryHue}, 78%, 36%)" />
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="38" fill="url(#g)" />
  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="2" />
  <text x="40" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff">${initials}</text>
</svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
};

// Synchronous lookup used by MobileContentView. Returns a CDN URL or null.
// Only hits the hardcoded TEAM_LOGO_MAP + the warm in-memory cache — async
// network lookups happen via fetchTeamBadgeUrl below.
export const logoUrlForTeam = (teamName = '', ctx = null) => {
    const normalized = normalizeTeamName(teamName);
    const cacheKey = cacheKeyForTeam(teamName, ctx);
    // Full display name ("Vegas Golden Knights") is the most reliable key —
    // the curated TEAM_LOGO_MAP is keyed on full names and covers every
    // major-league team. Board rows feed the SHORT canonical name ("Vegas"),
    // which misses the map, so try the full name (supplied via ctx) first.
    const fullNorm = ctx && ctx.fullName ? normalizeTeamName(ctx.fullName) : '';
    if (fullNorm && TEAM_LOGO_MAP[fullNorm]) return TEAM_LOGO_MAP[fullNorm];
    if (normalized && TEAM_LOGO_MAP[normalized]) return TEAM_LOGO_MAP[normalized];
    // Sport-aware abbreviation path (city-only live rows). Resolved before
    // the warm cache so a previously mis-cached TheSportsDB URL can't win.
    const byCtx = resolveByContext(teamName, ctx);
    if (byCtx) return byCtx;
    // National-team flag (international soccer) — resolved before the warm
    // cache / TheSportsDB so national teams never sit on the initials avatar.
    const flag = nationalTeamFlagUrl(teamName, ctx);
    if (flag) return flag;
    if (!normalized) return null;
    // Warm cache populated by prior async resolutions.
    const cached = getCachedLogo(cacheKey);
    return cached && cached.url ? cached.url : null;
};

// ── Dynamic badge lookup via TheSportsDB ─────────────────────────────
// Covers essentially every pro team/athlete worldwide when the hardcoded
// map misses. The result (or a miss-sentinel) is cached in localStorage
// for 24h so we never call the API twice for the same team.
//
// Cache layout in localStorage:
//   { "<normalized name>": { url: string|null, ts: <epoch ms> }, ... }
// A `url: null` entry is a negative cache — still valid for the TTL to
// avoid hammering the API for teams it doesn't know (e.g. minor-league
// opponents, unknown athletes).
// v3 bump: adds player-search fallback for athletes (MMA fighters,
// boxers, tennis players) that never had team badges. Bumping the
// cache key forces any previously-missed entity to be re-resolved
// through the new code path.
// v4 bump: proxy now rejects unrelated first-match results (e.g.
// "Athletics" used to come back as Arsenal). Bumping the cache key
// invalidates the previously-cached wrong URLs so existing users
// re-resolve on next visit instead of staring at the bad logo for
// up to 24h while the negative cache TTL waits to expire.
// v5 bump: sport-aware abbreviation fallback now handles rows where
// teamName itself is a short code (BOS/SD) and sport labels come in as
// human-readable text ("Baseball", "Basketball"). Invalidate older
// cross-sport cached misses/hits so users pick up corrected logos now.
const LOGO_CACHE_KEY = 'betterdr:teamLogos:v6';
const LOGO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// Routed through the PHP proxy: direct browser calls to thesportsdb hit
// CORS and a shared 429 rate limit. Backend fetches server-side, caches
// for 7 days, and returns minimal JSON. See ThesportsdbProxyController.
const THE_SPORTS_DB_TEAM_PATH = '/proxy/thesportsdb/team';
const THE_SPORTS_DB_PLAYER_PATH = '/proxy/thesportsdb/player';

// Common prefixes/suffixes that different feeds disagree on. Stripping
// them creates variations that TheSportsDB tends to resolve (e.g.
// "1. FC Heidenheim" → "Heidenheim", "Stade Brestois 29" → "Brest").
const PREFIX_STRIP_RE = /^(?:\d+\.\s*|FC\s+|AC\s+|AS\s+|SC\s+|CF\s+|UD\s+|CD\s+|SL\s+|SV\s+|VfB\s+|VfL\s+|TSG\s+|TSV\s+|RB\s+|FK\s+|KS\s+|PSV\s+|SK\s+|OGC\s+|AJ\s+|FK\s+|NK\s+|HJK\s+)/i;
const SUFFIX_STRIP_RE = /\s+(?:FC|AC|CF|FK|SC|F\.C\.|United|City|Town|Rovers|Athletic|Football\s+Club|\d+)$/i;

const buildNameVariations = (name) => {
    const base = String(name || '').trim();
    if (!base) return [];
    const variants = new Set();
    variants.add(base);
    // Collapse/expand dashes — "Paris Saint-Germain" vs "Paris Saint Germain".
    variants.add(base.replace(/-/g, ' ').replace(/\s+/g, ' ').trim());
    variants.add(base.replace(/\s+/g, '-'));
    // Al-Hilal <-> Al Hilal style
    if (/\bAl[- ]/i.test(base)) {
        variants.add(base.replace(/\bAl\s+/gi, 'Al-'));
        variants.add(base.replace(/\bAl-/gi, 'Al '));
    }
    // Saint vs St (common alias split)
    variants.add(base.replace(/\bSaint\b/gi, 'St'));
    variants.add(base.replace(/\bSt\b\.?/gi, 'Saint'));
    // National-team name disagreements between feeds: "and" <-> "&", and
    // dropping a leading "Republic of" / "DR " ("Republic of Ireland" →
    // "Ireland", "DR Congo" → "Congo").
    variants.add(base.replace(/\s+and\s+/gi, ' & '));
    variants.add(base.replace(/\s*&\s*/g, ' and '));
    variants.add(base.replace(/^Republic of\s+/i, '').trim());
    variants.add(base.replace(/^DR\s+/i, '').trim());
    // Strip recognisable prefixes/suffixes.
    const prefixStripped = base.replace(PREFIX_STRIP_RE, '').trim();
    if (prefixStripped && prefixStripped !== base) variants.add(prefixStripped);
    const suffixStripped = base.replace(SUFFIX_STRIP_RE, '').trim();
    if (suffixStripped && suffixStripped !== base) variants.add(suffixStripped);
    const bothStripped = suffixStripped.replace(PREFIX_STRIP_RE, '').trim();
    if (bothStripped && bothStripped !== base) variants.add(bothStripped);
    // Drop prefix and take first distinctive word ("Stade Brestois 29" → "Brestois")
    const tokens = base.split(/\s+/).filter((t) => t && !/^\d+$/.test(t));
    if (tokens.length >= 2) {
        variants.add(tokens.slice(-2).join(' '));
        variants.add(tokens[tokens.length - 1]);
    }
    // Dedup and filter out empty / too-short noise.
    return [...variants].filter((v) => v && v.length >= 3);
};
const inFlight = new Map(); // dedupe concurrent fetches by normalized name

let memoryCache = null;
const loadCache = () => {
    if (memoryCache) return memoryCache;
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LOGO_CACHE_KEY) : null;
        memoryCache = raw ? JSON.parse(raw) : {};
    } catch {
        memoryCache = {};
    }
    if (typeof memoryCache !== 'object' || memoryCache === null) memoryCache = {};
    return memoryCache;
};
const saveCache = () => {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(memoryCache || {}));
        }
    } catch { /* quota / privacy — ignore */ }
};
const getCachedLogo = (normalizedName) => {
    const cache = loadCache();
    const entry = cache[normalizedName];
    if (!entry || typeof entry.ts !== 'number') return null;
    if (Date.now() - entry.ts > LOGO_CACHE_TTL_MS) {
        delete cache[normalizedName];
        return null;
    }
    return entry;
};
const setCachedLogo = (normalizedName, url) => {
    const cache = loadCache();
    cache[normalizedName] = { url: url || null, ts: Date.now() };
    saveCache();
};

// Async flavor — resolves to a CDN URL. Order of preference:
//   1. Hardcoded TEAM_LOGO_MAP (instant, no network)
//   2. localStorage cache (positive hit → URL; negative hit → fallback SVG)
//   3. TheSportsDB search (one call per team per 24h, deduplicated)
//   4. Fallback initials data URI
/**
 * Pre-warm the logo cache for a list of team/athlete names in parallel
 * with bounded concurrency. Call from list screens (e.g. MobileContentView)
 * right after matches arrive so every logo is already resolved by the
 * time TeamAvatar mounts — removes the "initials flash" on first visit.
 *
 * Bounded to 6 concurrent in-flight requests so we don't clobber
 * TheSportsDB's free tier. Already-cached names are skipped entirely.
 */
// Accepts plain name strings OR { name, sportKey, sport, abbr } items so
// the sport-aware abbreviation path can short-circuit before any network
// call (city-only names must never be prewarmed via TheSportsDB).
export const prewarmTeamBadges = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const unique = [];
    const seen = new Set();
    for (const it of items) {
        const name = typeof it === 'string' ? it : (it && it.name) || '';
        const ctx = typeof it === 'string' ? null : it;
        const normalized = normalizeTeamName(name || '');
        const cacheKey = cacheKeyForTeam(name, ctx);
        if (!normalized || !cacheKey || seen.has(cacheKey)) continue;
        seen.add(cacheKey);
        // Skip if already mapped (by full or short name), sport-resolvable,
        // or cached.
        const fullNorm = ctx && ctx.fullName ? normalizeTeamName(ctx.fullName) : '';
        if (fullNorm && TEAM_LOGO_MAP[fullNorm]) continue;
        if (TEAM_LOGO_MAP[normalized]) continue;
        if (resolveByContext(name, ctx)) continue;
        if (nationalTeamFlagUrl(name, ctx)) continue;
        if (getCachedLogo(cacheKey)) continue;
        unique.push({ name, ctx });
    }
    if (unique.length === 0) return;

    const concurrency = 6;
    let index = 0;
    const worker = async () => {
        while (index < unique.length) {
            const i = index++;
            try {
                await fetchTeamBadgeUrl(unique[i].name, unique[i].ctx);
            } catch { /* fetchTeamBadgeUrl already handles its own errors */ }
        }
    };
    for (let i = 0; i < Math.min(concurrency, unique.length); i++) {
        worker();
    }
};

export const fetchTeamBadgeUrl = async (teamName = '', ctx = null) => {
    const normalized = normalizeTeamName(teamName);
    const cacheKey = cacheKeyForTeam(teamName, ctx);
    if (!normalized) return createFallbackTeamLogoDataUri(teamName);

    // Full display name first — see logoUrlForTeam for the rationale. The
    // curated full-name map covers every major-league team, so this resolves
    // city-only board rows ("Vegas") to the right crest without a network call.
    const fullNorm = ctx && ctx.fullName ? normalizeTeamName(ctx.fullName) : '';
    if (fullNorm && TEAM_LOGO_MAP[fullNorm]) return TEAM_LOGO_MAP[fullNorm];
    if (TEAM_LOGO_MAP[normalized]) return TEAM_LOGO_MAP[normalized];

    // Sport-aware abbreviation path. Resolved before any network call so
    // city-only names ("Boston") never reach the sport-agnostic search and
    // never poison the cache with the wrong sport's badge.
    const byCtx = resolveByContext(teamName, ctx);
    if (byCtx) return byCtx;

    // National-team flag (international soccer) — short-circuits before any
    // network call so national teams resolve instantly and never depend on
    // TheSportsDB's spotty national coverage.
    const flag = nationalTeamFlagUrl(teamName, ctx);
    if (flag) return flag;

    const cached = getCachedLogo(cacheKey);
    if (cached) {
        return cached.url || createFallbackTeamLogoDataUri(teamName);
    }

    // Dedupe: if two renders ask for the same team at the same time,
    // only fire one request.
    if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

    // Sentinel for a transient failure (timeout / abort / network / 429 /
    // 5xx) — distinct from a valid "found: false" response. Transient
    // failures must NOT be negative-cached, otherwise one bad request pins
    // a perfectly resolvable team to the initials avatar for a full 24h.
    const FETCH_FAILED = Symbol('fetchFailed');
    const fetchJson = async (url) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
            const resp = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!resp.ok) return FETCH_FAILED;
            return await resp.json();
        } catch {
            clearTimeout(timeoutId);
            return FETCH_FAILED;
        }
    };

    const promise = (async () => {
        try {
            let sawTransient = false;
            // 1) Try up to 5 name variations against the team-search proxy.
            //    The backend picks exact-match-or-first and returns a
            //    minimal `{ found, logoUrl }` payload so all team-name
            //    normalization happens server-side.
            // Prefer the full display name for the search — "Vegas Golden
            // Knights" matches TheSportsDB far more reliably than the short
            // "Vegas". Falls back to the supplied teamName when no full name.
            const searchBase = (ctx && ctx.fullName) ? String(ctx.fullName) : teamName;
            const variations = buildNameVariations(searchBase).slice(0, 5);
            for (const variant of variations) {
                const data = await fetchJson(buildProxyUrl(THE_SPORTS_DB_TEAM_PATH, variant));
                if (data === FETCH_FAILED) { sawTransient = true; continue; }
                if (data?.found && typeof data.logoUrl === 'string' && data.logoUrl) {
                    setCachedLogo(cacheKey, data.logoUrl);
                    return data.logoUrl;
                }
            }

            // 2) Team search struck out — try the player-search proxy for
            //    athletes (MMA fighters, boxers, tennis players). Only
            //    try the original name; player-name variations like "FC"
            //    stripping don't help here.
            const playerData = await fetchJson(buildProxyUrl(THE_SPORTS_DB_PLAYER_PATH, teamName));
            if (playerData === FETCH_FAILED) {
                sawTransient = true;
            } else if (playerData?.found && typeof playerData.logoUrl === 'string' && playerData.logoUrl) {
                setCachedLogo(cacheKey, playerData.logoUrl);
                return playerData.logoUrl;
            }

            // Nothing matched. Only negative-cache a DEFINITIVE miss (every
            // request returned a real response). If any lookup failed
            // transiently, leave the cache untouched so the next render
            // retries instead of being stuck on initials for 24h.
            if (!sawTransient) setCachedLogo(cacheKey, null);
            return createFallbackTeamLogoDataUri(teamName);
        } catch {
            // Unexpected error — treat as transient, don't poison the cache.
            return createFallbackTeamLogoDataUri(teamName);
        } finally {
            inFlight.delete(cacheKey);
        }
    })();

    inFlight.set(cacheKey, promise);
    return promise;
};
