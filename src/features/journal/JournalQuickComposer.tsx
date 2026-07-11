import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { JournalEntryDraft, JournalMoodOption } from './JournalEntryEditor';
import { moodToMoodScore } from './utils';

const DRAFT_STORAGE_KEY = 'lifegoal.journal.quickComposerDraft';
const HASHTAG_PATTERN = /#([\p{L}\p{N}_-]{2,30})/gu;

const COMPOSER_PROMPTS = [
  'What’s on your mind right now?',
  'How did today actually feel?',
  'What’s one moment from today worth keeping?',
  'What are you carrying that you’d like to put down?',
  'What went better than expected today?',
  'What would you tell a friend about your day?',
  'What’s one thing you’re looking forward to?',
];

type StoredComposerDraft = {
  content: string;
  mood: string | null;
  tags: string[];
};

function readStoredDraft(): StoredComposerDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredComposerDraft>;
    return {
      content: typeof parsed.content === 'string' ? parsed.content : '',
      mood: typeof parsed.mood === 'string' ? parsed.mood : null,
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    };
  } catch {
    return null;
  }
}

function extractHashtags(content: string): string[] {
  const tags = new Set<string>();
  for (const match of content.matchAll(HASHTAG_PATTERN)) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const COMPOSER_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

type JournalQuickComposerProps = {
  disabled: boolean;
  saving: boolean;
  error: string | null;
  moodOptions: JournalMoodOption[];
  availableTags: string[];
  onSave: (draft: JournalEntryDraft) => Promise<boolean>;
};

export function JournalQuickComposer({
  disabled,
  saving,
  error,
  moodOptions,
  availableTags,
  onSave,
}: JournalQuickComposerProps) {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [trayOpen, setTrayOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const placeholder = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return COMPOSER_PROMPTS[dayIndex % COMPOSER_PROMPTS.length];
  }, []);

  useEffect(() => {
    const stored = readStoredDraft();
    if (stored) {
      setContent(stored.content);
      setMood(stored.mood);
      setTags(stored.tags);
      if (stored.mood || stored.tags.length > 0) {
        setTrayOpen(true);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    if (!content.trim() && !mood && tags.length === 0) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ content, mood, tags }));
  }, [hydrated, content, mood, tags]);

  useEffect(() => {
    if (disabled) return;
    textareaRef.current?.focus();
  }, [disabled]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), 2400);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [content]);

  const tagSuggestions = useMemo(
    () => availableTags.filter((tag) => !tags.includes(tag)).slice(0, 5),
    [availableTags, tags],
  );

  const addTag = (raw: string) => {
    const cleaned = raw.trim().replace(/^#/, '').toLowerCase();
    if (!cleaned) return;
    setTags((current) => (current.includes(cleaned) ? current : [...current, cleaned]));
  };

  const handleTagInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
  };

  const handleSave = async () => {
    if (saving || disabled || !content.trim()) return;

    const inlineTags = extractHashtags(content);
    const mergedTags = [...new Set([...tags, ...inlineTags])];

    const saved = await onSave({
      entryDate: todayIso(),
      title: '',
      content,
      mood,
      tags: mergedTags,
      linkedGoalIds: [],
      linkedHabitIds: [],
      type: 'standard',
      moodScore: moodToMoodScore(mood),
      isPrivate: true,
    });

    if (saved) {
      setContent('');
      setMood(null);
      setTags([]);
      setTagInput('');
      setTrayOpen(false);
      setJustSaved(true);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      textareaRef.current?.focus();
    }
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleSave();
    }
  };

  return (
    <section className="journal-composer" aria-label="Write today’s journal">
      <div className="journal-composer__page">
        <header className="journal-composer__head">
          <div>
            <p className="journal-composer__date">{COMPOSER_DATE_FORMATTER.format(new Date())}</p>
            <p className="journal-composer__hint">Just write. Everything here stays private.</p>
          </div>
          <button
            type="button"
            className={`journal-composer__tools-toggle ${trayOpen ? 'journal-composer__tools-toggle--active' : ''}`}
            onClick={() => setTrayOpen((open) => !open)}
            aria-expanded={trayOpen}
            aria-label={trayOpen ? 'Hide smart tools' : 'Show smart tools'}
            disabled={disabled}
          >
            ✨
          </button>
        </header>

        <textarea
          ref={textareaRef}
          className="journal-composer__textarea"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder={disabled ? 'Connect Supabase or open the demo workspace to start journaling.' : placeholder}
          disabled={disabled || saving}
          rows={Math.min(14, Math.max(5, content.split('\n').length + 1))}
        />

        {trayOpen ? (
          <div className="journal-composer__tray">
            <div className="journal-composer__tray-group" role="radiogroup" aria-label="Mood">
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={mood === option.value}
                  className={`journal-composer__mood ${mood === option.value ? 'journal-composer__mood--active' : ''}`}
                  onClick={() => setMood((current) => (current === option.value ? null : option.value))}
                  disabled={disabled || saving}
                  title={option.label}
                >
                  <span aria-hidden="true">{option.icon}</span>
                  <span className="journal-composer__mood-label">{option.label}</span>
                </button>
              ))}
            </div>
            <div className="journal-composer__tray-group journal-composer__tray-group--tags">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="journal-composer__tag journal-composer__tag--active"
                  onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                  disabled={disabled || saving}
                  aria-label={`Remove tag ${tag}`}
                >
                  #{tag} ×
                </button>
              ))}
              <input
                type="text"
                className="journal-composer__tag-input"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onBlur={() => {
                  if (tagInput.trim()) {
                    addTag(tagInput);
                    setTagInput('');
                  }
                }}
                placeholder="Add tag…"
                disabled={disabled || saving}
                aria-label="Add a tag"
              />
              {tagSuggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="journal-composer__tag"
                  onClick={() => addTag(tag)}
                  disabled={disabled || saving}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <p className="journal-composer__error" role="alert">{error}</p> : null}

        <footer className="journal-composer__foot">
          <span className="journal-composer__meta">
            {justSaved ? 'Saved ✓' : wordCount > 0 ? `${wordCount} word${wordCount === 1 ? '' : 's'} · #tags work inline` : 'Type #tags inline to organize'}
          </span>
          <button
            type="button"
            className="journal-composer__save"
            onClick={() => void handleSave()}
            disabled={disabled || saving || !content.trim()}
          >
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </footer>
      </div>
    </section>
  );
}
