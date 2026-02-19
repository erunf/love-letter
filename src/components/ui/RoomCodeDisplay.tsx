import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { THEME } from '../../styles/loveLetterStyles';

interface RoomCodeDisplayProps {
  code: string;
}

export function RoomCodeDisplay({ code }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="glass p-4 text-center">
      <div
        className="text-xs uppercase tracking-widest mb-2 opacity-60"
        style={{ fontFamily: "'Cinzel', serif", color: THEME.gold }}
      >
        Room Code
      </div>
      <div className="flex items-center justify-center gap-3">
        <div
          className="text-3xl font-bold tracking-[0.3em] px-4 py-2 rounded-lg"
          style={{
            fontFamily: "'Cinzel', serif",
            color: THEME.goldLight,
            background: `${THEME.bgDeep}80`,
            border: `1px solid ${THEME.gold}30`,
            textShadow: `0 0 12px ${THEME.goldGlow}`,
            letterSpacing: '0.3em',
          }}
        >
          {code}
        </div>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
          style={{
            background: `${THEME.gold}15`,
            border: `1px solid ${THEME.gold}30`,
            color: THEME.gold,
          }}
          title="Copy room code"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.svg
                key="check"
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={THEME.alive}
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <path d="M20 6L9 17L4 12" />
              </motion.svg>
            ) : (
              <motion.svg
                key="copy"
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </motion.svg>
            )}
          </AnimatePresence>
        </button>
      </div>
      <AnimatePresence>
        {copied && (
          <motion.div
            className="text-xs mt-2"
            style={{ color: THEME.alive }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            Copied!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
