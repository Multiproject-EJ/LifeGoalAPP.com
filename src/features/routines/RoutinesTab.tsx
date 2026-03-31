import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  createRoutine,
  deleteRoutine,
  listRoutines,
  listRoutineSteps,
  updateRoutine,
} from '../../services/routines';
import type { Routine } from '../../types/routines';
import './RoutinesTab.css';

type RoutinesTabProps = {
  session: Session;
};

type RoutineStepCounts = Record<string, number>;

export function RoutinesTab({ session }: RoutinesTabProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [stepCounts, setStepCounts] = useState<RoutineStepCounts>({});
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const activeCount = useMemo(() => routines.filter((routine) => routine.is_active).length, [routines]);

  const loadRoutines = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await listRoutines(true);
    if (result.error) {
      setError(result.error.message);
      setRoutines([]);
      setStepCounts({});
      setLoading(false);
      return;
    }

    const rows = result.data ?? [];
    setRoutines(rows);

    const counts: RoutineStepCounts = {};
    await Promise.all(
      rows.map(async (routine) => {
        const stepsResult = await listRoutineSteps(routine.id);
        counts[routine.id] = stepsResult.data?.length ?? 0;
      }),
    );
    setStepCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRoutines();
  }, [loadRoutines]);

  const handleCreate = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const trimmedTitle = newTitle.trim();
      if (!trimmedTitle) return;

      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await createRoutine({
        title: trimmedTitle,
        description: newDescription.trim() || undefined,
      });

      if (result.error) {
        setError(result.error.message);
        setSaving(false);
        return;
      }

      setNewTitle('');
      setNewDescription('');
      setSuccess('Routine created. Add steps from the Habits tab next.');
      setSaving(false);
      await loadRoutines();
    },
    [newDescription, newTitle, loadRoutines],
  );

  const handleToggleActive = useCallback(
    async (routine: Routine) => {
      setSaving(true);
      setError(null);
      const result = await updateRoutine(routine.id, { is_active: !routine.is_active });
      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess(result.data?.is_active ? 'Routine activated.' : 'Routine paused.');
      }
      setSaving(false);
      await loadRoutines();
    },
    [loadRoutines],
  );

  const handleDelete = useCallback(
    async (routine: Routine) => {
      const confirmed = window.confirm(`Delete routine \"${routine.title}\"? This removes its step links.`);
      if (!confirmed) return;
      setSaving(true);
      setError(null);
      const result = await deleteRoutine(routine.id);
      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess('Routine deleted.');
      }
      setSaving(false);
      await loadRoutines();
    },
    [loadRoutines],
  );

  return (
    <section className="routines-tab" aria-label="Routines manager">
      <header className="routines-tab__header">
        <div>
          <p className="routines-tab__eyebrow">Routines</p>
          <h2>Build your repeatable flow</h2>
          <p>
            Create routine shells here, then attach habit steps. Active routines: <strong>{activeCount}</strong>
          </p>
        </div>
      </header>

      <form className="routines-tab__composer" onSubmit={handleCreate}>
        <label>
          Routine title
          <input
            type="text"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Morning momentum"
            maxLength={120}
            required
          />
        </label>
        <label>
          Description (optional)
          <textarea
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="A quick sequence to start focused and calm."
            maxLength={280}
            rows={3}
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={saving || !session}>
          {saving ? 'Saving…' : 'Create routine'}
        </button>
      </form>

      {error ? <p className="routines-tab__status routines-tab__status--error">{error}</p> : null}
      {success ? <p className="routines-tab__status routines-tab__status--success">{success}</p> : null}

      {loading ? <p className="routines-tab__loading">Loading routines…</p> : null}

      {!loading && routines.length === 0 ? (
        <div className="routines-tab__empty">
          <h3>No routines yet</h3>
          <p>Create your first routine above. You can map habits as steps in the next UI pass.</p>
        </div>
      ) : null}

      {!loading && routines.length > 0 ? (
        <ul className="routines-tab__list" role="list">
          {routines.map((routine) => (
            <li key={routine.id} className="routines-tab__item">
              <div className="routines-tab__item-main">
                <h3>{routine.title}</h3>
                <p>{routine.description || 'No description yet.'}</p>
                <p className="routines-tab__meta">
                  {routine.is_active ? 'Active' : 'Paused'} • Steps linked: {stepCounts[routine.id] ?? 0}
                </p>
              </div>
              <div className="routines-tab__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void handleToggleActive(routine)}
                  disabled={saving}
                >
                  {routine.is_active ? 'Pause' : 'Activate'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void handleDelete(routine)}
                  disabled={saving}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
