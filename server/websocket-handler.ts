/**
 * WebSocket message handler
 * Routes client messages to game engine and sends responses
 */

import { WebSocket } from 'ws';
import {
  ClientMessage,
  ServerMessage,
  PlayerId,
  Session,
} from '../shared/types.js';
import {
  createSession,
  getSession,
  joinSession,
  updateSession,
  reconnectPlayer,
  areBothPlayersConnected,
} from './session-manager.js';
import {
  startCutForDeal,
  cutForDeal,
  dealCards,
  setDiscard,
  confirmDiscard,
  cutStarter,
  playCard,
  declareGo,
  markHandDone,
  markCribDone,
  startNextHand,
  checkDeckIntegrity,
} from './game-engine.js';
import { buildPublicView } from './view-builder.js';

// Map websocket connections to their player identity
const connections = new Map<
  WebSocket,
  { sessionCode: string; playerId: PlayerId }
>();

/**
 * Send a message to a specific client
 */
function sendToClient(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Send ERROR message
 */
function sendError(ws: WebSocket, code: string, message: string): void {
  sendToClient(ws, { type: 'ERROR', code, message });
}

/**
 * Send INFO message
 */
function sendInfo(ws: WebSocket, message: string): void {
  sendToClient(ws, { type: 'INFO', message });
}

/**
 * Broadcast session state to all connected players
 */
function broadcastSessionState(
  sessionCode: string,
  allConnections: Map<WebSocket, { sessionCode: string; playerId: PlayerId }>
): void {
  const session = getSession(sessionCode);
  if (!session) return;

  // Send filtered view to each player
  for (const [ws, identity] of allConnections.entries()) {
    if (identity.sessionCode === sessionCode) {
      const view = buildPublicView(session, identity.playerId);
      sendToClient(ws, { type: 'SESSION_STATE', session: view });
    }
  }
}

/**
 * Handle a client message
 */
export function handleMessage(
  ws: WebSocket,
  data: string,
  allConnections: Map<WebSocket, { sessionCode: string; playerId: PlayerId }>
): void {
  let message: ClientMessage;

  try {
    message = JSON.parse(data);
  } catch (err) {
    sendError(ws, 'INVALID_JSON', 'Invalid JSON');
    return;
  }

  try {
    switch (message.type) {
      case 'CREATE_SESSION': {
        const session = createSession(message.code);
        const { playerId } = joinSession(session.code, undefined);

        // Store connection identity
        allConnections.set(ws, {
          sessionCode: session.code,
          playerId,
        });

        // Send initial state
        const view = buildPublicView(session, playerId);
        sendToClient(ws, { type: 'SESSION_STATE', session: view });
        sendInfo(ws, `Created session ${session.code} as Player ${playerId}`);
        break;
      }

      case 'JOIN_SESSION': {
        const { code, name } = message;
        const { session, playerId } = joinSession(code, name);

        // Store connection identity
        allConnections.set(ws, {
          sessionCode: session.code,
          playerId,
        });

        // If both players now connected, start cut-for-deal
        if (areBothPlayersConnected(session)) {
          session.state = startCutForDeal(session.state);
          updateSession(session.code, session);
        }

        // Broadcast to all
        broadcastSessionState(session.code, allConnections);
        sendInfo(ws, `Joined session ${session.code} as Player ${playerId}`);
        break;
      }

      case 'CUT_FOR_DEAL': {
        const identity = allConnections.get(ws);
        if (!identity) {
          sendError(ws, 'NOT_IN_SESSION', 'Not in a session');
          return;
        }

        const session = getSession(identity.sessionCode);
        if (!session) {
          sendError(ws, 'SESSION_NOT_FOUND', 'Session not found');
          return;
        }

        session.state = cutForDeal(session.state, identity.playerId);
        updateSession(session.code, session);

        // Check deck integrity in dev mode
        const errors = checkDeckIntegrity(session.state);
        if (errors.length > 0) {
          console.error('Deck integrity errors:', errors);
        }

        broadcastSessionState(session.code, allConnections);
        break;
      }

      case 'START_DEAL': {
        const identity = allConnections.get(ws);
        if (!identity) {
          sendError(ws, 'NOT_IN_SESSION', 'Not in a session');
          return;
        }

        const session = getSession(identity.sessionCode);
        if (!session) {
          sendError(ws, 'SESSION_NOT_FOUND', 'Session not found');
          return;
        }

        session.state = dealCards(session.state, identity.playerId);
        updateSession(session.code, session);

        const errors = checkDeckIntegrity(session.state);
        if (errors.length > 0) {
          console.error('Deck integrity errors:', errors);
        }

        broadcastSessionState(session.code, allConnections);
        break;
      }

      case 'SET_DISCARD': {
        const identity = allConnections.get(ws);
        if (!identity) {
          sendError(ws, 'NOT_IN_SESSION', 'Not in a session');
          return;
        }

        const session = getSession(identity.sessionCode);
        if (!session) {
          sendError(ws, 'SESSION_NOT_FOUND', 'Session not found');
          return;
        }

        session.state = setDiscard(
          session.state,
          identity.playerId,
          message.cards
        );
        updateSession(session.code, session);
        broadcastSessionState(session.code, allConnections);
        break;
      }

      case 'CONFIRM_DISCARD': {
        const identity = allConnections.get(ws);
        if (!identity) {
          sendError(ws, 'NOT_IN_SESSION', 'Not in a session');
          return;
        }

        const session = getSession(identity.sessionCode);
        if (!session) {
          sendError(ws, 'SESSION_NOT_FOUND', 'Session not found');
          return;
        }

        session.state = confirmDiscard(session.state, identity.playerId);
        updateSession(session.code, session);

        const errors = checkDeckIntegrity(session.state);
        if (errors.length > 0) {
          console.error('Deck integrity errors:', errors);
        }

        broadcastSessionState(session.code, allConnections);
        break;
      }

      case 'CUT_STARTER': {
        const identity = allConnections.get(ws);
        if (!identity) {
          sendError(ws, 'NOT_IN_SESSION', 'Not in a session');
          return;
        }

        const session = getSession(identity.sessionCode);
        if (!session) {
          sendError(ws, 'SESSION_NOT_FOUND', 'Session not found');
          return;
        }

        session.state = cutStarter(session.state, identity.playerId);
        updateSession(session.code, session);

        const errors = checkDeckIntegrity(session.state);
        if (errors.length > 0) {
          console.error('Deck integrity errors:', errors);
        }

        broadcastSessionState(session.code, allConnections);
        break;
      }

      case 'PLAY_CARD': {
        const identity = allConnections.get(ws);
        if (!identity) {
          sendError(ws, 'NOT_IN_SESSION', 'Not in a session');
          return;
        }

        const session = getSession(identity.sessionCode);
        if (!session) {
          sendError(ws, 'SESSION_NOT_FOUND', 'Session not found');
          return;
        }

        session.state = playCard(
          session.state,
          identity.playerId,
          message.cardId
        );
        updateSession(session.code, session);

        const errors = checkDeckIntegrity(session.state);
        if (errors.length > 0) {
          console.error('Deck integrity errors:', errors);
        }

        broadcastSessionState(session.code, allConnections);
        break;
      }

      case 'DECLARE_GO': {
        const identity = allConnections.get(ws);
        if (!identity) {
          sendError(ws, 'NOT_IN_SESSION', 'Not in a session');
          return;
        }

        const session = getSession(identity.sessionCode);
        if (!session) {
          sendError(ws, 'SESSION_NOT_FOUND', 'Session not found');
          return;
        }

        session.state = declareGo(session.state, identity.playerId);
        updateSession(session.code, session);
        broadcastSessionState(session.code, allConnections);
        break;
      }

      case 'HAND_DONE': {
        const identity = allConnections.get(ws);
        if (!identity) {
          sendError(ws, 'NOT_IN_SESSION', 'Not in a session');
          return;
        }

        const session = getSession(identity.sessionCode);
        if (!session) {
          sendError(ws, 'SESSION_NOT_FOUND', 'Session not found');
          return;
        }

        session.state = markHandDone(session.state, identity.playerId);
        updateSession(session.code, session);
        broadcastSessionState(session.code, allConnections);
        break;
      }

      case 'CRIB_DONE': {
        const identity = allConnections.get(ws);
        if (!identity) {
          sendError(ws, 'NOT_IN_SESSION', 'Not in a session');
          return;
        }

        const session = getSession(identity.sessionCode);
        if (!session) {
          sendError(ws, 'SESSION_NOT_FOUND', 'Session not found');
          return;
        }

        session.state = markCribDone(session.state, identity.playerId);
        updateSession(session.code, session);
        broadcastSessionState(session.code, allConnections);
        break;
      }

      case 'START_NEXT_HAND': {
        const identity = allConnections.get(ws);
        if (!identity) {
          sendError(ws, 'NOT_IN_SESSION', 'Not in a session');
          return;
        }

        const session = getSession(identity.sessionCode);
        if (!session) {
          sendError(ws, 'SESSION_NOT_FOUND', 'Session not found');
          return;
        }

        session.state = startNextHand(session.state, identity.playerId);
        updateSession(session.code, session);

        const errors = checkDeckIntegrity(session.state);
        if (errors.length > 0) {
          console.error('Deck integrity errors:', errors);
        }

        broadcastSessionState(session.code, allConnections);
        break;
      }

      default:
        sendError(ws, 'UNKNOWN_MESSAGE', 'Unknown message type');
    }
  } catch (err) {
    const error = err as Error;
    sendError(ws, 'GAME_ERROR', error.message);
    console.error('Error handling message:', error);
  }
}

/**
 * Handle client connection
 */
export function handleConnection(ws: WebSocket): void {
  sendInfo(ws, 'Connected to Cribbage Remote Deck server');
}

/**
 * Handle client disconnection
 */
export function handleDisconnection(
  ws: WebSocket,
  allConnections: Map<WebSocket, { sessionCode: string; playerId: PlayerId }>
): void {
  const identity = allConnections.get(ws);
  if (identity) {
    console.log(
      `Player ${identity.playerId} disconnected from session ${identity.sessionCode}`
    );
    // Could mark as disconnected in session manager
    allConnections.delete(ws);
  }
}

export { connections };
