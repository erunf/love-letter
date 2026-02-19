// ─── Love Letter Game Store (Zustand) ────────────────────────────────
// Local game state management. Uses LoveLetterEngine for all logic.

import { create } from 'zustand';
import type {
  BotDifficulty,
  Card,
  CardName,
  GamePhase,
  GameState,
  Player,
} from '../types/game';
import { PLAYER_AVATARS, PLAYER_COLORS } from '../types/game';
import { getTokensToWin } from '../constants/loveLetter';
import { LoveLetterEngine } from '../engine/LoveLetterEngine';

// ─── Store Interface ─────────────────────────────────────────────────

interface GameStore extends GameState {
  // Lobby actions
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  addBot: (difficulty: BotDifficulty) => void;

  // Game flow
  startGame: () => void;
  startNewRound: () => void;

  // Turn actions
  drawCard: () => void;
  playCard: (cardIndex: number) => void;
  selectTarget: (targetId: string) => void;
  guardGuess: (guess: CardName) => void;
  chancellorKeep: (keepIndex: number) => void;

  // State management
  nextTurn: () => void;
  resetGame: () => void;

  // Direct state setter (for engine results)
  setState: (partial: Partial<GameState>) => void;

  // Action log
  actionLog: string[];
  addLogEntry: (entry: string) => void;
}

// ─── Initial State ───────────────────────────────────────────────────

const initialGameState: GameState = {
  phase: 'lobby',
  players: [],
  deck: [],
  setAsideCard: null,
  faceUpCards: [],
  currentPlayerIndex: 0,
  turnPhase: 'drawing',
  roundNumber: 0,
  lastRoundResult: null,
  chancellorDrawn: [],
  pendingAction: {},
  gameWinnerId: null,
  tokensToWin: 4,
};

// ─── Helpers ─────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getNextAvatar(players: Player[]): string {
  const used = new Set(players.map((p) => p.avatar));
  return PLAYER_AVATARS.find((a) => !used.has(a)) ?? PLAYER_AVATARS[0];
}

function getNextColor(players: Player[]): string {
  const used = new Set(players.map((p) => p.color));
  return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0];
}

function cardDisplayName(card: Card): string {
  return `${card.name} (${card.value})`;
}

// ─── Store ───────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialGameState,
  actionLog: [],

  // ── Lobby ──────────────────────────────────────────────────────

  addPlayer: (name: string) => {
    const state = get();
    if (state.players.length >= 6) return;

    const player: Player = {
      id: generateId(),
      name,
      type: 'human',
      avatar: getNextAvatar(state.players),
      color: getNextColor(state.players),
      hand: [],
      discardPile: [],
      isAlive: true,
      isProtected: false,
      tokens: 0,
      hasPlayedSpy: false,
      knownCards: [],
    };

    set({ players: [...state.players, player] });
  },

  removePlayer: (id: string) => {
    const state = get();
    set({ players: state.players.filter((p) => p.id !== id) });
  },

  addBot: (difficulty: BotDifficulty) => {
    const state = get();
    if (state.players.length >= 6) return;

    const botNumber = state.players.filter((p) => p.type === 'bot').length + 1;
    const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    const bot: Player = {
      id: generateId(),
      name: `Bot ${botNumber} (${diffLabel})`,
      type: 'bot',
      botDifficulty: difficulty,
      avatar: getNextAvatar(state.players),
      color: getNextColor(state.players),
      hand: [],
      discardPile: [],
      isAlive: true,
      isProtected: false,
      tokens: 0,
      hasPlayedSpy: false,
      knownCards: [],
    };

    set({ players: [...state.players, bot] });
  },

  // ── Game Flow ──────────────────────────────────────────────────

  startGame: () => {
    const state = get();
    if (state.players.length < 2) return;

    const tokensToWin = getTokensToWin(state.players.length);
    const newRound = LoveLetterEngine.createNewRound(state.players, state.players.length);

    set({
      ...newRound,
      roundNumber: 1,
      tokensToWin,
      actionLog: ['Game started! Round 1 begins.'],
    });
  },

  startNewRound: () => {
    const state = get();
    const newRound = LoveLetterEngine.createNewRound(state.players, state.players.length);
    const roundNumber = state.roundNumber + 1;

    set({
      ...newRound,
      roundNumber,
      phase: 'playing' as GamePhase,
      actionLog: [...state.actionLog, `Round ${roundNumber} begins!`],
    });
  },

  // ── Turn Actions ───────────────────────────────────────────────

  drawCard: () => {
    const state = get();
    if (state.turnPhase !== 'drawing' || state.phase !== 'playing') return;

    const newState = LoveLetterEngine.drawCard({
      phase: state.phase,
      players: state.players,
      deck: state.deck,
      setAsideCard: state.setAsideCard,
      faceUpCards: state.faceUpCards,
      currentPlayerIndex: state.currentPlayerIndex,
      turnPhase: state.turnPhase,
      roundNumber: state.roundNumber,
      lastRoundResult: state.lastRoundResult,
      chancellorDrawn: state.chancellorDrawn,
      pendingAction: state.pendingAction,
      gameWinnerId: state.gameWinnerId,
      tokensToWin: state.tokensToWin,
    });

    const player = newState.players[newState.currentPlayerIndex];
    set({
      ...newState,
      actionLog: [
        ...state.actionLog,
        `${player.name} draws a card.`,
      ],
    });
  },

  playCard: (cardIndex: number) => {
    const state = get();
    if (state.turnPhase !== 'choosing' || state.phase !== 'playing') return;

    const player = state.players[state.currentPlayerIndex];
    if (cardIndex < 0 || cardIndex >= player.hand.length) return;

    const card = player.hand[cardIndex];

    const gameState: GameState = {
      phase: state.phase,
      players: state.players,
      deck: state.deck,
      setAsideCard: state.setAsideCard,
      faceUpCards: state.faceUpCards,
      currentPlayerIndex: state.currentPlayerIndex,
      turnPhase: state.turnPhase,
      roundNumber: state.roundNumber,
      lastRoundResult: state.lastRoundResult,
      chancellorDrawn: state.chancellorDrawn,
      pendingAction: state.pendingAction,
      gameWinnerId: state.gameWinnerId,
      tokensToWin: state.tokensToWin,
    };

    const newState = LoveLetterEngine.playCard(gameState, cardIndex);

    const logEntries = [...state.actionLog, `${player.name} plays ${cardDisplayName(card)}.`];

    // If the card resolved immediately with no target (Spy, Handmaid, Countess, Princess)
    if (newState.turnPhase === 'resolved') {
      if (card.name === 'Princess') {
        logEntries.push(`${player.name} is eliminated for playing the Princess!`);
      } else if (card.name === 'Handmaid') {
        logEntries.push(`${player.name} is protected until their next turn.`);
      }
    }

    set({ ...newState, actionLog: logEntries });
  },

  selectTarget: (targetId: string) => {
    const state = get();
    if (
      state.turnPhase !== 'selectingTarget' ||
      state.phase !== 'playing'
    )
      return;

    const gameState: GameState = {
      phase: state.phase,
      players: state.players,
      deck: state.deck,
      setAsideCard: state.setAsideCard,
      faceUpCards: state.faceUpCards,
      currentPlayerIndex: state.currentPlayerIndex,
      turnPhase: state.turnPhase,
      roundNumber: state.roundNumber,
      lastRoundResult: state.lastRoundResult,
      chancellorDrawn: state.chancellorDrawn,
      pendingAction: state.pendingAction,
      gameWinnerId: state.gameWinnerId,
      tokensToWin: state.tokensToWin,
    };

    const newState = LoveLetterEngine.selectTarget(gameState, targetId);
    const target = state.players.find((p) => p.id === targetId);
    const card = state.pendingAction.playedCard;

    const logEntries = [...state.actionLog];

    // Log resolution for non-Guard cards (Guard needs guess first)
    if (card && card.name !== 'Guard' && newState.turnPhase === 'resolved') {
      logEntries.push(
        ...BotAI_getResolutionLog(card, state.players[state.currentPlayerIndex], target, newState),
      );
    }

    set({ ...newState, actionLog: logEntries });
  },

  guardGuess: (guess: CardName) => {
    const state = get();
    if (state.turnPhase !== 'guardGuessing' || state.phase !== 'playing') return;

    const gameState: GameState = {
      phase: state.phase,
      players: state.players,
      deck: state.deck,
      setAsideCard: state.setAsideCard,
      faceUpCards: state.faceUpCards,
      currentPlayerIndex: state.currentPlayerIndex,
      turnPhase: state.turnPhase,
      roundNumber: state.roundNumber,
      lastRoundResult: state.lastRoundResult,
      chancellorDrawn: state.chancellorDrawn,
      pendingAction: state.pendingAction,
      gameWinnerId: state.gameWinnerId,
      tokensToWin: state.tokensToWin,
    };

    const newState = LoveLetterEngine.guardGuess(gameState, guess);
    const targetId = state.pendingAction.targetPlayerId;
    const target = targetId ? state.players.find((p) => p.id === targetId) : undefined;
    const targetName = target ? target.name : 'unknown';

    const logEntries = [...state.actionLog];
    logEntries.push(
      `Guard guesses ${target ? targetName : 'someone'} has ${guess}.`,
    );

    // Check if target was eliminated
    if (target && newState.players.find((p) => p.id === target.id && !p.isAlive)) {
      logEntries.push(`Correct! ${targetName} is eliminated!`);
    } else {
      logEntries.push(`Wrong guess.`);
    }

    set({ ...newState, actionLog: logEntries });
  },

  chancellorKeep: (keepIndex: number) => {
    const state = get();
    if (state.turnPhase !== 'chancellorPick' || state.phase !== 'playing') return;

    const gameState: GameState = {
      phase: state.phase,
      players: state.players,
      deck: state.deck,
      setAsideCard: state.setAsideCard,
      faceUpCards: state.faceUpCards,
      currentPlayerIndex: state.currentPlayerIndex,
      turnPhase: state.turnPhase,
      roundNumber: state.roundNumber,
      lastRoundResult: state.lastRoundResult,
      chancellorDrawn: state.chancellorDrawn,
      pendingAction: state.pendingAction,
      gameWinnerId: state.gameWinnerId,
      tokensToWin: state.tokensToWin,
    };

    const newState = LoveLetterEngine.resolveChancellor(gameState, keepIndex);
    const player = state.players[state.currentPlayerIndex];

    set({
      ...newState,
      actionLog: [
        ...state.actionLog,
        `${player.name} keeps a card and returns 2 to the deck.`,
      ],
    });
  },

  // ── State Management ───────────────────────────────────────────

  nextTurn: () => {
    const state = get();
    if (state.turnPhase !== 'resolved' || state.phase !== 'playing') return;

    const gameState: GameState = {
      phase: state.phase,
      players: state.players,
      deck: state.deck,
      setAsideCard: state.setAsideCard,
      faceUpCards: state.faceUpCards,
      currentPlayerIndex: state.currentPlayerIndex,
      turnPhase: state.turnPhase,
      roundNumber: state.roundNumber,
      lastRoundResult: state.lastRoundResult,
      chancellorDrawn: state.chancellorDrawn,
      pendingAction: state.pendingAction,
      gameWinnerId: state.gameWinnerId,
      tokensToWin: state.tokensToWin,
    };

    // Check if round ended
    const roundCheck = LoveLetterEngine.checkRoundEnd(gameState);
    if (roundCheck.ended) {
      const { state: resolvedState, result } =
        LoveLetterEngine.resolveRound(gameState);

      const logEntries = [...state.actionLog];
      logEntries.push(`--- Round ${state.roundNumber} ends! ---`);

      if (result.reason === 'lastStanding') {
        logEntries.push(`${result.winnerName} is the last player standing!`);
      } else if (result.reason === 'highestCard') {
        logEntries.push(
          `Deck empty! ${result.winnerName} wins with the highest card!`,
        );
      } else {
        logEntries.push(
          `Deck empty! ${result.winnerName} wins the tiebreak!`,
        );
      }

      logEntries.push(`${result.winnerName} earns a token of affection.`);

      if (result.spyBonusPlayerId) {
        const spyPlayer = state.players.find(
          (p) => p.id === result.spyBonusPlayerId,
        );
        if (spyPlayer) {
          logEntries.push(
            `${spyPlayer.name} earns a bonus token for the Spy!`,
          );
        }
      }

      // Check game win
      const gameWinnerId = LoveLetterEngine.checkGameWin(resolvedState);
      if (gameWinnerId) {
        const winner = resolvedState.players.find((p) => p.id === gameWinnerId);
        resolvedState.phase = 'gameOver';
        resolvedState.gameWinnerId = gameWinnerId;
        logEntries.push(
          `${winner ? winner.name : 'Someone'} wins the game!`,
        );
      }

      set({ ...resolvedState, actionLog: logEntries });
      return;
    }

    // Advance to next player
    const newState = LoveLetterEngine.advanceToNextPlayer(gameState);
    set({ ...newState, actionLog: state.actionLog });
  },

  resetGame: () => {
    set({ ...initialGameState, players: [], actionLog: [] });
  },

  setState: (partial: Partial<GameState>) => {
    set(partial);
  },

  addLogEntry: (entry: string) => {
    set({ actionLog: [...get().actionLog, entry] });
  },
}));

// ─── Log Helpers (not exported, used internally) ─────────────────────

function BotAI_getResolutionLog(
  card: Card,
  player: Player,
  target: Player | undefined,
  newState: GameState,
): string[] {
  const logs: string[] = [];
  const targetName = target ? target.name : 'unknown';

  switch (card.name) {
    case 'Priest':
      logs.push(`${player.name} looks at ${targetName}'s hand.`);
      break;

    case 'Baron': {
      if (!target) break;
      const newPlayer = newState.players.find((p) => p.id === player.id);
      const newTarget = newState.players.find((p) => p.id === target.id);
      if (newPlayer && !newPlayer.isAlive) {
        logs.push(
          `${player.name} compares hands with ${targetName} and is eliminated!`,
        );
      } else if (newTarget && !newTarget.isAlive) {
        logs.push(
          `${player.name} compares hands with ${targetName}. ${targetName} is eliminated!`,
        );
      } else {
        logs.push(
          `${player.name} compares hands with ${targetName}. It's a tie!`,
        );
      }
      break;
    }

    case 'Prince':
      logs.push(`${targetName} discards their hand and draws a new card.`);
      if (target) {
        const newTarget = newState.players.find((p) => p.id === target.id);
        if (newTarget && !newTarget.isAlive) {
          logs.push(`${targetName} discarded the Princess and is eliminated!`);
        }
      }
      break;

    case 'King':
      logs.push(`${player.name} trades hands with ${targetName}.`);
      break;
  }

  return logs;
}
