import { useState, useEffect } from 'react';
import { AI_FEATURE_ICON } from '../../constants/ai';
import { generateHabitSuggestion } from '../../services/habitAiSuggestions';
import { EnvironmentStrengthCard } from '../environment/components';
import { computeEnvironmentAudit } from '../environment/environmentAudit';
import { buildEnvironmentRecommendations } from '../environment/environmentRecommendations';
import {
  environmentContextToJson,
  normalizeEnvironmentContext,
  type EnvironmentContextV1,
} from '../environment/environmentSchema';
import './HabitWizard.css';

export interface ScheduleDraft {
  choice: 'every_day' | 'specific_days' | 'x_per_week';
  timesPerWeek?: number;
  days?: number[];
}

export interface HabitWizardDraft {
  title: string;
  emoji: string | null;
  intent?: 'build' | 'break';
  type: 'boolean' | 'quantity' | 'duration';
  targetValue?: number | null;
  targetUnit?: string | null;
  schedule: ScheduleDraft;
  remindersEnabled?: boolean;
  reminderTimes?: string[];
  duration?: {
    mode: 'none' | 'fixed_window';
    value?: number;
    unit?: 'days' | 'weeks' | 'months';
    onEnd?: 'pause' | 'deactivate';
  };
  habitEnvironment?: string;
  environmentContext?: EnvironmentContextV1 | null;
  environmentScore?: number | null;
  environmentRiskTags?: string[];
  doneIshThreshold?: number;
  booleanPartialEnabled?: boolean;
  scalePlanEnabled?: boolean;
  stageLabels?: {
    seed: string;
    minimum: string;
    standard: string;
  };
  stageCompletionPercents?: {
    seed: number;
    minimum: number;
    standard: number;
  };
  habitId?: string;
}

export type HabitWizardProps = {
  onCancel?: () => void;
  onCompleteDraft?: (draft: HabitWizardDraft) => void;
  initialDraft?: HabitWizardDraft;
};

type ScheduleChoice = 'every_day' | 'specific_days' | 'x_per_week';

export function HabitWizard({ onCancel, onCompleteDraft, initialDraft }: HabitWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const isEditMode = Boolean(initialDraft?.habitId);

  const [emoji, setEmoji] = useState('');
  const [title, setTitle] = useState('');
  const [intent, setIntent] = useState<'build' | 'break'>('build');
  const [type, setType] = useState<'boolean' | 'quantity' | 'duration'>('boolean');

  const [scheduleChoice, setScheduleChoice] = useState<ScheduleChoice>('every_day');
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [specificDays, setSpecificDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [targetValue, setTargetValue] = useState<number | undefined>(undefined);
  const [targetUnit, setTargetUnit] = useState('');

  const [durationMode, setDurationMode] = useState<'none' | 'fixed_window'>('none');
  const [durationValue, setDurationValue] = useState(4);
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [durationOnEnd, setDurationOnEnd] = useState<'pause' | 'deactivate'>('pause');

  const [habitEnvironment, setHabitEnvironment] = useState('');
  const [environmentContext, setEnvironmentContext] = useState<EnvironmentContextV1 | null>(null);

  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');

  const [doneIshThreshold, setDoneIshThreshold] = useState(80);
  const [booleanPartialEnabled, setBooleanPartialEnabled] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [scalePlanEnabled, setScalePlanEnabled] = useState(true);
  const [seedStageLabel, setSeedStageLabel] = useState('Quick fallback');
  const [minimumStageLabel, setMinimumStageLabel] = useState('Smaller version');
  const [standardStageLabel, setStandardStageLabel] = useState('Full version');
  const [seedStagePercent, setSeedStagePercent] = useState(50);
  const [minimumStagePercent, setMinimumStagePercent] = useState(75);
  const [standardStagePercent, setStandardStagePercent] = useState(100);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [aiSource, setAiSource] = useState<'openai' | 'fallback' | 'unavailable' | null>(null);

  useEffect(() => {
    if (!initialDraft) return;
    setEmoji(initialDraft.emoji || '');
    setTitle(initialDraft.title);
    setIntent(initialDraft.intent ?? 'build');
    setType(initialDraft.type);
    setScheduleChoice(initialDraft.schedule.choice);
    setTimesPerWeek(initialDraft.schedule.timesPerWeek ?? 3);
    setSpecificDays(initialDraft.schedule.days ?? [1, 2, 3, 4, 5]);
    setTargetValue(initialDraft.targetValue ?? undefined);
    setTargetUnit(initialDraft.targetUnit || '');
    setDurationMode(initialDraft.duration?.mode ?? 'none');
    setDurationValue(initialDraft.duration?.value ?? 4);
    setDurationUnit(initialDraft.duration?.unit ?? 'weeks');
    setDurationOnEnd(initialDraft.duration?.onEnd ?? 'pause');
    setRemindersEnabled(initialDraft.remindersEnabled ?? false);
    setReminderTime(initialDraft.reminderTimes?.[0] || '08:00');
    setHabitEnvironment(initialDraft.habitEnvironment || '');
    setEnvironmentContext(initialDraft.environmentContext ?? null);
    setDoneIshThreshold(initialDraft.doneIshThreshold ?? 80);
    setBooleanPartialEnabled(initialDraft.booleanPartialEnabled ?? true);
    setScalePlanEnabled(initialDraft.scalePlanEnabled ?? true);
    setSeedStageLabel(initialDraft.stageLabels?.seed ?? 'Quick fallback');
    setMinimumStageLabel(initialDraft.stageLabels?.minimum ?? 'Smaller version');
    setStandardStageLabel(initialDraft.stageLabels?.standard ?? 'Full version');
    setSeedStagePercent(initialDraft.stageCompletionPercents?.seed ?? 50);
    setMinimumStagePercent(initialDraft.stageCompletionPercents?.minimum ?? 75);
    setStandardStagePercent(initialDraft.stageCompletionPercents?.standard ?? 100);
    setAiError(null);
    setAiApplied(false);
    setAiSource(null);
    setStep(1);
  }, [initialDraft]);

  const handleGenerateAi = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiApplied(false);
    try {
      const result = await generateHabitSuggestion({ prompt: title });
      if (result.error) {
        setAiError(result.error);
        setAiSource(result.source);
        return;
      }
      if (result.suggestion) {
        const suggestion = result.suggestion;
        setTitle(suggestion.title);
        setEmoji(suggestion.emoji || '');
        setType(suggestion.type);
        setScheduleChoice(suggestion.scheduleChoice);
        setTargetValue(suggestion.targetValue ?? undefined);
        setTargetUnit(suggestion.targetUnit || '');
        setRemindersEnabled(suggestion.remindersEnabled);
        setReminderTime(suggestion.reminderTime || '08:00');
        setAiApplied(true);
        setAiSource(result.source);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate a habit suggestion.');
      setAiSource('unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const canContinue = (() => {
    if (step === 1) {
      return title.trim().length > 0;
    }
    if (step === 2) {
      if (scheduleChoice === 'specific_days' && specificDays.length === 0) return false;
      if (durationMode === 'fixed_window' && durationValue < 1) return false;
      return true;
    }
    return true;
  })();

  const handleNext = () => {
    if (step < 5) setStep((step + 1) as 1 | 2 | 3 | 4 | 5);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3 | 4 | 5);
  };

  const handleCreateDraft = () => {
    const normalizedEnvironment = normalizeEnvironmentContext(environmentContextToJson(environmentContext), {
      fallbackText: habitEnvironment.trim() || undefined,
    });
    const environmentAudit = computeEnvironmentAudit(normalizedEnvironment);
    const environmentRecommendations = buildEnvironmentRecommendations(normalizedEnvironment);

    const draft: HabitWizardDraft = {
      title,
      emoji: emoji || null,
      intent,
      type,
      schedule: {
        choice: scheduleChoice,
        ...(scheduleChoice === 'x_per_week' && { timesPerWeek: Math.max(1, Math.min(7, timesPerWeek)) }),
        ...(scheduleChoice === 'specific_days' && { days: specificDays }),
      },
      remindersEnabled,
      reminderTimes: remindersEnabled && reminderTime ? [reminderTime] : [],
      duration:
        durationMode === 'fixed_window'
          ? {
              mode: 'fixed_window',
              value: Math.max(1, durationValue),
              unit: durationUnit,
              onEnd: durationOnEnd,
            }
          : { mode: 'none' },
      habitEnvironment: habitEnvironment.trim() || undefined,
      environmentContext: normalizedEnvironment,
      environmentScore: normalizedEnvironment ? environmentAudit.score : null,
      environmentRiskTags: environmentRecommendations.riskTags,
      doneIshThreshold,
      booleanPartialEnabled,
      scalePlanEnabled,
      stageLabels: {
        seed: seedStageLabel.trim() || 'Quick fallback',
        minimum: minimumStageLabel.trim() || 'Smaller version',
        standard: standardStageLabel.trim() || 'Full version',
      },
      stageCompletionPercents: {
        seed: Math.max(1, Math.min(100, seedStagePercent)),
        minimum: Math.max(1, Math.min(100, minimumStagePercent)),
        standard: Math.max(1, Math.min(100, standardStagePercent)),
      },
      habitId: initialDraft?.habitId,
    };

    if (type !== 'boolean') {
      draft.targetValue = targetValue ?? null;
      draft.targetUnit = targetUnit || null;
    }

    onCompleteDraft?.(draft);
  };

  const stepTitles = ['Basics', 'Schedule', 'Environment', 'Reminders', 'Summary'];

  return (
    <div className="habit-wizard-container" style={{ background: 'white', border: '2px solid #667eea', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#667eea' }}>{isEditMode ? 'Edit Habit' : 'Create New Habit'}</h2>
        <button onClick={onCancel} aria-label="Close wizard" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#64748b' }}>×</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} title={stepTitles[s - 1]} style={{ width: '2rem', height: '2rem', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step >= s ? '#667eea' : '#e2e8f0', color: step >= s ? 'white' : '#64748b', fontSize: '0.875rem', fontWeight: 700 }}>{s}</div>
        ))}
      </div>

      {step === 1 && (
        <div className="habit-wizard-step" style={{ marginBottom: '2rem' }}>
          <h3>Step 1: Basics</h3>
          <label htmlFor="habit-emoji">Emoji (optional)</label>
          <input id="habit-emoji" type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} placeholder="💪" style={{ width: '100%', marginBottom: '1rem' }} />

          <label htmlFor="habit-title">Habit Title *</label>
          <input id="habit-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Morning workout" style={{ width: '100%', marginBottom: '0.75rem' }} />

          {!isEditMode && (
            <div style={{ marginBottom: '1rem' }}>
              <button type="button" onClick={handleGenerateAi} disabled={!title.trim() || aiLoading}>
                {AI_FEATURE_ICON} {aiLoading ? 'Generating...' : 'Generate with AI'}
              </button>
              {aiError ? <p style={{ color: '#ef4444', margin: '0.5rem 0 0' }}>{aiError}</p> : null}
              {aiApplied ? <p style={{ color: '#16a34a', margin: '0.5rem 0 0' }}>AI suggestion applied{aiSource === 'fallback' ? ' (local)' : ''}.</p> : null}
            </div>
          )}

          <label htmlFor="habit-type">Type *</label>
          <select id="habit-type" value={type} onChange={(e) => setType(e.target.value as 'boolean' | 'quantity' | 'duration')} style={{ width: '100%', marginBottom: '1rem' }}>
            <option value="boolean">Yes/No</option>
            <option value="quantity">Quantity</option>
            <option value="duration">Duration</option>
          </select>

          <div>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Intent</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setIntent('build')} style={{ padding: '0.5rem 0.75rem', border: intent === 'build' ? '2px solid #667eea' : '1px solid #cbd5e1', background: intent === 'build' ? '#eef2ff' : 'white' }}>Build good behavior</button>
              <button type="button" onClick={() => setIntent('break')} style={{ padding: '0.5rem 0.75rem', border: intent === 'break' ? '2px solid #667eea' : '1px solid #cbd5e1', background: intent === 'break' ? '#eef2ff' : 'white' }}>Break bad behavior</button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="habit-wizard-step" style={{ marginBottom: '2rem' }}>
          <h3>Step 2: Schedule + Program Length</h3>
          <label htmlFor="habit-schedule">How often?</label>
          <select id="habit-schedule" value={scheduleChoice} onChange={(e) => setScheduleChoice(e.target.value as ScheduleChoice)} style={{ width: '100%', marginBottom: '1rem' }}>
            <option value="every_day">Every day</option>
            <option value="specific_days">Specific days</option>
            <option value="x_per_week">X times per week</option>
          </select>

          {scheduleChoice === 'x_per_week' && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Times per week</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                <button type="button" onClick={() => setTimesPerWeek((prev) => Math.max(1, prev - 1))}>−</button>
                <strong>{timesPerWeek}</strong>
                <button type="button" onClick={() => setTimesPerWeek((prev) => Math.min(7, prev + 1))}>+</button>
              </div>
            </div>
          )}

          {scheduleChoice === 'specific_days' && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Which days?</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Mon', index: 1 },
                  { label: 'Tue', index: 2 },
                  { label: 'Wed', index: 3 },
                  { label: 'Thu', index: 4 },
                  { label: 'Fri', index: 5 },
                  { label: 'Sat', index: 6 },
                  { label: 'Sun', index: 0 },
                ].map(({ label, index }) => {
                  const selected = specificDays.includes(index);
                  return (
                    <button key={index} type="button" onClick={() => setSpecificDays((prev) => selected ? prev.filter((d) => d !== index) : [...prev, index])} style={{ border: selected ? '2px solid #667eea' : '1px solid #cbd5e1', background: selected ? '#eef2ff' : 'white' }}>{label}</button>
                  );
                })}
              </div>
            </div>
          )}

          {type !== 'boolean' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label htmlFor="habit-target-value">Target</label>
                <input id="habit-target-value" type="number" value={targetValue ?? ''} onChange={(e) => setTargetValue(e.target.value ? parseFloat(e.target.value) : undefined)} min="0" step="any" style={{ width: '100%' }} />
              </div>
              <div>
                <label htmlFor="habit-target-unit">Unit</label>
                <input id="habit-target-unit" type="text" value={targetUnit} onChange={(e) => setTargetUnit(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Program length</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="radio" checked={durationMode === 'none'} onChange={() => setDurationMode('none')} />
              Keep habit active until I change it
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="radio" checked={durationMode === 'fixed_window'} onChange={() => setDurationMode('fixed_window')} />
              Make this a time-bound program
            </label>

            {durationMode === 'fixed_window' && (
              <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem' }}>
                  <input type="number" min={1} step={1} value={durationValue} onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value || '1', 10)))} />
                  <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as 'days' | 'weeks' | 'months')}>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                    <option value="months">months</option>
                  </select>
                </div>
                <div>
                  <label>When duration ends</label>
                  <select value={durationOnEnd} onChange={(e) => setDurationOnEnd(e.target.value as 'pause' | 'deactivate')} style={{ width: '100%' }}>
                    <option value="pause">Pause habit</option>
                    <option value="deactivate">Deactivate habit</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="habit-wizard-step" style={{ marginBottom: '2rem' }}>
          <h3>Step 3: Environment</h3>
          <EnvironmentStrengthCard value={environmentContext} onChange={setEnvironmentContext} title="Make this habit easier" subtitle="Optional setup that gives your habit a cue, blocker plan, and bad-day version." legacyNoteLabel="Legacy environment notes" />
          <label htmlFor="habit-environment">Habit environment notes</label>
          <textarea id="habit-environment" value={habitEnvironment} onChange={(e) => setHabitEnvironment(e.target.value)} rows={3} style={{ width: '100%' }} />
        </div>
      )}

      {step === 4 && (
        <div className="habit-wizard-step" style={{ marginBottom: '2rem' }}>
          <h3>Step 4: Reminders</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={remindersEnabled} onChange={(e) => setRemindersEnabled(e.target.checked)} />
            Enable reminders
          </label>
          {remindersEnabled && (
            <>
              <label htmlFor="habit-reminder-time">Reminder time</label>
              <input id="habit-reminder-time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} style={{ width: '100%' }} />
            </>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="habit-wizard-step" style={{ marginBottom: '2rem' }}>
          <h3>Step 5: Summary</h3>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ margin: 0 }}><strong>Habit:</strong> {emoji ? `${emoji} ` : ''}{title}</p>
            <p style={{ margin: '0.25rem 0 0' }}><strong>Intent:</strong> {intent === 'build' ? 'Build good behavior' : 'Break/reduce bad behavior'}</p>
            <p style={{ margin: '0.25rem 0 0' }}><strong>Type:</strong> {type}</p>
            <p style={{ margin: '0.25rem 0 0' }}><strong>Schedule:</strong> {scheduleChoice === 'every_day' ? 'Every day' : scheduleChoice === 'x_per_week' ? `${timesPerWeek} times/week` : `${specificDays.length} specific days`}</p>
            <p style={{ margin: '0.25rem 0 0' }}><strong>Program length:</strong> {durationMode === 'fixed_window' ? `${durationValue} ${durationUnit}, then ${durationOnEnd}` : 'No end date'}</p>
            <p style={{ margin: '0.25rem 0 0' }}><strong>Reminders:</strong> {remindersEnabled ? `On at ${reminderTime}` : 'Off'}</p>
          </div>

          <button type="button" onClick={() => setShowAdvancedOptions((prev) => !prev)} style={{ background: 'transparent', border: 'none', color: '#4f46e5', padding: 0, cursor: 'pointer', marginBottom: '0.75rem' }}>
            {showAdvancedOptions ? 'Hide advanced settings' : 'Continue with advanced habit settings'}
          </button>

          {showAdvancedOptions && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
              <h4 style={{ marginTop: 0 }}>Done-ish + Habit Stages</h4>
              {type === 'boolean' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={booleanPartialEnabled} onChange={(e) => setBooleanPartialEnabled(e.target.checked)} />
                  Allow "did some" partial credit
                </label>
              ) : (
                <div>
                  <label htmlFor="doneish-threshold">Partial completion threshold: {doneIshThreshold}%</label>
                  <input id="doneish-threshold" type="range" min="50" max="99" step="5" value={doneIshThreshold} onChange={(e) => setDoneIshThreshold(parseInt(e.target.value, 10))} style={{ width: '100%' }} />
                </div>
              )}

              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="checkbox" checked={scalePlanEnabled} onChange={(e) => setScalePlanEnabled(e.target.checked)} />
                  Enable habit stages
                </label>
                {scalePlanEnabled && (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <input type="text" value={seedStageLabel} onChange={(e) => setSeedStageLabel(e.target.value)} placeholder="Easy stage label" />
                    <input type="number" min="1" max="100" value={seedStagePercent} onChange={(e) => setSeedStagePercent(parseInt(e.target.value || '1', 10))} />
                    <input type="text" value={minimumStageLabel} onChange={(e) => setMinimumStageLabel(e.target.value)} placeholder="Medium stage label" />
                    <input type="number" min="1" max="100" value={minimumStagePercent} onChange={(e) => setMinimumStagePercent(parseInt(e.target.value || '1', 10))} />
                    <input type="text" value={standardStageLabel} onChange={(e) => setStandardStageLabel(e.target.value)} placeholder="Hard stage label" />
                    <input type="number" min="1" max="100" value={standardStagePercent} onChange={(e) => setStandardStagePercent(parseInt(e.target.value || '1', 10))} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="habit-wizard-actions" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <button onClick={step === 1 ? onCancel : handleBack}>{step === 1 ? 'Cancel' : 'Back'}</button>
        {step < 5 ? (
          <button onClick={handleNext} disabled={!canContinue}>Next</button>
        ) : (
          <button onClick={handleCreateDraft}>{isEditMode ? 'Save changes' : 'Create habit'}</button>
        )}
      </div>
    </div>
  );
}
