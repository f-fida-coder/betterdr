import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_RECONNECT_ATTEMPTS = 8;
const DEFAULT_BASE_RECONNECT_DELAY_MS = 1000;
const DEFAULT_HEARTBEAT_MS = 25000;

const normalizeChannel = (value) => String(value || '').trim();

function resolveWsUrl(explicitUrl) {
  if (explicitUrl && String(explicitUrl).trim() !== '') {
    return String(explicitUrl).trim();
  }

  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl && String(envUrl).trim() !== '') {
    return String(envUrl).trim();
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  const port = import.meta.env.VITE_WS_PORT || '5001';
  return `${protocol}//${host}:${port}`;
}

/**
 * Realtime WebSocket hook for odds/settlement updates.
 *
 * @param {Object} config
 * @param {string} config.channel Channel to subscribe to (supports '*' wildcard on server)
 * @param {string} [config.url] Optional explicit ws URL; falls back to VITE_WS_URL or protocol://host:5001
 * @param {Function} [config.onMessage] Called with parsed incoming payload
 * @param {boolean} [config.enabled=true] Set false to disable socket activity
 * @param {number} [config.maxReconnectAttempts=8]
 * @param {number} [config.baseReconnectDelayMs=1000]
 * @returns {{
 *   isConnected:boolean,
 *   connectionState:string,
 *   lastMessage:Object|null,
 *   send:(payload:Object)=>boolean,
 *   reconnect:()=>void,
 *   disconnect:()=>void
 * }}
 */
export function useWebSocket({
  channel,
  url,
  onMessage,
  enabled = true,
  maxReconnectAttempts = DEFAULT_RECONNECT_ATTEMPTS,
  baseReconnectDelayMs = DEFAULT_BASE_RECONNECT_DELAY_MS,
} = {}) {
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const manualCloseRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('idle');
  const [lastMessage, setLastMessage] = useState(null);

  const wsUrl = useMemo(() => resolveWsUrl(url), [url]);
  const normalizedChannel = useMemo(() => normalizeChannel(channel), [channel]);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const send = useCallback((payload) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      socket.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    clearTimers();
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState <= WebSocket.OPEN) {
      try {
        if (normalizedChannel) {
          socket.send(JSON.stringify({ type: 'unsubscribe', channel: normalizedChannel }));
        }
      } catch {
        // no-op
      }
      socket.close();
    }
    setIsConnected(false);
    setConnectionState('closed');
  }, [clearTimers, normalizedChannel]);

  const connect = useCallback(() => {
    if (!enabled || !wsUrl || typeof window === 'undefined') {
      return;
    }

    manualCloseRef.current = false;
    setConnectionState('connecting');

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        setConnectionState('open');

        if (normalizedChannel) {
          send({ type: 'subscribe', channel: normalizedChannel });
        }

        heartbeatTimerRef.current = setInterval(() => {
          send({ type: 'ping' });
        }, DEFAULT_HEARTBEAT_MS);
      };

      socket.onmessage = (event) => {
        if (!event?.data) return;

        try {
          const payload = JSON.parse(event.data);
          setLastMessage(payload);
          if (typeof onMessage === 'function') {
            onMessage(payload);
          }
        } catch {
          // ignore invalid message format
        }
      };

      socket.onerror = () => {
        setConnectionState('error');
      };

      socket.onclose = () => {
        clearTimers();
        setIsConnected(false);
        setConnectionState('closed');

        if (manualCloseRef.current || !enabled) {
          return;
        }

        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current > maxReconnectAttempts) {
          setConnectionState('failed');
          return;
        }

        const exp = reconnectAttemptsRef.current - 1;
        const delay = Math.min(30000, baseReconnectDelayMs * (2 ** exp));
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch {
      setConnectionState('failed');
    }
  }, [baseReconnectDelayMs, clearTimers, enabled, maxReconnectAttempts, normalizedChannel, onMessage, send, wsUrl]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    connect();

    // Visibility-based connection management: disconnect when the tab is
    // hidden (saves a server-side WS connection + 25s heartbeat traffic for
    // every idle user), reconnect as soon as the tab comes back into focus.
    // On reconnect, the app re-subscribes and the next realtime event / poll
    // cycle refreshes any stale data, so no data is lost.
    const handleVisibility = () => {
      if (document.hidden) {
        disconnect();
      } else {
        // Reset attempts so the first reconnect after un-hiding is immediate.
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    send,
    reconnect,
    disconnect,
  };
}

export default useWebSocket;
