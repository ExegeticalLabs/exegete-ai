import { useEffect, useRef, useState } from 'react'

const httpBase = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8787'
const wsBase = httpBase.replace(/^http/i,'ws')

export function useGameSocket(sessionId?: string){
  const [pid, setPid] = useState<string>()
  const [events, setEvents] = useState<any[]>([])
  const [publicState, setPublic] = useState<any>()
  const [turnPid, setTurn] = useState<string>()
  const wsRef = useRef<WebSocket|null>(null)

  useEffect(()=>{
    if(!sessionId) return
    const ws = new WebSocket(`${wsBase}/ws?sessionId=${sessionId}`)
    wsRef.current = ws
    ws.onmessage = (m)=>{
      const msg = JSON.parse(m.data)
      if(msg.t === 'WELCOME'){ setPid(msg.pid); setPublic(msg.public) }
      if(msg.t === 'EVENTS'){ setEvents(e=>[...e,...msg.events]); setPublic(msg.public); setTurn(msg.turnPid) }
    }
    return ()=>{ ws.close() }
  },[sessionId])

  function sendAction(action: any){ wsRef.current?.send(JSON.stringify({ t:'ACTION', action })) }

  return { pid, events, publicState, turnPid, sendAction }
}
