import { THEME } from '../../styles/loveLetterStyles';

const SIZES = {
  sm: { w: 60, h: 90 },
  md: { w: 80, h: 120 },
  lg: { w: 120, h: 180 },
};

interface CardBackProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  count?: number; // Optional: show a count overlay (for deck)
}

export function CardBack({ size = 'md', className = '', count }: CardBackProps) {
  const s = SIZES[size];
  const iconScale = s.w * 0.55;

  return (
    <div
      className={`card-parchment relative flex items-center justify-center select-none ${className}`}
      style={{
        width: s.w,
        height: s.h,
        background: `linear-gradient(135deg, ${THEME.crimsonDark} 0%, #2a0f18 50%, ${THEME.waxSealDark} 100%)`,
        borderColor: `${THEME.gold}30`,
      }}
    >
      {/* Inner ornate border */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 3,
          border: `1px solid ${THEME.gold}18`,
          borderRadius: 6,
        }}
      />

      {/* Second inner border */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 6,
          border: `0.5px solid ${THEME.gold}10`,
          borderRadius: 4,
        }}
      />

      {/* Wax seal design */}
      <svg width={iconScale} height={iconScale} viewBox="0 0 60 60" fill="none">
        {/* Outer ring */}
        <circle cx="30" cy="30" r="26" fill={THEME.waxSeal} opacity="0.3" />
        <circle cx="30" cy="30" r="26" fill="none" stroke={THEME.gold} strokeWidth="1" opacity="0.25" />

        {/* Middle ring */}
        <circle cx="30" cy="30" r="18" fill="none" stroke={THEME.gold} strokeWidth="0.5" opacity="0.2" />

        {/* Inner seal */}
        <circle cx="30" cy="30" r="12" fill={THEME.waxSeal} opacity="0.2" />

        {/* Star pattern */}
        <path
          d="M30 16L32.5 25H42L34.5 30.5L37 40L30 34.5L23 40L25.5 30.5L18 25H27.5Z"
          fill={THEME.gold}
          opacity="0.15"
        />

        {/* Center dot */}
        <circle cx="30" cy="30" r="3" fill={THEME.gold} opacity="0.12" />

        {/* Corner decorations */}
        <path d="M8 8L14 12L12 14L8 8Z" fill={THEME.gold} opacity="0.08" />
        <path d="M52 8L46 12L48 14L52 8Z" fill={THEME.gold} opacity="0.08" />
        <path d="M8 52L14 48L12 46L8 52Z" fill={THEME.gold} opacity="0.08" />
        <path d="M52 52L46 48L48 46L52 52Z" fill={THEME.gold} opacity="0.08" />
      </svg>

      {/* Count overlay */}
      {count !== undefined && (
        <div
          className="absolute bottom-1 right-1 flex items-center justify-center rounded-full text-xs font-bold"
          style={{
            width: size === 'sm' ? 16 : 20,
            height: size === 'sm' ? 16 : 20,
            background: THEME.bgDeep,
            color: THEME.gold,
            border: `1px solid ${THEME.gold}40`,
            fontFamily: "'Cinzel', serif",
            fontSize: size === 'sm' ? 8 : 10,
          }}
        >
          {count}
        </div>
      )}
    </div>
  );
}
