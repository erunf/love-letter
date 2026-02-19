// ─── Love Letter Visual Design System ───────────────────────────────
// Unique royal court aesthetic: deep crimson, antique gold, parchment tones
// Inspired by Renaissance royal courts, wax seals, and handwritten letters

export const THEME = {
  // Primary palette
  crimson: '#8b1a2b',
  crimsonLight: '#c41e3a',
  crimsonDark: '#5c0e1b',

  // Gold accents (warmer, more antique than flip7)
  gold: '#c9a84c',
  goldLight: '#e8d48b',
  goldDark: '#8b6914',
  goldAccent: '#d4a843',
  goldGlow: 'rgba(201, 168, 76, 0.4)',
  goldSubtle: 'rgba(201, 168, 76, 0.15)',

  // Parchment tones
  parchment: '#f4e4c1',
  parchmentDark: '#d4c4a1',
  parchmentLight: '#faf3e3',

  // Background
  bgDeep: '#0f0a14',
  bgMid: '#1a1225',
  bgCard: 'rgba(20, 14, 30, 0.65)',

  // Wax seal red
  waxSeal: '#9b2335',
  waxSealLight: '#c0384f',
  waxSealDark: '#6b1824',

  // Text
  textPrimary: '#f4e4c1',
  textSecondary: '#a89880',
  textMuted: '#6b5e50',

  // Status colors
  alive: '#4ade80',
  eliminated: '#ef4444',
  protected: '#60a5fa',
};

// Card colors by value (each character has a distinct color identity)
export const CARD_COLORS: Record<number, { bg: string; border: string; accent: string }> = {
  0: { bg: '#2a2540', border: '#5b4f8a', accent: '#7c6db5' },      // Spy - mysterious purple
  1: { bg: '#2a3040', border: '#4a6080', accent: '#6a90b5' },      // Guard - steel blue
  2: { bg: '#2a3530', border: '#4a7560', accent: '#6aaa85' },      // Priest - sage green
  3: { bg: '#3a2a28', border: '#7a5040', accent: '#aa7560' },      // Baron - bronze
  4: { bg: '#2a2835', border: '#5a4875', accent: '#8a70aa' },      // Handmaid - lavender
  5: { bg: '#2a3028', border: '#4a7540', accent: '#6aaa55' },      // Prince - forest green
  6: { bg: '#2a2a38', border: '#5a5a80', accent: '#8080b5' },      // Chancellor - slate blue
  7: { bg: '#3a3020', border: '#8a7030', accent: '#c9a84c' },      // King - royal gold
  8: { bg: '#35202a', border: '#804060', accent: '#b56a90' },      // Countess - rose
  9: { bg: '#3a2030', border: '#8a3060', accent: '#c44a80' },      // Princess - magenta/crimson
};

// Player colors for the game
export const PLAYER_THEME_COLORS = [
  '#c41e3a', // Crimson
  '#2e5090', // Royal Blue
  '#6b3fa0', // Purple
  '#1a7a4c', // Emerald
  '#c4762e', // Amber
  '#6b4423', // Sienna
];
