import type { ActionCategory } from '../../../types/actions';
import { ACTION_CATEGORY_CONFIG } from '../../../types/actions';

export interface CategoryHeaderProps {
  category: ActionCategory;
  count: number;
}

export function CategoryHeader({ category, count }: CategoryHeaderProps) {
  const config = ACTION_CATEGORY_CONFIG[category];
  const showInfinity = category === 'must_do';
  
  return (
    <header className="actions-tab__category-header">
      <span 
        className="actions-tab__category-icon" 
        aria-hidden="true"
      >
        {config.icon}
      </span>
      <h3 
        id={`actions-category-${category}`} 
        className="actions-tab__category-title"
      >
        {config.label}
        <span className="actions-tab__category-count">
          ({count})
        </span>
      </h3>
      {showInfinity && (
        <span className="actions-tab__category-infinite" aria-label="No due date">
          ∞
        </span>
      )}
    </header>
  );
}
