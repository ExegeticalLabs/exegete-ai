import React, { useState } from 'react'
import { useGameSocket } from './lib/useGameSocket'
import HostJoin from './components/HostJoin'

export default function App(){
  const [sessionId, setSessionId] = useState<string|undefined>()
  const { events, sendAction, pid, publicState, turnPid } = useGameSocket(sessionId)
  return (
    <div style={{fontFamily:'system-ui', padding:16}}>
      <h1>Shared Deck — Cribbage</h1>
      <HostJoin onJoined={setSessionId} />
      <p>Session: <b>{sessionId ?? '—'}</b> • You: <b>{pid ?? '—'}</b> • Turn: <b>{turnPid ?? '—'}</b></p>
      <pre style={{background:'#111',color:'#0f0',padding:12, height:200, overflow:'auto'}}>{events.map((e,i)=>JSON.stringify(e)).join('\n')}</pre>
      <div style={{display:'flex', gap:8}}>
        <button onClick={()=>sendAction({ kind:"DISCARD_TO_CRIB", payload:{ cards:[] } })} disabled={!sessionId}>ping</button>
      </div>
      <h3>Public</h3>
      <pre>{JSON.stringify(publicState,null,2)}</pre>
    </div>
  )
}
