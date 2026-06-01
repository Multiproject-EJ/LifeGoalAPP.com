import { useEffect, useRef, useState } from 'react';
import { playIslandRunSound, triggerIslandRunHaptic } from '../level-worlds/services/islandRunAudio';
import { RewardCard } from './RewardCard';
import type { RewardTier, RewardCurrency, HolidayKey } from '../../../services/treatCalendarService';

type CalendarDoorUnwrapProps = {
  dayNumber: number;
  emoji: string;
  tier: RewardTier;
  currency: RewardCurrency;
  amount: number | null;
  holidayKey: HolidayKey | null;
  onRevealComplete?: () => void;
  onClaim?: () => void;
  isPersonalQuest?: boolean;
  diceLabel?: string;
  /** Visual variant: 'gift' for wrapped present, 'envelope' for sealed envelope */
  variant?: 'gift' | 'envelope';
  /** Bonus Daily Treat visual/tempo treatment; reward and persistence are unchanged. */
  isBonusDoor?: boolean;
};

const DEFAULT_UNWRAP_REVEAL_DELAY_MS = 800;
const BONUS_UNWRAP_REVEAL_DELAY_MS = 420;
const REDUCED_MOTION_UNWRAP_REVEAL_DELAY_MS = 50;

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

/**
 * Unwrap reveal mechanic — CSS gift/envelope unwrap animation.
 * Door shows as wrapped gift or envelope, tapping unwraps to reveal RewardCard.
 */
export const CalendarDoorUnwrap = ({
  dayNumber,
  emoji,
  tier,
  currency,
  amount,
  holidayKey,
  onRevealComplete,
  onClaim,
  isPersonalQuest = false,
  diceLabel,
  variant = 'gift',
  isBonusDoor = false,
}: CalendarDoorUnwrapProps) => {
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const revealTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
    }
  }, []);

  const handleUnwrap = () => {
    if (hasStarted) return;
    setHasStarted(true);
    setIsUnwrapping(true);
    if (isBonusDoor) {
      playIslandRunSound('egg_open');
      triggerIslandRunHaptic('egg_open');
    }

    const revealDelayMs = isBonusDoor
      ? prefersReducedMotion()
        ? REDUCED_MOTION_UNWRAP_REVEAL_DELAY_MS
        : BONUS_UNWRAP_REVEAL_DELAY_MS
      : DEFAULT_UNWRAP_REVEAL_DELAY_MS;

    // Start unwrap animation, then reveal. Bonus doors use a shorter visual-only
    // delay; reward calculation and persistence have already happened upstream.
    revealTimerRef.current = window.setTimeout(() => {
      setIsUnwrapping(false);
      setIsRevealed(true);
      if (isBonusDoor) {
        playIslandRunSound('reward_bar_claim_burst');
        triggerIslandRunHaptic('reward_claim');
      }
      onRevealComplete?.();
    }, revealDelayMs);
  };

  const wrapperIcon = variant === 'envelope' ? '💌' : '🎁';
  const wrapperLabel = variant === 'envelope' ? 'envelope' : 'gift';

  return (
    <div
      className={`door-unwrap door-unwrap--${variant} ${isBonusDoor ? 'door-unwrap--bonus' : ''} ${isUnwrapping ? 'door-unwrap--unwrapping' : ''} ${isRevealed ? 'door-unwrap--revealed' : ''}`}
      onClick={!hasStarted ? handleUnwrap : undefined}
      onKeyDown={(e) => {
        if (!hasStarted && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleUnwrap();
        }
      }}
      role="button"
      tabIndex={hasStarted ? -1 : 0}
      aria-label={`Day ${dayNumber} bonus ${wrapperLabel}. ${isRevealed ? 'Revealed' : 'Tap to unwrap'}`}
    >
      {/* Wrapped state */}
      {!isRevealed && (
        <div className="door-unwrap__wrapper">
          {isBonusDoor && (
            <div className="door-unwrap__bonus-sparkles" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => (
                <span key={`bonus-sparkle-${index}`} className="door-unwrap__bonus-sparkle" />
              ))}
            </div>
          )}
          <div className="door-unwrap__ribbon door-unwrap__ribbon--left" />
          <div className="door-unwrap__ribbon door-unwrap__ribbon--right" />
          <div className="door-unwrap__bow">
            <span className="door-unwrap__icon" aria-hidden="true">{wrapperIcon}</span>
          </div>
          <span className="door-unwrap__number">{dayNumber}</span>
          <span className="door-unwrap__emoji" aria-hidden="true">{emoji}</span>
          <span className="door-unwrap__hint">Tap to unwrap</span>
        </div>
      )}

      {/* Revealed state */}
      {isRevealed && (
        <div className="door-unwrap__content">
          <RewardCard
            tier={tier}
            currency={currency}
            amount={amount}
            holidayKey={holidayKey}
            onClaim={onClaim}
            isPersonalQuest={isPersonalQuest}
            diceLabel={diceLabel}
          />
        </div>
      )}
    </div>
  );
};
