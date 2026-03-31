import type { Session } from '@supabase/supabase-js';
import type { ProfileStrengthSignalSnapshot } from '../profile-strength/profileStrengthData';
import type { ProfileStrengthResult } from '../profile-strength/profileStrengthTypes';
import { RoutinesTodayLane } from '../routines';
import { DailyHabitTracker } from './DailyHabitTracker';

type MobileHabitHomeProps = {
  session: Session;
  showPointsBadges?: boolean;
  onVisionRewardOpenChange?: (isOpen: boolean) => void;
  profileStrengthSnapshot?: ProfileStrengthResult | null;
  profileStrengthSignals?: ProfileStrengthSignalSnapshot | null;
  personalitySummary?: string | null;
  onOpenDailyTreat?: () => void;
  onOpenLuckyRoll?: () => void;
  onOpenSpinWheel?: () => void;
  onOpenIslandRunStop?: (stopId: 'boss' | 'hatchery' | 'dynamic') => void;
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
  onOpenLuckyRoll,
  onOpenSpinWheel,
  onOpenIslandRunStop,
  forceCompactView = false,
  preferredCompactView,
  hideTimeBoundOffers = false,
  hiddenHabitIds = [],
  onHideStandaloneHabitsChange,
}: MobileHabitHomeProps) {
  void onHideStandaloneHabitsChange;
  return (
    <div className="mobile-habit-home">
      <RoutinesTodayLane
        session={session}
        onHideStandaloneHabitsChange={onHideStandaloneHabitsChange}
      />
      <DailyHabitTracker
        session={session}
        variant="compact"
        showPointsBadges={showPointsBadges}
        onVisionRewardOpenChange={onVisionRewardOpenChange}
        profileStrengthSnapshot={profileStrengthSnapshot}
        profileStrengthSignals={profileStrengthSignals}
        personalitySummary={personalitySummary}
        onOpenDailyTreat={onOpenDailyTreat}
        onOpenLuckyRoll={onOpenLuckyRoll}
        onOpenSpinWheel={onOpenSpinWheel}
        onOpenIslandRunStop={onOpenIslandRunStop}
        forceCompactView={forceCompactView}
        preferredCompactView={preferredCompactView}
        hideTimeBoundOffers={hideTimeBoundOffers}
        hiddenHabitIds={hiddenHabitIds}
      />
    </div>
  );
}
