import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isDemoSession } from '../../services/demoSession';
import {
  fetchActions,
  insertAction,
  updateAction,
  completeAction,
  deleteAction,
} from '../../services/actions';
import type {
  Action,
  ActionCategory,
  CreateActionInput,
  ActionsByCategory,
} from '../../types/actions';
import {
  ACTION_CATEGORY_CONFIG,
  ACTIONS_XP_REWARDS,
  calculateTimeRemaining,
  getActionXpReward,
} from '../../types/actions';
import { useGamification } from '../../hooks/useGamification';
import './ActionsTab.css';

type ActionsTabProps = {
  session: Session;
};

type StatusMessage = {
  kind: 'success' | 'error';
  message: string;
} | null;

export function ActionsTab({ session }: ActionsTabProps) {
  const isDemoExperience = isDemoSession(session);
  const { earnXP, recordActivity } = useGamification(session);

  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage>(null);
  
  // Quick add state
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionCategory, setNewActionCategory] = useState<ActionCategory>('must_do');
  const [addingAction, setAddingAction] = useState(false);

  // Load actions
  const loadActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await fetchActions();
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      setActions(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load actions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  // Group actions by category
  const actionsByCategory = useMemo<ActionsByCategory>(() => {
    const grouped: ActionsByCategory = {
      must_do: [],
      nice_to_do: [],
      project: [],
    };
    
    for (const action of actions) {
      if (!action.completed) {
        grouped[action.category].push(action);
      }
    }
    
    // Sort each category by order_index
    for (const key of Object.keys(grouped) as ActionCategory[]) {
      grouped[key].sort((a, b) => a.order_index - b.order_index);
    }
    
    return grouped;
  }, [actions]);

  // Handle quick add action
  const handleAddAction = useCallback(async () => {
    const title = newActionTitle.trim();
    if (!title) return;
    
    setAddingAction(true);
    setStatus(null);
    
    try {
      const input: CreateActionInput = {
        title,
        category: newActionCategory,
      };
      
      const { data, error: insertError } = await insertAction(session.user.id, input);
      
      if (insertError) {
        setStatus({ kind: 'error', message: insertError.message });
        return;
      }
      
      if (data) {
        setActions((prev) => [...prev, data]);
        setNewActionTitle('');
        setStatus({ kind: 'success', message: 'Action added!' });
      }
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to add action' });
    } finally {
      setAddingAction(false);
    }
  }, [newActionTitle, newActionCategory, session.user.id]);

  // Handle complete action
  const handleCompleteAction = useCallback(async (action: Action) => {
    try {
      const xpReward = getActionXpReward(action.category);
      const { data, error: updateError } = await completeAction(action.id, xpReward);
      
      if (updateError) {
        setStatus({ kind: 'error', message: updateError.message });
        return;
      }
      
      if (data) {
        // Use a promise to get the result from the state update
        const shouldAwardClearBonus = await new Promise<boolean>((resolve) => {
          setActions((prev) => {
            const updated = prev.map((a) => (a.id === action.id ? data : a));
            
            // Check if all must_do items are now complete after this update
            if (action.category === 'must_do') {
              const remainingMustDo = updated.filter(
                (a) => a.category === 'must_do' && !a.completed
              );
              resolve(remainingMustDo.length === 0);
            } else {
              resolve(false);
            }
            
            return updated;
          });
        });
        
        // Award XP
        if (xpReward > 0) {
          await earnXP(xpReward, 'action_complete', action.id, `Completed: ${action.title}`);
          await recordActivity();
        }
        
        // Award bonus XP if all must_do items are cleared
        if (shouldAwardClearBonus) {
          await earnXP(
            ACTIONS_XP_REWARDS.CLEAR_ALL_MUST_DO,
            'action_clear_must_do',
            undefined,
            'Cleared all MUST DO items!'
          );
        }
        
        setStatus({ kind: 'success', message: `Completed! +${xpReward} XP` });
      }
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to complete action' });
    }
  }, [earnXP, recordActivity]);

  // Handle delete action
  const handleDeleteAction = useCallback(async (actionId: string) => {
    try {
      const { error: deleteError } = await deleteAction(actionId);
      
      if (deleteError) {
        setStatus({ kind: 'error', message: deleteError.message });
        return;
      }
      
      setActions((prev) => prev.filter((a) => a.id !== actionId));
      setStatus({ kind: 'success', message: 'Action deleted' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to delete action' });
    }
  }, []);

  // Clear status after delay
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Render category section
  const renderCategorySection = (category: ActionCategory) => {
    const config = ACTION_CATEGORY_CONFIG[category];
    const categoryActions = actionsByCategory[category];
    
    return (
      <section 
        className="actions-tab__category" 
        key={category}
        aria-labelledby={`actions-category-${category}`}
      >
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
              ({categoryActions.length})
            </span>
          </h3>
        </header>
        
        {categoryActions.length === 0 ? (
          <p className="actions-tab__empty-category">
            No {config.label.toLowerCase()} items
          </p>
        ) : (
          <ul className="actions-tab__list" role="list">
            {categoryActions.map((action) => (
              <ActionItem
                key={action.id}
                action={action}
                onComplete={() => handleCompleteAction(action)}
                onDelete={() => handleDeleteAction(action.id)}
              />
            ))}
          </ul>
        )}
      </section>
    );
  };

  if (loading) {
    return (
      <div className="actions-tab actions-tab--loading">
        <p>Loading actions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="actions-tab actions-tab--error">
        <p>Error: {error}</p>
        <button type="button" onClick={loadActions}>
          Try again
        </button>
      </div>
    );
  }

  const totalActive = actionsByCategory.must_do.length + 
    actionsByCategory.nice_to_do.length + 
    actionsByCategory.project.length;

  return (
    <div className="actions-tab">
      <header className="actions-tab__header">
        <div className="actions-tab__header-content">
          <h2 className="actions-tab__title">Actions</h2>
          <p className="actions-tab__subtitle">
            Your 3-day rolling todo list
          </p>
        </div>
        {isDemoExperience && (
          <span className="actions-tab__demo-badge">Demo Mode</span>
        )}
      </header>

      {/* Status message */}
      {status && (
        <div 
          className={`actions-tab__status actions-tab__status--${status.kind}`}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>
      )}

      {/* Quick add section */}
      <section className="actions-tab__quick-add" aria-label="Add new action">
        <div className="actions-tab__quick-add-input-row">
          <input
            type="text"
            className="actions-tab__quick-add-input"
            placeholder="What needs to be done?"
            value={newActionTitle}
            onChange={(e) => setNewActionTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !addingAction) {
                handleAddAction();
              }
            }}
            disabled={addingAction}
            aria-label="New action title"
          />
          <button
            type="button"
            className="actions-tab__quick-add-button"
            onClick={handleAddAction}
            disabled={addingAction || !newActionTitle.trim()}
            aria-label="Add action"
          >
            {addingAction ? '...' : '+'}
          </button>
        </div>
        <div className="actions-tab__category-selector" role="radiogroup" aria-label="Action category">
          {(Object.keys(ACTION_CATEGORY_CONFIG) as ActionCategory[]).map((cat) => {
            const config = ACTION_CATEGORY_CONFIG[cat];
            return (
              <button
                key={cat}
                type="button"
                role="radio"
                aria-checked={newActionCategory === cat}
                className={`actions-tab__category-option ${
                  newActionCategory === cat ? 'actions-tab__category-option--selected' : ''
                }`}
                style={{ 
                  '--category-color': config.color 
                } as React.CSSProperties}
                onClick={() => setNewActionCategory(cat)}
              >
                <span aria-hidden="true">{config.icon}</span>
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Actions list by category */}
      <div className="actions-tab__content">
        {totalActive === 0 ? (
          <div className="actions-tab__empty-state">
            <span className="actions-tab__empty-icon" aria-hidden="true">✨</span>
            <p className="actions-tab__empty-text">
              No actions yet. Add your first task above!
            </p>
            <p className="actions-tab__empty-hint">
              MUST DO items stay until complete. NICE TO DO auto-deletes after 3 days.
              PROJECT items migrate to Projects after 3 days.
            </p>
          </div>
        ) : (
          <>
            {renderCategorySection('must_do')}
            {renderCategorySection('nice_to_do')}
            {renderCategorySection('project')}
          </>
        )}
      </div>
    </div>
  );
}

// ActionItem component
type ActionItemProps = {
  action: Action;
  onComplete: () => void;
  onDelete: () => void;
};

function ActionItem({ action, onComplete, onDelete }: ActionItemProps) {
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
