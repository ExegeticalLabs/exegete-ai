/**
 * Authoritative game engine for Cribbage Remote Deck
 * Implements all state transitions and validation per spec
 */

import {
  Card,
  CardPlay,
  CribbageState,
  Phase,
  PlayerId,
} from '../shared/types.js';
import {
  createDeck,
  shuffleDeck,
  getCardValue,
  compareForCut,
  verifyDeckIntegrity,
} from '../shared/deck.js';

/**
 * Create initial game state in LOBBY
 */
export function createInitialState(): CribbageState {
  return {
    phase: 'LOBBY',
    dealer: null,
    deck: [],
    hands: { A: [], B: [] },
    crib: [],
    starter: null,
    pegStack: [],
    pegCount: 0,
    goState: {
      A_canPlay: true,
      B_canPlay: true,
    },
    confirmations: {
      A_handDone: false,
      B_handDone: false,
      cribDone: false,
    },
    lastPlayedBy: null,
    pendingDiscards: { A: [], B: [] },
    discardConfirmed: { A: false, B: false },
  };
}

/**
 * Transition from LOBBY to CUT_FOR_DEAL when both players connected
 */
export function startCutForDeal(state: CribbageState): CribbageState {
  if (state.phase !== 'LOBBY') {
    throw new Error('Can only start cut-for-deal from LOBBY');
  }

  const deck = shuffleDeck(createDeck());

  return {
    ...state,
    phase: 'CUT_FOR_DEAL',
    deck,
    cutCards: {},
  };
}

/**
 * Handle a player cutting for deal
 */
export function cutForDeal(
  state: CribbageState,
  playerId: PlayerId
): CribbageState {
  if (state.phase !== 'CUT_FOR_DEAL') {
    throw new Error('Not in CUT_FOR_DEAL phase');
  }

  if (!state.cutCards) {
    state.cutCards = {};
  }

  if (state.cutCards[playerId]) {
    throw new Error(`Player ${playerId} already cut`);
  }

  if (state.deck.length === 0) {
    throw new Error('Deck is empty');
  }

  // Draw top card
  const newDeck = [...state.deck];
  const card = newDeck.shift()!;

  const newCutCards = { ...state.cutCards, [playerId]: card };

  // Check if both have cut
  if (newCutCards.A && newCutCards.B) {
    const comparison = compareForCut(newCutCards.A, newCutCards.B);

    if (comparison === 0) {
      // Tie - reshuffle and recut
      const freshDeck = shuffleDeck(createDeck());
      return {
        ...state,
        deck: freshDeck,
        cutCards: {},
      };
    }

    // Determine dealer (lower card wins)
    const dealer: PlayerId = comparison < 0 ? 'A' : 'B';

    // Reshuffle for actual deal
    const dealDeck = shuffleDeck(createDeck());

    return {
      ...state,
      phase: 'DEAL',
      dealer,
      deck: dealDeck,
      cutCards: newCutCards, // Keep for display
    };
  }

  return {
    ...state,
    deck: newDeck,
    cutCards: newCutCards,
  };
}

/**
 * Deal 6 cards to each player (dealer only)
 */
export function dealCards(
  state: CribbageState,
  dealerId: PlayerId
): CribbageState {
  if (state.phase !== 'DEAL') {
    throw new Error('Not in DEAL phase');
  }

  if (state.dealer !== dealerId) {
    throw new Error('Only dealer can deal');
  }

  const newDeck = [...state.deck];
  const handA: Card[] = [];
  const handB: Card[] = [];

  // Deal alternating: 6 to each
  for (let i = 0; i < 6; i++) {
    if (newDeck.length < 2) {
      throw new Error('Not enough cards in deck');
    }
    // Deal to non-dealer first (traditional)
    const pone = dealerId === 'A' ? 'B' : 'A';
    if (pone === 'A') {
      handA.push(newDeck.shift()!);
      handB.push(newDeck.shift()!);
    } else {
      handB.push(newDeck.shift()!);
      handA.push(newDeck.shift()!);
    }
  }

  return {
    ...state,
    phase: 'DISCARD',
    deck: newDeck,
    hands: { A: handA, B: handB },
    pendingDiscards: { A: [], B: [] },
    discardConfirmed: { A: false, B: false },
  };
}

/**
 * Set pending discards for a player
 */
export function setDiscard(
  state: CribbageState,
  playerId: PlayerId,
  cardIds: string[]
): CribbageState {
  if (state.phase !== 'DISCARD') {
    throw new Error('Not in DISCARD phase');
  }

  if (state.discardConfirmed[playerId]) {
    throw new Error('Already confirmed discards');
  }

  if (cardIds.length !== 2) {
    throw new Error('Must select exactly 2 cards');
  }

  // Verify ownership
  const hand = state.hands[playerId];
  for (const cardId of cardIds) {
    if (!hand.find((c) => c.id === cardId)) {
      throw new Error(`Card ${cardId} not in hand`);
    }
  }

  return {
    ...state,
    pendingDiscards: {
      ...state.pendingDiscards,
      [playerId]: cardIds,
    },
  };
}

/**
 * Confirm discards for a player
 */
export function confirmDiscard(
  state: CribbageState,
  playerId: PlayerId
): CribbageState {
  if (state.phase !== 'DISCARD') {
    throw new Error('Not in DISCARD phase');
  }

  if (state.discardConfirmed[playerId]) {
    throw new Error('Already confirmed discards');
  }

  if (state.pendingDiscards[playerId].length !== 2) {
    throw new Error('Must select exactly 2 cards first');
  }

  // Move cards from hand to crib
  const hand = state.hands[playerId];
  const discards = state.pendingDiscards[playerId];
  const newHand = hand.filter((c) => !discards.includes(c.id));
  const discardedCards = hand.filter((c) => discards.includes(c.id));

  const newState: CribbageState = {
    ...state,
    hands: {
      ...state.hands,
      [playerId]: newHand,
    },
    crib: [...state.crib, ...discardedCards],
    discardConfirmed: {
      ...state.discardConfirmed,
      [playerId]: true,
    },
  };

  // Check if both confirmed
  if (newState.discardConfirmed.A && newState.discardConfirmed.B) {
    return {
      ...newState,
      phase: 'CUT_STARTER',
    };
  }

  return newState;
}

/**
 * Cut starter card (pone only)
 */
export function cutStarter(
  state: CribbageState,
  playerId: PlayerId
): CribbageState {
  if (state.phase !== 'CUT_STARTER') {
    throw new Error('Not in CUT_STARTER phase');
  }

  // Only pone can cut
  const pone = state.dealer === 'A' ? 'B' : 'A';
  if (playerId !== pone) {
    throw new Error('Only pone can cut starter');
  }

  if (state.deck.length === 0) {
    throw new Error('Deck is empty');
  }

  const newDeck = [...state.deck];
  const starter = newDeck.shift()!;

  return {
    ...state,
    phase: 'PEGGING',
    deck: newDeck,
    starter,
    // Pone plays first
    lastPlayedBy: null,
    goState: {
      A_canPlay: true,
      B_canPlay: true,
    },
  };
}

/**
 * Determine whose turn it is during pegging
 */
export function getCurrentTurn(state: CribbageState): PlayerId | null {
  if (state.phase !== 'PEGGING') return null;

  const pone = state.dealer === 'A' ? 'B' : 'A';

  // If no cards played yet, pone goes first
  if (state.pegStack.length === 0) {
    return pone;
  }

  // If both players can't play, nobody's turn
  if (!state.goState.A_canPlay && !state.goState.B_canPlay) {
    return null;
  }

  // If one player can't play, other goes
  if (!state.goState.A_canPlay) return 'B';
  if (!state.goState.B_canPlay) return 'A';

  // Otherwise, alternate from last player
  if (state.lastPlayedBy === 'A') return 'B';
  if (state.lastPlayedBy === 'B') return 'A';

  // Fallback to pone
  return pone;
}

/**
 * Check if a player can legally play any card
 */
export function canPlayerPlay(
  state: CribbageState,
  playerId: PlayerId
): boolean {
  const hand = state.hands[playerId];
  if (hand.length === 0) return false;

  for (const card of hand) {
    const value = getCardValue(card);
    if (state.pegCount + value <= 31) {
      return true;
    }
  }
  return false;
}

/**
 * Play a card during pegging
 */
export function playCard(
  state: CribbageState,
  playerId: PlayerId,
  cardId: string
): CribbageState {
  if (state.phase !== 'PEGGING') {
    throw new Error('Not in PEGGING phase');
  }

  const currentTurn = getCurrentTurn(state);
  if (currentTurn !== playerId) {
    throw new Error('Not your turn');
  }

  // Find card
  const hand = state.hands[playerId];
  const card = hand.find((c) => c.id === cardId);
  if (!card) {
    throw new Error('Card not in hand');
  }

  // Check if legal
  const value = getCardValue(card);
  const newCount = state.pegCount + value;
  if (newCount > 31) {
    throw new Error('Would exceed 31');
  }

  // Remove from hand
  const newHand = hand.filter((c) => c.id !== cardId);
  const newPegStack = [
    ...state.pegStack,
    { by: playerId, card, newCount },
  ];

  let newState: CribbageState = {
    ...state,
    hands: {
      ...state.hands,
      [playerId]: newHand,
    },
    pegStack: newPegStack,
    pegCount: newCount,
    lastPlayedBy: playerId,
  };

  // Check for end of 0-31 run
  if (newCount === 31) {
    // Reset for next run
    newState = {
      ...newState,
      pegStack: [],
      pegCount: 0,
      goState: {
        A_canPlay: true,
        B_canPlay: true,
      },
      lastPlayedBy: playerId, // Next player leads (opposite of who hit 31)
    };
  }

  // Check if both hands empty -> end pegging
  if (newState.hands.A.length === 0 && newState.hands.B.length === 0) {
    return {
      ...newState,
      phase: 'SHOW_HANDS',
    };
  }

  return newState;
}

/**
 * Declare "go" when cannot play
 */
export function declareGo(
  state: CribbageState,
  playerId: PlayerId
): CribbageState {
  if (state.phase !== 'PEGGING') {
    throw new Error('Not in PEGGING phase');
  }

  const currentTurn = getCurrentTurn(state);
  if (currentTurn !== playerId) {
    throw new Error('Not your turn');
  }

  // Verify they truly can't play
  if (canPlayerPlay(state, playerId)) {
    throw new Error('You can still play a card');
  }

  const newGoState = {
    ...state.goState,
    [`${playerId}_canPlay`]: false,
  };

  let newState: CribbageState = {
    ...state,
    goState: newGoState,
  };

  // If both can't play, reset the run
  if (!newGoState.A_canPlay && !newGoState.B_canPlay) {
    // The player who did NOT play last starts the new run
    const otherPlayer: PlayerId = playerId === 'A' ? 'B' : 'A';

    newState = {
      ...newState,
      pegStack: [],
      pegCount: 0,
      goState: {
        A_canPlay: true,
        B_canPlay: true,
      },
      lastPlayedBy: state.lastPlayedBy, // Preserve for next run starter
    };

    // Check if game is over (both hands empty)
    if (newState.hands.A.length === 0 && newState.hands.B.length === 0) {
      return {
        ...newState,
        phase: 'SHOW_HANDS',
      };
    }
  }

  return newState;
}

/**
 * Mark hand as counted
 */
export function markHandDone(
  state: CribbageState,
  playerId: PlayerId
): CribbageState {
  if (state.phase !== 'SHOW_HANDS') {
    throw new Error('Not in SHOW_HANDS phase');
  }

  const newConfirmations = {
    ...state.confirmations,
    [`${playerId}_handDone`]: true,
  };

  const newState: CribbageState = {
    ...state,
    confirmations: newConfirmations,
  };

  // If both done, move to SHOW_CRIB
  if (newConfirmations.A_handDone && newConfirmations.B_handDone) {
    return {
      ...newState,
      phase: 'SHOW_CRIB',
    };
  }

  return newState;
}

/**
 * Mark crib as counted (dealer only)
 */
export function markCribDone(
  state: CribbageState,
  playerId: PlayerId
): CribbageState {
  if (state.phase !== 'SHOW_CRIB') {
    throw new Error('Not in SHOW_CRIB phase');
  }

  if (state.dealer !== playerId) {
    throw new Error('Only dealer can mark crib done');
  }

  return {
    ...state,
    phase: 'HAND_COMPLETE',
    confirmations: {
      ...state.confirmations,
      cribDone: true,
    },
  };
}

/**
 * Start next hand (dealer only, after HAND_COMPLETE)
 */
export function startNextHand(
  state: CribbageState,
  playerId: PlayerId
): CribbageState {
  if (state.phase !== 'HAND_COMPLETE') {
    throw new Error('Not in HAND_COMPLETE phase');
  }

  if (state.dealer !== playerId) {
    throw new Error('Only dealer can start next hand');
  }

  // Toggle dealer
  const newDealer: PlayerId = state.dealer === 'A' ? 'B' : 'A';

  // Fresh deck
  const deck = shuffleDeck(createDeck());

  return {
    phase: 'DEAL',
    dealer: newDealer,
    deck,
    hands: { A: [], B: [] },
    crib: [],
    starter: null,
    pegStack: [],
    pegCount: 0,
    goState: {
      A_canPlay: true,
      B_canPlay: true,
    },
    confirmations: {
      A_handDone: false,
      B_handDone: false,
      cribDone: false,
    },
    lastPlayedBy: null,
    pendingDiscards: { A: [], B: [] },
    discardConfirmed: { A: false, B: false },
  };
}

/**
 * Verify deck integrity - check all cards are accounted for
 */
export function checkDeckIntegrity(state: CribbageState): string[] {
  return verifyDeckIntegrity([
    state.deck,
    state.hands.A,
    state.hands.B,
    state.crib,
    state.starter ? [state.starter] : [],
    state.pegStack.map((p) => p.card),
  ]);
}
