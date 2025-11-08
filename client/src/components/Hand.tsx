/**
 * Hand component - displays a hand of cards
 */

import { Card as CardType } from '../types/types';
import { Card } from './Card';
import { getRankValue } from '../types/deck';

interface HandProps {
  cards: CardType[];
  faceDown?: boolean;
  selectedCards?: string[];
  disabledCards?: string[];
  onCardClick?: (cardId: string) => void;
  sorted?: boolean;
}

export function Hand({
  cards,
  faceDown = false,
  selectedCards = [],
  disabledCards = [],
  onCardClick,
  sorted = true,
}: HandProps) {
  // Sort cards by rank if requested
  const displayCards = sorted
    ? [...cards].sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank))
    : cards;

  const cardSpacing = Math.min(60, Math.max(30, 300 / Math.max(cards.length, 1)));

  return (
    <div className="hand">
      {displayCards.map((card, index) => (
        <Card
          key={card.id}
          card={card}
          faceDown={faceDown}
          selected={selectedCards.includes(card.id)}
          disabled={disabledCards.includes(card.id)}
          onClick={onCardClick ? () => onCardClick(card.id) : undefined}
          style={{
            marginLeft: index > 0 ? `-${80 - cardSpacing}px` : '0',
            zIndex: index,
          }}
        />
      ))}
      {cards.length === 0 && !faceDown && (
        <div className="empty-hand">No cards</div>
      )}
    </div>
  );
}

/**
 * Component for showing face-down opponent cards
 */
export function OpponentHand({ count }: { count: number }) {
  const fakeCards: CardType[] = Array.from({ length: count }, (_, i) => ({
    id: `back-${i}`,
    rank: 'A',
    suit: 'C',
  }));

  return <Hand cards={fakeCards} faceDown={true} sorted={false} />;
}
