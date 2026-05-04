import type { HandRole } from '../../identity/archetypes/archetypeHandBuilder';

export type SparkPreviewRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface SparkPreviewCard {
  id: string;
  archetypeId: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  level: number;
  role: HandRole;
  rarity: SparkPreviewRarity;
  isActive: boolean;
}
