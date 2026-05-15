import { useState } from 'react';
import { RewardCard } from './RewardCard';
import type { RewardTier, RewardCurrency, HolidayKey } from '../../../services/treatCalendarService';

type CalendarDoorFlipProps = {
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
};

/**
 * Card flip reveal mechanic — CSS 3D flip animation.
 * Front = door face with number/emoji, Back = RewardCard.
 */
export const CalendarDoorFlip = ({
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
}: CalendarDoorFlipProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasFlipped, setHasFlipped] = useState(false);

  const handleFlip = () => {
    if (hasFlipped) return;
    setIsFlipped(true);
    setHasFlipped(true);

    // Trigger reveal complete callback after animation
    setTimeout(() => {
      onRevealComplete?.();
    }, 600);
  };

  return (
    <div
      className={`door-flip ${isFlipped ? 'door-flip--flipped' : ''}`}
      onClick={!hasFlipped ? handleFlip : undefined}
      onKeyDown={(e) => {
        if (!hasFlipped && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleFlip();
        }
      }}
      role="button"
      tabIndex={hasFlipped ? -1 : 0}
      aria-label={`Day ${dayNumber} door. ${hasFlipped ? 'Revealed' : 'Tap to reveal'}`}
    >
      <div className="door-flip__inner">
        {/* Front face - the door */}
        <div className="door-flip__front">
          <span className="door-flip__number">{dayNumber}</span>
          <span className="door-flip__emoji" aria-hidden="true">{emoji}</span>
          <span className="door-flip__hint">Tap to flip</span>
        </div>

        {/* Back face - the reward card */}
        <div className="door-flip__back">
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
      </div>
    </div>
  );
};
