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
      <DailyHabitTracker session={session} variant="compact" />
    </div>
  );
}
