import type { Action } from '../../../types/actions';
import { ACTION_CATEGORY_CONFIG, calculateTimeRemaining } from '../../../types/actions';

export interface ActionItemProps {
  action: Action;
  onComplete: () => void;
  onDelete: () => void;
}

export function ActionItem({ action, onComplete, onDelete }: ActionItemProps) {
  const timeRemaining = calculateTimeRemaining(action.expires_at);
  const config = ACTION_CATEGORY_CONFIG[action.category];
  
  // MUST DO items don't expire
  const showTimer = action.category !== 'must_do';
  
  const formatTimeRemaining = () => {
    if (action.category === 'must_do') {
      return '∞';
    }
    if (timeRemaining.isExpired) {
      return 'Expired';
    }
    if (timeRemaining.daysRemaining > 0) {
      return `${timeRemaining.daysRemaining}d`;
    }
    return `${timeRemaining.hoursRemaining}h`;
  };

  return (
    <li 
      className={`action-item ${timeRemaining.isExpiringSoon && showTimer ? 'action-item--expiring-soon' : ''}`}
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
      
      <div className="action-item__content">
        <span className="action-item__title">{action.title}</span>
        {action.notes && (
          <span className="action-item__notes">{action.notes}</span>
        )}
      </div>
      
      {showTimer && (
        <span 
          className={`action-item__timer ${
            timeRemaining.isExpiringSoon ? 'action-item__timer--urgent' : ''
          } ${timeRemaining.isExpired ? 'action-item__timer--expired' : ''}`}
          aria-label={`Time remaining: ${formatTimeRemaining()}`}
        >
          {formatTimeRemaining()}
          <span className="action-item__timer-icon" aria-hidden="true">⏱</span>
        </span>
      )}
      
      {action.category === 'must_do' && (
        <span className="action-item__timer action-item__timer--infinite" aria-label="Never expires">
          ∞
        </span>
      )}
      
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
