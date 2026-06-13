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
