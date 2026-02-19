// ─── Online Game Zustand Store ───────────────────────────────────────

import { create } from "zustand";
import type { Card, CardName } from "../types/game";
import type { GameSnapshot, SnapshotPlayer } from "../types/protocol";
import type { LogEntry } from "../components/ui/ActionLog";

// ─── Store Types ─────────────────────────────────────────────────────

interface OnlineState {
  // Connection
  isOnline: boolean;
  isConnected: boolean;
  roomCode: string | null;
  yourPlayerId: string | null;
  reconnectToken: string | null;

  // Game state from server
  snapshot: GameSnapshot | null;

  // UI state
  error: string | null;
  toast: string | null;
  logEntries: LogEntry[];

  // Animation state
  animQueueSize: number;
  cardAnnouncement: {
    card: Card;
    playerName: string;
    effectText?: string;
    duration?: number;
  } | null;
  priestPeek: {
    card: Card;
    targetName: string;
  } | null;
  baronReveal: {
    yourCard: Card;
    theirCard: Card;
    yourName: string;
    theirName: string;
    loserId: string | null;
  } | null;
  baronResult: {
    playerName: string;
    targetName: string;
    loserName: string | null;
    loserCard: Card | null;
    isTie: boolean;
  } | null;
  guardReveal: {
    guesserName: string;
    targetName: string;
    guess: CardName;
    correct: boolean;
  } | null;
  princeDiscard: {
    card: Card;
    targetName: string;
  } | null;
}

interface OnlineActions {
  setOnline: (online: boolean) => void;
  setConnected: (connected: boolean) => void;
  setRoomCode: (code: string | null) => void;
  setYourPlayerId: (id: string | null) => void;
  setReconnectToken: (token: string | null) => void;
  setSnapshot: (snapshot: GameSnapshot | null) => void;
  setError: (error: string | null) => void;
  setToast: (toast: string | null) => void;
  addLogEntry: (entry: LogEntry) => void;
  clearLog: () => void;
  setAnimQueueSize: (size: number) => void;
  setCardAnnouncement: (
    info: {
      card: Card;
      playerName: string;
      effectText?: string;
      duration?: number;
    } | null
  ) => void;
  setPriestPeek: (info: { card: Card; targetName: string } | null) => void;
  setBaronReveal: (
    info: {
      yourCard: Card;
      theirCard: Card;
      yourName: string;
      theirName: string;
      loserId: string | null;
    } | null
  ) => void;
  setBaronResult: (
    info: {
      playerName: string;
      targetName: string;
      loserName: string | null;
      loserCard: Card | null;
      isTie: boolean;
    } | null
  ) => void;
  setGuardReveal: (
    info: {
      guesserName: string;
      targetName: string;
      guess: CardName;
      correct: boolean;
    } | null
  ) => void;
  setPrinceDiscard: (
    info: { card: Card; targetName: string } | null
  ) => void;
  reset: () => void;
}

type OnlineStore = OnlineState & OnlineActions;

// ─── Initial State ───────────────────────────────────────────────────

const initialState: OnlineState = {
  isOnline: false,
  isConnected: false,
  roomCode: null,
  yourPlayerId: null,
  reconnectToken: null,
  snapshot: null,
  error: null,
  toast: null,
  logEntries: [],
  animQueueSize: 0,
  cardAnnouncement: null,
  priestPeek: null,
  baronReveal: null,
  baronResult: null,
  guardReveal: null,
  princeDiscard: null,
};

// ─── Store ───────────────────────────────────────────────────────────

export const useOnlineStore = create<OnlineStore>((set) => ({
  ...initialState,

  setOnline: (isOnline) => set({ isOnline }),
  setConnected: (isConnected) => set({ isConnected }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setYourPlayerId: (yourPlayerId) => set({ yourPlayerId }),
  setReconnectToken: (reconnectToken) => set({ reconnectToken }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setError: (error) => set({ error }),
  setToast: (toast) => set({ toast }),
  addLogEntry: (entry) =>
    set((state) => ({ logEntries: [...state.logEntries.slice(-49), entry] })),
  clearLog: () => set({ logEntries: [] }),
  setAnimQueueSize: (animQueueSize) => set({ animQueueSize }),
  setCardAnnouncement: (cardAnnouncement) => set({ cardAnnouncement }),
  setPriestPeek: (priestPeek) => set({ priestPeek }),
  setBaronReveal: (baronReveal) => set({ baronReveal }),
  setBaronResult: (baronResult) => set({ baronResult }),
  setGuardReveal: (guardReveal) => set({ guardReveal }),
  setPrinceDiscard: (princeDiscard) => set({ princeDiscard }),

  reset: () => set(initialState),
}));

// ─── Derived Selectors ──────────────────────────────────────────────

export function useIsHost(): boolean {
  const snapshot = useOnlineStore((s) => s.snapshot);
  const yourPlayerId = useOnlineStore((s) => s.yourPlayerId);
  if (!snapshot || !yourPlayerId) return false;
  return snapshot.hostId === yourPlayerId;
}

export function useIsMyTurn(): boolean {
  const snapshot = useOnlineStore((s) => s.snapshot);
  const yourPlayerId = useOnlineStore((s) => s.yourPlayerId);
  if (!snapshot || !yourPlayerId) return false;
  if (snapshot.phase !== "playing") return false;
  const currentPlayer = snapshot.players[snapshot.currentPlayerIndex];
  return currentPlayer?.id === yourPlayerId;
}

export function useMyPlayer(): SnapshotPlayer | null {
  const snapshot = useOnlineStore((s) => s.snapshot);
  const yourPlayerId = useOnlineStore((s) => s.yourPlayerId);
  if (!snapshot || !yourPlayerId) return null;
  return snapshot.players.find((p) => p.id === yourPlayerId) ?? null;
}
