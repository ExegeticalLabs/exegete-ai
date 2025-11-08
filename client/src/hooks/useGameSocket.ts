/**
 * WebSocket hook for game communication
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClientMessage,
  ServerMessage,
  PublicSessionView,
} from '../types/types';

const WS_URL = 'ws://localhost:8080';

interface UseGameSocketReturn {
  connected: boolean;
  session: PublicSessionView | null;
  error: string | null;
  info: string | null;
  send: (message: ClientMessage) => void;
  reconnect: () => void;
}

export function useGameSocket(): UseGameSocketReturn {
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<PublicSessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    console.log('Connecting to', WS_URL);
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(null);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('Connection error');
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'SESSION_STATE':
            setSession(message.session);
            setError(null);
            break;

          case 'ERROR':
            setError(`${message.code}: ${message.message}`);
            console.error('Server error:', message);
            break;

          case 'INFO':
            setInfo(message.message);
            console.log('Server info:', message.message);
            // Clear info after a few seconds
            setTimeout(() => setInfo(null), 5000);
            break;
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    wsRef.current = ws;
  }, []);

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
      setError('Not connected to server');
    }
  }, []);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    connected,
    session,
    error,
    info,
    send,
    reconnect,
  };
}
