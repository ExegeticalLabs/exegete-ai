# Cribbage Remote Deck — Full Specification

Version: 1.0
Owner: Exegetical Labs / Aaron
Primary consumer: AI coding agents + human devs

---

## 1. Purpose

Provide a **virtual shared deck of cards** so two remote humans can play cribbage (and later other games) as if they share a single physical deck.

Key idea:

- The app is **not** "cribbage-in-a-box".
- It is a **trusted remote deck + table UI**:
  - Manages cards, roles, and phases correctly.
  - Shows what each player should see.
  - Tracks the running count during pegging.
  - Leaves actual scoring and judgment to the humans (by design).

---

## 2. Scope (v1)

### In-scope

- 2-player sessions (Player A, Player B).
- Standard 52-card deck, no jokers.
- Cribbage-specific flow:
  - Cut for first deal.
  - Deal 6 cards each.
  - Each player discards 2 cards to dealer's crib.
  - Pone cuts starter; starter card revealed.
  - Pegging sequence with shared pile & running total.
  - Hand reveal & crib reveal stages (for manual counting).
  - Dealer alternates each hand.
- Real-time synchronization via WebSockets.
- Simple, code-based room join (e.g. 4–6 character code).

### Out-of-scope (v1)

- No authentication, profiles, or persistence between sessions.
- No money, betting, tournament logic.
- No AI opponents.
- No full rules enforcement of scoring combos (pairs, runs, etc.) beyond structural constraints.
- No support yet for >2 players or other games (but architecture should allow it).

---

## 3. Alignment with Cribbage Rules

We model structural rules from standard two-player cribbage:

- 52-card deck; 6 cards dealt each; 2 cards each to crib (crib is dealer's).
- First dealer: determined by cut (low card) from shuffled deck.
- Pone cuts starter each hand.
- Pone leads the pegging.
- Order of count: Pone's hand → Dealer's hand → Dealer's crib.

This app:

- **Enforces** what must be true for fairness (deck integrity, deal sizes, whose crib, who can act).
- **Represents** but does not fully judge points; players peg/score externally.

Source reference: ACC Cribbage rules, 2-player game.

---

## 4. System Overview

### 4.1 Architecture

Recommended baseline:

- `server/`
  - Node.js + TypeScript
  - WebSocket server (e.g. `ws`).
  - In-memory session store.
- `client/`
  - React + TypeScript + Vite.
  - One-page layout; connects via WebSocket.
- `shared/`
  - Type definitions for Deck, Card, GameState, Messages.

All authority lives server-side.

### 4.2 Core Concepts & Types

#### Card & Deck

```ts
type Suit = 'C' | 'D' | 'H' | 'S';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  id: string;       // unique, e.g. "5H"
  rank: Rank;
  suit: Suit;
}
type Deck = Card[];
```

#### Players & Roles

```ts
type PlayerId = 'A' | 'B';

interface Player {
  id: PlayerId;
  name?: string;
  connected: boolean;
}

type Role = 'DEALER' | 'PONE';
```

#### Session

```ts
interface Session {
  code: string;                 // short join code
  players: Record<PlayerId, Player | null>;
  state: GameState;
}
```

#### Game State (cribbage mode)

```ts
type Phase =
  | 'LOBBY'
  | 'CUT_FOR_DEAL'
  | 'DEAL'
  | 'DISCARD'
  | 'CUT_STARTER'
  | 'PEGGING'
  | 'SHOW_HANDS'
  | 'SHOW_CRIB'
  | 'HAND_COMPLETE';

interface CribbageState {
  phase: Phase;
  dealer: PlayerId;            // current dealer
  deck: Deck;                  // remaining undealt cards
  hands: Record<PlayerId, Card[]>;
  crib: Card[];
  starter: Card | null;
  pegStack: CardPlay[];        // cards played in current 0–31 sequence
  pegCount: number;            // running total 0–31
  goState: {
    A_canPlay: boolean;
    B_canPlay: boolean;
  };
  confirmations: {
    A_handDone: boolean;
    B_handDone: boolean;
    cribDone: boolean;
  };
}

interface CardPlay {
  by: PlayerId;
  card: Card;
  newCount: number;
}
```

---

## 5. Room & Connection Flow

### 5.1 Create Room

- Endpoint / action: `CREATE_SESSION(code?)`
- If no code provided, server generates (e.g. 4 letters).
- Creator becomes Player A.
- Session starts in `LOBBY`.

### 5.2 Join Room

- Endpoint / action: `JOIN_SESSION({ code })`
- Joins as Player B if slot free.
- Once 2 players connected → transition to `CUT_FOR_DEAL`.

### 5.3 Reconnect

- If same browser/session reconnects with known identity, reattach.
- Game state always lives server-side; reconnecting just resyncs view.

---

## 6. Hand Lifecycle & Rules (Exact Behavior)

This is the contract. Any AI/dev must implement these transitions and constraints.

### 6.1 Cut for First Dealer (CUT_FOR_DEAL)

- Server shuffles a fresh deck.
- Each player clicks "Cut for deal".
- Server draws one card for each (face up to both).
- Lower card = dealer. (Tie → reshuffle & recut.)
- Discard cut cards, reshuffle, move to `DEAL`.

### 6.2 Deal (DEAL)

- Only the dealer client can press "Shuffle & Deal".
- Server:
  - Shuffles deck.
  - Deals 6 cards to each (`hands.A`, `hands.B`).
  - Leaves remaining cards as undealt deck.
- UI:
  - Each player sees only their own 6 cards.
  - Opponent's cards are hidden backs.
- Transition → `DISCARD`.

### 6.3 Discard to Crib (DISCARD)

**Rules:**

- Each player must select exactly 2 cards.
- When a player clicks "Confirm Discards", server:
  - Validates they own those cards.
  - Moves them from `hands[id]` → `crib`.
- A player can change selection until they confirm.
- Once both have confirmed:
  - Crib now has 4 cards, face down (server-only).
  - Transition → `CUT_STARTER`.

### 6.4 Cut Starter (CUT_STARTER)

- Only the Pone can click "Cut".
- Server:
  - Takes top card of deck as starter.
  - Sets `starter` and broadcasts it face up to both.
- Note: Scoring for "his heels" is display-only; humans award points.
- Transition → `PEGGING`.

### 6.5 Pegging (PEGGING)

**Structural rules implemented:**

#### Turn order

- Pone always plays first.
- Turns alternate between players unless go or no cards.

#### Playing a card

- Client sends `PLAY_CARD(cardId)`.
- Server validates:
  - It's that player's turn.
  - Card is in their hand.
  - `pegCount + cardValue <= 31` (cardValue = min(rank, 10); A=1).
- If valid:
  - Remove from `hands[id]`.
  - Append to `pegStack`.
  - Update `pegCount`.
  - Broadcast updated stack & count to both.

#### Declaring "Go"

- Client sends `DECLARE_GO`.
- Server:
  - Verifies player truly has no legal card (if check is enabled).
  - Marks their `canPlay` flag false for this 0–31 run.
- When:
  - One player cannot play but the other can → other continues.
  - Both cannot play, or count hits 31 → end of run:
    - Optionally mark "last card" / "31" visually.
    - Reset `pegStack` and `pegCount = 0`.
    - Next run starts with player who did not play last in previous run,
      matching cribbage dynamics.

#### End of pegging

- When both hands are empty:
  - Transition → `SHOW_HANDS`.

**Notes:**

- App shows the running count and played cards to both.
- App does not auto-award points; it only provides info.

### 6.6 Show Hands (SHOW_HANDS)

- Each player sees:
  - Their 4-card hand + starter.
- They manually count & peg on their physical/other board.
- Each has a "Hand counted" button.
- When both `A_handDone` and `B_handDone`:
  - Transition → `SHOW_CRIB`.

### 6.7 Show Crib (SHOW_CRIB)

- Server reveals crib + starter to both.
- Dealer manually counts & pegs crib.
- When dealer clicks "Crib counted":
  - Transition → `HAND_COMPLETE`.

### 6.8 Next Hand (HAND_COMPLETE)

- Dealer flips:
  - Dealer role toggles (A ↔ B).
- Reset:
  - `deck` → fresh 52.
  - `hands`, `crib`, `starter`, `pegStack`, `pegCount`, `confirmations`.
- Transition → `DEAL` for next hand.

---

## 7. WebSocket / API Contract (Concrete)

All state changes go through the server. Sample message schema:

### Client → Server

```ts
type ClientMessage =
  | { type: 'CREATE_SESSION'; code?: string }
  | { type: 'JOIN_SESSION'; code: string; name?: string }
  | { type: 'CUT_FOR_DEAL' }
  | { type: 'START_DEAL' }            // dealer only
  | { type: 'SET_DISCARD'; cards: string[] }
  | { type: 'CONFIRM_DISCARD' }
  | { type: 'CUT_STARTER' }          // pone only
  | { type: 'PLAY_CARD'; cardId: string }
  | { type: 'DECLARE_GO' }
  | { type: 'HAND_DONE' }            // for that player
  | { type: 'CRIB_DONE' }            // dealer only
  | { type: 'START_NEXT_HAND' };     // dealer only, after all done
```

### Server → Client

```ts
type ServerMessage =
  | { type: 'SESSION_STATE'; session: PublicSessionView }
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'INFO'; message: string };

interface PublicSessionView {
  code: string;
  you: PlayerId;
  players: { A: PlayerSummary | null; B: PlayerSummary | null };
  dealer: PlayerId | null;
  phase: Phase;
  // cards:
  yourHand: Card[];
  opponentHandCount: number;      // but not their cards
  cribCount: number;              // but cards hidden until SHOW_CRIB
  starter: Card | null;
  pegCount: number;
  pegStack: CardPlay[];
  // misc:
  confirmations: {
    youHandDone: boolean;
    oppHandDone: boolean;
    cribDone: boolean;
  };
}

interface PlayerSummary {
  name?: string;
  connected: boolean;
}
```

Server must filter views so each player only sees allowed info.

---

## 8. Constraints & Anti-Cheat

- All card draws, deals, and cuts happen server-side using a secure RNG.
- Clients never send card definitions, only cardId references.
- Server validates:
  - Turn order.
  - Card ownership.
  - Phase correctness.
- Any illegal action → ERROR and ignored.

---

## 9. UX / "Vibe" Requirements

We're not skinning a casino; we're simulating "we share a deck at a table".

**Minimum:**

- Dark/green table background.
- **Top: opponent zone:**
  - Name
  - Dealer/Pone badge
  - Face-down hand (just count).
- **Center:**
  - Draw pile (deck)
  - Starter card (once cut)
  - Pegging stack: cards in order with visible running total.
  - Subtle labels for current phase ("Discard to crib", "Pegging", etc.).
- **Bottom: your zone:**
  - Your cards fanned in order (smallest → largest by default).
  - Tap/Click to select discards.
  - Drag or click to play during pegging.
- **Side or corner:**
  - Text log: key events ("A dealt", "B confirmed discards", etc.).

Absolutely no noisy animations. It should feel:

- Simple
- Trustworthy
- Human-first, not gambling-app.

---

## 10. Extensibility Notes (Future)

Design so we can later:

- Plug in other games (Go Fish, 31, Poker, Blackjack) as modules:
  - Shared "deck & room" engine.
  - Game-specific state machine.
- Add spectators or a shared peg board.
- Add optional rule-enforcement modules (e.g., detect illegal plays).

For now, do not implement those — just keep code modular so adding them is straightforward.
