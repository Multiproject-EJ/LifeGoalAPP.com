import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Database, Json } from '../../lib/database.types';
import { fetchCheckinsForUser } from '../../services/checkins';
import { fetchGoals } from '../../services/goals';
import { listHabitsV2, type HabitV2Row } from '../../services/habitsV2';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import { normalizeGoalStatus } from './goalStatus';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type CheckinRow = Database['public']['Tables']['checkins']['Row'];

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
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseLatestScores(scores: Json | null): Record<LifeWheelCategoryKey, number> | null {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) return null;
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
  return LIFE_WHEEL_CATEGORIES.find((category) => category.key === key)?.label ?? key;
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

      const firstError = checkinsResult.error ?? goalsResult.error ?? habitsResult.error;
      if (firstError) {
        setLoadError(firstError.message || 'Some My Quest data could not be loaded.');
      }
      setLoading(false);
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [session.user.id]);

  const latestCheckin = useMemo(() => checkins[0] ?? null, [checkins]);
  const latestScores = useMemo(() => parseLatestScores(latestCheckin?.scores ?? null), [latestCheckin]);

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
    () => goals.filter((goal) => normalizeGoalStatus(goal.status_tag) !== 'achieved'),
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

    const recentWithCategory = activeGoals.find((goal) => Boolean(goal.life_wheel_category));
    return (recentWithCategory?.life_wheel_category as LifeWheelCategoryKey | null) ?? null;
  }, [activeGoals, lowestCategory]);

  const activeGoal = useMemo(() => {
    if (activeGoals.length === 0) return null;
    if (!suggestedFocusCategory) return activeGoals[0] ?? null;
    const inFocus = activeGoals.find((goal) => goal.life_wheel_category === suggestedFocusCategory);
    return inFocus ?? activeGoals[0] ?? null;
  }, [activeGoals, suggestedFocusCategory]);

  const supportingHabits = useMemo(() => {
    if (activeGoal) {
      const linked = habits.filter((habit) => habit.goal_id === activeGoal.id);
      if (linked.length > 0) return linked.slice(0, 3);
    }

    if (suggestedFocusCategory) {
      const byDomain = habits.filter((habit) => habit.domain_key === suggestedFocusCategory);
      if (byDomain.length > 0) return byDomain.slice(0, 3);
    }

    return [];
  }, [activeGoal, habits, suggestedFocusCategory]);

  const latestCheckinDateLabel = formatDateLabel(latestCheckin?.date ?? null);

  return (
    <section className="my-quest-hub" aria-label="My Quest hub">
      <header className="my-quest-hub__header">
        <h3>My Quest</h3>
        <p>Choose your direction, then turn it into today&apos;s action.</p>
      </header>

      {loading ? <p className="my-quest-hub__status">Loading your quest snapshot…</p> : null}
      {loadError ? <p className="my-quest-hub__status my-quest-hub__status--warning">{loadError}</p> : null}

      <article className="my-quest-hub__card">
        <h4>Life Wheel Snapshot</h4>
        {latestScores ? (
          <>
            <p>{latestCheckinDateLabel ? `Latest check-in: ${latestCheckinDateLabel}` : 'Latest check-in available.'}</p>
            <p>
              Lowest: <strong>{formatCategoryLabel(lowestCategory?.key ?? null)}</strong>
              {lowestCategory ? ` (${lowestCategory.score}/10)` : ''} · Highest:{' '}
              <strong>{formatCategoryLabel(highestCategory?.key ?? null)}</strong>
              {highestCategory ? ` (${highestCategory.score}/10)` : ''}
            </p>
          </>
        ) : (
          <p>No Life Wheel check-in yet.</p>
        )}
        <button type="button" className="my-quest-hub__button my-quest-hub__button--secondary" onClick={onOpenCheckins}>
          Run check-in
        </button>
      </article>

      <article className="my-quest-hub__card">
        <h4>Current Focus</h4>
        {suggestedFocusCategory ? <p>{formatCategoryLabel(suggestedFocusCategory)}</p> : <p>No focus area yet.</p>}
        <div className="my-quest-hub__row-actions">
          <button type="button" className="my-quest-hub__button my-quest-hub__button--secondary" onClick={onOpenCheckins}>
            Run check-in
          </button>
          <button type="button" className="my-quest-hub__button my-quest-hub__button--secondary" onClick={onOpenGoals}>
            Open goals
          </button>
        </div>
      </article>

      <article className="my-quest-hub__card">
        <h4>Active Goal</h4>
        {activeGoal ? (
          <>
            <p className="my-quest-hub__goal-title">{activeGoal.title}</p>
            <p>
              Status: {normalizeGoalStatus(activeGoal.status_tag).replace('_', ' ')}
              {activeGoal.target_date ? ` · Target: ${formatDateLabel(activeGoal.target_date) ?? activeGoal.target_date}` : ''}
            </p>
          </>
        ) : (
          <p>No goal in this area yet.</p>
        )}
        <button type="button" className="my-quest-hub__button my-quest-hub__button--secondary" onClick={onOpenGoals}>
          Open goals
        </button>
      </article>

      <article className="my-quest-hub__card">
        <h4>Supporting Habits</h4>
        {supportingHabits.length > 0 ? (
          <ul className="my-quest-hub__habit-list">
            {supportingHabits.map((habit) => (
              <li key={habit.id}>
                {habit.emoji ? `${habit.emoji} ` : ''}
                {habit.title}
              </li>
            ))}
          </ul>
        ) : (
          <p>No supporting habits yet.</p>
        )}
        <button type="button" className="my-quest-hub__button my-quest-hub__button--secondary" onClick={onOpenStarterQuest}>
          Starter Quest
        </button>
      </article>

      <article className="my-quest-hub__card">
        <h4>Next Actions</h4>
        <div className="my-quest-hub__grid-actions">
          <button type="button" className="my-quest-hub__button" onClick={onOpenStarterQuest}>Starter Quest</button>
          <button type="button" className="my-quest-hub__button" onClick={onOpenCheckins}>Check-in</button>
          <button type="button" className="my-quest-hub__button" onClick={onOpenGoals}>Goals</button>
        </div>
      </article>
    </section>
  );
}
