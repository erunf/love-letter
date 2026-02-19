// ─── Love Letter Bot AI ──────────────────────────────────────────────
// Three difficulty levels: easy (random), medium (heuristic), hard (card counting).

import type {
  BotDifficulty,
  Card,
  CardName,
  GameState,
  Player,
} from '../types/game';

import {
  CARD_DEFINITIONS,
  GUARD_GUESS_OPTIONS,
  mustPlayCountess,
} from '../constants/loveLetter';

import { LoveLetterEngine } from './LoveLetterEngine';

// ─── Types ───────────────────────────────────────────────────────────

interface BotAction {
  cardIndex: number;
  targetId?: string;
  guardGuess?: CardName;
  chancellorKeepIndex?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function aliveOpponents(players: Player[], myId: string): Player[] {
  return players.filter((p) => p.isAlive && p.id !== myId);
}

/** Count how many copies of each card remain unseen (not in discards, faceUp, or our hand). */
function getRemainingCards(
  state: GameState,
  myHand: Card[],
): Map<CardName, number> {
  const remaining = new Map<CardName, number>();

  // Start with full deck counts
  for (const def of CARD_DEFINITIONS) {
    remaining.set(def.name, def.count);
  }

  // Subtract all visible cards: discard piles, face-up cards
  for (const player of state.players) {
    for (const card of player.discardPile) {
      remaining.set(card.name, (remaining.get(card.name) ?? 0) - 1);
    }
  }
  for (const card of state.faceUpCards) {
    remaining.set(card.name, (remaining.get(card.name) ?? 0) - 1);
  }

  // Subtract our own hand
  for (const card of myHand) {
    remaining.set(card.name, (remaining.get(card.name) ?? 0) - 1);
  }

  return remaining;
}

/** Total unseen cards (in deck + other players' hands, excluding our hand). */
function totalUnseen(remaining: Map<CardName, number>): number {
  let total = 0;
  for (const count of remaining.values()) {
    total += Math.max(0, count);
  }
  return total;
}

// ─── Bot AI ──────────────────────────────────────────────────────────

export class BotAI {
  static chooseAction(
    state: GameState,
    playerIndex: number,
    difficulty: BotDifficulty,
  ): BotAction {
    switch (difficulty) {
      case 'easy':
        return BotAI.easyAction(state, playerIndex);
      case 'medium':
        return BotAI.mediumAction(state, playerIndex);
      case 'hard':
        return BotAI.hardAction(state, playerIndex);
    }
  }

  // ── Chancellor choice (called separately) ────────────────────────

  static chooseChancellor(
    state: GameState,
    playerIndex: number,
    difficulty: BotDifficulty,
  ): number {
    const player = state.players[playerIndex];
    const hand = player.hand;

    if (hand.length < 2) return 0;

    switch (difficulty) {
      case 'easy':
        return Math.floor(Math.random() * hand.length);

      case 'medium':
      case 'hard': {
        // Keep the highest value card (but not Princess if we can avoid danger)
        let bestIndex = 0;
        let bestValue = -1;
        for (let i = 0; i < hand.length; i++) {
          // Hard bot: slightly penalize Princess (risk of Prince forcing discard)
          const effectiveValue =
            difficulty === 'hard' && hand[i].name === 'Princess'
              ? 7
              : hand[i].value;
          if (effectiveValue > bestValue) {
            bestValue = effectiveValue;
            bestIndex = i;
          }
        }
        return bestIndex;
      }
    }
  }

  // ── Easy Bot: Random valid plays ─────────────────────────────────

  private static easyAction(state: GameState, playerIndex: number): BotAction {
    const player = state.players[playerIndex];
    const playableIndices = LoveLetterEngine.getPlayableCards(state, playerIndex);
    const cardIndex = randomElement(playableIndices);
    const card = player.hand[cardIndex];

    const validTargets = LoveLetterEngine.getValidTargets(
      state,
      card.name,
      player.id,
    );

    const action: BotAction = { cardIndex };

    if (validTargets.length > 0) {
      action.targetId = randomElement(validTargets);
    }

    if (card.name === 'Guard') {
      action.guardGuess = randomElement(GUARD_GUESS_OPTIONS);
    }

    return action;
  }

  // ── Medium Bot: Heuristic plays ──────────────────────────────────

  private static mediumAction(state: GameState, playerIndex: number): BotAction {
    const player = state.players[playerIndex];
    const playableIndices = LoveLetterEngine.getPlayableCards(state, playerIndex);

    // If forced (Countess), just play it
    if (playableIndices.length === 1) {
      return BotAI.buildAction(state, player, playableIndices[0]);
    }

    const remaining = getRemainingCards(state, player.hand);

    // Prefer playing lower-value cards to keep high cards in hand
    // But avoid playing Princess (value 9) at all costs
    // Don't play Baron if our remaining card is low
    const scored = playableIndices.map((idx) => {
      const card = player.hand[idx];
      const otherCard = player.hand[1 - idx];
      let score = 10 - card.value; // Base: prefer lower cards (higher score for lower value)

      // Never voluntarily play Princess
      if (card.name === 'Princess') {
        score = -100;
      }

      // Don't play Baron if our kept card would be low
      if (card.name === 'Baron' && otherCard.value <= 3) {
        score -= 5;
      }

      // Prefer Spy (low value, no downside)
      if (card.name === 'Spy') {
        score += 2;
      }

      // Prefer Handmaid for protection
      if (card.name === 'Handmaid') {
        score += 1;
      }

      // Guard is useful - slight bonus
      if (card.name === 'Guard') {
        // Check if we have good info for a guess
        const bestProb = BotAI.bestGuardGuessProb(remaining);
        score += bestProb > 0.3 ? 3 : 1;
      }

      return { idx, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const bestIdx = scored[0].idx;

    return BotAI.buildAction(state, player, bestIdx, remaining);
  }

  // ── Hard Bot: Card counting + strategic play ─────────────────────

  private static hardAction(state: GameState, playerIndex: number): BotAction {
    const player = state.players[playerIndex];
    const playableIndices = LoveLetterEngine.getPlayableCards(state, playerIndex);

    if (playableIndices.length === 1) {
      return BotAI.buildAction(state, player, playableIndices[0]);
    }

    const remaining = getRemainingCards(state, player.hand);
    const opponents = aliveOpponents(state.players, player.id);

    // Evaluate each playable card
    const scored = playableIndices.map((idx) => {
      const card = player.hand[idx];
      const otherCard = player.hand[1 - idx];
      let score = 10 - card.value; // Base preference for lower cards

      // Never play Princess
      if (card.name === 'Princess') {
        score = -100;
      }

      // Spy: play it early (low cost, potential bonus)
      if (card.name === 'Spy') {
        score += 3;
      }

      // Guard: evaluate based on probability of correct guess
      if (card.name === 'Guard') {
        const bestProb = BotAI.bestGuardGuessProb(remaining);
        // Check known cards from Priest
        const knownTarget = player.knownCards.find((k) =>
          opponents.some((o) => o.id === k.playerId && o.isAlive && !o.isProtected),
        );
        if (knownTarget && knownTarget.card.name !== 'Guard') {
          score += 10; // Guaranteed hit!
        } else {
          score += bestProb > 0.4 ? 5 : bestProb > 0.2 ? 2 : 0;
        }
      }

      // Priest: good for gathering info early
      if (card.name === 'Priest') {
        const unknownOpponents = opponents.filter(
          (o) =>
            !o.isProtected &&
            !player.knownCards.some((k) => k.playerId === o.id),
        );
        score += unknownOpponents.length > 0 ? 3 : -1;
      }

      // Baron: only play if our other card is likely higher than opponents
      if (card.name === 'Baron') {
        if (otherCard.value >= 5) {
          score += 5; // Strong hand, likely win comparison
        } else if (otherCard.value >= 3) {
          score += 1;
        } else {
          score -= 5; // Too risky
        }
        // Check if we know an opponent has a lower card
        const weakTarget = player.knownCards.find(
          (k) =>
            k.card.value < otherCard.value &&
            opponents.some((o) => o.id === k.playerId && o.isAlive && !o.isProtected),
        );
        if (weakTarget) {
          score += 8; // Guaranteed elimination
        }
      }

      // Handmaid: play defensively if we have a high card to protect
      if (card.name === 'Handmaid') {
        if (otherCard.value >= 7) {
          score += 5;
        } else {
          score += 1;
        }
      }

      // Prince: evaluate based on known cards
      if (card.name === 'Prince') {
        const knownHigh = player.knownCards.find(
          (k) =>
            k.card.value >= 7 &&
            opponents.some((o) => o.id === k.playerId && o.isAlive && !o.isProtected),
        );
        if (knownHigh) {
          score += 6; // Force opponent to discard high card
        } else {
          score += 0;
        }
      }

      // Chancellor: good for card selection
      if (card.name === 'Chancellor') {
        score += 2;
      }

      // King: only trade if we have a low card and suspect opponent has high
      if (card.name === 'King') {
        if (otherCard.value <= 2) {
          score += 3; // Trading up likely
        } else if (otherCard.value >= 6) {
          score -= 3; // Don't give away high cards
        }
      }

      // Countess: bluffing - occasionally play voluntarily (10% chance)
      if (card.name === 'Countess' && !mustPlayCountess(player.hand)) {
        if (Math.random() < 0.1) {
          score += 8; // Bluff play
        }
      }

      return { idx, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const bestIdx = scored[0].idx;

    return BotAI.buildAction(state, player, bestIdx, remaining, true);
  }

  // ── Build complete action for a chosen card ──────────────────────

  private static buildAction(
    state: GameState,
    player: Player,
    cardIndex: number,
    remaining?: Map<CardName, number>,
    isHard: boolean = false,
  ): BotAction {
    const card = player.hand[cardIndex];
    const validTargets = LoveLetterEngine.getValidTargets(
      state,
      card.name,
      player.id,
    );

    const action: BotAction = { cardIndex };

    if (validTargets.length === 0) {
      return action;
    }

    const opponents = aliveOpponents(state.players, player.id).filter(
      (o) => !o.isProtected,
    );

    // Choose target
    switch (card.name) {
      case 'Guard': {
        // Pick target and guess
        const targetAndGuess = BotAI.chooseGuardTarget(
          state,
          player,
          validTargets,
          remaining,
          isHard,
        );
        action.targetId = targetAndGuess.targetId;
        action.guardGuess = targetAndGuess.guess;
        break;
      }

      case 'Priest': {
        // Target a player we don't have info on
        const unknown = validTargets.filter(
          (tid) => !player.knownCards.some((k) => k.playerId === tid),
        );
        action.targetId =
          unknown.length > 0 ? randomElement(unknown) : randomElement(validTargets);
        break;
      }

      case 'Baron': {
        if (isHard) {
          // Try to find a known weaker target
          const weaker = player.knownCards.find(
            (k) =>
              k.card.value < player.hand[1 - cardIndex].value &&
              validTargets.includes(k.playerId),
          );
          action.targetId = weaker
            ? weaker.playerId
            : BotAI.targetHighestTokens(state, validTargets);
        } else {
          action.targetId = BotAI.targetHighestTokens(state, validTargets);
        }
        break;
      }

      case 'Prince': {
        if (isHard) {
          // Check if we know someone has Princess or high card
          const knownPrincess = player.knownCards.find(
            (k) => k.card.name === 'Princess' && validTargets.includes(k.playerId),
          );
          if (knownPrincess) {
            action.targetId = knownPrincess.playerId;
            break;
          }
          const knownHigh = player.knownCards.find(
            (k) => k.card.value >= 6 && validTargets.includes(k.playerId),
          );
          if (knownHigh) {
            action.targetId = knownHigh.playerId;
            break;
          }
        }
        // Medium: target opponent if we have a low card ourselves
        const opponentTargets = validTargets.filter((t) => t !== player.id);
        if (opponentTargets.length > 0 && opponents.length > 0) {
          action.targetId = BotAI.targetHighestTokens(state, opponentTargets);
        } else {
          // Must target self
          action.targetId = player.id;
        }
        break;
      }

      case 'King': {
        if (isHard) {
          // Trade with someone we know has a high card
          const knownHigh = player.knownCards.find(
            (k) => k.card.value > player.hand[1 - cardIndex].value && validTargets.includes(k.playerId),
          );
          if (knownHigh) {
            action.targetId = knownHigh.playerId;
            break;
          }
        }
        action.targetId = BotAI.targetHighestTokens(state, validTargets);
        break;
      }

      default:
        action.targetId = randomElement(validTargets);
        break;
    }

    return action;
  }

  // ── Guard target + guess selection ───────────────────────────────

  private static chooseGuardTarget(
    state: GameState,
    player: Player,
    validTargets: string[],
    remaining?: Map<CardName, number>,
    isHard: boolean = false,
  ): { targetId: string; guess: CardName } {
    // Check known cards first (from Priest, Baron, etc.)
    if (isHard || remaining) {
      for (const known of player.knownCards) {
        if (
          validTargets.includes(known.playerId) &&
          known.card.name !== 'Guard' // Can't guess Guard
        ) {
          return { targetId: known.playerId, guess: known.card.name };
        }
      }
    }

    // Target: player with most tokens
    const targetId = BotAI.targetHighestTokens(state, validTargets);

    // Guess: most likely remaining card
    if (remaining) {
      const bestGuess = BotAI.bestGuardGuess(remaining);
      return { targetId, guess: bestGuess };
    }

    // Fallback: random guess
    return { targetId, guess: randomElement(GUARD_GUESS_OPTIONS) };
  }

  // ── Guard guess helpers ──────────────────────────────────────────

  private static bestGuardGuess(remaining: Map<CardName, number>): CardName {
    let bestName: CardName = 'Priest';
    let bestCount = 0;

    for (const name of GUARD_GUESS_OPTIONS) {
      const count = Math.max(0, remaining.get(name) ?? 0);
      if (count > bestCount) {
        bestCount = count;
        bestName = name;
      }
    }

    return bestName;
  }

  private static bestGuardGuessProb(remaining: Map<CardName, number>): number {
    const total = totalUnseen(remaining);
    if (total === 0) return 0;

    let bestProb = 0;
    for (const name of GUARD_GUESS_OPTIONS) {
      const count = Math.max(0, remaining.get(name) ?? 0);
      const prob = count / total;
      if (prob > bestProb) {
        bestProb = prob;
      }
    }
    return bestProb;
  }

  // ── Target selection helpers ─────────────────────────────────────

  /** Target the alive, unprotected player with the most tokens. */
  private static targetHighestTokens(
    state: GameState,
    validTargets: string[],
  ): string {
    let bestId = validTargets[0];
    let bestTokens = -1;

    for (const tid of validTargets) {
      const p = state.players.find((pl) => pl.id === tid);
      if (p && p.tokens > bestTokens) {
        bestTokens = p.tokens;
        bestId = tid;
      }
    }

    return bestId;
  }
}
