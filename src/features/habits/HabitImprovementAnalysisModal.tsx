import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getOrCreateHabitAnalysisSession,
  logHabitExperimentDay,
  saveHabitAnalysisCosts,
  saveHabitAnalysisDesires,
  saveHabitAnalysisProtocol,
  saveHabitAnalysisRange,
  saveHabitDiagnosis,
  saveHabitReadiness,
  startHabitExperiment,
  type HabitAnalysisGoalType,
  type HabitDiagnosis,
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
  const [todayFollowed, setTodayFollowed] = useState<boolean | null>(null);
  const [todayUnderPain, setTodayUnderPain] = useState(0);
  const [todayOverPain, setTodayOverPain] = useState(0);
  const [todayNetEffect, setTodayNetEffect] = useState<'better' | 'same' | 'worse'>('same');

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setSessionId(null);
      setError(null);
      setSuccess(null);
      setExperimentStarted(false);
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
    });

    return () => {
      mounted = false;
    };
  }, [goalType, habitId, isOpen, userId]);

  const readinessAverage = useMemo(() => {
    return (desireMet + costReduced + badDayOk + reboundSafe + identityFit) / 5;
  }, [badDayOk, costReduced, desireMet, identityFit, reboundSafe]);

  const trafficLight = readinessAverage >= 4 ? 'green' : readinessAverage >= 3 ? 'yellow' : 'red';

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

  const saveCurrentStep = async () => {
    const id = requireSession();
    if (!id) return;

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
      setExperimentStarted(true);
      setSuccess('Protocol saved and 7-day experiment started.');
      setStep(4);
      return;
    }

    if (step === 4) {
      const now = new Date().toISOString().slice(0, 10);
      const dayNumber = 1;
      const result = await logHabitExperimentDay(id, {
        dayIndex: dayNumber,
        date: now,
        followedProtocol: todayFollowed,
        underPain: todayUnderPain,
        overPain: todayOverPain,
        netEffect: todayNetEffect,
      });
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess('Day 1 check-in saved.');
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
            <p>7-day experiment is {experimentStarted ? 'active' : 'not started'}.</p>
            <label>
              Followed protocol today?
              <select
                value={todayFollowed === null ? 'unset' : todayFollowed ? 'yes' : 'no'}
                onChange={(event) => {
                  if (event.target.value === 'yes') setTodayFollowed(true);
                  else if (event.target.value === 'no') setTodayFollowed(false);
                  else setTodayFollowed(null);
                }}
              >
                <option value="unset">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
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
              <select value={todayNetEffect} onChange={(event) => setTodayNetEffect(event.target.value as 'better' | 'same' | 'worse')}>
                <option value="better">Better</option>
                <option value="same">Same</option>
                <option value="worse">Worse</option>
              </select>
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
            {step === 4 ? 'Save check-in' : 'Save & continue'}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
