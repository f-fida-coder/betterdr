import React, { useState } from 'react';
import useMatches from '../hooks/useMatches';
import useSportOddsRefresh from '../hooks/useSportOddsRefresh';
import { syncLiveMatches, syncPrematchSport, getStoredAuthToken } from '../api';
import { useToast } from '../contexts/ToastContext';
import { createFallbackTeamLogoDataUri, fetchTeamBadgeUrl } from '../utils/teamLogos';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { getSportKeywords, findSportItemById } from '../data/sportsData';
import {
    formatOdds,
    formatSpreadDisplay,
    formatTotalDisplay,
    getMatchMarket,
    getMarketOutcomeByKeyword,
    getMarketOutcomeByName,
    parseOddsNumber,
} from '../utils/odds';
import PropBuilderModal from './PropBuilderModal';
import MatchDetailView from './MatchDetailView';
import OddsAge from './OddsAge';

// Module-level dedupe: when the user multi-selects sports, every mounted
// SportContentView instance fires its own sync. If two instances both try
// to toast about the same failed sportKey, the screen used to flood with
// duplicate "Couldn't fetch latest odds for X" lines. One toast per sport
// per cooldown window is enough.
const SYNC_TOAST_DEDUPE_MS = 30000;
const lastSyncToastAt = new Map();
const notifySyncFailure = (sportKey, showToast) => {
    if (!sportKey || typeof showToast !== 'function') return;
    const now = Date.now();
    const last = lastSyncToastAt.get(sportKey) || 0;
    if (now - last < SYNC_TOAST_DEDUPE_MS) return;
    lastSyncToastAt.set(sportKey, now);
    showToast(`Couldn't fetch latest odds for ${sportKey}`, { type: 'warning' });
};

const SportContentView = ({ sportId, selectedItems = [], filter = null, status = 'live-upcoming', activeBetMode = 'straight', limit = 0 }) => {
    const { oddsFormat } = useOddsFormat();
    const [activeTab] = useState('matches');
    const [teamLogos, setTeamLogos] = useState({});
    const [propsOpenMatch, setPropsOpenMatch] = useState(null);
    const [detailOpenMatch, setDetailOpenMatch] = useState(null);
    const attemptedLogoFetchesRef = React.useRef(new Set());

    const [content, setContent] = useState({ name: '', icon: '', matches: [] });
    const [isLoading, setIsLoading] = useState(true);
    const loadGenRef = React.useRef(0);
    // Tracks whether the current scope has had a fetch resolve yet. While
    // false, we keep the loading skeleton on screen even if rawMatches
    // happens to be empty — otherwise the user briefly sees "No matches"
    // when switching sports before the new fetch lands.
    const fetchSettledForScopeRef = React.useRef(false);
    const rawMatches = useMatches({ status, scopeKey: `${sportId || 'all'}:${filter || ''}:${limit || 0}`, limit });
    // Collect every distinct Odds API sportKey present in the visible
    // matches. Views can mix leagues under one heading (e.g. NBA + WNBA,
    // or several soccer leagues) — refreshing only the first match's
    // sportKey leaves the others stale, so the refresh button needs the
    // full set. Empty array if no matches — button stays disabled then.
    const visibleSportKeys = React.useMemo(() => {
        const keys = new Set();
        for (const m of (content.matches || [])) {
            const k = m?.rawMatch?.sportKey || m?.sportKey;
            if (typeof k === 'string' && k.trim() !== '') keys.add(k.trim().toLowerCase());
        }
        return [...keys];
    }, [content.matches]);
    const { showToast } = useToast();
    const { trigger: triggerRefresh, isRefreshing, cooldownRemainingSec } = useSportOddsRefresh(visibleSportKeys, { showToast });
    // 2-second cooldown so users can't spam-click the Refresh button. The
    // server already throttles per-IP, but locking the UI here is the
    // primary spam-protection — the network request never even fires.
    const [liveSyncSpinning, setLiveSyncSpinning] = React.useState(false);
    const liveSyncLastClickRef = React.useRef(0);

    const handleRefreshClick = React.useCallback(() => {
        // Live Now path: synchronous Rundown sync via POST /api/sync/live.
        // The endpoint returns fresh rows (or cached ones if throttled) in
        // a single round-trip. Once it resolves, fire matches:force-refetch
        // so useMatches re-reads from the now-fresh DB.
        if (status === 'live') {
            const sinceLast = Date.now() - liveSyncLastClickRef.current;
            if (liveSyncSpinning || sinceLast < 2000) return;
            liveSyncLastClickRef.current = Date.now();
            setLiveSyncSpinning(true);
            // Hard 3s timeout — if the backend hangs, surface cached rows
            // and stop the spinner; the user is never stuck.
            const ctrl = new AbortController();
            const timer = window.setTimeout(() => ctrl.abort(), 3000);
            syncLiveMatches({ signal: ctrl.signal })
                .then(({ throttled }) => {
                    window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                        detail: { reason: 'user-live-sync' },
                    }));
                    if (throttled) {
                        showToast?.('Refreshing too fast — showing latest cached odds', { type: 'info' });
                    }
                })
                .catch((err) => {
                    if (err?.name !== 'AbortError') {
                        showToast?.("Couldn't refresh, showing last known odds", { type: 'warning' });
                    }
                })
                .finally(() => {
                    window.clearTimeout(timer);
                    setLiveSyncSpinning(false);
                });
            return;
        }
        // Pre-match path keeps the existing per-sport refresh hook so we
        // don't regress the bulk /api/odds/refresh-multi behavior.
        triggerRefresh({
            onSuccess: () => {
                // DB already updated by /api/odds/refresh{,-multi}; force the
                // UI to re-read. matches:force-refetch bypasses the backend
                // sync-defer path that matches:refresh triggers.
                window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                    detail: { reason: 'user-odds-refresh', sportKeys: visibleSportKeys },
                }));
            },
        });
    }, [status, triggerRefresh, visibleSportKeys, liveSyncSpinning, showToast]);

    // Resolve OddsAPI sportKey(s) directly from sportId via sportsData,
    // BEFORE any matches arrive. This lets the sport-tab parallel sync
    // fire on first mount (when content.matches is still empty) instead
    // of waiting for matches to load — the previous version short-
    // circuited because visibleSportKeys was [] and never re-fired.
    const intendedSportKeys = React.useMemo(() => {
        if (!sportId) return [];
        const item = findSportItemById(sportId);
        if (item && Array.isArray(item.sportKeys)) {
            return item.sportKeys.map((k) => String(k).toLowerCase());
        }
        // Dynamic api-* entries (auto-injected from /api/matches/sports) are
        // not in sportsData, so derive the OddsAPI sport key from the id —
        // otherwise on-demand sync never fires for these and the user has
        // to wait for the next cron tick to see fresh odds.
        if (typeof sportId === 'string' && sportId.startsWith('api-')) {
            return [sportId.slice(4).replace(/-/g, '_').toLowerCase()];
        }
        return [];
    }, [sportId]);

    // Sport-tab click: fire POST /api/sync/prematch/{sportKey} in parallel
    // with the GET that useMatches kicks off. AbortController cancels in-
    // flight syncs when the user switches sports rapidly, so we never paint
    // stale data over fresh. Only runs for pre-match views — the live path
    // owns its own /api/sync/live trigger. Uses intendedSportKeys (from
    // sportsData) instead of visibleSportKeys (from rawMatches) so it
    // fires immediately on mount, not after the first GET resolves.
    // Ref to the latest cached rows so the sync-error toast can suppress
    // itself when we already have rows to show (Bug 3: don't nag the user
    // about a refresh failure when the page isn't actually empty).
    const rawMatchesRef = React.useRef(rawMatches);
    React.useEffect(() => { rawMatchesRef.current = rawMatches; }, [rawMatches]);

    React.useEffect(() => {
        if (status === 'live') return undefined;
        if (intendedSportKeys.length === 0) return undefined;
        // POST /api/sync/prematch requires auth (JWT or X-Tick-Secret).
        // Anonymous browsers have neither, so the POST 401s and we used to
        // toast "Couldn't fetch latest odds for …". Skip the call entirely —
        // the cron tick keeps DB rows fresh, and the GET /api/matches that
        // useMatches owns is public, so the page still renders correctly.
        if (!getStoredAuthToken()) return undefined;
        const ctrl = new AbortController();
        let cancelled = false;
        Promise.all(intendedSportKeys.map(async (sportKey) => {
            try {
                await syncPrematchSport(sportKey, { signal: ctrl.signal });
            } catch (err) {
                if (err?.name === 'AbortError') return;
                if (cancelled) return;
                // Suppress the toast when cached rows are already on screen —
                // the sync was best-effort, the user has data, no point
                // surfacing an error they can't act on.
                const haveCachedRows = Array.isArray(rawMatchesRef.current) && rawMatchesRef.current.length > 0;
                if (haveCachedRows) return;
                notifySyncFailure(sportKey, showToast);
            }
        })).then(() => {
            if (cancelled) return;
            // Force-refetch after all parallel syncs settle so the UI sees
            // the freshly-synced rows in one consistent paint.
            window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                detail: { reason: 'sport-tab-sync', sportKeys: intendedSportKeys },
            }));
        });
        return () => {
            cancelled = true;
            ctrl.abort();
        };
    }, [intendedSportKeys, status, showToast]);

    // Cold-load freshness guarantee. The first time this view paints with
    // matches, peek at the oldest visible lastOddsSyncAt. If anything is
    // older than ~90s, silently fire the refresh button so the user sees
    // current odds within a couple seconds of landing — no manual action
    // required. Only fires once per (sportId,filter) mount; subsequent
    // freshness is owned by the auto-poll in useMatches.
    const coldLoadRefreshFiredRef = React.useRef(false);
    React.useEffect(() => {
        coldLoadRefreshFiredRef.current = false;
    }, [sportId, filter]);
    React.useEffect(() => {
        if (coldLoadRefreshFiredRef.current) return;
        if (visibleSportKeys.length === 0) return;
        const matches = content.matches || [];
        if (matches.length === 0) return;
        let oldestAgeMs = 0;
        const now = Date.now();
        for (const m of matches) {
            const ts = m?.rawMatch?.lastOddsSyncAt || m?.rawMatch?.lastUpdated || m?.lastOddsSyncAt;
            const t = ts ? new Date(ts).getTime() : 0;
            if (!t || Number.isNaN(t)) continue;
            const age = now - t;
            if (age > oldestAgeMs) oldestAgeMs = age;
        }
        if (oldestAgeMs > 90000) {
            coldLoadRefreshFiredRef.current = true;
            // Fire and forget — refresh hook owns its own cooldown so this
            // is a no-op if a manual click just happened.
            triggerRefresh({
                onSuccess: () => {
                    window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                        detail: { reason: 'cold-load-auto-refresh', sportKeys: visibleSportKeys },
                    }));
                },
            });
        }
    }, [content.matches, visibleSportKeys, triggerRefresh]);
    const degradedSummary = React.useMemo(() => {
        const all = Array.isArray(rawMatches) ? rawMatches : [];
        const blocked = all.filter((m) => m?.isBettable === false);
        const staleBlocked = blocked.filter((m) => {
            const reason = String(m?.bettingBlockedReason || '').toLowerCase();
            return m?.oddsFeedStale === true || reason.includes('stale') || reason.includes('suspend');
        });
        return {
            blockedCount: blocked.length,
            staleBlockedCount: staleBlocked.length,
            sampleReason: String(staleBlocked[0]?.bettingBlockedReason || blocked[0]?.bettingBlockedReason || '').trim(),
        };
    }, [rawMatches]);

    // Clear stale content immediately when sportId/filter/status/limit
    // changes. The useMatches hook also clears its internal state on the
    // same trigger, so by the time processMatches runs it sees rawMatches=[]
    // — which combined with fetchSettledForScopeRef=false means the loading
    // skeleton stays on screen until the new fetch actually resolves.
    React.useEffect(() => {
        setContent({ name: '', icon: '', matches: [] });
        setIsLoading(true);
        fetchSettledForScopeRef.current = false;
    }, [sportId, filter, status, limit]);

    // Listen for the matches:refresh-completed event from useMatches; it
    // fires after every fetch (success or error). When it fires, mark the
    // current scope as settled so processMatches is allowed to drop the
    // loading skeleton even when filteredMatches is empty (legitimate
    // "no games available" case).
    React.useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handler = () => { fetchSettledForScopeRef.current = true; };
        window.addEventListener('matches:refresh-completed', handler);
        return () => window.removeEventListener('matches:refresh-completed', handler);
    }, []);

    React.useEffect(() => {
        // Determine sport name and icon — prefer the sportsData tree, fallback to hardcoded map
        const sportMapFallback = {
            nfl: { name: 'NFL', icon: 'fa-solid fa-football' },
            nba: { name: 'NBA', icon: 'fa-solid fa-basketball' },
            mlb: { name: 'MLB', icon: 'fa-solid fa-baseball' },
            nhl: { name: 'NHL', icon: 'fa-solid fa-hockey-puck' },
            epl: { name: 'EPL (Soccer)', icon: 'fa-solid fa-futbol' },
            boxing: { name: 'Boxing', icon: 'fa-solid fa-hand-fist' },
            mma: { name: 'MMA/UFC', icon: 'fa-solid fa-hand-fist' },
            ncaaf: { name: 'NCAA Football', icon: 'fa-solid fa-building-columns' },
            ncaab: { name: 'NCAA Basketball', icon: 'fa-solid fa-basketball' },
        };

        // Auto-injected sidebar entries (e.g. `api-icehockey-liiga`) are not
        // in the static sportsData tree, so findSportItemById misses them and
        // the header used to fall through to a generic "Sports" label —
        // making multi-selection look like duplicate sections. Synthesize a
        // readable label + icon from the slug (mirrors prettifySportKey /
        // iconForSportKey in DashboardSidebar).
        const ICON_BY_CATEGORY = {
            basketball: 'fa-solid fa-basketball',
            americanfootball: 'fa-solid fa-football',
            baseball: 'fa-solid fa-baseball-bat-ball',
            icehockey: 'fa-solid fa-hockey-puck',
            soccer: 'fa-solid fa-futbol',
            tennis: 'fa-solid fa-table-tennis-paddle-ball',
            golf: 'fa-solid fa-golf-ball-tee',
            mma: 'fa-solid fa-hand-fist',
            boxing: 'fa-solid fa-mitten',
            cricket: 'fa-solid fa-baseball',
            rugbyleague: 'fa-solid fa-football',
            rugbyunion: 'fa-solid fa-football',
            aussierules: 'fa-solid fa-football',
            motorsport: 'fa-solid fa-flag-checkered',
        };
        const synthesizeFromApiId = (id) => {
            if (!id || !id.startsWith('api-')) return null;
            const slug = id.slice(4);
            const label = slug
                .split('-')
                .filter(Boolean)
                .map((p) => (p === p.toUpperCase() ? p : p.charAt(0).toUpperCase() + p.slice(1)))
                .join(' ');
            const category = slug.split('-')[0];
            return { name: label, icon: ICON_BY_CATEGORY[category] || 'fa-solid fa-trophy' };
        };

        const resolveSportInfo = (id) => {
            const item = findSportItemById(id);
            if (item) return { name: item.label, icon: item.icon || 'fa-solid fa-trophy' };
            const synthesized = synthesizeFromApiId(id);
            if (synthesized) return synthesized;
            return sportMapFallback[id] || { name: 'Sports', icon: 'fa-solid fa-trophy' };
        };

        // Handle sub-categories via filter metadata from sportsData
        let resolvedSportId = sportId;
        let periodFilter = null;

        const effectiveFilter = filter || sportId;
        const filterItem = effectiveFilter ? findSportItemById(effectiveFilter) : null;

        if (filterItem?.filter === 'half') periodFilter = 'H1';
        else if (filterItem?.filter === 'quarter') periodFilter = 'Q1';
        else if (filterItem?.filter === 'period1') periodFilter = 'P1';

        // Legacy sub-category resolution
        if (effectiveFilter) {
            if (effectiveFilter.startsWith('nfl-') && !filterItem) {
                resolvedSportId = 'nfl';
                if (effectiveFilter.includes('1st-quarter')) periodFilter = 'Q1';
                if (effectiveFilter.includes('2nd-quarter')) periodFilter = 'Q2';
                if (effectiveFilter.includes('1st-half')) periodFilter = 'H1';
            } else if (effectiveFilter.startsWith('ncaa-') && effectiveFilter !== 'ncaa-basketball' && effectiveFilter !== 'ncaa-props-plus' && !filterItem) {
                resolvedSportId = 'ncaaf';
                if (effectiveFilter.includes('1st-quarter')) periodFilter = 'Q1';
                if (effectiveFilter.includes('2nd-quarter')) periodFilter = 'Q2';
                if (effectiveFilter.includes('1st-half')) periodFilter = 'H1';
            }
        }

        const sportInfo = resolveSportInfo(resolvedSportId);
        const gen = ++loadGenRef.current;
        setIsLoading(true);

        // Map rawMatches into view-friendly structure and filter by sportId where possible
            const processMatches = () => {
                // Guard against stale processing from rapid selection changes
                if (gen !== loadGenRef.current) return;
                const matchesData = (rawMatches || []);
                const keywords = getSportKeywords(resolvedSportId);

            let filteredMatches = matchesData.filter(m => {
                // Only hide matches that have no odds markets at all. Stale
                // or temporarily suspended lines still render with the
                // `match-card-closed` class and disabled bet buttons so the
                // sport page stays populated when a few sync cycles fail.
                const markets = m?.odds?.markets;
                if (!Array.isArray(markets) || markets.length === 0) return false;
                if (!resolvedSportId) return true;
                const sportValue = String(m?.sport || '').toLowerCase();
                const sportKeyValue = String(m?.sportKey || '').toLowerCase();
                if (!sportValue && !sportKeyValue) return false;
                const haystack = `${sportValue}|${sportKeyValue}`;
                return keywords.some(k => haystack.includes(k));
            });

            if (periodFilter) {
                filteredMatches = filteredMatches.filter((m) => {
                    const period = String(m?.score?.period || '').toUpperCase();
                    const eventStatus = String(m?.score?.event_status || '').toUpperCase();
                    if (!period && !eventStatus) return true;
                    if (periodFilter === 'Q1') return /\bQ1\b|1ST\s*QUARTER/.test(period) || eventStatus.includes('1ST_QUARTER');
                    if (periodFilter === 'Q2') return /\bQ2\b|2ND\s*QUARTER/.test(period) || eventStatus.includes('2ND_QUARTER');
                    if (periodFilter === 'H1') return period.includes('H1') || period.includes('1H') || eventStatus.includes('1ST_HALF');
                    return true;
                });
            }

            // Fallback removed: If filteredMatches is empty, show empty state instead of all matches.
            // if (resolvedSportId && filteredMatches.length === 0) {
            //     filteredMatches = matchesData;
            // }

            const extractOdds = (match, homeName, awayName) => {
                const h2h = getMatchMarket(match, 'h2h');
                const spreads = getMatchMarket(match, 'spreads');
                const totals = getMatchMarket(match, 'totals');

                const h2hHome = getMarketOutcomeByName(h2h, homeName);
                const h2hAway = getMarketOutcomeByName(h2h, awayName);
                const spreadHome = getMarketOutcomeByName(spreads, homeName);
                const spreadAway = getMarketOutcomeByName(spreads, awayName);
                const totalOver = getMarketOutcomeByKeyword(totals, 'over');
                const totalUnder = getMarketOutcomeByKeyword(totals, 'under');

                return {
                    spread: {
                        homePoint: spreadHome?.point ?? null,
                        homeOdds: parseOddsNumber(spreadHome?.price),
                        awayPoint: spreadAway?.point ?? null,
                        awayOdds: parseOddsNumber(spreadAway?.price),
                    },
                    moneyline: {
                        homeOdds: parseOddsNumber(h2hHome?.price),
                        awayOdds: parseOddsNumber(h2hAway?.price),
                    },
                    total: {
                        point: totalOver?.point ?? totalUnder?.point ?? null,
                        overOdds: parseOddsNumber(totalOver?.price),
                        underOdds: parseOddsNumber(totalUnder?.price),
                    },
                };
            };

            filteredMatches = filteredMatches.map(match => {
                const homeName = match.homeTeam || match.home_team || '';
                const awayName = match.awayTeam || match.away_team || '';

                // Determine score to show based on period filter
                let displayScore1 = match.score?.score_home ?? 0;
                let displayScore2 = match.score?.score_away ?? 0;

                return {
                    id: match.id || match.externalId,
                    time: match.startTime ? new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    date: match.startTime ? new Date(match.startTime).toLocaleDateString() : '',
                    team1: { name: awayName, abbr: awayName.substring(0, 3).toUpperCase() },
                    team2: { name: homeName, abbr: homeName.substring(0, 3).toUpperCase() },
                    score1: displayScore1,
                    score2: displayScore2,
                    period: match.score?.period, // e.g. 'Q1', '2nd Half'
                    status: (match.status === 'live' || (match.score && (String(match.score.event_status || '').toUpperCase().includes('IN_PROGRESS') || String(match.score.event_status || '').toUpperCase().includes('LIVE')))) ? 'LIVE' : 'SCHEDULED',
                    odds: extractOdds(match, homeName, awayName),
                    rawMatch: match // Keep raw for betting
                };
            });

                setContent({
                    ...sportInfo,
                    matches: filteredMatches,
                });
                // Keep the loading skeleton on screen until the FIRST fetch
                // for this scope has resolved. Without this gate, a clicked
                // sport flashes "No matches available" between the scope
                // switch and the fetch completing — even though the data
                // is on its way and arrives ~200ms later.
                if (filteredMatches.length > 0 || fetchSettledForScopeRef.current) {
                    setIsLoading(false);
                }
            };

        processMatches();

    }, [sportId, filter, rawMatches]);

    React.useEffect(() => {
        const names = Array.from(new Set(
            (content.matches || [])
                .flatMap((match) => [match.team1?.name, match.team2?.name])
                .filter(Boolean)
        ));

        names.forEach((teamName) => {
            if (!teamName || attemptedLogoFetchesRef.current.has(teamName)) return;
            attemptedLogoFetchesRef.current.add(teamName);
            fetchTeamBadgeUrl(teamName).then((logoUrl) => {
                setTeamLogos((prev) => ({
                    ...prev,
                    [teamName]: logoUrl || ''
                }));
            });
        });
    }, [content.matches]);

    const handleAddToSlip = (matchId, selection, marketType, odds, matchName, marketLabel) => {
        const parsedOdds = parseOddsNumber(odds);
        if (!matchId || !selection || parsedOdds === null) return;
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId,
                selection,
                marketType,
                odds: parsedOdds,
                matchName,
                marketLabel
            }
        }));
    };

    const normalizedMode = String(activeBetMode || 'straight').toLowerCase().replace(/-/g, '_');
    const showSpread = ['straight', 'parlay', 'teaser', 'if_bet', 'reverse'].includes(normalizedMode);
    const showMoneyline = ['straight', 'parlay', 'if_bet', 'reverse'].includes(normalizedMode);
    const showTotals = ['straight', 'parlay', 'teaser', 'if_bet', 'reverse'].includes(normalizedMode);

    const hasValidOdds = (value) => parseOddsNumber(value) !== null;

    const renderOddsButton = ({ label, onClick, available, disabled, reason = '' }) => {
        if (!available) {
            return <div className="odds-unavailable">Unavailable</div>;
        }
        return (
            <button
                className="odds-value-btn"
                onClick={onClick}
                disabled={disabled}
                title={disabled ? reason : ''}
            >
                {label}
            </button>
        );
    };


    // Hide a generic "Sports" section entirely when:
    //   1. the user has specific sports selected (so per-sport sections own
    //      the page), AND
    //   2. this section has nothing to show.
    // Without this guard the page rendered a redundant empty "Sports - Live
    // & Upcoming" panel above the real per-sport sections, looking like a
    // duplicate render bug.
    const isGenericFallbackSection = !sportId && (selectedItems?.length || 0) > 0;
    if (isGenericFallbackSection && !isLoading && content.matches.length === 0) {
        return null;
    }

    return (
        <div className="sport-content-view">
            <div className="content-header">
                <div className="content-title">
                    <i className={content.icon}></i>
                    <span>{content.name} - Live & Upcoming</span>
                </div>
                <button
                    type="button"
                    className="sport-refresh-btn"
                    onClick={handleRefreshClick}
                    disabled={(status === 'live')
                        ? liveSyncSpinning
                        : (visibleSportKeys.length === 0 || isRefreshing || cooldownRemainingSec > 0)}
                    aria-label="Refresh odds for this sport"
                    title={status === 'live'
                        ? (liveSyncSpinning ? 'Syncing live odds…' : 'Refresh live odds')
                        : (visibleSportKeys.length === 0 ? 'No matches to refresh' : cooldownRemainingSec > 0 ? `Wait ${cooldownRemainingSec}s` : 'Refresh odds')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginLeft: 12,
                        padding: '6px 12px',
                        minHeight: 36,
                        borderRadius: 6,
                        border: '1px solid #d0d7de',
                        background: cooldownRemainingSec > 0 ? '#f0f0f0' : '#fff',
                        color: visibleSportKeys.length === 0 || cooldownRemainingSec > 0 ? '#888' : '#333',
                        cursor: visibleSportKeys.length === 0 || isRefreshing || cooldownRemainingSec > 0 ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                    }}
                >
                    <i className={`fa-solid fa-arrows-rotate ${(isRefreshing || liveSyncSpinning) ? 'fa-spin' : ''}`} />
                    <span>{(isRefreshing || liveSyncSpinning) ? 'Updating…' : cooldownRemainingSec > 0 ? `Wait ${cooldownRemainingSec}s` : 'Refresh'}</span>
                </button>
                <div className="content-tabs">
                    <button className="tab-btn active">Matches</button>
                    <button className="tab-btn" disabled>Scoreboards</button>
                </div>
            </div>

            {activeTab === 'matches' && (
                <div className="matches-section">
                    {isLoading ? (
                        <div className="sport-content-loader">
                            <div className="sport-loader-shimmer"></div>
                            <div className="sport-loader-shimmer short"></div>
                            <div className="sport-loader-shimmer"></div>
                        </div>
                    ) : content.matches.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: '8px' }}>
                            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                            <h3>No matches scheduled</h3>
                            <p>
                                {content.name && content.name !== 'Sports'
                                    ? `No live or upcoming ${content.name} matches right now.`
                                    : 'No live or upcoming matches right now.'}
                            </p>
                            <p style={{ fontSize: '0.9em' }}>Check back when games are scheduled.</p>
                        </div>
                    ) : (
                        content.matches.map((match) => (
                            <div key={match.id} className={`match-card ${match.rawMatch?.isBettable === false ? 'match-card-closed' : ''}`}>
                                <div className="match-header">
                                    <div className="match-time">
                                        <span className="time">{match.time}</span>
                                        <span className="date">{match.date}</span>
                                        <OddsAge timestamp={match.rawMatch?.lastOddsSyncAt || match.rawMatch?.lastUpdated} live={(match.status || '').toString().toUpperCase() === 'LIVE' || (match.rawMatch?.status || '').toString().toLowerCase() === 'live'} style={{ marginLeft: 8 }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <button
                                            type="button"
                                            className="main-bets-btn"
                                            onClick={() => setDetailOpenMatch({
                                                id: match.id,
                                                externalId: match.rawMatch?.externalId,
                                                homeTeam: match.team2.name,
                                                awayTeam: match.team1.name,
                                                odds: match.rawMatch?.odds,
                                            })}
                                            disabled={match.rawMatch?.isBettable === false}
                                            style={{
                                                background: '#d0451b',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 6,
                                                padding: '4px 10px',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                lineHeight: 1,
                                                cursor: match.rawMatch?.isBettable === false ? 'not-allowed' : 'pointer',
                                                opacity: match.rawMatch?.isBettable === false ? 0.5 : 1,
                                            }}
                                            aria-label="Open all markets"
                                        >
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            className="prop-builder-btn"
                                            onClick={() => setPropsOpenMatch({
                                                id: match.id,
                                                externalId: match.rawMatch?.externalId,
                                                homeTeam: match.team2.name,
                                                awayTeam: match.team1.name,
                                                odds: match.rawMatch?.odds,
                                            })}
                                            disabled={match.rawMatch?.isBettable === false}
                                            style={{
                                                background: 'linear-gradient(135deg, #a020f0, #d946ef)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 6,
                                                padding: '4px 10px',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                letterSpacing: 0.4,
                                                cursor: match.rawMatch?.isBettable === false ? 'not-allowed' : 'pointer',
                                                opacity: match.rawMatch?.isBettable === false ? 0.5 : 1,
                                            }}
                                            aria-label="Open prop builder"
                                        >
                                            P+
                                        </button>
                                        <span className={`match-status ${match.status === 'LIVE' ? 'live' : ''}`}>{match.status}</span>
                                    </div>
                                </div>

                                <div className="match-body">
                                    <div className="team-box">
                                        <span className="team-logo-badge">
                                            <img
                                                className="team-logo-image"
                                                src={teamLogos[match.team1.name] || createFallbackTeamLogoDataUri(match.team1.name)}
                                                alt={`${match.team1.name} logo`}
                                                loading="lazy"
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = createFallbackTeamLogoDataUri(match.team1.name);
                                                }}
                                            />
                                        </span>
                                        <div className="team-info">
                                            <span className="team-name">{match.team1.name}</span>
                                            <span className="team-abbr">{match.team1.abbr}</span>
                                        </div>
                                        <span className="score">{match.score1}</span>
                                    </div>

                                    <div className="vs-separator">vs</div>

                                    <div className="team-box">
                                        <span className="team-logo-badge">
                                            <img
                                                className="team-logo-image"
                                                src={teamLogos[match.team2.name] || createFallbackTeamLogoDataUri(match.team2.name)}
                                                alt={`${match.team2.name} logo`}
                                                loading="lazy"
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = createFallbackTeamLogoDataUri(match.team2.name);
                                                }}
                                            />
                                        </span>
                                        <div className="team-info">
                                            <span className="team-name">{match.team2.name}</span>
                                            <span className="team-abbr">{match.team2.abbr}</span>
                                        </div>
                                        <span className="score">{match.score2}</span>
                                    </div>
                                </div>

                                {match.odds && (
                                    <div className="match-odds">
                                        <div className="odds-row">
                                            {showSpread && (
                                                <div className="odds-cell">
                                                    <span className="odds-label">Spread</span>
                                                    <div className="odds-values-group">
                                                        {renderOddsButton({
                                                            label: formatSpreadDisplay(match.odds.spread.awayPoint, match.odds.spread.awayOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team1.name, 'spreads', match.odds.spread.awayOdds, `${match.team1.name} vs ${match.team2.name}`, 'Spread'),
                                                            available: match.odds.spread.awayPoint !== null && hasValidOdds(match.odds.spread.awayOdds),
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                        {renderOddsButton({
                                                            label: formatSpreadDisplay(match.odds.spread.homePoint, match.odds.spread.homeOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team2.name, 'spreads', match.odds.spread.homeOdds, `${match.team1.name} vs ${match.team2.name}`, 'Spread'),
                                                            available: match.odds.spread.homePoint !== null && hasValidOdds(match.odds.spread.homeOdds),
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {showMoneyline && (
                                                <div className="odds-cell">
                                                    <span className="odds-label">Moneyline</span>
                                                    <div className="odds-values-group">
                                                        {renderOddsButton({
                                                            label: formatOdds(match.odds.moneyline.awayOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team1.name, 'h2h', match.odds.moneyline.awayOdds, `${match.team1.name} vs ${match.team2.name}`, 'Moneyline'),
                                                            available: hasValidOdds(match.odds.moneyline.awayOdds),
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                        {renderOddsButton({
                                                            label: formatOdds(match.odds.moneyline.homeOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team2.name, 'h2h', match.odds.moneyline.homeOdds, `${match.team1.name} vs ${match.team2.name}`, 'Moneyline'),
                                                            available: hasValidOdds(match.odds.moneyline.homeOdds),
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {showTotals && (
                                                <div className="odds-cell">
                                                    <span className="odds-label">Total</span>
                                                    <div className="odds-values-group">
                                                        {renderOddsButton({
                                                            label: formatTotalDisplay('O', match.odds.total.point, match.odds.total.overOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, 'Over', 'totals', match.odds.total.overOdds, `${match.team1.name} vs ${match.team2.name}`, 'Total'),
                                                            available: match.odds.total.point !== null && hasValidOdds(match.odds.total.overOdds),
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                        {renderOddsButton({
                                                            label: formatTotalDisplay('U', match.odds.total.point, match.odds.total.underOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, 'Under', 'totals', match.odds.total.underOdds, `${match.team1.name} vs ${match.team2.name}`, 'Total'),
                                                            available: match.odds.total.point !== null && hasValidOdds(match.odds.total.underOdds),
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="match-footer" style={{ justifyContent: 'center', padding: '10px' }}>
                                    <span style={{ fontSize: '0.8em', color: '#888' }}>
                                        {match.rawMatch?.isBettable === false
                                            ? (match.rawMatch?.bettingBlockedReason || 'Betting is temporarily unavailable for this event.')
                                            : 'Click any odds to place your bet'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {propsOpenMatch && (
                <PropBuilderModal match={propsOpenMatch} onClose={() => setPropsOpenMatch(null)} />
            )}
            {detailOpenMatch && (
                <MatchDetailView match={detailOpenMatch} onClose={() => setDetailOpenMatch(null)} />
            )}
        </div>
    );
};

export default React.memo(SportContentView);
