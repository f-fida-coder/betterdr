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

    // EPL (Wikipedia fallbacks for teams not on ESPN CDN)
    'leeds united': 'https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg',
    'nottingham forest': 'https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg',
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
export const logoUrlForTeam = (teamName = '') => {
    const normalized = normalizeTeamName(teamName);
    if (!normalized) return null;
    return TEAM_LOGO_MAP[normalized] || null;
};

// Async flavor used by SportContentView's existing code path. Returns a CDN
// URL when known; otherwise resolves to the fallback initials data URI so
// `teamLogos[name] || createFallbackTeamLogoDataUri(name)` in the caller
// always renders *something*.
export const fetchTeamBadgeUrl = async (teamName = '') => {
    const url = logoUrlForTeam(teamName);
    if (url) return url;
    return createFallbackTeamLogoDataUri(teamName);
};
