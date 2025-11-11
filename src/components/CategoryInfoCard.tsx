import type { LifeWheelCategoryKey } from '../features/checkins/LifeWheelCheckins';

type CategoryInfoCardProps = {
  categoryKey: LifeWheelCategoryKey | null;
  onAddGoal: () => void;
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

export function CategoryInfoCard({ categoryKey, onAddGoal }: CategoryInfoCardProps) {
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

  return (
    <div className="category-info-card">
      <div className="category-info-card__header">
        <span className="category-info-card__icon">{info.icon}</span>
        <h3>{info.title}</h3>
      </div>

      <p className="category-info-card__description">{info.description}</p>

      <div className="category-info-card__examples">
        <h4>Goal Ideas:</h4>
        <ul>
          {info.examples.map((example, index) => (
            <li key={index}>{example}</li>
          ))}
        </ul>
      </div>

      <button type="button" className="category-info-card__action" onClick={onAddGoal}>
        Add Goal to {info.title}
      </button>
    </div>
  );
}
