import { useCallback, useEffect, useState, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isDemoSession } from '../../services/demoSession';
import type { CreateActionInput, ActionCategory } from '../../types/actions';
import { useActions } from './hooks/useActions';
import { useActionXP } from './hooks/useActionXP';
import { useActionsKeyboard } from './hooks/useActionsKeyboard';
import { useActionsCleanupOnLoad } from './hooks/useActionsCleanupOnLoad';
import { QuickAddAction } from './components/QuickAddAction';
import { ActionsList } from './components/ActionsList';
import { ActionEmptyState } from './components/ActionEmptyState';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
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
  const { actions, loading, error, createAction, completeAction, deleteAction, refresh } = useActions(session);
  const { awardActionXP, awardClearAllMustDoBonus, shouldAwardClearBonus } = useActionXP(session);
  
  const [status, setStatus] = useState<StatusMessage>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory>('must_do');
  const inputRef = useRef<HTMLInputElement>(null);

  // Run cleanup on load (once per 24 hours) - safety net for Edge Functions
  useActionsCleanupOnLoad(session, {
    onCleanupComplete: (result) => {
      // Refresh actions list if anything was cleaned up
      if (result.deletedCount > 0 || result.migratedCount > 0) {
        refresh(); // Call the refresh function from useActions
        
        // Optionally show a toast notification
        if (result.deletedCount > 0) {
          setStatus({ kind: 'success', message: `🧹 Cleaned up ${result.deletedCount} expired action(s)` });
        }
        if (result.migratedCount > 0) {
          setStatus({ kind: 'success', message: `📦 Migrated ${result.migratedCount} action(s) to Projects` });
        }
      }
    },
  });

  // Filter actions to non-completed
  const activeActions = actions.filter(a => !a.completed);

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

  const {
    selectedIndex,
    setSelectedIndex,
    selectedIds,
    selectionMode,
    clearSelection,
    shortcuts,
  } = useActionsKeyboard({
    actions: activeActions,
    onNewAction: () => inputRef.current?.focus(),
    onCompleteAction: handleCompleteAction,
    onDeleteAction: handleDeleteAction,
    onCategoryChange: setSelectedCategory,
    onSave: () => {
      // No specific save action needed for now
    },
    onCancel: () => {
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.blur();
      }
    },
    enabled: !showShortcutsHelp,
  });

  // Add ? shortcut for help
  useEffect(() => {
    const handleHelp = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowShortcutsHelp(prev => !prev);
        }
      }
    };
    document.addEventListener('keydown', handleHelp);
    return () => document.removeEventListener('keydown', handleHelp);
  }, []);

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
          selectedIndex={selectedIndex}
          selectedIds={selectedIds}
        />
      ) : (
        <ActionEmptyState />
      )}

      {/* Help button for desktop */}
      <button 
        className="actions-tab__help-btn"
        onClick={() => setShowShortcutsHelp(true)}
        title="Keyboard shortcuts (?)"
        aria-label="Show keyboard shortcuts"
      >
        ⌨️
      </button>

      {/* Shortcuts help modal */}
      {showShortcutsHelp && (
        <KeyboardShortcutsHelp
          shortcuts={shortcuts}
          onClose={() => setShowShortcutsHelp(false)}
        />
      )}
    </div>
  );
}
