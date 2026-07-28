import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  createIslandRunHabitFromLifePrompt,
  type IslandRunHabitSize,
} from '../services/islandRunLifeIntakeService';
import {
  ISLAND_RUN_HABIT_TIMING_CHOICES,
  ISLAND_RUN_LIFE_WHEEL_AREAS,
  type IslandRunHabitTimingChoice,
  type IslandRunLifeWheelArea,
} from '../services/islandRunLifePromptTemplates';
import { getSuggestedHabitsByLifeWheelArea, type SuggestedHabit } from '../../../habits/suggestedHabitLibrary';
import {
  rankSuggestedHabitsByFeedback,
  type HabitFeedbackEnergy,
  type HabitFeedbackStyle,
  type HabitFeedbackTime,
} from '../services/islandRunHabitSuggestionEngine';
import {
  computeAreaReadiness,
  deriveSupportedAreas,
  parseCheckinScoreMap,
  selectOfferableAreas,
  type AreaReadiness,
} from '../services/islandRunAdaptiveAreas';
import { getLifeWheelAreaMeta } from '../../../life-wheel/lifeWheelTaxonomy';
import { fetchCheckinsForUser } from '../../../../services/checkins';
import { listHabitsV2, type HabitV2Row } from '../../../../services/habitsV2';
import { useGamification } from '../../../../hooks/useGamification';
import { XP_REWARDS } from '../../../../types/gamification';
import { recordGameLifeIntake } from '../../../../services/gameLifeIntake';
import { recordCompassContribution } from '../../../../services/compassState';
import {
  awardRoutekeeperBreathLotusOnce,
  completeRoutekeeperBreathingHabit,
  createRoutekeeperBreathingHabit,
  createAndCompleteRoutekeeperTinyAction,
  hasSuitableRoutekeeperHabit,
  ROUTEKEEPER_BREATH_HABIT_TITLE,
  ROUTEKEEPER_BREATH_LOTUS_REWARD,
  ROUTEKEEPER_SUCCESS_BODY,
  ROUTEKEEPER_SUCCESS_TITLE,
  ROUTEKEEPER_BODY_COPY,
  ROUTEKEEPER_FIRST_QUESTION,
  ROUTEKEEPER_SIGNAL_CHOICES,
  type RoutekeeperSignalId,
  type RoutekeeperTinyAction,
} from '../services/islandRunRoutekeeperTinyActions';
import { getIslandContentPlan, orderAreasForIsland } from '../services/islandContentManifest';
import { DayOneBreathingRitual } from './DayOneBreathingRitual';

/** Dispatched when the player needs to record a check-in before adding a habit. */
export const ISLAND_RUN_LAUNCH_CHECKINS_EVENT = 'lifegoal:launch-checkins';

interface IslandRunLifePromptCardProps {
  session: Session;
  islandNumber?: number;
  onComplete: (message: string) => void;
  onComeBackLater?: () => void;
  forceDayOnePreview?: boolean;
}

const HABIT_SIZES: readonly IslandRunHabitSize[] = ['Tiny', 'Normal', 'Stretch'];
const DAY_ONE_PACE_OPTIONS = [
  { id: 'gentle', label: 'Gentle', body: 'One tiny win' },
  { id: 'steady', label: 'Steady', body: 'A small daily challenge' },
  { id: 'bold', label: 'Bold', body: 'Push me a little' },
] as const;
type DayOnePace = typeof DAY_ONE_PACE_OPTIONS[number]['id'];

export function IslandRunLifePromptCard({
  session,
  islandNumber,
  onComplete,
  onComeBackLater,
  forceDayOnePreview = false,
}: IslandRunLifePromptCardProps) {
  const [area, setArea] = useState<IslandRunLifeWheelArea | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<SuggestedHabit | null>(null);
  const [feedbackEnergy, setFeedbackEnergy] = useState<HabitFeedbackEnergy | null>(null);
  const [feedbackTime, setFeedbackTime] = useState<HabitFeedbackTime | null>(null);
  const [feedbackStyle, setFeedbackStyle] = useState<HabitFeedbackStyle | null>(null);
  const [selectedSize, setSelectedSize] = useState<IslandRunHabitSize | null>(null);
  const [timing, setTiming] = useState<IslandRunHabitTimingChoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [routekeeperSignalId, setRoutekeeperSignalId] = useState<RoutekeeperSignalId>('body');
  const [routekeeperMode, setRoutekeeperMode] = useState(false);
  const [routekeeperRewardLine, setRoutekeeperRewardLine] = useState<string | null>(null);
  const [routekeeperBreathStage, setRoutekeeperBreathStage] = useState<'intro' | 'adding' | 'added' | 'breathing'>('intro');
  const [routekeeperBreathHabit, setRoutekeeperBreathHabit] = useState<HabitV2Row | null>(null);
  const [dayOnePace, setDayOnePace] = useState<DayOnePace>('gentle');

  // Adaptive context: latest check-in + active-habit coverage drive which life
  // areas we offer. Until this loads we gate the area picker.
  const [contextStatus, setContextStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [hasCheckin, setHasCheckin] = useState(false);
  const [hasSuitableHabit, setHasSuitableHabit] = useState(false);
  const [readiness, setReadiness] = useState<AreaReadiness[]>([]);

  const { earnXP, recordActivity } = useGamification(session);
  const localJourneyDay = typeof window !== 'undefined'
    ? Number(window.localStorage.getItem(`habitgame:journey-day:${session.user.id}`) ?? 0)
    : 0;
  const journeyDay = Number(
    session.user.user_metadata?.developer_journey_day
      ?? session.user.user_metadata?.journey_day
      ?? localJourneyDay,
  );
  const isDayOneStoryMode = forceDayOnePreview || ((islandNumber ?? 1) === 1 && journeyDay === 1);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      setContextStatus('loading');
      if (forceDayOnePreview) {
        setHasSuitableHabit(false);
        setRoutekeeperMode(true);
        setContextStatus('ready');
        return;
      }
      try {
        const [checkinResult, habitsResult] = await Promise.all([
          fetchCheckinsForUser(session.user.id, 1),
          listHabitsV2(),
        ]);
        if (cancelled) return;

        const latestCheckin = checkinResult.data?.[0] ?? null;
        const habits = habitsResult.data ?? [];
        const supportedAreas = deriveSupportedAreas(habits);
        const suitableHabit = hasSuitableRoutekeeperHabit(habits);
        setHasSuitableHabit(suitableHabit);
        setRoutekeeperMode(
          (islandNumber ?? 1) === 1 && (isDayOneStoryMode || !suitableHabit),
        );

        if (!latestCheckin) {
          setHasCheckin(false);
          setReadiness([]);
          setContextStatus('ready');
          return;
        }

        setHasCheckin(true);
        setReadiness(
          computeAreaReadiness({
            checkinScores: parseCheckinScoreMap(latestCheckin.scores),
            supportedAreas,
          }),
        );
        setContextStatus('ready');
      } catch {
        if (!cancelled) {
          setContextStatus('error');
        }
      }
    }

    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [session.user.id, islandNumber, isDayOneStoryMode, forceDayOnePreview]);

  const islandPlan = useMemo(() => getIslandContentPlan(islandNumber ?? 1), [islandNumber]);

  const offerableAreas = useMemo(() => {
    // No check-in data (e.g. load error): fall back to all areas so the player
    // can still add a habit.
    const adaptive = readiness.length === 0 ? [...ISLAND_RUN_LIFE_WHEEL_AREAS] : selectOfferableAreas(readiness);
    // Early islands lead with their fixed onboarding-curriculum area; later
    // islands keep the adaptive ordering.
    return orderAreasForIsland(islandNumber ?? 1, adaptive);
  }, [readiness, islandNumber]);
  const readinessByArea = useMemo(() => {
    const map = new Map<IslandRunLifeWheelArea, AreaReadiness>();
    for (const entry of readiness) {
      map.set(entry.area, entry);
    }
    return map;
  }, [readiness]);

  const handleLaunchCheckin = () => {
    window.dispatchEvent(new CustomEvent(ISLAND_RUN_LAUNCH_CHECKINS_EVENT));
  };

  const suggestedHabits = useMemo(() => {
    if (!area) return [];
    const habits = getSuggestedHabitsByLifeWheelArea(area);
    if (!feedbackEnergy || !feedbackTime || !feedbackStyle) return [];
    return rankSuggestedHabitsByFeedback(habits, {
      energy: feedbackEnergy,
      time: feedbackTime,
      style: feedbackStyle,
    }).slice(0, 3);
  }, [area, feedbackEnergy, feedbackTime, feedbackStyle]);

  const handleComeBackLater = () => {
    // Best-effort, non-blocking: capture the postponement as life-intake signal.
    void recordGameLifeIntake({
      userId: session.user.id,
      promptContext: 'habit_landmark',
      islandNumber: islandNumber ?? null,
      intakeStage: islandPlan.intakeStage,
      lifeWheelArea: area ?? null,
      state: 'skipped',
      payload: {
        had_checkin: hasCheckin,
        outcome: 'postponed_stop',
        selected_area: area,
        feedback: { energy: feedbackEnergy, time: feedbackTime, style: feedbackStyle },
      },
    });
    onComeBackLater?.();
  };

  const handleCreateRoutekeeperTinyAction = async () => {
    setIsSubmitting(true);
    setError(null);
    setRoutekeeperRewardLine(null);

    const selectedSignal = ROUTEKEEPER_SIGNAL_CHOICES.find((choice) => choice.id === routekeeperSignalId) ?? ROUTEKEEPER_SIGNAL_CHOICES[0];
    const result = await createAndCompleteRoutekeeperTinyAction({
      userId: session.user.id,
      action: selectedSignal.action,
    });

    if (!result.ok || !result.habit) {
      setError(`Could not relight the Routekeeper Steps right now (${result.message}).`);
      setIsSubmitting(false);
      return;
    }

    void recordGameLifeIntake({
      userId: session.user.id,
      promptContext: 'habit_landmark',
      islandNumber: islandNumber ?? null,
      intakeStage: islandPlan.intakeStage,
      lifeWheelArea: null,
      state: 'completed',
      linkedHabitId: result.habit.id,
      payload: {
        outcome: 'routekeeper_tiny_action_created_and_completed',
        signalId: selectedSignal.id,
        signalLabel: selectedSignal.label,
        action: selectedSignal.action,
        completion: result.completion,
      },
    });

    void recordCompassContribution({
      userId: session.user.id,
      islandNumber: islandNumber ?? 1,
      kind: 'habit',
      text: result.habit.title,
      linkedHabitId: result.habit.id,
    });

    const xpResult = await earnXP?.(XP_REWARDS.HABIT_COMPLETE, 'habit_complete', result.habit.id, 'Routekeeper tiny action');
    await recordActivity?.();
    const rewardLine = xpResult?.success ? `+${XP_REWARDS.HABIT_COMPLETE} XP` : null;
    setRoutekeeperRewardLine(rewardLine);
    const successMessage = rewardLine ? `${ROUTEKEEPER_SUCCESS_TITLE} ${rewardLine}` : ROUTEKEEPER_SUCCESS_TITLE;
    setDoneMessage(`${ROUTEKEEPER_SUCCESS_TITLE} ${ROUTEKEEPER_SUCCESS_BODY}`);
    setIsSubmitting(false);
    onComplete(successMessage);
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
      islandNumber: islandNumber ?? 1,
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gamificationProfileUpdated', {
          detail: { userId: session.user.id },
        }));
      }
    }

    void recordCompassContribution({
      userId: session.user.id,
      islandNumber: islandNumber ?? 1,
      kind: 'habit',
      text: ROUTEKEEPER_BREATH_HABIT_TITLE,
      linkedHabitId: routekeeperBreathHabit.id,
    });
    const xpResult = completion.data.wasAlreadyCompleted
      ? null
      : await earnXP?.(
        XP_REWARDS.HABIT_COMPLETE,
        'habit_complete',
        routekeeperBreathHabit.id,
        'Day 1 breathing ritual',
      );
    if (!completion.data.wasAlreadyCompleted) {
      await recordActivity?.();
    }
    setRoutekeeperRewardLine(
      xpResult?.success ? `${rewardLine} · +${XP_REWARDS.HABIT_COMPLETE} XP` : rewardLine,
    );

    return {
      ok: true,
      rewardLine: xpResult?.success
        ? `${rewardLine} · +${XP_REWARDS.HABIT_COMPLETE} XP`
        : rewardLine,
    };
  };

  const handleCreateHabit = async () => {
    if (!selectedHabit || !selectedSize || !timing) return;
    setIsSubmitting(true);
    setError(null);

    const result = await createIslandRunHabitFromLifePrompt({
      userId: session.user.id,
      selectedHabit,
      selectedSize,
      selectedTiming: timing,
    });

    if (!result.ok) {
      setError(`Could not save habit right now (${result.message}). You can still complete this stop.`);
      setIsSubmitting(false);
      return;
    }

    // Best-effort, non-blocking: capture the accepted habit as life-intake signal.
    void recordGameLifeIntake({
      userId: session.user.id,
      promptContext: 'habit_landmark',
      islandNumber: islandNumber ?? null,
      intakeStage: islandPlan.intakeStage,
      lifeWheelArea: selectedHabit.lifeWheelArea,
      state: 'completed',
      linkedHabitId: result.habit?.id ?? null,
      payload: {
        suggested_habit_id: selectedHabit.suggestedHabitId,
        size: selectedSize,
        timing,
        feedback: { energy: feedbackEnergy, time: feedbackTime, style: feedbackStyle },
      },
    });

    // Contribute this habit to the current Compass phase's spoke (best-effort).
    void recordCompassContribution({
      userId: session.user.id,
      islandNumber: islandNumber ?? 1,
      kind: 'habit',
      text: result.habit?.title ?? selectedHabit.title,
      linkedHabitId: result.habit?.id ?? null,
    });

    const successMessage = `✅ ${result.message}`;
    setDoneMessage(successMessage);
    setIsSubmitting(false);
    onComplete(successMessage);
  };

  return (
    <div className="island-hatchery-card">
      {!isDayOneStoryMode ? (
        <>
          <p className="island-stop-modal__copy"><strong>✅ Habit Landmark</strong></p>
          <p className="island-stop-modal__copy">A small action can change an island.</p>
        </>
      ) : null}

      {!area && contextStatus === 'loading' ? (
        <p className="island-stop-modal__copy">Reading your latest check-in…</p>
      ) : routekeeperMode && isDayOneStoryMode ? (
        <>
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
                <span className="day-one-routekeeper-intro__habit-icon" aria-hidden="true">🌬️</span>
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
        </>
      ) : routekeeperMode && !hasSuitableHabit ? (
        <>
          <p className="island-stop-modal__copy"><strong>Routekeeper Steps</strong></p>
          <p className="island-stop-modal__copy">{ROUTEKEEPER_BODY_COPY}</p>
          <p className="island-stop-modal__copy"><strong>{ROUTEKEEPER_FIRST_QUESTION}</strong></p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexDirection: 'column', alignItems: 'stretch' }}>
            {ROUTEKEEPER_SIGNAL_CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={`island-stop-modal__btn island-stop-modal__btn--action${routekeeperSignalId === choice.id ? ' island-stop-modal__btn--primary' : ''}`}
                onClick={() => setRoutekeeperSignalId(choice.id)}
                disabled={isSubmitting}
                style={{ textAlign: 'left' }}
              >
                <strong>{choice.label}:</strong> {choice.body}<br />
                <span style={{ opacity: 0.86 }}>Tiny anchor: {choice.action}</span>
              </button>
            ))}
          </div>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
              onClick={() => void handleCreateRoutekeeperTinyAction()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Relighting…' : 'Anchor this tiny action'}
            </button>
          </div>
          {doneMessage ? (
            <div className="island-stop-modal__completed-banner" role="status" style={{ marginTop: '0.75rem' }}>
              <strong>{ROUTEKEEPER_SUCCESS_TITLE}</strong><br />
              {ROUTEKEEPER_SUCCESS_BODY}
              {routekeeperRewardLine ? <><br /><span>{routekeeperRewardLine}</span></> : null}
            </div>
          ) : null}
        </>
      ) : !area && contextStatus === 'ready' && !hasCheckin ? (
        <>
          <p><strong>Let’s find your focus first.</strong></p>
          <p style={{ fontSize: 13, opacity: 0.9 }}>
            A quick Life Wheel check-in lets us point your tiny quest at the area that needs it most.
          </p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={handleLaunchCheckin}>
              Do a quick check-in
            </button>
          </div>
        </>
      ) : !area ? (
        <>
          <p><strong>Choose your next tiny quest.</strong> {offerableAreas.length < ISLAND_RUN_LIFE_WHEEL_AREAS.length ? 'These areas need the most love right now:' : 'Pick one life area:'}</p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {offerableAreas.map((choice) => {
              const meta = getLifeWheelAreaMeta(choice);
              const entry = readinessByArea.get(choice);
              return (
                <button key={choice} type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setArea(choice)}>
                  {meta.emoji} {choice}
                  {entry?.isWeak ? <span style={{ fontSize: 11, opacity: 0.85 }}> · needs focus</span> : null}
                </button>
              );
            })}
          </div>
        </>
      ) : !feedbackEnergy || !feedbackTime || !feedbackStyle ? (
        <>
          <p><strong>{area}</strong>: let us learn what feels easy first.</p>
          <p style={{ fontSize: 13, opacity: 0.9 }}>Quick feedback first — then suggestions get smarter.</p>
          {!feedbackEnergy ? (
            <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackEnergy('low')}>Low energy day</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackEnergy('medium')}>Medium energy</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackEnergy('high')}>High energy</button>
            </div>
          ) : null}
          {feedbackEnergy && !feedbackTime ? (
            <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackTime('under_2')}>Under 2 min</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackTime('two_to_five')}>2 to 5 min</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackTime('over_five')}>Over 5 min</button>
            </div>
          ) : null}
          {feedbackEnergy && feedbackTime && !feedbackStyle ? (
            <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackStyle('physical')}>Body / movement</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackStyle('mental')}>Calm / focus</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackStyle('planning')}>Planning / work</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setFeedbackStyle('social')}>Connection</button>
            </div>
          ) : null}
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => (feedbackStyle ? setFeedbackStyle(null) : feedbackTime ? setFeedbackTime(null) : feedbackEnergy ? setFeedbackEnergy(null) : setArea(null))}>
            Back
          </button>
        </>
      ) : !selectedHabit ? (
        <>
          <p><strong>{area}</strong>: here are better-fit starter habits based on your feedback.</p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexDirection: 'column', alignItems: 'stretch' }}>
            {suggestedHabits.map((habit) => (
              <button
                key={habit.suggestedHabitId}
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action"
                onClick={() => setSelectedHabit(habit)}
                style={{ textAlign: 'left' }}
              >
                <div><strong>{habit.emoji} {habit.title}</strong></div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Tiny: {habit.tinyVersion}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Default: {habit.defaultTiming}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Cue: {habit.cueSuggestions[0] ?? 'No cue suggestion'}</div>
              </button>
            ))}
          </div>
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => setArea(null)}>
            Back
          </button>
        </>
      ) : !selectedSize || !timing ? (
        <>
          <p><strong>Plant this habit.</strong> Tune the quest size and timing.</p>
          <p><strong>{selectedHabit.emoji} {selectedHabit.title}</strong></p>
          {!selectedSize ? (
            <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {HABIT_SIZES.map((size) => (
                <button key={size} type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setSelectedSize(size)}>
                  {size}
                </button>
              ))}
            </div>
          ) : null}

          {selectedSize ? (
            <>
              <p style={{ marginTop: '0.5rem' }}>
                Version preview:{' '}
                <strong>{selectedSize === 'Tiny' ? selectedHabit.tinyVersion : selectedSize === 'Normal' ? selectedHabit.normalVersion : selectedHabit.stretchVersion}</strong>
              </p>
              <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
                {ISLAND_RUN_HABIT_TIMING_CHOICES.map((choice) => (
                  <button key={choice} type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setTiming(choice)}>
                    {choice}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <button
            type="button"
            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
            onClick={() => (timing ? setTiming(null) : selectedSize ? setSelectedSize(null) : setSelectedHabit(null))}
          >
            Back
          </button>
        </>
      ) : (
        <>
          <p>
            Create this quest habit: <strong>{selectedHabit.emoji} {selectedHabit.title}</strong>
          </p>
          <p>
            {selectedSize} · {timing}
          </p>
          <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
              onClick={() => void handleCreateHabit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Planting…' : 'Plant this habit & Complete Stop'}
            </button>
            <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" onClick={() => setTiming(null)} disabled={isSubmitting}>
              Back
            </button>
          </div>
        </>
      )}

      {error ? <p className="journal__status journal__status--error" style={{ marginTop: 10 }}>{error}</p> : null}
      {doneMessage ? <p style={{ marginTop: 10 }}>{doneMessage}</p> : null}

      {!isDayOneStoryMode ? (
        <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={handleComeBackLater}>
            Come back later
          </button>
        </div>
      ) : null}
    </div>
  );
}
