import { useState, type CSSProperties } from 'react';
import type { LifeWheelCategoryKey } from '../features/checkins/LifeWheelCheckins';
import { getLifeWheelCategoryLabel } from '../features/checkins/LifeWheelCheckins';
import { getLifeWheelVisual, hexToRgba } from '../features/life-wheel/lifeWheelVisuals';
import type { GoalRecommendedAction } from '../features/goals/executionTypes';
import type { GoalHealthResult } from '../features/goals/goalHealth';
import type { Database } from '../lib/database.types';
import { GoalEditDialog } from './GoalEditDialog';
import { GoalListItem } from './GoalListItem';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type StepRow = Database['public']['Tables']['life_goal_steps']['Row'];

type CategoryInfoCardProps = {
  categoryKey: LifeWheelCategoryKey | null;
  onAddGoal: () => void;
  onUsePrompt: (prompt: string) => void;
  goals: GoalRow[];
  goalHealthById?: Record<string, GoalHealthResult>;
  stepsByGoal: Record<string, StepRow[]>;
  isLoading: boolean;
  onUpdateGoal: (goalId: string, payload: Database['public']['Tables']['goals']['Update']) => Promise<void>;
  onToggleStep: (goal: GoalRow, step: StepRow, completed: boolean) => void;
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

export function CategoryInfoCard({
  categoryKey,
  onAddGoal,
  onUsePrompt,
  goals,
  goalHealthById = {},
  stepsByGoal,
  isLoading,
  onUpdateGoal,
  onToggleStep,
  onApplyRecommendedAction,
}: CategoryInfoCardProps) {
  const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const handleOpenDialog = (goal: GoalRow) => {
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
        <h4>
          Your goals here
          {goals.length > 0 ? <span className="category-info-card__count">{goals.length}</span> : null}
        </h4>
        {isLoading ? (
          <p className="category-info-card__empty">Loading goals…</p>
        ) : goals.length === 0 ? (
          <p className="category-info-card__empty">No goals yet in {categoryLabel}. Add your first one below.</p>
        ) : (
          <ul className="category-info-card__goals">
            {goals.map((goal) => (
              <GoalListItem
                key={goal.id}
                goal={goal}
                steps={stepsByGoal[goal.id] ?? []}
                health={goalHealthById[goal.id]}
                onEdit={handleOpenDialog}
                onToggleStep={onToggleStep}
                onApplyRecommendedAction={onApplyRecommendedAction ? (id, action) => void onApplyRecommendedAction(id, action) : undefined}
              />
            ))}
          </ul>
        )}
      </div>

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
