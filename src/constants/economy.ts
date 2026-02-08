export type CurrencyKey = 'xp' | 'gold' | 'zen_tokens' | 'dice' | 'game_tokens' | 'hearts';

export type EconomySourceKey =
  | 'habits'
  | 'goals'
  | 'meditation'
  | 'spin_wheel'
  | 'daily_treats'
  | 'achievements'
  | 'power_ups'
  | 'lucky_roll'
  | 'task_tower'
  | 'pomodoro_sprint'
  | 'vision_quest'
  | 'wheel_of_wins'
  | 'dice_packs';

export type EconomySinkKey =
  | 'shop_upgrades'
  | 'cosmetics'
  | 'trophies'
  | 'zen_garden'
  | 'dice_packs'
  | 'game_entry';

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
    lucky_roll: 'Lucky Roll board tile rewards',
    task_tower: 'Task Tower line clear rewards',
    pomodoro_sprint: 'Pomodoro Sprint completion rewards',
    vision_quest: 'Vision Quest passive multipliers',
    wheel_of_wins: 'Wheel of Wins spin prizes',
    dice_packs: 'Dice pack purchases with hearts',
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
    dice: {
      label: 'Dice',
      description: 'Rolling currency for the Lucky Roll board. Purchased with hearts via dice packs.',
      earnedFrom: ['dice_packs', 'lucky_roll', 'task_tower', 'pomodoro_sprint'],
    },
    game_tokens: {
      label: 'Game Tokens',
      description: 'Entry currency for mini-games. Earned from dice packs and Lucky Roll tiles.',
      earnedFrom: ['dice_packs', 'lucky_roll'],
    },
    hearts: {
      label: 'Hearts',
      description: 'Master play tickets. Spent on dice packs to fuel Lucky Roll sessions.',
      earnedFrom: ['daily_treats', 'habits', 'achievements'],
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
    dice_packs: 'Dice and game token packs purchased with hearts',
    game_entry: 'Game token cost to enter mini-games',
  } satisfies Record<EconomySinkKey, string>,
} as const;

export const DICE_PACK_DEFINITIONS = [
  { id: 'starter', label: 'Starter Pack', heartCost: 2, diceCount: 15, tokenCount: 4, description: 'A casual session bundle' },
  { id: 'value', label: 'Value Pack', heartCost: 4, diceCount: 35, tokenCount: 10, description: 'A solid play session' },
  { id: 'power', label: 'Power Pack', heartCost: 6, diceCount: 50, tokenCount: 18, description: 'Extended session, best value' },
  { id: 'mystery', label: 'Mystery Box', heartCost: 3, diceCount: -1, tokenCount: -1, description: 'Blind box: 5–750 dice, could be amazing' },
] as const;

export type DicePackId = typeof DICE_PACK_DEFINITIONS[number]['id'];

export const MYSTERY_BOX_DICE_TIERS = [
  { min: 5, max: 15, weight: 40, label: 'Common' },
  { min: 16, max: 35, weight: 30, label: 'Decent' },
  { min: 36, max: 75, weight: 15, label: 'Good' },
  { min: 76, max: 150, weight: 8, label: 'Great' },
  { min: 151, max: 350, weight: 4, label: 'Amazing' },
  { min: 351, max: 750, weight: 3, label: 'Jackpot' },
] as const;

export const MYSTERY_BOX_TOKEN_TIERS = [
  { min: 1, max: 5, weight: 40, label: 'Common' },
  { min: 6, max: 15, weight: 30, label: 'Decent' },
  { min: 16, max: 40, weight: 15, label: 'Good' },
  { min: 41, max: 80, weight: 8, label: 'Great' },
  { min: 81, max: 200, weight: 4, label: 'Amazing' },
  { min: 201, max: 500, weight: 3, label: 'Jackpot' },
] as const;

