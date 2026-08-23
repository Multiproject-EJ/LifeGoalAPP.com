/**
 * Compass Book — core types.
 *
 * These types describe the NEW six-chapter Compass Book curriculum and its
 * durable answer/output model. They are deliberately independent of the legacy
 * 11-phase Island Run Compass (`src/services/compassState.ts` /
 * `compassCurriculum.ts`) and must never be overloaded onto that shape.
 *
 * This file is pure data/types only — no React, no Supabase, no browser APIs —
 * so it can be unit-tested under a plain CommonJS tsc compile.
 */

import type { Json } from '../../lib/database.types';

/**
 * Stable identity of the six-chapter book bundle used by the book row. Do not
 * bump this for a single chapter's method rewrite: fetches use it as an exact
 * key, so doing so would make existing books appear absent.
 */
export const COMPASS_CURRICULUM_VERSION = 'v1';

/** Stable chapter identifiers (never reorder/rename — they are persisted). */
export const COMPASS_BOOK_CHAPTER_IDS = [
  'living_wheel',
  'inner_compass',
  'living_horizon',
  'ikigai_map',
  'quest_forge',
  'personal_playbook',
] as const;

export type CompassBookChapterId = (typeof COMPASS_BOOK_CHAPTER_IDS)[number];

/** Chapter-local method/content versions. These can evolve independently while
 * the global book identity and previously sealed snapshots remain readable. */
export const COMPASS_CHAPTER_METHOD_VERSIONS: Record<CompassBookChapterId, string> = {
  living_wheel: 'living-wheel-v2',
  inner_compass: 'inner-compass-v2',
  living_horizon: 'living-horizon-v2',
  ikigai_map: 'ikigai-map-v2',
  quest_forge: 'quest-forge-v2',
  personal_playbook: 'personal-playbook-v2',
};

export function getCompassChapterMethodVersion(chapterId: CompassBookChapterId): string {
  return COMPASS_CHAPTER_METHOD_VERSIONS[chapterId];
}

export const COMPASS_ACTIVITIES_PER_CHAPTER = 20;
export const COMPASS_TOTAL_ISLANDS = 120;

// ---------------------------------------------------------------------------
// Visual stages
// ---------------------------------------------------------------------------

/**
 * Each chapter's one-page graphic builds across five stages as activities are
 * completed. Activity 20 (review/seal) lives in the final stage. This mirrors
 * the "partially complete throughout" design rule.
 */
export const COMPASS_CHAPTER_STAGES = [
  { index: 1, id: 'reveal', label: 'Reveal', orderRange: [1, 4] },
  { index: 2, id: 'signals', label: 'Signals', orderRange: [5, 8] },
  { index: 3, id: 'patterns', label: 'Patterns', orderRange: [9, 12] },
  { index: 4, id: 'insights', label: 'Insights', orderRange: [13, 16] },
  { index: 5, id: 'direction', label: 'Direction', orderRange: [17, 20] },
] as const;

export type CompassChapterStageIndex = 1 | 2 | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// Curriculum definition (static content, no React)
// ---------------------------------------------------------------------------

export type CompassBlockType =
  | 'single_choice'
  | 'multi_choice'
  | 'scale'
  | 'ranking'
  | 'emotion_choice'
  | 'short_text'
  | 'sentence_completion'
  | 'reflection'
  | 'experiment'
  | 'check_in'
  | 'review'
  | 'confirmation';

export type CompassBlockOption = {
  /** Stable id, unique within the block. */
  id: string;
  label: string;
  /** Concrete situation shown above the more abstract option label. */
  scenarioTitle?: string;
  /** Plain-language detail that helps the player recognise the situation. */
  description?: string;
  /** Optional visual recognition aid. Text remains authoritative and visible. */
  visual?:
    | {
        kind: 'sprite';
        src: string;
        column: number;
        row: number;
        columns: number;
        rows: number;
        alt: string;
      }
    | {
        kind: 'symbol';
        symbol: string;
        alt: string;
      };
  /** Overrides the block's normal completion copy for this option. */
  selectionMessage?: string;
};

/**
 * A text block may offer a one-tap "pick from your own data" affordance sourced
 * from the player's real app entities, so the heaviest "name your goal/habit"
 * prompts become a tap instead of typing. The picker only fills the text answer
 * (the block stays a text block) — it never changes the answer shape, so
 * projectors and the goal/habit bridges are unaffected.
 */
export type CompassPickSource = 'player_goals' | 'player_habits';

/**
 * A reference to the canonical app entity a text answer was picked from (via the
 * goals/habits picker). Lets the goal/habit bridge update the existing entity
 * instead of creating a duplicate. Absent when the player typed their own text
 * (typing in the box clears any prior reference).
 */
export type CompassSourceRef = { kind: 'goal' | 'habit'; id: string };

export type CompassBlockDefinition = {
  /** Stable id, unique within its activity. Never use array position as identity. */
  questionId: string;
  type: CompassBlockType;
  prompt: string;
  required: boolean;
  /** For choice/emotion/ranking blocks. */
  options?: CompassBlockOption[];
  /** Restrict this block's options to ids selected in another answer. */
  optionsFromQuestionId?: string;
  /**
   * Restrict reference options to earlier text questions that currently have
   * an answer. Option ids must match the referenced question ids. This lets a
   * ranking omit empty candidate slots without changing saved answer shapes.
   */
  optionsFromAnsweredQuestionIds?: string[];
  /** Show select-all/clear-all for broad multi-choice capture. */
  allowSelectAll?: boolean;
  /** Optional minimum selection count for multi-choice completion. */
  minSelections?: number;
  /** Optional selection cap for multi-choice blocks. */
  maxSelections?: number;
  /** Shown when a compatible choice answer satisfies its selection bounds. */
  completionMessage?: string;
  /** For scale blocks. */
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  /** For text blocks. */
  placeholder?: string;
  maxLength?: number;
  helpText?: string;
  /**
   * For text blocks only: offer a one-tap chip picker sourced from the player's
   * real goals/habits that fills this text answer. Optional and additive — when
   * absent or when the player has no such data, the block behaves as plain text.
   */
  pickFrom?: CompassPickSource;
};

export type CompassBookActivityDefinition = {
  /** Globally unique, stable id, e.g. `living_wheel.a01`. */
  id: string;
  chapterId: CompassBookChapterId;
  /** 1..120 — the Island Run island that unlocks this activity. */
  islandNumber: number;
  /** 1..20 — position within the chapter. */
  order: number;
  /** 1..5 — visual build stage. Derived but stored for convenience/validation. */
  stage: CompassChapterStageIndex;
  title: string;
  shortTitle: string;
  description?: string;
  /** Earned, non-punitive synthesis shown once the activity is answerable. */
  completionMessage?: string;
  /** Whether the activity must be completed for the chapter to be confirmable. */
  required: boolean;
  /**
   * True for fully authored activities. All six chapters are now authored, so
   * every shipped activity sets this true; the flag stays as the guard the
   * chapter tests assert on, and for any future chapter drafted in stages.
   */
  authored: boolean;
  blocks: CompassBlockDefinition[];
};

export type CompassBookChapterDefinition = {
  id: CompassBookChapterId;
  /** 1..6 */
  order: number;
  title: string;
  /** Alternative/short subtitle, e.g. "The Living Horizon". */
  subtitle?: string;
  coreQuestion: string;
  visualMetaphor: string;
  /** Names of the chapter's signature output fields (for docs/UI scaffolding). */
  outputFields: string[];
  islandRange: [number, number];
  activities: CompassBookActivityDefinition[];
};

// ---------------------------------------------------------------------------
// Answers (persisted)
// ---------------------------------------------------------------------------

export type CompassAnswerSourceMode = 'fixed_guided' | 'direct_edit' | 'ai_guided';

export type CompassAnswerValue =
  | { kind: 'choice'; optionId: string }
  | { kind: 'multi_choice'; optionIds: string[] }
  | { kind: 'scale'; value: number }
  | { kind: 'ranking'; orderedOptionIds: string[] }
  | { kind: 'emotion'; optionId: string }
  | { kind: 'text'; text: string; sourceRef?: CompassSourceRef }
  | { kind: 'confirmation'; confirmed: boolean };

export type CompassAnswerRecord = {
  activityId: string;
  questionId: string;
  value: CompassAnswerValue;
  sourceMode: CompassAnswerSourceMode;
  /** Global book bundle identity retained for storage compatibility. */
  curriculumVersion: string;
  /** Chapter-local elicitation method used when this answer was recorded. */
  methodVersion?: string;
  answeredAt: string;
  updatedAt: string;
  /** Player has explicitly confirmed this answer (required for completion). */
  confirmed: boolean;
  /** Forward-compat snapshots so old answers stay readable after wording changes. */
  promptLabel?: string;
  optionLabels?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Chapter & book state (persisted)
// ---------------------------------------------------------------------------

export type CompassChapterStatus = 'locked' | 'unlocked' | 'in_progress' | 'complete';

export type CompassChapterState = {
  chapterId: CompassBookChapterId;
  contentVersion: string;
  status: CompassChapterStatus;
  answers: CompassAnswerRecord[];
  /** Deterministic projection of answers (proposed outputs). */
  draftOutput: Json | null;
  /** Player-sealed snapshot. Non-null marks the chapter complete. */
  confirmedOutput: Json | null;
  completedActivityIds: string[];
  confirmedAt: string | null;
};

export type CompassBookStatus = 'not_started' | 'in_progress' | 'completed';

export type CompassBook = {
  id: string;
  userId: string;
  curriculumVersion: string;
  status: CompassBookStatus;
  currentChapterId: CompassBookChapterId | null;
  currentActivityId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

// ---------------------------------------------------------------------------
// Progress (derived, never persisted)
// ---------------------------------------------------------------------------

export type CompassActivityProgressStatus =
  | 'locked'
  | 'unlocked'
  | 'started'
  | 'answered'
  | 'complete';

export type CompassActivityProgress = {
  activityId: string;
  islandNumber: number;
  order: number;
  status: CompassActivityProgressStatus;
};

export type CompassChapterProgress = {
  chapterId: CompassBookChapterId;
  status: CompassChapterStatus;
  totalCount: number;
  unlockedCount: number;
  completedCount: number;
  /** 0..1 completion rate of activities within the chapter. */
  completionRate: number;
  /** Highest visual stage (1..5) reached by completed activities. */
  stageReached: number;
  /** Next unlocked, not-yet-complete activity (the "continue" target). */
  nextActivityId: string | null;
  activities: CompassActivityProgress[];
};

/**
 * Progress lookup passed down from {@link CompassBookScreen} to every page.
 * Declared here (rather than on a component) so pages can share it without
 * importing each other.
 */
export type CompassGetProgress = (
  chapterId: CompassBookChapterId,
  currentIslandNumber: number,
) => CompassChapterProgress;
