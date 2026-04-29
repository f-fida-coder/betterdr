// Broadcast network → display chip resolution. Rundown returns network
// names as raw strings ("ESPN", "TNT", "Prime Video", "ESPN/ESPN+",
// "Bally Sports Southwest", etc.). We normalize them into a small set
// of recognized brands with brand-correct chip colors, falling back to
// "Local TV" for regional sports networks and unknown channels so the
// row never reads as "Unknown".
//
// To keep the bundle small we use color-only chips with the brand name
// printed inside — no SVG logo set. That's enough to be visually
// distinguishable on the card without shipping a logo asset library.

const BROADCAST_BRANDS = [
    { id: 'espn',        match: /\bespn\b/i,                bg: '#d12128', fg: '#fff', name: 'ESPN' },
    { id: 'abc',         match: /\babc\b/i,                 bg: '#000000', fg: '#fff', name: 'ABC' },
    { id: 'tnt',         match: /\btnt\b/i,                 bg: '#e21c2a', fg: '#fff', name: 'TNT' },
    { id: 'tbs',         match: /\btbs\b/i,                 bg: '#1f2937', fg: '#fff', name: 'TBS' },
    { id: 'fs1',         match: /\bfs1\b/i,                 bg: '#101820', fg: '#ffd200', name: 'FS1' },
    { id: 'fox',         match: /\bfox\b/i,                 bg: '#003c7d', fg: '#fff', name: 'FOX' },
    { id: 'nbc-sports',  match: /\bnbc\s*sports\b/i,        bg: '#0a3a64', fg: '#fff', name: 'NBC SPORTS' },
    { id: 'nbc',         match: /\bnbc\b/i,                 bg: '#0c1f3f', fg: '#fff', name: 'NBC' },
    { id: 'peacock',     match: /\bpeacock\b/i,             bg: '#000000', fg: '#fff', name: 'PEACOCK' },
    { id: 'prime-video', match: /\b(amazon\s+)?prime(\s+video)?\b/i, bg: '#00a8e1', fg: '#fff', name: 'PRIME VIDEO' },
    { id: 'apple-tv',    match: /\bapple\s*tv\+?\b/i,       bg: '#0a0a0a', fg: '#fff', name: 'APPLE TV+' },
    { id: 'paramount',   match: /\bparamount\+?\b/i,        bg: '#0064ff', fg: '#fff', name: 'PARAMOUNT+' },
    { id: 'cbs',         match: /\bcbs\b/i,                 bg: '#003366', fg: '#fff', name: 'CBS' },
    { id: 'nfl-net',     match: /\bnfl\s*network\b/i,       bg: '#013369', fg: '#fff', name: 'NFL NETWORK' },
    { id: 'nba-tv',      match: /\bnba\s*tv\b/i,            bg: '#1d428a', fg: '#fff', name: 'NBA TV' },
    { id: 'mlb-net',     match: /\bmlb\s*network\b/i,       bg: '#002d72', fg: '#fff', name: 'MLB NETWORK' },
    { id: 'nhl-net',     match: /\bnhl\s*network\b/i,       bg: '#000000', fg: '#fff', name: 'NHL NETWORK' },
    { id: 'espn-plus',   match: /\bespn\+/i,                bg: '#000000', fg: '#fff', name: 'ESPN+' },
    { id: 'espn-deport', match: /\bespn\s*deportes\b/i,     bg: '#d12128', fg: '#fff', name: 'ESPN DEPORTES' },
    { id: 'truTV',       match: /\btrutv\b/i,               bg: '#15355a', fg: '#fff', name: 'truTV' },
    { id: 'usa',         match: /\busa\s*network\b/i,       bg: '#0072ce', fg: '#fff', name: 'USA' },
    { id: 'bally',       match: /\bbally\s*sports\b/i,      bg: '#0a2348', fg: '#fff', name: 'BALLY SPORTS' },
    { id: 'msg',         match: /\bmsg\b/i,                 bg: '#f47521', fg: '#fff', name: 'MSG' },
    { id: 'yes',         match: /\byes\s*network\b/i,       bg: '#003087', fg: '#fff', name: 'YES' },
    { id: 'sn',          match: /\bsportsnet\b/i,           bg: '#000000', fg: '#fff', name: 'SPORTSNET' },
    { id: 'tsn',         match: /\btsn\b/i,                 bg: '#0c2340', fg: '#fff', name: 'TSN' },
];

const RSN_FALLBACK = { id: 'local',  bg: '#475569', fg: '#fff', name: 'LOCAL TV' };

export const resolveBroadcast = (raw) => {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) return null;
    for (const brand of BROADCAST_BRANDS) {
        if (brand.match.test(value)) {
            return { ...brand, raw: value };
        }
    }
    // Unknown channel — likely a regional sports network. Use generic
    // "Local TV" chip rather than echoing the unrecognized string back
    // (per spec: omit unknowns gracefully, but here we still know there
    // *is* a broadcast — just not which national brand).
    return { ...RSN_FALLBACK, raw: value };
};
