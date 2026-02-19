import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LeaderboardEntry } from '../../types/stats';
import { THEME } from '../../styles/loveLetterStyles';
import { OrnamentRow, CrownIcon } from '../ui/Ornaments';
import { BackgroundScene } from '../ui/BackgroundScene';
import { Button } from '../common/Button';

type LeaderboardTab = 'wins' | 'win_rate';

interface LeaderboardScreenProps {
  apiBaseUrl?: string;
  onBack: () => void;
}

export function LeaderboardScreen({ apiBaseUrl = '', onBack }: LeaderboardScreenProps) {
  const [tab, setTab] = useState<LeaderboardTab>('wins');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    async function fetchLeaderboard() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/leaderboard?sort=${tab}&limit=20`);
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        const data = await res.json() as LeaderboardEntry[];
        setEntries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [tab, apiBaseUrl]);

  return (
    <div className="bg-royal min-h-screen flex items-center justify-center p-4">
      <BackgroundScene />

      <motion.div
        className="glass-modal w-full max-w-md p-6 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-4">
          <CrownIcon size={32} color={THEME.gold} />
          <h2
            className="text-2xl font-bold mt-2"
            style={{
              fontFamily: "'Cinzel', serif",
              color: THEME.goldLight,
              textShadow: `0 0 16px ${THEME.goldGlow}`,
            }}
          >
            LEADERBOARD
          </h2>
          <OrnamentRow symbol="crown" className="my-3" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <TabButton
            active={tab === 'wins'}
            onClick={() => setTab('wins')}
            label="Most Wins"
          />
          <TabButton
            active={tab === 'win_rate'}
            onClick={() => setTab('win_rate')}
            label="Win Rate"
          />
        </div>

        {/* Content */}
        {loading && (
          <div className="text-center py-8">
            <motion.div
              className="w-8 h-8 border-2 rounded-full mx-auto"
              style={{ borderColor: THEME.gold, borderTopColor: 'transparent' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-sm mt-3" style={{ color: THEME.textSecondary }}>Loading...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: THEME.eliminated }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-1"
              >
                {entries.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: THEME.textMuted }}>
                      No entries yet. Play some games!
                    </p>
                  </div>
                )}

                {entries.map((entry, idx) => (
                  <motion.div
                    key={entry.user_id}
                    className="glass-subtle flex items-center gap-3 p-2.5 rounded-lg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    style={{
                      borderColor: idx < 3 ? `${THEME.gold}${idx === 0 ? '40' : '20'}` : undefined,
                    }}
                  >
                    {/* Rank */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: idx === 0 ? `${THEME.gold}30` : idx === 1 ? 'rgba(192,192,192,0.2)' : idx === 2 ? 'rgba(205,127,50,0.2)' : 'rgba(255,255,255,0.05)',
                        color: idx === 0 ? THEME.gold : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : THEME.textMuted,
                        fontFamily: "'Cinzel', serif",
                      }}
                    >
                      {idx + 1}
                    </div>

                    {/* Avatar & Name */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" className="w-7 h-7 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: `${THEME.gold}15`, color: THEME.gold }}
                        >
                          {entry.display_name.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm truncate" style={{ color: THEME.textPrimary }}>
                        {entry.display_name}
                      </span>
                    </div>

                    {/* Value */}
                    <div
                      className="text-sm font-bold flex-shrink-0"
                      style={{
                        fontFamily: "'Cinzel', serif",
                        color: idx === 0 ? THEME.goldLight : THEME.textPrimary,
                      }}
                    >
                      {tab === 'win_rate' ? `${entry.value.toFixed(1)}%` : entry.value}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <OrnamentRow symbol="fleur" className="my-4" />

        <Button variant="secondary" size="md" className="w-full" onClick={onBack}>
          Back
        </Button>
      </motion.div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
      style={{
        background: active ? `${THEME.gold}20` : 'transparent',
        color: active ? THEME.goldLight : THEME.textMuted,
        border: `1px solid ${active ? THEME.gold + '40' : 'rgba(255,255,255,0.05)'}`,
        fontFamily: "'Cinzel', serif",
      }}
    >
      {label}
    </button>
  );
}
