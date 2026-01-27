import { useState, useEffect } from 'react';
import { AI_FEATURE_ICON } from '../../constants/ai';
import { generateHabitSuggestion } from '../../services/habitAiSuggestions';

// Placeholder schedule type - will be refined to match habits_v2 JSON schema later
export interface ScheduleDraft {
  choice: 'every_day' | 'specific_days' | 'x_per_week';
}

export interface HabitWizardDraft {
  title: string;
  emoji: string | null;
  type: 'boolean' | 'quantity' | 'duration';
  targetValue?: number | null;
  targetUnit?: string | null;
  schedule: ScheduleDraft;
  remindersEnabled?: boolean;
  reminderTimes?: string[];
  /** If present, indicates we're editing an existing habit */
  habitId?: string;
}

export type HabitWizardProps = {
  onCancel?: () => void;
  onCompleteDraft?: (draft: HabitWizardDraft) => void;
  initialDraft?: HabitWizardDraft;
};

type ScheduleChoice = 'every_day' | 'specific_days' | 'x_per_week';

export function HabitWizard({ onCancel, onCompleteDraft, initialDraft }: HabitWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Track if we're in edit mode
  const isEditMode = Boolean(initialDraft?.habitId);
  
  // Step 1: Basics
  const [emoji, setEmoji] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [type, setType] = useState<'boolean' | 'quantity' | 'duration'>('boolean');
  
  // Step 2: Schedule
  const [scheduleChoice, setScheduleChoice] = useState<ScheduleChoice>('every_day');
  
  // Step 3: Targets & Reminders
  const [targetValue, setTargetValue] = useState<number | undefined>(undefined);
  const [targetUnit, setTargetUnit] = useState<string>('');
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(false);
  const [reminderTime, setReminderTime] = useState<string>('08:00');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [aiSource, setAiSource] = useState<'openai' | 'fallback' | 'unavailable' | null>(null);

  // Reset wizard state when initialDraft changes
  useEffect(() => {
    if (initialDraft) {
      setEmoji(initialDraft.emoji || '');
      setTitle(initialDraft.title);
      setType(initialDraft.type);
      setScheduleChoice(initialDraft.schedule.choice);
      setTargetValue(initialDraft.targetValue ?? undefined);
      setTargetUnit(initialDraft.targetUnit || '');
      setRemindersEnabled(initialDraft.remindersEnabled ?? false);
      setReminderTime(initialDraft.reminderTimes?.[0] || '08:00');
      setStep(1); // Reset to first step
      setAiError(null);
      setAiApplied(false);
      setAiSource(null);
    }
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

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as 1 | 2 | 3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3);
    }
  };

  const handleCreateDraft = () => {
    const draft: HabitWizardDraft = {
      title,
      emoji: emoji || null,
      type,
      schedule: { choice: scheduleChoice },
      remindersEnabled,
      reminderTimes: remindersEnabled && reminderTime ? [reminderTime] : [],
      // Preserve habitId if editing
      habitId: initialDraft?.habitId,
    };

    // Add target fields only for quantity/duration types
    if (type !== 'boolean') {
      draft.targetValue = targetValue ?? null;
      draft.targetUnit = targetUnit || null;
    }

    onCompleteDraft?.(draft);
  };

  return (
    <div
      className="habit-wizard-container"
      style={{
        background: 'white',
        border: '2px solid #667eea',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#667eea' }}>
          {isEditMode ? 'Edit Habit' : 'Create New Habit'}
        </h2>
        <button
          onClick={onCancel}
          aria-label="Close wizard"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.5rem',
            color: '#64748b',
            width: '2.75rem',
            height: '2.75rem',
            padding: 0,
            borderRadius: '999px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: step >= s ? '#667eea' : '#e2e8f0',
              color: step >= s ? 'white' : '#64748b',
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="habit-wizard-step" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
            Step 1: Basics
          </h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="habit-emoji"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
            >
              Emoji (optional)
            </label>
            <input
              id="habit-emoji"
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="💪"
              maxLength={2}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="habit-title"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
            >
              Habit Title *
            </label>
            <input
              id="habit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning workout"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
            {!isEditMode && (
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={!title.trim() || aiLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '999px',
                    border: '1px solid #c7d2fe',
                    background: aiLoading ? '#e0e7ff' : '#eef2ff',
                    color: '#4338ca',
                    fontWeight: 600,
                    cursor: !title.trim() || aiLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {AI_FEATURE_ICON}
                  {aiLoading ? 'Generating...' : 'Generate with AI'}
                </button>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Add a quick habit idea, then let AI suggest a starter plan.
                </p>
                {aiError && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#ef4444' }}>
                    {aiError}
                  </p>
                )}
                {aiApplied && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#16a34a' }}>
                    AI suggestion applied{aiSource === 'fallback' ? ' (local)' : ''}.
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="habit-type"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
            >
              Type *
            </label>
            <select
              id="habit-type"
              value={type}
              onChange={(e) => setType(e.target.value as 'boolean' | 'quantity' | 'duration')}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box',
                background: 'white',
              }}
            >
              <option value="boolean">Yes/No (e.g., Did you meditate?)</option>
              <option value="quantity">Quantity (e.g., 8 glasses of water)</option>
              <option value="duration">Duration (e.g., 30 minutes of exercise)</option>
            </select>
          </div>
        </div>
      )}

      {/* Step 2: Schedule */}
      {step === 2 && (
        <div className="habit-wizard-step" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
            Step 2: Schedule
          </h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="habit-schedule"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
            >
              How often?
            </label>
            <select
              id="habit-schedule"
              value={scheduleChoice}
              onChange={(e) => setScheduleChoice(e.target.value as ScheduleChoice)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box',
                background: 'white',
              }}
            >
              <option value="every_day">Every day</option>
              <option value="specific_days">Specific days</option>
              <option value="x_per_week">X times per week</option>
            </select>
          </div>

          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            {scheduleChoice === 'every_day' && 'This habit will be tracked every single day.'}
            {scheduleChoice === 'specific_days' && "You'll be able to select specific days of the week."}
            {scheduleChoice === 'x_per_week' && "You'll set a weekly goal for how many times to complete this habit."}
          </p>
        </div>
      )}

      {/* Step 3: Targets & Reminders */}
      {step === 3 && (
        <div className="habit-wizard-step" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
            Step 3: Targets & Reminders
          </h3>

          {/* Show target fields only for quantity/duration types */}
          {type !== 'boolean' && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="habit-target-value"
                  style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
                >
                  Target {type === 'quantity' ? 'Amount' : 'Duration'}
                </label>
                <input
                  id="habit-target-value"
                  type="number"
                  value={targetValue ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetValue(val ? parseFloat(val) : undefined);
                  }}
                  placeholder={type === 'quantity' ? 'e.g., 8' : 'e.g., 30'}
                  min="0"
                  step="any"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="habit-target-unit"
                  style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
                >
                  Unit
                </label>
                <input
                  id="habit-target-unit"
                  type="text"
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  placeholder={type === 'quantity' ? 'e.g., glasses, cups' : 'e.g., minutes, hours'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          )}

          {/* Reminders */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={(e) => setRemindersEnabled(e.target.checked)}
                style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Enable reminders</span>
            </label>
          </div>

          {remindersEnabled && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="habit-reminder-time"
                style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
              >
                Reminder Time
              </label>
              <input
                id="habit-reminder-time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <button
          onClick={step === 1 ? onCancel : handleBack}
          style={{
            padding: '0.75rem 1.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: 'white',
            color: '#64748b',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        <button
          onClick={step === 3 ? handleCreateDraft : handleNext}
          disabled={step === 1 && !title}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '8px',
            background: (step === 1 && !title) ? '#e2e8f0' : '#667eea',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: (step === 1 && !title) ? 'not-allowed' : 'pointer',
          }}
        >
          {step === 3 ? (isEditMode ? 'Save changes' : 'Create draft') : 'Next'}
        </button>
      </div>
    </div>
  );
}
