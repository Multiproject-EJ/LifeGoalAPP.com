import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { fetchGoals, insertGoal } from '../../services/goals';
import type { Database } from '../../lib/database.types';

type GoalRow = Database['public']['Tables']['goals']['Row'];

type GoalWorkspaceProps = {
  session: Session;
};

type GoalDraft = {
  title: string;
  description: string;
  targetDate: string;
};

const initialDraft: GoalDraft = {
  title: '',
  description: '',
  targetDate: '',
};

export function GoalWorkspace({ session }: GoalWorkspaceProps) {
  const { isConfigured } = useSupabaseAuth();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<GoalDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const refreshGoals = useCallback(async () => {
    if (!isConfigured) {
      setGoals([]);
      setHasLoadedOnce(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await fetchGoals();
      if (error) throw error;
      setGoals(data ?? []);
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
    }
  }, [isConfigured]);

  const completedGoals = useMemo(
    () => goals.filter((goal) => Boolean(goal.target_date && new Date(goal.target_date) < new Date())),
    [goals],
  );

  const handleDraftChange = (field: keyof GoalDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

    try {
      const payload = {
        title,
        description: draft.description.trim() || null,
        target_date: draft.targetDate ? draft.targetDate : null,
        user_id: session.user.id,
      } satisfies Database['public']['Tables']['goals']['Insert'];

      const { data, error } = await insertGoal(payload);
      if (error) throw error;
      if (data) {
        setGoals((current) => [data, ...current]);
      }
      setDraft(initialDraft);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save your goal.');
    } finally {
      setSaving(false);
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

      {!isConfigured ? (
        <p className="goal-workspace__status goal-workspace__status--warning">
          Add your Supabase credentials to <code>.env.local</code> to load and persist goals. Until then, you can plan
          offline, but nothing will sync yet.
        </p>
      ) : null}

      {errorMessage && <p className="goal-workspace__status goal-workspace__status--error">{errorMessage}</p>}

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

          <button type="submit" className="goal-form__submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save goal'}
          </button>
        </form>

        <div className="goal-list">
          <div className="goal-list__header">
            <h3>Active goals</h3>
            <span className="goal-list__meta">
              {!isConfigured
                ? 'Connect Supabase to sync your goals.'
                : goals.length === 0
                  ? hasLoadedOnce
                    ? 'No goals yet—start by capturing your first big win.'
                    : 'Loading goals…'
                  : `${goals.length} goal${goals.length === 1 ? '' : 's'} in flight`}
            </span>
          </div>

          <ul className="goal-list__items">
            {goals.map((goal) => (
              <li key={goal.id} className="goal-card">
                <div className="goal-card__header">
                  <h4>{goal.title}</h4>
                  <span className="goal-card__date">
                    {goal.target_date ? `Target: ${formatDate(goal.target_date)}` : 'No target date set'}
                  </span>
                </div>
                {goal.description ? <p>{goal.description}</p> : null}
                <footer className="goal-card__footer">
                  <span>Created {formatRelativeDate(goal.created_at)}</span>
                </footer>
              </li>
            ))}
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
