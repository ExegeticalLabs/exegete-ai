import React, { useState } from 'react'

const httpBase = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8787'

export default function HostJoin({ onJoined }:{ onJoined:(id:string)=>void }){
  const [joinId, setJoinId] = useState('')
  async function host(){
    const r = await fetch(`${httpBase}/sessions`, { method: 'POST' })
    const json = await r.json(); onJoined(json.sessionId)
  }
  function join(){ onJoined(joinId) }
  return (
    <div style={{display:'flex', gap:8, alignItems:'center'}}>
      <button onClick={host}>Host</button>
      <input placeholder="session id" value={joinId} onChange={e=>setJoinId(e.target.value)} />
      <button onClick={join}>Join</button>
    </div>
  )
}
