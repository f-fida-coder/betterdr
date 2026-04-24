import { useCallback, useEffect, useRef, useState } from 'react';
import { refreshSportOdds } from '../api';

const DEFAULT_COOLDOWN_MS = 20_000;
const noopToast = () => {};

/**
 * Small hook that owns the click → API call → cooldown → toast lifecycle
 * for the on-demand odds refresh button. Used by SportContentView and
 * MobileContentView so they share identical UX rules.
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
export default function useSportOddsRefresh(sportKey, { cooldownMs = DEFAULT_COOLDOWN_MS, showToast = noopToast } = {}) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const [, forceTick] = useState(0);
    const tickIntervalRef = useRef(null);

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
        if (!sportKey) {
            showToast('No sport selected to refresh', 'warning');
            return;
        }
        if (isRefreshing || cooldownRemainingSec > 0) return;

        setIsRefreshing(true);
        try {
            const result = await refreshSportOdds(sportKey);
            setLastUpdatedAt(result?.last_updated || new Date().toISOString());
            setCooldownUntil(Date.now() + cooldownMs);
            showToast(result?.dedup_hit ? 'Just updated' : 'Odds refreshed', 'success');
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
    }, [sportKey, isRefreshing, cooldownRemainingSec, cooldownMs, showToast]);

    return { trigger, isRefreshing, cooldownRemainingSec, lastUpdatedAt };
}
