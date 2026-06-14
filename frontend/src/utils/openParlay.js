// Open Parlay ("open play") frontend helpers.
//
// An open parlay locks at its EARLIEST leg's kickoff (the server's
// `closesAt`). Adding a leg whose game starts before the current lock time
// pulls the whole ticket's lock time forward to that earlier kickoff — the
// player can no longer add legs after that moment. The server is the
// authority on this (it recomputes closesAt on every add); these helpers
// only produce the player-facing warning so the add isn't a surprise.

import { formatSiteDateTime } from './timezone';

const toTs = (value) => {
    if (!value) return null;
    const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
};

/**
 * Decide whether adding a candidate leg moves the ticket's lock time earlier.
 *
 * @param {string|Date|null} currentClosesAt  the ticket's current lock time
 *                                             (null/empty for a ticket with no
 *                                             dated legs yet)
 * @param {string|Date|null} candidateStartTime  the new leg's game start
 * @returns {{ movesLockEarlier: boolean, newLockTime: string|null }}
 */
export const evaluateOpenParlayLockChange = (currentClosesAt, candidateStartTime) => {
    const candidateTs = toTs(candidateStartTime);
    if (candidateTs === null) {
        return { movesLockEarlier: false, newLockTime: currentClosesAt || null };
    }
    const currentTs = toTs(currentClosesAt);
    // No existing lock, or the candidate kicks off before it → this leg sets
    // (or pulls forward) the lock time.
    if (currentTs === null || candidateTs < currentTs) {
        return { movesLockEarlier: true, newLockTime: candidateStartTime || null };
    }
    return { movesLockEarlier: false, newLockTime: currentClosesAt || null };
};

/**
 * Player-facing warning shown before adding an early-starting leg to an open
 * parlay. Returns '' when the leg does NOT move the lock time earlier (no
 * warning needed).
 *
 * @param {string|Date|null} currentClosesAt
 * @param {string|Date|null} candidateStartTime
 * @returns {string}
 */
export const openParlayLockWarning = (currentClosesAt, candidateStartTime) => {
    const { movesLockEarlier } = evaluateOpenParlayLockChange(currentClosesAt, candidateStartTime);
    if (!movesLockEarlier) {
        return '';
    }
    return `This game starts earlier than your other legs — adding it locks this open parlay at ${formatSiteDateTime(candidateStartTime)}. You won't be able to add more legs after that.`;
};
