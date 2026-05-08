import React, { useEffect, useMemo, useState } from 'react';
import { getMyBets, getUserFigures, getUserTransactions, getRoundRobinChildren } from '../api';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { formatLineValue, formatOdds } from '../utils/odds';
import { formatSiteDateTime } from '../utils/timezone';
import { fetchTeamBadgeUrl, createFallbackTeamLogoDataUri } from '../utils/teamLogos';
import '../mybets.css';
import { consumeMyBetsInitialFilter } from './myBetsState';

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
        const line = point === null ? '' : formatLineValue(point, { signed: true });
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
    // h2h / moneyline / anything else: never show a line, never the
    // stored point=0 sentinel that older rows leak into selection text.
    return { label: 'ML', pick: selection, line: '' };
};

const formatStatus = (value) => {
    const normalized = normalizeStatus(value);
    if (normalized === 'won') return 'WON';
    if (normalized === 'lost') return 'LOST';
    if (normalized === 'void') return 'VOID';
    return 'PENDING';
};

const statusLabel = (value) => {
    const normalized = normalizeStatus(value);
    if (normalized === 'won') return 'Won';
    if (normalized === 'lost') return 'Lost';
    if (normalized === 'void') return 'Void';
    return 'Pending';
};

const statusTheme = (value) => {
    const normalized = normalizeStatus(value);
    if (normalized === 'won') return 'won';
    if (normalized === 'lost') return 'lost';
    if (normalized === 'void') return 'void';
    return 'pending';
};

const matchLabel = (bet) => {
    if (bet?.match?.homeTeam && bet?.match?.awayTeam) {
        return `${bet.match.homeTeam} vs ${bet.match.awayTeam}`;
    }
    if (Array.isArray(bet?.selections) && bet.selections.length > 1) {
        return `${bet.selections.length}-leg ticket`;
    }
    if (bet?.matchSnapshot?.homeTeam && bet?.matchSnapshot?.awayTeam) {
        return `${bet.matchSnapshot.homeTeam} vs ${bet.matchSnapshot.awayTeam}`;
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
    if (market === 'spreads') {
        const line = point === null ? '' : formatLineValue(point, { signed: true });
        const team = shortTeam(selection) || selection;
        return line ? `${team} ${line}` : team || 'Spread';
    }
    if (market === 'totals') {
        const isUnder = selection.toLowerCase().startsWith('u');
        const line = point === null ? '' : formatLineValue(Math.abs(point));
        return line ? `${isUnder ? 'Under' : 'Over'} ${line}` : (isUnder ? 'Under' : 'Over');
    }
    // h2h / moneyline / fallback
    const team = shortTeam(selection) || selection || 'Pick';
    return `${team} ML`;
};

// One-line description for a single leg, e.g. "Lakers -4 -110".
// Used for both single-game tickets and the indented leg rows under
// a multi-leg parent. Returns the raw string the UI renders verbatim
// in the Description column.
const legDescription = (leg, oddsFormat) => {
    const market = String(leg?.marketType || '').toLowerCase();
    const point = Number.isFinite(Number(leg?.point)) ? Number(leg.point) : null;
    const selection = String(leg?.selection || '').trim();
    const odds = formatOdds(leg?.odds, oddsFormat);
    if (market === 'spreads') {
        const team = shortTeam(selection) || selection;
        const line = point === null ? '' : formatLineValue(point, { signed: true });
        return [team, line, odds].filter(Boolean).join(' ');
    }
    if (market === 'totals') {
        const isUnder = selection.toLowerCase().startsWith('u');
        const line = point === null ? '' : formatLineValue(Math.abs(point));
        return [`${isUnder ? 'Under' : 'Over'}`, line, odds].filter(Boolean).join(' ');
    }
    const team = shortTeam(selection) || selection || 'Pick';
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
const isLiveSnapshot = (snapshot, parentStatus) => {
    if (!snapshot) return false;
    const status = String(snapshot.status || '').toLowerCase();
    if (status === 'live') return true;
    const eventStatus = String(snapshot?.score?.event_status || '').toUpperCase();
    if (eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE')) return true;
    const startMs = snapshot.startTime ? new Date(snapshot.startTime).getTime() : NaN;
    if (Number.isFinite(startMs) && startMs <= Date.now() && normalizeStatus(parentStatus) === 'pending') {
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

// Live check for a single ticket leg. Two things qualify:
//   1. The leg was placed in-play (permanent — survives settlement so a
//      settled in-play bet still reads as LIVE next to its W/L letter).
//   2. The match is currently in progress AND the leg is still pending.
const isLegLive = (leg, parentBet) => {
    if (wasPlacedInPlay(parentBet, leg?.matchSnapshot)) return true;
    if (normalizeStatus(leg?.status) !== 'pending') return false;
    return isLiveSnapshot(leg?.matchSnapshot, parentBet?.status);
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
    if (isLiveSnapshot(bet?.match, bet?.status)) return true;
    if (isLiveSnapshot(bet?.matchSnapshot, bet?.status)) return true;
    return isLiveSnapshot(firstLeg?.matchSnapshot, bet?.status);
};

// Team name to use when rendering a leg's logo. For totals we pull
// from matchSnapshot since the selection is "Over"/"Under", not a team.
const legTeamForLogo = (leg) => {
    const market = String(leg?.marketType || '').toLowerCase();
    if (market === 'totals') {
        return String(leg?.matchSnapshot?.homeTeam || '').trim() || null;
    }
    return String(leg?.selection || '').trim() || null;
};

// Team whose logo represents this ticket on the collapsed row. For
// straight spreads/h2h it's the picked team (taken from leg.selection,
// which already resolves "Los Angeles Angels" vs "Angels" depending on
// what the betslip stored). Totals don't have a single team — we fall
// back to the home team of the matchup. Multi-leg tickets return null
// (the row renders a multi-leg badge instead of a logo).
const primaryTeamFor = (bet) => {
    const selections = Array.isArray(bet?.selections) ? bet.selections : [];
    if (selections.length !== 1) return null;
    const leg = selections[0];
    const market = String(leg?.marketType || '').toLowerCase();
    if (market === 'spreads' || market === 'h2h' || market === '') {
        return String(leg?.selection || '').trim() || null;
    }
    if (market === 'totals') {
        return String(leg?.matchSnapshot?.homeTeam || '').trim() || null;
    }
    return String(leg?.selection || '').trim() || null;
};

// Right-side amount + sign + colour theme for the collapsed row.
//   won  → +profit, green
//   lost → -risk, red
//   void → "Refund $X", muted
//   pending → potential win, neutral (no sign)
// Returns { text, theme } so the renderer can apply a single class
// without re-deriving the status logic at the call site.
const ticketAmount = (bet) => {
    const status = normalizeStatus(bet?.status);
    const risk = Number(bet?.riskAmount || bet?.amount || 0);
    const potential = Number(bet?.potentialPayout || 0);
    const profit = Math.max(0, potential - risk);
    if (status === 'won') return { text: moneyExactSigned(profit, '+'), theme: 'won' };
    if (status === 'lost') return { text: moneyExactSigned(risk, '-'), theme: 'lost' };
    if (status === 'void') return { text: `Refund ${moneyExact(risk)}`, theme: 'void' };
    return { text: moneyExact(profit), theme: 'pending' };
};

const payoutLabel = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'won') return 'Won';
    if (normalized === 'void') return 'Refund';
    if (normalized === 'lost') return 'Lost';
    return 'Win';
};

const payoutValue = (bet) => {
    const status = normalizeStatus(bet?.status);
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
        return `${bet.match.awayTeam} @ ${bet.match.homeTeam}`;
    }
    if (bet?.matchSnapshot?.homeTeam && bet?.matchSnapshot?.awayTeam) {
        return `${bet.matchSnapshot.awayTeam} @ ${bet.matchSnapshot.homeTeam}`;
    }
    const firstLeg = Array.isArray(bet?.selections) ? bet.selections[0] : null;
    const snap = firstLeg?.matchSnapshot;
    if (snap?.homeTeam && snap?.awayTeam) {
        return `${snap.awayTeam} @ ${snap.homeTeam}`;
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
    return 'Straight';
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
const LegDetailsPanel = ({ leg, parentBet }) => {
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
    rows.push(['Selection', legMarketLabel(leg)]);
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

    const rows = [];
    if (!isMulti && matchup) rows.push(['Matchup', matchup]);
    // Game start time sits next to Matchup so players can answer
    // "was this yesterday's bet or tonight's?" without leaving the row.
    // Multi-leg tickets skip it because each leg has its own snapshot
    // and rendering the first leg's time would mislead the eye into
    // thinking it applies to the whole ticket.
    if (gameTimeLabel) rows.push(['Game Time', gameTimeLabel]);
    rows.push(['Type', ticketTypeLabel(bet) + (isFreeplay ? ' (Freeplay)' : '')]);
    rows.push(['Odds', odds]);
    rows.push(['Placed', placedAt]);
    if (settledAt) rows.push(['Settled', settledAt]);
    if (ticketIdShort) rows.push(['Ticket', `#${ticketIdShort}`]);

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
//     footer so the player can see committed-vs-potential at a glance)
//   - the Figures tab's per-day expansion panel (mode='graded', shows
//     Description/Profit only — totals already live in the figures
//     row above as the day's P/L, so a footer would just duplicate it)
// Each instance owns its own expanded-row state so opening a ticket
// in Wednesday's drill-down doesn't toggle anything in Friday's panel.
// The win-cell logic keys off the bet's status rather than mode (a
// graded ticket renders +$X / -$X regardless of where it appears),
// so the same row code works for both modes — only header columns
// and the Risk column visibility change.
const BetTable = ({ bets, oddsFormat, teamLogos = {}, mode = 'pending' }) => {
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
                const ticketPayout = payoutValue(bet);
                const amount = ticketAmount(bet);
                const isMulti = isMultiLegBet(bet);
                const isExpanded = expandedBetId === betId;
                const winCell = status === 'pending' ? moneyExact(ticketPayout) : amount.text;
                const winTheme = status === 'pending' ? 'pending' : amount.theme;

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
                                {!isGraded && <span className="my-bets-table-col-risk">{moneyExact(risk)}</span>}
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
                                const childPayout = payoutValue(child);
                                const childAmount = ticketAmount(child);
                                const childWinCell = childStatus === 'pending' ? moneyExact(childPayout) : childAmount.text;
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
                                            {!isGraded && <span className="my-bets-table-col-risk">{moneyExact(childRisk)}</span>}
                                            <span className={`my-bets-table-col-win ${childWinTheme}`}>{childWinCell}</span>
                                        </div>
                                        {childSelections.map((leg, idx) => {
                                            const legTeam = legTeamForLogo(leg);
                                            const legLogo = legTeam
                                                ? (teamLogos[legTeam] || createFallbackTeamLogoDataUri(legTeam))
                                                : null;
                                            const childLegLive = isLegLive(leg, child);
                                            return (
                                                <div key={`${betId}-child-${ci}-leg-${idx}`} className="my-bets-table-row leg" style={{ paddingLeft: 24 }}>
                                                    <span className="my-bets-table-col-desc">
                                                        {legLogo && (
                                                            <img
                                                                src={legLogo}
                                                                alt=""
                                                                className="my-bets-table-logo"
                                                                width="20"
                                                                height="20"
                                                                loading="lazy"
                                                                decoding="async"
                                                                onError={(e) => { e.currentTarget.src = createFallbackTeamLogoDataUri(legTeam || ''); }}
                                                            />
                                                        )}
                                                        <span className="my-bets-table-leg-text">{legDescription(leg, oddsFormat)}</span>
                                                        {childLegLive && (
                                                            <span className="my-bets-table-live-badge" aria-label="Live game">LIVE</span>
                                                        )}
                                                    </span>
                                                    {!isGraded && <span className="my-bets-table-col-risk" />}
                                                    <span className="my-bets-table-col-win" />
                                                </div>
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
                                </span>
                                {!isGraded && <span className="my-bets-table-col-risk">{moneyExact(risk)}</span>}
                                <span className={`my-bets-table-col-win ${winTheme}`}>{winCell}</span>
                            </div>
                            {selections.map((leg, idx) => {
                                const legTeam = legTeamForLogo(leg);
                                const legLogo = legTeam
                                    ? (teamLogos[legTeam] || createFallbackTeamLogoDataUri(legTeam))
                                    : null;
                                const legStatus = normalizeStatus(leg?.status);
                                const legStatusLetter = legStatus === 'won' ? 'W'
                                    : legStatus === 'lost' ? 'L'
                                    : legStatus === 'void' ? 'P'
                                    : '';
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
                                                {legLogo && (
                                                    <img
                                                        src={legLogo}
                                                        alt=""
                                                        className="my-bets-table-logo"
                                                        width="20"
                                                        height="20"
                                                        loading="lazy"
                                                        decoding="async"
                                                        onError={(e) => { e.currentTarget.src = createFallbackTeamLogoDataUri(legTeam || ''); }}
                                                    />
                                                )}
                                                <span className="my-bets-table-leg-text">{legDescription(leg, oddsFormat)}</span>
                                                {legLive && (
                                                    <span className="my-bets-table-live-badge" aria-label="Live game">LIVE</span>
                                                )}
                                                {legStatusLetter && (
                                                    <span className={`my-bets-table-leg-status ${legStatus}`}>{legStatusLetter}</span>
                                                )}
                                            </span>
                                            {!isGraded && <span className="my-bets-table-col-risk" />}
                                            <span className="my-bets-table-col-win" />
                                        </div>
                                        {isLegExpanded && (
                                            <LegDetailsPanel leg={leg} parentBet={bet} />
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
                const legTeam = legTeamForLogo(leg);
                const logoSrc = legTeam
                    ? (teamLogos[legTeam] || createFallbackTeamLogoDataUri(legTeam))
                    : null;
                // Straight tickets only have one leg, so the parent bet's
                // status IS the leg's status — drive the W/L/P letter off
                // the bet itself so a settled straight gets the same green
                // W / red L / muted P treatment a settled parlay leg gets.
                const straightStatus = status; // already normalized above
                const straightStatusLetter = straightStatus === 'won' ? 'W'
                    : straightStatus === 'lost' ? 'L'
                    : straightStatus === 'void' ? 'P'
                    : '';
                const straightLive = isStraightBetLive(bet);
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
                                {logoSrc && (
                                    <img
                                        src={logoSrc}
                                        alt=""
                                        className="my-bets-table-logo"
                                        width="20"
                                        height="20"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => { e.currentTarget.src = createFallbackTeamLogoDataUri(legTeam || ''); }}
                                    />
                                )}
                                <span className="my-bets-table-leg-text">{legDescription(leg, oddsFormat)}</span>
                                {straightLive && (
                                    <span className="my-bets-table-live-badge" aria-label="Live game">LIVE</span>
                                )}
                                {straightStatusLetter && (
                                    <span className={`my-bets-table-leg-status ${straightStatus}`}>{straightStatusLetter}</span>
                                )}
                            </span>
                            {!isGraded && <span className="my-bets-table-col-risk">{moneyExact(risk)}</span>}
                            <span className={`my-bets-table-col-win ${winTheme}`}>{winCell}</span>
                        </div>
                        {isExpanded && (
                            <BetDetailsPanel bet={bet} oddsFormat={oddsFormat} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const MyBetsView = () => {
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
        const teamsToLoad = new Set();
        bets.forEach((bet) => {
            const team = primaryTeamFor(bet);
            if (team && !teamLogos[team]) teamsToLoad.add(team);
            // Also queue every leg in multi-leg tickets so the
            // indented leg rows render their crests, not just the
            // single-leg parent rows.
            const selections = Array.isArray(bet?.selections) ? bet.selections : [];
            if (selections.length > 1) {
                selections.forEach((leg) => {
                    const legTeam = legTeamForLogo(leg);
                    if (legTeam && !teamLogos[legTeam]) teamsToLoad.add(legTeam);
                });
            }
        });
        if (teamsToLoad.size === 0) return undefined;
        (async () => {
            const updates = {};
            await Promise.all(
                Array.from(teamsToLoad).map(async (team) => {
                    try {
                        const url = await fetchTeamBadgeUrl(team);
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

        const interval = window.setInterval(() => {
            if (document.hidden) return;
            void fetchBets({ silent: true });
        }, 30000);

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const pendingBets = useMemo(
        () => bets.filter((bet) => normalizeStatus(bet?.status) === 'pending'),
        [bets],
    );

    // Graded = settled tickets (won + lost + void) merged into one
    // chronological list, sorted by settledAt desc. Players don't see
    // the won-vs-lost split — that distinction is intentionally omitted
    // to discourage emotional/chasing behavior.
    const gradedBets = useMemo(() => {
        const settled = bets.filter((bet) => ['won', 'lost', 'void'].includes(normalizeStatus(bet?.status)));
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
                        { id: 'pending', label: 'Pending' },
                        { id: 'figures', label: 'Figures' },
                        { id: 'transactions', label: 'Transactions' },
                    ].map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={`my-bets-filter-chip ${activeTab === option.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'figures' ? (
                    <FiguresTab gradedBets={gradedBets} oddsFormat={oddsFormat} teamLogos={teamLogos} />
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
                    />
                )}
            </div>
        </div>
    );
};

const FiguresTab = ({ gradedBets = [], oddsFormat, teamLogos = {} }) => {
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

    // Match the backend's UTC-day indexing exactly: the `days` array is
    // weekStart..weekStart+6 in UTC, with each P/L computed from bets
    // whose settledAt falls in that 24h UTC window. Mirror the same
    // boundary here so the drill-down lists exactly the tickets that
    // contributed to the row's P/L number — anything else risks showing
    // a ticket on a day whose total doesn't include it (or vice versa)
    // when the user's local timezone differs from UTC.
    const betsForDayIndex = (dayIndex) => {
        if (!data?.weekStart) return [];
        const start = new Date(`${data.weekStart}T00:00:00Z`);
        if (Number.isNaN(start.getTime())) return [];
        start.setUTCDate(start.getUTCDate() + dayIndex);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        return gradedBets.filter((bet) => {
            const ts = bet?.settledAt || bet?.updatedAt || bet?.createdAt;
            if (!ts) return false;
            const settled = new Date(ts);
            if (Number.isNaN(settled.getTime())) return false;
            return settled >= start && settled < end;
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
                        <span className="figures-amount">{money(data.carryForward)}</span>
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
                    <div className="figures-row">
                        <span className="figures-label">Transactions</span>
                        {renderAmount(data.transactions)}
                    </div>
                    <div className="figures-row figures-row-total">
                        <span className="figures-label">End balance</span>
                        <span className="figures-amount">{money(data.endBalance)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const PAGE_SIZE = 50;

const TransactionsTab = () => {
    const [rows, setRows] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    const loadPage = async (pageOffset, append) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to view transactions.');
            setLoading(false);
            return;
        }
        if (append) setLoadingMore(true); else setLoading(true);
        setError(null);
        try {
            const res = await getUserTransactions(token, { limit: PAGE_SIZE, offset: pageOffset });
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
        void loadPage(0, false);
    }, []);

    const handleLoadMore = () => {
        if (loadingMore || !hasMore) return;
        void loadPage(offset + PAGE_SIZE, true);
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
                    <h3>No transactions yet.</h3>
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
