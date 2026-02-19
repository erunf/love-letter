// ─── Love Letter Game Types ─────────────────────────────────────────

export type CardValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type CardName =
  | 'Spy'
  | 'Guard'
  | 'Priest'
  | 'Baron'
  | 'Handmaid'
  | 'Prince'
  | 'Chancellor'
  | 'King'
  | 'Countess'
  | 'Princess';

export interface Card {
  value: CardValue;
  name: CardName;
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface Player {
  id: string;
  name: string;
  type: 'human' | 'bot';
  botDifficulty?: BotDifficulty;
  avatar: string;
  color: string;
  hand: Card[];               // Current card(s) in hand (1 normally, 2 during turn)
  discardPile: Card[];        // Face-up played/discarded cards
  isAlive: boolean;           // Still in the current round
  isProtected: boolean;       // Handmaid protection active
  tokens: number;             // Favor tokens (round wins)
  hasPlayedSpy: boolean;      // Whether player played/discarded a Spy this round
  knownCards: KnownCard[];    // Cards this player knows about (from Priest, etc.)
  userId?: string;            // Google auth user ID
  avatarUrl?: string;         // Google avatar
}

export interface KnownCard {
  playerId: string;
  card: Card;
  source: 'priest' | 'baron' | 'trade' | 'chancellor';
}

export type GamePhase =
  | 'lobby'
  | 'playing'
  | 'roundEnd'
  | 'gameOver';

export type TurnPhase =
  | 'drawing'         // Player is about to draw
  | 'choosing'        // Player has 2 cards, must choose one to play
  | 'selectingTarget' // Card requires choosing a target player
  | 'guardGuessing'   // Guard: must name a card
  | 'chancellorPick'  // Chancellor: choosing which card to keep
  | 'resolving'       // Card effect is being resolved
  | 'resolved';       // Turn complete, advancing to next player

export interface TurnAction {
  playedCard: Card;
  targetPlayerId?: string;
  guardGuess?: CardName;
  chancellorKeep?: number;    // Index of card to keep (0, 1, or 2)
  chancellorReturn?: number[]; // Indices of cards to return to deck bottom
}

export interface RoundResult {
  winnerId: string;
  winnerName: string;
  reason: 'lastStanding' | 'highestCard' | 'tiebreak';
  revealedHands?: { playerId: string; playerName: string; card: Card }[];
  spyBonusPlayerId?: string;  // Player who gets spy bonus token
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  deck: Card[];
  setAsideCard: Card | null;          // Face-down removed card
  faceUpCards: Card[];                // Face-up removed cards (2-player game)
  currentPlayerIndex: number;
  turnPhase: TurnPhase;
  roundNumber: number;
  lastRoundResult: RoundResult | null;
  chancellorDrawn: Card[];            // Cards drawn for Chancellor effect
  pendingAction: Partial<TurnAction>; // Action being built during turn
  gameWinnerId: string | null;
  tokensToWin: number;                // Based on player count
}

// ─── Player Avatars & Colors ────────────────────────────────────────

export const PLAYER_AVATARS = ['crown', 'rose', 'quill', 'shield', 'ring', 'scroll'];

export const PLAYER_COLORS = [
  '#c41e3a', // Crimson
  '#2e5090', // Royal Blue
  '#6b3fa0', // Purple
  '#1a7a4c', // Emerald
  '#c4762e', // Amber
  '#6b4423', // Sienna
];
