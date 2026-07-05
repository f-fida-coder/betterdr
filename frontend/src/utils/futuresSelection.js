import { findSportItemById, OUTRIGHTS_ENABLED } from '../data/sportsData';

/**
 * Resolve the sidebar selection into OutrightsView props — the SINGLE
 * source of truth for "which futures boards should render", shared by
 * the desktop (DashboardMain) and mobile (UserDashboardShell) dispatch
 * paths. These used to be two hand-copied blocks and drifted: the mobile
 * copy never learned family scoping, so tapping "Golf Futures" rendered
 * every sport's boards under a golf header.
 *
 * Returns null when the selection contains no futures node (or the
 * outrights kill switch is off) — callers fall through to the regular
 * match views. Otherwise:
 *   - families:  family ids to scope to; [] = all (top-level FUTURES tab,
 *     which has no family, deliberately widens to the full catalog)
 *   - boardKeys: exact sport-key allowlist when EVERY selected node names
 *     its board(s); [] falls back to family scoping so a family-only node
 *     never has its boards hidden by its neighbours' keys
 *   - sportKey:  single-selection fast path — OutrightsView fetches just
 *     that board from the API instead of filtering client-side
 *   - title:     header label (the node's own label when exactly one)
 */
export const resolveFuturesSelection = (selectedSports) => {
    if (!OUTRIGHTS_ENABLED || !Array.isArray(selectedSports)) return null;
    const items = selectedSports
        .map((id) => findSportItemById(id))
        .filter((it) => it && it.type === 'futures');
    if (items.length === 0) return null;

    const hasUnscoped = items.some((it) => !it.family);
    const families = hasUnscoped
        ? []
        : [...new Set(items.map((it) => it.family))];
    const allHaveBoards = !hasUnscoped
        && items.every((it) => Array.isArray(it.sportKeys) && it.sportKeys.length > 0);
    const boardKeys = allHaveBoards
        ? [...new Set(items.flatMap((it) => it.sportKeys))]
        : [];
    const single = items.length === 1 ? items[0] : null;
    const sportKey = single && Array.isArray(single.sportKeys) && single.sportKeys.length > 0
        ? single.sportKeys[0]
        : '';

    return {
        families,
        boardKeys,
        sportKey,
        title: single ? (single.label || 'Futures') : 'Futures',
    };
};
