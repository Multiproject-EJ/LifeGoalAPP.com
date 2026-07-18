import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../utils/scrollLock';
import {
  SUPER_HABITS,
  canLaunchSuperHabit,
  getSuperHabit,
  type SuperHabitId,
} from './superHabits';
import './SuperHabitRosterModal.css';
import { EatWellDemo } from './EatWellDemo';
import { SuperHabitDemoTool } from './SuperHabitDemoTool';

type SuperHabitRosterModalProps = {
  open: boolean;
  initialSuperHabitId?: SuperHabitId | null;
  journalHabitExists: boolean;
  onClose: () => void;
  onLaunchJournal: () => Promise<void>;
};

export function SuperHabitRosterModal({
  open,
  initialSuperHabitId = null,
  journalHabitExists,
  onClose,
  onLaunchJournal,
}: SuperHabitRosterModalProps) {
  const [selectedId, setSelectedId] = useState<SuperHabitId>(initialSuperHabitId ?? 'journal');
  const [showDemo, setShowDemo] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedId(initialSuperHabitId ?? 'journal');
    setShowDemo(false);
    setLaunching(false);
    setLaunchError(null);
    return lockPageScroll(['body', 'documentElement']);
  }, [initialSuperHabitId, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const selected = useMemo(() => getSuperHabit(selectedId), [selectedId]);

  if (!open || typeof document === 'undefined') return null;

  const content = (
    <div className="super-habit-roster" role="presentation" onMouseDown={onClose}>
      <section
        className="super-habit-roster__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="super-habit-roster-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="super-habit-roster__header">
          <div>
            <p className="super-habit-roster__eyebrow">Choose your tool-bearing habit</p>
            <h2 id="super-habit-roster-title">SuperHabits</h2>
            <p>A SuperHabit opens a purpose-built tool. Finish the tool, finish the habit.</p>
          </div>
          <button type="button" className="super-habit-roster__close" onClick={onClose} aria-label="Close SuperHabits">
            ×
          </button>
        </header>

        <div className="super-habit-roster__body">
          <div className="super-habit-roster__grid" role="list" aria-label="SuperHabit roster">
            {SUPER_HABITS.map((superHabit) => {
              const isSelected = superHabit.id === selected.id;
              return (
                <button
                  key={superHabit.id}
                  type="button"
                  role="listitem"
                  aria-pressed={isSelected}
                  className={`super-habit-card${isSelected ? ' super-habit-card--selected' : ''}`}
                  style={{ '--super-habit-accent': superHabit.accent } as CSSProperties}
                  onClick={() => {
                    setSelectedId(superHabit.id);
                    setShowDemo(false);
                    setLaunchError(null);
                  }}
                >
                  <span className="super-habit-card__badges">
                    <span className={`super-habit-card__tier super-habit-card__tier--${superHabit.tier}`}>
                      {superHabit.tier === 'free' ? 'Free' : 'Pro'}
                    </span>
                    {superHabit.stage === 'demo' ? <span className="super-habit-card__demo">Demo</span> : null}
                  </span>
                  <span className="super-habit-card__portrait" aria-hidden="true">{superHabit.emoji}</span>
                  <span className="super-habit-card__archetype">{superHabit.archetype}</span>
                  <strong>{superHabit.name}</strong>
                </button>
              );
            })}
          </div>

          <aside className="super-habit-roster__detail" style={{ '--super-habit-accent': selected.accent } as CSSProperties}>
            <div className="super-habit-roster__identity">
              <span className="super-habit-roster__portrait" aria-hidden="true">{selected.emoji}</span>
              <div>
                <p>{selected.archetype}</p>
                <h3>{selected.name}</h3>
              </div>
            </div>
            <p className="super-habit-roster__description">{selected.description}</p>
            <p className="super-habit-roster__promise">{selected.promise}</p>
            <div className="super-habit-roster__tools" aria-label="Included tools">
              {selected.tools.map((tool) => <span key={tool}>{tool}</span>)}
            </div>

            {showDemo && selected.id === 'eat_well' ? (
              <EatWellDemo />
            ) : showDemo ? (
              <SuperHabitDemoTool superHabit={selected} />
            ) : null}

            <div className="super-habit-roster__actions">
              {canLaunchSuperHabit(selected) ? (
                <button
                  type="button"
                  className="super-habit-roster__primary"
                  disabled={launching}
                  onClick={() => {
                    setLaunching(true);
                    setLaunchError(null);
                    void onLaunchJournal()
                      .catch((error) => setLaunchError(error instanceof Error ? error.message : 'Could not add Journaling.'))
                      .finally(() => setLaunching(false));
                  }}
                >
                  {launching
                    ? 'Preparing Journaling…'
                    : journalHabitExists
                      ? `Launch ${selected.name}`
                      : `Add ${selected.name} habit & launch`}
                </button>
              ) : (
                <button type="button" className="super-habit-roster__primary" onClick={() => setShowDemo(true)}>
                  Preview Pro demo
                </button>
              )}
              <small>
                {selected.stage === 'live'
                  ? 'Available now. A meaningful journal submission completes the tool session.'
                  : 'Demo only for now. It will not alter your habits, meals, or progress.'}
              </small>
              {launchError ? <p className="super-habit-roster__error" role="alert">{launchError}</p> : null}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );

  return createPortal(content, document.body);
}
