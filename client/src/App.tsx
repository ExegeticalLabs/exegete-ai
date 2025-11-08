/**
 * Main App component
 */

import { useGameSocket } from './hooks/useGameSocket';
import { Lobby } from './components/Lobby';
import { GameTable } from './components/GameTable';

export function App() {
  const { connected, session, error, info, send } = useGameSocket();

  return (
    <div className="app">
      {/* Connection status */}
      <div className={`connection-banner ${connected ? 'connected' : 'disconnected'}`}>
        {connected ? 'Connected' : 'Connecting...'}
      </div>

      {/* Error display */}
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* Info display */}
      {info && (
        <div className="info-banner">
          {info}
        </div>
      )}

      {/* Main content */}
      {!session || session.phase === 'LOBBY' ? (
        <Lobby send={send} />
      ) : (
        <GameTable session={session} send={send} />
      )}
    </div>
  );
}
