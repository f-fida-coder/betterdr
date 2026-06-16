// MLB listed-pitcher helpers — shared by the board card and the bet slip so
// the "S Alcantara - R" label and the baseball check read identically in both.

export function isMlbSportKey(sportKey) {
    return String(sportKey || '').toLowerCase().startsWith('baseball');
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
    'Wager voids if a listed starting pitcher is changed unless you select Action on that pitcher.';

export const MLB_OFFICIAL_GAME_POLICY =
    'Official game: moneyline, run line and total wagers have action once the game is official \u2014 9 innings, or 8\u00BD with the home team ahead. A game called before becoming official is void and refunded.';
