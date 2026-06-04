import React, { useEffect, useState } from 'react';
import useMatches from '../hooks/useMatches';
import useSportOddsRefresh from '../hooks/useSportOddsRefresh';
import { syncLiveMatches, syncPrematchSport, getStoredAuthToken } from '../api';
import { useToast } from '../contexts/ToastContext';
import { createFallbackTeamLogoDataUri, fetchTeamBadgeUrl } from '../utils/teamLogos';
import { teaserSportGroup } from '../utils/teaserAdjustment';
import { resolveBroadcast } from '../utils/broadcast';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import { getSiteTimezone, getSiteTimezoneLabel } from '../utils/timezone';
import { getSportKeywords, findSportItemById, matchesSportKeyword } from '../data/sportsData';
import {
    formatOdds,
    formatSpreadDisplay,
    formatTotalDisplay,
    getMatchMarket,
    getMarketOutcomeByKeyword,
    getMarketOutcomeByName,
    parseOddsNumber,
} from '../utils/odds';
import {
    FULL_PERIOD,
    getPeriodsForSport,
    scanMarketsForSuffixes,
} from '../utils/periods';
import PropBuilderModal from './PropBuilderModal';
import MatchDetailView from './MatchDetailView';
import OddsAge from './OddsAge';

// Faded grey, slightly smaller than the team name — same treatment used
// across every odds board card so the record always reads as supplemental
// metadata rather than competing with the team identifier.
const teamRecordStyle = {
    color: '#9ca3af',
    fontWeight: 500,
    fontSize: '0.85em',
    marginLeft: 4,
};

// Format the start time in the site timezone (default ET, override via
// Account → Preferences) so the broadcast row matches the same wall-clock
// the player set their schedule against. Falls back to ET when no
// override is stored.
const formatBroadcastTimeET = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const tz = getSiteTimezone();
    const formatted = date.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
    return `${formatted} ${getSiteTimezoneLabel(tz)}`;
};

// Module-level dedupe: when the user multi-selects sports, every mounted
// SportContentView instance fires its own sync. If two instances both try
// to toast about the same failed sportKey, the screen used to flood with
// duplicate "Couldn't fetch latest odds for X" lines. One toast per sport
// per cooldown window is enough.
const SYNC_TOAST_DEDUPE_MS = 30000;
const lastSyncToastAt = new Map();

// NOTE: previously a `lastSyncCompletedAt` map skipped sync POSTs within
// 60 s of the last success. That was a client-side cache and produced
// `trigger=sport-tab-sync-cached` requests in the network tab. Removed
// because live betting cannot serve stale odds — every sport-tab click
// now hits the upstream sync. Per-IP throttle on the backend
// (USER_PREMATCH_SYNC_MIN_INTERVAL_SECONDS=30) still prevents quota burn.
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
    // Period chip strip state — Game / 1H / 2H / 1Q / 2Q / 3Q / 4Q etc.
    // Matches the mobile pattern: which markets actually exist in the
    // current rawMatches set drives which chips render; FULL_PERIOD
    // always renders so the user never loses the Full Game tab.
    const [selectedPeriodId, setSelectedPeriodId] = useState('full');
    const loadGenRef = React.useRef(0);

    // Bump on Account → Preferences → Timezone change so every visible
    // match-time/date label re-renders with the new zone without a page
    // reload. The render of `time`/`date` is derived from getSiteTimezone()
    // inside processMatches, but processMatches doesn't otherwise depend
    // on the stored zone, so we need this trigger.
    const [tzTick, setTzTick] = useState(0);
    useEffect(() => {
        const handler = () => setTzTick((n) => n + 1);
        window.addEventListener('siteTimezone:change', handler);
        return () => window.removeEventListener('siteTimezone:change', handler);
    }, []);
    // Tracks whether the current scope has had a fetch resolve yet. While
    // false, we keep the loading skeleton on screen even if rawMatches
    // happens to be empty — otherwise the user briefly sees "No matches"
    // when switching sports before the new fetch lands.
    const fetchSettledForScopeRef = React.useRef(false);
    const rawMatches = useMatches({ status, scopeKey: `${sportId || 'all'}:${filter || ''}:${limit || 0}`, limit });
    // Collect every distinct sportKey present in the visible
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

    // Period chip strip: scan rawMatches for which period suffixes the
    // backend has actually synced (e.g. `_q1`, `_h1`). Always include the
    // empty suffix so the Game chip never disappears. Only chips whose
    // suffix is present render — so a sport without quarter sync doesn't
    // show a dead Q1 chip.
    const availableSuffixes = React.useMemo(() => {
        const set = new Set(['']);
        (rawMatches || []).forEach((match) => {
            scanMarketsForSuffixes(match?.odds?.markets, set);
            scanMarketsForSuffixes(match?.odds?.extendedMarkets, set);
        });
        return set;
    }, [rawMatches]);

    const periods = React.useMemo(() => {
        const preset = getPeriodsForSport(sportId);
        return preset.filter((p) => p.id === 'full' || availableSuffixes.has(p.suffix));
    }, [sportId, availableSuffixes]);

    // Snap back to FULL whenever the active period vanishes from the
    // available set (e.g. sport change drops a chip we were on).
    React.useEffect(() => {
        if (selectedPeriodId === 'full') return;
        if (!periods.some((p) => p.id === selectedPeriodId)) {
            setSelectedPeriodId('full');
        }
    }, [selectedPeriodId, periods]);

    const activePeriod = periods.find((p) => p.id === selectedPeriodId) || FULL_PERIOD;
    const { showToast } = useToast();
    const { trigger: triggerRefresh, isRefreshing, cooldownRemainingSec } = useSportOddsRefresh(visibleSportKeys, { showToast });
    // 2-second cooldown so users can't spam-click the Refresh button. The
    // server already throttles per-IP, but locking the UI here is the
    // primary spam-protection — the network request never even fires.
    const [liveSyncSpinning, setLiveSyncSpinning] = React.useState(false);
    const liveSyncLastClickRef = React.useRef(0);

    const handleRefreshClick = React.useCallback(() => {
        // Live Now path: synchronous live odds sync via POST
        // /api/sync/live. The endpoint returns fresh rows (or cached ones
        // if throttled) in a single round-trip. Once it resolves, fire
        // matches:force-refetch so useMatches re-reads from the now-fresh
        // DB. Target: <20s sync for live odds update.
        // After error (timeout/rate-limit), use cached odds and don't block UI.
        if (status === 'live') {
            const sinceLast = Date.now() - liveSyncLastClickRef.current;
            if (liveSyncSpinning || sinceLast < 60000) return;
            liveSyncLastClickRef.current = Date.now();
            setLiveSyncSpinning(true);
            // 20s timeout (up from 3s) to allow live sync to complete.
            // If the backend takes longer, surface cached rows anyway;
            // the user is never stuck waiting.
            const ctrl = new AbortController();
            const timer = window.setTimeout(() => ctrl.abort(), 20000);
            syncLiveMatches({ signal: ctrl.signal, timeout: 20000 })
                .then(({ throttled }) => {
                    window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                        detail: { reason: 'user-live-sync' },
                    }));
                    if (throttled) {
                        showToast?.('Refreshing too fast — showing latest cached odds', { type: 'info' });
                    } else {
                        showToast?.('Live odds updated', { type: 'success' });
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

    // Resolve sportKey(s) directly from sportId via sportsData,
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
        // not in sportsData, so derive the sport key from the id —
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

    // LIVE NOW open: fire a synchronous live odds sync so the first
    // paint shows the freshest possible odds instead of waiting up to 30s
    // for AUTO_POLL or for the worker's next live tick. Backend has a 15s
    // per-IP throttle on /api/sync/live, so re-mounting cheaply skips the
    // upstream call when it would be redundant. Anonymous browsers go
    // through a different auth path (X-Tick-Secret only) — here we require
    // a stored auth token before firing so logged-out visitors still get
    // the cached rows from GET /api/matches without a 401 toast.
    //
    // The sync ALSO recurs every 60s while Live Now stays open. Backend's
    // 90s live-freshness gate hides rows whose `lastOddsSyncAt` is older
    // than 90s — if the worker stalls between ticks, /api/matches?status=live
    // returns [] and the board flashes empty. Re-poking /api/sync/live
    // every 60s keeps `lastOddsSyncAt` inside the window so rows never
    // age out from under the player. Pauses while tab is hidden.
    React.useEffect(() => {
        if (status !== 'live') return undefined;
        if (!getStoredAuthToken()) return undefined;
        let cancelled = false;
        let activeController = null;
        const runSync = (reason) => {
            if (cancelled) return;
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            if (activeController) activeController.abort();
            const ctrl = new AbortController();
            activeController = ctrl;
            syncLiveMatches({ signal: ctrl.signal })
                .then(() => {
                    if (cancelled) return;
                    window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                        detail: { reason },
                    }));
                })
                .catch(() => { /* throttled / aborted — auto-poll will catch up */ });
        };
        const initialTimer = window.setTimeout(() => runSync('live-mount-sync'), 200);
        const intervalId = window.setInterval(() => runSync('live-periodic-sync'), 60000);
        return () => {
            cancelled = true;
            window.clearTimeout(initialTimer);
            window.clearInterval(intervalId);
            if (activeController) activeController.abort();
        };
    }, [status]);

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

        // Debounce: wait 300ms before firing — rapid sport-tab clicks
        // (NBA → Soccer → NBA) abort the timer and never hit the network.
        // This is request-economy, not data caching: it just collapses
        // mid-flight key changes into one POST per final selection.
        const timer = window.setTimeout(() => {
            if (cancelled) return;
            Promise.all(intendedSportKeys.map(async (sportKey) => {
                try {
                    await syncPrematchSport(sportKey, { signal: ctrl.signal });
                } catch (err) {
                    if (err?.name === 'AbortError') return;
                    if (cancelled) return;
                    // Suppress the toast when cached rows are already on
                    // screen — sync was best-effort, user has data.
                    const haveCachedRows = Array.isArray(rawMatchesRef.current) && rawMatchesRef.current.length > 0;
                    if (haveCachedRows) return;
                    notifySyncFailure(sportKey, showToast);
                }
            })).then(() => {
                if (cancelled) return;
                // Force-refetch after all parallel syncs settle so the UI
                // sees the freshly-synced rows in one consistent paint.
                window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                    detail: { reason: 'sport-tab-sync', sportKeys: intendedSportKeys },
                }));
            });
        }, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            ctrl.abort();
        };
    }, [intendedSportKeys, status, showToast]);

    // Prefetch odds for this sport ahead of user clicks, so sport selection
    // is instant (render from cache + background refresh in parallel).
    // Fires when the view first mounts and on visibility changes.
    React.useEffect(() => {
        if (intendedSportKeys.length === 0) return undefined;
        if (typeof document === 'undefined') return undefined;
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') return;
            // Tab became visible — prefetch odds so sport click is instant
            // Fire and forget: prefetch is best-effort, errors don't block rendering
            Promise.all(intendedSportKeys.map(async (sportKey) => {
                try {
                    // Trigger a background fetch for this sport's matches
                    window.dispatchEvent(new CustomEvent('matches:prefetch', {
                        detail: { sportKeys: [sportKey] },
                    }));
                } catch (err) {
                    // Silently ignore: prefetch failures don't affect UX
                }
            })).catch(() => {});
        };

        // Fire once on mount
        handleVisibilityChange();

        // Re-fire when tab becomes visible
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [intendedSportKeys]);

    // Listen for prefetch events and cache the results so sport clicks
    // render from cache instantly.
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

            // Teaser is football/basketball only — drop every other
            // sport when on the Teaser tab so the board only shows
            // games the product supports. Matches the same gate in
            // MobileContentView and avoids the dead-end click where
            // the user adds an MLB leg and the slip rejects it.
            const isTeaserMode = String(activeBetMode || '').toLowerCase() === 'teaser';
            const isStrictLiveBoard = String(status || '').toLowerCase() === 'live';
            let filteredMatches = matchesData.filter(m => {
                // Match must have at least one usable market to render. A row
                // with no markets has nothing to bet on, so drop it everywhere
                // — keeping shells around just to look populated produces
                // cards full of dashes. The 60s grace window in useMatches
                // keeps rawMatches stable through worker hiccups, so true
                // "no markets" now means upstream really pulled the lines.
                const markets = m?.odds?.markets;
                const ext = m?.odds?.extendedMarkets;
                const books = m?.odds?.bookmakers;
                const bookHasMarkets = Array.isArray(books) && books.some((b) => Array.isArray(b?.markets) && b.markets.length > 0);
                const hasMarkets = (Array.isArray(markets) && markets.length > 0)
                    || (Array.isArray(ext) && ext.length > 0)
                    || bookHasMarkets;
                if (!hasMarkets) return false;
                if (isTeaserMode) {
                    const group = teaserSportGroup(m?.sportKey || m?.sport);
                    if (!group) return false;
                    // Drop live legs on pregame boards only. Strict `live`
                    // status (Live Now / in-play hub) must still list games
                    // even when Teaser is selected — otherwise the hub reads
                    // empty while teaser add is already blocked in App.jsx.
                    if (!isStrictLiveBoard) {
                        const liveStatus = String(m?.status || '').toLowerCase() === 'live';
                        const eventStatus = String(m?.score?.event_status || '').toUpperCase();
                        const liveByEvent = eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE');
                        if (liveStatus || liveByEvent) return false;
                    }
                }
                if (!resolvedSportId) return true;
                const sportValue = String(m?.sport || '').toLowerCase();
                const sportKeyValue = String(m?.sportKey || '').toLowerCase();
                if (!sportValue && !sportKeyValue) return false;
                const haystack = `${sportValue}|${sportKeyValue}`;
                // Token-boundary match: avoids 'nba' substring-matching
                // 'wnba' / 'basketball_wnba' and leaking WNBA into the NBA
                // filter. See matchesSportKeyword in sportsData.js.
                return keywords.some(k => matchesSportKeyword(haystack, k));
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
                // Period-aware market lookup: suffix is '' for Full Game,
                // '_q1' for 1Q, '_h1' for 1H, etc. extendedMarkets contains
                // the suffixed entries; the base markets[] array holds the
                // full-game equivalents. getMatchMarkets() folds them
                // together, so a single getMatchMarket(`h2h_q1`) reads the
                // right one regardless of where it lives.
                const suffix = activePeriod.suffix || '';
                const h2h = getMatchMarket(match, `h2h${suffix}`);
                const spreads = getMatchMarket(match, `spreads${suffix}`);
                const totals = getMatchMarket(match, `totals${suffix}`);

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

                // Convention in this component: team1 = away (rendered left), team2 = home (rendered right).
                // Score variables MUST follow the same pairing — odds handlers below depend on this.
                let awayScore = match.score?.score_away ?? 0;
                let homeScore = match.score?.score_home ?? 0;

                const siteTz = getSiteTimezone();
                const siteTzLabel = getSiteTimezoneLabel(siteTz);
                return {
                    id: match.id || match.externalId,
                    // Render in the site timezone (Account → Preferences →
                    // Timezone) instead of the browser's local zone. Without
                    // the timeZone option toLocaleTimeString falls back to
                    // navigator locale, which produces "10:00 AM GMT+5" for
                    // a player in Pakistan even when the account is set to ET.
                    time: match.startTime
                        ? `${new Date(match.startTime).toLocaleTimeString('en-US', { timeZone: siteTz, hour: '2-digit', minute: '2-digit', hour12: true })} ${siteTzLabel}`
                        : '',
                    date: match.startTime
                        ? new Date(match.startTime).toLocaleDateString('en-US', { timeZone: siteTz, month: 'numeric', day: 'numeric', year: 'numeric' })
                        : '',
                    // Broadcast row above the match-header. Resolved client-side
                    // so we can keep the chip palette in one place; raw string
                    // comes from ESPN's scoreboard side-channel via the
                    // matches projection.
                    broadcast: resolveBroadcast(match.broadcast),
                    eventName: typeof match.eventName === 'string' ? match.eventName.trim() : '',
                    broadcastTime: formatBroadcastTimeET(match.startTime),
                    // shortName + record are populated server-side by
                    // TeamNormalizer (ESPN scoreboard for records, both
                    // feeds for short names). They fall back to the full
                    // name / empty record when the row predates the layer.
                    sportKey: match.sportKey || '',
                    sport: match.sport || match.sportTitle || '',
                    team1: {
                        name: awayName,
                        shortName: match.awayTeamShort || awayName,
                        record: match.awayTeamRecord || '',
                        abbr: match.awayTeamShort || awayName.substring(0, 3).toUpperCase(),
                    },
                    team2: {
                        name: homeName,
                        shortName: match.homeTeamShort || homeName,
                        record: match.homeTeamRecord || '',
                        abbr: match.homeTeamShort || homeName.substring(0, 3).toUpperCase(),
                    },
                    score1: awayScore,
                    score2: homeScore,
                    period: match.score?.period, // e.g. 'Q1', '2nd Half'
                    // LIVE badge is the truth-test the user reads at a
                    // glance. It must reflect BOTH "this row is in-progress"
                    // AND "the odds you're seeing are fresh enough to bet
                    // on". When the backend has flagged the row as
                    // not-bettable (isBettable=false from a stale odds
                    // sweep, manual suspension, or sport-wide circuit
                    // breaker), we render SUSPENDED so the player isn't
                    // looking at a misleading green LIVE chip while the
                    // bet buttons are disabled. SCHEDULED stays the
                    // default for pre-kickoff rows.
                    status: (() => {
                        const liveByBackend = match.status === 'live';
                        const eventStatus = String(match.score?.event_status || '').toUpperCase();
                        const liveByEvent = eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE');
                        if (!liveByBackend && !liveByEvent) return 'SCHEDULED';
                        return match.isBettable === false ? 'SUSPENDED' : 'LIVE';
                    })(),
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

    // activePeriod.suffix included so flipping the chip recomputes odds.
    // tzTick included so the next Account → Preferences → Timezone change
    // re-runs processMatches and refreshes every visible `time`/`date` label.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sportId, filter, rawMatches, activePeriod.suffix, tzTick]);

    React.useEffect(() => {
        const teams = [];
        (content.matches || []).forEach((match) => {
            if (match.team1?.name) teams.push({ name: match.team1.name, sportKey: match.sportKey, sport: match.sport, abbr: match.team1.abbr });
            if (match.team2?.name) teams.push({ name: match.team2.name, sportKey: match.sportKey, sport: match.sport, abbr: match.team2.abbr });
        });

        teams.forEach(({ name: teamName, sportKey, sport, abbr }) => {
            if (!teamName || attemptedLogoFetchesRef.current.has(teamName)) return;
            attemptedLogoFetchesRef.current.add(teamName);
            const ctx = { sportKey, sport, abbr };
            fetchTeamBadgeUrl(teamName, ctx).then((logoUrl) => {
                setTeamLogos((prev) => ({
                    ...prev,
                    [teamName]: logoUrl || ''
                }));
            });
        });
    }, [content.matches]);

    const handleAddToSlip = (matchId, selection, marketType, odds, matchName, marketLabel, line = null, meta = {}) => {
        const parsedOdds = parseOddsNumber(odds);
        if (!matchId || !selection || parsedOdds === null) return;
        const parsedLine = Number(line);
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId,
                selection,
                marketType,
                odds: parsedOdds,
                matchName,
                marketLabel,
                line: Number.isFinite(parsedLine) ? parsedLine : null,
                isLive: !!meta?.isLive,
            }
        }));
    };

    const normalizedMode = String(activeBetMode || 'straight').toLowerCase().replace(/-/g, '_');
    const showSpread = ['straight', 'parlay', 'teaser', 'if_bet', 'reverse', 'round_robin'].includes(normalizedMode);
    const showMoneyline = ['straight', 'parlay', 'if_bet', 'reverse', 'round_robin'].includes(normalizedMode);
    const showTotals = ['straight', 'parlay', 'teaser', 'if_bet', 'reverse', 'round_robin'].includes(normalizedMode);

    const hasValidOdds = (value) => parseOddsNumber(value) !== null;

    const renderOddsButton = ({ label, onClick, available, disabled, reason = '', peerAvailable }) => {
        if (!available) {
            // If the peer outcome (other side of the same market) IS priced,
            // this side is specifically off-board — show OFF instead of the
            // confusing "Unavailable" badge next to a real price.
            if (peerAvailable === true) {
                return (
                    <div
                        className="odds-off-board"
                        title="Closed by bookmaker on this side"
                    >
                        OFF
                    </div>
                );
            }
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

            {periods.length > 1 && (
                <div style={periodStripStyle}>
                    {periods.map((p) => {
                        const isActive = p.id === selectedPeriodId;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedPeriodId(p.id)}
                                style={isActive ? periodChipActiveStyle : periodChipStyle}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            )}

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
                            <h3>No matches with live odds right now</h3>
                            <p>
                                {content.name && content.name !== 'Sports'
                                    ? `No fresh ${content.name} odds available — check back in a moment.`
                                    : 'No fresh odds available — check back in a moment.'}
                            </p>
                        </div>
                    ) : (
                        content.matches.map((match) => (
                            <div key={match.id} className={`match-card ${match.rawMatch?.isBettable === false ? 'match-card-closed' : ''}`}>
                                {match.broadcast ? (
                                    // Broadcast row sits above the action header so the
                                    // user reads tip-off time + game context + network
                                    // before scanning the team rows. Per spec we omit
                                    // the row entirely when no broadcast data exists,
                                    // rather than rendering a "TBD" placeholder.
                                    <div className="match-broadcast-row">
                                        <span className="match-broadcast-text">
                                            {match.broadcastTime}
                                            {match.eventName ? (
                                                <>
                                                    <span className="match-broadcast-sep"> - </span>
                                                    <span className="match-broadcast-context">{match.eventName.toUpperCase()}</span>
                                                </>
                                            ) : null}
                                        </span>
                                        <span
                                            className="match-broadcast-chip"
                                            style={{
                                                background: match.broadcast.bg,
                                                color: match.broadcast.fg,
                                            }}
                                            title={match.broadcast.raw}
                                        >
                                            {match.broadcast.name}
                                        </span>
                                    </div>
                                ) : null}

                                <div className="match-header">
                                    <div className="match-time">
                                        <span className="time">{match.time}</span>
                                        <span className="date">{match.date}</span>
                                        <OddsAge timestamp={match.rawMatch?.lastOddsSyncAt} live={(match.status || '').toString().toUpperCase() === 'LIVE' || (match.rawMatch?.status || '').toString().toLowerCase() === 'live'} style={{ marginLeft: 8 }} />
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
                                        <span
                                            className={`match-status ${match.status === 'LIVE' ? 'live' : (match.status === 'SUSPENDED' ? 'suspended' : '')}`}
                                            title={match.status === 'SUSPENDED' ? (match.rawMatch?.bettingBlockedReason || 'Odds are stale — betting suspended') : undefined}
                                        >
                                            {match.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="match-body">
                                    <div className="team-box">
                                        <span className="team-logo-badge">
                                            <img
                                                className="team-logo-image"
                                                src={teamLogos[match.team1.name] || createFallbackTeamLogoDataUri(match.team1.name)}
                                                alt={`${match.team1.name} logo`}
                                                width="32"
                                                height="32"
                                                loading="lazy"
                                                decoding="async"
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = createFallbackTeamLogoDataUri(match.team1.name);
                                                }}
                                            />
                                        </span>
                                        <div className="team-info">
                                            <span className="team-name">
                                                {match.team1.shortName || match.team1.name}
                                                {match.team1.record && (
                                                    <span style={teamRecordStyle}> ({match.team1.record})</span>
                                                )}
                                            </span>
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
                                                width="32"
                                                height="32"
                                                loading="lazy"
                                                decoding="async"
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = createFallbackTeamLogoDataUri(match.team2.name);
                                                }}
                                            />
                                        </span>
                                        <div className="team-info">
                                            <span className="team-name">
                                                {match.team2.shortName || match.team2.name}
                                                {match.team2.record && (
                                                    <span style={teamRecordStyle}> ({match.team2.record})</span>
                                                )}
                                            </span>
                                            <span className="team-abbr">{match.team2.abbr}</span>
                                        </div>
                                        <span className="score">{match.score2}</span>
                                    </div>
                                </div>

                                {match.odds && (
                                    <div className="match-odds">
                                        <div className="odds-row">
                                            {showSpread && (() => {
                                                const awayAvail = match.odds.spread.awayPoint !== null && hasValidOdds(match.odds.spread.awayOdds);
                                                const homeAvail = match.odds.spread.homePoint !== null && hasValidOdds(match.odds.spread.homeOdds);
                                                return (
                                                <div className="odds-cell">
                                                    <span className="odds-label">Spread</span>
                                                    <div className="odds-values-group">
                                                        {renderOddsButton({
                                                            label: formatSpreadDisplay(match.odds.spread.awayPoint, match.odds.spread.awayOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team1.name, 'spreads', match.odds.spread.awayOdds, `${match.team1.name} vs ${match.team2.name}`, 'Spread', match.odds.spread.awayPoint, { isLive: match.status === 'LIVE' }),
                                                            available: awayAvail,
                                                            peerAvailable: homeAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                        {renderOddsButton({
                                                            label: formatSpreadDisplay(match.odds.spread.homePoint, match.odds.spread.homeOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team2.name, 'spreads', match.odds.spread.homeOdds, `${match.team1.name} vs ${match.team2.name}`, 'Spread', match.odds.spread.homePoint, { isLive: match.status === 'LIVE' }),
                                                            available: homeAvail,
                                                            peerAvailable: awayAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                    </div>
                                                </div>
                                                );
                                            })()}
                                            {showMoneyline && (() => {
                                                const awayAvail = hasValidOdds(match.odds.moneyline.awayOdds);
                                                const homeAvail = hasValidOdds(match.odds.moneyline.homeOdds);
                                                return (
                                                <div className="odds-cell">
                                                    <span className="odds-label">Moneyline</span>
                                                    <div className="odds-values-group">
                                                        {renderOddsButton({
                                                            label: formatOdds(match.odds.moneyline.awayOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team1.name, 'h2h', match.odds.moneyline.awayOdds, `${match.team1.name} vs ${match.team2.name}`, 'Moneyline', null, { isLive: match.status === 'LIVE' }),
                                                            available: awayAvail,
                                                            peerAvailable: homeAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                        {renderOddsButton({
                                                            label: formatOdds(match.odds.moneyline.homeOdds, oddsFormat),
                                                            onClick: () => handleAddToSlip(match.id, match.team2.name, 'h2h', match.odds.moneyline.homeOdds, `${match.team1.name} vs ${match.team2.name}`, 'Moneyline', null, { isLive: match.status === 'LIVE' }),
                                                            available: homeAvail,
                                                            peerAvailable: awayAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                    </div>
                                                </div>
                                                );
                                            })()}
                                            {showTotals && (() => {
                                                // 1st-inning total at 0.5 IS the NRFI/YRFI market — relabel so bettors
                                                // recognise it. Selection name stays "Over"/"Under" for settlement
                                                // (SportsbookBetSupport::selectionResult matches on substring "over").
                                                const isNrfi = Number(match.odds.total.point) === 0.5
                                                    && String(match.rawMatch?.sportKey || '').toLowerCase().startsWith('baseball');
                                                const totalLabel = isNrfi ? 'NRFI / YRFI' : 'Total';
                                                const overLabel = isNrfi
                                                    ? `YRFI (${formatOdds(match.odds.total.overOdds, oddsFormat)})`
                                                    : formatTotalDisplay('O', match.odds.total.point, match.odds.total.overOdds, oddsFormat);
                                                const underLabel = isNrfi
                                                    ? `NRFI (${formatOdds(match.odds.total.underOdds, oddsFormat)})`
                                                    : formatTotalDisplay('U', match.odds.total.point, match.odds.total.underOdds, oddsFormat);
                                                const overAvail  = match.odds.total.point !== null && hasValidOdds(match.odds.total.overOdds);
                                                const underAvail = match.odds.total.point !== null && hasValidOdds(match.odds.total.underOdds);
                                                return (
                                                <div className="odds-cell">
                                                    <span className="odds-label">{totalLabel}</span>
                                                    <div className="odds-values-group">
                                                        {renderOddsButton({
                                                            label: overLabel,
                                                            onClick: () => handleAddToSlip(match.id, 'Over', 'totals', match.odds.total.overOdds, `${match.team1.name} vs ${match.team2.name}`, totalLabel, match.odds.total.point, { isLive: match.status === 'LIVE' }),
                                                            available: overAvail,
                                                            peerAvailable: underAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                        {renderOddsButton({
                                                            label: underLabel,
                                                            onClick: () => handleAddToSlip(match.id, 'Under', 'totals', match.odds.total.underOdds, `${match.team1.name} vs ${match.team2.name}`, totalLabel, match.odds.total.point, { isLive: match.status === 'LIVE' }),
                                                            available: underAvail,
                                                            peerAvailable: overAvail,
                                                            disabled: match.rawMatch?.isBettable === false,
                                                            reason: match.rawMatch?.bettingBlockedReason || 'Betting unavailable',
                                                        })}
                                                    </div>
                                                </div>
                                                );
                                            })()}
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

const periodStripStyle = {
    display: 'flex',
    gap: 8,
    padding: '10px 14px',
    margin: '6px 0',
    // Red bar that flows visually out of the red content header above —
    // chips sit on it as one continuous band rather than a separate
    // white strip. Slight rounding softens the bar into a contained
    // block instead of a flat full-bleed strip.
    background: '#ff5051',
    borderRadius: 8,
    overflowX: 'auto',
    whiteSpace: 'nowrap',
};

const periodChipStyle = {
    flexShrink: 0,
    padding: '6px 14px',
    minHeight: 32,
    borderRadius: 0,
    border: 'none',
    background: 'rgba(0, 0, 0, 0.18)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    textTransform: 'uppercase',
};

const periodChipActiveStyle = {
    ...periodChipStyle,
    background: '#fff',
    color: '#ff5051',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
};

export default React.memo(SportContentView);
