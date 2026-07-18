// Explicit .js extensions so this module is importable by Node (the CI label
// test in tools/qa/) as well as Vite — the frontend's extensionless imports
// only resolve under Vite.
import { formatLineValue, formatSpreadValue } from './odds.js';
import { isOutrightLeg, outrightLegText } from './outrightLabel.js';
import { isPlayerPropMarket, prettyPlayerMarketLabel } from './propBuilderMarkets.js';
import { splitPeriodMarketKey } from './periods.js';

// One-line, market-aware selection label shared by the betslip (ModeBetPanel)
// and the receipt (WagerConfirmedScreen). Collapses the old redundant two-line
// format ("Cincinnati Reds" / "Moneyline") into a single line, mirroring how
// My Bets already renders (minus the odds/matchup, which those surfaces show
// separately).
//
// DISPLAY ONLY — this never touches the wire value. Placement still sends
// leg.selection / marketType / odds / point independently of this string.
//
// Handles both the betslip's selection shape (`line`, `teamTotal.side`) and the
// receipt/placed-leg shape (`point`, `side`).
//
// Formats:
//   Moneyline   -> "Cincinnati Reds ML"
//   Spread      -> "Detroit Tigers -1.5"          (signed line implies spread)
//   Total       -> "Over 12" / "Under 8.5"        (no "Total" prefix)
//   Team Total  -> "Tampa Bay Team Total Over 3.5" ("Team Total" kept so it
//                                                    never reads as a game total)
//   Period      -> appends " (F5)" / " (1Q)" etc.
//   Player prop -> "Aaron Judge Over 1.5 Home Runs" (unchanged)
//   Outright    -> "Vikings to win Super Bowl"     (no redundant market word)
export const formatLegLabel = (leg) => {
    const { base: market, periodLabel } = splitPeriodMarketKey(leg?.marketType);
    const rawLine = leg?.line ?? leg?.point;
    const line = Number.isFinite(Number(rawLine)) ? Number(rawLine) : null;
    const selection = String(leg?.selection || '').trim();
    const full = String(leg?.selectionFull || '').trim() || selection || 'Pick';
    const period = periodLabel ? ` (${periodLabel})` : '';

    // Player props: keep the full "Player Over 1.5 X" pick + friendly stat.
    if (isPlayerPropMarket(leg?.marketType)) {
        return [full, prettyPlayerMarketLabel(leg?.marketType)].filter(Boolean).join(' ');
    }
    // Outright/future: "Vikings to win Super Bowl" — no redundant market word.
    if (isOutrightLeg(leg)) {
        return outrightLegText(leg) || full;
    }
    // Spread (core) or card handicap: append the signed line to the team; the
    // signed line already implies "spread", so drop the word. NOTE: this is the
    // core-spread path only — ALTERNATE spreads bake the line into the selection
    // ("Chicago -2.5"), so those fall through to the verbatim default below and
    // are never double-lined here.
    if (market === 'spreads' || market === 'alternate_spreads_cards') {
        const lineText = line === null ? '' : formatSpreadValue(line, { fallback: '' });
        return `${[full, lineText].filter(Boolean).join(' ')}${period}`;
    }
    // Team total: "Tampa Bay Team Total Over 3.5". The selection embeds the
    // team + side ("Tampa Bay Over"); read the structured side first, and keep
    // "Team Total" so it can never be confused with a game total ("Over 3.5").
    if (market === 'team_totals') {
        const sideMeta = String(leg?.teamTotal?.side ?? leg?.side ?? '').toLowerCase();
        const isUnder = sideMeta ? sideMeta === 'under' : /(?:^|\s)under\s*$/i.test(full);
        const teamRaw = full.replace(/\s+(over|under)\s*$/i, '').trim();
        const team = /^(over|under)$/i.test(teamRaw) ? '' : teamRaw;
        const lineText = line === null ? '' : formatLineValue(Math.abs(line), { fallback: '' });
        return `${[team, 'Team Total', isUnder ? 'Under' : 'Over', lineText].filter(Boolean).join(' ')}${period}`;
    }
    // Game total (core) or total-cards: "Over 12" / "Under 8.5" — no "Total"
    // prefix, no separate side row. ALTERNATE totals bake the line into the
    // selection ("Over 48.5"), so those fall through to the verbatim default.
    if (market === 'totals' || market === 'alternate_totals_cards') {
        const isUnder = selection.toUpperCase().startsWith('U') || /(?:^|\s)under\s*$/i.test(full);
        const lineText = line === null ? '' : formatLineValue(Math.abs(line), { fallback: '' });
        return `${[isUnder ? 'Under' : 'Over', lineText].filter(Boolean).join(' ')}${period}`;
    }
    // Moneyline: "Cincinnati Reds ML" — ML disambiguates a no-line pick.
    if (market === 'h2h' || market === 'moneyline' || market === 'ml') {
        return `${full} ML${period}`;
    }
    // Alternate spread/total (line already in the selection) + any other market:
    // use the full selection verbatim + the period suffix; never invent a word.
    return `${full}${period}`;
};
