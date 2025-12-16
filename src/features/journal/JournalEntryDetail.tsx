import type { JournalEntry } from '../../services/journal';
import type { JournalMoodOption } from './JournalEntryEditor';
import type { Database } from '../../lib/database.types';
import type { HabitV2Row } from '../../services/habitsV2';
import { entryDetailDateFormatter, unlockDateFormatter } from './utils';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type HabitRow = HabitV2Row;

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
  isLocked: boolean;
};

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
  isLocked,
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
  const isGoalMode = entry.type === 'goal';
  const isLifeWheelMode = entry.type === 'life_wheel';
  const isProblemMode = entry.type === 'problem';
  const primaryGoalId = entry.goal_id ?? null;
  const primaryGoal = (primaryGoalId && goalMap[primaryGoalId]) ?? null;
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
          <p className="journal-detail__date">{entryDetailDateFormatter.format(new Date(entry.entry_date))}</p>
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

      {isLifeWheelMode && entry.category ? (
        <div className="journal-detail__metadata">
          <p><strong>Life area:</strong> {entry.category}</p>
          {entry.mood_score !== null && entry.mood_score !== undefined ? (
            <p><strong>Satisfaction:</strong> {entry.mood_score}/10</p>
          ) : null}
        </div>
      ) : null}

      {tagList.length ? (
        <ul className="journal-detail__tags">
          {tagList.map((tag) => (
            <li key={tag}>#{tag}</li>
          ))}
        </ul>
      ) : null}

      {isLocked && entry.unlock_date ? (
        <div className="journal-detail__locked">
          <h3>🔒 Time capsule locked</h3>
          <p>This time capsule will unlock on {unlockDateFormatter.format(new Date(entry.unlock_date))}.</p>
          <p>Come back then to read your message to your future self.</p>
        </div>
      ) : isProblemMode ? (
        <div className="journal-detail__problem-sections">
          <div className="journal-detail__problem-notice">
            <p>💡 <strong>Problem Journal:</strong> This entry used the structured problem-solving approach.</p>
          </div>
          
          {entry.irrational_fears && (
            <div className="journal-detail__problem-section">
              <h3>Irrational Fears</h3>
              <article className="journal-detail__content">
                {entry.irrational_fears.split(/\n+/).map((text, index) => {
                  const trimmed = text.trim();
                  return trimmed ? <p key={`fears-${index}`}>{trimmed}</p> : null;
                }).filter(Boolean)}
              </article>
            </div>
          )}
          
          {entry.training_solutions && (
            <div className="journal-detail__problem-section">
              <h3>Training on Solutions</h3>
              <article className="journal-detail__content">
                {entry.training_solutions.split(/\n+/).map((text, index) => {
                  const trimmed = text.trim();
                  return trimmed ? <p key={`solutions-${index}`}>{trimmed}</p> : null;
                }).filter(Boolean)}
              </article>
            </div>
          )}
          
          {entry.concrete_steps && (
            <div className="journal-detail__problem-section">
              <h3>Concrete Steps for Action</h3>
              <article className="journal-detail__content">
                {entry.concrete_steps.split(/\n+/).map((text, index) => {
                  const trimmed = text.trim();
                  return trimmed ? <p key={`steps-${index}`}>{trimmed}</p> : null;
                }).filter(Boolean)}
              </article>
            </div>
          )}
          
          {!entry.irrational_fears && !entry.training_solutions && !entry.concrete_steps && (
            <p className="journal-detail__placeholder">No problem-solving sections filled in for this entry.</p>
          )}
        </div>
      ) : (
        <article className="journal-detail__content">
          {paragraphs.length ? (
            paragraphs.map((paragraph, index) => <p key={`${entry.id}-p-${index}`}>{paragraph}</p>)
          ) : (
            <p className="journal-detail__placeholder">This entry is waiting for words.</p>
          )}
        </article>
      )}

      {isGoalMode && primaryGoal && primaryGoalId ? (
        <div className="journal-detail__links">
          <h3>Primary goal</h3>
          <div className="journal-detail__chips">
            <button
              type="button"
              onClick={() => onNavigateToGoal?.(primaryGoalId)}
              disabled={disabled}
            >
              {primaryGoal.title}
            </button>
          </div>
        </div>
      ) : null}

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
                {habitMap[habitId]?.title ?? 'View habit'}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
