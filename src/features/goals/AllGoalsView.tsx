import { useMemo, useState } from 'react';
import { GoalListItem } from '../../components/GoalListItem';
import { GoalEditDialog } from '../../components/GoalEditDialog';
import { LIFE_WHEEL_VISUALS, isLifeWheelCategoryKey } from '../life-wheel/lifeWheelVisuals';
import type { LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import type { GoalRecommendedAction } from './executionTypes';
import type { GoalHealthResult } from './goalHealth';
import type { Database } from '../../lib/database.types';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type StepRow = Database['public']['Tables']['life_goal_steps']['Row'];

type AllGoalsViewProps = {
  goals: GoalRow[];
  stepsByGoal: Record<string, StepRow[]>;
  goalHealthById: Record<string, GoalHealthResult>;
  isLoading: boolean;
  onUpdateGoal: (goalId: string, payload: Database['public']['Tables']['goals']['Update']) => Promise<void>;
  onToggleStep: (goal: GoalRow, step: StepRow, completed: boolean) => void;
  onApplyRecommendedAction?: (goalId: string, action: GoalRecommendedAction) => Promise<void>;
  onJumpToArea?: (key: LifeWheelCategoryKey) => void;
};

type HealthFilter = 'all' | 'at_risk' | 'caution' | 'on_track';

const HEALTH_FILTERS: { value: HealthFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'caution', label: 'Caution' },
  { value: 'on_track', label: 'On track' },
];

export function AllGoalsView({
  goals,
  stepsByGoal,
  goalHealthById,
  isLoading,
  onUpdateGoal,
  onToggleStep,
  onApplyRecommendedAction,
  onJumpToArea,
}: AllGoalsViewProps) {
  const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');

  const filteredGoals = useMemo(() => {
    if (healthFilter === 'all') return goals;
    return goals.filter((goal) => goalHealthById[goal.id]?.healthState === healthFilter);
  }, [goals, goalHealthById, healthFilter]);

  const groups = useMemo(() => {
    return LIFE_WHEEL_VISUALS.map((visual) => ({
      key: visual.key,
      visual,
      goals: filteredGoals.filter((goal) => goal.life_wheel_category === visual.key),
    })).filter((group) => group.goals.length > 0);
  }, [filteredGoals]);

  const uncategorized = useMemo(
    () => filteredGoals.filter((goal) => !isLifeWheelCategoryKey(goal.life_wheel_category)),
    [filteredGoals],
  );

  if (isLoading) {
    return <p className="all-goals__empty">Loading your goals…</p>;
  }

  if (goals.length === 0) {
    return (
      <div className="all-goals__empty all-goals__empty--block">
        <div className="all-goals__empty-icon">🎯</div>
        <p>No goals yet. Pick an area on the wheel to add your first one.</p>
      </div>
    );
  }

  const renderGoals = (list: GoalRow[]) =>
    list.map((goal) => (
      <GoalListItem
        key={goal.id}
        goal={goal}
        steps={stepsByGoal[goal.id] ?? []}
        health={goalHealthById[goal.id]}
        onEdit={setEditingGoal}
        onToggleStep={onToggleStep}
        onApplyRecommendedAction={onApplyRecommendedAction ? (id, action) => void onApplyRecommendedAction(id, action) : undefined}
        showAreaTag
      />
    ));

  return (
    <div className="all-goals">
      <div className="all-goals__filters" role="group" aria-label="Filter goals by health">
        {HEALTH_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`all-goals__filter ${healthFilter === filter.value ? 'all-goals__filter--active' : ''}`}
            aria-pressed={healthFilter === filter.value}
            onClick={() => setHealthFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && uncategorized.length === 0 ? (
        <p className="all-goals__empty">No goals match this filter.</p>
      ) : null}

      {groups.map((group) => (
        <section key={group.key} className="all-goals__group">
          <header
            className="all-goals__group-head"
            style={{ borderColor: group.visual.color }}
          >
            <button
              type="button"
              className="all-goals__group-title"
              onClick={() => onJumpToArea?.(group.key)}
              style={{ color: group.visual.color }}
            >
              <span aria-hidden>{group.visual.emoji}</span> {group.visual.label}
            </button>
            <span className="all-goals__group-count" style={{ background: group.visual.color }}>
              {group.goals.length}
            </span>
          </header>
          <ul className="category-info-card__goals">{renderGoals(group.goals)}</ul>
        </section>
      ))}

      {uncategorized.length > 0 ? (
        <section className="all-goals__group">
          <header className="all-goals__group-head all-goals__group-head--muted">
            <span className="all-goals__group-title">Unsorted</span>
            <span className="all-goals__group-count all-goals__group-count--muted">{uncategorized.length}</span>
          </header>
          <ul className="category-info-card__goals">{renderGoals(uncategorized)}</ul>
        </section>
      ) : null}

      {editingGoal ? (
        <GoalEditDialog
          goal={editingGoal}
          isOpen={Boolean(editingGoal)}
          onClose={() => setEditingGoal(null)}
          onSave={onUpdateGoal}
        />
      ) : null}
    </div>
  );
}
