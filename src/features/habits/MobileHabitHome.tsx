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
  onOpenLuckyRoll?: () => void;
  onOpenSpinWheel?: () => void;
  onOpenIslandRunStop?: (stopId: 'boss' | 'hatchery' | 'dynamic') => void;
  forceCompactView?: boolean;
  preferredCompactView?: boolean;
  hideTimeBoundOffers?: boolean;
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
        onOpenDailyTreat={onOpenDailyTreat}
        onOpenLuckyRoll={onOpenLuckyRoll}
        onOpenSpinWheel={onOpenSpinWheel}
        onOpenIslandRunStop={onOpenIslandRunStop}
        forceCompactView={forceCompactView}
        preferredCompactView={preferredCompactView}
        hideTimeBoundOffers={hideTimeBoundOffers}
      />
    </div>
  );
}
