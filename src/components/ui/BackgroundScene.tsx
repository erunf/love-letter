import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface FloatingElement {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  type: 'seal' | 'scroll' | 'candle';
}

function WaxSealSVG({ size, opacity }: { size: number; opacity: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" opacity={opacity}>
      <circle cx="20" cy="20" r="18" fill="rgba(155, 35, 53, 0.15)" stroke="rgba(201, 168, 76, 0.1)" strokeWidth="1" />
      <circle cx="20" cy="20" r="12" fill="rgba(155, 35, 53, 0.1)" />
      <circle cx="20" cy="20" r="6" fill="rgba(155, 35, 53, 0.08)" />
      <path d="M20 8 L22 16 L20 14 L18 16 Z" fill="rgba(201, 168, 76, 0.08)" />
    </svg>
  );
}

function ScrollSVG({ size, opacity }: { size: number; opacity: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 50 30" fill="none" opacity={opacity}>
      <rect x="5" y="5" width="40" height="20" rx="2" fill="rgba(244, 228, 193, 0.04)" stroke="rgba(201, 168, 76, 0.06)" strokeWidth="0.5" />
      <ellipse cx="5" cy="15" rx="4" ry="10" fill="rgba(244, 228, 193, 0.03)" stroke="rgba(201, 168, 76, 0.06)" strokeWidth="0.5" />
      <ellipse cx="45" cy="15" rx="4" ry="10" fill="rgba(244, 228, 193, 0.03)" stroke="rgba(201, 168, 76, 0.06)" strokeWidth="0.5" />
    </svg>
  );
}

function CandleGlowSVG({ size, opacity }: { size: number; opacity: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" opacity={opacity}>
      <circle cx="15" cy="15" r="14" fill="url(#candleGrad)" />
      <defs>
        <radialGradient id="candleGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(201, 168, 76, 0.08)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function BackgroundScene() {
  const elements = useMemo<FloatingElement[]>(() => {
    const items: FloatingElement[] = [];
    for (let i = 0; i < 8; i++) {
      items.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 20 + Math.random() * 30,
        delay: Math.random() * 5,
        duration: 15 + Math.random() * 20,
        opacity: 0.3 + Math.random() * 0.4,
        type: (['seal', 'scroll', 'candle'] as const)[i % 3],
      });
    }
    return items;
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Candlelight ambient glow at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: '80vw',
          height: '30vh',
          background: 'radial-gradient(ellipse, rgba(201, 168, 76, 0.04) 0%, transparent 70%)',
          animation: 'candle-flicker 4s ease-in-out infinite',
        }}
      />

      {/* Corner vignettes */}
      <div
        className="absolute bottom-0 left-0"
        style={{
          width: '40vw',
          height: '40vh',
          background: 'radial-gradient(ellipse at bottom left, rgba(139, 26, 43, 0.08) 0%, transparent 60%)',
        }}
      />
      <div
        className="absolute bottom-0 right-0"
        style={{
          width: '40vw',
          height: '40vh',
          background: 'radial-gradient(ellipse at bottom right, rgba(155, 35, 53, 0.06) 0%, transparent 60%)',
        }}
      />

      {/* Floating decorative elements */}
      {elements.map((el) => (
        <motion.div
          key={el.id}
          className="absolute"
          style={{ left: `${el.x}%`, top: `${el.y}%` }}
          animate={{
            y: [0, -15, -5, -20, 0],
            x: [0, 5, -3, 8, 0],
            rotate: [0, 3, -2, 4, 0],
          }}
          transition={{
            duration: el.duration,
            delay: el.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {el.type === 'seal' && <WaxSealSVG size={el.size} opacity={el.opacity} />}
          {el.type === 'scroll' && <ScrollSVG size={el.size} opacity={el.opacity} />}
          {el.type === 'candle' && <CandleGlowSVG size={el.size} opacity={el.opacity} />}
        </motion.div>
      ))}
    </div>
  );
}
