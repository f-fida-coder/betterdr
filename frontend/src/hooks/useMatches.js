import { useEffect, useRef, useState } from 'react';
import { getMatches, getLiveMatches, getUpcomingMatches } from '../api';

// Local React-side data cache: DISABLED. Live betting cannot show stale
// odds. The previous 15 s TTL meant a user could land on a sport, see a
// 14-second-old odds snapshot, and bet on it after the bookmaker pulled
// the line. We use a no-op shim so existing .get/.set/.delete call sites
// keep working but always miss, forcing a fresh network read every time.
// Re-enable with a real invalidation strategy at >=1000 DAU.
const LOCAL_MATCHES_CACHE_TTL_MS = 0;
const LOCAL_MATCHES_CACHE_MAX_ENTRIES = 0;
// Background polling cadence while the tab is visible. Keeps the list in
// sync with cron-driven DB updates without requiring a manual refresh.
const AUTO_POLL_MS = 30000;
// If the most recently rendered data appears older than this, auto
// trigger a force-refetch on first paint and on tab-becomes-visible.
const COLD_LOAD_FRESHNESS_MS = 90000;
// When the live filter returns an empty list (e.g. user landed before
// the Rundown overlay tick had a chance to populate any rows), retry
// with backoff instead of waiting AUTO_POLL_MS for the next poll.
const LIVE_EMPTY_RETRY_DELAYS_MS = [4000, 9000];
// No-op cache: same Map surface (.get/.set/.delete/.size) so the rest of
// the file is unchanged, but every read returns undefined so we always
// refetch from the backend.
const matchesResponseCache = {
    get: () => undefined,
    set: () => {},
    delete: () => {},
    size: 0,
    entries: () => [][Symbol.iterator](),
};
// In-flight request dedup is NOT a data cache — it just prevents the same
// HTTP request from being fired twice within a single render burst (e.g.
// when 3 components mount simultaneously). Always-fresh policy still
// applies: once the request resolves, the entry is removed and the next
// caller starts a brand new fetch.
const inFlightRequests = new Map();

const createMatchesCacheKey = (status, scopeKey) => JSON.stringify({
    status: (status || 'all').toString().toLowerCase(),
    scope: (scopeKey || 'global').toString(),
});

const pruneLocalCache = () => {
    if (matchesResponseCache.size <= LOCAL_MATCHES_CACHE_MAX_ENTRIES) return;
    const entries = Array.from(matchesResponseCache.entries()).sort((a, b) => a[1].ts - b[1].ts);
    const excess = entries.length - LOCAL_MATCHES_CACHE_MAX_ENTRIES;
    for (let i = 0; i < excess; i += 1) {
        matchesResponseCache.delete(entries[i][0]);
    }
};

const buildClientId = (prefix) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const isLiveMatch = (match) => {
    if (!match) return false;
    const status = (match.status || '').toString().toLowerCase();
    if (status === 'live') return true;
    const eventStatus = (match.score?.event_status || '').toString().toUpperCase();
    return eventStatus.includes('IN_PROGRESS') || eventStatus.includes('LIVE') || eventStatus.includes('STATUS_IN_PROGRESS');
};

const isUpcomingMatch = (match) => {
    if (!match) return false;
    const status = (match.status || '').toString().toLowerCase();
    if (status === 'scheduled') return true;

    const eventStatus = (match.score?.event_status || '').toString().toUpperCase();
    if (eventStatus.includes('SCHEDULED') || eventStatus.includes('PRE_GAME')) return true;

    if (match.startTime) {
        const start = new Date(match.startTime).getTime();
        if (!Number.isNaN(start)) return start > Date.now();
    }

    return false;
};

const isFinishedMatch = (match) => {
    if (!match) return false;
    const status = (match.status || '').toString().toLowerCase();
    if (['finished', 'final', 'cancelled', 'canceled', 'closed', 'expired', 'suspended'].includes(status)) return true;

    const eventStatus = (match.score?.event_status || '').toString().toUpperCase();
    return eventStatus.includes('FINAL') || eventStatus.includes('COMPLETE') || eventStatus.includes('STATUS_CLOSED');
};

const isPastCommence = (match) => {
    if (!match?.startTime) return false;
    const start = new Date(match.startTime).getTime();
    if (Number.isNaN(start)) return false;
    return start <= Date.now();
};

const filterMatches = (normalized, statusFilter) => {
    // Defensive: hide past-commence pre-match rows even if the backend cache
    // lagged or the client clock is slightly off. Live rows always survive —
    // they're past commence_time by definition. `finished` is explicit
    // historical and opts out entirely.
    if (statusFilter !== 'finished') {
        normalized = normalized.filter((m) => isLiveMatch(m) || !isPastCommence(m));
    }

    if (statusFilter === 'live' || statusFilter === 'active') {
        const filtered = normalized.filter(isLiveMatch);
        return filtered.length === 0 && normalized.length > 0 ? normalized : filtered;
    }

    if (statusFilter === 'upcoming' || statusFilter === 'scheduled') {
        return normalized.filter((match) => !isFinishedMatch(match) && isUpcomingMatch(match));
    }

    if (statusFilter === 'live-upcoming' || statusFilter === 'active-upcoming') {
        return normalized.filter((match) => !isFinishedMatch(match) && (isLiveMatch(match) || isUpcomingMatch(match) || (!isFinishedMatch(match) && !match.status)));
    }

    return normalized;
};

export default function useMatches(options = {}) {
    const [matches, setMatches] = useState([]);
    const statusFilter = (options.status || 'all').toString().toLowerCase();
    const scopeKey = (options.scopeKey || '').toString();
    // Optional row cap forwarded to /api/matches?limit=N. Used by the default
    // landing view (no sport selected) to ask for only top 6 freshest rows.
    const rowLimit = Number.isFinite(Number(options.limit)) && Number(options.limit) > 0
        ? Math.floor(Number(options.limit))
        : 0;
    const fetchIdRef = useRef(0);
    const listenerIdRef = useRef(buildClientId('matches-hook'));
    // Counter for the empty-live retry path (see LIVE_EMPTY_RETRY_DELAYS_MS).
    // Resets when a non-empty live response lands or the hook unmounts.
    const emptyRetryRef = useRef(0);

    useEffect(() => {
        let mounted = true;
        emptyRetryRef.current = 0;
        // Clear stale data IMMEDIATELY when scope changes. Without this,
        // consumers (e.g. SportContentView) see the old sport's matches
        // until the new fetch resolves, then their downstream filter
        // would either pass-through old rows (UX glitch) or filter them
        // all out (showing "No matches" briefly). With the clear, the
        // consumer can render a clean loading state during the hand-off.
        setMatches([]);

        const emitRefreshProgress = (phase, detail) => {
            if (typeof window === 'undefined') return;
            window.dispatchEvent(new CustomEvent('matches:refresh-progress', {
                detail: {
                    phase,
                    listenerId: listenerIdRef.current,
                    statusFilter,
                    scopeKey,
                    ...detail,
                },
            }));
        };

        const fetchMatches = async ({ trigger = 'view', refresh = false, requestId = '' } = {}) => {
            const fetchId = fetchIdRef.current + 1;
            fetchIdRef.current = fetchId;
            const refreshRequestId = requestId ? String(requestId) : '';
            const emitScopedLifecycle = refresh === true && refreshRequestId !== '';
            let success = false;
            let errorMessage = '';
            const cacheKey = createMatchesCacheKey(statusFilter, scopeKey || 'global');
            const now = Date.now();

            if (emitScopedLifecycle) {
                emitRefreshProgress('started', { requestId: refreshRequestId, trigger, refresh: true });
            }

            try {
                if (refresh !== true) {
                    const cached = matchesResponseCache.get(cacheKey);
                    if (cached && (now - cached.ts) < LOCAL_MATCHES_CACHE_TTL_MS) {
                        if (mounted && fetchId === fetchIdRef.current) {
                            setMatches(cached.data);
                            success = true;
                        }
                        return;
                    }
                }

                // Notify listeners that a background poll is starting so the
                // UI can show a subtle "updating..." indicator. Scoped refresh
                // requests already emit via emitRefreshProgress above; this
                // covers auto-poll and other non-scoped fetch triggers.
                if (!emitScopedLifecycle && trigger === 'auto-poll' && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('matches:refresh-progress', {
                        detail: { phase: 'started', trigger, listenerId: listenerIdRef.current, statusFilter, scopeKey },
                    }));
                }

                let requestPromise = inFlightRequests.get(cacheKey);
                if (!requestPromise) {
                    const requestOptions = { trigger, refresh, payload: 'core' };
                    if (rowLimit > 0) requestOptions.limit = rowLimit;
                    requestPromise = (statusFilter === 'live' || statusFilter === 'active')
                        ? getLiveMatches(requestOptions)
                        : (statusFilter === 'upcoming' || statusFilter === 'scheduled')
                            ? getUpcomingMatches(requestOptions)
                            : getMatches(statusFilter === 'all' ? '' : statusFilter, requestOptions);
                    inFlightRequests.set(cacheKey, requestPromise);
                }

                const data = await requestPromise;
                inFlightRequests.delete(cacheKey);

                if (!mounted || fetchId !== fetchIdRef.current) {
                    return;
                }

                const normalized = Array.isArray(data) ? data : [];
                const filtered = filterMatches(normalized, statusFilter);
                matchesResponseCache.set(cacheKey, { ts: Date.now(), data: filtered });
                pruneLocalCache();
                setMatches(filtered);
                success = true;

                // Empty live result during the natural startup race (Rundown
                // tick hasn't populated any rows yet) — schedule one or two
                // short retries instead of forcing the user to wait the full
                // AUTO_POLL_MS or hit refresh manually. Other status filters
                // are not affected.
                const isLiveStatus = statusFilter === 'live' || statusFilter === 'active';
                if (isLiveStatus && filtered.length === 0 && trigger !== 'live-empty-retry') {
                    const attempt = Math.min(
                        Math.max(0, Number(emptyRetryRef.current) || 0),
                        LIVE_EMPTY_RETRY_DELAYS_MS.length - 1
                    );
                    if (Number(emptyRetryRef.current) < LIVE_EMPTY_RETRY_DELAYS_MS.length) {
                        const delay = LIVE_EMPTY_RETRY_DELAYS_MS[attempt];
                        emptyRetryRef.current = attempt + 1;
                        setTimeout(() => {
                            if (!mounted || fetchId !== fetchIdRef.current) return;
                            matchesResponseCache.delete(cacheKey);
                            inFlightRequests.delete(cacheKey);
                            fetchMatches({ trigger: 'live-empty-retry', refresh: false });
                        }, delay);
                    }
                } else if (filtered.length > 0) {
                    emptyRetryRef.current = 0;
                }
            } catch (err) {
                inFlightRequests.delete(cacheKey);
                errorMessage = err?.message || 'Failed to fetch matches';
                if (mounted && fetchId === fetchIdRef.current) {
                    setMatches([]);
                }
            } finally {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('matches:refresh-completed', {
                        detail: {
                            success,
                            error: success ? undefined : errorMessage,
                            trigger,
                            refresh,
                            requestId: refreshRequestId || undefined,
                        }
                    }));
                }
                if (emitScopedLifecycle) {
                    emitRefreshProgress('completed', {
                        requestId: refreshRequestId,
                        trigger,
                        refresh: true,
                        success,
                        error: success ? undefined : errorMessage,
                    });
                }
            }
        };

        fetchMatches({ trigger: scopeKey ? 'selection' : 'view' });

        const prefetchHotStatuses = async () => {
            const prefetchTargets = [];
            if (statusFilter === 'all' || statusFilter === 'live-upcoming' || statusFilter === 'active-upcoming') {
                prefetchTargets.push('live', 'upcoming');
            } else if (statusFilter === 'live' || statusFilter === 'active') {
                prefetchTargets.push('upcoming');
            } else if (statusFilter === 'upcoming' || statusFilter === 'scheduled') {
                prefetchTargets.push('live');
            }

            await Promise.all(prefetchTargets.map(async (targetStatus) => {
                const prefetchKey = createMatchesCacheKey(targetStatus, scopeKey || 'global');
                const cached = matchesResponseCache.get(prefetchKey);
                const now = Date.now();
                if (cached && (now - cached.ts) < LOCAL_MATCHES_CACHE_TTL_MS) {
                    return;
                }

                let requestPromise = inFlightRequests.get(prefetchKey);
                if (!requestPromise) {
                    const requestOptions = { trigger: 'prefetch', refresh: false, payload: 'core' };
                    if (rowLimit > 0) requestOptions.limit = rowLimit;
                    requestPromise = targetStatus === 'live'
                        ? getLiveMatches(requestOptions)
                        : getUpcomingMatches(requestOptions);
                    inFlightRequests.set(prefetchKey, requestPromise);
                }

                try {
                    const data = await requestPromise;
                    const normalized = Array.isArray(data) ? data : [];
                    const filtered = filterMatches(normalized, targetStatus);
                    matchesResponseCache.set(prefetchKey, { ts: Date.now(), data: filtered });
                    pruneLocalCache();
                } catch (_err) {
                    // Best-effort prefetch only; ignore failures.
                } finally {
                    inFlightRequests.delete(prefetchKey);
                }
            }));
        };

        prefetchHotStatuses();

        const handleRefresh = (event) => {
            const detail = event?.detail ?? {};
            const trigger = detail.reason ? String(detail.reason) : 'manual';
            const requestId = detail.requestId ? String(detail.requestId) : '';
            fetchMatches({ trigger, refresh: true, requestId });
        };

        // Sibling event for cases where the caller has ALREADY persisted fresh
        // data backend-side (e.g. the /api/odds/refresh/{sport} endpoint) and
        // just wants the UI to re-read. Skips the refresh=true query param so
        // the backend doesn't kick a second sync-defer round-trip; just busts
        // the local 15s cache and pulls a fresh snapshot immediately.
        //
        // Critically also evicts the shared inFlightRequests entry — without
        // this, an older in-flight /api/matches request (started by another
        // component before the upstream refresh completed) would be reused
        // and return pre-refresh data. That was the "sometimes refresh
        // doesn't update" bug: the on-demand fetch correctly bumped the
        // backend cache, but the UI got attached to a stale in-flight call.
        const handleForceRefetch = (event) => {
            const detail = event?.detail ?? {};
            const trigger = detail.reason ? String(detail.reason) : 'force-refetch';
            const cacheKey = createMatchesCacheKey(statusFilter, scopeKey || 'global');
            matchesResponseCache.delete(cacheKey);
            inFlightRequests.delete(cacheKey);
            fetchMatches({ trigger, refresh: false });
        };

        // When the backend returned the pre-sync snapshot and kicked the odds
        // sync off in the background (X-Sportsbook-Sync-Deferred), do a silent
        // refetch a few seconds later to pick up the freshly synced odds. One
        // timer at a time; later events reset it. Must evict the 15s local
        // cache entry or the follow-up fetch would return the stale snapshot.
        let deferredRetryTimer = null;
        const handleSyncDeferred = () => {
            if (deferredRetryTimer) clearTimeout(deferredRetryTimer);
            deferredRetryTimer = setTimeout(() => {
                deferredRetryTimer = null;
                matchesResponseCache.delete(createMatchesCacheKey(statusFilter, scopeKey || 'global'));
                fetchMatches({ trigger: 'deferred-retry', refresh: false });
            }, 4500);
        };

        // Background poll while tab is visible. Force-refetches (skip 15s
        // local cache) so we always exercise the network and pick up odds
        // changes from the worker / on-demand refreshes by other clients.
        // Pauses when tab hidden, fires immediately on becoming visible.
        let pollTimer = null;
        const isPageVisible = () => typeof document === 'undefined'
            || document.visibilityState !== 'hidden';
        const startPolling = () => {
            if (pollTimer) return;
            pollTimer = setInterval(() => {
                if (!isPageVisible()) return;
                matchesResponseCache.delete(createMatchesCacheKey(statusFilter, scopeKey || 'global'));
                fetchMatches({ trigger: 'auto-poll', refresh: false });
            }, AUTO_POLL_MS);
        };
        const stopPolling = () => {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
        };
        const handleVisibilityChange = () => {
            if (typeof document === 'undefined') return;
            if (document.visibilityState === 'hidden') {
                stopPolling();
                return;
            }
            // Tab just became visible. If our cached data is older than
            // COLD_LOAD_FRESHNESS_MS, refetch immediately so the user
            // doesn't see a stale snapshot on tab refocus.
            const cached = matchesResponseCache.get(createMatchesCacheKey(statusFilter, scopeKey || 'global'));
            if (!cached || (Date.now() - cached.ts) > COLD_LOAD_FRESHNESS_MS) {
                matchesResponseCache.delete(createMatchesCacheKey(statusFilter, scopeKey || 'global'));
                fetchMatches({ trigger: 'visibility-resume', refresh: false });
            }
            startPolling();
        };

        // Window focus is a sibling signal to visibilitychange — fires on
        // alt-tab back, on window-unminimize, on click-into-window from
        // another app. Some browsers fire one but not the other depending on
        // OS/version, so we register both. Both paths bypass the local
        // cache so the user sees fresh odds within one HTTP round-trip
        // instead of waiting up to AUTO_POLL_MS for the next poll.
        const handleWindowFocus = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            matchesResponseCache.delete(createMatchesCacheKey(statusFilter, scopeKey || 'global'));
            inFlightRequests.delete(createMatchesCacheKey(statusFilter, scopeKey || 'global'));
            fetchMatches({ trigger: 'window-focus', refresh: false });
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('matches:refresh', handleRefresh);
            window.addEventListener('matches:sync-deferred', handleSyncDeferred);
            window.addEventListener('matches:force-refetch', handleForceRefetch);
            window.addEventListener('focus', handleWindowFocus);
            if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', handleVisibilityChange);
            }
            if (isPageVisible()) startPolling();
        }

        return () => {
            mounted = false;
            if (deferredRetryTimer) clearTimeout(deferredRetryTimer);
            stopPolling();
            if (typeof window !== 'undefined') {
                window.removeEventListener('matches:refresh', handleRefresh);
                window.removeEventListener('matches:sync-deferred', handleSyncDeferred);
                window.removeEventListener('matches:force-refetch', handleForceRefetch);
                window.removeEventListener('focus', handleWindowFocus);
                if (typeof document !== 'undefined') {
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                }
            }
        };
    }, [scopeKey, statusFilter, rowLimit]);

    return matches;
}
