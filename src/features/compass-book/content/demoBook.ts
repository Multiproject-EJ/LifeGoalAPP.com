/**
 * Demo Compass Book — a fully written book for admins and reviewers.
 *
 * Purpose: the book only shows what it is for once someone has answered a
 * hundred fragments, which nobody will do to evaluate a design. This builds a
 * plausible, coherent player so the graphics fill, the Reading reads like a
 * person, and the goal/habit bridges appear.
 *
 * Three rules this module lives by:
 *  1. **It is never persisted.** Demo state is held in memory only — see the
 *     `demo` branch in `useCompassBook`, which skips Supabase and localStorage
 *     entirely. Nothing here can reach a real player's data.
 *  2. **It is deterministic.** No `Math.random`, no `Date.now` in the answers,
 *     so screenshots and reviews are reproducible.
 *  3. **It walks the real curriculum.** Values are generated against the actual
 *     block definitions, so a curriculum change cannot leave demo answers
 *     pointing at question ids or option ids that no longer exist.
 *
 * Pure — no React, no Supabase, no browser APIs.
 */

import {
  COMPASS_CURRICULUM_VERSION,
  getCompassChapterMethodVersion,
  type CompassAnswerRecord,
  type CompassAnswerValue,
  type CompassBlockDefinition,
  type CompassBookChapterId,
  type CompassChapterState,
} from '../types';
import { COMPASS_BOOK_CHAPTERS, getChapterActivities } from './compassBookCurriculum';
import { getChapterConfirmedOutput } from '../logic/projectors';

/** Fixed timestamp so demo answers never shift between runs. */
const DEMO_AT = '2026-05-01T09:00:00.000Z';

/**
 * The lines that carry the book's voice. Keyed by questionId, so these land on
 * the exact questions the projectors read for each chapter's headline output.
 * Everything else is generated.
 */
const DEMO_TEXT: Record<string, string> = {
  // Chapter 1 — The Living Wheel
  wheel_statement: 'This is a season of rebuilding my health so everything else stops leaking.',
  next_move: 'Walk after dinner instead of opening my laptop again.',

  // Chapter 2 — The Inner Compass
  compass_statement: 'I move toward mastery and quiet, and I drift when I try to impress people.',
  guardian_boundary: 'No work conversations after 8pm, including in my own head.',

  // Chapter 3 — The Living Horizon
  horizon_statement:
    'A slow morning, deep work I am proud of, and a table with people at it in the evening.',

  // Chapter 4 — The Ikigai Map
  ikigai_statement: 'Teaching the thing I had to learn the hard way.',
  trial_experiment: 'Run one free workshop for six people and see if I still enjoy it afterwards.',
  path_a: 'Teach beginners the basics in small workshops',
  path_b: 'Write the guide I needed three years ago',
  path_c: 'Coach one person properly for a month',

  // Chapter 5 — The Quest Forge
  quest_a: 'Run a 10k without stopping',
  quest_b: 'Cook three real meals a week',
  quest_c: 'Rebuild my evening reading habit',
  calling: 'I want to trust my body again instead of negotiating with it every morning.',
  first_milestone: 'Three runs a week for four weeks, however slow.',
  success_evidence: 'I finish a 10k and can still talk at the end.',
  protected_flame: 'Sunday mornings stay unscheduled, no matter how the week went.',

  // Chapter 6 — The Personal Playbook
  operating_principle: 'Do the small version badly rather than skip it perfectly.',
  first_step: 'Put my shoes by the door the night before.',
  the_habit: 'A 30-minute run',
  small_version: 'A 10-minute jog',
  minimum_version: 'Walk to the corner and back',
  completion_evidence: 'Shoes are wet or dusty by the door.',
  env_detail: 'Running kit laid out where I trip over it.',
};

/**
 * Choice answers that must be a specific option for the demo to hang together.
 *
 * Generated picks are fine for scores and moods, but some choices *point at*
 * other answers — the Quest Forge resolves its Primary Quest through
 * `primary_candidate`. Left to the hash, the demo would proudly show a generic
 * filler line as the player's calling. Applied only when the option id really
 * exists on the block, so a curriculum change degrades to a generated pick
 * instead of an invalid answer.
 */
const DEMO_CHOICE: Record<string, string> = {
  primary_candidate: 'quest_a',
  support_quest: 'quest_b',
  release_quest: 'quest_c',
};

/** Deterministic pseudo-index so generated picks vary without randomness. */
function seedFor(questionId: string): number {
  let hash = 0;
  for (let i = 0; i < questionId.length; i += 1) {
    hash = (hash * 31 + questionId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * A plausible answer for one block, generated against its real definition.
 * Returns null for block types that carry no answerable value.
 */
export function demoValueForBlock(block: CompassBlockDefinition): CompassAnswerValue | null {
  const seed = seedFor(block.questionId);
  const options = block.options ?? [];

  switch (block.type) {
    case 'single_choice': {
      if (options.length === 0) return null;
      const curated = DEMO_CHOICE[block.questionId];
      if (curated && options.some((option) => option.id === curated)) {
        return { kind: 'choice', optionId: curated };
      }
      const positiveOptions = options.filter((option) => option.id !== 'no_match');
      const demoOptions = positiveOptions.length > 0 ? positiveOptions : options;
      return { kind: 'choice', optionId: demoOptions[seed % demoOptions.length].id };
    }

    case 'emotion_choice':
      if (options.length === 0) return null;
      // Lean toward the front of the list, which is where the positive
      // emotions sit — a demo player having a bad time is not the pitch.
      return { kind: 'emotion', optionId: options[seed % Math.min(4, options.length)].id };

    case 'multi_choice': {
      if (options.length === 0) return null;
      const targetCount = Math.min(
        options.length,
        Math.max(block.minSelections ?? 2, Math.min(block.maxSelections ?? 2, 2)),
      );
      const ids: string[] = [];
      for (let offset = 0; ids.length < targetCount && offset < options.length * 2; offset += 1) {
        const id = options[(seed + offset) % options.length].id;
        if (!ids.includes(id)) ids.push(id);
      }
      return { kind: 'multi_choice', optionIds: ids };
    }

    case 'ranking':
      if (options.length === 0) return null;
      return { kind: 'ranking', orderedOptionIds: options.map((option) => option.id) };

    case 'scale': {
      const min = block.min ?? 0;
      const max = block.max ?? 10;
      // Per-area scales are keyed `prefix.areaId`. Biasing on the area — rather
      // than the whole question — gives each life area a consistent character
      // across every scale it appears in, so the demo wheel is meaningfully
      // uneven. A flat, uniformly high wheel would hide the very thing Chapter 1
      // exists to show: which spoke is the Engine and which is the Brake.
      const areaId = block.questionId.includes('.')
        ? block.questionId.slice(block.questionId.lastIndexOf('.') + 1)
        : block.questionId;
      const bias = seedFor(areaId) % 5; // 0 = struggling … 4 = thriving
      const jitter = seed % 3;
      const raw = min + bias * 2 + jitter;
      return { kind: 'scale', value: Math.max(min, Math.min(max, raw)) };
    }

    case 'short_text':
    case 'reflection':
    case 'sentence_completion':
      return {
        kind: 'text',
        text: DEMO_TEXT[block.questionId] ?? demoFallbackText(block),
      };

    case 'confirmation':
      return { kind: 'confirmation', confirmed: true };

    // Structural blocks carry no answer.
    case 'experiment':
    case 'check_in':
    case 'review':
    default:
      return null;
  }
}

/** A short, on-voice line for a text block with no curated answer. */
function demoFallbackText(block: CompassBlockDefinition): string {
  const prompt = block.prompt.replace(/\s+/g, ' ').trim();
  const clipped = prompt.length > 60 ? `${prompt.slice(0, 57)}…` : prompt;
  return `Demo answer — ${clipped}`;
}

/**
 * Chapters the demo seals by default.
 *
 * Deliberately not "the first N". The Quest Forge is sealed because its Calling,
 * first milestone and success evidence live on activities 19–20 — an unsealed
 * chapter genuinely has not written them yet, which would leave the goal-bridge
 * card, the single best thing to show an evaluator, almost empty. Leaving the
 * Ikigai Map unsealed keeps a half-built chapter in view.
 */
const DEFAULT_SEALED: readonly CompassBookChapterId[] = [
  'living_wheel',
  'inner_compass',
  'living_horizon',
  'quest_forge',
];

export type DemoBookOptions = {
  /**
   * How many chapters are written, 1..6. Later chapters stay untouched so the
   * "not reached yet" treatment is still visible in the demo. Defaults to 5.
   */
  writtenChapters?: number;
  /** Which chapters are sealed. Defaults to {@link DEFAULT_SEALED}. */
  sealedChapterIds?: readonly CompassBookChapterId[];
};

/**
 * Build in-memory chapter states for a demo player.
 *
 * The result is shaped exactly like real state, so every downstream consumer —
 * projectors, the Reading, the graphics, the goal and habit bridges — runs its
 * normal code path against it. Nothing here is demo-aware.
 */
export function buildDemoChapterStates(
  options: DemoBookOptions = {},
): Partial<Record<CompassBookChapterId, CompassChapterState>> {
  const written = Math.max(1, Math.min(6, options.writtenChapters ?? 5));
  const sealedIds = new Set(options.sealedChapterIds ?? DEFAULT_SEALED);

  const states: Partial<Record<CompassBookChapterId, CompassChapterState>> = {};

  COMPASS_BOOK_CHAPTERS.slice(0, written).forEach((chapter) => {
    const activities = getChapterActivities(chapter.id);
    const isSealed = sealedIds.has(chapter.id);

    // A chapter still being written stops partway, so the demo shows a
    // half-built graphic next to the finished ones.
    const upTo = isSealed ? activities.length : Math.ceil(activities.length * 0.6);

    const answers: CompassAnswerRecord[] = [];
    const completedActivityIds: string[] = [];

    for (const activity of activities.slice(0, upTo)) {
      let answeredAny = false;
      for (const block of activity.blocks) {
        const sourceAnswer = block.optionsFromQuestionId
          ? [...answers].reverse().find((answer) => answer.questionId === block.optionsFromQuestionId)
          : undefined;
        const sourceIds = sourceAnswer?.value.kind === 'multi_choice'
          ? sourceAnswer.value.optionIds
          : sourceAnswer?.value.kind === 'ranking'
            ? sourceAnswer.value.orderedOptionIds
            : sourceAnswer?.value.kind === 'choice' || sourceAnswer?.value.kind === 'emotion'
              ? [sourceAnswer.value.optionId]
              : null;
        const answeredTextIds = block.optionsFromAnsweredQuestionIds
          ? new Set(
              block.optionsFromAnsweredQuestionIds.filter((questionId) =>
                answers.some(
                  (answer) => answer.questionId === questionId
                    && answer.value.kind === 'text'
                    && answer.value.text.trim().length > 0,
                ),
              ),
            )
          : null;
        const demoBlock = answeredTextIds
          ? {
              ...block,
              options: (block.options ?? []).filter(
                (option) => option.id === 'none' || answeredTextIds.has(option.id),
              ),
            }
          : sourceIds
          ? {
              ...block,
              options: (block.options ?? []).filter((option) => sourceIds.includes(option.id)),
            }
          : block;
        const value = demoValueForBlock(demoBlock);
        if (!value) continue;
        answers.push({
          activityId: activity.id,
          questionId: block.questionId,
          value,
          sourceMode: 'fixed_guided',
          curriculumVersion: COMPASS_CURRICULUM_VERSION,
          methodVersion: getCompassChapterMethodVersion(chapter.id),
          answeredAt: DEMO_AT,
          updatedAt: DEMO_AT,
          confirmed: true,
        });
        answeredAny = true;
      }
      if (answeredAny) completedActivityIds.push(activity.id);
    }

    // Seal through the real projector rather than a hand-written blob, so a
    // sealed demo chapter is exactly what a sealed real chapter would be.
    const confirmedOutput = isSealed ? getChapterConfirmedOutput(chapter.id, answers) : null;

    states[chapter.id] = {
      chapterId: chapter.id,
      contentVersion: getCompassChapterMethodVersion(chapter.id),
      status: confirmedOutput != null ? 'complete' : 'in_progress',
      answers,
      draftOutput: null,
      confirmedOutput,
      completedActivityIds,
      confirmedAt: confirmedOutput != null ? DEMO_AT : null,
    };
  });

  return states;
}

/** Island position that matches the demo book, so unlock state looks coherent. */
export const DEMO_ISLAND_NUMBER = 98;
