export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Trait {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  level: number;
  description: string;
}

export const RARITY_COLORS = {
  common: 'oklch(0.65 0.05 260)',
  rare: 'oklch(0.65 0.15 240)',
  epic: 'oklch(0.65 0.20 300)',
  legendary: 'oklch(0.75 0.18 85)',
} as const;

export const RARITY_LABELS = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
} as const;
