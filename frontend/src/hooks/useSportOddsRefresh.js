import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { refreshSportOdds, refreshSportsOdds } from '../api';

// Pre-match odds: 5-minute server-side rate limit (1 per user per 300s).
// The frontend cooldown matches so the button stays disabled for the same
// window — user never clicks, gets a toast, then has to wait anyway.
const DEFAULT_COOLDOWN_MS = 300_000;
const noopToast = () => {};

/**
 * Small hook that owns the click → API call → cooldown → toast lifecycle
 * for the on-demand odds refresh button. Used by SportContentView and
 * MobileContentView so they share identical UX rules.
 *
 * Accepts either a single string sportKey OR an array of sport keys —
 * arrays fan out to /api/odds/refresh-multi which counts as ONE call
 * against the per-user rate limit. Use the array form when the visible
 * matches list mixes leagues (e.g. NBA + WNBA, or multiple soccer
 * leagues under one heading) so one click refreshes everything visible.
 *
 * `showToast` is injected by the caller (not imported here) so this hook
 * can live under src/hooks/ without creating a bundle-chunk cycle between
 * utils-shared (hooks) and contexts-shared (ToastContext). Callers pull
 * showToast from useToast() themselves.
 *
 * Returns:
 *   - trigger({ onSuccess }): invoke the refresh. Returns a promise that
 *       resolves regardless of API outcome (errors are surfaced via toast
 *       + state, not thrown to the caller).
 *   - isRefreshing: true while the HTTP round-trip is in flight.
 *   - cooldownRemainingSec: >0 while the button should stay disabled after
 *       a click. Decrements once per second for live countdown display.
 *   - lastUpdatedAt: ISO timestamp of the last successful refresh, or null.
 */
export default function useSportOddsRefresh(sportKeyOrKeys, { cooldownMs = DEFAULT_COOLDOWN_MS, showToast = noopToast } = {}) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const [, forceTick] = useState(0);
    const tickIntervalRef = useRef(null);

    // Normalize input to a stable, deduped, sorted array for both code
    // paths and dependency tracking.
    const normalizedKeys = useMemo(() => {
        const raw = Array.isArray(sportKeyOrKeys)
            ? sportKeyOrKeys
            : (sportKeyOrKeys ? [sportKeyOrKeys] : []);
        const seen = new Set();
        const out = [];
        for (const k of raw) {
            if (typeof k !== 'string') continue;
            const norm = k.trim().toLowerCase();
            if (norm === '' || seen.has(norm)) continue;
            seen.add(norm);
            out.push(norm);
        }
        out.sort();
        return out;
    }, [sportKeyOrKeys]);
    const sportKeyDepsKey = normalizedKeys.join('|');

    // Drive the live countdown without causing a render when no cooldown is active.
    useEffect(() => {
        if (cooldownUntil <= Date.now()) return undefined;
        tickIntervalRef.current = window.setInterval(() => forceTick((n) => n + 1), 1000);
        return () => {
            if (tickIntervalRef.current) window.clearInterval(tickIntervalRef.current);
        };
    }, [cooldownUntil]);

    const cooldownRemainingSec = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

    const trigger = useCallback(async ({ onSuccess } = {}) => {
        if (normalizedKeys.length === 0) {
            showToast('No sport selected to refresh', 'warning');
            return;
        }
        if (isRefreshing || cooldownRemainingSec > 0) return;

        setIsRefreshing(true);
        try {
            const result = normalizedKeys.length === 1
                ? await refreshSportOdds(normalizedKeys[0])
                : await refreshSportsOdds(normalizedKeys);
            setLastUpdatedAt(result?.last_updated || new Date().toISOString());
            setCooldownUntil(Date.now() + cooldownMs);
            // Multi-sport response uses success=true if ANY sport synced; surface
            // a softer toast when only some succeeded so the user understands
            // the per-sport partial state rather than seeing a flat success.
            const perSport = Array.isArray(result?.per_sport) ? result.per_sport : null;
            if (perSport && perSport.some((p) => !p?.success)) {
                const okCount = perSport.filter((p) => p?.success).length;
                showToast(`Refreshed ${okCount}/${perSport.length} sports`, 'warning');
            } else {
                showToast(result?.dedup_hit ? 'Just updated' : 'Odds refreshed', 'success');
            }
            if (typeof onSuccess === 'function') onSuccess(result);
        } catch (err) {
            const errorCode = (err?.error || '').toString();
            if (err?.status === 401 || errorCode === 'login_required') {
                showToast('Please log in to refresh odds', 'warning');
            } else if (err?.status === 429 || errorCode === 'rate_limited') {
                const wait = Math.max(1, Number(err?.retryAfterSeconds) || Math.ceil(cooldownMs / 1000));
                setCooldownUntil(Date.now() + wait * 1000);
                showToast(`Wait ${wait}s before refreshing again`, 'warning');
            } else {
                showToast('Refresh failed, odds are still up-to-date', 'error');
            }
        } finally {
            setIsRefreshing(false);
        }
        // sportKeyDepsKey collapses array identity churn into a stable
        // string so callers that rebuild the array each render don't
        // invalidate this callback.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sportKeyDepsKey, isRefreshing, cooldownRemainingSec, cooldownMs, showToast]);

    return { trigger, isRefreshing, cooldownRemainingSec, lastUpdatedAt };
}
