// ─── Online Game Zustand Store ───────────────────────────────────────

import { create } from "zustand";
import type { Card } from "../types/game";
import type { GameSnapshot, SnapshotPlayer } from "../types/protocol";

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

  // Animation state
  lastCardPlayed: {
    playerId: string;
    card: Card;
    targetName?: string;
  } | null;
  priestPeek: {
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
  setLastCardPlayed: (
    info: { playerId: string; card: Card; targetName?: string } | null
  ) => void;
  setPriestPeek: (info: { card: Card; targetName: string } | null) => void;
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
  lastCardPlayed: null,
  priestPeek: null,
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
  setLastCardPlayed: (lastCardPlayed) => set({ lastCardPlayed }),
  setPriestPeek: (priestPeek) => set({ priestPeek }),

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
