import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createOfflineJournalEntry,
  isOfflineJournalEntryEmpty,
  loadOfflineJournalEntries,
  removeOfflineJournalEntry,
  saveOfflineJournalEntries,
  upsertOfflineJournalEntry,
  type OfflineJournalEntry,
} from './offlineJournalStorage';
import './OfflineJournal.css';

type OfflineJournalProps = {
  onClose: () => void;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'unavailable';

const AUTOSAVE_DELAY_MS = 600;

function formatEntryDate(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return new Date(timestamp).toDateString();
  }
}

function buildPreview(entry: OfflineJournalEntry): string {
  const source = entry.body.trim() || entry.title.trim();
  if (!source) return 'Empty entry';
  const firstLine = source.split('\n').find((line) => line.trim().length > 0)?.trim() ?? source;
  return firstLine.length > 140 ? `${firstLine.slice(0, 137)}…` : firstLine;
}

function countWords(body: string): number {
  const trimmed = body.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * A fully local, no-account journal. Renders as a full-screen overlay from the
 * sign-in gate so people can keep writing even when the cloud (Supabase) is
 * unreachable. Everything is stored in localStorage on this device.
 */
export function OfflineJournal({ onClose }: OfflineJournalProps) {
  const [entries, setEntries] = useState<OfflineJournalEntry[]>(() => loadOfflineJournalEntries());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const autosaveTimeoutRef = useRef<number | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const activeEntry = useMemo(
    () => entries.find((entry) => entry.id === activeId) ?? null,
    [entries, activeId],
  );

  // Persist (debounced) whenever entries change from user edits.
  const persist = useCallback((next: OfflineJournalEntry[]) => {
    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }
    setSaveState('saving');
    autosaveTimeoutRef.current = window.setTimeout(() => {
      const ok = saveOfflineJournalEntries(next);
      setSaveState(ok ? 'saved' : 'unavailable');
    }, AUTOSAVE_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  // Lock background scroll while the overlay is open, and close on Escape from
  // the list view.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const commitEntries = useCallback(
    (next: OfflineJournalEntry[]) => {
      setEntries(next);
      persist(next);
    },
    [persist],
  );

  const handleCreateEntry = useCallback(() => {
    const entry = createOfflineJournalEntry();
    setEntries((current) => upsertOfflineJournalEntry(current, entry));
    setActiveId(entry.id);
    setSaveState('idle');
    window.setTimeout(() => bodyRef.current?.focus(), 0);
  }, []);

  const handleFieldChange = useCallback(
    (patch: Partial<Pick<OfflineJournalEntry, 'title' | 'body'>>) => {
      if (!activeEntry) return;
      const updated: OfflineJournalEntry = {
        ...activeEntry,
        ...patch,
        updatedAt: Date.now(),
      };
      commitEntries(upsertOfflineJournalEntry(entries, updated));
    },
    [activeEntry, commitEntries, entries],
  );

  const handleDeleteEntry = useCallback(
    (id: string) => {
      const next = removeOfflineJournalEntry(entries, id);
      setEntries(next);
      saveOfflineJournalEntries(next);
      setActiveId((current) => (current === id ? null : current));
    },
    [entries],
  );

  // Drop an untouched entry when leaving the editor so blank drafts don't pile up.
  const handleBackToList = useCallback(() => {
    if (activeEntry && isOfflineJournalEntryEmpty(activeEntry)) {
      handleDeleteEntry(activeEntry.id);
    }
    setActiveId(null);
    setSaveState('idle');
  }, [activeEntry, handleDeleteEntry]);

  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'saved'
        ? 'Saved on this device'
        : saveState === 'unavailable'
          ? "Couldn't save — storage is blocked"
          : '';

  return (
    <div className="offline-journal" role="dialog" aria-modal="true" aria-label="Offline journal">
      <div className="offline-journal__backdrop" onClick={onClose} />
      <section className="offline-journal__panel">
        <header className="offline-journal__masthead">
          <div className="offline-journal__heading">
            <span className="offline-journal__eyebrow">📔 Journal</span>
            <h2>{activeEntry ? 'Your entry' : 'Write it down'}</h2>
            <p>Saved privately on this device — no account needed.</p>
          </div>
          <button
            type="button"
            className="offline-journal__icon-button"
            onClick={onClose}
            aria-label="Close journal"
          >
            ✕
          </button>
        </header>

        {activeEntry ? (
          <div className="offline-journal__editor">
            <div className="offline-journal__editor-toolbar">
              <button type="button" className="offline-journal__ghost-button" onClick={handleBackToList}>
                ← All entries
              </button>
              <button
                type="button"
                className="offline-journal__danger-button"
                onClick={() => handleDeleteEntry(activeEntry.id)}
              >
                Delete
              </button>
            </div>
            <input
              className="offline-journal__title-input"
              value={activeEntry.title}
              onChange={(event) => handleFieldChange({ title: event.target.value })}
              placeholder="Give it a title (optional)"
              aria-label="Entry title"
            />
            <textarea
              ref={bodyRef}
              className="offline-journal__body-input"
              value={activeEntry.body}
              onChange={(event) => handleFieldChange({ body: event.target.value })}
              placeholder="What's on your mind today?"
              aria-label="Entry text"
            />
            <div className="offline-journal__editor-footer">
              <span
                className={`offline-journal__save-state${
                  saveState === 'unavailable' ? ' offline-journal__save-state--error' : ''
                }`}
              >
                {saveLabel}
              </span>
              <span className="offline-journal__word-count">{countWords(activeEntry.body)} words</span>
            </div>
          </div>
        ) : (
          <div className="offline-journal__list-view">
            <button type="button" className="offline-journal__new-button" onClick={handleCreateEntry}>
              ✍️ New entry
            </button>

            {entries.length === 0 ? (
              <div className="offline-journal__empty">
                <p className="offline-journal__empty-title">Nothing here yet</p>
                <p className="offline-journal__empty-copy">
                  Jot down a thought, a win, or how the day is going. It stays on this device and
                  will be here whenever you reach for the app.
                </p>
              </div>
            ) : (
              <ul className="offline-journal__list">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="offline-journal__list-item"
                      onClick={() => {
                        setActiveId(entry.id);
                        setSaveState('idle');
                      }}
                    >
                      <span className="offline-journal__list-item-top">
                        <span className="offline-journal__list-item-title">
                          {entry.title.trim() || 'Untitled'}
                        </span>
                        <span className="offline-journal__list-item-date">
                          {formatEntryDate(entry.updatedAt)}
                        </span>
                      </span>
                      <span className="offline-journal__list-item-preview">{buildPreview(entry)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
