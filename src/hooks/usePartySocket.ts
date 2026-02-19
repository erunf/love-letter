// ─── PartyKit WebSocket Hook for Love Letter ────────────────────────

import { useEffect, useRef, useCallback } from "react";
import PartySocket from "partysocket";
import type { ClientMessage, ServerMessage } from "../types/protocol";
import { useOnlineStore } from "../store/onlineStore";
import { useAuthStore } from "../store/authStore";
import type { LogEntry } from "../components/ui/ActionLog";

const PARTYKIT_HOST =
  import.meta.env.VITE_PARTYKIT_HOST || "localhost:1999";

function getReconnectToken(roomCode: string): string | null {
  try {
    return sessionStorage.getItem(`loveletter_reconnect_${roomCode}`);
  } catch {
    return null;
  }
}

function setReconnectToken(roomCode: string, token: string): void {
  try {
    sessionStorage.setItem(`loveletter_reconnect_${roomCode}`, token);
  } catch {
    // Ignore storage errors
  }
}

function getStoredName(roomCode: string): string | null {
  try {
    return sessionStorage.getItem(`loveletter_name_${roomCode}`);
  } catch {
    return null;
  }
}

export function setStoredName(roomCode: string, name: string): void {
  try {
    sessionStorage.setItem(`loveletter_name_${roomCode}`, name);
  } catch {
    // Ignore
  }
}

export function usePartySocket(roomCode: string | null): {
  send: (msg: ClientMessage) => void;
  isConnected: boolean;
} {
  const socketRef = useRef<PartySocket | null>(null);
  const store = useOnlineStore;
  const isConnected = useOnlineStore((s) => s.isConnected);

  const send = useCallback(
    (msg: ClientMessage) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(msg));
      }
    },
    []
  );

  useEffect(() => {
    if (!roomCode) {
      // Clean up if room code is cleared
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      store.getState().setConnected(false);
      return;
    }

    // Build query params
    const reconnectToken = getReconnectToken(roomCode);
    const storedName = getStoredName(roomCode);
    const query: Record<string, string> = {};
    if (reconnectToken) {
      query.reconnectToken = reconnectToken;
    }
    if (storedName) {
      query.playerName = storedName;
    }

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomCode,
      query,
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      store.getState().setConnected(true);
      store.getState().setError(null);

      // If we have a stored name and no reconnect token, auto-join
      if (storedName && !reconnectToken) {
        const idToken = useAuthStore.getState().idToken;
        const joinMsg: ClientMessage = {
          type: "join",
          playerName: storedName,
          ...(idToken ? { idToken } : {}),
        };
        socket.send(JSON.stringify(joinMsg));
      }
    });

    socket.addEventListener("close", () => {
      store.getState().setConnected(false);
    });

    socket.addEventListener("error", () => {
      store.getState().setError("Connection error. Retrying...");
    });

    socket.addEventListener("message", (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data as string) as ServerMessage;
      } catch {
        return;
      }

      handleMessage(msg, roomCode);
    });

    // Subscribe to store to auto-advance animation queue when overlays clear
    const unsubscribe = store.subscribe((state, prevState) => {
      const wasAnimating = !!(
        prevState.cardAnnouncement ||
        prevState.guardReveal ||
        prevState.baronReveal ||
        prevState.baronResult ||
        prevState.princeDiscard
      );
      const isAnimating = !!(
        state.cardAnnouncement ||
        state.guardReveal ||
        state.baronReveal ||
        state.baronResult ||
        state.princeDiscard
      );
      if (wasAnimating && !isAnimating) {
        tryProcessNext();
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
      store.getState().setConnected(false);
      unsubscribe();
      animQueue.length = 0;
    };
  }, [roomCode, store]);

  return { send, isConnected };
}

// ─── Effect Text Helper ─────────────────────────────────────────────

function getCardEffectText(
  cardName: string,
  targetName?: string
): string | undefined {
  switch (cardName) {
    case "Guard":
      return "Guess a player\u2019s card";
    case "Priest":
      return "Look at a hand";
    case "Baron":
      return "Compare hands";
    case "Prince":
      return "Force a discard";
    case "King":
      return targetName
        ? `Swap hands with ${targetName}`
        : "Trade hands";
    case "Handmaid":
      return "Protected until next turn";
    case "Countess":
      return "Discarded with no effect";
    case "Princess":
      return "Eliminated!";
    case "Spy":
      return "No immediate effect";
    case "Chancellor":
      return "Draw and choose";
    default:
      return undefined;
  }
}

// ─── Animation Queue ────────────────────────────────────────────────

type AnimEvent =
  | { kind: "cardAnnouncement"; data: { card: { name: string; value: number }; playerName: string; effectText?: string; duration: number } }
  | { kind: "guardReveal"; data: { guesserName: string; targetName: string; guess: string; correct: boolean } }
  | { kind: "baronReveal"; data: { yourCard: { name: string; value: number }; theirCard: { name: string; value: number }; yourName: string; theirName: string; loserId: string | null } }
  | { kind: "baronResult"; data: { playerName: string; targetName: string; loserName: string | null; loserCard: { name: string; value: number } | null; isTie: boolean } }
  | { kind: "princeDiscard"; data: { card: { name: string; value: number }; targetName: string } };

const animQueue: AnimEvent[] = [];

function isAnimBusy(): boolean {
  const s = useOnlineStore.getState();
  return !!(
    s.cardAnnouncement ||
    s.guardReveal ||
    s.baronReveal ||
    s.baronResult ||
    s.princeDiscard
  );
}

function enqueueAnim(event: AnimEvent): void {
  animQueue.push(event);
  useOnlineStore.getState().setAnimQueueSize(animQueue.length);
  tryProcessNext();
}

function tryProcessNext(): void {
  if (isAnimBusy() || animQueue.length === 0) return;

  const event = animQueue.shift()!;
  useOnlineStore.getState().setAnimQueueSize(animQueue.length);
  const s = useOnlineStore.getState();

  switch (event.kind) {
    case "cardAnnouncement":
      s.setCardAnnouncement(event.data as any);
      break;
    case "guardReveal":
      s.setGuardReveal(event.data as any);
      break;
    case "baronReveal":
      s.setBaronReveal(event.data as any);
      break;
    case "baronResult":
      s.setBaronResult(event.data as any);
      break;
    case "princeDiscard":
      s.setPrinceDiscard(event.data as any);
      break;
  }
}

// ─── Log Helper ─────────────────────────────────────────────────────

let logCounter = 0;

function addLog(message: string, type: LogEntry["type"] = "info"): void {
  useOnlineStore.getState().addLogEntry({
    id: `log-${Date.now()}-${logCounter++}`,
    message,
    timestamp: Date.now(),
    type,
  });
}

// ─── Message Handler ─────────────────────────────────────────────────

function handleMessage(msg: ServerMessage, roomCode: string): void {
  const s = useOnlineStore.getState();

  switch (msg.type) {
    case "welcome": {
      s.setYourPlayerId(msg.yourPlayerId);
      s.setReconnectToken(msg.reconnectToken);
      setReconnectToken(roomCode, msg.reconnectToken);
      s.setError(null);
      break;
    }

    case "snapshot": {
      s.setSnapshot(msg.snapshot);
      break;
    }

    case "playerJoined": {
      s.setToast(`${msg.playerName} joined`);
      clearToastAfterDelay();
      addLog(`${msg.playerName} joined the room`, "info");
      break;
    }

    case "playerLeft": {
      s.setToast(`${msg.playerName} left`);
      clearToastAfterDelay();
      addLog(`${msg.playerName} left the room`, "info");
      break;
    }

    case "error": {
      s.setError(msg.message);
      // Auto-clear errors after 5 seconds
      setTimeout(() => {
        const current = useOnlineStore.getState().error;
        if (current === msg.message) {
          useOnlineStore.getState().setError(null);
        }
      }, 5000);
      break;
    }

    case "roomClosed": {
      s.setError(msg.reason);
      s.setSnapshot(null);
      break;
    }

    case "authResult": {
      if (msg.success && msg.user) {
        const authState = useAuthStore.getState();
        if (authState.user) {
          useAuthStore.getState().setUser({
            ...authState.user,
            id: msg.user.id,
          });
        }
      }
      break;
    }

    case "cardPlayed": {
      const yourId = useOnlineStore.getState().yourPlayerId;
      const isYourPlay = msg.playerId === yourId;
      const duration = isYourPlay ? 1300 : 2000;
      const effectText = getCardEffectText(msg.card.name, msg.targetName);

      enqueueAnim({
        kind: "cardAnnouncement",
        data: {
          card: msg.card,
          playerName: msg.playerName,
          effectText,
          duration,
        },
      });

      // Log
      const targetPart = msg.targetName ? ` → ${msg.targetName}` : "";
      addLog(`${msg.playerName} plays ${msg.card.name}${targetPart}`, "play");
      break;
    }

    case "priestPeek": {
      s.setPriestPeek({ card: msg.card, targetName: msg.targetName });
      addLog(`You peeked at ${msg.targetName}'s card`, "effect");
      break;
    }

    case "baronReveal": {
      enqueueAnim({
        kind: "baronReveal",
        data: {
          yourCard: msg.yourCard,
          theirCard: msg.theirCard,
          yourName: msg.yourName,
          theirName: msg.theirName,
          loserId: msg.loserId,
        },
      });
      if (msg.loserId) {
        const loserName = msg.loserId === useOnlineStore.getState().yourPlayerId
          ? msg.yourName : msg.theirName;
        addLog(`Baron: ${loserName} is eliminated!`, "elimination");
      } else {
        addLog(`Baron: ${msg.yourName} and ${msg.theirName} tied!`, "effect");
      }
      break;
    }

    case "baronResult": {
      enqueueAnim({
        kind: "baronResult",
        data: {
          playerName: msg.playerName,
          targetName: msg.targetName,
          loserName: msg.loserName,
          loserCard: msg.loserCard,
          isTie: msg.isTie,
        },
      });
      if (msg.loserName) {
        addLog(`Baron: ${msg.loserName} is eliminated!`, "elimination");
      } else {
        addLog(`Baron: ${msg.playerName} and ${msg.targetName} tied!`, "effect");
      }
      break;
    }

    case "guardReveal": {
      enqueueAnim({
        kind: "guardReveal",
        data: {
          guesserName: msg.guesserName,
          targetName: msg.targetName,
          guess: msg.guess,
          correct: msg.correct,
        },
      });
      if (msg.correct) {
        addLog(`Guard: ${msg.targetName} had the ${msg.guess}! Eliminated!`, "elimination");
      } else {
        addLog(`Guard: ${msg.targetName} did not have the ${msg.guess}`, "effect");
      }
      break;
    }

    case "princeDiscard": {
      enqueueAnim({
        kind: "princeDiscard",
        data: {
          card: msg.card,
          targetName: msg.targetName,
        },
      });
      if (msg.card.name === "Princess") {
        addLog(`Prince: ${msg.targetName} discards Princess! Eliminated!`, "elimination");
      } else {
        addLog(`Prince: ${msg.targetName} discards ${msg.card.name}`, "effect");
      }
      break;
    }

    case "roundOver": {
      const spyMsg = msg.result.spyBonusPlayerId
        ? " Spy bonus token awarded!"
        : "";
      s.setToast(
        `Round over: ${msg.result.winnerName} wins! (${msg.result.reason})${spyMsg}`
      );
      clearToastAfterDelay(5000);
      addLog(`Round over: ${msg.result.winnerName} wins! (${msg.result.reason})${spyMsg}`, "round");
      break;
    }

    case "gameOver": {
      s.setToast(`Game over! ${msg.winnerName} wins!`);
      clearToastAfterDelay(8000);
      addLog(`Game over! ${msg.winnerName} wins!`, "round");
      break;
    }
  }
}

// ─── Toast Helper ────────────────────────────────────────────────────

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function clearToastAfterDelay(ms = 3000): void {
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    useOnlineStore.getState().setToast(null);
    toastTimer = null;
  }, ms);
}
