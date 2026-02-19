import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getOrCreateHabitAnalysisSession,
  listHabitExperimentDays,
  logHabitExperimentDay,
  saveHabitAnalysisCosts,
  saveHabitAnalysisDesires,
  saveHabitAnalysisProtocol,
  saveHabitAnalysisMobileDraft,
  saveHabitAnalysisProgress,
  saveHabitAnalysisRange,
  saveHabitDiagnosis,
  saveHabitReadiness,
  startHabitExperiment,
  getHabitAnalysisMobileDraft,
  type HabitAnalysisGoalType,
  type HabitDiagnosis,
  type HabitExperimentDayInput,
  type HabitAnalysisMobileDraft,
} from '../../services/habitImprovementAnalysis';

const DESIRE_OPTIONS = [
  'comfort_relief',
  'pleasure_fun',
  'connection',
  'control_certainty',
  'status_validation',
  'progress_mastery',
  'rest_recovery',
  'novelty_stimulation',
  'safety_avoid_pain',
] as const;

const COST_OPTIONS = [
  'restlessness',
  'anxiety',
  'frustration',
  'burnout',
  'numbness',
  'time_loss',
  'sleep_cost',
  'money_cost',
  'confidence_cost',
] as const;

type HabitImprovementAnalysisModalProps = {
  isOpen: boolean;
  userId: string;
  habitId: string;
  habitName: string;
  onClose: () => void;
};

function buildDefaultExperimentDay(dayIndex: number): HabitExperimentDayInput {
  return {
    dayIndex,
    date: new Date().toISOString().slice(0, 10),
    followedProtocol: null,
    protocolDifficulty: null,
    energyLevel: null,
    underPain: 0,
    overPain: 0,
    netEffect: 'same',
    winNote: '',
    note: '',
  };
}

export function HabitImprovementAnalysisModal({
  isOpen,
  userId,
  habitId,
  habitName,
  onClose,
}: HabitImprovementAnalysisModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [goalType, setGoalType] = useState<HabitAnalysisGoalType>('stabilize');
  const [primaryDesire, setPrimaryDesire] = useState<string>('progress_mastery');
  const [secondaryDesire, setSecondaryDesire] = useState<string>('');
  const [underPain, setUnderPain] = useState<string[]>([]);
  const [overPain, setOverPain] = useState<string[]>([]);
  const [subscriptionCosts, setSubscriptionCosts] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [rangeUnit, setRangeUnit] = useState('times/week');
  const [rangeMin, setRangeMin] = useState('1');
  const [rangeMax, setRangeMax] = useState('5');
  const [tooLittle, setTooLittle] = useState('');
  const [tooMuch, setTooMuch] = useState('');

  const [diagnosis, setDiagnosis] = useState<HabitDiagnosis>('swing');
  const [ifTrigger, setIfTrigger] = useState('');
  const [thenAction, setThenAction] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('10');
  const [guardrail, setGuardrail] = useState('');
  const [friction, setFriction] = useState('');
  const [ease, setEase] = useState('');
  const [replacementReward, setReplacementReward] = useState('');

  const [desireMet, setDesireMet] = useState(3);
  const [costReduced, setCostReduced] = useState(3);
  const [badDayOk, setBadDayOk] = useState(3);
  const [reboundSafe, setReboundSafe] = useState(3);
  const [identityFit, setIdentityFit] = useState(3);
  const [experimentStarted, setExperimentStarted] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const [experimentDays, setExperimentDays] = useState<Record<number, HabitExperimentDayInput>>({});
  const [todayFollowed, setTodayFollowed] = useState<boolean | null>(null);
  const [todayProtocolDifficulty, setTodayProtocolDifficulty] = useState<number | null>(null);
  const [todayEnergyLevel, setTodayEnergyLevel] = useState<number | null>(null);
  const [todayUnderPain, setTodayUnderPain] = useState(0);
  const [todayOverPain, setTodayOverPain] = useState(0);
  const [todayNetEffect, setTodayNetEffect] = useState<'better' | 'same' | 'worse'>('same');
  const [todayWinNote, setTodayWinNote] = useState('');
  const [todayNote, setTodayNote] = useState('');
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState<HabitAnalysisMobileDraft | null>(null);
  const draftHydrationRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setSessionId(null);
      setError(null);
      setSuccess(null);
      setExperimentStarted(false);
      setSelectedDayIndex(1);
      setExperimentDays({});
      setDraftSaveState('idle');
      setHasLoadedDraft(false);
      setLoadedDraft(null);
      draftHydrationRef.current = false;
      return;
    }

    let mounted = true;
    setLoading(true);
    void getOrCreateHabitAnalysisSession({ userId, habitId, goalType }).then((result) => {
      if (!mounted) return;
      setLoading(false);
      if (result.tableMissing) {
        setError('Habit analysis tables are not available yet. Run the latest migration first.');
        return;
      }
      if (result.error || !result.session) {
        setError(result.error ?? 'Unable to start analysis session.');
        return;
      }
      setSessionId(result.session.id);
      setExperimentStarted(result.session.status === 'active' || result.session.status === 'completed');
      setSelectedDayIndex(Math.min((result.session.last_logged_day_index || 0) + 1, 7));
      setStep(Math.max(0, Math.min(result.session.current_step ?? 0, 4)));
      setSuccess(result.session.current_step > 0 ? `Resumed your draft at step ${result.session.current_step + 1}.` : null);
    });

    return () => {
      mounted = false;
    };
  }, [goalType, habitId, isOpen, userId]);

  useEffect(() => {
    if (!sessionId || step !== 4) {
      return;
    }

    let mounted = true;
    void listHabitExperimentDays(sessionId).then((result) => {
      if (!mounted || result.error) {
        return;
      }

      const mapped = result.days.reduce<Record<number, HabitExperimentDayInput>>((acc, day) => {
        acc[day.dayIndex] = day;
        return acc;
      }, {});

      setExperimentDays(mapped);
      setExperimentStarted(result.days.length > 0);
      if (result.days.length > 0) {
        const highestLogged = result.days
          .filter((day) => day.followedProtocol !== null || day.note)
          .reduce((max, day) => Math.max(max, day.dayIndex), 0);
        if (highestLogged > 0) {
          setSelectedDayIndex(Math.min(highestLogged + 1, 7));
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [sessionId, step]);

  useEffect(() => {
    if (!sessionId || step !== 4) {
      return;
    }

    let mounted = true;
    setHasLoadedDraft(false);
    void getHabitAnalysisMobileDraft(sessionId).then((result) => {
      if (!mounted) return;
      if (result.error) {
        setDraftSaveState('error');
        setError(result.error);
        return;
      }

      setLoadedDraft(result.draft ?? null);
      if (result.draft) {
        draftHydrationRef.current = true;
        setSelectedDayIndex(result.draft.dayIndex);
        setTodayFollowed(result.draft.followedProtocol);
        setTodayProtocolDifficulty(result.draft.protocolDifficulty);
        setTodayEnergyLevel(result.draft.energyLevel);
        setTodayUnderPain(result.draft.underPain);
        setTodayOverPain(result.draft.overPain);
        setTodayNetEffect(result.draft.netEffect);
        setTodayWinNote(result.draft.winNote);
        setTodayNote(result.draft.note);
      }
      setHasLoadedDraft(true);
    });

    return () => {
      mounted = false;
    };
  }, [sessionId, step]);

  useEffect(() => {
    const selectedDay = experimentDays[selectedDayIndex] ?? buildDefaultExperimentDay(selectedDayIndex);
    const shouldUseDraft = loadedDraft && loadedDraft.dayIndex === selectedDayIndex && !experimentDays[selectedDayIndex];

    if (shouldUseDraft) {
      setTodayFollowed(loadedDraft.followedProtocol);
      setTodayProtocolDifficulty(loadedDraft.protocolDifficulty);
      setTodayEnergyLevel(loadedDraft.energyLevel);
      setTodayUnderPain(loadedDraft.underPain);
      setTodayOverPain(loadedDraft.overPain);
      setTodayNetEffect(loadedDraft.netEffect);
      setTodayWinNote(loadedDraft.winNote);
      setTodayNote(loadedDraft.note);
      return;
    }

    setTodayFollowed(selectedDay.followedProtocol ?? null);
    setTodayProtocolDifficulty(selectedDay.protocolDifficulty ?? null);
    setTodayEnergyLevel(selectedDay.energyLevel ?? null);
    setTodayUnderPain(selectedDay.underPain ?? 0);
    setTodayOverPain(selectedDay.overPain ?? 0);
    setTodayNetEffect(selectedDay.netEffect ?? 'same');
    setTodayWinNote(selectedDay.winNote ?? '');
    setTodayNote(selectedDay.note ?? '');
  }, [experimentDays, loadedDraft, selectedDayIndex]);

  useEffect(() => {
    if (!sessionId || step !== 4 || !hasLoadedDraft) {
      return;
    }

    if (draftHydrationRef.current) {
      draftHydrationRef.current = false;
      return;
    }

    setDraftSaveState('saving');
    const timeoutId = window.setTimeout(() => {
      void saveHabitAnalysisMobileDraft(sessionId, {
        dayIndex: selectedDayIndex,
        followedProtocol: todayFollowed,
        protocolDifficulty: todayProtocolDifficulty,
        energyLevel: todayEnergyLevel,
        underPain: todayUnderPain,
        overPain: todayOverPain,
        netEffect: todayNetEffect,
        winNote: todayWinNote,
        note: todayNote,
      }).then((result) => {
        if (result.error) {
          setDraftSaveState('error');
          return;
        }
        setDraftSaveState('saved');
      });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    hasLoadedDraft,
    selectedDayIndex,
    sessionId,
    step,
    todayFollowed,
    todayNetEffect,
    todayNote,
    todayEnergyLevel,
    todayOverPain,
    todayProtocolDifficulty,
    todayUnderPain,
    todayWinNote,
  ]);

  const readinessAverage = useMemo(() => {
    return (desireMet + costReduced + badDayOk + reboundSafe + identityFit) / 5;
  }, [badDayOk, costReduced, desireMet, identityFit, reboundSafe]);

  const trafficLight = readinessAverage >= 4 ? 'green' : readinessAverage >= 3 ? 'yellow' : 'red';

  const highestLoggedDay = useMemo(() => {
    return Object.values(experimentDays).reduce((max, day) => {
      const hasEntry = day.followedProtocol !== null || day.protocolDifficulty !== null || Boolean(day.note);
      return hasEntry ? Math.max(max, day.dayIndex) : max;
    }, 0);
  }, [experimentDays]);

  const isExperimentCompleted = highestLoggedDay >= 7;

  const toggleTag = (list: string[], setList: (value: string[]) => void, value: string) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
      return;
    }
    setList([...list, value]);
  };

  const requireSession = () => {
    if (!sessionId) {
      setError('Session is not ready yet.');
      return null;
    }
    return sessionId;
  };

  const validateCurrentStep = () => {
    if (step === 0) {
      if (!primaryDesire) {
        return 'Choose a primary desire to continue.';
      }

      if (secondaryDesire && secondaryDesire === primaryDesire) {
        return 'Secondary desire must be different from your primary desire.';
      }
    }

    if (step === 2) {
      const minValue = Number(rangeMin);
      const maxValue = Number(rangeMax);
      if (Number.isFinite(minValue) && Number.isFinite(maxValue) && minValue > maxValue) {
        return 'Min threshold must be less than or equal to max threshold.';
      }
    }

    if (step === 3) {
      if (!ifTrigger.trim() || !thenAction.trim()) {
        return 'Please fill in both the trigger and action to create a usable protocol.';
      }
    }

    if (step === 4) {
      if (selectedDayIndex > highestLoggedDay + 1) {
        return 'Please complete days in order so your trend stays accurate.';
      }

      if (todayFollowed === null) {
        return 'Please select whether you followed the protocol today.';
      }

      if (todayProtocolDifficulty === null) {
        return 'Please rate today\'s protocol difficulty.';
      }

      if (!Number.isFinite(todayUnderPain) || todayUnderPain < 0 || todayUnderPain > 3) {
        return 'Under-pain must be between 0 and 3.';
      }

      if (todayEnergyLevel === null || !Number.isFinite(todayEnergyLevel) || todayEnergyLevel < 1 || todayEnergyLevel > 5) {
        return 'Energy level must be between 1 and 5.';
      }

      if (!Number.isFinite(todayOverPain) || todayOverPain < 0 || todayOverPain > 3) {
        return 'Over-pain must be between 0 and 3.';
      }

      if (todayNetEffect === 'better' && !todayWinNote.trim()) {
        return 'Capture one quick win when the day felt better.';
      }

      if (todayWinNote.trim().length > 160) {
        return 'Quick win must be 160 characters or less.';
      }

      if (todayNote.trim().length > 240) {
        return 'Quick note must be 240 characters or less.';
      }
    }

    return null;
  };

  const saveCurrentStep = async () => {
    const id = requireSession();
    if (!id) return;

    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (step === 0) {
      const result = await saveHabitAnalysisDesires(id, [
        { desireKey: primaryDesire, isPrimary: true },
        ...(secondaryDesire ? [{ desireKey: secondaryDesire, isPrimary: false }] : []),
      ]);
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      const progressResult = await saveHabitAnalysisProgress(id, 1);
      if (progressResult.error) {
        setError(progressResult.error);
        return;
      }
      setSuccess('Desires saved.');
      setStep(1);
      return;
    }

    if (step === 1) {
      const result = await saveHabitAnalysisCosts(id, {
        underPainTags: underPain,
        overPainTags: overPain,
        subscriptionFeeTags: subscriptionCosts,
        notes,
      });
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      const progressResult = await saveHabitAnalysisProgress(id, 2);
      if (progressResult.error) {
        setError(progressResult.error);
        return;
      }
      setSuccess('Cost map saved.');
      setStep(2);
      return;
    }

    if (step === 2) {
      const result = await saveHabitAnalysisRange(id, {
        unit: rangeUnit,
        minValue: Number(rangeMin) || null,
        maxValue: Number(rangeMax) || null,
        tooLittleFeelsLike: tooLittle,
        tooMuchCostsLike: tooMuch,
      });
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      const progressResult = await saveHabitAnalysisProgress(id, 3);
      if (progressResult.error) {
        setError(progressResult.error);
        return;
      }
      setSuccess('Right-size range saved.');
      setStep(3);
      return;
    }

    if (step === 3) {
      const protocolResult = await saveHabitAnalysisProtocol(id, {
        ifTrigger,
        thenAction,
        durationMinutes: Number(durationMinutes) || null,
        guardrail,
        friction,
        ease,
        replacementReward,
      });

      if (protocolResult.error) {
        setLoading(false);
        setError(protocolResult.error);
        return;
      }

      const diagnosisResult = await saveHabitDiagnosis(id, diagnosis);
      if (diagnosisResult.error) {
        setLoading(false);
        setError(diagnosisResult.error);
        return;
      }

      const readinessResult = await saveHabitReadiness(id, {
        desireMet,
        costReduced,
        badDayOk,
        reboundSafe,
        identityFit,
        trafficLight,
      });

      if (readinessResult.error) {
        setLoading(false);
        setError(readinessResult.error);
        return;
      }

      const experimentResult = await startHabitExperiment(id);
      setLoading(false);
      if (experimentResult.error) {
        setError(experimentResult.error);
        return;
      }
      const progressResult = await saveHabitAnalysisProgress(id, 4);
      if (progressResult.error) {
        setError(progressResult.error);
        return;
      }
      setExperimentStarted(true);
      setSuccess('Protocol saved and 7-day experiment started.');
      setStep(4);
      return;
    }

    if (step === 4) {
      const selectedDay = experimentDays[selectedDayIndex] ?? buildDefaultExperimentDay(selectedDayIndex);
      const result = await logHabitExperimentDay(id, {
        dayIndex: selectedDayIndex,
        date: selectedDay.date,
        followedProtocol: todayFollowed,
        protocolDifficulty: todayProtocolDifficulty,
        energyLevel: todayEnergyLevel,
        underPain: todayUnderPain,
        overPain: todayOverPain,
        netEffect: todayNetEffect,
        note: todayNote,
        winNote: todayWinNote,
      });
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }

      const updatedDay: HabitExperimentDayInput = {
        dayIndex: selectedDayIndex,
        date: selectedDay.date,
        followedProtocol: todayFollowed,
        protocolDifficulty: todayProtocolDifficulty,
        energyLevel: todayEnergyLevel,
        underPain: todayUnderPain,
        overPain: todayOverPain,
        netEffect: todayNetEffect,
        winNote: todayWinNote,
        note: todayNote,
      };

      setExperimentDays((current) => ({
        ...current,
        [selectedDayIndex]: updatedDay,
      }));
      const draftResult = await saveHabitAnalysisMobileDraft(id, null);
      if (draftResult.error) {
        setDraftSaveState('error');
      } else {
        setDraftSaveState('idle');
      }
      const nextDayIndex = Math.min(selectedDayIndex + 1, 7);
      setSelectedDayIndex(nextDayIndex);
      setSuccess(
        selectedDayIndex === 7
          ? 'Day 7 saved. Experiment complete — great work showing up for the full week.'
          : `Day ${selectedDayIndex} check-in saved.`,
      );
      return;
    }

    setLoading(false);
  };

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="habit-analysis-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="habit-analysis-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Habit improvement analysis"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="habit-analysis-modal__header">
          <div>
            <p className="habit-analysis-modal__eyebrow">Deep Fix</p>
            <h3>Habit improvement analysis: {habitName}</h3>
          </div>
          <button type="button" onClick={onClose} className="habit-analysis-modal__close">Close</button>
        </header>

        <p className="habit-analysis-modal__step">Step {step + 1} of 5</p>
        <div className="habit-analysis-modal__progress" aria-hidden="true">
          <span style={{ width: `${((step + 1) / 5) * 100}%` }} />
        </div>
        <ol className="habit-analysis-modal__step-dots" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <li
              key={`step-dot-${index + 1}`}
              className={index <= step ? 'is-complete' : ''}
            />
          ))}
        </ol>

        {step === 0 ? (
          <div className="habit-analysis-modal__section">
            <label>
              Goal type
              <select value={goalType} onChange={(event) => setGoalType(event.target.value as HabitAnalysisGoalType)}>
                <option value="reduce">Reduce</option>
                <option value="increase">Increase</option>
                <option value="replace">Replace</option>
                <option value="stabilize">Stabilize</option>
              </select>
            </label>
            <label>
              Primary desire
              <select value={primaryDesire} onChange={(event) => setPrimaryDesire(event.target.value)}>
                {DESIRE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Secondary desire (optional)
              <select value={secondaryDesire} onChange={(event) => setSecondaryDesire(event.target.value)}>
                <option value="">None</option>
                {DESIRE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="habit-analysis-modal__section">
            <p>Under-pain tags</p>
            <div className="habit-analysis-modal__chips">
              {COST_OPTIONS.map((option) => (
                <button
                  key={`under-${option}`}
                  type="button"
                  className={underPain.includes(option) ? 'is-active' : ''}
                  onClick={() => toggleTag(underPain, setUnderPain, option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <p>Over-pain tags</p>
            <div className="habit-analysis-modal__chips">
              {COST_OPTIONS.map((option) => (
                <button
                  key={`over-${option}`}
                  type="button"
                  className={overPain.includes(option) ? 'is-active' : ''}
                  onClick={() => toggleTag(overPain, setOverPain, option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <p>Subscription fee tags</p>
            <div className="habit-analysis-modal__chips">
              {['attention', 'time', 'sleep', 'money', 'health', 'relationships'].map((option) => (
                <button
                  key={`sub-${option}`}
                  type="button"
                  className={subscriptionCosts.includes(option) ? 'is-active' : ''}
                  onClick={() => toggleTag(subscriptionCosts, setSubscriptionCosts, option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <label>
              Notes
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="habit-analysis-modal__section">
            <label>
              Unit
              <input value={rangeUnit} onChange={(event) => setRangeUnit(event.target.value)} />
            </label>
            <label>
              Too little threshold (min)
              <input type="number" value={rangeMin} onChange={(event) => setRangeMin(event.target.value)} />
            </label>
            <label>
              Too much threshold (max)
              <input type="number" value={rangeMax} onChange={(event) => setRangeMax(event.target.value)} />
            </label>
            <label>
              Below min feels like
              <input value={tooLittle} onChange={(event) => setTooLittle(event.target.value)} />
            </label>
            <label>
              Above max costs like
              <input value={tooMuch} onChange={(event) => setTooMuch(event.target.value)} />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="habit-analysis-modal__section">
            <label>
              Diagnosis
              <select value={diagnosis} onChange={(event) => setDiagnosis(event.target.value as HabitDiagnosis)}>
                <option value="under">Under</option>
                <option value="over">Over</option>
                <option value="swing">Swing</option>
              </select>
            </label>
            <label>
              If trigger happens…
              <input value={ifTrigger} onChange={(event) => setIfTrigger(event.target.value)} />
            </label>
            <label>
              Then I will…
              <input value={thenAction} onChange={(event) => setThenAction(event.target.value)} />
            </label>
            <label>
              Duration (minutes)
              <input type="number" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} />
            </label>
            <label>
              Guardrail
              <input value={guardrail} onChange={(event) => setGuardrail(event.target.value)} />
            </label>
            <label>
              Friction
              <input value={friction} onChange={(event) => setFriction(event.target.value)} />
            </label>
            <label>
              Ease
              <input value={ease} onChange={(event) => setEase(event.target.value)} />
            </label>
            <label>
              Replacement reward
              <input value={replacementReward} onChange={(event) => setReplacementReward(event.target.value)} />
            </label>

            <div className="habit-analysis-modal__score-grid">
              <label>
                Desire met
                <input type="range" min={1} max={5} value={desireMet} onChange={(event) => setDesireMet(Number(event.target.value))} />
              </label>
              <label>
                Cost reduced
                <input type="range" min={1} max={5} value={costReduced} onChange={(event) => setCostReduced(Number(event.target.value))} />
              </label>
              <label>
                Works on bad days
                <input type="range" min={1} max={5} value={badDayOk} onChange={(event) => setBadDayOk(Number(event.target.value))} />
              </label>
              <label>
                Avoids rebound
                <input type="range" min={1} max={5} value={reboundSafe} onChange={(event) => setReboundSafe(Number(event.target.value))} />
              </label>
              <label>
                Identity fit
                <input type="range" min={1} max={5} value={identityFit} onChange={(event) => setIdentityFit(Number(event.target.value))} />
              </label>
            </div>
            <p className={`habit-analysis-modal__traffic habit-analysis-modal__traffic--${trafficLight}`}>
              Readiness: {trafficLight.toUpperCase()} ({readinessAverage.toFixed(1)}/5)
            </p>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="habit-analysis-modal__section">
            <p>
              7-day experiment is{' '}
              {isExperimentCompleted ? 'completed' : experimentStarted ? 'active' : 'not started'}.
            </p>
            <div className="habit-analysis-modal__day-picker" role="tablist" aria-label="Experiment day picker">
              {Array.from({ length: 7 }, (_, index) => {
                const dayIndex = index + 1;
                const day = experimentDays[dayIndex];
                const isLogged = Boolean(day && (day.followedProtocol !== null || day.protocolDifficulty !== null || day.note));
                return (
                  <button
                    key={`day-${dayIndex}`}
                    type="button"
                    role="tab"
                    aria-selected={selectedDayIndex === dayIndex}
                    className={selectedDayIndex === dayIndex ? 'is-active' : ''}
                    onClick={() => setSelectedDayIndex(dayIndex)}
                    disabled={dayIndex > highestLoggedDay + 1}
                  >
                    Day {dayIndex}{isLogged ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
            <p className="habit-analysis-modal__day-help">
              Logging Day {selectedDayIndex}.
              {selectedDayIndex > highestLoggedDay + 1
                ? ' Complete prior days first.'
                : ' Keep entries chronological for cleaner insights.'}
            </p>
            {hasLoadedDraft && draftSaveState !== 'idle' ? (
              <p className={`habit-analysis-modal__draft-status habit-analysis-modal__draft-status--${draftSaveState}`}>
                {draftSaveState === 'saving' ? 'Saving mobile draft…' : null}
                {draftSaveState === 'saved' ? 'Draft saved' : null}
                {draftSaveState === 'error' ? 'Draft not saved yet. Keep going—manual save still works.' : null}
              </p>
            ) : null}
            <label>
              Followed protocol today?
              <div className="habit-analysis-modal__binary-toggle" role="group" aria-label="Followed protocol today">
                <button
                  type="button"
                  className={todayFollowed === true ? 'is-active' : ''}
                  aria-pressed={todayFollowed === true}
                  onClick={() => setTodayFollowed(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={todayFollowed === false ? 'is-active' : ''}
                  aria-pressed={todayFollowed === false}
                  onClick={() => setTodayFollowed(false)}
                >
                  No
                </button>
              </div>
            </label>
            <label>
              Protocol difficulty (1 easy, 5 hard)
              <input
                type="range"
                min={1}
                max={5}
                value={todayProtocolDifficulty ?? 3}
                onChange={(event) => setTodayProtocolDifficulty(Number(event.target.value))}
              />
              <span className="habit-analysis-modal__input-help">
                {todayProtocolDifficulty === null
                  ? 'Tap the slider to set a difficulty score.'
                  : `Difficulty: ${todayProtocolDifficulty}/5`}
              </span>
            </label>
            <label>
              Energy level (1 depleted, 5 energized)
              <input
                type="range"
                min={1}
                max={5}
                value={todayEnergyLevel ?? 3}
                onChange={(event) => setTodayEnergyLevel(Number(event.target.value))}
              />
              <span className="habit-analysis-modal__input-help">
                {todayEnergyLevel === null
                  ? 'Tap the slider to set your energy level.'
                  : `Energy level: ${todayEnergyLevel}/5`}
              </span>
            </label>
            <label>
              Under-pain (0-3)
              <input type="number" min={0} max={3} value={todayUnderPain} onChange={(event) => setTodayUnderPain(Number(event.target.value))} />
            </label>
            <label>
              Over-pain (0-3)
              <input type="number" min={0} max={3} value={todayOverPain} onChange={(event) => setTodayOverPain(Number(event.target.value))} />
            </label>
            <label>
              Net effect
              <div className="habit-analysis-modal__binary-toggle habit-analysis-modal__binary-toggle--triple" role="group" aria-label="Net effect">
                {(['better', 'same', 'worse'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={todayNetEffect === value ? 'is-active' : ''}
                    aria-pressed={todayNetEffect === value}
                    onClick={() => setTodayNetEffect(value)}
                  >
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Quick win {todayNetEffect === 'better' ? '(required)' : '(optional)'}
              <input
                value={todayWinNote}
                onChange={(event) => setTodayWinNote(event.target.value)}
                maxLength={160}
                placeholder="What helped today?"
              />
              <span className="habit-analysis-modal__input-help">{todayWinNote.trim().length}/160</span>
            </label>
            <label>
              Quick note (optional)
              <textarea value={todayNote} onChange={(event) => setTodayNote(event.target.value)} rows={2} maxLength={240} />
              <span className="habit-analysis-modal__input-help">{todayNote.trim().length}/240</span>
            </label>
          </div>
        ) : null}

        {error ? <p className="habit-analysis-modal__error">{error}</p> : null}
        {success ? <p className="habit-analysis-modal__success">{success}</p> : null}

        <footer className="habit-analysis-modal__footer">
          <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || loading}>
            Back
          </button>
          <button type="button" onClick={() => void saveCurrentStep()} disabled={loading || !sessionId}>
            {step === 4 ? (selectedDayIndex === 7 ? 'Finish experiment' : 'Save check-in') : 'Save & continue'}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
