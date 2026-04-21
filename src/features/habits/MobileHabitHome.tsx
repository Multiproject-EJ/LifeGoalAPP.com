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
  onOpenDailyTreat?: () => void;
  onOpenIslandRunStop?: (stopId: 'boss' | 'hatchery' | 'dynamic') => void;
  onOpenDailySpinWheel?: () => void;
  forceCompactView?: boolean;
  preferredCompactView?: boolean;
  hideTimeBoundOffers?: boolean;
  hiddenHabitIds?: string[];
  onHideStandaloneHabitsChange?: (habitIds: string[]) => void;
};

export function MobileHabitHome({
  session,
  showPointsBadges = false,
  onVisionRewardOpenChange,
  profileStrengthSnapshot,
  profileStrengthSignals,
  personalitySummary,
  onOpenDailyTreat,
  onOpenIslandRunStop,
  onOpenDailySpinWheel,
  forceCompactView = false,
  preferredCompactView,
  hideTimeBoundOffers = false,
  hiddenHabitIds = [],
  onHideStandaloneHabitsChange,
}: MobileHabitHomeProps) {
  void onHideStandaloneHabitsChange;
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
        onOpenDailyTreat={onOpenDailyTreat}
        onOpenIslandRunStop={onOpenIslandRunStop}
        onOpenDailySpinWheel={onOpenDailySpinWheel}
        forceCompactView={forceCompactView}
        preferredCompactView={preferredCompactView}
        hideTimeBoundOffers={hideTimeBoundOffers}
        hiddenHabitIds={hiddenHabitIds}
      />
    </div>
  );
}
