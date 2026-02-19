import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { PlayerStats } from '../../types/stats';
import { THEME } from '../../styles/loveLetterStyles';
import { OrnamentRow, CrownIcon } from '../ui/Ornaments';
import { BackgroundScene } from '../ui/BackgroundScene';
import { Button } from '../common/Button';
import { useAuthStore } from '../../store/authStore';

interface StatsScreenProps {
  apiBaseUrl?: string;
  onBack: () => void;
}

export function StatsScreen({ apiBaseUrl = '', onBack }: StatsScreenProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const idToken = useAuthStore((s) => s.idToken);

  useEffect(() => {
    if (!user || !idToken) {
      setLoading(false);
      setError('Sign in to view your stats');
      return;
    }

    async function fetchStats() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/stats/${user!.googleId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json() as PlayerStats;
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user, idToken, apiBaseUrl]);

  const winRate = stats && stats.games_played > 0
    ? ((stats.games_won / stats.games_played) * 100).toFixed(1)
    : '0.0';

  const roundWinRate = stats && stats.total_rounds_played > 0
    ? ((stats.total_rounds_won / stats.total_rounds_played) * 100).toFixed(1)
    : '0.0';

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
            YOUR STATS
          </h2>
          <OrnamentRow symbol="seal" className="my-3" />
        </div>

        {loading && (
          <div className="text-center py-8">
            <motion.div
              className="w-8 h-8 border-2 rounded-full mx-auto"
              style={{ borderColor: THEME.gold, borderTopColor: 'transparent' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-sm mt-3" style={{ color: THEME.textSecondary }}>Loading stats...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: THEME.eliminated }}>{error}</p>
          </div>
        )}

        {stats && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* User info */}
            <div className="glass p-4 rounded-xl text-center mb-4">
              <div className="flex items-center justify-center gap-3">
                {stats.avatar_url ? (
                  <img src={stats.avatar_url} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ background: `${THEME.gold}20`, color: THEME.gold }}
                  >
                    {stats.display_name.charAt(0)}
                  </div>
                )}
                <p className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: THEME.textPrimary }}>
                  {stats.display_name}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatBox label="Games Played" value={stats.games_played.toString()} />
              <StatBox label="Games Won" value={stats.games_won.toString()} accent={THEME.goldLight} />
              <StatBox label="Win Rate" value={`${winRate}%`} accent={THEME.goldLight} />
              <StatBox label="Round Win Rate" value={`${roundWinRate}%`} />
              <StatBox label="Rounds Won" value={stats.total_rounds_won.toString()} />
              <StatBox label="Rounds Played" value={stats.total_rounds_played.toString()} />
              <StatBox label="Eliminations" value={stats.total_eliminations.toString()} accent={THEME.crimsonLight} />
              <StatBox label="Spy Bonuses" value={stats.total_spy_bonuses.toString()} accent="#7c6db5" />
            </div>
          </motion.div>
        )}

        <OrnamentRow symbol="fleur" className="my-4" />

        <Button variant="secondary" size="md" className="w-full" onClick={onBack}>
          Back
        </Button>
      </motion.div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="glass-subtle p-3 rounded-lg text-center">
      <div
        className="text-xl font-bold"
        style={{ fontFamily: "'Cinzel', serif", color: accent ?? THEME.textPrimary }}
      >
        {value}
      </div>
      <div className="text-xs" style={{ color: THEME.textSecondary }}>
        {label}
      </div>
    </div>
  );
}
