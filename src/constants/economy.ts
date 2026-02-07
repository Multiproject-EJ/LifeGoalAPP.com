export type CurrencyKey = 'xp' | 'gold' | 'zen_tokens';

export type EconomySourceKey =
  | 'habits'
  | 'goals'
  | 'meditation'
  | 'spin_wheel'
  | 'daily_treats'
  | 'achievements'
  | 'power_ups';

export type EconomySinkKey =
  | 'shop_upgrades'
  | 'cosmetics'
  | 'trophies'
  | 'zen_garden';

export const XP_TO_GOLD_RATIO = 0.1;
export const GOLD_PER_DIAMOND = 1000;

export function convertXpToGold(xpAmount: number): number {
  return Math.floor(xpAmount * XP_TO_GOLD_RATIO);
}

export function splitGoldBalance(balance: number): { diamonds: number; goldRemainder: number } {
  const safeBalance = Math.max(0, Math.floor(balance));
  const diamonds = Math.floor(safeBalance / GOLD_PER_DIAMOND);
  const goldRemainder = safeBalance % GOLD_PER_DIAMOND;
  return { diamonds, goldRemainder };
}

export const ZEN_TOKEN_REWARDS = {
  MEDITATION_SESSION: 1,
  BREATHING_SESSION: 1,
  MEDITATION_LONG_SESSION_BONUS: 1,
} as const;

export const ECONOMY_MATRIX = {
  earnSources: {
    habits: 'Habits + routines completion',
    goals: 'Goal progress & milestones',
    meditation: 'Meditation, breathing, and mindfulness',
    spin_wheel: 'Daily spin wheel rewards',
    daily_treats: 'Daily treats scratch card rewards',
    achievements: 'Achievements & streak milestones',
    power_ups: 'Power-up bonuses (XP multipliers, boosts)',
  } satisfies Record<EconomySourceKey, string>,
  currencies: {
    xp: {
      label: 'XP',
      description: 'Progression currency that powers levels.',
      earnedFrom: ['habits', 'goals', 'meditation', 'spin_wheel', 'achievements', 'power_ups'],
    },
    gold: {
      label: 'Gold',
      description: 'Spendable currency derived from XP (1 gold per 10 XP).',
      earnedFrom: ['xp', 'spin_wheel', 'achievements', 'daily_treats'],
    },
    zen_tokens: {
      label: 'Zen Tokens',
      description: 'Meditation-only currency for Zen Garden rewards.',
      earnedFrom: ['meditation'],
    },
  } satisfies Record<CurrencyKey, {
    label: string;
    description: string;
    earnedFrom: string[];
  }>,
  spendingSinks: {
    shop_upgrades: 'Store upgrades and boosters',
    cosmetics: 'Cosmetics and visual customizations',
    trophies: 'Trophies, plaques, and medals',
    zen_garden: 'Zen Garden-only purchases (Zen Tokens)',
  } satisfies Record<EconomySinkKey, string>,
} as const;
