// Single source of truth for "is this match actually in-play right now".
//
// The board, Live Now, the mobile view and the scoreboard sidebar all used to
// keep their own copy of this test, and every copy trusted the feed's live
// flag verbatim: status === 'live' OR score.event_status containing
// IN_PROGRESS / LIVE. That over-trusts Rundown. Fast-turnover competitions —
// the Bet365-branded table-tennis leagues (TT Cup / Setka et al.) are the worst
// offenders — leave events flagged IN_PROGRESS at 0-0 with no clock long after
// they actually finish, because the terminal-status flip is settlement-paced
// (the live-score sweep is forbidden from writing finals, and the instant
// event-delta feed is down). The result was a red LIVE badge sitting over
// closing-line garbage (e.g. -15000 / +20000) on games that were not live.
//
// Fix: a row may only render LIVE when the feed flags it live AND there is a
// real in-play signal to back that flag up — a started/ongoing game leaves at
// least one of: a non-zero score, a running clock, a started period, a human
// period label, or per-period score data. A genuine live game sitting at 0-0
// in its opening seconds still carries a clock / period from Rundown, so this
// keeps real live rows while dropping the phantom ones.

export const TERMINAL_MATCH_STATUSES = new Set([
    'finished', 'final', 'ended', 'closed', 'expired',
    'canceled', 'cancelled', 'settled',
]);

// True when the match has a concrete sign that play has actually started.
export const hasInPlaySignal = (match) => {
    const score = match?.score || {};
    if (Number(score.score_home || 0) > 0 || Number(score.score_away || 0) > 0) return true;
    if (String(score.display_clock || '').trim() !== '') return true;
    if (Number(score.game_period || 0) > 0) return true;
    if (String(match?.eventStatusDetail || '').trim() !== '') return true;
    const byHome = Array.isArray(score.score_home_by_period) ? score.score_home_by_period : [];
    const byAway = Array.isArray(score.score_away_by_period) ? score.score_away_by_period : [];
    if (byHome.length > 0 || byAway.length > 0) return true;
    return false;
};

// True only when the feed flags the row live AND an in-play signal confirms it.
export const isLiveLikeMatch = (match) => {
    const status = String(match?.status || '').toLowerCase();
    if (TERMINAL_MATCH_STATUSES.has(status)) return false;
    const eventStatus = String(match?.score?.event_status || '').toUpperCase();
    const flaggedLive = status === 'live'
        || eventStatus.includes('IN_PROGRESS')
        || eventStatus.includes('LIVE');
    if (!flaggedLive) return false;
    return hasInPlaySignal(match);
};
