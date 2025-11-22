import type { Session } from '@supabase/supabase-js';
import { DailyHabitTracker } from './DailyHabitTracker';

type MobileHabitHomeProps = {
  session: Session;
};

export function MobileHabitHome({
  session,
}: MobileHabitHomeProps) {
  return (
    <div className="mobile-habit-home">
      <header className="mobile-habit-home__header">
        <h1>Daily habit checklist</h1>
      </header>

      <DailyHabitTracker session={session} variant="compact" />
    </div>
  );
}
