import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { useGamification } from '../../../../hooks/useGamification';
import { recordGameLifeIntake } from '../../../../services/gameLifeIntake';
import type { HabitV2Row } from '../../../../services/habitsV2';
import { XP_REWARDS } from '../../../../types/gamification';
import { getIslandContentPlan } from '../services/islandContentManifest';
import {
  acknowledgeCompletedHabitLandmarkChoice,
  completeHabitLandmarkChoice,
  loadHabitLandmarkContext,
  type HabitLandmarkChoice,
} from '../services/islandRunHabitLandmarkAction';
import {
  awardRoutekeeperBreathLotusOnce,
  completeRoutekeeperBreathingHabit,
  createRoutekeeperBreathingHabit,
  ROUTEKEEPER_BREATH_HABIT_TITLE,
  ROUTEKEEPER_BREATH_LOTUS_REWARD,
  ROUTEKEEPER_SUCCESS_BODY,
  ROUTEKEEPER_SUCCESS_TITLE,
  selectRoutekeeperSignalChoicesForIsland,
  type RoutekeeperSignalChoice,
} from '../services/islandRunRoutekeeperTinyActions';
import { DayOneBreathingRitual } from './DayOneBreathingRitual';

interface IslandRunLifePromptCardProps {
  session: Session;
  islandNumber?: number;
  onComplete: (message: string) => void;
  onComeBackLater?: () => void;
  forceDayOnePreview?: boolean;
  previewHabitChoices?: HabitLandmarkChoice[];
}

const DAY_ONE_PACE_OPTIONS = [
  { id: 'gentle', label: 'Gentle', body: 'One tiny win' },
  { id: 'steady', label: 'Steady', body: 'A small daily challenge' },
  { id: 'bold', label: 'Bold', body: 'Push me a little' },
] as const;

type DayOnePace = typeof DAY_ONE_PACE_OPTIONS[number]['id'];
type HabitCardState = 'loading' | 'ready';
type HabitAction =
  | { kind: 'completed_habit'; key: string; habit: HabitLandmarkChoice }
  | { kind: 'unfinished_habit'; key: string; habit: HabitLandmarkChoice }
  | { kind: 'instant'; key: string; signal: RoutekeeperSignalChoice };

function targetLabel(habit: HabitLandmarkChoice): string {
  if (habit.target_num && habit.target_unit) return `${habit.target_num} ${habit.target_unit}`;
  return habit.type === 'boolean' ? 'One clear check-in' : 'Mark today complete';
}

function actionTitle(action: HabitAction): string {
  return action.kind === 'instant' ? action.signal.action : action.habit.title;
}

function actionEmoji(action: HabitAction): string {
  if (action.kind === 'instant') {
    const emojiBySignal: Record<RoutekeeperSignalChoice['id'], string> = {
      body: '🚶',
      energy: '💧',
      mind: '✍️',
      home: '🏠',
      future: '✅',
      connection: '💬',
    };
    return emojiBySignal[action.signal.id];
  }
  return action.habit.emoji ?? '✨';
}

export function IslandRunLifePromptCard({
  session,
  islandNumber = 1,
  onComplete,
  onComeBackLater,
  forceDayOnePreview = false,
  previewHabitChoices,
}: IslandRunLifePromptCardProps) {
  const [cardState, setCardState] = useState<HabitCardState>('loading');
  const [unfinishedHabits, setUnfinishedHabits] = useState<HabitLandmarkChoice[]>([]);
  const [completedHabits, setCompletedHabits] = useState<HabitLandmarkChoice[]>([]);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const [routekeeperRewardLine, setRoutekeeperRewardLine] = useState<string | null>(null);
  const [routekeeperBreathStage, setRoutekeeperBreathStage] = useState<
    'intro' | 'adding' | 'added' | 'breathing'
  >('intro');
  const [routekeeperBreathHabit, setRoutekeeperBreathHabit] = useState<HabitV2Row | null>(null);
  const [dayOnePace, setDayOnePace] = useState<DayOnePace>('gentle');

  const { earnXP, recordActivity } = useGamification(session);
  const islandPlan = useMemo(() => getIslandContentPlan(islandNumber), [islandNumber]);
  const isPreviewMode = Boolean(previewHabitChoices);
  const localJourneyDay = typeof window !== 'undefined'
    ? Number(window.localStorage.getItem(`habitgame:journey-day:${session.user.id}`) ?? 0)
    : 0;
  const journeyDay = Number(
    session.user.user_metadata?.developer_journey_day
      ?? session.user.user_metadata?.journey_day
      ?? localJourneyDay,
  );
  const isDayOneStoryMode = forceDayOnePreview || (islandNumber === 1 && journeyDay === 1);

  useEffect(() => {
    let cancelled = false;

    async function loadActions() {
      if (isDayOneStoryMode) {
        setCardState('ready');
        return;
      }
      setCardState('loading');
      setLoadWarning(null);

      if (previewHabitChoices) {
        setUnfinishedHabits(previewHabitChoices);
        setCompletedHabits([]);
        setCardState('ready');
        return;
      }

      const result = await loadHabitLandmarkContext(session.user.id);
      if (cancelled) return;
      if (!result.data) {
        setUnfinishedHabits([]);
        setCompletedHabits([]);
        setLoadWarning('Today could not be read, so these private two-minute actions are available instead.');
      } else {
        setUnfinishedHabits(result.data.choices);
        setCompletedHabits(result.data.completedTodayChoices);
      }
      setCardState('ready');
    }

    void loadActions();
    return () => {
      cancelled = true;
    };
  }, [isDayOneStoryMode, previewHabitChoices, session.user.id]);

  const instantActions = useMemo(
    () => selectRoutekeeperSignalChoicesForIsland(islandNumber),
    [islandNumber],
  );

  const visibleActions = useMemo<HabitAction[]>(() => {
    const actions: HabitAction[] = [];
    for (const habit of completedHabits) {
      if (actions.length >= 3) break;
      actions.push({ kind: 'completed_habit', key: `done:${habit.id}`, habit });
    }
    for (const habit of unfinishedHabits) {
      if (actions.length >= 3) break;
      actions.push({ kind: 'unfinished_habit', key: `habit:${habit.id}`, habit });
    }
    if (actions.length > 0) return actions;
    return instantActions.map((signal) => ({
      kind: 'instant' as const,
      key: `instant:${signal.id}`,
      signal,
    }));
  }, [completedHabits, unfinishedHabits, instantActions]);

  const selectedAction = visibleActions.find((action) => action.key === selectedKey) ?? null;

  const handleComeBackLater = () => {
    void recordGameLifeIntake({
      userId: session.user.id,
      promptContext: 'habit_landmark',
      islandNumber,
      intakeStage: islandPlan.intakeStage,
      state: 'skipped',
      payload: { outcome: 'postponed_stop', visible_choice_count: visibleActions.length },
    });
    onComeBackLater?.();
  };

  const finishWithMessage = (message: string) => {
    setDoneMessage(message);
    setIsSubmitting(false);
    onComplete(message);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    if (isPreviewMode) {
      finishWithMessage(`✅ ${actionTitle(selectedAction)} complete. One steady action is enough.`);
      return;
    }

    if (selectedAction.kind === 'completed_habit') {
      const result = await acknowledgeCompletedHabitLandmarkChoice({
        userId: session.user.id,
        habitId: selectedAction.habit.id,
        islandNumber,
        intakeStage: islandPlan.intakeStage,
      });
      if (!result.ok) {
        setError(result.message);
        setSelectedKey(null);
        setIsSubmitting(false);
        return;
      }
      finishWithMessage(`🌟 Today already holds “${result.habit.title}”. No duplicate habit reward added.`);
      return;
    }

    if (selectedAction.kind === 'unfinished_habit') {
      const result = await completeHabitLandmarkChoice({
        userId: session.user.id,
        habitId: selectedAction.habit.id,
        islandNumber,
        intakeStage: islandPlan.intakeStage,
      });
      if (!result.ok) {
        setError(result.message);
        setSelectedKey(null);
        setIsSubmitting(false);
        return;
      }

      const xpAmount = new Date().getHours() < 9
        ? XP_REWARDS.HABIT_COMPLETE_EARLY
        : XP_REWARDS.HABIT_COMPLETE;
      const xpResult = await earnXP?.(
        xpAmount,
        'habit_complete',
        result.habit.id,
        'Completed from Island Run Habit Landmark',
      );
      await recordActivity?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('habitgame:habits-created', {
          detail: { habitId: result.habit.id, source: 'habit-landmark-completion' },
        }));
      }
      const reward = xpResult?.success ? ` · +${xpAmount} XP` : '';
      finishWithMessage(`✅ ${result.habit.title} complete${reward}`);
      return;
    }

    await recordGameLifeIntake({
      userId: session.user.id,
      promptContext: 'habit_landmark',
      islandNumber,
      intakeStage: islandPlan.intakeStage,
      state: 'completed',
      payload: {
        outcome: 'instant_real_life_action_completed',
        signal_id: selectedAction.signal.id,
        signal_label: selectedAction.signal.label,
        action: selectedAction.signal.action,
        created_permanent_habit: false,
      },
    });
    finishWithMessage(`✅ ${selectedAction.signal.action} ${ROUTEKEEPER_SUCCESS_BODY}`);
  };

  const handleStartDayOneBreathingRitual = async () => {
    setRoutekeeperBreathStage('adding');
    setError(null);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`habitgame:journey-pace:${session.user.id}`, dayOnePace);
    }
    const result = await createRoutekeeperBreathingHabit(session.user.id);
    if (!result.ok || !result.habit) {
      setError(`Could not add the breathing habit right now (${result.message}).`);
      setRoutekeeperBreathStage('intro');
      return;
    }

    setRoutekeeperBreathHabit(result.habit);
    setRoutekeeperBreathStage('added');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('habitgame:habits-created', {
        detail: { habitId: result.habit.id, source: 'day-one-breath' },
      }));
    }
    void recordGameLifeIntake({
      userId: session.user.id,
      promptContext: 'habit_landmark',
      islandNumber,
      intakeStage: islandPlan.intakeStage,
      lifeWheelArea: 'Mind',
      state: 'accepted',
      linkedHabitId: result.habit.id,
      payload: {
        outcome: result.wasAlreadyPresent
          ? 'day_one_breath_habit_reused'
          : 'day_one_breath_habit_created',
        duration_days: 7,
        journey_pace: dayOnePace,
        lotus_per_completion: ROUTEKEEPER_BREATH_LOTUS_REWARD,
      },
    });
    window.setTimeout(() => setRoutekeeperBreathStage('breathing'), 1150);
  };

  const handleCompleteDayOneBreathingRitual = async () => {
    if (!routekeeperBreathHabit) {
      return { ok: false, message: 'The breathing habit is not ready yet.' };
    }
    const completion = await completeRoutekeeperBreathingHabit(
      routekeeperBreathHabit,
      session.user.id,
    );
    if (completion.error || !completion.data?.completed) {
      return {
        ok: false,
        message: completion.error?.message ?? 'The breath was completed, but Today could not be updated.',
      };
    }

    let rewardLine = 'Today already remembered this breath.';
    if (!completion.data.wasAlreadyCompleted) {
      const lotusResult = await awardRoutekeeperBreathLotusOnce({
        userId: session.user.id,
        habitId: routekeeperBreathHabit.id,
      });
      if (!lotusResult.ok) {
        return {
          ok: false,
          message: `The habit was completed, but the Lotus Flower could not be awarded (${lotusResult.error?.message ?? 'unknown error'}).`,
        };
      }
      rewardLine = `🪷 +${ROUTEKEEPER_BREATH_LOTUS_REWARD} Lotus Flower`;
    }

    const xpResult = completion.data.wasAlreadyCompleted
      ? null
      : await earnXP?.(
        XP_REWARDS.HABIT_COMPLETE,
        'habit_complete',
        routekeeperBreathHabit.id,
        'Day 1 breathing ritual',
      );
    if (!completion.data.wasAlreadyCompleted) await recordActivity?.();
    const fullRewardLine = xpResult?.success
      ? `${rewardLine} · +${XP_REWARDS.HABIT_COMPLETE} XP`
      : rewardLine;
    setRoutekeeperRewardLine(fullRewardLine);
    return { ok: true, rewardLine: fullRewardLine };
  };

  if (isDayOneStoryMode) {
    return (
      <div className="island-hatchery-card">
        {routekeeperBreathStage === 'intro' || routekeeperBreathStage === 'adding' ? (
          <div className="day-one-routekeeper-intro">
            <p className="island-stop-modal__eyebrow">Island mission · First Light Shore</p>
            <h3 className="island-stop-modal__title">Help wake the island</h3>
            <p className="island-stop-modal__copy">
              The Routekeeper Steps are dark. Your daily ritual is one five-second breath;
              we&apos;ll take three together now to restore their first light.
            </p>
            <fieldset className="day-one-routekeeper-intro__pace">
              <legend>Choose your pace</legend>
              <div className="day-one-routekeeper-intro__pace-options">
                {DAY_ONE_PACE_OPTIONS.map((pace) => (
                  <button
                    key={pace.id}
                    type="button"
                    className={dayOnePace === pace.id ? 'is-selected' : ''}
                    aria-pressed={dayOnePace === pace.id}
                    onClick={() => setDayOnePace(pace.id)}
                  >
                    <strong>{pace.label}</strong>
                    <small>{pace.body}</small>
                  </button>
                ))}
              </div>
              <small>All three begin with the same tiny win. You can change your pace later.</small>
            </fieldset>
            <div className="day-one-routekeeper-intro__habit">
              <span aria-hidden="true">🌬️</span>
              <span>
                <strong>{ROUTEKEEPER_BREATH_HABIT_TITLE}</strong>
                <small>Once a day for 7 days · 🪷 +1 Lotus</small>
              </span>
            </div>
            <button
              type="button"
              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
              onClick={() => void handleStartDayOneBreathingRitual()}
              disabled={routekeeperBreathStage === 'adding'}
            >
              {routekeeperBreathStage === 'adding' ? 'Adding to Today…' : 'Add to Today & breathe now'}
            </button>
          </div>
        ) : null}

        {routekeeperBreathStage === 'added' ? (
          <div className="day-one-habit-added" role="status">
            <p className="day-one-habit-added__eyebrow">Added to Today</p>
            <div className="day-one-habit-added__card">
              <span aria-hidden="true">🌬️</span>
              <strong>{ROUTEKEEPER_BREATH_HABIT_TITLE}</strong>
              <span className="day-one-habit-added__reward">🪷 +1</span>
            </div>
            <p>7-day ritual anchored</p>
          </div>
        ) : null}

        {routekeeperBreathStage === 'breathing' ? (
          <DayOneBreathingRitual
            onRitualComplete={handleCompleteDayOneBreathingRitual}
            onContinue={() => {
              const message = routekeeperRewardLine
                ? `${ROUTEKEEPER_SUCCESS_TITLE} ${routekeeperRewardLine}`
                : `${ROUTEKEEPER_SUCCESS_TITLE} ${ROUTEKEEPER_SUCCESS_BODY}`;
              onComplete(message);
            }}
          />
        ) : null}
        {error ? <p className="island-stop-modal__error" role="alert">{error}</p> : null}
      </div>
    );
  }

  return (
    <section className="habit-landmark-shell habit-landmark-quiet" aria-labelledby="habit-landmark-title">
      <header className="habit-landmark-shell__hero">
        <div className="habit-landmark-shell__sigil" aria-hidden="true">✓</div>
        <div>
          <p className="habit-landmark-shell__eyebrow">Island {islandNumber} · Habit</p>
          <h2 id="habit-landmark-title">One real-life move</h2>
          <p>Do one useful thing. Nothing else to configure.</p>
        </div>
        <span className="habit-landmark-shell__spark" aria-hidden="true">✦</span>
      </header>

      {cardState === 'loading' ? (
        <div className="habit-landmark-quiet__loading" role="status">
          <span aria-hidden="true">✦</span>
          <p>Finding one useful move from Today…</p>
        </div>
      ) : (
        <>
          <div className="habit-landmark-quiet__intro">
            <p>{visibleActions.some((action) => action.kind !== 'instant')
              ? 'Choose a Today action. Already-finished work counts, but never pays twice.'
              : 'No Today habit is ready, so choose one private two-minute action.'}</p>
            <span>{visibleActions.length} choices</span>
          </div>

          {loadWarning ? <p className="habit-landmark-quiet__warning">{loadWarning}</p> : null}

          <div className="habit-landmark-quiet__actions" role="radiogroup" aria-label="Choose one real-life move">
            {visibleActions.map((action) => {
              const selected = action.key === selectedKey;
              const detail = action.kind === 'completed_habit'
                ? 'Already done today · no duplicate reward'
                : action.kind === 'unfinished_habit'
                  ? targetLabel(action.habit)
                  : `${action.signal.label} · about two minutes`;
              return (
                <button
                  key={action.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`habit-landmark-quiet__action${selected ? ' is-selected' : ''}${action.kind === 'completed_habit' ? ' is-complete' : ''}`}
                  onClick={() => {
                    setSelectedKey(action.key);
                    setError(null);
                  }}
                  disabled={isSubmitting}
                >
                  <span className="habit-landmark-quiet__emoji" aria-hidden="true">{actionEmoji(action)}</span>
                  <span className="habit-landmark-quiet__copy">
                    <strong>{actionTitle(action)}</strong>
                    <small>{detail}</small>
                  </span>
                  <span className="habit-landmark-quiet__check" aria-hidden="true">
                    {selected ? '✓' : action.kind === 'completed_habit' ? '★' : ''}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary habit-landmark-quiet__confirm"
            onClick={() => void handleConfirmAction()}
            disabled={!selectedAction || isSubmitting}
          >
            {isSubmitting
              ? 'Remembering the action…'
              : selectedAction?.kind === 'completed_habit'
                ? 'Use today’s completed win'
                : selectedAction
                  ? `I did “${actionTitle(selectedAction)}”`
                  : 'Choose one action'}
          </button>

          {doneMessage ? <p className="habit-landmark-quiet__success" role="status">{doneMessage}</p> : null}
          {error ? <p className="island-stop-modal__error" role="alert">{error}</p> : null}

          <button
            type="button"
            className="habit-landmark-quiet__later"
            onClick={handleComeBackLater}
            disabled={isSubmitting}
          >
            Come back later
          </button>
        </>
      )}
    </section>
  );
}
