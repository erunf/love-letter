import { motion } from 'framer-motion';
import type { Card } from '../../types/game';
import { CARD_COLORS, THEME } from '../../styles/loveLetterStyles';
import { getCardDef } from '../../constants/loveLetter';

// ─── Character SVG Icons ────────────────────────────────────────────

function SpyIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 6C20 6 16 10 16 14V18L14 22C14 22 12 28 16 32C18 34 20 36 24 40C28 36 30 34 32 32C36 28 34 22 34 22L32 18V14C32 10 28 6 24 6Z" fill={color} opacity="0.2" />
      <path d="M18 16C18 16 20 14 24 14C28 14 30 16 30 16V20L28 24H20L18 20V16Z" fill={color} opacity="0.35" />
      <ellipse cx="21" cy="18" rx="1.5" ry="1" fill={color} opacity="0.7" />
      <ellipse cx="27" cy="18" rx="1.5" ry="1" fill={color} opacity="0.7" />
      <path d="M16 12C16 12 18 8 24 8C30 8 32 12 32 12" stroke={color} strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M14 14L18 16M34 14L30 16" stroke={color} strokeWidth="1" opacity="0.3" />
      <path d="M22 22C22 22 23 23 24 23C25 23 26 22 26 22" stroke={color} strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

function GuardIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M18 8H30L32 12L30 14H18L16 12L18 8Z" fill={color} opacity="0.35" />
      <rect x="22" y="4" width="4" height="6" rx="1" fill={color} opacity="0.25" />
      <path d="M20 14V22L24 26L28 22V14" stroke={color} strokeWidth="1.5" fill={color} opacity="0.2" />
      <ellipse cx="22" cy="18" rx="1" ry="1.2" fill={color} opacity="0.6" />
      <ellipse cx="26" cy="18" rx="1" ry="1.2" fill={color} opacity="0.6" />
      <line x1="24" y1="20" x2="24" y2="22" stroke={color} strokeWidth="0.8" opacity="0.4" />
      <path d="M14 30L16 20L18 18" stroke={color} strokeWidth="1.5" opacity="0.3" />
      <rect x="12" y="28" width="2" height="14" rx="1" fill={color} opacity="0.3" />
      <path d="M10 28L14 26L14 30L10 32Z" fill={color} opacity="0.25" />
      <path d="M30 18L32 20L34 30" stroke={color} strokeWidth="1.5" opacity="0.3" />
      <ellipse cx="35" cy="33" rx="3" ry="4" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" strokeOpacity="0.3" />
    </svg>
  );
}

function PriestIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="16" y="12" width="16" height="22" rx="2" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" strokeOpacity="0.35" />
      <line x1="16" y1="16" x2="32" y2="16" stroke={color} strokeWidth="0.5" opacity="0.3" />
      <rect x="18" y="14" width="12" height="1" rx="0.5" fill={color} opacity="0.15" />
      <line x1="24" y1="8" x2="24" y2="12" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <line x1="21" y1="10" x2="27" y2="10" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <line x1="18" y1="20" x2="30" y2="20" stroke={color} strokeWidth="0.5" opacity="0.15" />
      <line x1="18" y1="23" x2="30" y2="23" stroke={color} strokeWidth="0.5" opacity="0.15" />
      <line x1="18" y1="26" x2="30" y2="26" stroke={color} strokeWidth="0.5" opacity="0.15" />
      <line x1="18" y1="29" x2="26" y2="29" stroke={color} strokeWidth="0.5" opacity="0.15" />
      <circle cx="24" cy="40" r="3" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="24" y1="34" x2="24" y2="37" stroke={color} strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

function BaronIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 8L26 12H22L24 8Z" fill={color} opacity="0.5" />
      <line x1="24" y1="12" x2="24" y2="20" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <line x1="16" y1="20" x2="32" y2="20" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <path d="M16 20L12 32L16 30L20 36Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" strokeOpacity="0.35" />
      <path d="M32 20L36 32L32 30L28 36Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" strokeOpacity="0.35" />
      <circle cx="16" cy="34" r="3" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" strokeOpacity="0.3" />
      <circle cx="32" cy="34" r="3" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" strokeOpacity="0.3" />
      <circle cx="16" cy="34" r="1" fill={color} opacity="0.3" />
      <circle cx="32" cy="34" r="1" fill={color} opacity="0.3" />
    </svg>
  );
}

function HandmaidIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M12 14C12 14 16 8 24 8C32 8 36 14 36 14L38 24C38 24 36 36 24 40C12 36 10 24 10 24L12 14Z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.2" strokeOpacity="0.35" />
      <path d="M16 16C16 16 19 12 24 12C29 12 32 16 32 16L33 22C33 22 32 32 24 35C16 32 15 22 15 22L16 16Z" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.8" strokeOpacity="0.2" />
      <line x1="24" y1="14" x2="24" y2="32" stroke={color} strokeWidth="0.8" opacity="0.2" />
      <line x1="16" y1="22" x2="32" y2="22" stroke={color} strokeWidth="0.8" opacity="0.2" />
      <circle cx="24" cy="22" r="3" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.8" strokeOpacity="0.25" />
    </svg>
  );
}

function PrinceIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M14 16L18 8L21 14L24 6L27 14L30 8L34 16H14Z" fill={color} opacity="0.3" />
      <rect x="14" y="16" width="20" height="4" rx="1" fill={color} opacity="0.25" />
      <circle cx="18" cy="18" r="1" fill={color} opacity="0.5" />
      <circle cx="24" cy="18" r="1.2" fill={color} opacity="0.6" />
      <circle cx="30" cy="18" r="1" fill={color} opacity="0.5" />
      <circle cx="18" cy="10" r="1.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
      <circle cx="24" cy="7" r="1.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
      <circle cx="30" cy="10" r="1.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
      <path d="M20 24C20 24 22 26 24 26C26 26 28 24 28 24L30 36H18L20 24Z" fill={color} opacity="0.15" />
    </svg>
  );
}

function ChancellorIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="12" y="10" width="20" height="28" rx="2" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" strokeOpacity="0.3" />
      <line x1="15" y1="16" x2="29" y2="16" stroke={color} strokeWidth="0.5" opacity="0.2" />
      <line x1="15" y1="20" x2="29" y2="20" stroke={color} strokeWidth="0.5" opacity="0.2" />
      <line x1="15" y1="24" x2="29" y2="24" stroke={color} strokeWidth="0.5" opacity="0.2" />
      <line x1="15" y1="28" x2="25" y2="28" stroke={color} strokeWidth="0.5" opacity="0.2" />
      <path d="M30 8L34 10L36 42L32 40L30 8Z" fill={color} opacity="0.25" />
      <circle cx="33" cy="9" r="2" fill={color} opacity="0.2" />
      <path d="M34 10C36 8 38 9 38 9" stroke={color} strokeWidth="0.8" opacity="0.3" />
      <circle cx="12" cy="38" r="3" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.8" strokeOpacity="0.2" />
    </svg>
  );
}

function KingIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M12 18L16 8L20 14L24 4L28 14L32 8L36 18H12Z" fill={color} opacity="0.35" />
      <rect x="12" y="18" width="24" height="5" rx="1" fill={color} opacity="0.3" />
      <circle cx="16" cy="20.5" r="1.2" fill={THEME.bgDeep} opacity="0.5" />
      <circle cx="24" cy="20.5" r="1.5" fill={THEME.bgDeep} opacity="0.5" />
      <circle cx="32" cy="20.5" r="1.2" fill={THEME.bgDeep} opacity="0.5" />
      <circle cx="24" cy="5.5" r="2" fill={color} opacity="0.4" />
      <line x1="24" y1="23" x2="24" y2="32" stroke={color} strokeWidth="2" opacity="0.25" />
      <circle cx="24" cy="32" r="4" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" strokeOpacity="0.25" />
      <line x1="24" y1="36" x2="24" y2="42" stroke={color} strokeWidth="1.5" opacity="0.2" />
      <line x1="20" y1="40" x2="28" y2="40" stroke={color} strokeWidth="1.5" opacity="0.2" />
    </svg>
  );
}

function CountessIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <ellipse cx="24" cy="22" rx="12" ry="14" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" strokeOpacity="0.3" />
      <ellipse cx="24" cy="22" rx="9" ry="11" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="0.5" strokeOpacity="0.2" />
      <circle cx="24" cy="18" r="4" fill={color} opacity="0.1" />
      <ellipse cx="22" cy="17" rx="1" ry="1.2" fill={color} opacity="0.4" />
      <ellipse cx="26" cy="17" rx="1" ry="1.2" fill={color} opacity="0.4" />
      <path d="M22 20C22 20 23 21.5 24 21.5C25 21.5 26 20 26 20" stroke={color} strokeWidth="0.6" opacity="0.3" />
      <path d="M14 12C14 12 16 8 18 10" stroke={color} strokeWidth="1" opacity="0.3" />
      <path d="M34 12C34 12 32 8 30 10" stroke={color} strokeWidth="1" opacity="0.3" />
      <line x1="24" y1="36" x2="24" y2="44" stroke={color} strokeWidth="2" opacity="0.2" />
      <circle cx="24" cy="44" r="2" fill={color} opacity="0.15" />
    </svg>
  );
}

function PrincessIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M16 16L19 10L22 14L24 8L26 14L29 10L32 16" stroke={color} strokeWidth="1.2" fill={color} opacity="0.25" />
      <rect x="16" y="16" width="16" height="3" rx="1" fill={color} opacity="0.2" />
      <circle cx="19" cy="11" r="1.5" fill={color} opacity="0.3" />
      <circle cx="24" cy="9" r="2" fill={color} opacity="0.35" />
      <circle cx="29" cy="11" r="1.5" fill={color} opacity="0.3" />
      <circle cx="24" cy="17.5" r="1" fill={color} opacity="0.4" />
      <ellipse cx="24" cy="28" rx="6" ry="4" fill={color} opacity="0.08" />
      <path d="M22 26C22 24 20 22 18 24C16 26 18 30 20 30" stroke={color} strokeWidth="1" opacity="0.3" fill={color} fillOpacity="0.1" />
      <path d="M26 26C26 24 28 22 30 24C32 26 30 30 28 30" stroke={color} strokeWidth="1" opacity="0.3" fill={color} fillOpacity="0.1" />
      <path d="M20 30C20 30 22 34 24 34C26 34 28 30 28 30" stroke={color} strokeWidth="0.8" opacity="0.25" />
      <line x1="24" y1="34" x2="24" y2="42" stroke="#4a7540" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

const CHARACTER_ICONS: Record<number, React.FC<{ color: string }>> = {
  0: SpyIcon,
  1: GuardIcon,
  2: PriestIcon,
  3: BaronIcon,
  4: HandmaidIcon,
  5: PrinceIcon,
  6: ChancellorIcon,
  7: KingIcon,
  8: CountessIcon,
  9: PrincessIcon,
};

// ─── Size Config ────────────────────────────────────────────────────

const SIZES = {
  sm: { w: 60, h: 90, iconSize: 28, valueFontSize: 10, nameFontSize: 8, effectFontSize: 6, valueCircle: 16, padding: 4 },
  md: { w: 80, h: 120, iconSize: 40, valueFontSize: 13, nameFontSize: 10, effectFontSize: 7, valueCircle: 20, padding: 6 },
  lg: { w: 120, h: 180, iconSize: 64, valueFontSize: 18, nameFontSize: 14, effectFontSize: 9, valueCircle: 28, padding: 10 },
};

// ─── CharacterCard Component ────────────────────────────────────────

interface CharacterCardProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  faceDown?: boolean;
}

export function CharacterCard({
  card,
  size = 'md',
  onClick,
  disabled = false,
  highlighted = false,
  faceDown = false,
}: CharacterCardProps) {
  const s = SIZES[size];
  const colors = CARD_COLORS[card.value] ?? CARD_COLORS[0];
  const Icon = CHARACTER_ICONS[card.value] ?? SpyIcon;
  const def = getCardDef(card.name);

  if (faceDown) {
    return <CardBackInline width={s.w} height={s.h} />;
  }

  return (
    <motion.div
      className={`card-parchment relative flex flex-col items-center cursor-pointer select-none ${highlighted ? 'card-highlighted' : ''} ${disabled ? 'card-disabled' : ''}`}
      style={{
        width: s.w,
        height: s.h,
        background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}ee 50%, ${colors.bg}dd 100%)`,
        borderColor: colors.border,
      }}
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? {} : { y: -4, scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      layout
    >
      {/* Inner ornate border */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 3,
          border: `1px solid ${colors.border}40`,
          borderRadius: 6,
        }}
      />

      {/* Value circle (top-left) */}
      <div
        className="absolute flex items-center justify-center font-bold"
        style={{
          top: s.padding,
          left: s.padding,
          width: s.valueCircle,
          height: s.valueCircle,
          borderRadius: '50%',
          background: `radial-gradient(circle at 40% 40%, ${colors.accent}40, ${colors.bg})`,
          border: `1.5px solid ${colors.accent}80`,
          fontSize: s.valueFontSize,
          color: colors.accent,
          fontFamily: "'Cinzel', serif",
        }}
      >
        {card.value}
      </div>

      {/* Character icon */}
      <div
        className="flex items-center justify-center"
        style={{
          width: s.iconSize,
          height: s.iconSize,
          marginTop: size === 'sm' ? s.padding + 10 : s.padding + 14,
        }}
      >
        <Icon color={colors.accent} />
      </div>

      {/* Character name */}
      <div
        className="text-center font-semibold leading-tight mt-1"
        style={{
          fontSize: s.nameFontSize,
          color: colors.accent,
          fontFamily: "'Cinzel', serif",
          letterSpacing: '0.5px',
          textShadow: `0 0 8px ${colors.accent}30`,
        }}
      >
        {card.name}
      </div>

      {/* Effect text */}
      {size !== 'sm' && (
        <div
          className="text-center px-1 mt-auto mb-1 leading-tight opacity-60"
          style={{
            fontSize: s.effectFontSize,
            color: THEME.textSecondary,
            lineHeight: 1.2,
          }}
        >
          {def.effect}
        </div>
      )}

      {/* Corner ornament (bottom-right value) */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          bottom: s.padding,
          right: s.padding,
          fontSize: s.valueFontSize * 0.8,
          color: `${colors.accent}50`,
          fontFamily: "'Cinzel', serif",
          transform: 'rotate(180deg)',
        }}
      >
        {card.value}
      </div>
    </motion.div>
  );
}

// ─── Inline card back (used when faceDown=true) ─────────────────────

function CardBackInline({ width, height }: { width: number; height: number }) {
  return (
    <div
      className="card-parchment flex items-center justify-center"
      style={{
        width,
        height,
        background: `linear-gradient(135deg, ${THEME.crimsonDark} 0%, ${THEME.waxSealDark} 100%)`,
        borderColor: `${THEME.gold}30`,
      }}
    >
      <svg width={width * 0.5} height={width * 0.5} viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="16" fill={THEME.waxSeal} fillOpacity="0.4" stroke={THEME.gold} strokeWidth="1" strokeOpacity="0.3" />
        <circle cx="20" cy="20" r="10" fill="none" stroke={THEME.gold} strokeWidth="0.5" opacity="0.25" />
        <path d="M20 10L22 17H29L23 21.5L25 28.5L20 24L15 28.5L17 21.5L11 17H18Z" fill={THEME.gold} opacity="0.2" />
      </svg>
    </div>
  );
}
