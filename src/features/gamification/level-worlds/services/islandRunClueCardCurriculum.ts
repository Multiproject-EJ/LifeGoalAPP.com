/**
 * Clue-card curriculum adapter for the ring-tile "Daily Clue Card" draw
 * (rendered by `IslandRunGamifiedJournalCard`).
 *
 * Historically the draw asked the *same two questions* on every island forever
 * ("What made you feel good today?" / "What, if anything, made you feel bad?"),
 * so it read as identical noise no matter where the player was. This adapter
 * reframes the two feeling slots through the lens of the chapter the current
 * island belongs to (audit → values → vision → direction → commitment → habits),
 * so the questions track the same six-chapter life arc as the Compass Book and
 * the Behavior-stop check-in.
 *
 * Design (see `docs/gameplay/DEFAULT_CURRICULUM_120_ISLANDS.md`, Tier B / Option A):
 *   - A per-chapter pool of themed "toward / friction" question pairs, selected
 *     deterministically by the island's position within its chapter so adjacent
 *     islands differ. The two answer buttons ("a typical day" / "something
 *     specific") are unchanged — only the *question framing* varies.
 *   - Within-a-single-island rotation across multiple draws is a deliberate
 *     follow-up: it needs a board-side draw counter, whereas keying off the
 *     island keeps this adapter pure and testable. Cross-island variety (the
 *     bulk of the repetition complaint) is delivered here.
 *   - Islands outside the authored 1..120 range fall back to the original
 *     generic wording so behaviour degrades gracefully.
 *
 * Pure — no React, no Supabase, no browser APIs. Imports the compass-book
 * content module directly (not the barrel) to avoid pulling in React/Supabase
 * logic, mirroring `compass-book/logic/islandFragment.ts`.
 */

import {
  getActivityForIsland,
  getChapterDefinition,
} from '../../../compass-book/content/compassBookCurriculum';
import type { CompassBookChapterId } from '../../../compass-book/types';

export type ClueCardPrompts = {
  /** Short theme tag shown in the card eyebrow (the chapter title, or a default). */
  themeLabel: string;
  /** The positive / "toward" feeling question. */
  goodQuestion: string;
  /** The friction / "hard" feeling question. */
  badQuestion: string;
  /** Label for the optional expandable free-text field. */
  typicalDayLabel: string;
};

type ClueVariant = Omit<ClueCardPrompts, 'themeLabel'>;

/** The original wording — used for islands with no authored chapter. */
const DEFAULT_PROMPTS: ClueCardPrompts = {
  themeLabel: 'Daily clue',
  goodQuestion: 'What made you feel good today?',
  badQuestion: 'What, if anything, made you feel bad?',
  typicalDayLabel: 'Optional: describe a typical day',
};

/**
 * Themed question pairs per chapter. Each chapter has three variants; the island's
 * order within the chapter picks one, so adjacent islands cycle through them.
 */
const CHAPTER_CLUE_POOL: Record<CompassBookChapterId, ClueVariant[]> = {
  living_wheel: [
    {
      goodQuestion: 'Which part of life felt like it was working today?',
      badQuestion: 'Which part of life felt most strained today?',
      typicalDayLabel: 'Optional: describe a typical day across your life areas',
    },
    {
      goodQuestion: 'Where did you feel momentum today?',
      badQuestion: 'Where did you feel stuck today?',
      typicalDayLabel: 'Optional: describe how your day usually flows',
    },
    {
      goodQuestion: 'Which area quietly took care of itself today?',
      badQuestion: 'Which area took the most out of you today?',
      typicalDayLabel: 'Optional: describe a normal day, area by area',
    },
  ],
  inner_compass: [
    {
      goodQuestion: 'When did you feel most like yourself today?',
      badQuestion: 'When did you feel off-course or unlike yourself?',
      typicalDayLabel: 'Optional: describe what a values-true day looks like',
    },
    {
      goodQuestion: 'What felt genuinely meaningful today?',
      badQuestion: 'What pulled you away from what matters today?',
      typicalDayLabel: 'Optional: describe a day that honours your values',
    },
    {
      goodQuestion: 'What gave you energy today?',
      badQuestion: 'What drained you today?',
      typicalDayLabel: 'Optional: describe where your energy usually goes',
    },
  ],
  living_horizon: [
    {
      goodQuestion: 'What part of today felt like a life that fits you?',
      badQuestion: 'What part of today felt like a life you would not choose?',
      typicalDayLabel: 'Optional: describe your ideal ordinary day',
    },
    {
      goodQuestion: 'What rhythm felt right today?',
      badQuestion: 'What rhythm felt wrong today?',
      typicalDayLabel: 'Optional: describe the daily rhythm you are reaching for',
    },
    {
      goodQuestion: 'What did today have that your future should keep?',
      badQuestion: 'What did today have that your future should drop?',
      typicalDayLabel: 'Optional: describe the future day you want to live',
    },
  ],
  ikigai_map: [
    {
      goodQuestion: 'What sparked your curiosity or pulled you in today?',
      badQuestion: 'What felt flat or misaligned today?',
      typicalDayLabel: 'Optional: describe where your attention naturally goes',
    },
    {
      goodQuestion: 'Where did a strength of yours show up today?',
      badQuestion: 'Where did you feel out of your depth today?',
      typicalDayLabel: 'Optional: describe the work that feels like you',
    },
    {
      goodQuestion: 'What did you do today that felt genuinely useful?',
      badQuestion: 'What felt like effort for no real return today?',
      typicalDayLabel: 'Optional: describe a day spent on what matters',
    },
  ],
  quest_forge: [
    {
      goodQuestion: 'What moved your quest forward today?',
      badQuestion: 'What competed for your commitment today?',
      typicalDayLabel: 'Optional: describe a day built around your main quest',
    },
    {
      goodQuestion: 'What did you say yes to today that mattered?',
      badQuestion: 'What did you need to say no to today?',
      typicalDayLabel: 'Optional: describe how you want to spend a committed day',
    },
    {
      goodQuestion: 'Where did you make real progress today?',
      badQuestion: 'What obstacle got in the way today?',
      typicalDayLabel: 'Optional: describe a day of steady progress',
    },
  ],
  personal_playbook: [
    {
      goodQuestion: 'What did you sustain or show up for today?',
      badQuestion: 'What slipped or got harder today?',
      typicalDayLabel: 'Optional: describe your ideal daily operating routine',
    },
    {
      goodQuestion: 'Which habit or system helped you today?',
      badQuestion: 'Where did a warning light flash today?',
      typicalDayLabel: 'Optional: describe the routine that keeps you steady',
    },
    {
      goodQuestion: 'What kept you on track today?',
      badQuestion: 'What knocked you off track today?',
      typicalDayLabel: 'Optional: describe how you recover a derailed day',
    },
  ],
};

/** The themed clue-card questions for an island (falls back to generic wording). */
export function getClueCardPromptsForIsland(islandNumber: number): ClueCardPrompts {
  const activity = getActivityForIsland(islandNumber);
  if (!activity) return DEFAULT_PROMPTS;

  const pool = CHAPTER_CLUE_POOL[activity.chapterId];
  if (!pool || pool.length === 0) return DEFAULT_PROMPTS;

  const variant = pool[(activity.order - 1) % pool.length];
  const chapter = getChapterDefinition(activity.chapterId);
  return { themeLabel: chapter.title, ...variant };
}
