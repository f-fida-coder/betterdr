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
// sync with cron-driven DB updates. Live/active views poll aggressively
// (15s) to catch odds changes within seconds. Other views use 60s.
// Set VITE_MATCHES_POLL_LIVE_MS and VITE_MATCHES_POLL_OTHER_MS in .env
// to customize (milliseconds).
const AUTO_POLL_LIVE_MS = parseInt(import.meta.env.VITE_MATCHES_POLL_LIVE_MS || '15000', 10);
const AUTO_POLL_OTHER_MS = parseInt(import.meta.env.VITE_MATCHES_POLL_OTHER_MS || '60000', 10);
// If the most recently rendered data appears older than this, auto
// trigger a force-refetch on first paint and on tab-becomes-visible.
const COLD_LOAD_FRESHNESS_MS = 90000;
// When the live filter returns an empty list (e.g. user landed before
// the worker's live tick had a chance to populate any rows), retry
// with backoff instead of waiting AUTO_POLL_MS for the next poll.
const LIVE_EMPTY_RETRY_DELAYS_MS = [4000, 9000];
// When the live poll returns [] but we previously had live rows on
// screen, keep showing the last-known rows for this long instead of
// wiping the board to empty. Covers the case where the backend's 90s
// live-freshness gate (or the prematch 300s gate) transiently filters
// all rows out because the worker missed a tick — Phase 3's
// starvation sweep refreshes `lastOddsSyncAt` and brings rows back
// within ~30s, so a short grace is enough.
//
// Split by view: live/active/live-upcoming uses a TIGHT grace (30s) so
// stale rows don't pin the board for minutes. Pre-match views use a
// looser 180s grace because pre-match rows can legitimately go empty
// for longer windows (no games today on a given sport).
const EMPTY_GRACE_LIVE_MS = 30000;
const EMPTY_GRACE_OTHER_MS = 180000;
// Maximum age of a stickied row's `lastOddsSyncAt` before we let it
// fall off the merged list. Matches the backend live-freshness gate
// (LIVE_FRESHNESS_SECONDS_DEFAULT = 90s) — a row the backend filter
// dropped because its odds aged out must not be revived by the sticky
// merge, otherwise the user sees a "10m ago LIVE" lie while the screen
// is on. Bet placement re-validates server-side regardless.
const STICKY_MAX_AGE_MS = 90000;
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

// "Last known good" snapshot per (statusFilter, scopeKey). NOT a TTL
// cache — it's the most recent successful response for that exact view,
// kept around so back/forward nav can render instantly from the previous
// data while a fresh fetch lands. Every successful fetch overwrites the
// slot, so the data the user sees on hand-off is always whatever the
// hook last fetched from /api/matches (which itself reads from MySQL).
//
// This is what removes the "flash empty list on every nav" symptom:
// instead of `setMatches([])` on scope change, we seed from this map.
// On a brand-new scope the map miss returns `[]` so first-visit consumers
// still get their normal empty/loading state.
const lastKnownByScope = new Map();
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

// First-paint preload bridge. App.jsx fires the default-landing matches
// request at mount (in parallel with auth bootstrap and the lazy
// dashboard chunk) and seeds the promise here. When `SportContentView`
// later mounts and calls `fetchMatches`, the dedupe lookup at
// `inFlightRequests.get(cacheKey)` picks up the preload, so the network
// round-trip is overlapped with React boot instead of serialized after
// it. If the preload hasn't resolved yet, the await is the same wait
// the user would have had anyway. If it has resolved, the result is
// rendered without a second HTTP request.
//
// Stale guard: callers also pass an enqueueTs and we drop preloads
// older than PRELOAD_MAX_AGE_MS so a slow auth path doesn't end up
// rendering 30s-old odds.
const PRELOAD_MAX_AGE_MS = 6000;
const preloadEnqueuedAt = new Map(); // cacheKey → ts
export const seedMatchesPreload = (status, scopeKey, promise) => {
    if (!promise || typeof promise.then !== 'function') return;
    const key = createMatchesCacheKey(status, scopeKey);
    inFlightRequests.set(key, promise);
    preloadEnqueuedAt.set(key, Date.now());
    // Always release the slot once the preload settles so a slow follow-
    // up fetch under the same key isn't blocked.
    const release = () => {
        if (inFlightRequests.get(key) === promise) {
            inFlightRequests.delete(key);
        }
        preloadEnqueuedAt.delete(key);
    };
    promise.then(release, release);
};
// Internal: useMatches uses this to discard preloads that are too old.
const isPreloadFresh = (key) => {
    const ts = preloadEnqueuedAt.get(key);
    if (!ts) return true;
    return (Date.now() - ts) <= PRELOAD_MAX_AGE_MS;
};

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

const matchFingerprintToken = (match) => {
    const odds = match?.odds || {};
    return [
        match?.id,
        match?.lastOddsSyncAt,
        match?.status,
        match?.isBettable,
        odds?.spreadAwayPoint,
        odds?.spreadAwayPrice,
        odds?.moneylineAway,
        odds?.totalPoint,
        odds?.totalOverPrice,
        odds?.spreadHomePoint,
        odds?.spreadHomePrice,
        odds?.moneylineHome,
        odds?.totalUnderPrice,
    ].join('~');
};

const buildMatchesFingerprint = (matches) => {
    const rows = Array.isArray(matches) ? matches : [];
    if (rows.length === 0) return '0';
    return `${rows.length}|${rows.map(matchFingerprintToken).join('||')}`;
};

export default function useMatches(options = {}) {
    const statusFilter = (options.status || 'all').toString().toLowerCase();
    const scopeKey = (options.scopeKey || '').toString();
    // Seed from the last-known-good snapshot for this exact view so the
    // first render shows the previously-loaded rows immediately. Hand-off
    // is silent: the fetch effect below will overwrite once new data
    // lands. New scope (cache miss) still returns [], preserving the
    // original first-visit loading-state UX.
    const initialKey = JSON.stringify({ status: statusFilter, scope: scopeKey || 'global' });
    const [matches, setMatches] = useState(() => lastKnownByScope.get(initialKey) || []);
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
    // Timestamp (ms) when the feed first returned [] while we had rows
    // on screen. Drives EMPTY_GRACE_MS — reset to 0 whenever a non-empty
    // response lands. Applies to ALL status filters, not just live.
    const liveEmptyGraceStartRef = useRef(0);

    useEffect(() => {
        let mounted = true;
        emptyRetryRef.current = 0;
        liveEmptyGraceStartRef.current = 0;
        // On scope change, seed from the last-known-good snapshot for
        // the new scope instead of clearing to []. This is what makes
        // back/forward nav feel instant — if the user was just viewing
        // NBA matches, switching back to NBA after browsing MLB shows
        // those NBA rows immediately and updates them silently as the
        // fresh fetch resolves a moment later. A brand-new scope misses
        // the map and falls back to [], preserving the original empty
        // / loading-state UX for first visits.
        const cacheKey = createMatchesCacheKey(statusFilter, scopeKey || 'global');
        const lastKnown = lastKnownByScope.get(cacheKey);
        const isLiveStatusFilter = statusFilter === 'live' || statusFilter === 'active';
        const applyMatchesIfChanged = (nextMatches) => {
            const normalizedNext = Array.isArray(nextMatches) ? nextMatches : [];
            setMatches((prev) => {
                // Empty-response grace: backend freshness gates (90s for
                // live, 300s for prematch) can briefly filter every row
                // out when the sync worker misses a tick. Without this
                // guard the UI flashes empty (odds disappear) and re-
                // fills once the worker catches up.
                //
                // Live-bearing views (live / active / live-upcoming) use
                // a tight 30s grace — Phase 3's starvation sweep heals
                // freshness within ~30s, and a longer grace pins stale
                // data on the screen. Pre-match views use a looser 180s
                // grace because they can legitimately stay empty for
                // longer (no game on for a sport today).
                if (normalizedNext.length === 0 && Array.isArray(prev) && prev.length > 0) {
                    const now = Date.now();
                    if (liveEmptyGraceStartRef.current === 0) {
                        liveEmptyGraceStartRef.current = now;
                    }
                    const isLiveBearingView = statusFilter === 'live'
                        || statusFilter === 'active'
                        || statusFilter === 'live-upcoming'
                        || statusFilter === 'active-upcoming';
                    const graceMs = isLiveBearingView ? EMPTY_GRACE_LIVE_MS : EMPTY_GRACE_OTHER_MS;
                    if (now - liveEmptyGraceStartRef.current < graceMs) {
                        return prev;
                    }
                    liveEmptyGraceStartRef.current = 0;
                    return normalizedNext;
                }
                if (normalizedNext.length > 0) liveEmptyGraceStartRef.current = 0;

                // STICKY MERGE: keep prev rows that the new response
                // dropped — but ONLY rows whose own freshness signal is
                // still good. The original sticky merge masked transient
                // worker hiccups (row drops, comes back next tick) but
                // also kept genuinely-stale rows visible long after the
                // backend filter dropped them, producing the "10m ago
                // LIVE" badge while the screen was open. Phase 3's
                // starvation sweep makes transient stale-drops rare, so
                // the cure can be milder than the disease: we sticky
                // ONLY rows that themselves still have fresh odds.
                //
                // Rows whose ids reappear in the new response are
                // REPLACED by the fresh version, so live odds still
                // tick. Stickied rows must satisfy STICKY_MAX_AGE_MS
                // on `lastOddsSyncAt`; aged-out rows fall off, matching
                // the backend's 90s live-freshness gate. Without
                // lastOddsSyncAt we can't verify, so we drop.
                //
                // Bet placement re-validates freshness server-side at
                // place-time, so the sticky-stale risk was never a
                // money hole, but the UX lie (showing odds the user
                // can't actually bet on) was its own problem.
                const nextById = new Map();
                normalizedNext.forEach((m) => {
                    const id = m && (m.id ?? m._id ?? m.externalId);
                    if (id != null) nextById.set(String(id), m);
                });
                const stickyCutoffNow = Date.now();
                const sticky = (Array.isArray(prev) ? prev : []).filter((m) => {
                    const id = m && (m.id ?? m._id ?? m.externalId);
                    if (id == null || nextById.has(String(id))) return false;
                    const lastSync = m?.lastOddsSyncAt;
                    if (!lastSync) return false;
                    const parsed = new Date(lastSync).getTime();
                    if (!Number.isFinite(parsed)) return false;
                    return (stickyCutoffNow - parsed) <= STICKY_MAX_AGE_MS;
                });
                const merged = sticky.length === 0 ? normalizedNext : [...normalizedNext, ...sticky];
                const prevFingerprint = buildMatchesFingerprint(prev);
                const mergedFingerprint = buildMatchesFingerprint(merged);
                return prevFingerprint === mergedFingerprint ? prev : merged;
            });
        };
        // Scope-change SEED bypasses sticky merge: when the user
        // switches from NBA to MLB, we must NOT carry NBA rows over
        // into MLB just because they were on screen. setMatches direct
        // replaces; subsequent fetch responses run through the sticky
        // path normally.
        setMatches(lastKnown || []);

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
                            applyMatchesIfChanged(cached.data);
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
                // If the in-flight slot was filled by a stale preload (App
                // mount fired hours ago, user only just clicked in), drop
                // it — better to re-fetch than render aged odds.
                if (requestPromise && !isPreloadFresh(cacheKey)) {
                    inFlightRequests.delete(cacheKey);
                    requestPromise = null;
                }
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
                // Stash this scope's freshest data so a future remount /
                // back-nav into the same scope can render it instantly
                // before the next fetch lands. Only cache non-empty
                // results — caching `[]` would suppress the legitimate
                // first-visit empty/loading state for sports that have
                // no upcoming events.
                if (filtered.length > 0) {
                    lastKnownByScope.set(cacheKey, filtered);
                }
                applyMatchesIfChanged(filtered);
                success = true;

                // Empty live result during the natural startup race (the
                // live tick hasn't populated any rows yet) — schedule one or two
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
                // Do NOT clear the rendered rows on fetch failure. A transient
                // network blip / 504 / timeout during a background poll would
                // otherwise wipe the live odds list to an empty array for the
                // user, then repaint on the next successful poll — that was
                // the "odds disappear while my screen is on" symptom. Keep
                // the last successful snapshot on-screen and let the next
                // poll (or window-focus / visibility refresh) recover.
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
        //
        // Live-bearing views (live / active / live-upcoming / active-upcoming)
        // poll at the live cadence (15s) — these views contain in-progress
        // games where odds + scores move fast. The default landing
        // "Sports - Live & Upcoming" is live-upcoming, so most users
        // benefit from the faster cadence; bumping it from 60s to 15s
        // shortens the worst-case "stale on screen" window 4x without
        // changing what each user actually sees per refresh.
        // Pure pre-match views (status=upcoming/scheduled) stay at 60s.
        // When tab hidden: continues at 120s to keep data reasonably fresh.
        const isLiveBearingView = statusFilter === 'live'
            || statusFilter === 'active'
            || statusFilter === 'live-upcoming'
            || statusFilter === 'active-upcoming';
        const pollIntervalMs = isLiveBearingView ? AUTO_POLL_LIVE_MS : AUTO_POLL_OTHER_MS;
        const hiddenPollIntervalMs = 120000; // 2min when tab is hidden
        let pollTimer = null;
        let currentPollMs = pollIntervalMs;
        const isPageVisible = () => typeof document === 'undefined'
            || document.visibilityState !== 'hidden';
        const startPolling = (customIntervalMs = null) => {
            if (pollTimer) return;
            const interval = customIntervalMs !== null ? customIntervalMs : currentPollMs;
            pollTimer = setInterval(() => {
                if (!isPageVisible()) return;
                matchesResponseCache.delete(createMatchesCacheKey(statusFilter, scopeKey || 'global'));
                fetchMatches({ trigger: 'auto-poll', refresh: false });
            }, interval);
        };
        const stopPolling = () => {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
        };
        const handleVisibilityChange = () => {
            if (typeof document === 'undefined') return;
            if (document.visibilityState === 'hidden') {
                // Tab hidden: keep polling but slow down to save resources
                // and prevent battery drain. Odds stay reasonably fresh (max 2min stale).
                stopPolling();
                currentPollMs = hiddenPollIntervalMs;
                startPolling(hiddenPollIntervalMs);
                return;
            }
            // Tab visible again: resume normal cadence
            stopPolling();
            currentPollMs = pollIntervalMs;
            // If our cached data is older than COLD_LOAD_FRESHNESS_MS, refetch immediately
            // so the user doesn't see a stale snapshot on tab refocus.
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

        const handlePrefetch = (event) => {
            // Prefetch event: silently fetch odds for a sport and cache them
            // so sport-selection clicks render instantly. Used by SportContentView
            // to prefetch next sport odds as tabs become visible.
            const detail = event?.detail ?? {};
            const sportKeys = Array.isArray(detail.sportKeys) ? detail.sportKeys : [];
            if (sportKeys.length === 0) return;
            // Fire one fetch per sport key, no UI updates (background)
            sportKeys.forEach((key) => {
                const prefetchKey = createMatchesCacheKey(statusFilter, key);
                if (inFlightRequests.has(prefetchKey)) return; // Already in-flight
                const requestOptions = { trigger: 'prefetch', refresh: false, payload: 'core' };
                const prefetchPromise = (statusFilter === 'live' || statusFilter === 'active')
                    ? getLiveMatches(requestOptions)
                    : getMatches(statusFilter === 'all' ? '' : statusFilter, requestOptions);
                inFlightRequests.set(prefetchKey, prefetchPromise);
                prefetchPromise
                    .then((data) => {
                        const normalized = Array.isArray(data) ? data : [];
                        const filtered = filterMatches(normalized, statusFilter);
                        matchesResponseCache.set(prefetchKey, { ts: Date.now(), data: filtered });
                        pruneLocalCache();
                    })
                    .catch(() => {
                        // Prefetch failed — not critical, auto-poll will retry
                    })
                    .finally(() => {
                        inFlightRequests.delete(prefetchKey);
                    });
            });
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('matches:refresh', handleRefresh);
            window.addEventListener('matches:sync-deferred', handleSyncDeferred);
            window.addEventListener('matches:force-refetch', handleForceRefetch);
            window.addEventListener('matches:prefetch', handlePrefetch);
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
                window.removeEventListener('matches:prefetch', handlePrefetch);
                window.removeEventListener('focus', handleWindowFocus);
                if (typeof document !== 'undefined') {
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                }
            }
        };
    }, [scopeKey, statusFilter, rowLimit]);

    return matches;
}
