/**
 * islandNarrativeReactionDispatch — data-driven dispatch for the "reaction"
 * narrative beats (stop opened/completed, landmark level reactions,
 * majority-restored, boss-challenge framing).
 *
 * This is the generalized path the wiring plan calls for: a pure snapshot →
 * trigger diff, a content-driven beat lookup, and a content-driven surface
 * payload. Adding a future reaction beat is then a **content-only** change in
 * `island001Narrative.ts` (as long as its trigger kind is covered by the
 * snapshot below), with no controller edits.
 *
 * The seven original beats (B02/B03/B04/B24/B26/B29/B30) keep their bespoke,
 * battle-tested machinery in `useIslandNarrativeOpeningFlow`. Those ids are
 * listed in `REACTION_EXCLUDED_BEAT_IDS` so this layer never double-handles
 * them (e.g. Hatchery stop-open = B04, Hatchery L1 = B24).
 *
 * Pure and dependency-light: no React, no gameplay services, no persistence.
 */

import { getIslandNarrativeDefinition } from './islandNarrativeRegistry';
import type {
  IslandNarrativeBeat,
  IslandNarrativeDefinition,
  IslandNarrativeStopId,
  IslandNarrativeTrigger,
} from './islandNarrativeTypes';
import type { IslandNarrativeDialogueTone } from './components/IslandNarrativeDialogue';

/** Canonical stop order — index aligns with `stopBuildStateByIndex`. */
export const STOP_ID_BY_INDEX: readonly IslandNarrativeStopId[] = [
  'hatchery',
  'habit',
  'mystery',
  'wisdom',
  'boss',
];

/** Beats owned by the legacy opening-flow controller; never reaction-handled. */
export const REACTION_EXCLUDED_BEAT_IDS: ReadonlySet<string> = new Set([
  'I001-B02',
  'I001-B03',
  'I001-B04',
  'I001-B24',
  'I001-B26',
  'I001-B29',
  'I001-B30',
]);

export interface IslandNarrativeReactionSnapshot {
  activeStopId: string | null;
  completedStopIds: readonly string[];
  /** Build level (0..3) per stop, indexed by `STOP_ID_BY_INDEX`. */
  landmarkBuildLevels: readonly number[];
  bossChallengeActive: boolean;
  /** True once the in-progress boss trial has reached its halfway score. */
  bossChallengeMidpoint: boolean;
  /** True once the boss is challengeable (all builds done) — the finale-setup moment. */
  bossEligible: boolean;
}

function isStopId(value: string | null | undefined): value is IslandNarrativeStopId {
  return value === 'hatchery' || value === 'habit' || value === 'mystery' || value === 'wisdom' || value === 'boss';
}

function countLandmarksAtLevel3(levels: readonly number[]): number {
  return levels.reduce((total, level) => (typeof level === 'number' && level >= 3 ? total + 1 : total), 0);
}

/**
 * Pure diff: the triggers newly satisfied between two snapshots. Returns `[]`
 * when `prev` is null (hydration baseline — seed only, never replay history).
 */
export function diffIslandNarrativeReactionTriggers(
  prev: IslandNarrativeReactionSnapshot | null,
  next: IslandNarrativeReactionSnapshot,
  islandNumber: number,
): IslandNarrativeTrigger[] {
  if (!prev) return [];
  const triggers: IslandNarrativeTrigger[] = [];

  // stop_opened — active stop changed to a (different) canonical stop.
  if (next.activeStopId !== prev.activeStopId && isStopId(next.activeStopId)) {
    triggers.push({ kind: 'stop_opened', islandNumber, stopId: next.activeStopId });
  }

  // stop_completed — stop ids newly present in the completed set.
  const prevCompleted = new Set(prev.completedStopIds);
  for (const stopId of next.completedStopIds) {
    if (!prevCompleted.has(stopId) && isStopId(stopId)) {
      triggers.push({ kind: 'stop_completed', islandNumber, stopId });
    }
  }

  // landmark_level_completed — one trigger per newly-crossed level (1..3).
  for (let index = 0; index < STOP_ID_BY_INDEX.length; index += 1) {
    const stopId = STOP_ID_BY_INDEX[index];
    const before = typeof prev.landmarkBuildLevels[index] === 'number' ? prev.landmarkBuildLevels[index] : 0;
    const after = typeof next.landmarkBuildLevels[index] === 'number' ? next.landmarkBuildLevels[index] : 0;
    for (let level = before + 1; level <= after; level += 1) {
      if (level === 1 || level === 2 || level === 3) {
        triggers.push({ kind: 'landmark_level_completed', islandNumber, stopId, level });
      }
    }
  }

  // landmarks_restored_majority — emitted with the exact new L3 count when it
  // rises, so a beat authored for that threshold matches (e.g. 2 -> 3 fires
  // threshold 3). Content-driven: no threshold baked into this diff.
  const prevL3 = countLandmarksAtLevel3(prev.landmarkBuildLevels);
  const nextL3 = countLandmarksAtLevel3(next.landmarkBuildLevels);
  for (let threshold = prevL3 + 1; threshold <= nextL3; threshold += 1) {
    triggers.push({ kind: 'landmarks_restored_majority', islandNumber, threshold });
  }

  // boss_challenge_started — boss trial just became active.
  if (next.bossChallengeActive && !prev.bossChallengeActive) {
    triggers.push({ kind: 'boss_challenge_started', islandNumber });
  }

  // boss_midpoint — boss trial first reached its halfway score.
  if (next.bossChallengeMidpoint && !prev.bossChallengeMidpoint) {
    triggers.push({ kind: 'boss_midpoint', islandNumber });
  }

  // boss_eligible — the boss became challengeable (finale-setup moment).
  if (next.bossEligible && !prev.bossEligible) {
    triggers.push({ kind: 'boss_eligible', islandNumber });
  }

  return triggers;
}

function triggersMatch(a: IslandNarrativeTrigger, b: IslandNarrativeTrigger): boolean {
  if (a.kind !== b.kind || a.islandNumber !== b.islandNumber) return false;
  const ax = a as Record<string, unknown>;
  const bx = b as Record<string, unknown>;
  if ('stopId' in a || 'stopId' in b) {
    if (ax.stopId !== bx.stopId) return false;
  }
  if ('level' in a || 'level' in b) {
    if (ax.level !== bx.level) return false;
  }
  if ('threshold' in a || 'threshold' in b) {
    if (ax.threshold !== bx.threshold) return false;
  }
  return true;
}

/**
 * Find the authored reaction beat whose trigger matches `trigger`, excluding
 * the legacy-owned beat ids. Returns null when no reaction beat is authored
 * (e.g. Hatchery stop-open / L1, which are legacy-handled).
 */
export function resolveReactionBeat(
  trigger: IslandNarrativeTrigger,
  islandNumber: number,
  definition: IslandNarrativeDefinition | null = getIslandNarrativeDefinition(islandNumber) ?? null,
): IslandNarrativeBeat | null {
  if (!definition) return null;
  return (
    definition.beats.find(
      (beat) => !REACTION_EXCLUDED_BEAT_IDS.has(beat.id) && triggersMatch(beat.trigger, trigger),
    ) ?? null
  );
}

function speakerDisplayName(speakerId: string | undefined, definition: IslandNarrativeDefinition | null): string {
  const character = definition?.characters.find((entry) => entry.id === speakerId);
  // Speaker-less beats (e.g. ambient companion lines) narrate as the island
  // itself — island-aware so this works beyond Island 1.
  return character?.displayName ?? definition?.islandName ?? 'Island';
}

function toneForSpeaker(speakerId: string | undefined): IslandNarrativeDialogueTone {
  if (speakerId === 'sava') return 'wisdom';
  if (speakerId === 'noctyra') return 'guardian';
  return 'standard';
}

export interface ReactionDialoguePayload {
  beatId: string;
  speakerName: string;
  text: string;
  secondaryText?: string;
  continueLabel: string;
  tone: IslandNarrativeDialogueTone;
}

export interface ReactionToastPayload {
  beatId: string;
  speakerName: string;
  text: string;
  supportingLabel?: string;
  durationMs: number;
}

const REACTION_TOAST_DURATION_MS = 3600;

export function buildReactionDialogue(
  beat: IslandNarrativeBeat,
  definition: IslandNarrativeDefinition | null,
): ReactionDialoguePayload | null {
  if (beat.surface !== 'dialogue_sheet' || !beat.text) return null;
  return {
    beatId: beat.id,
    speakerName: speakerDisplayName(beat.speakerId, definition),
    text: beat.text,
    secondaryText: beat.secondaryText,
    continueLabel: beat.displayCtaText ?? 'Continue',
    tone: toneForSpeaker(beat.speakerId),
  };
}

export function buildReactionToast(
  beat: IslandNarrativeBeat,
  definition: IslandNarrativeDefinition | null,
): ReactionToastPayload | null {
  if (beat.surface !== 'toast' || !beat.text) return null;
  return {
    beatId: beat.id,
    speakerName: speakerDisplayName(beat.speakerId, definition),
    text: beat.text,
    durationMs: REACTION_TOAST_DURATION_MS,
  };
}

/**
 * Whether an island has any authored **reaction** beats (i.e. beats not owned by
 * the legacy opening-flow controller). Drives island-agnostic reaction
 * eligibility: any island with reaction content participates, with no per-island
 * controller code. Currently only Island 1 qualifies.
 */
export function islandHasReactionBeats(
  islandNumber: number,
  definition: IslandNarrativeDefinition | null = getIslandNarrativeDefinition(islandNumber) ?? null,
): boolean {
  if (!definition) return false;
  return definition.beats.some((beat) => !REACTION_EXCLUDED_BEAT_IDS.has(beat.id));
}

/** Priority rank for reaction queue ordering (lower shows first). */
export function reactionBeatPriorityRank(beat: IslandNarrativeBeat): number {
  if (beat.priority === 'major') return 0;
  if (beat.priority === 'short') return 1;
  return 2;
}
