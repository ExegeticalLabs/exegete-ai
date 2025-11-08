export type Card = string;
export type PlayerId = string;

export interface DeckSpec { id: string; version: string; canonicalOrder: Card[] }

export interface GameState {
  public: any;
  private: Record<PlayerId, any>;
  deck: Card[];
  phase: string;
  turnPid?: PlayerId;
  transient?: any;
}

export interface PlayerAction { kind: string; payload?: any }

export interface GameEvent { t: string; [k: string]: any }

export interface Validation { ok: boolean; reason?: string }

export interface HandleAccept { kind: 'ACCEPT'; newState: GameState; events: GameEvent[] }
export interface HandlePending { kind: 'PENDING'; newState: GameState; events: GameEvent[] }
export interface HandleReject { kind: 'REJECT'; reason: string }
export type HandleResult = HandleAccept | HandlePending | HandleReject

export interface LogicContext {
  drbg: { nextBytes: (n:number)=>Uint8Array };
  nowMs: ()=>number;
  scheduleTimer: (ms:number, tag?:string)=>void;
  log: (msg:string)=>void;
}

export interface IGameLogic {
  gameId: string; minPlayers: number; maxPlayers: number;
  setup(deck: DeckSpec, players: PlayerId[], ctx: LogicContext): GameState;
  validateAction(s: GameState, a: PlayerAction, actor: PlayerId): Validation;
  handleAction(s: GameState, a: PlayerAction, actor: PlayerId, ctx: LogicContext): HandleResult;
  onTimer(s: GameState, tag: string, ctx: LogicContext): HandleResult;
  onReconnect(s: GameState, pid: PlayerId): GameEvent[];
}
