import { useState } from 'react';
import { motion } from 'framer-motion';
import { THEME } from '../../styles/loveLetterStyles';
import { OrnamentRow } from '../ui/Ornaments';
import { BackgroundScene } from '../ui/BackgroundScene';
import { Button } from '../common/Button';
import { generateRoomCode } from '../../utils/roomCodes';

interface OnlineLobbyScreenProps {
  onJoinRoom: (roomCode: string) => void;
  onBack: () => void;
}

export function OnlineLobbyScreen({ onJoinRoom, onBack }: OnlineLobbyScreenProps) {
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join'>('menu');

  const handleCreate = () => {
    const code = generateRoomCode();
    onJoinRoom(code);
  };

  const handleJoin = () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length >= 3) {
      onJoinRoom(code);
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
        <div className="text-center mb-6">
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "'Cinzel', serif",
              color: THEME.goldLight,
              textShadow: `0 0 20px ${THEME.goldGlow}`,
            }}
          >
            ONLINE PLAY
          </h1>
          <OrnamentRow symbol="seal" className="mb-2" />
          <p className="text-sm" style={{ color: THEME.textSecondary }}>
            Play Love Letter with friends online
          </p>
        </div>

        {mode === 'menu' && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Button
              variant="gold"
              size="lg"
              className="w-full"
              style={{ fontFamily: "'Cinzel', serif", letterSpacing: '2px' }}
              onClick={handleCreate}
            >
              CREATE ROOM
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => setMode('join')}
            >
              Join Room
            </Button>

            <OrnamentRow symbol="fleur" className="my-4" />

            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={onBack}
            >
              Back to Menu
            </Button>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div>
              <label
                className="text-xs uppercase tracking-wider mb-1 block"
                style={{ color: THEME.gold, fontFamily: "'Cinzel', serif", fontSize: 10 }}
              >
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Enter room code..."
                maxLength={6}
                autoFocus
                className="w-full rounded-lg px-4 py-3 text-lg text-center uppercase tracking-[0.15em] outline-none transition-all"
                style={{
                  background: `${THEME.bgDeep}80`,
                  border: `1px solid ${THEME.gold}20`,
                  color: THEME.goldLight,
                  fontFamily: "'Cinzel', serif",
                }}
              />
            </div>

            <Button
              variant="gold"
              size="lg"
              className="w-full"
              style={{ fontFamily: "'Cinzel', serif" }}
              onClick={handleJoin}
              disabled={roomCode.trim().length < 3}
            >
              JOIN
            </Button>

            <button
              onClick={() => setMode('menu')}
              className="w-full text-sm py-2 rounded-lg transition-all opacity-60 hover:opacity-100"
              style={{ color: THEME.textSecondary }}
            >
              Back
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
