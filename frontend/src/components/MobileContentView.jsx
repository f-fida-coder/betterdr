import React from 'react';
import useMatches from '../hooks/useMatches';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { getSportKeywords, findSportItemById } from '../data/sportsData';
import {
    formatLineValue,
    formatOdds,
    getMatchMarket,
    getMarketOutcomeByKeyword,
    getMarketOutcomeByName,
    parseOddsNumber,
} from '../utils/odds';
import { logoUrlForTeam, fetchTeamBadgeUrl, prewarmTeamBadges } from '../utils/teamLogos';
import PropBuilderModal from './PropBuilderModal';
import MatchDetailView from './MatchDetailView';

const WEEKDAYS_LONG = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const NBA_TEAM_COLORS = {
    'atlanta hawks': '#e03a3e',
    'boston celtics': '#007a33',
    'brooklyn nets': '#000000',
    'charlotte hornets': '#1d1160',
    'chicago bulls': '#ce1141',
    'cleveland cavaliers': '#860038',
    'dallas mavericks': '#00538c',
    'denver nuggets': '#0e2240',
    'detroit pistons': '#c8102e',
    'golden state warriors': '#1d428a',
    'houston rockets': '#ce1141',
    'indiana pacers': '#002d62',
    'la clippers': '#c8102e',
    'los angeles clippers': '#c8102e',
    'los angeles lakers': '#552583',
    'memphis grizzlies': '#5d76a9',
    'miami heat': '#98002e',
    'milwaukee bucks': '#00471b',
    'minnesota timberwolves': '#0c2340',
    'new orleans pelicans': '#0c2340',
    'new york knicks': '#006bb6',
    'oklahoma city thunder': '#007ac1',
    'orlando magic': '#0077c0',
    'philadelphia 76ers': '#006bb6',
    'phoenix suns': '#1d1160',
    'portland trail blazers': '#e03a3e',
    'sacramento kings': '#5a2d81',
    'san antonio spurs': '#1e293b',
    'toronto raptors': '#ce1141',
    'utah jazz': '#002b5c',
    'washington wizards': '#002b5c',
};

const DEFAULT_SPORT_AVATAR = '#1e293b';

const colorForTeam = (name = '') => {
    const key = name.trim().toLowerCase();
    return NBA_TEAM_COLORS[key] || DEFAULT_SPORT_AVATAR;
};

const initialsForName = (name = '') => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const dayKeyOf = (d) => (d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : '');
const dayLabelOf = (d) => (d ? `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}` : '');

const WEEKDAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
// "Today 4/23 6:10pm" / "Tomorrow 4/24 6:10pm" / "Fri 4/25 6:10pm" /
// "4/28 6:10pm" — keeps every row self-describing so a user scrolling
// past a day divider never has to guess which date they're betting on.
const formatMatchDateTime = (startDate) => {
    if (!startDate || Number.isNaN(startDate.getTime?.())) return '';
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sdMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
    const daysDiff = Math.round((sdMidnight - todayMidnight) / 86400000);

    const mdy = `${startDate.getMonth() + 1}/${startDate.getDate()}`;
    const time = startDate
        .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        .toLowerCase()
        .replace(/\s+/g, '');

    let prefix = '';
    if (daysDiff === 0) prefix = 'Today';
    else if (daysDiff === 1) prefix = 'Tomorrow';
    else if (daysDiff === -1) prefix = 'Yesterday';
    else if (daysDiff > 1 && daysDiff < 7) prefix = WEEKDAYS_SHORT[startDate.getDay()].charAt(0)
        + WEEKDAYS_SHORT[startDate.getDay()].slice(1).toLowerCase();
    return prefix ? `${prefix} ${mdy} ${time}` : `${mdy} ${time}`;
};

const STALE_MS = 5 * 60 * 1000;
const TICK_MS = 30 * 1000;

const FULL_PERIOD = { id: 'full', label: 'Game', suffix: '' };

// Periods available per sport. Suffixes match Odds API market key conventions
// (e.g. `h2h_h1`, `spreads_q1`, `totals_1st_5_innings`). Entries whose
// suffix doesn't appear in returned markets are filtered out before render.
const BASKETBALL_PERIODS = [
    FULL_PERIOD,
    { id: '1h', label: '1H', suffix: '_h1' },
    { id: '2h', label: '2H', suffix: '_h2' },
    { id: '1q', label: '1Q', suffix: '_q1' },
    { id: '2q', label: '2Q', suffix: '_q2' },
    { id: '3q', label: '3Q', suffix: '_q3' },
    { id: '4q', label: '4Q', suffix: '_q4' },
];
const FOOTBALL_PERIODS = [
    FULL_PERIOD,
    { id: '1h', label: '1H', suffix: '_h1' },
    { id: '2h', label: '2H', suffix: '_h2' },
    { id: '1q', label: '1Q', suffix: '_q1' },
    { id: '2q', label: '2Q', suffix: '_q2' },
    { id: '3q', label: '3Q', suffix: '_q3' },
    { id: '4q', label: '4Q', suffix: '_q4' },
];
const BASEBALL_PERIODS = [
    FULL_PERIOD,
    { id: 'f1', label: 'F1', suffix: '_1st_1_innings' },
    { id: 'f3', label: 'F3', suffix: '_1st_3_innings' },
    { id: 'f5', label: 'F5', suffix: '_1st_5_innings' },
    { id: 'f7', label: 'F7', suffix: '_1st_7_innings' },
];
const HOCKEY_PERIODS = [
    FULL_PERIOD,
    { id: 'p1', label: 'P1', suffix: '_p1' },
    { id: 'p2', label: 'P2', suffix: '_p2' },
    { id: 'p3', label: 'P3', suffix: '_p3' },
];
const SOCCER_PERIODS = [
    FULL_PERIOD,
    { id: '1h', label: '1H', suffix: '_h1' },
];

const PERIOD_CONFIG = {
    nba: BASKETBALL_PERIODS,
    'ncaa-basketball': BASKETBALL_PERIODS,
    nfl: FOOTBALL_PERIODS,
    'ncaa-football': FOOTBALL_PERIODS,
    mlb: BASEBALL_PERIODS,
    nhl: HOCKEY_PERIODS,
    soccer: SOCCER_PERIODS,
};

const getPeriodsForSport = (sportId) => PERIOD_CONFIG[sportId] || [FULL_PERIOD];

const normalizeMode = (mode) => String(mode || 'straight').toLowerCase().replace(/-/g, '_');

const getVisibleMarketsForMode = (mode) => {
    const normalizedMode = normalizeMode(mode);
    return {
        showSpread: true,
        showMoneyline: normalizedMode !== 'teaser',
        showTotals: true,
    };
};

const BET_MODE_LABELS = {
    straight: 'Straight',
    parlay: 'Parlay',
    teaser: 'Teaser',
    if_bet: 'If Bet',
    reverse: 'Reverse',
};

const selectionKey = (matchId, marketType, selection) => `${matchId}|${marketType}|${selection}`;

// Rotation number ranges by sport — mirrors standard sportsbook ranges so the
// numbering feels native rather than invented. Each event gets a deterministic
// even/odd pair (away=even, home=even+1... actually home=odd below away). Keyed
// off the match id + sport so numbers stay stable across renders.
const ROTATION_BASE_BY_SPORT = {
    basketball_nba: 501,
    basketball_ncaab: 551,
    basketball_wncaab: 571,
    americanfootball_nfl: 251,
    americanfootball_ncaaf: 301,
    baseball_mlb: 901,
    icehockey_nhl: 601,
    soccer_epl: 7101,
    soccer_usa_mls: 7201,
    tennis_atp: 8001,
    tennis_wta: 8101,
};
const rotationForMatch = (match, index) => {
    const sportKey = String(match?.sportKey || match?.sport || '').toLowerCase();
    const base = ROTATION_BASE_BY_SPORT[sportKey] ?? 101;
    // 2 numbers per matchup (away / home). Index is the ordered position of
    // the match within the current list, so numbering matches list order.
    const away = base + index * 2;
    return { away, home: away + 1 };
};

const FAVORITES_STORAGE_KEY = 'betterdr:favoriteMatches:v1';
const readFavoriteIds = () => {
    try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
        return new Set();
    }
};
const writeFavoriteIds = (set) => {
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch { /* quota / privacy — ignore */ }
};

const MobileContentView = ({ selectedSports = [], activeBetMode = 'straight', slipSelections = [] }) => {
    const { oddsFormat } = useOddsFormat();
    const normalizedBetMode = normalizeMode(activeBetMode);
    const activeModeLabel = BET_MODE_LABELS[normalizedBetMode] || BET_MODE_LABELS.straight;

    const primarySport = selectedSports?.[0] ?? null;
    const statusFilter = primarySport === 'commercial-live'
        ? 'live'
        : primarySport === 'up-next'
            ? 'upcoming'
            : 'live-upcoming';
    const scopeKey = selectedSports.join('|');
    const rawMatches = useMatches({ status: statusFilter, scopeKey });

    const sportName = React.useMemo(() => {
        if (!primarySport) return 'Sports';
        const item = findSportItemById(primarySport);
        return item ? item.label : primarySport.replace(/-/g, ' ').toUpperCase();
    }, [primarySport]);

    // Derive the set of period market-suffixes actually present in the fetched
    // matches (e.g. '_h1' if any match carries `h2h_h1`/`spreads_h1`/`totals_h1`).
    // Full-game ('') is always present. We use this to hide period tabs for
    // periods the Odds API isn't returning right now. Skip unbettable matches
    // so a period tab never appears with zero playable games behind it.
    const availableSuffixes = React.useMemo(() => {
        const set = new Set(['']);
        const scan = (markets) => {
            if (!Array.isArray(markets)) return;
            markets.forEach(m => {
                const matched = String(m?.key || '').match(/^(?:h2h|spreads|totals)(_[a-z0-9_]+)$/);
                if (matched) set.add(matched[1]);
            });
        };
        (rawMatches || []).forEach(match => {
            if (match?.isBettable === false) return;
            scan(match?.odds?.markets);
            scan(match?.odds?.extendedMarkets);
        });
        return set;
    }, [rawMatches]);

    const periods = React.useMemo(() => {
        return getPeriodsForSport(primarySport).filter(p => availableSuffixes.has(p.suffix));
    }, [primarySport, availableSuffixes]);

    const [selectedPeriodId, setSelectedPeriodId] = React.useState('full');

    // Reset to Full Game whenever the sport changes.
    React.useEffect(() => {
        setSelectedPeriodId('full');
    }, [primarySport]);

    // If the currently-selected period is no longer available (e.g. data just
    // reloaded without period markets), fall back to Full Game.
    React.useEffect(() => {
        if (!periods.some(p => p.id === selectedPeriodId)) {
            setSelectedPeriodId('full');
        }
    }, [periods, selectedPeriodId]);

    const activePeriod = periods.find(p => p.id === selectedPeriodId) || FULL_PERIOD;

    const extractOdds = React.useCallback((match, homeName, awayName, suffix) => {
        const h2h = getMatchMarket(match, `h2h${suffix}`);
        const spreads = getMatchMarket(match, `spreads${suffix}`);
        const totals = getMatchMarket(match, `totals${suffix}`);

        return {
            spreadHomePoint: getMarketOutcomeByName(spreads, homeName)?.point ?? null,
            spreadAwayPoint: getMarketOutcomeByName(spreads, awayName)?.point ?? null,
            spreadHomePrice: parseOddsNumber(getMarketOutcomeByName(spreads, homeName)?.price),
            spreadAwayPrice: parseOddsNumber(getMarketOutcomeByName(spreads, awayName)?.price),
            moneylineHome: parseOddsNumber(getMarketOutcomeByName(h2h, homeName)?.price),
            moneylineAway: parseOddsNumber(getMarketOutcomeByName(h2h, awayName)?.price),
            totalPoint: getMarketOutcomeByKeyword(totals, 'over')?.point ?? getMarketOutcomeByKeyword(totals, 'under')?.point ?? null,
            totalOverPrice: parseOddsNumber(getMarketOutcomeByKeyword(totals, 'over')?.price),
            totalUnderPrice: parseOddsNumber(getMarketOutcomeByKeyword(totals, 'under')?.price),
        };
    }, []);

    const matches = React.useMemo(() => {
        const sportKeywords = primarySport ? getSportKeywords(primarySport) : null;
        // Filter raw matches BEFORE the expensive map (extractOdds / date
        // formatting). Drops:
        //   1. Non-bettable matches — book pulled lines, game past start
        //      with no live markets, etc. Pro books (DK/FanDuel/MGM) hide
        //      these rather than showing empty rows with a red banner.
        //   2. Matches outside the selected sport.
        const filteredRaw = (rawMatches || []).filter((match) => {
            // Only hide matches with no odds markets at all. Stale odds
            // (book between sync cycles) still render — the MatchCard
            // disables bet buttons and shows the blocked reason. Hiding
            // on `isBettable===false` caused whole sports to vanish when
            // upstream API calls failed, which is worse UX than showing
            // the match with a "Lines updating" indicator.
            const markets = match?.odds?.markets;
            if (!Array.isArray(markets) || markets.length === 0) return false;
            if (sportKeywords) {
                const sport = String(match?.sport || '').toLowerCase();
                const sportKey = String(match?.sportKey || '').toLowerCase();
                const haystack = `${sport}|${sportKey}`;
                if (!haystack.trim() || !sportKeywords.some((k) => haystack.includes(k))) return false;
            }
            return true;
        });

        const formatted = filteredRaw.map(match => {
            const homeName = match.homeTeam || match.home_team || '';
            const awayName = match.awayTeam || match.away_team || '';
            const eventStatus = (match.score?.event_status || '').toString().toUpperCase();
            const isLive = match.status === 'live' || eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE');
            const startDate = match.startTime ? new Date(match.startTime) : null;

            return {
                id: match.id || match.externalId,
                sport: match.sport || '',
                sportKey: match.sportKey || '',
                team1: awayName,
                team2: homeName,
                odds: extractOdds(match, homeName, awayName, activePeriod.suffix),
                isLive,
                // Preserve backend flag: MatchCard reads this to disable
                // bet buttons when the book has stale or suspended lines.
                isBettable: match.isBettable !== false,
                bettingBlockedReason: match.bettingBlockedReason || '',
                startDate,
                time: startDate ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                // Self-describing "Today 4/23 6:10pm" variant for each row
                // so scrolling past the day divider doesn't hide context.
                timeDisplay: formatMatchDateTime(startDate),
                dayKey: dayKeyOf(startDate),
                dayLabel: dayLabelOf(startDate),
                // SGP is offered when the match has any player-prop markets
                // cached — /api/matches/{id}/props triggers the actual fetch.
                hasSgp: Array.isArray(match.playerProps) && match.playerProps.length > 0,
            };
        });

        // Chronological order is the contract the day-divider grouping
        // depends on. Sort here as a client-side safety belt: even if
        // the backend hands us events in a different order, the list
        // never renders a future day before an earlier one.
        formatted.sort((a, b) => {
            const aTs = a.startDate ? a.startDate.getTime() : Number.POSITIVE_INFINITY;
            const bTs = b.startDate ? b.startDate.getTime() : Number.POSITIVE_INFINITY;
            return aTs - bTs;
        });
        return formatted;
    }, [rawMatches, primarySport, extractOdds, activePeriod.suffix]);

    const degradedSummary = React.useMemo(() => {
        const all = Array.isArray(rawMatches) ? rawMatches : [];
        const blocked = all.filter((m) => m?.isBettable === false);
        const staleBlocked = blocked.filter((m) => {
            const reason = String(m?.bettingBlockedReason || '').toLowerCase();
            return m?.oddsFeedStale === true || reason.includes('stale') || reason.includes('suspend');
        });
        return {
            staleBlockedCount: staleBlocked.length,
        };
    }, [rawMatches]);

    const visibleMarkets = React.useMemo(() => getVisibleMarketsForMode(activeBetMode), [activeBetMode]);
    const marketCount = [visibleMarkets.showSpread, visibleMarkets.showMoneyline, visibleMarkets.showTotals].filter(Boolean).length;
    const selectedKeys = React.useMemo(() => {
        return new Set((slipSelections || []).map(sel => selectionKey(sel.matchId, sel.marketType, sel.selection)));
    }, [slipSelections]);

    const [favoriteIds, setFavoriteIds] = React.useState(() => readFavoriteIds());
    const toggleFavorite = React.useCallback((matchId) => {
        setFavoriteIds((prev) => {
            const next = new Set(prev);
            if (next.has(matchId)) next.delete(matchId);
            else next.add(matchId);
            writeFavoriteIds(next);
            return next;
        });
    }, []);

    // Preserve the chronological order established in `matches` and just
    // annotate each event with its rotation number. (Favorites-first sort
    // was removed with the star icon — reintroducing it would break the
    // day-divider grouping the user relies on to spot today's games.)
    const orderedMatches = React.useMemo(() => {
        return matches.map((m, idx) => ({
            ...m,
            rotation: rotationForMatch(m, idx),
            isFavorite: favoriteIds.has(m.id),
        }));
    }, [matches, favoriteIds]);

    // Pre-warm team/athlete badge cache so the first paint of any card
    // shows the real logo instead of an initials placeholder that
    // swaps in ~300ms later. Concurrency-limited inside prewarmTeamBadges.
    React.useEffect(() => {
        const names = [];
        matches.forEach((m) => {
            if (m.team1) names.push(m.team1);
            if (m.team2) names.push(m.team2);
        });
        prewarmTeamBadges(names);
    }, [matches]);

    const [lastFetchTime, setLastFetchTime] = React.useState(() => Date.now());
    const [isRefreshing, setIsRefreshing] = React.useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
    const [nowTick, setNowTick] = React.useState(() => Date.now());

    React.useEffect(() => {
        setLastFetchTime(Date.now());
        setIsRefreshing(true);
        setHasLoadedOnce(false);
    }, [scopeKey, statusFilter]);

    React.useEffect(() => {
        const id = setInterval(() => setNowTick(Date.now()), TICK_MS);
        return () => clearInterval(id);
    }, []);

    React.useEffect(() => {
        const onCompleted = () => {
            setIsRefreshing(false);
            setHasLoadedOnce(true);
            setLastFetchTime(Date.now());
            setNowTick(Date.now());
        };
        const onProgress = (event) => {
            const phase = event?.detail?.phase;
            if (phase === 'started') setIsRefreshing(true);
        };
        window.addEventListener('matches:refresh-completed', onCompleted);
        window.addEventListener('matches:refresh-progress', onProgress);
        return () => {
            window.removeEventListener('matches:refresh-completed', onCompleted);
            window.removeEventListener('matches:refresh-progress', onProgress);
        };
    }, []);

    const handleManualRefresh = React.useCallback(() => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        window.dispatchEvent(new CustomEvent('matches:refresh', {
            detail: { reason: 'user', requestId: `mobile-${Date.now()}` },
        }));
    }, [isRefreshing]);

    const ageMs = nowTick - lastFetchTime;
    const isStale = ageMs >= STALE_MS;
    const minutesAgo = Math.max(0, Math.floor(ageMs / 60000));
    const ageLabel = ageMs < 60000 ? 'Just updated' : `Updated ${minutesAgo}m ago`;

    const handleAddToSlip = (matchId, selection, marketType, odds, matchName, marketLabel = marketType) => {
        const parsedOdds = parseOddsNumber(odds);
        if (!matchId || !selection || parsedOdds === null) return;
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: { matchId, selection, marketType, odds: parsedOdds, matchName, marketLabel },
        }));
    };

    const groupedEntries = React.useMemo(() => {
        const entries = [];
        let currentDayKey = null;
        orderedMatches.forEach(match => {
            if (match.dayKey && match.dayKey !== currentDayKey) {
                currentDayKey = match.dayKey;
                entries.push({ type: 'day', id: `day-${currentDayKey}`, label: match.dayLabel });
            }
            entries.push({ type: 'match', id: `match-${match.id}`, match });
        });
        return entries;
    }, [orderedMatches]);

    return (
        <div style={containerStyle}>
            <div style={sportHeaderStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={sportTitleStyle}>{sportName}</div>
                    <div style={sportSubtitleStyle}>
                        {activeModeLabel} · {statusFilter === 'live' ? 'Live Matches' : statusFilter === 'upcoming' ? 'Upcoming Matches' : 'Live & Upcoming'}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    style={isStale ? refreshButtonStaleStyle : refreshButtonStyle}
                    aria-label="Refresh odds"
                >
                    <i className={`fa-solid fa-arrows-rotate ${isRefreshing ? 'fa-spin' : ''}`} style={{ marginRight: 6 }} />
                    {isRefreshing ? 'Updating…' : isStale ? 'Refresh for latest odds' : ageLabel}
                </button>
            </div>

            {periods.length >= 1 && (
                <div style={periodTabBarStyle}>
                    {periods.map(p => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedPeriodId(p.id)}
                            style={p.id === selectedPeriodId ? periodTabActiveStyle : periodTabStyle}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            )}

            <div style={{ flex: 1 }}>
                {isRefreshing && hasLoadedOnce && (
                    <div style={updatingBannerStyle}>
                        <i className="fa-solid fa-arrows-rotate fa-spin" style={{ marginRight: 6 }} />
                        Updating odds…
                    </div>
                )}

                {groupedEntries.length === 0 && !hasLoadedOnce && (
                    <SkeletonList />
                )}

                {groupedEntries.length === 0 && hasLoadedOnce && (
                    <div style={emptyStateStyle}>
                        <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5, display: 'block' }}></i>
                        <p style={{ fontSize: '13px', margin: '0 0 4px 0', color: '#999', fontWeight: '600' }}>No matches available</p>
                        <p style={{ fontSize: '11px', margin: 0, color: '#bbb' }}>Check back later for updates</p>
                    </div>
                )}

                {groupedEntries.map(entry => {
                    if (entry.type === 'day') {
                        // Day header only — per-match column labels now
                        // render inside each MatchCard so every row
                        // self-describes its SPREAD / ML / TOTAL columns.
                        return <div key={entry.id} style={dayHeaderStyle}>{entry.label}</div>;
                    }
                    return (
                        <MatchCard
                            key={entry.id}
                            match={entry.match}
                            oddsFormat={oddsFormat}
                            onAddToSlip={handleAddToSlip}
                            selectedKeys={selectedKeys}
                            visibleMarkets={visibleMarkets}
                            marketCount={marketCount}
                            onToggleFavorite={toggleFavorite}
                        />
                    );
                })}
            </div>
        </div>
    );
};

const MatchCard = ({ match, oddsFormat, onAddToSlip, selectedKeys, visibleMarkets, marketCount, onToggleFavorite }) => {
    const matchName = `${match.team1} vs ${match.team2}`;
    const blocked = match.isBettable === false;
    const rotationAway = match.rotation?.away;
    const rotationHome = match.rotation?.home;
    const blockedReason = blocked
        ? (match.bettingBlockedReason || 'Betting is temporarily unavailable for this event.')
        : null;
    const isSelected = (marketType, selection) => selectedKeys.has(`${match.id}|${marketType}|${selection}`);
    const addIfAllowed = (...args) => {
        if (blocked) return;
        onAddToSlip(...args);
    };
    const [propsOpen, setPropsOpen] = React.useState(false);
    const [detailOpen, setDetailOpen] = React.useState(false);
    // Track whether detail view was opened via SGP tap so the modal can
    // surface a hint about switching to parlay mode.
    const [detailSgpMode, setDetailSgpMode] = React.useState(false);
    const modalMatch = React.useMemo(() => ({
        id: match.id,
        externalId: match.externalId,
        homeTeam: match.team2,
        awayTeam: match.team1,
        odds: match.odds,
    }), [match.id, match.externalId, match.team1, match.team2, match.odds]);
    return (
        <div style={matchCardStyle}>
            {/* Combined header row: live dot + date on the left,
                SPREAD / ML / TOTAL labels aligned with the odds
                columns below. Trailing empty slot matches the
                compact action column on the right. */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `minmax(0, 1fr) ${Array.from({ length: marketCount }, () => '54px').join(' ')} 30px`,
                columnGap: 4,
                padding: '0 0 4px',
                alignItems: 'center',
            }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {match.isLive && (
                        <span
                            aria-label="Live"
                            title="Live"
                            style={{
                                display: 'inline-block',
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                background: '#ef4444',
                                boxShadow: '0 0 0 2px rgba(239,68,68,0.2)',
                            }}
                        />
                    )}
                    <span style={matchTimeStyle}>{match.timeDisplay || match.time}</span>
                </span>
                {visibleMarkets.showSpread && <span style={columnLabelStyle}>Spread</span>}
                {visibleMarkets.showMoneyline && <span style={columnLabelStyle}>ML</span>}
                {visibleMarkets.showTotals && <span style={columnLabelStyle}>Total</span>}
                <span />
            </div>
            {propsOpen && (
                <PropBuilderModal match={modalMatch} onClose={() => setPropsOpen(false)} />
            )}
            {detailOpen && (
                <MatchDetailView
                    match={modalMatch}
                    sgpMode={detailSgpMode}
                    onClose={() => setDetailOpen(false)}
                />
            )}

            {/* Body: team info | odds | [+ / P+ / SGP] compact action
                column. Action column is narrow (30px) so the three odds
                columns never get squeezed. */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `minmax(0, 1fr) ${Array.from({ length: marketCount }, () => '54px').join(' ')} 30px`,
                gridTemplateRows: 'auto auto',
                columnGap: 4,
                rowGap: 4,
                alignItems: 'center',
                padding: '2px 0 8px',
            }}>
                <div style={{ ...teamCellStyle, gridColumn: 1, gridRow: 1 }}>
                    <TeamAvatar team={match.team1} />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        {rotationAway != null && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#9aa' }}>{rotationAway}</span>
                        )}
                        <span style={teamNameStyle}>{match.team1}</span>
                    </div>
                </div>

                {visibleMarkets.showSpread && (
                    <OddsCell
                        disabled={blocked || match.odds.spreadAwayPrice === null}
                        selected={isSelected('spreads', match.team1) && !blocked}
                        main={formatLineValue(match.odds.spreadAwayPoint, { signed: true })}
                        juice={formatOdds(match.odds.spreadAwayPrice, oddsFormat)}
                        onClick={() => addIfAllowed(match.id, match.team1, 'spreads', match.odds.spreadAwayPrice, matchName, 'Spread')}
                    />
                )}
                {visibleMarkets.showMoneyline && (
                    <OddsCell
                        disabled={blocked || match.odds.moneylineAway === null}
                        selected={isSelected('h2h', match.team1) && !blocked}
                        main={formatOdds(match.odds.moneylineAway, oddsFormat)}
                        juice=""
                        onClick={() => addIfAllowed(match.id, match.team1, 'h2h', match.odds.moneylineAway, matchName, 'Moneyline')}
                    />
                )}
                {visibleMarkets.showTotals && (
                    <OddsCell
                        disabled={blocked || match.odds.totalOverPrice === null}
                        selected={isSelected('totals', 'Over') && !blocked}
                        main={match.odds.totalPoint === null ? '—' : `O ${formatLineValue(match.odds.totalPoint)}`}
                        juice={formatOdds(match.odds.totalOverPrice, oddsFormat)}
                        onClick={() => addIfAllowed(match.id, 'Over', 'totals', match.odds.totalOverPrice, matchName, 'Total')}
                    />
                )}

                {/* Right-column action stack — spans both team rows so
                    all three buttons sit vertically centered against the
                    odds grid: `+` (all markets), `P+` (player props),
                    `SGP` (single-game parlay). Grid auto-placement fills
                    the cell left over after team1's odds, so we anchor
                    with grid-row 1 / span 2 to reserve the full column. */}
                <div style={{
                    // Column 1 = team info, cols 2..(2+marketCount-1) = odds,
                    // col (marketCount + 2) = action stack. Using an
                    // explicit number (not `-1`) so auto-placement of the
                    // odds cells doesn't leak into the action slot.
                    gridColumn: marketCount + 2,
                    gridRow: '1 / span 2',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 3,
                }}>
                    <button
                        type="button"
                        onClick={() => { setDetailSgpMode(false); setDetailOpen(true); }}
                        disabled={blocked}
                        aria-label="Open all markets"
                        title="All game markets"
                        style={{
                            background: blocked ? '#444' : '#d0451b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            width: 28,
                            height: 18,
                            fontSize: 11,
                            fontWeight: 700,
                            lineHeight: 1,
                            cursor: blocked ? 'not-allowed' : 'pointer',
                            opacity: blocked ? 0.5 : 1,
                            padding: 0,
                        }}
                    >+</button>
                    <button
                        type="button"
                        onClick={() => setPropsOpen(true)}
                        disabled={blocked}
                        aria-label="Open prop builder"
                        title="Player props"
                        style={{
                            background: blocked ? '#444' : 'linear-gradient(135deg, #a020f0, #d946ef)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            width: 28,
                            height: 18,
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: 0.2,
                            lineHeight: 1,
                            cursor: blocked ? 'not-allowed' : 'pointer',
                            opacity: blocked ? 0.5 : 1,
                            padding: 0,
                        }}
                    >P+</button>
                    <button
                        type="button"
                        onClick={() => { setDetailSgpMode(true); setDetailOpen(true); }}
                        disabled={blocked}
                        aria-label="Build Single Game Parlay"
                        title="Single-Game Parlay — pick 2+ legs from this game, then switch to PARLAY in your slip"
                        style={{
                            background: blocked ? '#e5e7eb' : '#e6f7ec',
                            color: blocked ? '#9ca3af' : '#15803d',
                            border: `1px solid ${blocked ? '#d1d5db' : '#22c55e'}`,
                            borderRadius: 4,
                            width: 28,
                            height: 18,
                            fontSize: 8,
                            fontWeight: 800,
                            letterSpacing: 0.3,
                            lineHeight: 1,
                            cursor: blocked ? 'not-allowed' : 'pointer',
                            padding: 0,
                        }}
                    >SGP</button>
                </div>

                <div style={{ ...teamCellStyle, gridColumn: 1, gridRow: 2 }}>
                    <TeamAvatar team={match.team2} />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        {rotationHome != null && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#9aa' }}>{rotationHome}</span>
                        )}
                        <span style={teamNameStyle}>{match.team2}</span>
                    </div>
                </div>

                {visibleMarkets.showSpread && (
                    <OddsCell
                        disabled={blocked || match.odds.spreadHomePrice === null}
                        selected={isSelected('spreads', match.team2) && !blocked}
                        main={formatLineValue(match.odds.spreadHomePoint, { signed: true })}
                        juice={formatOdds(match.odds.spreadHomePrice, oddsFormat)}
                        onClick={() => addIfAllowed(match.id, match.team2, 'spreads', match.odds.spreadHomePrice, matchName, 'Spread')}
                    />
                )}
                {visibleMarkets.showMoneyline && (
                    <OddsCell
                        disabled={blocked || match.odds.moneylineHome === null}
                        selected={isSelected('h2h', match.team2) && !blocked}
                        main={formatOdds(match.odds.moneylineHome, oddsFormat)}
                        juice=""
                        onClick={() => addIfAllowed(match.id, match.team2, 'h2h', match.odds.moneylineHome, matchName, 'Moneyline')}
                    />
                )}
                {visibleMarkets.showTotals && (
                    <OddsCell
                        disabled={blocked || match.odds.totalUnderPrice === null}
                        selected={isSelected('totals', 'Under') && !blocked}
                        main={match.odds.totalPoint === null ? '—' : `U ${formatLineValue(match.odds.totalPoint)}`}
                        juice={formatOdds(match.odds.totalUnderPrice, oddsFormat)}
                        onClick={() => addIfAllowed(match.id, 'Under', 'totals', match.odds.totalUnderPrice, matchName, 'Total')}
                    />
                )}
                {/* SGP cell for row 2 is covered by the spanning action
                    stack anchored above. */}
            </div>

            {blocked && (
                <div style={blockedBannerStyle}>
                    <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6, color: '#c2410c' }} />
                    {blockedReason}
                </div>
            )}
        </div>
    );
};

const TeamAvatar = ({ team }) => {
    // Start with whatever the synchronous map / warm cache knows about this
    // team. If it comes back null, kick off the async TheSportsDB lookup —
    // which covers virtually every pro team/athlete worldwide — and swap
    // the img src in once it resolves. Result is cached for 24h in
    // localStorage, so subsequent renders for the same team are instant.
    const [logoUrl, setLogoUrl] = React.useState(() => logoUrlForTeam(team));
    const [imgFailed, setImgFailed] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        setImgFailed(false);
        const sync = logoUrlForTeam(team);
        if (sync) {
            setLogoUrl(sync);
            return undefined;
        }
        setLogoUrl(null);
        fetchTeamBadgeUrl(team).then((url) => {
            if (cancelled) return;
            // TheSportsDB misses fall back to the initials data-URI;
            // leave the colored circle for those to keep load times snappy.
            if (url && !url.startsWith('data:')) setLogoUrl(url);
        }).catch(() => { /* swallow — already falls back below */ });
        return () => { cancelled = true; };
    }, [team]);

    const showImage = logoUrl && !imgFailed;
    if (showImage) {
        return (
            <img
                src={logoUrl}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setImgFailed(true)}
                style={avatarImageStyle}
            />
        );
    }
    return (
        <div style={{ ...avatarStyle, background: colorForTeam(team) }}>
            {initialsForName(team)}
        </div>
    );
};

const TeamRow = ({ team, rotation, spreadLine, spreadPrice, moneyline, totalLabel, totalLine, totalPrice, oddsFormat, forceDisabled, spreadSelected, mlSelected, totalSelected, visibleMarkets, marketCount, onSpreadClick, onMoneylineClick, onTotalClick }) => (
    <div style={teamRowStyleFor(marketCount)}>
        <div style={teamCellStyle}>
            <TeamAvatar team={team} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {rotation != null && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9aa' }}>{rotation}</span>
                )}
                <span style={teamNameStyle}>{team}</span>
            </div>
        </div>
        {visibleMarkets.showSpread && (
            <OddsCell
                disabled={forceDisabled || spreadPrice === null}
                selected={spreadSelected && !forceDisabled}
                main={formatLineValue(spreadLine, { signed: true })}
                juice={formatOdds(spreadPrice, oddsFormat)}
                onClick={onSpreadClick}
            />
        )}
        {visibleMarkets.showMoneyline && (
            <OddsCell
                disabled={forceDisabled || moneyline === null}
                selected={mlSelected && !forceDisabled}
                main={formatOdds(moneyline, oddsFormat)}
                juice=""
                onClick={onMoneylineClick}
            />
        )}
        {visibleMarkets.showTotals && (
            <OddsCell
                disabled={forceDisabled || totalPrice === null}
                selected={totalSelected && !forceDisabled}
                main={totalLine === null ? '—' : `${totalLabel} ${formatLineValue(totalLine)}`}
                juice={formatOdds(totalPrice, oddsFormat)}
                onClick={onTotalClick}
            />
        )}
    </div>
);

const SkeletonList = () => (
    <div aria-busy="true" aria-label="Loading odds">
        {[0, 1, 2].map(i => (
            <div key={i} style={skeletonCardStyle}>
                <div style={{ ...skeletonBarStyle, width: '40%', height: 12 }} />
                <div style={skeletonRowStyle}>
                    <div style={{ ...skeletonBarStyle, width: 28, height: 28 }} />
                    <div style={{ ...skeletonBarStyle, flex: 1, height: 12 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                </div>
                <div style={skeletonRowStyle}>
                    <div style={{ ...skeletonBarStyle, width: 28, height: 28 }} />
                    <div style={{ ...skeletonBarStyle, flex: 1, height: 12 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                    <div style={{ ...skeletonBarStyle, width: 54, height: 40 }} />
                </div>
            </div>
        ))}
    </div>
);

const OddsCell = ({ disabled, selected, main, juice, onClick }) => (
    <button
        style={disabled ? oddsCellDisabledStyle : (selected ? oddsCellSelectedStyle : oddsCellStyle)}
        onClick={onClick}
        disabled={disabled}
    >
        <span style={selected && !disabled ? oddsCellMainSelectedStyle : oddsCellMainStyle}>{disabled ? '—' : main}</span>
        {!disabled && juice ? <span style={selected ? oddsCellJuiceSelectedStyle : oddsCellJuiceStyle}>{juice}</span> : null}
    </button>
);

// ── Styles ────────────────────────────────────────────────

const containerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f4f5f7',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
};

const sportHeaderStyle = {
    padding: '12px 14px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
};

const sportTitleStyle = { fontSize: '15px', fontWeight: 700, color: '#111', lineHeight: 1.3 };
const sportSubtitleStyle = { fontSize: '11px', color: '#999', fontWeight: 500, marginTop: '2px', letterSpacing: '0.2px' };
const emptyStateStyle = { textAlign: 'center', padding: '60px 20px', color: '#bbb' };

const refreshButtonStyle = {
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#475569',
    fontSize: '11px',
    fontWeight: 600,
    padding: '6px 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
};
const refreshButtonStaleStyle = {
    ...refreshButtonStyle,
    background: '#fff7ed',
    borderColor: '#f97316',
    color: '#c2410c',
};

const periodTabBarStyle = {
    display: 'flex',
    gap: 8,
    padding: '12px 14px',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    position: 'sticky',
    top: 0,
    zIndex: 5,
    flexShrink: 0,
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
};
const periodTabStyle = {
    padding: '8px 18px',
    border: 'none',
    background: '#f1f5f9',
    color: '#475569',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    borderRadius: 999,
    letterSpacing: 0.3,
    transition: 'background-color 120ms ease, color 120ms ease, transform 120ms ease',
};
const periodTabActiveStyle = {
    ...periodTabStyle,
    background: '#0f172a',
    color: '#fff',
    boxShadow: '0 4px 12px -6px rgba(15,23,42,0.4)',
};

const dayHeaderStyle = {
    padding: '10px 16px',
    background: '#1f2937',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
};

const matchCardStyle = {
    background: '#fff',
    padding: '8px 12px 10px',
    borderBottom: '1px solid #e5e7eb',
};

const matchHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
};

const matchTimeStyle = { fontSize: '11px', color: '#6b7280', fontWeight: 600, letterSpacing: '0.2px' };

const baseBadgeStyle = {
    color: '#fff',
    padding: '2px 8px',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.5px',
};
const upcomingBadgeStyle = { ...baseBadgeStyle, background: '#78909c' };
const liveBadgeStyle = { ...baseBadgeStyle, background: '#2e7d32' };

const gridTemplateForMarketCount = (marketCount) => {
    const count = Math.max(1, Number(marketCount) || 1);
    return `minmax(0, 1fr) ${Array.from({ length: count }, () => '54px').join(' ')}`;
};

const columnHeaderBaseStyle = {
    display: 'grid',
    gap: '4px',
    padding: '8px 12px 6px',
    alignItems: 'center',
    background: '#fff',
    borderBottom: '1px solid #f1f5f9',
};
const columnHeaderStyleFor = (marketCount) => ({
    ...columnHeaderBaseStyle,
    gridTemplateColumns: gridTemplateForMarketCount(marketCount),
});
const columnLabelStyle = {
    fontSize: '11px',
    fontWeight: 600,
    color: '#999',
    textAlign: 'center',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
};

const teamRowBaseStyle = {
    display: 'grid',
    gap: '4px',
    alignItems: 'center',
    padding: '4px 0',
};
const teamRowStyleFor = (marketCount) => ({
    ...teamRowBaseStyle,
    gridTemplateColumns: gridTemplateForMarketCount(marketCount),
});

const teamCellStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
};

const avatarStyle = {
    width: '28px',
    height: '28px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.3px',
};

const avatarImageStyle = {
    width: '28px',
    height: '28px',
    flexShrink: 0,
    objectFit: 'contain',
    display: 'block',
};

const teamNameStyle = {
    flex: 1,
    minWidth: 0,
    fontSize: '11px',
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.2,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
    wordBreak: 'break-word',
};

const oddsCellStyle = {
    height: '40px',
    padding: '4px 6px',
    background: '#f5f5f5',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
    transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
    minWidth: 0,
};
const oddsCellDisabledStyle = {
    ...oddsCellStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
    background: '#f9fafb',
};
const oddsCellSelectedStyle = {
    ...oddsCellStyle,
    background: '#1a73e8',
    borderColor: '#1a73e8',
};
const oddsCellMainStyle = { fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' };
const oddsCellJuiceStyle = { fontSize: '11px', fontWeight: 500, color: '#666', whiteSpace: 'nowrap' };
const oddsCellMainSelectedStyle = { ...oddsCellMainStyle, color: '#fff' };
const oddsCellJuiceSelectedStyle = { ...oddsCellJuiceStyle, color: '#dbeafe' };

const blockedBannerStyle = {
    marginTop: 8,
    padding: '8px 10px',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#9a3412',
    fontSize: 11,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1.3,
};

const updatingBannerStyle = {
    padding: '6px 12px',
    background: '#eff6ff',
    borderBottom: '1px solid #dbeafe',
    color: '#1d4ed8',
    fontSize: '11px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
};

const degradedBannerStyle = {
    padding: '6px 12px',
    background: '#fffbeb',
    borderBottom: '1px solid #fbbf24',
    color: '#92400e',
    fontSize: '11px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
};

const skeletonCardStyle = {
    background: '#fff',
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
};
const skeletonRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
};
const skeletonBarStyle = {
    background: '#e5e7eb',
    animation: 'mcvShimmer 1.2s linear infinite',
};

if (typeof document !== 'undefined' && !document.getElementById('mcv-skeleton-keyframes')) {
    const el = document.createElement('style');
    el.id = 'mcv-skeleton-keyframes';
    el.textContent = '@keyframes mcvShimmer { 0% { opacity: 0.6 } 50% { opacity: 1 } 100% { opacity: 0.6 } }';
    document.head.appendChild(el);
}

export default MobileContentView;
