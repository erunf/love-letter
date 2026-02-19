import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, CardName, Player, GameState } from '../../types/game';
import { THEME, CARD_COLORS } from '../../styles/loveLetterStyles';
import { GUARD_GUESS_OPTIONS, getCardDef, cardNeedsTarget, mustPlayCountess } from '../../constants/loveLetter';
import { LoveLetterEngine } from '../../engine/LoveLetterEngine';
import { CharacterCard } from '../cards/CharacterCard';
import { CardBack } from '../cards/CardBack';
import { PlayerArea } from '../board/PlayerArea';
import { OrnamentRow } from '../ui/Ornaments';
import { BackgroundScene } from '../ui/BackgroundScene';

import type { LogEntry } from '../ui/ActionLog';
import { ActionLog } from '../ui/ActionLog';

// ─── Helpers ────────────────────────────────────────────────────────

function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Turn Animation Step ────────────────────────────────────────────

type TurnStep = 'idle' | 'turnBanner' | 'drawAnim';

// ─── Turn Banner Overlay ────────────────────────────────────────────

function TurnBanner({
  player,
  onDone,
}: {
  player: Player;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1300);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-2"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ background: `${player.color}30`, color: player.color, border: `2px solid ${player.color}60` }}
        >
          {player.name.charAt(0)}
        </div>
        <div
          className="text-2xl font-bold"
          style={{
            fontFamily: "'Cinzel', serif",
            color: player.color,
            textShadow: `0 0 20px ${player.color}60`,
          }}
        >
          {player.name}&apos;s Turn
        </div>
        <OrnamentRow symbol="fleur" className="mt-1" />
      </motion.div>
    </motion.div>
  );
}

// ─── Draw Card Animation ────────────────────────────────────────────

function DrawCardAnimation({
  player,
  onDone,
}: {
  player: Player;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1200);
    return () => clearTimeout(timer);
  }, [onDone]);

  const moveY = player.type === 'bot' ? -50 : 50;

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      <motion.div className="relative z-10 flex flex-col items-center gap-2">
        <motion.div
          className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
          style={{
            fontFamily: "'Cinzel', serif",
            color: player.color,
            background: 'rgba(0,0,0,0.5)',
            border: `1px solid ${player.color}40`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {player.name}
        </motion.div>
        <motion.div
          initial={{ y: -20, opacity: 0, scale: 0.6 }}
          animate={{
            y: [null, 0, moveY],
            opacity: [null, 1, 0],
            scale: [null, 1, 0.7],
          }}
          transition={{
            duration: 1.0,
            times: [0, 0.35, 1],
            ease: 'easeInOut',
          }}
        >
          <CardBack size="md" />
        </motion.div>
        <motion.div
          className="text-xs"
          style={{ color: THEME.textSecondary, fontFamily: "'Crimson Text', serif" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          draws a card
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── Prince Discard Overlay ─────────────────────────────────────────

function PrinceDiscardOverlay({
  card,
  targetName,
  onDismiss,
}: {
  card: Card;
  targetName: string;
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
          Prince&apos;s Decree
        </h3>
        <p className="text-sm mb-4" style={{ color: THEME.textSecondary }}>
          {targetName} must discard:
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
        {card.name === 'Princess' ? (
          <p className="text-sm font-semibold" style={{ color: THEME.crimsonLight }}>
            Princess discarded — {targetName} is eliminated!
          </p>
        ) : (
          <p className="text-xs" style={{ color: THEME.textMuted }}>
            {targetName} draws a new card
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Card Play Announcement ─────────────────────────────────────────

function CardPlayAnnouncement({
  card,
  playerName,
  effectText,
  duration = 2500,
  onDone,
}: {
  card: Card;
  playerName: string;
  effectText?: string;
  duration?: number;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [onDone, duration]);

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
        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
      >
        {/* Player name */}
        <motion.div
          className="text-sm font-bold uppercase tracking-wider px-4 py-1 rounded-full"
          style={{
            fontFamily: "'Cinzel', serif",
            color: THEME.textPrimary,
            background: 'rgba(0,0,0,0.5)',
            border: `1px solid ${colors.border}60`,
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {playerName} plays
        </motion.div>

        {/* Card with flip animation */}
        <motion.div
          initial={{ rotateY: 90 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{ perspective: 1000 }}
        >
          <CharacterCard card={card} size="lg" highlighted />
        </motion.div>

        {/* Effect text */}
        {effectText && (
          <motion.div
            className="text-sm font-semibold text-center px-5 py-2 rounded-lg max-w-xs"
            style={{
              fontFamily: "'Crimson Text', serif",
              color: THEME.goldLight,
              background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${THEME.goldSubtle}`,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {effectText}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-Modals ─────────────────────────────────────────────────────

// Target Selection Modal
function TargetSelectionModal({
  players,
  validTargetIds,
  cardName,
  onSelect,
  onCancel,
}: {
  players: Player[];
  validTargetIds: string[];
  cardName: string;
  onSelect: (targetId: string) => void;
  onCancel: () => void;
}) {
  const validPlayers = players.filter((p) => validTargetIds.includes(p.id));

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
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
          {validPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => onSelect(player.id)}
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
                {player.name}
              </span>
              {player.isProtected && (
                <span className="text-xs ml-auto" style={{ color: THEME.protected }}>
                  Protected
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-4 w-full text-sm py-2 rounded-lg transition-all opacity-60 hover:opacity-100"
          style={{ color: THEME.textSecondary }}
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

// Guard Guess Modal
function GuardGuessModal({
  onGuess,
  onCancel,
}: {
  onGuess: (guess: CardName) => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
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
                onClick={() => onGuess(name)}
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
        <button
          onClick={onCancel}
          className="mt-4 w-full text-sm py-2 rounded-lg transition-all opacity-60 hover:opacity-100"
          style={{ color: THEME.textSecondary }}
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

// Chancellor Pick Modal
function ChancellorPickModal({
  cards,
  onPick,
}: {
  cards: Card[];
  onPick: (index: number) => void;
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
          {cards.map((card, i) => (
            <motion.div
              key={`${card.name}-${i}`}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.95 }}
            >
              <CharacterCard
                card={card}
                size="lg"
                onClick={() => onPick(i)}
                highlighted
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Priest Peek Overlay
function PriestPeekOverlay({
  card,
  targetName,
  onDismiss,
}: {
  card: Card;
  targetName: string;
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
          {targetName}&apos;s hand:
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
          Click anywhere or wait to dismiss
        </p>
      </motion.div>
    </motion.div>
  );
}

// Baron Reveal Overlay
function BaronRevealOverlay({
  yourCard,
  theirCard,
  yourName,
  theirName,
  loserId,
  yourId,
  onDismiss,
}: {
  yourCard: Card;
  theirCard: Card;
  yourName: string;
  theirName: string;
  loserId: string | null;
  yourId: string;
  onDismiss: () => void;
}) {
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const resultTimer = setTimeout(() => setShowResult(true), 1200);
    const dismissTimer = setTimeout(onDismiss, 4500);
    return () => {
      clearTimeout(resultTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  const resultText =
    loserId === null
      ? 'Tie! No one is eliminated.'
      : loserId === yourId
        ? `${yourName} loses! (${yourCard.value} vs ${theirCard.value})`
        : `${theirName} loses! (${theirCard.value} vs ${yourCard.value})`;

  // Ornate X SVG for the loser
  const EliminationX = () => (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 12, stiffness: 200 }}
    >
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="rgba(0,0,0,0.5)" stroke={THEME.crimsonLight} strokeWidth="2.5" opacity="0.7" />
        <circle cx="32" cy="32" r="25" fill="none" stroke={THEME.crimsonLight} strokeWidth="0.5" opacity="0.4" />
        <line x1="20" y1="20" x2="44" y2="44" stroke={THEME.crimsonLight} strokeWidth="5" strokeLinecap="round" />
        <line x1="44" y1="20" x2="20" y2="44" stroke={THEME.crimsonLight} strokeWidth="5" strokeLinecap="round" />
      </svg>
    </motion.div>
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={showResult ? onDismiss : undefined}
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
          Baron&apos;s Comparison
        </h3>
        <OrnamentRow symbol="seal" className="my-3" />
        <div className="flex justify-center gap-6 items-end mb-4">
          <div className="text-center">
            <p className="text-xs mb-2" style={{ color: THEME.textSecondary }}>{yourName}</p>
            <div className="relative">
              <CharacterCard card={yourCard} size="md" />
              {showResult && loserId === yourId && <EliminationX />}
            </div>
          </div>
          <div
            className="text-xl font-bold pb-10"
            style={{ fontFamily: "'Cinzel', serif", color: THEME.gold }}
          >
            vs
          </div>
          <div className="text-center">
            <p className="text-xs mb-2" style={{ color: THEME.textSecondary }}>{theirName}</p>
            <div className="relative">
              <CharacterCard card={theirCard} size="md" />
              {showResult && loserId !== null && loserId !== yourId && <EliminationX />}
            </div>
          </div>
        </div>
        {showResult && (
          <motion.p
            className="text-sm font-semibold"
            style={{ color: loserId ? THEME.crimsonLight : THEME.textSecondary }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {resultText}
          </motion.p>
        )}
        {showResult && (
          <p className="text-xs mt-2" style={{ color: THEME.textMuted }}>
            Click anywhere to dismiss
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Guard Reveal Overlay ───────────────────────────────────────────

function GuardRevealOverlay({
  guesserName,
  targetName,
  guess,
  correct,
  onDismiss,
}: {
  guesserName: string;
  targetName: string;
  guess: CardName;
  correct: boolean;
  onDismiss: () => void;
}) {
  const [showResult, setShowResult] = useState(false);
  const def = getCardDef(guess);
  const colors = CARD_COLORS[def.value];

  useEffect(() => {
    const resultTimer = setTimeout(() => setShowResult(true), 1500);
    const dismissTimer = setTimeout(onDismiss, 4000);
    return () => {
      clearTimeout(resultTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={showResult ? onDismiss : undefined}
    >
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        className="glass-modal relative z-10 p-6 text-center max-w-sm"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <h3
          className="text-lg font-bold mb-1"
          style={{ fontFamily: "'Cinzel', serif", color: THEME.goldLight }}
        >
          Guard&apos;s Interrogation
        </h3>
        <OrnamentRow symbol="seal" className="my-3" />

        {/* Question */}
        <p className="text-sm mb-1" style={{ color: THEME.textSecondary }}>
          {guesserName} asks {targetName}:
        </p>
        <p
          className="text-xl font-bold mb-4"
          style={{ fontFamily: "'Cinzel', serif", color: colors.accent }}
        >
          &ldquo;Do you have a {guess}?&rdquo;
        </p>

        {/* Result */}
        {showResult && (
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          >
            {/* Ornate check or X */}
            <motion.svg width="64" height="64" viewBox="0 0 64 64" className="mb-1">
              {correct ? (
                <>
                  <circle cx="32" cy="32" r="28" fill={`${THEME.gold}15`} stroke={THEME.gold} strokeWidth="2.5" opacity="0.6" />
                  <circle cx="32" cy="32" r="25" fill="none" stroke={THEME.gold} strokeWidth="0.5" opacity="0.3" />
                  <path
                    d="M18 32 L27 41 L46 22"
                    fill="none"
                    stroke={THEME.gold}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : (
                <>
                  <circle cx="32" cy="32" r="28" fill={`${THEME.crimsonLight}15`} stroke={THEME.crimsonLight} strokeWidth="2.5" opacity="0.6" />
                  <circle cx="32" cy="32" r="25" fill="none" stroke={THEME.crimsonLight} strokeWidth="0.5" opacity="0.3" />
                  <line x1="22" y1="22" x2="42" y2="42" stroke={THEME.crimsonLight} strokeWidth="4.5" strokeLinecap="round" />
                  <line x1="42" y1="22" x2="22" y2="42" stroke={THEME.crimsonLight} strokeWidth="4.5" strokeLinecap="round" />
                </>
              )}
            </motion.svg>

            <p
              className="text-sm font-bold"
              style={{
                fontFamily: "'Cinzel', serif",
                color: correct ? THEME.gold : THEME.crimsonLight,
              }}
            >
              {correct ? `Correct! ${targetName} is eliminated!` : 'Wrong guess.'}
            </p>
          </motion.div>
        )}

        {showResult && (
          <p className="text-xs mt-3" style={{ color: THEME.textMuted }}>
            Click anywhere to dismiss
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Handoff Screen (hot-seat turn transition) ─────────────────────

function HandoffScreen({
  player,
  onReady,
}: {
  player: Player;
  onReady: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: THEME.bgDeep }} />
      <BackgroundScene />
      <motion.div
        className="glass-modal relative z-10 p-8 text-center max-w-sm w-full"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <OrnamentRow symbol="seal" className="mb-4" />
        <p
          className="text-sm uppercase tracking-wider mb-2"
          style={{ color: THEME.textSecondary, fontFamily: "'Cinzel', serif" }}
        >
          Pass the device to
        </p>
        <h2
          className="text-3xl font-bold mb-3"
          style={{
            fontFamily: "'Cinzel', serif",
            color: player.color,
            textShadow: `0 0 20px ${player.color}60`,
          }}
        >
          {player.name}
        </h2>
        <OrnamentRow symbol="fleur" className="mb-6" />
        <p
          className="text-sm mb-6"
          style={{ color: THEME.textMuted, fontFamily: "'Crimson Text', serif" }}
        >
          Don&apos;t peek at the screen!
        </p>
        <button
          onClick={onReady}
          className="px-8 py-3 rounded-xl font-bold text-lg transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            fontFamily: "'Cinzel', serif",
            background: `linear-gradient(135deg, ${THEME.goldDark}, ${THEME.gold})`,
            color: THEME.bgDeep,
            boxShadow: `0 4px 20px ${THEME.goldGlow}`,
          }}
        >
          I&apos;m Ready
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main GameScreen ────────────────────────────────────────────────

interface GameScreenProps {
  gameState: GameState;
  onUpdateGameState: (state: GameState) => void;
  onRoundEnd?: () => void;
}

export function GameScreen({
  gameState,
  onUpdateGameState,
  onRoundEnd,
}: GameScreenProps) {
  const [actionLog, setActionLog] = useState<LogEntry[]>([]);
  const [cardAnnouncement, setCardAnnouncement] = useState<{
    card: Card;
    playerName: string;
    effectText?: string;
    duration?: number;
  } | null>(null);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showGuardGuess, setShowGuardGuess] = useState(false);
  const [showChancellorPick, setShowChancellorPick] = useState(false);
  const [priestPeek, setPriestPeek] = useState<{ card: Card; targetName: string } | null>(null);
  const [baronReveal, setBaronReveal] = useState<{
    yourCard: Card;
    theirCard: Card;
    yourName: string;
    theirName: string;
    loserId: string | null;
    yourId: string;
  } | null>(null);
  const [princeDiscard, setPrinceDiscard] = useState<{ card: Card; targetName: string } | null>(null);
  const [guardReveal, setGuardReveal] = useState<{
    guesserName: string;
    targetName: string;
    guess: CardName;
    correct: boolean;
  } | null>(null);
  const [handoffPlayer, setHandoffPlayer] = useState<Player | null>(null);
  const [turnStep, setTurnStep] = useState<TurnStep>('idle');
  const lastHandoffForRef = useRef<string | null>(null);

  const pendingResolveRef = useRef(false);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Multi-human hot-seat logic
  const humanPlayers = gameState.players.filter(p => p.type === 'human');
  const isMultiHuman = humanPlayers.length > 1;
  const singleHumanPlayer = !isMultiHuman ? humanPlayers[0] ?? null : null;
  // Which player's hand to show at the bottom
  const handPlayer = singleHumanPlayer
    ?? (currentPlayer?.type === 'human' && !handoffPlayer ? currentPlayer : null);
  const isMyTurn = !!handPlayer && currentPlayer?.id === handPlayer.id && !handoffPlayer;

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setActionLog((prev) => [...prev.slice(-50), { id: generateLogId(), message, timestamp: Date.now(), type }]);
  }, []);

  // Handoff detection for multi-human hot-seat
  useEffect(() => {
    if (!isMultiHuman) return;
    if (currentPlayer?.type !== 'human') return;
    if (lastHandoffForRef.current !== currentPlayer.id) {
      setHandoffPlayer(currentPlayer);
    }
  }, [currentPlayer?.id, isMultiHuman, currentPlayer?.type]);

  const handleHandoffConfirm = useCallback(() => {
    if (handoffPlayer) {
      lastHandoffForRef.current = handoffPlayer.id;
    }
    setHandoffPlayer(null);
  }, [handoffPlayer]);

  // Reset turn step on new round
  useEffect(() => {
    setTurnStep('idle');
  }, [gameState.roundNumber]);

  // ─── Turn Animation Callbacks ────────────────────────────────────

  const handleTurnBannerDone = useCallback(() => {
    setTurnStep('drawAnim');
  }, []);

  // Ref-based callback so DrawCardAnimation always uses latest gameState
  const drawDoneRef = useRef<() => void>(() => {});
  drawDoneRef.current = () => {
    const gs = gameStateRef.current;
    const cp = gs.players[gs.currentPlayerIndex];
    setTurnStep('idle');
    const newState = LoveLetterEngine.drawCard(gs);
    addLog(`${cp.name} draws a card.`, 'info');
    onUpdateGameState(newState);
  };

  const handleDrawDone = useCallback(() => {
    drawDoneRef.current();
  }, []);

  // ─── Turn Orchestrator (replaces old auto-draw) ──────────────────

  useEffect(() => {
    if (gameState.turnPhase !== 'drawing' || gameState.phase !== 'playing') return;
    if (turnStep !== 'idle') return;
    if (handoffPlayer) return; // Wait for handoff to complete

    // Clear any leftover overlays from previous turn
    setCardAnnouncement(null);
    setPriestPeek(null);
    setBaronReveal(null);
    setPrinceDiscard(null);
    setGuardReveal(null);

    // Show turn banner for bot turns, skip straight to draw for humans
    if (currentPlayer?.type === 'bot') {
      setTurnStep('turnBanner');
    } else {
      setTurnStep('drawAnim');
    }
  }, [gameState.turnPhase, gameState.phase, turnStep, handoffPlayer, currentPlayer?.type]);

  // Auto-play for bots (gated on animation completion)
  useEffect(() => {
    if (gameState.turnPhase !== 'choosing' || currentPlayer?.type !== 'bot' || gameState.phase !== 'playing') return;
    if (turnStep !== 'idle' || cardAnnouncement) return; // Wait for animations

    const timer = setTimeout(() => {
      const playableIndices = LoveLetterEngine.getPlayableCards(gameState, gameState.currentPlayerIndex);
      const cardIndex = playableIndices[Math.floor(Math.random() * playableIndices.length)];
      handlePlayCard(cardIndex);
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.turnPhase, gameState.currentPlayerIndex, turnStep, cardAnnouncement]);

  // Bot target selection (gated on announcement)
  useEffect(() => {
    if (gameState.turnPhase !== 'selectingTarget' || currentPlayer?.type !== 'bot') return;
    if (cardAnnouncement) return; // Wait for card play announcement

    const timer = setTimeout(() => {
      const card = gameState.pendingAction.playedCard;
      if (!card) return;
      const validTargets = LoveLetterEngine.getValidTargets(gameState, card.name, currentPlayer.id);
      if (validTargets.length > 0) {
        const targetId = validTargets[Math.floor(Math.random() * validTargets.length)];
        handleSelectTarget(targetId);
      }
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.turnPhase, gameState.currentPlayerIndex, cardAnnouncement]);

  // Bot guard guessing (gated on announcement)
  useEffect(() => {
    if (gameState.turnPhase !== 'guardGuessing' || currentPlayer?.type !== 'bot') return;
    if (cardAnnouncement) return;

    const timer = setTimeout(() => {
      const guess = GUARD_GUESS_OPTIONS[Math.floor(Math.random() * GUARD_GUESS_OPTIONS.length)];
      handleGuardGuess(guess);
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.turnPhase, gameState.currentPlayerIndex, cardAnnouncement]);

  // Bot chancellor pick (gated on announcement)
  useEffect(() => {
    if (gameState.turnPhase !== 'chancellorPick' || currentPlayer?.type !== 'bot') return;
    if (cardAnnouncement) return;

    const timer = setTimeout(() => {
      const keepIndex = Math.floor(Math.random() * currentPlayer.hand.length);
      handleChancellorKeep(keepIndex);
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.turnPhase, gameState.currentPlayerIndex, cardAnnouncement]);

  // Handle resolved turn -> check round end -> advance
  // Gated on all overlays being cleared first
  useEffect(() => {
    if (gameState.turnPhase !== 'resolved' || pendingResolveRef.current) return;
    if (cardAnnouncement || priestPeek || baronReveal || princeDiscard || guardReveal) return; // Wait for overlays

    pendingResolveRef.current = true;

    const timer = setTimeout(() => {
      const roundCheck = LoveLetterEngine.checkRoundEnd(gameState);
      if (roundCheck.ended) {
        const { state: endState } = LoveLetterEngine.resolveRound(gameState);
        addLog(`Round ended! ${endState.lastRoundResult?.winnerName} wins!`, 'round');
        onUpdateGameState(endState);
        if (onRoundEnd) onRoundEnd();
      } else {
        const nextState = LoveLetterEngine.advanceToNextPlayer(gameState);
        onUpdateGameState(nextState);
      }
      pendingResolveRef.current = false;
    }, 500);
    return () => {
      clearTimeout(timer);
      pendingResolveRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.turnPhase, cardAnnouncement, priestPeek, baronReveal, princeDiscard, guardReveal]);

  // Show modals based on turn phase (for human players)
  // Gated on announcement so card play is visible before modal appears
  useEffect(() => {
    if (!isMyTurn || currentPlayer?.type === 'bot') return;
    if (cardAnnouncement) return; // Wait for card play announcement

    if (gameState.turnPhase === 'selectingTarget') {
      setShowTargetModal(true);
    } else if (gameState.turnPhase === 'guardGuessing') {
      setShowGuardGuess(true);
    } else if (gameState.turnPhase === 'chancellorPick') {
      setShowChancellorPick(true);
    }
  }, [gameState.turnPhase, isMyTurn, currentPlayer?.type, cardAnnouncement]);

  // ─── Action Handlers ──────────────────────────────────────────────

  const handlePlayCard = useCallback((cardIndex: number) => {
    const player = gameState.players[gameState.currentPlayerIndex];
    const card = player.hand[cardIndex];
    if (!card) return;

    addLog(`${player.name} plays ${card.name} (${card.value}).`, 'play');

    const needsTarget = cardNeedsTarget(card.name);

    // Build effect text for the announcement
    let effectText: string | undefined;
    if (!needsTarget && card.name === 'Princess') {
      effectText = `${player.name} is eliminated!`;
      addLog(`${player.name} played Princess and is eliminated!`, 'elimination');
    } else if (!needsTarget && card.name === 'Handmaid') {
      effectText = 'Protected until next turn';
      addLog(`${player.name} is now protected until their next turn.`, 'effect');
    } else if (!needsTarget && card.name === 'Spy') {
      effectText = 'No immediate effect';
      addLog(`${player.name} played Spy - no immediate effect.`, 'effect');
    } else if (!needsTarget && card.name === 'Countess') {
      effectText = 'Discarded with no effect';
      addLog(`${player.name} played Countess - no effect.`, 'effect');
    } else if (needsTarget) {
      // Brief description of card's ability
      const descriptions: Record<string, string> = {
        Guard: 'Guess a player\'s card',
        Priest: 'Look at a hand',
        Baron: 'Compare hands',
        Prince: 'Force a discard',
        King: 'Trade hands',
      };
      effectText = descriptions[card.name];
    }

    // Show card play announcement (shorter for human plays)
    const duration = player.type === 'human' ? 1300 : undefined;
    setCardAnnouncement({ card, playerName: player.name, effectText, duration });

    const newState = LoveLetterEngine.playCard(gameState, cardIndex);
    onUpdateGameState(newState);
  }, [gameState, addLog, onUpdateGameState]);

  const handleSelectTarget = useCallback((targetId: string) => {
    setShowTargetModal(false);
    const target = gameState.players.find((p) => p.id === targetId);
    const card = gameState.pendingAction.playedCard;
    if (!target || !card) return;

    addLog(`Target: ${target.name}`, 'effect');

    // For Baron - capture cards before state change
    if (card.name === 'Baron') {
      const baronPlayer = gameState.players[gameState.currentPlayerIndex];
      const yourCard = baronPlayer.hand[0];
      const theirCard = target.hand[0];
      if (yourCard && theirCard) {
        const loserId = yourCard.value < theirCard.value
          ? baronPlayer.id
          : theirCard.value < yourCard.value
            ? target.id
            : null;
        setBaronReveal({
          yourCard,
          theirCard,
          yourName: baronPlayer.name,
          theirName: target.name,
          loserId,
          yourId: baronPlayer.id,
        });
        if (loserId) {
          const loserName = loserId === baronPlayer.id ? baronPlayer.name : target.name;
          addLog(`${loserName} is eliminated by Baron!`, 'elimination');
        } else {
          addLog(`Baron comparison: Tie!`, 'effect');
        }
      }
    }

    // For Priest - only show peek to the priest player (privacy)
    if (card.name === 'Priest' && target.hand[0]) {
      const priestPlayerId = gameState.players[gameState.currentPlayerIndex].id;
      if (handPlayer?.id === priestPlayerId) {
        setPriestPeek({ card: target.hand[0], targetName: target.name });
      }
      addLog(`Priest reveals ${target.name}'s card.`, 'effect');
    }

    // For King - announce hand swap
    if (card.name === 'King') {
      const currentP = gameState.players[gameState.currentPlayerIndex];
      setCardAnnouncement({
        card,
        playerName: currentP.name,
        effectText: `Swaps hands with ${target.name}!`,
        duration: currentP.type === 'human' ? 1300 : undefined,
      });
      addLog(`${currentP.name} swaps hands with ${target.name}.`, 'effect');
    }

    // For Prince - show what card is discarded
    if (card.name === 'Prince') {
      const discardedCard = target.hand[0];
      if (discardedCard) {
        setPrinceDiscard({ card: discardedCard, targetName: target.name });
      }
      addLog(`${target.name} discards their hand.`, 'effect');
    }

    const newState = LoveLetterEngine.selectTarget(gameState, targetId);
    onUpdateGameState(newState);
  }, [gameState, addLog, onUpdateGameState, handPlayer?.id]);

  const handleGuardGuess = useCallback((guess: CardName) => {
    setShowGuardGuess(false);
    const target = gameState.players.find((p) => p.id === gameState.pendingAction.targetPlayerId);
    const guesser = gameState.players[gameState.currentPlayerIndex];
    addLog(`Guard guesses: ${guess}`, 'effect');

    const newState = LoveLetterEngine.guardGuess(gameState, guess);

    // Check if target was eliminated and show dramatic reveal
    if (target) {
      const updatedTarget = newState.players.find((p) => p.id === target.id);
      const correct = !!updatedTarget && !updatedTarget.isAlive;

      if (correct) {
        addLog(`Correct! ${target.name} had ${guess} and is eliminated!`, 'elimination');
      } else {
        addLog(`Wrong guess. ${target.name} does not have ${guess}.`, 'effect');
      }

      setGuardReveal({
        guesserName: guesser.name,
        targetName: target.name,
        guess,
        correct,
      });
    }

    onUpdateGameState(newState);
  }, [gameState, addLog, onUpdateGameState]);

  const handleChancellorKeep = useCallback((keepIndex: number) => {
    setShowChancellorPick(false);
    const player = gameState.players[gameState.currentPlayerIndex];
    const keptCard = player.hand[keepIndex];
    if (keptCard) {
      addLog(`${player.name} keeps a card, returns ${player.hand.length - 1} to the deck.`, 'effect');
    }
    const newState = LoveLetterEngine.resolveChancellor(gameState, keepIndex);
    onUpdateGameState(newState);
  }, [gameState, addLog, onUpdateGameState]);

  // ─── Card click handler ───────────────────────────────────────────

  const handleCardClick = useCallback((cardIndex: number) => {
    if (!isMyTurn || gameState.turnPhase !== 'choosing') return;

    const playable = LoveLetterEngine.getPlayableCards(gameState, gameState.currentPlayerIndex);
    if (!playable.includes(cardIndex)) return;

    // Check countess forced play
    if (handPlayer && mustPlayCountess(handPlayer.hand)) {
      const countessIdx = handPlayer.hand.findIndex((c) => c.name === 'Countess');
      if (countessIdx >= 0 && cardIndex !== countessIdx) return;
    }

    handlePlayCard(cardIndex);
  }, [isMyTurn, gameState, handPlayer, handlePlayCard]);

  // ─── Render ───────────────────────────────────────────────────────

  const playableIndices = isMyTurn && gameState.turnPhase === 'choosing'
    ? LoveLetterEngine.getPlayableCards(gameState, gameState.currentPlayerIndex)
    : [];

  const countessMustPlay = handPlayer ? mustPlayCountess(handPlayer.hand) : false;

  return (
    <div className="bg-royal min-h-screen flex flex-col relative">
      <BackgroundScene />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-3">
        <div className="glass-subtle px-3 py-1 rounded-lg">
          <span className="text-xs" style={{ color: THEME.gold, fontFamily: "'Cinzel', serif" }}>
            Round {gameState.roundNumber}
          </span>
        </div>
        <div className="glass-subtle px-3 py-1 rounded-lg">
          <span className="text-xs" style={{ color: THEME.textSecondary }}>
            {isMyTurn ? (
              <span style={{ color: THEME.goldLight }}>Your Turn</span>
            ) : (
              <span>{currentPlayer?.name}&apos;s Turn</span>
            )}
          </span>
        </div>
        <div className="glass-subtle px-3 py-1 rounded-lg flex items-center gap-1">
          <CardBack size="sm" className="!w-4 !h-6 !rounded" />
          <span className="text-xs" style={{ color: THEME.textSecondary }}>
            {gameState.deck.length}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-3 p-3">
        {/* Left: Action Log (desktop) */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <ActionLog entries={actionLog} maxHeight={400} />
        </div>

        {/* Center: Game Board */}
        <div className="flex-1 flex flex-col items-center gap-3">
          {/* Opponents */}
          <div className="flex flex-wrap justify-center gap-2 w-full">
            {gameState.players
              .filter((p) => p.id !== (handPlayer?.id ?? '__none__'))
              .map((player) => {
                const idx = gameState.players.findIndex((p) => p.id === player.id);
                return (
                  <PlayerArea
                    key={player.id}
                    player={player}
                    isActive={idx === gameState.currentPlayerIndex}
                    isCurrentUser={false}
                    compact
                  />
                );
              })}
          </div>

          {/* Center: Deck + Face-up cards */}
          <div className="flex items-center justify-center gap-6 py-2">
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <CardBack size="sm" count={gameState.deck.length} />
                {gameState.deck.length > 2 && (
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
              <span className="text-xs" style={{ color: THEME.textMuted, fontSize: 9 }}>
                Deck
              </span>
            </div>

            {gameState.faceUpCards.length > 0 && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  {gameState.faceUpCards.map((card, i) => (
                    <CharacterCard key={`fu-${i}`} card={card} size="sm" disabled />
                  ))}
                </div>
                <span className="text-xs" style={{ color: THEME.textMuted, fontSize: 9 }}>
                  Removed
                </span>
              </div>
            )}
          </div>

          {/* Turn Phase Indicator */}
          {isMyTurn && gameState.turnPhase === 'choosing' && (
            <motion.div
              className="glass-subtle px-4 py-2 rounded-lg text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-sm font-semibold" style={{ color: THEME.goldLight }}>
                {countessMustPlay
                  ? 'You must play the Countess!'
                  : 'Choose a card to play'}
              </p>
            </motion.div>
          )}

          {/* Your Hand */}
          {handPlayer && handPlayer.isAlive && (
            <div className="mt-auto pt-4">
              <div
                className="text-xs uppercase tracking-wider text-center mb-2"
                style={{ color: THEME.gold, fontFamily: "'Cinzel', serif", fontSize: 9 }}
              >
                {isMultiHuman ? `${handPlayer.name}'s Hand` : 'Your Hand'}
              </div>
              <div className="flex gap-3 justify-center">
                <AnimatePresence>
                  {handPlayer.hand.map((card, i) => {
                    const isPlayable = playableIndices.includes(i);
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
                          onClick={() => handleCardClick(i)}
                          disabled={!isPlayable || !isMyTurn || gameState.turnPhase !== 'choosing'}
                          highlighted={isPlayable && isMyTurn && gameState.turnPhase === 'choosing'}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Eliminated message */}
          {handPlayer && !handPlayer.isAlive && (
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

        {/* Right: Action Log (mobile) */}
        <div className="lg:hidden">
          <ActionLog entries={actionLog} maxHeight={120} />
        </div>
      </div>

      {/* ─── Turn Banner ───────────────────────────────────────────── */}
      <AnimatePresence>
        {gameState.phase === 'playing' && turnStep === 'turnBanner' && currentPlayer && (
          <TurnBanner player={currentPlayer} onDone={handleTurnBannerDone} />
        )}
      </AnimatePresence>

      {/* ─── Draw Card Animation ───────────────────────────────────── */}
      <AnimatePresence>
        {gameState.phase === 'playing' && turnStep === 'drawAnim' && currentPlayer && (
          <DrawCardAnimation player={currentPlayer} onDone={handleDrawDone} />
        )}
      </AnimatePresence>

      {/* ─── Card Play Announcement ────────────────────────────────── */}
      <AnimatePresence>
        {cardAnnouncement && (
          <CardPlayAnnouncement
            card={cardAnnouncement.card}
            playerName={cardAnnouncement.playerName}
            effectText={cardAnnouncement.effectText}
            duration={cardAnnouncement.duration}
            onDone={() => setCardAnnouncement(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Modals ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showTargetModal && gameState.pendingAction.playedCard && (
          <TargetSelectionModal
            players={gameState.players}
            validTargetIds={LoveLetterEngine.getValidTargets(
              gameState,
              gameState.pendingAction.playedCard.name,
              currentPlayer.id,
            )}
            cardName={gameState.pendingAction.playedCard.name}
            onSelect={handleSelectTarget}
            onCancel={() => {
              // Can't really cancel mid-play - but allow re-showing
              setShowTargetModal(false);
              setTimeout(() => setShowTargetModal(true), 100);
            }}
          />
        )}

        {showGuardGuess && (
          <GuardGuessModal
            onGuess={handleGuardGuess}
            onCancel={() => {
              setShowGuardGuess(false);
              setTimeout(() => setShowGuardGuess(true), 100);
            }}
          />
        )}

        {showChancellorPick && currentPlayer && (
          <ChancellorPickModal
            cards={currentPlayer.hand}
            onPick={handleChancellorKeep}
          />
        )}

        {priestPeek && (
          <PriestPeekOverlay
            card={priestPeek.card}
            targetName={priestPeek.targetName}
            onDismiss={() => setPriestPeek(null)}
          />
        )}

        {baronReveal && (
          <BaronRevealOverlay
            {...baronReveal}
            onDismiss={() => setBaronReveal(null)}
          />
        )}

        {princeDiscard && (
          <PrinceDiscardOverlay
            card={princeDiscard.card}
            targetName={princeDiscard.targetName}
            onDismiss={() => setPrinceDiscard(null)}
          />
        )}

        {guardReveal && (
          <GuardRevealOverlay
            guesserName={guardReveal.guesserName}
            targetName={guardReveal.targetName}
            guess={guardReveal.guess}
            correct={guardReveal.correct}
            onDismiss={() => setGuardReveal(null)}
          />
        )}
      </AnimatePresence>

      {/* Handoff Screen (multi-human hot-seat) */}
      <AnimatePresence>
        {handoffPlayer && (
          <HandoffScreen
            player={handoffPlayer}
            onReady={handleHandoffConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
