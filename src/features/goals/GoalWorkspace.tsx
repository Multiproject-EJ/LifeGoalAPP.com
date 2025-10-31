import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { deleteGoal, fetchGoals, insertGoal, updateGoal } from '../../services/goals';
import type { Database } from '../../lib/database.types';
import {
  DEFAULT_GOAL_STATUS,
  GOAL_STATUS_OPTIONS,
  type GoalStatusTag,
  normalizeGoalStatus,
} from './goalStatus';

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

const STATUS_OPTIONS = GOAL_STATUS_OPTIONS;

const defaultStatusTag: GoalStatusTag = DEFAULT_GOAL_STATUS;

const initialDraft: GoalDraft = {
  title: '',
  description: '',
  targetDate: '',
  progressNotes: '',
  statusTag: defaultStatusTag,
};

export function GoalWorkspace({ session }: GoalWorkspaceProps) {
  const { isConfigured, mode } = useSupabaseAuth();
  const isDemoMode = mode === 'demo';
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
    if (!session || !isConfigured) {
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

  const completedGoals = useMemo(
    () => goals.filter((goal) => Boolean(goal.target_date && new Date(goal.target_date) < new Date())),
    [goals],
  );

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

    if (!session) {
      setErrorMessage('You need to be signed in to create a goal.');
      return;
    }

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
      setStatusMessage('Goal saved.');
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

    if (!session || !editingGoalId) {
      setErrorMessage('You need to be signed in to update a goal.');
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

      setStatusMessage('Goal updated.');
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
    if (!session) {
      setErrorMessage('You need to be signed in to remove a goal.');
      return;
    }

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
      setStatusMessage('Goal removed.');
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

  return (
    <section className="goal-workspace">
      <header className="goal-workspace__header">
        <div>
          <h2>Goals &amp; Habits workspace</h2>
          <p>
            Map your long-term goals and align the habits that will make them real. Everything saved here syncs with your
            Supabase project.
          </p>
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

      {isDemoMode ? (
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
        <form className="goal-form" onSubmit={handleSubmit}>
          <h3>Capture a new goal</h3>
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

        <div className="goal-list">
          <div className="goal-list__header">
            <h3>Active goals</h3>
            <span className="goal-list__meta">
              {!isConfigured && !isDemoMode
                ? 'Connect Supabase to sync your goals.'
                : goals.length === 0
                  ? hasLoadedOnce
                    ? 'No goals yet—start by capturing your first big win.'
                    : 'Loading goals…'
                  : `${goals.length} goal${goals.length === 1 ? '' : 's'} in flight`}
            </span>
          </div>

          <ul className="goal-list__items">
            {goals.map((goal) => {
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

          {goals.length > 0 && completedGoals.length > 0 ? (
            <p className="goal-list__status">
              {completedGoals.length === goals.length
                ? 'Every goal here has passed its target date—time to celebrate and set the next milestone!'
                : `${completedGoals.length} goal${completedGoals.length === 1 ? ' has' : 's have'} crossed the target date.`}
            </p>
          ) : null}
        </div>
      </div>
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
