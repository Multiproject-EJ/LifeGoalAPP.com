import { useState } from 'react';
import type { JournalEntry } from '../../services/journal';
import type { JournalMoodOption } from './JournalEntryEditor';
import { JournalCalendar } from './JournalCalendar';
import { entryListDateFormatter, unlockDateFormatter } from './utils';

type ViewMode = 'list' | 'calendar';

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

/**
 * Parse a YYYY-MM-DD date string into a Date object.
 * Uses Date constructor with year, month, day parameters to avoid
 * timezone issues that occur when parsing ISO strings directly.
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object representing midnight local time on the given date
 */
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

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
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Get entries for selected calendar date
  const calendarDateEntries = selectedCalendarDate
    ? filteredEntries.filter((entry) => entry.entry_date === selectedCalendarDate)
    : [];

  const handleCalendarDateSelect = (date: string) => {
    setSelectedCalendarDate(date);
    // If there are entries on this date, select the first one
    const entriesOnDate = filteredEntries.filter((entry) => entry.entry_date === date);
    if (entriesOnDate.length > 0) {
      onSelectEntry(entriesOnDate[0].id);
    }
  };

  return (
    <aside className={`journal-list ${isCollapsed ? 'journal-list--collapsed' : ''}`}>
      <div className="journal-list__view-toggle">
        <button
          type="button"
          className={`journal-list__view-btn ${viewMode === 'calendar' ? 'journal-list__view-btn--active' : ''}`}
          onClick={() => setViewMode('calendar')}
          aria-pressed={viewMode === 'calendar'}
          disabled={disabled}
        >
          📅 Calendar
        </button>
        <button
          type="button"
          className={`journal-list__view-btn ${viewMode === 'list' ? 'journal-list__view-btn--active' : ''}`}
          onClick={() => setViewMode('list')}
          aria-pressed={viewMode === 'list'}
          disabled={disabled}
        >
          📋 List
        </button>
      </div>

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

      {viewMode === 'calendar' ? (
        <div className="journal-list__calendar-view">
          <JournalCalendar
            entries={filteredEntries}
            selectedDate={selectedCalendarDate}
            onSelectDate={handleCalendarDateSelect}
            disabled={disabled}
          />
          
          {selectedCalendarDate && (
            <div className="journal-list__date-entries">
              <h4 className="journal-list__date-heading">
                {parseDateString(selectedCalendarDate).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                {calendarDateEntries.length > 0 && (
                  <span className="journal-list__date-count">
                    {calendarDateEntries.length} entr{calendarDateEntries.length === 1 ? 'y' : 'ies'}
                  </span>
                )}
              </h4>
              {calendarDateEntries.length === 0 ? (
                <p className="journal-list__date-empty">No entries on this date</p>
              ) : (
                <ul className="journal-list__date-items">
                  {calendarDateEntries.map((entry) => {
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
                            {moodMeta ? <span className="journal-list__item-mood">{moodMeta.icon}</span> : null}
                            {entry.type && entry.type !== 'standard' && (
                              <span className="journal-list__item-type">{entry.type}</span>
                            )}
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
              )}
            </div>
          )}
        </div>
      ) : (
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
                      <span>{entryListDateFormatter.format(new Date(entry.entry_date))}</span>
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
      )}

      <footer className="journal-list__footer">
        <small>
          Showing {filteredEntries.length} of {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
        </small>
      </footer>
    </aside>
  );
}
