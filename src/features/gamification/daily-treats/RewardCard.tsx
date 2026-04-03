import type { RewardTier, RewardCurrency, HolidayKey } from '../../../services/treatCalendarService';
import { REWARD_TIER_INFO, getEmptyDoorFlavour } from '../../../services/treatCalendarService';

type RewardCardProps = {
  tier: RewardTier;
  currency: RewardCurrency;
  amount: number | null;
  holidayKey: HolidayKey | null;
  onClaim?: () => void;
  isPersonalQuest?: boolean;
};

/**
 * Reward card displayed after a door reveal animation completes.
 * Shows rarity badge, reward icon, amount, flavour text, and claim button.
 */
export const RewardCard = ({
  tier,
  currency,
  amount,
  holidayKey,
  onClaim,
  isPersonalQuest = false,
}: RewardCardProps) => {
  const tierInfo = REWARD_TIER_INFO[tier];
  const isEmpty = tier === 1;

  const getRewardIcon = (): string => {
    if (isEmpty) return '✦';
    if (currency === 'diamond') return '💎';
    return '🪙';
  };

  const getRewardLabel = (): string => {
    if (isEmpty) return 'Nothing today';
    if (currency === 'diamond') {
      return amount === 1 ? '1 Diamond' : `${amount} Diamonds`;
    }
    return `${amount} Gold`;
  };

  const getFlavourText = (): string => {
    if (isEmpty) {
      return getEmptyDoorFlavour(holidayKey);
    }

    if (currency === 'diamond') {
      if (isPersonalQuest) return 'Your dedication has paid off! 🌟';
      switch (holidayKey) {
        case 'christmas': return 'The spirit of giving rewards the faithful. 🎄';
        case 'halloween': return 'A legendary treat from the spirits! 🎃';
        case 'easter': return 'The golden egg has been found! 🐰';
        case 'valentines_day': return 'True love deserves the finest gem. 💕';
        case 'new_year': return 'A brilliant start to new beginnings! 🎉';
        case 'thanksgiving': return 'Gratitude brings the greatest rewards. 🦃';
        case 'hanukkah': return 'A miracle worthy of celebration! 🕎';
        case 'eid_mubarak': return 'Blessed with the rarest gift! 🌙';
        case 'st_patricks_day': return 'The pot of gold is yours! ☘️';
        default: return 'A legendary reward for your dedication! ✨';
      }
    }

    if (tier === 4) {
      if (isPersonalQuest) return 'Amazing progress today! 🔥';
      return `The ${holidayKey ? getHolidayNoun(holidayKey) : 'spirits'} smile upon you. ✨`;
    }

    if (tier === 3) {
      if (isPersonalQuest) return 'Great work! Keep it up! 💪';
      return `A worthy reward from the ${holidayKey ? getHolidayNoun(holidayKey) : 'day'}. 🌟`;
    }

    // Tier 2 - small gold
    if (isPersonalQuest) return 'Every step counts. 🧭';
    return `A small treat to brighten your ${holidayKey ? 'holiday' : 'day'}. ✨`;
  };

  const getHolidayNoun = (key: HolidayKey): string => {
    const nouns: Record<HolidayKey, string> = {
      christmas: 'Christmas spirit',
      halloween: 'spirits',
      easter: 'Easter bunny',
      valentines_day: 'heart',
      new_year: 'new year',
      thanksgiving: 'harvest',
      hanukkah: 'Festival of Lights',
      eid_mubarak: 'blessed days',
      st_patricks_day: 'leprechaun',
    };
    return nouns[key];
  };

  return (
    <div className={`reward-card reward-card--${tierInfo.rarityClass}`}>
      <div className="reward-card__rarity">
        {tierInfo.rarityLabel}
      </div>
      <div className="reward-card__icon" aria-hidden="true">
        {getRewardIcon()}
      </div>
      <div className="reward-card__label">
        {getRewardLabel()}
      </div>
      <div className="reward-card__flavour">
        {getFlavourText()}
      </div>
      {onClaim && (
        <button
          type="button"
          className="reward-card__claim"
          onClick={onClaim}
        >
          {isEmpty ? 'Continue' : 'Claim Reward'}
        </button>
      )}
    </div>
  );
};
