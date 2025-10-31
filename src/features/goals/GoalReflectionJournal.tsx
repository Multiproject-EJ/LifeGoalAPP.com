import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { fetchGoals } from '../../services/goals';
import {
  deleteGoalReflection,
  fetchGoalReflections,
  insertGoalReflection,
  type GoalReflectionRow,
} from '../../services/goalReflections';
import type { Database } from '../../lib/database.types';

type GoalRow = Database['public']['Tables']['goals']['Row'];

type GoalReflectionJournalProps = {
  session: Session;
};

type StatusState = { kind: 'success' | 'error'; message: string } | null;

type ConfidenceOption = { value: number; label: string; description: string };

const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
  { value: 5, label: 'Energized', description: 'Progress is flowing and support is locked in.' },
  { value: 4, label: 'Optimistic', description: 'Momentum is strong with a few items to watch.' },
  { value: 3, label: 'Steady', description: 'Holding steady with balanced wins and challenges.' },
  { value: 2, label: 'Wobbly', description: 'Momentum is slipping—focus on unblocking the next step.' },
  { value: 1, label: 'Stalled', description: 'Goal needs attention and a fresh plan to move forward.' },
];

const confidenceMeta = CONFIDENCE_OPTIONS.reduce<Record<number, ConfidenceOption>>((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

function formatDateLabel(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatConfidence(value: number | null): string {
  if (!value || !confidenceMeta[value]) {
    return 'Not recorded';
  }
  const option = confidenceMeta[value];
  return `${value}/5 · ${option.label}`;
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GoalReflectionJournal({ session }: GoalReflectionJournalProps) {
  const { isConfigured, mode } = useSupabaseAuth();
  const isDemoMode = mode === 'demo';
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [reflections, setReflections] = useState<GoalReflectionRow[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [loadingReflections, setLoadingReflections] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [entryDate, setEntryDate] = useState<string>(getTodayISO());
  const [confidence, setConfidence] = useState<number>(4);
  const [highlight, setHighlight] = useState('');
  const [challenge, setChallenge] = useState('');

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  );

  const loadGoals = useCallback(async () => {
    if (!session || (!isConfigured && !isDemoMode)) {
      setGoals([]);
      setSelectedGoalId('');
      return;
    }

    setLoadingGoals(true);
    setErrorMessage(null);
    try {
      const { data, error } = await fetchGoals();
      if (error) throw error;
      const ownedGoals = (data ?? []).filter((goal) => goal.user_id === session.user.id);
      setGoals(ownedGoals);

      if (ownedGoals.length === 0) {
        setSelectedGoalId('');
        setReflections([]);
        return;
      }

      setSelectedGoalId((current) => {
        if (current && ownedGoals.some((goal) => goal.id === current)) {
          return current;
        }
        return ownedGoals[0]?.id ?? '';
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load goals for reflections right now.',
      );
      setGoals([]);
      setSelectedGoalId('');
    } finally {
      setLoadingGoals(false);
    }
  }, [session, isConfigured, isDemoMode]);

  const loadReflections = useCallback(
    async (goalId: string) => {
      if (!goalId) {
        setReflections([]);
        return;
      }

      if (!session || (!isConfigured && !isDemoMode)) {
        setReflections([]);
        return;
      }

      setLoadingReflections(true);
      setErrorMessage(null);
      try {
        const { data, error } = await fetchGoalReflections(goalId);
        if (error) throw error;
        setReflections(data ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load your reflection history. Please try again shortly.',
        );
        setReflections([]);
      } finally {
        setLoadingReflections(false);
      }
    },
    [session, isConfigured, isDemoMode],
  );

  useEffect(() => {
    if (!session) return;
    if (!isConfigured && !isDemoMode) {
      setGoals([]);
      setReflections([]);
      setSelectedGoalId('');
      return;
    }
    void loadGoals();
  }, [session?.user?.id, isConfigured, isDemoMode, loadGoals]);

  useEffect(() => {
    if (!selectedGoalId) {
      setReflections([]);
      return;
    }
    void loadReflections(selectedGoalId);
  }, [selectedGoalId, loadReflections]);

  useEffect(() => {
    setStatus(null);
  }, [selectedGoalId]);

  const handleGoalSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedGoalId(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) {
      setStatus({ kind: 'error', message: 'Sign in to journal your goal reflections.' });
      return;
    }

    if (!isConfigured && !isDemoMode) {
      setStatus({ kind: 'error', message: 'Connect Supabase to save reflections.' });
      return;
    }

    if (!selectedGoalId) {
      setStatus({ kind: 'error', message: 'Choose a goal before saving a reflection.' });
      return;
    }

    const trimmedHighlight = highlight.trim();
    const trimmedChallenge = challenge.trim();

    if (!trimmedHighlight) {
      setStatus({ kind: 'error', message: 'Capture at least one highlight from your latest progress.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const { data, error } = await insertGoalReflection({
        goal_id: selectedGoalId,
        user_id: session.user.id,
        entry_date: entryDate,
        confidence,
        highlight: trimmedHighlight,
        challenge: trimmedChallenge || null,
      });
      if (error) throw error;
      if (data) {
        setReflections((current) => [data, ...current.filter((item) => item.id !== data.id)]);
      }
      setStatus({ kind: 'success', message: 'Reflection saved. Keep momentum insights flowing.' });
      setEntryDate(getTodayISO());
      setConfidence(4);
      setHighlight('');
      setChallenge('');
    } catch (error) {
      setStatus({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Unable to save this reflection. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reflection: GoalReflectionRow) => {
    if (!isConfigured && !isDemoMode) {
      setStatus({ kind: 'error', message: 'Connect Supabase to manage saved reflections.' });
      return;
    }

    const confirmed = window.confirm('Remove this reflection? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingId(reflection.id);
    setStatus(null);
    try {
      const { error } = await deleteGoalReflection(reflection.id);
      if (error) throw error;
      setReflections((current) => current.filter((item) => item.id !== reflection.id));
      setStatus({ kind: 'success', message: 'Reflection removed.' });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unable to delete the reflection right now.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const confidenceDescription = confidenceMeta[confidence]?.description ?? '';

  const canJournal = useMemo(() => goals.length > 0 && Boolean(selectedGoalId), [goals, selectedGoalId]);

  return (
    <section className="goal-reflection-journal">
      <header className="goal-reflection-journal__header">
        <div>
          <h2>Goal reflection journal</h2>
          <p>
            Log weekly insights for each goal, capture what worked, and note the challenges that need support.
            The confidence score keeps your focus tuned to momentum swings.
          </p>
        </div>
        {goals.length > 0 ? (
          <label className="goal-reflection-journal__goal-picker">
            <span>Viewing</span>
            <select value={selectedGoalId} onChange={handleGoalSelect} disabled={loadingGoals}>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      {isDemoMode ? (
        <p className="goal-reflection-journal__status goal-reflection-journal__status--info">
          Reflections are stored locally while you explore the demo workspace. Add Supabase credentials to sync
          journal entries across devices.
        </p>
      ) : !isConfigured ? (
        <p className="goal-reflection-journal__status goal-reflection-journal__status--warning">
          Connect Supabase to persist reflections and collaborate with your team.
        </p>
      ) : null}

      {status ? (
        <p
          className={`goal-reflection-journal__status goal-reflection-journal__status--${status.kind}`}
          role="status"
        >
          {status.message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="goal-reflection-journal__status goal-reflection-journal__status--error">{errorMessage}</p>
      ) : null}

      {!isConfigured && !isDemoMode ? (
        <p className="goal-reflection-journal__empty">
          Add your Supabase credentials to unlock the reflection journal and keep weekly reviews in sync.
        </p>
      ) : goals.length === 0 && !loadingGoals ? (
        <p className="goal-reflection-journal__empty">
          Create a goal first, then return here to log highlights, challenges, and confidence.
        </p>
      ) : (
        <div className="goal-reflection-journal__layout">
          <form className="goal-reflection-journal__form" onSubmit={handleSubmit}>
            <h3>Log a reflection</h3>
            <label className="goal-reflection-journal__field">
              <span>Date</span>
              <input
                type="date"
                value={entryDate}
                max={getTodayISO()}
                onChange={(event) => setEntryDate(event.target.value)}
                required
                disabled={!canJournal}
              />
            </label>
            <label className="goal-reflection-journal__field">
              <span>Confidence</span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={confidence}
                onChange={(event) => setConfidence(Number(event.target.value))}
                disabled={!canJournal}
              />
              <div className="goal-reflection-journal__confidence">
                <strong>{formatConfidence(confidence)}</strong>
                <span>{confidenceDescription}</span>
              </div>
            </label>
            <label className="goal-reflection-journal__field">
              <span>Highlight</span>
              <textarea
                value={highlight}
                onChange={(event) => setHighlight(event.target.value)}
                placeholder="Wins, breakthroughs, or learning moments from this week."
                rows={3}
                disabled={!canJournal}
                required
              />
            </label>
            <label className="goal-reflection-journal__field">
              <span>Challenge</span>
              <textarea
                value={challenge}
                onChange={(event) => setChallenge(event.target.value)}
                placeholder="Roadblocks to unblock next week. Optional but encouraged."
                rows={3}
                disabled={!canJournal}
              />
            </label>
            <button
              type="submit"
              className="goal-reflection-journal__submit"
              disabled={!canJournal || saving}
            >
              {saving ? 'Saving…' : 'Save reflection'}
            </button>
          </form>

          <div className="goal-reflection-journal__history">
            <div className="goal-reflection-journal__history-header">
              <h3>Reflection history</h3>
              <p>
                {selectedGoal
                  ? `Tracking ${reflections.length} reflection${reflections.length === 1 ? '' : 's'} for ${selectedGoal.title}.`
                  : 'Select a goal to view its reflection history.'}
              </p>
            </div>

            {loadingReflections ? (
              <p className="goal-reflection-journal__empty">Loading reflections…</p>
            ) : reflections.length === 0 ? (
              <p className="goal-reflection-journal__empty">
                Log your first reflection to start visualizing confidence swings and weekly momentum.
              </p>
            ) : (
              <ul className="goal-reflection-journal__list">
                {reflections.map((reflection) => {
                  const confidenceLabel = formatConfidence(reflection.confidence);
                  const option = reflection.confidence ? confidenceMeta[reflection.confidence] : undefined;
                  return (
                    <li key={reflection.id} className="goal-reflection-journal__item">
                      <header>
                        <div>
                          <h4>{formatDateLabel(reflection.entry_date)}</h4>
                          <p className="goal-reflection-journal__confidence-label">{confidenceLabel}</p>
                          {option ? (
                            <p className="goal-reflection-journal__confidence-description">{option.description}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDelete(reflection)}
                          className="goal-reflection-journal__delete"
                          disabled={deletingId === reflection.id || saving}
                        >
                          {deletingId === reflection.id ? 'Removing…' : 'Delete'}
                        </button>
                      </header>
                      <div className="goal-reflection-journal__note">
                        <h5>Highlight</h5>
                        <p>{reflection.highlight}</p>
                      </div>
                      {reflection.challenge ? (
                        <div className="goal-reflection-journal__note goal-reflection-journal__note--challenge">
                          <h5>Challenge</h5>
                          <p>{reflection.challenge}</p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
