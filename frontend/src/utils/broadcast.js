// Broadcast network → display chip resolution. The backend writes the raw
// network string onto each match from TheRundown's score.broadcast field
// (NOT ESPN's scoreboard). For MLB that is almost always a slash-joined
// priority list led by the league stream, e.g. "MLB.TV",
// "MLB.TV/NESN/NBC Sports Phil", "MLB.TV/Padres.TV". We split the combo and
// surface the single most meaningful network by tier:
//   1) national networks  →  2) regional sports networks (RSNs, incl. the
//   "<Team>.TV" club feeds)  →  3) bare "MLB.TV" (league stream)  →  hidden.
//
// Coverage note: ~54% of MLB rows ship an EMPTY broadcast string from the
// feed, so the realistic ceiling is ~46% of games showing a chip. That gap
// is a feed data limit, not a resolver bug.
//
// To keep the bundle small we use color-only chips with the brand name
// printed inside — no SVG logo set. That's enough to be visually
// distinguishable on the card without shipping a logo asset library.

// Tier 1 — national networks. Highest priority: if any token names a
// national broadcaster, surface it over any RSN in the same string. Ordered
// so more specific patterns (ESPN Deportes / ESPN+) win before the generic
// ESPN. The national `nbc` uses a negative lookahead so "NBC Sports <city>"
// (an RSN) falls through to the RSN tier instead of showing a bare "NBC".
const NATIONAL_BRANDS = [
    { id: 'espn-deport', match: /\bespn\s*deportes\b/i,     bg: '#d12128', fg: '#fff', name: 'ESPN DEPORTES' },
    { id: 'espn-plus',   match: /\bespn\s*\+/i,             bg: '#000000', fg: '#fff', name: 'ESPN+' },
    { id: 'espn',        match: /\bespn\b/i,                bg: '#d12128', fg: '#fff', name: 'ESPN' }, // incl. "ESPN Unlmtd"
    { id: 'apple-tv',    match: /\bapple\s*tv\+?\b/i,       bg: '#0a0a0a', fg: '#fff', name: 'APPLE TV+' },
    { id: 'fs1',         match: /\bfs1\b/i,                 bg: '#101820', fg: '#ffd200', name: 'FS1' },
    { id: 'fox',         match: /\bfox\b/i,                 bg: '#003c7d', fg: '#fff', name: 'FOX' },
    { id: 'tbs',         match: /\btbs\b/i,                 bg: '#1f2937', fg: '#fff', name: 'TBS' },
    { id: 'tnt',         match: /\btnt\b/i,                 bg: '#e21c2a', fg: '#fff', name: 'TNT' },
    { id: 'peacock',     match: /\bpeacock\b/i,             bg: '#000000', fg: '#fff', name: 'PEACOCK' },
    { id: 'prime-video', match: /\b(amazon\s+)?prime(\s+video)?\b/i, bg: '#00a8e1', fg: '#fff', name: 'PRIME VIDEO' },
    { id: 'mlb-net',     match: /\bmlb\s*net(work)?\b/i,    bg: '#002d72', fg: '#fff', name: 'MLB NETWORK' }, // "MLB Net"/"MLB Network", NOT "MLB.TV"
    { id: 'paramount',   match: /\bparamount\+?\b/i,        bg: '#0064ff', fg: '#fff', name: 'PARAMOUNT+' },
    { id: 'cbs',         match: /\bcbs\b/i,                 bg: '#003366', fg: '#fff', name: 'CBS' },
    { id: 'abc',         match: /\babc\b/i,                 bg: '#000000', fg: '#fff', name: 'ABC' },
    { id: 'nfl-net',     match: /\bnfl\s*network\b/i,       bg: '#013369', fg: '#fff', name: 'NFL NETWORK' },
    { id: 'nba-tv',      match: /\bnba\s*tv\b/i,            bg: '#1d428a', fg: '#fff', name: 'NBA TV' },
    { id: 'nhl-net',     match: /\bnhl\s*network\b/i,       bg: '#000000', fg: '#fff', name: 'NHL NETWORK' },
    { id: 'usa',         match: /\busa\s*network\b/i,       bg: '#0072ce', fg: '#fff', name: 'USA' },
    { id: 'truTV',       match: /\btrutv\b/i,               bg: '#15355a', fg: '#fff', name: 'truTV' },
    { id: 'tsn',         match: /\btsn\b/i,                 bg: '#0c2340', fg: '#fff', name: 'TSN' },
    { id: 'nbc',         match: /\bnbc\b(?!\s*sports)/i,    bg: '#0c1f3f', fg: '#fff', name: 'NBC' },
];

// Tier 2 — regional sports networks (RSNs). Named MLB RSNs plus the
// cross-sport ones (Bally, MSG, YES, Sportsnet, NBC Sports regionals).
const RSN_BRANDS = [
    { id: 'nesn',        match: /\bnesn\b/i,                bg: '#0a2a52', fg: '#fff', name: 'NESN' },
    { id: 'masn',        match: /\bmasn\b/i,                bg: '#d31245', fg: '#fff', name: 'MASN' },
    { id: 'marquee',     match: /\bmarquee\b/i,             bg: '#0e3386', fg: '#fff', name: 'MARQUEE' },
    { id: 'chsn',        match: /\bchsn\b/i,                bg: '#13274f', fg: '#fff', name: 'CHSN' },
    { id: 'sny',         match: /\bsny\b/i,                 bg: '#003087', fg: '#fff', name: 'SNY' },
    { id: 'space-city',  match: /\bspace\s*city\b/i,        bg: '#002d62', fg: '#fff', name: 'SPACE CITY' },
    { id: 'braves',      match: /\bbravesvision\b/i,        bg: '#13274f', fg: '#fff', name: 'BRAVES VISION' },
    { id: 'rangers-sn',  match: /\brangers\s*sports\b/i,    bg: '#003278', fg: '#fff', name: 'RANGERS SN' },
    { id: 'bally',       match: /\bbally\s*sports\b/i,      bg: '#0a2348', fg: '#fff', name: 'BALLY SPORTS' },
    { id: 'fanduel-sn',  match: /\bfanduel\s*sports\b|\bfdsn\b/i, bg: '#1493ff', fg: '#fff', name: 'FANDUEL SN' },
    { id: 'nbc-sports',  match: /\bnbc\s*sports\b/i,        bg: '#0a3a64', fg: '#fff', name: 'NBC SPORTS' },
    { id: 'sn',          match: /\bsportsnet\b/i,           bg: '#000000', fg: '#fff', name: 'SPORTSNET' },
    { id: 'yes',         match: /\byes\b/i,                 bg: '#003087', fg: '#fff', name: 'YES' },
    { id: 'msg',         match: /\bmsg\b/i,                 bg: '#f47521', fg: '#fff', name: 'MSG' },
];

// Tier 3 — the league-wide stream. Lowest priority: only surfaces when no
// national or RSN was found, so MLB.TV-only games show a chip instead of a
// blank row. Matches "MLB.TV" / "MLB TV" but never the "MLB Net(work)"
// national entry above or the "<Team>.TV" club feeds below.
const MLB_TV_BRAND = { id: 'mlb-tv', match: /\bmlb\.?\s*tv\b/i, bg: '#041e42', fg: '#fff', name: 'MLB.TV' };

// "<Team>.TV" club feed (e.g. "Padres.TV", "Brewers.TV") → readable chip.
// Excludes the league-wide "MLB.TV", which is Tier 3.
const TEAM_TV_RE = /^(.+?)\.tv$/i;

export const resolveBroadcast = (raw) => {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) return null;
    // Feed ships either a single network or a slash-joined priority list,
    // e.g. "MLB.TV/NESN/NBC Sports Phil". Resolve per token by tier.
    const tokens = value.split('/').map((t) => t.trim()).filter(Boolean);
    const hasToken = (brand) => tokens.some((t) => brand.match.test(t));

    for (const brand of NATIONAL_BRANDS) {
        if (hasToken(brand)) return { ...brand, raw: value };
    }
    for (const brand of RSN_BRANDS) {
        if (hasToken(brand)) return { ...brand, raw: value };
    }
    // Generic "<Team>.TV" club feed — but not the league-wide MLB.TV.
    for (const t of tokens) {
        const m = TEAM_TV_RE.exec(t);
        if (m && !/^mlb$/i.test(m[1].trim())) {
            const team = m[1].trim();
            return { id: 'team-tv', bg: '#1a3a5c', fg: '#fff', name: `${team.toUpperCase()}.TV`, raw: value };
        }
    }
    // Bare league stream → show an "MLB.TV" chip (decision: surface it rather
    // than hide, so the ~29% of MLB games carrying only MLB.TV aren't blank).
    if (MLB_TV_BRAND.match.test(value)) return { ...MLB_TV_BRAND, raw: value };
    // Unknown channel — hide the chip rather than show a generic placeholder.
    return null;
};
