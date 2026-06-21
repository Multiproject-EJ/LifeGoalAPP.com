/**
 * Compass Book — public module surface.
 *
 * The new six-chapter curriculum and durable personal model. Distinct from the
 * legacy Island Run Compass (`compassState` / `compassCurriculum`) and from
 * Quest Pulse (`features/quest-compass`). No visible entry points are wired in
 * this foundation PR.
 */

export * from './types';
export {
  COMPASS_BOOK_CHAPTERS,
  COMPASS_BOOK_ACTIVITIES,
  getChapterDefinition,
  getChapterActivities,
  getActivityDefinition,
  getActivityForIsland,
  validateCompassCurriculum,
} from './content/compassBookCurriculum';
export {
  getUnlockedActivityCount,
  isActivityUnlocked,
  getChapterIndexForIsland,
  getChapterActivityIndexForIsland,
  getChapterIdForIsland,
  getCurrentChapterId,
  type IslandUnlockInput,
} from './logic/unlock';
export {
  computeChapterProgress,
  isActivityComplete,
  isActivityStarted,
} from './logic/progress';
