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
};

export function MobileHabitHome({ session, navItems, onSelectNav }: MobileHabitHomeProps) {
  return (
    <div className="mobile-habit-home">
      <header className="mobile-habit-home__header">
        <h1>Daily habit checklist</h1>
        <p>Stay focused on today&apos;s rituals. When you&apos;re ready for more, jump into any area of your workspace.</p>
      </header>

      <DailyHabitTracker session={session} variant="compact" />

      <nav className="mobile-habit-home__nav" aria-label="Navigate to other areas">
        <h2>Jump to another area</h2>
        <ul className="mobile-habit-home__nav-list">
          {navItems.map((item) => (
            <li key={item.id} className="mobile-habit-home__nav-item">
              <button
                type="button"
                className="mobile-habit-home__nav-button"
                onClick={() => onSelectNav(item.id)}
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
