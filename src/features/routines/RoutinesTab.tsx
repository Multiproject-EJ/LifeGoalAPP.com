import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  createRoutine,
  createRoutineStep,
  deleteRoutine,
  deleteRoutineStep,
  listRoutines,
  listRoutineSteps,
  updateRoutine,
  updateRoutineStep,
} from '../../services/routines';
import type { Routine, RoutineStep } from '../../types/routines';
import { createHabitV2, listHabitsV2, type HabitV2Row } from '../../services/habitsV2';
import './RoutinesTab.css';

type RoutinesTabProps = {
  session: Session;
};

type RoutineStepCounts = Record<string, number>;
type RoutineStepsByRoutine = Record<string, RoutineStep[]>;
type RoutineStepDraftByRoutine = Record<string, string>;
type NewHabitDraftByRoutine = Record<string, string>;

export function RoutinesTab({ session }: RoutinesTabProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [habits, setHabits] = useState<HabitV2Row[]>([]);
  const [stepsByRoutine, setStepsByRoutine] = useState<RoutineStepsByRoutine>({});
  const [stepCounts, setStepCounts] = useState<RoutineStepCounts>({});
  const [stepDraftByRoutine, setStepDraftByRoutine] = useState<RoutineStepDraftByRoutine>({});
  const [newHabitDraftByRoutine, setNewHabitDraftByRoutine] = useState<NewHabitDraftByRoutine>({});
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const activeCount = useMemo(() => routines.filter((routine) => routine.is_active).length, [routines]);
  const habitTitleById = useMemo(
    () => new Map(habits.map((habit) => [habit.id, habit.title] as const)),
    [habits],
  );

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
    const nextStepsByRoutine: RoutineStepsByRoutine = {};
    await Promise.all(
      rows.map(async (routine) => {
        const stepsResult = await listRoutineSteps(routine.id);
        const steps = stepsResult.data ?? [];
        counts[routine.id] = steps.length;
        nextStepsByRoutine[routine.id] = steps;
      }),
    );
    setStepCounts(counts);
    setStepsByRoutine(nextStepsByRoutine);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRoutines();
  }, [loadRoutines]);

  useEffect(() => {
    let ignore = false;
    const loadHabits = async () => {
      const result = await listHabitsV2({ includeInactive: false });
      if (ignore) return;
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setHabits(result.data ?? []);
    };
    void loadHabits();
    return () => {
      ignore = true;
    };
  }, []);

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
      setSuccess('Routine created. Add existing or brand-new steps below.');
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

  const handleAttachHabitStep = useCallback(
    async (routineId: string) => {
      const selectedHabitId = stepDraftByRoutine[routineId];
      if (!selectedHabitId) return;

      const existingSteps = stepsByRoutine[routineId] ?? [];
      if (existingSteps.some((step) => step.habit_id === selectedHabitId)) {
        setError('That habit is already linked to this routine.');
        return;
      }

      setSaving(true);
      setError(null);
      const result = await createRoutineStep({
        routine_id: routineId,
        habit_id: selectedHabitId,
        step_order: existingSteps.length,
      });
      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess('Step added to routine.');
      }
      setSaving(false);
      await loadRoutines();
    },
    [stepDraftByRoutine, stepsByRoutine, loadRoutines],
  );

  const handleCreateHabitAndAttachStep = useCallback(
    async (routineId: string) => {
      const draftedTitle = (newHabitDraftByRoutine[routineId] ?? '').trim();
      if (!draftedTitle) return;

      setSaving(true);
      setError(null);
      const habitResult = await createHabitV2(
        {
          title: draftedTitle,
          emoji: '✨',
          type: 'boolean',
          schedule: { mode: 'daily' },
          archived: false,
        },
        session.user.id,
      );

      if (habitResult.error || !habitResult.data) {
        setError(habitResult.error?.message ?? 'Failed to create the step habit.');
        setSaving(false);
        return;
      }

      const existingSteps = stepsByRoutine[routineId] ?? [];
      const stepResult = await createRoutineStep({
        routine_id: routineId,
        habit_id: habitResult.data.id,
        step_order: existingSteps.length,
      });

      if (stepResult.error) {
        setError(stepResult.error.message);
      } else {
        setSuccess(`Created "${draftedTitle}" and added it as a routine step.`);
        setNewHabitDraftByRoutine((prev) => ({ ...prev, [routineId]: '' }));
      }

      setSaving(false);
      await loadRoutines();
    },
    [loadRoutines, newHabitDraftByRoutine, session.user.id, stepsByRoutine],
  );

  const handleDeleteStep = useCallback(
    async (routineId: string, stepId: string) => {
      setSaving(true);
      setError(null);
      const result = await deleteRoutineStep(stepId);
      if (result.error) {
        setError(result.error.message);
      } else {
        const remaining = (stepsByRoutine[routineId] ?? []).filter((step) => step.id !== stepId);
        await Promise.all(
          remaining.map((step, index) =>
            step.step_order === index ? Promise.resolve() : updateRoutineStep(step.id, { step_order: index }),
          ),
        );
        setSuccess('Step removed.');
      }
      setSaving(false);
      await loadRoutines();
    },
    [loadRoutines, stepsByRoutine],
  );

  const handleMoveStep = useCallback(
    async (routineId: string, stepId: string, direction: -1 | 1) => {
      const steps = [...(stepsByRoutine[routineId] ?? [])].sort((a, b) => a.step_order - b.step_order);
      const index = steps.findIndex((step) => step.id === stepId);
      if (index < 0) return;

      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= steps.length) return;

      const [step] = steps.splice(index, 1);
      steps.splice(targetIndex, 0, step);

      setSaving(true);
      setError(null);
      await Promise.all(
        steps.map((item, orderIndex) =>
          item.step_order === orderIndex ? Promise.resolve() : updateRoutineStep(item.id, { step_order: orderIndex }),
        ),
      );
      setSaving(false);
      await loadRoutines();
    },
    [loadRoutines, stepsByRoutine],
  );

  const handleStepOptionChange = useCallback(
    async (
      step: RoutineStep,
      patch: Partial<Pick<RoutineStep, 'required' | 'display_mode' | 'fallback_step'>>,
    ) => {
      setSaving(true);
      setError(null);
      const result = await updateRoutineStep(step.id, patch);
      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess('Step options updated.');
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
          <p>Design and tune your routine flow. Active routines: <strong>{activeCount}</strong></p>
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
          <p>Create your first routine above, then attach habits as ordered steps.</p>
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
                <div className="routines-tab__step-composer">
                  <select
                    value={stepDraftByRoutine[routine.id] ?? ''}
                    onChange={(event) =>
                      setStepDraftByRoutine((prev) => ({
                        ...prev,
                        [routine.id]: event.target.value,
                      }))
                    }
                    disabled={saving || habits.length === 0}
                  >
                    <option value="">{habits.length > 0 ? 'Select habit to add…' : 'No habits available'}</option>
                    {habits.map((habit) => (
                      <option key={habit.id} value={habit.id}>
                        {habit.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => void handleAttachHabitStep(routine.id)}
                    disabled={saving || !stepDraftByRoutine[routine.id]}
                  >
                    Add step
                  </button>
                </div>
                <div className="routines-tab__step-composer routines-tab__step-composer--new">
                  <input
                    type="text"
                    value={newHabitDraftByRoutine[routine.id] ?? ''}
                    onChange={(event) =>
                      setNewHabitDraftByRoutine((prev) => ({
                        ...prev,
                        [routine.id]: event.target.value,
                      }))
                    }
                    placeholder="Or create a new step habit (e.g., Drink water)"
                    maxLength={120}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => void handleCreateHabitAndAttachStep(routine.id)}
                    disabled={saving || !(newHabitDraftByRoutine[routine.id] ?? '').trim()}
                  >
                    Create + add
                  </button>
                </div>
                {(stepsByRoutine[routine.id] ?? []).length > 0 ? (
                  <ol className="routines-tab__steps">
                    {(stepsByRoutine[routine.id] ?? [])
                      .slice()
                      .sort((a, b) => a.step_order - b.step_order)
                      .map((step, index, all) => (
                        <li key={step.id} className="routines-tab__step">
                          <span className="routines-tab__step-title">
                            {habitTitleById.get(step.habit_id) ?? 'Unknown habit'}
                          </span>
                          <div className="routines-tab__step-actions">
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => void handleMoveStep(routine.id, step.id, -1)}
                              disabled={saving || index === 0}
                              aria-label="Move step up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => void handleMoveStep(routine.id, step.id, 1)}
                              disabled={saving || index === all.length - 1}
                              aria-label="Move step down"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => void handleDeleteStep(routine.id, step.id)}
                              disabled={saving}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="routines-tab__step-config">
                            <label className="routines-tab__step-config-inline">
                              <input
                                type="checkbox"
                                checked={step.required}
                                onChange={(event) =>
                                  void handleStepOptionChange(step, { required: event.target.checked })
                                }
                                disabled={saving}
                              />
                              Required
                            </label>
                            <label className="routines-tab__step-config-inline">
                              Display
                              <select
                                value={step.display_mode}
                                onChange={(event) =>
                                  void handleStepOptionChange(step, {
                                    display_mode: event.target.value as RoutineStep['display_mode'],
                                  })
                                }
                                disabled={saving}
                              >
                                <option value="inside_routine_only">Inside routine only</option>
                                <option value="also_show_standalone">Also show standalone</option>
                                <option value="standalone_only">Standalone only</option>
                              </select>
                            </label>
                            <label className="routines-tab__step-config-inline">
                              <input
                                type="checkbox"
                                checked={step.fallback_step}
                                onChange={(event) =>
                                  void handleStepOptionChange(step, { fallback_step: event.target.checked })
                                }
                                disabled={saving}
                              />
                              Fallback step
                            </label>
                          </div>
                        </li>
                      ))}
                  </ol>
                ) : null}
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
