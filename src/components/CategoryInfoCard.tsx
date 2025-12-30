import { useMemo, useState } from 'react';
import type { LifeWheelCategoryKey } from '../features/checkins/LifeWheelCheckins';
import { LIFE_WHEEL_CATEGORIES } from '../features/checkins/LifeWheelCheckins';
import type { Database } from '../lib/database.types';
import { GoalEditDialog } from './GoalEditDialog';

type CategoryInfoCardProps = {
  categoryKey: LifeWheelCategoryKey | null;
  onAddGoal: () => void;
  goals: Database['public']['Tables']['goals']['Row'][];
  stepsByGoal: Record<string, Database['public']['Tables']['life_goal_steps']['Row'][]>;
  isLoading: boolean;
  onUpdateGoal: (
    goalId: string,
    payload: Database['public']['Tables']['goals']['Update'],
  ) => Promise<void>;
};

const CATEGORY_INFO: Record<
  LifeWheelCategoryKey,
  {
    title: string;
    description: string;
    examples: string[];
    icon: string;
  }
> = {
  spirituality_community: {
    title: 'Spirituality & Community',
    description: 'Connect with your spiritual practices and community involvement.',
    examples: [
      'Develop a daily meditation practice',
      'Join a community service group',
      'Explore spiritual teachings',
    ],
    icon: '🙏',
  },
  finance_wealth: {
    title: 'Finance & Wealth',
    description: 'Build financial security and grow your wealth.',
    examples: [
      'Save for retirement',
      'Create a budget plan',
      'Invest in financial education',
    ],
    icon: '💰',
  },
  love_relations: {
    title: 'Love & Relations',
    description: 'Nurture romantic relationships and intimate connections.',
    examples: [
      'Plan regular date nights',
      'Improve communication skills',
      'Build emotional intimacy',
    ],
    icon: '❤️',
  },
  fun_creativity: {
    title: 'Fun & Creativity',
    description: 'Express yourself creatively and enjoy recreational activities.',
    examples: [
      'Learn a musical instrument',
      'Start a creative hobby',
      'Plan adventure activities',
    ],
    icon: '🎨',
  },
  career_development: {
    title: 'Career & Self Development',
    description: 'Advance your career and invest in personal growth.',
    examples: [
      'Earn a professional certification',
      'Develop leadership skills',
      'Network with industry professionals',
    ],
    icon: '📈',
  },
  health_fitness: {
    title: 'Health & Fitness',
    description: 'Improve your physical health and fitness.',
    examples: [
      'Train for a 5K race',
      'Establish a workout routine',
      'Improve nutrition habits',
    ],
    icon: '💪',
  },
  family_friends: {
    title: 'Family & Friends',
    description: 'Strengthen bonds with family and friends.',
    examples: [
      'Schedule regular family time',
      'Reconnect with old friends',
      'Create family traditions',
    ],
    icon: '👨‍👩‍👧‍👦',
  },
  living_spaces: {
    title: 'Living Spaces',
    description: 'Create a comfortable and organized living environment.',
    examples: [
      'Declutter and organize home',
      'Improve home decor',
      'Create a peaceful workspace',
    ],
    icon: '🏠',
  },
};

export function CategoryInfoCard({
  categoryKey,
  onAddGoal,
  goals,
  stepsByGoal,
  isLoading,
  onUpdateGoal,
}: CategoryInfoCardProps) {
  const [editingGoal, setEditingGoal] = useState<Database['public']['Tables']['goals']['Row'] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!categoryKey) {
    return (
      <div className="category-info-card category-info-card--empty">
        <div className="category-info-card__icon">🎯</div>
        <h3>Select a Life Area</h3>
        <p>Click on a slice of the life wheel to explore that area and add goals.</p>
      </div>
    );
  }

  const info = CATEGORY_INFO[categoryKey];
  const categoryLabel =
    LIFE_WHEEL_CATEGORIES.find((category) => category.key === categoryKey)?.label ?? info.title;
  const allSteps = useMemo(() => Object.values(stepsByGoal).flat(), [stepsByGoal]);

  const handleOpenDialog = (goal: Database['public']['Tables']['goals']['Row']) => {
    setEditingGoal(goal);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingGoal(null);
  };

  return (
    <div className="category-info-card">
      <div className="category-info-card__header">
        <span className="category-info-card__icon">{info.icon}</span>
        <h3>{info.title}</h3>
      </div>

      <p className="category-info-card__description">{info.description}</p>

      <div className="category-info-card__section">
        <h4>Main goals</h4>
        {isLoading ? (
          <p className="category-info-card__empty">Loading goals...</p>
        ) : goals.length === 0 ? (
          <p className="category-info-card__empty">No main goals yet for {categoryLabel}.</p>
        ) : (
          <ul className="category-info-card__list">
            {goals.map((goal) => (
              <li key={goal.id}>
                <button
                  type="button"
                  className="category-info-card__goal"
                  onClick={() => handleOpenDialog(goal)}
                >
                  <span>{goal.title}</span>
                  <span className="category-info-card__goal-meta">View & edit</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="category-info-card__section">
        <h4>Sub goals</h4>
        {isLoading ? (
          <p className="category-info-card__empty">Loading sub goals...</p>
        ) : allSteps.length === 0 ? (
          <p className="category-info-card__empty">No sub goals yet for {categoryLabel}.</p>
        ) : (
          <ul className="category-info-card__list category-info-card__list--subgoals">
            {allSteps.map((step) => {
              const parentGoal = goals.find((goal) => goal.id === step.goal_id);
              return (
                <li key={step.id} className="category-info-card__subgoal">
                  <span>{step.title}</span>
                  {parentGoal && (
                    <span className="category-info-card__goal-meta">Main goal: {parentGoal.title}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button type="button" className="category-info-card__action" onClick={onAddGoal}>
        Add Goal to {info.title}
      </button>

      {editingGoal && (
        <GoalEditDialog
          goal={editingGoal}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onSave={onUpdateGoal}
        />
      )}
    </div>
  );
}
