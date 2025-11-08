/**
 * GameTable component - main game interface
 */

import { useState, useMemo } from 'react';
import { PublicSessionView, ClientMessage, Card as CardType } from '../types/types';
import { Hand, OpponentHand } from './Hand';
import { Card } from './Card';
import { PegStack } from './PegStack';
import { getCardValue } from '../types/deck';

interface GameTableProps {
  session: PublicSessionView;
  send: (message: ClientMessage) => void;
}

export function GameTable({ session, send }: GameTableProps) {
  const [selectedDiscards, setSelectedDiscards] = useState<string[]>([]);

  const { phase, you, dealer, players } = session;
  const opponent = you === 'A' ? 'B' : 'A';
  const isPone = dealer !== null && dealer !== you;
  const isDealer = dealer === you;

  // Phase messages
  const getPhaseMessage = (): string => {
    switch (phase) {
      case 'LOBBY':
        return 'Waiting for opponent...';
      case 'CUT_FOR_DEAL':
        return 'Cut for first deal';
      case 'DEAL':
        return isDealer ? 'Your deal - click to shuffle & deal' : 'Waiting for dealer...';
      case 'DISCARD':
        return 'Select 2 cards for the crib';
      case 'CUT_STARTER':
        return isPone ? 'Cut for starter' : 'Waiting for pone to cut...';
      case 'PEGGING':
        return 'Pegging';
      case 'SHOW_HANDS':
        return 'Count your hand';
      case 'SHOW_CRIB':
        return isDealer ? 'Count your crib' : 'Dealer counting crib';
      case 'HAND_COMPLETE':
        return isDealer ? 'Start next hand' : 'Waiting for next hand...';
      default:
        return '';
    }
  };

  // Discard selection
  const handleCardClick = (cardId: string) => {
    if (phase !== 'DISCARD') return;
    if (session.yourDiscardConfirmed) return;

    if (selectedDiscards.includes(cardId)) {
      setSelectedDiscards(selectedDiscards.filter((id) => id !== cardId));
    } else if (selectedDiscards.length < 2) {
      const newSelection = [...selectedDiscards, cardId];
      setSelectedDiscards(newSelection);
      // Auto-send SET_DISCARD
      send({ type: 'SET_DISCARD', cards: newSelection });
    }
  };

  const handleConfirmDiscards = () => {
    if (selectedDiscards.length === 2) {
      send({ type: 'CONFIRM_DISCARD' });
    }
  };

  // Pegging
  const handlePlayCard = (cardId: string) => {
    if (phase !== 'PEGGING') return;
    send({ type: 'PLAY_CARD', cardId });
  };

  const handleDeclareGo = () => {
    send({ type: 'DECLARE_GO' });
  };

  // Determine which cards can be played during pegging
  const playableCards = useMemo(() => {
    if (phase !== 'PEGGING') return [];
    if (session.currentTurn !== you) return [];

    return session.yourHand.filter((card) => {
      const value = getCardValue(card);
      return session.pegCount + value <= 31;
    }).map(c => c.id);
  }, [phase, session.currentTurn, session.yourHand, session.pegCount, you]);

  const disabledCards = useMemo(() => {
    if (phase !== 'PEGGING') return [];
    return session.yourHand.filter(c => !playableCards.includes(c.id)).map(c => c.id);
  }, [phase, session.yourHand, playableCards]);

  return (
    <div className="game-table">
      {/* Header */}
      <div className="game-header">
        <div className="session-info">
          <span className="session-code">Room: {session.code}</span>
          <span className="player-id">
            You: Player {you} {isDealer && '(Dealer)'} {isPone && '(Pone)'}
          </span>
        </div>
      </div>

      {/* Opponent zone */}
      <div className="opponent-zone">
        <div className="player-info">
          <span className="player-name">
            {players[opponent]?.name || `Player ${opponent}`}
          </span>
          <span className="player-role">
            {dealer === opponent ? 'Dealer' : dealer !== null ? 'Pone' : ''}
          </span>
          <span className={`connection-status ${players[opponent]?.connected ? 'connected' : 'disconnected'}`}>
            {players[opponent]?.connected ? '●' : '○'}
          </span>
        </div>
        <OpponentHand count={session.opponentHandCount} />
      </div>

      {/* Center zone */}
      <div className="center-zone">
        <div className="phase-indicator">{getPhaseMessage()}</div>

        {/* Cut for deal cards */}
        {phase === 'CUT_FOR_DEAL' && session.cutCards && (
          <div className="cut-cards">
            {session.cutCards.A && (
              <div className="cut-card">
                <div className="label">Player A</div>
                <Card card={session.cutCards.A} />
              </div>
            )}
            {session.cutCards.B && (
              <div className="cut-card">
                <div className="label">Player B</div>
                <Card card={session.cutCards.B} />
              </div>
            )}
          </div>
        )}

        {/* Starter card */}
        {session.starter && (
          <div className="starter-area">
            <div className="label">Starter</div>
            <Card card={session.starter} />
            {session.starter.rank === 'J' && (
              <div className="his-heels">His Heels! (+2 for dealer)</div>
            )}
          </div>
        )}

        {/* Pegging stack */}
        {phase === 'PEGGING' && (
          <PegStack stack={session.pegStack} currentCount={session.pegCount} />
        )}

        {/* Crib (when shown) */}
        {phase === 'SHOW_CRIB' && session.cribCards && (
          <div className="crib-area">
            <div className="label">Crib (Dealer's)</div>
            <Hand cards={session.cribCards} sorted={true} />
          </div>
        )}

        {/* Action buttons */}
        <div className="action-buttons">
          {phase === 'CUT_FOR_DEAL' && (
            <button onClick={() => send({ type: 'CUT_FOR_DEAL' })}>
              Cut for Deal
            </button>
          )}

          {phase === 'DEAL' && isDealer && (
            <button onClick={() => send({ type: 'START_DEAL' })}>
              Shuffle & Deal
            </button>
          )}

          {phase === 'DISCARD' && (
            <>
              <div className="discard-info">
                Selected: {selectedDiscards.length}/2
                {session.oppDiscardConfirmed && ' (Opponent ready)'}
              </div>
              <button
                onClick={handleConfirmDiscards}
                disabled={selectedDiscards.length !== 2 || session.yourDiscardConfirmed}
              >
                {session.yourDiscardConfirmed ? 'Waiting for opponent...' : 'Confirm Discards'}
              </button>
            </>
          )}

          {phase === 'CUT_STARTER' && isPone && (
            <button onClick={() => send({ type: 'CUT_STARTER' })}>
              Cut for Starter
            </button>
          )}

          {phase === 'PEGGING' && session.currentTurn === you && (
            <>
              {playableCards.length === 0 ? (
                <button onClick={handleDeclareGo}>Declare Go</button>
              ) : (
                <div className="turn-indicator">Your turn - play a card</div>
              )}
            </>
          )}

          {phase === 'PEGGING' && session.currentTurn !== you && (
            <div className="turn-indicator">Opponent's turn</div>
          )}

          {phase === 'SHOW_HANDS' && (
            <button
              onClick={() => send({ type: 'HAND_DONE' })}
              disabled={session.confirmations.youHandDone}
            >
              {session.confirmations.youHandDone
                ? 'Waiting for opponent...'
                : 'Hand Counted'}
            </button>
          )}

          {phase === 'SHOW_CRIB' && isDealer && (
            <button onClick={() => send({ type: 'CRIB_DONE' })}>
              Crib Counted
            </button>
          )}

          {phase === 'HAND_COMPLETE' && isDealer && (
            <button onClick={() => send({ type: 'START_NEXT_HAND' })}>
              Start Next Hand
            </button>
          )}
        </div>
      </div>

      {/* Your zone */}
      <div className="your-zone">
        <Hand
          cards={session.yourHand}
          selectedCards={phase === 'DISCARD' ? selectedDiscards : []}
          disabledCards={phase === 'PEGGING' ? disabledCards : []}
          onCardClick={
            phase === 'DISCARD'
              ? handleCardClick
              : phase === 'PEGGING'
              ? handlePlayCard
              : undefined
          }
        />
        <div className="your-info">
          <span className="player-name">You: Player {you}</span>
          <span className="player-role">
            {isDealer ? 'Dealer' : isPone ? 'Pone' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
