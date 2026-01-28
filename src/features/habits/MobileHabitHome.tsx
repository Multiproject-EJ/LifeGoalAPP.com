import type { Session } from '@supabase/supabase-js';
import { DailyHabitTracker } from './DailyHabitTracker';

type MobileHabitHomeProps = {
  session: Session;
  showPointsBadges?: boolean;
};

export function MobileHabitHome({
  session,
  showPointsBadges = false,
}: MobileHabitHomeProps) {
  return (
    <div className="mobile-habit-home">
      <DailyHabitTracker session={session} variant="compact" showPointsBadges={showPointsBadges} />
    </div>
  );
}
