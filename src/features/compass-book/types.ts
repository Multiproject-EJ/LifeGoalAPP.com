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

/** Curriculum bundle version. Bump when activity/question wording changes in a
 * way that should produce a new answer bundle while keeping old answers readable. */
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
};

/**
 * A text block may offer a one-tap "pick from your own data" affordance sourced
 * from the player's real app entities, so the heaviest "name your goal/habit"
 * prompts become a tap instead of typing. The picker only fills the text answer
 * (the block stays a text block) — it never changes the answer shape, so
 * projectors and the goal/habit bridges are unaffected.
 */
export type CompassPickSource = 'player_goals' | 'player_habits';

export type CompassBlockDefinition = {
  /** Stable id, unique within its activity. Never use array position as identity. */
  questionId: string;
  type: CompassBlockType;
  prompt: string;
  required: boolean;
  /** For choice/emotion/ranking blocks. */
  options?: CompassBlockOption[];
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
  /** Whether the activity must be completed for the chapter to be confirmable. */
  required: boolean;
  /** True for fully authored activities; false for reserved slots (chapters 2–6 MVP). */
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
  | { kind: 'text'; text: string }
  | { kind: 'confirmation'; confirmed: boolean };

export type CompassAnswerRecord = {
  activityId: string;
  questionId: string;
  value: CompassAnswerValue;
  sourceMode: CompassAnswerSourceMode;
  curriculumVersion: string;
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
