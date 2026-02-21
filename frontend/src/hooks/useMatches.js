import { useEffect, useState } from 'react';
import { getMatches, getLiveMatches, fetchOddsManual, API_URL } from '../api';

const MATCH_STREAM_ENABLED = String(import.meta.env.VITE_ENABLE_MATCH_STREAM || 'true').toLowerCase() === 'true';
const POLL_INTERVAL_MS = 15000;
const ODDS_REFRESH_COOLDOWN_MS = 45000;
let oddsRefreshInFlight = null;
let lastOddsRefreshAt = 0;

const triggerOddsRefreshOnce = async () => {
    const now = Date.now();
    if (oddsRefreshInFlight) {
        return oddsRefreshInFlight;
    }
    if ((now - lastOddsRefreshAt) < ODDS_REFRESH_COOLDOWN_MS) {
        return null;
    }
    oddsRefreshInFlight = fetchOddsManual()
        .then((result) => {
            lastOddsRefreshAt = Date.now();
            return result;
        })
        .finally(() => {
            oddsRefreshInFlight = null;
        });
    return oddsRefreshInFlight;
};

// Hook: fetch initial matches and subscribe to live match updates
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
    if (['scheduled', 'pre-game', 'pregame', 'upcoming', 'pending'].includes(status)) return true;

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
    if (['finished', 'final', 'cancelled', 'canceled', 'closed'].includes(status)) return true;

    const eventStatus = (match.score?.event_status || '').toString().toUpperCase();
    return eventStatus.includes('FINAL') || eventStatus.includes('COMPLETE') || eventStatus.includes('STATUS_CLOSED');
};

export default function useMatches(options = {}) {
    const [matches, setMatches] = useState([]);
    const statusFilter = (options.status || 'all').toString().toLowerCase();

    useEffect(() => {
        let mounted = true;
        const shouldRefreshOdds = options.refreshOdds !== false;

        const fetchMatches = async () => {
            try {
                if (shouldRefreshOdds) {
                    try {
                        await triggerOddsRefreshOnce();
                    } catch (refreshError) {
                        console.warn('useMatches: odds refresh failed', refreshError);
                    }
                }
                const data = (statusFilter === 'live' || statusFilter === 'active')
                    ? await getLiveMatches()
                    : await getMatches();

                const normalized = Array.isArray(data) ? data : [];
                let filtered = normalized;
                if (statusFilter === 'live' || statusFilter === 'active') {
                    filtered = normalized.filter(isLiveMatch);
                    if (filtered.length === 0 && normalized.length > 0) {
                        filtered = normalized;
                    }
                } else if (statusFilter === 'upcoming' || statusFilter === 'scheduled') {
                    filtered = normalized.filter(m => !isFinishedMatch(m) && isUpcomingMatch(m));
                } else if (statusFilter === 'live-upcoming' || statusFilter === 'active-upcoming') {
                    filtered = normalized.filter(m => !isFinishedMatch(m) && (isLiveMatch(m) || isUpcomingMatch(m) || (!isFinishedMatch(m) && !m.status)));
                }

                if (mounted) setMatches(filtered);
                window.dispatchEvent(new CustomEvent('matches:refresh-completed', { detail: { success: true } }));
            } catch (err) {
                console.error('useMatches: fetch error', err);
                window.dispatchEvent(new CustomEvent('matches:refresh-completed', { detail: { success: false, error: err.message } }));
            }
        };

        fetchMatches();

        const handleRefresh = () => {
            fetchMatches();
        };

        window.addEventListener('matches:refresh', handleRefresh);

        let eventSource = null;
        let pollingTimer = null;

        if (MATCH_STREAM_ENABLED && typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
            eventSource = new window.EventSource(`${API_URL}/matches/stream`);
            eventSource.addEventListener('matchUpdate', (event) => {
                let updatedMatch = null;
                try {
                    updatedMatch = JSON.parse(event.data);
                } catch (e) {
                    return;
                }
                console.debug('useMatches: received matchUpdate', updatedMatch);
                setMatches(prev => {
                    if (!updatedMatch) return prev;
                    let shouldKeep = true;
                    if (statusFilter === 'live' || statusFilter === 'active') {
                        shouldKeep = isLiveMatch(updatedMatch);
                    } else if (statusFilter === 'upcoming' || statusFilter === 'scheduled') {
                        shouldKeep = !isFinishedMatch(updatedMatch) && isUpcomingMatch(updatedMatch);
                    } else if (statusFilter === 'live-upcoming' || statusFilter === 'active-upcoming') {
                        shouldKeep = !isFinishedMatch(updatedMatch) && (isLiveMatch(updatedMatch) || isUpcomingMatch(updatedMatch) || (!isFinishedMatch(updatedMatch) && !updatedMatch?.status));
                    }
                    const id = updatedMatch.id || updatedMatch._id || updatedMatch.externalId;
                    const idx = prev.findIndex(m => (m.id === id) || (m._id === id) || (m.externalId === id));
                    if (!shouldKeep) {
                        if (idx >= 0) {
                            const copy = [...prev];
                            copy.splice(idx, 1);
                            return copy;
                        }
                        return prev;
                    }
                    if (idx >= 0) {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], ...updatedMatch };
                        return copy;
                    }
                    return [updatedMatch, ...prev];
                });
            });
            eventSource.onerror = () => {
                if (pollingTimer === null) {
                    pollingTimer = window.setInterval(fetchMatches, POLL_INTERVAL_MS);
                }
            };
        }

        if (pollingTimer === null) {
            pollingTimer = window.setInterval(fetchMatches, POLL_INTERVAL_MS);
        }

        return () => {
            mounted = false;
            if (pollingTimer !== null) {
                window.clearInterval(pollingTimer);
            }
            if (eventSource) {
                try { eventSource.close(); } catch (e) { }
            }
            window.removeEventListener('matches:refresh', handleRefresh);
        };
    }, [statusFilter, options.refreshOdds]);

    return matches;
}
