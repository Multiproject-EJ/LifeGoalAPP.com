export type CreatureTypeIconKey = string;
export type CreatureVariantBadgeKey = string;
export type CreatureStageArtKey = string;
export type CreatureEditionStampKey = string;
export type CreatureBacksideMotifKey = string;

export interface CreatureCardAssetManifest {
  typeIconSrc?: string;
  variantBadgeSrc?: string;
  stageArtSrc?: string;
  editionStampSrc?: string;
  backsideMotifSrc?: string;
}

export const CREATURE_CARD_TYPE_ICON_BASE_PATH = '/assets/creature-card-icons/types';
export const CREATURE_CARD_VARIANT_BADGE_BASE_PATH = '/assets/creature-card-icons/variant-badges';
export const CREATURE_CARD_STAGE_ART_BASE_PATH = '/assets/creatures/stages';
export const CREATURE_CARD_EDITION_STAMP_BASE_PATH = '/assets/creature-card-icons/edition-stamps';
export const CREATURE_CARD_BACKSIDE_MOTIF_BASE_PATH = '/assets/creature-card-backs/motifs';

function sanitizeAssetKey(key: string | undefined | null): string | undefined {
  if (typeof key !== 'string') return undefined;
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveCreatureTypeIconSrc(key: CreatureTypeIconKey): string | undefined {
  const safeKey = sanitizeAssetKey(key);
  if (!safeKey) return undefined;
  return `${CREATURE_CARD_TYPE_ICON_BASE_PATH}/${safeKey}.webp`;
}

export function resolveCreatureVariantBadgeSrc(key: CreatureVariantBadgeKey): string | undefined {
  const safeKey = sanitizeAssetKey(key);
  if (!safeKey) return undefined;
  return `${CREATURE_CARD_VARIANT_BADGE_BASE_PATH}/${safeKey}.webp`;
}

export function resolveCreatureStageArtSrc(
  creatureImageKey: string,
  stageKey: CreatureStageArtKey,
): string | undefined {
  const safeCreatureImageKey = sanitizeAssetKey(creatureImageKey);
  const safeStageKey = sanitizeAssetKey(stageKey);
  if (!safeCreatureImageKey || !safeStageKey) return undefined;
  return `${CREATURE_CARD_STAGE_ART_BASE_PATH}/${safeCreatureImageKey}/${safeStageKey}.webp`;
}

export function resolveCreatureEditionStampSrc(key: CreatureEditionStampKey): string | undefined {
  const safeKey = sanitizeAssetKey(key);
  if (!safeKey) return undefined;
  return `${CREATURE_CARD_EDITION_STAMP_BASE_PATH}/${safeKey}.webp`;
}

export function resolveCreatureBacksideMotifSrc(key: CreatureBacksideMotifKey): string | undefined {
  const safeKey = sanitizeAssetKey(key);
  if (!safeKey) return undefined;
  return `${CREATURE_CARD_BACKSIDE_MOTIF_BASE_PATH}/${safeKey}.webp`;
}
