import type { JournalEntry } from '../../services/journal';
import type { JournalMoodOption } from './JournalEntryEditor';

type JournalEntryListProps = {
  entries: JournalEntry[];
  filteredEntries: JournalEntry[];
  selectedEntryId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  availableTags: string[];
  loading: boolean;
  disabled?: boolean;
  isCollapsed?: boolean;
  emptyStateMessage: string;
  getMoodMeta: (mood?: string | null) => JournalMoodOption | undefined;
  onSelectEntry: (entryId: string) => void;
  isEntryLocked: (entry: JournalEntry) => boolean;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const unlockDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});

function getPreview(content: string, limit = 140): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}…`;
}

export function JournalEntryList({
  entries,
  filteredEntries,
  selectedEntryId,
  searchQuery,
  onSearchChange,
  selectedTag,
  onSelectTag,
  availableTags,
  loading,
  disabled = false,
  isCollapsed = false,
  emptyStateMessage,
  getMoodMeta,
  onSelectEntry,
  isEntryLocked,
}: JournalEntryListProps) {
  return (
    <aside className={`journal-list ${isCollapsed ? 'journal-list--collapsed' : ''}`}>
      <div className="journal-list__filters">
        <label className="journal-list__filter">
          <span className="sr-only">Search entries</span>
          <input
            type="search"
            placeholder="Search your journal…"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            disabled={disabled}
          />
        </label>
        <label className="journal-list__filter">
          <span className="sr-only">Filter by tag</span>
          <select
            value={selectedTag ?? ''}
            onChange={(event) => onSelectTag(event.target.value ? event.target.value : null)}
            disabled={disabled || availableTags.length === 0}
          >
            <option value="">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="journal-list__body">
        {loading ? <p className="journal-list__status">Loading entries…</p> : null}
        {!loading && filteredEntries.length === 0 ? (
          <p className="journal-list__status">{emptyStateMessage}</p>
        ) : null}

        <ul className="journal-list__items">
          {filteredEntries.map((entry) => {
            const isActive = entry.id === selectedEntryId;
            const moodMeta = getMoodMeta(entry.mood);
            const isLocked = isEntryLocked(entry);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`journal-list__item ${isActive ? 'journal-list__item--active' : ''}`}
                  onClick={() => onSelectEntry(entry.id)}
                  disabled={disabled}
                >
                  <div className="journal-list__item-meta">
                    <span>{dateFormatter.format(new Date(entry.entry_date))}</span>
                    {moodMeta ? <span className="journal-list__item-mood">{moodMeta.icon}</span> : null}
                  </div>
                  <strong>{entry.title?.trim() || 'Untitled'}</strong>
                  {isLocked && entry.unlock_date ? (
                    <p>🔒 Locked until {unlockDateFormatter.format(new Date(entry.unlock_date))}</p>
                  ) : (
                    <p>{getPreview(entry.content)}</p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="journal-list__footer">
        <small>
          Showing {filteredEntries.length} of {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
        </small>
      </footer>
    </aside>
  );
}
