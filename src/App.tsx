// ─── Love Letter - Root App Component ────────────────────────────────

import { useState, useCallback } from "react";
import type { GameState, Player, BotDifficulty } from "./types/game";
import { PLAYER_AVATARS, PLAYER_COLORS } from "./types/game";
import { OnlineApp } from "./OnlineApp";
import { UserMenu } from "./components/auth/UserMenu";
import { BackgroundScene } from "./components/ui/BackgroundScene";
import { THEME } from "./styles/loveLetterStyles";
import { generateRoomCode } from "./utils/roomCodes";
import { LoveLetterEngine } from "./engine/LoveLetterEngine";
import { getTokensToWin } from "./constants/loveLetter";
import { LobbyScreen } from "./components/screens/LobbyScreen";
import { GameScreen } from "./components/screens/GameScreen";
import { RoundEndScreen } from "./components/screens/RoundEndScreen";
import { GameOverScreen } from "./components/screens/GameOverScreen";

type Mode = "menu" | "local" | "online";

export default function App() {
  const [mode, setMode] = useState<Mode>("menu");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);

  const handleCreateRoom = useCallback(() => {
    const code = generateRoomCode();
    setRoomCode(code);
    setMode("online");
  }, []);

  const handleJoinRoom = useCallback(() => {
    const code = joinInput.trim().toUpperCase();
    if (code.length < 3) return;
    setRoomCode(code);
    setMode("online");
    setJoinInput("");
    setShowJoinInput(false);
  }, [joinInput]);

  const handleLeave = useCallback(() => {
    setMode("menu");
    setRoomCode(null);
  }, []);

  // ─── Online Mode ───────────────────────────────────────────────────

  if (mode === "online" && roomCode) {
    return (
      <>
        <UserMenu />
        <OnlineApp roomCode={roomCode} onLeave={handleLeave} />
      </>
    );
  }

  // ─── Local Mode ───────────────────────────────────────────────────

  if (mode === "local") {
    return <LocalGame onBackToMenu={() => setMode("menu")} />;
  }

  // ─── Main Menu ─────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: THEME.bgDeep }}
    >
      <BackgroundScene />
      <UserMenu />

      {/* Title */}
      <div className="text-center mb-10 relative z-10">
        <h1
          className="text-5xl sm:text-6xl font-bold tracking-tight mb-2"
          style={{
            fontFamily: "'Cinzel', serif",
            color: THEME.gold,
            textShadow: `0 0 40px ${THEME.goldGlow}, 0 0 80px ${THEME.goldGlow}`,
          }}
        >
          Love Letter
        </h1>
        <p
          className="text-lg"
          style={{
            color: THEME.textSecondary,
            fontFamily: "'Crimson Text', serif",
          }}
        >
          A game of risk, deduction, and luck
        </p>
      </div>

      {/* Menu Buttons */}
      <div className="w-full max-w-xs space-y-4 relative z-10">
        {/* Play Local */}
        <button
          onClick={() => setMode("local")}
          className="w-full py-4 rounded-xl font-bold text-lg transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            fontFamily: "'Cinzel', serif",
            background: `linear-gradient(135deg, ${THEME.goldDark}, ${THEME.gold})`,
            color: THEME.bgDeep,
            boxShadow: `0 4px 20px ${THEME.goldGlow}`,
          }}
        >
          Play Local
        </button>

        {/* Create Room */}
        <button
          onClick={handleCreateRoom}
          className="w-full py-4 rounded-xl font-bold text-lg transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            fontFamily: "'Cinzel', serif",
            background: THEME.bgMid,
            color: THEME.textPrimary,
            border: `1px solid ${THEME.goldSubtle}`,
          }}
        >
          Create Room
        </button>

        {/* Join Room */}
        {!showJoinInput ? (
          <button
            onClick={() => setShowJoinInput(true)}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              fontFamily: "'Cinzel', serif",
              background: THEME.bgMid,
              color: THEME.textPrimary,
              border: `1px solid ${THEME.goldSubtle}`,
            }}
          >
            Join Room
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoinRoom();
                if (e.key === "Escape") {
                  setShowJoinInput(false);
                  setJoinInput("");
                }
              }}
              placeholder="Enter room code"
              maxLength={6}
              autoFocus
              className="w-full px-4 py-3 rounded-lg text-center text-lg font-mono tracking-[0.15em] uppercase outline-none"
              style={{
                background: THEME.bgMid,
                color: THEME.gold,
                border: `1px solid ${THEME.goldDark}`,
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowJoinInput(false);
                  setJoinInput("");
                }}
                className="flex-1 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: "transparent",
                  color: THEME.textMuted,
                  border: `1px solid rgba(255,255,255,0.1)`,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleJoinRoom}
                disabled={joinInput.trim().length < 3}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(135deg, ${THEME.goldDark}, ${THEME.gold})`,
                  color: THEME.bgDeep,
                }}
              >
                Join
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p
        className="mt-12 text-xs relative z-10"
        style={{ color: THEME.textMuted }}
      >
        2-6 Players | Based on the 2019 Edition
      </p>
    </div>
  );
}

// ─── Local Game Wrapper ───────────────────────────────────────────────
// Manages local game state and routes between screens

interface LobbyPlayer {
  id: string;
  name: string;
  type: "human" | "bot";
  botDifficulty?: BotDifficulty;
  avatar: string;
  color: string;
}

function LocalGame({ onBackToMenu }: { onBackToMenu: () => void }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPhase, setLocalPhase] = useState<
    "lobby" | "playing" | "roundEnd" | "gameOver"
  >("lobby");
  const handleStartGame = useCallback(
    (lobbyPlayers: LobbyPlayer[]) => {
      // Convert lobby players to full Player objects
      const players: Player[] = lobbyPlayers.map((lp, i) => ({
        id: lp.id,
        name: lp.name,
        type: lp.type,
        botDifficulty: lp.botDifficulty,
        avatar: lp.avatar || PLAYER_AVATARS[i % PLAYER_AVATARS.length],
        color: lp.color || PLAYER_COLORS[i % PLAYER_COLORS.length],
        hand: [],
        discardPile: [],
        isAlive: true,
        isProtected: false,
        tokens: 0,
        hasPlayedSpy: false,
        knownCards: [],
      }));

      const tokensToWin = getTokensToWin(players.length);
      const initialState = LoveLetterEngine.createNewRound(
        players,
        players.length
      );

      setGameState({ ...initialState, tokensToWin });
      setLocalPhase("playing");
    },
    []
  );

  const handleUpdateGameState = useCallback((newState: GameState) => {
    // Check if round ended
    if (newState.phase === "roundEnd") {
      setGameState(newState);
      setLocalPhase("roundEnd");
      return;
    }
    // Check if game ended
    if (newState.phase === "gameOver" || newState.gameWinnerId) {
      setGameState({ ...newState, phase: "gameOver" });
      setLocalPhase("gameOver");
      return;
    }
    setGameState(newState);
  }, []);

  const handleNextRound = useCallback(() => {
    if (!gameState) return;
    // Preserve tokens and start new round
    const playersWithTokens = gameState.players.map((p) => ({
      ...p,
      hand: [],
      discardPile: [],
      isAlive: true,
      isProtected: false,
      hasPlayedSpy: false,
      knownCards: [],
    }));

    const newRound = LoveLetterEngine.createNewRound(
      playersWithTokens,
      playersWithTokens.length
    );
    setGameState({
      ...newRound,
      roundNumber: gameState.roundNumber + 1,
      tokensToWin: gameState.tokensToWin,
    });
    setLocalPhase("playing");
  }, [gameState]);

  const handlePlayAgain = useCallback(() => {
    if (!gameState) return;
    // Reset tokens and start fresh
    const resetPlayers = gameState.players.map((p) => ({
      ...p,
      tokens: 0,
      hand: [],
      discardPile: [],
      isAlive: true,
      isProtected: false,
      hasPlayedSpy: false,
      knownCards: [],
    }));

    const newGame = LoveLetterEngine.createNewRound(
      resetPlayers,
      resetPlayers.length
    );
    setGameState({
      ...newGame,
      tokensToWin: getTokensToWin(resetPlayers.length),
    });
    setLocalPhase("playing");
  }, [gameState]);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: THEME.bgDeep }}
    >
      <BackgroundScene />
      <UserMenu />

      {localPhase === "lobby" && (
        <LobbyScreen onStartGame={handleStartGame} onPlayOnline={onBackToMenu} />
      )}
      {localPhase === "playing" && gameState && (
        <GameScreen
          gameState={gameState}
          onUpdateGameState={handleUpdateGameState}
        />
      )}
      {localPhase === "roundEnd" && gameState && (
        <RoundEndScreen
          gameState={gameState}
          onNextRound={handleNextRound}
        />
      )}
      {localPhase === "gameOver" && gameState && (
        <GameOverScreen
          gameState={gameState}
          onPlayAgain={handlePlayAgain}
          onReturnToLobby={onBackToMenu}
        />
      )}
    </div>
  );
}
