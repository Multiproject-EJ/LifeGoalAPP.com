import type { Session } from '@supabase/supabase-js';
import { DailyHabitTracker } from './DailyHabitTracker';

type MobileHabitHomeProps = {
  session: Session;
  showPointsBadges?: boolean;
  onVisionRewardOpenChange?: (isOpen: boolean) => void;
};

export function MobileHabitHome({
  session,
  showPointsBadges = false,
  onVisionRewardOpenChange,
}: MobileHabitHomeProps) {
  return (
    <div className="mobile-habit-home">
      <DailyHabitTracker
        session={session}
        variant="compact"
        showPointsBadges={showPointsBadges}
        onVisionRewardOpenChange={onVisionRewardOpenChange}
      />
    </div>
  );
}
