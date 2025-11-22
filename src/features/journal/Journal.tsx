import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { isDemoSession } from '../../services/demoSession';
import {
  createJournalEntry,
  deleteJournalEntry,
  listJournalEntries,
  updateJournalEntry,
  type JournalEntry,
} from '../../services/journal';
import { fetchGoals } from '../../services/goals';
import { fetchHabitsForUser } from '../../services/habits';
import { JournalEntryList } from './JournalEntryList';
import { JournalEntryDetail } from './JournalEntryDetail';
import { JournalEntryEditor, type JournalEntryDraft, type JournalMoodOption } from './JournalEntryEditor';
import { JournalTypeSelector } from './JournalTypeSelector';
import type { Database, JournalEntryType } from '../../lib/database.types';
import { DEFAULT_JOURNAL_TYPE } from './constants';

/**
 * Journal mode type representing different journaling experiences.
 * This is an alias for JournalEntryType to provide better semantic meaning
 * in the context of journal UI state.
 */
export type JournalType = JournalEntryType;

const MOOD_OPTIONS: JournalMoodOption[] = [
  { value: 'happy', label: 'Happy', icon: '🙂' },
  { value: 'neutral', label: 'Neutral', icon: '😐' },
  { value: 'sad', label: 'Sad', icon: '🙁' },
  { value: 'stressed', label: 'Stressed', icon: '😰' },
  { value: 'excited', label: 'Excited', icon: '🤩' },
];

type GoalRow = Database['public']['Tables']['goals']['Row'];
type HabitRow = Database['public']['Tables']['habits']['Row'];
type JournalEntryInsertPayload = Database['public']['Tables']['journal_entries']['Insert'];
type JournalEntryUpdatePayload = Database['public']['Tables']['journal_entries']['Update'];

type JournalProps = {
  session: Session;
  onNavigateToGoals?: () => void;
  onNavigateToHabits?: () => void;
};

type StatusState = { kind: 'success' | 'error'; message: string } | null;

function sortEntries(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => {
    const dateCompare = b.entry_date.localeCompare(a.entry_date);
    if (dateCompare !== 0) return dateCompare;
    const aCreated = a.created_at ?? '';
    const bCreated = b.created_at ?? '';
    return bCreated.localeCompare(aCreated);
  });
}

export function Journal({ session, onNavigateToGoals, onNavigateToHabits }: JournalProps) {
  const { isConfigured } = useSupabaseAuth();
  const isDemoExperience = isDemoSession(session);
  const journalDisabled = !isConfigured && !isDemoExperience;
  const isCompactLayout = useMediaQuery('(max-width: 960px)');

  // Journal mode state for different journaling experiences
  const [journalType, setJournalType] = useState<JournalType>(DEFAULT_JOURNAL_TYPE);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusState>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [showMobileDetail, setShowMobileDetail] = useState(!isCompactLayout);

  useEffect(() => {
    if (!isCompactLayout) {
      setShowMobileDetail(true);
    } else {
      setShowMobileDetail(false);
    }
  }, [isCompactLayout]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const loadEntries = useCallback(async () => {
    if (!session || journalDisabled) {
      setEntries([]);
      setSelectedEntryId(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: serviceError } = await listJournalEntries({ limit: 250 });
      if (serviceError) {
        throw new Error(serviceError.message);
      }
      const sorted = sortEntries(data ?? []);
      setEntries(sorted);
      setSelectedEntryId((current) => {
        if (current && sorted.some((entry) => entry.id === current)) {
          return current;
        }
        return sorted[0]?.id ?? null;
      });
      if (sorted.length === 0 && isCompactLayout) {
        setShowMobileDetail(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your journal entries right now.');
    } finally {
      setLoading(false);
    }
  }, [session, journalDisabled, isCompactLayout]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!session || journalDisabled) {
      setGoals([]);
      return;
    }
    fetchGoals().then(({ data }) => {
      setGoals(data ?? []);
    });
  }, [session, journalDisabled]);

  useEffect(() => {
    if (!session || journalDisabled) {
      setHabits([]);
      return;
    }
    fetchHabitsForUser(session.user.id).then(({ data }) => {
      setHabits(data ?? []);
    });
  }, [session, journalDisabled]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((entry) => {
      entry.tags?.forEach((tag) => {
        if (tag) set.add(tag);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const searchTerm = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (selectedTag && !(entry.tags?.includes(selectedTag))) {
        return false;
      }
      if (searchTerm) {
        const haystack = `${entry.title ?? ''} ${entry.content}`.toLowerCase();
        if (!haystack.includes(searchTerm)) {
          return false;
        }
      }
      return true;
    });
  }, [entries, searchQuery, selectedTag]);

  useEffect(() => {
    if (!filteredEntries.length) {
      setSelectedEntryId(null);
      if (isCompactLayout) {
        setShowMobileDetail(false);
      }
      return;
    }
    setSelectedEntryId((current) => {
      if (current && filteredEntries.some((entry) => entry.id === current)) {
        return current;
      }
      return filteredEntries[0].id;
    });
  }, [filteredEntries, isCompactLayout]);

  const activeEntry = filteredEntries.find((entry) => entry.id === selectedEntryId) ?? null;

  const goalMap = useMemo(() => {
    const map: Record<string, GoalRow> = {};
    goals.forEach((goal) => {
      map[goal.id] = goal;
    });
    return map;
  }, [goals]);

  const habitMap = useMemo(() => {
    const map: Record<string, HabitRow> = {};
    habits.forEach((habit) => {
      map[habit.id] = habit;
    });
    return map;
  }, [habits]);

  const getMoodMeta = useCallback(
    (mood?: string | null) => MOOD_OPTIONS.find((option) => option.value === mood),
    [],
  );

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryId(entryId);
    if (isCompactLayout) {
      setShowMobileDetail(true);
    }
  };

  const handleOpenEditor = (mode: 'create' | 'edit', entryToEdit: JournalEntry | null) => {
    setEditorMode(mode);
    setEditingEntry(entryToEdit);
    setEditorError(null);
    setEditorOpen(true);
  };

  const handleSaveEntry = async (draft: JournalEntryDraft) => {
    if (!draft.content.trim()) {
      setEditorError('Write a few lines before saving.');
      return;
    }

    setEditorSaving(true);
    setEditorError(null);

    try {
      const basePayload: Omit<JournalEntryInsertPayload, 'user_id'> = {
        entry_date: draft.entryDate,
        title: draft.title.trim() ? draft.title.trim() : null,
        content: draft.content.trim(),
        mood: draft.mood ?? null,
        tags: draft.tags.length ? draft.tags : null,
        linked_goal_ids: draft.linkedGoalIds.length ? draft.linkedGoalIds : null,
        linked_habit_ids: draft.linkedHabitIds.length ? draft.linkedHabitIds : null,
        is_private: true,
        type: draft.type ?? DEFAULT_JOURNAL_TYPE,
        mood_score: draft.moodScore ?? null,
        category: draft.category ?? null,
        unlock_date: draft.unlockDate ?? null,
        goal_id: draft.goalId ?? null,
      };

      let saved: JournalEntry | null = null;
      if (editorMode === 'create') {
        const insertPayload: JournalEntryInsertPayload = {
          ...basePayload,
          user_id: session.user.id,
        };
        const { data, error: serviceError } = await createJournalEntry(insertPayload);
        if (serviceError || !data) {
          throw new Error(serviceError?.message ?? 'Unable to save the entry.');
        }
        saved = data;
        setEntries((current) => sortEntries([data, ...current]));
      } else if (editingEntry) {
        const updatePayload: JournalEntryUpdatePayload = basePayload;
        const { data, error: serviceError } = await updateJournalEntry(editingEntry.id, updatePayload);
        if (serviceError || !data) {
          throw new Error(serviceError?.message ?? 'Unable to update the entry.');
        }
        saved = data;
        setEntries((current) =>
          sortEntries(current.map((item) => (item.id === data.id ? data : item))),
        );
      }

      if (saved) {
        setSelectedEntryId(saved.id);
        setStatus({ kind: 'success', message: editorMode === 'create' ? 'Entry saved.' : 'Entry updated.' });
        setEditorOpen(false);
        if (isCompactLayout) {
          setShowMobileDetail(true);
        }
      }
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Unable to save your entry right now.');
    } finally {
      setEditorSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!activeEntry) return;
    const confirmed = window.confirm('Delete this journal entry? This action cannot be undone.');
    if (!confirmed) return;

    setActionLoading(true);
    setStatus(null);
    try {
      const { error: serviceError } = await deleteJournalEntry(activeEntry.id);
      if (serviceError) {
        throw new Error(serviceError.message);
      }
      let nextEntriesSnapshot: JournalEntry[] = [];
      setEntries((current) => {
        const next = sortEntries(current.filter((item) => item.id !== activeEntry.id));
        nextEntriesSnapshot = next;
        return next;
      });
      setSelectedEntryId((current) => {
        if (current === activeEntry.id) {
          return nextEntriesSnapshot[0]?.id ?? null;
        }
        return current;
      });
      if (isCompactLayout && nextEntriesSnapshot.length === 0) {
        setShowMobileDetail(false);
      }
      setStatus({ kind: 'success', message: 'Entry deleted.' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Unable to delete the entry.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleNavigateGoal = (goalId: string) => {
    window.__LifeGoalAppDebugger?.log?.('journal-goal-link', { goalId });
    onNavigateToGoals?.();
  };

  const handleNavigateHabit = (habitId: string) => {
    window.__LifeGoalAppDebugger?.log?.('journal-habit-link', { habitId });
    onNavigateToHabits?.();
  };

  const listEmptyState = journalDisabled
    ? 'Connect Supabase or open the demo workspace to unlock your private journal.'
    : entries.length === 0 && !searchQuery && !selectedTag
      ? 'No entries yet. Create your first reflection to begin.'
      : 'No entries match your filters right now.';

  return (
    <section className="journal">
      <header className="journal__header">
        <div>
          <p className="journal__eyebrow">Daily reflections</p>
          <h1>Journal</h1>
        </div>
        <div className="journal__header-actions">
          <JournalTypeSelector journalType={journalType} onChange={setJournalType} />
          <button
            type="button"
            className="journal__new"
            onClick={() => handleOpenEditor('create', null)}
            disabled={journalDisabled}
          >
            + New entry
          </button>
        </div>
      </header>

      {journalDisabled ? (
        <p className="journal__banner">
          Add your Supabase credentials or launch the demo workspace to save private journal entries.
        </p>
      ) : null}

      {status ? <p className={`journal__status journal__status--${status.kind}`}>{status.message}</p> : null}
      {error ? <p className="journal__status journal__status--error">{error}</p> : null}

      <div className="journal__layout">
        <div className={`journal__column journal__column--list ${
          isCompactLayout && showMobileDetail ? 'journal__column--hidden' : ''
        }`}>
          <JournalEntryList
            entries={entries}
            filteredEntries={filteredEntries}
            selectedEntryId={selectedEntryId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            availableTags={availableTags}
            loading={loading}
            disabled={journalDisabled}
            isCollapsed={isCompactLayout && showMobileDetail}
            emptyStateMessage={listEmptyState}
            getMoodMeta={getMoodMeta}
            onSelectEntry={handleSelectEntry}
          />
        </div>
        <div className={`journal__column journal__column--detail ${
          isCompactLayout && !showMobileDetail ? 'journal__column--hidden' : ''
        }`}>
          <JournalEntryDetail
            entry={activeEntry}
            getMoodMeta={getMoodMeta}
            goalMap={goalMap}
            habitMap={habitMap}
            onEdit={() => handleOpenEditor('edit', activeEntry)}
            onDelete={handleDeleteEntry}
            showBackButton={isCompactLayout}
            onBack={() => setShowMobileDetail(false)}
            onNavigateToGoal={handleNavigateGoal}
            onNavigateToHabit={handleNavigateHabit}
            disabled={journalDisabled || actionLoading}
            unavailableMessage={journalDisabled ? listEmptyState : null}
          />
        </div>
      </div>

      <JournalEntryEditor
        open={editorOpen}
        mode={editorMode}
        entry={editorMode === 'edit' ? editingEntry : null}
        goals={goals}
        habits={habits}
        moodOptions={MOOD_OPTIONS}
        saving={editorSaving}
        error={editorError}
        journalType={journalType}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveEntry}
      />
    </section>
  );
}
