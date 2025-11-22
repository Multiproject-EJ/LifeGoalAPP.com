import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useId, useMemo, useState } from 'react';
import type { JournalEntry } from '../../services/journal';
import type { Database, JournalEntryType } from '../../lib/database.types';
import { DEFAULT_JOURNAL_TYPE } from './constants';
import type { JournalType } from './Journal';

export type JournalMoodOption = { value: string; label: string; icon: string };

export type JournalEntryDraft = {
  id?: string;
  entryDate: string;
  title: string;
  content: string;
  mood: string | null;
  tags: string[];
  linkedGoalIds: string[];
  linkedHabitIds: string[];
  type?: JournalEntryType;
  moodScore?: number | null;
  category?: string | null;
  unlockDate?: string | null;
  goalId?: string | null;
};

type GoalRow = Database['public']['Tables']['goals']['Row'];
type HabitRow = Database['public']['Tables']['habits']['Row'];

type JournalEntryEditorProps = {
  open: boolean;
  mode: 'create' | 'edit';
  entry: JournalEntry | null;
  goals: GoalRow[];
  habits: HabitRow[];
  moodOptions: JournalMoodOption[];
  saving: boolean;
  error: string | null;
  journalType?: JournalType;
  onClose: () => void;
  onSave: (draft: JournalEntryDraft) => Promise<void> | void;
};

const DEFAULT_MOOD_SCORE = 5;

const JOURNAL_TYPE_LABELS: Record<JournalEntryType, string> = {
  'quick': 'Quick',
  'deep': 'Deep',
  'brain_dump': 'Brain Dump',
  'life_wheel': 'Life Wheel',
  'secret': 'Secret',
  'goal': 'Goal',
  'time_capsule': 'Time Capsule',
  'standard': 'Standard',
};

function getModeLabel(type?: JournalEntryType): string {
  return JOURNAL_TYPE_LABELS[type ?? 'standard'];
}

const todayIso = () => new Date().toISOString().slice(0, 10);

// Quick journal prompts
const QUICK_PROMPTS = [
  "What's one thing you're grateful for today?",
  "What made you smile today?",
  "What challenged you today, and how did you handle it?",
  "What's something you learned today?",
  "What's one thing you're looking forward to tomorrow?",
  "Describe your energy level today and what influenced it.",
  "What's one small win you had today?",
  "What's on your mind right now?",
];

function getRandomPrompt(): string {
  return QUICK_PROMPTS[Math.floor(Math.random() * QUICK_PROMPTS.length)];
}

// Map mood_score (1-10) to mood string
function moodScoreToMood(score: number | null): string | null {
  if (score === null) return null;
  if (score <= 3) return 'sad';
  if (score <= 5) return 'stressed';
  if (score <= 7) return 'neutral';
  if (score <= 9) return 'happy';
  return 'excited';
}

// Map mood string to mood_score (1-10)
function moodToMoodScore(mood: string | null): number | null {
  if (!mood) return null;
  const mapping: Record<string, number> = {
    'sad': 2,
    'stressed': 5,
    'neutral': 7,
    'happy': 8,
    'excited': 10,
  };
  return mapping[mood] ?? null;
}

function createDraft(entry: JournalEntry | null, journalType?: JournalType): JournalEntryDraft {
  return {
    id: entry?.id,
    entryDate: entry?.entry_date ?? todayIso(),
    title: entry?.title ?? '',
    content: entry?.content ?? '',
    mood: entry?.mood ?? null,
    tags: entry?.tags ? [...entry.tags] : [],
    linkedGoalIds: entry?.linked_goal_ids ? [...entry.linked_goal_ids] : [],
    linkedHabitIds: entry?.linked_habit_ids ? [...entry.linked_habit_ids] : [],
    type: entry?.type ?? journalType ?? DEFAULT_JOURNAL_TYPE,
    moodScore: entry?.mood_score ?? null,
    category: entry?.category ?? null,
    unlockDate: entry?.unlock_date ?? null,
    goalId: entry?.goal_id ?? null,
  };
}

export function JournalEntryEditor({
  open,
  mode,
  entry,
  goals,
  habits,
  moodOptions,
  saving,
  error,
  journalType,
  onClose,
  onSave,
}: JournalEntryEditorProps) {
  const titleId = useId();
  const [draft, setDraft] = useState<JournalEntryDraft>(createDraft(entry, journalType));
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraft(createDraft(entry, journalType));
    setTagInput('');
  }, [entry, open, mode, journalType]);

  const moodValue = draft.mood ?? '';

  const goalOptions = useMemo(() => [...goals].sort((a, b) => a.title.localeCompare(b.title)), [goals]);
  const habitOptions = useMemo(() => [...habits].sort((a, b) => a.name.localeCompare(b.name)), [habits]);

  const addTagsFromInput = (value: string) => {
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => {
        setDraft((current) => {
          if (current.tags.includes(tag)) {
            return current;
          }
          return { ...current, tags: [...current.tags, tag] };
        });
      });
  };

  const handleTagInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value.includes(',')) {
      addTagsFromInput(value);
      const segments = value.split(',');
      setTagInput(segments[segments.length - 1].trimStart());
      return;
    }
    setTagInput(value);
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === 'Tab') {
      if (tagInput.trim()) {
        event.preventDefault();
        addTagsFromInput(tagInput);
        setTagInput('');
      }
    } else if (event.key === 'Backspace' && !tagInput) {
      setDraft((current) => ({ ...current, tags: current.tags.slice(0, -1) }));
    }
  };

  const handleTagBlur = () => {
    if (tagInput.trim()) {
      addTagsFromInput(tagInput);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setDraft((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(draft);
  };

  const handleFieldChange = (
    field: keyof Pick<JournalEntryDraft, 'entryDate' | 'title' | 'content' | 'mood'>,
    value: string,
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleGoalChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    setDraft((current) => ({ ...current, linkedGoalIds: values }));
  };

  const handleHabitChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    setDraft((current) => ({ ...current, linkedHabitIds: values }));
  };

  const handleMoodScoreChange = (value: number) => {
    setDraft((current) => ({
      ...current,
      moodScore: value,
      mood: moodScoreToMood(value),
    }));
  };

  const handleUsePrompt = () => {
    const prompt = getRandomPrompt();
    const promptWithNewline = `${prompt}\n`;
    setDraft((current) => ({
      ...current,
      content: current.content ? `${current.content}\n\n${promptWithNewline}` : promptWithNewline,
    }));
  };

  const handlePrimaryGoalChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setDraft((current) => ({ ...current, goalId: value || null }));
  };

  const getContentLabel = (): string => {
    if (isQuickMode) return "Today's thoughts (aim for ~3 sentences)";
    if (isGoalMode) return "Reflection on this goal";
    if (isTimeCapsuleMode) return "Message to your future self";
    return "Content";
  };

  const getContentPlaceholder = (): string => {
    if (isQuickMode) return "Quick capture of your day...";
    if (isGoalMode) return "Reflect on your progress, challenges, and insights related to this goal...";
    if (isTimeCapsuleMode) return "Write a message to your future self. What do you want to remember? What are you hoping for?";
    return "Capture what unfolded, how you felt, and any momentum you want to carry forward.";
  };

  const isQuickMode = draft.type === 'quick';
  const isGoalMode = draft.type === 'goal';
  const isTimeCapsuleMode = draft.type === 'time_capsule';

  if (!open) {
    return null;
  }

  return (
    <div className="journal-editor" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="journal-editor__backdrop" onClick={onClose} />
      <div className="journal-editor__panel" role="document" onClick={(event) => event.stopPropagation()}>
        <header className="journal-editor__header">
          <div>
            <p className="journal-editor__eyebrow">Private journal</p>
            <h2 id={titleId}>{mode === 'create' ? 'New entry' : 'Edit entry'}</h2>
            {draft.type && (
              <p className="journal-editor__mode-label">
                Mode: {getModeLabel(draft.type)}
              </p>
            )}
          </div>
          <button type="button" className="journal-editor__close" onClick={onClose}>
            Close
          </button>
        </header>

        <form className="journal-editor__form" onSubmit={handleSubmit}>
          <div className="journal-editor__grid">
            <label className="journal-editor__field">
              <span>Entry date</span>
              <input
                type="date"
                value={draft.entryDate}
                onChange={(event) => handleFieldChange('entryDate', event.target.value)}
                required
              />
            </label>

            {isTimeCapsuleMode ? (
              <label className="journal-editor__field">
                <span>Unlock date</span>
                <input
                  type="datetime-local"
                  value={draft.unlockDate ?? ''}
                  onChange={(event) => setDraft((current) => ({ ...current, unlockDate: event.target.value }))}
                  required
                />
              </label>
            ) : isQuickMode ? (
              <label className="journal-editor__field">
                <span>Mood score (1-10)</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={draft.moodScore ?? DEFAULT_MOOD_SCORE}
                  onChange={(event) => handleMoodScoreChange(Number(event.target.value))}
                  className="journal-editor__mood-slider"
                />
                <div className="journal-editor__mood-value">
                  {draft.moodScore ?? DEFAULT_MOOD_SCORE} / 10
                  {draft.mood && (() => {
                    const moodOption = moodOptions.find(opt => opt.value === draft.mood);
                    return moodOption ? ` (${moodOption.icon} ${moodOption.label})` : '';
                  })()}
                </div>
              </label>
            ) : (
              <label className="journal-editor__field">
                <span>Mood</span>
                <select value={moodValue} onChange={(event) => handleFieldChange('mood', event.target.value)}>
                  <option value="">No mood selected</option>
                  {moodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {isGoalMode && (
            <label className="journal-editor__field">
              <span>Link to goal</span>
              <select 
                value={draft.goalId ?? ''} 
                onChange={handlePrimaryGoalChange}
                aria-label="Select a goal to reflect on"
              >
                <option value="">Select a goal…</option>
                {goalOptions.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!isQuickMode && !isGoalMode && !isTimeCapsuleMode && (
            <label className="journal-editor__field">
              <span>Title</span>
              <input
                type="text"
                value={draft.title}
                onChange={(event) => handleFieldChange('title', event.target.value)}
                placeholder="Optional headline"
              />
            </label>
          )}

          <label className="journal-editor__field">
            <span>{getContentLabel()}</span>
            <textarea
              value={draft.content}
              onChange={(event) => handleFieldChange('content', event.target.value)}
              rows={isQuickMode ? 4 : 8}
              required
              placeholder={getContentPlaceholder()}
            />
          </label>

          {isQuickMode && (
            <div className="journal-editor__quick-actions">
              <button
                type="button"
                className="journal-editor__prompt-button"
                onClick={handleUsePrompt}
              >
                ✨ Use a prompt
              </button>
            </div>
          )}

          {!isQuickMode && !isTimeCapsuleMode && (
            <>
              <div className="journal-editor__field">
                <span>Tags</span>
                <input
                  type="text"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagKeyDown}
                  onBlur={handleTagBlur}
                  placeholder="Add tags separated by commas"
                />
                {draft.tags.length > 0 ? (
                  <ul className="journal-editor__tags">
                    {draft.tags.map((tag) => (
                      <li key={tag}>
                        <span>{tag}</span>
                        <button type="button" onClick={() => handleRemoveTag(tag)} aria-label={`Remove tag ${tag}`}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="journal-editor__hint">Use tags like mood, project, or ritual to organize entries.</p>
                )}
              </div>

              {!isGoalMode && (
                <label className="journal-editor__field">
                  <span>Linked goals</span>
                  <select multiple value={draft.linkedGoalIds} onChange={handleGoalChange}>
                    {goalOptions.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </select>
                  <p className="journal-editor__hint">Hold Cmd/Ctrl to select multiple goals.</p>
                </label>
              )}

              <label className="journal-editor__field">
                <span>Linked habits</span>
                <select multiple value={draft.linkedHabitIds} onChange={handleHabitChange}>
                  {habitOptions.map((habit) => (
                    <option key={habit.id} value={habit.id}>
                      {habit.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {error ? <p className="journal-editor__status journal-editor__status--error">{error}</p> : null}

          <div className="journal-editor__actions">
            <button type="button" className="journal-editor__cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="journal-editor__save" disabled={saving}>
              {saving ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
