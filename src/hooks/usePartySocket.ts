// ─── PartyKit WebSocket Hook for Love Letter ────────────────────────

import { useEffect, useRef, useCallback } from "react";
import PartySocket from "partysocket";
import type { ClientMessage, ServerMessage } from "../types/protocol";
import { useOnlineStore } from "../store/onlineStore";
import { useAuthStore } from "../store/authStore";

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

    return () => {
      socket.close();
      socketRef.current = null;
      store.getState().setConnected(false);
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

// ─── Message Handler ─────────────────────────────────────────────────

let announcementTimer: ReturnType<typeof setTimeout> | null = null;

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
      break;
    }

    case "playerLeft": {
      s.setToast(`${msg.playerName} left`);
      clearToastAfterDelay();
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
        // Update auth store with server-confirmed user ID
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

      s.setCardAnnouncement({
        card: msg.card,
        playerName: msg.playerName,
        effectText,
        duration,
      });

      // Auto-clear after duration
      if (announcementTimer) clearTimeout(announcementTimer);
      announcementTimer = setTimeout(() => {
        useOnlineStore.getState().setCardAnnouncement(null);
        announcementTimer = null;
      }, duration);
      break;
    }

    case "priestPeek": {
      s.setPriestPeek({ card: msg.card, targetName: msg.targetName });
      break;
    }

    case "baronReveal": {
      s.setBaronReveal({
        yourCard: msg.yourCard,
        theirCard: msg.theirCard,
        yourName: msg.yourName,
        theirName: msg.theirName,
        loserId: msg.loserId,
      });
      break;
    }

    case "guardReveal": {
      s.setGuardReveal({
        guesserName: msg.guesserName,
        targetName: msg.targetName,
        guess: msg.guess,
        correct: msg.correct,
      });
      break;
    }

    case "princeDiscard": {
      s.setPrinceDiscard({
        card: msg.card,
        targetName: msg.targetName,
      });
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
      break;
    }

    case "gameOver": {
      s.setToast(`Game over! ${msg.winnerName} wins!`);
      clearToastAfterDelay(8000);
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
