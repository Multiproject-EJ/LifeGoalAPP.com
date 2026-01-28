import { useCallback, useEffect, useState, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isDemoSession } from '../../services/demoSession';
import type { CreateActionInput, ActionCategory, Action, UpdateActionInput } from '../../types/actions';
import { calculateTimeRemaining } from '../../types/actions';
import { useActions } from './hooks/useActions';
import { useActionXP } from './hooks/useActionXP';
import { useActionsKeyboard } from './hooks/useActionsKeyboard';
import { useActionsCleanupOnLoad } from './hooks/useActionsCleanupOnLoad';
import { useProjects } from '../projects/hooks/useProjects';
import { insertProjectTask } from '../../services/projects';
import { QuickAddAction } from './components/QuickAddAction';
import { ActionsList } from './components/ActionsList';
import { ActionEmptyState } from './components/ActionEmptyState';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { ActionDetailModal } from './components/ActionDetailModal';
import { ActionFilters, type FilterOption } from './components/ActionFilters';
import { DEMO_USER_ID } from '../../services/demoData';
import { CelebrationAnimation } from '../../components/CelebrationAnimation';
import './ActionsTab.css';

// Constants
const EXPIRING_SOON_THRESHOLD_HOURS = 24;

// Helper function to check if MUST DO items should always show
const shouldAlwaysShow = (action: Action): boolean => {
  return action.category === 'must_do';
};

type ActionsTabProps = {
  session: Session;
  onNavigateToProjects?: () => void;
  onNavigateToTimer?: () => void;
  showPointsBadges?: boolean;
};

type StatusMessage = {
  kind: 'success' | 'error';
  message: string;
} | null;

export function ActionsTab({
  session,
  onNavigateToProjects,
  onNavigateToTimer,
  showPointsBadges = false,
}: ActionsTabProps) {
  const isDemoExperience = isDemoSession(session);
  const {
    actions,
    loading,
    error,
    createAction,
    updateAction,
    completeAction,
    deleteAction,
    reorderActionsByCategory,
    refresh,
  } = useActions(session);
  const { projects } = useProjects(session);
  const { awardActionXP, awardClearAllMustDoBonus, shouldAwardClearBonus, levelUpEvent, dismissLevelUpEvent } = useActionXP(session);
  
  const [status, setStatus] = useState<StatusMessage>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory>('must_do');
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationXP, setCelebrationXP] = useState(0);
  const [celebrationType, setCelebrationType] = useState<'action' | 'journal' | 'breathing' | 'levelup'>('action');
  const [justCompletedActionId, setJustCompletedActionId] = useState<string | null>(null);
  const [lastDeletedAction, setLastDeletedAction] = useState<Action | null>(null);
  const [lastCompletedAction, setLastCompletedAction] = useState<Action | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Watch for level-up events
  useEffect(() => {
    if (levelUpEvent) {
      setCelebrationType('levelup');
      setCelebrationXP(levelUpEvent.xp);
      setShowCelebration(true);
    }
  }, [levelUpEvent]);
  
  const userId = session?.user?.id ?? DEMO_USER_ID;

  // Run cleanup on load (once per 24 hours) - safety net for Edge Functions
  useActionsCleanupOnLoad(session, {
    onCleanupComplete: (result) => {
      // Refresh actions list if anything was cleaned up
      if (result.deletedCount > 0 || result.migratedCount > 0 || result.archivedCount > 0) {
        refresh(); // Call the refresh function from useActions
        
        // Show a combined notification for both cleaned and migrated items
        const messages: string[] = [];
        if (result.deletedCount > 0) {
          messages.push(`🧹 Cleaned up ${result.deletedCount} expired action(s)`);
        }
        if (result.migratedCount > 0) {
          messages.push(`📦 Migrated ${result.migratedCount} action(s) to Projects`);
        }
        if (result.archivedCount > 0) {
          messages.push(`🔥 Archived ${result.archivedCount} completed action(s)`);
        }
        
        if (messages.length > 0) {
          setStatus({ kind: 'success', message: messages.join(' • ') });
        }
      }
    },
  });

  // Filter actions to non-completed
  const activeActions = actions.filter(a => !a.completed);

  // Apply filter
  const filteredActions = activeActions.filter((action) => {
    if (activeFilter === 'all') return true;
    
    // MUST DO items always show in all filters
    if (shouldAlwaysShow(action)) return true;
    
    const now = new Date();
    const expires = new Date(action.expires_at);
    const timeRemaining = calculateTimeRemaining(action.expires_at);
    
    switch (activeFilter) {
      case 'expiring_soon':
        return timeRemaining.hoursRemaining + timeRemaining.daysRemaining * 24 < EXPIRING_SOON_THRESHOLD_HOURS;
      case 'today': {
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        return expires <= todayEnd;
      }
      case 'this_week': {
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + 7);
        weekEnd.setHours(23, 59, 59, 999);
        return expires <= weekEnd;
      }
      default:
        return true;
    }
  });

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
      setLastCompletedAction(action);
      
      // 1. Immediately add instant feedback (pop/glow)
      setJustCompletedActionId(actionId);
      
      // Check if we should award clear all bonus
      if (shouldAwardClearBonus(action, actions)) {
        const bonusXP = await awardClearAllMustDoBonus();
        setStatus({ kind: 'success', message: `Completed! +${xpReward + bonusXP} XP (with bonus!)` });
        
        // 2. After pop animation completes, trigger celebration with bonus
        setTimeout(() => {
          setCelebrationType('action');
          setCelebrationXP(xpReward + bonusXP);
          setShowCelebration(true);
        }, 400);
      } else {
        setStatus({ kind: 'success', message: `Completed! +${xpReward} XP` });
        
        // 2. After pop animation completes, trigger celebration
        setTimeout(() => {
          setCelebrationType('action');
          setCelebrationXP(xpReward);
          setShowCelebration(true);
        }, 400);
      }
      
      // 3. Clean up instant feedback class
      setTimeout(() => {
        setJustCompletedActionId(null);
      }, 600);
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to complete action' });
    }
  }, [actions, completeAction, awardActionXP, shouldAwardClearBonus, awardClearAllMustDoBonus]);

  // Handle delete action
  const handleDeleteAction = useCallback(async (actionId: string) => {
    const deletedAction = actions.find((action) => action.id === actionId) ?? null;
    try {
      await deleteAction(actionId);
      setLastDeletedAction(deletedAction);
      setStatus({ kind: 'success', message: 'Action deleted' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to delete action' });
    }
  }, [actions, deleteAction]);

  const handleUndoDelete = useCallback(async () => {
    if (!lastDeletedAction) return;

    try {
      await createAction({
        title: lastDeletedAction.title,
        category: lastDeletedAction.category,
        notes: lastDeletedAction.notes ?? undefined,
        project_id: lastDeletedAction.project_id ?? undefined,
      });
      setLastDeletedAction(null);
      setStatus({ kind: 'success', message: 'Action restored' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to restore action' });
    }
  }, [createAction, lastDeletedAction]);

  const handleUndoComplete = useCallback(async () => {
    if (!lastCompletedAction) return;

    try {
      await updateAction(lastCompletedAction.id, { completed: false });
      setLastCompletedAction(null);
      setStatus({ kind: 'success', message: 'Action restored' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to restore action' });
    }
  }, [lastCompletedAction, updateAction]);

  // Handle update action
  const handleUpdateAction = useCallback(async (actionId: string, updates: UpdateActionInput) => {
    try {
      await updateAction(actionId, updates);
      setStatus({ kind: 'success', message: 'Action updated' });
      refresh();
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to update action' });
      throw err;
    }
  }, [updateAction, refresh]);

  const handleReorderCategory = useCallback(
    async (category: ActionCategory, orderedIds: string[]) => {
      try {
        await reorderActionsByCategory(category, orderedIds);
        setStatus({ kind: 'success', message: 'Priority updated' });
      } catch (err) {
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Failed to update priority',
        });
        refresh();
      }
    },
    [reorderActionsByCategory, refresh]
  );

  // Handle move to project
  const handleMoveToProject = useCallback(async (actionId: string, projectId: string) => {
    const action = actions.find((a) => a.id === actionId);
    if (!action) return;

    try {
      // Create project task
      const { data: newTask, error: taskError } = await insertProjectTask(userId, {
        project_id: projectId,
        title: action.title,
        description: action.notes || undefined,
        status: 'todo',
        order_index: 0,
      });

      if (taskError) {
        throw new Error(taskError.message);
      }

      // Delete the action
      await deleteAction(actionId);

      // Find project name for success message
      const project = projects.find((p) => p.id === projectId);
      const projectName = project ? project.title : 'project';

      setStatus({ kind: 'success', message: `Moved to ${projectName}` });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to move to project' });
      throw err;
    }
  }, [actions, projects, userId, deleteAction]);

  const {
    selectedIndex,
    setSelectedIndex,
    selectedIds,
    selectionMode,
    clearSelection,
    shortcuts,
  } = useActionsKeyboard({
    actions: filteredActions,
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
    enabled: !showShortcutsHelp && !selectedAction,
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
      const timeoutMs = lastDeletedAction ? 6000 : 3000;
      const timer = setTimeout(() => {
        setStatus(null);
        if (lastDeletedAction) {
          setLastDeletedAction(null);
        }
      }, timeoutMs);
      return () => clearTimeout(timer);
    }
  }, [status, lastDeletedAction]);

  useEffect(() => {
    if (!lastDeletedAction) return;
    const timer = setTimeout(() => setLastDeletedAction(null), 6000);
    return () => clearTimeout(timer);
  }, [lastDeletedAction]);

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
        <div className="actions-tab__header-actions">
          {onNavigateToProjects && (
            <button
              className="actions-tab__header-icon"
              onClick={onNavigateToProjects}
              type="button"
              aria-label="Go to Projects"
              title="Go to Projects"
            >
              📦
            </button>
          )}
          {onNavigateToTimer && (
            <button
              className="actions-tab__header-icon"
              onClick={onNavigateToTimer}
              type="button"
              aria-label="Open Timer"
              title="Open Timer"
            >
              ⏱️
            </button>
          )}
          {isDemoExperience && (
            <span className="actions-tab__demo-badge">Demo Mode</span>
          )}
        </div>
      </header>

      {/* Status message */}
      {status && (
        <div 
          className={`actions-tab__status actions-tab__status--${status.kind}`}
          role="status"
          aria-live="polite"
        >
          <span className="actions-tab__status-message">{status.message}</span>
        </div>
      )}

      {/* Quick add section */}
      <QuickAddAction onAdd={handleAddAction} projects={projects} />

      {/* Filters */}
      {hasActions && (
        <div className="actions-tab__filters-row">
          <ActionFilters
            actions={activeActions}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
          <button
            type="button"
            className="actions-tab__undo-complete"
            onClick={handleUndoComplete}
            disabled={!lastCompletedAction}
            aria-label="Undo last completed action"
            title={lastCompletedAction ? 'Undo last completed action' : 'Complete an action to enable undo'}
          >
            <span className="actions-tab__undo-icon" aria-hidden="true">←</span>
          </button>
        </div>
      )}

      {/* Actions list or empty state */}
      {hasActions ? (
        <ActionsList
          actions={filteredActions}
          onComplete={handleCompleteAction}
          onDelete={handleDeleteAction}
          onOpenDetail={(action) => setSelectedAction(action)}
          onReorderCategory={handleReorderCategory}
          selectedIndex={selectedIndex}
          selectedIds={selectedIds}
          justCompletedActionId={justCompletedActionId}
          showPointsBadges={showPointsBadges}
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

      {/* Action detail modal */}
      {selectedAction && (
        <ActionDetailModal
          action={selectedAction}
          projects={projects}
          onClose={() => setSelectedAction(null)}
          onSave={handleUpdateAction}
          onComplete={handleCompleteAction}
          onDelete={handleDeleteAction}
          onMoveToProject={handleMoveToProject}
        />
      )}

      {/* Celebration animation for action completion */}
      {showCelebration && (
        <CelebrationAnimation
          type={celebrationType}
          xpAmount={celebrationXP}
          targetElement="fab-button"
          onComplete={() => {
            setShowCelebration(false);
            if (celebrationType === 'levelup') {
              dismissLevelUpEvent?.();
            }
          }}
        />
      )}

      {lastDeletedAction && (
        <div className="actions-tab__undo-toast" role="status" aria-live="polite">
          <span className="actions-tab__undo-message">Action deleted</span>
          <button
            type="button"
            className="actions-tab__undo-button"
            onClick={handleUndoDelete}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
