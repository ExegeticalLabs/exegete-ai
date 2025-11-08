// Combined M1a + M2 + M3 tests (abridged to fit bundle)
import { describe, it, expect } from 'vitest'
import { CribbageRules } from '../src/cribbage_rules'
import type { GameState, LogicContext, PlayerId, Card } from '@referee/referee_api'
import { countHand, countCrib } from '../src/cribbage_scoring'

const H = (...cs:string[])=> cs as any as Card[]
const S = (c:string)=> c as any as Card
function ctx(): LogicContext { return { drbg:{ nextBytes:(n:number)=>new Uint8Array(n) }, nowMs:()=>12345, scheduleTimer:()=>{}, log:()=>{} } }
function pegState(p1:Card[], p2:Card[], count=0, turn='p1', last?:PlayerId){
  const s: GameState = { public:{ phase:'pegging', dealer:'p2', cribOwner:'p2', crib:[], players:['p1','p2'], starter:'5S', peggingCount:count, peggingStack:[], scores:{p1:0,p2:0} }, private:{ p1:{hand:p1, hand_initial:[]}, p2:{hand:p2, hand_initial:[]} }, deck:[], phase:'play', turnPid:turn, transient:{ lastPlayerToPeg:last } } as any
  return { s, ctx: ctx(), p1:'p1', p2:'p2' }
}

describe('Pegging basics',()=>{
  it('pair scores 2',()=>{
    const { s, ctx, p1, p2 } = pegState(H('9H','2S'), H('9C','3S'))
    let r = CribbageRules.handleAction(s,{kind:'PEG_PLAY',payload:{card:'9H'}},p1,ctx)
    const s1 = (r as any).newState as GameState
    r = CribbageRules.handleAction(s1,{kind:'PEG_PLAY',payload:{card:'9C'}},p2,ctx)
    expect((r as any).events).toContainEqual(expect.objectContaining({ t:'SCORE', pid:p2, delta:2 }))
  })
})

describe('Counting (M2)',()=>{
  it('29 hand',()=>{
    const { points, breakdown } = countHand(H('5S','5D','5C','JH'), S('5H'))
    expect(points).toBe(29)
    expect(breakdown).toContain('8 fifteen(s) for 16')
    expect(breakdown).toContain('four of a kind for 12')
    expect(breakdown).toContain('nobs for 1')
  })
  it('crib flush stricter than hand',()=>{
    const hand = H('2D','4D','6D','8D'); const starter=S('KS')
    expect(countHand(hand, starter).points).toBe(4)
    expect(countCrib(hand, starter).points).toBe(0)
  })
})
