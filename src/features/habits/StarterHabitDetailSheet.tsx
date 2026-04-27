import type { StarterHabit } from './starterHabitCatalog';

type StarterHabitDetailSheetProps = {
  habit: StarterHabit;
  isAdding: boolean;
  onAdd: () => void;
  onClose: () => void;
};

export function StarterHabitDetailSheet({ habit, isAdding, onAdd, onClose }: StarterHabitDetailSheetProps) {
  return (
    <div className="starter-quest-detail-sheet" role="dialog" aria-modal="true" aria-label={`Explore quest: ${habit.title}`}>
      <button type="button" className="starter-quest-detail-sheet__backdrop" aria-label="Close quest details" onClick={onClose} />
      <div className="starter-quest-detail-sheet__panel" role="document">
        <button
          type="button"
          className="starter-quest-detail-sheet__close"
          aria-label="Close quest details"
          onClick={onClose}
        >
          ✕
        </button>

        <header className="starter-quest-detail-sheet__header">
          <p className="starter-quest-detail-sheet__eyebrow">Starter Quest</p>
          <h3>
            {habit.emoji ? `${habit.emoji} ` : ''}
            {habit.title}
          </h3>
          <p>{habit.description}</p>
        </header>

        <section className="starter-quest-detail-sheet__section">
          <h4>Why this works</h4>
          <p>{habit.whyItWorks}</p>
        </section>

        <section className="starter-quest-detail-sheet__section">
          <h4>How to start</h4>
          <p>{habit.howToStart}</p>
        </section>

        <section className="starter-quest-detail-sheet__section">
          <h4>Make it easier</h4>
          <p>{habit.environmentHack}</p>
        </section>

        <div className="starter-quest-detail-sheet__actions">
          <button
            type="button"
            className="starter-quest-detail-sheet__add"
            onClick={onAdd}
            disabled={isAdding}
          >
            {isAdding ? 'Adding…' : 'Add to My Quest'}
          </button>
          <button
            type="button"
            className="starter-quest-detail-sheet__later"
            onClick={onClose}
            disabled={isAdding}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
