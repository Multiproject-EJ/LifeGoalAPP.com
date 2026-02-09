import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  selectWinningSegment,
  calculateRotationAngle,
  getSegmentIndex,
  formatRewards,
} from './wheelOfWinsState';
import {
  WHEEL_SEGMENTS,
  SPIN_DURATION,
  type WheelOfWinsSession,
  type WheelSegment,
} from './wheelOfWinsTypes';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import { awardDice, awardGameTokens, logGameSession } from '../../../../services/gameRewards';
import { LuckyRollCelebration } from '../../daily-treats/LuckyRollCelebration';
import './wheelOfWins.css';

// Sound stubs (no-op implementations)
const playWheelSpin = () => {};
const playWheelTick = () => {};
const playWheelStop = () => {};
const playWinReveal = () => {};

interface WheelOfWinsProps {
  session: Session;
  onClose: () => void;
  onComplete: (rewards: { coins: number; dice: number; tokens: number }) => void;
}

export function WheelOfWins({ session, onClose, onComplete }: WheelOfWinsProps) {
  const userId = session.user.id;
  
  const [gameSession, setGameSession] = useState<WheelOfWinsSession>({
    hasSpun: false,
    isSpinning: false,
    selectedSegment: null,
    rewards: {
      coins: 0,
      dice: 0,
      tokens: 0,
    },
  });
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Log game session entry
  useEffect(() => {
    logGameSession(userId, {
      gameId: 'wheel_of_wins',
      action: 'enter',
      timestamp: new Date().toISOString(),
      metadata: {},
    });
  }, [userId]);

  const handleSpin = useCallback(() => {
    if (gameSession.hasSpun || gameSession.isSpinning) return;

    playWheelSpin();
    setGameSession(prev => ({ ...prev, isSpinning: true }));

    // Select winning segment using weighted random
    const winningSegment = selectWinningSegment();
    const segmentIndex = getSegmentIndex(winningSegment);
    const targetRotation = calculateRotationAngle(segmentIndex);

    // Start spinning animation
    setWheelRotation(targetRotation);

    // Tick sound during spin (optional - could add interval for continuous ticks)
    const tickInterval = setInterval(() => {
      playWheelTick();
    }, 100);

    // After spin duration, stop and reveal win
    setTimeout(() => {
      clearInterval(tickInterval);
      playWheelStop();

      setGameSession(prev => ({
        ...prev,
        isSpinning: false,
        hasSpun: true,
        selectedSegment: winningSegment,
        rewards: winningSegment.rewards,
      }));

      // Award rewards
      if (winningSegment.rewards.coins > 0) {
        awardGold(
          userId,
          winningSegment.rewards.coins,
          `Wheel of Wins: ${winningSegment.label}`
        );
      }
      if (winningSegment.rewards.dice > 0) {
        awardDice(
          userId,
          winningSegment.rewards.dice,
          'wheel_of_wins',
          `Wheel of Wins: ${winningSegment.label}`
        );
      }
      if (winningSegment.rewards.tokens > 0) {
        awardGameTokens(
          userId,
          winningSegment.rewards.tokens,
          'wheel_of_wins',
          `Wheel of Wins: ${winningSegment.label}`
        );
      }

      // Show celebration
      playWinReveal();
      setShowCelebration(true);

      // Log completion
      logGameSession(userId, {
        gameId: 'wheel_of_wins',
        action: 'complete',
        timestamp: new Date().toISOString(),
        metadata: {
          segment: winningSegment.type,
          rewards: winningSegment.rewards,
        },
      });

      // Hide celebration after delay
      setTimeout(() => {
        setShowCelebration(false);
      }, 2000);
    }, SPIN_DURATION);
  }, [gameSession.hasSpun, gameSession.isSpinning, userId]);

  const handleCollect = useCallback(() => {
    onComplete(gameSession.rewards);
    onClose();
  }, [gameSession.rewards, onComplete, onClose]);

  // Calculate conic-gradient for wheel
  const wheelGradient = useMemo(() => {
    const segmentAngle = 360 / WHEEL_SEGMENTS.length;
    const gradientStops = WHEEL_SEGMENTS.flatMap((segment, index) => {
      const startAngle = index * segmentAngle;
      const endAngle = (index + 1) * segmentAngle;
      return [
        `${segment.color} ${startAngle}deg`,
        `${segment.color} ${endAngle}deg`,
      ];
    });
    return `conic-gradient(${gradientStops.join(', ')})`;
  }, []);

  return (
    <div className="wheel-of-wins">
      <div className="wheel-of-wins__backdrop" />
      
      <div className="wheel-of-wins__container">
        <div className="wheel-of-wins__header">
          <h2 className="wheel-of-wins__title">🎡 Wheel of Wins</h2>
          <button
            type="button"
            className="wheel-of-wins__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="wheel-of-wins__game-area">
          {/* Pointer indicator at top */}
          <div className="wheel-of-wins__pointer" />

          {/* The wheel */}
          <div
            ref={wheelRef}
            className={`wheel-of-wins__wheel ${gameSession.isSpinning ? 'wheel-of-wins__wheel--spinning' : ''}`}
            style={{
              background: wheelGradient,
              transform: `rotate(${wheelRotation}deg)`,
              transition: gameSession.isSpinning
                ? `transform ${SPIN_DURATION}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
                : 'none',
            }}
          >
            {/* Segment labels */}
            {WHEEL_SEGMENTS.map((segment, index) => {
              const segmentAngle = 360 / WHEEL_SEGMENTS.length;
              const rotation = index * segmentAngle + segmentAngle / 2;
              
              return (
                <div
                  key={segment.id}
                  className="wheel-of-wins__segment-label"
                  style={{
                    transform: `rotate(${rotation}deg) translateY(-110px)`,
                  }}
                >
                  <div
                    className="wheel-of-wins__segment-content"
                    style={{
                      transform: `rotate(-${rotation}deg)`,
                    }}
                  >
                    <div className="wheel-of-wins__segment-emoji">{segment.emoji}</div>
                    <div className="wheel-of-wins__segment-text">{segment.label}</div>
                  </div>
                </div>
              );
            })}

            {/* Center circle */}
            <div className="wheel-of-wins__center" />
          </div>

          {/* Result display */}
          {gameSession.selectedSegment && !gameSession.isSpinning && (
            <div className="wheel-of-wins__result">
              <div className="wheel-of-wins__result-emoji">
                {gameSession.selectedSegment.emoji}
              </div>
              <div className="wheel-of-wins__result-text">
                {gameSession.selectedSegment.type === 'jackpot' ? (
                  <>
                    <div className="wheel-of-wins__result-jackpot">🎉 JACKPOT! 🎉</div>
                    <div className="wheel-of-wins__result-rewards">
                      {formatRewards(gameSession.selectedSegment.rewards)}
                    </div>
                  </>
                ) : (
                  <div className="wheel-of-wins__result-rewards">
                    You won {formatRewards(gameSession.selectedSegment.rewards)}!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="wheel-of-wins__actions">
          {!gameSession.hasSpun && !gameSession.isSpinning && (
            <button
              type="button"
              className="wheel-of-wins__button wheel-of-wins__button--primary"
              onClick={handleSpin}
            >
              SPIN!
            </button>
          )}

          {gameSession.hasSpun && !gameSession.isSpinning && (
            <button
              type="button"
              className="wheel-of-wins__button wheel-of-wins__button--primary"
              onClick={handleCollect}
            >
              Collect & Return
            </button>
          )}

          {gameSession.isSpinning && (
            <div className="wheel-of-wins__spinning-text">Spinning...</div>
          )}
        </div>
      </div>

      {showCelebration && (
        <LuckyRollCelebration
          type={gameSession.selectedSegment?.type === 'jackpot' ? 'big' : 'medium'}
          message={
            gameSession.selectedSegment?.type === 'jackpot'
              ? '🏆 JACKPOT! 🏆'
              : `You won ${formatRewards(gameSession.rewards)}!`
          }
          onComplete={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
