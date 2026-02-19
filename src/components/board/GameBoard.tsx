import { motion } from 'framer-motion';
import type { Player, Card } from '../../types/game';
import { THEME } from '../../styles/loveLetterStyles';
import { CardBack } from '../cards/CardBack';
import { PlayerArea } from './PlayerArea';
import { CharacterCard } from '../cards/CharacterCard';

// ─── GameBoard Component ────────────────────────────────────────────

interface GameBoardProps {
  players: Player[];
  currentPlayerIndex: number;
  deckCount: number;
  faceUpCards: Card[];
  currentUserId?: string; // For local: the player whose turn it is
}

export function GameBoard({
  players,
  currentPlayerIndex,
  deckCount,
  faceUpCards,
  currentUserId,
}: GameBoardProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Top row: opponents */}
      <div className="flex flex-wrap justify-center gap-3 w-full">
        {players
          .filter((p) => p.id !== currentUserId)
          .map((player) => {
            const playerIdx = players.findIndex((p) => p.id === player.id);
            return (
              <PlayerArea
                key={player.id}
                player={player}
                isActive={playerIdx === currentPlayerIndex}
                isCurrentUser={false}
                compact
              />
            );
          })}
      </div>

      {/* Center area: deck + face-up cards */}
      <div className="flex items-center justify-center gap-6 py-4">
        {/* Deck pile */}
        <motion.div className="flex flex-col items-center gap-1" layout>
          <div className="relative">
            <CardBack size="sm" count={deckCount} />
            {/* Stacking effect */}
            {deckCount > 1 && (
              <div
                className="absolute card-parchment"
                style={{
                  width: 60,
                  height: 90,
                  top: 2,
                  left: 2,
                  zIndex: -1,
                  background: `linear-gradient(135deg, ${THEME.crimsonDark}, ${THEME.waxSealDark})`,
                  borderColor: `${THEME.gold}15`,
                }}
              />
            )}
          </div>
          <span className="text-xs" style={{ color: THEME.textSecondary, fontFamily: "'Cinzel', serif", fontSize: 9 }}>
            Deck
          </span>
        </motion.div>

        {/* Face-up removed cards (2-player) */}
        {faceUpCards.length > 0 && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
              {faceUpCards.map((card, i) => (
                <CharacterCard key={`faceup-${i}`} card={card} size="sm" disabled />
              ))}
            </div>
            <span className="text-xs" style={{ color: THEME.textSecondary, fontSize: 9 }}>
              Removed
            </span>
          </div>
        )}
      </div>

      {/* Bottom: current user's area */}
      {currentUserId && (() => {
        const currentUser = players.find((p) => p.id === currentUserId);
        if (!currentUser) return null;
        const userIdx = players.findIndex((p) => p.id === currentUserId);
        return (
          <PlayerArea
            player={currentUser}
            isActive={userIdx === currentPlayerIndex}
            isCurrentUser
          />
        );
      })()}
    </div>
  );
}
