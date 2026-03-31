import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { listRoutineLogsForRange, listRoutines, listRoutineSteps, upsertRoutineLog } from '../../services/routines';
import { listHabitsV2, listTodayHabitLogsV2, logHabitCompletionV2, type HabitLogV2Row, type HabitV2Row } from '../../services/habitsV2';
import type { Routine, RoutineStep } from '../../types/routines';
import { parseSchedule } from '../habits/scheduleInterpreter';
import './RoutinesTodayLane.css';

type RoutinesTodayLaneProps = {
  session: Session;
  onHideStandaloneHabitsChange?: (habitIds: string[]) => void;
};

type StepsByRoutine = Record<string, RoutineStep[]>;

function getIsoWeekBounds(date: Date): { monday: string; sunday: string } {
  const current = new Date(date);
  const day = current.getDay();
  const isoDay = day === 0 ? 7 : day;
  const monday = new Date(current);
  monday.setDate(current.getDate() - isoDay + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    monday: monday.toISOString().slice(0, 10),
    sunday: sunday.toISOString().slice(0, 10),
  };
}

function isRoutineDueToday(
  routine: Routine,
  today: Date,
  completionsThisWeek: number,
): boolean {
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
    const target = typeof schedule.timesPerWeek === 'number' ? schedule.timesPerWeek : 1;
    return completionsThisWeek < target;
  }

  return true;
}

export function RoutinesTodayLane({ session, onHideStandaloneHabitsChange }: RoutinesTodayLaneProps) {
  const [loading, setLoading] = useState(false);
  const [savingStepId, setSavingStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [stepsByRoutine, setStepsByRoutine] = useState<StepsByRoutine>({});
  const [habitsById, setHabitsById] = useState<Record<string, HabitV2Row>>({});
  const [todayLogs, setTodayLogs] = useState<HabitLogV2Row[]>([]);
  const [routineLogs, setRoutineLogs] = useState<Record<string, { date: string; completed: boolean }[]>>({});
  const [expandedRoutineIds, setExpandedRoutineIds] = useState<Record<string, boolean>>({});
  const [activeRunRoutineId, setActiveRunRoutineId] = useState<string | null>(null);
  const [activeRunStepIndex, setActiveRunStepIndex] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { monday, sunday } = getIsoWeekBounds(new Date());
    const [routinesResult, habitsResult, logsResult, routineLogsResult] = await Promise.all([
      listRoutines(false),
      listHabitsV2({ includeInactive: false }),
      listTodayHabitLogsV2(session.user.id),
      listRoutineLogsForRange({ dateFrom: monday, dateTo: sunday }),
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
    if (routineLogsResult.error) {
      setError(routineLogsResult.error.message);
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
    const groupedRoutineLogs: Record<string, { date: string; completed: boolean }[]> = {};
    for (const log of routineLogsResult.data ?? []) {
      if (!groupedRoutineLogs[log.routine_id]) {
        groupedRoutineLogs[log.routine_id] = [];
      }
      groupedRoutineLogs[log.routine_id].push({ date: log.date, completed: log.completed });
    }
    setRoutineLogs(groupedRoutineLogs);

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
    return routines.filter((routine) => {
      const weeklyDone = (routineLogs[routine.id] ?? []).filter((entry) => entry.completed).length;
      return isRoutineDueToday(routine, today, weeklyDone);
    });
  }, [routineLogs, routines]);

  useEffect(() => {
    if (!onHideStandaloneHabitsChange) return;
    const hidden = new Set<string>();
    for (const routine of dueRoutines) {
      const steps = stepsByRoutine[routine.id] ?? [];
      for (const step of steps) {
        if (step.display_mode === 'inside_routine_only') {
          hidden.add(step.habit_id);
        }
      }
    }
    onHideStandaloneHabitsChange(Array.from(hidden));
  }, [dueRoutines, onHideStandaloneHabitsChange, stepsByRoutine]);

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
    async (routineId: string, step: RoutineStep) => {
      setSavingStepId(step.id);
      setError(null);
      const result = await logHabitCompletionV2({ habit_id: step.habit_id, done: true, value: null }, session.user.id);
      if (result.error) {
        setError(result.error.message);
        setSavingStepId(null);
        return false;
      }
      const logsResult = await listTodayHabitLogsV2(session.user.id);
      if (logsResult.error) {
        setError(logsResult.error.message);
      } else {
        const nextTodayLogs = logsResult.data ?? [];
        setTodayLogs(nextTodayLogs);
        const steps = stepsByRoutine[routineId] ?? [];
        if (steps.length > 0) {
          const completedCount = steps.filter((item) =>
            nextTodayLogs.some((log) => log.habit_id === item.habit_id && log.done),
          ).length;
          const isComplete = completedCount >= steps.length;
          const todayDate = new Date().toISOString().slice(0, 10);
          await upsertRoutineLog({
            routineId,
            date: todayDate,
            completed: isComplete,
            mode: 'normal',
          });
        }
      }
      setSavingStepId(null);
      return true;
    },
    [session.user.id, stepsByRoutine],
  );

  const activeRun = useMemo(() => {
    if (!activeRunRoutineId) return null;
    const routine = dueRoutines.find((item) => item.id === activeRunRoutineId);
    if (!routine) return null;
    const steps = (stepsByRoutine[routine.id] ?? []).slice().sort((a, b) => a.step_order - b.step_order);
    if (steps.length === 0) return null;
    const clampedIndex = Math.max(0, Math.min(activeRunStepIndex, steps.length - 1));
    return {
      routine,
      steps,
      index: clampedIndex,
      currentStep: steps[clampedIndex],
    };
  }, [activeRunRoutineId, activeRunStepIndex, dueRoutines, stepsByRoutine]);

  const handleRunStart = useCallback((routineId: string) => {
    setActiveRunRoutineId(routineId);
    setActiveRunStepIndex(0);
  }, []);

  const handleRunClose = useCallback(() => {
    setActiveRunRoutineId(null);
    setActiveRunStepIndex(0);
  }, []);

  const handleRunAdvance = useCallback(() => {
    if (!activeRun) return;
    if (activeRun.index >= activeRun.steps.length - 1) {
      handleRunClose();
      return;
    }
    setActiveRunStepIndex((value) => value + 1);
  }, [activeRun, handleRunClose]);

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
                <>
                <ul>
                  {(expandedRoutineIds[routine.id]
                    ? steps
                    : steps.filter((step) => step.display_mode !== 'standalone_only')
                  ).map((step) => {
                    const done = completedHabitIds.has(step.habit_id);
                    return (
                      <li key={step.id}>
                        <span>{habitsById[step.habit_id]?.title ?? 'Unknown habit'}</span>
                        <button
                          type="button"
                          className={`btn ${done ? 'btn--ghost' : 'btn--primary'}`}
                          disabled={done || savingStepId === step.id}
                          onClick={() => void handleStepDone(routine.id, step)}
                        >
                          {done ? 'Done' : savingStepId === step.id ? 'Saving…' : 'Mark done'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  className="btn btn--ghost routines-today-lane__run-button"
                  onClick={() => handleRunStart(routine.id)}
                >
                  Start run
                </button>
                {steps.some((step) => step.display_mode === 'standalone_only') ? (
                  <button
                    type="button"
                    className="btn btn--ghost routines-today-lane__run-button"
                    onClick={() =>
                      setExpandedRoutineIds((prev) => ({
                        ...prev,
                        [routine.id]: !prev[routine.id],
                      }))
                    }
                  >
                    {expandedRoutineIds[routine.id] ? 'Hide standalone-only steps' : 'Show all steps'}
                  </button>
                ) : null}
                </>
              ) : (
                <p className="routines-today-lane__empty">No steps attached yet.</p>
              )}
            </article>
          );
        })}
      </div>
      {activeRun ? (
        <div className="routines-run-modal" role="dialog" aria-modal="true" aria-label="Routine run mode">
          <div className="routines-run-modal__backdrop" onClick={handleRunClose} role="presentation" />
          <div className="routines-run-modal__panel">
            <header className="routines-run-modal__header">
              <p className="routines-run-modal__eyebrow">Cinematic run</p>
              <h4>{activeRun.routine.title}</h4>
              <p>
                Step {activeRun.index + 1} of {activeRun.steps.length}
              </p>
            </header>
            <div className="routines-run-modal__body">
              <h5>{habitsById[activeRun.currentStep.habit_id]?.title ?? 'Unknown habit'}</h5>
              <div className="routines-run-modal__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={async () => {
                    const ok = await handleStepDone(activeRun.routine.id, activeRun.currentStep);
                    if (ok) {
                      handleRunAdvance();
                    }
                  }}
                  disabled={savingStepId === activeRun.currentStep.id}
                >
                  {savingStepId === activeRun.currentStep.id ? 'Saving…' : 'Mark done'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={handleRunAdvance}>
                  Skip
                </button>
                <button type="button" className="btn btn--ghost" onClick={handleRunClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
