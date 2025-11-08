# Cribbage Remote Deck

**A virtual shared deck for playing 2-player cribbage remotely**

This is NOT "yet another cribbage app." It's a trusted, authoritative virtual deck and table that lets two humans play real cribbage while handling their own scoring and strategy.

---

## Purpose

Provide a **remote shared deck of cards** so two people can play cribbage as if they share a single physical deck, even when they're far apart.

The app:
- ✅ Manages the deck, roles, and game phases correctly
- ✅ Shows each player what they should see (and hides what they shouldn't)
- ✅ Tracks the running count during pegging
- ✅ Enforces structural rules (turn order, 31 limit, etc.)
- ❌ Does NOT auto-score hands or play for you

You handle scoring on your own board (physical or digital). This is just the deck.

---

## Features (v1)

- **2-player sessions** via simple room codes
- **Full cribbage flow:**
  - Cut for first dealer
  - Deal 6 cards each
  - Discard 2 to crib
  - Cut for starter
  - Pegging with running count
  - Hand & crib reveal for manual counting
  - Dealer alternates each hand
- **Real-time sync** via WebSockets
- **Deck integrity** guaranteed server-side
- **Clean table UI** - dark/green aesthetic, no casino noise

---

## Architecture

```
cribbage-remote-deck/
├── shared/           # TypeScript types & deck utilities
├── server/           # Node.js WebSocket server + game engine
└── client/           # React + Vite UI
```

**Tech Stack:**
- **Server:** Node.js + TypeScript + WebSocket (`ws` library)
- **Client:** React 18 + TypeScript + Vite
- **State:** In-memory (no database for v1)

All game logic is server-authoritative. Clients send intentions; server validates and broadcasts state.

---

## Setup & Run

### Prerequisites

- Node.js 18+ and npm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ExegeticalLabs/exegete-ai.git
   cd exegete-ai
   ```

2. **Install dependencies:**

   ```bash
   # Shared types
   cd shared
   npm install
   npm run build
   cd ..

   # Server
   cd server
   npm install
   npm run build
   cd ..

   # Client
   cd client
   npm install
   cd ..
   ```

### Running the Application

**Option 1: Development mode (two terminals)**

Terminal 1 - Server:
```bash
cd server
npm run dev
```
Server will start on `ws://localhost:8080`

Terminal 2 - Client:
```bash
cd client
npm run dev
```
Client will start on `http://localhost:3000`

**Option 2: Production build**

```bash
# Build all
cd shared && npm run build && cd ..
cd server && npm run build && cd ..
cd client && npm run build && cd ..

# Run server
cd server && npm start

# Serve client (use any static server)
cd client && npm run preview
```

---

## How to Play

### 1. Start a Game

- **Player 1:** Open `http://localhost:3000` and click **Create Room**
- Note the 4-letter room code (e.g., `XY7K`)

- **Player 2:** Open `http://localhost:3000` in another browser/window
- Enter the room code and click **Join Room**

### 2. Cut for First Dealer

- Both players click **Cut for Deal**
- Server shows each player's cut card
- Lower card becomes the dealer
- (Ties cause automatic re-shuffle and re-cut)

### 3. Deal & Play

The game follows standard 2-player cribbage structure:

**Deal:**
- Dealer clicks **Shuffle & Deal**
- Each player gets 6 cards

**Discard to Crib:**
- Each player selects 2 cards (click to select)
- Click **Confirm Discards**
- Crib (4 cards) belongs to the dealer

**Cut Starter:**
- Pone clicks **Cut for Starter**
- Starter card is revealed to both
- (If Jack: "His Heels" message shown, but no auto-scoring)

**Pegging:**
- Pone plays first card
- Players alternate playing cards
- Running count shown (cannot exceed 31)
- When you can't play, click **Declare Go**
- When both can't play or count hits 31, run resets
- Continues until all cards played

**Show Hands:**
- Each player sees their 4 cards + starter
- Count your own hand manually
- Click **Hand Counted** when done

**Show Crib:**
- Crib revealed to both
- Dealer counts crib manually
- Click **Crib Counted**

**Next Hand:**
- Dealer clicks **Start Next Hand**
- Dealer role swaps
- Fresh deck, repeat

---

## Game Rules Enforced

This app enforces **structural** rules only:

✅ **Turn order** - Pone leads, then alternates
✅ **31 limit** - Cannot play card that would exceed 31
✅ **Deck integrity** - 52 unique cards, no dupes
✅ **Phase correctness** - Can't cut starter during pegging, etc.
✅ **Role permissions** - Only dealer can deal, only pone can cut

❌ **NOT enforced:** Scoring combos (pairs, runs, 15s, flushes, etc.)
You count your own points. This is intentional.

---

## Testing

### Server Unit Tests

```bash
cd server
npm run build
node dist/game-engine.test.js
```

Tests verify:
- Deck integrity (no missing/duplicate cards)
- State transitions (LOBBY → CUT_FOR_DEAL → DEAL → etc.)
- Legal plays (cannot play out of turn, cannot exceed 31)

### Manual Testing

Open two browser windows side-by-side and play through a full hand.

---

## Architecture Details

### Server

- **`game-engine.ts`** - Core state machine (all transitions & validation)
- **`session-manager.ts`** - Room creation, joining, reconnection
- **`view-builder.ts`** - Filters game state per player (visibility rules)
- **`websocket-handler.ts`** - Message routing & broadcasting
- **`index.ts`** - WebSocket server entry point

### Client

- **`hooks/useGameSocket.ts`** - WebSocket connection & messaging
- **`components/Lobby.tsx`** - Room creation/join screen
- **`components/GameTable.tsx`** - Main game interface
- **`components/Card.tsx`** - Individual card rendering
- **`components/Hand.tsx`** - Hand of cards
- **`components/PegStack.tsx`** - Pegging display with running count

### Shared

- **`types.ts`** - All TypeScript interfaces & types
- **`deck.ts`** - Deck creation, shuffling, card utilities

---

## Spec Compliance

This implementation follows:
- **`CLAUDE.md`** - Project manifest & ground rules
- **`docs/remote-deck-spec.md`** - Full v1 specification

Any discrepancies should be fixed by updating the spec first, then code.

---

## Development Notes

### Adding Features

If you want to add new features (e.g., spectators, other games, scoring hints):

1. Update `docs/remote-deck-spec.md` with the new behavior
2. Implement in game engine
3. Update view builder for new visibility rules
4. Add client UI changes
5. Add tests

### Debugging

- Server logs appear in the server terminal
- Client console shows WebSocket messages
- Check browser DevTools Network tab for WebSocket frames

### Known Limitations (v1)

- No persistence (sessions end when server restarts)
- No authentication or user accounts
- No spectator mode
- No game history or replays
- No mobile-specific UI (but responsive layout works)

---

## License

MIT License - see LICENSE file

---

## Credits

Created by [Exegetical Labs](https://github.com/ExegeticalLabs)

Specification and implementation guided by `docs/remote-deck-spec.md`.

---

## Support

For issues or questions:
- Open an issue on GitHub
- Check `docs/remote-deck-spec.md` for behavior clarification
- Review `CLAUDE.md` for project philosophy

---

**Enjoy playing cribbage with your friends, wherever they are!**
