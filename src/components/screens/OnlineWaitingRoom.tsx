import { motion, AnimatePresence } from 'framer-motion';
import type { BotDifficulty } from '../../types/game';
import type { ClientMessage } from '../../types/protocol';
import { THEME } from '../../styles/loveLetterStyles';
import { OrnamentRow, CrownIcon, FleurDeLis, WaxSealIcon, RoseIcon, HeartIcon } from '../ui/Ornaments';
import { BackgroundScene } from '../ui/BackgroundScene';
import { RoomCodeDisplay } from '../ui/RoomCodeDisplay';
import { Button } from '../common/Button';

function AvatarDisplay({ avatar, size = 16, color }: { avatar: string; size?: number; color: string }) {
  const icons: Record<string, React.FC<{ size: number; color: string }>> = {
    crown: CrownIcon,
    rose: RoseIcon,
    quill: FleurDeLis,
    shield: WaxSealIcon,
    ring: HeartIcon,
    scroll: FleurDeLis,
  };
  const Icon = icons[avatar] ?? FleurDeLis;
  return <Icon size={size} color={color} />;
}

interface OnlineWaitingRoomProps {
  snapshot: {
    roomCode: string;
    hostId: string;
    players: {
      id: string;
      name: string;
      type: 'human' | 'bot';
      botDifficulty?: BotDifficulty;
      avatar: string;
      color: string;
    }[];
  };
  yourPlayerId: string;
  send: (msg: ClientMessage) => void;
  onLeave: () => void;
}

export function OnlineWaitingRoom({ snapshot, yourPlayerId, send, onLeave }: OnlineWaitingRoomProps) {
  const isHost = snapshot.hostId === yourPlayerId;
  const canStart = snapshot.players.length >= 2;

  return (
    <div className="bg-royal min-h-screen flex items-center justify-center p-4">
      <BackgroundScene />

      <motion.div
        className="glass-modal w-full max-w-md p-6 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Title */}
        <div className="text-center mb-4">
          <h2
            className="text-2xl font-bold mb-2"
            style={{
              fontFamily: "'Cinzel', serif",
              color: THEME.goldLight,
              textShadow: `0 0 16px ${THEME.goldGlow}`,
            }}
          >
            WAITING ROOM
          </h2>
          <OrnamentRow symbol="seal" className="mb-3" />
        </div>

        {/* Room Code */}
        <div className="mb-4">
          <RoomCodeDisplay code={snapshot.roomCode} />
        </div>

        {/* Player List */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: THEME.gold, fontFamily: "'Cinzel', serif", fontSize: 10 }}
            >
              Players ({snapshot.players.length}/6)
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            <AnimatePresence>
              {snapshot.players.map((player) => (
                <motion.div
                  key={player.id}
                  className="glass-subtle flex items-center gap-3 p-2.5 rounded-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  layout
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: `${player.color}20`, border: `1px solid ${player.color}40` }}
                  >
                    <AvatarDisplay avatar={player.avatar} size={16} color={player.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold truncate" style={{ color: THEME.textPrimary }}>
                        {player.name}
                      </span>
                      {player.id === snapshot.hostId && (
                        <span
                          className="text-xs px-1 rounded"
                          style={{ background: `${THEME.gold}20`, color: THEME.gold, fontSize: 9 }}
                        >
                          HOST
                        </span>
                      )}
                      {player.id === yourPlayerId && (
                        <span className="text-xs" style={{ color: THEME.textMuted, fontSize: 9 }}>
                          (You)
                        </span>
                      )}
                    </div>
                    {player.type === 'bot' && (
                      <span className="text-xs" style={{ color: THEME.textSecondary }}>
                        Bot ({player.botDifficulty})
                      </span>
                    )}
                  </div>

                  {isHost && player.id !== yourPlayerId && (
                    <button
                      onClick={() => send({ type: 'removePlayer', playerId: player.id })}
                      className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
                      style={{ color: THEME.eliminated }}
                      title="Remove"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <OrnamentRow symbol="fleur" className="my-4" />

        {/* Host Actions */}
        {isHost && (
          <div className="space-y-3">
            {/* Add bots */}
            {snapshot.players.length < 6 && (
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as BotDifficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => send({ type: 'addBot', difficulty: diff })}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: `${THEME.bgDeep}80`,
                      border: `1px solid ${THEME.gold}15`,
                      color: THEME.textSecondary,
                    }}
                  >
                    + {diff.charAt(0).toUpperCase() + diff.slice(1)} Bot
                  </button>
                ))}
              </div>
            )}

            <Button
              variant="gold"
              size="lg"
              className="w-full"
              style={{ fontFamily: "'Cinzel', serif", letterSpacing: '2px' }}
              onClick={() => send({ type: 'startGame' })}
              disabled={!canStart}
            >
              {canStart ? 'START GAME' : 'Need 2+ Players'}
            </Button>
          </div>
        )}

        {!isHost && (
          <div className="text-center py-2">
            <p className="text-sm" style={{ color: THEME.textSecondary }}>
              Waiting for host to start the game...
            </p>
            <motion.div
              className="w-6 h-6 border-2 rounded-full mx-auto mt-3"
              style={{ borderColor: THEME.gold, borderTopColor: 'transparent' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        <button
          onClick={onLeave}
          className="w-full mt-3 text-sm py-2 rounded-lg transition-all opacity-50 hover:opacity-80"
          style={{ color: THEME.textMuted }}
        >
          Leave Room
        </button>
      </motion.div>
    </div>
  );
}
