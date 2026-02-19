// ─── Love Letter Communication Protocol ─────────────────────────────

import type { Card, CardName, BotDifficulty, RoundResult } from './game';

// ─── Client → Server Messages ───────────────────────────────────────

export type ClientMessage =
  | { type: 'join'; playerName: string; reconnectToken?: string; idToken?: string }
  | { type: 'addBot'; difficulty: BotDifficulty }
  | { type: 'removePlayer'; playerId: string }
  | { type: 'startGame' }
  | { type: 'startNewRound' }
  | { type: 'resetGame' }
  | { type: 'returnToLobby' }
  | { type: 'playCard'; cardIndex: number }                    // Play card at index in hand
  | { type: 'selectTarget'; targetId: string }                 // Choose target player
  | { type: 'guardGuess'; guess: CardName }                    // Guard: name a card
  | { type: 'chancellorKeep'; keepIndex: number }              // Chancellor: which card to keep (0-2)
  | { type: 'princeTarget'; targetId: string };                // Prince: choose player to discard/redraw

// ─── Server → Client Messages ───────────────────────────────────────

export type ServerMessage =
  | { type: 'snapshot'; snapshot: GameSnapshot }
  | { type: 'welcome'; yourPlayerId: string; reconnectToken: string }
  | { type: 'playerJoined'; playerId: string; playerName: string }
  | { type: 'playerLeft'; playerId: string; playerName: string }
  | { type: 'error'; message: string }
  | { type: 'roomClosed'; reason: string }
  | { type: 'authResult'; success: boolean; user?: { id: string } }
  | { type: 'cardPlayed'; playerId: string; playerName: string; card: Card; targetName?: string; result?: string }
  | { type: 'priestPeek'; card: Card; targetName: string }     // Only sent to the priest player
  | { type: 'baronReveal'; yourCard: Card; theirCard: Card; loserId: string | null; yourName: string; theirName: string }
  | { type: 'baronResult'; playerName: string; targetName: string; loserName: string | null; loserCard: Card | null; isTie: boolean }
  | { type: 'guardReveal'; guesserName: string; targetName: string; guess: CardName; correct: boolean }
  | { type: 'princeDiscard'; card: Card; targetName: string }
  | { type: 'roundOver'; result: RoundResult }
  | { type: 'gameOver'; winnerId: string; winnerName: string };

// ─── Game Snapshot (sent to each client) ────────────────────────────

export interface GameSnapshot {
  phase: 'waiting' | 'playing' | 'roundEnd' | 'gameOver';
  players: SnapshotPlayer[];
  currentPlayerIndex: number;
  turnPhase: string;
  roundNumber: number;
  deckSize: number;
  setAsideCardKnown: boolean;       // Whether the set-aside card has been revealed
  faceUpCards: Card[];              // 2-player face-up removed cards
  lastRoundResult: RoundResult | null;
  gameWinnerId: string | null;
  tokensToWin: number;
  roomCode: string;
  hostId: string;
  pendingGuardGuess: boolean;       // Whether current player needs to guess for Guard
  pendingChancellorPick: boolean;   // Whether current player needs to pick for Chancellor
  pendingTargetSelection: string | null;  // Card name requiring target selection, or null
  chancellorOptions?: Card[];       // Only sent to the chancellor player
}

export interface SnapshotPlayer {
  id: string;
  name: string;
  type: 'human' | 'bot';
  botDifficulty?: BotDifficulty;
  avatar: string;
  color: string;
  isAlive: boolean;
  isProtected: boolean;
  tokens: number;
  handSize: number;                 // How many cards in hand (don't reveal actual cards)
  hand?: Card[];                    // Only included for the receiving player
  discardPile: Card[];             // Public: all played/discarded cards
  hasPlayedSpy: boolean;
  userId?: string;
  avatarUrl?: string;
}
