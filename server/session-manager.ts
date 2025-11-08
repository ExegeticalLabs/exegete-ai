/**
 * Session manager - handles multiple game sessions
 */

import { PlayerId, Session, Player } from '../shared/types.js';
import { createInitialState } from './game-engine.js';

// In-memory session store
const sessions = new Map<string, Session>();

/**
 * Generate a random 4-letter room code
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new session
 */
export function createSession(code?: string): Session {
  const sessionCode = code || generateCode();

  if (sessions.has(sessionCode)) {
    throw new Error(`Session ${sessionCode} already exists`);
  }

  const session: Session = {
    code: sessionCode,
    players: {
      A: null,
      B: null,
    },
    state: createInitialState(),
  };

  sessions.set(sessionCode, session);
  return session;
}

/**
 * Get a session by code
 */
export function getSession(code: string): Session | undefined {
  return sessions.get(code);
}

/**
 * Join a session as a player
 */
export function joinSession(
  code: string,
  name?: string
): { session: Session; playerId: PlayerId } {
  const session = sessions.get(code);
  if (!session) {
    throw new Error(`Session ${code} not found`);
  }

  // Find available slot
  let playerId: PlayerId;
  if (!session.players.A) {
    playerId = 'A';
  } else if (!session.players.B) {
    playerId = 'B';
  } else {
    throw new Error('Session is full');
  }

  const player: Player = {
    id: playerId,
    name,
    connected: true,
  };

  session.players[playerId] = player;

  return { session, playerId };
}

/**
 * Reconnect a player to a session
 */
export function reconnectPlayer(
  code: string,
  playerId: PlayerId
): Session {
  const session = sessions.get(code);
  if (!session) {
    throw new Error(`Session ${code} not found`);
  }

  const player = session.players[playerId];
  if (!player) {
    throw new Error(`Player ${playerId} not in session`);
  }

  player.connected = true;
  return session;
}

/**
 * Disconnect a player
 */
export function disconnectPlayer(
  code: string,
  playerId: PlayerId
): void {
  const session = sessions.get(code);
  if (!session) return;

  const player = session.players[playerId];
  if (player) {
    player.connected = false;
  }
}

/**
 * Update session state
 */
export function updateSession(code: string, session: Session): void {
  sessions.set(code, session);
}

/**
 * Delete a session (cleanup)
 */
export function deleteSession(code: string): void {
  sessions.delete(code);
}

/**
 * Get all active sessions (for debugging)
 */
export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}

/**
 * Check if both players are connected
 */
export function areBothPlayersConnected(session: Session): boolean {
  return !!(session.players.A?.connected && session.players.B?.connected);
}
