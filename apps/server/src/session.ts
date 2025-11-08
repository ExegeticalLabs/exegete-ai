import type { IGameLogic, GameState, PlayerAction, DeckSpec } from "@referee/referee_api";
import { HmacDRBG } from "@referee/drbg";
import { shuffleDeterministic } from "@referee/shuffle";

export type Session = {
  id: string;
  rules: IGameLogic;
  state: GameState;
  players: string[]; // p1, p2
  conns: Map<string, import("ws").WebSocket>; // pid -> ws
};

export function makeStandard52(): DeckSpec {
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const suits = ["S","H","D","C"];
  const canonicalOrder = suits.flatMap(s => ranks.map(r => `${r}${s}`));
  return { id: "standard52", version: "1.0", canonicalOrder };
}

export function shuffledDeck(deck: DeckSpec, seedHex: string): DeckSpec {
  const drbg = new HmacDRBG(Buffer.from(seedHex, "hex"));
  return { ...deck, canonicalOrder: shuffleDeterministic([...deck.canonicalOrder], drbg) };
}
