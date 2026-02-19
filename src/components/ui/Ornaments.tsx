import { motion } from 'framer-motion';
import { THEME } from '../../styles/loveLetterStyles';

// ─── SVG Ornamental Symbols ─────────────────────────────────────────

export function FleurDeLis({ size = 20, color = THEME.gold }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2C12 2 10 6 10 8C10 10 11 11 12 11C13 11 14 10 14 8C14 6 12 2 12 2Z" />
      <path d="M6 10C6 10 8 8 10 8.5C11 8.7 11.5 9.5 11 10.5C10.5 11.5 8 12 6 10Z" />
      <path d="M18 10C18 10 16 8 14 8.5C13 8.7 12.5 9.5 13 10.5C13.5 11.5 16 12 18 10Z" />
      <rect x="11" y="11" width="2" height="8" rx="1" />
      <path d="M8 19C8 19 10 17 12 17C14 17 16 19 16 19" strokeWidth="1.5" stroke={color} fill="none" />
      <circle cx="12" cy="22" r="1" />
    </svg>
  );
}

export function CrownIcon({ size = 20, color = THEME.gold }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M3 18L1 8L6 12L12 4L18 12L23 8L21 18H3Z" />
      <rect x="3" y="18" width="18" height="3" rx="1" />
      <circle cx="6" cy="19.5" r="1" fill={THEME.bgDeep} />
      <circle cx="12" cy="19.5" r="1" fill={THEME.bgDeep} />
      <circle cx="18" cy="19.5" r="1" fill={THEME.bgDeep} />
    </svg>
  );
}

export function HeartIcon({ size = 20, color = THEME.waxSeal }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" />
    </svg>
  );
}

export function WaxSealIcon({ size = 20, color = THEME.waxSeal }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={color} />
      <circle cx="12" cy="12" r="7" fill="none" stroke={THEME.gold} strokeWidth="0.5" opacity="0.5" />
      <path d="M12 6L13.5 10H17.5L14 12.5L15.5 17L12 14L8.5 17L10 12.5L6.5 10H10.5Z" fill={THEME.gold} opacity="0.4" />
    </svg>
  );
}

export function RoseIcon({ size = 20, color = THEME.crimsonLight }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <ellipse cx="12" cy="10" rx="5" ry="4" />
      <ellipse cx="12" cy="10" rx="3" ry="2.5" fill={THEME.waxSeal} />
      <path d="M12 14V22" stroke="#4a7540" strokeWidth="1.5" fill="none" />
      <path d="M12 17C14 15 16 16 16 16" stroke="#4a7540" strokeWidth="1" fill="none" />
      <path d="M12 19C10 17 8 18 8 18" stroke="#4a7540" strokeWidth="1" fill="none" />
    </svg>
  );
}

// ─── Ornament Row (decorative divider) ──────────────────────────────

interface OrnamentRowProps {
  className?: string;
  symbol?: 'fleur' | 'crown' | 'heart' | 'seal' | 'rose';
}

export function OrnamentRow({ className = '', symbol = 'fleur' }: OrnamentRowProps) {
  const SymbolComponent = {
    fleur: FleurDeLis,
    crown: CrownIcon,
    heart: HeartIcon,
    seal: WaxSealIcon,
    rose: RoseIcon,
  }[symbol];

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <div
        className="flex-1 max-w-24 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${THEME.gold}40, transparent)` }}
      />
      <SymbolComponent size={16} color={`${THEME.gold}80`} />
      <div
        className="flex-1 max-w-24 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${THEME.gold}40, transparent)` }}
      />
    </div>
  );
}

// ─── Floating Ornaments (ambient decorations) ───────────────────────

export function FloatingOrnaments() {
  const ornaments = [
    { x: '5%', y: '15%', delay: 0, symbol: 'fleur' as const },
    { x: '90%', y: '25%', delay: 2, symbol: 'crown' as const },
    { x: '8%', y: '70%', delay: 4, symbol: 'seal' as const },
    { x: '92%', y: '60%', delay: 1, symbol: 'rose' as const },
    { x: '50%', y: '5%', delay: 3, symbol: 'heart' as const },
  ];

  const symbolMap = {
    fleur: FleurDeLis,
    crown: CrownIcon,
    seal: WaxSealIcon,
    rose: RoseIcon,
    heart: HeartIcon,
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {ornaments.map((o, i) => {
        const Symbol = symbolMap[o.symbol];
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: o.x, top: o.y }}
            animate={{
              y: [0, -10, -5, -12, 0],
              rotate: [0, 5, -3, 2, 0],
              opacity: [0.08, 0.12, 0.06, 0.1, 0.08],
            }}
            transition={{
              duration: 12 + i * 2,
              delay: o.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Symbol size={24 + i * 4} color={`${THEME.gold}18`} />
          </motion.div>
        );
      })}
    </div>
  );
}
