import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { QuickAddSheet, type QuickAddMode } from '../../components/QuickAddSheet';
import type { Database, Json } from '../../lib/database.types';
import { fetchCheckinsForUser } from '../../services/checkins';
import { evaluateGoalHealthFromSignals } from '../../services/goalExecution';
import { fetchGoals } from '../../services/goals';
import { listHabitsV2, type HabitV2Row } from '../../services/habitsV2';
import { fetchStepsForGoal } from '../../services/lifeGoals';
import {
  LIFE_WHEEL_CATEGORIES,
  getLifeWheelCategoryLabel,
  type LifeWheelCategoryKey,
} from '../checkins/LifeWheelCheckins';
import {
  QuestCompanionCard,
  QuestGlassCard,
  QuestHeroCard,
  QuestLifeAreaChip,
  QuestMetricRing,
  QuestPrimaryAction,
  QuestSecondaryAction,
} from '../quest-journey/QuestJourneyVisualSystem';
import { GoalPillarMeter } from './GoalPillarMeter';
import {
  GOAL_PILLAR_META,
  computeGoalPillars,
  computeGoalPillarTotals,
  type GoalPillarComputeInput,
  type GoalPillarKey,
} from './goalPillars';
import { normalizeGoalStatus } from './goalStatus';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type CheckinRow = Database['public']['Tables']['checkins']['Row'];
type StepRow = Database['public']['Tables']['life_goal_steps']['Row'];

/** Cap the per-goal step fetch so the hub stays light with large goal lists. */
const PILLAR_GOAL_LIMIT = 12;

const PILLAR_TOTAL_HINTS: Record<GoalPillarKey, string> = {
  insight: 'Add a why, a life area, or a target date to your quests.',
  momentum: 'Take one small step on a quest this week.',
  support: 'Link a supporting habit or run an environment audit.',
};

type MyQuestHubProps = {
  session: Session;
  onOpenStarterQuest: () => void;
  onOpenCheckins: () => void;
  onOpenGoals: () => void;
};

function formatDateLabel(dateIso: string | null | undefined): string | null {
  if (!dateIso) return null;
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseLatestScores(
  scores: Json | null,
): Record<LifeWheelCategoryKey, number> | null {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores))
    return null;
  const record = scores as Record<string, unknown>;
  const parsed = {} as Record<LifeWheelCategoryKey, number>;
  for (const category of LIFE_WHEEL_CATEGORIES) {
    const value = record[category.key];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }
    parsed[category.key] = value;
  }
  return parsed;
}

function formatCategoryLabel(key: LifeWheelCategoryKey | null): string {
  if (!key) return 'No focus area yet';
  return getLifeWheelCategoryLabel(key);
}

function formatStatusLabel(status: string | null): string {
  return normalizeGoalStatus(status).replace(/_/g, ' ');
}

function formatScoreLabel(
  category: { key: LifeWheelCategoryKey; score: number } | null,
): string {
  if (!category) return 'No signal yet';
  return `${formatCategoryLabel(category.key)} · ${category.score}/10`;
}

function clampScorePercent(score: number | null | undefined): number {
  if (typeof score !== 'number' || Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, score * 10));
}

function getHeroSummary(
  focusCategory: LifeWheelCategoryKey | null,
  activeGoal: GoalRow | null,
  latestScores: Record<LifeWheelCategoryKey, number> | null,
): string {
  if (!latestScores) {
    return 'Begin with a calm Life Radar check-in so your next quest step is guided by today’s real signal.';
  }
  if (!activeGoal) {
    return `Your current signal points toward ${formatCategoryLabel(focusCategory)}. Choose one goal to turn this area into a clear chapter.`;
  }
  return `Your current signal points toward ${formatCategoryLabel(focusCategory)}. Keep momentum by taking one small step in “${activeGoal.title}.”`;
}

function getCompanionCopy({
  activeGoal,
  latestScores,
  lowestCategory,
  highestCategory,
  supportingHabitCount,
}: {
  activeGoal: GoalRow | null;
  latestScores: Record<LifeWheelCategoryKey, number> | null;
  lowestCategory: { key: LifeWheelCategoryKey; score: number } | null;
  highestCategory: { key: LifeWheelCategoryKey; score: number } | null;
  supportingHabitCount: number;
}): { title: string; insight: string; reason: string } {
  if (!latestScores) {
    return {
      title: 'Your map is ready for a fresh signal.',
      insight:
        'A quick check-in will make the rest of this hub feel less like planning and more like a guided next step.',
      reason:
        'Based on your available My Quest data: no latest Life Wheel check-in is loaded yet.',
    };
  }

  if (!activeGoal) {
    return {
      title: 'Turn the signal into one chapter.',
      insight: `${formatCategoryLabel(lowestCategory?.key ?? null)} is asking for care. Create or choose one goal so this area has a clear path forward.`,
      reason: `Strongest area: ${formatScoreLabel(highestCategory)}. Area needing care: ${formatScoreLabel(lowestCategory)}.`,
    };
  }

  if (supportingHabitCount > 0) {
    return {
      title: 'You already have a path to protect.',
      insight: `Keep “${activeGoal.title}” emotionally small today. Let the supporting habit${supportingHabitCount === 1 ? '' : 's'} carry the next step.`,
      reason: `${supportingHabitCount} supporting habit${supportingHabitCount === 1 ? '' : 's'} found from your existing goal and focus data.`,
    };
  }

  return {
    title: 'Add one ritual beneath the chapter.',
    insight: `“${activeGoal.title}” is your active quest line. A tiny supporting habit can make it feel easier to revisit tomorrow.`,
    reason: `Current focus: ${formatCategoryLabel(lowestCategory?.key ?? null)}. No supporting habits are linked or matched yet.`,
  };
}

export function MyQuestHub({
  session,
  onOpenStarterQuest,
  onOpenCheckins,
  onOpenGoals,
}: MyQuestHubProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [habits, setHabits] = useState<HabitV2Row[]>([]);
  const [stepsByGoal, setStepsByGoal] = useState<Record<string, StepRow[]>>({});
  const [quickAddMode, setQuickAddMode] = useState<QuickAddMode | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const [checkinsResult, goalsResult, habitsResult] = await Promise.all([
        fetchCheckinsForUser(session.user.id, 12),
        fetchGoals(),
        listHabitsV2(),
      ]);

      if (!isMounted) return;

      setCheckins(checkinsResult.data ?? []);
      setGoals(goalsResult.data ?? []);
      setHabits(habitsResult.data ?? []);

      const pillarGoals = (goalsResult.data ?? [])
        .filter((goal) => normalizeGoalStatus(goal.status_tag) !== 'achieved')
        .slice(0, PILLAR_GOAL_LIMIT);
      const stepResults = await Promise.all(
        pillarGoals.map(async (goal) => {
          const { data: steps } = await fetchStepsForGoal(goal.id);
          return { goalId: goal.id, steps: steps ?? [] };
        }),
      );
      if (!isMounted) return;
      setStepsByGoal(
        stepResults.reduce<Record<string, StepRow[]>>((acc, result) => {
          acc[result.goalId] = result.steps;
          return acc;
        }, {}),
      );

      const firstError =
        checkinsResult.error ?? goalsResult.error ?? habitsResult.error;
      if (firstError) {
        setLoadError(
          firstError.message || 'Some My Quest data could not be loaded.',
        );
      }
      setLoading(false);
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [session.user.id, reloadKey]);

  const latestCheckin = useMemo(() => checkins[0] ?? null, [checkins]);
  const latestScores = useMemo(
    () => parseLatestScores(latestCheckin?.scores ?? null),
    [latestCheckin],
  );

  const lowestCategory = useMemo(() => {
    if (!latestScores) return null;
    let best: { key: LifeWheelCategoryKey; score: number } | null = null;
    for (const category of LIFE_WHEEL_CATEGORIES) {
      const score = latestScores[category.key];
      if (!best || score < best.score) {
        best = { key: category.key, score };
      }
    }
    return best;
  }, [latestScores]);

  const highestCategory = useMemo(() => {
    if (!latestScores) return null;
    let best: { key: LifeWheelCategoryKey; score: number } | null = null;
    for (const category of LIFE_WHEEL_CATEGORIES) {
      const score = latestScores[category.key];
      if (!best || score > best.score) {
        best = { key: category.key, score };
      }
    }
    return best;
  }, [latestScores]);

  const activeGoals = useMemo(
    () =>
      goals.filter(
        (goal) => normalizeGoalStatus(goal.status_tag) !== 'achieved',
      ),
    [goals],
  );

  const suggestedFocusCategory = useMemo<LifeWheelCategoryKey | null>(() => {
    if (lowestCategory) return lowestCategory.key;
    if (activeGoals.length === 0) return null;

    const counts = new Map<LifeWheelCategoryKey, number>();
    for (const goal of activeGoals) {
      const key = goal.life_wheel_category as LifeWheelCategoryKey | null;
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    if (counts.size > 0) {
      let selected: LifeWheelCategoryKey | null = null;
      let selectedCount = -1;
      for (const [key, count] of counts) {
        if (count > selectedCount) {
          selected = key;
          selectedCount = count;
        }
      }
      if (selected) return selected;
    }

    const recentWithCategory = activeGoals.find((goal) =>
      Boolean(goal.life_wheel_category),
    );
    return (
      (recentWithCategory?.life_wheel_category as LifeWheelCategoryKey | null) ??
      null
    );
  }, [activeGoals, lowestCategory]);

  const activeGoal = useMemo(() => {
    if (activeGoals.length === 0) return null;
    if (!suggestedFocusCategory) return activeGoals[0] ?? null;
    const inFocus = activeGoals.find(
      (goal) => goal.life_wheel_category === suggestedFocusCategory,
    );
    return inFocus ?? activeGoals[0] ?? null;
  }, [activeGoals, suggestedFocusCategory]);

  const supportingHabits = useMemo(() => {
    if (activeGoal) {
      const linked = habits.filter((habit) => habit.goal_id === activeGoal.id);
      if (linked.length > 0) return linked.slice(0, 3);
    }

    if (suggestedFocusCategory) {
      const byDomain = habits.filter(
        (habit) => habit.domain_key === suggestedFocusCategory,
      );
      if (byDomain.length > 0) return byDomain.slice(0, 3);
    }

    return [];
  }, [activeGoal, habits, suggestedFocusCategory]);

  const pillarInputs = useMemo<GoalPillarComputeInput[]>(
    () =>
      activeGoals.slice(0, PILLAR_GOAL_LIMIT).map((goal) => {
        const steps = stepsByGoal[goal.id] ?? [];
        return {
          goal,
          steps,
          habits,
          healthState: evaluateGoalHealthFromSignals(goal, steps).healthState,
        };
      }),
    [activeGoals, habits, stepsByGoal],
  );

  const pillarTotals = useMemo(() => computeGoalPillarTotals(pillarInputs), [pillarInputs]);

  const activeGoalPillars = useMemo(() => {
    if (!activeGoal) return null;
    const input = pillarInputs.find((candidate) => candidate.goal.id === activeGoal.id);
    return input ? computeGoalPillars(input) : null;
  }, [activeGoal, pillarInputs]);

  const latestCheckinDateLabel = formatDateLabel(latestCheckin?.date ?? null);

  const primaryAction = useMemo(() => {
    if (!latestScores) {
      return {
        label: 'Run your Life Radar check-in',
        icon: '✦',
        onClick: onOpenCheckins,
        summary: 'Start with the signal.',
      };
    }

    if (!activeGoal) {
      return {
        label: 'Choose your active goal',
        icon: '◇',
        onClick: onOpenGoals,
        summary: 'Turn the focus area into a chapter.',
      };
    }

    return {
      label:
        supportingHabits.length > 0
          ? 'Start today’s quest step'
          : 'Build a supporting habit',
      icon: supportingHabits.length > 0 ? '✧' : '⌁',
      onClick: supportingHabits.length > 0 ? onOpenGoals : onOpenStarterQuest,
      summary:
        supportingHabits.length > 0
          ? 'Continue from your active quest line.'
          : 'Add the ritual that carries this chapter.',
    };
  }, [
    activeGoal,
    latestScores,
    onOpenCheckins,
    onOpenGoals,
    onOpenStarterQuest,
    supportingHabits.length,
  ]);

  const companionCopy = useMemo(
    () =>
      getCompanionCopy({
        activeGoal,
        latestScores,
        lowestCategory,
        highestCategory,
        supportingHabitCount: supportingHabits.length,
      }),
    [
      activeGoal,
      highestCategory,
      latestScores,
      lowestCategory,
      supportingHabits.length,
    ],
  );

  const focusLabel = formatCategoryLabel(suggestedFocusCategory);
  const activeGoalCategory =
    (activeGoal?.life_wheel_category as LifeWheelCategoryKey | null) ??
    suggestedFocusCategory;
  const activeGoalTargetLabel = formatDateLabel(
    activeGoal?.target_date ?? null,
  );
  const radarPercent = clampScorePercent(
    lowestCategory?.score ?? highestCategory?.score ?? null,
  );

  return (
    <section
      className="my-quest-hub my-quest-hub--premium"
      aria-label="My Quest Journey hub"
    >
      {loading ? (
        <p className="my-quest-hub__status">Loading your quest snapshot…</p>
      ) : null}
      {loadError ? (
        <p className="my-quest-hub__status my-quest-hub__status--warning">
          {loadError}
        </p>
      ) : null}

      <QuestHeroCard
        eyebrow="Quest Journey"
        title="My Quest Journey"
        summary={getHeroSummary(
          suggestedFocusCategory,
          activeGoal,
          latestScores,
        )}
        pillar="direction"
        meta={
          <>
            <QuestLifeAreaChip
              label={focusLabel}
              icon="✦"
              active={Boolean(suggestedFocusCategory)}
            />
            {activeGoal ? (
              <QuestLifeAreaChip label={activeGoal.title} icon="◇" strong />
            ) : null}
          </>
        }
        actions={
          <QuestPrimaryAction
            icon={primaryAction.icon}
            onClick={primaryAction.onClick}
            variant="gold"
          >
            {primaryAction.label}
          </QuestPrimaryAction>
        }
        visual={
          <div className="my-quest-hub__hero-visual" aria-hidden="true">
            <span className="my-quest-hub__orb my-quest-hub__orb--large">
              ✦
            </span>
            <span className="my-quest-hub__orb my-quest-hub__orb--small">
              ◇
            </span>
            <span className="my-quest-hub__hero-focus">{focusLabel}</span>
          </div>
        }
      >
        <span className="my-quest-hub__next-note">{primaryAction.summary}</span>
      </QuestHeroCard>

      <QuestGlassCard
        title="Quest Strength"
        strong
        className="my-quest-hub__journey-card my-quest-hub__strength-card"
        footer={
          pillarTotals.goalCount > 0 ? (
            <p className="my-quest-hub__strength-hint">
              <span aria-hidden="true">{GOAL_PILLAR_META[pillarTotals.weakest].icon}</span>{' '}
              <strong>{GOAL_PILLAR_META[pillarTotals.weakest].label}</strong> is your weakest pillar.{' '}
              {PILLAR_TOTAL_HINTS[pillarTotals.weakest]}
            </p>
          ) : undefined
        }
      >
        {pillarTotals.goalCount > 0 ? (
          <>
            <div className="my-quest-hub__strength-rings">
              <QuestMetricRing
                value={pillarTotals.insight}
                label={GOAL_PILLAR_META.insight.label}
                caption={GOAL_PILLAR_META.insight.icon}
                variant="gold"
              />
              <QuestMetricRing
                value={pillarTotals.momentum}
                label={GOAL_PILLAR_META.momentum.label}
                caption={GOAL_PILLAR_META.momentum.icon}
                variant="progress"
              />
              <QuestMetricRing
                value={pillarTotals.support}
                label={GOAL_PILLAR_META.support.label}
                caption={GOAL_PILLAR_META.support.icon}
                variant="success"
              />
            </div>
            <p className="my-quest-hub__muted">
              Across {pillarTotals.goalCount} active quest
              {pillarTotals.goalCount === 1 ? '' : 's'} · overall {pillarTotals.overall}%
            </p>
          </>
        ) : (
          <>
            <p>
              No active quests yet. Add one goal and this card will show how strong it is on
              Insight, Momentum, and Support.
            </p>
            <QuestSecondaryAction onClick={() => setQuickAddMode('goal')} variant="glass">
              ＋ Quick add a goal
            </QuestSecondaryAction>
          </>
        )}
      </QuestGlassCard>

      <div className="my-quest-hub__primary-grid">
        <QuestGlassCard
          title="Life Radar"
          strong
          className="my-quest-hub__journey-card my-quest-hub__radar-card"
          footer={
            <QuestSecondaryAction onClick={onOpenCheckins} variant="glass">
              Run check-in
            </QuestSecondaryAction>
          }
        >
          {latestScores ? (
            <>
              <div className="my-quest-hub__radar-summary">
                <QuestMetricRing
                  value={radarPercent}
                  label="Care signal"
                  caption={
                    lowestCategory ? `${lowestCategory.score}/10` : 'Latest'
                  }
                  variant="gold"
                />
                <div className="my-quest-hub__signal-stack">
                  <div className="my-quest-hub__signal-row my-quest-hub__signal-row--strong">
                    <span>Strongest area</span>
                    <strong>{formatScoreLabel(highestCategory)}</strong>
                  </div>
                  <div className="my-quest-hub__signal-row my-quest-hub__signal-row--care">
                    <span>Needs care</span>
                    <strong>{formatScoreLabel(lowestCategory)}</strong>
                  </div>
                </div>
              </div>
              <p className="my-quest-hub__muted">
                {latestCheckinDateLabel
                  ? `Latest check-in: ${latestCheckinDateLabel}`
                  : 'Latest check-in available.'}
              </p>
            </>
          ) : (
            <p>
              No Life Wheel check-in yet. Run a check-in to reveal your
              strongest area and the area asking for care.
            </p>
          )}
        </QuestGlassCard>

        <QuestGlassCard
          title="Active Quest Line"
          strong
          className="my-quest-hub__journey-card my-quest-hub__active-card"
          footer={
            <QuestSecondaryAction onClick={onOpenGoals} variant="glass">
              Open Goals
            </QuestSecondaryAction>
          }
        >
          {activeGoal ? (
            <>
              <p className="my-quest-hub__chapter-eyebrow">Current chapter</p>
              <h4 className="my-quest-hub__chapter-title">
                {activeGoal.title}
              </h4>
              <p className="my-quest-hub__muted">
                {formatStatusLabel(activeGoal.status_tag)}
                {activeGoalTargetLabel
                  ? ` · Target: ${activeGoalTargetLabel}`
                  : ''}
              </p>
              <div className="my-quest-hub__chip-row">
                <QuestLifeAreaChip
                  label={formatCategoryLabel(activeGoalCategory)}
                  icon="✦"
                  active
                />
              </div>
              {activeGoalPillars ? (
                <GoalPillarMeter pillars={activeGoalPillars} size="full" />
              ) : null}
              {activeGoalPillars ? (
                <p className="my-quest-hub__muted my-quest-hub__pillar-boost">
                  {GOAL_PILLAR_META[activeGoalPillars.weakest].icon}{' '}
                  {activeGoalPillars[activeGoalPillars.weakest].boost ??
                    'All three pillars are full — keep the rhythm.'}
                </p>
              ) : null}
              {supportingHabits.length > 0 ? (
                <ul
                  className="my-quest-hub__habit-list my-quest-hub__habit-list--premium"
                  aria-label="Supporting habits"
                >
                  {supportingHabits.map((habit) => (
                    <li key={habit.id}>
                      <span aria-hidden="true">{habit.emoji || '✧'}</span>
                      <span>{habit.title}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="my-quest-hub__muted">No supporting habits yet.</p>
              )}
            </>
          ) : (
            <>
              <p>No active goal in this focus area yet.</p>
              <p className="my-quest-hub__muted">
                Open Goals to choose the chapter that matches your current
                signal.
              </p>
            </>
          )}
        </QuestGlassCard>
      </div>

      <QuestCompanionCard
        source="Quest companion"
        title={companionCopy.title}
        insight={companionCopy.insight}
        reason={companionCopy.reason}
      />

      <section
        className="my-quest-hub__tools"
        aria-label="Secondary quest actions"
      >
        <button
          type="button"
          className="my-quest-hub__tool-card my-quest-hub__tool-card--add"
          onClick={() => setQuickAddMode('goal')}
        >
          <span className="my-quest-hub__tool-icon" aria-hidden="true">
            ＋
          </span>
          <span className="my-quest-hub__tool-copy">
            <span className="my-quest-hub__tool-title">Quick add</span>
            <span className="my-quest-hub__tool-summary">
              A goal or habit in seconds.
            </span>
          </span>
        </button>
        <button
          type="button"
          className="my-quest-hub__tool-card"
          onClick={onOpenStarterQuest}
        >
          <span className="my-quest-hub__tool-icon" aria-hidden="true">
            ⌁
          </span>
          <span className="my-quest-hub__tool-copy">
            <span className="my-quest-hub__tool-title">Starter Quest</span>
            <span className="my-quest-hub__tool-summary">
              Shape the first ritual.
            </span>
          </span>
        </button>
        <button
          type="button"
          className="my-quest-hub__tool-card"
          onClick={onOpenCheckins}
        >
          <span className="my-quest-hub__tool-icon" aria-hidden="true">
            ✦
          </span>
          <span className="my-quest-hub__tool-copy">
            <span className="my-quest-hub__tool-title">Check-in</span>
            <span className="my-quest-hub__tool-summary">
              Refresh your Life Radar.
            </span>
          </span>
        </button>
        <button
          type="button"
          className="my-quest-hub__tool-card"
          onClick={onOpenGoals}
        >
          <span className="my-quest-hub__tool-icon" aria-hidden="true">
            ◇
          </span>
          <span className="my-quest-hub__tool-copy">
            <span className="my-quest-hub__tool-title">Goals</span>
            <span className="my-quest-hub__tool-summary">
              Open your quest lines.
            </span>
          </span>
        </button>
      </section>

      {quickAddMode !== null ? (
        <QuickAddSheet
          session={session}
          initialMode={quickAddMode}
          goalOptions={activeGoals.map((goal) => ({ id: goal.id, title: goal.title }))}
          onCreated={() => setReloadKey((key) => key + 1)}
          onOpenAdvanced={(mode) => {
            setQuickAddMode(null);
            if (mode === 'goal') onOpenGoals();
            else onOpenStarterQuest();
          }}
          onClose={() => setQuickAddMode(null)}
        />
      ) : null}
    </section>
  );
}
