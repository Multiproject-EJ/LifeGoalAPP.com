import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isDemoSession } from '../../services/demoSession';
import type { CreateActionInput } from '../../types/actions';
import { useActions } from './hooks/useActions';
import { useActionXP } from './hooks/useActionXP';
import { QuickAddAction } from './components/QuickAddAction';
import { ActionsList } from './components/ActionsList';
import { ActionEmptyState } from './components/ActionEmptyState';
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
  const { actions, loading, error, createAction, completeAction, deleteAction } = useActions(session);
  const { awardActionXP, awardClearAllMustDoBonus, shouldAwardClearBonus } = useActionXP(session);
  
  const [status, setStatus] = useState<StatusMessage>(null);

  // Handle add action with error handling
  const handleAddAction = useCallback(async (input: CreateActionInput) => {
    setStatus(null);
    try {
      await createAction(input);
      setStatus({ kind: 'success', message: 'Action added!' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to add action' });
    }
  }, [createAction]);

  // Handle complete action with XP rewards
  const handleCompleteAction = useCallback(async (actionId: string) => {
    const action = actions.find((a) => a.id === actionId);
    if (!action) return;

    try {
      const updatedAction = await completeAction(actionId, 0);
      if (!updatedAction) return;
      
      // Award XP for completing the action
      const xpReward = await awardActionXP(action);
      
      // Check if we should award clear all bonus
      if (shouldAwardClearBonus(action, actions)) {
        const bonusXP = await awardClearAllMustDoBonus();
        setStatus({ kind: 'success', message: `Completed! +${xpReward + bonusXP} XP (with bonus!)` });
      } else {
        setStatus({ kind: 'success', message: `Completed! +${xpReward} XP` });
      }
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to complete action' });
    }
  }, [actions, completeAction, awardActionXP, shouldAwardClearBonus, awardClearAllMustDoBonus]);

  // Handle delete action
  const handleDeleteAction = useCallback(async (actionId: string) => {
    try {
      await deleteAction(actionId);
      setStatus({ kind: 'success', message: 'Action deleted' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to delete action' });
    }
  }, [deleteAction]);

  // Clear status after delay
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

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
      </div>
    );
  }

  const hasActions = actions.filter((a) => !a.completed).length > 0;

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
      <QuickAddAction onAdd={handleAddAction} />

      {/* Actions list or empty state */}
      {hasActions ? (
        <ActionsList
          actions={actions}
          onComplete={handleCompleteAction}
          onDelete={handleDeleteAction}
        />
      ) : (
        <ActionEmptyState />
      )}
    </div>
  );
}
