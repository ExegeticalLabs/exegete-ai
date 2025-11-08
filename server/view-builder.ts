/**
 * Build filtered public views for each player
 * Implements visibility rules from spec
 */

import { Session, PlayerId, PublicSessionView, PlayerSummary } from '../shared/types.js';
import { getCurrentTurn, canPlayerPlay } from './game-engine.js';

/**
 * Build a public session view for a specific player
 * This enforces what each player can see
 */
export function buildPublicView(
  session: Session,
  forPlayer: PlayerId
): PublicSessionView {
  const { state } = session;
  const otherPlayer: PlayerId = forPlayer === 'A' ? 'B' : 'A';

  // Build player summaries
  const playerSummaries: { A: PlayerSummary | null; B: PlayerSummary | null } = {
    A: session.players.A
      ? {
          name: session.players.A.name,
          connected: session.players.A.connected,
        }
      : null,
    B: session.players.B
      ? {
          name: session.players.B.name,
          connected: session.players.B.connected,
        }
      : null,
  };

  // Determine crib visibility
  let cribCards = undefined;
  if (state.phase === 'SHOW_CRIB') {
    cribCards = state.crib;
  }

  // Determine current turn
  const currentTurn = getCurrentTurn(state);
  const canYouPlay = state.phase === 'PEGGING' ? canPlayerPlay(state, forPlayer) : false;

  return {
    code: session.code,
    you: forPlayer,
    players: playerSummaries,
    dealer: state.dealer,
    phase: state.phase,
    // Cards - filtered
    yourHand: state.hands[forPlayer],
    opponentHandCount: state.hands[otherPlayer].length,
    cribCount: state.crib.length,
    cribCards,
    starter: state.starter,
    pegCount: state.pegCount,
    pegStack: state.pegStack,
    // Cut cards (visible during CUT_FOR_DEAL)
    cutCards: state.cutCards,
    // Confirmations
    confirmations: {
      youHandDone: state.confirmations[`${forPlayer}_handDone`],
      oppHandDone: state.confirmations[`${otherPlayer}_handDone`],
      cribDone: state.confirmations.cribDone,
    },
    // Discard state
    yourPendingDiscards: state.pendingDiscards[forPlayer],
    yourDiscardConfirmed: state.discardConfirmed[forPlayer],
    oppDiscardConfirmed: state.discardConfirmed[otherPlayer],
    // Turn tracking
    currentTurn,
    canYouPlay,
  };
}
