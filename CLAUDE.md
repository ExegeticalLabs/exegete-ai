# cribbage-remote-deck — Claude Manifest

You are the coding agent responsible for implementing this repository.

Primary goals:

1. Implement a **remote shared deck service** for human vs human card play.
2. First supported mode: **2-player cribbage**, following the `docs/remote-deck-spec.md`.
3. Guarantee **deck integrity + synchronized state** across browsers.
4. Keep scoring **manual by default**; the app assists (counts, visibility, phases) but does not play the game for users.

---

## Ground Rules

- **Source of truth:** `docs/remote-deck-spec.md`. Always read it before making changes.
- **Tech stack (v1 suggestion, can refine but keep simple):**
  - Backend: Node.js + TypeScript + WebSocket server.
  - Frontend: React + TypeScript + Vite.
  - State mgmt: A small in-memory game engine module (no DB v1).
- **Authoritative state lives on the server.**
  - Clients never fabricate cards.
  - No client may see another player's hand except when rules say so (e.g. reveal stages).

- **Cribbage rules alignment:**
  - Use a standard 52-card deck.
  - Two players: Dealer & Pone.
  - 6 cards dealt each; each discards 2 to dealer's crib.
  - Pone cuts for starter; lowest cut for first dealer; alternate dealers thereafter.
  - Pone leads pegging; other rules per ACC cribbage standard where relevant to deck + flow. (Scoring logic may be advisory/visual only.)

- **Non-goals for v1:**
  - No user accounts, rankings, chat, or money.
  - No AI opponent.
  - No full rules-policing beyond structural constraints described in the spec.
  - No mobile app; just responsive web.

---

## Implementation Tasks (high level)

When asked to "build" or "start over", you should:

1. **Read** `docs/remote-deck-spec.md`.
2. **Create** a clean project structure:
   - `server/` — WebSocket server + game engine.
   - `shared/` — shared types & constants.
   - `client/` — React UI.
3. **Implement**:
   - Room/join via short code.
   - Role assignment (Dealer/Pone).
   - Full hand lifecycle state machine (deal → discard → cut → play → show → crib → next hand).
   - WebSocket events that match the spec.
   - UI that reflects the "single shared deck on a table" vibe.
4. **Add tests** for:
   - Deck integrity (no dupes / missing cards).
   - Legal transitions (cannot play or cut out of order).
   - Correct visibility (only see what you're allowed to see).

You may propose refinements, but **do not** contradict `docs/remote-deck-spec.md` without explicit human approval.

Be explicit, deterministic, and keep everything small and auditable.
