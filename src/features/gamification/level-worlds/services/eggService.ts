/**
 * M5-COMPLETE: Egg Service
 * Canonical egg logic: tier assignment, hatch delay, stage names, reward rolls.
 * Follow docs/04_MAIN_GAME_EGGS_HATCHERY_HOME.md for all design decisions.
 */

export type EggTier = 'common' | 'rare' | 'mythic';

/** Where an egg currently lives. */
export type EggLocation = 'island' | 'dormant';

/** Reward payload returned by rollEggRewards. */
export interface RewardBundle {
  diamondsDelta: number;
  spinTokensDelta: number;
  /** Essence earned (island run currency for stop upgrades). */
  essenceDelta: number;
  /** Egg shards earned (sanctuary currency). */
  shardsDelta: number;
  boosters: string[];
  cosmetics: string[];
}

/**
 * Weighted random egg tier assignment on set.
 * common: 70%, rare: 25%, mythic: 5%
 */
export function rollEggTierWeighted(): EggTier {
  const roll = Math.random();
  if (roll < 0.70) return 'common';
  if (roll < 0.95) return 'rare';
  return 'mythic';
}

/**
 * Returns a random hatch delay in milliseconds.
 * hatchDelayHours = random integer in [24, 72] inclusive.
 */
export function getRandomHatchDelayMs(): number {
  const hours = Math.floor(Math.random() * 49) + 24; // [24, 72] h inclusive
  return hours * 60 * 60 * 1000;
}

/**
 * Returns the display name for the given egg stage (1–4).
 * Stage is derived from progress toward hatch_at, divided into quartiles.
 */
export function getEggStageName(stage: number): string {
  switch (stage) {
    case 1: return 'Smooth';
    case 2: return 'Mostly Gold';
    case 3: return 'Cracked';
    case 4: return 'Ready to Open';
    default: return 'Unknown';
  }
}

/**
 * Returns the display emoji for the given egg stage (1–4).
 */
export function getEggStageEmoji(stage: number): string {
  switch (stage) {
    case 1: return '🥚';
    case 2: return '✨🥚';
    case 3: return '🥚🔥';
    case 4: return '🌟🥚';
    default: return '🥚';
  }
}

/**
 * Returns themed egg artwork path for a tier + stage combination.
 * Assets live under public/assets/Eggs as Egg_<tier>_lv<stage>.webp.
 */
export function getEggStageArtSrc(eggTier: EggTier, stage: number): string {
  const safeStage = Math.min(4, Math.max(1, Math.floor(stage)));
  const assetTier = eggTier === 'mythic' ? 'mystery' : eggTier;
  return `/assets/Eggs/Egg_${assetTier}_lv${safeStage}.webp`;
}

/**
 * Roll egg rewards based on tier and a numeric seed.
 * seed is used for reproducible results (e.g. setAtMs).
 *
 * v2 reward schedule (hearts + coins retired → replaced with essence + shards):
 *   common  — small essence + small shards + occasional spin
 *   rare    — bigger bundle + guaranteed spin
 *   mythic  — large bundle + cosmetic chance
 */
export function rollEggRewards(eggTier: EggTier, seed: number): RewardBundle {
  let s = seed;
  const rand = (): number => {
    s = ((s * 1664525 + 1013904223) | 0) >>> 0;
    return s / 0x100000000;
  };

  switch (eggTier) {
    case 'common':
      return {
        essenceDelta: Math.floor(rand() * 8) + 3, // 3–10
        shardsDelta: 1,
        diamondsDelta: 0,
        spinTokensDelta: rand() < 0.25 ? 1 : 0,
        boosters: [],
        cosmetics: [],
      };
    case 'rare':
      return {
        essenceDelta: Math.floor(rand() * 15) + 10, // 10–24
        shardsDelta: Math.floor(rand() * 2) + 2, // 2–3
        diamondsDelta: 0,
        spinTokensDelta: 1,
        boosters: [],
        cosmetics: [],
      };
    case 'mythic':
      return {
        essenceDelta: Math.floor(rand() * 25) + 30, // 30–54
        shardsDelta: Math.floor(rand() * 3) + 4, // 4–6
        diamondsDelta: rand() < 0.15 ? 1 : 0,
        spinTokensDelta: 2,
        boosters: [],
        cosmetics: rand() < 0.30 ? ['mystery_cosmetic'] : [],
      };
  }
}

// ── Egg Sell Reward Choice ───────────────────────────────────────────
// When the player sells an egg instead of collecting the creature,
// they choose between a shard payout or a dice payout. Mythic > Rare > Common.

export type EggSellRewardChoice = 'shards' | 'dice';

export interface EggSellRewardOption {
  choice: EggSellRewardChoice;
  amount: number;
  label: string;
}

const EGG_SELL_REWARDS: Record<EggTier, { shards: number; dice: number }> = {
  common:  { shards: 3,  dice: 10 },
  rare:    { shards: 8,  dice: 25 },
  mythic:  { shards: 15, dice: 50 },
};

/**
 * Returns the two sell reward options for a hatched egg.
 * Player picks one: shards OR dice.
 */
export function getEggSellRewardOptions(eggTier: EggTier): [EggSellRewardOption, EggSellRewardOption] {
  const rewards = EGG_SELL_REWARDS[eggTier];
  return [
    { choice: 'shards', amount: rewards.shards, label: `${rewards.shards} 🔮 Shards` },
    { choice: 'dice',   amount: rewards.dice,   label: `${rewards.dice} 🎲 Dice` },
  ];
}
