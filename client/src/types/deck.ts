/**
 * Deck utilities for creating and manipulating cards
 */

import { Card, Deck, Rank, Suit } from './types.js';

const SUITS: Suit[] = ['C', 'D', 'H', 'S'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Create a fresh standard 52-card deck
 */
export function createDeck(): Deck {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit}`,
        rank,
        suit
      });
    }
  }
  return deck;
}

/**
 * Shuffle a deck using Fisher-Yates algorithm
 * Server-side only - uses Math.random (could be crypto.randomBytes for production)
 */
export function shuffleDeck(deck: Deck): Deck {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get the numeric value of a card for pegging (A=1, face cards=10)
 */
export function getCardValue(card: Card): number {
  if (card.rank === 'A') return 1;
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
  return parseInt(card.rank, 10);
}

/**
 * Get the rank value for comparison (A=1, 2=2, ..., K=13)
 */
export function getRankValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank, 10);
}

/**
 * Compare two cards for cut-for-deal (lower is better)
 */
export function compareForCut(a: Card, b: Card): number {
  return getRankValue(a.rank) - getRankValue(b.rank);
}

/**
 * Get suit symbol for display
 */
export function getSuitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    'C': '♣',
    'D': '♦',
    'H': '♥',
    'S': '♠'
  };
  return symbols[suit];
}

/**
 * Format a card for display
 */
export function formatCard(card: Card): string {
  return `${card.rank}${getSuitSymbol(card.suit)}`;
}

/**
 * Verify deck integrity (no duplicates, all 52 cards)
 * Returns array of error messages (empty if valid)
 */
export function verifyDeckIntegrity(allCards: Card[][]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  // Flatten all card arrays
  const flat = allCards.flat();

  // Check for duplicates
  for (const card of flat) {
    if (seen.has(card.id)) {
      errors.push(`Duplicate card: ${card.id}`);
    }
    seen.add(card.id);
  }

  // Check total count
  if (flat.length !== 52) {
    errors.push(`Expected 52 cards, found ${flat.length}`);
  }

  return errors;
}
