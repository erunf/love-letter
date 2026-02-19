// ─── Online App Shell ────────────────────────────────────────────────
// Wraps the online game with PartyKit connection, SendContext, and
// phase-based routing.

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card, CardName } from "./types/game";
import type { ClientMessage, GameSnapshot } from "./types/protocol";
import { usePartySocket } from "./hooks/usePartySocket";
import { useOnlineStore } from "./store/onlineStore";
import { useAuthStore } from "./store/authStore";
import { Toast } from "./components/ui/Toast";
import { ConnectionStatus } from "./components/ui/ConnectionStatus";
import { CharacterCard } from "./components/cards/CharacterCard";
import { CardBack } from "./components/cards/CardBack";
import { OnlinePlayerArea } from "./components/board/PlayerArea";
import { OrnamentRow } from "./components/ui/Ornaments";
import { BackgroundScene } from "./components/ui/BackgroundScene";
import { THEME, CARD_COLORS } from "./styles/loveLetterStyles";
import { getCardDef } from "./constants/loveLetter";

// ─── Send Context ────────────────────────────────────────────────────

const noop = () => {};
export const SendContext = createContext<(msg: ClientMessage) => void>(noop);
export const useSend = () => useContext(SendContext);

// ─── Props ───────────────────────────────────────────────────────────

interface OnlineAppProps {
  roomCode: string;
  onLeave: () => void;
}

// ─── Component ───────────────────────────────────────────────────────

export function OnlineApp({ roomCode, onLeave }: OnlineAppProps) {
  const { send, isConnected } = usePartySocket(roomCode);
  const snapshot = useOnlineStore((s) => s.snapshot);
  const toast = useOnlineStore((s) => s.toast);
  const yourPlayerId = useOnlineStore((s) => s.yourPlayerId);
  const error = useOnlineStore((s) => s.error);

  useEffect(() => {
    return () => {
      useOnlineStore.getState().reset();
    };
  }, []);

  const handleLeave = useCallback(() => {
    useOnlineStore.getState().reset();
    onLeave();
  }, [onLeave]);

  const phase = snapshot?.phase ?? null;

  return (
    <SendContext.Provider value={send}>
      <ConnectionStatus />
      <Toast message={toast ?? ""} show={!!toast} />

      <div
        className="min-h-screen relative overflow-hidden"
        style={{ background: THEME.bgDeep }}
      >
        <BackgroundScene />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
          {/* Loading / Connecting */}
          {!isConnected && !error && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p
                className="text-lg mb-3"
                style={{
                  color: THEME.textSecondary,
                  fontFamily: "'Crimson Text', serif",
                }}
              >
                Connecting to room {roomCode}...
              </p>
              <div
                className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
                style={{
                  borderColor: THEME.gold,
                  borderTopColor: "transparent",
                }}
              />
            </motion.div>
          )}

          {/* Error state */}
          {error && !snapshot && (
            <motion.div
              className="glass-modal text-center max-w-md p-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-red-400 text-lg mb-4">{error}</p>
              <button
                onClick={handleLeave}
                className="px-6 py-2 rounded-lg font-semibold transition-all hover:brightness-110"
                style={{
                  fontFamily: "'Cinzel', serif",
                  background: `linear-gradient(135deg, ${THEME.crimsonDark}, ${THEME.crimson})`,
                  color: THEME.parchment,
                }}
              >
                Back to Menu
              </button>
            </motion.div>
          )}

          {/* Not yet joined */}
          {isConnected && !yourPlayerId && !error && (
            <JoinForm roomCode={roomCode} send={send} />
          )}

          {/* Waiting for snapshot */}
          {isConnected && yourPlayerId && !snapshot && (
            <div className="text-center">
              <p
                className="text-lg"
                style={{
                  color: THEME.textSecondary,
                  fontFamily: "'Crimson Text', serif",
                }}
              >
                Waiting for game state...
              </p>
            </div>
          )}

          {/* Phase-based routing */}
          {snapshot && yourPlayerId && (
            <>
              {phase === "waiting" && (
                <OnlineWaitingRoom onLeave={handleLeave} />
              )}
              {phase === "playing" && <OnlineGameScreen />}
              {phase === "roundEnd" && <OnlineRoundEndScreen />}
              {phase === "gameOver" && (
                <OnlineGameOverScreen onLeave={handleLeave} />
              )}
            </>
          )}
        </div>
      </div>
    </SendContext.Provider>
  );
}

// ─── Join Form ───────────────────────────────────────────────────────

function JoinForm({
  roomCode,
  send,
}: {
  roomCode: string;
  send: (msg: ClientMessage) => void;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nameInput = form.elements.namedItem("playerName") as HTMLInputElement;
    const name = nameInput.value.trim();
    if (!name) return;

    try {
      sessionStorage.setItem(`loveletter_name_${roomCode}`, name);
    } catch {
      // Ignore
    }

    const token = useAuthStore.getState().idToken;
    send({
      type: "join",
      playerName: name,
      ...(token ? { idToken: token } : {}),
    });
  };

  return (
    <motion.div
      className="glass-modal w-full max-w-sm p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2
        className="text-2xl font-bold text-center mb-2"
        style={{
          fontFamily: "'Cinzel', serif",
          color: THEME.goldLight,
          textShadow: `0 0 20px ${THEME.goldGlow}`,
        }}
      >
        Join Room
      </h2>
      <p
        className="text-center text-lg font-mono tracking-[0.15em] mb-4"
        style={{ color: THEME.gold }}
      >
        {roomCode}
      </p>
      <OrnamentRow symbol="seal" className="mb-4" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="playerName"
          type="text"
          placeholder="Your name"
          maxLength={20}
          autoFocus
          required
          className="w-full px-4 py-3 rounded-lg text-lg outline-none transition-all"
          style={{
            background: `${THEME.bgDeep}80`,
            color: THEME.textPrimary,
            border: `1px solid ${THEME.gold}20`,
            fontFamily: "'Crimson Text', serif",
          }}
        />
        <button
          type="submit"
          className="w-full py-3 rounded-lg font-bold text-lg transition-all hover:brightness-110"
          style={{
            fontFamily: "'Cinzel', serif",
            background: `linear-gradient(135deg, ${THEME.goldDark}, ${THEME.gold})`,
            color: THEME.bgDeep,
            boxShadow: `0 4px 20px ${THEME.goldGlow}`,
          }}
        >
          Join Game
        </button>
      </form>
    </motion.div>
  );
}

// ─── Waiting Room ────────────────────────────────────────────────────

function OnlineWaitingRoom({ onLeave }: { onLeave: () => void }) {
  const send = useSend();
  const snapshot = useOnlineStore((s) => s.snapshot);
  const yourPlayerId = useOnlineStore((s) => s.yourPlayerId);

  if (!snapshot) return null;

  const players = snapshot.players ?? [];
  const isHost = snapshot.hostId === yourPlayerId;
  const canStart = players.length >= 2;

  return (
    <motion.div
      className="glass-modal w-full max-w-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Room Code */}
      <div className="text-center mb-4">
        <h2
          className="text-2xl font-bold mb-1"
          style={{
            fontFamily: "'Cinzel', serif",
            color: THEME.goldLight,
            textShadow: `0 0 20px ${THEME.goldGlow}`,
          }}
        >
          WAITING ROOM
        </h2>
        <OrnamentRow symbol="seal" className="mb-3" />
        <p
          className="text-xs uppercase tracking-wider mb-1"
          style={{ color: THEME.textMuted, fontFamily: "'Cinzel', serif" }}
        >
          Room Code
        </p>
        <p
          className="text-3xl font-mono font-bold tracking-[0.2em]"
          style={{ color: THEME.gold }}
        >
          {snapshot.roomCode}
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(snapshot.roomCode).catch(() => {});
          }}
          className="text-xs mt-1 underline opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: THEME.textSecondary }}
        >
          Copy code
        </button>
      </div>

      <OrnamentRow symbol="fleur" className="my-3" />

      {/* Players */}
      <div className="mb-4">
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: THEME.textSecondary, fontFamily: "'Cinzel', serif" }}
        >
          Players ({players.length}/6)
        </h3>
        <div className="space-y-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="glass-subtle flex items-center justify-between px-3 py-2 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: p.color }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: THEME.textPrimary }}
                >
                  {p.name}
                  {p.id === snapshot.hostId && (
                    <span className="text-xs ml-1" style={{ color: THEME.gold }}>
                      (Host)
                    </span>
                  )}
                  {p.id === yourPlayerId && (
                    <span
                      className="text-xs ml-1"
                      style={{ color: THEME.textSecondary }}
                    >
                      (You)
                    </span>
                  )}
                </span>
                {p.type === "bot" && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: THEME.goldSubtle,
                      color: THEME.gold,
                      fontFamily: "'Cinzel', serif",
                      fontSize: 9,
                    }}
                  >
                    {p.botDifficulty?.toUpperCase()} BOT
                  </span>
                )}
              </div>

              {isHost && p.id !== yourPlayerId && (
                <button
                  onClick={() =>
                    send({ type: "removePlayer", playerId: p.id })
                  }
                  className="text-xs px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
                  style={{ color: THEME.eliminated }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {isHost && players.length < 6 && (
          <div className="flex gap-2">
            {(["easy", "medium", "hard"] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => send({ type: "addBot", difficulty: diff })}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all hover:brightness-110"
                style={{
                  fontFamily: "'Cinzel', serif",
                  background: THEME.bgMid,
                  color: THEME.textPrimary,
                  border: `1px solid ${THEME.goldSubtle}`,
                }}
              >
                + {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </button>
            ))}
          </div>
        )}

        {isHost && (
          <button
            onClick={() => send({ type: "startGame" })}
            disabled={!canStart}
            className="w-full py-3 rounded-xl font-bold text-lg transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontFamily: "'Cinzel', serif",
              background: canStart
                ? `linear-gradient(135deg, ${THEME.goldDark}, ${THEME.gold})`
                : THEME.bgMid,
              color: canStart ? THEME.bgDeep : THEME.textMuted,
              boxShadow: canStart ? `0 4px 20px ${THEME.goldGlow}` : "none",
            }}
          >
            Start Game
          </button>
        )}

        {!isHost && (
          <p
            className="text-center text-sm py-2"
            style={{ color: THEME.textSecondary, fontFamily: "'Crimson Text', serif" }}
          >
            Waiting for host to start the game...
          </p>
        )}

        <button
          onClick={onLeave}
          className="w-full py-2 rounded-lg text-sm transition-all opacity-60 hover:opacity-100"
          style={{ color: THEME.textSecondary }}
        >
          Leave Room
        </button>
      </div>
    </motion.div>
  );
}

// ─── Card Play Announcement ─────────────────────────────────────────

function OnlineCardPlayAnnouncement({
  card,
  playerName,
  targetName,
}: {
  card: Card;
  playerName: string;
  targetName?: string;
}) {
  const colors = CARD_COLORS[card.value];
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-3"
        initial={{ scale: 0.3, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -20 }}
        transition={{ type: "spring", damping: 15, stiffness: 300 }}
      >
        <motion.div
          className="text-sm font-bold uppercase tracking-wider px-4 py-1 rounded-full"
          style={{
            fontFamily: "'Cinzel', serif",
            color: THEME.textPrimary,
            background: "rgba(0,0,0,0.5)",
            border: `1px solid ${colors.border}60`,
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {playerName} plays
        </motion.div>
        <motion.div
          initial={{ rotateY: 90 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{ perspective: 1000 }}
        >
          <CharacterCard card={card} size="lg" highlighted />
        </motion.div>
        {targetName && (
          <motion.div
            className="text-sm font-semibold text-center px-5 py-2 rounded-lg"
            style={{
              fontFamily: "'Crimson Text', serif",
              color: THEME.goldLight,
              background: "rgba(0,0,0,0.5)",
              border: `1px solid ${THEME.goldSubtle}`,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Target: {targetName}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Priest Peek Overlay ────────────────────────────────────────────

function OnlinePriestPeekOverlay({
  card,
  targetName,
  onDismiss,
}: {
  card: Card;
  targetName: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        className="glass-modal relative z-10 p-6 text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <h3
          className="text-lg font-bold mb-1"
          style={{ fontFamily: "'Cinzel', serif", color: THEME.goldLight }}
        >
          Priest&apos;s Vision
        </h3>
        <p className="text-sm mb-4" style={{ color: THEME.textSecondary }}>
          {targetName}&apos;s hand:
        </p>
        <div className="flex justify-center mb-4" style={{ perspective: 800 }}>
          <motion.div
            initial={{ rotateY: 180, scale: 0.8 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <CharacterCard card={card} size="lg" />
          </motion.div>
        </div>
        <p className="text-xs" style={{ color: THEME.textMuted }}>
          Tap anywhere or wait to dismiss
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Online Game Screen ─────────────────────────────────────────────

function OnlineGameScreen() {
  const send = useSend();
  const snapshot = useOnlineStore((s) => s.snapshot);
  const yourPlayerId = useOnlineStore((s) => s.yourPlayerId);
  const lastCardPlayed = useOnlineStore((s) => s.lastCardPlayed);
  const priestPeek = useOnlineStore((s) => s.priestPeek);
  const [showPriestPeek, setShowPriestPeek] = useState<{
    card: Card;
    targetName: string;
  } | null>(null);

  // When priestPeek arrives from store, queue it to show after the card play animation
  useEffect(() => {
    if (!priestPeek) return;
    // Delay showing peek until after card play announcement fades (2s)
    const delay = lastCardPlayed ? 2200 : 300;
    const timer = setTimeout(() => {
      setShowPriestPeek(priestPeek);
      useOnlineStore.getState().setPriestPeek(null);
    }, delay);
    return () => clearTimeout(timer);
  }, [priestPeek, lastCardPlayed]);

  if (!snapshot || !yourPlayerId) return null;

  const players = snapshot.players ?? [];
  const currentPlayer = players[snapshot.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === yourPlayerId;
  const me = players.find((p) => p.id === yourPlayerId);
  const faceUpCards = snapshot.faceUpCards ?? [];
  const myHand = me?.hand ?? [];
  const lastPlayedPlayerName = lastCardPlayed
    ? players.find((p) => p.id === lastCardPlayed.playerId)?.name ?? "Someone"
    : "";

  return (
    <div className="w-full min-h-screen flex flex-col relative">
      {/* Card Play Animation */}
      <AnimatePresence>
        {lastCardPlayed && (
          <OnlineCardPlayAnnouncement
            card={lastCardPlayed.card}
            playerName={lastPlayedPlayerName}
            targetName={lastCardPlayed.targetName}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="glass-subtle px-3 py-1 rounded-lg">
          <span
            className="text-xs"
            style={{ color: THEME.gold, fontFamily: "'Cinzel', serif" }}
          >
            Round {snapshot.roundNumber ?? 1}
          </span>
        </div>
        <div className="glass-subtle px-3 py-1 rounded-lg">
          <span className="text-xs" style={{ color: THEME.textSecondary }}>
            {isMyTurn ? (
              <span style={{ color: THEME.goldLight }}>Your Turn</span>
            ) : (
              <span>{currentPlayer?.name ?? "..."}&apos;s Turn</span>
            )}
          </span>
        </div>
        <div className="glass-subtle px-3 py-1 rounded-lg flex items-center gap-1">
          <CardBack size="sm" className="!w-4 !h-6 !rounded" />
          <span className="text-xs" style={{ color: THEME.textSecondary }}>
            {snapshot.deckSize ?? 0}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center gap-3 p-3">
        {/* Opponents */}
        <div className="flex flex-wrap justify-center gap-2 w-full">
          {players
            .filter((p) => p.id !== yourPlayerId)
            .map((player) => {
              const idx = players.findIndex((p) => p.id === player.id);
              return (
                <OnlinePlayerArea
                  key={player.id}
                  player={player}
                  isActive={idx === snapshot.currentPlayerIndex}
                  isYou={false}
                  compact
                />
              );
            })}
        </div>

        {/* Center: Deck + Face-up cards */}
        <div className="flex items-center justify-center gap-6 py-3">
          <div className="flex flex-col items-center gap-1">
            <div className="relative">
              <CardBack size="sm" count={snapshot.deckSize ?? 0} />
              {(snapshot.deckSize ?? 0) > 2 && (
                <div
                  className="absolute rounded-lg"
                  style={{
                    width: 60,
                    height: 90,
                    top: 2,
                    left: 2,
                    zIndex: -1,
                    background: `linear-gradient(135deg, ${THEME.crimsonDark}, ${THEME.waxSealDark})`,
                    border: `1px solid ${THEME.gold}10`,
                  }}
                />
              )}
            </div>
            <span
              className="text-xs"
              style={{ color: THEME.textMuted, fontSize: 9 }}
            >
              Deck
            </span>
          </div>

          {faceUpCards.length > 0 && (
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-1">
                {faceUpCards.map((card, i) => (
                  <CharacterCard
                    key={`fu-${i}`}
                    card={card}
                    size="sm"
                    disabled
                  />
                ))}
              </div>
              <span
                className="text-xs"
                style={{ color: THEME.textMuted, fontSize: 9 }}
              >
                Removed
              </span>
            </div>
          )}
        </div>

        {/* Turn Phase Indicator */}
        {isMyTurn && snapshot.turnPhase === "choosing" && (
          <motion.div
            className="glass-subtle px-4 py-2 rounded-lg text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: THEME.goldLight }}
            >
              Choose a card to play
            </p>
          </motion.div>
        )}

        {/* Your Hand */}
        {me && me.isAlive && myHand.length > 0 && (
          <div className="mt-auto pt-4">
            <div
              className="text-xs uppercase tracking-wider text-center mb-2"
              style={{
                color: THEME.gold,
                fontFamily: "'Cinzel', serif",
                fontSize: 9,
              }}
            >
              Your Hand
            </div>
            <div className="flex gap-3 justify-center">
              <AnimatePresence>
                {myHand.map((card, idx) => {
                  const isPlayable =
                    isMyTurn && snapshot.turnPhase === "choosing";
                  return (
                    <motion.div
                      key={`hand-${card.name}-${card.value}-${idx}`}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      layout
                    >
                      <CharacterCard
                        card={card}
                        size="lg"
                        onClick={() => {
                          if (isPlayable) {
                            send({ type: "playCard", cardIndex: idx });
                          }
                        }}
                        disabled={!isPlayable}
                        highlighted={isPlayable}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Eliminated message */}
        {me && !me.isAlive && (
          <div className="mt-auto py-6 text-center">
            <p
              className="text-lg font-bold"
              style={{
                fontFamily: "'Cinzel', serif",
                color: THEME.eliminated,
              }}
            >
              You have been eliminated
            </p>
            <p className="text-sm mt-1" style={{ color: THEME.textMuted }}>
              Waiting for the round to end...
            </p>
          </div>
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMyTurn && snapshot.pendingTargetSelection && (
          <OnlineTargetModal
            snapshot={snapshot}
            yourPlayerId={yourPlayerId}
            cardName={snapshot.pendingTargetSelection}
          />
        )}

        {isMyTurn && snapshot.pendingGuardGuess && <OnlineGuardGuessModal />}

        {isMyTurn &&
          snapshot.pendingChancellorPick &&
          snapshot.chancellorOptions && (
            <OnlineChancellorModal
              options={snapshot.chancellorOptions}
            />
          )}

        {showPriestPeek && (
          <OnlinePriestPeekOverlay
            card={showPriestPeek.card}
            targetName={showPriestPeek.targetName}
            onDismiss={() => setShowPriestPeek(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Target Selection Modal ─────────────────────────────────────────

function OnlineTargetModal({
  snapshot,
  yourPlayerId,
  cardName,
}: {
  snapshot: GameSnapshot;
  yourPlayerId: string;
  cardName: string;
}) {
  const send = useSend();
  const isPrince = cardName === "Prince";
  const validTargets = (snapshot.players ?? []).filter((p) => {
    if (!p.isAlive || p.isProtected) return false;
    if (!isPrince && p.id === yourPlayerId) return false;
    return true;
  });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <motion.div
        className="glass-modal relative z-10 p-6 w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <h3
          className="text-lg font-bold text-center mb-1"
          style={{ fontFamily: "'Cinzel', serif", color: THEME.goldLight }}
        >
          Choose a Target
        </h3>
        <p
          className="text-center text-sm mb-4"
          style={{ color: THEME.textSecondary }}
        >
          {cardName}
        </p>
        <OrnamentRow symbol="fleur" className="mb-4" />
        <div className="space-y-2">
          {validTargets.map((player) => (
            <button
              key={player.id}
              onClick={() => {
                if (isPrince) {
                  send({ type: "princeTarget", targetId: player.id });
                } else {
                  send({ type: "selectTarget", targetId: player.id });
                }
              }}
              className="w-full glass-subtle p-3 rounded-lg flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ borderColor: `${player.color}40` }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: `${player.color}30`,
                  color: player.color,
                }}
              >
                {player.name.charAt(0)}
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: THEME.textPrimary }}
              >
                {player.name}
                {player.id === yourPlayerId ? " (You)" : ""}
              </span>
              {player.isProtected && (
                <span
                  className="text-xs ml-auto"
                  style={{ color: THEME.protected }}
                >
                  Protected
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Guard Guess Modal ──────────────────────────────────────────────

const GUARD_OPTIONS: CardName[] = [
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

function OnlineGuardGuessModal() {
  const send = useSend();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <motion.div
        className="glass-modal relative z-10 p-6 w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <h3
          className="text-lg font-bold text-center mb-1"
          style={{ fontFamily: "'Cinzel', serif", color: THEME.goldLight }}
        >
          Name a Card
        </h3>
        <p
          className="text-center text-sm mb-4"
          style={{ color: THEME.textSecondary }}
        >
          Guess your target&apos;s card (not Guard)
        </p>
        <OrnamentRow symbol="seal" className="mb-4" />
        <div className="grid grid-cols-3 gap-2">
          {GUARD_OPTIONS.map((name) => {
            const def = getCardDef(name);
            const colors = CARD_COLORS[def.value];
            return (
              <button
                key={name}
                onClick={() => send({ type: "guardGuess", guess: name })}
                className="glass-subtle p-2 rounded-lg text-center transition-all hover:scale-105 active:scale-95"
                style={{ borderColor: `${colors.border}60` }}
              >
                <div
                  className="text-lg font-bold"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    color: colors.accent,
                  }}
                >
                  {def.value}
                </div>
                <div
                  className="text-xs"
                  style={{
                    color: colors.accent,
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  {name}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Chancellor Pick Modal ──────────────────────────────────────────

function OnlineChancellorModal({ options }: { options: Card[] }) {
  const send = useSend();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <motion.div
        className="glass-modal relative z-10 p-6 w-full max-w-lg"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <h3
          className="text-lg font-bold text-center mb-1"
          style={{ fontFamily: "'Cinzel', serif", color: THEME.goldLight }}
        >
          Chancellor&apos;s Choice
        </h3>
        <p
          className="text-center text-sm mb-4"
          style={{ color: THEME.textSecondary }}
        >
          Choose one card to keep. The others return to the deck.
        </p>
        <OrnamentRow symbol="crown" className="mb-4" />
        <div className="flex justify-center gap-3 flex-wrap">
          {options.map((card, i) => (
            <motion.div
              key={`${card.name}-${i}`}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.95 }}
            >
              <CharacterCard
                card={card}
                size="lg"
                onClick={() =>
                  send({ type: "chancellorKeep", keepIndex: i })
                }
                highlighted
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Round End Screen ───────────────────────────────────────────────

function OnlineRoundEndScreen() {
  const send = useSend();
  const snapshot = useOnlineStore((s) => s.snapshot);
  const yourPlayerId = useOnlineStore((s) => s.yourPlayerId);

  if (!snapshot) return null;

  const players = snapshot.players ?? [];
  const isHost = snapshot.hostId === yourPlayerId;
  const result = snapshot.lastRoundResult;

  return (
    <motion.div
      className="glass-modal w-full max-w-lg p-6 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <h2
        className="text-3xl font-bold mb-2"
        style={{
          fontFamily: "'Cinzel', serif",
          color: THEME.goldLight,
          textShadow: `0 0 20px ${THEME.goldGlow}`,
        }}
      >
        Round {snapshot.roundNumber} Complete
      </h2>
      <OrnamentRow symbol="crown" className="my-3" />

      {result && (
        <div className="mb-6">
          <p
            className="text-xl mb-1"
            style={{
              fontFamily: "'Crimson Text', serif",
              color: THEME.textPrimary,
            }}
          >
            {result.winnerName} wins the round!
          </p>
          <p className="text-sm" style={{ color: THEME.textSecondary }}>
            {result.reason === "lastStanding"
              ? "Last player standing"
              : result.reason === "highestCard"
              ? "Highest card when deck ran out"
              : "Tied for highest card"}
          </p>

          {/* Revealed hands with actual card components */}
          {(result.revealedHands?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p
                className="text-xs mb-2"
                style={{
                  color: THEME.textMuted,
                  fontFamily: "'Cinzel', serif",
                }}
              >
                Revealed Hands
              </p>
              <div className="flex justify-center gap-4 flex-wrap">
                {(result.revealedHands ?? []).map((h) => (
                  <div key={h.playerId} className="text-center">
                    <CharacterCard card={h.card} size="sm" />
                    <p
                      className="text-xs mt-1"
                      style={{ color: THEME.textSecondary }}
                    >
                      {h.playerName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.spyBonusPlayerId && (
            <p className="mt-3 text-sm" style={{ color: THEME.gold }}>
              Spy bonus token awarded to{" "}
              {players.find((p) => p.id === result.spyBonusPlayerId)?.name ??
                "a player"}
              !
            </p>
          )}
        </div>
      )}

      <OrnamentRow symbol="fleur" className="my-3" />

      {/* Token standings */}
      <div className="mb-6">
        <h3
          className="text-sm font-semibold mb-3"
          style={{
            color: THEME.textSecondary,
            fontFamily: "'Cinzel', serif",
          }}
        >
          Standings (need {snapshot.tokensToWin ?? 4} tokens)
        </h3>
        <div className="space-y-2">
          {[...players]
            .sort((a, b) => (b.tokens ?? 0) - (a.tokens ?? 0))
            .map((p) => (
              <div
                key={p.id}
                className="glass-subtle flex justify-between items-center px-4 py-2 rounded-lg"
              >
                <span
                  className="text-sm"
                  style={{ color: THEME.textPrimary }}
                >
                  {p.name}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: p.tokens ?? 0 }).map((_, i) => (
                    <div key={i} className="wax-seal-token" />
                  ))}
                  <span
                    className="text-xs font-bold ml-1"
                    style={{ color: THEME.gold }}
                  >
                    {p.tokens ?? 0} / {snapshot.tokensToWin ?? 4}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {isHost ? (
        <button
          onClick={() => send({ type: "startNewRound" })}
          className="px-8 py-3 rounded-xl font-bold text-lg transition-all hover:brightness-110"
          style={{
            fontFamily: "'Cinzel', serif",
            background: `linear-gradient(135deg, ${THEME.goldDark}, ${THEME.gold})`,
            color: THEME.bgDeep,
            boxShadow: `0 4px 20px ${THEME.goldGlow}`,
          }}
        >
          Next Round
        </button>
      ) : (
        <p
          className="text-sm py-2"
          style={{
            color: THEME.textSecondary,
            fontFamily: "'Crimson Text', serif",
          }}
        >
          Waiting for host to start next round...
        </p>
      )}
    </motion.div>
  );
}

// ─── Game Over Screen ───────────────────────────────────────────────

function OnlineGameOverScreen({ onLeave }: { onLeave: () => void }) {
  const send = useSend();
  const snapshot = useOnlineStore((s) => s.snapshot);
  const yourPlayerId = useOnlineStore((s) => s.yourPlayerId);

  if (!snapshot) return null;

  const players = snapshot.players ?? [];
  const isHost = snapshot.hostId === yourPlayerId;
  const winner = players.find((p) => p.id === snapshot.gameWinnerId);

  return (
    <motion.div
      className="glass-modal w-full max-w-lg p-6 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <h2
        className="text-4xl font-bold mb-2"
        style={{
          fontFamily: "'Cinzel', serif",
          color: THEME.goldLight,
          textShadow: `0 0 30px ${THEME.goldGlow}, 0 0 60px ${THEME.goldGlow}`,
        }}
      >
        Victory!
      </h2>
      <OrnamentRow symbol="crown" className="my-3" />

      {winner && (
        <p
          className="text-2xl mb-6"
          style={{
            fontFamily: "'Crimson Text', serif",
            color: THEME.textPrimary,
          }}
        >
          {winner.name} wins with {winner.tokens} tokens!
        </p>
      )}

      {/* Final standings */}
      <div className="mb-6">
        <h3
          className="text-sm font-semibold mb-3"
          style={{
            color: THEME.textSecondary,
            fontFamily: "'Cinzel', serif",
          }}
        >
          Final Standings
        </h3>
        <div className="space-y-2">
          {[...players]
            .sort((a, b) => (b.tokens ?? 0) - (a.tokens ?? 0))
            .map((p, i) => (
              <div
                key={p.id}
                className="glass-subtle flex justify-between items-center px-4 py-2 rounded-lg"
                style={{
                  borderColor:
                    i === 0 ? `${THEME.gold}40` : undefined,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: i === 0 ? THEME.gold : THEME.textMuted,
                      fontFamily: "'Cinzel', serif",
                    }}
                  >
                    #{i + 1}
                  </span>
                  <span style={{ color: THEME.textPrimary }}>
                    {p.name}
                    {p.id === yourPlayerId ? " (You)" : ""}
                  </span>
                </div>
                <span
                  className="font-bold"
                  style={{ color: THEME.gold }}
                >
                  {p.tokens ?? 0} tokens
                </span>
              </div>
            ))}
        </div>
      </div>

      <OrnamentRow symbol="fleur" className="my-3" />

      {/* Actions */}
      <div className="space-y-3">
        {isHost && (
          <>
            <button
              onClick={() => send({ type: "resetGame" })}
              className="w-full py-3 rounded-xl font-bold text-lg transition-all hover:brightness-110"
              style={{
                fontFamily: "'Cinzel', serif",
                background: `linear-gradient(135deg, ${THEME.goldDark}, ${THEME.gold})`,
                color: THEME.bgDeep,
                boxShadow: `0 4px 20px ${THEME.goldGlow}`,
              }}
            >
              Play Again
            </button>
            <button
              onClick={() => send({ type: "returnToLobby" })}
              className="w-full py-2 rounded-lg text-sm transition-all hover:brightness-110"
              style={{
                fontFamily: "'Cinzel', serif",
                background: THEME.bgMid,
                color: THEME.textPrimary,
                border: `1px solid ${THEME.goldSubtle}`,
              }}
            >
              Return to Lobby
            </button>
          </>
        )}
        <button
          onClick={onLeave}
          className="w-full py-2 rounded-lg text-sm transition-all opacity-60 hover:opacity-100"
          style={{ color: THEME.textSecondary }}
        >
          Leave Room
        </button>
      </div>
    </motion.div>
  );
}
