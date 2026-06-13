import { type CSSProperties } from 'react';
import { getLifeWheelCategoryLabel, type LifeWheelCategoryKey } from '../features/checkins/LifeWheelCheckins';
import {
  getLifeWheelVisual,
  hexToRgba,
  isLifeWheelCategoryKey,
} from '../features/life-wheel/lifeWheelVisuals';
import { computeGoalProgress } from '../features/goals/goalProgress';
import type { GoalRecommendedAction } from '../features/goals/executionTypes';
import type { GoalHealthResult } from '../features/goals/goalHealth';
import type { Database } from '../lib/database.types';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type StepRow = Database['public']['Tables']['life_goal_steps']['Row'];

type GoalListItemProps = {
  goal: GoalRow;
  steps: StepRow[];
  health?: GoalHealthResult;
  onEdit: (goal: GoalRow) => void;
  onToggleStep: (goal: GoalRow, step: StepRow, completed: boolean) => void;
  onApplyRecommendedAction?: (goalId: string, action: GoalRecommendedAction) => void;
  /** Show the primary-area chip on the card (used in the cross-area "All goals" view). */
  showAreaTag?: boolean;
};

function healthTone(healthState: GoalHealthResult['healthState']): { label: string; className: string } {
  if (healthState === 'on_track') return { label: 'On track', className: 'goal-card__health--ok' };
  if (healthState === 'caution') return { label: 'Caution', className: 'goal-card__health--warn' };
  return { label: 'At risk', className: 'goal-card__health--risk' };
}

function formatActionLabel(action: GoalHealthResult['recommendedNextAction']): string {
  return action.split('_').join(' ');
}

function secondaryKeys(goal: GoalRow): LifeWheelCategoryKey[] {
  const raw = (goal as { secondary_life_wheel_categories?: string[] | null }).secondary_life_wheel_categories;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isLifeWheelCategoryKey);
}

export function GoalListItem({
  goal,
  steps,
  health,
  onEdit,
  onToggleStep,
  onApplyRecommendedAction,
  showAreaTag = false,
}: GoalListItemProps) {
  const primaryKey = isLifeWheelCategoryKey(goal.life_wheel_category) ? goal.life_wheel_category : null;
  const visual = primaryKey ? getLifeWheelVisual(primaryKey) : null;
  const color = visual?.color ?? '#3b82f6';
  const tone = health ? healthTone(health.healthState) : null;
  const secondaries = secondaryKeys(goal);
  const progress = computeGoalProgress(steps);
  const orderedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);

  return (
    <li
      className="goal-card"
      style={
        {
          '--lw-color': color,
          '--lw-color-soft': hexToRgba(color, 0.12),
          '--lw-color-line': hexToRgba(color, 0.28),
        } as CSSProperties
      }
    >
      <div className="goal-card__body">
        <div className="goal-card__top">
          <button type="button" className="goal-card__title-btn" onClick={() => onEdit(goal)}>
            {goal.title}
          </button>
          {tone ? <span className={`goal-card__health ${tone.className}`}>{tone.label}</span> : null}
        </div>

        {progress.measurable ? (
          <div className="goal-card__progress" aria-label={`${progress.completed} of ${progress.total} steps done`}>
            <div className="goal-card__progress-track">
              <div className="goal-card__progress-fill" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
            </div>
            <span className="goal-card__progress-label">
              {progress.completed}/{progress.total}
            </span>
          </div>
        ) : null}

        {orderedSteps.length > 0 ? (
          <ul className="goal-card__steps">
            {orderedSteps.map((step) => (
              <li key={step.id} className="goal-card__step">
                <label className="goal-card__step-check">
                  <input
                    type="checkbox"
                    checked={Boolean(step.completed)}
                    onChange={(event) => onToggleStep(goal, step, event.target.checked)}
                  />
                  <span className={step.completed ? 'goal-card__step-title goal-card__step-title--done' : 'goal-card__step-title'}>
                    {step.title}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="goal-card__meta">
          {showAreaTag && visual ? (
            <span className="goal-card__area" style={{ color, borderColor: hexToRgba(color, 0.4) }}>
              <span aria-hidden>{visual.emoji}</span> {visual.shortLabel}
            </span>
          ) : null}
          {secondaries.length > 0 ? (
            <span className="goal-card__dots" aria-label="Also touches on">
              {secondaries.map((key) => (
                <span
                  key={key}
                  className="goal-card__dot"
                  title={getLifeWheelCategoryLabel(key)}
                  style={{ background: getLifeWheelVisual(key).color }}
                />
              ))}
            </span>
          ) : null}
          <button type="button" className="goal-card__open" onClick={() => onEdit(goal)}>
            View &amp; edit →
          </button>
        </div>
      </div>

      {health && health.recommendedNextAction !== 'keep_plan' && onApplyRecommendedAction ? (
        <button
          type="button"
          className="goal-card__action"
          onClick={() => onApplyRecommendedAction(goal.id, health.recommendedNextAction)}
        >
          Apply suggestion: {formatActionLabel(health.recommendedNextAction)}
        </button>
      ) : null}
    </li>
  );
}
