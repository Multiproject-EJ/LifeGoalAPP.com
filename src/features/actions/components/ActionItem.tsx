import type { Action } from '../../../types/actions';
import { ACTION_CATEGORY_CONFIG, calculateTimeRemaining } from '../../../types/actions';
import { ActionTimer } from './ActionTimer';

export interface ActionItemProps {
  action: Action;
  onComplete: () => void;
  onDelete: () => void;
  onOpenDetail?: () => void;
  isSelected?: boolean;
}

export function ActionItem({ action, onComplete, onDelete, onOpenDetail, isSelected = false }: ActionItemProps) {
  const timeRemaining = calculateTimeRemaining(action.expires_at);
  const config = ACTION_CATEGORY_CONFIG[action.category];
  
  // MUST DO items don't expire
  const showTimer = action.category !== 'must_do';

  const handleContentClick = () => {
    if (onOpenDetail) {
      onOpenDetail();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleContentClick();
    }
  };

  return (
    <li 
      className={`action-item ${timeRemaining.isExpiringSoon && showTimer ? 'action-item--expiring-soon' : ''} ${isSelected ? 'action-item--selected' : ''}`}
      style={{ '--category-color': config.color } as React.CSSProperties}
    >
      <button
        type="button"
        className="action-item__checkbox"
        onClick={onComplete}
        aria-label={`Complete: ${action.title}`}
      >
        <span className="action-item__checkbox-icon" aria-hidden="true">
          {action.completed ? '✓' : '○'}
        </span>
      </button>
      
      <div 
        className="action-item__content"
        onClick={handleContentClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`View details: ${action.title}`}
      >
        <span className="action-item__title">{action.title}</span>
        {action.notes && (
          <span className="action-item__notes">{action.notes}</span>
        )}
      </div>
      
      <ActionTimer action={action} />
      
      <button
        type="button"
        className="action-item__delete"
        onClick={onDelete}
        aria-label={`Delete: ${action.title}`}
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}
