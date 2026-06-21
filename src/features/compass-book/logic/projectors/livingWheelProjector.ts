/**
 * Living Wheel projector (Chapter 1).
 *
 * Pure, deterministic derivation of the chapter's one-page output from saved
 * answers. AI is never involved. Outputs are PROPOSALS the player confirms at
 * activity 20 — when the player has explicitly chosen the mechanics (activity 16
 * candidates), those choices win; otherwise the projector derives a suggestion
 * from the scored/emotional data.
 *
 * No React, no Supabase — unit-testable under a plain tsc compile.
 */

import type { Json } from '../../../../lib/database.types';
import type { CompassAnswerRecord, CompassAnswerValue } from '../../types';
import { LIFE_AREA_OPTIONS } from '../../content/chapter1LivingWheel';

export type LivingWheelMomentum = 'rising' | 'flat' | 'declining';

export type LivingWheelAreaSummary = {
  areaId: string;
  current: number | null;
  goodEnough: number | null;
  minimumSafe: number | null;
  desired: number | null;
  spillover: number | null;
  momentum: LivingWheelMomentum | null;
  emotion: string | null;
  /** goodEnough − current (the action gap; more useful than ideal − current). */
  actionGap: number | null;
};

export type LivingWheelOutput = {
  areas: LivingWheelAreaSummary[];
  engineAreaId: string | null;
  brakeAreaId: string | null;
  fragileAreaId: string | null;
  leverAreaId: string | null;
  season: string | null;
  emotionalPattern: string | null;
  nextMove: { areaId: string | null; text: string | null } | null;
  wheelStatement: string | null;
};

const NEGATIVE_EMOTIONS = new Set(['restless', 'anxious', 'frustrated', 'sad', 'drained', 'numb']);

function valueMap(answers: readonly CompassAnswerRecord[]): Map<string, CompassAnswerValue> {
  const map = new Map<string, CompassAnswerValue>();
  for (const answer of answers) map.set(answer.questionId, answer.value);
  return map;
}

function scaleOf(map: Map<string, CompassAnswerValue>, questionId: string): number | null {
  const v = map.get(questionId);
  return v && v.kind === 'scale' && Number.isFinite(v.value) ? v.value : null;
}

function optionOf(map: Map<string, CompassAnswerValue>, questionId: string): string | null {
  const v = map.get(questionId);
  return v && (v.kind === 'choice' || v.kind === 'emotion') ? v.optionId : null;
}

function textOf(map: Map<string, CompassAnswerValue>, questionId: string): string | null {
  const v = map.get(questionId);
  return v && v.kind === 'text' && v.text.trim() ? v.text.trim() : null;
}

/** Life Wheel input adapter: chapter answers → per-area scored model. */
export function buildLivingWheelAreas(
  answers: readonly CompassAnswerRecord[],
): LivingWheelAreaSummary[] {
  const map = valueMap(answers);
  return LIFE_AREA_OPTIONS.map((area) => {
    const current = scaleOf(map, `current.${area.id}`);
    const goodEnough = scaleOf(map, `good_enough.${area.id}`);
    const momentum = optionOf(map, `momentum.${area.id}`) as LivingWheelMomentum | null;
    return {
      areaId: area.id,
      current,
      goodEnough,
      minimumSafe: scaleOf(map, `minimum_safe.${area.id}`),
      desired: scaleOf(map, `desired.${area.id}`),
      spillover: scaleOf(map, `spillover.${area.id}`),
      momentum: momentum === 'rising' || momentum === 'flat' || momentum === 'declining' ? momentum : null,
      emotion: optionOf(map, `emotion.${area.id}`),
      actionGap: goodEnough != null && current != null ? goodEnough - current : null,
    };
  });
}

function pickBest(
  areas: LivingWheelAreaSummary[],
  eligible: (a: LivingWheelAreaSummary) => boolean,
  score: (a: LivingWheelAreaSummary) => number,
  exclude: ReadonlySet<string> = new Set(),
): string | null {
  let best: { id: string; score: number } | null = null;
  for (const area of areas) {
    if (exclude.has(area.areaId) || !eligible(area)) continue;
    const s = score(area);
    if (!best || s > best.score) best = { id: area.areaId, score: s };
  }
  return best?.id ?? null;
}

export function projectLivingWheel(answers: readonly CompassAnswerRecord[]): LivingWheelOutput {
  const map = valueMap(answers);
  const areas = buildLivingWheelAreas(answers);

  const hasCurrent = (a: LivingWheelAreaSummary) => a.current != null;

  // Engine: influential and already strong. Player's candidate wins if present.
  const engineAreaId =
    optionOf(map, 'candidate_engine') ??
    pickBest(
      areas,
      (a) => hasCurrent(a) && a.spillover != null,
      (a) => (a.spillover ?? 0) * 0.6 + (a.current ?? 0) * 0.4,
    );

  const exceptEngine = new Set(engineAreaId ? [engineAreaId] : []);

  // Brake: influential but low and emotionally heavy.
  const brakeAreaId =
    optionOf(map, 'candidate_brake') ??
    pickBest(
      areas,
      (a) => hasCurrent(a),
      (a) =>
        (10 - (a.current ?? 0)) * 0.5 +
        (a.spillover ?? 0) * 0.3 +
        (a.emotion && NEGATIVE_EMOTIONS.has(a.emotion) ? 2 : 0),
      exceptEngine,
    );

  // Fragile Spoke: at or below minimum-safe and/or declining.
  const fragileAreaId =
    optionOf(map, 'candidate_fragile') ??
    pickBest(
      areas,
      (a) => a.current != null && a.minimumSafe != null,
      (a) => (a.minimumSafe ?? 0) - (a.current ?? 0) + (a.momentum === 'declining' ? 2 : 0),
    );

  // Lever: high spillover with a manageable action gap.
  const leverAreaId =
    optionOf(map, 'candidate_lever') ??
    pickBest(
      areas,
      (a) => a.spillover != null && a.actionGap != null && a.actionGap > 0,
      (a) => (a.spillover ?? 0) * Math.min(a.actionGap ?? 0, 4),
      exceptEngine,
    );

  return {
    areas,
    engineAreaId,
    brakeAreaId,
    fragileAreaId,
    leverAreaId,
    season: deriveSeason(areas),
    emotionalPattern: optionOf(map, 'emotional_pattern') ?? mostCommonEmotion(areas),
    nextMove: {
      areaId: optionOf(map, 'next_move_area'),
      text: textOf(map, 'next_move'),
    },
    wheelStatement: textOf(map, 'wheel_statement'),
  };
}

function deriveSeason(areas: LivingWheelAreaSummary[]): string | null {
  const rising = areas.filter((a) => a.momentum === 'rising').length;
  const declining = areas.filter((a) => a.momentum === 'declining').length;
  if (rising === 0 && declining === 0) return null;
  if (rising > declining + 1) return 'Building momentum';
  if (declining > rising + 1) return 'Weathering a storm';
  return 'Steady tending';
}

function mostCommonEmotion(areas: LivingWheelAreaSummary[]): string | null {
  const counts = new Map<string, number>();
  for (const area of areas) {
    if (area.emotion) counts.set(area.emotion, (counts.get(area.emotion) ?? 0) + 1);
  }
  let best: { emotion: string; count: number } | null = null;
  for (const [emotion, count] of counts) {
    if (!best || count > best.count) best = { emotion, count };
  }
  return best?.emotion ?? null;
}

/** Serialize the output for the confirmed_output JSONB snapshot. */
export function livingWheelOutputToJson(output: LivingWheelOutput): Json {
  return output as unknown as Json;
}
