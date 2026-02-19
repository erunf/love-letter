import { motion } from 'framer-motion';
import type { GameState } from '../../types/game';
import { THEME } from '../../styles/loveLetterStyles';
import { OrnamentRow, CrownIcon } from '../ui/Ornaments';
import { BackgroundScene } from '../ui/BackgroundScene';
import { Button } from '../common/Button';

interface GameOverScreenProps {
  gameState: GameState;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export function GameOverScreen({ gameState, onPlayAgain, onReturnToLobby }: GameOverScreenProps) {
  const winner = gameState.players.find((p) => p.id === gameState.gameWinnerId);

  return (
    <div className="bg-royal min-h-screen flex items-center justify-center p-4">
      <BackgroundScene />

      <motion.div
        className="glass-modal w-full max-w-lg p-8 relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Crown animation */}
        <motion.div
          className="flex justify-center mb-4"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <div className="relative">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 3, -3, 0],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CrownIcon size={64} color={THEME.gold} />
            </motion.div>
            {/* Glow effect */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${THEME.goldGlow} 0%, transparent 70%)`,
                filter: 'blur(8px)',
                zIndex: -1,
                transform: 'scale(2)',
              }}
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "'Cinzel', serif",
              color: THEME.goldLight,
              textShadow: `0 0 24px ${THEME.goldGlow}, 0 0 48px ${THEME.goldGlow}`,
            }}
          >
            GAME OVER
          </h1>
          <OrnamentRow symbol="heart" className="my-3" />
          <p className="text-sm" style={{ color: THEME.textSecondary }}>
            The love letter has been delivered
          </p>
        </motion.div>

        {/* Winner */}
        {winner && (
          <motion.div
            className="glass p-6 rounded-xl text-center mb-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              borderColor: `${winner.color}40`,
              boxShadow: `0 0 20px ${winner.color}20`,
            }}
          >
            <p className="text-sm mb-2" style={{ color: THEME.textSecondary }}>
              Champion
            </p>
            <p
              className="text-3xl font-bold mb-2"
              style={{
                fontFamily: "'Cinzel', serif",
                color: winner.color,
                textShadow: `0 0 16px ${winner.color}40`,
              }}
            >
              {winner.name}
            </p>
            <div className="flex justify-center gap-1 mb-2">
              {Array.from({ length: winner.tokens }).map((_, i) => (
                <motion.div
                  key={i}
                  className="wax-seal-token"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  style={{ width: 22, height: 22 }}
                />
              ))}
            </div>
            <p className="text-sm" style={{ color: THEME.textSecondary }}>
              {winner.tokens} Favor Tokens
            </p>
          </motion.div>
        )}

        {/* Final Standings */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p
            className="text-xs uppercase tracking-wider text-center mb-3"
            style={{ color: THEME.gold, fontFamily: "'Cinzel', serif", fontSize: 10 }}
          >
            Final Standings
          </p>
          <div className="space-y-1">
            {[...gameState.players]
              .sort((a, b) => b.tokens - a.tokens)
              .map((player, idx) => (
                <div
                  key={player.id}
                  className="glass-subtle flex items-center gap-2 p-2 rounded-lg"
                  style={{
                    borderColor: idx === 0 ? `${THEME.gold}30` : undefined,
                  }}
                >
                  <span
                    className="w-6 text-center text-sm font-bold"
                    style={{
                      fontFamily: "'Cinzel', serif",
                      color: idx === 0 ? THEME.gold : THEME.textMuted,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: `${player.color}30`, color: player.color }}
                  >
                    {player.name.charAt(0)}
                  </div>
                  <span className="text-sm flex-1" style={{ color: THEME.textPrimary }}>
                    {player.name}
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: player.tokens }).map((_, i) => (
                      <div key={i} className="wax-seal-token" />
                    ))}
                    {player.tokens === 0 && (
                      <span className="text-xs" style={{ color: THEME.textMuted }}>0</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </motion.div>

        <OrnamentRow symbol="fleur" className="my-4" />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant="gold"
            size="lg"
            className="w-full"
            style={{ fontFamily: "'Cinzel', serif", letterSpacing: '2px' }}
            onClick={onPlayAgain}
          >
            PLAY AGAIN
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={onReturnToLobby}
          >
            Return to Lobby
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
