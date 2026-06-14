// Team-name display helpers.
//
// IMPORTANT: the backend keys all odds matching, placement, the odds-change
// handshake, and settlement on the SHORT canonical name (the city, e.g.
// "Miami") plus matchId + side. These helpers are PURELY for display — they
// never feed a value back into a match key. Always keep the short `selection`
// on slip items and placement payloads; only swap to the full name when
// rendering to the user.

// Canonical full "City Mascot" name for one side of a match-like object.
// Falls back through the full field → short/city → abbreviation.
export const teamFull = (matchLike, side /* 'home' | 'away' */) => {
  if (!matchLike) return '';
  const full = matchLike[`${side}TeamFull`];
  if (full && String(full).trim()) return String(full).trim();
  const short = matchLike[`${side}Team`];
  if (short && String(short).trim()) return String(short).trim();
  return String(matchLike[`${side}TeamShort`] || '').trim();
};

// "Away Full @ Home Full" matchup label.
export const matchupFull = (matchLike) => {
  const away = teamFull(matchLike, 'away');
  const home = teamFull(matchLike, 'home');
  if (away && home) return `${away} @ ${home}`;
  return String(matchLike?.matchName || matchLike?.eventName || '').trim();
};

// Resolve a stored/short selection string to its full display form.
// Team markets (the selection equals the short home/away name) map to the
// full "City Mascot"; Over/Under, player props, and anything that doesn't
// match a team name are returned verbatim (already display-ready).
export const fullSelectionLabel = (selectionShort, matchLike) => {
  const sel = String(selectionShort || '').trim();
  if (!sel || !matchLike) return sel;
  const homeShort = String(matchLike.homeTeam || '').trim();
  const awayShort = String(matchLike.awayTeam || '').trim();
  if (homeShort && sel === homeShort) return teamFull(matchLike, 'home') || sel;
  if (awayShort && sel === awayShort) return teamFull(matchLike, 'away') || sel;
  return sel;
};
