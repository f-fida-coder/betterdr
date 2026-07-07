import { sportsData } from '../data/sportsData';

// sportKey → the sidebar futures-leaf label ("To Win Super Bowl"), so bet
// rows describe an outright leg with the same wording the player clicked
// when they placed it. Built once from sportsData — the sidebar is the
// single source of truth for these names; no second hand-kept list.
const buildSportKeyLabelMap = () => {
    const map = {};
    const walk = (items) => {
        for (const it of items || []) {
            if (!it) continue;
            if (it.type === 'futures' && Array.isArray(it.sportKeys)) {
                for (const key of it.sportKeys) {
                    const k = String(key || '').toLowerCase().trim();
                    if (k && it.label) map[k] = String(it.label);
                }
            }
            walk(it.children);
        }
    };
    walk(sportsData);
    return map;
};

const SPORT_KEY_LABELS = buildSportKeyLabelMap();

/**
 * Friendly market name for an outright/futures leg: the sidebar leaf label
 * for the board's sportKey, falling back to the placement snapshot's
 * eventName ("NFL Super Bowl Winner") for boards not in the sidebar.
 * Returns '' when both miss — callers must then render their existing
 * name + odds format rather than a blank market segment.
 */
export const outrightMarketLabel = (sportKey, eventName) => {
    const key = String(sportKey || '').toLowerCase().trim();
    if (key && SPORT_KEY_LABELS[key]) return SPORT_KEY_LABELS[key];
    return String(eventName || '').trim();
};

/** The label for a leg object (reads the placement matchSnapshot). */
export const outrightMarketLabelForLeg = (leg) => outrightMarketLabel(
    leg?.matchSnapshot?.sportKey,
    leg?.matchSnapshot?.eventName,
);

/** True when a leg is an outright/futures pick. */
export const isOutrightLeg = (leg) => (
    String(leg?.marketType || '').toLowerCase() === 'outrights' || !!leg?.isOutright
);
