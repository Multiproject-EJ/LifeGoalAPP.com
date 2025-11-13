import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { DailyHabitTracker } from './DailyHabitTracker';

export type MobileHabitNavItem = {
  id: string;
  label: string;
  summary: string;
  icon: ReactNode;
};

type MobileHabitHomeProps = {
  session: Session;
  navItems: MobileHabitNavItem[];
  onSelectNav: (navId: string) => void;
  onOpenHabitsWorkspace?: () => void;
};

export function MobileHabitHome({
  session,
  navItems,
  onSelectNav,
  onOpenHabitsWorkspace,
}: MobileHabitHomeProps) {
  return (
    <div className="mobile-habit-home">
      <header className="mobile-habit-home__header">
        <h1>Daily habit checklist</h1>
        <p>Stay focused on today&apos;s rituals. When you&apos;re ready for more, jump into any area of your workspace.</p>
      </header>

      {onOpenHabitsWorkspace ? (
        <div className="mobile-habit-home__cta">
          <button type="button" className="mobile-habit-home__cta-button" onClick={onOpenHabitsWorkspace}>
            View Today&apos;s Habits &amp; Routines workspace
          </button>
          <p className="mobile-habit-home__cta-hint">Peek at the full rituals dashboard for deeper planning.</p>
        </div>
      ) : null}

      <DailyHabitTracker session={session} variant="compact" />

      <nav className="mobile-habit-home__nav" aria-label="Navigate to other areas">
        <h2>Jump to another area</h2>
        <ul className="mobile-habit-home__nav-list">
          {navItems.map((item) => (
            <li key={item.id} className="mobile-habit-home__nav-item">
              <button
                type="button"
                className="mobile-habit-home__nav-button"
                onClick={() =>
                  item.id === 'planning' && onOpenHabitsWorkspace
                    ? onOpenHabitsWorkspace()
                    : onSelectNav(item.id)
                }
              >
                <span className="mobile-habit-home__nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="mobile-habit-home__nav-text">
                  <span className="mobile-habit-home__nav-label">{item.label}</span>
                  <span className="mobile-habit-home__nav-summary">{item.summary}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
