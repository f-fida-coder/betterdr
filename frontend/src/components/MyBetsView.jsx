import React, { useEffect, useMemo, useState } from 'react';
import { getMyBets, getUserFigures, getUserTransactions, getRoundRobinChildren, regradeStuckBets } from '../api';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatLineValue, formatOdds, formatSpreadValue, americanToDecimal } from '../utils/odds';
import { formatSiteDateTime } from '../utils/timezone';
import { fetchTeamBadgeUrl, createFallbackTeamLogoDataUri, mascotName } from '../utils/teamLogos';
import { formatMoneyWholeFloored, formatMoneyWholeRounded } from '../utils/money';
import { isOutrightLeg, outrightLegText } from '../utils/outrightLabel';
import '../mybets.css';
import { consumeMyBetsInitialFilter } from './myBetsState';
import { prettyPlayerMarketLabel, isPlayerPropMarket } from '../utils/propBuilderMarkets';

const money = (value) => `$${Math.round(Number(value || 0))}`;
const moneySigned = (value) => {
    const n = Number(value || 0);
    if (n > 0) return `+$${Math.round(Math.abs(n))}`;
    if (n < 0) return `-$${Math.round(Math.abs(n))}`;
    return '$0';
};
// Ticket-row money formatter: 2dp with thousands separator. Mirrors the
// bet-review modal's `formatAmount` so the pending row reads exactly what
// the modal showed at placement (a typed $1000 Win on +590 stores
// 169.49 risk / 1169.49 payout — integer rounding hid the 49¢ on Risk
// and made profit read "$997" on a +590 parlay placed in Risk mode at
// $169 even though the math is right). Negatives clamp to 0.
const moneyExact = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '$0.00';
    const safe = n > 0 ? n : 0;
    return '$' + safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const moneyExactSigned = (value, sign) => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? Math.abs(n) : 0;
    const formatted = safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sign}$${formatted}`;
};
// PENDING / PROJECTED To-Win formatter: whole dollars with cents FLOORED
// ($144.21 → $144, $54.00 → $54 — PO 2026-07-09; a projection must never
// overstate the payout, so truncate, don't round-half-up). DISPLAY ONLY:
// stored payouts, settlement, and the drill-down detail panels keep the
// exact 2dp values. The Risk column intentionally stays moneyExact —
// Win-mode parlays produce fractional stakes (169.49) the player must
// see exactly (the very reason moneyExact exists).
const moneyWhole = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '$0';
    return '$' + formatMoneyWholeFloored(Math.max(0, n));
};
const moneyWholeSigned = (value, sign) => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? Math.abs(n) : 0;
    return `${sign}$${formatMoneyWholeFloored(safe)}`;
};
// SETTLED / REALIZED formatter (won / lost / void headlines): whole dollars
// ROUNDED half-up, mirroring the backend's round() payout credit at grade so
// the row matches the balance that actually moved. A floored settled win
// would read $1 under the ledger for payouts whose cents ≥ .50 (potentialPayout
// is stored whole but risk can be fractional, e.g. profit 999.86 → floor 999
// vs credited 1000). DISPLAY ONLY — settlement/ledger untouched. When the
// backend payout credit flips round()→floor() (~July 20+ payout-floor deploy),
// these two must swap to the floored formatter to stay ledger-aligned.
const moneyWholeSettled = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '$0';
    return '$' + formatMoneyWholeRounded(Math.max(0, n));
};
const moneyWholeSettledSigned = (value, sign) => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? Math.abs(n) : 0;
    return `${sign}$${formatMoneyWholeRounded(safe)}`;
};
const normalizeStatus = (value) => String(value || 'pending').trim().toLowerCase();



// Player-facing market label + line for one leg row. Maps the internal
// market type (h2h / spreads / totals) to the universal sportsbook
// shorthand (ML / Spread / Over / Under). Returns { label, line } so the
// caller can render `{label} {line}` without trailing whitespace when the
// line is empty (e.g. moneyline). A non-zero `teaserAdjustment` or an
// explicit `buyPoints` flag adds a trailing "(BP)" so buy-points / teaser
// shifts are visually distinct from the base line.
const legPickLabel = (leg) => {
    const market = String(leg?.marketType || '').toLowerCase();
    const selection = String(leg?.selection || '').trim();
    const pointRaw = leg?.point;
    const point = Number.isFinite(Number(pointRaw)) ? Number(pointRaw) : null;
    const isBuyPoints = !!leg?.buyPoints
        || (Number.isFinite(Number(leg?.teaserAdjustment)) && Number(leg.teaserAdjustment) !== 0);
    const bpSuffix = isBuyPoints ? ' (BP)' : '';

    if (market === 'spreads') {
        const line = point === null ? '' : formatSpreadValue(point);
        return { label: 'Spread', pick: selection, line: line ? `${line}${bpSuffix}` : bpSuffix.trim() };
    }
    if (market === 'totals') {
        const isUnder = selection.toLowerCase().startsWith('u');
        const line = point === null ? '' : formatLineValue(Math.abs(point));
        return {
            label: isUnder ? 'Under' : 'Over',
            pick: '',
            line: line ? `${line}${bpSuffix}` : bpSuffix.trim(),
        };
    }
    // Admin write-ins — free-text market, manual-graded, straight-only;
    // the selection IS the whole description, never a team + line.
    if (market === 'manual') {
        return { label: 'Manual', pick: selection, line: '' };
    }
    // Soccer card/corner markets — manual-graded, straight-only; without
    // these mappings such a leg would render as a bogus "ML".
    if (market === 'alternate_spreads_cards') {
        const line = point === null ? '' : formatSpreadValue(point);
        return { label: 'Card Handicap', pick: selection, line };
    }
    if (market === 'alternate_totals_cards') {
        const isUnder = selection.toLowerCase().startsWith('u');
        const line = point === null ? '' : formatLineValue(Math.abs(point));
        return { label: isUnder ? 'Cards Under' : 'Cards Over', pick: '', line };
    }
    if (market === 'alternate_spreads_corners') {
        const line = point === null ? '' : formatSpreadValue(point);
        return { label: 'Corner Handicap', pick: selection, line };
    }
    if (market === 'alternate_totals_corners') {
        const isUnder = selection.toLowerCase().startsWith('u');
        const line = point === null ? '' : formatLineValue(Math.abs(point));
        return { label: isUnder ? 'Corners Under' : 'Corners Over', pick: '', line };
    }
    // h2h / moneyline / anything else: never show a line, never the
    // stored point=0 sentinel that older rows leak into selection text.
    return { label: 'ML', pick: selection, line: '' };
};

const formatStatus = (value) => {
    const normalized = normalizeStatus(value);
    if (normalized === 'won') return 'WON';
    if (normalized === 'lost') return 'LOST';
    if (normalized === 'void') return 'VOID';
    if (normalized === 'rejected') return 'REJECTED';
    if (normalized === 'pending_approval') return 'PENDING APPROVAL';
    return 'PENDING';
};

const statusLabel = (value) => {
    const normalized = normalizeStatus(value);
    if (normalized === 'won') return 'Won';
    if (normalized === 'lost') return 'Lost';
    if (normalized === 'void') return 'Void';
    if (normalized === 'rejected') return 'Rejected';
    if (normalized === 'pending_approval') return 'Pending Approval';
    return 'Pending';
};

const statusTheme = (value) => {
    const normalized = normalizeStatus(value);
    if (normalized === 'won') return 'won';
    if (normalized === 'lost') return 'lost';
    if (normalized === 'void') return 'void';
    // Reuse existing themes this chunk (no new CSS): a declined/refunded
    // bet reads grey like a void; a held bet reads like a pending. A
    // dedicated amber accent can land with the player-facing chunk.
    if (normalized === 'rejected') return 'void';
    if (normalized === 'pending_approval') return 'pending';
    return 'pending';
};

const matchLabel = (bet) => {
    // Prefer the full "City Mascot" names (match doc or the placement snapshot);
    // fall back to the short/city name for rows that predate the full fields.
    if (bet?.match?.homeTeam && bet?.match?.awayTeam) {
        return `${bet.match.homeTeamFull || bet.match.homeTeam} vs ${bet.match.awayTeamFull || bet.match.awayTeam}`;
    }
    if (Array.isArray(bet?.selections) && bet.selections.length > 1) {
        return `${bet.selections.length}-leg ticket`;
    }
    if (bet?.matchSnapshot?.homeTeam && bet?.matchSnapshot?.awayTeam) {
        return `${bet.matchSnapshot.homeTeamFull || bet.matchSnapshot.homeTeam} vs ${bet.matchSnapshot.awayTeamFull || bet.matchSnapshot.awayTeam}`;
    }
    return 'Ticket';
};

// Last token of a team name as the player-facing short label —
// "New York Knicks" → "Knicks", "Los Angeles Angels" → "Angels".
// Falls back to the whole string when there's only one token, so
// single-word names ("Suns", "Heat") survive untouched.
const shortTeam = (name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return '';
    const tokens = trimmed.split(/\s+/);
    return tokens[tokens.length - 1];
};

// One-line collapsed summary for the LEFT side of the ticket row.
// Produces "Knicks -19.5", "Over 220.5", "Lakers ML", or
// "3-leg Parlay" — the same shorthand a player would speak aloud
// instead of the full matchup + market badge breakdown the expanded
// view shows. For combined modes (parlay/teaser/if_bet/reverse) we
// always lead with leg count so the row stays scannable in lists
// mixing single-game tickets with multi-leg ones.
const ticketSummary = (bet) => {
    const selections = Array.isArray(bet?.selections) ? bet.selections : [];
    const type = String(bet?.type || 'straight').toLowerCase();
    // Open parlay: lead with its declared-leg progress so the pending row
    // reads "Open Parlay — 1 of 8 legs" while the player fills it in.
    if (bet?.isOpenParlay) {
        const filled = selections.length;
        const target = Number.isFinite(Number(bet?.targetLegs)) && Number(bet.targetLegs) > 0
            ? Number(bet.targetLegs)
            : filled;
        return `Open Parlay — ${filled} of ${target} legs`;
    }
    if (type === 'round_robin') {
        const sizes = Array.isArray(bet?.sizes) ? bet.sizes : [];
        const sizesLabel = sizes.length > 0
            ? sizes.map(s => `By ${s}’s`).join(', ')
            : 'Round Robin';
        const parlayCount = Number.isFinite(Number(bet?.parlayCount)) ? Number(bet.parlayCount) : (bet?.childBets?.length || 0);
        return `${sizesLabel} — ${parlayCount} parlays`;
    }
    if (selections.length > 1 || type === 'parlay' || type === 'teaser' || type === 'if_bet' || type === 'reverse') {
        const label = type === 'teaser' ? 'Teaser'
            : type === 'if_bet' ? 'If Bet'
                : type === 'reverse' ? 'Reverse'
                    : 'Parlay';
        return `${selections.length || 1}-leg ${label}`;
    }
    const leg = selections[0] || {};
    const market = String(leg?.marketType || '').toLowerCase();
    const point = Number.isFinite(Number(leg?.point)) ? Number(leg.point) : null;
    const selection = String(leg?.selection || '').trim();
    // Admin write-in: the description IS the summary — no team/line grammar,
    // and no trailing "ML" (the fallback below would bolt one on).
    if (market === 'manual') {
        return String(leg?.selectionFull || '').trim() || selection || 'Write-in';
    }
    if (market === 'spreads') {
        const line = point === null ? '' : formatSpreadValue(point);
        const team = String(leg?.selectionFull || '').trim() || selection;
        return line ? `${team} ${line}` : team || 'Spread';
    }
    if (market === 'totals') {
        const isUnder = selection.toLowerCase().startsWith('u');
        const line = point === null ? '' : formatLineValue(Math.abs(point));
        return line ? `${isUnder ? 'Under' : 'Over'} ${line}` : (isUnder ? 'Under' : 'Over');
    }
    // Outright/futures: "Vikings to win Super Bowl" — the "ML" fallback
    // below would mislabel a futures pick as a moneyline.
    if (isOutrightLeg(leg)) {
        return outrightLegText(leg)
            || String(leg?.selectionFull || '').trim() || selection || 'Pick';
    }
    // h2h / moneyline / fallback
    const team = String(leg?.selectionFull || '').trim() || selection || 'Pick';
    return `${team} ML`;
};

// "Line moved" detail for a repriced leg, or null when the leg booked at
// the slip's exact price. Booking auto-accepts favorable moves and small
// in-band adverse moves at the official current price; when that happens
// the leg carries the audit-only clientOddsAmerican (slip price at
// submit). Display-only — settlement never reads it.
const legPriceMovedText = (leg, oddsFormat) => {
    const clientAm = Number(leg?.clientOddsAmerican);
    const bookedAm = Number(leg?.oddsAmerican);
    if (!Number.isFinite(clientAm) || clientAm === 0 || clientAm === bookedAm) return null;
    const clientDec = americanToDecimal(clientAm);
    const bookedDec = Number(leg?.odds) > 1 ? Number(leg.odds) : americanToDecimal(bookedAm);
    if (!clientDec || !bookedDec) return null;
    const improved = bookedDec >= clientDec;
    return `${formatOdds(clientDec, oddsFormat)} → ${formatOdds(bookedDec, oddsFormat)}${improved ? ' (price improved)' : ''}`;
};

// One-line description for a single leg, e.g. "Lakers -4 -110".
// Used for both single-game tickets and the indented leg rows under
// a multi-leg parent. Returns the raw string the UI renders verbatim
// in the Description column. A leg that booked at a different price
// than the slip carried gets a "(was -400)" suffix so the row itself
// discloses the reprice — the drill-down panel has the full arrow.
const legDescription = (leg, oddsFormat) => {
    const base = legDescriptionBase(leg, oddsFormat);
    const clientAm = Number(leg?.clientOddsAmerican);
    if (!Number.isFinite(clientAm) || clientAm === 0) return base;
    const clientDec = americanToDecimal(clientAm);
    if (!clientDec) return base;
    return `${base} (was ${formatOdds(clientDec, oddsFormat)})`;
};

const legDescriptionBase = (leg, oddsFormat) => {
    const market = String(leg?.marketType || '').toLowerCase();
    const point = Number.isFinite(Number(leg?.point)) ? Number(leg.point) : null;
    const selection = String(leg?.selection || '').trim();
    const odds = formatOdds(leg?.odds, oddsFormat);
    if (market === 'spreads') {
        // Mascot-only team name so the leg stays on one line and doesn't
        // truncate ("New York Yankees -1.5 +1…" → "Yankees -1.5 +133").
        const team = mascotName(leg?.selectionFull, selection) || 'Pick';
        const line = point === null ? '' : formatSpreadValue(point);
        return [team, line, odds].filter(Boolean).join(' ');
    }
    if (market === 'totals') {
        // Game total (not a team total — that market type is `team_totals` and
        // falls through to the default branch). The selection is just
        // "Over"/"Under". A game total belongs to BOTH teams, so label it
        // "Over 8.5 (Phillies @ Royals)" — the old home-mascot prefix
        // ("Royals Over 8.5") read as a team total for one side.
        const isUnder = selection.toLowerCase().startsWith('u');
        const line = point === null ? '' : formatLineValue(Math.abs(point));
        const snap = leg?.matchSnapshot || {};
        const away = mascotName(snap.awayTeamFull, snap.awayTeam);
        const home = mascotName(snap.homeTeamFull, snap.homeTeam);
        const game = away && home ? `(${away} @ ${home})` : '';
        const ou = isUnder ? 'Under' : 'Over';
        return [ou, line, game, odds].filter(Boolean).join(' ');
    }
    // Admin write-in: render the FULL free-text description + odds. The
    // moneyline fallback below would mascot-shorten it to its last word
    // ("…to win the Masters outright" → "outright"), which is nonsense here.
    if (market === 'manual') {
        const text = String(leg?.selectionFull || '').trim() || selection || 'Write-in';
        return [text, odds].filter(Boolean).join(' ');
    }
    // Player props: keep the full selection (player + side + line) and append
    // the friendly stat label — "Osuna Over 0.5 Runs Scored -110".
    if (isPlayerPropMarket(leg?.marketType)) {
        const pick = String(leg?.selectionFull || '').trim() || selection || 'Pick';
        return [pick, prettyPlayerMarketLabel(leg?.marketType), odds].filter(Boolean).join(' ');
    }
    // Outright/futures: nickname + competition + odds — "Vikings to win
    // Super Bowl +5000" (PO 2026-07-08; bare "name + odds" didn't say WHICH
    // future). Text resolves at render time from the placement snapshot, so
    // existing pending futures pick this up with no backfill. Unresolvable
    // competition → previous full name + odds format, never a dangling
    // "to win". These rows wrap instead of ellipsizing (see .wrap in
    // mybets.css) so the competition is never truncated away.
    if (isOutrightLeg(leg)) {
        const text = outrightLegText(leg)
            || String(leg?.selectionFull || '').trim() || selection || 'Pick';
        return [text, odds].filter(Boolean).join(' ');
    }
    // Moneyline / fallback → mascot-only team + odds ("Tigers +105").
    const team = mascotName(leg?.selectionFull, selection) || 'Pick';
    return [team, odds].filter(Boolean).join(' ');
};

// Parent-row label for multi-leg tickets, e.g. "Parlay - 3 Teams".
const multiLegLabel = (bet) => {
    const type = String(bet?.type || '').toLowerCase();
    if (type === 'round_robin') {
        const parlayCount = Number.isFinite(Number(bet?.parlayCount)) ? Number(bet.parlayCount) : (bet?.childBets?.length || 0);
        return `Round Robin — ${parlayCount} Parlays`;
    }
    const count = Array.isArray(bet?.selections) ? bet.selections.length : 0;
    const noun = type === 'teaser' ? 'Teaser'
        : type === 'if_bet' ? 'If Bet'
            : type === 'reverse' ? 'Reverse'
                : 'Parlay';
    return `${noun} - ${count} Teams`;
};

// Teaser ticket sub-label: when one or more legs pushed (tied on the
// adjusted line), surface the reduced effective leg count so the
// player understands why a 4-team teaser graded with the 3-team
// multiplier. Returns null when the bet had no pushes — caller skips
// the row to avoid empty space under the parent label.
const teaserPushSummary = (bet) => {
    const type = String(bet?.type || '').toLowerCase();
    if (type !== 'teaser') return null;
    const legs = Array.isArray(bet?.selections) ? bet.selections : [];
    if (legs.length === 0) return null;
    // Hide on pending tickets — final outcome unknown, "reduced to N-team"
    // and "refunded" wording are both misleading until grading completes.
    const isPending = normalizeStatus(bet?.status) === 'pending'
        || legs.some((leg) => normalizeStatus(leg?.status) === 'pending');
    if (isPending) return null;
    // Hide on losing tickets — any leg lost means the ticket lost
    // regardless of pushes, and "reduced to N-team" would mislead the
    // player into thinking they got the reduced multiplier.
    const hasLost = legs.some((leg) => normalizeStatus(leg?.status) === 'lost')
        || normalizeStatus(bet?.status) === 'lost';
    if (hasLost) return null;
    const pushCount = legs.filter((leg) => String(leg?.gradeReason || '') === 'push_tie').length;
    if (pushCount === 0) return null;
    const wonCount = legs.filter((leg) => normalizeStatus(leg?.status) === 'won').length;
    const wordPush = pushCount === 1 ? 'push' : 'pushes';
    if (wonCount < 2) {
        // Fell below the 2-team minimum — settles as a refund. Match
        // the backend's evaluateTicket teaser branch which voids the
        // ticket in this case.
        return 'Refunded — too many pushes';
    }
    return `Reduced to ${wonCount}-team teaser after ${pushCount} ${wordPush}`;
};

const isMultiLegBet = (bet) => {
    const type = String(bet?.type || '').toLowerCase();
    if (type === 'parlay' || type === 'teaser' || type === 'if_bet' || type === 'reverse' || type === 'round_robin') return true;
    return Array.isArray(bet?.selections) && bet.selections.length > 1;
};

// Round Robin groups don't ship their child parlays in the My Bets
// payload — children are fetched on demand from
// GET /api/bets/group/:id/children when the user expands a group row.
// Keeps the My Bets response a fixed shape regardless of parlay count.
const isRoundRobinGroup = (bet) => String(bet?.type || '').toLowerCase() === 'round_robin';

// True when the snapshot represents a game that's currently in progress.
// Drives the inline "LIVE" badge on pending rows so the player can see at
// a glance which of their tickets are tied to a game on the field right
// now vs. one still scheduled. Mirrors ScoreboardSidebar.isLiveMatch but
// also treats a pending leg whose start time is already in the past as
// live — older snapshots don't always carry an explicit status flag, so
// this fallback keeps the badge useful for in-flight tickets.
// Terminal match states the backend uses for games that are no longer
// playable: see SportsMatchStatus::collapseStatus. A pending bet stuck
// on a match in any of these states is NOT live — it's a stuck-pending
// ticket waiting on the settlement pipeline. Without this guard, the
// kickoff-passed fallback below would flag every such bet as LIVE
// indefinitely (real bug: end-to-end test against local DB caught it
// on bets where the match expired but the bet never settled).
const TERMINAL_MATCH_STATUSES = new Set(['finished', 'canceled', 'cancelled', 'expired', 'void', 'abandoned', 'closed', 'settled']);

// Upper bound on how long the kickoff-passed fallback can claim a bet
// is live. Covers the longest plausible game window across our sports:
//   - Baseball (extra innings + rain delay):       ~5h
//   - Football (4 quarters + halftime + 4× OT):    ~4.5h
//   - Soccer (2 halves + stoppage + ET + pens):    ~3h
//   - Basketball (4 quarters + 5× OT):             ~3.5h
// 5 hours covers all of them with margin. Past this window, a pending
// bet whose kickoff was long ago is stuck on the settlement pipeline,
// not actually in play — without this bound, those tickets glue a LIVE
// chip to themselves indefinitely (player-reported bug: 6 MLB tickets
// from a previous day still badged LIVE on a morning before any games
// had started).
const LIVE_FALLBACK_MAX_AGE_MS = 5 * 60 * 60 * 1000;

const isLiveSnapshot = (snapshot, parentStatus) => {
    if (!snapshot) return false;
    const status = String(snapshot.status || '').toLowerCase();
    if (status === 'live') return true;
    const eventStatus = String(snapshot?.score?.event_status || '').toUpperCase();
    if (eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE')) return true;
    // Terminal states short-circuit BEFORE the startTime fallback. A
    // game with status='expired' has its startTime in the past by
    // definition; without this guard the fallback would always fire.
    if (TERMINAL_MATCH_STATUSES.has(status)) return false;
    const startMs = snapshot.startTime ? new Date(snapshot.startTime).getTime() : NaN;
    if (!Number.isFinite(startMs)) return false;
    const sinceKickoffMs = Date.now() - startMs;
    if (sinceKickoffMs >= 0
        && sinceKickoffMs <= LIVE_FALLBACK_MAX_AGE_MS
        && normalizeStatus(parentStatus) === 'pending') {
        return true;
    }
    return false;
};

// True when this leg/bet was placed AFTER the underlying game had already
// started — i.e., it's an in-play / live wager. This is a permanent
// historical fact about the ticket: once an in-play bet, always an
// in-play bet. The badge persists through settlement so a player can
// always tell at a glance "this was a live bet" alongside the W/L letter.
const wasPlacedInPlay = (parentBet, snapshot) => {
    const placedMs = parentBet?.createdAt ? new Date(parentBet.createdAt).getTime() : NaN;
    const startMs = snapshot?.startTime ? new Date(snapshot.startTime).getTime() : NaN;
    return Number.isFinite(placedMs) && Number.isFinite(startMs) && placedMs > startMs;
};

// Resolve the badge label + tooltip for a leg or straight bet. Pulled
// into a helper so the parlay-leg and straight-ticket renderers use the
// same vocabulary — they had drifted, with straight tickets always
// showing "P" for any void (push_tie OR match_canceled) and the user
// reading that as "Push" even on moneylines that can't push.
//
// Inputs are deliberately tolerant: callers pass either a leg object
// (parlay) or the bet's first selection (straight). `gradeReason` is
// set by SportsbookBetSupport::gradeReasonForVoidLeg at settlement —
// 'push_tie' for an exact tie on the adjusted line, 'match_canceled'
// for a canceled/expired match, null when neither applies.
//
// Returns null for pending/empty so callers can `if (badge)` guard
// the render of the chip itself.
export const resolveStatusBadge = (input) => {
    const { status, gradeReason } = (input && typeof input === 'object') ? input : {};
    const norm = String(status || '').toLowerCase();
    if (norm === 'won') return { label: 'W', title: 'Won', theme: 'won' };
    if (norm === 'lost') return { label: 'L', title: 'Lost', theme: 'lost' };
    if (norm === 'void') {
        const reason = String(gradeReason || '').toLowerCase();
        if (reason === 'push_tie') {
            return { label: 'PUSH', title: 'Push — exact tie on the line; stake refunded', theme: 'void' };
        }
        if (reason === 'match_canceled') {
            return { label: 'VOID', title: 'Match canceled or no result; stake refunded', theme: 'void' };
        }
        if (reason === 'pitcher_changed') {
            return { label: 'VOID', title: 'Listed pitcher changed; stake refunded', theme: 'void' };
        }
        if (reason === 'period_unavailable') {
            return { label: 'VOID', title: 'Period result unavailable; stake refunded', theme: 'void' };
        }
        return { label: 'VOID', title: 'No result; stake refunded', theme: 'void' };
    }
    return null;
};

// Live check for a single ticket leg. Two things qualify:
//   1. The leg was placed in-play (permanent — survives settlement so a
//      settled in-play bet still reads as LIVE next to its W/L letter).
//   2. The match is currently in progress AND the leg is still pending.
const isLegLive = (leg, parentBet) => {
    if (wasPlacedInPlay(parentBet, leg?.matchSnapshot)) return true;
    if (normalizeStatus(leg?.status) !== 'pending') return false;
    return isLiveSnapshot(leg?.matchSnapshot, parentBet?.status);
};

// "LIVE BET" when the wager was struck in-play (a permanent property of
// the ticket); plain "LIVE" when it's a pre-game ticket whose game just
// happens to be running right now. Players asked for the distinction so
// they can spot which tickets came from in-play action.
const legBadgeLabel = (leg, parentBet) =>
    wasPlacedInPlay(parentBet, leg?.matchSnapshot) ? 'LIVE BET' : 'LIVE';

const straightBadgeLabel = (bet) => {
    const firstLeg = Array.isArray(bet?.selections) ? bet.selections[0] : null;
    if (
        wasPlacedInPlay(bet, bet?.match) ||
        wasPlacedInPlay(bet, bet?.matchSnapshot) ||
        wasPlacedInPlay(bet, firstLeg?.matchSnapshot)
    ) return 'LIVE BET';
    return 'LIVE';
};

// Live check for a straight (single-leg) ticket. Walks the same fallback
// chain as expandedMatchup so it works whether the match data lives on
// the bet or on its single leg's snapshot. Same in-play-or-currently-live
// rule as isLegLive.
const isStraightBetLive = (bet) => {
    const firstLeg = Array.isArray(bet?.selections) ? bet.selections[0] : null;
    if (wasPlacedInPlay(bet, bet?.match)) return true;
    if (wasPlacedInPlay(bet, bet?.matchSnapshot)) return true;
    if (wasPlacedInPlay(bet, firstLeg?.matchSnapshot)) return true;
    if (normalizeStatus(bet?.status) !== 'pending') return false;
    // CURRENT match state is authoritative. When the freshly-fetched
    // bet.match says the game is in a terminal state (finished, expired,
    // canceled, etc.), the bet is stuck-pending awaiting settlement —
    // it is NOT live, even if the frozen matchSnapshot still reads
    // 'scheduled' with a startTime in the past. Without this guard the
    // matchSnapshot fallback fires for every stuck-pending bet on an
    // expired game (real bug caught by the local E2E test).
    const currentMatchStatus = String(bet?.match?.status || '').toLowerCase();
    if (currentMatchStatus && TERMINAL_MATCH_STATUSES.has(currentMatchStatus)) return false;
    if (isLiveSnapshot(bet?.match, bet?.status)) return true;
    if (isLiveSnapshot(bet?.matchSnapshot, bet?.status)) return true;
    return isLiveSnapshot(firstLeg?.matchSnapshot, bet?.status);
};

// Team name to use when rendering a leg's logo, for SINGLE-team markets only
// (spread / moneyline — the selection IS the picked team). Game totals and team
// totals are resolved from the matchSnapshot in legLogoTeams (a game total is
// both teams; a team total's selection is only "Over"/"Under").
const legTeamForLogo = (leg) => {
    const market = String(leg?.marketType || '').toLowerCase();
    // Admin write-in: no team behind it — initials-of-the-description would
    // render a meaningless crest, so show no logo at all.
    if (market === 'manual') {
        return null;
    }
    return String(leg?.selection || '').trim() || null;
};

// Sport context from a bet leg's matchSnapshot for logo resolution.
const legSportCtx = (leg) => {
    const snap = leg?.matchSnapshot;
    if (!snap) return null;
    return { sportKey: snap.sportKey || '', sport: snap.sport || snap.sportTitle || '' };
};

// Stable abbreviation for the team whose logo we're resolving. Logo lookup
// keys on league + abbr (the identity) rather than the city-only display
// name, so a name like "Seattle" can't collide with a college team via the
// name search. Mirrors the board's TeamAvatar ctx (sportKey + abbr).
const legTeamAbbr = (leg, teamName) => {
    const snap = leg?.matchSnapshot;
    const name = String(teamName || '').trim();
    if (!snap || !name) return '';
    if (String(snap.homeTeam || '').trim() === name) return String(snap.homeTeamShort || '').trim();
    if (String(snap.awayTeam || '').trim() === name) return String(snap.awayTeamShort || '').trim();
    return '';
};

// The player's OWN team for a player-prop leg, or null when we can't tell.
// Backend resolves the player → their matchup side at placement and stamps
// `playerTeamSide` ('home'|'away') on the leg (from the player's team_id). We
// turn that into the single { name, abbr } to show one crest. Legacy prop legs
// placed before this resolution have no side → null (caller shows both crests;
// the player name alone can't tell us which team without a roster lookup).
const propPlayerTeam = (leg) => {
    const snap = leg?.matchSnapshot || {};
    const side = String(leg?.playerTeamSide || '').trim().toLowerCase();
    if (side === 'home') {
        const name = String(snap.homeTeam || '').trim();
        return name ? { name, abbr: String(snap.homeTeamShort || '').trim() } : null;
    }
    if (side === 'away') {
        const name = String(snap.awayTeam || '').trim();
        return name ? { name, abbr: String(snap.awayTeamShort || '').trim() } : null;
    }
    return null;
};

// Neutral player-prop placeholder shown when a leg's playerTeamSide does not
// resolve. A confidently-wrong team crest (e.g. Detroit next to a Yankees
// player) is worse than a generic icon, so the unknown branch renders this
// instead of guessing. Interim only — the correct crest returns once backend
// PlayerPropTeam::side populates playerTeamSide.
const NEUTRAL_PROP_LOGO_DATA_URI = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="#3a3f4b" />
  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2" />
  <circle cx="40" cy="31" r="13" fill="rgba(255,255,255,.78)" />
  <path d="M18 64 a22 22 0 0 1 44 0 Z" fill="rgba(255,255,255,.78)" />
</svg>`.trim())}`;

// Teams whose crests represent a leg. Team markets (spread/total/ML) → the
// single picked/home team. Player props → ONLY the player's own team when the
// side is known (propPlayerTeam); otherwise a single NEUTRAL placeholder (never
// a guessed home crest, which is often the wrong team). Returns [{ name, abbr,
// neutral? }] (always 1 entry, or 0 when nothing resolves).
const legLogoTeams = (leg) => {
    if (isPlayerPropMarket(leg?.marketType)) {
        const own = propPlayerTeam(leg);
        if (own) return [own];
        // Side unknown (backend playerTeamSide null — legacy legs or an
        // unresolved /players lookup). Show a NEUTRAL player icon rather than
        // guessing the home team, which would render a confidently-wrong crest.
        return [{ name: '', abbr: '', neutral: true }];
    }
    const market = String(leg?.marketType || '').toLowerCase();
    const snap = leg?.matchSnapshot || {};
    // A GAME total is the combined score of BOTH teams — show the two matchup
    // crests, never a single team's (which mis-reads as a team total). Mirrors
    // the board's both-teams treatment of a game total. Falls to the fallback
    // initials crest per team if a logo isn't warmed.
    if (market === 'totals') {
        return [
            { name: String(snap.awayTeam || '').trim(), abbr: String(snap.awayTeamShort || '').trim() },
            { name: String(snap.homeTeam || '').trim(), abbr: String(snap.homeTeamShort || '').trim() },
        ].filter((t) => t.name);
    }
    // A TEAM total IS one team, but the selection is only "Over"/"Under", so the
    // crest comes from the stored teamSide, not the selection text. (Don't
    // over-correct game totals onto this path — team_totals is its own market.)
    if (market === 'team_totals') {
        const side = String(leg?.teamSide || '').trim().toLowerCase();
        const name = side === 'away' ? String(snap.awayTeam || '').trim()
            : side === 'home' ? String(snap.homeTeam || '').trim() : '';
        const abbr = side === 'away' ? String(snap.awayTeamShort || '').trim()
            : side === 'home' ? String(snap.homeTeamShort || '').trim() : '';
        return name ? [{ name, abbr }] : [];
    }
    const team = legTeamForLogo(leg);
    return team ? [{ name: team, abbr: legTeamAbbr(leg, team) }] : [];
};

// Logo(s) shown next to a leg's description. One crest for team markets; the
// two matchup crests for player props. Uses the warmed teamLogos map with a
// generated-initials fallback so the row never shows a broken image.
const MyBetsLegLogo = ({ leg, teamLogos }) => {
    const teams = legLogoTeams(leg);
    if (teams.length === 0) return null;
    const imgs = teams.map(({ name, neutral }, i) => (
        <img
            key={`${neutral ? 'neutral' : name}-${i}`}
            src={neutral ? NEUTRAL_PROP_LOGO_DATA_URI : (teamLogos[name] || createFallbackTeamLogoDataUri(name))}
            alt=""
            className="my-bets-table-logo"
            width="20"
            height="20"
            loading="lazy"
            decoding="async"
            onError={neutral ? undefined : (e) => { e.currentTarget.src = createFallbackTeamLogoDataUri(name); }}
        />
    ));
    return teams.length > 1
        ? <span className="my-bets-table-logo-pair">{imgs}</span>
        : <>{imgs}</>;
};

// Right-side amount + sign + colour theme for the collapsed row.
//   won  → +profit, green
//   lost → -risk, red
//   void → "Refund $X", muted
//   pending → potential win, neutral (no sign)
// Returns { text, theme } so the renderer can apply a single class
// without re-deriving the status logic at the call site.
// Cash-vs-freeplay split for the displayed Risk. The stored
// `riskAmount` is the TOTAL stake (cash + freeplay), but the
// player only put `cashRisk` of their own money on the line —
// `fpUsed` came from the house pool. Surface both so a player
// looking at a partial-FP ticket sees what's actually theirs
// to lose / win back rather than the combined headline number.
const cashRiskOfBet = (bet) => {
    const totalRisk = Number(bet?.riskAmount ?? bet?.amount ?? 0);
    const fpRaw = Number(bet?.freeplayAmountUsed ?? 0);
    let fpUsed = Number.isFinite(fpRaw) && fpRaw > 0 ? Math.min(fpRaw, totalRisk) : 0;
    // Legacy fallback: bets placed before the freeplayAmountUsed
    // field shipped don't carry an explicit split, but `isFreeplay`
    // was set when the player checked the "use freeplay" box. Treat
    // those as pure-freeplay tickets so the display doesn't pretend
    // they were $X out-of-pocket when they weren't. Mirrors the
    // backend's same fallback (see WalletController fpUsed default).
    if (fpUsed === 0 && bet?.isFreeplay === true && totalRisk > 0) {
        fpUsed = totalRisk;
    }
    return {
        cashRisk: Math.max(0, totalRisk - fpUsed),
        fpUsed,
        totalRisk,
    };
};

// Display-only -110 placeholder priced for each unfilled declared leg of an
// OPEN, still-filling parlay. Mirrors ModeBetPanel.jsx's
// OPEN_PARLAY_PLACEHOLDER_AMERICAN so the Pending row shows the same
// placeholder-inclusive To-Win the placement screen showed. PREVIEW ONLY — this
// never touches stored potentialPayout or any settlement math, which stay
// real-legs-only and authoritative server-side. (Can't share the source
// constant without importing from ModeBetPanel, which is off-limits here, so it
// is redeclared with the same value and a back-reference.)
const OPEN_PARLAY_PLACEHOLDER_AMERICAN = -110;

// True only while an open parlay still has unfilled declared legs. The
// placeholder-inclusive preview applies to exactly this case; a fully-filled
// open parlay, a closed parlay, and non-parlays all keep the stored figure.
const isOpenParlayStillFilling = (bet) => {
    if (!bet?.isOpenParlay || normalizeStatus(bet?.status) !== 'open') return false;
    const filled = Array.isArray(bet?.selections) ? bet.selections.length : 0;
    return (Number(bet?.targetLegs) || 0) - filled > 0;
};

// Display-only To-Win (profit) for an open, still-filling parlay: price the real
// filled legs at their stored decimal odds (leg.odds) and each unfilled declared
// slot at a -110 placeholder, mirroring ModeBetPanel.jsx:1293-1298, then clamp to
// the same 3×maxBet cap the placement preview applies so the two screens match.
// Returns profit (payout − risk). Cosmetic only.
const openParlayPreviewProfit = (bet, maxBet) => {
    const risk = Number(bet?.riskAmount || bet?.amount || 0);
    const legs = Array.isArray(bet?.selections) ? bet.selections : [];
    const placeholderCount = Math.max(0, (Number(bet?.targetLegs) || 0) - legs.length);
    const realCombined = legs.reduce((acc, leg) => {
        const d = Number(leg?.odds);
        return acc * (Number.isFinite(d) && d > 0 ? d : 1);
    }, 1);
    const combined = placeholderCount > 0
        ? realCombined * Math.pow(americanToDecimal(OPEN_PARLAY_PLACEHOLDER_AMERICAN), placeholderCount)
        : realCombined;
    let win = Math.max(0, risk * combined - risk);
    const cap = Number(maxBet);
    if (Number.isFinite(cap) && cap > 0 && win > cap * 3) win = cap * 3;
    return win;
};

const ticketAmount = (bet, maxBet) => {
    const status = normalizeStatus(bet?.status);
    // OPEN, still-filling parlay: surface the placeholder-inclusive preview
    // To-Win (matches the placement screen) instead of the real-legs-only
    // stored figure. Display-only; fully-filled / graded tickets fall through.
    if (isOpenParlayStillFilling(bet)) {
        return { text: moneyWhole(openParlayPreviewProfit(bet, maxBet)), theme: 'pending' };
    }
    const risk = Number(bet?.riskAmount || bet?.amount || 0);
    const potential = Number(bet?.potentialPayout || 0);
    const profit = Math.max(0, potential - risk);
    // For graded freeplay tickets, the player's wallet only moved
    // by the cash portion — the FP slice came from the house pool
    // and goes back to the FP pool on a void (it's not real money
    // ever leaving the player's balance). Use cashRisk so the
    // "-X" / "Refund X" headline matches what hit pendingBalance.
    const { cashRisk, fpUsed } = cashRiskOfBet(bet);
    if (status === 'won') return { text: moneyWholeSettledSigned(profit, '+'), theme: 'won' };
    if (status === 'lost') {
        // Partial-refund loss (e.g. a soccer Asian QUARTER half-loss): the
        // ticket grades a net loss but some stake came back, so potentialPayout
        // > 0. Display the player's ACTUAL net loss and surface the returned
        // amount, instead of a flat "-risk" that overstates what they lost.
        // Display-only — the grade is still 'lost'. Guard on cash-only tickets
        // (no freeplay) so the FP split math stays untouched; a full loss
        // (potential 0) reduces to the original -cashRisk exactly.
        const returned = Number(bet?.potentialPayout || 0);
        if (returned > 0 && fpUsed <= 0) {
            const netLoss = Math.max(0, cashRisk - returned);
            return { text: moneyWholeSettledSigned(netLoss, '-'), theme: 'lost', returned };
        }
        return { text: moneyWholeSettledSigned(cashRisk, '-'), theme: 'lost' };
    }
    if (status === 'void') return { text: `Refund ${moneyWholeSettled(cashRisk)}`, theme: 'void' };
    return { text: moneyWhole(profit), theme: 'pending' };
};

// Render the Win-column content for a graded ticket. Normally just the headline
// string from ticketAmount(); when a lost ticket carries a partial return
// (`returned` > 0 — e.g. a soccer Asian QUARTER half-loss), stack a small
// "returned $X" annotation beneath the net-loss figure so the player sees the
// money that came back. Display-only; the grade stays 'lost'.
const winCellContent = (amount) => {
    if (!amount || !(Number(amount.returned) > 0)) return amount?.text;
    return (
        <span style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
        }}>
            <span>{amount.text}</span>
            <span style={{
                fontSize: '0.7em',
                color: '#16a34a',
                fontWeight: 800,
                letterSpacing: 0.2,
            }} title={`Stake returned: ${moneyExact(amount.returned)}`}>
                returned {moneyWholeSettled(amount.returned)}
            </span>
        </span>
    );
};

// Inline cell content for the Risk column. When the bet is a
// partial-freeplay ticket, the cash amount is the headline number
// and a small "+ $X FP" annotation below it makes the FP slice
// visible without cramming both into one comma-separated string.
// Plain bets fall through to a single money string (no annotation
// rendered) so 99% of rows look identical to before.
const RiskAmount = ({ bet }) => {
    const { cashRisk, fpUsed } = cashRiskOfBet(bet);
    if (fpUsed <= 0) return moneyExact(cashRisk);
    return (
        <span style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
        }}>
            <span>{moneyExact(cashRisk)}</span>
            <span style={{
                fontSize: '0.7em',
                color: '#16a34a',
                fontWeight: 800,
                letterSpacing: 0.2,
            }} title={`Freeplay applied: ${moneyExact(fpUsed)}`}>
                {moneyExact(fpUsed)} FP
            </span>
        </span>
    );
};

const payoutLabel = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'won') return 'Won';
    if (normalized === 'void') return 'Refund';
    if (normalized === 'lost') return 'Lost';
    return 'Win';
};

const payoutValue = (bet, maxBet) => {
    const status = normalizeStatus(bet?.status);
    // OPEN, still-filling parlay: same placeholder-inclusive preview profit as
    // ticketAmount, so any consumer reading payoutValue stays in sync with the
    // displayed To-Win. Display-only — stored payout / settlement untouched.
    if (isOpenParlayStillFilling(bet)) return openParlayPreviewProfit(bet, maxBet);
    const risk = Number(bet?.riskAmount || bet?.amount || 0);
    const potential = Number(bet?.potentialPayout || 0);
    const profit = Math.max(0, potential - risk);

    if (status === 'won') return profit;
    if (status === 'void') return risk;
    if (status === 'lost') return 0;
    return profit;
};

const formatTimestamp = (value) => formatSiteDateTime(value);

const settledTimestamp = (bet) => bet?.settledAt || bet?.updatedAt || bet?.createdAt;

// Pulls the matchup string for the expanded details panel. For
// multi-leg tickets the parent bet has no single match — we lift the
// matchup off the first leg's snapshot so the panel still shows
// something meaningful instead of "—".
const expandedMatchup = (bet) => {
    if (bet?.match?.homeTeam && bet?.match?.awayTeam) {
        return `${bet.match.awayTeamFull || bet.match.awayTeam} @ ${bet.match.homeTeamFull || bet.match.homeTeam}`;
    }
    if (bet?.matchSnapshot?.homeTeam && bet?.matchSnapshot?.awayTeam) {
        return `${bet.matchSnapshot.awayTeamFull || bet.matchSnapshot.awayTeam} @ ${bet.matchSnapshot.homeTeamFull || bet.matchSnapshot.homeTeam}`;
    }
    const firstLeg = Array.isArray(bet?.selections) ? bet.selections[0] : null;
    const snap = firstLeg?.matchSnapshot;
    if (snap?.homeTeam && snap?.awayTeam) {
        return `${snap.awayTeamFull || snap.awayTeam} @ ${snap.homeTeamFull || snap.homeTeam}`;
    }
    return null;
};

// Game start time for the expanded panel. Walks the same fallback chain
// expandedMatchup uses so a single-leg ticket shows its match's tip-off
// regardless of where the snapshot landed (top-level `match` for fresh
// rows, `matchSnapshot` on the bet for older shapes, or the first leg's
// snapshot for legs whose parent doesn't carry one). Returns the raw ISO
// string — the caller runs it through formatTimestamp so the row reads
// "Apr 28 at 7:11 PM" alongside the existing Placed timestamp.
const expandedGameTime = (bet) => {
    if (bet?.match?.startTime) return bet.match.startTime;
    if (bet?.matchSnapshot?.startTime) return bet.matchSnapshot.startTime;
    const firstLeg = Array.isArray(bet?.selections) ? bet.selections[0] : null;
    if (firstLeg?.matchSnapshot?.startTime) return firstLeg.matchSnapshot.startTime;
    return null;
};

const ticketTypeLabel = (bet) => {
    const type = String(bet?.type || 'straight').toLowerCase();
    if (type === 'parlay') return 'Parlay';
    if (type === 'teaser') return 'Teaser';
    if (type === 'if_bet') return 'If Bet';
    if (type === 'reverse') return 'Reverse';
    if (type === 'manual') return 'Manual (Write-in)';
    return 'Straight';
};

// FULL, untruncated selection text for the drill-down panels — the row's
// one-liner (legDescription) mascot-shortens and the row CSS ellipsizes,
// so this is the one place the player can always read the whole pick
// ("Bobby Witt Jr. Under 0.5 Home Runs", the full write-in text, etc.).
// No odds here — the panel prints those on their own row.
const legSelectionFullText = (leg) => {
    const market = String(leg?.marketType || '').toLowerCase();
    const point = Number.isFinite(Number(leg?.point)) ? Number(leg.point) : null;
    const full = String(leg?.selectionFull || '').trim() || String(leg?.selection || '').trim() || 'Pick';
    if (market === 'spreads') {
        const line = point === null ? '' : formatSpreadValue(point);
        return [full, line].filter(Boolean).join(' ');
    }
    if (market === 'totals') {
        const isUnder = String(leg?.selection || '').trim().toLowerCase().startsWith('u');
        const line = point === null ? '' : formatLineValue(Math.abs(point));
        const snap = leg?.matchSnapshot || {};
        const away = String(snap.awayTeamFull || snap.awayTeam || '').trim();
        const home = String(snap.homeTeamFull || snap.homeTeam || '').trim();
        const game = away && home ? `(${away} @ ${home})` : '';
        return [isUnder ? 'Under' : 'Over', line, game].filter(Boolean).join(' ');
    }
    if (isPlayerPropMarket(leg?.marketType)) {
        return [full, prettyPlayerMarketLabel(leg?.marketType)].filter(Boolean).join(' ');
    }
    return full;
};

// Player-friendly market label for a single leg, used in the per-leg
// drill-down panel. Mirrors the badge shorthand sportsbooks show on
// settled tickets (Game Spread / Total / Moneyline) so the player
// sees the same wording across the platform.
const legMarketLabel = (leg) => {
    const market = String(leg?.marketType || '').toLowerCase();
    if (market === 'spreads') return 'Game Spread';
    if (market === 'totals') return 'Total';
    if (market === 'h2h' || market === 'moneyline' || market === 'ml') return 'Moneyline';
    return market ? market.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Pick';
};

// Per-leg detail panel rendered under an expanded leg row inside a
// multi-leg ticket. Shows the same fields a sportsbook receipt prints
// for each leg: status (with final score so the player can confirm
// "we covered" / "we missed by 3"), the matchup, the market and
// scheduled tip-off, the parent ticket's accepted-at timestamp, plus
// any settlement note (e.g. push reason). Fields fall back gracefully
// when older data shapes are missing fields so the panel stays useful
// for legacy tickets too.
const LegDetailsPanel = ({ leg, parentBet, oddsFormat }) => {
    const status = normalizeStatus(leg?.status);
    const home = String(leg?.matchSnapshot?.homeTeam || '').trim();
    const away = String(leg?.matchSnapshot?.awayTeam || '').trim();
    const homeScore = Number(leg?.finalHomeScore);
    const awayScore = Number(leg?.finalAwayScore);
    const hasScore = Number.isFinite(homeScore) && Number.isFinite(awayScore)
        && (homeScore > 0 || awayScore > 0 || ['won', 'lost', 'void'].includes(status));
    const statusWord = status === 'won' ? 'Won'
        : status === 'lost' ? 'Lost'
        : status === 'void' ? 'Pushed'
        : 'Pending';
    const scoreLine = hasScore && home && away
        ? `${statusWord} (${home} ${homeScore} — ${away} ${awayScore})`
        : statusWord;

    const matchup = home && away ? `${away} @ ${home}` : null;
    const scheduled = leg?.matchSnapshot?.startTime ? formatTimestamp(leg.matchSnapshot.startTime) : null;
    const accepted = parentBet?.createdAt ? formatTimestamp(parentBet.createdAt) : null;
    const note = leg?.note ? String(leg.note).trim() : '';

    const rows = [];
    rows.push(['Status', scoreLine]);
    if (matchup) rows.push(['Game', matchup]);
    // Selection = the FULL untruncated pick + its accepted odds. The
    // collapsed leg row ellipsizes long descriptions (player props,
    // write-ins), so this panel is where the player reads the whole
    // thing. The market shorthand that used to sit here moved to its
    // own Market row below.
    rows.push(['Selection', [legSelectionFullText(leg), formatOdds(leg?.odds, oddsFormat)].filter(Boolean).join(' ')]);
    rows.push(['Market', legMarketLabel(leg)]);
    {
        const moved = legPriceMovedText(leg, oddsFormat);
        if (moved) rows.push(['Line Moved', moved]);
    }
    if (scheduled) rows.push(['Scheduled', scheduled]);
    if (accepted) rows.push(['Accepted', accepted]);
    if (note) rows.push(['Note', note]);

    return (
        <div className="my-bets-table-leg-details" role="region" aria-label="Leg details">
            <dl className="my-bets-details-grid">
                {rows.map(([label, value]) => (
                    <div className="my-bets-details-row" key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
};

// Detail panel rendered under an expanded ticket row. Pulls fields
// straight off the bet — no extra fetch — so it doesn't change the
// network shape and renders instantly. Cells fall back to "—" rather
// than rendering blanks so layout stays stable across older tickets
// that may be missing a field (sport, settlement timestamps, etc).
const BetDetailsPanel = ({ bet, oddsFormat }) => {
    const matchup = expandedMatchup(bet);
    const isMulti = isMultiLegBet(bet);
    const firstLeg = Array.isArray(bet?.selections) ? bet.selections[0] : null;
    const odds = isMulti
        ? (Number.isFinite(Number(bet?.combinedOdds)) ? formatOdds(bet.combinedOdds, oddsFormat) : '—')
        : (firstLeg ? formatOdds(firstLeg.odds, oddsFormat) : '—');
    const placedAt = formatTimestamp(bet?.createdAt);
    const settledAt = ['won', 'lost', 'void'].includes(normalizeStatus(bet?.status))
        ? formatTimestamp(settledTimestamp(bet))
        : null;
    const ticketIdShort = String(bet?.ticketId || bet?.id || '').slice(-8).toUpperCase();
    const isFreeplay = !!bet?.isFreeplay;

    const gameTime = !isMulti ? expandedGameTime(bet) : null;
    const gameTimeLabel = gameTime ? formatTimestamp(gameTime) : null;

    // Freeplay-vs-credit slice for the expanded panel. The "Wagered" row
    // is only added when this ticket actually drew from the freeplay pool
    // — for pure-cash tickets the headline Risk column already shows the
    // full number so a duplicate row in the panel would just be noise.
    // The "Lost" row mirrors the same split on a losing graded ticket so
    // the player sees exactly which pool the loss came out of (the
    // freeplay slice never touches their real balance, only the credit
    // slice does, and that distinction matters when reviewing a week's
    // figures). Wins skip the per-pool result line by design — total
    // profit is already on the row, and splitting profit across pools
    // adds visual clutter the user explicitly said wasn't needed.
    const { cashRisk, fpUsed } = cashRiskOfBet(bet);
    const status = normalizeStatus(bet?.status);
    const hasFp = fpUsed > 0;
    const splitLine = cashRisk > 0
        ? `${moneyExact(fpUsed)} freeplay + ${moneyExact(cashRisk)} credit`
        : `${moneyExact(fpUsed)} freeplay`;

    const rows = [];
    if (!isMulti && matchup) rows.push(['Matchup', matchup]);
    // Game start time sits next to Matchup so players can answer
    // "was this yesterday's bet or tonight's?" without leaving the row.
    // Multi-leg tickets skip it because each leg has its own snapshot
    // and rendering the first leg's time would mislead the eye into
    // thinking it applies to the whole ticket.
    if (gameTimeLabel) rows.push(['Game Time', gameTimeLabel]);
    rows.push(['Type', ticketTypeLabel(bet) + (isFreeplay ? ' (Freeplay)' : '')]);
    // Write-ins carry a free-text description that the collapsed row may
    // ellipsize — surface it in full here so the player can always read
    // exactly what was booked for them.
    if (String(bet?.type || '').toLowerCase() === 'manual') {
        const manualDesc = String(bet?.description || firstLeg?.selectionFull || '').trim();
        if (manualDesc) rows.push(['Description', manualDesc]);
    } else if (!isMulti && firstLeg) {
        // Straight tickets: the collapsed row's one-liner mascot-shortens
        // and ellipsizes — print the full untruncated pick here, same as
        // the per-leg panel does for parlay legs.
        rows.push(['Selection', legSelectionFullText(firstLeg)]);
    }
    rows.push(['Odds', odds]);
    if (!isMulti && firstLeg) {
        const moved = legPriceMovedText(firstLeg, oddsFormat);
        if (moved) rows.push(['Line Moved', moved]);
    }
    rows.push(['Placed', placedAt]);
    if (settledAt) rows.push(['Settled', settledAt]);
    if (ticketIdShort) rows.push(['Ticket', `#${ticketIdShort}`]);
    if (hasFp) {
        rows.push(['Wagered', splitLine]);
        if (status === 'lost') rows.push(['Lost', splitLine]);
        if (status === 'void') rows.push(['Refunded', splitLine]);
    }

    return (
        <div className="my-bets-table-details" role="region" aria-label="Bet details">
            <dl className="my-bets-details-grid">
                {rows.map(([label, value]) => (
                    <div className="my-bets-details-row" key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
};

const WEEK_OPTIONS = [
    { id: 0, label: 'This Week' },
    { id: 1, label: 'Last Week' },
    ...Array.from({ length: 10 }, (_, i) => ({ id: i + 2, label: `${i + 2} Weeks Ago` })),
];

// Table-style ticket list shared between:
//   - the Pending tab (mode='pending', shows Risk/To Win + a totals
//     footer so the player can see committed-vs-potential at a glance —
//     opt in via the showTotals prop; only the top-level Pending list
//     wants it, the round-robin / parlay leg sublists don't)
//   - the Figures tab's per-day expansion panel (mode='graded', shows
//     Description/Profit only — totals already live in the figures
//     row above as the day's P/L, so a footer would just duplicate it)
// Each instance owns its own expanded-row state so opening a ticket
// in Wednesday's drill-down doesn't toggle anything in Friday's panel.
// The win-cell logic keys off the bet's status rather than mode (a
// graded ticket renders +$X / -$X regardless of where it appears),
// so the same row code works for both modes — only header columns
// and the Risk column visibility change.
const BetTable = ({ bets, oddsFormat, teamLogos = {}, mode = 'pending', showTotals = false, onResumeOpenParlay = null, maxBet = null }) => {
    const [expandedBetId, setExpandedBetId] = useState(null);
    // Per-leg drill-down state. Single key (`${betId}::${legIdx}`) — only
    // one leg can be open at a time across the whole list, so opening a
    // new leg auto-collapses the previous one. Opening a leg also clears
    // the parent ticket's expanded details so the user only sees one
    // detail panel at any moment, matching how a single sportsbook
    // receipt drills into one row at a time.
    const [expandedLegKey, setExpandedLegKey] = useState(null);
    // Per-group child cache. Populated on first expand of a Round
    // Robin row; subsequent expands of the same group serve from
    // cache. Keyed by groupId so different groups don't collide.
    //   roundRobinChildren[groupId] = { state: 'loading'|'ready'|'error', children: [...], error: '...' }
    const [roundRobinChildren, setRoundRobinChildren] = useState({});

    // Opening a parent ticket detail closes any open leg detail so only
    // ONE detail panel is ever visible at a time across the whole list.
    const toggleExpanded = (id) => {
        setExpandedLegKey(null);
        setExpandedBetId((cur) => (cur === id ? null : id));
    };
    // Opening a leg detail closes any open parent detail (and any other
    // open leg) so only one panel is visible at a time.
    const toggleExpandedLeg = (betId, legIdx) => {
        const key = `${betId}::${legIdx}`;
        setExpandedBetId(null);
        setExpandedLegKey((cur) => (cur === key ? null : key));
    };

    // Kicked off when a Round Robin row gets expanded for the first
    // time. No-op when the cache already has the group (or a fetch is
    // in flight for it). Errors are surfaced inline under the row so
    // the user can retry by collapsing/re-expanding.
    const ensureRoundRobinChildren = React.useCallback((groupId) => {
        if (!groupId) return;
        const entry = roundRobinChildren[groupId];
        if (entry && (entry.state === 'loading' || entry.state === 'ready')) return;
        setRoundRobinChildren(prev => ({ ...prev, [groupId]: { state: 'loading', children: [] } }));
        const token = localStorage.getItem('token');
        getRoundRobinChildren(groupId, token)
            .then(payload => {
                const children = Array.isArray(payload?.children) ? payload.children : [];
                setRoundRobinChildren(prev => ({ ...prev, [groupId]: { state: 'ready', children } }));
            })
            .catch(err => {
                setRoundRobinChildren(prev => ({
                    ...prev,
                    [groupId]: { state: 'error', children: [], error: err?.message || 'Failed to load parlays' },
                }));
            });
    }, [roundRobinChildren]);

    const isGraded = mode === 'graded';

    if (!Array.isArray(bets) || bets.length === 0) return null;

    return (
        <div className={`my-bets-table${isGraded ? ' graded' : ''}`}>
            <div className="my-bets-table-header">
                <span className="my-bets-table-col-desc">Description</span>
                {isGraded ? (
                    <span className="my-bets-table-col-win">Profit</span>
                ) : (
                    <>
                        <span className="my-bets-table-col-risk">Risk</span>
                        <span className="my-bets-table-col-win">To Win</span>
                    </>
                )}
            </div>
            {bets.map((bet) => {
                const betId = bet.id || bet.ticketId;
                const selections = Array.isArray(bet.selections) ? bet.selections : [];
                const risk = Number(bet.riskAmount || bet.amount || 0);
                const status = normalizeStatus(bet.status);
                const ticketPayout = payoutValue(bet, maxBet);
                const amount = ticketAmount(bet, maxBet);
                const isMulti = isMultiLegBet(bet);
                const isExpanded = expandedBetId === betId;
                // Approval-queued tickets show their potential payout like any
                // pending ticket — there's no settled amount to theme yet.
                const winCell = (status === 'pending' || status === 'pending_approval') ? moneyWhole(ticketPayout) : winCellContent(amount);
                const winTheme = (status === 'pending' || status === 'pending_approval') ? 'pending' : amount.theme;

                if (isRoundRobinGroup(bet)) {
                    // Round Robin parent row. Children are lazy-loaded
                    // from /api/bets/group/:id/children on the first
                    // expand and cached in `roundRobinChildren` so the
                    // initial My Bets payload stays bounded regardless
                    // of parlay count. The expanded view reuses the
                    // standard parlay-leg rendering for each child.
                    const groupId = String(bet?.groupId || bet?.id || '');
                    const cacheEntry = roundRobinChildren[groupId];
                    const childrenState = cacheEntry?.state || 'idle';
                    const children = cacheEntry?.children || [];
                    const handleToggle = () => {
                        toggleExpanded(betId);
                        // Fire fetch on the open transition. (We can't
                        // read the post-update expandedBetId here, so
                        // gate on the *current* state — if we're about
                        // to open, ensure the cache.)
                        if (expandedBetId !== betId) {
                            ensureRoundRobinChildren(groupId);
                        }
                    };
                    return (
                        <React.Fragment key={betId}>
                            <div
                                className={`my-bets-table-row parent expandable${isExpanded ? ' expanded' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={handleToggle}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); } }}
                            >
                                <span className="my-bets-table-col-desc">
                                    {multiLegLabel(bet)}
                                </span>
                                {!isGraded && <span className="my-bets-table-col-risk"><RiskAmount bet={bet} /></span>}
                                <span className={`my-bets-table-col-win ${winTheme}`}>{winCell}</span>
                            </div>
                            {isExpanded && childrenState === 'loading' && (
                                <div className="my-bets-table-row leg" style={{ justifyContent: 'center', padding: '14px 16px' }}>
                                    <span className="my-bets-table-col-desc" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280' }}>
                                        <i className="fa-solid fa-spinner fa-spin" />
                                        Loading parlays…
                                    </span>
                                    {!isGraded && <span className="my-bets-table-col-risk" />}
                                    <span className="my-bets-table-col-win" />
                                </div>
                            )}
                            {isExpanded && childrenState === 'error' && (
                                <div className="my-bets-table-row leg" style={{ padding: '14px 16px' }}>
                                    <span className="my-bets-table-col-desc" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626' }}>
                                        <i className="fa-solid fa-circle-exclamation" />
                                        {cacheEntry?.error || 'Failed to load parlays'} — collapse and re-expand to retry.
                                    </span>
                                    {!isGraded && <span className="my-bets-table-col-risk" />}
                                    <span className="my-bets-table-col-win" />
                                </div>
                            )}
                            {isExpanded && childrenState === 'ready' && children.map((child, ci) => {
                                const childRisk = Number(child?.riskAmount || child?.amount || 0);
                                const childStatus = normalizeStatus(child?.status);
                                const childPayout = payoutValue(child, maxBet);
                                const childAmount = ticketAmount(child, maxBet);
                                const childWinCell = childStatus === 'pending' ? moneyWhole(childPayout) : winCellContent(childAmount);
                                const childWinTheme = childStatus === 'pending' ? 'pending' : childAmount.theme;
                                const childSelections = Array.isArray(child?.selections) ? child.selections : [];
                                return (
                                    <React.Fragment key={`${betId}-child-${child?.id || ci}`}>
                                        <div className="my-bets-table-row leg">
                                            <span className="my-bets-table-col-desc">
                                                <span className="my-bets-table-leg-text" style={{ fontWeight: 600 }}>
                                                    Parlay {ci + 1} · {childSelections.length}-leg
                                                </span>
                                            </span>
                                            {!isGraded && <span className="my-bets-table-col-risk"><RiskAmount bet={child} /></span>}
                                            <span className={`my-bets-table-col-win ${childWinTheme}`}>{childWinCell}</span>
                                        </div>
                                        {childSelections.map((leg, idx) => {
                                            const childLegLive = isLegLive(leg, child);
                                            // Composite leg index keeps Round Robin child legs
                                            // inside the same single-open expandedLegKey the
                                            // parent-ticket legs use.
                                            const childLegIdx = `child-${ci}-${idx}`;
                                            const isChildLegExpanded = expandedLegKey === `${betId}::${childLegIdx}`;
                                            return (
                                                <React.Fragment key={`${betId}-child-${ci}-leg-${idx}`}>
                                                    <div
                                                        className={`my-bets-table-row leg expandable${isChildLegExpanded ? ' expanded' : ''}`}
                                                        style={{ paddingLeft: 24 }}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => toggleExpandedLeg(betId, childLegIdx)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpandedLeg(betId, childLegIdx); } }}
                                                    >
                                                        <span className="my-bets-table-col-desc">
                                                            <MyBetsLegLogo leg={leg} teamLogos={teamLogos} />
                                                            <span className={`my-bets-table-leg-text${isOutrightLeg(leg) ? ' wrap' : ''}`}>{legDescription(leg, oddsFormat)}</span>
                                                            {childLegLive && (
                                                                <span className="my-bets-table-live-badge" aria-label="Live game">{legBadgeLabel(leg, child)}</span>
                                                            )}
                                                        </span>
                                                        {!isGraded && <span className="my-bets-table-col-risk" />}
                                                        <span className="my-bets-table-col-win" />
                                                    </div>
                                                    {isChildLegExpanded && (
                                                        <LegDetailsPanel leg={leg} parentBet={child} oddsFormat={oddsFormat} />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </React.Fragment>
                    );
                }

                if (isMulti) {
                    return (
                        <React.Fragment key={betId}>
                            <div
                                className={`my-bets-table-row parent expandable${isExpanded ? ' expanded' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleExpanded(betId)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(betId); } }}
                            >
                                <span className="my-bets-table-col-desc">
                                    {multiLegLabel(bet)}
                                    {(() => {
                                        // "Open N" resume button — only on an
                                        // OPEN open-parlay ticket that still has
                                        // unfilled legs. N = targetLegs − legs
                                        // added so far. Tapping it resumes the
                                        // ticket on the board (handled in App);
                                        // stopPropagation so it doesn't toggle
                                        // the row's expand/collapse. Hidden once
                                        // the ticket is full (remaining === 0).
                                        if (!bet?.isOpenParlay || normalizeStatus(bet?.status) !== 'open') return null;
                                        if (typeof onResumeOpenParlay !== 'function') return null;
                                        const target = Number(bet?.targetLegs) || 0;
                                        const filled = Array.isArray(bet?.selections) ? bet.selections.length : 0;
                                        const remaining = Math.max(0, target - filled);
                                        if (remaining <= 0) return null;
                                        return (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); onResumeOpenParlay(bet); }}
                                                title={`Add ${remaining} more leg${remaining === 1 ? '' : 's'} to this open parlay`}
                                                style={{
                                                    marginLeft: 8,
                                                    padding: '2px 10px',
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    color: '#fff',
                                                    background: '#ff5051',
                                                    border: 'none',
                                                    borderRadius: 999,
                                                    cursor: 'pointer',
                                                    verticalAlign: 'middle',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                Open {remaining}
                                            </button>
                                        );
                                    })()}
                                    {(() => {
                                        // Reduced-teaser note. Renders only
                                        // when one or more legs pushed (tie
                                        // on the adjusted line), so a clean
                                        // 4-of-4 teaser stays uncluttered.
                                        const note = teaserPushSummary(bet);
                                        if (!note) return null;
                                        return (
                                            <span style={{
                                                display: 'block',
                                                fontSize: 11,
                                                color: '#a16207',
                                                fontWeight: 600,
                                                marginTop: 2,
                                            }}>{note}</span>
                                        );
                                    })()}
                                </span>
                                {!isGraded && <span className="my-bets-table-col-risk"><RiskAmount bet={bet} /></span>}
                                <span className={`my-bets-table-col-win ${winTheme}`}>{winCell}</span>
                            </div>
                            {selections.map((leg, idx) => {
                                const legStatus = normalizeStatus(leg?.status);
                                // Single source of truth for badge label
                                // + tooltip across straight tickets and
                                // parlay legs. See resolveStatusBadge —
                                // void with gradeReason='match_canceled'
                                // now renders "VOID" (was indistinguishable
                                // "P" before, which read as Push).
                                const legBadge = resolveStatusBadge({ status: legStatus, gradeReason: leg?.gradeReason });
                                const legStatusLetter = legBadge?.label || '';
                                const legLive = isLegLive(leg, bet);
                                const legKey = `${betId}::${idx}`;
                                const isLegExpanded = expandedLegKey === legKey;
                                return (
                                    <React.Fragment key={`${betId}-leg-${idx}`}>
                                        <div
                                            className={`my-bets-table-row leg expandable${isLegExpanded ? ' expanded' : ''}`}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => toggleExpandedLeg(betId, idx)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpandedLeg(betId, idx); } }}
                                        >
                                            <span className="my-bets-table-col-desc">
                                                <MyBetsLegLogo leg={leg} teamLogos={teamLogos} />
                                                <span className={`my-bets-table-leg-text${isOutrightLeg(leg) ? ' wrap' : ''}`}>{legDescription(leg, oddsFormat)}</span>
                                                {legLive && (
                                                    <span className="my-bets-table-live-badge" aria-label="Live game">{legBadgeLabel(leg, bet)}</span>
                                                )}
                                                {legStatusLetter && (
                                                    <span
                                                        className={`my-bets-table-leg-status ${legStatus}`}
                                                        title={legBadge?.title || ''}
                                                    >{legStatusLetter}</span>
                                                )}
                                            </span>
                                            {!isGraded && <span className="my-bets-table-col-risk" />}
                                            <span className="my-bets-table-col-win" />
                                        </div>
                                        {isLegExpanded && (
                                            <LegDetailsPanel leg={leg} parentBet={bet} oddsFormat={oddsFormat} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {isExpanded && (
                                <BetDetailsPanel bet={bet} oddsFormat={oddsFormat} />
                            )}
                        </React.Fragment>
                    );
                }

                const leg = selections[0] || {};
                // Straight tickets only have one leg, so the parent bet's
                // status IS the leg's status — but the leg row carries
                // the machine-readable gradeReason ('push_tie' vs
                // 'match_canceled') needed to render the right badge.
                // Previously this hardcoded "P" for any void, so a
                // moneyline auto-voided by a canceled WNBA game looked
                // like a push (which moneylines can't be — they always
                // resolve in OT).
                const straightStatus = status; // already normalized above
                const straightBadge = resolveStatusBadge({ status: straightStatus, gradeReason: leg?.gradeReason });
                const straightStatusLetter = straightBadge?.label || '';
                const straightLive = isStraightBetLive(bet);
                // Admin write-in: labeled so it's never invisible money —
                // the player sees exactly which rows were booked for them.
                const isManualBet = String(bet?.type || '').toLowerCase() === 'manual';
                return (
                    <React.Fragment key={betId}>
                        <div
                            className={`my-bets-table-row expandable${isExpanded ? ' expanded' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleExpanded(betId)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(betId); } }}
                        >
                            <span className="my-bets-table-col-desc">
                                <MyBetsLegLogo leg={leg} teamLogos={teamLogos} />
                                <span className={`my-bets-table-leg-text${isOutrightLeg(leg) ? ' wrap' : ''}`}>{legDescription(leg, oddsFormat)}</span>
                                {isManualBet && (
                                    <span className="my-bet-type" title="Booked by the house on your behalf">MANUAL</span>
                                )}
                                {straightLive && (
                                    <span className="my-bets-table-live-badge" aria-label="Live game">{straightBadgeLabel(bet)}</span>
                                )}
                                {straightStatusLetter && (
                                    <span
                                        className={`my-bets-table-leg-status ${straightStatus}`}
                                        title={straightBadge?.title || ''}
                                    >{straightStatusLetter}</span>
                                )}
                            </span>
                            {!isGraded && <span className="my-bets-table-col-risk"><RiskAmount bet={bet} /></span>}
                            <span className={`my-bets-table-col-win ${winTheme}`}>{winCell}</span>
                        </div>
                        {isExpanded && (
                            <BetDetailsPanel bet={bet} oddsFormat={oddsFormat} />
                        )}
                    </React.Fragment>
                );
            })}
            {showTotals && !isGraded && (() => {
                // Footer totals: cash-only Risk + total To Win. The per-row
                // cells already carry the "+$X FP" annotation when a ticket
                // used freeplay; repeating it on the footer made the column
                // look like the player owed both numbers, so the footer
                // intentionally drops the FP slice and shows only what
                // their wallet is actually exposed to.
                let totalCashRisk = 0;
                let totalWin = 0;
                bets.forEach((b) => {
                    const { cashRisk } = cashRiskOfBet(b);
                    totalCashRisk += cashRisk;
                    // Foot the To-Win column against what the rows DISPLAY:
                    // payoutValue is the same helper the per-row cell reads
                    // (including the open-parlay placeholder preview), and each
                    // contribution is floored exactly like the rendered cell, so
                    // the Total always equals the sum of the visible row values.
                    // Flooring the exact grand total instead can disagree with
                    // the column by up to a dollar per row. Display-only.
                    totalWin += Math.trunc(Math.max(0, payoutValue(b, maxBet)));
                });
                return (
                    <div className="my-bets-table-totals">
                        <span className="my-bets-table-col-desc">Total</span>
                        <span className="my-bets-table-col-risk">{moneyExact(totalCashRisk)}</span>
                        <span className="my-bets-table-col-win">{moneyWhole(totalWin)}</span>
                    </div>
                );
            })()}
        </div>
    );
};

const MyBetsView = ({ onResumeOpenParlay = null, maxBet = null }) => {
    const { oddsFormat } = useOddsFormat();
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(() => {
        const initial = consumeMyBetsInitialFilter();
        // Legacy filter values redirect to the new 2-tab layout. The
        // standalone "Graded" tab was retired in favour of drilling into
        // a settled day from inside Figures, so any won/lost/void/graded
        // hand-off lands on Figures instead. "all" → Pending stays.
        if (['won', 'lost', 'void', 'graded'].includes(initial)) return 'figures';
        if (initial === 'all') return 'pending';
        return initial || 'pending';
    });
    // Map<team name, logo url> populated lazily as bets land. We render
    // an SVG initials fallback immediately and replace with the real
    // crest when fetchTeamBadgeUrl resolves, so the row never shows a
    // broken image and the list doesn't block on the network. Same
    // pattern ScoreboardSidebar uses.
    const [teamLogos, setTeamLogos] = useState({});
    useEffect(() => {
        let mounted = true;
        // Collect { name, ctx } pairs so logo resolution gets sport context.
        const teamMap = new Map(); // name → ctx
        bets.forEach((bet) => {
            const selections = Array.isArray(bet?.selections) ? bet.selections : [];
            // Warm every team a leg will render — the picked/home team for team
            // markets, BOTH matchup teams for player props — across straight and
            // multi-leg tickets alike (legLogoTeams handles the per-market split).
            selections.forEach((leg) => {
                legLogoTeams(leg).forEach(({ name, abbr }) => {
                    if (name && !teamLogos[name] && !teamMap.has(name)) {
                        teamMap.set(name, { ...(legSportCtx(leg) || {}), abbr });
                    }
                });
            });
        });
        if (teamMap.size === 0) return undefined;
        (async () => {
            const updates = {};
            await Promise.all(
                Array.from(teamMap.entries()).map(async ([team, ctx]) => {
                    try {
                        const url = await fetchTeamBadgeUrl(team, ctx);
                        if (url) updates[team] = url;
                    } catch {
                        // fallback stays as-is
                    }
                })
            );
            if (mounted && Object.keys(updates).length > 0) {
                setTeamLogos((prev) => ({ ...prev, ...updates }));
            }
        })();
        return () => { mounted = false; };
    }, [bets]);

    const fetchBets = async ({ silent = false } = {}) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to view your bets.');
            setLoading(false);
            return;
        }

        if (!silent) {
            setLoading(true);
        }

        try {
            const data = await getMyBets(token);
            setBets(Array.isArray(data) ? data : []);
            setError(null);
            
            // Self-healing: force regrade any stuck-pending bets whose
            // matches are actually finished. This runs alongside the
            // on-read settlement sweep (5s throttle) and catches bets
            // stuck on matches that never marked 'completed' from the
            // upstream odds source. Errors are logged but don't block bet display.
            void regradeStuckBets(token);
        } catch (err) {
            console.error('Failed to fetch bets:', err);
            setError('Failed to load bets.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchBets();

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                void fetchBets({ silent: true });
            }
        };

        // Primary refresh path: react to `bets:refresh` window events
        // dispatched by App.jsx (when the WS delivers a `bet:settled`
        // push) or by useLiveSyncPoll (the REST-fallback poll). Settlement
        // is a low-frequency, per-user event, so this is event-driven
        // rather than polled — 5s polling at 500 concurrent users during
        // a live game was 100 req/s/min/user. Stale tolerance is now
        // capped by the safety-net poll below (30s) instead.
        const handleBetsRefresh = () => {
            if (document.hidden) return;
            void fetchBets({ silent: true });
        };

        // Safety-net poll: covers a missed push (WS drop + REST poll
        // backoff colliding, or a published event arriving before the
        // page subscribed). 30s is generous; the typical case is the
        // event-driven path above firing within ~1s of settlement.
        const interval = window.setInterval(() => {
            if (document.hidden) return;
            void fetchBets({ silent: true });
        }, 30000);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('bets:refresh', handleBetsRefresh);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('bets:refresh', handleBetsRefresh);
        };
    }, []);

    // Pending view includes open parlays (status 'open') and approval-queued
    // tickets ('pending_approval') alongside ordinary pending tickets. All
    // three hold their full stake in pendingBalance, so they belong in the
    // player's pending list — an approval-queued bet renders with its
    // "Pending Approval" badge; hiding it left held money with no visible
    // ticket.
    const pendingBets = useMemo(
        () => bets.filter((bet) => {
            const s = normalizeStatus(bet?.status);
            return s === 'pending' || s === 'open' || s === 'pending_approval';
        }),
        [bets],
    );

    // Graded = settled tickets (won + lost + void + push) merged into one
    // chronological list, sorted by settledAt desc. Players don't see
    // the won-vs-lost split — that distinction is intentionally omitted
    // to discourage emotional/chasing behavior.
    //
    // 'push' is included so a tied bet still appears in the figures-day
    // detail list. The backend WalletController weekly-figures includes
    // push in its `$in` (so push contributes to the per-day total row),
    // but without push here the per-day detail expansion was empty for
    // pushes — the row total wouldn't reconcile against the visible
    // entries, leaving the player wondering where their bet went.
    const gradedBets = useMemo(() => {
        const settled = bets.filter((bet) => ['won', 'lost', 'void', 'push'].includes(normalizeStatus(bet?.status)));
        return settled.slice().sort((a, b) => {
            const ta = new Date(settledTimestamp(a)).getTime() || 0;
            const tb = new Date(settledTimestamp(b)).getTime() || 0;
            return tb - ta;
        });
    }, [bets]);

    if (loading) {
        return (
            <div className="my-bets-page">
                <div className="my-bets-shell">
                    <div className="my-bets-empty">
                        <div className="my-bets-empty-icon"><i className="fa-solid fa-ticket"></i></div>
                        <h3>Loading your bet history...</h3>
                        <p>Fetching the latest ticket results.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="my-bets-page">
                <div className="my-bets-shell">
                    <div className="my-bets-empty error">
                        <div className="my-bets-empty-icon"><i className="fa-solid fa-circle-exclamation"></i></div>
                        <h3>Unable to load bets</h3>
                        <p>{error}</p>
                        <button type="button" className="my-bets-refresh-btn" onClick={() => void fetchBets()} style={{ marginTop: 16 }}>
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="my-bets-page">
            <div className="my-bets-shell">
                {/* Filter row collapsed from 4 chips to 3: the standalone
                    "Graded" tab was retired in favour of expanding a
                    settled day inside Figures, where the player can see
                    the day's P/L AND the tickets that produced it in one
                    place instead of cross-referencing two tabs. */}
                <div className="my-bets-filter-row">
                    {[
                        { id: 'pending', label: 'Pending Bets' },
                        { id: 'figures', label: 'Weekly Figures' },
                        { id: 'transactions', label: 'Weekly Transactions' },
                    ].map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={`my-bets-filter-chip ${activeTab === option.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(option.id)}
                        >
                            {option.label.split(' ').map((word) => (
                                <span key={word} className="my-bets-filter-chip-line">{word}</span>
                            ))}
                        </button>
                    ))}
                </div>

                {activeTab === 'figures' ? (
                    <FiguresTab
                        gradedBets={gradedBets}
                        oddsFormat={oddsFormat}
                        teamLogos={teamLogos}
                        onNavigateToTransactions={() => setActiveTab('transactions')}
                    />
                ) : activeTab === 'transactions' ? (
                    <TransactionsTab />
                ) : pendingBets.length === 0 ? (
                    <div className="my-bets-empty">
                        <div className="my-bets-empty-icon"><i className="fa-solid fa-receipt"></i></div>
                        <h3>No bets in this view</h3>
                        <p>No pending tickets right now.</p>
                    </div>
                ) : (
                    <BetTable
                        bets={pendingBets}
                        oddsFormat={oddsFormat}
                        teamLogos={teamLogos}
                        mode="pending"
                        showTotals
                        onResumeOpenParlay={onResumeOpenParlay}
                        maxBet={maxBet}
                    />
                )}
            </div>
        </div>
    );
};

const FiguresTab = ({ gradedBets = [], oddsFormat, teamLogos = {}, onNavigateToTransactions }) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Drill-down state: at most one day is expanded at a time so the
    // figures table never grows unbounded. Switching weeks collapses any
    // open panel since the indexed day no longer maps to the same date.
    const [expandedDayIndex, setExpandedDayIndex] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to view figures.');
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        getUserFigures(token, weekOffset)
            .then((res) => { if (!cancelled) { setData(res); setLoading(false); } })
            .catch((err) => {
                console.error('Failed to load figures:', err);
                if (!cancelled) {
                    setError('Failed to load figures.');
                    setLoading(false);
                }
            });
        return () => { cancelled = true; };
    }, [weekOffset]);

    useEffect(() => {
        setExpandedDayIndex(null);
    }, [weekOffset]);

    const renderAmount = (value) => {
        const n = Number(value || 0);
        const className = n > 0 ? 'figures-amount positive' : n < 0 ? 'figures-amount negative' : 'figures-amount';
        return <span className={className}>{moneySigned(n)}</span>;
    };

    const hasActivity = data && (
        Number(data.weekTotal || 0) !== 0
        || Number(data.transactions || 0) !== 0
        || Number(data.carryForward || 0) !== 0
        || (Array.isArray(data.days) && data.days.some((d) => Number(d.pl || 0) !== 0))
    );

    // Use the per-day UTC bounds the backend embedded in `data.days` —
    // they are the exact same half-open ranges used to bucket each day's
    // P/L total.  The old fallback computed UTC-midnight boundaries
    // (`weekStartT00:00:00Z + dayIndex days`) which broke for players
    // whose local timezone is behind UTC: a bet settled at 10 PM CT on
    // Sunday = 3 AM UTC Monday would appear under Monday's drill-down
    // even though the backend (correctly, in local TZ) counted it in
    // Sunday's P/L.  Always prefer the server-supplied bounds.
    // Effective bucket time for a graded bet, matching the backend's
    // WalletController::getFigures rule: settlement P/L bucket-by GAME-
    // TIME (the day the game was played) when that game falls inside
    // the displayed week; otherwise fall back to the settlement
    // timestamp. For multi-leg tickets the latest leg's game time is
    // used — that's the game whose grading actually settled the
    // ticket. Keeps the drill-down list in lockstep with the per-day
    // P/L totals the server returned. Without this, the server could
    // show -$3,450 under Tue (because the game was Tue) while the
    // expanded panel only listed bets settled Wed — visibly broken.
    const weekStartMs = data?.days?.[0]?.startUtc ? new Date(data.days[0].startUtc).getTime() : NaN;
    const weekEndMs = data?.days?.[6]?.endUtc ? new Date(data.days[6].endUtc).getTime() : NaN;
    const bucketTimeForBet = (bet) => {
        const settledAt = bet?.settledAt || bet?.updatedAt || bet?.createdAt;
        const settledMs = settledAt ? new Date(settledAt).getTime() : NaN;
        // Pick the LATEST game time across the legs — for a straight
        // ticket there is only one match. Skip selections without a
        // startTime rather than letting them poison the max.
        const candidates = [];
        if (bet?.match?.startTime) candidates.push(new Date(bet.match.startTime).getTime());
        if (bet?.matchSnapshot?.startTime) candidates.push(new Date(bet.matchSnapshot.startTime).getTime());
        if (Array.isArray(bet?.selections)) {
            for (const leg of bet.selections) {
                if (leg?.match?.startTime) candidates.push(new Date(leg.match.startTime).getTime());
                if (leg?.matchSnapshot?.startTime) candidates.push(new Date(leg.matchSnapshot.startTime).getTime());
            }
        }
        const valid = candidates.filter((n) => Number.isFinite(n));
        if (valid.length > 0 && Number.isFinite(weekStartMs) && Number.isFinite(weekEndMs)) {
            const gameMs = Math.max(...valid);
            if (gameMs >= weekStartMs && gameMs < weekEndMs) return gameMs;
        }
        return Number.isFinite(settledMs) ? settledMs : NaN;
    };

    const betsForDayIndex = (dayIndex) => {
        const dayData = data?.days?.[dayIndex];
        if (!dayData) return [];

        // Prefer server-supplied timezone-aware bounds (added alongside
        // the local-TZ bucketing fix). Fall back to UTC-midnight only
        // for very old cached responses that predate the field.
        let start, end;
        if (dayData.startUtc && dayData.endUtc) {
            start = new Date(dayData.startUtc);
            end = new Date(dayData.endUtc);
        } else {
            // Legacy fallback — will be wrong for non-UTC timezones but
            // prevents a hard failure on stale API responses.
            if (!data?.weekStart) return [];
            start = new Date(`${data.weekStart}T00:00:00Z`);
            if (Number.isNaN(start.getTime())) return [];
            start.setUTCDate(start.getUTCDate() + dayIndex);
            end = new Date(start);
            end.setUTCDate(end.getUTCDate() + 1);
        }

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
        const startMs = start.getTime();
        const endMs = end.getTime();
        return gradedBets.filter((bet) => {
            const bucketMs = bucketTimeForBet(bet);
            if (!Number.isFinite(bucketMs)) return false;
            return bucketMs >= startMs && bucketMs < endMs;
        });
    };

    const toggleDay = (i) => {
        setExpandedDayIndex((cur) => (cur === i ? null : i));
    };

    return (
        <div className="figures-tab">
            <div className="figures-controls">
                <select
                    className="figures-week-select"
                    value={weekOffset}
                    onChange={(e) => setWeekOffset(Number(e.target.value))}
                    aria-label="Select week"
                >
                    {WEEK_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="my-bets-empty">
                    <div className="my-bets-empty-icon"><i className="fa-solid fa-chart-column"></i></div>
                    <h3>Loading figures…</h3>
                </div>
            ) : error ? (
                <div className="my-bets-empty error">
                    <h3>{error}</h3>
                </div>
            ) : !hasActivity ? (
                <div className="my-bets-empty">
                    <div className="my-bets-empty-icon"><i className="fa-solid fa-chart-column"></i></div>
                    <h3>No activity this week.</h3>
                </div>
            ) : (
                <div className="figures-table">
                    <div className="figures-row">
                        <span className="figures-label">Carry forward</span>
                        <span className={`figures-amount${Number(data.carryForward || 0) > 0 ? ' positive' : Number(data.carryForward || 0) < 0 ? ' negative' : ''}`}>
                            {money(data.carryForward)}
                        </span>
                    </div>
                    {data.days.map((d, i) => {
                        const canExpand = Number(d.pl || 0) !== 0;
                        const isExpanded = expandedDayIndex === i;
                        const dayBets = isExpanded ? betsForDayIndex(i) : [];
                        return (
                            <React.Fragment key={d.label}>
                                <div
                                    className={`figures-row${canExpand ? ' expandable' : ''}${isExpanded ? ' expanded' : ''}`}
                                    role={canExpand ? 'button' : undefined}
                                    tabIndex={canExpand ? 0 : undefined}
                                    onClick={canExpand ? () => toggleDay(i) : undefined}
                                    onKeyDown={canExpand ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDay(i); } } : undefined}
                                    aria-expanded={canExpand ? isExpanded : undefined}
                                >
                                    <span className="figures-label">
                                        {d.label} <span className="figures-date">({d.date})</span>
                                    </span>
                                    {renderAmount(d.pl)}
                                </div>
                                {isExpanded && (
                                    <div className="figures-day-panel">
                                        {dayBets.length === 0 ? (
                                            // Edge case: a non-zero day P/L
                                            // can come from settled tickets
                                            // we couldn't fetch (older
                                            // pagination boundary, void
                                            // refunds outside the bets
                                            // collection, etc.) — surface
                                            // that explicitly instead of
                                            // hiding the empty panel.
                                            <div className="figures-day-empty">No graded tickets to show for this day.</div>
                                        ) : (
                                            <BetTable
                                                bets={dayBets}
                                                oddsFormat={oddsFormat}
                                                teamLogos={teamLogos}
                                                mode="graded"
                                            />
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                    <div className="figures-row figures-row-total">
                        <span className="figures-label">Week total</span>
                        {renderAmount(data.weekTotal)}
                    </div>
                    {/* Tap-able Deposits/Withdrawals row — deep-links to
                        the Transactions tab so the player can see the
                        individual cash deposits / withdrawals that make
                        up the aggregated amount. Freeplay grants and
                        FP-only adjustments are intentionally excluded
                        from this total (they never move real cash);
                        their balance impact lives in the player's FP
                        pool, not here. Drop the role/tabIndex when no
                        navigation handler is wired so the row stays
                        purely informational in any host that mounts
                        FiguresTab on its own. */}
                    <div className="figures-row figures-row-total">
                        <span className="figures-label">End balance</span>
                        <span className={`figures-amount${Number(data.endBalance || 0) > 0 ? ' positive' : Number(data.endBalance || 0) < 0 ? ' negative' : ''}`}>
                            {money(data.endBalance)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

const PAGE_SIZE = 50;

const TransactionsTab = () => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [rows, setRows] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    const loadPage = async (pageOffset, append, week = weekOffset) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to view transactions.');
            setLoading(false);
            return;
        }
        if (append) setLoadingMore(true); else setLoading(true);
        setError(null);
        try {
            const res = await getUserTransactions(token, { limit: PAGE_SIZE, offset: pageOffset, weekOffset: week });
            const next = Array.isArray(res?.transactions) ? res.transactions : [];
            setRows((prev) => append ? [...prev, ...next] : next);
            setHasMore(Boolean(res?.hasMore));
            setOffset(pageOffset);
        } catch (err) {
            console.error('Failed to load transactions:', err);
            setError('Failed to load transactions.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        void loadPage(0, false, weekOffset);
    }, [weekOffset]);

    const handleLoadMore = () => {
        if (loadingMore || !hasMore) return;
        void loadPage(offset + PAGE_SIZE, true, weekOffset);
    };

    const renderDelta = (tx) => {
        const value = tx.delta != null ? Number(tx.delta) : null;
        if (value == null) {
            // Some legacy rows have no balance snapshot — fall back to a
            // signed amount based on the type so the column isn't blank.
            const signedTypes = {
                bet_placed: -1, fp_bet_placed: -1,
                casino_bet_debit: -1, withdrawal: -1, bet_lost: -1, fp_bet_lost: -1,
                bet_won: 1, fp_bet_won: 1, bet_void: 1, fp_bet_void: 1, bet_void_admin: 1, fp_bet_void_admin: 1,
                fp_deposit: 1, deposit: 1, casino_bet_credit: 1,
            };
            const sign = signedTypes[String(tx.type || '').toLowerCase()] || 0;
            const signed = sign * Number(tx.amount || 0);
            return <span className={signed > 0 ? 'tx-amount positive' : signed < 0 ? 'tx-amount negative' : 'tx-amount'}>{moneySigned(signed)}</span>;
        }
        return <span className={value > 0 ? 'tx-amount positive' : value < 0 ? 'tx-amount negative' : 'tx-amount'}>{moneySigned(value)}</span>;
    };

    return (
        <div className="transactions-tab">
            <div className="figures-controls">
                <select
                    className="figures-week-select"
                    value={weekOffset}
                    onChange={(e) => setWeekOffset(Number(e.target.value))}
                    aria-label="Select week"
                >
                    {WEEK_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="my-bets-empty">
                    <div className="my-bets-empty-icon"><i className="fa-solid fa-list"></i></div>
                    <h3>Loading transactions…</h3>
                </div>
            ) : error ? (
                <div className="my-bets-empty error">
                    <h3>{error}</h3>
                </div>
            ) : rows.length === 0 ? (
                <div className="my-bets-empty">
                    <div className="my-bets-empty-icon"><i className="fa-solid fa-list"></i></div>
                    <h3>No transactions this week.</h3>
                </div>
            ) : (
                <>
                    <div className="transactions-list">
                        <div className="tx-row tx-row-header">
                            <span className="tx-when">Date</span>
                            <span className="tx-label">Type</span>
                            <span className="tx-amount-col">Amount</span>
                            <span className="tx-balance">Balance</span>
                        </div>
                        {rows.map((tx) => (
                            <div key={tx.id} className="tx-row">
                                <span className="tx-when">{formatTimestamp(tx.createdAt)}</span>
                                <span className="tx-label">
                                    {tx.label}
                                    {tx.isFreeplay ? <span className="tx-fp-tag">FP</span> : null}
                                </span>
                                <span className="tx-amount-col">{renderDelta(tx)}</span>
                                <span className="tx-balance">{tx.balanceAfter != null ? money(tx.balanceAfter) : '—'}</span>
                            </div>
                        ))}
                    </div>
                    {hasMore ? (
                        <div className="transactions-load-more-row">
                            <button
                                type="button"
                                className="transactions-load-more-btn"
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? 'Loading…' : 'Load More'}
                            </button>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
};

export default MyBetsView;
