import { CREATURE_CATALOG } from './creatureCatalog';
import type {
  CreatureCardAbilityKind,
  CreatureCardEditionType,
  CreatureCardV2Rarity,
} from './creatureCardV2Types';

const KNOWN_CREATURE_IDS = new Set(CREATURE_CATALOG.map((entry) => entry.id));

export type CreatureCardV2ContentIssueCode =
  | 'missing_creature_id'
  | 'unknown_creature_id'
  | 'duplicate_variant_id'
  | 'empty_ability_name'
  | 'empty_ability_description';

export interface CreatureCardV2ContentIssue {
  code: CreatureCardV2ContentIssueCode;
  path: string;
  message: string;
}

export interface CreatureCardV2ContentAbilityDraft {
  id: string;
  name: string;
  description: string;
  valueBadge?: string;
  kind?: CreatureCardAbilityKind;
}

export interface CreatureCardV2ContentTagDraft {
  strengths?: string[];
  weaknesses?: string[];
}

export interface CreatureCardV2ContentBacksideDraft {
  originLore?: string;
  unlockSource?: string;
  favoriteFoods?: string[];
  habitatStory?: string;
  synergyTags?: string[];
  stageEvolutionNotes?: string[];
}

export interface CreatureCardV2ContentVariantOverlayDraft {
  variantId: string;
  editionType: CreatureCardEditionType;
  stageKey?: string;
  artOverrides?: {
    artKey?: string;
    frameKey?: string;
    backgroundKey?: string;
    badgeKey?: string;
  };
  textOverrides?: {
    flavorQuote?: string;
    passiveName?: string;
    passiveDescription?: string;
  };
  availability?: {
    startAtIso?: string;
    endAtIso?: string;
    sourceLabel?: string;
  };
}

export interface CreatureCardV2ContentDraft {
  creatureId: string;
  rarity?: CreatureCardV2Rarity;
  dexNumber?: number;
  typeIconKey?: string;
  backside?: CreatureCardV2ContentBacksideDraft;
  abilities?: CreatureCardV2ContentAbilityDraft[];
  tags?: CreatureCardV2ContentTagDraft;
  variants?: CreatureCardV2ContentVariantOverlayDraft[];
}

export interface CreatureCardV2NormalizedContentDraft extends CreatureCardV2ContentDraft {
  tags?: {
    strengths?: string[];
    weaknesses?: string[];
  };
}

function sanitizeStringList(values?: string[]): string[] | undefined {
  if (!values) return undefined;
  const cleaned = values.map((value) => value.trim()).filter((value) => value.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function normalizeCreatureCardV2ContentDraft(
  draft: CreatureCardV2ContentDraft,
): CreatureCardV2NormalizedContentDraft {
  return {
    ...draft,
    creatureId: draft.creatureId.trim(),
    tags: draft.tags
      ? {
          strengths: sanitizeStringList(draft.tags.strengths),
          weaknesses: sanitizeStringList(draft.tags.weaknesses),
        }
      : undefined,
    abilities: draft.abilities?.map((ability) => ({
      ...ability,
      id: ability.id.trim(),
      name: ability.name.trim(),
      description: ability.description.trim(),
      valueBadge: ability.valueBadge?.trim(),
    })),
    variants: draft.variants?.map((variant) => ({
      ...variant,
      variantId: variant.variantId.trim(),
      stageKey: variant.stageKey?.trim(),
    })),
  };
}

export function listCreatureCardV2ContentIssues(
  input: CreatureCardV2ContentDraft,
): CreatureCardV2ContentIssue[] {
  const draft = normalizeCreatureCardV2ContentDraft(input);
  const issues: CreatureCardV2ContentIssue[] = [];

  if (!draft.creatureId) {
    issues.push({
      code: 'missing_creature_id',
      path: 'creatureId',
      message: 'creatureId is required.',
    });
  } else if (!KNOWN_CREATURE_IDS.has(draft.creatureId)) {
    issues.push({
      code: 'unknown_creature_id',
      path: 'creatureId',
      message: `creatureId \"${draft.creatureId}\" is not in the canonical creature catalog.`,
    });
  }

  const seenVariantIds = new Set<string>();
  for (const [index, variant] of (draft.variants ?? []).entries()) {
    if (seenVariantIds.has(variant.variantId)) {
      issues.push({
        code: 'duplicate_variant_id',
        path: `variants[${index}].variantId`,
        message: `variantId \"${variant.variantId}\" is duplicated in this draft.`,
      });
    } else {
      seenVariantIds.add(variant.variantId);
    }
  }

  for (const [index, ability] of (draft.abilities ?? []).entries()) {
    if (!ability.name) {
      issues.push({
        code: 'empty_ability_name',
        path: `abilities[${index}].name`,
        message: 'ability name must be non-empty.',
      });
    }
    if (!ability.description) {
      issues.push({
        code: 'empty_ability_description',
        path: `abilities[${index}].description`,
        message: 'ability description must be non-empty.',
      });
    }
  }

  return issues;
}

export function validateCreatureCardV2ContentDraft(input: CreatureCardV2ContentDraft): boolean {
  return listCreatureCardV2ContentIssues(input).length === 0;
}
