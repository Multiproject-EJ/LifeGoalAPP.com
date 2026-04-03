import { useState } from 'react';
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
  /** Visual variant: 'gift' for wrapped present, 'envelope' for sealed envelope */
  variant?: 'gift' | 'envelope';
};

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
  variant = 'gift',
}: CalendarDoorUnwrapProps) => {
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const handleUnwrap = () => {
    if (hasStarted) return;
    setHasStarted(true);
    setIsUnwrapping(true);

    // Start unwrap animation, then reveal
    setTimeout(() => {
      setIsUnwrapping(false);
      setIsRevealed(true);
      onRevealComplete?.();
    }, 800);
  };

  const wrapperIcon = variant === 'envelope' ? '💌' : '🎁';
  const wrapperLabel = variant === 'envelope' ? 'envelope' : 'gift';

  return (
    <div
      className={`door-unwrap door-unwrap--${variant} ${isUnwrapping ? 'door-unwrap--unwrapping' : ''} ${isRevealed ? 'door-unwrap--revealed' : ''}`}
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
          />
        </div>
      )}
    </div>
  );
};
