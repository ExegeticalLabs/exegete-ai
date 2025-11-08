/**
 * Card component - displays a playing card
 */

import { Card as CardType } from '../types/types';
import { getSuitSymbol } from '../types/deck';

interface CardProps {
  card: CardType;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  onClick,
  style,
}: CardProps) {
  const suit = card.suit;
  const isRed = suit === 'D' || suit === 'H';
  const symbol = getSuitSymbol(suit);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  if (faceDown) {
    return (
      <div
        className="card card-back"
        style={style}
      >
        <div className="card-pattern"></div>
      </div>
    );
  }

  return (
    <div
      className={`card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${isRed ? 'red' : 'black'}`}
      onClick={handleClick}
      style={{
        cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <div className="card-corner top-left">
        <div className="rank">{card.rank}</div>
        <div className="suit">{symbol}</div>
      </div>
      <div className="card-center">
        <div className="suit-large">{symbol}</div>
      </div>
      <div className="card-corner bottom-right">
        <div className="rank">{card.rank}</div>
        <div className="suit">{symbol}</div>
      </div>
    </div>
  );
}
