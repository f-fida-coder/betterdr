import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getMatches, getLiveMatches, API_URL } from '../api';

// Use backend origin explicitly to avoid Vite serving index.html on relative fetch
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '') || 'http://localhost:5000';

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

        const fetchMatches = async () => {
            try {
                const data = (statusFilter === 'live' || statusFilter === 'active')
                    ? await getLiveMatches()
                    : await getMatches();

                const normalized = Array.isArray(data) ? data : [];
                let filtered = normalized;
                if (statusFilter === 'live' || statusFilter === 'active') {
                    filtered = normalized.filter(isLiveMatch);
                } else if (statusFilter === 'live-upcoming' || statusFilter === 'active-upcoming') {
                    filtered = normalized.filter(m => !isFinishedMatch(m) && (isLiveMatch(m) || isUpcomingMatch(m) || (!isFinishedMatch(m) && !m.status)));
                }

                if (mounted) setMatches(filtered);
            } catch (err) {
                console.error('useMatches: fetch error', err);
            }
        };

        fetchMatches();

        // Force polling transport as websocket upgrade was failing in some dev setups
        const socket = io(SOCKET_URL, { transports: ['polling'], upgrade: false });

        socket.on('connect', () => {
            console.debug('useMatches: socket connected', socket.id, 'to', SOCKET_URL);
        });

        socket.on('connect_error', (err) => {
            console.warn('useMatches: socket connect_error', err && err.message ? err.message : err);
        });

        socket.on('disconnect', (reason) => {
            console.debug('useMatches: socket disconnected', reason);
        });

        socket.io && socket.io.on('reconnect_attempt', (attempt) => {
            console.debug('useMatches: reconnect attempt', attempt);
        });

        socket.on('matchUpdate', (updatedMatch) => {
            console.debug('useMatches: received matchUpdate', updatedMatch);
            setMatches(prev => {
                if (!updatedMatch) return prev;
                let shouldKeep = true;
                if (statusFilter === 'live' || statusFilter === 'active') {
                    shouldKeep = isLiveMatch(updatedMatch);
                } else if (statusFilter === 'live-upcoming' || statusFilter === 'active-upcoming') {
                    shouldKeep = !isFinishedMatch(updatedMatch) && (isLiveMatch(updatedMatch) || isUpcomingMatch(updatedMatch) || (!isFinishedMatch(updatedMatch) && !updatedMatch?.status));
                }
                // normalize id
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

        return () => {
            mounted = false;
            try { socket.disconnect(); } catch (e) {}
        };
    }, [statusFilter]);

    return matches;
}
