// JS port of SportsbookBetSupport::applyTeaserAdjustment (PHP). The
// backend is the source of truth — it re-applies the adjustment at
// placement time. This module exists only to drive the UI's *live
// preview* when a teaser type is selected, so the odds board can show
// adjusted lines (e.g. -1.5 → +4.5 with a 6-pt football teaser) before
// the user taps Place. Math must mirror the PHP exactly:
//
//   spreads: adjustedPoint = originalPoint + teaserPoints
//            (always favours the bettor — both sides shift the same
//            way; a -3.5 fav becomes +2.5, a +3.5 dog becomes +9.5)
//   totals:  Over  → originalPoint − teaserPoints  (lower threshold)
//            Under → originalPoint + teaserPoints  (higher threshold)
//
// All other markets (h2h, props, etc.) are not teaser-eligible and the
// caller should skip them before invoking this util.
//
// Pure function — no side effects, no React/DOM dependency. Returns
// `null` on invalid input so callers can fall back to the base line
// without a try/catch (PHP throws ApiException; the UI doesn't need
// the same hostility).

const TEASER_MARKETS = new Set(['spreads', 'totals']);

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Compute the teaser-adjusted point for a single market outcome.
 *
 * @param {object} outcome
 * @param {string} outcome.marketType         'spreads' | 'totals'
 * @param {string} [outcome.selection]        used for totals to detect Over/Under
 * @param {string} [outcome.name]             alternative field for selection name
 * @param {number} outcome.point              base spread/total
 * @param {number} teaserPoints               positive points to apply
 * @returns {{ adjustedPoint: number, basePoint: number, teaserAdjustment: number } | null}
 */
export const adjustSpread = (outcome, teaserPoints) => {
    if (!outcome || typeof outcome !== 'object') return null;
    const points = Number(teaserPoints);
    if (!isFiniteNumber(points) || points <= 0) return null;

    const marketType = String(outcome.marketType || '').toLowerCase();
    if (!TEASER_MARKETS.has(marketType)) return null;

    const rawPoint = outcome.point;
    const basePoint = Number(rawPoint);
    if (!isFiniteNumber(basePoint)) return null;

    let adjustedPoint = basePoint;
    if (marketType === 'spreads') {
        adjustedPoint = basePoint + points;
    } else {
        // totals: branch on the outcome name. The backend does the same
        // case-insensitive substring match on `selection`.
        const label = String(outcome.selection || outcome.name || '').toLowerCase();
        adjustedPoint = label.includes('over')
            ? basePoint - points
            : basePoint + points;
    }

    // Round to 2dp to match PHP's round($adjustedPoint, 2). Spreads/totals
    // are always half- or whole-point, so this is mainly defensive against
    // 6.0000000001 float drift when adding 6.5 to -1.5 etc.
    const rounded = Math.round(adjustedPoint * 100) / 100;
    return {
        adjustedPoint: rounded,
        basePoint,
        teaserAdjustment: Math.round((rounded - basePoint) * 100) / 100,
    };
};

/**
 * Resolve the teaser points to apply to a leg given its sport group and
 * the picked teaser type. Returns 0 (no adjustment) when the type
 * doesn't cover the leg's sport — caller treats 0 as "show base line".
 *
 * @param {object} type            teaser type from rules.teaserTypes
 * @param {string} sportGroup      'football' | 'basketball' | other
 * @returns {number}
 */
export const teaserPointsForSport = (type, sportGroup) => {
    if (!type || typeof type !== 'object') return 0;
    const map = type.pointsBySport;
    if (!map || typeof map !== 'object') return 0;
    const value = Number(map[sportGroup]);
    return isFiniteNumber(value) && value > 0 ? value : 0;
};

/**
 * Map a sport key (Odds API style) or static-tree sport id to the
 * teaser sport group used by pointsBySport. Returns null when the
 * sport doesn't have a teaser product. Mirrors
 * BetModeRules::teaserSportGroup on the backend so frontend +
 * backend agree on grouping without an extra API round-trip.
 */
export const teaserSportGroup = (sportKeyOrId) => {
    const key = String(sportKeyOrId || '').toLowerCase().trim();
    if (key === '') return null;
    if (key.startsWith('americanfootball_') || key === 'football') return 'football';
    if (key.startsWith('basketball_') || key === 'basketball') return 'basketball';
    return null;
};
