import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getMatches, API_URL } from '../api';

// Use backend origin explicitly to avoid Vite serving index.html on relative fetch
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '') || 'http://localhost:5000';

// Hook: fetch initial matches and subscribe to live match updates
export default function useMatches() {
    const [matches, setMatches] = useState([]);

    useEffect(() => {
        let mounted = true;

        const fetchMatches = async () => {
            try {
                const data = await getMatches();
                if (mounted) setMatches(Array.isArray(data) ? data : []);
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
                // normalize id
                const id = updatedMatch.id || updatedMatch._id || updatedMatch.externalId;
                const idx = prev.findIndex(m => (m.id === id) || (m._id === id) || (m.externalId === id));
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
    }, []);

    return matches;
}
