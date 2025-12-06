import { useMemo, useState } from 'react';
import type { JournalEntry } from '../../services/journal';

type JournalCalendarProps = {
  entries: JournalEntry[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  disabled?: boolean;
};

/**
 * Get the mood color for a journal entry
 */
function getMoodColor(mood: string | null | undefined): string {
  switch (mood) {
    case 'happy':
      return '#10b981'; // green
    case 'excited':
      return '#f59e0b'; // amber
    case 'neutral':
      return '#6b7280'; // gray
    case 'sad':
      return '#3b82f6'; // blue
    case 'stressed':
      return '#ef4444'; // red
    default:
      return 'var(--color-primary, #0ea5e9)';
  }
}

/**
 * Get the type color for a journal entry
 */
function getTypeColor(type: string | null | undefined): string {
  switch (type) {
    case 'quick':
      return '#22c55e'; // green
    case 'deep':
      return '#8b5cf6'; // purple
    case 'brain_dump':
      return '#f97316'; // orange
    case 'life_wheel':
      return '#06b6d4'; // cyan
    case 'secret':
      return '#ec4899'; // pink
    case 'goal':
      return '#eab308'; // yellow
    case 'time_capsule':
      return '#14b8a6'; // teal
    default:
      return 'var(--color-primary, #0ea5e9)';
  }
}

/**
 * Format a Date object to YYYY-MM-DD string format.
 * Uses ISO string split to ensure consistent date key format
 * that matches the journal entry_date format from the database.
 * 
 * @param date - The Date object to format
 * @returns A string in YYYY-MM-DD format (e.g., "2025-12-05")
 */
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate a 2D array representing a month's calendar grid.
 * Each inner array represents a week (7 elements), where null values
 * represent empty cells for padding before/after the actual month days.
 * 
 * @param year - The full year (e.g., 2025)
 * @param month - The month index (0 = January, 11 = December)
 * @returns A 2D array of Date objects and null values for calendar display
 * 
 * @example
 * // December 2025 starts on Monday, so Sunday is null
 * getMonthDays(2025, 11)
 * // Returns: [[null, Date(Dec 1), Date(Dec 2), ...], [...], ...]
 */
function getMonthDays(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // Add empty cells for days before the first of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Add empty cells after the last day
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function JournalCalendar({
  entries,
  selectedDate,
  onSelectDate,
  disabled = false,
}: JournalCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Create a map of dates to entries
  const entriesByDate = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    entries.forEach((entry) => {
      const dateKey = entry.entry_date;
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(entry);
    });
    return map;
  }, [entries]);

  const weeks = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleGoToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onSelectDate(formatDateKey(today));
  };

  const todayKey = formatDateKey(today);

  return (
    <div className="journal-calendar">
      <div className="journal-calendar__header">
        <button
          type="button"
          className="journal-calendar__nav-btn"
          onClick={handlePrevMonth}
          disabled={disabled}
          aria-label="Previous month"
        >
          ←
        </button>
        <div className="journal-calendar__title">
          <span className="journal-calendar__month">{MONTH_NAMES[viewMonth]}</span>
          <span className="journal-calendar__year">{viewYear}</span>
        </div>
        <button
          type="button"
          className="journal-calendar__nav-btn"
          onClick={handleNextMonth}
          disabled={disabled}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <button
        type="button"
        className="journal-calendar__today-btn"
        onClick={handleGoToToday}
        disabled={disabled}
      >
        Today
      </button>

      <table className="journal-calendar__grid" role="grid">
        <thead>
          <tr>
            {WEEKDAY_NAMES.map((day) => (
              <th key={day} scope="col" className="journal-calendar__weekday">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((date, dayIndex) => {
                if (!date) {
                  return (
                    <td key={dayIndex} className="journal-calendar__cell journal-calendar__cell--empty" />
                  );
                }

                const dateKey = formatDateKey(date);
                const dayEntries = entriesByDate[dateKey] || [];
                const hasEntries = dayEntries.length > 0;
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;

                return (
                  <td key={dayIndex} className="journal-calendar__cell">
                    <button
                      type="button"
                      className={`journal-calendar__day ${isToday ? 'journal-calendar__day--today' : ''} ${
                        isSelected ? 'journal-calendar__day--selected' : ''
                      } ${hasEntries ? 'journal-calendar__day--has-entries' : ''}`}
                      onClick={() => onSelectDate(dateKey)}
                      disabled={disabled}
                      aria-label={`${date.getDate()} ${MONTH_NAMES[viewMonth]} ${viewYear}${
                        hasEntries ? `, ${dayEntries.length} journal entr${dayEntries.length === 1 ? 'y' : 'ies'}` : ''
                      }`}
                      aria-pressed={isSelected}
                    >
                      <span className="journal-calendar__day-number">{date.getDate()}</span>
                      {hasEntries && (
                        <div className="journal-calendar__dots">
                          {dayEntries.slice(0, 4).map((entry, idx) => (
                            <span
                              key={entry.id}
                              className="journal-calendar__dot"
                              style={{
                                backgroundColor: entry.mood
                                  ? getMoodColor(entry.mood)
                                  : getTypeColor(entry.type),
                              }}
                              title={`${entry.type || 'standard'}${entry.mood ? ` - ${entry.mood}` : ''}`}
                            />
                          ))}
                          {dayEntries.length > 4 && (
                            <span className="journal-calendar__dot-more">+{dayEntries.length - 4}</span>
                          )}
                        </div>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="journal-calendar__legend">
        <span className="journal-calendar__legend-title">Journal types:</span>
        <div className="journal-calendar__legend-items">
          <span className="journal-calendar__legend-item">
            <span className="journal-calendar__legend-dot" style={{ backgroundColor: '#22c55e' }} />
            Quick
          </span>
          <span className="journal-calendar__legend-item">
            <span className="journal-calendar__legend-dot" style={{ backgroundColor: '#8b5cf6' }} />
            Deep
          </span>
          <span className="journal-calendar__legend-item">
            <span className="journal-calendar__legend-dot" style={{ backgroundColor: 'var(--color-primary, #0ea5e9)' }} />
            Standard
          </span>
        </div>
      </div>
    </div>
  );
}
