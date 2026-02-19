// ─── Game Flow Hook ──────────────────────────────────────────────────
// Orchestrates the local game turn flow by watching state changes and
// auto-advancing through phases. Triggers bot turns automatically.

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useBotTurn } from './useBotTurn';

export function useGameFlow(): void {
  const phase = useGameStore((s) => s.phase);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const players = useGameStore((s) => s.players);
  const nextTurn = useGameStore((s) => s.nextTurn);

  const { executeBotTurn, isBotThinking } = useBotTurn();
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current player info
  const currentPlayer = players[currentPlayerIndex] ?? null;
  const isBot = currentPlayer?.type === 'bot';

  // ── Auto-advance after card resolution ───────────────────────────
  // When turnPhase becomes 'resolved', wait briefly then advance to next turn
  useEffect(() => {
    if (phase !== 'playing' || turnPhase !== 'resolved') return;

    // Clear any existing timer
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
    }

    // Small delay before advancing to let UI show the result
    const delay = isBot ? 600 : 400;
    advanceTimerRef.current = setTimeout(() => {
      nextTurn();
    }, delay);

    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, [phase, turnPhase, nextTurn, isBot]);

  // ── Trigger bot turns ────────────────────────────────────────────
  // When it's a bot's turn and we're in 'drawing' phase, kick off the bot
  useEffect(() => {
    if (
      phase !== 'playing' ||
      !isBot ||
      !currentPlayer ||
      turnPhase !== 'drawing' ||
      isBotThinking
    ) {
      return;
    }

    executeBotTurn();
  }, [phase, isBot, currentPlayer, turnPhase, isBotThinking, executeBotTurn]);
}
