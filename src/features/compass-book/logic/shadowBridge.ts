/**
 * Bridge between the personality archetype hand and Chapter 2 (Inner Compass).
 *
 * Chapter 2's shadow activities ask what pulls the player off course. The
 * Player Hand already knows two useful things:
 * - the dominant card's stress behaviour (a strength overused becomes a shadow
 *   pattern — exactly what activities 3/14/15 ask about), and
 * - the shadow card (the least-played archetype, whose gifts go missing).
 *
 * This module is pure: it recomputes the hand from stored trait/axis scores
 * (never trusting a possibly stale stored hand) and maps the dominant card to
 * a suggested option from Chapter 2's SHADOW_OPTIONS pool. The suggestion is a
 * tap-to-fill hint, mirroring the goals/habits picker — the player always
 * chooses.
 */

import { ARCHETYPE_DECK } from '../../identity/archetypes/archetypeDeck';
import { rankArchetypes, scoreArchetypes } from '../../identity/archetypes/archetypeScoring';
import { buildHand } from '../../identity/archetypes/archetypeHandBuilder';
import { isDimensionMeasured, type PersonalityScores } from '../../identity/personalityScoring';
import type { DimensionKey } from '../../identity/personalityTestData';

/** Chapter-2 activity questions the hint may appear on (all single_choice over SHADOW_OPTIONS). */
export const SHADOW_HINT_QUESTION_IDS: ReadonlySet<string> = new Set([
  'unlike_self',
  'overuse',
  'shadow',
]);

/** Chapter-2 value questions the values hint may appear on (core_values is multi_choice over VALUE_OPTIONS). */
export const VALUE_HINT_QUESTION_IDS: ReadonlySet<string> = new Set(['core_values']);

/**
 * Archetype → likely core values (Chapter-2 VALUE_OPTIONS ids). Derived from
 * each card's drive/strengths; ids must stay within
 * chapter2InnerCompass.VALUE_OPTIONS (enforced by test). The foundation test
 * measures how you operate, not what you value, so these are the compass's
 * best first guess at True North from your hand — a hint, never an answer.
 */
export const SUGGESTED_VALUES_BY_ARCHETYPE: Record<string, string[]> = {
  commander: ['impact', 'mastery'],
  champion: ['mastery', 'impact'],
  strategist: ['mastery', 'growth'],
  challenger: ['honesty', 'justice'],
  guardian: ['security', 'kindness'],
  warlord: ['impact', 'freedom'],
  diplomat: ['connection', 'justice'],
  enforcer: ['justice', 'honesty'],
  caregiver: ['kindness', 'connection'],
  mentor: ['growth', 'kindness'],
  peacemaker: ['connection', 'kindness'],
  altruist: ['kindness', 'impact'],
  empath: ['connection', 'kindness'],
  healer: ['kindness', 'growth'],
  connector: ['connection', 'adventure'],
  devotee: ['faith', 'connection'],
  sage: ['growth', 'mastery'],
  analyst: ['mastery', 'honesty'],
  architect: ['mastery', 'creativity'],
  inventor: ['creativity', 'growth'],
  scholar: ['mastery', 'growth'],
  detective: ['honesty', 'justice'],
  philosopher: ['growth', 'honesty'],
  engineer: ['mastery', 'security'],
  explorer: ['adventure', 'freedom'],
  creator: ['creativity', 'freedom'],
  rebel: ['freedom', 'justice'],
  visionary: ['impact', 'creativity'],
  mystic: ['faith', 'growth'],
  dreamer: ['creativity', 'adventure'],
  shaman: ['faith', 'connection'],
  pioneer: ['adventure', 'impact'],
};

const MAX_SUGGESTED_VALUES = 4;

/**
 * Dominant archetype → suggested SHADOW_OPTIONS id.
 * Derived from each card's stressBehavior/weaknesses in archetypeDeck.ts;
 * ids must stay within chapter2InnerCompass.SHADOW_OPTIONS (enforced by test).
 */
export const SUGGESTED_SHADOW_OPTION_BY_ARCHETYPE: Record<string, string> = {
  commander: 'rigidity',
  champion: 'overextension',
  strategist: 'stagnation',
  challenger: 'impatience',
  guardian: 'rigidity',
  warlord: 'impatience',
  diplomat: 'people_pleasing',
  enforcer: 'rigidity',
  caregiver: 'overextension',
  mentor: 'overextension',
  peacemaker: 'people_pleasing',
  altruist: 'overextension',
  empath: 'isolation',
  healer: 'denial',
  connector: 'scattered',
  devotee: 'rigidity',
  sage: 'stagnation',
  analyst: 'stagnation',
  architect: 'rigidity',
  inventor: 'scattered',
  scholar: 'isolation',
  detective: 'rigidity',
  philosopher: 'stagnation',
  engineer: 'rigidity',
  explorer: 'scattered',
  creator: 'stagnation',
  rebel: 'impatience',
  visionary: 'denial',
  mystic: 'isolation',
  dreamer: 'denial',
  shaman: 'isolation',
  pioneer: 'overextension',
};

export type CompassShadowBridgeData = {
  dominantId: string;
  dominantName: string;
  dominantIcon: string;
  /** The dominant card's pattern under stress — its overuse shadow. */
  dominantStressBehavior: string;
  shadowId: string;
  shadowName: string;
  shadowIcon: string;
  /** The shadow card's first strength — the gift that goes missing while unplayed. */
  shadowGift: string;
  /** SHADOW_OPTIONS id suggested from the dominant card's overuse pattern. */
  suggestedShadowOptionId: string | null;
  /** VALUE_OPTIONS ids suggested from the top cards in the hand (True North guess). */
  suggestedValueIds: string[];
};

export function buildShadowBridgeData(scores: PersonalityScores): CompassShadowBridgeData {
  const hand = buildHand(rankArchetypes(scoreArchetypes(scores, ARCHETYPE_DECK)));
  const dominant = hand.dominant.card;
  const shadow = hand.shadow.card;

  // Draw value suggestions from the played cards (dominant → secondary →
  // supports), in that priority, deduped and capped.
  const topCards = [hand.dominant.card, hand.secondary.card, ...hand.supports.map((s) => s.card)];
  const suggestedValueIds: string[] = [];
  for (const card of topCards) {
    for (const valueId of SUGGESTED_VALUES_BY_ARCHETYPE[card.id] ?? []) {
      if (!suggestedValueIds.includes(valueId) && suggestedValueIds.length < MAX_SUGGESTED_VALUES) {
        suggestedValueIds.push(valueId);
      }
    }
  }

  return {
    dominantId: dominant.id,
    dominantName: dominant.name,
    dominantIcon: dominant.icon,
    dominantStressBehavior: dominant.stressBehavior,
    shadowId: shadow.id,
    shadowName: shadow.name,
    shadowIcon: shadow.icon,
    shadowGift: shadow.strengths[0] ?? 'a quieter kind of strength',
    suggestedShadowOptionId: SUGGESTED_SHADOW_OPTION_BY_ARCHETYPE[dominant.id] ?? null,
    suggestedValueIds,
  };
}

/**
 * Coerces stored trait/axis records (loose Record<string, number> from the DB)
 * into PersonalityScores. Missing dimensions default to neutral 50, and
 * dimensions the foundation test never measured are pinned to 50 even when a
 * value is stored — records saved before the phantom-0% fix carry a bogus 0
 * for honesty_humility/emotionality that would otherwise bias the hand.
 */
export function coercePersonalityScores(
  traits: Record<string, number> | null | undefined,
  axes: Record<string, number> | null | undefined,
): PersonalityScores {
  const t = traits ?? {};
  const a = axes ?? {};
  const pick = (source: Record<string, number>, key: string): number => {
    if (!isDimensionMeasured(key as DimensionKey)) return 50;
    return typeof source[key] === 'number' && Number.isFinite(source[key]) ? source[key] : 50;
  };

  return {
    traits: {
      openness: pick(t, 'openness'),
      conscientiousness: pick(t, 'conscientiousness'),
      extraversion: pick(t, 'extraversion'),
      agreeableness: pick(t, 'agreeableness'),
      emotional_stability: pick(t, 'emotional_stability'),
    },
    axes: {
      regulation_style: pick(a, 'regulation_style'),
      stress_response: pick(a, 'stress_response'),
      identity_sensitivity: pick(a, 'identity_sensitivity'),
      cognitive_entry: pick(a, 'cognitive_entry'),
      honesty_humility: pick(a, 'honesty_humility'),
      emotionality: pick(a, 'emotionality'),
    },
  };
}
