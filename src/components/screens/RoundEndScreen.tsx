import { motion } from 'framer-motion';
import type { GameState } from '../../types/game';
import { THEME } from '../../styles/loveLetterStyles';
import { CharacterCard } from '../cards/CharacterCard';
import { OrnamentRow, CrownIcon } from '../ui/Ornaments';
import { BackgroundScene } from '../ui/BackgroundScene';
import { Button } from '../common/Button';

interface RoundEndScreenProps {
  gameState: GameState;
  onNextRound: () => void;
}

export function RoundEndScreen({ gameState, onNextRound }: RoundEndScreenProps) {
  const result = gameState.lastRoundResult;
  if (!result) return null;

  const winner = gameState.players.find((p) => p.id === result.winnerId);
  const spyBonusPlayer = result.spyBonusPlayerId
    ? gameState.players.find((p) => p.id === result.spyBonusPlayerId)
    : null;

  const reasonText = {
    lastStanding: 'Last one standing!',
    highestCard: 'Highest card value!',
    tiebreak: 'Won by tiebreak (discard totals)!',
  }[result.reason];

  // Check if someone has won the game
  const gameWon = gameState.players.some((p) => p.tokens >= gameState.tokensToWin);

  return (
    <div className="bg-royal min-h-screen flex items-center justify-center p-4">
      <BackgroundScene />

      <motion.div
        className="glass-modal w-full max-w-lg p-6 relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <CrownIcon size={40} color={THEME.gold} />
          </motion.div>
          <h2
            className="text-2xl font-bold mt-2"
            style={{
              fontFamily: "'Cinzel', serif",
              color: THEME.goldLight,
              textShadow: `0 0 16px ${THEME.goldGlow}`,
            }}
          >
            Round {gameState.roundNumber} Complete
          </h2>
          <OrnamentRow symbol="heart" className="my-3" />
        </div>

        {/* Winner */}
        <motion.div
          className="glass p-4 rounded-xl text-center mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm mb-1" style={{ color: THEME.textSecondary }}>Winner</p>
          <p
            className="text-xl font-bold"
            style={{
              fontFamily: "'Cinzel', serif",
              color: winner?.color ?? THEME.goldLight,
              textShadow: `0 0 12px ${winner?.color ?? THEME.gold}40`,
            }}
          >
            {result.winnerName}
          </p>
          <p className="text-sm mt-1" style={{ color: THEME.textSecondary }}>
            {reasonText}
          </p>
        </motion.div>

        {/* Revealed Hands (deck exhaustion) */}
        {result.revealedHands && result.revealedHands.length > 0 && (
          <motion.div
            className="mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p
              className="text-xs uppercase tracking-wider text-center mb-2"
              style={{ color: THEME.gold, fontFamily: "'Cinzel', serif", fontSize: 10 }}
            >
              Revealed Hands
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              {result.revealedHands.map((hand) => (
                <div key={hand.playerId} className="text-center">
                  <p className="text-xs mb-1" style={{ color: THEME.textSecondary }}>
                    {hand.playerName}
                  </p>
                  <CharacterCard card={hand.card} size="sm" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Spy Bonus */}
        {spyBonusPlayer && (
          <motion.div
            className="glass-subtle p-3 rounded-lg text-center mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-xs" style={{ color: THEME.textSecondary }}>Spy Bonus Token</p>
            <p className="text-sm font-semibold" style={{ color: CARD_COLORS_ACCENT[0] }}>
              {spyBonusPlayer.name} earns a bonus favor token!
            </p>
          </motion.div>
        )}

        {/* Token Standings */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p
            className="text-xs uppercase tracking-wider text-center mb-2"
            style={{ color: THEME.gold, fontFamily: "'Cinzel', serif", fontSize: 10 }}
          >
            Favor Tokens ({gameState.tokensToWin} to win)
          </p>
          <div className="space-y-1">
            {[...gameState.players]
              .sort((a, b) => b.tokens - a.tokens)
              .map((player) => (
                <div
                  key={player.id}
                  className="glass-subtle flex items-center gap-2 p-2 rounded-lg"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: `${player.color}30`, color: player.color }}
                  >
                    {player.name.charAt(0)}
                  </div>
                  <span className="text-sm flex-1" style={{ color: THEME.textPrimary }}>
                    {player.name}
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: player.tokens }).map((_, i) => (
                      <div key={i} className="wax-seal-token" />
                    ))}
                    {player.tokens === 0 && (
                      <span className="text-xs" style={{ color: THEME.textMuted }}>0</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </motion.div>

        <OrnamentRow symbol="fleur" className="my-4" />

        {/* Action */}
        <Button
          variant="gold"
          size="lg"
          className="w-full"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: '2px' }}
          onClick={onNextRound}
        >
          {gameWon ? 'VIEW RESULTS' : 'NEXT ROUND'}
        </Button>
      </motion.div>
    </div>
  );
}

// Quick reference for spy accent color
const CARD_COLORS_ACCENT: Record<number, string> = { 0: '#7c6db5' };
