import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { listRoutines, listRoutineSteps } from '../../services/routines';
import { listHabitsV2, listTodayHabitLogsV2, logHabitCompletionV2, type HabitLogV2Row, type HabitV2Row } from '../../services/habitsV2';
import type { Routine, RoutineStep } from '../../types/routines';
import { parseSchedule } from '../habits/scheduleInterpreter';
import './RoutinesTodayLane.css';

type RoutinesTodayLaneProps = {
  session: Session;
};

type StepsByRoutine = Record<string, RoutineStep[]>;

function isRoutineDueToday(routine: Routine, today: Date): boolean {
  const schedule = parseSchedule(routine.schedule);
  if (!schedule?.mode) return true;

  if (schedule.mode === 'daily') return true;

  if (schedule.mode === 'specific_days') {
    if (!Array.isArray(schedule.days) || schedule.days.length === 0) return true;
    return schedule.days.includes(today.getDay());
  }

  if (schedule.mode === 'every_n_days') {
    const interval = schedule.intervalDays;
    if (!interval || interval <= 0) return true;
    const baseline = new Date(schedule.startDate ?? routine.created_at);
    baseline.setHours(0, 0, 0, 0);
    const current = new Date(today);
    current.setHours(0, 0, 0, 0);
    const diffMs = current.getTime() - baseline.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % interval === 0;
  }

  if (schedule.mode === 'times_per_week') {
    return true;
  }

  return true;
}

export function RoutinesTodayLane({ session }: RoutinesTodayLaneProps) {
  const [loading, setLoading] = useState(false);
  const [savingStepId, setSavingStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [stepsByRoutine, setStepsByRoutine] = useState<StepsByRoutine>({});
  const [habitsById, setHabitsById] = useState<Record<string, HabitV2Row>>({});
  const [todayLogs, setTodayLogs] = useState<HabitLogV2Row[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [routinesResult, habitsResult, logsResult] = await Promise.all([
      listRoutines(false),
      listHabitsV2({ includeInactive: false }),
      listTodayHabitLogsV2(session.user.id),
    ]);

    if (routinesResult.error) {
      setError(routinesResult.error.message);
      setLoading(false);
      return;
    }

    if (habitsResult.error) {
      setError(habitsResult.error.message);
      setLoading(false);
      return;
    }

    if (logsResult.error) {
      setError(logsResult.error.message);
      setLoading(false);
      return;
    }

    const routineRows = routinesResult.data ?? [];
    const stepsMap: StepsByRoutine = {};

    await Promise.all(
      routineRows.map(async (routine) => {
        const stepResult = await listRoutineSteps(routine.id);
        stepsMap[routine.id] = (stepResult.data ?? []).slice().sort((a, b) => a.step_order - b.step_order);
      }),
    );

    setRoutines(routineRows);
    setStepsByRoutine(stepsMap);
    setTodayLogs(logsResult.data ?? []);

    const nextHabitsById: Record<string, HabitV2Row> = {};
    for (const habit of habitsResult.data ?? []) {
      nextHabitsById[habit.id] = habit;
    }
    setHabitsById(nextHabitsById);
    setLoading(false);
  }, [session.user.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const dueRoutines = useMemo(() => {
    const today = new Date();
    return routines.filter((routine) => isRoutineDueToday(routine, today));
  }, [routines]);

  const completedHabitIds = useMemo(() => {
    const doneIds = new Set<string>();
    for (const log of todayLogs) {
      if (log.done) {
        doneIds.add(log.habit_id);
      }
    }
    return doneIds;
  }, [todayLogs]);

  const handleStepDone = useCallback(
    async (step: RoutineStep) => {
      setSavingStepId(step.id);
      setError(null);
      const result = await logHabitCompletionV2({ habit_id: step.habit_id, done: true, value: null }, session.user.id);
      if (result.error) {
        setError(result.error.message);
        setSavingStepId(null);
        return;
      }
      const logsResult = await listTodayHabitLogsV2(session.user.id);
      if (logsResult.error) {
        setError(logsResult.error.message);
      } else {
        setTodayLogs(logsResult.data ?? []);
      }
      setSavingStepId(null);
    },
    [session.user.id],
  );

  if (loading) {
    return <section className="routines-today-lane"><p>Loading routines…</p></section>;
  }

  if (error) {
    return (
      <section className="routines-today-lane routines-today-lane--error">
        <p>{error}</p>
      </section>
    );
  }

  if (dueRoutines.length === 0) {
    return null;
  }

  return (
    <section className="routines-today-lane" aria-label="Routines due today">
      <header className="routines-today-lane__header">
        <p className="routines-today-lane__eyebrow">Today</p>
        <h3>Routines due today</h3>
      </header>
      <div className="routines-today-lane__list">
        {dueRoutines.map((routine) => {
          const steps = stepsByRoutine[routine.id] ?? [];
          const completed = steps.filter((step) => completedHabitIds.has(step.habit_id)).length;
          const percentage = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;
          return (
            <article key={routine.id} className="routines-today-lane__card">
              <header>
                <h4>{routine.title}</h4>
                <p>
                  {completed}/{steps.length} steps • {percentage}%
                </p>
              </header>
              {steps.length > 0 ? (
                <ul>
                  {steps.map((step) => {
                    const done = completedHabitIds.has(step.habit_id);
                    return (
                      <li key={step.id}>
                        <span>{habitsById[step.habit_id]?.title ?? 'Unknown habit'}</span>
                        <button
                          type="button"
                          className={`btn ${done ? 'btn--ghost' : 'btn--primary'}`}
                          disabled={done || savingStepId === step.id}
                          onClick={() => void handleStepDone(step)}
                        >
                          {done ? 'Done' : savingStepId === step.id ? 'Saving…' : 'Mark done'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="routines-today-lane__empty">No steps attached yet.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
