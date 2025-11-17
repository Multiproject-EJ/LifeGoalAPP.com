import type { JournalEntry } from '../../services/journal';
import type { JournalMoodOption } from './JournalEntryEditor';
import type { Database } from '../../lib/database.types';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type HabitRow = Database['public']['Tables']['habits']['Row'];

type JournalEntryDetailProps = {
  entry: JournalEntry | null;
  getMoodMeta: (mood?: string | null) => JournalMoodOption | undefined;
  goalMap: Record<string, GoalRow>;
  habitMap: Record<string, HabitRow>;
  onEdit: () => void;
  onDelete: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  onNavigateToGoal?: (goalId: string) => void;
  onNavigateToHabit?: (habitId: string) => void;
  disabled?: boolean;
  unavailableMessage?: string | null;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function JournalEntryDetail({
  entry,
  getMoodMeta,
  goalMap,
  habitMap,
  onEdit,
  onDelete,
  showBackButton = false,
  onBack,
  onNavigateToGoal,
  onNavigateToHabit,
  disabled = false,
  unavailableMessage,
}: JournalEntryDetailProps) {
  if (!entry) {
    return (
      <section className="journal-detail">
        <div className="journal-detail__empty">
          {unavailableMessage ? <p>{unavailableMessage}</p> : null}
          <p>Select an entry from the left, or create a new one to start journaling.</p>
        </div>
      </section>
    );
  }

  const moodMeta = getMoodMeta(entry.mood);
  const tagList = entry.tags?.filter(Boolean) ?? [];
  const goalIds = entry.linked_goal_ids ?? [];
  const habitIds = entry.linked_habit_ids ?? [];
  const paragraphs = entry.content
    .split(/\n+/)
    .map((text) => text.trim())
    .filter(Boolean);

  return (
    <section className="journal-detail">
      {showBackButton ? (
        <button type="button" className="journal-detail__back" onClick={() => onBack?.()}>
          ← Back to entries
        </button>
      ) : null}

      <header className="journal-detail__header">
        <div>
          <p className="journal-detail__date">{dateFormatter.format(new Date(entry.entry_date))}</p>
          <h2>{entry.title?.trim() || 'Untitled entry'}</h2>
          {moodMeta ? (
            <span className="journal-detail__mood">
              {moodMeta.icon} {moodMeta.label}
            </span>
          ) : null}
        </div>
        <div className="journal-detail__actions">
          <button type="button" onClick={onEdit} disabled={disabled}>
            Edit
          </button>
          <button type="button" className="journal-detail__delete" onClick={onDelete} disabled={disabled}>
            Delete
          </button>
        </div>
      </header>

      {tagList.length ? (
        <ul className="journal-detail__tags">
          {tagList.map((tag) => (
            <li key={tag}>#{tag}</li>
          ))}
        </ul>
      ) : null}

      <article className="journal-detail__content">
        {paragraphs.length ? (
          paragraphs.map((paragraph, index) => <p key={`${entry.id}-p-${index}`}>{paragraph}</p>)
        ) : (
          <p className="journal-detail__placeholder">This entry is waiting for words.</p>
        )}
      </article>

      {goalIds.length ? (
        <div className="journal-detail__links">
          <h3>Linked goals</h3>
          <div className="journal-detail__chips">
            {goalIds.map((goalId) => (
              <button
                key={goalId}
                type="button"
                onClick={() => onNavigateToGoal?.(goalId)}
                disabled={disabled}
              >
                {goalMap[goalId]?.title ?? 'View goal'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {habitIds.length ? (
        <div className="journal-detail__links">
          <h3>Linked habits</h3>
          <div className="journal-detail__chips">
            {habitIds.map((habitId) => (
              <button
                key={habitId}
                type="button"
                onClick={() => onNavigateToHabit?.(habitId)}
                disabled={disabled}
              >
                {habitMap[habitId]?.name ?? 'View habit'}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
