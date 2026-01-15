import type { Action, ActionCategory } from '../../../types/actions';
import { ACTION_CATEGORY_CONFIG } from '../../../types/actions';
import { ActionItem } from './ActionItem';
import { CategoryHeader } from './CategoryHeader';

export interface ActionsListProps {
  actions: Action[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Action>) => void;
  selectedIndex?: number;
  selectedIds?: Set<string>;
}

export function ActionsList({ 
  actions, 
  onComplete, 
  onDelete, 
  selectedIndex = -1,
  selectedIds = new Set()
}: ActionsListProps) {
  // Group actions by category
  const actionsByCategory: Record<ActionCategory, Action[]> = {
    must_do: [],
    nice_to_do: [],
    project: [],
  };

  // Filter out completed actions and group by category
  for (const action of actions) {
    if (!action.completed) {
      actionsByCategory[action.category].push(action);
    }
  }

  // Sort each category by order_index then created_at
  for (const key of Object.keys(actionsByCategory) as ActionCategory[]) {
    actionsByCategory[key].sort((a, b) => {
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  // Render category section
  const renderCategorySection = (category: ActionCategory) => {
    const config = ACTION_CATEGORY_CONFIG[category];
    const categoryActions = actionsByCategory[category];

    if (categoryActions.length === 0) {
      return null;
    }

    return (
      <section 
        className="actions-tab__category" 
        key={category}
        aria-labelledby={`actions-category-${category}`}
      >
        <CategoryHeader category={category} count={categoryActions.length} />
        
        <ul className="actions-tab__list" role="list">
          {categoryActions.map((action, index) => {
            // Calculate the global index for this action
            const globalIndex = actions.filter(a => !a.completed).findIndex(a => a.id === action.id);
            const isSelected = globalIndex === selectedIndex || selectedIds.has(action.id);
            
            return (
              <ActionItem
                key={action.id}
                action={action}
                onComplete={() => onComplete(action.id)}
                onDelete={() => onDelete(action.id)}
                isSelected={isSelected}
              />
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <div className="actions-tab__content">
      {renderCategorySection('must_do')}
      {renderCategorySection('nice_to_do')}
      {renderCategorySection('project')}
    </div>
  );
}
