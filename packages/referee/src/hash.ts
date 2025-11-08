import { createHash } from 'crypto'
import type { GameState } from './referee_api'
export function stateHash(s: GameState){
  const h = createHash('sha256').update(JSON.stringify(s)).digest('hex')
  return h
}
