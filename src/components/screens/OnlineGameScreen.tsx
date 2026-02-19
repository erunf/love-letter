import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '../../types/game';
import type { ClientMessage, GameSnapshot } from '../../types/protocol';
import { THEME, CARD_COLORS } from '../../styles/loveLetterStyles';
import { GUARD_GUESS_OPTIONS, getCardDef } from '../../constants/loveLetter';
import { CharacterCard } from '../cards/CharacterCard';
import { CardBack } from '../cards/CardBack';
import { OnlinePlayerArea } from '../board/PlayerArea';
import { OrnamentRow } from '../ui/Ornaments';
import { BackgroundScene } from '../ui/BackgroundScene';
import type { LogEntry } from '../ui/ActionLog';
import { ActionLog } from '../ui/ActionLog';

function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Sub-Modals ─────────────────────────────────────────────────────

function OnlineTargetSelectionModal({
  snapshot,
  yourPlayerId,
  cardName,
  send,
  onClose,
}: {
  snapshot: GameSnapshot;
  yourPlayerId: string;
  cardName: string;
  send: (msg: ClientMessage) => void;
  onClose: () => void;
}) {
  const isPrince = cardName === 'Prince';
  const validTargets = snapshot.players.filter((p) => {
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
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
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
        <p className="text-center text-sm mb-4" style={{ color: THEME.textSecondary }}>
          {cardName}
        </p>
        <OrnamentRow symbol="fleur" className="mb-4" />
        <div className="space-y-2">
          {validTargets.map((player) => (
            <button
              key={player.id}
              onClick={() => {
                if (isPrince) {
                  send({ type: 'princeTarget', targetId: player.id });
                } else {
                  send({ type: 'selectTarget', targetId: player.id });
                }
                onClose();
              }}
              className="w-full glass-subtle p-3 rounded-lg flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ borderColor: `${player.color}40` }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: `${player.color}30`, color: player.color }}
              >
                {player.name.charAt(0)}
              </div>
              <span className="text-sm font-semibold" style={{ color: THEME.textPrimary }}>
                {player.name} {player.id === yourPlayerId ? '(You)' : ''}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function OnlineGuardGuessModal({
  send,
  onClose,
}: {
  send: (msg: ClientMessage) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
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
        <p className="text-center text-sm mb-4" style={{ color: THEME.textSecondary }}>
          Guess your target&apos;s card (not Guard)
        </p>
        <OrnamentRow symbol="seal" className="mb-4" />
        <div className="grid grid-cols-3 gap-2">
          {GUARD_GUESS_OPTIONS.map((name) => {
            const def = getCardDef(name);
            const colors = CARD_COLORS[def.value];
            return (
              <button
                key={name}
                onClick={() => {
                  send({ type: 'guardGuess', guess: name });
                  onClose();
                }}
                className="glass-subtle p-2 rounded-lg text-center transition-all hover:scale-105 active:scale-95"
                style={{ borderColor: `${colors.border}60` }}
              >
                <div
                  className="text-lg font-bold"
                  style={{ fontFamily: "'Cinzel', serif", color: colors.accent }}
                >
                  {def.value}
                </div>
                <div className="text-xs" style={{ color: colors.accent, fontFamily: "'Cinzel', serif" }}>
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

function OnlineChancellorPickModal({
  options,
  send,
}: {
  options: Card[];
  send: (msg: ClientMessage) => void;
}) {
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
        <p className="text-center text-sm mb-4" style={{ color: THEME.textSecondary }}>
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
                onClick={() => send({ type: 'chancellorKeep', keepIndex: i })}
                highlighted
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function OnlinePriestPeekOverlay({
  card,
  onDismiss,
}: {
  card: Card;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
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
          Their card:
        </p>
        <div className="flex justify-center mb-4">
          <motion.div
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CharacterCard card={card} size="lg" />
          </motion.div>
        </div>
        <p className="text-xs" style={{ color: THEME.textMuted }}>
          Click or wait to dismiss
        </p>
      </motion.div>
    </motion.div>
  );
}

function OnlineBaronRevealOverlay({
  yourCard,
  theirCard,
  loserId,
  yourId,
  theirName,
  onDismiss,
}: {
  yourCard: Card;
  theirCard: Card;
  loserId: string | null;
  yourId: string;
  theirName: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const resultText =
    loserId === null
      ? 'Tie! No one eliminated.'
      : loserId === yourId
        ? `You lose! (${yourCard.value} vs ${theirCard.value})`
        : `${theirName} loses! (${theirCard.value} vs ${yourCard.value})`;

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
          className="text-lg font-bold mb-3"
          style={{ fontFamily: "'Cinzel', serif", color: THEME.goldLight }}
        >
          Baron&apos;s Comparison
        </h3>
        <div className="flex justify-center gap-6 items-end mb-4">
          <div className="text-center">
            <p className="text-xs mb-2" style={{ color: THEME.textSecondary }}>You</p>
            <CharacterCard card={yourCard} size="md" />
          </div>
          <div className="text-xl font-bold pb-10" style={{ fontFamily: "'Cinzel', serif", color: THEME.gold }}>
            vs
          </div>
          <div className="text-center">
            <p className="text-xs mb-2" style={{ color: THEME.textSecondary }}>{theirName}</p>
            <CharacterCard card={theirCard} size="md" />
          </div>
        </div>
        <p className="text-sm font-semibold" style={{ color: loserId ? THEME.crimsonLight : THEME.textSecondary }}>
          {resultText}
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Online Game Screen ────────────────────────────────────────

interface OnlineGameScreenProps {
  snapshot: GameSnapshot;
  yourPlayerId: string;
  send: (msg: ClientMessage) => void;
  lastCardPlayed?: {
    playerId: string;
    card: Card;
    targetName?: string;
  } | null;
  priestPeekCard?: Card | null;
  baronReveal?: {
    yourCard: Card;
    theirCard: Card;
    loserId: string | null;
  } | null;
  onDismissPriest?: () => void;
  onDismissBaron?: () => void;
}

export function OnlineGameScreen({
  snapshot,
  yourPlayerId,
  send,
  lastCardPlayed,
  priestPeekCard,
  baronReveal,
  onDismissPriest,
  onDismissBaron,
}: OnlineGameScreenProps) {
  const [actionLog, setActionLog] = useState<LogEntry[]>([]);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showGuardGuess, setShowGuardGuess] = useState(false);

  const currentPlayer = snapshot.players[snapshot.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === yourPlayerId;
  const myPlayer = snapshot.players.find((p) => p.id === yourPlayerId);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setActionLog((prev) => [...prev.slice(-50), { id: generateLogId(), message, timestamp: Date.now(), type }]);
  }, []);

  // Log last card played
  useEffect(() => {
    if (lastCardPlayed) {
      const player = snapshot.players.find((p) => p.id === lastCardPlayed.playerId);
      const name = player?.name ?? 'Someone';
      let msg = `${name} plays ${lastCardPlayed.card.name} (${lastCardPlayed.card.value})`;
      if (lastCardPlayed.targetName) {
        msg += ` targeting ${lastCardPlayed.targetName}`;
      }
      addLog(msg, 'play');
    }
  }, [lastCardPlayed, snapshot.players, addLog]);

  // Show modals based on snapshot state
  useEffect(() => {
    if (isMyTurn && snapshot.pendingTargetSelection) {
      setShowTargetModal(true);
    } else {
      setShowTargetModal(false);
    }
  }, [isMyTurn, snapshot.pendingTargetSelection]);

  useEffect(() => {
    if (isMyTurn && snapshot.pendingGuardGuess) {
      setShowGuardGuess(true);
    } else {
      setShowGuardGuess(false);
    }
  }, [isMyTurn, snapshot.pendingGuardGuess]);

  const handlePlayCard = useCallback((cardIndex: number) => {
    if (!isMyTurn || snapshot.turnPhase !== 'choosing') return;
    send({ type: 'playCard', cardIndex });
  }, [isMyTurn, snapshot.turnPhase, send]);

  // Find baron opponent name
  const baronTheirName = baronReveal
    ? snapshot.players.find((p) => p.id !== yourPlayerId && p.isAlive)?.name ?? 'Opponent'
    : '';

  return (
    <div className="bg-royal min-h-screen flex flex-col relative">
      <BackgroundScene />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-3">
        <div className="glass-subtle px-3 py-1 rounded-lg">
          <span className="text-xs" style={{ color: THEME.gold, fontFamily: "'Cinzel', serif" }}>
            Round {snapshot.roundNumber}
          </span>
        </div>
        <div className="glass-subtle px-3 py-1 rounded-lg">
          <span className="text-xs" style={{ color: isMyTurn ? THEME.goldLight : THEME.textSecondary }}>
            {isMyTurn ? 'Your Turn' : `${currentPlayer?.name ?? '...'}'s Turn`}
          </span>
        </div>
        <div className="glass-subtle px-3 py-1 rounded-lg flex items-center gap-1">
          <CardBack size="sm" className="!w-4 !h-6 !rounded" />
          <span className="text-xs" style={{ color: THEME.textSecondary }}>
            {snapshot.deckSize}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-3 p-3">
        {/* Action Log (desktop) */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <ActionLog entries={actionLog} maxHeight={400} />
        </div>

        {/* Center */}
        <div className="flex-1 flex flex-col items-center gap-3">
          {/* Opponents */}
          <div className="flex flex-wrap justify-center gap-2 w-full">
            {snapshot.players
              .filter((p) => p.id !== yourPlayerId)
              .map((player) => {
                const idx = snapshot.players.findIndex((p) => p.id === player.id);
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

          {/* Center: Deck + face-up */}
          <div className="flex items-center justify-center gap-6 py-2">
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <CardBack size="sm" count={snapshot.deckSize} />
                {snapshot.deckSize > 2 && (
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
              <span className="text-xs" style={{ color: THEME.textMuted, fontSize: 9 }}>Deck</span>
            </div>

            {snapshot.faceUpCards.length > 0 && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  {snapshot.faceUpCards.map((card, i) => (
                    <CharacterCard key={`fu-${i}`} card={card} size="sm" disabled />
                  ))}
                </div>
                <span className="text-xs" style={{ color: THEME.textMuted, fontSize: 9 }}>Removed</span>
              </div>
            )}
          </div>

          {/* Turn indicator */}
          {isMyTurn && snapshot.turnPhase === 'choosing' && (
            <motion.div
              className="glass-subtle px-4 py-2 rounded-lg text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-sm font-semibold" style={{ color: THEME.goldLight }}>
                Choose a card to play
              </p>
            </motion.div>
          )}

          {/* Your Hand */}
          {myPlayer && myPlayer.isAlive && myPlayer.hand && (
            <div className="mt-auto pt-4">
              <div
                className="text-xs uppercase tracking-wider text-center mb-2"
                style={{ color: THEME.gold, fontFamily: "'Cinzel', serif", fontSize: 9 }}
              >
                Your Hand
              </div>
              <div className="flex gap-3 justify-center">
                <AnimatePresence>
                  {myPlayer.hand.map((card, i) => {
                    const canPlay = isMyTurn && snapshot.turnPhase === 'choosing';
                    return (
                      <motion.div
                        key={`hand-${card.name}-${card.value}-${i}`}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        layout
                      >
                        <CharacterCard
                          card={card}
                          size="lg"
                          onClick={() => handlePlayCard(i)}
                          disabled={!canPlay}
                          highlighted={canPlay}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Eliminated */}
          {myPlayer && !myPlayer.isAlive && (
            <div className="mt-auto py-6 text-center">
              <p className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: THEME.eliminated }}>
                You have been eliminated
              </p>
              <p className="text-sm mt-1" style={{ color: THEME.textMuted }}>
                Waiting for the round to end...
              </p>
            </div>
          )}
        </div>

        {/* Action Log (mobile) */}
        <div className="lg:hidden">
          <ActionLog entries={actionLog} maxHeight={120} />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTargetModal && snapshot.pendingTargetSelection && (
          <OnlineTargetSelectionModal
            snapshot={snapshot}
            yourPlayerId={yourPlayerId}
            cardName={snapshot.pendingTargetSelection}
            send={send}
            onClose={() => setShowTargetModal(false)}
          />
        )}

        {showGuardGuess && (
          <OnlineGuardGuessModal
            send={send}
            onClose={() => setShowGuardGuess(false)}
          />
        )}

        {isMyTurn && snapshot.pendingChancellorPick && snapshot.chancellorOptions && (
          <OnlineChancellorPickModal
            options={snapshot.chancellorOptions}
            send={send}
          />
        )}

        {priestPeekCard && onDismissPriest && (
          <OnlinePriestPeekOverlay
            card={priestPeekCard}
            onDismiss={onDismissPriest}
          />
        )}

        {baronReveal && onDismissBaron && (
          <OnlineBaronRevealOverlay
            yourCard={baronReveal.yourCard}
            theirCard={baronReveal.theirCard}
            loserId={baronReveal.loserId}
            yourId={yourPlayerId}
            theirName={baronTheirName}
            onDismiss={onDismissBaron}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
