// ─── Love Letter PartyKit Game Server ────────────────────────────────
// Source of truth for all game logic. Clients only render snapshots.

import type * as Party from "partykit/server";
import type {
  Card,
  CardName,
  CardValue,
  Player,
  GameState,
  GamePhase,
  RoundResult,
  BotDifficulty,
} from "../src/types/game";
import type {
  ClientMessage,
  ServerMessage,
  GameSnapshot,
  SnapshotPlayer,
} from "../src/types/protocol";
import { verifyGoogleToken } from "./auth";
import { createD1Client } from "./d1-rest";
import { upsertUser, recordGameResult, getPlayerStats, getLeaderboard } from "./db";

// ─── Constants (inline to avoid import issues in party/ compilation) ─

const CARD_DEFS: {
  value: CardValue;
  name: CardName;
  count: number;
  targetType: "none" | "other" | "any" | "guess";
}[] = [
  { value: 0, name: "Spy", count: 2, targetType: "none" },
  { value: 1, name: "Guard", count: 6, targetType: "guess" },
  { value: 2, name: "Priest", count: 2, targetType: "other" },
  { value: 3, name: "Baron", count: 2, targetType: "other" },
  { value: 4, name: "Handmaid", count: 2, targetType: "none" },
  { value: 5, name: "Prince", count: 2, targetType: "any" },
  { value: 6, name: "Chancellor", count: 2, targetType: "none" },
  { value: 7, name: "King", count: 1, targetType: "other" },
  { value: 8, name: "Countess", count: 1, targetType: "none" },
  { value: 9, name: "Princess", count: 1, targetType: "none" },
];

const GUARD_GUESS_OPTIONS: CardName[] = [
  "Spy",
  "Priest",
  "Baron",
  "Handmaid",
  "Prince",
  "Chancellor",
  "King",
  "Countess",
  "Princess",
];

const PLAYER_AVATARS = ["crown", "rose", "quill", "shield", "ring", "scroll"];
const PLAYER_COLORS = [
  "#c41e3a",
  "#2e5090",
  "#6b3fa0",
  "#1a7a4c",
  "#c4762e",
  "#6b4423",
];

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;
const RECONNECT_GRACE_MS = 60_000;
const BOT_DELAY_MIN = 1000;
const BOT_DELAY_MAX = 2000;

// ─── Utility ─────────────────────────────────────────────────────────

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const def of CARD_DEFS) {
    for (let i = 0; i < def.count; i++) {
      deck.push({ value: def.value, name: def.name });
    }
  }
  return deck;
}

function getTokensToWin(playerCount: number): number {
  switch (playerCount) {
    case 2:
      return 6;
    case 3:
      return 5;
    case 4:
      return 4;
    case 5:
    case 6:
      return 3;
    default:
      return 4;
  }
}

function getCardDef(name: CardName) {
  return CARD_DEFS.find((d) => d.name === name)!;
}

function mustPlayCountess(hand: Card[]): boolean {
  const hasCountess = hand.some((c) => c.name === "Countess");
  const hasKingOrPrince = hand.some(
    (c) => c.name === "King" || c.name === "Prince"
  );
  return hasCountess && hasKingOrPrince;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function botDelay(): number {
  return BOT_DELAY_MIN + Math.random() * (BOT_DELAY_MAX - BOT_DELAY_MIN);
}

// ─── Connection Info ─────────────────────────────────────────────────

interface ConnectionInfo {
  playerId: string;
  reconnectToken: string;
  userId?: string;
}

interface DisconnectedPlayer {
  playerId: string;
  disconnectedAt: number;
  reconnectToken: string;
}

// ─── Room State ──────────────────────────────────────────────────────

interface RoomState {
  gameState: GameState;
  roomCode: string;
  hostId: string;
  connections: Map<string, ConnectionInfo>;
  disconnectedPlayers: Map<string, DisconnectedPlayer>;
}

// ─── Server ──────────────────────────────────────────────────────────

export default class LoveLetterServer implements Party.Server {
  room: Party.Room;
  state: RoomState;
  private botTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(room: Party.Room) {
    this.room = room;
    this.state = {
      gameState: {
        phase: "lobby",
        players: [],
        deck: [],
        setAsideCard: null,
        faceUpCards: [],
        currentPlayerIndex: 0,
        turnPhase: "drawing",
        roundNumber: 0,
        lastRoundResult: null,
        chancellorDrawn: [],
        pendingAction: {},
        gameWinnerId: null,
        tokensToWin: 4,
      },
      roomCode: room.id,
      hostId: "",
      connections: new Map(),
      disconnectedPlayers: new Map(),
    };
  }

  // ─── Connection Handlers ───────────────────────────────────────────

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Get reconnect token from URL query params
    const url = new URL(ctx.request.url);
    const reconnectToken = url.searchParams.get("reconnectToken");
    const playerName = url.searchParams.get("playerName");

    if (reconnectToken) {
      // Try to reconnect
      const disconnected = this.state.disconnectedPlayers.get(reconnectToken);
      if (disconnected) {
        // Reconnect successful
        this.state.disconnectedPlayers.delete(reconnectToken);
        this.state.connections.set(conn.id, {
          playerId: disconnected.playerId,
          reconnectToken: disconnected.reconnectToken,
        });

        // Send welcome with same playerId
        this.sendTo(conn, {
          type: "welcome",
          yourPlayerId: disconnected.playerId,
          reconnectToken: disconnected.reconnectToken,
        });

        // Send current state
        this.sendTo(conn, {
          type: "snapshot",
          snapshot: this.createSnapshot(disconnected.playerId),
        });
        return;
      }
    }

    // New connection - don't add player yet, wait for 'join' message
    // But store the connection temporarily
    // The join message will associate the connection with a player
    if (playerName) {
      // Auto-join from URL params (convenience)
      this.handleJoin(conn, playerName);
    }
  }

  onClose(conn: Party.Connection) {
    const info = this.state.connections.get(conn.id);
    if (!info) return;

    const player = this.state.gameState.players.find(
      (p) => p.id === info.playerId
    );
    if (!player) {
      this.state.connections.delete(conn.id);
      return;
    }

    if (this.state.gameState.phase === "lobby") {
      // In lobby, remove player entirely
      this.state.gameState.players = this.state.gameState.players.filter(
        (p) => p.id !== info.playerId
      );
      this.state.connections.delete(conn.id);

      // Transfer host if needed
      if (this.state.hostId === info.playerId) {
        const nextHuman = this.state.gameState.players.find(
          (p) => p.type === "human"
        );
        if (nextHuman) {
          this.state.hostId = nextHuman.id;
        }
      }

      this.broadcast({
        type: "playerLeft",
        playerId: info.playerId,
        playerName: player.name,
      });
      this.broadcastSnapshots();
    } else {
      // In game, allow reconnection
      this.state.disconnectedPlayers.set(info.reconnectToken, {
        playerId: info.playerId,
        disconnectedAt: Date.now(),
        reconnectToken: info.reconnectToken,
      });
      this.state.connections.delete(conn.id);

      // Set a timeout to remove the player if they don't reconnect
      setTimeout(() => {
        const disc = this.state.disconnectedPlayers.get(info.reconnectToken);
        if (disc) {
          this.state.disconnectedPlayers.delete(info.reconnectToken);
          // Transfer host if needed
          if (this.state.hostId === info.playerId) {
            this.transferHost();
          }
        }
      }, RECONNECT_GRACE_MS);
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "join":
        this.handleJoin(sender, msg.playerName, msg.reconnectToken, msg.idToken);
        break;
      case "addBot":
        this.handleAddBot(sender, msg.difficulty);
        break;
      case "removePlayer":
        this.handleRemovePlayer(sender, msg.playerId);
        break;
      case "startGame":
        this.handleStartGame(sender);
        break;
      case "startNewRound":
        this.handleStartNewRound(sender);
        break;
      case "resetGame":
        this.handleResetGame(sender);
        break;
      case "returnToLobby":
        this.handleReturnToLobby(sender);
        break;
      case "playCard":
        this.handlePlayCard(sender, msg.cardIndex);
        break;
      case "selectTarget":
        this.handleSelectTarget(sender, msg.targetId);
        break;
      case "guardGuess":
        this.handleGuardGuess(sender, msg.guess);
        break;
      case "chancellorKeep":
        this.handleChancellorKeep(sender, msg.keepIndex);
        break;
      case "princeTarget":
        this.handlePrinceTarget(sender, msg.targetId);
        break;
    }
  }

  async onRequest(req: Party.Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (req.method === "GET" && path.endsWith("/stats")) {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId required" }),
          { status: 400, headers }
        );
      }

      const env = (this.room as unknown as { env: Record<string, string | undefined> }).env;
      const db = createD1Client(env);
      if (!db) {
        return new Response(
          JSON.stringify({ error: "Database not configured" }),
          { status: 503, headers }
        );
      }

      const stats = await getPlayerStats(db, userId, "love-letter");
      return new Response(JSON.stringify(stats), { headers });
    }

    if (req.method === "GET" && path.endsWith("/leaderboard")) {
      const type = (url.searchParams.get("type") || "wins") as
        | "wins"
        | "highest_hand"
        | "win_rate";

      const env = (this.room as unknown as { env: Record<string, string | undefined> }).env;
      const db = createD1Client(env);
      if (!db) {
        return new Response(
          JSON.stringify({ error: "Database not configured" }),
          { status: 503, headers }
        );
      }

      const leaderboard = await getLeaderboard(db, type, "love-letter");
      return new Response(JSON.stringify(leaderboard), { headers });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers,
    });
  }

  // ─── Join / Lobby ──────────────────────────────────────────────────

  private handleJoin(
    conn: Party.Connection,
    playerName: string,
    reconnectToken?: string,
    idToken?: string
  ) {
    // Check for reconnection
    if (reconnectToken) {
      const disc = this.state.disconnectedPlayers.get(reconnectToken);
      if (disc) {
        this.state.disconnectedPlayers.delete(reconnectToken);
        this.state.connections.set(conn.id, {
          playerId: disc.playerId,
          reconnectToken: disc.reconnectToken,
        });

        this.sendTo(conn, {
          type: "welcome",
          yourPlayerId: disc.playerId,
          reconnectToken: disc.reconnectToken,
        });
        this.sendTo(conn, {
          type: "snapshot",
          snapshot: this.createSnapshot(disc.playerId),
        });
        return;
      }
    }

    // Check if already connected (duplicate join)
    const existingInfo = this.state.connections.get(conn.id);
    if (existingInfo) {
      this.sendTo(conn, {
        type: "welcome",
        yourPlayerId: existingInfo.playerId,
        reconnectToken: existingInfo.reconnectToken,
      });
      this.sendTo(conn, {
        type: "snapshot",
        snapshot: this.createSnapshot(existingInfo.playerId),
      });
      return;
    }

    // Cannot join mid-game
    if (this.state.gameState.phase !== "lobby") {
      this.sendTo(conn, {
        type: "error",
        message: "Game already in progress. Cannot join.",
      });
      return;
    }

    // Check player limit
    if (this.state.gameState.players.length >= MAX_PLAYERS) {
      this.sendTo(conn, {
        type: "error",
        message: "Room is full (max 6 players).",
      });
      return;
    }

    const playerId = generateId();
    const newReconnectToken = generateId() + generateId();
    const playerIndex = this.state.gameState.players.length;

    const player: Player = {
      id: playerId,
      name: playerName.trim().substring(0, 20) || `Player ${playerIndex + 1}`,
      type: "human",
      avatar: PLAYER_AVATARS[playerIndex % PLAYER_AVATARS.length],
      color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
      hand: [],
      discardPile: [],
      isAlive: true,
      isProtected: false,
      tokens: 0,
      hasPlayedSpy: false,
      knownCards: [],
    };

    this.state.gameState.players.push(player);
    this.state.connections.set(conn.id, {
      playerId,
      reconnectToken: newReconnectToken,
    });

    // First player is host
    if (this.state.gameState.players.length === 1) {
      this.state.hostId = playerId;
    }

    // Handle auth if provided
    if (idToken) {
      this.handleAuth(conn, playerId, idToken);
    }

    // Send welcome
    this.sendTo(conn, {
      type: "welcome",
      yourPlayerId: playerId,
      reconnectToken: newReconnectToken,
    });

    // Broadcast player joined
    this.broadcast({
      type: "playerJoined",
      playerId,
      playerName: player.name,
    });

    this.broadcastSnapshots();
  }

  private async handleAuth(
    conn: Party.Connection,
    playerId: string,
    idToken: string
  ) {
    const env = (this.room as unknown as { env: Record<string, string | undefined> }).env;
    const clientId = env.GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const claims = await verifyGoogleToken(idToken, clientId);
    if (!claims) {
      this.sendTo(conn, { type: "authResult", success: false });
      return;
    }

    const db = createD1Client(env);
    if (db) {
      const user = await upsertUser(
        db,
        claims.sub,
        claims.email,
        claims.name,
        claims.picture ?? null
      );

      // Update player with auth info
      const player = this.state.gameState.players.find(
        (p) => p.id === playerId
      );
      if (player) {
        player.userId = user.id;
        player.avatarUrl = user.avatar_url ?? undefined;
      }

      // Update connection info
      const connInfo = this.state.connections.get(conn.id);
      if (connInfo) {
        connInfo.userId = user.id;
      }

      this.sendTo(conn, {
        type: "authResult",
        success: true,
        user: { id: user.id },
      });
      this.broadcastSnapshots();
    }
  }

  private handleAddBot(conn: Party.Connection, difficulty: BotDifficulty) {
    const info = this.state.connections.get(conn.id);
    if (!info || info.playerId !== this.state.hostId) {
      this.sendTo(conn, {
        type: "error",
        message: "Only the host can add bots.",
      });
      return;
    }

    if (this.state.gameState.phase !== "lobby") {
      this.sendTo(conn, {
        type: "error",
        message: "Cannot add bots during a game.",
      });
      return;
    }

    if (this.state.gameState.players.length >= MAX_PLAYERS) {
      this.sendTo(conn, {
        type: "error",
        message: "Room is full.",
      });
      return;
    }

    const playerIndex = this.state.gameState.players.length;
    const botNames = ["Lady Aria", "Sir Roland", "Dame Isolde", "Lord Cedric", "Lady Vivienne"];
    const usedNames = new Set(this.state.gameState.players.map((p) => p.name));
    let botName = botNames.find((n) => !usedNames.has(n)) ?? `Bot ${playerIndex + 1}`;
    // Make sure name is unique
    if (usedNames.has(botName)) {
      botName = `Bot ${playerIndex + 1}`;
    }

    const bot: Player = {
      id: generateId(),
      name: botName,
      type: "bot",
      botDifficulty: difficulty,
      avatar: PLAYER_AVATARS[playerIndex % PLAYER_AVATARS.length],
      color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
      hand: [],
      discardPile: [],
      isAlive: true,
      isProtected: false,
      tokens: 0,
      hasPlayedSpy: false,
      knownCards: [],
    };

    this.state.gameState.players.push(bot);
    this.broadcast({
      type: "playerJoined",
      playerId: bot.id,
      playerName: bot.name,
    });
    this.broadcastSnapshots();
  }

  private handleRemovePlayer(conn: Party.Connection, playerId: string) {
    const info = this.state.connections.get(conn.id);
    if (!info || info.playerId !== this.state.hostId) {
      this.sendTo(conn, {
        type: "error",
        message: "Only the host can remove players.",
      });
      return;
    }

    if (this.state.gameState.phase !== "lobby") {
      this.sendTo(conn, {
        type: "error",
        message: "Cannot remove players during a game.",
      });
      return;
    }

    const player = this.state.gameState.players.find((p) => p.id === playerId);
    if (!player) return;

    // Cannot remove yourself (the host)
    if (playerId === this.state.hostId) {
      this.sendTo(conn, { type: "error", message: "Host cannot remove themselves." });
      return;
    }

    this.state.gameState.players = this.state.gameState.players.filter(
      (p) => p.id !== playerId
    );

    // Also disconnect if they're a human player
    for (const [connId, connInfo] of this.state.connections) {
      if (connInfo.playerId === playerId) {
        const playerConn = this.getConnectionById(connId);
        if (playerConn) {
          this.sendTo(playerConn, {
            type: "roomClosed",
            reason: "You have been removed from the room.",
          });
          playerConn.close();
        }
        this.state.connections.delete(connId);
        break;
      }
    }

    this.broadcast({
      type: "playerLeft",
      playerId,
      playerName: player.name,
    });
    this.broadcastSnapshots();
  }

  // ─── Game Flow ─────────────────────────────────────────────────────

  private handleStartGame(conn: Party.Connection) {
    const info = this.state.connections.get(conn.id);
    if (!info || info.playerId !== this.state.hostId) {
      this.sendTo(conn, {
        type: "error",
        message: "Only the host can start the game.",
      });
      return;
    }

    if (this.state.gameState.players.length < MIN_PLAYERS) {
      this.sendTo(conn, {
        type: "error",
        message: `Need at least ${MIN_PLAYERS} players to start.`,
      });
      return;
    }

    this.state.gameState.tokensToWin = getTokensToWin(
      this.state.gameState.players.length
    );
    this.state.gameState.roundNumber = 0;
    this.createNewRound();
  }

  private handleStartNewRound(conn: Party.Connection) {
    const info = this.state.connections.get(conn.id);
    if (!info || info.playerId !== this.state.hostId) {
      this.sendTo(conn, {
        type: "error",
        message: "Only the host can start a new round.",
      });
      return;
    }

    if (
      this.state.gameState.phase !== "roundEnd" &&
      this.state.gameState.phase !== "gameOver"
    ) {
      return;
    }

    this.createNewRound();
  }

  private handleResetGame(conn: Party.Connection) {
    const info = this.state.connections.get(conn.id);
    if (!info || info.playerId !== this.state.hostId) {
      this.sendTo(conn, {
        type: "error",
        message: "Only the host can reset the game.",
      });
      return;
    }

    // Reset all tokens
    for (const p of this.state.gameState.players) {
      p.tokens = 0;
    }
    this.state.gameState.gameWinnerId = null;
    this.state.gameState.roundNumber = 0;
    this.createNewRound();
  }

  private handleReturnToLobby(conn: Party.Connection) {
    const info = this.state.connections.get(conn.id);
    if (!info || info.playerId !== this.state.hostId) {
      this.sendTo(conn, {
        type: "error",
        message: "Only the host can return to lobby.",
      });
      return;
    }

    this.clearBotTimers();

    // Reset game state
    this.state.gameState.phase = "lobby";
    this.state.gameState.deck = [];
    this.state.gameState.setAsideCard = null;
    this.state.gameState.faceUpCards = [];
    this.state.gameState.currentPlayerIndex = 0;
    this.state.gameState.turnPhase = "drawing";
    this.state.gameState.roundNumber = 0;
    this.state.gameState.lastRoundResult = null;
    this.state.gameState.chancellorDrawn = [];
    this.state.gameState.pendingAction = {};
    this.state.gameState.gameWinnerId = null;

    for (const p of this.state.gameState.players) {
      p.hand = [];
      p.discardPile = [];
      p.isAlive = true;
      p.isProtected = false;
      p.tokens = 0;
      p.hasPlayedSpy = false;
      p.knownCards = [];
    }

    this.broadcastSnapshots();
  }

  // ─── Round Setup ───────────────────────────────────────────────────

  private createNewRound(): void {
    this.clearBotTimers();

    const gs = this.state.gameState;
    gs.roundNumber++;
    gs.phase = "playing";
    gs.lastRoundResult = null;
    gs.chancellorDrawn = [];
    gs.pendingAction = {};

    // Shuffle deck
    const deck = shuffle(createFullDeck());

    // Set aside 1 card face-down
    gs.setAsideCard = deck.pop()!;
    gs.faceUpCards = [];

    // For 2 players, remove 3 cards face-up
    if (gs.players.length === 2) {
      for (let i = 0; i < 3; i++) {
        const card = deck.pop();
        if (card) gs.faceUpCards.push(card);
      }
    }

    gs.deck = deck;

    // Reset player states for new round
    for (const p of gs.players) {
      p.hand = [];
      p.discardPile = [];
      p.isAlive = true;
      p.isProtected = false;
      p.hasPlayedSpy = false;
      p.knownCards = [];
    }

    // Deal 1 card to each player
    for (const p of gs.players) {
      const card = gs.deck.pop();
      if (card) p.hand.push(card);
    }

    // Start with first player (round-robin based on round number)
    gs.currentPlayerIndex = (gs.roundNumber - 1) % gs.players.length;
    gs.turnPhase = "drawing";

    this.broadcastSnapshots();
    this.startTurn();
  }

  // ─── Turn Flow ─────────────────────────────────────────────────────

  private startTurn(): void {
    const gs = this.state.gameState;
    if (gs.phase !== "playing") return;

    const player = gs.players[gs.currentPlayerIndex];
    if (!player || !player.isAlive) {
      this.advanceToNextPlayer();
      return;
    }

    // Clear protection at start of turn
    player.isProtected = false;

    // Draw a card
    if (gs.deck.length > 0) {
      const drawn = gs.deck.pop()!;
      player.hand.push(drawn);
    }

    gs.pendingAction = {};

    // Check Countess rule: if holding Countess + King/Prince, must play Countess
    if (mustPlayCountess(player.hand)) {
      // Force play Countess
      const countessIndex = player.hand.findIndex(
        (c) => c.name === "Countess"
      );
      if (countessIndex >= 0) {
        gs.turnPhase = "choosing";
        this.broadcastSnapshots();

        if (player.type === "bot") {
          this.scheduleBotAction(() => {
            this.executePlayCard(player.id, countessIndex);
          });
        }
        return;
      }
    }

    // Set turn phase to choosing
    gs.turnPhase = "choosing";
    this.broadcastSnapshots();

    // If bot, schedule bot turn
    if (player.type === "bot") {
      this.scheduleBotAction(() => {
        this.runBotTurn(player);
      });
    }
  }

  private handlePlayCard(conn: Party.Connection, cardIndex: number): void {
    const info = this.state.connections.get(conn.id);
    if (!info) return;

    this.executePlayCard(info.playerId, cardIndex);
  }

  private executePlayCard(playerId: string, cardIndex: number): void {
    const gs = this.state.gameState;
    if (gs.phase !== "playing" || gs.turnPhase !== "choosing") return;

    const player = gs.players[gs.currentPlayerIndex];
    if (!player || player.id !== playerId) return;

    if (cardIndex < 0 || cardIndex >= player.hand.length) return;

    // Countess rule validation
    if (mustPlayCountess(player.hand)) {
      if (player.hand[cardIndex].name !== "Countess") {
        // Must play Countess
        this.sendToPlayer(playerId, {
          type: "error",
          message: "You must play the Countess when holding King or Prince.",
        });
        return;
      }
    }

    const card = player.hand.splice(cardIndex, 1)[0];
    player.discardPile.push(card);
    gs.pendingAction = { playedCard: card };

    // Track spy
    if (card.name === "Spy") {
      player.hasPlayedSpy = true;
    }

    // Determine if card needs a target
    const def = getCardDef(card.name);

    if (def.targetType === "none") {
      // Resolve immediately
      this.resolveCardEffect(card, playerId);
      return;
    }

    if (def.targetType === "guess") {
      // Guard: needs target then guess
      // Check if there are valid targets
      const validTargets = this.getValidTargets(playerId, card.name);
      if (validTargets.length === 0) {
        // No valid targets - card has no effect
        this.broadcast({
          type: "cardPlayed",
          playerId,
          playerName: player.name,
          card,
          result: "No valid targets - no effect",
        });
        this.finishTurn();
        return;
      }

      gs.turnPhase = "selectingTarget";
      this.broadcastSnapshots();

      if (player.type === "bot") {
        this.scheduleBotAction(() => {
          this.runBotTargetSelection(player, card);
        });
      }
      return;
    }

    if (def.targetType === "other") {
      // Priest, Baron, King: needs another player target
      const validTargets = this.getValidTargets(playerId, card.name);
      if (validTargets.length === 0) {
        // No valid targets - card has no effect
        this.broadcast({
          type: "cardPlayed",
          playerId,
          playerName: player.name,
          card,
          result: "No valid targets - no effect",
        });
        this.finishTurn();
        return;
      }

      gs.turnPhase = "selectingTarget";
      this.broadcastSnapshots();

      if (player.type === "bot") {
        this.scheduleBotAction(() => {
          this.runBotTargetSelection(player, card);
        });
      }
      return;
    }

    if (def.targetType === "any") {
      // Prince: can target self or others
      const validTargets = this.getValidTargetsForPrince(playerId);
      if (validTargets.length === 0) {
        // Should not happen as Prince can always target self
        this.finishTurn();
        return;
      }

      // Check if all other players are protected - must target self
      const otherTargets = validTargets.filter((t) => t.id !== playerId);
      if (otherTargets.length === 0) {
        // Must target self
        this.resolvePrinceEffect(playerId, playerId);
        return;
      }

      gs.turnPhase = "selectingTarget";
      this.broadcastSnapshots();

      if (player.type === "bot") {
        this.scheduleBotAction(() => {
          this.runBotPrinceTarget(player);
        });
      }
      return;
    }
  }

  private handleSelectTarget(conn: Party.Connection, targetId: string): void {
    const info = this.state.connections.get(conn.id);
    if (!info) return;

    const gs = this.state.gameState;
    if (gs.phase !== "playing" || gs.turnPhase !== "selectingTarget") return;

    const player = gs.players[gs.currentPlayerIndex];
    if (!player || player.id !== info.playerId) return;

    const card = gs.pendingAction.playedCard;
    if (!card) return;

    const target = gs.players.find((p) => p.id === targetId);
    if (!target || !target.isAlive || target.isProtected) {
      this.sendToPlayer(info.playerId, {
        type: "error",
        message: "Invalid target.",
      });
      return;
    }

    // For 'other' type cards, can't target self
    const def = getCardDef(card.name);
    if (def.targetType === "other" && targetId === info.playerId) {
      this.sendToPlayer(info.playerId, {
        type: "error",
        message: "You cannot target yourself with this card.",
      });
      return;
    }

    gs.pendingAction.targetPlayerId = targetId;

    if (card.name === "Guard") {
      // Need a guess
      gs.turnPhase = "guardGuessing";
      this.broadcastSnapshots();

      if (player.type === "bot") {
        this.scheduleBotAction(() => {
          this.runBotGuardGuess(player, targetId);
        });
      }
      return;
    }

    // Resolve the card effect
    this.resolveCardEffect(card, info.playerId, targetId);
  }

  private handleGuardGuess(conn: Party.Connection, guess: CardName): void {
    const info = this.state.connections.get(conn.id);
    if (!info) return;

    const gs = this.state.gameState;
    if (gs.phase !== "playing" || gs.turnPhase !== "guardGuessing") return;

    const player = gs.players[gs.currentPlayerIndex];
    if (!player || player.id !== info.playerId) return;

    // Can't guess Guard
    if (guess === "Guard") {
      this.sendToPlayer(info.playerId, {
        type: "error",
        message: "You cannot guess Guard.",
      });
      return;
    }

    if (!GUARD_GUESS_OPTIONS.includes(guess)) {
      this.sendToPlayer(info.playerId, {
        type: "error",
        message: "Invalid guess.",
      });
      return;
    }

    gs.pendingAction.guardGuess = guess;
    const targetId = gs.pendingAction.targetPlayerId;
    const card = gs.pendingAction.playedCard;

    if (targetId && card) {
      this.resolveCardEffect(card, info.playerId, targetId, guess);
    }
  }

  private handleChancellorKeep(
    conn: Party.Connection,
    keepIndex: number
  ): void {
    const info = this.state.connections.get(conn.id);
    if (!info) return;

    this.executeChancellorKeep(info.playerId, keepIndex);
  }

  private executeChancellorKeep(playerId: string, keepIndex: number): void {
    const gs = this.state.gameState;
    if (gs.phase !== "playing" || gs.turnPhase !== "chancellorPick") return;

    const player = gs.players[gs.currentPlayerIndex];
    if (!player || player.id !== playerId) return;

    // Chancellor: player has their 1 remaining hand card + chancellorDrawn (up to 2)
    // All options are stored in chancellorDrawn (including the hand card)
    const options = gs.chancellorDrawn;
    if (keepIndex < 0 || keepIndex >= options.length) {
      this.sendToPlayer(playerId, {
        type: "error",
        message: "Invalid selection.",
      });
      return;
    }

    // Keep the chosen card
    const kept = options[keepIndex];
    player.hand = [kept];

    // Return the rest to the bottom of the deck in random order
    const returned = options.filter((_, i) => i !== keepIndex);
    const shuffledReturn = shuffle(returned);
    gs.deck.unshift(...shuffledReturn);

    gs.chancellorDrawn = [];

    this.broadcast({
      type: "cardPlayed",
      playerId,
      playerName: player.name,
      card: gs.pendingAction.playedCard!,
      result: "Drew cards and made a selection",
    });

    this.finishTurn();
  }

  private handlePrinceTarget(conn: Party.Connection, targetId: string): void {
    const info = this.state.connections.get(conn.id);
    if (!info) return;

    const gs = this.state.gameState;
    if (gs.phase !== "playing" || gs.turnPhase !== "selectingTarget") return;

    const player = gs.players[gs.currentPlayerIndex];
    if (!player || player.id !== info.playerId) return;

    const card = gs.pendingAction.playedCard;
    if (!card || card.name !== "Prince") return;

    const target = gs.players.find((p) => p.id === targetId);
    if (!target || !target.isAlive) {
      this.sendToPlayer(info.playerId, {
        type: "error",
        message: "Invalid target.",
      });
      return;
    }

    // Can't target protected players (unless targeting self)
    if (target.isProtected && targetId !== info.playerId) {
      this.sendToPlayer(info.playerId, {
        type: "error",
        message: "That player is protected.",
      });
      return;
    }

    this.resolvePrinceEffect(info.playerId, targetId);
  }

  // ─── Card Effect Resolution ────────────────────────────────────────

  private resolveCardEffect(
    card: Card,
    playerId: string,
    targetId?: string,
    guardGuess?: CardName
  ): void {
    const gs = this.state.gameState;
    const player = gs.players.find((p) => p.id === playerId)!;
    const target = targetId
      ? gs.players.find((p) => p.id === targetId)
      : undefined;

    gs.turnPhase = "resolving";

    switch (card.name) {
      case "Spy": {
        // No effect - spy bonus checked at round end
        this.broadcast({
          type: "cardPlayed",
          playerId,
          playerName: player.name,
          card,
          result: "Played the Spy",
        });
        this.finishTurn();
        break;
      }

      case "Guard": {
        if (!target || !guardGuess) {
          this.finishTurn();
          return;
        }

        const correct =
          target.hand.length > 0 && target.hand[0].name === guardGuess;
        if (correct) {
          target.isAlive = false;
          // Track spy if discarded
          if (target.hand[0].name === "Spy") {
            target.hasPlayedSpy = true;
          }
          target.discardPile.push(...target.hand);
          target.hand = [];
          this.broadcast({
            type: "cardPlayed",
            playerId,
            playerName: player.name,
            card,
            targetName: target.name,
            result: `Correctly guessed ${guardGuess} - ${target.name} is eliminated!`,
          });
        } else {
          this.broadcast({
            type: "cardPlayed",
            playerId,
            playerName: player.name,
            card,
            targetName: target.name,
            result: `Guessed ${guardGuess} - incorrect!`,
          });
        }

        // Broadcast guard reveal to all players
        this.broadcast({
          type: "guardReveal",
          guesserName: player.name,
          targetName: target.name,
          guess: guardGuess,
          correct,
        });

        this.finishTurn();
        break;
      }

      case "Priest": {
        if (!target) {
          this.finishTurn();
          return;
        }

        this.broadcast({
          type: "cardPlayed",
          playerId,
          playerName: player.name,
          card,
          targetName: target.name,
          result: `Looked at ${target.name}'s hand`,
        });

        // Only the priest sees the card
        if (target.hand.length > 0) {
          this.sendToPlayer(playerId, {
            type: "priestPeek",
            card: target.hand[0],
            targetName: target.name,
          });

          // Track known card
          player.knownCards.push({
            playerId: target.id,
            card: target.hand[0],
            source: "priest",
          });
        }

        this.finishTurn();
        break;
      }

      case "Baron": {
        if (!target) {
          this.finishTurn();
          return;
        }

        const myCard = player.hand[0];
        const theirCard = target.hand[0];

        if (!myCard || !theirCard) {
          this.finishTurn();
          return;
        }

        let loserId: string | null = null;
        let result: string;

        if (myCard.value > theirCard.value) {
          loserId = target.id;
          target.isAlive = false;
          if (target.hand[0]?.name === "Spy") {
            target.hasPlayedSpy = true;
          }
          target.discardPile.push(...target.hand);
          target.hand = [];
          result = `${target.name} is eliminated! (had ${theirCard.name} ${theirCard.value})`;
        } else if (myCard.value < theirCard.value) {
          loserId = playerId;
          player.isAlive = false;
          if (player.hand[0]?.name === "Spy") {
            player.hasPlayedSpy = true;
          }
          player.discardPile.push(...player.hand);
          player.hand = [];
          result = `${player.name} is eliminated! (had ${myCard.name} ${myCard.value})`;
        } else {
          result = `Tie! Both have value ${myCard.value} - no one is eliminated`;
        }

        this.broadcast({
          type: "cardPlayed",
          playerId,
          playerName: player.name,
          card,
          targetName: target.name,
          result,
        });

        // Send baron reveal to both players
        this.sendToPlayer(playerId, {
          type: "baronReveal",
          yourCard: myCard,
          theirCard,
          loserId,
          yourName: player.name,
          theirName: target.name,
        });
        this.sendToPlayer(target.id, {
          type: "baronReveal",
          yourCard: theirCard,
          theirCard: myCard,
          loserId,
          yourName: target.name,
          theirName: player.name,
        });

        // Track known cards for both
        player.knownCards.push({
          playerId: target.id,
          card: theirCard,
          source: "baron",
        });
        target.knownCards.push({
          playerId: player.id,
          card: myCard,
          source: "baron",
        });

        this.finishTurn();
        break;
      }

      case "Handmaid": {
        player.isProtected = true;
        this.broadcast({
          type: "cardPlayed",
          playerId,
          playerName: player.name,
          card,
          result: `${player.name} is now protected until their next turn`,
        });
        this.finishTurn();
        break;
      }

      case "Prince": {
        // Prince target selection is handled separately
        // This shouldn't be called for Prince - it goes through handlePrinceTarget
        this.finishTurn();
        break;
      }

      case "Chancellor": {
        // Draw up to 2 cards, choose 1 of all to keep, return rest to bottom
        const drawn: Card[] = [];
        for (let i = 0; i < 2; i++) {
          if (gs.deck.length > 0) {
            drawn.push(gs.deck.pop()!);
          }
        }

        if (drawn.length === 0) {
          // No cards to draw - no effect
          this.broadcast({
            type: "cardPlayed",
            playerId,
            playerName: player.name,
            card,
            result: "No cards in deck - no effect",
          });
          this.finishTurn();
          return;
        }

        // Combine hand card with drawn cards
        const allOptions = [...player.hand, ...drawn];
        gs.chancellorDrawn = allOptions;
        player.hand = [];

        gs.turnPhase = "chancellorPick";
        this.broadcastSnapshots();

        if (player.type === "bot") {
          this.scheduleBotAction(() => {
            this.runBotChancellorPick(player);
          });
        }
        break;
      }

      case "King": {
        if (!target) {
          this.finishTurn();
          return;
        }

        // Trade hands
        const tempHand = player.hand;
        player.hand = target.hand;
        target.hand = tempHand;

        // Track known cards for both
        if (player.hand.length > 0) {
          target.knownCards.push({
            playerId: player.id,
            card: player.hand[0],
            source: "trade",
          });
        }
        if (target.hand.length > 0) {
          player.knownCards.push({
            playerId: target.id,
            card: target.hand[0],
            source: "trade",
          });
        }

        this.broadcast({
          type: "cardPlayed",
          playerId,
          playerName: player.name,
          card,
          targetName: target.name,
          result: `Traded hands with ${target.name}`,
        });

        this.finishTurn();
        break;
      }

      case "Countess": {
        this.broadcast({
          type: "cardPlayed",
          playerId,
          playerName: player.name,
          card,
          result: "Played the Countess",
        });
        this.finishTurn();
        break;
      }

      case "Princess": {
        // Playing Princess = elimination
        player.isAlive = false;
        player.discardPile.push(...player.hand);
        player.hand = [];
        this.broadcast({
          type: "cardPlayed",
          playerId,
          playerName: player.name,
          card,
          result: `${player.name} played the Princess and is eliminated!`,
        });
        this.finishTurn();
        break;
      }
    }
  }

  private resolvePrinceEffect(playerId: string, targetId: string): void {
    const gs = this.state.gameState;
    const player = gs.players.find((p) => p.id === playerId)!;
    const target = gs.players.find((p) => p.id === targetId)!;

    gs.turnPhase = "resolving";

    // Target discards their hand
    const discarded = target.hand.splice(0, target.hand.length);
    target.discardPile.push(...discarded);

    // Broadcast prince discard to all players
    if (discarded.length > 0) {
      this.broadcast({
        type: "princeDiscard",
        card: discarded[0],
        targetName: target.name,
      });
    }

    // Track spy if Princess is discarded
    for (const c of discarded) {
      if (c.name === "Spy") {
        target.hasPlayedSpy = true;
      }
    }

    // Check if discarded Princess
    const discardedPrincess = discarded.some((c) => c.name === "Princess");
    if (discardedPrincess) {
      target.isAlive = false;
      this.broadcast({
        type: "cardPlayed",
        playerId,
        playerName: player.name,
        card: gs.pendingAction.playedCard!,
        targetName: target.name,
        result: `${target.name} discarded the Princess and is eliminated!`,
      });
    } else {
      // Draw a new card
      if (gs.deck.length > 0) {
        target.hand.push(gs.deck.pop()!);
      } else if (gs.setAsideCard) {
        // If deck is empty, draw the set-aside card
        target.hand.push(gs.setAsideCard);
        gs.setAsideCard = null;
      }

      this.broadcast({
        type: "cardPlayed",
        playerId,
        playerName: player.name,
        card: gs.pendingAction.playedCard!,
        targetName: target.name,
        result: `${target.name} discarded and drew a new card`,
      });
    }

    this.finishTurn();
  }

  // ─── Turn Completion ───────────────────────────────────────────────

  private finishTurn(): void {
    const gs = this.state.gameState;
    gs.turnPhase = "resolved";

    // Check round end conditions
    if (this.checkAndResolveRoundEnd()) {
      return;
    }

    // Advance to next player
    this.advanceToNextPlayer();
  }

  private advanceToNextPlayer(): void {
    const gs = this.state.gameState;
    const playerCount = gs.players.length;
    let nextIndex = gs.currentPlayerIndex;

    // Find next alive player
    for (let i = 0; i < playerCount; i++) {
      nextIndex = (nextIndex + 1) % playerCount;
      if (gs.players[nextIndex].isAlive) {
        gs.currentPlayerIndex = nextIndex;
        this.startTurn();
        return;
      }
    }

    // No alive players found (shouldn't happen)
    this.checkAndResolveRoundEnd();
  }

  private checkAndResolveRoundEnd(): boolean {
    const gs = this.state.gameState;
    const alivePlayers = gs.players.filter((p) => p.isAlive);

    // Only 1 player left
    if (alivePlayers.length <= 1) {
      if (alivePlayers.length === 1) {
        this.endRound(alivePlayers[0], "lastStanding");
      }
      return true;
    }

    // Deck is empty
    if (gs.deck.length === 0) {
      // Compare hands of alive players
      let highestValue = -1;
      const winners: Player[] = [];

      for (const p of alivePlayers) {
        const cardValue = p.hand.length > 0 ? p.hand[0].value : -1;
        if (cardValue > highestValue) {
          highestValue = cardValue;
          winners.length = 0;
          winners.push(p);
        } else if (cardValue === highestValue) {
          winners.push(p);
        }
      }

      // Build revealed hands
      const revealedHands = alivePlayers.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        card: p.hand[0] || { value: 0 as CardValue, name: "Spy" as CardName },
      }));

      if (winners.length === 1) {
        this.endRound(winners[0], "highestCard", revealedHands);
      } else {
        // Ties: all tied players win (each gets a token)
        // For the result, pick the first winner as the "main" winner
        this.endRoundMultipleWinners(winners, revealedHands);
      }
      return true;
    }

    return false;
  }

  private endRound(
    winner: Player,
    reason: "lastStanding" | "highestCard" | "tiebreak",
    revealedHands?: { playerId: string; playerName: string; card: Card }[]
  ): void {
    const gs = this.state.gameState;
    winner.tokens++;

    // Check spy bonus
    const spyBonusPlayerId = this.checkSpyBonus();

    const result: RoundResult = {
      winnerId: winner.id,
      winnerName: winner.name,
      reason,
      revealedHands,
      spyBonusPlayerId,
    };

    gs.lastRoundResult = result;

    // Check game over
    if (winner.tokens >= gs.tokensToWin) {
      gs.phase = "gameOver";
      gs.gameWinnerId = winner.id;

      this.broadcast({ type: "roundOver", result });
      this.broadcast({
        type: "gameOver",
        winnerId: winner.id,
        winnerName: winner.name,
      });

      this.broadcastSnapshots();
      this.recordGameEnd();
      return;
    }

    gs.phase = "roundEnd";
    this.broadcast({ type: "roundOver", result });
    this.broadcastSnapshots();
  }

  private endRoundMultipleWinners(
    winners: Player[],
    revealedHands: { playerId: string; playerName: string; card: Card }[]
  ): void {
    const gs = this.state.gameState;

    // All tied winners get a token
    for (const w of winners) {
      w.tokens++;
    }

    // Check spy bonus
    const spyBonusPlayerId = this.checkSpyBonus();

    const winnerNames = winners.map((w) => w.name).join(" & ");
    const result: RoundResult = {
      winnerId: winners[0].id,
      winnerName: winnerNames,
      reason: "tiebreak",
      revealedHands,
      spyBonusPlayerId,
    };

    gs.lastRoundResult = result;

    // Check if any winner reached token goal
    const gameWinner = winners.find((w) => w.tokens >= gs.tokensToWin);
    if (gameWinner) {
      gs.phase = "gameOver";
      gs.gameWinnerId = gameWinner.id;

      this.broadcast({ type: "roundOver", result });
      this.broadcast({
        type: "gameOver",
        winnerId: gameWinner.id,
        winnerName: gameWinner.name,
      });

      this.broadcastSnapshots();
      this.recordGameEnd();
      return;
    }

    gs.phase = "roundEnd";
    this.broadcast({ type: "roundOver", result });
    this.broadcastSnapshots();
  }

  private checkSpyBonus(): string | undefined {
    const gs = this.state.gameState;
    const alivePlayers = gs.players.filter((p) => p.isAlive);

    // Count alive players who played/discarded a spy
    const spyPlayers = alivePlayers.filter((p) => p.hasPlayedSpy);

    // Exactly 1 alive player played/discarded a spy → bonus token
    if (spyPlayers.length === 1) {
      spyPlayers[0].tokens++;
      return spyPlayers[0].id;
    }

    return undefined;
  }

  // ─── Bot AI ────────────────────────────────────────────────────────

  private scheduleBotAction(action: () => void): void {
    const timer = setTimeout(action, botDelay());
    this.botTimers.push(timer);
  }

  private clearBotTimers(): void {
    for (const t of this.botTimers) {
      clearTimeout(t);
    }
    this.botTimers = [];
  }

  private runBotTurn(bot: Player): void {
    const gs = this.state.gameState;
    if (gs.phase !== "playing" || gs.turnPhase !== "choosing") return;
    if (gs.players[gs.currentPlayerIndex]?.id !== bot.id) return;

    // Countess forced
    if (mustPlayCountess(bot.hand)) {
      const idx = bot.hand.findIndex((c) => c.name === "Countess");
      if (idx >= 0) {
        this.executePlayCard(bot.id, idx);
        return;
      }
    }

    const difficulty = bot.botDifficulty ?? "medium";

    if (difficulty === "easy") {
      // Random card
      const idx = Math.floor(Math.random() * bot.hand.length);
      this.executePlayCard(bot.id, idx);
    } else if (difficulty === "medium") {
      // Prefer not to play Princess, prefer to play lower value cards
      this.botMediumPlay(bot);
    } else {
      // Hard: smarter play
      this.botHardPlay(bot);
    }
  }

  private botMediumPlay(bot: Player): void {
    // Don't play Princess if possible
    const nonPrincess = bot.hand
      .map((c, i) => ({ card: c, index: i }))
      .filter((x) => x.card.name !== "Princess");

    if (nonPrincess.length > 0) {
      // Play lower value card
      nonPrincess.sort((a, b) => a.card.value - b.card.value);
      this.executePlayCard(bot.id, nonPrincess[0].index);
    } else {
      // Must play Princess (only card)
      this.executePlayCard(bot.id, 0);
    }
  }

  private botHardPlay(bot: Player): void {
    const gs = this.state.gameState;
    const alivePlayers = gs.players.filter(
      (p) => p.isAlive && p.id !== bot.id && !p.isProtected
    );

    // Don't play Princess
    const playable = bot.hand
      .map((c, i) => ({ card: c, index: i }))
      .filter((x) => x.card.name !== "Princess");

    if (playable.length === 0) {
      this.executePlayCard(bot.id, 0);
      return;
    }

    // If we have Guard and know someone's card, play Guard
    const guardIdx = playable.findIndex((x) => x.card.name === "Guard");
    if (guardIdx >= 0 && bot.knownCards.length > 0) {
      const knownTarget = bot.knownCards.find((kc) => {
        const tp = gs.players.find((p) => p.id === kc.playerId);
        return (
          tp &&
          tp.isAlive &&
          !tp.isProtected &&
          tp.id !== bot.id &&
          kc.card.name !== "Guard"
        );
      });
      if (knownTarget) {
        this.executePlayCard(bot.id, playable[guardIdx].index);
        return;
      }
    }

    // If we have Baron and our other card is high value (>=5), play Baron
    const baronIdx = playable.findIndex((x) => x.card.name === "Baron");
    if (baronIdx >= 0 && alivePlayers.length > 0) {
      const otherCard = bot.hand.find((c) => c.name !== "Baron");
      if (otherCard && otherCard.value >= 5) {
        this.executePlayCard(bot.id, playable[baronIdx].index);
        return;
      }
    }

    // Prefer Spy, Handmaid, then lowest value
    const spy = playable.find((x) => x.card.name === "Spy");
    if (spy) {
      this.executePlayCard(bot.id, spy.index);
      return;
    }

    const handmaid = playable.find((x) => x.card.name === "Handmaid");
    if (handmaid) {
      this.executePlayCard(bot.id, handmaid.index);
      return;
    }

    // Play lowest value
    playable.sort((a, b) => a.card.value - b.card.value);
    this.executePlayCard(bot.id, playable[0].index);
  }

  private runBotTargetSelection(bot: Player, card: Card): void {
    const gs = this.state.gameState;
    if (gs.turnPhase !== "selectingTarget") return;

    const validTargets = this.getValidTargets(bot.id, card.name);
    if (validTargets.length === 0) return;

    // Pick a target
    const difficulty = bot.botDifficulty ?? "medium";
    let target: Player;

    if (difficulty === "hard" && card.name === "Guard") {
      // If we know someone's card, target them
      const knownTarget = bot.knownCards.find((kc) => {
        const tp = validTargets.find((t) => t.id === kc.playerId);
        return tp && kc.card.name !== "Guard";
      });
      if (knownTarget) {
        target = validTargets.find((t) => t.id === knownTarget.playerId)!;
      } else {
        target = validTargets[Math.floor(Math.random() * validTargets.length)];
      }
    } else if (difficulty === "hard" && card.name === "Baron") {
      // Target player we think has lower card
      const knownLow = bot.knownCards.find((kc) => {
        const tp = validTargets.find((t) => t.id === kc.playerId);
        const myCard = bot.hand[0];
        return tp && myCard && kc.card.value < myCard.value;
      });
      if (knownLow) {
        target = validTargets.find((t) => t.id === knownLow.playerId)!;
      } else {
        target = validTargets[Math.floor(Math.random() * validTargets.length)];
      }
    } else {
      // Random target
      target = validTargets[Math.floor(Math.random() * validTargets.length)];
    }

    if (card.name === "Guard") {
      // Select target, then will need to guess
      gs.pendingAction.targetPlayerId = target.id;
      gs.turnPhase = "guardGuessing";
      this.broadcastSnapshots();

      this.scheduleBotAction(() => {
        this.runBotGuardGuess(bot, target.id);
      });
    } else {
      this.resolveCardEffect(card, bot.id, target.id);
    }
  }

  private runBotGuardGuess(bot: Player, targetId: string): void {
    const gs = this.state.gameState;
    if (gs.turnPhase !== "guardGuessing") return;

    const difficulty = bot.botDifficulty ?? "medium";
    let guess: CardName;

    if (difficulty === "hard") {
      // Check if we know the target's card
      const known = bot.knownCards.find(
        (kc) => kc.playerId === targetId && kc.card.name !== "Guard"
      );
      if (known) {
        guess = known.card.name;
      } else {
        // Guess most common remaining: Priest, Baron, etc.
        guess =
          GUARD_GUESS_OPTIONS[
            Math.floor(Math.random() * GUARD_GUESS_OPTIONS.length)
          ];
      }
    } else {
      // Random guess
      guess =
        GUARD_GUESS_OPTIONS[
          Math.floor(Math.random() * GUARD_GUESS_OPTIONS.length)
        ];
    }

    gs.pendingAction.guardGuess = guess;
    const card = gs.pendingAction.playedCard;
    if (card) {
      this.resolveCardEffect(card, bot.id, targetId, guess);
    }
  }

  private runBotPrinceTarget(bot: Player): void {
    const gs = this.state.gameState;
    if (gs.turnPhase !== "selectingTarget") return;

    const validTargets = this.getValidTargetsForPrince(bot.id);
    if (validTargets.length === 0) return;

    const difficulty = bot.botDifficulty ?? "medium";
    let targetId: string;

    if (difficulty === "hard") {
      // If we know someone has Princess, target them
      const princessHolder = bot.knownCards.find((kc) => {
        const tp = validTargets.find((t) => t.id === kc.playerId);
        return tp && kc.card.name === "Princess" && tp.id !== bot.id;
      });
      if (princessHolder) {
        targetId = princessHolder.playerId;
      } else {
        // Random other player (prefer not self)
        const others = validTargets.filter((t) => t.id !== bot.id);
        if (others.length > 0) {
          targetId = others[Math.floor(Math.random() * others.length)].id;
        } else {
          targetId = bot.id;
        }
      }
    } else {
      // Random (prefer not self for medium, truly random for easy)
      if (difficulty === "medium") {
        const others = validTargets.filter((t) => t.id !== bot.id);
        if (others.length > 0) {
          targetId = others[Math.floor(Math.random() * others.length)].id;
        } else {
          targetId = bot.id;
        }
      } else {
        targetId =
          validTargets[Math.floor(Math.random() * validTargets.length)].id;
      }
    }

    this.resolvePrinceEffect(bot.id, targetId);
  }

  private runBotChancellorPick(bot: Player): void {
    const gs = this.state.gameState;
    if (gs.turnPhase !== "chancellorPick") return;

    const options = gs.chancellorDrawn;
    if (options.length === 0) return;

    const difficulty = bot.botDifficulty ?? "medium";

    if (difficulty === "hard") {
      // Keep highest value card (but not Princess if we can avoid it and it's early)
      let bestIdx = 0;
      let bestValue = -1;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value > bestValue) {
          bestValue = options[i].value;
          bestIdx = i;
        }
      }
      this.executeChancellorKeep(bot.id, bestIdx);
    } else if (difficulty === "medium") {
      // Keep highest non-Princess
      const nonPrincess = options
        .map((c, i) => ({ card: c, index: i }))
        .filter((x) => x.card.name !== "Princess");

      if (nonPrincess.length > 0) {
        nonPrincess.sort((a, b) => b.card.value - a.card.value);
        this.executeChancellorKeep(bot.id, nonPrincess[0].index);
      } else {
        this.executeChancellorKeep(bot.id, 0);
      }
    } else {
      // Random
      this.executeChancellorKeep(
        bot.id,
        Math.floor(Math.random() * options.length)
      );
    }
  }

  // ─── Target Validation ─────────────────────────────────────────────

  private getValidTargets(playerId: string, _cardName: CardName): Player[] {
    const gs = this.state.gameState;
    return gs.players.filter(
      (p) => p.isAlive && p.id !== playerId && !p.isProtected
    );
  }

  private getValidTargetsForPrince(playerId: string): Player[] {
    const gs = this.state.gameState;
    const self = gs.players.find((p) => p.id === playerId);

    // Others who are alive and not protected
    const others = gs.players.filter(
      (p) => p.isAlive && p.id !== playerId && !p.isProtected
    );

    // Can also target self
    const targets = [...others];
    if (self && self.isAlive) {
      targets.push(self);
    }

    return targets;
  }

  // ─── Snapshot ──────────────────────────────────────────────────────

  private createSnapshot(forPlayerId: string): GameSnapshot {
    const gs = this.state.gameState;

    const players: SnapshotPlayer[] = gs.players.map((p) => {
      const sp: SnapshotPlayer = {
        id: p.id,
        name: p.name,
        type: p.type,
        avatar: p.avatar,
        color: p.color,
        isAlive: p.isAlive,
        isProtected: p.isProtected,
        tokens: p.tokens,
        handSize: p.hand.length,
        discardPile: [...p.discardPile],
        hasPlayedSpy: p.hasPlayedSpy,
        userId: p.userId,
        avatarUrl: p.avatarUrl,
      };

      if (p.botDifficulty) {
        sp.botDifficulty = p.botDifficulty;
      }

      // Only show hand to the owning player
      if (p.id === forPlayerId) {
        sp.hand = [...p.hand];
      }

      return sp;
    });

    // Determine pending states
    const currentPlayer = gs.players[gs.currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === forPlayerId;
    const pendingCard = gs.pendingAction.playedCard;

    let pendingGuardGuess = false;
    let pendingChancellorPick = false;
    let pendingTargetSelection: string | null = null;
    let chancellorOptions: Card[] | undefined;

    if (isMyTurn && gs.phase === "playing") {
      if (gs.turnPhase === "guardGuessing") {
        pendingGuardGuess = true;
      }
      if (gs.turnPhase === "chancellorPick") {
        pendingChancellorPick = true;
        chancellorOptions = [...gs.chancellorDrawn];
      }
      if (gs.turnPhase === "selectingTarget" && pendingCard) {
        pendingTargetSelection = pendingCard.name;
      }
    }

    const phaseMap: Record<GamePhase, GameSnapshot["phase"]> = {
      lobby: "waiting",
      playing: "playing",
      roundEnd: "roundEnd",
      gameOver: "gameOver",
    };

    return {
      phase: phaseMap[gs.phase],
      players,
      currentPlayerIndex: gs.currentPlayerIndex,
      turnPhase: gs.turnPhase,
      roundNumber: gs.roundNumber,
      deckSize: gs.deck.length,
      setAsideCardKnown: gs.setAsideCard === null,
      faceUpCards: [...gs.faceUpCards],
      lastRoundResult: gs.lastRoundResult,
      gameWinnerId: gs.gameWinnerId,
      tokensToWin: gs.tokensToWin,
      roomCode: this.state.roomCode,
      hostId: this.state.hostId,
      pendingGuardGuess,
      pendingChancellorPick,
      pendingTargetSelection,
      chancellorOptions,
    };
  }

  private broadcastSnapshots(): void {
    for (const [connId, info] of this.state.connections) {
      const conn = this.getConnectionById(connId);
      if (conn) {
        const snapshot = this.createSnapshot(info.playerId);
        this.sendTo(conn, { type: "snapshot", snapshot });
      }
    }
  }

  // ─── Communication ─────────────────────────────────────────────────

  private getConnectionById(connId: string): Party.Connection | undefined {
    for (const conn of this.room.getConnections()) {
      if (conn.id === connId) return conn;
    }
    return undefined;
  }

  private sendTo(conn: Party.Connection, msg: ServerMessage): void {
    conn.send(JSON.stringify(msg));
  }

  private sendToPlayer(playerId: string, msg: ServerMessage): void {
    for (const [connId, info] of this.state.connections) {
      if (info.playerId === playerId) {
        const conn = this.getConnectionById(connId);
        if (conn) {
          this.sendTo(conn, msg);
        }
        return;
      }
    }
  }

  private broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const conn of this.room.getConnections()) {
      conn.send(data);
    }
  }

  // ─── Host Transfer ─────────────────────────────────────────────────

  private transferHost(): void {
    const humanPlayers = this.state.gameState.players.filter(
      (p) => p.type === "human"
    );
    // Find a connected human
    for (const p of humanPlayers) {
      for (const [, info] of this.state.connections) {
        if (info.playerId === p.id) {
          this.state.hostId = p.id;
          return;
        }
      }
    }
    // No connected humans - use first player
    if (this.state.gameState.players.length > 0) {
      this.state.hostId = this.state.gameState.players[0].id;
    }
  }

  // ─── Game Recording ────────────────────────────────────────────────

  private async recordGameEnd(): Promise<void> {
    const env = (this.room as unknown as { env: Record<string, string | undefined> }).env;
    const db = createD1Client(env);
    if (!db) return;

    const gs = this.state.gameState;

    // Sort players by tokens (descending)
    const sorted = [...gs.players].sort((a, b) => b.tokens - a.tokens);

    const players = sorted.map((p, i) => ({
      userId: p.userId ?? null,
      playerName: p.name,
      playerType: p.type === "bot" ? ("bot" as const) : ("human" as const),
      finalScore: p.tokens,
      roundsPlayed: gs.roundNumber,
      bustCount: 0, // Not applicable for Love Letter
      flip7Count: 0, // Not applicable for Love Letter
      highestHand: Math.max(...p.discardPile.map((c) => c.value), 0),
      placement: i + 1,
    }));

    const winner = sorted[0];

    try {
      await recordGameResult(
        db,
        "love-letter",
        this.state.roomCode,
        gs.tokensToWin,
        gs.roundNumber,
        winner?.userId ?? null,
        players
      );
    } catch (err) {
      console.error("[LoveLetter] Failed to record game:", err);
    }
  }
}
