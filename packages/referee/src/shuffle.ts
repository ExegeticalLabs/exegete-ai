import type { Card } from './referee_api'
export function shuffleDeterministic<T>(arr: T[], drbg: { nextBytes:(n:number)=>Uint8Array }): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const r = drbg.nextBytes(4)
    const x = (r[0]<<24 | r[1]<<16 | r[2]<<8 | r[3]) >>> 0
    const j = x % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
