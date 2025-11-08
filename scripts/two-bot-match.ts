import WebSocket from 'ws'
const base = process.env.SERVER_URL ?? 'http://localhost:8787'
async function host(){ const r = await fetch(`${base}/sessions`, { method:'POST' }); return (await r.json()).sessionId as string }
function open(sessionId:string){ return new WebSocket(base.replace('http','ws')+`/ws?sessionId=${sessionId}`) }

async function main(){
  const sessionId = await host()
  console.log('session', sessionId)
  const a = open(sessionId); const b = open(sessionId)
  let aPid='a', bPid='b'
  a.on('message', d=>{ const m = JSON.parse(String(d)); if(m.t==='WELCOME') aPid=m.pid; if(m.t==='EVENTS') console.log('A events', m.events.length) })
  b.on('message', d=>{ const m = JSON.parse(String(d)); if(m.t==='WELCOME') bPid=m.pid; if(m.t==='EVENTS') console.log('B events', m.events.length) })
  await new Promise(r=>setTimeout(r,400))
  a.send(JSON.stringify({ t:'ACTION', action:{ kind:'DISCARD_TO_CRIB', payload:{ cards:[] } } }))
  b.send(JSON.stringify({ t:'ACTION', action:{ kind:'DISCARD_TO_CRIB', payload:{ cards:[] } } }))
  setTimeout(()=>{ a.close(); b.close(); }, 2000)
}
main()
