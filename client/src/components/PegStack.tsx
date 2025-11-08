/**
 * PegStack component - displays pegging cards and running count
 */

import { CardPlay } from '../types/types';
import { Card } from './Card';

interface PegStackProps {
  stack: CardPlay[];
  currentCount: number;
}

export function PegStack({ stack, currentCount }: PegStackProps) {
  return (
    <div className="peg-stack-container">
      <div className="peg-stack">
        {stack.length === 0 ? (
          <div className="empty-stack">No cards played</div>
        ) : (
          stack.map((play, index) => (
            <div key={index} className="peg-play">
              <Card
                card={play.card}
                style={{
                  marginLeft: index > 0 ? '-40px' : '0',
                }}
              />
              <div className="play-info">
                <span className="player-badge">{play.by}</span>
                <span className="count">{play.newCount}</span>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="current-count">
        <div className="count-label">Count:</div>
        <div className="count-value">{currentCount}</div>
      </div>
    </div>
  );
}
