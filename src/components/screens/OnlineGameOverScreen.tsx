import { motion } from 'framer-motion';
import type { ClientMessage, GameSnapshot } from '../../types/protocol';
import { THEME } from '../../styles/loveLetterStyles';
import { OrnamentRow, CrownIcon } from '../ui/Ornaments';
import { BackgroundScene } from '../ui/BackgroundScene';
import { Button } from '../common/Button';

interface OnlineGameOverScreenProps {
  snapshot: GameSnapshot;
  yourPlayerId: string;
  send: (msg: ClientMessage) => void;
  onLeave: () => void;
}

export function OnlineGameOverScreen({ snapshot, yourPlayerId, send, onLeave }: OnlineGameOverScreenProps) {
  const isHost = snapshot.hostId === yourPlayerId;
  const winner = snapshot.players.find((p) => p.id === snapshot.gameWinnerId);
  const isWinner = snapshot.gameWinnerId === yourPlayerId;

  return (
    <div className="bg-royal min-h-screen flex items-center justify-center p-4">
      <BackgroundScene />

      <motion.div
        className="glass-modal w-full max-w-lg p-8 relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Crown */}
        <motion.div
          className="flex justify-center mb-4"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CrownIcon size={64} color={THEME.gold} />
            </motion.div>
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
              {winner.name} {isWinner && '(You!)'}
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
            {[...snapshot.players]
              .sort((a, b) => b.tokens - a.tokens)
              .map((player, idx) => (
                <div
                  key={player.id}
                  className="glass-subtle flex items-center gap-2 p-2 rounded-lg"
                  style={{ borderColor: idx === 0 ? `${THEME.gold}30` : undefined }}
                >
                  <span
                    className="w-6 text-center text-sm font-bold"
                    style={{ fontFamily: "'Cinzel', serif", color: idx === 0 ? THEME.gold : THEME.textMuted }}
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
                    {player.name} {player.id === yourPlayerId ? '(You)' : ''}
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: player.tokens }).map((_, i) => (
                      <div key={i} className="wax-seal-token" />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </motion.div>

        <OrnamentRow symbol="fleur" className="my-4" />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {isHost && (
            <>
              <Button
                variant="gold"
                size="lg"
                className="w-full"
                style={{ fontFamily: "'Cinzel', serif", letterSpacing: '2px' }}
                onClick={() => send({ type: 'resetGame' })}
              >
                PLAY AGAIN
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => send({ type: 'returnToLobby' })}
              >
                Return to Lobby
              </Button>
            </>
          )}
          {!isHost && (
            <p className="text-center text-sm py-2" style={{ color: THEME.textSecondary }}>
              Waiting for host...
            </p>
          )}
          <button
            onClick={onLeave}
            className="w-full mt-1 text-sm py-2 rounded-lg transition-all opacity-50 hover:opacity-80"
            style={{ color: THEME.textMuted }}
          >
            Leave Room
          </button>
        </div>
      </motion.div>
    </div>
  );
}
