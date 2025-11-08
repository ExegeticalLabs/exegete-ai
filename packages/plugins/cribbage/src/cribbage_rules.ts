// Hardened M1a (pegging/go) + M2 (atomic show) + M3 (victory clamp)
import { IGameLogic, GameState, PlayerId, PlayerAction, HandleResult, LogicContext, Card, GameEvent } from "@referee/referee_api";
import { scorePegPlay, canPlayCard, countHand, countCrib, rankVal } from "./cribbage_scoring";

const HAND = (s: GameState, pid: PlayerId) => (s.private[pid].hand as Card[]);
const HAND_INIT = (s: GameState, pid: PlayerId) => (s.private[pid].hand_initial as Card[]);
const removeCard = (arr: Card[], c: Card) => { const i = arr.indexOf(c); if (i >= 0) arr.splice(i, 1); };
const getOpponent = (players: PlayerId[], actor: PlayerId) => players.find(p => p !== actor)!;

export type CribPhase = "discard" | "cut" | "pegging" | "count" | "end";

type PublicCrib = {
  phase: CribPhase;
  dealer: PlayerId;
  cribOwner: PlayerId;
  crib: Card[];
  players: PlayerId[];
  starter?: Card;
  peggingCount: number;
  peggingStack: Card[];
  scores: Record<PlayerId, number>;
};

function resetPeggingSubRound(s: GameState, lastPegPid: PlayerId, events: GameEvent[]) {
  const pub = s.public as PublicCrib;
  const nextLeader = getOpponent(pub.players, lastPegPid);
  pub.peggingCount = 0; pub.peggingStack = []; s.transient = {}; s.turnPid = nextLeader;
  events.push({ t: "ANNOUNCE", text: `Count reset to 0. ${nextLeader}'s turn.` });
  events.push({ t: "TURN", pid: nextLeader });
}

function _emitWin(s: GameState, events: GameEvent[], winner: PlayerId, loser: PlayerId): GameState {
  (s.public as PublicCrib).phase = "end";
  const final = (s.public as PublicCrib).scores; const margin = final[winner]-final[loser];
  events.push({ t: "END", data: { winner, margin, skunk: final[loser] <= 90, doubleSkunk: final[loser] <= 60 } } as any);
  return s;
}

function _performTheShow(s: GameState, events: GameEvent[]): GameState {
  const pub = s.public as PublicCrib; if (pub.phase === "end") return s;
  pub.phase = "count"; const pone = getOpponent(pub.players, pub.dealer); const dealer = pub.dealer; const starter = pub.starter!;
  events.push({ t: "ANNOUNCE", text: "Pegging complete. Counting hands." });
  // Pone
  events.push({ t: "ANNOUNCE", text: `${pone} (Pone) counts hand.` });
  const ps = countHand(HAND_INIT(s, pone), starter); if (ps.points){ pub.scores[pone]+=ps.points; events.push({ t:"SCORE", pid: pone, delta: ps.points, data: ps.breakdown }); if(pub.scores[pone]>=121) return _emitWin(s, events, pone, dealer) }
  // Dealer hand
  events.push({ t: "ANNOUNCE", text: `${dealer} (Dealer) counts hand.` });
  const ds = countHand(HAND_INIT(s, dealer), starter); if (ds.points){ pub.scores[dealer]+=ds.points; events.push({ t:"SCORE", pid: dealer, delta: ds.points, data: ds.breakdown }); if(pub.scores[dealer]>=121) return _emitWin(s, events, dealer, pone) }
  // Crib
  events.push({ t: "ANNOUNCE", text: `${dealer} (Dealer) counts crib.` });
  const cs = countCrib(pub.crib, starter); if (cs.points){ pub.scores[dealer]+=cs.points; events.push({ t:"SCORE", pid: dealer, delta: cs.points, data: cs.breakdown }); if(pub.scores[dealer]>=121) return _emitWin(s, events, dealer, pone) }
  pub.phase = "end"; events.push({ t: "ANNOUNCE", text: "Hand complete. Next deal." }); return s;
}

function _checkTransitionToShow(s: GameState, events: GameEvent[]): GameState {
  const pub = s.public as PublicCrib; if (pub.phase !== "pegging") return s;
  const rem = pub.players.reduce((sum, pid)=> sum + HAND(s, pid).length, 0);
  if (rem === 0) return _performTheShow(s, events); return s;
}

export const CribbageRules: IGameLogic = {
  gameId: "cribbage.v1", minPlayers: 2, maxPlayers: 2,
  setup(deck, players, ctx){
    const dealerIdx = Number(ctx.nowMs() % players.length); const dealer = players[dealerIdx]; const pone = getOpponent(players, dealer);
    const s: GameState = { public: { phase:"discard", dealer, cribOwner: dealer, crib: [], players:[...players], starter: undefined, peggingCount:0, peggingStack:[], scores: Object.fromEntries(players.map(p=>[p,0])) } as PublicCrib, private: Object.fromEntries(players.map(p=>[p,{ hand:[], hand_initial: [] }])) as any, deck: [...deck.canonicalOrder], phase:"play", turnPid: pone, transient:{} };
    for(let r=0;r<6;r++) for(const p of players) HAND(s,p).push(s.deck.shift()!);
    return s;
  },
  validateAction(state, act, actor){
    const pub = state.public as PublicCrib; if(pub.phase==="end") return { ok:false, reason:"game_is_over" };
    switch(act.kind){
      case "DISCARD_TO_CRIB":{ if(pub.phase!=="discard") return { ok:false, reason:"not_in_discard" }; const {cards}=act.payload||{}; if(!Array.isArray(cards)||cards.length!==2) return {ok:false,reason:"need_two_discards"}; const h=HAND(state,actor); if(!cards.every((c:Card)=>h.includes(c))) return {ok:false,reason:"card_not_in_hand"}; return {ok:true} }
      case "CUT_STARTER":{ if(pub.phase!=="cut") return { ok:false, reason:"not_in_cut" }; if(actor!==pub.dealer) return { ok:false, reason:"dealer_cuts" }; return {ok:true} }
      case "PEG_PLAY":{ if(pub.phase!=="pegging") return {ok:false,reason:"not_in_pegging"}; if(actor!==state.turnPid) return {ok:false,reason:"not_your_turn"}; const {card}=act.payload||{}; const h=HAND(state,actor); if(!card||!h.includes(card)) return {ok:false,reason:"card_not_in_hand"}; if(!canPlayCard(card, pub.peggingCount)) return {ok:false,reason:"exceeds_31"}; return {ok:true} }
      case "CALL_GO":{ if(pub.phase!=="pegging") return {ok:false,reason:"not_in_pegging"}; if(actor!==state.turnPid) return {ok:false,reason:"not_your_turn"}; const h=HAND(state,actor); if(h.some(c=>canPlayCard(c,pub.peggingCount))) return {ok:false,reason:"you_have_a_playable_card"}; return {ok:true} }
      default: return { ok:false, reason:"unknown_action" }
    }
  },
  handleAction(state, act, actor, ctx){
    if((state.public as PublicCrib).phase==="end") return { kind:"REJECT", reason:"game_is_over" };
    let s: GameState = JSON.parse(JSON.stringify(state)); const pub = s.public as PublicCrib; const events: GameEvent[] = []; const players=pub.players; const opponent = getOpponent(players, actor);

    if(act.kind==="DISCARD_TO_CRIB"){ const {cards}=act.payload; for(const c of cards){ removeCard(HAND(s,actor),c); pub.crib.push(c) } const allDiscarded = Object.values(s.private).every(p=>(p.hand as Card[]).length===4); if(allDiscarded){ pub.phase="cut"; s.turnPid=pub.dealer; for(const pid of players) s.private[pid].hand_initial=[...HAND(s,pid)]; events.push({ t:"ANNOUNCE", text:"All cards discarded. Dealer to cut." }) } return { kind:"ACCEPT", newState:s, events } }

    if(act.kind==="CUT_STARTER"){ pub.starter=s.deck.shift()!; events.push({ t:"ANNOUNCE", text:`Starter cut: ${pub.starter}` }); if(pub.starter!.startsWith("J")){ pub.scores[pub.dealer]+=2; events.push({ t:"SCORE", pid: pub.dealer, delta:2 }); events.push({ t:"ANNOUNCE", text:"His Heels! 2 for the dealer." }); if(pub.scores[pub.dealer]>=121) return { kind:"ACCEPT", newState:_emitWin(s,events,pub.dealer,opponent), events } } pub.phase="pegging"; s.turnPid=getOpponent(players,pub.dealer); events.push({ t:"TURN", pid:s.turnPid }); return { kind:"ACCEPT", newState:s, events } }

    if(act.kind==="PEG_PLAY"){ const {card}=act.payload; removeCard(HAND(s,actor),card); pub.peggingStack.push(card); pub.peggingCount+=rankVal(card); events.push({ t:"ANNOUNCE", text:`${actor} plays ${card}. Count is ${pub.peggingCount}.`}); s.transient!.lastPlayerToPeg=actor; s.transient!.goCalledBy=undefined; const score=scorePegPlay(pub.peggingStack, pub.peggingCount); if(score.points){ pub.scores[actor]+=score.points; events.push({ t:"SCORE", pid:actor, delta:score.points }); if(score.announce) events.push({ t:"ANNOUNCE", text: score.announce }); if(pub.scores[actor]>=121) return { kind:"ACCEPT", newState:_emitWin(s,events,actor,opponent), events } }
      if(pub.peggingCount===31){ resetPeggingSubRound(s, actor, events); s=_checkTransitionToShow(s, events); return { kind:"ACCEPT", newState:s, events } }
      const oppH = HAND(s, opponent); if(oppH.some(c=>canPlayCard(c, pub.peggingCount))){ s.turnPid=opponent; events.push({ t:"TURN", pid: opponent }) } else { const aH = HAND(s, actor); if(aH.some(c=>canPlayCard(c, pub.peggingCount))){ s.turnPid=actor; events.push({ t:"ANNOUNCE", text:`${opponent} must "go". ${actor} plays again.` }); s.transient!.goCalledBy=opponent; events.push({ t:"TURN", pid: actor }) } else { events.push({ t:"ANNOUNCE", text:"Neither player can play. Last card for 1." }); if(pub.peggingCount<31){ pub.scores[actor]+=1; events.push({ t:"SCORE", pid:actor, delta:1 }); if(pub.scores[actor]>=121) return { kind:"ACCEPT", newState:_emitWin(s,events,actor,opponent), events } } resetPeggingSubRound(s, actor, events); s=_checkTransitionToShow(s, events) } }
      return { kind:"ACCEPT", newState:s, events }
    }

    if(act.kind==="CALL_GO"){ events.push({ t:"ANNOUNCE", text:`${actor} calls "go".` }); s.transient!.goCalledBy=actor; const oppH = HAND(s, opponent); if(oppH.some(c=>canPlayCard(c, pub.peggingCount))){ s.turnPid=opponent; events.push({ t:"TURN", pid: opponent }) } else { events.push({ t:"ANNOUNCE", text:`${opponent} also must "go". Last card for 1.` }); const last = s.transient!.lastPlayerToPeg; if(last && pub.peggingCount<31){ pub.scores[last]+=1; events.push({ t:"SCORE", pid:last, delta:1 }); if(pub.scores[last]>=121) return { kind:"ACCEPT", newState:_emitWin(s,events,last, getOpponent(players,last)), events } } const firstCaller = s.transient!.goCalledBy; const effective = firstCaller ? getOpponent(players, firstCaller) : (last ? last : actor); resetPeggingSubRound(s, effective, events); s=_checkTransitionToShow(s, events) } return { kind:"ACCEPT", newState:s, events } }

    return { kind:"REJECT", reason:"unknown_action" }
  },
  onTimer(){ return { kind:"REJECT", reason:"no_timers" } },
  onReconnect(){ return [] }
}
