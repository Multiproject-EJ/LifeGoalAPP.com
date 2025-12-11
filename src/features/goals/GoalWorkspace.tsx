import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { deleteGoal, fetchGoals, insertGoal, updateGoal } from '../../services/goals';
import type { Database } from '../../lib/database.types';
import {
  DEFAULT_GOAL_STATUS,
  GOAL_STATUS_META,
  GOAL_STATUS_OPTIONS,
  GOAL_STATUS_ORDER,
  type GoalStatusTag,
  normalizeGoalStatus,
} from './goalStatus';
import { isDemoSession } from '../../services/demoSession';
import { LifeGoalInputDialog } from '../../components/LifeGoalInputDialog';
import { insertStep, insertSubstep, insertAlert } from '../../services/lifeGoals';
import type { LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';

type GoalRow = Database['public']['Tables']['goals']['Row'];

type GoalWorkspaceProps = {
  session: Session;
};

type GoalDraft = {
  title: string;
  description: string;
  targetDate: string;
  progressNotes: string;
  statusTag: GoalStatusTag;
};

// Type definition matching LifeGoalInputDialog's form data structure
type LifeGoalFormData = {
  title: string;
  description: string;
  lifeWheelCategory: LifeWheelCategoryKey;
  startDate: string;
  targetDate: string;
  estimatedDurationDays: string;
  timingNotes: string;
  statusTag: GoalStatusTag;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    dueDate: string;
    substeps: Array<{
      id: string;
      title: string;
    }>;
  }>;
  alerts: Array<{
    id: string;
    alertType: 'milestone' | 'deadline' | 'reminder' | 'custom';
    alertTime: string;
    title: string;
    message: string;
    repeatPattern: 'once' | 'daily' | 'weekly' | 'monthly';
    enabled: boolean;
  }>;
};

const STATUS_OPTIONS = GOAL_STATUS_OPTIONS;

const defaultStatusTag: GoalStatusTag = DEFAULT_GOAL_STATUS;

type GoalStatusFilter = 'all' | GoalStatusTag;

const initialDraft: GoalDraft = {
  title: '',
  description: '',
  targetDate: '',
  progressNotes: '',
  statusTag: defaultStatusTag,
};

export function GoalWorkspace({ session }: GoalWorkspaceProps) {
  const { isConfigured } = useSupabaseAuth();
  const isDemoExperience = isDemoSession(session);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<GoalDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<GoalDraft>(initialDraft);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const refreshGoals = useCallback(async () => {
    if (!isConfigured) {
      setGoals([]);
      setHasLoadedOnce(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const { data, error } = await fetchGoals();
      if (error) throw error;
      setGoals(data ?? []);
      setEditingGoalId(null);
      setPendingDeleteId(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load goals. Try again in a moment.',
      );
    } finally {
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }
    refreshGoals();
  }, [session?.user?.id, isConfigured, refreshGoals]);

  useEffect(() => {
    if (!isConfigured) {
      setGoals([]);
      setHasLoadedOnce(false);
      setEditingGoalId(null);
      setPendingDeleteId(null);
    }
  }, [isConfigured]);

  const goalStatusCounts = useMemo(() => {
    const base = GOAL_STATUS_ORDER.reduce<Record<GoalStatusTag, number>>((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<GoalStatusTag, number>);

    return goals.reduce<Record<GoalStatusTag, number>>((acc, goal) => {
      const status = normalizeGoalStatus(goal.status_tag);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, base);
  }, [goals]);

  const filteredGoals = useMemo(() => {
    if (statusFilter === 'all') {
      return goals;
    }
    return goals.filter((goal) => normalizeGoalStatus(goal.status_tag) === statusFilter);
  }, [goals, statusFilter]);

  const completedGoals = useMemo(
    () =>
      filteredGoals.filter((goal) => Boolean(goal.target_date && new Date(goal.target_date).getTime() < Date.now())),
    [filteredGoals],
  );

  const totalGoals = goals.length;
  const filterOptions = useMemo(
    () =>
      [
        {
          value: 'all' as GoalStatusFilter,
          label: 'All statuses',
          count: totalGoals,
          description: 'View every goal in this workspace.',
        },
        ...GOAL_STATUS_ORDER.map((value) => ({
          value,
          label: GOAL_STATUS_META[value].label,
          count: goalStatusCounts[value] ?? 0,
          description: GOAL_STATUS_META[value].description,
        })),
      ],
    [goalStatusCounts, totalGoals],
  );

  const listMeta = useMemo(() => {
    if (!isConfigured && !isDemoExperience) {
      return 'Connect Supabase to sync your goals.';
    }

    if (totalGoals === 0) {
      return hasLoadedOnce ? 'No goals yet—start by capturing your first big win.' : 'Loading goals…';
    }

    if (statusFilter === 'all') {
      return `${totalGoals} goal${totalGoals === 1 ? '' : 's'} in flight`;
    }

    const label = GOAL_STATUS_META[statusFilter].label.toLowerCase();
    return `Showing ${filteredGoals.length} of ${totalGoals} goal${totalGoals === 1 ? '' : 's'} marked ${label}.`;
  }, [
    filteredGoals.length,
    hasLoadedOnce,
    isConfigured,
    isDemoExperience,
    statusFilter,
    totalGoals,
  ]);

  const handleDraftChange = (field: keyof GoalDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setDraft((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleEditDraftChange = (field: keyof GoalDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setEditDraft((current) => ({ ...current, [field]: value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setStatusMessage(null);

    if (!isConfigured) {
      setErrorMessage('Supabase credentials are not configured. Add them to continue.');
      return;
    }

    const title = draft.title.trim();
    if (!title) {
      setErrorMessage('Name your goal before saving.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const payload = {
        title,
        description: draft.description.trim() || null,
        target_date: draft.targetDate ? draft.targetDate : null,
        user_id: session.user.id,
        progress_notes: draft.progressNotes.trim() || null,
        status_tag: draft.statusTag,
      } satisfies Database['public']['Tables']['goals']['Insert'];

      const { data, error } = await insertGoal(payload);
      if (error) throw error;
      if (data) {
        setGoals((current) => [data, ...current]);
      }
      setDraft(initialDraft);
      setStatusMessage(isDemoExperience ? 'Goal saved to demo data.' : 'Goal saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save your goal.');
    } finally {
      setSaving(false);
    }
  };

  const beginEditingGoal = (goal: GoalRow) => {
    setEditingGoalId(goal.id);
    setPendingDeleteId(null);
    setErrorMessage(null);
    setStatusMessage(null);
    setEditDraft({
      title: goal.title ?? '',
      description: goal.description ?? '',
      targetDate: goal.target_date ? goal.target_date.slice(0, 10) : '',
      progressNotes: goal.progress_notes ?? '',
      statusTag: normalizeGoalStatus(goal.status_tag),
    });
  };

  const cancelEditingGoal = () => {
    setEditingGoalId(null);
    setEditDraft(initialDraft);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setStatusMessage(null);

    if (!editingGoalId) {
      setErrorMessage('Select a goal to update before saving changes.');
      return;
    }

    if (!isConfigured) {
      setErrorMessage('Supabase credentials are not configured. Add them to continue.');
      return;
    }

    const title = editDraft.title.trim();
    if (!title) {
      setErrorMessage('Name your goal before saving changes.');
      return;
    }

    setUpdatingGoalId(editingGoalId);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const payload: Database['public']['Tables']['goals']['Update'] = {
        title,
        description: editDraft.description.trim() || null,
        target_date: editDraft.targetDate || null,
        progress_notes: editDraft.progressNotes.trim() || null,
        status_tag: editDraft.statusTag,
      };

      const { data, error } = await updateGoal(editingGoalId, payload);
      if (error) throw error;

      setGoals((current) =>
        current.map((goal) => {
          if (goal.id !== editingGoalId) return goal;
          if (data) return data;
          return {
            ...goal,
            ...payload,
          } satisfies GoalRow;
        }),
      );

      setStatusMessage(isDemoExperience ? 'Goal updated in demo data.' : 'Goal updated.');
      setEditingGoalId(null);
      setEditDraft(initialDraft);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the goal.');
    } finally {
      setUpdatingGoalId(null);
    }
  };

  const requestDeleteGoal = (goalId: string) => {
    setPendingDeleteId(goalId);
    setEditingGoalId((current) => {
      if (current === goalId) {
        setEditDraft(initialDraft);
        return null;
      }
      return current;
    });
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const cancelDeleteGoal = () => {
    setPendingDeleteId(null);
  };

  const confirmDeleteGoal = async (goalId: string) => {
    if (!isConfigured) {
      setErrorMessage('Supabase credentials are not configured. Add them to continue.');
      return;
    }

    setDeletingGoalId(goalId);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { error } = await deleteGoal(goalId);
      if (error) throw error;

      setGoals((current) => current.filter((goal) => goal.id !== goalId));
      setStatusMessage(isDemoExperience ? 'Goal removed from demo data.' : 'Goal removed.');
      if (editingGoalId === goalId) {
        setEditingGoalId(null);
        setEditDraft(initialDraft);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete the goal right now.');
    } finally {
      setDeletingGoalId(null);
      setPendingDeleteId(null);
    }
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleSaveLifeGoal = useCallback(
    async (formData: LifeGoalFormData) => {
      setErrorMessage(null);
      setStatusMessage(null);

      if (!isConfigured && !isDemoExperience) {
        setErrorMessage('Supabase credentials are not configured. Add them to continue.');
        throw new Error('Supabase not configured');
      }

      try {
        // Create the goal with life wheel category and additional fields
        const goalPayload = {
          user_id: session.user.id,
          title: formData.title,
          description: formData.description || null,
          life_wheel_category: formData.lifeWheelCategory,
          start_date: formData.startDate || null,
          target_date: formData.targetDate || null,
          estimated_duration_days: formData.estimatedDurationDays
            ? parseInt(formData.estimatedDurationDays, 10)
            : null,
          timing_notes: formData.timingNotes || null,
          status_tag: formData.statusTag,
        };

        const { data: goal, error: goalError } = await insertGoal(goalPayload);
        if (goalError) throw goalError;
        if (!goal) throw new Error('Failed to create goal');

        // Create steps
        for (let i = 0; i < formData.steps.length; i++) {
          const step = formData.steps[i];
          const stepPayload = {
            goal_id: goal.id,
            step_order: i,
            title: step.title,
            description: step.description || null,
            due_date: step.dueDate || null,
          };

          const { data: createdStep, error: stepError } = await insertStep(stepPayload);
          if (stepError) throw stepError;
          if (!createdStep) continue;

          // Create substeps for this step
          for (let j = 0; j < step.substeps.length; j++) {
            const substep = step.substeps[j];
            const substepPayload = {
              step_id: createdStep.id,
              substep_order: j,
              title: substep.title,
            };

            const { error: substepError } = await insertSubstep(substepPayload);
            if (substepError) throw substepError;
          }
        }

        // Create alerts
        for (const alert of formData.alerts) {
          const alertPayload = {
            goal_id: goal.id,
            user_id: session.user.id,
            alert_type: alert.alertType,
            alert_time: alert.alertTime,
            title: alert.title,
            message: alert.message || null,
            repeat_pattern: alert.repeatPattern,
            enabled: alert.enabled,
          };

          const { error: alertError } = await insertAlert(alertPayload);
          if (alertError) throw alertError;
        }

        // Add the new goal to the list
        setGoals((current) => [goal, ...current]);
        setStatusMessage(
          isDemoExperience ? 'Life goal saved to demo data.' : 'Life goal created successfully!'
        );
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to save life goal');
        throw error;
      }
    },
    [session.user.id, isConfigured, isDemoExperience]
  );

  return (
    <section className="goal-workspace">
      <header className="goal-workspace__header">
        <div>
          <h2>Goals &amp; Habits workspace</h2>
        </div>
        <button
          type="button"
          className="goal-workspace__refresh"
          onClick={refreshGoals}
          disabled={loading || !isConfigured}
        >
          {loading ? 'Refreshing…' : 'Refresh goals'}
        </button>
      </header>

      {isDemoExperience ? (
        <p className="goal-workspace__status goal-workspace__status--info">
          You&apos;re working with demo Supabase data stored locally. Capture goals freely and connect Supabase later to sync
          them to the cloud.
        </p>
      ) : !isConfigured ? (
        <p className="goal-workspace__status goal-workspace__status--warning">
          Add your Supabase credentials to <code>.env.local</code> to load and persist goals. Until then, you can plan
          offline, but nothing will sync yet.
        </p>
      ) : null}

      {statusMessage ? (
        <p className="goal-workspace__status goal-workspace__status--success">{statusMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className="goal-workspace__status goal-workspace__status--error">{errorMessage}</p>
      ) : null}

      <div className="goal-workspace__grid">
        <div className="goal-form">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Capture a new goal</h3>
            <button
              type="button"
              className="goal-workspace__add-life-goal"
              onClick={handleOpenDialog}
              disabled={!isConfigured && !isDemoExperience}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--color-primary, #4F46E5)',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem',
                transition: 'background-color 0.2s',
              }}
            >
              ✨ Add Life Goal
            </button>
          </div>
          <p style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary, #6B7280)' }}>
            Use the quick form below or click "✨ Add Life Goal" to create a detailed goal with AI assistance, steps, timing, and alerts.
          </p>
          <form onSubmit={handleSubmit}>
          <label className="goal-form__field">
            <span>Goal title</span>
            <input
              type="text"
              value={draft.title}
              onChange={handleDraftChange('title')}
              placeholder="Launch the habit tracker beta"
              required
            />
          </label>

          <label className="goal-form__field">
            <span>Why it matters</span>
            <textarea
              value={draft.description}
              onChange={handleDraftChange('description')}
              placeholder="Describe the outcome, success criteria, and the motivation behind this goal."
              rows={4}
            />
          </label>

          <label className="goal-form__field">
            <span>Target date</span>
            <input type="date" value={draft.targetDate} onChange={handleDraftChange('targetDate')} />
          </label>

          <label className="goal-form__field">
            <span>Status for weekly review</span>
            <select value={draft.statusTag} onChange={handleDraftChange('statusTag')}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className="goal-form__hint">
              {getStatusDescription(draft.statusTag)}
            </small>
          </label>

          <label className="goal-form__field">
            <span>Weekly progress notes</span>
            <textarea
              value={draft.progressNotes}
              onChange={handleDraftChange('progressNotes')}
              placeholder="Capture highlights, blockers, or next actions for your next review."
              rows={4}
            />
          </label>

          <button type="submit" className="goal-form__submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save goal'}
          </button>
          </form>
        </div>

        <div className="goal-list">
          <div className="goal-list__header">
            <h3>Active goals</h3>
            <span className="goal-list__meta">{listMeta}</span>
          </div>

          {totalGoals > 0 ? (
            <div className="goal-list__filters" role="group" aria-label="Filter goals by status">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`goal-list__filter ${statusFilter === option.value ? 'goal-list__filter--active' : ''}`}
                  onClick={() => setStatusFilter(option.value)}
                  aria-pressed={statusFilter === option.value}
                >
                  <span className="goal-list__filter-label">{option.label}</span>
                  <span className="goal-list__filter-count">{option.count}</span>
                </button>
              ))}
            </div>
          ) : null}

          <ul className="goal-list__items">
            {filteredGoals.map((goal) => {
              const isEditing = editingGoalId === goal.id;
              const isPendingDelete = pendingDeleteId === goal.id;
              const isUpdating = updatingGoalId === goal.id;
              const isDeleting = deletingGoalId === goal.id;
              return (
                <li key={goal.id} className="goal-card">
                  {isEditing ? (
                    <form className="goal-card__editor" onSubmit={handleEditSubmit}>
                      <h4>Edit goal</h4>
                      <label className="goal-card__field">
                        <span>Goal title</span>
                        <input
                          type="text"
                          value={editDraft.title}
                          onChange={handleEditDraftChange('title')}
                          required
                        />
                      </label>
                      <label className="goal-card__field">
                        <span>Why it matters</span>
                        <textarea
                          value={editDraft.description}
                          onChange={handleEditDraftChange('description')}
                          rows={3}
                        />
                      </label>
                      <label className="goal-card__field">
                        <span>Target date</span>
                        <input
                          type="date"
                          value={editDraft.targetDate}
                          onChange={handleEditDraftChange('targetDate')}
                        />
                      </label>
                      <label className="goal-card__field">
                        <span>Status for weekly review</span>
                        <select value={editDraft.statusTag} onChange={handleEditDraftChange('statusTag')}>
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <small className="goal-card__hint">
                          {getStatusDescription(editDraft.statusTag)}
                        </small>
                      </label>
                      <label className="goal-card__field">
                        <span>Weekly progress notes</span>
                        <textarea
                          value={editDraft.progressNotes}
                          onChange={handleEditDraftChange('progressNotes')}
                          rows={3}
                          placeholder="Summarize learnings, blockers, or wins."
                        />
                      </label>
                      <div className="goal-card__editor-actions">
                        <button
                          type="submit"
                          className="goal-card__button goal-card__button--primary"
                          disabled={isUpdating}
                        >
                          {isUpdating ? 'Saving…' : 'Save changes'}
                        </button>
                        <button
                          type="button"
                          className="goal-card__button goal-card__button--ghost"
                          onClick={cancelEditingGoal}
                          disabled={isUpdating}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="goal-card__header">
                        <div className="goal-card__title">
                          <h4>{goal.title}</h4>
                          <span className="goal-card__date">
                            {goal.target_date ? `Target: ${formatDate(goal.target_date)}` : 'No target date set'}
                          </span>
                        </div>
                        <span className={`goal-status goal-status--${normalizeGoalStatus(goal.status_tag)}`}>
                          {getStatusLabel(goal.status_tag)}
                        </span>
                      </div>
                      {goal.description ? <p>{goal.description}</p> : null}
                      {goal.progress_notes ? (
                        <div className="goal-card__notes">
                          <h5>Weekly notes</h5>
                          <p>{goal.progress_notes}</p>
                        </div>
                      ) : (
                        <div className="goal-card__notes goal-card__notes--empty">
                          <p>Use weekly notes to track wins and surface blockers for your next review.</p>
                        </div>
                      )}
                      <footer className="goal-card__footer">
                        <span>Created {formatRelativeDate(goal.created_at)}</span>
                        <div className="goal-card__actions">
                          {isPendingDelete ? (
                            <>
                              <button
                                type="button"
                                className="goal-card__button goal-card__button--danger"
                                onClick={() => void confirmDeleteGoal(goal.id)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? 'Removing…' : 'Confirm delete'}
                              </button>
                              <button
                                type="button"
                                className="goal-card__button goal-card__button--ghost"
                                onClick={cancelDeleteGoal}
                                disabled={isDeleting}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="goal-card__button goal-card__button--primary"
                                onClick={() => beginEditingGoal(goal)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="goal-card__button goal-card__button--danger"
                                onClick={() => requestDeleteGoal(goal.id)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </footer>
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          {filteredGoals.length === 0 && totalGoals > 0 ? (
            <p className="goal-list__empty">
              {statusFilter === 'all'
                ? 'No goals match the current filters.'
                : GOAL_STATUS_META[statusFilter].empty}
            </p>
          ) : null}

          {filteredGoals.length > 0 && completedGoals.length > 0 ? (
            <p className="goal-list__status">
              {completedGoals.length === filteredGoals.length
                ? 'Every goal here has passed its target date—time to celebrate and set the next milestone!'
                : `${completedGoals.length} goal${completedGoals.length === 1 ? ' has' : 's have'} crossed the target date.`}
            </p>
          ) : null}
        </div>
      </div>

      <LifeGoalInputDialog
        session={session}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveLifeGoal}
        initialCategory={null}
      />
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusLabel(value: string | null | undefined): string {
  const normalized = normalizeGoalStatus(value);
  const match = STATUS_OPTIONS.find((option) => option.value === normalized);
  return match?.label ?? 'On track';
}

function getStatusDescription(value: GoalStatusTag): string {
  const match = STATUS_OPTIONS.find((option) => option.value === value);
  return match?.description ?? '';
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const now = Date.now();
  const diff = date.getTime() - now;
  const oneDay = 1000 * 60 * 60 * 24;
  const deltaDays = Math.round(diff / oneDay);

  if (Math.abs(deltaDays) < 1) {
    const deltaHours = Math.round(diff / (1000 * 60 * 60));
    if (deltaHours === 0) {
      return 'just now';
    }
    return formatter.format(deltaHours, 'hour');
  }

  if (Math.abs(deltaDays) < 30) {
    return formatter.format(deltaDays, 'day');
  }

  const deltaMonths = Math.round(deltaDays / 30);
  if (Math.abs(deltaMonths) < 12) {
    return formatter.format(deltaMonths, 'month');
  }

  const deltaYears = Math.round(deltaMonths / 12);
  return formatter.format(deltaYears, 'year');
}
