// ─── Love Letter Game Engine ─────────────────────────────────────────
// Pure static methods for all game logic. No side effects, no state mutation.
// Every method returns a new state object (immutable pattern).

import type {
  Card,
  CardName,
  GameState,
  Player,
  RoundResult,
  GamePhase,
  TurnPhase,
  KnownCard,
} from '../types/game';

import {
  createFullDeck,
  shuffle,
  getTokensToWin,
  getCardDef,
  mustPlayCountess,
} from '../constants/loveLetter';

// ─── Helpers ─────────────────────────────────────────────────────────

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function findPlayer(players: Player[], id: string): Player | undefined {
  return players.find((p) => p.id === id);
}

function alivePlayersExcept(players: Player[], excludeId: string): Player[] {
  return players.filter((p) => p.isAlive && p.id !== excludeId);
}

function alivePlayers(players: Player[]): Player[] {
  return players.filter((p) => p.isAlive);
}

// ─── Engine ──────────────────────────────────────────────────────────

export class LoveLetterEngine {
  // ── Initialize a new round ───────────────────────────────────────

  static createNewRound(players: Player[], playerCount: number): GameState {
    // Shuffle a fresh deck
    let deck = shuffle(createFullDeck());

    // Reset per-round player state but keep tokens/identity
    const roundPlayers: Player[] = players.map((p) => ({
      ...p,
      hand: [],
      discardPile: [],
      isAlive: true,
      isProtected: false,
      hasPlayedSpy: false,
      knownCards: [],
    }));

    // Set aside 1 card face-down
    const setAsideCard = deck[0];
    deck = deck.slice(1);

    // 2-player variant: also remove 3 cards face-up
    let faceUpCards: Card[] = [];
    if (playerCount === 2) {
      faceUpCards = deck.slice(0, 3);
      deck = deck.slice(3);
    }

    // Deal 1 card to each player
    for (let i = 0; i < roundPlayers.length; i++) {
      roundPlayers[i] = {
        ...roundPlayers[i],
        hand: [deck[0]],
      };
      deck = deck.slice(1);
    }

    return {
      phase: 'playing' as GamePhase,
      players: roundPlayers,
      deck,
      setAsideCard,
      faceUpCards,
      currentPlayerIndex: 0,
      turnPhase: 'drawing' as TurnPhase,
      roundNumber: 1,
      lastRoundResult: null,
      chancellorDrawn: [],
      pendingAction: {},
      gameWinnerId: null,
      tokensToWin: getTokensToWin(playerCount),
    };
  }

  // ── Draw a card for the current player ───────────────────────────

  static drawCard(state: GameState): GameState {
    const s = cloneState(state);
    const player = s.players[s.currentPlayerIndex];

    // Clear Handmaid protection at start of turn (before drawing)
    player.isProtected = false;

    if (s.deck.length === 0) {
      // No cards to draw - should not normally happen, round should have ended
      s.turnPhase = 'choosing';
      return s;
    }

    const drawn = s.deck.shift()!;
    player.hand.push(drawn);
    s.turnPhase = 'choosing';

    return s;
  }

  // ── Play a card from hand ────────────────────────────────────────

  static playCard(state: GameState, cardIndex: number): GameState {
    const s = cloneState(state);
    const player = s.players[s.currentPlayerIndex];

    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      return s; // Invalid index, no change
    }

    const card = player.hand[cardIndex];

    // Remove card from hand
    player.hand.splice(cardIndex, 1);

    // Add to discard pile (played face-up)
    player.discardPile.push(card);

    // Track Spy usage
    if (card.name === 'Spy') {
      player.hasPlayedSpy = true;
    }

    // Store pending action
    s.pendingAction = { playedCard: card };

    // Determine next phase based on card
    const def = getCardDef(card.name);

    // Cards with no target/effect just resolve immediately
    if (def.targetType === 'none') {
      // Spy, Handmaid, Countess, Princess, Chancellor all have targetType 'none'
      if (card.name === 'Chancellor') {
        return LoveLetterEngine.handleChancellorDraw(s);
      }
      // Resolve immediately
      s.turnPhase = 'resolving';
      return LoveLetterEngine.resolveCardEffect(s, card, player.id);
    }

    // Cards that need a target
    const validTargets = LoveLetterEngine.getValidTargets(s, card.name, player.id);

    if (validTargets.length === 0) {
      // No valid targets (all protected or no other alive players)
      // Card has no effect
      s.turnPhase = 'resolved';
      return s;
    }

    if (def.targetType === 'guess') {
      // Guard needs target + guess
      s.turnPhase = 'selectingTarget';
    } else if (def.targetType === 'other') {
      // Priest, Baron, King need a target (another player)
      s.turnPhase = 'selectingTarget';
    } else if (def.targetType === 'any') {
      // Prince can target self or others
      s.turnPhase = 'selectingTarget';
    }

    return s;
  }

  // ── Handle Chancellor draw phase ─────────────────────────────────

  private static handleChancellorDraw(state: GameState): GameState {
    const s = state; // already cloned in playCard
    const player = s.players[s.currentPlayerIndex];

    if (s.deck.length === 0) {
      // Empty deck: Chancellor has no effect
      s.turnPhase = 'resolved';
      return s;
    }

    if (s.deck.length === 1) {
      // 1 card in deck: draw 1, player has 2, pick 1 keep, return 1
      const drawn = s.deck.shift()!;
      player.hand.push(drawn);
      s.chancellorDrawn = [...player.hand];
      s.turnPhase = 'chancellorPick';
      return s;
    }

    // Normal: draw 2 cards, player now has 3
    const drawn1 = s.deck.shift()!;
    const drawn2 = s.deck.shift()!;
    player.hand.push(drawn1, drawn2);
    s.chancellorDrawn = [...player.hand];
    s.turnPhase = 'chancellorPick';
    return s;
  }

  // ── Select a target for the current card ─────────────────────────

  static selectTarget(state: GameState, targetId: string): GameState {
    const s = cloneState(state);
    s.pendingAction = { ...s.pendingAction, targetPlayerId: targetId };

    const card = s.pendingAction.playedCard;
    if (!card) return s;

    if (card.name === 'Guard') {
      // Guard also needs a guess
      s.turnPhase = 'guardGuessing';
      return s;
    }

    // All other targeted cards resolve now
    const playerId = s.players[s.currentPlayerIndex].id;
    s.turnPhase = 'resolving';
    return LoveLetterEngine.resolveCardEffect(s, card, playerId, targetId);
  }

  // ── Guard guess ──────────────────────────────────────────────────

  static guardGuess(state: GameState, guess: CardName): GameState {
    const s = cloneState(state);
    s.pendingAction = { ...s.pendingAction, guardGuess: guess };

    const card = s.pendingAction.playedCard;
    const targetId = s.pendingAction.targetPlayerId;
    if (!card || !targetId) return s;

    const playerId = s.players[s.currentPlayerIndex].id;
    s.turnPhase = 'resolving';
    return LoveLetterEngine.resolveCardEffect(s, card, playerId, targetId, guess);
  }

  // ── Resolve card effect ──────────────────────────────────────────

  static resolveCardEffect(
    state: GameState,
    card: Card,
    playerId: string,
    targetId?: string,
    guardGuess?: CardName,
  ): GameState {
    let s = state; // Caller must have cloned already

    switch (card.name) {
      case 'Spy':
        // No effect when played
        s.turnPhase = 'resolved';
        break;

      case 'Guard':
        s = LoveLetterEngine.resolveGuard(s, playerId, targetId, guardGuess);
        break;

      case 'Priest':
        s = LoveLetterEngine.resolvePriest(s, playerId, targetId);
        break;

      case 'Baron':
        s = LoveLetterEngine.resolveBaron(s, playerId, targetId);
        break;

      case 'Handmaid':
        s = LoveLetterEngine.resolveHandmaid(s, playerId);
        break;

      case 'Prince':
        s = LoveLetterEngine.resolvePrince(s, targetId);
        break;

      case 'Chancellor':
        // Chancellor draw handled separately; if we reach here it's a no-effect case
        s.turnPhase = 'resolved';
        break;

      case 'King':
        s = LoveLetterEngine.resolveKing(s, playerId, targetId);
        break;

      case 'Countess':
        // No effect when played
        s.turnPhase = 'resolved';
        break;

      case 'Princess':
        // Playing Princess = self-elimination
        s = LoveLetterEngine.eliminatePlayer(s, playerId);
        s.turnPhase = 'resolved';
        break;
    }

    return s;
  }

  // ── Individual card resolutions ──────────────────────────────────

  private static resolveGuard(
    state: GameState,
    _playerId: string,
    targetId?: string,
    guardGuess?: CardName,
  ): GameState {
    const s = state;
    if (!targetId || !guardGuess) {
      s.turnPhase = 'resolved';
      return s;
    }

    const target = findPlayer(s.players, targetId);
    if (!target || !target.isAlive || target.hand.length === 0) {
      s.turnPhase = 'resolved';
      return s;
    }

    // Check if target has the guessed card
    if (target.hand[0].name === guardGuess) {
      return LoveLetterEngine.eliminatePlayer(s, targetId);
    }

    s.turnPhase = 'resolved';
    return s;
  }

  private static resolvePriest(
    state: GameState,
    playerId: string,
    targetId?: string,
  ): GameState {
    const s = state;
    if (!targetId) {
      s.turnPhase = 'resolved';
      return s;
    }

    const target = findPlayer(s.players, targetId);
    const player = findPlayer(s.players, playerId);
    if (!target || !player || !target.isAlive || target.hand.length === 0) {
      s.turnPhase = 'resolved';
      return s;
    }

    // Player now knows target's card
    const knownCard: KnownCard = {
      playerId: targetId,
      card: { ...target.hand[0] },
      source: 'priest',
    };
    player.knownCards = player.knownCards.filter((k) => k.playerId !== targetId);
    player.knownCards.push(knownCard);

    s.turnPhase = 'resolved';
    return s;
  }

  private static resolveBaron(
    state: GameState,
    playerId: string,
    targetId?: string,
  ): GameState {
    const s = state;
    if (!targetId) {
      s.turnPhase = 'resolved';
      return s;
    }

    const player = findPlayer(s.players, playerId);
    const target = findPlayer(s.players, targetId);
    if (!player || !target || !player.isAlive || !target.isAlive) {
      s.turnPhase = 'resolved';
      return s;
    }
    if (player.hand.length === 0 || target.hand.length === 0) {
      s.turnPhase = 'resolved';
      return s;
    }

    const playerValue = player.hand[0].value;
    const targetValue = target.hand[0].value;

    // Both players now know each other's cards
    const playerKnown: KnownCard = {
      playerId: targetId,
      card: { ...target.hand[0] },
      source: 'baron',
    };
    const targetKnown: KnownCard = {
      playerId,
      card: { ...player.hand[0] },
      source: 'baron',
    };
    player.knownCards = player.knownCards.filter((k) => k.playerId !== targetId);
    player.knownCards.push(playerKnown);
    target.knownCards = target.knownCards.filter((k) => k.playerId !== playerId);
    target.knownCards.push(targetKnown);

    if (playerValue < targetValue) {
      return LoveLetterEngine.eliminatePlayer(s, playerId);
    } else if (targetValue < playerValue) {
      return LoveLetterEngine.eliminatePlayer(s, targetId);
    }

    // Tie: nothing happens
    s.turnPhase = 'resolved';
    return s;
  }

  private static resolveHandmaid(state: GameState, playerId: string): GameState {
    const s = state;
    const player = findPlayer(s.players, playerId);
    if (player) {
      player.isProtected = true;
    }
    s.turnPhase = 'resolved';
    return s;
  }

  private static resolvePrince(state: GameState, targetId?: string): GameState {
    const s = state;
    if (!targetId) {
      s.turnPhase = 'resolved';
      return s;
    }

    const target = findPlayer(s.players, targetId);
    if (!target || !target.isAlive || target.hand.length === 0) {
      s.turnPhase = 'resolved';
      return s;
    }

    // Target discards their hand
    const discardedCard = target.hand[0];
    target.hand = [];
    target.discardPile.push(discardedCard);

    // Track Spy if discarded
    if (discardedCard.name === 'Spy') {
      target.hasPlayedSpy = true;
    }

    // Princess discarded = elimination
    if (discardedCard.name === 'Princess') {
      target.isAlive = false;
      s.turnPhase = 'resolved';
      return s;
    }

    // Draw a new card
    if (s.deck.length > 0) {
      const newCard = s.deck.shift()!;
      target.hand.push(newCard);
    } else if (s.setAsideCard) {
      // Empty deck: draw the set-aside card
      target.hand.push(s.setAsideCard);
      s.setAsideCard = null;
    }

    // Invalidate any known card info about the target (their card changed)
    for (const p of s.players) {
      p.knownCards = p.knownCards.filter((k) => k.playerId !== targetId);
    }

    s.turnPhase = 'resolved';
    return s;
  }

  private static resolveKing(
    state: GameState,
    playerId: string,
    targetId?: string,
  ): GameState {
    const s = state;
    if (!targetId) {
      s.turnPhase = 'resolved';
      return s;
    }

    const player = findPlayer(s.players, playerId);
    const target = findPlayer(s.players, targetId);
    if (!player || !target || !player.isAlive || !target.isAlive) {
      s.turnPhase = 'resolved';
      return s;
    }
    if (player.hand.length === 0 || target.hand.length === 0) {
      s.turnPhase = 'resolved';
      return s;
    }

    // Swap hands
    const playerHand = [...player.hand];
    player.hand = [...target.hand];
    target.hand = playerHand;

    // Both players now know each other's new card (the card they gave away)
    const playerKnown: KnownCard = {
      playerId: targetId,
      card: { ...target.hand[0] },
      source: 'trade',
    };
    const targetKnown: KnownCard = {
      playerId,
      card: { ...player.hand[0] },
      source: 'trade',
    };

    // Update known cards: each knows what the other NOW has
    // (the player knows the target got their old card, and vice versa)
    player.knownCards = player.knownCards.filter((k) => k.playerId !== targetId);
    player.knownCards.push(playerKnown);
    target.knownCards = target.knownCards.filter((k) => k.playerId !== playerId);
    target.knownCards.push(targetKnown);

    // Also invalidate other players' knowledge about both (hands changed)
    for (const p of s.players) {
      if (p.id !== playerId && p.id !== targetId) {
        p.knownCards = p.knownCards.filter(
          (k) => k.playerId !== playerId && k.playerId !== targetId,
        );
      }
    }

    s.turnPhase = 'resolved';
    return s;
  }

  // ── Chancellor resolution ────────────────────────────────────────

  static resolveChancellor(state: GameState, keepIndex: number): GameState {
    const s = cloneState(state);
    const player = s.players[s.currentPlayerIndex];

    if (player.hand.length < 2 || keepIndex < 0 || keepIndex >= player.hand.length) {
      s.turnPhase = 'resolved';
      s.chancellorDrawn = [];
      return s;
    }

    // Player keeps 1 card, returns the rest to bottom of deck
    const keptCard = player.hand[keepIndex];
    const returnCards = player.hand.filter((_, i) => i !== keepIndex);

    player.hand = [keptCard];

    // Return cards to bottom of deck
    for (const card of returnCards) {
      s.deck.push(card);
    }

    // Record known card info for the player (they know what's at bottom of deck)
    // but this isn't tracked as knownCards since it's deck position, not a player's hand

    // Invalidate other players' knowledge about this player's hand
    for (const p of s.players) {
      if (p.id !== player.id) {
        p.knownCards = p.knownCards.filter((k) => k.playerId !== player.id);
      }
    }

    s.chancellorDrawn = [];
    s.turnPhase = 'resolved';
    return s;
  }

  // ── Eliminate a player ───────────────────────────────────────────

  static eliminatePlayer(state: GameState, playerId: string): GameState {
    const s = state; // Caller should have cloned
    const player = findPlayer(s.players, playerId);
    if (!player) return s;

    // Discard hand face-up
    for (const card of player.hand) {
      player.discardPile.push(card);
      // Track Spy if discarded
      if (card.name === 'Spy') {
        player.hasPlayedSpy = true;
      }
    }
    player.hand = [];
    player.isAlive = false;
    player.isProtected = false;

    // Invalidate knowledge about this player
    for (const p of s.players) {
      p.knownCards = p.knownCards.filter((k) => k.playerId !== playerId);
    }

    s.turnPhase = 'resolved';
    return s;
  }

  // ── Check if round should end ────────────────────────────────────

  static checkRoundEnd(state: GameState): { ended: boolean; reason?: string } {
    const alive = alivePlayers(state.players);

    if (alive.length <= 1) {
      return { ended: true, reason: 'lastStanding' };
    }

    if (state.deck.length === 0) {
      return { ended: true, reason: 'deckEmpty' };
    }

    return { ended: false };
  }

  // ── Resolve round end ────────────────────────────────────────────

  static resolveRound(state: GameState): { state: GameState; result: RoundResult } {
    const s = cloneState(state);
    const alive = alivePlayers(s.players);

    let winnerId: string;
    let winnerName: string;
    let reason: RoundResult['reason'];
    let revealedHands: RoundResult['revealedHands'];

    if (alive.length === 1) {
      // Last standing
      winnerId = alive[0].id;
      winnerName = alive[0].name;
      reason = 'lastStanding';
    } else {
      // Deck empty - compare hands
      revealedHands = alive.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        card: p.hand[0] ? { ...p.hand[0] } : { value: 0 as const, name: 'Spy' as const },
      }));

      // Find highest card value
      const maxValue = Math.max(...alive.map((p) => (p.hand[0] ? p.hand[0].value : 0)));
      const highestPlayers = alive.filter((p) => p.hand[0] && p.hand[0].value === maxValue);

      if (highestPlayers.length === 1) {
        winnerId = highestPlayers[0].id;
        winnerName = highestPlayers[0].name;
        reason = 'highestCard';
      } else {
        // Tiebreak: highest total of discarded card values
        let bestTotal = -1;
        let tieWinner = highestPlayers[0];
        for (const p of highestPlayers) {
          const total = p.discardPile.reduce((sum, c) => sum + c.value, 0);
          if (total > bestTotal) {
            bestTotal = total;
            tieWinner = p;
          }
        }
        winnerId = tieWinner.id;
        winnerName = tieWinner.name;
        reason = 'tiebreak';
      }
    }

    // Award token to winner
    const winner = findPlayer(s.players, winnerId);
    if (winner) {
      winner.tokens += 1;
    }

    // Check spy bonus: exactly 1 alive player who played/discarded a Spy
    let spyBonusPlayerId: string | undefined;
    const spyPlayers = alive.filter((p) => p.hasPlayedSpy);
    if (spyPlayers.length === 1) {
      spyBonusPlayerId = spyPlayers[0].id;
      const spyPlayer = findPlayer(s.players, spyBonusPlayerId);
      if (spyPlayer) {
        spyPlayer.tokens += 1;
      }
    }

    const result: RoundResult = {
      winnerId,
      winnerName,
      reason,
      revealedHands,
      spyBonusPlayerId,
    };

    s.lastRoundResult = result;
    s.phase = 'roundEnd';

    return { state: s, result };
  }

  // ── Check if any player has won the game ─────────────────────────

  static checkGameWin(state: GameState): string | null {
    for (const player of state.players) {
      if (player.tokens >= state.tokensToWin) {
        return player.id;
      }
    }
    return null;
  }

  // ── Get valid targets for a card ─────────────────────────────────

  static getValidTargets(
    state: GameState,
    cardName: CardName,
    playerId: string,
  ): string[] {
    const def = getCardDef(cardName);

    if (def.targetType === 'none') {
      return [];
    }

    if (def.targetType === 'any') {
      // Prince: can target self or any unprotected alive opponent
      const others = alivePlayersExcept(state.players, playerId).filter(
        (p) => !p.isProtected,
      );
      if (others.length === 0) {
        // All others protected: must target self
        return [playerId];
      }
      // Can target self or any unprotected opponent
      return [playerId, ...others.map((p) => p.id)];
    }

    // 'other' or 'guess': must target another alive, unprotected player
    const others = alivePlayersExcept(state.players, playerId).filter(
      (p) => !p.isProtected,
    );

    if (others.length === 0) {
      // All others protected: card has no effect (handled by caller)
      return [];
    }

    return others.map((p) => p.id);
  }

  // ── Get playable card indices ────────────────────────────────────

  static getPlayableCards(state: GameState, playerIndex: number): number[] {
    const player = state.players[playerIndex];
    if (!player || player.hand.length < 2) {
      // If only 1 card, must play it (should not happen during choosing phase)
      return player.hand.map((_, i) => i);
    }

    // Countess forced play: if holding Countess + King or Prince, must play Countess
    if (mustPlayCountess(player.hand)) {
      const countessIndex = player.hand.findIndex((c) => c.name === 'Countess');
      if (countessIndex >= 0) {
        return [countessIndex];
      }
    }

    // Otherwise all cards are playable
    return player.hand.map((_, i) => i);
  }

  // ── Advance to next alive player ─────────────────────────────────

  static advanceToNextPlayer(state: GameState): GameState {
    const s = cloneState(state);
    const playerCount = s.players.length;
    let nextIndex = (s.currentPlayerIndex + 1) % playerCount;

    // Find the next alive player
    let attempts = 0;
    while (!s.players[nextIndex].isAlive && attempts < playerCount) {
      nextIndex = (nextIndex + 1) % playerCount;
      attempts++;
    }

    s.currentPlayerIndex = nextIndex;
    s.turnPhase = 'drawing';
    s.pendingAction = {};
    s.chancellorDrawn = [];

    return s;
  }
}
