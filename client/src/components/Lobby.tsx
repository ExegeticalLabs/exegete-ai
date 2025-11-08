/**
 * Lobby component - room creation and joining
 */

import { useState } from 'react';
import { ClientMessage } from '../types/types';

interface LobbyProps {
  send: (message: ClientMessage) => void;
}

export function Lobby({ send }: LobbyProps) {
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleCreate = () => {
    send({ type: 'CREATE_SESSION' });
  };

  const handleJoin = () => {
    if (joinCode.trim()) {
      send({
        type: 'JOIN_SESSION',
        code: joinCode.toUpperCase(),
        name: playerName.trim() || undefined,
      });
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>Cribbage Remote Deck</h1>
        <p>A virtual shared deck for playing cribbage with a friend</p>
      </div>

      <div className="lobby-content">
        <div className="lobby-section">
          <h2>Create New Game</h2>
          <button onClick={handleCreate} className="btn-primary">
            Create Room
          </button>
        </div>

        <div className="lobby-divider">OR</div>

        <div className="lobby-section">
          <h2>Join Existing Game</h2>
          <input
            type="text"
            placeholder="Room Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={4}
          />
          <input
            type="text"
            placeholder="Your Name (optional)"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim()}
            className="btn-primary"
          >
            Join Room
          </button>
        </div>
      </div>

      <div className="lobby-footer">
        <p>
          This app provides a trusted virtual deck. You handle scoring and
          strategy.
        </p>
      </div>
    </div>
  );
}
