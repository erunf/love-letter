import { motion } from 'framer-motion';
import type { Player } from '../../types/game';
import type { SnapshotPlayer, GameSnapshot } from '../../types/protocol';
import { THEME } from '../../styles/loveLetterStyles';
import { CrownIcon, FleurDeLis, WaxSealIcon, RoseIcon, HeartIcon } from '../ui/Ornaments';
import { CharacterCard } from '../cards/CharacterCard';

// ─── Avatar Icons ───────────────────────────────────────────────────

function AvatarIcon({ avatar, size = 28, color }: { avatar: string; size?: number; color: string }) {
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

// ─── Wax Seal Token ─────────────────────────────────────────────────

function TokenDisplay({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="wax-seal-token" />
      ))}
    </div>
  );
}

// ─── Shield badge for Handmaid protection ───────────────────────────

function ProtectedBadge() {
  return (
    <div
      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
      style={{
        background: THEME.protected,
        color: '#fff',
        fontSize: 10,
        boxShadow: `0 0 6px ${THEME.protected}60`,
      }}
      title="Protected by Handmaid"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L4 6V12C4 18 12 22 12 22C12 22 20 18 20 12V6L12 2Z" />
      </svg>
    </div>
  );
}

// ─── Discard Pile Mini Preview ──────────────────────────────────────

function DiscardPilePreview({ discardPile }: { discardPile: { value: number; name: string }[] }) {
  if (discardPile.length === 0) return null;
  return (
    <div className="flex gap-0.5 flex-wrap mt-1">
      {discardPile.map((card, i) => (
        <div
          key={i}
          className="rounded px-1 text-center"
          style={{
            fontSize: 8,
            background: 'rgba(244, 228, 193, 0.08)',
            color: THEME.textSecondary,
            border: '0.5px solid rgba(201, 168, 76, 0.1)',
            lineHeight: '14px',
          }}
          title={card.name}
        >
          {card.value}
        </div>
      ))}
    </div>
  );
}

// ─── PlayerArea Component (local game) ──────────────────────────────

interface PlayerAreaProps {
  player: Player;
  isActive: boolean;
  isCurrentUser?: boolean;
  compact?: boolean;
}

export function PlayerArea({ player, isActive, isCurrentUser = false, compact = false }: PlayerAreaProps) {
  return (
    <motion.div
      className={`glass-card relative p-3 ${isActive ? 'player-active' : ''} ${!player.isAlive ? 'player-eliminated' : ''} ${player.isProtected ? 'player-protected' : ''}`}
      style={{
        borderColor: isActive ? `${THEME.gold}60` : isCurrentUser ? `${player.color}40` : undefined,
        minWidth: compact ? 100 : 140,
      }}
      layout
      animate={{ opacity: player.isAlive ? 1 : 0.5 }}
    >
      {player.isProtected && <ProtectedBadge />}

      {/* Header: Avatar + Name */}
      <div className="flex items-center gap-2 mb-1">
        <div
          className="rounded-full p-1 flex items-center justify-center"
          style={{
            background: `${player.color}20`,
            border: `1px solid ${player.color}40`,
          }}
        >
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <AvatarIcon avatar={player.avatar} size={16} color={player.color} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-semibold truncate"
            style={{ color: player.isAlive ? THEME.textPrimary : THEME.textMuted, fontFamily: "'Cinzel', serif" }}
          >
            {player.name}
          </div>
          <div className="flex items-center gap-1">
            {player.type === 'bot' && (
              <span className="text-xs opacity-50" style={{ fontSize: 8 }}>
                BOT
              </span>
            )}
            {!player.isAlive && (
              <span style={{ fontSize: 8, color: THEME.eliminated }}>ELIMINATED</span>
            )}
          </div>
        </div>
      </div>

      {/* Tokens */}
      <TokenDisplay count={player.tokens} />

      {/* Hand (only if current user can see) */}
      {isCurrentUser && player.hand.length > 0 && !compact && (
        <div className="flex gap-1 mt-2">
          {player.hand.map((card, i) => (
            <CharacterCard key={`${card.name}-${i}`} card={card} size="sm" />
          ))}
        </div>
      )}

      {/* Discard pile */}
      <DiscardPilePreview discardPile={player.discardPile} />
    </motion.div>
  );
}

// ─── Online PlayerArea (reads SnapshotPlayer) ───────────────────────

interface OnlinePlayerAreaProps {
  player: SnapshotPlayer;
  isActive: boolean;
  isYou: boolean;
  compact?: boolean;
  snapshot?: GameSnapshot;
}

export function OnlinePlayerArea({ player, isActive, isYou, compact = false }: OnlinePlayerAreaProps) {
  return (
    <motion.div
      className={`glass-card relative p-3 ${isActive ? 'player-active' : ''} ${!player.isAlive ? 'player-eliminated' : ''} ${player.isProtected ? 'player-protected' : ''}`}
      style={{
        borderColor: isActive ? `${THEME.gold}60` : isYou ? `${player.color}40` : undefined,
        minWidth: compact ? 100 : 140,
      }}
      layout
      animate={{ opacity: player.isAlive ? 1 : 0.5 }}
    >
      {player.isProtected && <ProtectedBadge />}

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div
          className="rounded-full p-1 flex items-center justify-center"
          style={{
            background: `${player.color}20`,
            border: `1px solid ${player.color}40`,
          }}
        >
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <AvatarIcon avatar={player.avatar} size={16} color={player.color} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-semibold truncate"
            style={{ color: player.isAlive ? THEME.textPrimary : THEME.textMuted, fontFamily: "'Cinzel', serif" }}
          >
            {player.name} {isYou && '(You)'}
          </div>
          <div className="flex items-center gap-1">
            {player.type === 'bot' && (
              <span className="text-xs opacity-50" style={{ fontSize: 8 }}>
                BOT
              </span>
            )}
            {!player.isAlive && (
              <span style={{ fontSize: 8, color: THEME.eliminated }}>ELIMINATED</span>
            )}
          </div>
        </div>
      </div>

      {/* Tokens */}
      <TokenDisplay count={player.tokens} />

      {/* Hand (only visible if it's your hand) */}
      {isYou && player.hand && player.hand.length > 0 && !compact && (
        <div className="flex gap-1 mt-2">
          {player.hand.map((card, i) => (
            <CharacterCard key={`${card.name}-${i}`} card={card} size="sm" />
          ))}
        </div>
      )}

      {/* Show card backs for other players */}
      {!isYou && player.isAlive && player.handSize > 0 && !compact && (
        <div className="flex gap-0.5 mt-2">
          {Array.from({ length: player.handSize }).map((_, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                width: 20,
                height: 30,
                background: `linear-gradient(135deg, ${THEME.crimsonDark}, ${THEME.waxSealDark})`,
                border: `0.5px solid ${THEME.gold}20`,
              }}
            />
          ))}
        </div>
      )}

      {/* Discard pile */}
      <DiscardPilePreview discardPile={player.discardPile} />
    </motion.div>
  );
}
