import { useEffect, useRef, useState } from 'react';
import { getMatches, getLiveMatches, getUpcomingMatches } from '../api';

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

const filterMatches = (normalized, statusFilter) => {
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
    const fetchIdRef = useRef(0);
    const listenerIdRef = useRef(buildClientId('matches-hook'));

    useEffect(() => {
        let mounted = true;

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

            if (emitScopedLifecycle) {
                emitRefreshProgress('started', { requestId: refreshRequestId, trigger, refresh: true });
            }

            try {
                const requestOptions = { trigger, refresh };
                const data = (statusFilter === 'live' || statusFilter === 'active')
                    ? await getLiveMatches(requestOptions)
                    : (statusFilter === 'upcoming' || statusFilter === 'scheduled')
                        ? await getUpcomingMatches(requestOptions)
                        : await getMatches(statusFilter === 'all' ? '' : statusFilter, requestOptions);

                if (!mounted || fetchId !== fetchIdRef.current) {
                    return;
                }

                const normalized = Array.isArray(data) ? data : [];
                setMatches(filterMatches(normalized, statusFilter));
                success = true;
            } catch (err) {
                errorMessage = err?.message || 'Failed to fetch matches';
                if (mounted && fetchId === fetchIdRef.current) {
                    setMatches([]);
                }
            } finally {
                window.dispatchEvent(new CustomEvent('matches:refresh-completed', {
                    detail: {
                        success,
                        error: success ? undefined : errorMessage,
                        trigger,
                        refresh,
                        requestId: refreshRequestId || undefined,
                    }
                }));
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

        const handleRefresh = (event) => {
            const detail = event?.detail ?? {};
            const trigger = detail.reason ? String(detail.reason) : 'manual';
            const requestId = detail.requestId ? String(detail.requestId) : '';
            fetchMatches({ trigger, refresh: true, requestId });
        };

        window.addEventListener('matches:refresh', handleRefresh);

        return () => {
            mounted = false;
            window.removeEventListener('matches:refresh', handleRefresh);
        };
    }, [scopeKey, statusFilter]);

    return matches;
}
