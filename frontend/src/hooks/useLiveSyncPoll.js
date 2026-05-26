import { useEffect, useRef } from 'react';
import { buildApiUrl as _internalBuildApiUrl } from '../api';

/**
 * Lightweight push-feel poller — calls `/api/sync/recent` every few
 * seconds and turns the events it gets into `matches:force-refetch`
 * (and `scoreboard:refresh`) browser events. Same listener contract
 * as `useWebSocket` in App.jsx, so the rest of the app doesn't care
 * which transport delivered the signal.
 *
 * Designed as the Hostinger fallback for `useWebSocket`: the WebSocket
 * server on port 5001 isn't reachable in production, but the
 * `/api/sync/recent` endpoint reads the worker's event log file on
 * each request and returns whatever is new since the caller's cursor.
 * That gives clients an effective "push" within ~POLL_MS of the
 * worker writing — without holding PHP-FPM workers open like a true
 * SSE/long-poll connection would.
 *
 * Behaviour:
 *   * First request seeds the cursor to current EOF on the server,
 *     so we never replay the entire log on mount.
 *   * Pauses when the tab is hidden (resumes on visibilitychange).
 *   * On network error, backs off exponentially up to 30s — broken
 *     networks shouldn't cause a 1-req/3s storm.
 *   * Disables itself entirely when `enabled=false` (e.g. the parent
 *     already has a healthy WebSocket connection).
 *
 * @param {object} options
 * @param {boolean} [options.enabled=true] Set false to suspend polling.
 * @param {number} [options.intervalMs=3500] Poll cadence in ms.
 * @param {string} [options.channels='odds:sport:sync,odds:sport:score']
 *        Comma-separated channels to subscribe to.
 */
export default function useLiveSyncPoll({
    enabled = true,
    intervalMs = 5000,
    channels = 'odds:sport:sync,odds:sport:score,odds:sync,bet:settled',
} = {}) {
    const cursorRef = useRef('');
    const inFlightRef = useRef(false);
    const timerRef = useRef(null);
    const backoffRef = useRef(0);
    const lastDispatchRef = useRef(0);

    useEffect(() => {
        if (!enabled) return undefined;

        let stopped = false;

        const isVisible = () => typeof document === 'undefined'
            || document.visibilityState !== 'hidden';

        const buildUrl = () => {
            try {
                // Reuse the api.js URL builder so dev (`/api/sync/recent`
                // via Vite proxy) and prod (`/api/index.php?path=/api/sync/recent`)
                // are both handled correctly without us duplicating the
                // path-style logic.
                if (typeof _internalBuildApiUrl === 'function') {
                    return _internalBuildApiUrl('/sync/recent', {
                        since: cursorRef.current,
                        channels,
                        limit: '25',
                    });
                }
            } catch (e) {
                // fall through to inline build
            }
            // Fallback: inline construct. Used only if buildApiUrl
            // isn't exported (older bundles).
            const params = new URLSearchParams({
                since: cursorRef.current,
                channels,
                limit: '25',
            });
            return `/api/sync/recent?${params.toString()}`;
        };

        const dispatchEventForChannel = (evt) => {
            if (!evt || typeof window === 'undefined') return;
            const channel = String(evt.channel || '');

            // bet:settled has its own consumer (MyBetsView). It's an
            // infrequent, user-scoped event — not subject to the matches
            // debounce window, so it always dispatches and never gets
            // collapsed with an unrelated odds tick.
            if (channel === 'bet:settled') {
                window.dispatchEvent(new CustomEvent('bets:refresh', {
                    detail: {
                        reason: 'live-sync-poll',
                        userId: evt.payload?.userId ?? null,
                        betId: evt.payload?.betId ?? null,
                        status: evt.payload?.status ?? null,
                    },
                }));
                return;
            }

            const sportKey = (evt.payload && (evt.payload.sport_key || evt.payload.sportKey)) || null;
            // 1.2s dispatch debounce — same shape as the WebSocket
            // handler in App.jsx. Bursty events (a worker cycle
            // finishing 5 sports within 200ms) collapse to one refetch.
            const now = Date.now();
            if ((now - lastDispatchRef.current) < 1200) return;
            lastDispatchRef.current = now;
            window.dispatchEvent(new CustomEvent('matches:force-refetch', {
                detail: { reason: 'live-sync-poll', channel, sportKey },
            }));
            window.dispatchEvent(new CustomEvent('scoreboard:refresh', {
                detail: { reason: 'live-sync-poll', channel },
            }));
        };

        const tick = async () => {
            if (stopped) return;
            if (!isVisible()) {
                // Tab hidden — sleep one cycle and re-check. This
                // dovetails with useMatches's own visibility handler
                // (which slows its poll to 120s when hidden) so we
                // don't fight it.
                schedule(intervalMs);
                return;
            }
            if (inFlightRef.current) {
                schedule(intervalMs);
                return;
            }
            inFlightRef.current = true;
            try {
                const res = await fetch(buildUrl(), {
                    method: 'GET',
                    credentials: 'omit',
                    cache: 'no-store',
                });
                if (!res.ok) {
                    throw new Error(`recent-events HTTP ${res.status}`);
                }
                const data = await res.json();
                if (data && typeof data.cursor === 'string') {
                    cursorRef.current = data.cursor;
                }
                if (data && Array.isArray(data.events) && data.events.length > 0) {
                    // Per-event dispatch so user-scoped channels (bet:settled)
                    // aren't dropped just because an odds:sport:sync arrived
                    // earlier in the same batch. dispatchEventForChannel applies
                    // the matches-debounce internally to odds events; bet
                    // events bypass it.
                    for (const evt of data.events) {
                        dispatchEventForChannel(evt);
                    }
                }
                backoffRef.current = 0;
            } catch (e) {
                // Network blip — back off so a broken endpoint doesn't
                // produce a 1-req/intervalMs storm. Max 30s.
                backoffRef.current = Math.min(30000, (backoffRef.current || intervalMs) * 2);
            } finally {
                inFlightRef.current = false;
            }
            schedule(backoffRef.current || intervalMs);
        };

        const schedule = (delayMs) => {
            if (stopped) return;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            timerRef.current = setTimeout(tick, Math.max(500, delayMs));
        };

        const handleVisibility = () => {
            if (isVisible()) {
                // Returning to the tab — fire immediately so the user
                // sees the latest data instead of waiting for the
                // next scheduled tick.
                schedule(0);
            }
        };

        schedule(0);
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibility);
        }

        return () => {
            stopped = true;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibility);
            }
        };
    }, [enabled, intervalMs, channels]);
}
