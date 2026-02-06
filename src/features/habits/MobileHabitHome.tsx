import type { Session } from '@supabase/supabase-js';
import type { ProfileStrengthSignalSnapshot } from '../profile-strength/profileStrengthData';
import type { ProfileStrengthResult } from '../profile-strength/profileStrengthTypes';
import { DailyHabitTracker } from './DailyHabitTracker';

type MobileHabitHomeProps = {
  session: Session;
  showPointsBadges?: boolean;
  onVisionRewardOpenChange?: (isOpen: boolean) => void;
  profileStrengthSnapshot?: ProfileStrengthResult | null;
  profileStrengthSignals?: ProfileStrengthSignalSnapshot | null;
  personalitySummary?: string | null;
};

export function MobileHabitHome({
  session,
  showPointsBadges = false,
  onVisionRewardOpenChange,
  profileStrengthSnapshot,
  profileStrengthSignals,
  personalitySummary,
}: MobileHabitHomeProps) {
  return (
    <div className="mobile-habit-home">
      <DailyHabitTracker
        session={session}
        variant="compact"
        showPointsBadges={showPointsBadges}
        onVisionRewardOpenChange={onVisionRewardOpenChange}
        profileStrengthSnapshot={profileStrengthSnapshot}
        profileStrengthSignals={profileStrengthSignals}
        personalitySummary={personalitySummary}
      />
    </div>
  );
}
