/**
 * Folds completed micro-test results into the foundation personality scores and
 * reports which dimensions are now "measured" (so the results UI can reveal the
 * two HEXACO axes once a micro-test has actually measured them).
 *
 * Rules per dimension:
 * - Foundation-measured trait/axis → blend the foundation value with the
 *   micro-test results (decay-weighted, foundation anchored) via blendScores.
 * - Axis the foundation does NOT measure (honesty_humility, emotionality) → use
 *   a decay-weighted mean of the micro-test results directly. There is no real
 *   foundation value to anchor to (it sits at the neutral-50 placeholder).
 * - Anything else → store under hexaco.
 */

import {
  FOUNDATION_MEASURED_DIMENSIONS,
  type PersonalityScores,
} from '../personalityScoring';
import type { AxisKey, TraitKey } from '../personalityTestData';
import { ARCHETYPE_DECK } from '../archetypes/archetypeDeck';
import { rankArchetypes, scoreArchetypes } from '../archetypes/archetypeScoring';
import { buildHand } from '../archetypes/archetypeHandBuilder';
import {
  analyzeHandChanges,
  blendScores,
  type HandChange,
  type MicroTestResult,
} from './microTestScoring';

const TRAIT_KEYS: readonly TraitKey[] = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'emotional_stability',
];

const AXIS_KEYS: readonly AxisKey[] = [
  'regulation_style',
  'stress_response',
  'identity_sensitivity',
  'cognitive_entry',
  'honesty_humility',
  'emotionality',
];

// Matches DECAY_HALF_LIFE_DAYS in microTestScoring (kept local to avoid
// exporting internal blend config).
const DECAY_HALF_LIFE_DAYS = 60;

function isTraitKey(dim: string): dim is TraitKey {
  return (TRAIT_KEYS as readonly string[]).includes(dim);
}
function isAxisKey(dim: string): dim is AxisKey {
  return (AXIS_KEYS as readonly string[]).includes(dim);
}

function decayWeightedMean(
  results: MicroTestResult[],
  dimension: string,
  now: Date,
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const result of results) {
    const score = result.dimensionScores[dimension];
    if (typeof score !== 'number') continue;
    const days = Math.max(0, (now.getTime() - result.takenAt.getTime()) / 86400000);
    const weight = Math.pow(0.5, days / DECAY_HALF_LIFE_DAYS);
    weightedSum += score * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
}

export function collectMicroTestDimensions(results: MicroTestResult[]): Set<string> {
  const dims = new Set<string>();
  for (const result of results) {
    for (const dim of Object.keys(result.dimensionScores)) dims.add(dim);
  }
  return dims;
}

export type MergedScores = {
  scores: PersonalityScores;
  /** Dimensions with real data: the foundation set plus anything a micro-test measured. */
  measured: Set<string>;
};

export function mergeMicroTestScores(
  foundation: PersonalityScores,
  results: MicroTestResult[],
  now: Date = new Date(),
): MergedScores {
  const measured = new Set<string>(FOUNDATION_MEASURED_DIMENSIONS);
  const traits: PersonalityScores['traits'] = { ...foundation.traits };
  const axes: PersonalityScores['axes'] = { ...foundation.axes };
  const hexaco: Partial<Record<string, number>> = { ...(foundation.hexaco ?? {}) };

  if (results.length === 0) {
    return { scores: { traits, axes, hexaco }, measured };
  }

  for (const dim of collectMicroTestDimensions(results)) {
    if (isTraitKey(dim)) {
      traits[dim] = blendScores(foundation.traits[dim], results, dim, now);
      measured.add(dim);
    } else if (isAxisKey(dim)) {
      if (FOUNDATION_MEASURED_DIMENSIONS.has(dim)) {
        axes[dim] = blendScores(foundation.axes[dim], results, dim, now);
      } else {
        const mean = decayWeightedMean(results, dim, now);
        if (mean !== null) axes[dim] = mean;
      }
      measured.add(dim);
    } else {
      const mean = decayWeightedMean(results, dim, now);
      if (mean !== null) {
        hexaco[dim] = mean;
        measured.add(dim);
      }
    }
  }

  return { scores: { traits, axes, hexaco }, measured };
}

/**
 * Computes the archetype-hand changes a new micro-test result would produce,
 * for the "what changed in your deck" summary. Pure: rebuilds the hand before
 * and after the new result and diffs them.
 */
export function analyzeMicroTestImpact(
  foundation: PersonalityScores,
  priorResults: MicroTestResult[],
  newResult: MicroTestResult,
  now: Date = new Date(),
): HandChange[] {
  const handFrom = (results: MicroTestResult[]) =>
    buildHand(
      rankArchetypes(scoreArchetypes(mergeMicroTestScores(foundation, results, now).scores, ARCHETYPE_DECK)),
    );
  const before = handFrom(priorResults);
  const after = handFrom([...priorResults, newResult]);
  return analyzeHandChanges(before, after);
}
