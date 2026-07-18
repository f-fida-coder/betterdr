// Unique logo-cache identity for a team.
//
// Teams share display names by CITY ("Los Angeles" = Dodgers / Angels / Rams /
// Chargers / Lakers / Clippers / Kings / …; "New York" = Yankees / Mets /
// Giants / Jets / …), so a logo cache keyed on the city name collapses every
// same-city team — across sports too — onto a single crest (the bug where the
// Dodgers and the Rams both showed the Angels logo).
//
// The identity is sport + abbreviation (the same thing the board's TeamAvatar
// keys on). Prefer the abbr; fall back to the full name, then the bare name;
// always scoped by sportKey so a game total's two crests and cross-sport legs
// can never collide either. Pure + dependency-free so it's unit-testable in CI.
export const teamLogoKey = (sportKey, abbr, name, full) => {
    const s = String(sportKey || '').trim().toLowerCase();
    const id = String(abbr || full || name || '').trim().toLowerCase();
    return `${s}:${id}`;
};
