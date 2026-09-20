import { ARCHETYPE_DECK } from '../identity/archetypes/archetypeDeck';
import { scoreScenarioAnswers, type ScenarioAnswers } from '../identity/personalityScoringV2';
import { GAME_AXIS_KEYS, SCENARIO_QUESTION_BANK } from '../identity/personalityTestDataV2';
import { scoreRefinement, type RefinementEvidence } from './refinement';

/** Additive model. Never rewrites the saved V2 answers or the existing five-card hand. */
export const PERSONALITY_MODEL_VERSION = 'scenario-v2-evidence-1' as const;
export type EvidenceProfile = ReturnType<typeof buildEvidenceProfile>;

export function buildEvidenceProfile(input: Record<string, unknown>) {
  const answers: ScenarioAnswers = {};
  const samples: Record<string, number> = {};
  const axisSamples: Record<string, number> = {};
  for (const question of SCENARIO_QUESTION_BANK) {
    const option = question.options.find(candidate => candidate.id === input[question.id]);
    if (!option) continue;
    answers[question.id] = option.id;
    axisSamples[question.axis] = (axisSamples[question.axis] ?? 0) + 1;
    for (const dimension of Object.keys(option.traitLoads)) samples[dimension] = (samples[dimension] ?? 0) + 1;
  }
  const result = scoreScenarioAnswers(answers);
  const values: Record<string, number> = { ...result.scores.traits, ...result.scores.axes };
  // A confidence label is not inferred from answer count. This is only a disclosed completeness gate.
  const status = result.answeredCount === 0 ? 'empty' : result.answeredCount < 12 || GAME_AXIS_KEYS.some(axis => (axisSamples[axis] ?? 0) < 2) ? 'limited' : 'usable';
  const archetypes = projectArchetypes(values, samples);
  return { version: PERSONALITY_MODEL_VERSION, answers, values, samples, axisSamples, answeredCount: result.answeredCount,
    totalQuestions: SCENARIO_QUESTION_BANK.length, status, archetypes, axisScores: result.axisScores, refinement: null as RefinementEvidence | null };
}

/** Foundation answers/axes stay intact. Direct motivation ratings are not blended with
 * inferred trait weights: those are different kinds of evidence and remain inspectable.
 */
export function withRefinement(foundation: EvidenceProfile, answers: Record<string, unknown>): EvidenceProfile {
  const refinement = scoreRefinement(answers);
  return { ...foundation, refinement, archetypes: refinement.archetypes };
}

export function projectArchetypes(values: Record<string, number>, samples: Record<string, number>) {
  return ARCHETYPE_DECK.map(card => {
    let sum = 0, measuredWeight = 0, totalWeight = 0;
    const missing: string[] = [];
    for (const [dimension, weight] of Object.entries(card.traitWeights)) {
      const magnitude = Math.abs(weight);
      totalWeight += magnitude;
      if (!(samples[dimension] > 0) || !Number.isFinite(values[dimension])) { missing.push(dimension); continue; }
      measuredWeight += magnitude;
      sum += magnitude * (weight < 0 ? 100 - values[dimension] : values[dimension]);
    }
    return { id: card.id, name: card.name, suit: card.suit, score: measuredWeight ? sum / measuredWeight : null,
      evidence: totalWeight ? measuredWeight / totalWeight : 0, missing };
  });
}

/** Creature and player use the SAME observed dimensions. Missing evidence never becomes a measured 50. */
export function comparableMixes(player: EvidenceProfile, creature: EvidenceProfile) {
  const common = Object.fromEntries(Object.keys(player.samples).filter(key => creature.samples[key] > 0).map(key => [key, 1]));
  const p = projectArchetypes(player.values, common), c = projectArchetypes(creature.values, common);
  return { player: relativeMix(p), creature: relativeMix(c) };
}

/** A fixed 100-point representation budget prevents an all-high target buying extra breadth.
 * Temperature 12 is a provisional game parameter, not a psychological scale.
 */
export function relativeMix(archetypes: ReturnType<typeof projectArchetypes>): Record<string, number> {
  const measured = archetypes.filter(a => a.score !== null && a.evidence > 0);
  if (!measured.length) return {};
  const max = Math.max(...measured.map(a => a.score!));
  const terms = measured.map(a => [a.id, Math.exp((a.score! - max) / 12) * a.evidence] as const);
  const total = terms.reduce((sum, [, value]) => sum + value, 0);
  return Object.fromEntries(terms.map(([id, value]) => [id, value / total]));
}
