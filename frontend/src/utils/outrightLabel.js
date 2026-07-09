// Futures/outright wager display — THE single config for competition names.
// Every place a wager row describes an outright leg (My Bets, receipt, admin
// views) builds its text here, so a new futures board added later needs
// exactly one entry in OUTRIGHT_COMPETITION_LABELS below.

// The Odds API board sportKey → the competition the player reads:
// "Vikings to win Super Bowl". Keys mirror OddsApiAllowlist::OUTRIGHT_KEYS
// (php-backend); an unmapped key falls back to the placement snapshot's
// eventName with its trailing "Winner" stripped, so a brand-new board still
// renders sensibly before it gets its entry.
const OUTRIGHT_COMPETITION_LABELS = {
    americanfootball_nfl_super_bowl_winner: 'Super Bowl',
    americanfootball_ncaaf_championship_winner: 'NCAAF Championship',
    baseball_mlb_world_series_winner: 'World Series',
    basketball_nba_championship_winner: 'NBA Championship',
    basketball_ncaab_championship_winner: 'NCAAB Championship',
    icehockey_nhl_championship_winner: 'Stanley Cup',
    soccer_fifa_world_cup_winner: 'World Cup',
    golf_masters_tournament_winner: 'The Masters',
    golf_pga_championship_winner: 'PGA Championship',
    golf_the_open_championship_winner: 'The Open',
    golf_us_open_winner: 'U.S. Open',
};

// Nickname shortening only applies to US team-sport boards. Soccer outrights
// are national teams ("France") or clubs ("Manchester City" — shortening to
// "City" is wrong), and golf outrights are people; both keep the full name.
const NICKNAME_FAMILIES = ['americanfootball', 'basketball', 'baseball', 'icehockey'];

// Two-word mascots a last-token shortener would butcher ("Boston Red Sox" →
// "Sox"). Pro leagues + common NCAA names; a miss here just means the last
// word shows, never a broken row.
const MULTI_WORD_NICKNAMES = [
    'Trail Blazers', 'Red Sox', 'White Sox', 'Blue Jays', 'Maple Leafs',
    'Golden Knights', 'Red Wings', 'Blue Jackets',
    'Crimson Tide', 'Fighting Irish', 'Fighting Illini', 'Blue Devils',
    'Tar Heels', 'Nittany Lions', 'Horned Frogs', 'Yellow Jackets',
    'Red Raiders', 'Golden Eagles', 'Golden Gophers', 'Golden Bears',
    'Sun Devils', 'Demon Deacons', 'Green Wave', 'Scarlet Knights',
    'Black Knights', 'Red Storm', 'Mean Green',
];

/** True when a leg is an outright/futures pick. */
export const isOutrightLeg = (leg) => (
    String(leg?.marketType || '').toLowerCase() === 'outrights' || !!leg?.isOutright
);

/**
 * Team nickname for an outright selection — "Minnesota Vikings" → "Vikings",
 * matching how spread/moneyline legs mascot-shorten. Full name kept for
 * non-team boards (soccer/golf) and single-word names.
 */
export const outrightSelectionNickname = (name, sportKey) => {
    const full = String(name || '').trim();
    const key = String(sportKey || '').toLowerCase();
    if (!full || !NICKNAME_FAMILIES.some((f) => key.startsWith(f))) return full;
    for (const nick of MULTI_WORD_NICKNAMES) {
        if (full.toLowerCase().endsWith(nick.toLowerCase()) && full.length > nick.length) return nick;
    }
    const tokens = full.split(/\s+/);
    return tokens[tokens.length - 1];
};

/**
 * Competition label for an outright board: the curated name for a known
 * sportKey, else the snapshot's eventName minus its trailing "Winner"
 * ("NFL Super Bowl Winner" → "NFL Super Bowl"). '' when both miss —
 * callers must then fall back to their plain name + odds format.
 */
export const outrightCompetitionLabel = (sportKey, eventName) => {
    const key = String(sportKey || '').toLowerCase().trim();
    if (key && OUTRIGHT_COMPETITION_LABELS[key]) return OUTRIGHT_COMPETITION_LABELS[key];
    return String(eventName || '').trim().replace(/\s+winner\s*$/i, '');
};

/**
 * Full display text for an outright leg, without odds: "Vikings to win
 * Super Bowl". Reads the placement snapshot, so existing pending futures
 * render correctly at display time with no backfill. '' when the
 * competition can't be resolved — callers keep their name + odds fallback,
 * never a dangling "to win".
 */
export const outrightLegText = (leg) => {
    const snap = leg?.matchSnapshot || {};
    const competition = outrightCompetitionLabel(snap.sportKey, snap.eventName);
    if (!competition) return '';
    const name = String(leg?.selectionFull || leg?.selection || '').trim();
    if (!name) return '';
    return `${outrightSelectionNickname(name, snap.sportKey)} to win ${competition}`;
};
