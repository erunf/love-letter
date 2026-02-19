import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BotDifficulty } from '../../types/game';
import { THEME } from '../../styles/loveLetterStyles';
import { MIN_PLAYERS, MAX_PLAYERS } from '../../constants/loveLetter';
import { PLAYER_AVATARS, PLAYER_COLORS } from '../../types/game';
import { Button } from '../common/Button';
import { OrnamentRow, CrownIcon, FleurDeLis, WaxSealIcon, RoseIcon, HeartIcon } from '../ui/Ornaments';
import { BackgroundScene } from '../ui/BackgroundScene';

// ─── Avatar Mapping ─────────────────────────────────────────────────

function AvatarDisplay({ avatar, size = 20, color }: { avatar: string; size?: number; color: string }) {
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

// ─── Types ──────────────────────────────────────────────────────────

interface LobbyPlayer {
  id: string;
  name: string;
  type: 'human' | 'bot';
  botDifficulty?: BotDifficulty;
  avatar: string;
  color: string;
}

interface LobbyScreenProps {
  onStartGame: (players: LobbyPlayer[]) => void;
  onPlayOnline?: () => void;
}

// ─── LobbyScreen Component ─────────────────────────────────────────

export function LobbyScreen({ onStartGame, onPlayOnline }: LobbyScreenProps) {
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium');

  const canAddPlayer = players.length < MAX_PLAYERS;
  const canStart = players.length >= MIN_PLAYERS;

  const getNextAvatar = () => PLAYER_AVATARS[players.length % PLAYER_AVATARS.length];
  const getNextColor = () => PLAYER_COLORS[players.length % PLAYER_COLORS.length];

  const addHumanPlayer = () => {
    const name = nameInput.trim();
    if (!name || !canAddPlayer) return;
    setPlayers((prev) => [
      ...prev,
      {
        id: `human-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        type: 'human',
        avatar: getNextAvatar(),
        color: getNextColor(),
      },
    ]);
    setNameInput('');
  };

  const addBot = () => {
    if (!canAddPlayer) return;
    const botNames = ['Lord Byron', 'Lady Elara', 'Duke Alaric', 'Duchess Vex', 'Count Raven', 'Baroness Lily'];
    const usedNames = new Set(players.map((p) => p.name));
    const name = botNames.find((n) => !usedNames.has(n)) ?? `Bot ${players.length + 1}`;
    setPlayers((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        type: 'bot',
        botDifficulty,
        avatar: getNextAvatar(),
        color: getNextColor(),
      },
    ]);
  };

  const removePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addHumanPlayer();
    }
  };

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
        <div className="text-center mb-6">
          <h1
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{
              fontFamily: "'Cinzel', serif",
              color: THEME.goldLight,
              textShadow: `0 0 20px ${THEME.goldGlow}, 0 2px 4px rgba(0,0,0,0.5)`,
            }}
          >
            LOVE LETTER
          </h1>
          <OrnamentRow symbol="heart" className="mb-2" />
          <p className="text-sm" style={{ color: THEME.textSecondary }}>
            A game of risk, deduction, and courtship
          </p>
        </div>

        {/* Add Human Player */}
        <div className="mb-4">
          <label
            className="text-xs uppercase tracking-wider mb-1 block"
            style={{ color: THEME.gold, fontFamily: "'Cinzel', serif", fontSize: 10 }}
          >
            Add Player
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter name..."
              maxLength={20}
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-all"
              style={{
                background: `${THEME.bgDeep}80`,
                border: `1px solid ${THEME.gold}20`,
                color: THEME.textPrimary,
                fontFamily: "'Crimson Text', serif",
              }}
              disabled={!canAddPlayer}
            />
            <Button
              variant="gold"
              size="sm"
              onClick={addHumanPlayer}
              disabled={!nameInput.trim() || !canAddPlayer}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Add Bot */}
        <div className="mb-4">
          <label
            className="text-xs uppercase tracking-wider mb-1 block"
            style={{ color: THEME.gold, fontFamily: "'Cinzel', serif", fontSize: 10 }}
          >
            Add Bot
          </label>
          <div className="flex gap-2 items-center">
            <select
              value={botDifficulty}
              onChange={(e) => setBotDifficulty(e.target.value as BotDifficulty)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: `${THEME.bgDeep}80`,
                border: `1px solid ${THEME.gold}20`,
                color: THEME.textPrimary,
                fontFamily: "'Crimson Text', serif",
              }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <Button variant="secondary" size="sm" onClick={addBot} disabled={!canAddPlayer}>
              Add Bot
            </Button>
          </div>
        </div>

        {/* Player List */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: THEME.gold, fontFamily: "'Cinzel', serif", fontSize: 10 }}
            >
              Players ({players.length}/{MAX_PLAYERS})
            </span>
            <span className="text-xs" style={{ color: THEME.textSecondary }}>
              Need {MIN_PLAYERS}+ to start
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            <AnimatePresence>
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  className="glass-subtle flex items-center gap-3 p-2 rounded-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, padding: 0 }}
                  layout
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: `${player.color}20`, border: `1px solid ${player.color}40` }}
                  >
                    <AvatarDisplay avatar={player.avatar} size={16} color={player.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: THEME.textPrimary }}>
                      {player.name}
                    </div>
                    <div className="text-xs" style={{ color: THEME.textSecondary }}>
                      {player.type === 'bot' ? `Bot (${player.botDifficulty})` : 'Human'}
                    </div>
                  </div>
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
                    style={{ color: THEME.eliminated }}
                    title="Remove player"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {players.length === 0 && (
              <div className="text-center py-4 text-sm" style={{ color: THEME.textMuted }}>
                Add players to begin the game
              </div>
            )}
          </div>
        </div>

        <OrnamentRow symbol="fleur" className="my-4" />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant="gold"
            size="lg"
            className="w-full"
            style={{ fontFamily: "'Cinzel', serif", letterSpacing: '2px' }}
            onClick={() => onStartGame(players)}
            disabled={!canStart}
          >
            {canStart ? 'BEGIN GAME' : `Need ${MIN_PLAYERS - players.length} More`}
          </Button>

          {onPlayOnline && (
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={onPlayOnline}
            >
              Play Online
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
