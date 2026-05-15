import type { RewardTier, RewardCurrency, HolidayKey } from '../../../services/treatCalendarService';
import { REWARD_TIER_INFO, getEmptyDoorFlavour } from '../../../services/treatCalendarService';

// ---------------------------------------------------------------------------
// Flavour text bank — 3-5 lines per holiday per reward tier (Types 1–5)
// Type 1 (empty) uses getEmptyDoorFlavour() from treatCalendarService.
// ---------------------------------------------------------------------------

type FlavourTierKey = 2 | 3 | 4 | 5;
type HolidayFlavourBank = Record<HolidayKey, Record<FlavourTierKey, string[]>>;

const FLAVOUR_TEXT_BANK: HolidayFlavourBank = {
  christmas: {
    2: [
      'A little something from Santa\'s workshop. 🎁',
      'The elves packed this one just for you. 🧝',
      'A stocking stuffer to keep you going. 🧦',
      'Even small gifts carry Christmas magic. ✨',
    ],
    3: [
      'The Christmas spirit rewards the dedicated. 🎄',
      'Jingle all the way to the bank! 🔔',
      'A worthy gift from beneath the tree. 🎁',
      'The reindeer delivered something nice today. 🦌',
    ],
    4: [
      'Santa checked the list — you\'re on the nice side! 🎅',
      'A rare gift wrapped in holiday wonder. ❄️',
      'The North Pole reserves this for the faithful. ⭐',
      'Christmas magic at its finest! 🕯️',
    ],
    5: [
      'The spirit of giving rewards the faithful. 🎄',
      'A Christmas miracle just for you! ⭐',
      'The ultimate gift beneath the tree. 🎁',
      'You found a legendary dice cache in the snow! 🎲',
      'Santa\'s finest treasure — you\'ve earned it! 🎅',
    ],
  },
  halloween: {
    2: [
      'A small treat from the candy bowl. 🍬',
      'Not every door hides a scare tonight. 🎃',
      'The pumpkin patch had a little left over. 🕸️',
    ],
    3: [
      'The spirits are generous tonight! 👻',
      'A worthy haul from the witching hour. 🧙',
      'Something wicked this way comes — but it\'s good! 🦇',
      'The cauldron brewed up something nice. 🕷️',
    ],
    4: [
      'The spirits smile upon the brave! 💀',
      'A rare treat emerges from the darkness. 🌙',
      'The haunted house had treasure after all. 🎃',
      'You\'ve conquered the darkest door! 👻',
    ],
    5: [
      'A legendary treat from the spirits! 🎃',
      'The ultimate Halloween treasure is yours! 💀',
      'The spirits saved their finest for last. 👻',
      'A legendary dice cache hidden in the pumpkin patch! 🎲',
      'The witching hour delivers its greatest prize! 🧙',
    ],
  },
  easter: {
    2: [
      'A small egg to add to your basket. 🥚',
      'The bunny left a little treat for you. 🐰',
      'Spring showers bring small rewards. 🌸',
    ],
    3: [
      'A beautifully painted egg, full of treasure. 🐣',
      'The Easter bunny was generous today! 🌷',
      'You found a hidden egg in the garden! 🥚',
      'Spring blooms bring golden rewards. 🌼',
    ],
    4: [
      'The golden egg has nearly been found! 🐰',
      'A rare treasure from the spring garden. 🌈',
      'The Easter bunny\'s finest work! 🐣',
      'Rebirth and renewal bring great rewards. 🦋',
    ],
    5: [
      'The golden egg has been found! 🐰',
      'The rarest Easter treasure is yours! 🥚',
      'A legendary dice cache hidden inside the final egg! 🎲',
      'The Easter miracle has arrived! 🌈',
      'The bunny saved the best for last! 🐣',
    ],
  },
  valentines_day: {
    2: [
      'A sweet little token of affection. 💕',
      'Love notes come in all sizes. 💌',
      'A small chocolate from the heart. 🍫',
    ],
    3: [
      'Love blooms and so do your rewards! 🌹',
      'A heartfelt gift for a devoted soul. 💝',
      'Cupid aimed well today! 💘',
      'Sweet rewards for a sweet heart. 🎀',
    ],
    4: [
      'True devotion deserves rare rewards! 💗',
      'A bouquet of gold, arranged with love. 🌹',
      'Cupid\'s finest arrow found its mark! 💘',
      'Love conquers all — especially empty doors. ❤️',
    ],
    5: [
      'True love deserves the finest gem. 💕',
      'A legendary reward of devotion is yours! 🎲',
      'A love story with the grandest finale! 💘',
      'Cupid delivers the ultimate valentine! 💝',
      'Heart and soul — rewarded in full. ❤️',
    ],
  },
  new_year: {
    2: [
      'A small spark to start the year. ✨',
      'Every celebration begins with a first step. 🎊',
      'A toast to new beginnings! 🥂',
    ],
    3: [
      'The countdown is paying off! 🎆',
      'New year, new treasures! 🎉',
      'The fireworks light up your fortune. 🎇',
      'Resolutions this good deserve a reward. ⭐',
    ],
    4: [
      'The final countdown brings rare fortune! 🕛',
      'A golden start to a golden year. 🥳',
      'The best is arriving right on schedule! 🎆',
      'Ring in the riches! 🎊',
    ],
    5: [
      'A brilliant start to new beginnings! 🎉',
      'The new year\'s finest reward is yours! 🎲',
      'Midnight strikes — and fortune follows! 🕛',
      'The ultimate new year\'s treasure! 🎆',
      'A legendary reward for a fresh start! ✨',
    ],
  },
  thanksgiving: {
    2: [
      'A small helping of gratitude\'s reward. 🙏',
      'Every harvest has its humble beginnings. 🌽',
      'A taste of the feast to come. 🥧',
    ],
    3: [
      'The harvest yields a generous bounty! 🌾',
      'Thankful hearts receive worthy rewards. 🍁',
      'The cornucopia overflows today! 🦃',
      'Gratitude multiplied — a fine reward. 🍂',
    ],
    4: [
      'The harvest\'s finest treasure! 🌾',
      'A rare bounty from the Thanksgiving table. 🦃',
      'Gratitude this deep deserves gold. 🍁',
      'The cornucopia saved its best for you. 🥧',
    ],
    5: [
      'Gratitude brings the greatest rewards. 🦃',
      'The harvest of a lifetime is yours! 🎲',
      'A Thanksgiving miracle at the table! 🙏',
      'The finest treasure the harvest has to offer. 🌾',
      'Thankfulness rewarded beyond measure! 🍂',
    ],
  },
  hanukkah: {
    2: [
      'A small gift for each night\'s light. 🕯️',
      'The menorah flickers with promise. 🕎',
      'Gelt to sweeten the celebration. 🪙',
    ],
    3: [
      'The Festival of Lights shines on you! ✡️',
      'Eight nights of growing treasure. 🕎',
      'A gift worthy of the miracle. 🕯️',
      'The dreidel spins in your favour! 🪙',
    ],
    4: [
      'The menorah burns brightest for the devoted! 🕎',
      'A rare miracle of the season. ⭐',
      'The Festival of Lights reveals its treasure. ✡️',
      'Eight nights of wonder, one golden prize. 🕯️',
    ],
    5: [
      'A miracle worthy of celebration! 🕎',
      'The reward shines like the eternal flame! 🎲',
      'Eight nights lead to one legendary reward. ✡️',
      'The greatest gift of the Festival. 🕯️',
      'A Hanukkah miracle beyond measure! ⭐',
    ],
  },
  eid_mubarak: {
    2: [
      'A small blessing to brighten your day. 🌙',
      'The crescent shares its gentle light. ✨',
      'A humble gift of celebration. 🕌',
    ],
    3: [
      'Blessings multiply for the faithful! 🌟',
      'The spirit of Eid brings generous gifts. 🌙',
      'A worthy reward for devotion. 🤲',
      'The crescent shines warmly on you today. ✨',
    ],
    4: [
      'A rare blessing from the blessed days! 🌙',
      'Devotion this pure deserves great reward. 🕌',
      'The spirit of Eid bestows its finest. 🤲',
      'Golden blessings for the faithful! ⭐',
    ],
    5: [
      'Blessed with the rarest gift! 🌙',
      'The ultimate Eid treasure is yours! 🎲',
      'A legendary blessing for the devoted! ✨',
      'The crescent reveals its finest reward. 🌟',
      'Eid\'s greatest miracle — you\'ve earned it! 🕌',
    ],
  },
  st_patricks_day: {
    2: [
      'A wee bit of gold from the rainbow. 🌈',
      'The leprechaun left a small coin behind. 🪙',
      'Luck of the Irish — a little goes a long way. ☘️',
    ],
    3: [
      'The leprechaun\'s generosity grows! 🍀',
      'Following the rainbow is paying off! 🌈',
      'A fine bit of luck today! ☘️',
      'The shamrock shines green and gold. 🟢',
    ],
    4: [
      'Getting closer to the pot of gold! 🌈',
      'A rare four-leaf clover — and fortune follows! 🍀',
      'The leprechaun tips his hat to you. 🎩',
      'Irish luck at its finest! ☘️',
    ],
    5: [
      'The pot of gold is yours! ☘️',
      'A legendary prize at the end of the rainbow! 🎲',
      'The leprechaun\'s greatest treasure revealed! 🍀',
      'Legendary Irish luck — you found it! 🌈',
      'The finest gem in all of Ireland! 🎩',
    ],
  },
};

/** Personal quest flavour text by tier */
const PERSONAL_QUEST_FLAVOUR: Record<FlavourTierKey, string[]> = {
  2: [
    'Every step counts. 🧭',
    'Small wins build big habits. ⭐',
    'Keep the momentum going! 🚀',
  ],
  3: [
    'Great work! Keep it up! 💪',
    'Your consistency is paying off. 🌟',
    'Solid progress — well earned! 🎯',
    'The quest rewards the dedicated. ⭐',
  ],
  4: [
    'Amazing progress today! 🔥',
    'Your dedication is truly rare. 🏆',
    'Quest mastery in the making! 💪',
    'You\'re on a legendary streak! ⭐',
  ],
  5: [
    'Your dedication has paid off! 🌟',
    'Quest complete — a legendary reward! 🎲',
    'The ultimate quest treasure is yours! 🏆',
    'Top-tier dedication! ✨',
    'A true quest hero — nothing can stop you! 🚀',
  ],
};

/** Pick a random line from a flavour text array. */
function pickFlavour(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

type RewardCardProps = {
  tier: RewardTier;
  currency: RewardCurrency;
  amount: number | null;
  holidayKey: HolidayKey | null;
  onClaim?: () => void;
  isPersonalQuest?: boolean;
  diceLabel?: string;
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
  diceLabel = 'Dice',
}: RewardCardProps) => {
  const tierInfo = REWARD_TIER_INFO[tier];
  const isEmpty = tier === 1;

  const getRewardIcon = (): string => {
    if (isEmpty) return '✦';
    if (currency === 'dice') return '🎲';
    return '🪙';
  };

  const getRewardLabel = (): string => {
    if (isEmpty) return 'Nothing today';
    if (currency === 'dice') {
      return `${amount} ${diceLabel}`;
    }
    return `${amount} Gold`;
  };

  const getFlavourText = (): string => {
    if (isEmpty) {
      return getEmptyDoorFlavour(holidayKey);
    }

    const tierKey = tier as FlavourTierKey;

    // Personal quest flavour
    if (isPersonalQuest) {
      return pickFlavour(PERSONAL_QUEST_FLAVOUR[tierKey]);
    }

    // Holiday-specific flavour
    if (holidayKey) {
      const bank = FLAVOUR_TEXT_BANK[holidayKey];
      if (bank?.[tierKey]) {
        return pickFlavour(bank[tierKey]);
      }
    }

    // Generic fallback for unknown or missing holiday context
    const genericFallback: Record<FlavourTierKey, string[]> = {
      2: ['A small treat to brighten your day. ✨', 'Every little bit counts! 🌟', 'A modest reward — more to come. ⭐'],
      3: ['A worthy reward for your effort. 🌟', 'Well deserved! Keep going. ✨', 'Nice progress — the streak builds! ⭐'],
      4: ['An impressive reward for dedication! 🔥', 'Rare fortune favours the consistent. ✨', 'Your persistence pays off big! ⭐'],
      5: ['A legendary reward for your dedication! 🎲', 'The ultimate treasure — you earned it! ✨', 'Legendary excellence! 🌟'],
    };
    return pickFlavour(genericFallback[tierKey]);
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
