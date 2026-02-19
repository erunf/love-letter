// ─── Bot Turn Hook ───────────────────────────────────────────────────
// Executes bot turns with realistic delays to simulate "thinking".

import { useCallback, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { BotAI } from '../engine/BotAI';
import type { BotDifficulty, GameState } from '../types/game';

// ─── Delay Helpers ───────────────────────────────────────────────────

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extract a plain GameState from the store (no action methods). */
function extractGameState(): GameState {
  const s = useGameStore.getState();
  return {
    phase: s.phase,
    players: s.players,
    deck: s.deck,
    setAsideCard: s.setAsideCard,
    faceUpCards: s.faceUpCards,
    currentPlayerIndex: s.currentPlayerIndex,
    turnPhase: s.turnPhase,
    roundNumber: s.roundNumber,
    lastRoundResult: s.lastRoundResult,
    chancellorDrawn: s.chancellorDrawn,
    pendingAction: s.pendingAction,
    gameWinnerId: s.gameWinnerId,
    tokensToWin: s.tokensToWin,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useBotTurn() {
  const [isBotThinking, setIsBotThinking] = useState(false);
  const abortRef = useRef(false);

  const executeBotTurn = useCallback(async () => {
    const store = useGameStore.getState();
    const currentPlayer = store.players[store.currentPlayerIndex];

    if (!currentPlayer || currentPlayer.type !== 'bot' || store.phase !== 'playing') {
      return;
    }

    const difficulty: BotDifficulty = currentPlayer.botDifficulty ?? 'easy';

    setIsBotThinking(true);
    abortRef.current = false;

    try {
      // 1. Wait (thinking delay)
      await delay(randomDelay(800, 1500));
      if (abortRef.current) return;

      // 2. Draw card
      useGameStore.getState().drawCard();
      await delay(randomDelay(400, 600));
      if (abortRef.current) return;

      // 3. Get the AI's decision based on current state (after drawing)
      const stateAfterDraw = extractGameState();
      const playerIndex = stateAfterDraw.currentPlayerIndex;
      const action = BotAI.chooseAction(stateAfterDraw, playerIndex, difficulty);

      // 4. Play the chosen card
      useGameStore.getState().playCard(action.cardIndex);
      await delay(randomDelay(300, 500));
      if (abortRef.current) return;

      // 5. Check if we need to select a target
      const stateAfterPlay = extractGameState();
      if (stateAfterPlay.turnPhase === 'selectingTarget' && action.targetId) {
        useGameStore.getState().selectTarget(action.targetId);
        await delay(randomDelay(300, 500));
        if (abortRef.current) return;
      }

      // 6. Check if we need a Guard guess
      const stateAfterTarget = extractGameState();
      if (stateAfterTarget.turnPhase === 'guardGuessing' && action.guardGuess) {
        useGameStore.getState().guardGuess(action.guardGuess);
        await delay(randomDelay(300, 500));
        if (abortRef.current) return;
      }

      // 7. Check if Chancellor pick is needed
      const stateAfterGuess = extractGameState();
      if (stateAfterGuess.turnPhase === 'chancellorPick') {
        await delay(randomDelay(400, 600));
        if (abortRef.current) return;

        const chancellorState = extractGameState();
        const keepIndex = BotAI.chooseChancellor(
          chancellorState,
          chancellorState.currentPlayerIndex,
          difficulty,
        );
        useGameStore.getState().chancellorKeep(keepIndex);
      }
    } finally {
      setIsBotThinking(false);
    }
  }, []);

  const cancelBotTurn = useCallback(() => {
    abortRef.current = true;
    setIsBotThinking(false);
  }, []);

  return { executeBotTurn, isBotThinking, cancelBotTurn };
}
