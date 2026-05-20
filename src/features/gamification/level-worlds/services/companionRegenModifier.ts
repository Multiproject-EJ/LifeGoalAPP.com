import { PERSONALITY_QUESTION_BANK } from '../../../identity/personalityTestData';
import type { ArchetypeHand } from '../../../identity/archetypes/archetypeHandBuilder';
import { getCreatureById, type CreatureDefinition } from './creatureCatalog';
import {
  getArchetypeIdsForAffinity,
  getWeaknessSupportTagsForAffinity,
  type WeaknessSupportTag,
} from './creatureArchetypeBridge';
import type {
  CreatureCollectionRuntimeEntry,
  IslandRunGameStateRecord,
} from './islandRunGameStateStore';

export const PHASE_1_COMPANION_REGEN_BOOST_CAP_PCT = 0.10;

const RARITY_REGEN_BOOST_PCT: Record<CreatureDefinition['tier'], number> = {
  common: 0.02,
  rare: 0.03,
  mythic: 0.04,
};

export interface CompanionRegenPersonalityContext {
  answers?: Record<string, unknown> | null;
  archetypeHand?: ArchetypeHand | null;
  weaknessTags?: WeaknessSupportTag[];
}

export interface ActiveCompanionForRegen {
  activeCompanionId: string;
  creature: CreatureDefinition;
  collectionEntry: CreatureCollectionRuntimeEntry;
}

export interface CompanionRegenModifier {
  activeCompanionId: string | null;
  boostPct: number;
  cappedBoostPct: number;
  rarityPct: number;
  bondPct: number;
  matchPct: number;
  isOwned: boolean;
  isPersonalityComplete: boolean;
  wasCapped: boolean;
}

function normalizeBoostPct(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function capCompanionRegenBoostPct(boostPct: number): number {
  return Math.min(normalizeBoostPct(boostPct), PHASE_1_COMPANION_REGEN_BOOST_CAP_PCT);
}

export function resolveEffectiveRegenIntervalMs(params: {
  baseRegenIntervalMs: number;
  companionBoostPct?: number;
}): number {
  const safeBase = Number.isFinite(params.baseRegenIntervalMs)
    ? Math.max(1, params.baseRegenIntervalMs)
    : 1;
  const cappedBoostPct = capCompanionRegenBoostPct(params.companionBoostPct ?? 0);
  return safeBase * (1 - cappedBoostPct);
}

export function resolveActiveCompanionForRegen(
  record: Pick<IslandRunGameStateRecord, 'activeCompanionId' | 'creatureCollection'>,
): ActiveCompanionForRegen | null {
  const activeCompanionId = typeof record.activeCompanionId === 'string'
    ? record.activeCompanionId.trim()
    : '';
  if (!activeCompanionId) return null;

  const collectionEntry = record.creatureCollection.find((entry) =>
    entry.creatureId === activeCompanionId && Number.isFinite(entry.copies) && entry.copies > 0,
  );
  if (!collectionEntry) return null;

  const creature = getCreatureById(activeCompanionId);
  if (!creature) return null;

  return {
    activeCompanionId,
    creature,
    collectionEntry,
  };
}

function resolveBondBoostPct(bondLevel: number): number {
  const safeBondLevel = Number.isFinite(bondLevel) ? Math.max(1, Math.floor(bondLevel)) : 1;
  return Math.min(0.03, Math.floor((safeBondLevel - 1) / 5) * 0.01);
}

function isCompleteAnswerSet(answers: Record<string, unknown> | null | undefined): boolean {
  if (!answers) return false;
  return PERSONALITY_QUESTION_BANK.every((question) => {
    const answer = answers[question.id];
    return Number.isInteger(answer) && Number(answer) >= 1 && Number(answer) <= 5;
  });
}

function readHandCardId(card: unknown): string | null {
  if (!card || typeof card !== 'object') return null;
  const maybeCard = (card as { card?: { id?: unknown } }).card;
  return typeof maybeCard?.id === 'string' && maybeCard.id.trim() ? maybeCard.id : null;
}

function isCompleteArchetypeHand(hand: ArchetypeHand | null | undefined): hand is ArchetypeHand {
  if (!hand) return false;
  return Boolean(
    readHandCardId(hand.dominant)
    && readHandCardId(hand.secondary)
    && Array.isArray(hand.supports)
    && hand.supports.length === 2
    && readHandCardId(hand.supports[0])
    && readHandCardId(hand.supports[1])
    && readHandCardId(hand.shadow),
  );
}

export function isCompanionRegenPersonalityComplete(
  context: CompanionRegenPersonalityContext | null | undefined,
): context is Required<Pick<CompanionRegenPersonalityContext, 'answers' | 'archetypeHand'>> & CompanionRegenPersonalityContext {
  return Boolean(
    context
    && isCompleteAnswerSet(context.answers)
    && isCompleteArchetypeHand(context.archetypeHand),
  );
}

function resolvePersonalityMatchBoostPct(
  creature: CreatureDefinition,
  context: CompanionRegenPersonalityContext | null | undefined,
): number {
  if (!isCompanionRegenPersonalityComplete(context)) return 0;

  const affinityArchetypes = getArchetypeIdsForAffinity(creature.affinity);
  const dominantId = readHandCardId(context.archetypeHand.dominant);
  if (dominantId && affinityArchetypes.includes(dominantId)) return 0.02;

  const secondaryId = readHandCardId(context.archetypeHand.secondary);
  if (secondaryId && affinityArchetypes.includes(secondaryId)) return 0.015;

  const supportIds = context.archetypeHand.supports
    .map((card) => readHandCardId(card))
    .filter((id): id is string => Boolean(id));
  if (supportIds.some((id) => affinityArchetypes.includes(id))) return 0.01;

  const weaknessTags = context.weaknessTags ?? [];
  const companionWeaknessSupport = getWeaknessSupportTagsForAffinity(creature.affinity);
  if (weaknessTags.some((tag) => companionWeaknessSupport.includes(tag))) return 0.005;

  return 0;
}

export function resolveCompanionRegenModifier(params: {
  record: Pick<IslandRunGameStateRecord, 'activeCompanionId' | 'creatureCollection'>;
  personalityContext?: CompanionRegenPersonalityContext | null;
}): CompanionRegenModifier {
  const companion = resolveActiveCompanionForRegen(params.record);
  if (!companion) {
    return {
      activeCompanionId: null,
      boostPct: 0,
      cappedBoostPct: 0,
      rarityPct: 0,
      bondPct: 0,
      matchPct: 0,
      isOwned: false,
      isPersonalityComplete: isCompanionRegenPersonalityComplete(params.personalityContext),
      wasCapped: false,
    };
  }

  const rarityPct = RARITY_REGEN_BOOST_PCT[companion.creature.tier] ?? 0;
  const bondPct = resolveBondBoostPct(companion.collectionEntry.bondLevel);
  const matchPct = resolvePersonalityMatchBoostPct(companion.creature, params.personalityContext);
  const boostPct = rarityPct + bondPct + matchPct;
  const cappedBoostPct = capCompanionRegenBoostPct(boostPct);

  return {
    activeCompanionId: companion.activeCompanionId,
    boostPct,
    cappedBoostPct,
    rarityPct,
    bondPct,
    matchPct,
    isOwned: true,
    isPersonalityComplete: isCompanionRegenPersonalityComplete(params.personalityContext),
    wasCapped: cappedBoostPct < boostPct,
  };
}
