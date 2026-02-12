export type ZenGardenItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
};

export const ZEN_GARDEN_ITEMS: ZenGardenItem[] = [
  {
    id: 'zen_ripple_pool',
    name: 'Ripple Pool',
    description: 'A calm water feature for post-meditation flow.',
    cost: 12,
    emoji: '💧',
  },
  {
    id: 'zen_bamboo',
    name: 'Bamboo Grove',
    description: 'Symbolic growth that rewards daily breathwork.',
    cost: 18,
    emoji: '🎋',
  },
  {
    id: 'zen_lotus_lamp',
    name: 'Lotus Lamp',
    description: 'Gentle light that inspires clarity and focus.',
    cost: 25,
    emoji: '🪔',
  },
  {
    id: 'zen_stone_path',
    name: 'Stone Path',
    description: 'A winding journey of steady practice.',
    cost: 30,
    emoji: '🪨',
  },
  {
    id: 'zen_wind_chime',
    name: 'Wind Chime',
    description: 'Soft tones that echo mindful moments.',
    cost: 40,
    emoji: '🎐',
  },
  {
    id: 'zen_sakura_bloom',
    name: 'Sakura Bloom',
    description: 'A rare tree for the most dedicated meditators.',
    cost: 60,
    emoji: '🌸',
  },
];

// Display limit for zen token transactions in the bank tab ledger
// Chosen to show recent activity without overwhelming the UI
export const ZEN_TRANSACTIONS_DISPLAY_LIMIT = 4;
