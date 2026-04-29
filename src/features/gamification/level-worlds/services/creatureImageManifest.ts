import type { CreatureDefinition, ShipZone } from './creatureCatalog';
import type { EggTier } from './eggService';

export const CREATURE_IMAGE_BASE_PATH = '/assets/creatures';
export const CREATURE_FRAME_BASE_PATH = '/assets/creature-frames';
export const CREATURE_BACKGROUND_BASE_PATH = '/assets/creature-backgrounds';
export const CREATURE_SILHOUETTE_PLACEHOLDER_PATH = '/assets/creature-placeholders/silhouette.webp';

const AFFINITY_TO_BACKGROUND_KEY: Record<string, string> = {
  Builder: 'energy',
  Grounded: 'zen',
  Nurturer: 'zen',
  Steady: 'zen',
  Explorer: 'cosmic',
  Caregiver: 'zen',
  Mentor: 'zen',
  Peacemaker: 'zen',
  Dreamer: 'cosmic',
  Visionary: 'cosmic',
  Guardian: 'energy',
  Catalyst: 'energy',
  Champion: 'energy',
  Strategist: 'energy',
  Architect: 'energy',
  Challenger: 'energy',
  Creator: 'cosmic',
  Oracle: 'cosmic',
  Cosmic: 'cosmic',
  Radiant: 'cosmic',
  Sage: 'cosmic',
  Commander: 'energy',
  Rebel: 'energy',
};

export function buildCreatureCutoutPath(imageKey: string): string {
  const key = imageKey.trim();
  return `${CREATURE_IMAGE_BASE_PATH}/${key}.webp`;
}

export function resolveCreatureFramePath(tier: EggTier): string {
  return `${CREATURE_FRAME_BASE_PATH}/${tier}.webp`;
}

export function resolveCreatureBackgroundPath(options: { affinity: string; shipZone: ShipZone }): string {
  const byAffinity = AFFINITY_TO_BACKGROUND_KEY[options.affinity];
  const backgroundKey = byAffinity ?? options.shipZone;
  return `${CREATURE_BACKGROUND_BASE_PATH}/${backgroundKey}.webp`;
}

export function resolveCreatureEmojiFallback(creature: Pick<CreatureDefinition, 'tier'>): string {
  if (creature.tier === 'mythic') return '🌟';
  if (creature.tier === 'rare') return '✨';
  return '🐣';
}

export interface CreatureArtResolution {
  imageKey: string;
  cutoutSrc: string;
  frameSrc: string;
  backgroundSrc: string;
  silhouetteSrc: string;
  emojiFallback: string;
}

export function resolveCreatureArtManifest(creature: CreatureDefinition): CreatureArtResolution {
  const imageKey = (creature.imageKey || creature.id).trim();
  return {
    imageKey,
    cutoutSrc: buildCreatureCutoutPath(imageKey),
    frameSrc: resolveCreatureFramePath(creature.tier),
    backgroundSrc: resolveCreatureBackgroundPath({ affinity: creature.affinity, shipZone: creature.shipZone }),
    silhouetteSrc: CREATURE_SILHOUETTE_PLACEHOLDER_PATH,
    emojiFallback: resolveCreatureEmojiFallback(creature),
  };
}

export function resolveCreatureImageSource(options: {
  creature: CreatureDefinition;
  hasCutoutAsset: boolean;
}): { src: string; fallbackEmoji: string } {
  const manifest = resolveCreatureArtManifest(options.creature);
  if (options.hasCutoutAsset) {
    return { src: manifest.cutoutSrc, fallbackEmoji: manifest.emojiFallback };
  }
  return { src: manifest.silhouetteSrc, fallbackEmoji: manifest.emojiFallback };
}
