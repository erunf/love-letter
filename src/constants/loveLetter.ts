// ─── Love Letter Game Constants ─────────────────────────────────────

import type { Card, CardValue, CardName } from '../types/game';

// Card definitions: value, name, count in deck, effect description
export const CARD_DEFINITIONS: {
  value: CardValue;
  name: CardName;
  count: number;
  effect: string;
  targetType: 'none' | 'other' | 'any' | 'guess';
}[] = [
  { value: 0, name: 'Spy',        count: 2, effect: 'Gain favor if no one else plays/discards a Spy.', targetType: 'none' },
  { value: 1, name: 'Guard',      count: 6, effect: 'Guess a player\'s hand. If correct, they\'re out.', targetType: 'guess' },
  { value: 2, name: 'Priest',     count: 2, effect: 'Look at another player\'s hand.', targetType: 'other' },
  { value: 3, name: 'Baron',      count: 2, effect: 'Compare hands. Lower value is out.', targetType: 'other' },
  { value: 4, name: 'Handmaid',   count: 2, effect: 'Immune to other cards until your next turn.', targetType: 'none' },
  { value: 5, name: 'Prince',     count: 2, effect: 'Choose a player to discard and redraw.', targetType: 'any' },
  { value: 6, name: 'Chancellor', count: 2, effect: 'Draw 2, keep 1 of 3, return 2 to deck.', targetType: 'none' },
  { value: 7, name: 'King',       count: 1, effect: 'Trade hands with another player.', targetType: 'other' },
  { value: 8, name: 'Countess',   count: 1, effect: 'Must play if you have King or Prince.', targetType: 'none' },
  { value: 9, name: 'Princess',   count: 1, effect: 'Out of the round if you play or discard this.', targetType: 'none' },
];

// Build the full 21-card deck
export function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const def of CARD_DEFINITIONS) {
    for (let i = 0; i < def.count; i++) {
      deck.push({ value: def.value, name: def.name });
    }
  }
  return deck;
}

// Classic 16-card deck (2-4 players only): remove 1 Guard, 2 Chancellors, 2 Spies
export function createClassicDeck(): Card[] {
  const deck = createFullDeck();
  // Remove 2 Spies
  let spiesRemoved = 0;
  for (let i = deck.length - 1; i >= 0 && spiesRemoved < 2; i--) {
    if (deck[i].name === 'Spy') { deck.splice(i, 1); spiesRemoved++; }
  }
  // Remove 2 Chancellors
  let chancellorsRemoved = 0;
  for (let i = deck.length - 1; i >= 0 && chancellorsRemoved < 2; i--) {
    if (deck[i].name === 'Chancellor') { deck.splice(i, 1); chancellorsRemoved++; }
  }
  // Remove 1 Guard
  for (let i = deck.length - 1; i >= 0; i--) {
    if (deck[i].name === 'Guard') { deck.splice(i, 1); break; }
  }
  return deck;
}

// Tokens needed to win based on player count
export function getTokensToWin(playerCount: number): number {
  switch (playerCount) {
    case 2: return 6;
    case 3: return 5;
    case 4: return 4;
    case 5: return 3;
    case 6: return 3;
    default: return 4;
  }
}

// Card names for Guard guessing (cannot guess Guard)
export const GUARD_GUESS_OPTIONS: CardName[] = [
  'Spy', 'Priest', 'Baron', 'Handmaid', 'Prince', 'Chancellor', 'King', 'Countess', 'Princess',
];

// Get card definition by name
export function getCardDef(name: CardName) {
  return CARD_DEFINITIONS.find(d => d.name === name)!;
}

// Get card definition by value
export function getCardDefByValue(value: CardValue) {
  return CARD_DEFINITIONS.find(d => d.value === value)!;
}

// Card requires selecting a target player
export function cardNeedsTarget(name: CardName): boolean {
  const def = getCardDef(name);
  return def.targetType === 'other' || def.targetType === 'any' || def.targetType === 'guess';
}

// Whether the Countess must be played (if holding King or Prince alongside)
export function mustPlayCountess(hand: Card[]): boolean {
  const hasCountess = hand.some(c => c.name === 'Countess');
  const hasKingOrPrince = hand.some(c => c.name === 'King' || c.name === 'Prince');
  return hasCountess && hasKingOrPrince;
}

// Shuffle array in place (Fisher-Yates)
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Min/max players
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
