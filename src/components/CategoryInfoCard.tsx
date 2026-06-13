import { useMemo, useState, type CSSProperties } from 'react';
import type { LifeWheelCategoryKey } from '../features/checkins/LifeWheelCheckins';
import { getLifeWheelCategoryLabel } from '../features/checkins/LifeWheelCheckins';
import {
  getLifeWheelVisual,
  hexToRgba,
  isLifeWheelCategoryKey,
} from '../features/life-wheel/lifeWheelVisuals';
import type { GoalRecommendedAction } from '../features/goals/executionTypes';
import type { GoalHealthResult } from '../features/goals/goalHealth';
import type { Database } from '../lib/database.types';
import { GoalEditDialog } from './GoalEditDialog';

type CategoryInfoCardProps = {
  categoryKey: LifeWheelCategoryKey | null;
  onAddGoal: () => void;
  onUsePrompt: (prompt: string) => void;
  goals: Database['public']['Tables']['goals']['Row'][];
  goalHealthById?: Record<string, GoalHealthResult>;
  stepsByGoal: Record<string, Database['public']['Tables']['life_goal_steps']['Row'][]>;
  isLoading: boolean;
  onUpdateGoal: (
    goalId: string,
    payload: Database['public']['Tables']['goals']['Update'],
  ) => Promise<void>;
  onApplyRecommendedAction?: (goalId: string, action: GoalRecommendedAction) => Promise<void>;
};

const CATEGORY_INFO: Record<LifeWheelCategoryKey, { description: string; examples: string[] }> = {
  spirituality_community: {
    description: 'Connect with your spiritual practices and community involvement.',
    examples: ['Develop a daily meditation practice', 'Join a community service group', 'Explore spiritual teachings'],
  },
  finance_wealth: {
    description: 'Build financial security and grow your wealth.',
    examples: ['Save for retirement', 'Create a budget plan', 'Invest in financial education'],
  },
  love_relations: {
    description: 'Nurture romantic relationships and intimate connections.',
    examples: ['Plan regular date nights', 'Improve communication skills', 'Build emotional intimacy'],
  },
  fun_creativity: {
    description: 'Express yourself creatively and enjoy recreational activities.',
    examples: ['Learn a musical instrument', 'Start a creative hobby', 'Plan adventure activities'],
  },
  career_development: {
    description: 'Advance your career and invest in personal growth.',
    examples: ['Earn a professional certification', 'Develop leadership skills', 'Network with professionals'],
  },
  health_fitness: {
    description: 'Improve your physical health and fitness.',
    examples: ['Train for a 5K race', 'Establish a workout routine', 'Improve nutrition habits'],
  },
  family_friends: {
    description: 'Strengthen bonds with family and friends.',
    examples: ['Schedule regular family time', 'Reconnect with old friends', 'Create family traditions'],
  },
  living_spaces: {
    description: 'Create a comfortable and organized living environment.',
    examples: ['Declutter and organize home', 'Improve home decor', 'Create a peaceful workspace'],
  },
};

function healthTone(healthState: GoalHealthResult['healthState']): { label: string; className: string } {
  if (healthState === 'on_track') return { label: 'On track', className: 'goal-card__health--ok' };
  if (healthState === 'caution') return { label: 'Caution', className: 'goal-card__health--warn' };
  return { label: 'At risk', className: 'goal-card__health--risk' };
}

function formatActionLabel(action: GoalHealthResult['recommendedNextAction']): string {
  return action.split('_').join(' ');
}

function secondaryKeys(goal: Database['public']['Tables']['goals']['Row']): LifeWheelCategoryKey[] {
  const raw = (goal as { secondary_life_wheel_categories?: string[] | null }).secondary_life_wheel_categories;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isLifeWheelCategoryKey);
}

export function CategoryInfoCard({
  categoryKey,
  onAddGoal,
  onUsePrompt,
  goals,
  goalHealthById = {},
  stepsByGoal,
  isLoading,
  onUpdateGoal,
  onApplyRecommendedAction,
}: CategoryInfoCardProps) {
  const [editingGoal, setEditingGoal] = useState<Database['public']['Tables']['goals']['Row'] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const allSteps = useMemo(() => Object.values(stepsByGoal).flat(), [stepsByGoal]);

  if (!categoryKey) {
    return (
      <div className="category-info-card category-info-card--empty">
        <div className="category-info-card__icon">🎯</div>
        <h3>Pick a life area</h3>
        <p>Tap a coloured slice on the wheel to focus on that area and see — or add — its goals.</p>
      </div>
    );
  }

  const info = CATEGORY_INFO[categoryKey];
  const visual = getLifeWheelVisual(categoryKey);
  const categoryLabel = getLifeWheelCategoryLabel(categoryKey);

  const handleOpenDialog = (goal: Database['public']['Tables']['goals']['Row']) => {
    setEditingGoal(goal);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingGoal(null);
  };

  return (
    <div
      className="category-info-card"
      style={
        {
          '--lw-color': visual.color,
          '--lw-color-soft': hexToRgba(visual.color, 0.12),
          '--lw-color-line': hexToRgba(visual.color, 0.28),
        } as CSSProperties
      }
    >
      <div className="category-info-card__header">
        <span className="category-info-card__badge" aria-hidden>
          {visual.emoji}
        </span>
        <div>
          <h3>{categoryLabel}</h3>
          <p className="category-info-card__description">{info.description}</p>
        </div>
      </div>

      <div className="category-info-card__section">
        <h4>Your goals here {goals.length > 0 ? <span className="category-info-card__count">{goals.length}</span> : null}</h4>
        {isLoading ? (
          <p className="category-info-card__empty">Loading goals…</p>
        ) : goals.length === 0 ? (
          <p className="category-info-card__empty">No goals yet in {categoryLabel}. Add your first one below.</p>
        ) : (
          <ul className="category-info-card__goals">
            {goals.map((goal) => {
              const health = goalHealthById[goal.id];
              const tone = health ? healthTone(health.healthState) : null;
              const secondaries = secondaryKeys(goal);
              const stepCount = (stepsByGoal[goal.id] ?? []).length;
              return (
                <li key={goal.id} className="goal-card">
                  <button type="button" className="goal-card__body" onClick={() => handleOpenDialog(goal)}>
                    <div className="goal-card__top">
                      <span className="goal-card__title">{goal.title}</span>
                      {tone ? <span className={`goal-card__health ${tone.className}`}>{tone.label}</span> : null}
                    </div>
                    <div className="goal-card__meta">
                      {stepCount > 0 ? <span className="goal-card__chip">{stepCount} step{stepCount === 1 ? '' : 's'}</span> : null}
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
                      <span className="goal-card__open">View &amp; edit →</span>
                    </div>
                  </button>
                  {health && health.recommendedNextAction !== 'keep_plan' && onApplyRecommendedAction ? (
                    <button
                      type="button"
                      className="goal-card__action"
                      onClick={() => void onApplyRecommendedAction(goal.id, health.recommendedNextAction)}
                    >
                      Apply suggestion: {formatActionLabel(health.recommendedNextAction)}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {allSteps.length > 0 ? (
        <div className="category-info-card__section">
          <h4>Sub goals</h4>
          <ul className="category-info-card__subgoals">
            {allSteps.map((step) => {
              const parentGoal = goals.find((goal) => goal.id === step.goal_id);
              return (
                <li key={step.id} className="category-info-card__subgoal">
                  <span>{step.title}</span>
                  {parentGoal ? <span className="category-info-card__subgoal-parent">{parentGoal.title}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="category-info-card__section">
        <h4>Need ideas?</h4>
        <div className="category-info-card__prompts">
          {info.examples.map((example) => (
            <button key={example} type="button" className="category-info-card__prompt" onClick={() => onUsePrompt(example)}>
              {example}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="category-info-card__action" onClick={onAddGoal}>
        + Add a goal to {visual.shortLabel}
      </button>

      {editingGoal ? (
        <GoalEditDialog goal={editingGoal} isOpen={isDialogOpen} onClose={handleCloseDialog} onSave={onUpdateGoal} />
      ) : null}
    </div>
  );
}
