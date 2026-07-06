// MLB listed-pitcher helpers — shared by the board card and the bet slip so
// the "S Alcantara - R" label and the baseball check read identically in both.

export function isMlbSportKey(sportKey) {
    return String(sportKey || '').toLowerCase().startsWith('baseball');
}

// Soccer sport-key predicate (e.g. 'soccer_fifa_world_cup', 'soccer_epl').
// Used to enable soccer-specific board markets (the Draw row, team totals).
export function isSoccerSportKey(sportKey) {
    return String(sportKey || '').toLowerCase().startsWith('soccer');
}

// Sports where the board hides the Spread⇄Alt toggle entirely. Bettors move the
// line with Buy Points instead of pre-priced alt-spread ladders.
//   - WNBA (basketball_wnba): alt spreads dropped at ingestion (Nicky); residual
//     stale rungs may still be stored, so suppress by sport.
//   - Football (americanfootball_*: NFL + NCAAF): use Buy Points, not alt
//     ladders (Nicky). Requires BUY_POINTS_ENABLED_SPORTS to include the key.
// Team totals (the Total⇄TT toggle) are unaffected for all of these.
export function isAltSpreadSuppressedSport(sportKey) {
    const k = String(sportKey || '').toLowerCase();
    return k === 'basketball_wnba' || k.startsWith('americanfootball');
}

// "Sandy Alcantara" -> "S Alcantara" (matches the listed-pitcher convention
// real books use on the board). One-word names pass through unchanged.
export function abbreviatePitcherName(name) {
    const n = String(name || '').trim();
    if (!n) return '';
    const parts = n.split(/\s+/);
    if (parts.length === 1) return parts[0];
    const first = parts[0];
    const last = parts.slice(1).join(' ');
    return `${first.charAt(0)} ${last}`;
}

// Full label as shown on the board / slip: "S Alcantara - R" (R/L = throwing
// hand). Falls back to just the name when the hand is unknown.
export function formatPitcherLabel(pitcher, { withHand = true } = {}) {
    if (!pitcher) return '';
    const name = abbreviatePitcherName(pitcher.name);
    if (!name) return '';
    return withHand && pitcher.hand ? `${name} - ${pitcher.hand}` : name;
}

// Does this match carry at least one listed starting pitcher?
export function hasListedPitchers(pitchers) {
    return !!(pitchers && (pitchers.away || pitchers.home));
}

// Canonical MLB house-rule copy shown to players. This text MUST describe
// settlement behavior EXACTLY — a banner/behavior mismatch is a player dispute.
// Keep in lockstep with the backend:
//   - listed-pitcher void   → SportsbookBetSupport::listedPitcherVoid
//   - 8½/9 official game     → SportsbookBetSupport::baseballOfficialGameStatus
export const MLB_LISTED_PITCHER_POLICY =
    'Wager voids if listed starting pitcher is changed unless you select Action on pitcher.';

export const MLB_OFFICIAL_GAME_POLICY =
    'Official game: moneyline, run line and total wagers have action once the game is official \u2014 9 innings, or 8\u00BD with the home team ahead. A game called before becoming official is void and refunded.';

// Canonical soccer house-rule copy. This text MUST describe settlement
// behavior EXACTLY \u2014 soccer grades at regulation: STATUS_FULL_TIME is
// terminal (RundownEventMapper STATUS_MAP) and the score locks there, so
// ET/PK goals never reach the stored final. Cards/corners are graded by
// an operator ("unless otherwise stated" covers markets priced on ET).
export const SOCCER_90_MINUTE_POLICY =
    'All soccer wagers are decided on 90 minutes play plus injury time. Extra Time and Penalty Kicks do not count unless otherwise stated.';
