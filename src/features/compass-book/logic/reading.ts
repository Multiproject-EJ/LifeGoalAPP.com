/**
 * The Reading — pure logic for the Compass Book's standing page.
 *
 * "The Reading" is the book's seventh page: a compass reading of where the
 * player stands right now, drawn from all six chapters at once. It is always
 * open (never island-gated) and owns no storage — every row is derived from the
 * chapter states the player has already sealed or started.
 *
 * Its second job is desire: chapters the player has not reached yet still get a
 * row, showing what that chapter will eventually tell them and which island
 * opens it. Locked never means invisible.
 *
 * Pure — no React, no Supabase, no browser APIs.
 */

import {
  COMPASS_BOOK_CHAPTER_IDS,
  type CompassBookChapterId,
  type CompassChapterProgress,
  type CompassChapterState,
} from '../types';
import { COMPASS_BOOK_CHAPTERS } from '../content/compassBookCurriculum';
import { projectLivingWheel } from './projectors/livingWheelProjector';
import { projectInnerCompass } from './projectors/innerCompassProjector';
import { projectLivingHorizon } from './projectors/livingHorizonProjector';
import { projectIkigaiMap } from './projectors/ikigaiMapProjector';
import { projectQuestForge } from './projectors/questForgeProjector';
import { projectPersonalPlaybook } from './projectors/personalPlaybookProjector';

/** Roman numerals for the tab rail and the Reading rows (chapters 1–6). */
export const CHAPTER_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

export function chapterNumeral(order: number): string {
  return CHAPTER_NUMERALS[order - 1] ?? String(order);
}

/**
 * What each chapter contributes to the Reading once the player has written
 * enough of it. Every chapter's projector produces one free-text statement that
 * is the player's own words — that is the line worth surfacing, so the Reading
 * never has to resolve option-id labels and can never show a raw id.
 */
const HEADLINE_LABEL: Record<CompassBookChapterId, string> = {
  living_wheel: 'Your wheel',
  inner_compass: 'Your current True North reading',
  living_horizon: 'Your horizon',
  ikigai_map: 'Your trial',
  quest_forge: 'Your calling',
  personal_playbook: 'Your operating principle',
};

/** The one line each chapter offers the Reading, or null when unwritten. */
export function chapterHeadline(
  chapterId: CompassBookChapterId,
  state: CompassChapterState | null,
): string | null {
  const answers = state?.answers ?? [];
  if (answers.length === 0) return null;

  const text = (() => {
    switch (chapterId) {
      case 'living_wheel':
        return projectLivingWheel(answers).wheelStatement;
      case 'inner_compass':
        return projectInnerCompass(answers).compassStatement;
      case 'living_horizon':
        return projectLivingHorizon(answers).horizonStatement;
      case 'ikigai_map': {
        const out = projectIkigaiMap(answers);
        return out.trialExperiment ?? out.ikigaiStatement;
      }
      case 'quest_forge': {
        const out = projectQuestForge(answers);
        return out.primaryQuestTitle ?? out.callingText;
      }
      case 'personal_playbook':
        return projectPersonalPlaybook(answers).operatingPrinciple;
      default:
        return null;
    }
  })();

  const trimmed = typeof text === 'string' ? text.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * How a chapter reads on the standing page. Distinct from
 * `CompassChapterStatus` because the Reading cares about what the player can
 * *see*, not what the storage layer calls it.
 */
export type CompassReadingStatus =
  /** Not reached in the game yet — browsable, not answerable. */
  | 'ahead'
  /** Open to answer, nothing written yet. */
  | 'blank'
  /** Being written. */
  | 'charting'
  /** Sealed at fragment 20. */
  | 'sealed';

export type CompassReadingRow = {
  chapterId: CompassBookChapterId;
  order: number;
  numeral: string;
  title: string;
  /** e.g. "Your current True North reading" — what this row is showing. */
  headlineLabel: string;
  /** The player's own sentence, or null when they have not written it yet. */
  headline: string | null;
  /** Inner Compass v2 evidence qualifier; null for other chapter methods. */
  readingQuality: 'provisional' | 'evidence_backed' | 'trial_ready' | null;
  /** Timestamp of the preserved reading, when the chapter has been sealed. */
  lastReviewedAt: string | null;
  /** Shown in place of a headline so an unwritten row still says something. */
  promise: string;
  status: CompassReadingStatus;
  completedCount: number;
  /** Fragments the player could answer right now (reached in the game). */
  unlockedCount: number;
  totalCount: number;
  /** 0..1 */
  completionRate: number;
  /** First island of the chapter — the answer to "when do I get this?". */
  unlockIsland: number;
};

function readingStatus(progress: CompassChapterProgress): CompassReadingStatus {
  if (progress.status === 'complete') return 'sealed';
  if (progress.unlockedCount === 0) return 'ahead';
  if (progress.completedCount > 0 || progress.status === 'in_progress') return 'charting';
  return 'blank';
}

export type CompassReadingInput = {
  getProgress: (chapterId: CompassBookChapterId) => CompassChapterProgress;
  getChapterState: (chapterId: CompassBookChapterId) => CompassChapterState | null;
};

/** Build every row of the standing page, in chapter order. */
export function buildCompassReading(input: CompassReadingInput): CompassReadingRow[] {
  return COMPASS_BOOK_CHAPTERS.map((chapter) => {
    const progress = input.getProgress(chapter.id);
    const state = input.getChapterState(chapter.id);
    const readingQuality = (() => {
      if ((state?.answers.length ?? 0) === 0) return null;
      if (chapter.id === 'inner_compass') return projectInnerCompass(state?.answers ?? []).readingStatus;
      if (chapter.id === 'living_horizon') return projectLivingHorizon(state?.answers ?? []).readingStatus;
      if (chapter.id === 'ikigai_map') return projectIkigaiMap(state?.answers ?? []).readingStatus;
      return null;
    })();
    return {
      chapterId: chapter.id,
      order: chapter.order,
      numeral: chapterNumeral(chapter.order),
      title: chapter.title,
      headlineLabel: HEADLINE_LABEL[chapter.id],
      headline: chapterHeadline(chapter.id, state),
      readingQuality,
      lastReviewedAt: state?.confirmedAt ?? null,
      promise: chapter.coreQuestion,
      status: readingStatus(progress),
      completedCount: progress.completedCount,
      unlockedCount: progress.unlockedCount,
      totalCount: progress.totalCount,
      completionRate: progress.completionRate,
      unlockIsland: chapter.islandRange[0],
    };
  });
}

export type CompassReadingSummary = {
  rows: CompassReadingRow[];
  sealedCount: number;
  /** Chapters the player can answer right now. */
  openCount: number;
  /** Fragments answered across the whole book (0..120). */
  fragmentsWritten: number;
  /** Fragments reached in the game and answerable right now (0..120). */
  fragmentsOpen: number;
  fragmentsTotal: number;
  /** The chapter to nudge toward: the furthest one still open to answer. */
  focusChapterId: CompassBookChapterId | null;
  /** Rows that already carry a written line — the "what you know so far" set. */
  writtenRows: CompassReadingRow[];
};

export function summarizeCompassReading(input: CompassReadingInput): CompassReadingSummary {
  const rows = buildCompassReading(input);
  const open = rows.filter((row) => row.status !== 'ahead');

  // Focus = the FIRST open chapter not yet sealed — a book is read from the
  // front, so a fresh player at island 87 is pointed at Chapter I, not Chapter
  // V just because their boat got that far. Falls back to the last open
  // chapter so a fully sealed book still points somewhere real.
  const unsealedOpen = open.filter((row) => row.status !== 'sealed');
  const focus = unsealedOpen[0] ?? open[open.length - 1] ?? null;

  return {
    rows,
    sealedCount: rows.filter((row) => row.status === 'sealed').length,
    openCount: open.length,
    fragmentsWritten: rows.reduce((sum, row) => sum + row.completedCount, 0),
    fragmentsOpen: rows.reduce((sum, row) => sum + row.unlockedCount, 0),
    fragmentsTotal: rows.reduce((sum, row) => sum + row.totalCount, 0),
    focusChapterId: focus?.chapterId ?? null,
    writtenRows: rows.filter((row) => row.headline !== null),
  };
}

/**
 * Every page the book can show, in tab-rail order. The Reading leads; the Quest
 * Ledger closes the book after chapter VI. The Ledger is a page, never a
 * chapter: it has no curriculum, no islands, and no stored answers, so it must
 * stay out of COMPASS_BOOK_CHAPTER_IDS (those ids are persisted).
 */
export const COMPASS_BOOK_PAGE_IDS = ['reading', ...COMPASS_BOOK_CHAPTER_IDS, 'quest_ledger'] as const;

export type CompassBookPageId = (typeof COMPASS_BOOK_PAGE_IDS)[number];

const CHAPTER_PAGE_IDS: readonly string[] = COMPASS_BOOK_CHAPTER_IDS;

export function isChapterPage(pageId: CompassBookPageId): pageId is CompassBookChapterId {
  return CHAPTER_PAGE_IDS.includes(pageId);
}
