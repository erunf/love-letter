import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { THEME } from '../../styles/loveLetterStyles';

export interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
  type?: 'play' | 'effect' | 'elimination' | 'info' | 'round';
}

interface ActionLogProps {
  entries: LogEntry[];
  maxHeight?: number;
}

const TYPE_COLORS: Record<string, string> = {
  play: THEME.gold,
  effect: THEME.textSecondary,
  elimination: THEME.eliminated,
  info: THEME.textSecondary,
  round: THEME.goldLight,
};

export function ActionLog({ entries, maxHeight = 200 }: ActionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="glass-subtle p-2 flex flex-col" style={{ maxHeight, minHeight: 60 }}>
      <div
        className="text-xs font-semibold mb-1 opacity-60"
        style={{ fontFamily: "'Cinzel', serif", color: THEME.gold, fontSize: 9, letterSpacing: '1px' }}
      >
        ACTION LOG
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-0.5" style={{ fontSize: 11 }}>
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="leading-tight"
              style={{ color: TYPE_COLORS[entry.type ?? 'info'] ?? THEME.textSecondary }}
            >
              {entry.type === 'round' && (
                <span style={{ color: THEME.gold, marginRight: 4 }}>---</span>
              )}
              {entry.message}
            </motion.div>
          ))}
        </AnimatePresence>
        {entries.length === 0 && (
          <div className="text-xs opacity-30 italic">No actions yet...</div>
        )}
      </div>
    </div>
  );
}
