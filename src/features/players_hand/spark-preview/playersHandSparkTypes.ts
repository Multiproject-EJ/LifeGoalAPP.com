import type { HandRole } from '../../identity/archetypes/archetypeHandBuilder';
import type { ArchetypeActivationCopy } from '../../identity/archetypes/archetypeActivationCopy';

export type SparkPreviewRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface SparkPreviewCard {
  id: string;
  archetypeId: string;
  title: string;
  description: string;
  icon: string;
  /** Playing-card anatomy: suit glyph and corner rank. */
  suitGlyph?: string;
  rank?: string;
  color: string;
  level: number;
  role: HandRole;
  rarity: SparkPreviewRarity;
  isActive: boolean;
  activationCopy?: ArchetypeActivationCopy | null;
}
