const ESPN_LOGO = (league, abbr) => `https://a.espncdn.com/i/teamlogos/${league}/500/${abbr}.png`;

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
};

export const normalizeTeamName = (teamName = '') =>
    String(teamName || '')
        .toLowerCase()
        .replace(/[.'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

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
export const logoUrlForTeam = (teamName = '') => {
    const normalized = normalizeTeamName(teamName);
    if (!normalized) return null;
    if (TEAM_LOGO_MAP[normalized]) return TEAM_LOGO_MAP[normalized];
    // Warm cache populated by prior async resolutions.
    const cached = getCachedLogo(normalized);
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
const LOGO_CACHE_KEY = 'betterdr:teamLogos:v3';
const LOGO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const THE_SPORTS_DB_TEAM_SEARCH = 'https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=';
const THE_SPORTS_DB_PLAYER_SEARCH = 'https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=';

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
export const prewarmTeamBadges = (names = []) => {
    if (!Array.isArray(names) || names.length === 0) return;
    const unique = [];
    const seen = new Set();
    for (const n of names) {
        const normalized = normalizeTeamName(n || '');
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        // Skip if already mapped or cached (positive or negative).
        if (TEAM_LOGO_MAP[normalized]) continue;
        if (getCachedLogo(normalized)) continue;
        unique.push(n);
    }
    if (unique.length === 0) return;

    const concurrency = 6;
    let index = 0;
    const worker = async () => {
        while (index < unique.length) {
            const i = index++;
            try {
                await fetchTeamBadgeUrl(unique[i]);
            } catch { /* fetchTeamBadgeUrl already handles its own errors */ }
        }
    };
    for (let i = 0; i < Math.min(concurrency, unique.length); i++) {
        worker();
    }
};

export const fetchTeamBadgeUrl = async (teamName = '') => {
    const normalized = normalizeTeamName(teamName);
    if (!normalized) return createFallbackTeamLogoDataUri(teamName);

    if (TEAM_LOGO_MAP[normalized]) return TEAM_LOGO_MAP[normalized];

    const cached = getCachedLogo(normalized);
    if (cached) {
        return cached.url || createFallbackTeamLogoDataUri(teamName);
    }

    // Dedupe: if two renders ask for the same team at the same time,
    // only fire one request.
    if (inFlight.has(normalized)) return inFlight.get(normalized);

    const fetchJson = async (url) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
            const resp = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!resp.ok) return null;
            return await resp.json();
        } catch {
            clearTimeout(timeoutId);
            return null;
        }
    };

    const promise = (async () => {
        try {
            // 1) Try up to 5 name variations on the TEAM-search endpoint.
            //    First hit with a badge wins.
            const variations = buildNameVariations(teamName).slice(0, 5);
            for (const variant of variations) {
                const data = await fetchJson(THE_SPORTS_DB_TEAM_SEARCH + encodeURIComponent(variant));
                const teams = Array.isArray(data?.teams) ? data.teams : [];
                if (teams.length === 0) continue;
                const variantNorm = normalizeTeamName(variant);
                const exact = teams.find((t) => {
                    const candidate = normalizeTeamName(t?.strTeam || '');
                    return candidate === normalized || candidate === variantNorm;
                });
                const match = exact || teams[0];
                const badge = match?.strBadge || match?.strTeamBadge || match?.strLogo || null;
                if (badge) {
                    setCachedLogo(normalized, badge);
                    return badge;
                }
            }

            // 2) Team search struck out — try PLAYER search for athletes
            //    (MMA fighters, boxers, tennis players, etc.). Player
            //    entries carry headshots in strThumb/strCutout. Only try
            //    the original name — player-name variations like "FC"
            //    stripping don't help here.
            const playerData = await fetchJson(THE_SPORTS_DB_PLAYER_SEARCH + encodeURIComponent(teamName));
            const players = Array.isArray(playerData?.player) ? playerData.player : [];
            if (players.length > 0) {
                const exactPlayer = players.find((p) =>
                    normalizeTeamName(p?.strPlayer || '') === normalized
                );
                const playerMatch = exactPlayer || players[0];
                const thumb = playerMatch?.strCutout
                    || playerMatch?.strThumb
                    || playerMatch?.strRender
                    || null;
                if (thumb) {
                    setCachedLogo(normalized, thumb);
                    return thumb;
                }
            }

            // Nothing matched — negative cache the miss for 24h.
            setCachedLogo(normalized, null);
            return createFallbackTeamLogoDataUri(teamName);
        } catch {
            setCachedLogo(normalized, null);
            return createFallbackTeamLogoDataUri(teamName);
        } finally {
            inFlight.delete(normalized);
        }
    })();

    inFlight.set(normalized, promise);
    return promise;
};
