import React, { useState } from 'react'
import { useGameSocket } from './lib/useGameSocket'
import HostJoin from './components/HostJoin'

function Card({ card, onClick, selected }: { card: string; onClick?: () => void; selected?: boolean }) {
  const rank = card.match(/^(\d+|[JQKA])/)?.[1] || '?'
  const suit = card.match(/([SHDC])$/)?.[1] || '?'
  const suitSymbol = { S: '♠', H: '♥', D: '♦', C: '♣' }[suit] || suit
  const isRed = suit === 'H' || suit === 'D'

  return (
    <div
      onClick={onClick}
      style={{
        width: 60,
        height: 90,
        border: selected ? '3px solid blue' : '2px solid #333',
        borderRadius: 8,
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        fontSize: 24,
        fontWeight: 'bold',
        color: isRed ? 'red' : 'black',
        userSelect: 'none',
        boxShadow: selected ? '0 0 10px blue' : '2px 2px 5px rgba(0,0,0,0.2)'
      }}
    >
      <div>{rank}</div>
      <div style={{ fontSize: 32 }}>{suitSymbol}</div>
    </div>
  )
}

export default function App() {
  const [sessionId, setSessionId] = useState<string | undefined>()
  const { events, sendAction, pid, publicState, turnPid } = useGameSocket(sessionId)
  const [selectedCards, setSelectedCards] = useState<string[]>([])

  const myPrivate = publicState?.private?.[pid || ''] || {}
  const myHand = myPrivate.hand || []
  const phase = publicState?.phase || 'waiting'
  const scores = publicState?.scores || {}
  const crib = publicState?.crib || []
  const starter = publicState?.starter
  const peggingStack = publicState?.peggingStack || []
  const peggingCount = publicState?.peggingCount || 0
  const dealer = publicState?.dealer

  const toggleCard = (card: string) => {
    setSelectedCards(prev =>
      prev.includes(card) ? prev.filter(c => c !== card) : [...prev, card]
    )
  }

  const discardToCrib = () => {
    if (selectedCards.length === 2) {
      sendAction({ kind: 'DISCARD_TO_CRIB', payload: { cards: selectedCards } })
      setSelectedCards([])
    }
  }

  const cutStarter = () => {
    sendAction({ kind: 'CUT_STARTER', payload: {} })
  }

  const playCard = () => {
    if (selectedCards.length === 1) {
      sendAction({ kind: 'PEG_PLAY', payload: { card: selectedCards[0] } })
      setSelectedCards([])
    }
  }

  const callGo = () => {
    sendAction({ kind: 'CALL_GO', payload: {} })
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Shared Deck — Cribbage <span style={{fontSize: 14, color: '#666'}}>v2.0-CARDS</span></h1>

      {!sessionId && <HostJoin onJoined={setSessionId} />}

      {sessionId && (
        <>
          <div style={{ background: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <div><strong>Session:</strong> {sessionId}</div>
            <div><strong>You:</strong> {pid} {pid === dealer && '(Dealer)'}</div>
            <div><strong>Phase:</strong> {phase}</div>
            <div><strong>Turn:</strong> {turnPid || '—'}</div>
            <div><strong>Scores:</strong> {Object.entries(scores).map(([p, s]) => `${p}: ${s}`).join(' | ')}</div>
          </div>

          {/* Game Board */}
          <div style={{ background: '#2d5016', padding: 20, borderRadius: 12, marginBottom: 20, minHeight: 200 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', color: 'white' }}>
              {/* Crib */}
              <div>
                <div style={{ marginBottom: 8 }}>Crib ({crib.length})</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {crib.map((c, i) => <Card key={i} card={c} />)}
                </div>
              </div>

              {/* Starter */}
              {starter && (
                <div>
                  <div style={{ marginBottom: 8 }}>Starter</div>
                  <Card card={starter} />
                </div>
              )}

              {/* Pegging */}
              {phase === 'pegging' && (
                <div>
                  <div style={{ marginBottom: 8 }}>Pegging (Count: {peggingCount})</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {peggingStack.map((c, i) => <Card key={i} card={c} />)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginBottom: 20 }}>
            {phase === 'discard' && (
              <div>
                <p>Select 2 cards to discard to the crib:</p>
                <button onClick={discardToCrib} disabled={selectedCards.length !== 2 || !myHand.length}>
                  Discard {selectedCards.length}/2 cards
                </button>
              </div>
            )}

            {phase === 'cut' && turnPid === pid && (
              <div>
                <button onClick={cutStarter}>Cut Starter Card</button>
              </div>
            )}

            {phase === 'pegging' && turnPid === pid && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={playCard} disabled={selectedCards.length !== 1}>
                  Play Card
                </button>
                <button onClick={callGo}>Call Go</button>
              </div>
            )}

            {phase === 'end' && (
              <div style={{ fontSize: 24, fontWeight: 'bold', color: 'green' }}>
                Game Over!
              </div>
            )}
          </div>

          {/* Your Hand */}
          <div>
            <h3>Your Hand</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {myHand.length > 0 ? (
                myHand.map((card: string, i: number) => (
                  <Card
                    key={i}
                    card={card}
                    onClick={() => toggleCard(card)}
                    selected={selectedCards.includes(card)}
                  />
                ))
              ) : (
                <div style={{ color: '#666' }}>No cards in hand</div>
              )}
            </div>
          </div>

          {/* Event Log */}
          <details style={{ marginTop: 20 }}>
            <summary>Event Log ({events.length})</summary>
            <pre style={{ background: '#111', color: '#0f0', padding: 12, maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
              {events.slice(-20).map((e, i) => JSON.stringify(e)).join('\n')}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}
