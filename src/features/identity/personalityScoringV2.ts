/**
 * Scoring for foundation test v2 (scenario questions).
 *
 * Two things come out of one set of answers:
 * - `scores` — the same PersonalityScores shape every downstream consumer
 *   already uses, so the archetype deck and friends need no changes;
 * - `axisScores` — the five game axes, which is what the player actually sees.
 *
 * Skips are first-class: any question may be left unanswered, so a dimension
 * can end up with no data at all. Those dimensions are reported in `measured`
 * (absent = unmeasured) and left at the neutral placeholder rather than scored
 * as 0 — the same discipline that fixed the phantom-0% bug in #3155, but
 * per-record instead of a static set.
 */

import type { AxisKey, DimensionKey, TraitKey } from './personalityTestData';
import { NEUTRAL_PERCENT, type PersonalityScores } from './personalityScoring';
import {
  GAME_AXIS_KEYS,
  SCENARIO_QUESTION_BANK,
  getScenarioQuestion,
  type GameAxisKey,
} from './personalityTestDataV2';

/** questionId → chosen option id. A missing key means skipped/unanswered. */
export type ScenarioAnswers = Record<string, string>;

export type ScenarioScores = {
  scores: PersonalityScores;
  axisScores: Record<GameAxisKey, number>;
  /** Dimensions with at least one scored option behind them. */
  measured: Set<DimensionKey>;
  /** Game axes with at least one answered question. */
  measuredAxes: Set<GameAxisKey>;
  answeredCount: number;
  skippedCount: number;
};

const TRAIT_KEYS: TraitKey[] = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'emotional_stability',
];

const AXIS_KEYS: AxisKey[] = [
  'regulation_style',
  'stress_response',
  'identity_sensitivity',
  'cognitive_entry',
  'honesty_humility',
  'emotionality',
];

function normalize(average: number): number {
  return Math.round(((average - 1) / 4) * 100);
}

export function scoreScenarioAnswers(answers: ScenarioAnswers): ScenarioScores {
  const dimTotals = new Map<DimensionKey, { sum: number; count: number }>();
  const axisTotals = new Map<GameAxisKey, { sum: number; count: number }>();
  let answeredCount = 0;

  for (const question of SCENARIO_QUESTION_BANK) {
    const optionId = answers[question.id];
    if (!optionId) continue; // skipped
    const option = question.options.find((candidate) => candidate.id === optionId);
    if (!option) continue; // unknown option id — treat as skipped rather than throw
    answeredCount += 1;

    const axisEntry = axisTotals.get(question.axis) ?? { sum: 0, count: 0 };
    axisEntry.sum += option.axisLoad;
    axisEntry.count += 1;
    axisTotals.set(question.axis, axisEntry);

    for (const [dimension, load] of Object.entries(option.traitLoads) as [DimensionKey, number][]) {
      const entry = dimTotals.get(dimension) ?? { sum: 0, count: 0 };
      entry.sum += load;
      entry.count += 1;
      dimTotals.set(dimension, entry);
    }
  }

  const resolve = (key: DimensionKey): number => {
    const entry = dimTotals.get(key);
    return entry && entry.count > 0 ? normalize(entry.sum / entry.count) : NEUTRAL_PERCENT;
  };

  const traits = TRAIT_KEYS.reduce((acc, key) => {
    acc[key] = resolve(key);
    return acc;
  }, {} as Record<TraitKey, number>);

  const axes = AXIS_KEYS.reduce((acc, key) => {
    acc[key] = resolve(key);
    return acc;
  }, {} as Record<AxisKey, number>);

  const axisScores = GAME_AXIS_KEYS.reduce((acc, key) => {
    const entry = axisTotals.get(key);
    acc[key] = entry && entry.count > 0 ? normalize(entry.sum / entry.count) : NEUTRAL_PERCENT;
    return acc;
  }, {} as Record<GameAxisKey, number>);

  const measured = new Set<DimensionKey>();
  dimTotals.forEach((entry, key) => {
    if (entry.count > 0) measured.add(key);
  });

  const measuredAxes = new Set<GameAxisKey>();
  axisTotals.forEach((entry, key) => {
    if (entry.count > 0) measuredAxes.add(key);
  });

  return {
    scores: { traits, axes },
    axisScores,
    measured,
    measuredAxes,
    answeredCount,
    skippedCount: SCENARIO_QUESTION_BANK.length - answeredCount,
  };
}

/**
 * Recomputes axis scores from a stored v2 record's raw answers. Returns null
 * when the record has no usable v2 answers, so callers can fall back rather
 * than display a hand of neutral 50s.
 */
export function scoreStoredScenarioAnswers(
  answers: Record<string, unknown> | null | undefined,
): ScenarioScores | null {
  if (!answers) return null;
  const normalized: ScenarioAnswers = {};
  for (const [questionId, value] of Object.entries(answers)) {
    if (typeof value !== 'string') continue;
    if (!getScenarioQuestion(questionId)) continue;
    normalized[questionId] = value;
  }
  if (Object.keys(normalized).length === 0) return null;
  return scoreScenarioAnswers(normalized);
}

/** Short playstyle read, e.g. "Planner · Bounce-back · Solo". Skipped axes are omitted. */
export function describePlaystyle(
  axisScores: Record<GameAxisKey, number>,
  measuredAxes: Set<GameAxisKey>,
  axisLabels: { key: GameAxisKey; highLabel: string; lowLabel: string }[],
): string[] {
  return axisLabels
    .filter((axis) => measuredAxes.has(axis.key))
    .map((axis) => (axisScores[axis.key] >= NEUTRAL_PERCENT ? axis.highLabel : axis.lowLabel));
}
