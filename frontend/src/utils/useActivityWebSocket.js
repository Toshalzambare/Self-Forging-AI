import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config.js';
import { getAccessToken, getStoredUser, refreshTokens } from './api.js';

const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
const MAX_BUFFERED_EVENTS = 100;

/**
 * useActivityWebSocket:
 * Connects to the real-time agent lifecycle WebSocket stream.
 * Automatically handles reconnection, keepalive pings, and event buffering.
 */
export const useActivityWebSocket = () => {
  const [events, setEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'connecting' | 'disconnected'
  const [isPaused, setIsPaused] = useState(false);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const backoffRef = useRef(1000);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const connect = useCallback(() => {
    const user = getStoredUser();
    const token = getAccessToken();

    if (!user || !user.id || !token) {
      setConnectionStatus('disconnected');
      return;
    }

    // Clean up any existing connection
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }

    setConnectionStatus('connecting');
    const wsUrl = `${WS_BASE_URL}/ws/logs/${user.id}?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        backoffRef.current = 1000; // Reset backoff delay

        // Start ping interval
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;

        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'AGENT_LIFECYCLE_EVENT') {
            if (!isPausedRef.current) {
              setEvents((prev) => [payload, ...prev].slice(0, MAX_BUFFERED_EVENTS));
            }
          }
        } catch (err) {
          console.warn('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = async (event) => {
        setConnectionStatus('disconnected');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // If closed due to token expiry, refresh token and reconnect
        if (event.code === 4001 || event.code === 4003) {
          try {
            await refreshTokens();
            reconnectTimeoutRef.current = setTimeout(connect, 1000);
          } catch {
            // Refresh failed; user must re-authenticate
          }
          return;
        }

        const delay = Math.min(backoffRef.current, 10000);
        backoffRef.current = delay * 1.5;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket encountered error:', err);
        ws.close();
      };
    } catch (err) {
      console.warn('WebSocket connection attempt failed:', err);
      setConnectionStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    events,
    connectionStatus,
    clearEvents,
    isPaused,
    setIsPaused,
  };
};

export default useActivityWebSocket;
