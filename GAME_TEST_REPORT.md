# Love Letter Game Test Report

**Reviewed by**: Game Tester Agent
**Date**: 2026-02-18
**Files Reviewed**: All src/ and party/ files (types, constants, engine, BotAI, stores, server, hooks, card components)

---

## 1. Critical Game Mechanic Bugs

### BUG-001: Wrong Deck Size for 2-4 Players [CRITICAL]
**Files**: `src/engine/LoveLetterEngine.ts:50`, `party/server.ts:806`

Both the client engine and the server always use the full 21-card deck (`createFullDeck()`), even for 2-4 player games. Per the 2019 Love Letter rules:
- **2-4 players**: Use the 16-card classic deck (remove Spy x2, Chancellor x2, 1 Guard)
- **5-6 players**: Use the full 21-card deck

A `createClassicDeck()` function exists in `src/constants/loveLetter.ts` but is never called.

**Impact**: With 2-4 players, the deck is oversized, rounds run too long, Spy and Chancellor appear in games where they shouldn't, and the game balance is fundamentally broken.

**Fix**: In both `LoveLetterEngine.createNewRound()` and `server.ts:createNewRound()`, use:
```ts
const deck = shuffle(playerCount <= 4 ? createClassicDeck() : createFullDeck());
```

---

### BUG-002: Client-Side Engine Tie Handling Is Incorrect [CRITICAL]
**File**: `src/engine/LoveLetterEngine.ts:657-671`

When the deck empties and multiple alive players tie with the highest card value, the client engine:
1. Does a secondary tiebreak by discard pile total (not in the 2019 rules)
2. Picks a SINGLE winner (the first with the highest discard total)

Per 2019 rules: **All tied players should each receive a token.** There is no secondary tiebreak.

The **server** correctly handles this with `endRoundMultipleWinners()` (line 1688), but the **client-side engine** used for local games does not.

**Fix**: Remove the discard-pile tiebreak in `resolveRound()`. When multiple players tie, award tokens to all of them.

---

### BUG-003: Spy Bonus Winner Can Silently Win the Game (Server) [CRITICAL]
**File**: `party/server.ts:1667-1681`, `party/server.ts:1714-1729`

After awarding tokens at round end, the server only checks the **round winner(s)** for reaching `tokensToWin`. If the spy bonus recipient (a different player) reaches the threshold, the game doesn't end.

Example: Player A wins the round (now at 5 tokens). Player B gets the spy bonus (now at 6 tokens, meeting the 2-player threshold). The server only checks Player A → game continues. Player B's win is missed.

The **client engine** (`checkGameWin`) correctly checks ALL players, so this is a server-only bug.

**Fix**: After awarding all tokens (round win + spy bonus), check ALL players for `tokens >= tokensToWin`.

---

### BUG-004: RoundResult Type Cannot Represent Multiple Winners [MODERATE]
**File**: `src/types/game.ts:74`

```ts
winnerId: string;   // Should be winnerIds: string[]
winnerName: string;  // Should support multiple names
```

The server works around this by joining names into `winnerName` (e.g., "Alice & Bob"), but the `winnerId` field can only hold one player's ID. This breaks any logic that depends on `winnerId` for tied rounds (e.g., UI highlighting the winner).

---

## 2. Moderate Game Mechanic Issues

### BUG-005: Server Doesn't Invalidate knownCards After Prince Effect [MODERATE]
**File**: `party/server.ts:1509-1560`

When Prince forces a target to discard and draw a new card, other players' `knownCards` entries about that target become stale. The client engine correctly invalidates these (line 476-478), but the server does not. This means server-side bots could make decisions based on outdated card information.

**Fix**: After Prince effect resolves, iterate all players and remove `knownCards` entries where `playerId === targetId`.

---

### BUG-006: Client Engine playCard() Doesn't Enforce Countess Rule [MODERATE]
**File**: `src/engine/LoveLetterEngine.ts:124-184`

The `playCard()` method doesn't validate the Countess forced-play rule. While `getPlayableCards()` correctly restricts choices, `playCard()` would accept and execute a non-Countess card even when the rule applies. The server correctly enforces this (line 917-926).

For local games, if the UI sends the wrong card index, the engine would silently allow an illegal play.

---

### BUG-007: Client Engine Doesn't Validate Guard Guess [MODERATE]
**File**: `src/engine/LoveLetterEngine.ts:315-340`

The `resolveGuard()` method doesn't reject `'Guard'` as a guess. While the `GUARD_GUESS_OPTIONS` constant excludes Guard and the server validates it (line 1092), the client engine would accept and resolve an illegal Guard guess.

---

### BUG-008: Client Engine Round Number Always Starts at 1 [LOW]
**File**: `src/engine/LoveLetterEngine.ts:91`

`createNewRound()` always sets `roundNumber: 1`. The game store works around this (line 169), but the engine itself doesn't track round progression.

---

### BUG-009: Client Engine Starting Player Is Always Index 0 [LOW]
**File**: `src/engine/LoveLetterEngine.ts:89`

`createNewRound()` always sets `currentPlayerIndex: 0`. The server correctly rotates the starting player (line 839), but local games always start with the first player.

---

## 3. Edge Cases Verified (Passing)

| Edge Case | Engine | Server | Status |
|---|---|---|---|
| Prince targeting player holding Princess → elimination | Lines 458-462 | Lines 1528-1537 | PASS |
| Prince targeting self when deck empty → draws set-aside card | Lines 466-472 | Lines 1541-1546 | PASS |
| Chancellor when deck has 0 cards → no effect | Lines 192-195 | Lines 1410-1421 | PASS |
| Chancellor when deck has 1 card → draw 1, pick from 2 | Lines 198-205 | Lines 1403-1408 | PASS |
| All but one eliminated → round ends immediately | `checkRoundEnd` | `checkAndResolveRoundEnd` | PASS |
| Deck empty → reveal hands, highest wins | `resolveRound` | `checkAndResolveRoundEnd` | PASS |
| 2-player setup: 1 face-down + 3 face-up removed | Lines 68-72 | Lines 813-818 | PASS |
| 3+ player setup: only 1 face-down card | Lines 64-65 | Lines 808-809 | PASS |
| Handmaid protection expires at START of next turn | Line 107 | Line 859 | PASS |
| Countess forced play: Countess + King/Prince | `mustPlayCountess` | Line 870, 917 | PASS |
| Guard cannot guess "Guard" | `GUARD_GUESS_OPTIONS` | Line 1092 | PASS (UI/constants) |
| Eliminated player discards hand face-up | `eliminatePlayer` | Multiple locations | PASS |
| Spy bonus: exactly 1 alive player played Spy | Line 682 | Line 1741 | PASS |
| Multiple spies by same player = 1 bonus token | `hasPlayedSpy` is boolean | Same | PASS |
| Spy by eliminated player doesn't count | Filter by `isAlive` | Filter by `isAlive` | PASS |
| Chancellor Countess rule NOT triggered during pick | No check | No check | PASS |
| Baron tie = nothing happens | Line 420-421 | Line 1338-1339 | PASS |
| King trade: both players see swapped cards | Lines 511-528 | Lines 1450-1464 | PASS |

---

## 4. Missing Features / Incomplete Implementation

### MISSING-001: App.tsx Is Still Default Vite Template
**File**: `src/App.tsx`

The main application component still shows the default Vite + React counter example. It needs to be replaced with the Love Letter game UI (lobby, game board, round end, game over screens).

### MISSING-002: No Game Screen Components
The following screens are not yet implemented:
- Lobby screen (player list, bot management, start game)
- Game board (card hand, player areas, deck, discard piles)
- Target selection UI
- Guard guess UI
- Chancellor card pick UI
- Round end screen (results, token awards)
- Game over screen (winner, play again)

### MISSING-003: No Action Log UI Component
The `gameStore` tracks `actionLog: string[]` but there's no UI component to display it.

### MISSING-004: No Priest Peek UI for Local Games
When Priest is played in a local game, the card info is recorded in `knownCards` but there's no visible feedback to the player showing the peeked card.

### MISSING-005: No Return to Lobby in Local Game
The server has `handleReturnToLobby`, but the local game store only has `resetGame` which clears all players.

### MISSING-006: No Online Game Connection UI
While `usePartySocket` and `onlineStore` exist, there's no UI for creating/joining rooms or displaying online game state.

---

## 5. Database / Stats Issues

### DB-001: Schema Uses Flip7 Fields Instead of Love Letter
**File**: `party/db.ts`

The `PlayerStats`, `GamePlayerData`, and related interfaces use Flip7-specific fields:
- `bust_count`, `flip7_count`, `highest_hand` (Flip7 concepts)
- `getPlayerStats()` defaults to `gameType = 'flip7'`
- `getRecentGames()` defaults to `gameType = 'flip7'`
- `getLeaderboard()` defaults to `gameType = 'flip7'`

The server passes `bustCount: 0` and `flip7Count: 0` as dummy values (server.ts:2242-2243).

**Meanwhile**: `src/types/stats.ts` has correct Love Letter fields (`total_rounds_won`, `total_eliminations`, `total_spy_bonuses`), but `party/db.ts` doesn't match.

**Fix**: Update `db.ts` to use Love Letter-specific stats fields matching `stats.ts`.

### DB-002: Server Records highestHand from Discards Only
**File**: `party/server.ts:2244`

`Math.max(...p.discardPile.map((c) => c.value), 0)` only looks at discarded cards, missing the player's current hand card when the game ends.

---

## 6. Code Quality Issues

### CODE-001: Double Semicolon
**File**: `party/server.ts:1495`
```ts
player.hand = [];;  // Double semicolon
```

### CODE-002: Server Duplicates Constants
**File**: `party/server.ts:28-66`

Card definitions, guard guess options, player avatars/colors, and utility functions are all duplicated from `src/constants/loveLetter.ts`. Any rule change must be updated in TWO places.

### CODE-003: Bot AI Is Duplicated Between Client and Server
The client has a sophisticated `BotAI` class (src/engine/BotAI.ts) with card counting and strategic play. The server has its own simpler bot logic (server.ts:1766-2046) that doesn't use the `BotAI` class. The server bots are less strategic than the client bots.

### CODE-004: Redundant GameState Construction
**File**: `src/store/gameStore.ts`

Every store action manually constructs a `GameState` object from individual properties (lines 186-199, 220-234, 260-274, etc.). This could be a helper function.

---

## 7. UI/UX Suggestions

### UX-001: Card Component Has Good Foundation
`CharacterCard.tsx` is well-implemented with:
- Unique SVG character icons for each card
- Color-coded by card type
- Effect text on medium/large cards
- Hover/tap animations via Framer Motion
- Face-down variant

### UX-002: Missing Features for Game Screen (When Built)
The following should be included:
- **Turn indicator**: Clear visual showing whose turn it is
- **Card hover/long-press tooltips**: Show full card effect descriptions
- **Discard pile browsing**: Allow players to review discard piles for card counting
- **Token display**: Visual tokens per player (the data is there, needs UI)
- **Handmaid shield indicator**: Visual indicator when a player is protected
- **Animation for card play resolution**: Animate card flying to target, comparison results, elimination effects
- **Priest peek modal**: Show the peeked card prominently
- **Baron comparison modal**: Show both cards side by side
- **Chancellor card selection**: 3-card picker interface
- **Round/game win celebration**: Animated results with token award

### UX-003: Background Scene Is Atmospheric
`BackgroundScene.tsx` creates a nice royal court atmosphere with wax seals, scrolls, and candle glows. The theme palette in `loveLetterStyles.ts` is well-designed.

---

## 8. Bot AI Assessment

### Client-Side BotAI (src/engine/BotAI.ts)
- **Easy**: Random valid plays ✅
- **Medium**: Heuristic scoring (avoid Princess, prefer low cards, Spy bonus, Guard probability) ✅
- **Hard**: Card counting, known card exploitation, strategic Baron/Guard plays, 10% Countess bluff ✅
- Card counting via `getRemainingCards` is well-implemented
- Guard guess uses probability calculation from remaining cards ✅
- Known cards from Priest are exploited for guaranteed Guard hits ✅

### Server-Side Bot (party/server.ts:1766-2046)
- Simpler than the client bot AI
- Hard bot checks `knownCards` for Guard and Baron decisions ✅
- Medium bot prefers lower-value non-Princess cards ✅
- **Missing**: No card counting on server side (unlike client BotAI)
- **Missing**: No Countess bluff behavior on server

### Bot Issue: No Validation of Stale KnownCards
When cards change hands (Prince, King), the server doesn't clean up `knownCards` (BUG-005), so bots may act on outdated info.

---

## 9. Multiplayer Assessment

### What Works Well:
- Per-player snapshot filtering (hand cards only visible to owner) ✅
- Reconnection with token-based session recovery ✅
- Host migration when host disconnects ✅
- Server-side Countess enforcement (prevents cheating) ✅
- Server-side Guard guess validation ✅
- Bot turns run server-side with delays ✅
- Proper CORS headers for API endpoints ✅

### What Needs Attention:
- No rate limiting on client messages
- No validation that the connection's player is the current player for target/guess actions (partially checked but could be tighter)
- `princeTarget` handler doesn't check that the card being played is actually Prince (line 1177 does check) ✅
- WebSocket reconnection uses PartySocket's built-in retry ✅

---

## 10. Overall Quality Assessment

### Strengths:
1. **Clean architecture**: Separation between pure engine logic, state management, server, and UI
2. **Type safety**: Strong TypeScript types for all game state, actions, and protocol messages
3. **Correct card definitions**: All 10 cards with correct counts, values, and target types
4. **Good security model**: Server is authoritative, snapshots filter sensitive information
5. **Bot AI quality**: Three distinct difficulty levels with meaningful strategic differences (client side)
6. **Visual design system**: Well-thought-out royal court theme with card-specific colors

### Critical Issues (Must Fix Before Playable):
1. **BUG-001**: Wrong deck for 2-4 players (game-breaking)
2. **BUG-002**: Client tie handling picks single winner instead of awarding all
3. **BUG-003**: Spy bonus winner can silently win game (server)
4. **MISSING-001/002**: No game UI screens (App.tsx is still Vite default)

### Summary:
The game engine foundation is solid with most card mechanics correctly implemented. The server has proper multiplayer infrastructure including reconnection and host migration. The critical bugs are concentrated around deck selection (always 21 cards instead of 16 for small games), tie handling in the client engine, and a spy bonus edge case in the server. The UI is still incomplete - card components look great but the game screens haven't been built yet. Once the critical bugs are fixed and the UI is wired up, this should be a faithful implementation of Love Letter (2019 edition).

---

## Priority Fix Order:
1. **BUG-001** - Use correct deck per player count (both engine and server)
2. **BUG-002** - Fix tie handling in client engine (award all tied players)
3. **BUG-003** - Fix spy bonus game-win check (server)
4. **MISSING-001/002** - Build game UI screens
5. **BUG-004** - Update RoundResult type for multiple winners
6. **BUG-005** - Invalidate knownCards after Prince on server
7. **DB-001** - Update database schema for Love Letter stats
8. **BUG-006/007** - Add server-style validation to client engine
