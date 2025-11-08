/**
 * Shared types for Cribbage Remote Deck
 * Source of truth: docs/remote-deck-spec.md
 */

// ===== Card & Deck =====

export type Suit = 'C' | 'D' | 'H' | 'S';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;       // unique, e.g. "5H"
  rank: Rank;
  suit: Suit;
}

export type Deck = Card[];

// ===== Players & Roles =====

export type PlayerId = 'A' | 'B';

export interface Player {
  id: PlayerId;
  name?: string;
  connected: boolean;
}

export type Role = 'DEALER' | 'PONE';

// ===== Session =====

export interface Session {
  code: string;                 // short join code
  players: Record<PlayerId, Player | null>;
  state: CribbageState;
}

// ===== Game State (cribbage mode) =====

export type Phase =
  | 'LOBBY'
  | 'CUT_FOR_DEAL'
  | 'DEAL'
  | 'DISCARD'
  | 'CUT_STARTER'
  | 'PEGGING'
  | 'SHOW_HANDS'
  | 'SHOW_CRIB'
  | 'HAND_COMPLETE';

export interface CribbageState {
  phase: Phase;
  dealer: PlayerId | null;     // current dealer
  deck: Deck;                   // remaining undealt cards
  hands: Record<PlayerId, Card[]>;
  crib: Card[];
  starter: Card | null;
  pegStack: CardPlay[];         // cards played in current 0–31 sequence
  pegCount: number;             // running total 0–31
  goState: {
    A_canPlay: boolean;
    B_canPlay: boolean;
  };
  confirmations: {
    A_handDone: boolean;
    B_handDone: boolean;
    cribDone: boolean;
  };
  // For CUT_FOR_DEAL phase
  cutCards?: {
    A?: Card;
    B?: Card;
  };
  // Track who played last in pegging for "go" logic
  lastPlayedBy: PlayerId | null;
  // Track pending discard selections (server-side tracking)
  pendingDiscards: {
    A: string[];  // card IDs
    B: string[];
  };
  discardConfirmed: {
    A: boolean;
    B: boolean;
  };
}

export interface CardPlay {
  by: PlayerId;
  card: Card;
  newCount: number;
}

// ===== Messages: Client → Server =====

export type ClientMessage =
  | { type: 'CREATE_SESSION'; code?: string }
  | { type: 'JOIN_SESSION'; code: string; name?: string }
  | { type: 'CUT_FOR_DEAL' }
  | { type: 'START_DEAL' }            // dealer only
  | { type: 'SET_DISCARD'; cards: string[] }
  | { type: 'CONFIRM_DISCARD' }
  | { type: 'CUT_STARTER' }          // pone only
  | { type: 'PLAY_CARD'; cardId: string }
  | { type: 'DECLARE_GO' }
  | { type: 'HAND_DONE' }            // for that player
  | { type: 'CRIB_DONE' }            // dealer only
  | { type: 'START_NEXT_HAND' };     // dealer only, after all done

// ===== Messages: Server → Client =====

export type ServerMessage =
  | { type: 'SESSION_STATE'; session: PublicSessionView }
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'INFO'; message: string };

export interface PublicSessionView {
  code: string;
  you: PlayerId;
  players: { A: PlayerSummary | null; B: PlayerSummary | null };
  dealer: PlayerId | null;
  phase: Phase;
  // cards:
  yourHand: Card[];
  opponentHandCount: number;      // but not their cards
  cribCount: number;              // but cards hidden until SHOW_CRIB
  cribCards?: Card[];             // only visible in SHOW_CRIB
  starter: Card | null;
  pegCount: number;
  pegStack: CardPlay[];
  // For CUT_FOR_DEAL
  cutCards?: {
    A?: Card;
    B?: Card;
  };
  // misc:
  confirmations: {
    youHandDone: boolean;
    oppHandDone: boolean;
    cribDone: boolean;
  };
  // Discard state
  yourPendingDiscards: string[];
  yourDiscardConfirmed: boolean;
  oppDiscardConfirmed: boolean;
  // Turn tracking for pegging
  currentTurn: PlayerId | null;
  canYouPlay: boolean;
}

export interface PlayerSummary {
  name?: string;
  connected: boolean;
}
