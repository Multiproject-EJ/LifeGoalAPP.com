import type { Database } from '../../lib/database.types';
import { fetchCheckinsForUser } from '../../services/checkins';
import { fetchGoals } from '../../services/goals';
import { listHabitsV2 } from '../../services/habitsV2';
import { listJournalEntries } from '../../services/journal';
import { fetchVisionImages } from '../../services/visionBoard';
import { loadPersonalityTestHistory } from '../../data/personalityTestRepo';
import { normalizeGoalStatus } from '../goals/goalStatus';
import type { AreaSignalInput, ProfileStrengthInput } from './profileStrengthTypes';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type HabitRow = Database['public']['Tables']['habits_v2']['Row'];
type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
type VisionImage = Database['public']['Tables']['vision_images']['Row'];
type CheckinRow = Database['public']['Tables']['checkins']['Row'];

const LIFE_WHEEL_CATEGORY_COUNT = 8;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const clampRatio = (value: number): number => Math.max(0, Math.min(1, value));

const parseDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp);
};

const getMostRecentDate = (values: Array<string | null | undefined>): Date | null => {
  let mostRecent: Date | null = null;
  for (const value of values) {
    const date = parseDate(value);
    if (!date) {
      continue;
    }
    if (!mostRecent || date > mostRecent) {
      mostRecent = date;
    }
  }
  return mostRecent;
};

const getDaysSince = (value?: string | null): number | null => {
  const date = parseDate(value);
  if (!date) {
    return null;
  }
  const diffMs = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diffMs / MS_PER_DAY));
};

const getDaysSinceDate = (date?: Date | null): number | null => {
  if (!date) {
    return null;
  }
  const diffMs = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diffMs / MS_PER_DAY));
};

const buildUnavailableSignal = (): AreaSignalInput => ({
  status: 'unavailable',
});

const buildNoDataSignal = (): AreaSignalInput => ({
  status: 'no_data',
});

const buildGoalsSignal = (goals: GoalRow[]): AreaSignalInput => {
  if (goals.length === 0) {
    return buildNoDataSignal();
  }

  const categories = new Set(
    goals.map((goal) => goal.life_wheel_category).filter(Boolean),
  );
  const coverage = clampRatio(categories.size / LIFE_WHEEL_CATEGORY_COUNT);
  const qualityCount = goals.filter((goal) =>
    Boolean(
      goal.description?.trim() ||
        goal.progress_notes?.trim() ||
        goal.timing_notes?.trim() ||
        goal.target_date ||
        goal.estimated_duration_days,
    ),
  ).length;
  const quality = clampRatio(qualityCount / goals.length);
  const mostRecent = getMostRecentDate(
    goals.map((goal) => goal.created_at ?? goal.start_date ?? goal.target_date),
  );
  const recencyDays = getDaysSinceDate(mostRecent);
  const needsReview = goals.some((goal) => {
    const status = normalizeGoalStatus(goal.status_tag);
    return status === 'off_track' || status === 'at_risk';
  });

  return {
    status: 'ok',
    coverage,
    quality,
    recencyDays,
    needsReview,
  };
};

const buildHabitsSignal = (habits: HabitRow[]): AreaSignalInput => {
  if (habits.length === 0) {
    return buildNoDataSignal();
  }

  const domains = new Set(habits.map((habit) => habit.domain_key).filter(Boolean));
  const coverage = clampRatio(domains.size / LIFE_WHEEL_CATEGORY_COUNT);
  const qualityCount = habits.filter((habit) =>
    Boolean(habit.goal_id || habit.target_num || habit.target_unit),
  ).length;
  const quality = clampRatio(qualityCount / habits.length);
  const mostRecent = getMostRecentDate(
    habits.map((habit) => habit.created_at ?? habit.start_date),
  );
  const recencyDays = getDaysSinceDate(mostRecent);
  const needsReview = habits.length > 12;

  return {
    status: 'ok',
    coverage,
    quality,
    recencyDays,
    needsReview,
  };
};

const buildJournalSignal = (entries: JournalEntry[]): AreaSignalInput => {
  if (entries.length === 0) {
    return buildNoDataSignal();
  }

  const now = Date.now();
  const recentEntries = entries.filter((entry) => {
    const date = parseDate(entry.entry_date ?? entry.created_at);
    if (!date) {
      return false;
    }
    return now - date.getTime() <= 14 * MS_PER_DAY;
  });
  const coverage = clampRatio(recentEntries.length / 7);
  const qualityCount = entries.filter((entry) => {
    const hasTitle = Boolean(entry.title?.trim());
    const hasTags = (entry.tags?.length ?? 0) > 0;
    const contentLength = entry.content?.trim().length ?? 0;
    return hasTitle || hasTags || contentLength >= 120;
  }).length;
  const quality = clampRatio(qualityCount / entries.length);
  const mostRecent = getMostRecentDate(
    entries.map((entry) => entry.entry_date ?? entry.created_at),
  );
  const recencyDays = getDaysSinceDate(mostRecent);

  return {
    status: 'ok',
    coverage,
    quality,
    recencyDays,
  };
};

const buildVisionBoardSignal = (images: VisionImage[]): AreaSignalInput => {
  if (images.length === 0) {
    return buildNoDataSignal();
  }

  const coverage = clampRatio(images.length / 8);
  const qualityCount = images.filter((image) =>
    Boolean(
      image.caption?.trim() ||
        image.vision_type ||
        (image.linked_goal_ids?.length ?? 0) > 0 ||
        (image.linked_habit_ids?.length ?? 0) > 0,
    ),
  ).length;
  const quality = clampRatio(qualityCount / images.length);
  const mostRecent = getMostRecentDate(
    images.map((image) => image.last_reviewed_at ?? image.created_at),
  );
  const recencyDays = getDaysSinceDate(mostRecent);
  const needsReview = images.some((image) => {
    if (!image.review_interval_days) {
      return false;
    }
    const referenceDate = image.last_reviewed_at ?? image.created_at;
    const daysSince = getDaysSince(referenceDate);
    return daysSince !== null && daysSince > image.review_interval_days;
  });

  return {
    status: 'ok',
    coverage,
    quality,
    recencyDays,
    needsReview,
  };
};

const buildLifeWheelSignal = (checkins: CheckinRow[]): AreaSignalInput => {
  if (checkins.length === 0) {
    return buildNoDataSignal();
  }

  const coverage = clampRatio(checkins.length / 6);
  const completeness = checkins.map((checkin) => {
    const scores = checkin.scores as Record<string, number> | null;
    const count = scores ? Object.keys(scores).length : 0;
    return clampRatio(count / LIFE_WHEEL_CATEGORY_COUNT);
  });
  const quality =
    completeness.reduce((sum, value) => sum + value, 0) / completeness.length;
  const mostRecent = getMostRecentDate(checkins.map((checkin) => checkin.date));
  const recencyDays = getDaysSinceDate(mostRecent);

  return {
    status: 'ok',
    coverage,
    quality: clampRatio(quality),
    recencyDays,
  };
};

const buildIdentitySignal = (tests: Awaited<ReturnType<typeof loadPersonalityTestHistory>>): AreaSignalInput => {
  if (tests.length === 0) {
    return buildNoDataSignal();
  }

  const [latest] = tests;
  const traitCount = Object.keys(latest.traits ?? {}).length;
  const axesCount = Object.keys(latest.axes ?? {}).length;
  const quality = clampRatio((traitCount > 0 ? 0.5 : 0) + (axesCount > 0 ? 0.5 : 0));
  const recencyDays = getDaysSince(latest.taken_at);
  const needsReview = recencyDays !== null && recencyDays > 365;

  return {
    status: 'ok',
    coverage: 1,
    quality,
    recencyDays,
    needsReview,
  };
};

export const loadProfileStrengthSignals = async (
  userId?: string | null,
): Promise<ProfileStrengthInput> => {
  const computedAt = new Date().toISOString();

  const goalsPromise = fetchGoals().catch(() => ({ data: null, error: new Error('goals') }));
  const habitsPromise = listHabitsV2().catch(() => ({ data: null, error: new Error('habits') }));
  const journalPromise = listJournalEntries({ limit: 60 }).catch(() => ({
    data: null,
    error: new Error('journal'),
  }));
  const visionPromise = userId
    ? fetchVisionImages(userId).catch(() => ({ data: null, error: new Error('vision') }))
    : Promise.resolve({ data: null, error: new Error('vision') });
  const checkinsPromise = userId
    ? fetchCheckinsForUser(userId, 12).catch(() => ({ data: null, error: new Error('checkins') }))
    : Promise.resolve({ data: null, error: new Error('checkins') });
  const identityPromise = userId
    ? loadPersonalityTestHistory(userId).catch(() => null)
    : Promise.resolve(null);

  const [
    goalsResult,
    habitsResult,
    journalResult,
    visionResult,
    checkinsResult,
    identityResult,
  ] = await Promise.all([
    goalsPromise,
    habitsPromise,
    journalPromise,
    visionPromise,
    checkinsPromise,
    identityPromise,
  ]);

  const goalsSignal =
    goalsResult.error || !goalsResult.data
      ? buildUnavailableSignal()
      : buildGoalsSignal(goalsResult.data);
  const habitsSignal =
    habitsResult.error || !habitsResult.data
      ? buildUnavailableSignal()
      : buildHabitsSignal(habitsResult.data);
  const journalSignal =
    journalResult.error || !journalResult.data
      ? buildUnavailableSignal()
      : buildJournalSignal(journalResult.data);
  const visionSignal =
    visionResult.error || !visionResult.data
      ? buildUnavailableSignal()
      : buildVisionBoardSignal(visionResult.data);
  const lifeWheelSignal =
    checkinsResult.error || !checkinsResult.data
      ? buildUnavailableSignal()
      : buildLifeWheelSignal(checkinsResult.data);
  const identitySignal = identityResult ? buildIdentitySignal(identityResult) : buildUnavailableSignal();

  return {
    computedAt,
    areas: {
      goals: goalsSignal,
      habits: habitsSignal,
      journal: journalSignal,
      vision_board: visionSignal,
      life_wheel: lifeWheelSignal,
      identity: identitySignal,
    },
  };
};
