import { useState } from 'react';
import { playIslandRunSound, triggerIslandRunHaptic } from '../level-worlds/services/islandRunAudio';
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
    playIslandRunSound('egg_open');
    triggerIslandRunHaptic('egg_open');
    setIsFlipped(true);
    setHasFlipped(true);

    // Trigger reveal complete callback after animation
    setTimeout(() => {
      playIslandRunSound('reward_bar_claim_burst');
      triggerIslandRunHaptic('reward_claim');
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
      <div className="door-flip__aura" aria-hidden="true" />
      <div className="door-flip__sparkles" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <span key={`sparkle-${index}`} className="door-flip__sparkle" />
        ))}
      </div>
      <div className="door-flip__inner">
        {/* Front face - the door */}
        <div className="door-flip__front">
          <span className="door-flip__eyebrow">Daily Treat</span>
          <span className="door-flip__number">Day {dayNumber}</span>
          <span className="door-flip__artifact" aria-hidden="true">
            <span className="door-flip__artifact-glow" />
            <span className="door-flip__emoji">{emoji}</span>
          </span>
          <span className="door-flip__hint">Tap to reveal</span>
        </div>

        {/* Back face - the reward card */}
        <div className="door-flip__back">
          {hasFlipped && (
            <div className="door-flip__reveal-burst" aria-hidden="true">
              {Array.from({ length: 14 }, (_, index) => (
                <span key={`burst-${index}`} className="door-flip__reveal-spark" />
              ))}
            </div>
          )}
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
